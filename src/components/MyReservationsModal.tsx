'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  CalendarCheck,
  RefreshCw,
  Loader2,
  Plus,
} from 'lucide-react';
import MyReservationsList from '@/components/MyReservationsList';
import { getMyReservationsAction } from '@/actions/reservation.actions';

interface MyReservationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookNew?: () => void;
  onReservationCancelled?: (id: string) => void;
  initialReservations?: any[];
}

export default function MyReservationsModal({
  isOpen,
  onClose,
  onBookNew,
  onReservationCancelled,
  initialReservations,
}: MyReservationsModalProps) {
  const [reservations, setReservations] = useState<any[]>(initialReservations || []);
  const [isLoading, setIsLoading] = useState(!initialReservations);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch or refresh latest user reservations
  const loadReservations = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else if (!initialReservations) {
      setIsLoading(true);
    }

    try {
      const res = await getMyReservationsAction();
      if (res.success && Array.isArray(res.reservations)) {
        setReservations(res.reservations);
      }
    } catch (err) {
      console.error('Failed to load user reservations:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [initialReservations]);

  // Load when modal opens
  useEffect(() => {
    if (isOpen) {
      loadReservations();
    }
  }, [isOpen, loadReservations]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCancelled = (id: string) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r))
    );
    if (onReservationCancelled) {
      onReservationCancelled(id);
    }
  };

  const handleBookNew = () => {
    onClose();
    if (onBookNew) {
      onBookNew();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs text-[#ff6b35]">
              <CalendarCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 leading-tight">My Bookings</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {reservations.length} total
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your scheduled bookings, view return status, and cancel slots.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => loadReservations(true)}
              disabled={isRefreshing}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Refresh reservations"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-[#ff6b35]' : ''} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 size={24} className="animate-spin text-[#ff6b35]" />
              <p className="text-xs text-slate-500 font-medium">Loading your bookings...</p>
            </div>
          ) : (
            <MyReservationsList
              initialReservations={reservations}
              onReservationCancelled={handleCancelled}
              onBookNew={handleBookNew}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-500 hidden sm:inline">

          </span>
          <div className="flex items-center gap-2 ml-auto">
            {onBookNew && (
              <button
                onClick={handleBookNew}
                className="px-3.5 py-1.5 rounded-xl font-semibold text-white bg-[#ff6b35] hover:bg-[#e55a25] flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
              >
                <Plus size={13} />
                <span>Book New</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
