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
import { RoomTypesService } from './room-types.service.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  createRoomTypeSchema,
  updateRoomTypeSchema,
  roomTypeFilterSchema,
} from 'shared-schemas';
import type {
  IRoomType,
  ICreateRoomTypeInput,
  IUpdateRoomTypeInput,
  IRoomTypeFilterQuery,
} from 'shared-types';

@Controller('room-types')
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(roomTypeFilterSchema))
  async findAll(@Query() query: IRoomTypeFilterQuery): Promise<IRoomType[]> {
    return this.roomTypesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<IRoomType> {
    return this.roomTypesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @UsePipes(new ZodValidationPipe(createRoomTypeSchema))
  async create(@Body() body: ICreateRoomTypeInput): Promise<IRoomType> {
    return this.roomTypesService.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @UsePipes(new ZodValidationPipe(updateRoomTypeSchema))
  async update(
    @Param('id') id: string,
    @Body() body: IUpdateRoomTypeInput,
  ): Promise<IRoomType> {
    return this.roomTypesService.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return this.roomTypesService.remove(id);
  }
}
