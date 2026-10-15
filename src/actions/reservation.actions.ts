'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireUser, requireAdmin } from '@/lib/session';
import { formatErrorMessage } from '@/lib/utils';
import {
  ReservationService,
  ReservationConflictError,
} from '@/services/reservation.service';
import {
  createReservationSchema,
  updateReservationStatusSchema,
} from '@/schemas/reservation.schema';
import { ReservationStatus } from '@prisma/client';
import { assertPermission, assertCanManageReservation } from '@/lib/permissions';
import { logSecurityAudit } from '@/lib/audit-logger';

export async function checkAvailabilityAction(payload: {
  resourceId: string;
  startTime: string;
  endTime: string;
  excludeReservationId?: string;
}): Promise<{
  success: boolean;
  available: boolean;
  reason?: string;
  message?: string;
  conflict?: any;
  error?: string;
}> {
  try {
    const result = await ReservationService.checkAvailability({
      resourceId: payload.resourceId,
      startTime: new Date(payload.startTime),
      endTime: new Date(payload.endTime),
      excludeReservationId: payload.excludeReservationId,
    });
    return {
      success: true,
      available: result.available,
      reason: result.reason,
      message: (result as any).message,
      conflict: (result as any).conflict,
    };
  } catch (error: any) {
    return {
      success: false,
      available: false,
      error: formatErrorMessage(error),
    };
  }
}

/**
 * Creates a new reservation
 * Enforces server-side userId derivation from verified session (Never trusts client claims).
 * Asserts 'reservation:create' role permission and logs security audit trail.
 */
export async function createReservationAction(payload: {
  resourceId: string;
  startTime: string;
  endTime: string;
  purpose: string;
}) {
  try {
    // 1. Derive identity and verify role server-side
    const session = await requireUser();
    assertPermission(session, 'reservation:create');

    // 2. Validate input schema
    const validated = createReservationSchema.parse({
      resourceId: payload.resourceId,
      startTime: new Date(payload.startTime),
      endTime: new Date(payload.endTime),
      purpose: payload.purpose,
    });

    // 3. Create reservation using server-derived userId
    const reservation = await ReservationService.createReservation({
      userId: session.id, // Strictly derived from verified session
      resourceId: validated.resourceId,
      startTime: validated.startTime,
      endTime: validated.endTime,
      purpose: validated.purpose,
    });

    // 4. Log audit event
    logSecurityAudit({
      event: 'RESERVATION_CREATED',
      actorId: session.id,
      actorEmail: session.email,
      actorRole: session.role,
      targetId: reservation.id,
      targetType: 'Reservation',
      details: {
        resourceId: validated.resourceId,
        startTime: validated.startTime,
        endTime: validated.endTime,
      },
      severity: 'INFO',
    });

    revalidatePath('/dashboard');
    revalidatePath('/my-reservations');
    revalidatePath('/admin');
    revalidatePath('/admin/reservations');

    return {
      success: true,
      reservation,
      message: 'Booking request submitted! Awaiting administrator approval.',
    };
  } catch (error: any) {
    if (error instanceof ReservationConflictError) {
      return {
        success: false,
        error: error.message,
        conflict: error.conflictingReservation,
      };
    }
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      return {
        success: false,
        error: firstIssue?.message || 'Invalid reservation information.',
      };
    }
    return {
      success: false,
      error: formatErrorMessage(error),
    };
  }
}

/**
 * Cancels a reservation with strict Object-Level Authorization (IDOR / BOLA protection).
 * Ensures employees can ONLY cancel their own bookings, while Admins retain override powers.
 */
