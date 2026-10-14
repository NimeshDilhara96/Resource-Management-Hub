import { z } from 'zod';

export const reservationStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
]);

export const createReservationSchema = z
  .object({
    resourceId: z.string().uuid('Invalid resource identifier'),
    startTime: z.coerce.date({
      message: 'Invalid start time format',
    }),
    endTime: z.coerce.date({
      message: 'Invalid end time format',
    }),
    purpose: z
      .string()
      .min(3, 'Purpose must be at least 3 characters')
      .max(255, 'Purpose cannot exceed 255 characters'),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  })
  .refine(
    (data) => data.startTime.getTime() >= Date.now() - 2 * 60 * 1000,
    {
      message: 'Cannot create reservations in the past',
      path: ['startTime'],
    }
  );

export const updateReservationStatusSchema = z.object({
  reservationId: z.string().uuid('Invalid reservation ID'),
  status: reservationStatusSchema,
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationStatusInput = z.infer<
  typeof updateReservationStatusSchema
>;
