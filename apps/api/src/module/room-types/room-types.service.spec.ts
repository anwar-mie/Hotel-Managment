import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RoomTypesService } from './room-types.service.js';

describe('RoomTypesService', () => {
  let service: RoomTypesService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      roomType: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      room: {
        count: vi.fn(),
      },
    };

    service = new RoomTypesService(prismaMock);
  });

  describe('findAll', () => {
    it('should return a list of room types with basePrice formatted as number', async () => {
      prismaMock.roomType.findMany.mockResolvedValue([
        {
          id: 'rt-1',
          name: 'Deluxe Suite',
          description: 'Spacious suite',
          capacity: 4,
          basePrice: '250.00',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { rooms: 5, stays: 10 },
        },
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]?.basePrice).toBe(250);
      expect(result[0]?.name).toBe('Deluxe Suite');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if room type does not exist', async () => {
      prismaMock.roomType.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should return room type if found', async () => {
      prismaMock.roomType.findUnique.mockResolvedValue({
        id: 'rt-1',
        name: 'Single Room',
        capacity: 1,
        basePrice: '75.00',
        rooms: [],
        _count: { rooms: 0, stays: 0 },
      });

      const result = await service.findOne('rt-1');
      expect(result.id).toBe('rt-1');
      expect(result.basePrice).toBe(75);
    });
  });

  describe('create', () => {
    it('should throw ConflictException if room type name already exists', async () => {
      prismaMock.roomType.findUnique.mockResolvedValue({ id: 'rt-1', name: 'Standard Double' });

      await expect(
        service.create({
          name: 'Standard Double',
          capacity: 2,
          basePrice: 120,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create room type successfully', async () => {
      prismaMock.roomType.findUnique.mockResolvedValue(null);
      prismaMock.roomType.create.mockResolvedValue({
        id: 'rt-new',
        name: 'Ocean View Suite',
        description: 'Views of the sea',
        capacity: 3,
        basePrice: '300.00',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create({
        name: 'Ocean View Suite',
        description: 'Views of the sea',
        capacity: 3,
        basePrice: 300,
      });

      expect(result.id).toBe('rt-new');
      expect(result.basePrice).toBe(300);
      expect(prismaMock.roomType.create).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException if room type has assigned rooms', async () => {
      prismaMock.roomType.findUnique.mockResolvedValue({ id: 'rt-1', name: 'Deluxe' });
      prismaMock.room.count.mockResolvedValue(3);

      await expect(service.remove('rt-1')).rejects.toThrow(BadRequestException);
    });

    it('should delete room type successfully when no rooms are assigned', async () => {
      prismaMock.roomType.findUnique.mockResolvedValue({ id: 'rt-1', name: 'Deluxe' });
      prismaMock.room.count.mockResolvedValue(0);
      prismaMock.roomType.delete.mockResolvedValue({});

      const result = await service.remove('rt-1');
      expect(result.success).toBe(true);
      expect(prismaMock.roomType.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
    });
  });
});
