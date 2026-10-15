import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAndDecodeSessionToken } from '@/lib/auth-crypto';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fast in-memory cryptographic session validation (saves 200ms+ round-trip to remote DB)
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session required' },
        { status: 401 }
      );
    }

    const decoded = verifyAndDecodeSessionToken(token);
    if (!decoded.valid || !decoded.payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid session' },
        { status: 401 }
      );
    }

    const userId = decoded.payload.userId;

    // 2. Execute resource matrix & user reservation queries concurrently via Promise.all
    const [resourcesWithUsers, userReservations] = await Promise.all([
      prisma.resource.findMany({
        include: {
          reservations: {
            where: {
              status: { not: 'CANCELLED' },
              startTime: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            },
            include: {
              user: {
                select: {
                  fullName: true,
                  email: true,
                },
              },
            },
            orderBy: { startTime: 'asc' },
          },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),

      prisma.reservation.findMany({
        where: {
          userId,
        },
        include: {
          resource: {
            select: {
              id: true,
              name: true,
              type: true,
              location: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      }),
    ]);

    const now = new Date();
    const resources = resourcesWithUsers.map((r) => ({
      ...r,
      isOccupiedNow: r.reservations.some(
        (res) =>
          new Date(res.startTime) <= now &&
          new Date(res.endTime) >= now &&
          res.status === 'CONFIRMED'
      ),
    }));

    return NextResponse.json({
      success: true,
      resources,
      userReservations,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch timeline real-time sync data' },
      { status: 500 }
    );
  }
}
