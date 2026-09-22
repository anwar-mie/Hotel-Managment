import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  IRoom,
  ICreateRoomInput,
  IUpdateRoomInput,
  IUpdateRoomStatusInput,
  IBulkCreateRoomsInput,
  IRoomFilterQuery,
  IRoomStats,
} from 'shared-types';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter?: IRoomFilterQuery): Promise<IRoom[]> {
    const where: any = {};

    if (filter?.floor !== undefined) {
      where.floor = filter.floor;
    }

    if (filter?.roomTypeId) {
      where.roomTypeId = filter.roomTypeId;
    }

    if (filter?.frontDeskStatus) {
      where.frontDeskStatus = filter.frontDeskStatus;
    }

    if (filter?.housekeepingStatus) {
      where.housekeepingStatus = filter.housekeepingStatus;
    }

    if (filter?.search) {
      where.number = { contains: filter.search, mode: 'insensitive' };
    }

    const rooms = await this.prisma.room.findMany({
      where,
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      include: {
        roomType: {
          select: {
            id: true,
            name: true,
            capacity: true,
            basePrice: true,
          },
        },
      },
    });

    return rooms.map((room: any) => ({
      ...room,
      roomType: room.roomType
        ? {
            ...room.roomType,
            description: null,
            basePrice: Number(room.roomType.basePrice),
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
          }
        : undefined,
    }));
  }

  async getStats(): Promise<IRoomStats> {
    const [
      total,
      vacant,
      occupied,
      outOfOrder,
      clean,
      dirty,
      inspected,
      outOfService,
      readyForGuest,
    ] = await Promise.all([
      this.prisma.room.count(),
      this.prisma.room.count({ where: { frontDeskStatus: 'VACANT' } }),
      this.prisma.room.count({ where: { frontDeskStatus: 'OCCUPIED' } }),
      this.prisma.room.count({ where: { frontDeskStatus: 'OUT_OF_ORDER' } }),
      this.prisma.room.count({ where: { housekeepingStatus: 'CLEAN' } }),
      this.prisma.room.count({ where: { housekeepingStatus: 'DIRTY' } }),
      this.prisma.room.count({ where: { housekeepingStatus: 'INSPECTED' } }),
      this.prisma.room.count({ where: { housekeepingStatus: 'OUT_OF_SERVICE' } }),
      this.prisma.room.count({
        where: {
          frontDeskStatus: 'VACANT',
          housekeepingStatus: { in: ['CLEAN', 'INSPECTED'] },
        },
      }),
    ]);

    return {
      total,
      frontDesk: {
        vacant,
        occupied,
        outOfOrder,
      },
      housekeeping: {
        clean,
        dirty,
        inspected,
        outOfService,
      },
      readyForGuest,
    };
  }

  async findOne(id: string): Promise<IRoom> {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        roomType: true,
      },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID '${id}' not found`);
    }

    return {
      ...room,
      roomType: room.roomType
        ? {
            ...room.roomType,
            basePrice: Number(room.roomType.basePrice),
          }
        : undefined,
    };
  }

  async create(data: ICreateRoomInput): Promise<IRoom> {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: data.roomTypeId },
    });

    if (!roomType) {
      throw new NotFoundException(`Room type with ID '${data.roomTypeId}' not found`);
    }

    const existingNumber = await this.prisma.room.findUnique({
      where: { number: data.number },
    });

    if (existingNumber) {
      throw new ConflictException(`Room number '${data.number}' already exists`);
    }

    const room = await this.prisma.room.create({
      data: {
        number: data.number,
        floor: data.floor ?? null,
        roomTypeId: data.roomTypeId,
        frontDeskStatus: data.frontDeskStatus ?? 'VACANT',
        housekeepingStatus: data.housekeepingStatus ?? 'CLEAN',
      },
      include: {
        roomType: true,
      },
    });

    return {
      ...room,
      roomType: room.roomType
        ? {
            ...room.roomType,
            basePrice: Number(room.roomType.basePrice),
          }
        : undefined,
    };
  }

  async bulkCreate(
    data: IBulkCreateRoomsInput,
  ): Promise<{ count: number; message: string }> {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: data.roomTypeId },
    });

    if (!roomType) {
      throw new NotFoundException(`Room type with ID '${data.roomTypeId}' not found`);
    }

    const prefix = data.prefix ?? '';
    const roomNumbers: string[] = [];

    for (let i = 0; i < data.count; i++) {
      roomNumbers.push(`${prefix}${data.startNumber + i}`);
    }

    const existingRooms = await this.prisma.room.findMany({
      where: { number: { in: roomNumbers } },
      select: { number: true },
    });

    if (existingRooms.length > 0) {
      const existingList = existingRooms.map((r: { number: string }) => r.number).join(', ');
      throw new ConflictException(
        `The following room numbers already exist: ${existingList}`,
      );
    }

    const roomsToInsert = roomNumbers.map((num) => ({
      number: num,
      floor: data.floor,
      roomTypeId: data.roomTypeId,
      frontDeskStatus: 'VACANT' as const,
      housekeepingStatus: 'CLEAN' as const,
    }));

    await this.prisma.room.createMany({
      data: roomsToInsert,
    });

    return {
      count: roomsToInsert.length,
      message: `Successfully created ${roomsToInsert.length} rooms on floor ${data.floor}`,
    };
  }

  async update(id: string, data: IUpdateRoomInput): Promise<IRoom> {
    await this.findOne(id);

    if (data.roomTypeId) {
      const roomType = await this.prisma.roomType.findUnique({
        where: { id: data.roomTypeId },
      });
      if (!roomType) {
        throw new NotFoundException(`Room type with ID '${data.roomTypeId}' not found`);
      }
    }

    if (data.number) {
      const duplicate = await this.prisma.room.findFirst({
        where: {
          number: data.number,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException(`Room number '${data.number}' is already taken`);
      }
    }

    const updated = await this.prisma.room.update({
      where: { id },
      data: {
        ...(data.number && { number: data.number }),
        ...(data.floor !== undefined && { floor: data.floor }),
        ...(data.roomTypeId && { roomTypeId: data.roomTypeId }),
        ...(data.frontDeskStatus && { frontDeskStatus: data.frontDeskStatus }),
        ...(data.housekeepingStatus && { housekeepingStatus: data.housekeepingStatus }),
      },
      include: {
        roomType: true,
      },
    });

    return {
      ...updated,
      roomType: updated.roomType
        ? {
            ...updated.roomType,
            basePrice: Number(updated.roomType.basePrice),
          }
        : undefined,
    };
  }

  async updateStatus(
    id: string,
    data: IUpdateRoomStatusInput,
  ): Promise<IRoom> {
    await this.findOne(id);

    const updated = await this.prisma.room.update({
      where: { id },
      data: {
        ...(data.frontDeskStatus && { frontDeskStatus: data.frontDeskStatus }),
        ...(data.housekeepingStatus && { housekeepingStatus: data.housekeepingStatus }),
      },
      include: {
        roomType: true,
      },
    });

    return {
      ...updated,
      roomType: updated.roomType
        ? {
            ...updated.roomType,
            basePrice: Number(updated.roomType.basePrice),
          }
        : undefined,
    };
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    await this.findOne(id);

    const activeStays = await this.prisma.reservationStay.count({
      where: {
        roomId: id,
        status: { in: ['SCHEDULED', 'CHECKED_IN'] },
      },
    });

    if (activeStays > 0) {
      throw new BadRequestException(
        `Cannot delete room because it has ${activeStays} active or scheduled stay(s)`,
      );
    }

    await this.prisma.room.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Room deleted successfully',
    };
  }
}
