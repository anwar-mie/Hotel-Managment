import { z } from 'zod';

export const createRoomTypeSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Room type name must be at least 2 characters long' })
    .trim(),
  description: z.string().optional().nullable(),
  capacity: z
    .coerce
    .number()
    .int()
    .min(1, { message: 'Capacity must be at least 1 guest' }),
  basePrice: z
    .coerce
    .number()
    .positive({ message: 'Base price must be greater than 0' }),
});

export const updateRoomTypeSchema = createRoomTypeSchema.partial();

export const roomTypeFilterSchema = z.object({
  search: z.string().optional(),
  minCapacity: z.coerce.number().int().optional(),
  maxPrice: z.coerce.number().positive().optional(),
});
