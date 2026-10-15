import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { UserRole } from '@prisma/client';
import { ReservationService } from '@/services/reservation.service';
import { ResourceService } from '@/services/resource.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || session.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const [reservations, analytics] = await Promise.all([
      ReservationService.getAllReservations(),
      ResourceService.getDashboardAnalytics(),
    ]);

    return NextResponse.json({
      success: true,
      reservations,
      analytics,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch admin reservations' },
      { status: 500 }
    );
  }
}
