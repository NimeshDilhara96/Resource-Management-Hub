'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  PackageCheck,
  CheckCheck,
  Trash2,
  X,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { formatTimeRange, formatTime, formatDate } from '@/lib/utils';
import { ReservationStatus } from '@prisma/client';

export interface NotificationItem {
  id: string;
  reservationId: string;
  type: 'APPROVED' | 'CANCELLED' | 'RETURNED';
  title: string;
  message: string;
  resourceName: string;
  resourceType?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  timestamp: string; // ISO string
  read: boolean;
}

interface NotificationCenterProps {
  userId: string;
  userReservations: Array<{
    id: string;
    status: ReservationStatus;
    updatedAt: string | Date;
    createdAt: string | Date;
    resource?: {
      id?: string;
      name?: string;
      type?: string;
      location?: string | null;
    } | null;
    startTime: string | Date;
    endTime: string | Date;
    purpose?: string;
  }>;
  onOpenMyBookings?: () => void;
}

// Pleasant enterprise sound chime via Web Audio API (zero external assets needed)
function playNotificationChime(type: 'success' | 'alert') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // Upbeat two-tone pleasant confirmation chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.38);
    } else {
      // Gentle warning chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.setValueAtTime(349.23, ctx.currentTime + 0.14); // F4
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.42);
    }
  } catch {
    // Ignore audio policy restrictions gracefully
  }
}

function formatRelativeTime(dateInput: string | Date): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return formatDate(date);
  } catch {
    return 'Recently';
  }
}

