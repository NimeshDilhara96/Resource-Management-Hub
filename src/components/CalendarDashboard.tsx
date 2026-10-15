'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Users,
  MapPin,
  Building2,
  Car,
  Tv,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar as CalendarIcon,
  Sparkles,
  LogOut,
  CalendarCheck,
  ShieldCheck,
  Info,
  Wrench,
} from 'lucide-react';
import { ReservationStatus, ResourceStatus, ResourceType } from '@prisma/client';
import { logout } from '@/actions/auth.actions';
import {
  checkAvailabilityAction,
  createReservationAction,
  cancelReservationAction,
} from '@/actions/reservation.actions';
import { formatErrorMessage } from '@/lib/utils';
import MyReservationsModal from '@/components/MyReservationsModal';
import NotificationCenter from '@/components/NotificationCenter';

// ──────────────────────── Types ────────────────────────
export interface ResourceData {
  id: string;
  name: string;
  type: ResourceType;
  description: string | null;
  capacity: number | null;
  location: string | null;
  status: ResourceStatus;
  isOccupiedNow?: boolean;
  reservations: Array<{
    id: string;
    startTime: Date | string;
    endTime: Date | string;
    purpose: string;
    status: ReservationStatus;
    user?: { fullName: string; email: string };
  }>;
}

interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface Props {
  resources: ResourceData[];
  session: SessionUser;
  initialUserReservations?: any[];
}

// ──────────────────────── Helpers ────────────────────────
const HOUR_WIDTH = 110; // px per hour in timeline (larger for better legibility)
const BASE_START_HOUR = 7;
const END_HOUR = 23;

const TYPE_ICONS: Record<ResourceType, React.FC<any>> = {
  ROOM: Building2,
  VEHICLE: Car,
  EQUIPMENT: Tv,
};

const TYPE_COLORS: Record<ResourceType, { bg: string; text: string; border: string; pill: string }> = {
  ROOM: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    pill: 'bg-slate-100 text-slate-700 border border-slate-200',
  },
  VEHICLE: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    pill: 'bg-slate-100 text-slate-700 border border-slate-200',
  },
  EQUIPMENT: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    pill: 'bg-slate-100 text-slate-700 border border-slate-200',
  },
};

const STATUS_COLORS: Record<ReservationStatus, string> = {
  CONFIRMED: 'bg-slate-900 text-white',
  PENDING: 'bg-amber-100 text-amber-800 border border-amber-300',
  CANCELLED: 'bg-slate-100 text-slate-500 border border-slate-200',
  COMPLETED: 'bg-slate-100 text-slate-600 border border-slate-200',
};

function fmt(date: Date | string) {
  return new Date(date);
}

function toMinutes(date: Date | string) {
  const d = fmt(date);
  return d.getHours() * 60 + d.getMinutes();
}

function minutesToLeft(totalMinutes: number, startHour: number) {
  return ((totalMinutes - startHour * 60) / 60) * HOUR_WIDTH;
}

