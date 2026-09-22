import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  IReservation,
  IReservationStay,
  ICreateReservationInput,
  IAvailabilityQuery,
  IAvailableRoomType,
  ICheckInInput,
  ICheckOutInput,
  IAssignRoomInput,
  IReservationFilterQuery,
  ICalendarStayItem,
} from 'shared-types';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  private generateCode(): string {
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `RES-${random}`;
  }

  async checkAvailability(query: IAvailabilityQuery): Promise<IAvailableRoomType[]> {
    const checkIn = new Date(query.checkInDate);
    const checkOut = new Date(query.checkOutDate);

    const roomTypeWhere: any = {};
    if (query.roomTypeId) {
      roomTypeWhere.id = query.roomTypeId;
    }
    if (query.guests) {
      roomTypeWhere.capacity = { gte: query.guests };
    }

    const roomTypes = await this.prisma.roomType.findMany({
      where: roomTypeWhere,
      include: {
        rooms: {
          where: {
            frontDeskStatus: { not: 'OUT_OF_ORDER' },
          },
          select: {
            id: true,
            number: true,
            floor: true,
            frontDeskStatus: true,
            housekeepingStatus: true,
          },
        },
      },
    });

    // Find all stays that conflict with requested dates and are active
    const conflictingStays = await this.prisma.reservationStay.findMany({
      where: {
        status: { in: ['SCHEDULED', 'CHECKED_IN'] },
        checkInDate: { lt: checkOut },
        checkOutDate: { gt: checkIn },
      },
      select: {
        roomId: true,
        roomTypeId: true,
      },
    });

    const bookedRoomIds = new Set(
      conflictingStays.map((s: { roomId: string | null }) => s.roomId).filter(Boolean),
    );

    return roomTypes.map((rt: any) => {
      const availableRooms = rt.rooms.filter(
        (room: { id: string }) => !bookedRoomIds.has(room.id),
      );

      return {
        roomType: {
          ...rt,
          basePrice: Number(rt.basePrice),
        },
        availableRoomsCount: availableRooms.length,
        availablePhysicalRooms: availableRooms.map(
          (r: { id: string; number: string; floor: number | null }) => ({
            id: r.id,
            number: r.number,
            floor: r.floor,
          }),
        ),
      };
    });
  }

  async create(
    data: ICreateReservationInput,
    userId?: string,
  ): Promise<IReservation> {
    const booker = await this.prisma.guest.findUnique({
      where: { id: data.bookerGuestId },
    });

    if (!booker) {
      throw new NotFoundException(`Booker guest with ID '${data.bookerGuestId}' not found`);
    }

    let code = this.generateCode();
    while (await this.prisma.reservation.findUnique({ where: { reservationCode: code } })) {
      code = this.generateCode();
    }

    // Validate each stay
    const preparedStays: any[] = [];
    for (const stayInput of data.stays) {
      const checkIn = new Date(stayInput.checkInDate);
      const checkOut = new Date(stayInput.checkOutDate);

      const roomType = await this.prisma.roomType.findUnique({
        where: { id: stayInput.roomTypeId },
      });

      if (!roomType) {
        throw new NotFoundException(`Room type '${stayInput.roomTypeId}' not found`);
      }

      if (stayInput.adults + (stayInput.children ?? 0) > roomType.capacity) {
        throw new BadRequestException(
          `Guest count exceeds capacity (${roomType.capacity}) for room type '${roomType.name}'`,
        );
      }

      let roomId: string | null = null;
      if (stayInput.roomId) {
        const room = await this.prisma.room.findUnique({
          where: { id: stayInput.roomId },
        });

        if (!room) {
          throw new NotFoundException(`Room with ID '${stayInput.roomId}' not found`);
        }

        if (room.roomTypeId !== stayInput.roomTypeId) {
          throw new BadRequestException(
            `Room ${room.number} does not match selected room type '${roomType.name}'`,
          );
        }

        // Check if room is available in that window
        const conflict = await this.prisma.reservationStay.findFirst({
          where: {
            roomId: room.id,
            status: { in: ['SCHEDULED', 'CHECKED_IN'] },
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
          },
        });

        if (conflict) {
          throw new ConflictException(
            `Room ${room.number} is already booked between ${stayInput.checkInDate} and ${stayInput.checkOutDate}`,
          );
        }

        roomId = room.id;
      }

      const ratePerNight = stayInput.ratePerNight ?? Number(roomType.basePrice);

      preparedStays.push({
        roomTypeId: stayInput.roomTypeId,
        roomId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: stayInput.adults,
        children: stayInput.children ?? 0,
        ratePerNight,
        status: 'SCHEDULED' as const,
        guests: stayInput.guestIds
          ? {
              create: stayInput.guestIds.map((gId: string, idx: number) => ({
                guestId: gId,
                isPrimary: idx === 0,
              })),
            }
          : undefined,
      });
    }

    const reservation = await this.prisma.reservation.create({
      data: {
        reservationCode: code,
        status: 'CONFIRMED',
        bookerGuestId: data.bookerGuestId,
        stays: {
          create: preparedStays,
        },
      },
      include: {
        booker: true,
        stays: {
          include: {
            roomType: true,
            room: true,
            guests: {
              include: { guest: true },
            },
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'RESERVATION_CREATED',
        entityType: 'Reservation',
        entityId: reservation.id,
        userId: userId ?? null,
        metadata: {
          code: reservation.reservationCode,
          stayCount: reservation.stays.length,
        },
      },
    });

    return {
      ...reservation,
      stays: reservation.stays.map((s: any) => ({
        ...s,
        ratePerNight: Number(s.ratePerNight),
        roomType: {
          ...s.roomType,
          basePrice: Number(s.roomType.basePrice),
        },
      })),
    };
  }

  async findAll(filter?: IReservationFilterQuery): Promise<{
    data: IReservation[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.bookerGuestId) {
      where.bookerGuestId = filter.bookerGuestId;
    }

    if (filter?.search) {
      const search = filter.search;
      where.OR = [
        { reservationCode: { contains: search, mode: 'insensitive' } },
        {
          booker: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    if (filter?.checkInAfter) {
      where.stays = {
        some: { checkInDate: { gte: new Date(filter.checkInAfter) } },
      };
    }

    if (filter?.checkOutBefore) {
      where.stays = {
        ...where.stays,
        some: {
          ...(where.stays?.some ?? {}),
          checkOutDate: { lte: new Date(filter.checkOutBefore) },
        },
      };
    }

    const [total, reservations] = await Promise.all([
      this.prisma.reservation.count({ where }),
      this.prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booker: true,
          stays: {
            include: {
              roomType: true,
              room: true,
              guests: {
                include: { guest: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: reservations.map((res: any) => ({
        ...res,
        stays: res.stays.map((s: any) => ({
          ...s,
          ratePerNight: Number(s.ratePerNight),
          roomType: {
            ...s.roomType,
            basePrice: Number(s.roomType.basePrice),
          },
        })),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCalendar(startDate: string, endDate: string): Promise<ICalendarStayItem[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const stays = await this.prisma.reservationStay.findMany({
      where: {
        status: { in: ['SCHEDULED', 'CHECKED_IN'] },
        checkInDate: { lte: end },
        checkOutDate: { gte: start },
      },
      include: {
        reservation: {
          include: {
            booker: true,
          },
        },
        room: true,
        roomType: true,
      },
    });

    return stays.map((s: any) => ({
      stayId: s.id,
      reservationId: s.reservation.id,
      reservationCode: s.reservation.reservationCode,
      guestName: `${s.reservation.booker.firstName} ${s.reservation.booker.lastName}`,
      roomId: s.roomId,
      roomNumber: s.room?.number ?? null,
      roomTypeName: s.roomType.name,
      checkInDate: s.checkInDate,
      checkOutDate: s.checkOutDate,
      status: s.status,
    }));
  }

  async findOne(id: string): Promise<IReservation> {
    const res = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        booker: true,
        stays: {
          include: {
            roomType: true,
            room: true,
            guests: {
              include: { guest: true },
            },
          },
        },
        invoices: true,
      },
    });

    if (!res) {
      throw new NotFoundException(`Reservation with ID '${id}' not found`);
    }

    return {
      ...res,
      stays: res.stays.map((s: any) => ({
        ...s,
        ratePerNight: Number(s.ratePerNight),
        roomType: {
          ...s.roomType,
          basePrice: Number(s.roomType.basePrice),
        },
      })),
    };
  }

  async checkIn(
    stayId: string,
    input?: ICheckInInput,
    userId?: string,
  ): Promise<IReservationStay> {
    const stay = await this.prisma.reservationStay.findUnique({
      where: { id: stayId },
      include: { room: true },
    });

    if (!stay) {
      throw new NotFoundException(`Reservation stay with ID '${stayId}' not found`);
    }

    if (stay.status !== 'SCHEDULED') {
      throw new BadRequestException(
        `Cannot check in stay with current status '${stay.status}'. Only SCHEDULED stays can be checked in.`,
      );
    }

    const targetRoomId = input?.roomId ?? stay.roomId;
    if (!targetRoomId) {
      throw new BadRequestException(
        'A physical room must be assigned to this stay before check-in',
      );
    }

    const room = await this.prisma.room.findUnique({
      where: { id: targetRoomId },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID '${targetRoomId}' not found`);
    }

    if (room.frontDeskStatus === 'OCCUPIED' && room.id !== stay.roomId) {
      throw new ConflictException(`Room ${room.number} is currently OCCUPIED`);
    }

    if (room.frontDeskStatus === 'OUT_OF_ORDER') {
      throw new BadRequestException(`Room ${room.number} is OUT_OF_ORDER`);
    }

    const [updatedStay] = await this.prisma.$transaction([
      this.prisma.reservationStay.update({
        where: { id: stayId },
        data: {
          roomId: targetRoomId,
          status: 'CHECKED_IN',
        },
        include: {
          room: true,
          roomType: true,
        },
      }),
      this.prisma.room.update({
        where: { id: targetRoomId },
        data: {
          frontDeskStatus: 'OCCUPIED',
        },
      }),
      this.prisma.reservation.update({
        where: { id: stay.reservationId },
        data: {
          status: 'CHECKED_IN',
        },
      }),
      this.prisma.auditLog.create({
        data: {
          action: 'STAY_CHECKIN',
          entityType: 'ReservationStay',
          entityId: stayId,
          userId: userId ?? null,
          metadata: {
            roomId: targetRoomId,
            roomNumber: room.number,
          },
        },
      }),
    ]);

    return {
      ...updatedStay,
      ratePerNight: Number(updatedStay.ratePerNight),
      roomType: {
        ...updatedStay.roomType,
        basePrice: Number(updatedStay.roomType.basePrice),
      },
    };
  }

  async checkOut(
    stayId: string,
    input?: ICheckOutInput,
    userId?: string,
  ): Promise<IReservationStay> {
    const stay = await this.prisma.reservationStay.findUnique({
      where: { id: stayId },
      include: { room: true },
    });

    if (!stay) {
      throw new NotFoundException(`Reservation stay with ID '${stayId}' not found`);
    }

    if (stay.status !== 'CHECKED_IN') {
      throw new BadRequestException(
        `Cannot check out stay with status '${stay.status}'. Only CHECKED_IN stays can be checked out.`,
      );
    }

    const transactionOps: any[] = [
      this.prisma.reservationStay.update({
        where: { id: stayId },
        data: { status: 'CHECKED_OUT' },
        include: {
          room: true,
          roomType: true,
        },
      }),
    ];

    if (stay.roomId) {
      transactionOps.push(
        this.prisma.room.update({
          where: { id: stay.roomId },
          data: {
            frontDeskStatus: 'VACANT',
            housekeepingStatus: 'DIRTY',
          },
        }),
      );

      // Auto-schedule housekeeping task for room turnover
      transactionOps.push(
        this.prisma.housekeepingTask.create({
          data: {
            roomId: stay.roomId,
            status: 'PENDING',
            notes: input?.housekeepingNotes ?? 'Room turnover after checkout',
          },
        }),
      );
    }

    transactionOps.push(
      this.prisma.auditLog.create({
        data: {
          action: 'STAY_CHECKOUT',
          entityType: 'ReservationStay',
          entityId: stayId,
          userId: userId ?? null,
        },
      }),
    );

    const results = await this.prisma.$transaction(transactionOps);
    const updatedStay = results[0];

    // Check if all stays in this reservation are now completed
    const remainingActiveStays = await this.prisma.reservationStay.count({
      where: {
        reservationId: stay.reservationId,
        status: { in: ['SCHEDULED', 'CHECKED_IN'] },
      },
    });

    if (remainingActiveStays === 0) {
      await this.prisma.reservation.update({
        where: { id: stay.reservationId },
        data: { status: 'CHECKED_OUT' },
      });
    }

    return {
      ...updatedStay,
      ratePerNight: Number(updatedStay.ratePerNight),
      roomType: {
        ...updatedStay.roomType,
        basePrice: Number(updatedStay.roomType.basePrice),
      },
    };
  }

  async assignRoom(stayId: string, input: IAssignRoomInput): Promise<IReservationStay> {
    const stay = await this.prisma.reservationStay.findUnique({
      where: { id: stayId },
    });

    if (!stay) {
      throw new NotFoundException(`Reservation stay with ID '${stayId}' not found`);
    }

    const room = await this.prisma.room.findUnique({
      where: { id: input.roomId },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID '${input.roomId}' not found`);
    }

    if (room.roomTypeId !== stay.roomTypeId) {
      throw new BadRequestException('Room type does not match stay requirement');
    }

    const conflict = await this.prisma.reservationStay.findFirst({
      where: {
        id: { not: stayId },
        roomId: room.id,
        status: { in: ['SCHEDULED', 'CHECKED_IN'] },
        checkInDate: { lt: stay.checkOutDate },
        checkOutDate: { gt: stay.checkInDate },
      },
    });

    if (conflict) {
      throw new ConflictException(`Room ${room.number} is already occupied/booked for this duration`);
    }

    const updatedStay = await this.prisma.reservationStay.update({
      where: { id: stayId },
      data: { roomId: input.roomId },
      include: {
        room: true,
        roomType: true,
      },
    });

    return {
      ...updatedStay,
      ratePerNight: Number(updatedStay.ratePerNight),
      roomType: {
        ...updatedStay.roomType,
        basePrice: Number(updatedStay.roomType.basePrice),
      },
    };
  }

  async cancel(id: string, userId?: string): Promise<{ success: boolean; message: string }> {
    const res = await this.prisma.reservation.findUnique({
      where: { id },
      include: { stays: true },
    });

    if (!res) {
      throw new NotFoundException(`Reservation with ID '${id}' not found`);
    }

    if (res.status === 'CHECKED_IN') {
      throw new BadRequestException('Cannot cancel reservation with active checked-in stays');
    }

    await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.reservationStay.updateMany({
        where: { reservationId: id, status: 'SCHEDULED' },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.auditLog.create({
        data: {
          action: 'RESERVATION_CANCELLED',
          entityType: 'Reservation',
          entityId: id,
          userId: userId ?? null,
        },
      }),
    ]);

    return {
      success: true,
      message: 'Reservation cancelled successfully',
    };
  }
}