export async function cancelReservationAction(reservationId: string) {
  try {
    const session = await requireUser();

    // 1. Fetch object from database to verify ownership
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return {
        success: false,
        error: 'Reservation not found.',
      };
    }

    // 2. Disallow cancelling past concluded reservations
    if (new Date(reservation.endTime) < new Date()) {
      return {
        success: false,
        error: 'Past reservations cannot be cancelled as they have already concluded.',
      };
    }

    // 3. Object-Level Authorization check (Prevents BOLA / Horizontal Escalation)
    try {
      assertCanManageReservation(session, reservation.userId);
    } catch (authError: any) {
      logSecurityAudit({
        event: 'OBJECT_AUTH_VIOLATION',
        actorId: session.id,
        actorEmail: session.email,
        actorRole: session.role,
        targetId: reservationId,
        targetType: 'Reservation',
        details: {
          attemptedAction: 'cancel',
          actualOwnerId: reservation.userId,
        },
        severity: 'CRITICAL',
      });
      return {
        success: false,
        error: authError.message || 'Unauthorized: You can only cancel your own bookings.',
      };
    }

    // 4. Update status in database
    await ReservationService.updateReservationStatus({
      reservationId,
      status: ReservationStatus.CANCELLED,
      userId: session.id,
      userRole: session.role,
    });

    // 4. Log audit trail
    logSecurityAudit({
      event: 'RESERVATION_CANCELLED',
      actorId: session.id,
      actorEmail: session.email,
      actorRole: session.role,
      targetId: reservationId,
      targetType: 'Reservation',
      severity: 'INFO',
    });

    revalidatePath('/dashboard');
    revalidatePath('/my-reservations');
    revalidatePath('/admin');
    revalidatePath('/admin/reservations');

    return {
      success: true,
      message: 'Reservation has been cancelled.',
    };
  } catch (error: any) {
    return {
      success: false,
      error: formatErrorMessage(error),
    };
  }
}

/**
 * Updates a reservation status (Admin approval / rejection / completion flow).
 * Requires verified ADMIN role derived from database and records audit log.
 */
export async function adminUpdateReservationStatusAction(
  reservationId: string,
  status: ReservationStatus
) {
  try {
    const session = await requireAdmin();
    assertPermission(session, 'reservation:update_status');

    const validated = updateReservationStatusSchema.parse({
      reservationId,
      status,
    });

    const targetReservation = await prisma.reservation.findUnique({
      where: { id: validated.reservationId },
    });

    if (!targetReservation) {
      return {
        success: false,
        error: 'Reservation not found.',
      };
    }

    // Prevent cancellation of past concluded reservations
    if (
      validated.status === ReservationStatus.CANCELLED &&
      new Date(targetReservation.endTime) < new Date()
    ) {
      return {
        success: false,
        error: 'Past reservations cannot be cancelled as they have already concluded.',
      };
    }

    await ReservationService.updateReservationStatus({
      reservationId: validated.reservationId,
      status: validated.status,
      userId: session.id,
      userRole: session.role,
    });

    logSecurityAudit({
      event: 'RESERVATION_STATUS_UPDATED',
      actorId: session.id,
      actorEmail: session.email,
      actorRole: session.role,
      targetId: reservationId,
      targetType: 'Reservation',
      details: { newStatus: status },
      severity: 'INFO',
    });

    revalidatePath('/admin');
    revalidatePath('/admin/reservations');
    revalidatePath('/dashboard');
    revalidatePath('/my-reservations');

    return {
      success: true,
      message: `Reservation status updated to ${status}.`,
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      return {
        success: false,
        error: firstIssue?.message || 'Invalid reservation status data.',
      };
    }
    return {
      success: false,
      error: formatErrorMessage(error),
    };
  }
}

/**
 * Fetches all reservations for the currently authenticated user
 */
export async function getMyReservationsAction(): Promise<{
  success: boolean;
  reservations: any[];
  error?: string;
}> {
  try {
    const session = await requireUser();
    const reservations = await ReservationService.getUserReservations(session.id);
    return {
      success: true,
      reservations: JSON.parse(JSON.stringify(reservations)),
    };
  } catch (error: any) {
    return {
      success: false,
      reservations: [],
      error: formatErrorMessage(error),
    };
  }
}
