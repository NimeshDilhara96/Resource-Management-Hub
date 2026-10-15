'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, CheckCircle2, Clock3, XCircle, Trash2, Loader2, MapPin, Plus } from 'lucide-react';
import { formatTimeRange } from '@/lib/utils';
import { ReservationStatus, ResourceType } from '@prisma/client';
import { cancelReservationAction } from '@/actions/reservation.actions';

interface ReservationItem {
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
    capacity: number | null;
  };
}

interface Props {
  initialReservations: ReservationItem[];
  onReservationCancelled?: (id: string) => void;
  onBookNew?: () => void;
}

export default function MyReservationsList({
  initialReservations,
  onReservationCancelled,
  onBookNew,
}: Props) {
  const [reservations, setReservations] = useState(initialReservations);
  const [filterTab, setFilterTab] = useState('ACTIVE');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setReservations(initialReservations);
  }, [initialReservations]);

  const now = new Date();

  const filtered = reservations.filter(r => {
    const isUpcoming = new Date(r.endTime) >= now;
    if (filterTab === 'ACTIVE') {
      return isUpcoming && (r.status === ReservationStatus.CONFIRMED || r.status === ReservationStatus.PENDING);
    }
    if (filterTab === 'COMPLETED') {
      return r.status === ReservationStatus.COMPLETED || (!isUpcoming && r.status !== ReservationStatus.CANCELLED);
    }
    if (filterTab === 'CANCELLED') return r.status === ReservationStatus.CANCELLED;
    return true;
  });

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this reservation? The slot will become available for others.')) return;
    setCancellingId(id);
    const res = await cancelReservationAction(id);
    if (res.success) {
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status: ReservationStatus.CANCELLED } : r));
      setActionMsg({ type: 'success', text: 'Reservation cancelled successfully.' });
      if (onReservationCancelled) {
        onReservationCancelled(id);
      }
    } else {
      setActionMsg({ type: 'error', text: res.error || 'Failed to cancel.' });
    }
    setCancellingId(null);
  };

  const activeCount = reservations.filter(r =>
    new Date(r.endTime) >= now && (r.status === ReservationStatus.CONFIRMED || r.status === ReservationStatus.PENDING)
  ).length;

  const statusBadge = (status: ReservationStatus, endTime: Date | string, resourceType?: ResourceType) => {
    const isPast = new Date(endTime) < now;
    const isPhysical = resourceType === ResourceType.VEHICLE || resourceType === ResourceType.EQUIPMENT;

    if (status === ReservationStatus.CANCELLED)
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Cancelled
        </span>
      );

    if (status === ReservationStatus.COMPLETED)
      return (
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-md border ${
            isPhysical
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isPhysical ? 'bg-emerald-500' : 'bg-slate-500'}`} />
          {isPhysical ? 'Returned' : 'Completed'}
        </span>
      );

    if (status === ReservationStatus.CONFIRMED) {
      if (isPast) {
        if (isPhysical) {
          return (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Awaiting Return
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Completed
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-700 text-white shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
          {isPhysical ? 'Approved (Issued)' : 'Approved (Confirmed)'}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Awaiting Admin Approval
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {actionMsg && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-sm font-medium ${
          actionMsg.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-current opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'ACTIVE', label: `Active (${activeCount})` },
          { key: 'COMPLETED', label: 'Completed / Returned' },
          { key: 'CANCELLED', label: 'Cancelled' },
          { key: 'ALL', label: `All (${reservations.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterTab(key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTab === key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-white border border-slate-200 border-dashed p-6">
          <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-700">No reservations in this section</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Go to the Timeline to book resources.</p>
          {onBookNew && (
            <button
              onClick={onBookNew}
              className="mt-3 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#ff6b35] hover:bg-[#e55a25] transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus size={13} />
              <span>Book a Resource</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const isUpcoming = new Date(item.endTime) >= now;
            const canCancel = isUpcoming && item.status !== ReservationStatus.CANCELLED && item.status !== ReservationStatus.COMPLETED;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {statusBadge(item.status, item.endTime, item.resource.type)}
                    <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {item.resource.type}
                    </span>
                    {item.resource.location && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin size={10} /> {item.resource.location}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-800">{item.resource.name}</h3>

                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                    <Clock size={13} className="text-[#ff6b35]" />
                    {formatTimeRange(item.startTime, item.endTime)}
                  </div>

                  <p className="text-xs text-slate-400">
                    <span className="font-medium text-slate-500">Purpose: </span>
                    {item.purpose}
                  </p>
                </div>

                {canCancel && (
                  <button
                    onClick={() => handleCancel(item.id)}
                    disabled={cancellingId === item.id}
                    className="self-end sm:self-center flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                  >
                    {cancellingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Cancel
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
