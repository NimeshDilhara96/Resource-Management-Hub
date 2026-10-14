import prisma from '@/lib/prisma';
import { ResourceStatus, ResourceType, ReservationStatus } from '@prisma/client';
import { CreateResourceInput, UpdateResourceInput } from '@/schemas/resource.schema';

export interface ResourceFilterParams {
  type?: ResourceType;
  status?: ResourceStatus;
  search?: string;
  minCapacity?: number;
}

export class ResourceService {
  /**
   * Retrieves resources with filtering and includes active reservation count
   */
  static async getAllResources(filters?: ResourceFilterParams) {
    const now = new Date();

    const resources = await prisma.resource.findMany({
      where: {
        type: filters?.type,
        status: filters?.status,
        capacity: filters?.minCapacity ? { gte: filters.minCapacity } : undefined,
        OR: filters?.search
          ? [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { location: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        reservations: {
          where: {
            endTime: { gte: now },
            status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
          },
          orderBy: { startTime: 'asc' },
          take: 3,
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    // Annotate whether resource is currently occupied right now
    return resources.map((resource) => {
      const isOccupiedNow = resource.reservations.some(
        (r) => r.startTime <= now && r.endTime >= now && r.status === ReservationStatus.CONFIRMED
      );

      return {
        ...resource,
        isOccupiedNow,
      };
    });
  }

  /**
   * Get single resource with full upcoming schedule
   */
  static async getResourceById(id: string) {
    const now = new Date();
    return await prisma.resource.findUnique({
      where: { id },
      include: {
        reservations: {
          where: {
            endTime: { gte: now },
            status: { not: ReservationStatus.CANCELLED },
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: { startTime: 'asc' },
        },
      },
    });
  }

  /**
   * Create a new resource (Admin)
   */
  static async createResource(data: CreateResourceInput) {
    return await prisma.resource.create({
      data: {
        name: data.name,
        type: data.type,
        description: data.description ?? null,
        capacity: data.capacity ?? null,
        location: data.location ?? null,
        status: data.status ?? ResourceStatus.ACTIVE,
      },
    });
  }

  /**
   * Update an existing resource (Admin)
   */
  static async updateResource(id: string, data: UpdateResourceInput) {
    return await prisma.resource.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.status && { status: data.status }),
      },
    });
  }

  /**
   * Toggle resource status between ACTIVE and INACTIVE
   */
  static async toggleStatus(id: string) {
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) throw new Error('Resource not found');

    const newStatus =
      resource.status === ResourceStatus.ACTIVE
        ? ResourceStatus.INACTIVE
        : ResourceStatus.ACTIVE;

    return await prisma.resource.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  /**
   * Analytics & Operational Insights for the Admin Dashboard
   */
  static async getDashboardAnalytics() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [
      totalResources,
      roomsCount,
      vehiclesCount,
      equipmentCount,
      activeResources,
      inactiveResources,
      todayReservationsCount,
      pendingReservationsCount,
      upcomingReservationsCount,
    ] = await Promise.all([
      prisma.resource.count(),
      prisma.resource.count({ where: { type: ResourceType.ROOM } }),
      prisma.resource.count({ where: { type: ResourceType.VEHICLE } }),
      prisma.resource.count({ where: { type: ResourceType.EQUIPMENT } }),
      prisma.resource.count({ where: { status: ResourceStatus.ACTIVE } }),
      prisma.resource.count({ where: { status: ResourceStatus.INACTIVE } }),
      prisma.reservation.count({
        where: {
          startTime: { gte: startOfToday, lte: endOfToday },
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
        },
      }),
      prisma.reservation.count({
        where: { status: ReservationStatus.PENDING },
      }),
      prisma.reservation.count({
        where: {
          startTime: { gte: now },
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
        },
      }),
    ]);

    return {
      totalResources,
      byType: {
        ROOM: roomsCount,
        VEHICLE: vehiclesCount,
        EQUIPMENT: equipmentCount,
      },
      statusSummary: {
        active: activeResources,
        inactive: inactiveResources,
      },
      todayReservationsCount,
      pendingReservationsCount,
      upcomingReservationsCount,
    };
  }
}
