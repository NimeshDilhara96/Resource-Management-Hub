import Link from 'next/link';
import { getServerSession } from '@/lib/session';
import { logout } from '@/actions/auth.actions';
import {
  Building2,
  CalendarCheck,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { UserRole } from '@prisma/client';

export default async function Navbar() {
  const session = await getServerSession();
  if (!session) return null;

  const isAdmin = session.role === UserRole.ADMIN;

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-5 gap-4 sticky top-0 z-20">
      {/* Brand */}
      <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2 mr-4 group">
        <div className="w-8 h-8 rounded-xl bg-[#ff6b35] flex items-center justify-center group-hover:scale-105 transition-transform">
          <Building2 size={16} className="text-white" />
        </div>
        <span className="text-sm font-black text-slate-800 tracking-tight">ResHub</span>
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1">
        <Link
          href="/dashboard"
          className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
        >
          <CalendarCheck size={15} className="text-[#ff6b35]" />
          Timeline
        </Link>
        {!isAdmin && (
          <Link
            href="/dashboard?modal=my-bookings"
            className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            My Bookings
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin"
            className="px-3.5 py-2 rounded-xl text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200/60 transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck size={15} />
            Admin
          </Link>
        )}
      </nav>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        {/* User chip */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-slate-800">
            {session.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-slate-800 leading-none">{session.fullName}</div>
            <div className="text-[10px] text-slate-400 leading-none mt-0.5">{session.role}</div>
          </div>
        </div>

        {/* Logout */}
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all cursor-pointer shadow-2xs"
            title="Sign Out of ResHub"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </form>
      </div>
    </header>
  );
}