function minutesToWidth(start: Date | string, end: Date | string) {
  const diff = (fmt(end).getTime() - fmt(start).getTime()) / (1000 * 60);
  return (diff / 60) * HOUR_WIDTH;
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatHour24(h: number) {
  return `${h.toString().padStart(2, '0')}:00`;
}

// Mini-calendar helpers
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// ──────────────────────── Mini Calendar ────────────────────────
function MiniCalendar({
  selectedDate,
  onSelect,
  isEmployee,
}: {
  selectedDate: Date;
  onSelect: (d: Date) => void;
  isEmployee: boolean;
}) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const isCurrentMonthOrPast =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth <= today.getMonth());

  const prev = () => {
    if (isEmployee && isCurrentMonthOrPast) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const next = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prev}
          disabled={isEmployee && isCurrentMonthOrPast}
          title={isEmployee && isCurrentMonthOrPast ? 'Cannot view past months' : 'Previous month'}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${isEmployee && isCurrentMonthOrPast
            ? 'opacity-30 cursor-not-allowed text-slate-300'
            : 'hover:bg-slate-100 text-slate-500'
            }`}
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-bold text-slate-700">{monthLabel}</span>
        <button
          onClick={next}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          title="Next month"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-px">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />;
          const date = new Date(viewYear, viewMonth, d);
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const isPast = isEmployee && date < todayStart;

          if (isPast) {
            return (
              <button
                key={d}
                disabled
                title="Past dates cannot be selected"
                className="w-8 h-8 mx-auto flex items-center justify-center rounded-full text-xs font-normal text-slate-300 cursor-not-allowed select-none opacity-40"
              >
                {d}
              </button>
            );
          }

          return (
            <button
              key={d}
              onClick={() => onSelect(date)}
              className={`
                w-8 h-8 mx-auto flex items-center justify-center rounded-full text-xs font-medium
                transition-all
                ${isSelected
                  ? 'bg-[#ff6b35] text-white font-bold shadow-sm'
                  : isToday
                    ? 'bg-orange-50 text-[#ff6b35] font-bold ring-1 ring-[#ff6b35]/30'
                    : 'text-slate-700 hover:bg-slate-100'
                }
              `}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────── Time Helpers & Slots ────────────────────────
function formatTime12h(timeStr: string) {
  if (!timeStr) return '';
  if (timeStr === '23:59') return '11:59 PM (End of day)';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getTimeSlotOptions(startHour = 7, endHour = 23, step = 30) {
  const options: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += step) {
      if (h === endHour && m > 30) continue;
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
}

// ──────────────────────── Booking Quick-Form ────────────────────────
function BookingForm({
  resource,
  selectedDate,
  prefilledStart,
  prefilledEnd,
  onClose,
  onSuccess,
}: {
  resource: ResourceData;
  selectedDate: Date;
  prefilledStart?: string;
  prefilledEnd?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const now = new Date();
  const isToday = isSameDay(selectedDate, now);
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

  // All 30-min standard slots (07:00 to 23:30)
  const allBaseSlots = getTimeSlotOptions(7, 23, 30);

  // If TODAY: HIDE all slots in the past! Only keep future slots from current time forward
  const availableStartSlots = isToday
    ? allBaseSlots.filter((slot) => {
      const [h, m] = slot.split(':').map(Number);
      return h * 60 + m >= currentTotalMinutes;
    })
    : allBaseSlots;

  // Determine initial start time
  const getInitialStart = () => {
    if (prefilledStart && availableStartSlots.includes(prefilledStart)) {
      return prefilledStart;
    }
    return availableStartSlots[0] || '';
  };

  const initialStart = getInitialStart();

  const getInitialEnd = (startVal: string) => {
    if (!startVal) return '';
    const [sh, sm] = startVal.split(':').map(Number);
    const startM = sh * 60 + sm;

    if (prefilledEnd) {
      const [eh, em] = prefilledEnd.split(':').map(Number);
      if (eh * 60 + em > startM) {
        return prefilledEnd;
      }
    }

    const endM = Math.min(startM + 60, 24 * 60);
    if (endM >= 24 * 60) return '23:59';
    return `${String(Math.floor(endM / 60)).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
  };

  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(getInitialEnd(initialStart));
  const [purpose, setPurpose] = useState('');
  const [availability, setAvailability] = useState<{
    checked: boolean;
    available?: boolean;
    message?: string;
  }>({ checked: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

  // End time slots must strictly be AFTER startTime
  const [stH, stM] = (startTime || '10:00').split(':').map(Number);
  const startTotalMinutes = stH * 60 + stM;

  const allEndSlots = [...allBaseSlots, '23:59'];
  const availableEndSlots = allEndSlots.filter((slot) => {
    if (slot === '23:59') return 24 * 60 > startTotalMinutes;
    const [h, m] = slot.split(':').map(Number);
    return h * 60 + m > startTotalMinutes;
  });

  const checkAvail = async (st = startTime, et = endTime) => {
    if (!st || !et) return;
    const s = new Date(`${dateStr}T${st}:00`);
    const e = new Date(`${dateStr}T${et === '23:59' ? '23:59:59' : `${et}:00`}`);
    if (e <= s) {
      setAvailability({ checked: true, available: false, message: 'End time must be after start time.' });
      return;
    }

    setAvailability({ checked: true, available: undefined, message: 'Checking availability...' });
    const res = await checkAvailabilityAction({
      resourceId: resource.id,
      startTime: s.toISOString(),
      endTime: e.toISOString(),
    });

    if (res.available) {
      setAvailability({ checked: true, available: true, message: 'Slot is available' });
    } else {
      setAvailability({
        checked: true,
        available: false,
        message: res.conflict
          ? `Conflict: Already reserved (${new Date(res.conflict.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(res.conflict.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
          : formatErrorMessage(res.error) || res.message || 'This slot is not available.',
      });
    }
  };

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const [h, m] = newStart.split(':').map(Number);
    const newStartM = h * 60 + m;

    const [curEndH, curEndM] = (endTime || '00:00').split(':').map(Number);
    const curEndTotal = curEndH * 60 + curEndM;

    let nextEnd = endTime;
    if (curEndTotal <= newStartM || !endTime) {
      const nextEndM = Math.min(newStartM + 60, 24 * 60);
      if (nextEndM >= 24 * 60) {
        nextEnd = '23:59';
      } else {
        nextEnd = `${String(Math.floor(nextEndM / 60)).padStart(2, '0')}:${String(nextEndM % 60).padStart(2, '0')}`;
      }
      setEndTime(nextEnd);
    }
    checkAvail(newStart, nextEnd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      setError('Please select valid start and end times.');
      return;
    }
    if (!purpose.trim()) {
      setError('Please add a purpose or meeting title.');
      return;
    }
    if (purpose.trim().length < 3) {
      setError('Purpose must be at least 3 characters long.');
      return;
    }

    const s = new Date(`${dateStr}T${startTime}:00`);
    const en = new Date(`${dateStr}T${endTime === '23:59' ? '23:59:59' : `${endTime}:00`}`);
    if (en <= s) {
      setError('End time must be after start time.');
      return;
    }

    setLoading(true);
    setError(null);
    const res = await createReservationAction({
      resourceId: resource.id,
      startTime: s.toISOString(),
      endTime: en.toISOString(),
      purpose: purpose.trim(),
    });
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 1000);
    } else {
      setError(formatErrorMessage(res.error) || 'Booking failed.');
    }
  };

  const TypeIcon = TYPE_ICONS[resource.type];
  const tc = TYPE_COLORS[resource.type];

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className={`p-5 ${tc.bg} border-b ${tc.border} flex items-start justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm`}>
              <TypeIcon size={20} className={tc.text} />
            </div>
            <div>
              <div className={`text-xs font-bold ${tc.text} uppercase tracking-wide`}>{resource.type}</div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">{resource.name}</h3>
              {resource.location && (
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={11} /> {resource.location}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-white/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock size={32} className="text-amber-500" />
            </div>
            <h4 className="text-lg font-bold text-slate-800">Booking Submitted!</h4>
            <p className="text-sm text-slate-500 mt-1">Your reservation is pending administrator approval.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Date display */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm text-slate-600 font-medium">
              <span className="text-[#ff6b35] font-bold flex items-center gap-1.5">
                <CalendarIcon size={14} />
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
              {isToday && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                  Today (Upcoming Only)
                </span>
              )}
            </div>

            {/* Time pickers - Custom Dropdowns with Old Times Hidden */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
                  <span>Start Time</span>
                  {isToday && (
                    <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      Active
                    </span>
                  )}
                </label>
                <div className="relative">
                  <select
                    value={startTime}
                    disabled={availableStartSlots.length === 0}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] bg-white text-slate-800 font-medium cursor-pointer pr-8 appearance-none shadow-sm transition-all hover:border-slate-300 disabled:bg-slate-50 disabled:cursor-not-allowed"
                  >
                    {availableStartSlots.length === 0 ? (
                      <option disabled value="">No slots left today</option>
                    ) : (
                      availableStartSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {formatTime12h(slot)}
                        </option>
                      ))
                    )}
                  </select>
                  <Clock size={15} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                  End Time
                </label>
                <div className="relative">
                  <select
                    value={endTime}
                    disabled={availableEndSlots.length === 0}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      checkAvail(startTime, e.target.value);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] bg-white text-slate-800 font-medium cursor-pointer pr-8 appearance-none shadow-sm transition-all hover:border-slate-300 disabled:bg-slate-50 disabled:cursor-not-allowed"
                  >
                    {availableEndSlots.length === 0 ? (
                      <option disabled value="">Select start time first</option>
                    ) : (
                      availableEndSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {formatTime12h(slot)}
                        </option>
                      ))
                    )}
                  </select>
                  <Clock size={15} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* If today has no remaining slots */}
            {isToday && availableStartSlots.length === 0 && (
              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs flex items-center justify-between gap-2">
                <span>Operating hours for today have closed.</span>
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#ff6b35] text-white font-bold text-[10px]"
                >
                  Pick Tomorrow
                </button>
              </div>
            )}

            {/* Availability indicator */}
            {availability.checked && (
              <div
                className={`px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2
                ${availability.available === undefined
                    ? 'bg-slate-50 text-slate-500'
                    : availability.available
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
              >
                {availability.available === undefined ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : availability.available ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <AlertTriangle size={13} />
                )}
                {availability.message}
              </div>
            )}

            {/* Purpose */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-500">Purpose / Meeting Title</label>
                <span className={`text-[10px] ${purpose.trim().length > 0 && purpose.trim().length < 3 ? 'text-amber-500 font-semibold' : 'text-slate-400'}`}>
                  {purpose.trim().length < 3 ? 'Min. 3 characters' : `${purpose.length}/255`}
                </span>
              </div>
              <input
                type="text"
                placeholder="e.g. Sprint Planning, Client Presentation"
                value={purpose}
                maxLength={255}
                onChange={(e) => {
                  setPurpose(e.target.value);
                  if (error && e.target.value.trim().length >= 3) {
                    setError(null);
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] bg-white placeholder:text-slate-300 transition-all"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-500" />
                <span className="leading-snug">{formatErrorMessage(error)}</span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  !startTime ||
                  !endTime ||
                  (availability.checked && availability.available === false) ||
                  (isToday && availableStartSlots.length === 0)
                }
                className="flex-1 py-2.5 rounded-xl bg-[#ff6b35] text-white text-sm font-bold hover:bg-[#e55a25] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Submit Booking Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ──────────────────────── Main Calendar Dashboard ────────────────────────
export default function CalendarDashboard({
  resources,
  session,
  initialUserReservations = [],
}: Props) {
  const [resourcesList, setResourcesList] = useState<ResourceData[]>(resources);
  const [userReservations, setUserReservations] = useState<any[]>(initialUserReservations);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'ALL'>('ALL');
  const [bookingResource, setBookingResource] = useState<ResourceData | null>(null);
  const [selectedResourceDetails, setSelectedResourceDetails] = useState<ResourceData | null>(null);
  const [showMyBookingsModal, setShowMyBookingsModal] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [prefilledTime, setPrefilledTime] = useState<{ start: string; end: string } | undefined>();
  const [tooltipReservation, setTooltipReservation] = useState<{ res: any; x: number; y: number } | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Sync state whenever props update
  useEffect(() => {
    setResourcesList(resources);
  }, [resources]);

  useEffect(() => {
    if (initialUserReservations && initialUserReservations.length > 0) {
      setUserReservations(initialUserReservations);
    }
  }, [initialUserReservations]);

  // Silent background real-time sync for the timeline (strictly zero text indicators, no buttons)
  const fetchTimelineLatest = useCallback(async () => {
    try {
      const res = await fetch('/api/timeline', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.resources)) {
        setResourcesList(data.resources);
      }
      if (data.success && Array.isArray(data.userReservations)) {
        setUserReservations(data.userReservations);
      }
    } catch {
      // Silent error suppression so UI is never interrupted
    }
  }, []);

  useEffect(() => {
    // Poll every 3.5 seconds for instant real-time synchronization
    const interval = setInterval(fetchTimelineLatest, 3500);
    return () => clearInterval(interval);
  }, [fetchTimelineLatest]);

  // Keep details modals fresh with live synced data
  useEffect(() => {
    if (selectedResourceDetails) {
      const fresh = resourcesList.find((r) => r.id === selectedResourceDetails.id);
      if (fresh) setSelectedResourceDetails(fresh);
    }
  }, [resourcesList]);

  // Auto-open My Bookings modal if navigating via /my-reservations or query param ?modal=my-bookings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('modal') === 'my-bookings' || params.get('view') === 'my-bookings') {
        setShowMyBookingsModal(true);
        window.history.replaceState({}, '', '/dashboard');
      }
    }
  }, []);

  const now = new Date();
  const isEmployee = session.role !== 'ADMIN';
  const isToday = isSameDay(selectedDate, now);
  const currentHour = now.getHours();

  // For employees on today: do NOT show past hours! Start directly at the current hour.
  // Ensure at least 3 hours are visible if it is late in the day.
  // For future dates or admin users, show the full day (07:00 to 23:00).
  const effectiveStartHour = isEmployee && isToday
    ? Math.min(Math.max(BASE_START_HOUR, currentHour), END_HOUR - 3)
    : BASE_START_HOUR;

  const totalHours = Math.max(3, END_HOUR - effectiveStartHour);
  const isTodayPastHours = isEmployee && isToday && currentHour >= END_HOUR;

  // Clamp date: if an employee ever has a past date selected, clamp to today
  useEffect(() => {
    if (isEmployee) {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (selectedDate < todayStart) {
        setSelectedDate(new Date());
      }
    }
  }, [selectedDate, isEmployee]);

  // Scroll to start of timeline or current time
  useEffect(() => {
    if (timelineContainerRef.current) {
      timelineContainerRef.current.scrollLeft = 0;
    }
  }, [selectedDate]);

  const filteredResources = resourcesList.filter((r) => {
    if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
    return true;
  });

  // Current time indicator position relative to effectiveStartHour
  const nowLeft = isToday
    ? minutesToLeft(now.getHours() * 60 + now.getMinutes(), effectiveStartHour)
    : null;


  // Scroll time horizontally when hovering over the top Hours Header ruler
  const handleHeaderWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      if (timelineContainerRef.current) {
        timelineContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  const handleTimelineClick = (resource: ResourceData, e: React.MouseEvent<HTMLDivElement>) => {
    if (session.role === 'ADMIN' || resource.status !== ResourceStatus.ACTIVE) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickedMinutes = (clickX / HOUR_WIDTH) * 60 + effectiveStartHour * 60;
    const roundedMinutes = Math.round(clickedMinutes / 30) * 30;

    const currentNow = new Date();
    const currentTotalMinutes = currentNow.getHours() * 60 + currentNow.getMinutes();
    let validMinutes = roundedMinutes;

    // Prevent past minutes if viewing today!
    if (isToday && validMinutes < currentTotalMinutes) {
      validMinutes = Math.ceil((currentTotalMinutes + 5) / 30) * 30;
    }

    let startH = Math.floor(validMinutes / 60);
    let startM = validMinutes % 60;
    if (startH >= 24) {
      startH = 23;
      startM = 30;
    }
    const endMinutes = Math.min(validMinutes + 60, 23 * 60 + 59);
    let endH = Math.floor(endMinutes / 60);
    let endM = endMinutes % 60;

    const startStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
    const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    setPrefilledTime({ start: startStr, end: endStr });
    setBookingResource(resource);
  };

  const handleCancelReservation = async (reservationId: string) => {
    setCancellingId(reservationId);
    await cancelReservationAction(reservationId);
    setCancellingId(null);
    setTooltipReservation(null);
    window.location.reload();
  };

  const typeTabs = [
    { key: 'ALL', label: 'All Resources' },
    { key: ResourceType.ROOM, label: 'Rooms' },
    { key: ResourceType.VEHICLE, label: 'Vehicles' },
    { key: ResourceType.EQUIPMENT, label: 'Equipment' },
  ] as const;

  const canGoPrev = !isEmployee || !isToday;

  return (
    <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden">
      {/* ── Top App Bar ── */}
      <header className="flex-none bg-white border-b border-slate-200 h-14 flex items-center px-5 gap-4 relative z-50 shadow-xs">
        <div className="flex items-center gap-2.5 mr-4">
          <div className="w-8 h-8 rounded-xl bg-[#ff6b35] flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <span className="text-sm font-black text-slate-800 tracking-tight">ResHub</span>
        </div>

        {/* Type filter tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl">
          {typeTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${typeFilter === tab.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Selected date nav - Past days disabled for employees */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => {
                if (!canGoPrev) return;
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d);
              }}
              disabled={!canGoPrev}
              title={!canGoPrev ? 'Cannot view past dates' : 'Previous day'}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${!canGoPrev
                ? 'opacity-30 cursor-not-allowed text-slate-300'
                : 'hover:bg-slate-100 text-slate-500'
                }`}
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              {isToday && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              <span>
                {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              {isToday && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                  Today
                </span>
              )}
            </button>

            <button
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              title="Next day"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Nav links: Notification Bell + My Bookings / Admin Hub */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 shrink-0">
            {/* Real-time Employee Notification Center */}
            <NotificationCenter
              userId={session.id}
              userReservations={userReservations}
              onOpenMyBookings={() => setShowMyBookingsModal(true)}
            />

            {session.role !== 'ADMIN' ? (
              <button
                type="button"
                onClick={() => setShowMyBookingsModal(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CalendarCheck size={14} className="text-[#ff6b35]" />
                <span className="hidden sm:inline">My Bookings</span>
              </button>
            ) : (
              <Link
                href="/admin"
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200/60 transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck size={14} />
                <span className="hidden sm:inline">Admin Hub</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Body: Sidebar + Timeline ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="flex-none w-60 bg-white border-r border-slate-200 flex flex-col overflow-y-auto p-4 gap-4">
          {/* Mini Calendar */}
          <MiniCalendar
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            isEmployee={isEmployee}
          />

          {/* Resource quick-stats - Clean enterprise slate styling */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resources</div>
            {[
              {
                key: ResourceType.ROOM,
                label: 'Rooms',
                count: resourcesList.filter((r) => r.type === ResourceType.ROOM).length,
              },
              {
                key: ResourceType.VEHICLE,
                label: 'Vehicles',
                count: resourcesList.filter((r) => r.type === ResourceType.VEHICLE).length,
              },
              {
                key: ResourceType.EQUIPMENT,
                label: 'Equipment',
                count: resourcesList.filter((r) => r.type === ResourceType.EQUIPMENT).length,
              },
            ].map(({ key, label, count }) => (
              <div
                key={key}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  typeFilter === key
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold border border-slate-200/60'
                    : 'text-slate-600 hover:bg-slate-100/80'
                }`}
                onClick={() => setTypeFilter(typeFilter === key ? 'ALL' : key)}
              >
                <span>{label}</span>
                <span className="text-xs font-bold text-slate-700 bg-slate-200/60 px-1.5 py-0.5 rounded-md">
                  {count}
                </span>
              </div>
            ))}
          </div>

          {/* User Profile & Logout section in Sidebar (Always 100% visible on any screen) */}
          <div className="mt-auto pt-4 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 bg-slate-800">
                {session.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-800 truncate leading-tight">{session.fullName}</div>
                <div className="text-[10px] text-slate-400 font-medium">{session.role}</div>
              </div>
            </div>

            {session.role !== 'ADMIN' && (
              <button
                type="button"
                onClick={() => setShowMyBookingsModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                <CalendarCheck size={14} className="text-[#ff6b35]" />
                <span>My Bookings</span>
              </button>
            )}

            <form action={logout}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer shadow-xs"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </aside>

        {/* Main Timeline Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {isTodayPastHours ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center bg-[#f5f6fa]">
              <div className="max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="w-14 h-14 bg-orange-100 text-[#ff6b35] rounded-2xl flex items-center justify-center mx-auto">
                  <Clock size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Today's Operating Hours Have Ended</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Operating hours for today have closed ({END_HOUR}:00). Please select tomorrow or an upcoming date to reserve resources.
                </p>
                <button
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setSelectedDate(tomorrow);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#ff6b35] text-white text-xs font-bold hover:bg-[#e55a25] transition-all shadow-md shadow-orange-500/20"
                >
                  View Tomorrow's Schedule →
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
              {/* Timeline Navigation Toolbar */}
              <div className="flex-none px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shadow-xs">
                {/* Active Selected Layer Indicator */}
                {selectedLayerId ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-orange-50 border border-orange-200 text-[#ff6b35] text-xs font-bold animate-fade-in shadow-xs">
                    <span>🎯 Active Layer: {resources.find((r) => r.id === selectedLayerId)?.name}</span>
                    <span className="text-[10px] font-normal text-slate-500 hidden sm:inline">(Wheel over row scrolls time)</span>
                    <button
                      type="button"
                      onClick={() => setSelectedLayerId(null)}
                      className="text-slate-400 hover:text-red-500 ml-1 p-0.5 cursor-pointer"
                      title="Deselect layer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#ff6b35] shadow-2xs" />
                    <span className="font-bold text-slate-800">Confirmed (Mine)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 border border-slate-300" />
                    <span className="font-medium text-slate-600">Confirmed (Others)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border-2 border-dashed border-amber-500" />
                    <span className="font-semibold text-amber-800">Pending Approval</span>
                  </span>
                </div>
              </div>

              {/* Unified Scrollable Timeline Grid */}
              <div
                ref={timelineContainerRef}
                className="flex-1 overflow-auto bg-slate-50 relative select-none"
              >
                <div
                  style={{ minWidth: 240 + totalHours * HOUR_WIDTH }}
                  className="min-h-full flex flex-col bg-white"
                >
                  {/* Sticky Header Row */}
                  <div className="sticky top-0 z-30 flex bg-white border-b border-slate-200 shadow-xs">
                    {/* Sticky Top-Left Corner */}
                    <div className="sticky left-0 z-40 w-60 bg-slate-50 border-r border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        {filteredResources.length} Resources
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Click name for info</span>
                    </div>

                    {/* Hours Columns: Hovering & wheeling here scrolls time horizontally */}
                    <div
                      className="flex cursor-ew-resize"
                      title="Scroll mouse wheel over hours ruler to scroll time left/right"
                      onWheel={handleHeaderWheel}
                    >
                      {Array.from({ length: totalHours + 1 }, (_, i) => {
                        const hour = effectiveStartHour + i;
                        return (
                          <div
                            key={i}
                            className="flex-none text-left border-l border-slate-100"
                            style={{ width: HOUR_WIDTH }}
                          >
                            <div className="text-[11px] font-semibold text-slate-500 py-3 px-2 flex items-center gap-1">
                              <span>{formatHour24(hour)}</span>
                              {isToday && hour === currentHour && (
                                <span className="text-[9px] font-extrabold text-[#ff6b35] bg-orange-50 px-1 py-0.5 rounded border border-orange-200">
                                  NOW
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resource Rows */}
                  <div className="flex-1 divide-y divide-slate-100">
                    {filteredResources.length === 0 ? (
                      <div className="py-20 text-center text-slate-400">
                        <Building2 size={40} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">No resources match the selected filter</p>
                      </div>
                    ) : (
                      filteredResources.map((resource) => {
                        const isLayerSelected = selectedLayerId === resource.id;
                        const reservations = resource.reservations.filter((r) => {
                          const start = fmt(r.startTime);
                          const end = fmt(r.endTime);
                          if (!isSameDay(start, selectedDate)) return false;
                          if (r.status === ReservationStatus.CANCELLED) return false;
                          // Hide past reservations on today for employees
                          if (isEmployee && isToday && end.getTime() <= now.getTime()) {
                            return false;
                          }
                          return true;
                        });

                        const isInactive = resource.status === ResourceStatus.INACTIVE;
                        const tc = TYPE_COLORS[resource.type];
                        const TypeIcon = TYPE_ICONS[resource.type];

                        return (
                          <div
                            key={resource.id}
                            className={`flex transition-colors group ${
                              isInactive
                                ? 'bg-slate-100/90'
                                : isLayerSelected
                                ? 'bg-orange-50/20'
                                : 'hover:bg-orange-50/15'
                            }`}
                            style={{ minHeight: 96 }}
                          >
                            {/* Sticky Left Resource Card */}
                            <div
                              className={`sticky left-0 z-20 w-60 border-r p-3.5 flex flex-col justify-between shrink-0 transition-colors shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] ${
                                isInactive
                                  ? 'bg-slate-100 border-r-slate-300'
                                  : isLayerSelected
                                  ? 'bg-slate-50 border-r-slate-800 ring-2 ring-inset ring-slate-800/20'
                                  : 'bg-white group-hover:bg-slate-50/70 border-slate-200 hover:border-r-slate-400'
                              }`}
                            >
                              {/* Top: Resource info (click to view details popup) */}
                              <div
                                onClick={() => setSelectedResourceDetails(resource)}
                                className="flex items-center gap-3 cursor-pointer"
                                title="Click to view full resource details and specifications"
                              >
                                <div className={`w-9 h-9 rounded-xl ${tc.bg} flex items-center justify-center flex-none group-hover:scale-105 transition-transform border border-slate-200/60`}>
                                  <TypeIcon size={16} className={tc.text} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-800 leading-tight truncate group-hover:text-slate-900 transition-colors">
                                      {resource.name}
                                    </span>
                                    <Info size={12} className="text-slate-400 group-hover:text-slate-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  {resource.location && (
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                                      <MapPin size={9} className="shrink-0" />
                                      <span className="truncate">{resource.location}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    {isInactive ? (
                                      <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                        <Wrench size={10} className="text-amber-600" />
                                        Maintenance
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Active
                                      </span>
                                    )}
                                    {resource.capacity && (
                                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                        <Users size={9} /> {resource.capacity}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Bottom: Layer Selection Toggle */}
                              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLayerId(isLayerSelected ? null : resource.id);
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                                    isLayerSelected
                                      ? 'bg-slate-900 text-white shadow-2xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                                  }`}
                                  title={
                                    isLayerSelected
                                      ? 'Layer active: mouse wheel scrolls time horizontally'
                                      : 'Select layer to enable mouse wheel horizontal time scrolling'
                                  }
                                >
                                  {isLayerSelected ? (
                                    <>
                                      <span>🎯 Track Active</span>
                                      <X size={10} className="ml-0.5" />
                                    </>
                                  ) : (
                                    <>
                                      <span>Select Track</span>
                                    </>
                                  )}
                                </button>
                                {isLayerSelected && (
                                  <span className="text-[9px] text-slate-500 font-medium">
                                    Wheel = Time ↔
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Timeline Grid Cell: When selected, mouse wheel scrolls time horizontally */}
                            <div
                              className={`flex-1 relative transition-colors ${
                                isLayerSelected
                                  ? 'bg-slate-50/60 ring-2 ring-inset ring-slate-800/15'
                                  : ''
                              } ${
                                isInactive
                                  ? 'cursor-not-allowed select-none'
                                  : session.role === 'ADMIN'
                                  ? 'cursor-default'
                                  : 'cursor-crosshair'
                              }`}
                              style={{
                                width: totalHours * HOUR_WIDTH,
                                minHeight: 96,
                                ...(isInactive
                                  ? {
                                      backgroundColor: '#e2e8f0',
                                      backgroundImage:
                                        'repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 14px, #e2e8f0 14px, #e2e8f0 28px)',
                                    }
                                  : {}),
                              }}
                              onWheel={(e) => {
                                // Only scroll time horizontally if this resource layer is selected!
                                if (isLayerSelected && e.deltaY !== 0) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (timelineContainerRef.current) {
                                    timelineContainerRef.current.scrollLeft += e.deltaY;
                                  }
                                }
                              }}
                              onClick={(e) => {
                                if (!isInactive && session.role !== 'ADMIN') {
                                  handleTimelineClick(resource, e);
                                }
                              }}
                            >
                              {/* Maintenance Solid Overlay: Completely covers the track with 0 transparency and a pinned banner */}
                              {isInactive && (
                                <div className="absolute inset-0 z-10 flex items-center justify-start pl-6 pointer-events-none">
                                  <div className="sticky left-64 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 border border-slate-300 shadow-sm text-slate-700 font-bold text-xs select-none">
                                    <Wrench size={13} className="text-amber-500 shrink-0" />
                                    <span>Maintenance Mode — Resource Locked</span>
                                  </div>
                                </div>
                              )}
                              {/* Hour grid lines */}
                              {Array.from({ length: totalHours }, (_, i) => (
                                <div
                                  key={i}
                                  className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                                  style={{ left: i * HOUR_WIDTH }}
                                />
                              ))}

                              {/* Half-hour marks */}
                              {Array.from({ length: totalHours }, (_, i) => (
                                <div
                                  key={`h-${i}`}
                                  className="absolute top-0 bottom-0 border-l border-slate-100/60 pointer-events-none"
                                  style={{ left: i * HOUR_WIDTH + HOUR_WIDTH / 2 }}
                                />
                              ))}

                              {/* Shaded past overlay for the current hour up to now */}
                              {isToday && nowLeft !== null && nowLeft > 0 && (
                                <div
                                  className="absolute top-0 bottom-0 left-0 bg-slate-100/70 border-r border-dashed border-slate-300 pointer-events-none z-5 flex items-center justify-center overflow-hidden"
                                  style={{ width: Math.min(nowLeft, totalHours * HOUR_WIDTH) }}
                                >
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 select-none">
                                    Past
                                  </span>
                                </div>
                              )}

                              {/* Current time indicator */}
                              {nowLeft !== null && nowLeft >= 0 && nowLeft <= totalHours * HOUR_WIDTH && (
                                <div
                                  className="absolute top-0 bottom-0 w-[2px] bg-[#ff6b35] z-15 pointer-events-none"
                                  style={{ left: nowLeft }}
                                >
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b35] -ml-[4px] -mt-1 ring-4 ring-[#ff6b35]/25 animate-pulse" />
                                </div>
                              )}

                              {/* Large, Beautiful Reservation Blocks - Differentiating Mine vs Others */}
                              {reservations.map((res) => {
                                const rawLeft = minutesToLeft(toMinutes(res.startTime), effectiveStartHour);
                                const left = Math.max(0, rawLeft);
                                const right = minutesToLeft(toMinutes(res.endTime), effectiveStartHour);
                                const width = Math.max(50, right - left);
                                const isMine = res.user?.email === session.email || (res as any).userId === session.id;
                                const isConfirmed = res.status === ReservationStatus.CONFIRMED;
                                const isPending = res.status === ReservationStatus.PENDING;

                                return (
                                  <div
                                    key={res.id}
                                    className={`absolute top-2.5 bottom-2.5 rounded-xl px-3 py-2 flex flex-col justify-between overflow-hidden z-10 cursor-pointer select-none transition-all duration-150 hover:scale-[1.01] hover:shadow-md ${
                                      isPending
                                        ? isMine
                                          ? 'bg-amber-50/95 text-amber-950 border-2 border-dashed border-amber-500 shadow-sm shadow-amber-500/15'
                                          : 'bg-amber-50/80 text-amber-900 border-2 border-dashed border-amber-400 shadow-2xs'
                                        : isMine
                                        ? isConfirmed
                                          ? 'bg-[#ff6b35] text-white border border-orange-600 shadow-sm shadow-orange-500/15'
                                          : 'bg-slate-200 text-slate-700 border border-slate-300'
                                        : isConfirmed
                                        ? 'bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-300/90 shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                    style={{ left: left + 2, width: Math.max(50, width - 4) }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTooltipReservation({ res, x: e.clientX, y: e.clientY });
                                    }}
                                  >
                                    {/* Line 1: Status Pill & Purpose */}
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span
                                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                          isPending
                                            ? isMine
                                              ? 'bg-amber-500 text-white font-extrabold shadow-2xs animate-pulse flex items-center gap-1'
                                              : 'bg-amber-200 text-amber-900 font-bold'
                                            : isMine
                                            ? 'bg-white text-[#ff6b35] font-black shadow-2xs'
                                            : 'bg-slate-200/90 text-slate-700 font-semibold'
                                        }`}
                                      >
                                        {isPending
                                          ? isMine
                                            ? '⏳ Awaiting Approval'
                                            : '⏳ Pending'
                                          : isMine
                                          ? '★ Confirmed'
                                          : 'Confirmed'}
                                      </span>
                                      <span
                                        className={`text-xs leading-tight truncate ${
                                          isPending
                                            ? 'font-bold text-amber-950'
                                            : isMine
                                            ? 'font-bold text-white'
                                            : 'font-semibold text-slate-800'
                                        }`}
                                      >
                                        {res.purpose}
                                      </span>
                                    </div>

                                    {/* Line 2: Time Range */}
                                    <div
                                      className={`text-[11px] font-medium flex items-center gap-1 truncate ${
                                        isPending
                                          ? 'text-amber-800'
                                          : isMine
                                          ? 'text-white/90'
                                          : 'text-slate-600'
                                      }`}
                                    >
                                      <Clock size={11} className="shrink-0" />
                                      <span>
                                        {fmt(res.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {' – '}
                                        {fmt(res.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>

                                    {/* Line 3: Booker Name */}
                                    <div
                                      className={`text-[10px] flex items-center gap-1 truncate ${
                                        isPending
                                          ? 'text-amber-700 font-medium'
                                          : isMine
                                          ? 'text-white/95 font-semibold'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      <Users size={10} className="shrink-0" />
                                      <span className="truncate">
                                        {isMine ? `You (${res.user?.fullName || session.fullName})` : (res.user?.fullName || 'Reserved')}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Inactive overlay */}
                              {isInactive && (
                                <div className="absolute inset-0 bg-repeating-stripes pointer-events-none z-5 opacity-30" />
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Booking Form Modal ── */}
      {bookingResource && (
        <BookingForm
          resource={bookingResource}
          selectedDate={selectedDate}
          prefilledStart={prefilledTime?.start}
          prefilledEnd={prefilledTime?.end}
          onClose={() => {
            setBookingResource(null);
            setPrefilledTime(undefined);
          }}
          onSuccess={() => window.location.reload()}
        />
      )}

      {/* ── Resource Details Popup Modal ── */}
      {selectedResourceDetails && (
        <ResourceDetailsModal
          resource={selectedResourceDetails}
          selectedDate={selectedDate}
          isEmployee={isEmployee}
          session={session}
          onClose={() => setSelectedResourceDetails(null)}
          onBook={() => {
            const res = selectedResourceDetails;
            setSelectedResourceDetails(null);
            setBookingResource(res);
          }}
        />
      )}

      {/* ── My Reservations Popup Modal ── */}
      <MyReservationsModal
        isOpen={showMyBookingsModal}
        onClose={() => setShowMyBookingsModal(false)}
        onBookNew={() => {
          setShowMyBookingsModal(false);
          setBookingResource(filteredResources[0] || null);
        }}
        onReservationCancelled={() => {
          window.location.reload();
        }}
      />

      {/* ── Reservation Tooltip ── */}
      {tooltipReservation && (
        <div
          className="fixed z-50 animate-fade-in"
          style={{
            top: Math.min(tooltipReservation.y + 8, window.innerHeight - 200),
            left: Math.min(tooltipReservation.x + 8, window.innerWidth - 280),
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-64">
            {(() => {
              const isMine =
                tooltipReservation.res.user?.email === session.email ||
                (tooltipReservation.res as any).userId === session.id;
              return (
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isMine && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#ff6b35] text-white">
                        ★ My Booking
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        STATUS_COLORS[tooltipReservation.res.status as ReservationStatus]
                      }`}
                    >
                      {tooltipReservation.res.status === ReservationStatus.COMPLETED &&
                      ((tooltipReservation.res as any).resource?.type === ResourceType.VEHICLE ||
                        (tooltipReservation.res as any).resource?.type === ResourceType.EQUIPMENT)
                        ? 'RETURNED'
                        : tooltipReservation.res.status}
                    </span>
                  </div>
                  <button
                    onClick={() => setTooltipReservation(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })()}
            <h4 className="text-sm font-bold text-slate-800 mb-1 leading-tight">
              {tooltipReservation.res.purpose}
            </h4>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
              <Clock size={11} />
              {fmt(tooltipReservation.res.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {' – '}
              {fmt(tooltipReservation.res.endTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {tooltipReservation.res.user && (
              <p className="text-xs text-slate-600 flex items-center gap-1.5 mb-3 font-medium">
                <Users
                  size={11}
                  className={
                    tooltipReservation.res.user.email === session.email ? 'text-[#ff6b35]' : 'text-slate-400'
                  }
                />
                {tooltipReservation.res.user.email === session.email
                  ? `You (${tooltipReservation.res.user.fullName})`
                  : tooltipReservation.res.user.fullName}
              </p>
            )}
            {/* Cancel button if own or admin (ONLY if reservation has not already ended) */}
            {tooltipReservation.res.status !== ReservationStatus.CANCELLED &&
              tooltipReservation.res.status !== ReservationStatus.COMPLETED &&
              new Date(tooltipReservation.res.endTime) >= new Date() &&
              (session.role === 'ADMIN' || tooltipReservation.res.user?.email === session.email) && (
                <button
                  onClick={() => handleCancelReservation(tooltipReservation.res.id)}
                  disabled={cancellingId === tooltipReservation.res.id}
                  className="w-full py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {cancellingId === tooltipReservation.res.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : null}
                  Cancel Reservation
                </button>
              )}
          </div>
        </div>
      )}

      {/* ── FAB: New Booking (Only available for employees; Admin manages resources and does not book) ── */}
      {session.role !== 'ADMIN' && (
        <button
          onClick={() => setBookingResource(filteredResources[0] || null)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#ff6b35] text-white shadow-xl shadow-orange-500/30 flex items-center justify-center hover:bg-[#e55a25] hover:scale-105 transition-all z-30"
          title="New Booking"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}

// ── Resource Details Popup Modal Component ──
function ResourceDetailsModal({
  resource,
  selectedDate,
  isEmployee,
  session,
  onClose,
  onBook,
}: {
  resource: ResourceData;
  selectedDate: Date;
  isEmployee: boolean;
  session: SessionUser;
  onClose: () => void;
  onBook: () => void;
}) {
  const TypeIcon = TYPE_ICONS[resource.type];
  const isInactive = resource.status === ResourceStatus.INACTIVE;

  // Filter reservations for this resource on the selected date
  const dayReservations = resource.reservations.filter((r) => {
    return isSameDay(fmt(r.startTime), selectedDate) && r.status !== ReservationStatus.CANCELLED;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
              <TypeIcon size={24} className="text-slate-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {resource.type}
                </span>
                {isInactive ? (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    Under Maintenance
                  </span>
                ) : (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Available
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">{resource.name}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Key Specs Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                <MapPin size={13} className="text-[#ff6b35]" /> Location
              </div>
              <div className="text-sm font-bold text-slate-800 truncate">
                {resource.location || 'Main Office'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                <Users size={13} className="text-[#ff6b35]" /> Capacity
              </div>
              <div className="text-sm font-bold text-slate-800">
                {resource.capacity ? `${resource.capacity} Persons` : 'Flexible'}
              </div>
            </div>
          </div>

          {/* Description & Equipment Specs */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#ff6b35]" /> Details & Specifications
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {resource.description || 'Standard corporate resource available for reservation by authorized employees.'}
            </p>
          </div>

          {/* Schedule for Selected Date */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock size={13} className="text-[#ff6b35]" />
                Schedule for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {dayReservations.length} Active {dayReservations.length === 1 ? 'Booking' : 'Bookings'}
              </span>
            </div>

            {dayReservations.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <p className="text-xs text-slate-600 font-medium">
                  No reservations booked for this day. This resource is completely free for your reservation.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {dayReservations.map((res) => {
                  const isMine = res.user?.email === session.email || (res as any).userId === session.id;
                  return (
                    <div
                      key={res.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isMine
                          ? 'bg-orange-50/60 border-orange-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          {isMine && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-[#ff6b35] text-white">
                              ★ Yours
                            </span>
                          )}
                          <div className={`font-bold ${isMine ? 'text-slate-900' : 'text-slate-800'}`}>
                            {res.purpose}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {fmt(res.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' – '}
                          {fmt(res.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {res.user && (
                            <span className={isMine ? 'font-semibold text-slate-700' : ''}>
                              {` • ${isMine ? `You (${res.user.fullName})` : res.user.fullName}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          res.status === ReservationStatus.CONFIRMED
                            ? isMine
                              ? 'bg-[#ff6b35] text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {res.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
          {isEmployee && !isInactive && (
            <button
              onClick={() => {
                onClose();
                onBook();
              }}
              className="px-5 py-2 rounded-xl bg-[#ff6b35] hover:bg-[#e55a25] text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarCheck size={14} /> Book This Resource
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
