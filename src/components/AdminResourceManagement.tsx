'use client';

import { useState, useTransition } from 'react';
import {
  createResourceAction,
  updateResourceAction,
  toggleResourceStatusAction,
} from '@/actions/resource.actions';
import {
  Plus,
  Building2,
  Car,
  Tv,
  MapPin,
  Users,
  Wrench,
  CheckCircle2,
  X,
  Loader2,
  Search,
  Edit2,
  Filter,
  AlertCircle,
} from 'lucide-react';
import { ResourceType, ResourceStatus } from '@prisma/client';

export interface AdminResourceItem {
  id: string;
  name: string;
  type: ResourceType;
  description: string | null;
  capacity: number | null;
  location: string | null;
  status: ResourceStatus;
}

interface AdminResourceManagementProps {
  initialResources: AdminResourceItem[];
  initialStatusFilter?: string;
  initialTypeFilter?: string;
}

export default function AdminResourceManagement({
  initialResources,
  initialStatusFilter = 'ALL',
  initialTypeFilter = 'ALL',
}: AdminResourceManagementProps) {
  const [resources, setResources] = useState<AdminResourceItem[]>(initialResources);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>(initialTypeFilter);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatusFilter);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<AdminResourceItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Add / Edit form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<ResourceType>(ResourceType.ROOM);
  const [formDescription, setFormDescription] = useState('');
  const [formCapacity, setFormCapacity] = useState<number | ''>('');
  const [formLocation, setFormLocation] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Open Edit Modal with prefilled data
  const handleOpenEdit = (res: AdminResourceItem) => {
    setEditingResource(res);
    setFormName(res.name);
    setFormType(res.type);
    setFormDescription(res.description || '');
    setFormCapacity(res.capacity || '');
    setFormLocation(res.location || '');
    setFormError(null);
  };

  // Open Add Modal with clean state
  const handleOpenAdd = () => {
    setEditingResource(null);
    setFormName('');
    setFormType(ResourceType.ROOM);
    setFormDescription('');
    setFormCapacity('');
    setFormLocation('');
    setFormError(null);
    setIsAddOpen(true);
  };

  // Toggle resource active / maintenance state
  const handleToggle = (id: string) => {
    setTogglingId(id);
    startTransition(async () => {
      const res = await toggleResourceStatusAction(id);
      if (res.success && res.resource) {
        setResources((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: res.resource.status } : r))
        );
      }
      setTogglingId(null);
    });
  };

  // Submit Add / Edit Form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Resource name is required.');
      return;
    }
    setFormError(null);

    startTransition(async () => {
      if (editingResource) {
        // Update existing resource
        const res = await updateResourceAction(editingResource.id, {
          name: formName.trim(),
          type: formType,
          description: formDescription.trim() || undefined,
          capacity: formCapacity ? Number(formCapacity) : undefined,
          location: formLocation.trim() || undefined,
        });

        if (res.success && res.resource) {
          setResources((prev) =>
            prev.map((r) => (r.id === editingResource.id ? (res.resource as AdminResourceItem) : r))
          );
          setEditingResource(null);
        } else {
          setFormError(res.error || 'Failed to update resource.');
        }
      } else {
        // Create new resource
        const res = await createResourceAction({
          name: formName.trim(),
          type: formType,
          description: formDescription.trim() || undefined,
          capacity: formCapacity ? Number(formCapacity) : undefined,
          location: formLocation.trim() || undefined,
          status: ResourceStatus.ACTIVE,
        });

        if (res.success && res.resource) {
          setResources((prev) => [...prev, res.resource as AdminResourceItem]);
          setIsAddOpen(false);
        } else {
          setFormError(res.error || 'Failed to create resource.');
        }
      }
    });
  };

  // Filter logic
  const filtered = resources.filter((r) => {
    if (selectedType !== 'ALL' && r.type !== selectedType) return false;
    if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchLoc = r.location?.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      if (!matchName && !matchLoc && !matchDesc) return false;
    }
    return true;
  });

  const typeIcons: Record<ResourceType, any> = {
    ROOM: Building2,
    VEHICLE: Car,
    EQUIPMENT: Tv,
  };

  const typeLabels: Record<ResourceType, string> = {
    ROOM: 'Meeting Room',
    VEHICLE: 'Fleet Vehicle',
    EQUIPMENT: 'Tech Equipment',
  };

  return (
    <div className="space-y-4">
      {/* Search, Filter, and Action Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={15} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resources by name, location..."
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

          {/* Add Resource Button (Clean professional dark slate) */}
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span>Add Resource</span>
          </button>
        </div>

        {/* Filter Badges (Clean slate styling) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: `All (${resources.length})` },
              { id: 'ROOM', label: `Rooms (${resources.filter((r) => r.type === 'ROOM').length})` },
              { id: 'VEHICLE', label: `Vehicles (${resources.filter((r) => r.type === 'VEHICLE').length})` },
              { id: 'EQUIPMENT', label: `Equipment (${resources.filter((r) => r.type === 'EQUIPMENT').length})` },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSelectedType(id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  selectedType === id
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-slate-400 mr-1">Status:</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'ACTIVE', label: 'Operational' },
              { id: 'INACTIVE', label: 'Maintenance' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSelectedStatus(id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  selectedStatus === id
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

      {/* Grid of Resource Cards */}
      {filtered.length === 0 ? (
        <div className="py-14 text-center bg-white rounded-xl border border-dashed border-slate-200">
          <Filter size={32} className="mx-auto text-slate-300 mb-2" />
          <h3 className="text-xs font-semibold text-slate-700">No resources matched your filter</h3>
          <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or selecting another category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((res) => {
            const isActive = res.status === ResourceStatus.ACTIVE;
            const isToggling = togglingId === res.id && isPending;
            const Icon = typeIcons[res.type];
            const typeLabel = typeLabels[res.type];

            return (
              <div
                key={res.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header (Clean neutral tags) */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    {/* Unified Category Chip */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                      <Icon size={12} className="text-slate-500" />
                      {typeLabel}
                    </span>

                    {/* Operational / Maintenance Badge with subtle dot */}
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      {isActive ? 'Operational' : 'Maintenance'}
                    </span>
                  </div>

                  {/* Resource Name */}
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug mb-1">
                    {res.name}
                  </h3>

                  {/* Description */}
                  {res.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                      {res.description}
                    </p>
                  )}

                  {/* Metadata: Location & Capacity */}
                  <div className="flex flex-wrap items-center gap-3 py-2 border-t border-slate-100 text-xs text-slate-500 mb-3">
                    {res.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" />
                        <span className="truncate max-w-[140px]">{res.location}</span>
                      </span>
                    )}
                    {res.capacity !== null && (
                      <span className="flex items-center gap-1">
                        <Users size={11} className="text-slate-400" />
                        <span>Capacity: {res.capacity}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Card Actions: Clean buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEdit(res)}
                    className="py-1.5 px-3 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 size={12} />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleToggle(res.id)}
                    disabled={isToggling}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {isToggling ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Wrench size={12} />
                    )}
                    <span>{isActive ? 'Set Offline' : 'Set Active'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD OR EDIT RESOURCE */}
      {(isAddOpen || editingResource) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  {editingResource ? <Edit2 size={13} /> : <Plus size={14} />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 leading-none">
                    {editingResource ? 'Edit Resource' : 'Add New Resource'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {editingResource ? 'Update resource specifications' : 'Add an asset to inventory'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingResource(null);
                }}
                className="w-7 h-7 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-3.5">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Resource Name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Resource Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Conference Room A, Tesla Model 3"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              {/* Category & Capacity Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Category
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ResourceType)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white"
                  >
                    <option value={ResourceType.ROOM}>Meeting Room</option>
                    <option value={ResourceType.VEHICLE}>Fleet Vehicle</option>
                    <option value={ResourceType.EQUIPMENT}>Tech Equipment</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formCapacity}
                    onChange={(e) =>
                      setFormCapacity(e.target.value ? Number(e.target.value) : '')
                    }
                    placeholder="e.g. 10"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Location / Bay
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. 3rd Floor, Parking Bay 4"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Projector, Whiteboard, Video conferencing"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingResource(null);
                  }}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isPending && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingResource ? 'Save Changes' : 'Create Resource'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