export default function NotificationCenter({
  userId,
  userReservations,
  onOpenMyBookings,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevReservationsRef = useRef<Map<string, { status: ReservationStatus; updatedAt: string }>>(new Map());
  const isInitializedRef = useRef(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const storageKey = `res_hub_notifications_${userId}`;

  // 1. Initial load of notifications from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch {
      // Storage unavailable fallback
    }
  }, [storageKey]);

  // 2. Click outside handler to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 3. Monitor reservations and trigger notifications upon status change
  useEffect(() => {
    if (!userReservations || !Array.isArray(userReservations) || userReservations.length === 0) {
      return;
    }

    const prevMap = prevReservationsRef.current;

    // First time mounting: populate baseline snapshot and seed historical notifications if empty
    if (!isInitializedRef.current) {
      const initialMap = new Map<string, { status: ReservationStatus; updatedAt: string }>();
      userReservations.forEach((r) => {
        initialMap.set(r.id, {
          status: r.status,
          updatedAt: new Date(r.updatedAt).toISOString(),
        });
      });
      prevReservationsRef.current = initialMap;
      isInitializedRef.current = true;

      // If user has no saved notifications, populate recent approved/cancelled ones from the last 48 hours
      try {
        const saved = localStorage.getItem(storageKey);
        if (!saved || JSON.parse(saved).length === 0) {
          const cutoff = Date.now() - 48 * 60 * 60 * 1000;
          const seeded: NotificationItem[] = [];

          userReservations.forEach((r) => {
            const updatedTime = new Date(r.updatedAt).getTime();
            const createdTime = new Date(r.createdAt).getTime();

            // Only consider items updated after creation
            if (updatedTime >= cutoff && updatedTime > createdTime + 1000) {
              if (r.status === ReservationStatus.CONFIRMED) {
                seeded.push({
                  id: `seeded-${r.id}-${updatedTime}`,
                  reservationId: r.id,
                  type: 'APPROVED',
                  title: 'Booking Approved',
                  message: `Admin approved your reservation for ${r.resource?.name || 'Resource'}.`,
                  resourceName: r.resource?.name || 'Resource',
                  resourceType: r.resource?.type,
                  startTime: r.startTime,
                  endTime: r.endTime,
                  timestamp: new Date(r.updatedAt).toISOString(),
                  read: true,
                });
              } else if (r.status === ReservationStatus.CANCELLED) {
                seeded.push({
                  id: `seeded-${r.id}-${updatedTime}`,
                  reservationId: r.id,
                  type: 'CANCELLED',
                  title: 'Booking Cancelled',
                  message: `Your booking request for ${r.resource?.name || 'Resource'} was cancelled.`,
                  resourceName: r.resource?.name || 'Resource',
                  resourceType: r.resource?.type,
                  startTime: r.startTime,
                  endTime: r.endTime,
                  timestamp: new Date(r.updatedAt).toISOString(),
                  read: true,
                });
              }
            }
          });

          if (seeded.length > 0) {
            setNotifications(seeded);
            localStorage.setItem(storageKey, JSON.stringify(seeded));
          }
        }
      } catch {}

      return;
    }

    // Subsequent runs (via 3.5s real-time timeline polling): Check for status changes!
    const newAlerts: NotificationItem[] = [];

    userReservations.forEach((r) => {
      const prev = prevMap.get(r.id);

      if (prev && prev.status !== r.status) {
        let notifType: 'APPROVED' | 'CANCELLED' | 'RETURNED' | null = null;
        let title = '';
        let message = '';

        if (prev.status === ReservationStatus.PENDING && r.status === ReservationStatus.CONFIRMED) {
          notifType = 'APPROVED';
          title = 'Booking Approved! 🎉';
          message = `Admin approved your reservation for ${r.resource?.name || 'Resource'}.`;
        } else if (
          r.status === ReservationStatus.CANCELLED &&
          (prev.status === ReservationStatus.PENDING || prev.status === ReservationStatus.CONFIRMED)
        ) {
          notifType = 'CANCELLED';
          title = 'Booking Cancelled ⚠️';
          message = `Your reservation for ${r.resource?.name || 'Resource'} was cancelled by Admin.`;
        } else if (
          prev.status === ReservationStatus.CONFIRMED &&
          r.status === ReservationStatus.COMPLETED
        ) {
          notifType = 'RETURNED';
          title = 'Asset Marked as Returned ✅';
          message = `Admin verified the return of ${r.resource?.name || 'Resource'}.`;
        }

        if (notifType) {
          const item: NotificationItem = {
            id: `notif-${r.id}-${Date.now()}`,
            reservationId: r.id,
            type: notifType,
            title,
            message,
            resourceName: r.resource?.name || 'Resource',
            resourceType: r.resource?.type,
            startTime: r.startTime,
            endTime: r.endTime,
            timestamp: new Date().toISOString(),
            read: false,
          };
          newAlerts.push(item);
        }
      }

      // Update baseline tracker
      prevMap.set(r.id, {
        status: r.status,
        updatedAt: new Date(r.updatedAt).toISOString(),
      });
    });

    if (newAlerts.length > 0) {
      // 1. Play audio chime
      const latestType = newAlerts[0].type;
      playNotificationChime(latestType === 'APPROVED' || latestType === 'RETURNED' ? 'success' : 'alert');

      // 2. Show floating toast for the newest alert
      setActiveToast(newAlerts[0]);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setActiveToast(null);
      }, 7500);

      // 3. Prepend into notifications list and save to localStorage
      setNotifications((prev) => {
        const merged = [...newAlerts, ...prev].slice(0, 30);
        try {
          localStorage.setItem(storageKey, JSON.stringify(merged));
        } catch {}
        return merged;
      });
    }
  }, [userReservations, storageKey]);

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  // Click single notification
  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === item.id ? { ...n, read: true } : n));
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setIsOpen(false);
    if (onOpenMyBookings) {
      onOpenMyBookings();
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* ── Bell Icon Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer ${
          isOpen ? 'bg-slate-100 text-slate-900 ring-2 ring-[#ff6b35]/20' : ''
        }`}
        title="Admin Notifications"
        aria-label="View notifications"
      >
        <Bell size={16} className={unreadCount > 0 ? 'text-slate-800' : 'text-slate-500'} />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff6b35] px-1 text-[10px] font-black text-white shadow-xs animate-in zoom-in-75 duration-200">
            {unreadCount > 9 ? '9+' : unreadCount}
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#ff6b35] opacity-50 animate-ping -z-10" />
          </span>
        )}
      </button>

      {/* ── Notifications Dropdown Popover ── */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Notifications</span>
              {unreadCount > 0 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff6b35]/10 text-[#ff6b35]">
                  {unreadCount} unread
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                  All caught up
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/60 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={12} className="text-[#ff6b35]" />
                  <span>Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                  title="Clear history"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                  <Bell size={18} />
                </div>
                <div className="text-xs font-bold text-slate-700">No Notifications</div>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  You will receive real-time alerts whenever an administrator approves, updates, or cancels your bookings.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                    !item.read ? 'bg-orange-50/30' : ''
                  }`}
                >
                  {/* Status Icon */}
                  <div className="shrink-0 mt-0.5">
                    {item.type === 'APPROVED' ? (
                      <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-2xs">
                        <CheckCircle2 size={15} />
                      </div>
                    ) : item.type === 'CANCELLED' ? (
                      <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-2xs">
                        <XCircle size={15} />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
                        <PackageCheck size={15} />
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800 leading-tight truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug font-medium">
                      {item.message}
                    </p>

                    {item.startTime && item.endTime && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-medium">
                        <Clock size={10} className="shrink-0 text-slate-400" />
                        <span className="truncate">
                          {formatTimeRange(item.startTime, item.endTime)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Unread Dot */}
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-[#ff6b35] shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {onOpenMyBookings && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenMyBookings();
                }}
                className="text-xs font-bold text-[#ff6b35] hover:text-[#e55a25] flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <span>View All My Bookings</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Floating Live Toast Alert (Instant Feedback When Admin Approves / Cancels) ── */}
      {activeToast && (
        <div className="fixed top-4 right-4 z-[100] max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {activeToast.type === 'APPROVED' ? (
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 size={18} />
                </div>
              ) : activeToast.type === 'CANCELLED' ? (
                <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md">
                  <XCircle size={18} />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-md">
                  <PackageCheck size={18} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800">{activeToast.title}</h4>
                <button
                  type="button"
                  onClick={() => setActiveToast(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <p className="text-xs text-slate-600 mt-1 leading-snug font-medium">
                {activeToast.message}
              </p>

              {activeToast.startTime && activeToast.endTime && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 font-medium">
                  <Clock size={11} className="text-slate-400" />
                  <span>{formatTimeRange(activeToast.startTime, activeToast.endTime)}</span>
                </div>
              )}

              {onOpenMyBookings && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveToast(null);
                      onOpenMyBookings();
                    }}
                    className="text-xs font-bold text-[#ff6b35] hover:text-[#e55a25] flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>View in My Bookings</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
