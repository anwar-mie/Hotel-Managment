import { z } from 'zod';

export const InvoiceStatusEnum = z.enum([
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'VOID',
]);

export const PaymentMethodEnum = z.enum([
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'MOBILE_MONEY',
]);

export const PaymentStatusEnum = z.enum([
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
]);

export const ServiceStatusEnum = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const createInvoiceSchema = z.object({
  reservationId: z.string().uuid({ message: 'Valid reservation ID is required' }),
  taxRatePercent: z.coerce.number().min(0).max(100).optional().default(10),
  discount: z.coerce.number().min(0).optional().default(0),
});

export const addInvoiceItemSchema = z.object({
  description: z.string().min(1, { message: 'Item description is required' }).trim(),
  quantity: z.coerce.number().int().min(1, { message: 'Quantity must be at least 1' }),
  unitPrice: z.coerce.number().positive({ message: 'Unit price must be greater than 0' }),
});

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Payment amount must be greater than 0' }),
  method: PaymentMethodEnum,
  transactionReference: z.string().trim().optional().nullable(),
});

export const createServiceSchema = z.object({
  name: z.string().min(2, { message: 'Service name must be at least 2 characters' }).trim(),
  description: z.string().optional().nullable(),
  price: z.coerce.number().positive({ message: 'Price must be greater than 0' }),
});

export const updateServiceSchema = z.object({
  name: z.string().min(2).trim().optional(),
  description: z.string().optional().nullable(),
  price: z.coerce.number().positive().optional(),
  active: z.boolean().optional(),
});

export const createServiceOrderSchema = z.object({
  serviceId: z.string().uuid({ message: 'Valid service ID is required' }),
  reservationId: z.string().uuid({ message: 'Valid reservation ID is required' }),
  quantity: z.coerce.number().int().min(1, { message: 'Quantity must be at least 1' }),
  postToInvoice: z.boolean().optional().default(true),
});

export const invoiceFilterSchema = z.object({
  status: InvoiceStatusEnum.optional(),
  reservationId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
