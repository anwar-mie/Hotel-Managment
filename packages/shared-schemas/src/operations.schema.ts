import { z } from 'zod';

export const HousekeepingTaskStatusEnum = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const MaintenanceStatusEnum = z.enum([
  'REPORTED',
  'IN_PROGRESS',
  'RESOLVED',
  'CANCELLED',
]);

export const createHousekeepingTaskSchema = z.object({
  roomId: z.string().uuid({ message: 'Valid room ID is required' }),
  assignedToId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateHousekeepingTaskSchema = z.object({
  assignedToId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: HousekeepingTaskStatusEnum.optional(),
});

export const completeHousekeepingTaskSchema = z.object({
  notes: z.string().optional().nullable(),
  markInspected: z.boolean().optional().default(false),
});

export const createMaintenanceRequestSchema = z.object({
  roomId: z.string().uuid({ message: 'Valid room ID is required' }),
  title: z.string().min(2, { message: 'Title must be at least 2 characters' }).trim(),
  description: z.string().optional().nullable(),
  setRoomOutOfOrder: z.boolean().optional().default(true),
});

export const updateMaintenanceRequestSchema = z.object({
  title: z.string().min(2).trim().optional(),
  description: z.string().optional().nullable(),
  status: MaintenanceStatusEnum.optional(),
});

export const resolveMaintenanceRequestSchema = z.object({
  resolutionNotes: z.string().optional().nullable(),
  restoreRoomStatus: z.boolean().optional().default(true),
});
