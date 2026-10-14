import { requireAdmin } from '@/lib/session';
import { ResourceService } from '@/services/resource.service';
import { ReservationService } from '@/services/reservation.service';
import Navbar from '@/components/Navbar';
import AdminHubClient from '@/components/AdminHubClient';

export default async function AdminPage() {
  const session = await requireAdmin();

  const [analytics, allReservations, allResources] = await Promise.all([
    ResourceService.getDashboardAnalytics(),
    ReservationService.getAllReservations(),
    ResourceService.getAllResources(),
  ]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminHubClient
          analytics={analytics}
          initialReservations={allReservations as any}
          initialResources={allResources as any}
          adminName={session.fullName}
        />
      </main>
    </div>
  );
}
