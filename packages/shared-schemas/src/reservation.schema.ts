import { z } from 'zod';

export const ReservationStatusEnum = z.enum([
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'NO_SHOW',
]);

export const StayStatusEnum = z.enum([
  'SCHEDULED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
]);

export const createStaySchema = z
  .object({
    roomTypeId: z.string().uuid({ message: 'Valid room type ID is required' }),
    roomId: z.string().uuid({ message: 'Valid room ID is required' }).optional().nullable(),
    checkInDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid check-in date format',
    }),
    checkOutDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid check-out date format',
    }),
    adults: z.coerce.number().int().min(1, { message: 'At least 1 adult is required' }).default(1),
    children: z.coerce.number().int().min(0).optional().default(0),
    ratePerNight: z.coerce.number().positive({ message: 'Rate per night must be positive' }).optional(),
    guestIds: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) => new Date(data.checkOutDate).getTime() > new Date(data.checkInDate).getTime(),
    {
      message: 'Check-out date must be after check-in date',
      path: ['checkOutDate'],
    },
  );

export const createReservationSchema = z.object({
  bookerGuestId: z.string().uuid({ message: 'Valid booker guest ID is required' }),
  stays: z
    .array(createStaySchema)
    .min(1, { message: 'At least one stay/room must be booked' }),
});

export const availabilityQuerySchema = z
  .object({
    checkInDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid check-in date format',
    }),
    checkOutDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid check-out date format',
    }),
    roomTypeId: z.string().uuid().optional(),
    guests: z.coerce.number().int().min(1).optional(),
  })
  .refine(
    (data) => new Date(data.checkOutDate).getTime() > new Date(data.checkInDate).getTime(),
    {
      message: 'Check-out date must be after check-in date',
      path: ['checkOutDate'],
    },
  );

export const checkInSchema = z.object({
  roomId: z.string().uuid({ message: 'Valid room ID is required' }).optional(),
});

export const checkOutSchema = z.object({
  housekeepingNotes: z.string().optional(),
});

export const assignRoomSchema = z.object({
  roomId: z.string().uuid({ message: 'Valid room ID is required' }),
});

export const reservationFilterSchema = z.object({
  status: ReservationStatusEnum.optional(),
  search: z.string().optional(),
  bookerGuestId: z.string().uuid().optional(),
  checkInAfter: z.string().optional(),
  checkOutBefore: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
