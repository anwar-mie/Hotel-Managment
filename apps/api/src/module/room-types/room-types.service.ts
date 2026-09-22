import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  IRoomType,
  ICreateRoomTypeInput,
  IUpdateRoomTypeInput,
  IRoomTypeFilterQuery,
} from 'shared-types';

@Injectable()
export class RoomTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter?: IRoomTypeFilterQuery): Promise<IRoomType[]> {
    const where: any = {};

    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter?.minCapacity) {
      where.capacity = { gte: filter.minCapacity };
    }

    if (filter?.maxPrice) {
      where.basePrice = { lte: filter.maxPrice };
    }

    const roomTypes = await this.prisma.roomType.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            rooms: true,
            stays: true,
          },
        },
      },
    });

    return roomTypes.map((rt: any) => ({
      ...rt,
      basePrice: Number(rt.basePrice),
    }));
  }

  async findOne(id: string): Promise<IRoomType> {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id },
      include: {
        rooms: {
          select: {
            id: true,
            number: true,
            floor: true,
            frontDeskStatus: true,
            housekeepingStatus: true,
          },
        },
        _count: {
          select: {
            rooms: true,
            stays: true,
          },
        },
      },
    });

    if (!roomType) {
      throw new NotFoundException(`Room type with ID '${id}' not found`);
    }

    return {
      ...roomType,
      basePrice: Number(roomType.basePrice),
    };
  }

  async create(data: ICreateRoomTypeInput): Promise<IRoomType> {
    const existing = await this.prisma.roomType.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException(`Room type '${data.name}' already exists`);
    }

    const roomType = await this.prisma.roomType.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        capacity: data.capacity,
        basePrice: data.basePrice,
      },
    });

    return {
      ...roomType,
      basePrice: Number(roomType.basePrice),
    };
  }

  async update(id: string, data: IUpdateRoomTypeInput): Promise<IRoomType> {
    await this.findOne(id);

    if (data.name) {
      const duplicate = await this.prisma.roomType.findFirst({
        where: {
          name: data.name,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException(`Another room type with name '${data.name}' already exists`);
      }
    }

    const updated = await this.prisma.roomType.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
      },
    });

    return {
      ...updated,
      basePrice: Number(updated.basePrice),
    };
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    await this.findOne(id);

    const roomCount = await this.prisma.room.count({
      where: { roomTypeId: id },
    });

    if (roomCount > 0) {
      throw new BadRequestException(
        `Cannot delete room type because it has ${roomCount} room(s) assigned to it`,
      );
    }

    await this.prisma.roomType.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Room type deleted successfully',
    };
  }
}
