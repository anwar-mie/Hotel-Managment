import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service.js';

describe('BillingService', () => {
  let service: BillingService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      reservation: {
        findUnique: vi.fn(),
      },
      invoice: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      invoiceItem: {
        create: vi.fn(),
        delete: vi.fn(),
      },
      payment: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      service: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      serviceOrder: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    service = new BillingService(prismaMock);
  });

  describe('generateInvoiceForReservation', () => {
    it('should calculate stay nights, tax, and create invoice', async () => {
      const checkIn = new Date('2026-10-01');
      const checkOut = new Date('2026-10-04'); // 3 nights

      prismaMock.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        stays: [
          {
            id: 'stay-1',
            checkInDate: checkIn,
            checkOutDate: checkOut,
            ratePerNight: '100.00',
            room: { number: '101' },
            roomType: { name: 'Deluxe' },
          },
        ],
      });

      prismaMock.serviceOrder.findMany.mockResolvedValue([]);
      prismaMock.invoice.findUnique.mockResolvedValue(null); // invoiceNumber unique
      prismaMock.invoice.create.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-2609-AA11',
        subtotal: '300.00',
        tax: '30.00', // 10%
        discount: '0.00',
        total: '330.00',
        status: 'ISSUED',
        items: [
          {
            id: 'it-1',
            description: 'Room 101 (Deluxe) - 3 night(s) @ $100.00',
            quantity: 3,
            unitPrice: '100.00',
            total: '300.00',
          },
        ],
        payments: [],
      });

      const invoice = await service.generateInvoiceForReservation({
        reservationId: 'res-1',
        taxRatePercent: 10,
      });

      expect(invoice.id).toBe('inv-1');
      expect(invoice.subtotal).toBe(300);
      expect(invoice.tax).toBe(30);
      expect(invoice.total).toBe(330);
      expect(invoice.balanceDue).toBe(330);
      expect(prismaMock.auditLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if reservation is not found', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue(null);

      await expect(
        service.generateInvoiceForReservation({ reservationId: 'invalid' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordPayment', () => {
    it('should update invoice status to PARTIALLY_PAID if payment is less than total', async () => {
      prismaMock.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        total: '200.00',
        subtotal: '180.00',
        tax: '20.00',
        discount: '0.00',
        status: 'ISSUED',
        payments: [],
        items: [],
      });

      prismaMock.payment.create.mockResolvedValue({ id: 'pay-1' });
      prismaMock.invoice.update.mockResolvedValue({
        id: 'inv-1',
        total: '200.00',
        subtotal: '180.00',
        tax: '20.00',
        discount: '0.00',
        status: 'PARTIALLY_PAID',
        payments: [{ id: 'pay-1', amount: '100.00', status: 'COMPLETED' }],
        items: [],
      });

      const result = await service.recordPayment('inv-1', {
        amount: 100,
        method: 'CASH',
      });

      expect(result.status).toBe('PARTIALLY_PAID');
      expect(result.totalPaid).toBe(100);
      expect(result.balanceDue).toBe(100);
      expect(prismaMock.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PARTIALLY_PAID' }),
        }),
      );
    });

    it('should update invoice status to PAID if total is fully covered', async () => {
      prismaMock.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        total: '200.00',
        subtotal: '180.00',
        tax: '20.00',
        discount: '0.00',
        status: 'PARTIALLY_PAID',
        payments: [{ id: 'pay-1', amount: '100.00', status: 'COMPLETED' }],
        items: [],
      });

      prismaMock.payment.create.mockResolvedValue({ id: 'pay-2' });
      prismaMock.invoice.update.mockResolvedValue({
        id: 'inv-1',
        total: '200.00',
        subtotal: '180.00',
        tax: '20.00',
        discount: '0.00',
        status: 'PAID',
        payments: [
          { id: 'pay-1', amount: '100.00', status: 'COMPLETED' },
          { id: 'pay-2', amount: '100.00', status: 'COMPLETED' },
        ],
        items: [],
      });

      const result = await service.recordPayment('inv-1', {
        amount: 100,
        method: 'CARD',
      });

      expect(result.status).toBe('PAID');
      expect(result.balanceDue).toBe(0);
      expect(prismaMock.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAID' }),
        }),
      );
    });
  });

  describe('voidInvoice', () => {
    it('should throw BadRequestException if invoice has completed payments', async () => {
      prismaMock.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        payments: [{ id: 'pay-1', status: 'COMPLETED' }],
      });

      await expect(service.voidInvoice('inv-1')).rejects.toThrow(BadRequestException);
    });

    it('should void invoice if no completed payments exist', async () => {
      prismaMock.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        payments: [],
      });

      prismaMock.invoice.update.mockResolvedValue({
        id: 'inv-1',
        total: '100.00',
        subtotal: '100.00',
        tax: '0.00',
        discount: '0.00',
        status: 'VOID',
        payments: [],
        items: [],
      });

      const result = await service.voidInvoice('inv-1');
      expect(result.status).toBe('VOID');
      expect(prismaMock.auditLog.create).toHaveBeenCalled();
    });
  });
});
