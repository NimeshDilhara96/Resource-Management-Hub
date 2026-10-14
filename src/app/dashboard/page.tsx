import { requireUser } from '@/lib/session';
import { ResourceService } from '@/services/resource.service';
import CalendarDashboard from '@/components/CalendarDashboard';

export default async function DashboardPage() {
  const session = await requireUser();

  // Fetch resources with their upcoming reservations (with user info for tooltip)
  const resources = await ResourceService.getAllResources();

  // We also need reservations with user info for the timeline
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

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

  await prisma.$disconnect();

  // Annotate isOccupiedNow
  const now = new Date();
  const annotated = resourcesWithUsers.map(r => ({
    ...r,
    isOccupiedNow: r.reservations.some(
      res => new Date(res.startTime) <= now && new Date(res.endTime) >= now && res.status === 'CONFIRMED'
    ),
  }));

  return (
    <CalendarDashboard
      resources={annotated as any}
      session={session}
    />
  );
}
