import { z } from 'zod';

export const resourceTypeSchema = z.enum(['ROOM', 'VEHICLE', 'EQUIPMENT']);
export const resourceStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const createResourceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  type: resourceTypeSchema,
  description: z.string().optional().nullable(),
  capacity: z.coerce
    .number()
    .int('Capacity must be an integer')
    .positive('Capacity must be greater than 0')
    .optional()
    .nullable(),
  location: z.string().max(150).optional().nullable(),
  status: resourceStatusSchema.default('ACTIVE'),
});

export const updateResourceSchema = createResourceSchema.partial();

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
