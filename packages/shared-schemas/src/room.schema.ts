import { z } from 'zod';

export const FrontDeskStatusEnum = z.enum([
  'VACANT',
  'OCCUPIED',
  'OUT_OF_ORDER',
]);

export const HousekeepingStatusEnum = z.enum([
  'CLEAN',
  'DIRTY',
  'INSPECTED',
  'OUT_OF_SERVICE',
]);

export const createRoomSchema = z.object({
  number: z
    .string()
    .min(1, { message: 'Room number is required' })
    .trim(),
  floor: z.coerce.number().int().optional().nullable(),
  roomTypeId: z.string().uuid({ message: 'Valid room type ID is required' }),
  frontDeskStatus: FrontDeskStatusEnum.optional().default('VACANT'),
  housekeepingStatus: HousekeepingStatusEnum.optional().default('CLEAN'),
});

export const updateRoomSchema = z.object({
  number: z.string().min(1).trim().optional(),
  floor: z.coerce.number().int().optional().nullable(),
  roomTypeId: z.string().uuid().optional(),
  frontDeskStatus: FrontDeskStatusEnum.optional(),
  housekeepingStatus: HousekeepingStatusEnum.optional(),
});

export const updateRoomStatusSchema = z.object({
  frontDeskStatus: FrontDeskStatusEnum.optional(),
  housekeepingStatus: HousekeepingStatusEnum.optional(),
});

export const bulkCreateRoomsSchema = z.object({
  floor: z.coerce.number().int({ message: 'Floor must be an integer' }),
  roomTypeId: z.string().uuid({ message: 'Valid room type ID is required' }),
  startNumber: z.coerce.number().int().min(1, { message: 'Start number must be positive' }),
  count: z.coerce.number().int().min(1).max(100, { message: 'Count must be between 1 and 100' }),
  prefix: z.string().optional().default(''),
});

export const roomFilterSchema = z.object({
  floor: z.coerce.number().int().optional(),
  roomTypeId: z.string().uuid().optional(),
  frontDeskStatus: FrontDeskStatusEnum.optional(),
  housekeepingStatus: HousekeepingStatusEnum.optional(),
  search: z.string().optional(),
});
