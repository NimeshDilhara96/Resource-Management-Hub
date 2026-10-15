import Link from 'next/link';
import { getServerSession } from '@/lib/session';
import {
  Building2,
  Calendar,
  ShieldCheck,
  LogOut,
  Sparkles,
  Activity,
  Layers,
} from 'lucide-react';
import { UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';

export default async function Navbar() {
  const session = await getServerSession();
  if (!session) return null;

  const isAdmin = session.role === UserRole.ADMIN;

  // Real-time pending reservations count for the executive admin badge
  let pendingCount = 0;
  if (isAdmin) {
    try {
      pendingCount = await prisma.reservation.count({
        where: { status: 'PENDING' },
      });
    } catch {
      // Graceful fallback if database connection drops
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* ── Left: Brand & Administrative Workspace Scope ── */}
        <div className="flex items-center gap-4 shrink-0">
          <Link
            href={isAdmin ? '/admin' : '/dashboard'}
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b35]/40 rounded-xl"
          >
            {/* Brand Logo with Orange Glow */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff6b35] via-[#ff5722] to-[#e64a19] flex items-center justify-center shadow-md shadow-orange-500/20 text-white group-hover:scale-105 transition-all duration-200">
              <Building2 size={20} className="drop-shadow-xs" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 leading-none">
                <span className="text-base font-black text-slate-900 tracking-tight">ResHub</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900 text-white shadow-2xs">
                  Admin
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                Resource Management Console
              </span>
            </div>
          </Link>
        </div>

        {/* ── Center: Segmented Navigation Pills ── */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-2xs">
          {/* Admin Hub Tab (Active) */}
          <Link
            href="/admin"
            className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-white text-slate-900 shadow-xs border border-slate-200/70"
          >
            <ShieldCheck size={14} className="text-[#ff6b35]" />
            <span>Admin Console</span>
            {pendingCount > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black leading-none shadow-2xs animate-pulse"
                title={`${pendingCount} reservations pending approval`}
              >
                {pendingCount}
              </span>
            )}
          </Link>

          {/* Timeline Schedule Tab */}
          <Link
            href="/dashboard"
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all flex items-center gap-2 group"
          >
            <Calendar size={14} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
            <span>Timeline Schedule</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </Link>
        </nav>

        {/* ── Right: System Status, Executive Profile & Actions ── */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">



          {/* Mobile Navigation Shortcut to Timeline */}
          <Link
            href="/dashboard"
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="View Timeline Schedule"
          >
            <Calendar size={15} className="text-[#ff6b35]" />
            <span className="text-xs">Timeline</span>
          </Link>

          {/* Subtle Vertical Divider */}
          <div className="h-7 w-px bg-slate-200 hidden sm:block" />

          {/* Executive Profile Card */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center shadow-xs ring-2 ring-slate-100">
                {session.fullName.charAt(0).toUpperCase()}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white shadow-2xs"
                title="Active Session"
              />
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {session.fullName}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-semibold text-slate-400 leading-none truncate max-w-[140px]">
                  {session.email}
                </span>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200/90 hover:border-red-200 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Sign Out of Admin Console"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </form>

        </div>

      </div>
    </header>
  );
}
