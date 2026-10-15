'use client';

import { useState } from 'react';
import {
  Building2,
  Car,
  Tv,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  UserPlus,
  Users,
  Search,
  AlertCircle,
  Loader2,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { UserRole } from '@prisma/client';
import {
  UserSummary,
  promoteUserToAdminAction,
  demoteAdminToEmployeeAction,
} from '@/actions/user.actions';

interface AdminInsightsProps {
  analytics: {
    totalResources: number;
    byType: {
      ROOM: number;
      VEHICLE: number;
      EQUIPMENT: number;
    };
    statusSummary: {
      active: number;
      inactive: number;
    };
    todayReservationsCount: number;
    pendingReservationsCount: number;
    upcomingReservationsCount: number;
  };
  initialUsers?: UserSummary[];
  currentAdminEmail?: string;
  onSwitchTab: (
    tab: 'reservations' | 'resources',
    subFilter?: { status?: string; type?: string; date?: string }
  ) => void;
}

export default function AdminInsights({
  analytics,
  initialUsers = [],
  currentAdminEmail,
  onSwitchTab,
}: AdminInsightsProps) {
  const [users, setUsers] = useState<UserSummary[]>(initialUsers);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // User directory filter
  const [userTab, setUserTab] = useState<'ALL' | 'ADMIN' | 'EMPLOYEE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const totalRes = analytics.totalResources || 1;
  const roomPct = Math.round((analytics.byType.ROOM / totalRes) * 100);
  const vehiclePct = Math.round((analytics.byType.VEHICLE / totalRes) * 100);
  const equipPct = Math.round((analytics.byType.EQUIPMENT / totalRes) * 100);
  const activePct = Math.round((analytics.statusSummary.active / totalRes) * 100);

  const adminsList = users.filter((u) => u.role === UserRole.ADMIN);
  const employeesList = users.filter((u) => u.role === UserRole.EMPLOYEE);

  // Handle Promote by Email / Direct Click
  const handlePromote = async (targetEmail: string, userId: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    setActionUserId(userId);
    setFeedback(null);

    const res = await promoteUserToAdminAction(cleanEmail);
    setActionUserId(null);

    if (res.success && res.user) {
      setFeedback({
        type: 'success',
        message: res.message || `User successfully elevated to Administrator!`,
      });

      // Update local state immediately
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, role: UserRole.ADMIN }
            : u
        )
      );
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to promote user.',
      });
    }
  };

  // Handle Revoke / Demote Admin
  const handleDemote = async (userEmail: string, userId: string) => {
    if (
      !confirm(
        `Are you sure you want to revoke Administrator access for ${userEmail}? They will revert to a standard Employee.`
      )
    ) {
      return;
    }

    setActionUserId(userId);
    setFeedback(null);

    const res = await demoteAdminToEmployeeAction(userEmail);
    setActionUserId(null);

    if (res.success && res.user) {
      setFeedback({
        type: 'success',
        message: res.message || `Administrator access revoked successfully.`,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.email.toLowerCase() === userEmail.toLowerCase()
            ? { ...u, role: UserRole.EMPLOYEE }
            : u
        )
      );
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to update user role.',
      });
    }
  };

  // Filtered users for directory
  const filteredUsers = users.filter((u) => {
    if (userTab !== 'ALL' && u.role !== userTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── System Operations & Capacity Header ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900 text-white">
                Live System Monitor
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900">
              System Operations, Resource Inventory & Security Monitor
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live capacity metrics, asset health, and administrative role governance across the organization.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSwitchTab('reservations', { status: 'PENDING' })}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span>Review Pending ({analytics.pendingReservationsCount})</span>
              <ArrowRight size={13} />
            </button>

            <Link
              href="/dashboard"
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Calendar size={13} className="text-[#ff6b35]" />
              <span>Visual Timeline</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── SECTION: Corporate Users Directory & Role Governance ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={15} className="text-slate-900" />
              <span>Corporate Users Directory ({users.length})</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Browse registered corporate accounts and elevate employees to Administrator directly.
            </p>
          </div>

          {/* Filter Tabs & Search */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              {[
                { key: 'ALL', label: `All (${users.length})` },
                { key: UserRole.EMPLOYEE, label: `Employees (${employeesList.length})` },
                { key: UserRole.ADMIN, label: `Admins (${adminsList.length})` },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setUserTab(t.key as any)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    userTab === t.key
                      ? 'bg-white text-slate-900 shadow-3xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 w-36 sm:w-48"
              />
            </div>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-3 animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
            >
              <XCircle size={14} />
            </button>
          </div>
        )}

        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No users matching criteria.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isAdmin = u.role === UserRole.ADMIN;
              const isCurrentSessionAdmin =
                currentAdminEmail &&
                u.email.toLowerCase() === currentAdminEmail.toLowerCase();
              const isProcessing = actionUserId === u.id;

              return (
                <div
                  key={u.id}
                  className="p-3 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg text-white font-bold flex items-center justify-center shrink-0 text-[11px] ${
                        isAdmin ? 'bg-slate-900' : 'bg-slate-400'
                      }`}
                    >
                      {u.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">
                          {u.fullName}
                        </span>
                        {isCurrentSessionAdmin && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {u.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      {u.reservationsCount} {u.reservationsCount === 1 ? 'booking' : 'bookings'}
                    </span>

                    {isAdmin ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white shadow-3xs">
                          Administrator
                        </span>
                        {!isCurrentSessionAdmin && (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleDemote(u.email, u.id)}
                            className="px-2 py-0.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            title="Revoke Admin privileges (Revert to Employee)"
                          >
                            {isProcessing ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : null}
                            <span>Demote</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handlePromote(u.email, u.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Promoting...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={12} className="text-emerald-400" />
                            <span>Promote to Admin</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── SECTION: Resource Distribution & Inventory Health ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Asset Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-slate-500" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Resource Distribution
              </h3>
            </div>
            <button
              onClick={() => onSwitchTab('resources')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              Manage all →
            </button>
          </div>

          <div className="space-y-3">
            {/* Rooms Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Building2 size={13} className="text-slate-400" />
                  Meeting Rooms ({analytics.byType.ROOM})
                </span>
                <span className="text-slate-500">{roomPct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-800 rounded-full transition-all"
                  style={{ width: `${roomPct}%` }}
                />
              </div>
            </div>

            {/* Vehicles Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Car size={13} className="text-slate-400" />
                  Fleet Vehicles ({analytics.byType.VEHICLE})
                </span>
                <span className="text-slate-500">{vehiclePct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-600 rounded-full transition-all"
                  style={{ width: `${vehiclePct}%` }}
                />
              </div>
            </div>

            {/* Hardware Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Tv size={13} className="text-slate-400" />
                  Tech Equipment ({analytics.byType.EQUIPMENT})
                </span>
                <span className="text-slate-500">{equipPct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full transition-all"
                  style={{ width: `${equipPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex items-center justify-between border border-slate-100">
            <span>Total Registered Inventory</span>
            <span className="font-bold text-slate-900">{analytics.totalResources} Assets</span>
          </div>
        </div>

        {/* Card 2: Operational Status & Audit Health */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-slate-500" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Operational Status
              </h3>
            </div>
            <button
              onClick={() => onSwitchTab('resources', { status: 'INACTIVE' })}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              View offline →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Operational</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {analytics.statusSummary.active}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {activePct}% available to reserve
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Maintenance</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {analytics.statusSummary.inactive}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Currently locked
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold">
              <ShieldAlert size={14} className="text-slate-700" />
              <span>Immutable Audit Trail & Access Governance</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every role elevation, reservation override, and maintenance mode toggle is recorded with cryptographic timestamps and actor IDs in the security audit journal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
