import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  createRoomSchema,
  updateRoomSchema,
  updateRoomStatusSchema,
  bulkCreateRoomsSchema,
  roomFilterSchema,
} from 'shared-schemas';
import type {
  IRoom,
  ICreateRoomInput,
  IUpdateRoomInput,
  IUpdateRoomStatusInput,
  IBulkCreateRoomsInput,
  IRoomFilterQuery,
  IRoomStats,
} from 'shared-types';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(roomFilterSchema))
  async findAll(@Query() query: IRoomFilterQuery): Promise<IRoom[]> {
    return this.roomsService.findAll(query);
  }

  @Get('stats')
  async getStats(): Promise<IRoomStats> {
    return this.roomsService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<IRoom> {
    return this.roomsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @UsePipes(new ZodValidationPipe(createRoomSchema))
  async create(@Body() body: ICreateRoomInput): Promise<IRoom> {
    return this.roomsService.create(body);
  }

  @Post('bulk')
  @Roles('ADMIN', 'MANAGER')
  @UsePipes(new ZodValidationPipe(bulkCreateRoomsSchema))
  async bulkCreate(
    @Body() body: IBulkCreateRoomsInput,
  ): Promise<{ count: number; message: string }> {
    return this.roomsService.bulkCreate(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @UsePipes(new ZodValidationPipe(updateRoomSchema))
  async update(
    @Param('id') id: string,
    @Body() body: IUpdateRoomInput,
  ): Promise<IRoom> {
    return this.roomsService.update(id, body);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER')
  @UsePipes(new ZodValidationPipe(updateRoomStatusSchema))
  async updateStatus(
    @Param('id') id: string,
    @Body() body: IUpdateRoomStatusInput,
  ): Promise<IRoom> {
    return this.roomsService.updateStatus(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return this.roomsService.remove(id);
  }
}
