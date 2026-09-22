import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ReservationsService } from './reservations.service.js';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      guest: {
        findUnique: vi.fn(),
      },
      roomType: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      room: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      reservation: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      reservationStay: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      housekeepingTask: {
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((promises) => Promise.all(promises)),
    };

    service = new ReservationsService(prismaMock);
  });

  describe('checkAvailability', () => {
    it('should calculate available rooms and filter out occupied rooms', async () => {
      prismaMock.roomType.findMany.mockResolvedValue([
        {
          id: 'rt-1',
          name: 'Deluxe',
          basePrice: '150.00',
          rooms: [
            { id: 'room-1', number: '101', floor: 1 },
            { id: 'room-2', number: '102', floor: 1 },
          ],
        },
      ]);

      // room-1 is booked during requested dates
      prismaMock.reservationStay.findMany.mockResolvedValue([
        { roomId: 'room-1', roomTypeId: 'rt-1' },
      ]);

      const result = await service.checkAvailability({
        checkInDate: '2026-10-01',
        checkOutDate: '2026-10-05',
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.availableRoomsCount).toBe(1);
      expect(result[0]?.availablePhysicalRooms[0]?.number).toBe('102');
    });
  });

  describe('create', () => {
    it('should throw NotFoundException if booker guest does not exist', async () => {
      prismaMock.guest.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          bookerGuestId: 'invalid-guest',
          stays: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if guests exceed room capacity', async () => {
      prismaMock.guest.findUnique.mockResolvedValue({ id: 'guest-1' });
      prismaMock.reservation.findUnique.mockResolvedValue(null);
      prismaMock.roomType.findUnique.mockResolvedValue({
        id: 'rt-1',
        name: 'Single',
        capacity: 1,
        basePrice: '100.00',
      });

      await expect(
        service.create({
          bookerGuestId: 'guest-1',
          stays: [
            {
              roomTypeId: 'rt-1',
              checkInDate: '2026-10-01',
              checkOutDate: '2026-10-03',
              adults: 2,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create reservation successfully and generate code', async () => {
      prismaMock.guest.findUnique.mockResolvedValue({ id: 'guest-1' });
      prismaMock.reservation.findUnique.mockResolvedValue(null); // code is unique
      prismaMock.roomType.findUnique.mockResolvedValue({
        id: 'rt-1',
        name: 'Deluxe',
        capacity: 2,
        basePrice: '150.00',
      });

      prismaMock.reservation.create.mockResolvedValue({
        id: 'res-1',
        reservationCode: 'RES-ABC123',
        status: 'CONFIRMED',
        bookerGuestId: 'guest-1',
        stays: [
          {
            id: 'stay-1',
            roomTypeId: 'rt-1',
            checkInDate: new Date('2026-10-01'),
            checkOutDate: new Date('2026-10-03'),
            adults: 2,
            children: 0,
            ratePerNight: '150.00',
            status: 'SCHEDULED',
            roomType: { id: 'rt-1', name: 'Deluxe', basePrice: '150.00' },
          },
        ],
      });

      const res = await service.create({
        bookerGuestId: 'guest-1',
        stays: [
          {
            roomTypeId: 'rt-1',
            checkInDate: '2026-10-01',
            checkOutDate: '2026-10-03',
            adults: 2,
          },
        ],
      });

      expect(res.id).toBe('res-1');
      expect(res.reservationCode).toBe('RES-ABC123');
      expect(res.stays[0]?.ratePerNight).toBe(150);
      expect(prismaMock.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('checkIn', () => {
    it('should check in stay, update room to OCCUPIED, and update reservation status', async () => {
      prismaMock.reservationStay.findUnique.mockResolvedValue({
        id: 'stay-1',
        reservationId: 'res-1',
        roomId: 'room-1',
        status: 'SCHEDULED',
      });

      prismaMock.room.findUnique.mockResolvedValue({
        id: 'room-1',
        number: '101',
        frontDeskStatus: 'VACANT',
      });

      const updatedStayMock = {
        id: 'stay-1',
        status: 'CHECKED_IN',
        roomId: 'room-1',
        ratePerNight: '120.00',
        roomType: { basePrice: '120.00' },
      };

      prismaMock.$transaction.mockResolvedValue([
        updatedStayMock,
        {},
        {},
        {},
      ]);

      const result = await service.checkIn('stay-1');

      expect(result.status).toBe('CHECKED_IN');
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should reject check-in if stay is not in SCHEDULED status', async () => {
      prismaMock.reservationStay.findUnique.mockResolvedValue({
        id: 'stay-1',
        status: 'CHECKED_IN',
      });

      await expect(service.checkIn('stay-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkOut', () => {
    it('should check out stay, mark room VACANT and DIRTY, and create housekeeping task', async () => {
      prismaMock.reservationStay.findUnique.mockResolvedValue({
        id: 'stay-1',
        reservationId: 'res-1',
        roomId: 'room-1',
        status: 'CHECKED_IN',
      });

      const updatedStayMock = {
        id: 'stay-1',
        status: 'CHECKED_OUT',
        ratePerNight: '120.00',
        roomType: { basePrice: '120.00' },
      };

      prismaMock.$transaction.mockResolvedValue([
        updatedStayMock,
        {},
        {},
        {},
      ]);

      prismaMock.reservationStay.count.mockResolvedValue(0); // All stays checked out
      prismaMock.reservation.update.mockResolvedValue({});

      const result = await service.checkOut('stay-1', {
        housekeepingNotes: 'Guest requested fresh towels',
      });

      expect(result.status).toBe('CHECKED_OUT');
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'res-1' },
          data: { status: 'CHECKED_OUT' },
        }),
      );
    });
  });

  describe('cancel', () => {
    it('should cancel reservation and scheduled stays', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        status: 'CONFIRMED',
        stays: [{ id: 'stay-1', status: 'SCHEDULED' }],
      });

      const result = await service.cancel('res-1');

      expect(result.success).toBe(true);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should reject cancellation if stays are already checked in', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        status: 'CHECKED_IN',
        stays: [{ id: 'stay-1', status: 'CHECKED_IN' }],
      });

      await expect(service.cancel('res-1')).rejects.toThrow(BadRequestException);
    });
  });
});
