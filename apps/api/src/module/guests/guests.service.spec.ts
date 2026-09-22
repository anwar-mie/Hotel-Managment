import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { GuestsService } from './guests.service.js';

describe('GuestsService', () => {
  let service: GuestsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      guest: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      reservation: {
        count: vi.fn(),
      },
      stayGuest: {
        count: vi.fn(),
      },
    };

    service = new GuestsService(prismaMock);
  });

  describe('findAll', () => {
    it('should paginate and return guests with metadata', async () => {
      prismaMock.guest.count.mockResolvedValue(25);
      prismaMock.guest.findMany.mockResolvedValue([
        {
          id: 'g-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+123456789',
          _count: { bookedReservations: 2, stays: 3 },
        },
      ]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(25);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });
  });

  describe('lookup', () => {
    it('should perform fast autocomplete search and return formatted name', async () => {
      prismaMock.guest.findMany.mockResolvedValue([
        {
          id: 'g-1',
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          phone: '+15551234',
          identificationType: 'PASSPORT',
          identificationNumber: 'P123456',
        },
      ]);

      const results = await service.lookup('Alice');

      expect(results).toHaveLength(1);
      expect(results[0]?.fullName).toBe('Alice Smith');
      expect(results[0]?.identificationNumber).toBe('P123456');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if guest is missing', async () => {
      prismaMock.guest.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should return guest if found', async () => {
      prismaMock.guest.findUnique.mockResolvedValue({
        id: 'g-1',
        firstName: 'John',
        lastName: 'Doe',
        bookedReservations: [],
        stays: [],
        _count: { bookedReservations: 0, stays: 0 },
      });

      const guest = await service.findOne('g-1');
      expect(guest.id).toBe('g-1');
      expect(guest.firstName).toBe('John');
    });
  });

  describe('create', () => {
    it('should throw ConflictException if identification number is already taken', async () => {
      prismaMock.guest.findFirst.mockResolvedValue({
        id: 'existing-g',
        firstName: 'Bob',
        lastName: 'Brown',
        identificationNumber: 'ID999',
      });

      await expect(
        service.create({
          firstName: 'Robert',
          lastName: 'Brown',
          identificationNumber: 'ID999',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create guest successfully', async () => {
      prismaMock.guest.findFirst.mockResolvedValue(null);
      prismaMock.guest.create.mockResolvedValue({
        id: 'new-g',
        firstName: 'David',
        lastName: 'Miller',
        email: 'david@example.com',
        phone: '+1444333',
        nationality: 'Canadian',
      });

      const guest = await service.create({
        firstName: 'David',
        lastName: 'Miller',
        email: 'david@example.com',
        phone: '+1444333',
        nationality: 'Canadian',
      });

      expect(guest.id).toBe('new-g');
      expect(guest.lastName).toBe('Miller');
      expect(prismaMock.guest.create).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should prevent deleting guest with reservation or stay history', async () => {
      prismaMock.guest.findUnique.mockResolvedValue({ id: 'g-1', firstName: 'Jane' });
      prismaMock.reservation.count.mockResolvedValue(1);
      prismaMock.stayGuest.count.mockResolvedValue(0);

      await expect(service.remove('g-1')).rejects.toThrow(BadRequestException);
    });

    it('should delete guest if no history exists', async () => {
      prismaMock.guest.findUnique.mockResolvedValue({ id: 'g-1', firstName: 'Jane' });
      prismaMock.reservation.count.mockResolvedValue(0);
      prismaMock.stayGuest.count.mockResolvedValue(0);
      prismaMock.guest.delete.mockResolvedValue({});

      const result = await service.remove('g-1');
      expect(result.success).toBe(true);
      expect(prismaMock.guest.delete).toHaveBeenCalledWith({ where: { id: 'g-1' } });
    });
  });
});
