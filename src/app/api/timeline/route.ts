import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session required' },
        { status: 401 }
      );
    }

    const resourcesWithUsers = await prisma.resource.findMany({
      include: {
        reservations: {
          where: {
            status: { not: 'CANCELLED' },
            // Include reservations for timeline navigation window
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
    });

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
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch timeline real-time sync data' },
      { status: 500 }
    );
  }
}
