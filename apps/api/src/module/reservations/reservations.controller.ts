import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  createReservationSchema,
  availabilityQuerySchema,
  checkInSchema,
  checkOutSchema,
  assignRoomSchema,
  reservationFilterSchema,
} from 'shared-schemas';
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

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get('availability')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @UsePipes(new ZodValidationPipe(availabilityQuerySchema))
  async checkAvailability(
    @Query() query: IAvailabilityQuery,
  ): Promise<IAvailableRoomType[]> {
    return this.reservationsService.checkAvailability(query);
  }

  @Get('calendar')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER')
  async getCalendar(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<ICalendarStayItem[]> {
    return this.reservationsService.getCalendar(startDate, endDate);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT')
  @UsePipes(new ZodValidationPipe(reservationFilterSchema))
  async findAll(@Query() query: IReservationFilterQuery): Promise<{
    data: IReservation[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    return this.reservationsService.findAll(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT')
  async findOne(@Param('id') id: string): Promise<IReservation> {
    return this.reservationsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @UsePipes(new ZodValidationPipe(createReservationSchema))
  async create(
    @Body() body: ICreateReservationInput,
    @CurrentUser('id') userId?: string,
  ): Promise<IReservation> {
    return this.reservationsService.create(body, userId);
  }

  @Post('stays/:stayId/check-in')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @UsePipes(new ZodValidationPipe(checkInSchema))
  async checkIn(
    @Param('stayId') stayId: string,
    @Body() body: ICheckInInput,
    @CurrentUser('id') userId?: string,
  ): Promise<IReservationStay> {
    return this.reservationsService.checkIn(stayId, body, userId);
  }

  @Post('stays/:stayId/check-out')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @UsePipes(new ZodValidationPipe(checkOutSchema))
  async checkOut(
    @Param('stayId') stayId: string,
    @Body() body: ICheckOutInput,
    @CurrentUser('id') userId?: string,
  ): Promise<IReservationStay> {
    return this.reservationsService.checkOut(stayId, body, userId);
  }

  @Patch('stays/:stayId/assign-room')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @UsePipes(new ZodValidationPipe(assignRoomSchema))
  async assignRoom(
    @Param('stayId') stayId: string,
    @Body() body: IAssignRoomInput,
  ): Promise<IReservationStay> {
    return this.reservationsService.assignRoom(stayId, body);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  async cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.reservationsService.cancel(id, userId);
  }
}
