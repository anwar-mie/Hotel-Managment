import { z } from 'zod';

export const IdentificationTypeEnum = z.enum([
  'PASSPORT',
  'NATIONAL_ID',
  'DRIVING_LICENSE',
  'OTHER',
]);

export const createGuestSchema = z.object({
  firstName: z
    .string()
    .min(1, { message: 'First name is required' })
    .trim(),
  lastName: z
    .string()
    .min(1, { message: 'Last name is required' })
    .trim(),
  email: z
    .string()
    .email({ message: 'Please provide a valid email address' })
    .toLowerCase()
    .trim()
    .optional()
    .nullable(),
  phone: z
    .string()
    .min(4, { message: 'Phone number must be at least 4 digits' })
    .trim()
    .optional()
    .nullable(),
  address: z.string().trim().optional().nullable(),
  nationality: z.string().trim().optional().nullable(),
  identificationType: IdentificationTypeEnum.optional().nullable(),
  identificationNumber: z.string().trim().optional().nullable(),
});

export const updateGuestSchema = createGuestSchema.partial();

export const guestFilterSchema = z.object({
  search: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  identificationNumber: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const guestLookupSchema = z.object({
  query: z
    .string()
    .min(2, { message: 'Query must be at least 2 characters' })
    .trim(),
});
