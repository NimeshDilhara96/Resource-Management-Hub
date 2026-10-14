'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Building2,
  CalendarCheck,
  Clock3,
  Layers,
  Calendar,
  BarChart3,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import AdminReservationHub, { ReservationItem } from '@/components/AdminReservationHub';
import AdminResourceManagement, { AdminResourceItem } from '@/components/AdminResourceManagement';
import AdminInsights from '@/components/AdminInsights';

interface AdminHubClientProps {
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
  initialReservations: ReservationItem[];
  initialResources: AdminResourceItem[];
  adminName: string;
}

export default function AdminHubClient({
  analytics,
  initialReservations,
  initialResources,
  adminName,
}: AdminHubClientProps) {
  const [activeTab, setActiveTab] = useState<'reservations' | 'resources' | 'insights'>('reservations');

  // Sub-filter states
  const [reservationStatusFilter, setReservationStatusFilter] = useState('ALL');
  const [reservationDateFilter, setReservationDateFilter] = useState('ALL');
  const [resourceStatusFilter, setResourceStatusFilter] = useState('ALL');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('ALL');

  // Live counts
  const [pendingCount, setPendingCount] = useState(analytics.pendingReservationsCount);
  const [totalReservationsCount, setTotalReservationsCount] = useState(initialReservations.length);

  const handlePendingCountChange = (newPending: number, newTotal: number) => {
    setPendingCount(newPending);
    setTotalReservationsCount(newTotal);
  };

  const handleKpiPendingClick = () => {
    setReservationStatusFilter('PENDING');
    setReservationDateFilter('ALL');
    setActiveTab('reservations');
  };

  const handleKpiTodayClick = () => {
    setReservationDateFilter('TODAY');
    setReservationStatusFilter('ALL');
    setActiveTab('reservations');
  };

  const handleKpiTotalResourcesClick = () => {
    setResourceStatusFilter('ALL');
    setResourceTypeFilter('ALL');
    setActiveTab('resources');
  };

  const handleKpiOperationalClick = () => {
    setResourceStatusFilter('ACTIVE');
    setActiveTab('resources');
  };

  const handleSwitchTabFromInsights = (
    tab: 'reservations' | 'resources',
    subFilter?: { status?: string; type?: string; date?: string }
  ) => {
    if (tab === 'reservations') {
      if (subFilter?.status) setReservationStatusFilter(subFilter.status);
      if (subFilter?.date) setReservationDateFilter(subFilter.date);
      setActiveTab('reservations');
    } else {
      if (subFilter?.status) setResourceStatusFilter(subFilter.status);
      if (subFilter?.type) setResourceTypeFilter(subFilter.type);
      setActiveTab('resources');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 mb-2">
            <ShieldCheck size={13} className="text-slate-500" />
            <span>Admin Workspace</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Resource Management Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Logged in as <strong className="text-slate-800">{adminName}</strong>. Review reservations,
            monitor assets, and manage company resources.
          </p>
        </div>

        {/* Quick Nav Shortcut */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Calendar size={14} className="text-slate-500" />
            <span>Timeline View</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards: Uniform, Clean, Professional */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Resources */}
        <button
          onClick={handleKpiTotalResourcesClick}
          className="text-left bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Total Resources</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Layers size={14} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {analytics.totalResources}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{analytics.byType.ROOM} Rooms · {analytics.byType.VEHICLE} Vehicles · {analytics.byType.EQUIPMENT} Tech</span>
            <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
          </div>
        </button>

        {/* Card 2: Operational Status */}
        <button
          onClick={handleKpiOperationalClick}
          className="text-left bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Operational</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Building2 size={14} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {analytics.statusSummary.active}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{analytics.statusSummary.inactive} in maintenance</span>
            <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
          </div>
        </button>

        {/* Card 3: Today's Bookings */}
        <button
          onClick={handleKpiTodayClick}
          className="text-left bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Today's Bookings</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <CalendarCheck size={14} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {analytics.todayReservationsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{analytics.upcomingReservationsCount} upcoming total</span>
            <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
          </div>
        </button>

        {/* Card 4: Pending Approval */}
        <button
          onClick={handleKpiPendingClick}
          className="text-left bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Pending Approval</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Clock3 size={14} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>{pendingCount}</span>
            {pendingCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                Action Needed
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{pendingCount > 0 ? 'Review requested bookings' : 'All bookings reviewed'}</span>
            <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
          </div>
        </button>
      </div>

      {/* Notice Banner (Clean, muted enterprise style) */}
      {pendingCount > 0 && activeTab !== 'reservations' && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>
              <strong>{pendingCount} reservation{pendingCount > 1 ? 's' : ''}</strong> awaiting review.
            </span>
          </div>
          <button
            onClick={handleKpiPendingClick}
            className="text-slate-900 hover:text-slate-700 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Review now</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* Segmented Tab Navigation: Clean & Professional */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {/* Tab 1: Reservations Queue */}
        <button
          onClick={() => {
            setActiveTab('reservations');
            setReservationStatusFilter('ALL');
            setReservationDateFilter('ALL');
          }}
          className={`py-1.5 px-3.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'reservations'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarCheck size={14} />
          <span>Reservations</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
              pendingCount > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {pendingCount > 0 ? `${pendingCount} pending` : totalReservationsCount}
          </span>
        </button>

        {/* Tab 2: Resource Inventory */}
        <button
          onClick={() => {
            setActiveTab('resources');
            setResourceStatusFilter('ALL');
            setResourceTypeFilter('ALL');
          }}
          className={`py-1.5 px-3.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'resources'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers size={14} />
          <span>Resources</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
            {analytics.totalResources}
          </span>
        </button>

        {/* Tab 3: Insights & Analytics */}
        <button
          onClick={() => setActiveTab('insights')}
          className={`py-1.5 px-3.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'insights'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 size={14} />
          <span>System Overview</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {/* TAB 1: RESERVATIONS */}
        {activeTab === 'reservations' && (
          <div className="space-y-3">
            <AdminReservationHub
              key={`${reservationStatusFilter}-${reservationDateFilter}`}
              initialReservations={initialReservations}
              initialStatusFilter={reservationStatusFilter}
              initialDateFilter={reservationDateFilter}
              onCountChange={handlePendingCountChange}
            />
          </div>
        )}

        {/* TAB 2: RESOURCES */}
        {activeTab === 'resources' && (
          <div className="space-y-3">
            <AdminResourceManagement
              key={`${resourceStatusFilter}-${resourceTypeFilter}`}
              initialResources={initialResources}
              initialStatusFilter={resourceStatusFilter}
              initialTypeFilter={resourceTypeFilter}
            />
          </div>
        )}

        {/* TAB 3: INSIGHTS */}
        {activeTab === 'insights' && (
          <div>
            <AdminInsights
              analytics={analytics}
              onSwitchTab={handleSwitchTabFromInsights}
            />
          </div>
        )}
      </div>
    </div>
  );
}
