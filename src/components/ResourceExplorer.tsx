'use client';

import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Building2, Car, Tv, Layers } from 'lucide-react';
import { ResourceType, ResourceStatus } from '@prisma/client';
import ResourceCard, { ResourceData } from './ResourceCard';

interface ResourceExplorerProps {
  initialResources: ResourceData[];
}

export default function ResourceExplorer({ initialResources }: ResourceExplorerProps) {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL, AVAILABLE, ACTIVE
  const [minCapacity, setMinCapacity] = useState<number>(0);

  // Filtered resources
  const filteredResources = useMemo(() => {
    return initialResources.filter((r) => {
      // Type filter
      if (selectedType !== 'ALL' && r.type !== selectedType) {
        return false;
      }

      // Status filter
      if (statusFilter === 'AVAILABLE' && (r.status !== ResourceStatus.ACTIVE || r.isOccupiedNow)) {
        return false;
      }
      if (statusFilter === 'ACTIVE' && r.status !== ResourceStatus.ACTIVE) {
        return false;
      }

      // Capacity filter
      if (minCapacity > 0 && (r.capacity === null || r.capacity < minCapacity)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(query);
        const matchesDesc = r.description?.toLowerCase().includes(query);
        const matchesLoc = r.location?.toLowerCase().includes(query);
        return matchesName || matchesDesc || matchesLoc;
      }

      return true;
    });
  }, [initialResources, selectedType, statusFilter, minCapacity, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: initialResources.length,
      rooms: initialResources.filter((r) => r.type === ResourceType.ROOM).length,
      vehicles: initialResources.filter((r) => r.type === ResourceType.VEHICLE).length,
      equipment: initialResources.filter((r) => r.type === ResourceType.EQUIPMENT).length,
    };
  }, [initialResources]);

  return (
    <div className="space-y-6">
      {/* Category Pills Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              selectedType === 'ALL'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5 hover:border-white/10'
            }`}
          >
            <Layers size={14} />
            All Resources ({counts.all})
          </button>

          <button
            onClick={() => setSelectedType(ResourceType.ROOM)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              selectedType === ResourceType.ROOM
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5 hover:border-white/10'
            }`}
          >
            <Building2 size={14} className="text-indigo-400" />
            Rooms & Labs ({counts.rooms})
          </button>

          <button
            onClick={() => setSelectedType(ResourceType.VEHICLE)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              selectedType === ResourceType.VEHICLE
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5 hover:border-white/10'
            }`}
          >
            <Car size={14} className="text-emerald-400" />
            Vehicles ({counts.vehicles})
          </button>

          <button
            onClick={() => setSelectedType(ResourceType.EQUIPMENT)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              selectedType === ResourceType.EQUIPMENT
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5 hover:border-white/10'
            }`}
          >
            <Tv size={14} className="text-violet-400" />
            Equipment & AV ({counts.equipment})
          </button>
        </div>

        {/* Quick status counters */}
        <div className="text-xs text-slate-400 font-medium">
          Showing <span className="text-white font-bold">{filteredResources.length}</span> of {initialResources.length} resources
        </div>
      </div>

      {/* Search and Secondary Filter Row */}
      <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search input */}
        <div className="md:col-span-6 relative">
          <input
            type="text"
            placeholder="Search by resource name, location, or feature..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/70 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
        </div>

        {/* Status Dropdown */}
        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Status: All (Active & Maint.)</option>
            <option value="ACTIVE">Status: Operational Only</option>
            <option value="AVAILABLE">Status: Available Right Now</option>
          </select>
        </div>

        {/* Min Capacity Filter */}
        <div className="md:col-span-3">
          <select
            value={minCapacity}
            onChange={(e) => setMinCapacity(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value={0}>Capacity: Any</option>
            <option value={4}>Capacity: 4+ people</option>
            <option value={10}>Capacity: 10+ people</option>
            <option value={20}>Capacity: 20+ people</option>
          </select>
        </div>
      </div>

      {/* Resource Cards Grid */}
      {filteredResources.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-white/10">
          <SlidersHorizontal size={40} className="mx-auto text-slate-600 mb-3" />
          <h4 className="text-base font-semibold text-white">No resources match your filter</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords, category filters, or capacity criteria.
          </p>
          <button
            onClick={() => {
              setSelectedType('ALL');
              setSearchQuery('');
              setStatusFilter('ALL');
              setMinCapacity(0);
            }}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}
