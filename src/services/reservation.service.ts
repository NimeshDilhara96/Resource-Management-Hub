import prisma from '@/lib/prisma';
import { ReservationStatus, UserRole } from '@prisma/client';

export interface CheckAvailabilityParams {
  resourceId: string;
  startTime: Date;
  endTime: Date;
  excludeReservationId?: string;
}

export interface CreateReservationParams {
  userId: string;
  resourceId: string;
  startTime: Date;
  endTime: Date;
  purpose: string;
}

export class ReservationConflictError extends Error {
  conflictingReservation?: {
    id: string;
    startTime: Date;
    endTime: Date;
    purpose: string;
    user: { fullName: string };
  };

  constructor(
    message: string,
    conflict?: {
      id: string;
      startTime: Date;
      endTime: Date;
      purpose: string;
      user: { fullName: string };
    }
  ) {
    super(message);
    this.name = 'ReservationConflictError';
    this.conflictingReservation = conflict;
  }
}

export class ReservationService {
  /**
   * Checks whether a resource is available for a specified time range.
   * Interval overlap rule: [A_start < B_end] AND [A_end > B_start]
   */
  static async checkAvailability({
    resourceId,
    startTime,
    endTime,
    excludeReservationId,
  }: CheckAvailabilityParams) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return { available: false, reason: 'RESOURCE_NOT_FOUND' };
    }

    if (resource.status !== 'ACTIVE') {
      return {
        available: false,
        reason: 'RESOURCE_INACTIVE',
        message: 'This resource is currently marked inactive or under maintenance.',
      };
    }

    const conflict = await prisma.reservation.findFirst({
      where: {
        resourceId,
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (conflict) {
      return {
        available: false,
        reason: 'SCHEDULE_CONFLICT',
        conflict: {
          id: conflict.id,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          purpose: conflict.purpose,
          user: conflict.user,
        },
      };
    }

    return { available: true };
  }

  /**
   * Atomically books a resource with strict conflict check in a transaction
   */
  static async createReservation({
    userId,
    resourceId,
    startTime,
    endTime,
    purpose,
  }: CreateReservationParams) {
    if (startTime.getTime() < Date.now() - 2 * 60 * 1000) {
      throw new Error('Reservations cannot be booked for past dates or times.');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Verify resource state
      const resource = await tx.resource.findUnique({
        where: { id: resourceId },
      });

      if (!resource) {
        throw new Error('Resource not found');
      }

      if (resource.status !== 'ACTIVE') {
        throw new Error(
          'Resource is currently inactive or scheduled for maintenance.'
        );
      }

      // 2. Strict Overlap Check
      const existingConflict = await tx.reservation.findFirst({
        where: {
          resourceId,
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        include: {
          user: {
            select: { fullName: true },
          },
        },
      });

      if (existingConflict) {
        const startStr = existingConflict.startTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const endStr = existingConflict.endTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        throw new ReservationConflictError(
          `Scheduling Conflict: "${resource.name}" is already reserved by ${existingConflict.user.fullName} between ${startStr} and ${endStr}.`,
          existingConflict
        );
      }

      // 3. Create pending reservation awaiting Admin approval
      const newReservation = await tx.reservation.create({
        data: {
          userId,
          resourceId,
          startTime,
          endTime,
          purpose,
          status: ReservationStatus.PENDING,
        },
        include: {
          resource: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      return newReservation;
    });
  }

  /**
   * Get all reservations for a specific user
   */
  static async getUserReservations(userId: string) {
    return await prisma.reservation.findMany({
      where: { userId },
      include: {
        resource: true,
      },
      orderBy: { startTime: 'desc' },
    });
  }

  /**
   * Get upcoming reservations for a specific user
   */
  static async getUpcomingUserReservations(userId: string) {
    const now = new Date();
    return await prisma.reservation.findMany({
      where: {
        userId,
        endTime: { gte: now },
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
      },
      include: {
        resource: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Get reservations for a resource within a date window (for schedule/timeline)
   */
  static async getResourceReservations(
    resourceId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    return await prisma.reservation.findMany({
      where: {
        resourceId,
        status: { not: ReservationStatus.CANCELLED },
        ...(startDate && endDate
          ? {
              startTime: { lte: endDate },
              endTime: { gte: startDate },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Get all reservations with optional filters for Admin
   */
  static async getAllReservations(filters?: {
    status?: ReservationStatus;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    return await prisma.reservation.findMany({
      where: {
        status: filters?.status,
        resourceId: filters?.resourceId,
        ...(filters?.startDate && filters?.endDate
          ? {
              startTime: { lte: filters.endDate },
              endTime: { gte: filters.startDate },
            }
          : {}),
      },
      include: {
        resource: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  /**
   * Update reservation status (Cancel, Confirm, Complete) with role permission validation
   */
  static async updateReservationStatus({
    reservationId,
    status,
    userId,
    userRole,
  }: {
    reservationId: string;
    status: ReservationStatus;
    userId: string;
    userRole: UserRole;
  }) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Role Guard: Employee can only cancel their own non-completed reservation
    if (userRole !== UserRole.ADMIN) {
      if (reservation.userId !== userId) {
        throw new Error('Unauthorized: You can only manage your own reservations');
      }

      if (status !== ReservationStatus.CANCELLED) {
        throw new Error('Unauthorized: Employees can only cancel their reservations');
      }

      if (reservation.status === ReservationStatus.COMPLETED) {
        throw new Error('Cannot cancel a completed reservation');
      }
    }

    return await prisma.reservation.update({
      where: { id: reservationId },
      data: { status },
      include: {
        resource: true,
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });
  }
}
