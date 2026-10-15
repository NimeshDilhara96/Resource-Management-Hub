import { requireAdmin } from '@/lib/session';
import { ResourceService } from '@/services/resource.service';
import { ReservationService } from '@/services/reservation.service';
import Navbar from '@/components/Navbar';
import AdminHubClient from '@/components/AdminHubClient';

import prisma from '@/lib/prisma';

export default async function AdminPage() {
  const session = await requireAdmin();

  const [analytics, allReservations, allResources, allUsers] = await Promise.all([
    ResourceService.getDashboardAnalytics(),
    ReservationService.getAllReservations(),
    ResourceService.getAllResources(),
    prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { reservations: true },
        },
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    }),
  ]);

  const formattedUsers = allUsers.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    reservationsCount: u._count.reservations,
  }));

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminHubClient
          analytics={analytics}
          initialReservations={allReservations as any}
          initialResources={allResources as any}
          initialUsers={formattedUsers}
          adminName={session.fullName}
          currentAdminEmail={session.email}
        />
      </main>
    </div>
  );
}
