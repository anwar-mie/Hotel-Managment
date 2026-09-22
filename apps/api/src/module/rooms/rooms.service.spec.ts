import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RoomsService } from './rooms.service.js';

describe('RoomsService', () => {
  let service: RoomsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      room: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      roomType: {
        findUnique: vi.fn(),
      },
      reservationStay: {
        count: vi.fn(),
      },
    };

    service = new RoomsService(prismaMock);
  });

  describe('getStats', () => {
    it('should aggregate front desk and housekeeping counts', async () => {
      // Order of count calls in Promise.all:
      // total, vacant, occupied, outOfOrder, clean, dirty, inspected, outOfService, readyForGuest
      prismaMock.room.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(35) // vacant
        .mockResolvedValueOnce(12) // occupied
        .mockResolvedValueOnce(3)  // outOfOrder
        .mockResolvedValueOnce(30) // clean
        .mockResolvedValueOnce(15) // dirty
        .mockResolvedValueOnce(3)  // inspected
        .mockResolvedValueOnce(2)  // outOfService
        .mockResolvedValueOnce(28); // readyForGuest

      const stats = await service.getStats();

      expect(stats.total).toBe(50);
      expect(stats.frontDesk.vacant).toBe(35);
      expect(stats.frontDesk.occupied).toBe(12);
      expect(stats.housekeeping.dirty).toBe(15);
      expect(stats.readyForGuest).toBe(28);
    });
  });

  describe('create', () => {
    it('should throw NotFoundException if roomTypeId is invalid', async () => {
      prismaMock.roomType.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          number: '101',
          roomTypeId: 'invalid-rt',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if room number already exists', async () => {
      prismaMock.roomType.findUnique.mockResolvedValue({ id: 'rt-1' });
      prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', number: '101' });

      await expect(
        service.create({
          number: '101',
          roomTypeId: 'rt-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create room successfully', async () => {
      prismaMock.roomType.findUnique.mockResolvedValue({ id: 'rt-1', basePrice: '100.00' });
      prismaMock.room.findUnique.mockResolvedValue(null);
      prismaMock.room.create.mockResolvedValue({
        id: 'r-1',
        number: '101',
        floor: 1,
        frontDeskStatus: 'VACANT',
        housekeepingStatus: 'CLEAN',
        roomTypeId: 'rt-1',
        roomType: { id: 'rt-1', basePrice: '100.00' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create({
        number: '101',
        floor: 1,
        roomTypeId: 'rt-1',
      });

      expect(result.id).toBe('r-1');
      expect(result.number).toBe('101');
      expect(result.frontDeskStatus).toBe('VACANT');
      expect(prismaMock.room.create).toHaveBeenCalled();
    });
  });

  describe('bulkCreate', () => {
    it('should bulk generate rooms without conflict', async () => {
      prismaMock.roomType.findUnique.mockResolvedValue({ id: 'rt-1' });
      prismaMock.room.findMany.mockResolvedValue([]); // no duplicates
      prismaMock.room.createMany.mockResolvedValue({ count: 5 });

      const result = await service.bulkCreate({
        floor: 2,
        roomTypeId: 'rt-1',
        startNumber: 201,
        count: 5,
      });

      expect(result.count).toBe(5);
      expect(prismaMock.room.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ number: '201', floor: 2 }),
          expect.objectContaining({ number: '205', floor: 2 }),
        ]),
      });
    });

    it('should throw ConflictException if any generated room number exists', async () => {
      prismaMock.roomType.findUnique.mockResolvedValue({ id: 'rt-1' });
      prismaMock.room.findMany.mockResolvedValue([{ number: '203' }]);

      await expect(
        service.bulkCreate({
          floor: 2,
          roomTypeId: 'rt-1',
          startNumber: 201,
          count: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStatus', () => {
    it('should update operational status', async () => {
      prismaMock.room.findUnique.mockResolvedValue({ id: 'r-1', number: '101' });
      prismaMock.room.update.mockResolvedValue({
        id: 'r-1',
        number: '101',
        frontDeskStatus: 'OCCUPIED',
        housekeepingStatus: 'DIRTY',
        roomType: { basePrice: '150.00' },
      });

      const result = await service.updateStatus('r-1', {
        frontDeskStatus: 'OCCUPIED',
        housekeepingStatus: 'DIRTY',
      });

      expect(result.frontDeskStatus).toBe('OCCUPIED');
      expect(result.housekeepingStatus).toBe('DIRTY');
    });
  });

  describe('remove', () => {
    it('should prevent deletion if room has active/scheduled stays', async () => {
      prismaMock.room.findUnique.mockResolvedValue({ id: 'r-1' });
      prismaMock.reservationStay.count.mockResolvedValue(2);

      await expect(service.remove('r-1')).rejects.toThrow(BadRequestException);
    });

    it('should delete room if no active stays', async () => {
      prismaMock.room.findUnique.mockResolvedValue({ id: 'r-1' });
      prismaMock.reservationStay.count.mockResolvedValue(0);
      prismaMock.room.delete.mockResolvedValue({});

      const result = await service.remove('r-1');
      expect(result.success).toBe(true);
      expect(prismaMock.room.delete).toHaveBeenCalledWith({ where: { id: 'r-1' } });
    });
  });
});
