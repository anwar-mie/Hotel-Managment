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
import { GuestsService } from './guests.service.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  createGuestSchema,
  updateGuestSchema,
  guestFilterSchema,
  guestLookupSchema,
} from 'shared-schemas';
import type {
  IGuest,
  ICreateGuestInput,
  IUpdateGuestInput,
  IGuestFilterQuery,
  IGuestLookupResult,
} from 'shared-types';

@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @UsePipes(new ZodValidationPipe(guestFilterSchema))
  async findAll(@Query() query: IGuestFilterQuery): Promise<{
    data: IGuest[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    return this.guestsService.findAll(query);
  }

  @Get('lookup')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @UsePipes(new ZodValidationPipe(guestLookupSchema))
  async lookup(@Query('query') query: string): Promise<IGuestLookupResult[]> {
    return this.guestsService.lookup(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  async findOne(@Param('id') id: string): Promise<IGuest> {
    return this.guestsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @UsePipes(new ZodValidationPipe(createGuestSchema))
  async create(@Body() body: ICreateGuestInput): Promise<IGuest> {
    return this.guestsService.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @UsePipes(new ZodValidationPipe(updateGuestSchema))
  async update(
    @Param('id') id: string,
    @Body() body: IUpdateGuestInput,
  ): Promise<IGuest> {
    return this.guestsService.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return this.guestsService.remove(id);
  }
}
