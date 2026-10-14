import { requireUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { ReservationService } from '@/services/reservation.service';
import Navbar from '@/components/Navbar';
import MyReservationsList from '@/components/MyReservationsList';
import Link from 'next/link';
import { CalendarCheck, Plus } from 'lucide-react';

export default async function MyReservationsPage() {
  const session = await requireUser();

  // Admins oversee all bookings from the Admin Hub
  if (session.role === UserRole.ADMIN) {
    redirect('/admin');
  }

  const reservations = await ReservationService.getUserReservations(session.id);

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-slate-800 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 mb-2">
              <CalendarCheck size={13} className="text-slate-500" />
              Personal Schedule
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">My Reservations</h1>
            <p className="text-sm text-slate-500 mt-1">
              Track your bookings, pending requests, and cancel if plans change.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#ff6b35] hover:bg-[#e55a25] shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus size={15} />
            Book New Resource
          </Link>
        </div>

        <MyReservationsList initialReservations={reservations as any} />
      </main>
    </div>
  );
}
