'use client';

import {
  Building2,
  Car,
  Tv,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';

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
  onSwitchTab: (tab: 'reservations' | 'resources', subFilter?: { status?: string; type?: string; date?: string }) => void;
}

export default function AdminInsights({ analytics, onSwitchTab }: AdminInsightsProps) {
  const totalRes = analytics.totalResources || 1;
  const roomPct = Math.round((analytics.byType.ROOM / totalRes) * 100);
  const vehiclePct = Math.round((analytics.byType.VEHICLE / totalRes) * 100);
  const equipPct = Math.round((analytics.byType.EQUIPMENT / totalRes) * 100);
  const activePct = Math.round((analytics.statusSummary.active / totalRes) * 100);

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              System Operations & Capacity
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Current inventory distribution and active maintenance status across all organizational assets.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSwitchTab('reservations', { status: 'PENDING' })}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Review Pending ({analytics.pendingReservationsCount})</span>
              <ArrowRight size={13} />
            </button>

            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Calendar size={13} className="text-slate-500" />
              <span>Timeline</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid: Distribution & Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Asset Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-slate-500" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Resource Distribution
              </h3>
            </div>
            <button
              onClick={() => onSwitchTab('resources')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
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
                  className="h-full bg-slate-800 rounded-full"
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
                  className="h-full bg-slate-600 rounded-full"
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
                  className="h-full bg-slate-400 rounded-full"
                  style={{ width: `${equipPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 flex items-center justify-between border border-slate-100">
            <span>Total Registered Inventory</span>
            <span className="font-semibold text-slate-900">{analytics.totalResources} Assets</span>
          </div>
        </div>

        {/* Card 2: Operational Status & Security */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-slate-500" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Operational Status
              </h3>
            </div>
            <button
              onClick={() => onSwitchTab('resources', { status: 'INACTIVE' })}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
            >
              View offline →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg">
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

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg">
              <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Maintenance</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {analytics.statusSummary.inactive}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Currently offline
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
              <ShieldCheck size={14} className="text-slate-600" />
              <span>Access & Audit Controls</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Object-level authorization (IDOR/BOLA prevention) and tamper-evident audit logging are active across all reservation operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
