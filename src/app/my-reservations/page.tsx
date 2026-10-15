import { requireUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';

export default async function MyReservationsPage() {
  const session = await requireUser();

  // Admins oversee all bookings from the Admin Hub
  if (session.role === UserRole.ADMIN) {
    redirect('/admin');
  }

  // Redirect to Dashboard with My Bookings popup modal open
  redirect('/dashboard?modal=my-bookings');
}

