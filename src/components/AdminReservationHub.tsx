'use client';

import { useState, useTransition, useMemo } from 'react';
import { adminUpdateReservationStatusAction } from '@/actions/reservation.actions';
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowUpDown,
  Building2,
  Car,
  Tv,
  MapPin,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCheck,
  CalendarClock,
} from 'lucide-react';
import { formatDate, formatTime, getDurationHours } from '@/lib/utils';
import { ReservationStatus, ResourceType, UserRole } from '@prisma/client';

export interface ReservationItem {
  id: string;
  startTime: Date | string;
  endTime: Date | string;
  purpose: string;
  status: ReservationStatus;
  resource: {
    id: string;
    name: string;
    type: ResourceType;
    location: string | null;
  };
  user: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  };
}

interface AdminReservationHubProps {
  initialReservations: ReservationItem[];
  initialStatusFilter?: string;
  initialDateFilter?: string;
  onCountChange?: (pendingCount: number, totalCount: number) => void;
}

export default function AdminReservationHub({
  initialReservations,
  initialStatusFilter = 'ALL',
  initialDateFilter = 'ALL',
  onCountChange,
}: AdminReservationHubProps) {
  const [reservations, setReservations] = useState<ReservationItem[]>(initialReservations);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState(initialDateFilter);
  const [sortBy, setSortBy] = useState<'soonest' | 'latest'>('soonest');

  // Confirmation state for reject/cancel
  const [confirmingRejectId, setConfirmingRejectId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Counts for filters
  const pendingCount = useMemo(
    () => reservations.filter((r) => r.status === ReservationStatus.PENDING).length,
    [reservations]
  );
  const confirmedCount = useMemo(
    () => reservations.filter((r) => r.status === ReservationStatus.CONFIRMED).length,
    [reservations]
  );
  const completedCount = useMemo(
    () => reservations.filter((r) => r.status === ReservationStatus.COMPLETED).length,
    [reservations]
  );
  const cancelledCount = useMemo(
    () => reservations.filter((r) => r.status === ReservationStatus.CANCELLED).length,
    [reservations]
  );

  // Status transition handler
  const handleStatusChange = (id: string, newStatus: ReservationStatus, resourceName?: string) => {
    setUpdatingId(id);
    setConfirmingRejectId(null);
    setNotification(null);

    startTransition(async () => {
      const res = await adminUpdateReservationStatusAction(id, newStatus);
      if (res.success) {
        setReservations((prev) => {
          const updated = prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r));
          if (onCountChange) {
            const newPending = updated.filter((r) => r.status === ReservationStatus.PENDING).length;
            onCountChange(newPending, updated.length);
          }
          return updated;
        });

        const statusVerb =
          newStatus === ReservationStatus.CONFIRMED
            ? 'approved'
            : newStatus === ReservationStatus.COMPLETED
            ? 'marked as completed'
            : 'cancelled';

        setNotification({
          type: 'success',
          message: `Reservation for ${resourceName || 'resource'} successfully ${statusVerb}.`,
        });
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Failed to update reservation status.',
        });
      }
      setUpdatingId(null);
    });
  };

  // Filter & Sort Logic
  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return reservations
      .filter((r) => {
        if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
        if (typeFilter !== 'ALL' && r.resource.type !== typeFilter) return false;

        const startDate = new Date(r.startTime);
        const endDate = new Date(r.endTime);

        if (dateFilter === 'TODAY') {
          if (startDate > endOfToday || endDate < startOfToday) return false;
        } else if (dateFilter === 'UPCOMING') {
          if (endDate < now) return false;
        } else if (dateFilter === 'PAST') {
          if (endDate >= now) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchUser = r.user.fullName.toLowerCase().includes(q) || r.user.email.toLowerCase().includes(q);
          const matchResource =
            r.resource.name.toLowerCase().includes(q) ||
            (r.resource.location && r.resource.location.toLowerCase().includes(q));
          const matchPurpose = r.purpose.toLowerCase().includes(q);

          if (!matchUser && !matchResource && !matchPurpose) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.startTime).getTime();
        const timeB = new Date(b.startTime).getTime();
        return sortBy === 'soonest' ? timeA - timeB : timeB - timeA;
      });
  }, [reservations, statusFilter, typeFilter, dateFilter, searchQuery, sortBy]);

  // Unified, clean category helper (neutral enterprise style)
  const getResourceMeta = (type: ResourceType) => {
    switch (type) {
      case ResourceType.ROOM:
        return { icon: Building2, label: 'Meeting Room' };
      case ResourceType.VEHICLE:
        return { icon: Car, label: 'Fleet Vehicle' };
      case ResourceType.EQUIPMENT:
        return { icon: Tv, label: 'Tech Equipment' };
    }
  };

  // Professional status badge (subtle dot + muted background)
  const getStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case ReservationStatus.PENDING:
        return {
          label: 'Pending Approval',
          style: 'bg-amber-50/70 text-amber-800 border-amber-200/70',
          dot: 'bg-amber-500',
        };
      case ReservationStatus.CONFIRMED:
        return {
          label: 'Confirmed',
          style: 'bg-emerald-50/70 text-emerald-800 border-emerald-200/70',
          dot: 'bg-emerald-500',
        };
      case ReservationStatus.COMPLETED:
        return {
          label: 'Completed',
          style: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
      case ReservationStatus.CANCELLED:
        return {
          label: 'Cancelled',
          style: 'bg-slate-100 text-slate-500 border-slate-200 line-through',
          dot: 'bg-rose-400',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium animate-fade-in ${
            notification.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={15} className="text-rose-500 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Control Bar: Clean & Minimal */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3">
        {/* Row 1: Search + Category + Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={15} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by employee, email, resource or purpose..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="ROOM">Meeting Rooms</option>
              <option value="VEHICLE">Fleet Vehicles</option>
              <option value="EQUIPMENT">Tech Equipment</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
            >
              <option value="soonest">Earliest First</option>
              <option value="latest">Latest First</option>
            </select>
          </div>
        </div>

        {/* Row 2: Status Pills (Unified enterprise gray/black aesthetic) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: `All (${reservations.length})` },
              { id: 'PENDING', label: `Pending (${pendingCount})` },
              { id: 'CONFIRMED', label: `Confirmed (${confirmedCount})` },
              { id: 'COMPLETED', label: `Completed (${completedCount})` },
              { id: 'CANCELLED', label: `Cancelled (${cancelledCount})` },
            ].map(({ id, label }) => {
              const isSelected = statusFilter === id;
              return (
                <button
                  key={id}
                  onClick={() => setStatusFilter(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Timeframe Filter */}
          <div className="flex items-center gap-1">
            {[
              { id: 'ALL', label: 'All Dates' },
              { id: 'TODAY', label: 'Today' },
              { id: 'UPCOMING', label: 'Upcoming' },
              { id: 'PAST', label: 'Past' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setDateFilter(id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  dateFilter === id
                    ? 'bg-slate-200 text-slate-900 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-700">{filtered.length}</strong> of{' '}
          <strong>{reservations.length}</strong> reservations
        </span>
        {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || dateFilter !== 'ALL' || searchQuery) && (
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setTypeFilter('ALL');
              setDateFilter('ALL');
              setSearchQuery('');
            }}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Reservations List */}
      {filtered.length === 0 ? (
        <div className="py-14 text-center bg-white rounded-xl border border-dashed border-slate-200">
          <CalendarClock size={32} className="mx-auto text-slate-300 mb-2" />
          <h3 className="text-xs font-semibold text-slate-700">No reservations found</h3>
          <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search query or filters.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const isUpdating = updatingId === item.id && isPending;
            const isConfirmingReject = confirmingRejectId === item.id;
            const resourceMeta = getResourceMeta(item.resource.type);
            const statusBadge = getStatusBadge(item.status);
            const duration = getDurationHours(item.startTime, item.endTime);
            const ResourceIcon = resourceMeta.icon;
            const isPast = new Date(item.endTime) < new Date();

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3.5"
              >
                {/* Content Left */}
                <div className="space-y-2 flex-1 min-w-0">
                  {/* Line 1: Status & Resource Name (Clean, unified tags) */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Pill with subtle dot */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${statusBadge.style}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                      {statusBadge.label}
                    </span>

                    {/* Category & Resource Tag (Clean neutral slate) */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                      <ResourceIcon size={12} className="text-slate-500" />
                      <span>{item.resource.name}</span>
                    </span>

                    {/* Location */}
                    {item.resource.location && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin size={11} />
                        <span className="truncate max-w-[160px]">{item.resource.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Purpose */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                      {item.purpose}
                    </h3>
                  </div>

                  {/* Employee & Timing */}
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                    {/* Employee Profile */}
                    <div className="flex items-center gap-1.5 pr-2 sm:border-r border-slate-200">
                      <span className="font-medium text-slate-700">{item.user.fullName}</span>
                      <span className="text-slate-400 text-[11px]">({item.user.email})</span>
                    </div>

                    {/* Date and Time */}
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar size={12} className="text-slate-400" />
                      <span>{formatDate(item.startTime)}</span>
                      <span className="text-slate-300">•</span>
                      <Clock size={12} className="text-slate-400" />
                      <span>
                        {formatTime(item.startTime)} – {formatTime(item.endTime)}
                      </span>
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 ml-1">
                        {duration}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Right: Clean Action Buttons */}
                <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                  {/* PENDING ACTIONS */}
                  {item.status === ReservationStatus.PENDING && (
                    isPast ? (
                      <span className="text-xs text-slate-400 px-2 py-1 font-medium">Expired</span>
                    ) : (
                      <div className="flex items-center gap-2 w-full lg:w-auto">
                        {!isConfirmingReject ? (
                          <>
                            <button
                              onClick={() =>
                                handleStatusChange(item.id, ReservationStatus.CONFIRMED, item.resource.name)
                              }
                              disabled={isUpdating}
                              className="flex-1 lg:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                              <span>Approve</span>
                            </button>

                            <button
                              onClick={() => setConfirmingRejectId(item.id)}
                              disabled={isUpdating}
                              className="flex-1 lg:flex-initial px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <X size={13} />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
                            <span className="text-slate-600 px-1 font-medium">Reject booking?</span>
                            <button
                              onClick={() =>
                                handleStatusChange(item.id, ReservationStatus.CANCELLED, item.resource.name)
                              }
                              disabled={isUpdating}
                              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors"
                            >
                              {isUpdating ? <Loader2 size={11} className="animate-spin" /> : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setConfirmingRejectId(null)}
                              className="px-2 py-1 rounded text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              Back
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {/* CONFIRMED ACTIONS */}
                  {item.status === ReservationStatus.CONFIRMED && (
                    <div className="flex items-center gap-2 w-full lg:w-auto">
                      <button
                        onClick={() =>
                          handleStatusChange(item.id, ReservationStatus.COMPLETED, item.resource.name)
                        }
                        disabled={isUpdating}
                        className="flex-1 lg:flex-initial px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={13} />}
                        <span>Complete</span>
                      </button>

                      {/* Cancel button is ONLY shown for future / active reservations - NEVER for past ones */}
                      {!isPast && (
                        !isConfirmingReject ? (
                          <button
                            onClick={() => setConfirmingRejectId(item.id)}
                            disabled={isUpdating}
                            className="flex-1 lg:flex-initial px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
                            <span className="text-slate-600 px-1">Cancel?</span>
                            <button
                              onClick={() =>
                                handleStatusChange(item.id, ReservationStatus.CANCELLED, item.resource.name)
                              }
                              disabled={isUpdating}
                              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium"
                            >
                              {isUpdating ? <Loader2 size={11} className="animate-spin" /> : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmingRejectId(null)}
                              className="px-2 py-1 rounded text-slate-600 hover:bg-slate-200"
                            >
                              No
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* COMPLETED */}
                  {item.status === ReservationStatus.COMPLETED && (
                    <span className="text-xs text-slate-400 px-2 py-1 font-medium">
                      Fulfilled
                    </span>
                  )}

                  {/* CANCELLED */}
                  {item.status === ReservationStatus.CANCELLED && (
                    <span className="text-xs text-slate-400 px-2 py-1 font-medium">
                      Cancelled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
