'use client';

import { X, Calendar, Clock, User, CheckCircle2, Clock3 } from 'lucide-react';
import { formatTimeRange } from '@/lib/utils';
import { ResourceType, ReservationStatus } from '@prisma/client';

interface ReservationItem {
  id: string;
  startTime: Date | string;
  endTime: Date | string;
  purpose: string;
  status: ReservationStatus;
  user?: {
    fullName: string;
    email: string;
  };
}

interface ResourceScheduleModalProps {
  resource: {
    id: string;
    name: string;
    type: ResourceType;
    location: string | null;
    capacity: number | null;
    status: string;
    reservations?: ReservationItem[];
  };
  isOpen: boolean;
  onClose: () => void;
  onBookClick?: () => void;
}

export default function ResourceScheduleModal({
  resource,
  isOpen,
  onClose,
  onBookClick,
}: ResourceScheduleModalProps) {
  if (!isOpen) return null;

  const reservations = resource.reservations || [];
  const activeBookings = reservations.filter(
    (r) => r.status !== ReservationStatus.CANCELLED
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0f172a] border border-white/10 shadow-2xl shadow-indigo-950/50 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-slate-900/90 flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-indigo-400 mb-1">
              Resource Availability & Bookings
            </div>
            <h3 className="text-xl font-bold text-white">{resource.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {resource.type} {resource.location && `• ${resource.location}`}{' '}
              {resource.capacity && `• Cap: ${resource.capacity}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {activeBookings.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
              <Calendar size={36} className="mx-auto text-slate-500 mb-3" />
              <div className="text-sm font-semibold text-white">
                No active bookings scheduled
              </div>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                This resource is currently completely free and available for reservations.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Scheduled Reservations ({activeBookings.length})
              </div>
              {activeBookings.map((res) => {
                const isConfirmed = res.status === ReservationStatus.CONFIRMED;
                return (
                  <div
                    key={res.id}
                    className="p-4 rounded-xl bg-slate-900/70 border border-white/10 hover:border-white/20 transition-all flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            isConfirmed
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {isConfirmed ? (
                            <CheckCircle2 size={11} />
                          ) : (
                            <Clock3 size={11} />
                          )}
                          {res.status}
                        </span>
                        <span className="text-xs font-medium text-indigo-300 flex items-center gap-1">
                          <Clock size={12} />
                          {formatTimeRange(res.startTime, res.endTime)}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-white pt-1">
                        {res.purpose}
                      </div>
                      {res.user && (
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-0.5">
                          <User size={12} className="text-slate-500" />
                          <span>Reserved by:</span>
                          <span className="text-slate-300 font-medium">
                            {res.user.fullName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/80 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {activeBookings.length} active reservation(s) on schedule
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Close
            </button>
            {onBookClick && (
              <button
                onClick={() => {
                  onClose();
                  onBookClick();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 transition-all"
              >
                Book This Resource
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
