'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Sparkles,
  X,
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

  // Live state with auto-sync
  const [reservations, setReservations] = useState<ReservationItem[]>(initialReservations);
  const [analyticsData, setAnalyticsData] = useState(analytics);
  const [pendingCount, setPendingCount] = useState(analytics.pendingReservationsCount);
  const [totalReservationsCount, setTotalReservationsCount] = useState(initialReservations.length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newBookingAlert, setNewBookingAlert] = useState<{
    userName: string;
    resourceName: string;
    purpose: string;
  } | null>(null);

  // Background fetch to live-sync new bookings and analytics without page reload
  const fetchLatest = useCallback(async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/admin/reservations', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.reservations)) {
        setReservations((prev) => {
          // Detect if a brand new booking was submitted by an employee
          const prevIds = new Set(prev.map((r) => r.id));
          const newlyAdded = data.reservations.filter((r: ReservationItem) => !prevIds.has(r.id));
          if (newlyAdded.length > 0) {
            const newest = newlyAdded[0];
            setNewBookingAlert({
              userName: newest.user?.fullName || 'An employee',
              resourceName: newest.resource?.name || 'Resource',
              purpose: newest.purpose,
            });
          }
          return data.reservations;
        });

        if (data.analytics) {
          setAnalyticsData(data.analytics);
          setPendingCount(data.analytics.pendingReservationsCount);
          setTotalReservationsCount(data.reservations.length);
        }
      }
    } catch {
      // Ignore background fetch network interruptions
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Poll every 4 seconds for instant real-time updates
  useEffect(() => {
    const interval = setInterval(fetchLatest, 4000);
    return () => clearInterval(interval);
  }, [fetchLatest]);

  // Auto-dismiss new booking notification after 6 seconds
  useEffect(() => {
    if (newBookingAlert) {
      const timer = setTimeout(() => setNewBookingAlert(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [newBookingAlert]);

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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Resource Management Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Oversee facility reservations, review employee approval requests, and monitor asset availability in real time.
          </p>
        </div>



      </div>

      {/* Real-Time New Booking Alert Banner */}
      {newBookingAlert && (
        <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between gap-3 text-xs animate-fade-in shadow-xs">
          <div className="flex items-center gap-2 text-slate-800">
            <span className="w-2 h-2 rounded-full bg-[#ff6b35] animate-ping" />
            <span>
              <strong>New Booking Received!</strong> {newBookingAlert.userName} booked{' '}
              <strong className="text-[#ff6b35]">{newBookingAlert.resourceName}</strong> for &quot;
              {newBookingAlert.purpose}&quot;.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveTab('reservations');
                setReservationStatusFilter('ALL');
                setNewBookingAlert(null);
              }}
              className="text-xs font-bold text-[#ff6b35] hover:underline cursor-pointer"
            >
              View at Top →
            </button>
            <button
              onClick={() => setNewBookingAlert(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards: Live & Responsive */}
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
            {analyticsData.totalResources}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>
              {analyticsData.byType.ROOM} Rooms · {analyticsData.byType.VEHICLE} Vehicles · {analyticsData.byType.EQUIPMENT} Tech
            </span>
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
            {analyticsData.statusSummary.active}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{analyticsData.statusSummary.inactive} in maintenance</span>
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
            {analyticsData.todayReservationsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{analyticsData.upcomingReservationsCount} upcoming total</span>
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
          className={`py-1.5 px-3.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'reservations'
            ? 'bg-white text-slate-900 font-semibold shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <CalendarCheck size={14} />
          <span>Reservations</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${pendingCount > 0
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
          className={`py-1.5 px-3.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'resources'
            ? 'bg-white text-slate-900 font-semibold shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <Layers size={14} />
          <span>Resources</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
            {analyticsData.totalResources}
          </span>
        </button>

        {/* Tab 3: Insights & Analytics */}
        <button
          onClick={() => setActiveTab('insights')}
          className={`py-1.5 px-3.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'insights'
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
              initialReservations={reservations}
              initialStatusFilter={reservationStatusFilter}
              initialDateFilter={reservationDateFilter}
              onCountChange={handlePendingCountChange}
              onRefresh={fetchLatest}
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
              analytics={analyticsData}
              onSwitchTab={handleSwitchTabFromInsights}
            />
          </div>
        )}
      </div>
    </div>
  );
}
