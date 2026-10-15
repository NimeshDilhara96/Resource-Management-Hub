import { requireUser } from '@/lib/session';
import { ResourceService } from '@/services/resource.service';
import CalendarDashboard from '@/components/CalendarDashboard';
import prisma from '@/lib/prisma';

export default async function DashboardPage() {
  const session = await requireUser();

  // Fetch resources with their upcoming reservations (with user info for tooltip)
  const resourcesWithUsers = await prisma.resource.findMany({
    include: {
      reservations: {
        where: {
          status: { not: 'CANCELLED' },
          // Fetch reservations for the past week and future 30 days to support navigation
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

  // Annotate isOccupiedNow
  const now = new Date();
  const annotated = resourcesWithUsers.map(r => ({
    ...r,
    isOccupiedNow: r.reservations.some(
      res => new Date(res.startTime) <= now && new Date(res.endTime) >= now && res.status === 'CONFIRMED'
    ),
  }));

  // Fetch initial user reservations for employee notification tracking
  const userReservations = await prisma.reservation.findMany({
    where: {
      userId: session.id,
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
  });

  return (
    <CalendarDashboard
      resources={annotated as any}
      session={session}
      initialUserReservations={JSON.parse(JSON.stringify(userReservations))}
    />
  );
}
