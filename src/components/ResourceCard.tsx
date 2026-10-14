'use client';

import { useState } from 'react';
import {
  Building2,
  Car,
  Tv,
  Users,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Wrench,
} from 'lucide-react';
import { ResourceType, ResourceStatus, ReservationStatus } from '@prisma/client';
import BookingModal from './BookingModal';
import ResourceScheduleModal from './ResourceScheduleModal';

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

export interface ResourceData {
  id: string;
  name: string;
  type: ResourceType;
  description: string | null;
  capacity: number | null;
  location: string | null;
  status: ResourceStatus;
  isOccupiedNow?: boolean;
  reservations?: ReservationItem[];
}

interface ResourceCardProps {
  resource: ResourceData;
  onRefresh?: () => void;
}

export default function ResourceCard({
  resource,
  onRefresh,
}: ResourceCardProps) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Type configuration
  const getTypeConfig = (type: ResourceType) => {
    switch (type) {
      case ResourceType.ROOM:
        return {
          icon: Building2,
          label: 'Room / Facility',
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          gradient: 'from-indigo-500/10 to-transparent',
        };
      case ResourceType.VEHICLE:
        return {
          icon: Car,
          label: 'Fleet Vehicle',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          gradient: 'from-emerald-500/10 to-transparent',
        };
      case ResourceType.EQUIPMENT:
        return {
          icon: Tv,
          label: 'Hardware & AV',
          bg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
          gradient: 'from-violet-500/10 to-transparent',
        };
    }
  };

  const typeConfig = getTypeConfig(resource.type);
  const IconComponent = typeConfig.icon;
  const isInactive = resource.status === ResourceStatus.INACTIVE;
  const isOccupied = resource.isOccupiedNow;

  return (
    <>
      <div className="relative group rounded-2xl bg-slate-900/50 border border-white/10 hover:border-white/20 backdrop-blur-xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40">
        <div>
          {/* Top row: Type badge & Live Availability Pill */}
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${typeConfig.bg}`}
            >
              <IconComponent size={13} />
              {typeConfig.label}
            </span>

            {/* Live Availability Status */}
            {isInactive ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                <Wrench size={10} className="text-slate-400" />
                Maintenance
              </span>
            ) : isOccupied ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                In Use Now
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Available Now
              </span>
            )}
          </div>

          {/* Title & Description */}
          <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors line-clamp-1">
            {resource.name}
          </h3>

          {resource.description && (
            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
              {resource.description}
            </p>
          )}

          {/* Metadata: Location & Capacity */}
          <div className="mt-4 pt-3.5 border-t border-white/5 flex flex-wrap items-center gap-3 text-xs text-slate-300">
            {resource.location && (
              <div className="flex items-center gap-1.5 text-slate-400">
                <MapPin size={13} className="text-slate-500" />
                <span className="truncate max-w-[170px]">{resource.location}</span>
              </div>
            )}
            {resource.capacity !== null && resource.capacity !== undefined && (
              <div className="flex items-center gap-1.5 text-slate-400">
                <Users size={13} className="text-slate-500" />
                <span>
                  {resource.capacity}{' '}
                  {resource.type === ResourceType.ROOM
                    ? 'people'
                    : resource.type === ResourceType.VEHICLE
                    ? 'seats'
                    : 'unit(s)'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-3 border-t border-white/10 flex items-center gap-2">
          <button
            onClick={() => setIsScheduleOpen(true)}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors flex items-center justify-center gap-1.5"
          >
            <Calendar size={13} />
            Schedule
          </button>

          <button
            onClick={() => setIsBookingOpen(true)}
            disabled={isInactive}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              isInactive
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/40'
            }`}
          >
            <Clock size={13} />
            {isInactive ? 'Unavailable' : 'Book Slot'}
          </button>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        resource={resource}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={onRefresh}
      />

      {/* Schedule Modal */}
      <ResourceScheduleModal
        resource={resource}
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onBookClick={() => setIsBookingOpen(true)}
      />
    </>
  );
}
