import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  IGuest,
  ICreateGuestInput,
  IUpdateGuestInput,
  IGuestFilterQuery,
  IGuestLookupResult,
} from 'shared-types';

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter?: IGuestFilterQuery): Promise<{
    data: IGuest[];
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

    if (filter?.search) {
      const search = filter.search;
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { identificationNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filter?.email) {
      where.email = { contains: filter.email, mode: 'insensitive' };
    }

    if (filter?.phone) {
      where.phone = { contains: filter.phone, mode: 'insensitive' };
    }

    if (filter?.nationality) {
      where.nationality = { contains: filter.nationality, mode: 'insensitive' };
    }

    if (filter?.identificationNumber) {
      where.identificationNumber = {
        contains: filter.identificationNumber,
        mode: 'insensitive',
      };
    }

    const [total, guests] = await Promise.all([
      this.prisma.guest.count({ where }),
      this.prisma.guest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          _count: {
            select: {
              bookedReservations: true,
              stays: true,
            },
          },
        },
      }),
    ]);

    return {
      data: guests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async lookup(query: string): Promise<IGuestLookupResult[]> {
    const cleanQuery = query.trim();

    const guests = await this.prisma.guest.findMany({
      where: {
        OR: [
          { firstName: { contains: cleanQuery, mode: 'insensitive' } },
          { lastName: { contains: cleanQuery, mode: 'insensitive' } },
          { phone: { contains: cleanQuery, mode: 'insensitive' } },
          { email: { contains: cleanQuery, mode: 'insensitive' } },
          { identificationNumber: { contains: cleanQuery, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return guests.map((g: any) => ({
      id: g.id,
      firstName: g.firstName,
      lastName: g.lastName,
      fullName: `${g.firstName} ${g.lastName}`,
      email: g.email,
      phone: g.phone,
      identificationType: g.identificationType,
      identificationNumber: g.identificationNumber,
    }));
  }

  async findOne(id: string): Promise<IGuest> {
    const guest = await this.prisma.guest.findUnique({
      where: { id },
      include: {
        bookedReservations: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
        stays: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            stay: {
              select: {
                id: true,
                checkInDate: true,
                checkOutDate: true,
                status: true,
                room: {
                  select: {
                    number: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            bookedReservations: true,
            stays: true,
          },
        },
      },
    });

    if (!guest) {
      throw new NotFoundException(`Guest with ID '${id}' not found`);
    }

    return guest;
  }

  async create(data: ICreateGuestInput): Promise<IGuest> {
    if (data.identificationNumber) {
      const existingId = await this.prisma.guest.findFirst({
        where: { identificationNumber: data.identificationNumber },
      });

      if (existingId) {
        throw new ConflictException(
          `Guest with identification number '${data.identificationNumber}' already exists (${existingId.firstName} ${existingId.lastName})`,
        );
      }
    }

    if (data.email) {
      const existingEmail = await this.prisma.guest.findFirst({
        where: { email: data.email },
      });

      if (existingEmail) {
        throw new ConflictException(
          `Guest with email '${data.email}' already exists (${existingEmail.firstName} ${existingEmail.lastName})`,
        );
      }
    }

    return this.prisma.guest.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        nationality: data.nationality ?? null,
        identificationType: data.identificationType ?? null,
        identificationNumber: data.identificationNumber ?? null,
      },
    });
  }

  async update(id: string, data: IUpdateGuestInput): Promise<IGuest> {
    await this.findOne(id);

    if (data.identificationNumber) {
      const duplicateId = await this.prisma.guest.findFirst({
        where: {
          identificationNumber: data.identificationNumber,
          NOT: { id },
        },
      });

      if (duplicateId) {
        throw new ConflictException(
          `Another guest already has identification number '${data.identificationNumber}'`,
        );
      }
    }

    if (data.email) {
      const duplicateEmail = await this.prisma.guest.findFirst({
        where: {
          email: data.email,
          NOT: { id },
        },
      });

      if (duplicateEmail) {
        throw new ConflictException(
          `Another guest already has email '${data.email}'`,
        );
      }
    }

    return this.prisma.guest.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.nationality !== undefined && { nationality: data.nationality }),
        ...(data.identificationType !== undefined && {
          identificationType: data.identificationType,
        }),
        ...(data.identificationNumber !== undefined && {
          identificationNumber: data.identificationNumber,
        }),
      },
    });
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    await this.findOne(id);

    const [bookedCount, stayCount] = await Promise.all([
      this.prisma.reservation.count({
        where: { bookerGuestId: id },
      }),
      this.prisma.stayGuest.count({
        where: { guestId: id },
      }),
    ]);

    if (bookedCount > 0 || stayCount > 0) {
      throw new BadRequestException(
        `Cannot delete guest with active or past history (${bookedCount} booking(s), ${stayCount} stay(s))`,
      );
    }

    await this.prisma.guest.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Guest profile deleted successfully',
    };
  }
}
