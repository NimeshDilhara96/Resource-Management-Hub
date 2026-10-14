'use client';

import { useState, useTransition } from 'react';
import {
  createReservationAction,
  checkAvailabilityAction,
} from '@/actions/reservation.actions';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { ResourceType } from '@prisma/client';
import { formatErrorMessage } from '@/lib/utils';

interface ResourceInfo {
  id: string;
  name: string;
  type: ResourceType;
  location: string | null;
  capacity: number | null;
  status: string;
}

interface BookingModalProps {
  resource: ResourceInfo;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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

export default function BookingModal({
  resource,
  isOpen,
  onClose,
  onSuccess,
}: BookingModalProps) {
  // Tomorrow at 10:00 AM as smart default
  const getDefaultDates = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      date: dateStr,
      startTime: '10:00',
      endTime: '11:30',
    };
  };

  const defaults = getDefaultDates();
  const [date, setDate] = useState(defaults.date);
  const [startTime, setStartTime] = useState(defaults.startTime);
  const [endTime, setEndTime] = useState(defaults.endTime);
  const [purpose, setPurpose] = useState('');

  const [availabilityState, setAvailabilityState] = useState<{
    checked: boolean;
    available?: boolean;
    checking?: boolean;
    conflict?: any;
    message?: string;
  }>({ checked: false });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  const isSelectedDateToday = date === todayStr;
  const now = new Date();
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const allBaseSlots = getTimeSlotOptions(7, 23, 30);

  const availableStartSlots = isSelectedDateToday
    ? allBaseSlots.filter((slot) => {
      const [h, m] = slot.split(':').map(Number);
      return h * 60 + m >= curMinutes;
    })
    : allBaseSlots;

  const [stH, stM] = (startTime || '10:00').split(':').map(Number);
  const startTotalMinutes = stH * 60 + stM;
  const allEndSlots = [...allBaseSlots, '23:59'];
  const availableEndSlots = allEndSlots.filter((slot) => {
    if (slot === '23:59') return 24 * 60 > startTotalMinutes;
    const [h, m] = slot.split(':').map(Number);
    return h * 60 + m > startTotalMinutes;
  });

  const isTimeInPast = (checkDate: string, checkStart: string) => {
    if (checkDate !== todayStr) return false;
    const [h, m] = checkStart.split(':').map(Number);
    return h < now.getHours() || (h === now.getHours() && m < now.getMinutes());
  };

  const handleCheckAvailability = async (
    customDate = date,
    customStart = startTime,
    customEnd = endTime
  ) => {
    if (!customDate || !customStart || !customEnd) return;

    if (isTimeInPast(customDate, customStart)) {
      setAvailabilityState({
        checked: true,
        available: false,
        message: 'Cannot select a time in the past. Please choose a future time.',
      });
      return;
    }

    const startIso = new Date(`${customDate}T${customStart}:00`).toISOString();
    const endIso = new Date(`${customDate}T${customEnd}:00`).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      setAvailabilityState({
        checked: true,
        available: false,
        message: 'End time must be after start time.',
      });
      return;
    }

    setAvailabilityState((prev) => ({ ...prev, checking: true }));

    const res = await checkAvailabilityAction({
      resourceId: resource.id,
      startTime: startIso,
      endTime: endIso,
    });

    if (res.success && res.available) {
      setAvailabilityState({
        checked: true,
        checking: false,
        available: true,
        message: 'Time slot is available! ',
      });
    } else {
      setAvailabilityState({
        checked: true,
        checking: false,
        available: false,
        conflict: res.conflict,
        message:
          res.message ||
          (res.conflict
            ? `Conflict detected: Reserved by ${res.conflict.user.fullName} (${new Date(
              res.conflict.startTime
            ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(
              res.conflict.endTime
            ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
            : 'Selected slot is unavailable.'),
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isTimeInPast(date, startTime)) {
      setErrorMsg('Selected start time has already passed. Please choose a future time.');
      return;
    }

    const startIso = new Date(`${date}T${startTime}:00`).toISOString();
    const endIso = new Date(`${date}T${endTime}:00`).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      setErrorMsg('End time must be later than start time.');
      return;
    }

    if (!purpose.trim()) {
      setErrorMsg('Please specify the purpose for this reservation.');
      return;
    }

    if (purpose.trim().length < 3) {
      setErrorMsg('Purpose must be at least 3 characters long.');
      return;
    }

    startTransition(async () => {
      const result = await createReservationAction({
        resourceId: resource.id,
        startTime: startIso,
        endTime: endIso,
        purpose: purpose.trim(),
      });

      if (result.success) {
        setSuccessMsg('Booking request submitted! Awaiting administrator approval.');
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 1200);
      } else {
        const cleanErr = formatErrorMessage(result.error) || 'Failed to complete reservation.';
        setErrorMsg(cleanErr);
        if (result.conflict) {
          setAvailabilityState({
            checked: true,
            available: false,
            conflict: result.conflict,
            message: cleanErr,
          });
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0f172a] border border-white/10 shadow-2xl shadow-indigo-950/50 overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-slate-900 to-indigo-950/40">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
                <Sparkles size={12} />
                Reserve Resource
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {resource.name}
              </h2>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>{resource.type}</span>
                {resource.location && <span>• {resource.location}</span>}
                {resource.capacity && <span>• Capacity: {resource.capacity}</span>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle size={18} className="shrink-0 text-rose-400 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* Date Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reservation Date
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={date}
                min={todayStr}
                onChange={(e) => {
                  setDate(e.target.value);
                  handleCheckAvailability(e.target.value, startTime, endTime);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <Calendar
                size={16}
                className="absolute right-3.5 top-3 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Start Time</span>
                {isSelectedDateToday && (
                  <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Active Slots
                  </span>
                )}
              </label>
              <div className="relative">
                <select
                  required
                  value={startTime}
                  disabled={availableStartSlots.length === 0}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setStartTime(newStart);
                    const [newH, newM] = newStart.split(':').map(Number);
                    const newStartM = newH * 60 + newM;
                    const [curEndH, curEndM] = (endTime || '00:00').split(':').map(Number);
                    let nextEnd = endTime;
                    if (curEndH * 60 + curEndM <= newStartM || !endTime) {
                      const nextEndM = Math.min(newStartM + 60, 24 * 60);
                      nextEnd = nextEndM >= 24 * 60 ? '23:59' : `${String(Math.floor(nextEndM / 60)).padStart(2, '0')}:${String(nextEndM % 60).padStart(2, '0')}`;
                      setEndTime(nextEnd);
                    }
                    handleCheckAvailability(date, newStart, nextEnd);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none pr-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                <Clock
                  size={16}
                  className="absolute right-3.5 top-3 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                End Time
              </label>
              <div className="relative">
                <select
                  required
                  value={endTime}
                  disabled={availableEndSlots.length === 0}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    handleCheckAvailability(date, startTime, e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none pr-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                <Clock
                  size={16}
                  className="absolute right-3.5 top-3 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Real-time Conflict Engine Notification Banner */}
          {availabilityState.checked && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border transition-all ${availabilityState.available
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
            >
              {availabilityState.checking ? (
                <Loader2 size={16} className="animate-spin shrink-0 text-slate-400" />
              ) : availabilityState.available ? (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle size={16} className="shrink-0 text-amber-400 mt-0.5" />
              )}
              <div className="leading-relaxed">
                {availabilityState.checking
                  ? 'Scanning schedule for potential conflicts...'
                  : availabilityState.message}
              </div>
            </div>
          )}

          {/* Purpose Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Purpose / Meeting Objective
              </label>
              <span className={`text-[11px] ${purpose.trim().length > 0 && purpose.trim().length < 3 ? 'text-amber-400 font-medium' : 'text-slate-400'}`}>
                {purpose.trim().length < 3 ? 'Min. 3 characters' : `${purpose.length}/255`}
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. Q4 Executive Strategy Sync, Client Presentation"
                value={purpose}
                maxLength={255}
                onChange={(e) => {
                  setPurpose(e.target.value);
                  if (errorMsg && e.target.value.trim().length >= 3) {
                    setErrorMsg(null);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <FileText
                size={16}
                className="absolute right-3.5 top-3 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isPending ||
                (availabilityState.checked && !availabilityState.available) ||
                isTimeInPast(date, startTime)
              }
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
