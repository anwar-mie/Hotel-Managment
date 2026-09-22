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
import { OperationsService } from './operations.service.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  createHousekeepingTaskSchema,
  updateHousekeepingTaskSchema,
  completeHousekeepingTaskSchema,
  createMaintenanceRequestSchema,
  updateMaintenanceRequestSchema,
  resolveMaintenanceRequestSchema,
} from 'shared-schemas';
import type {
  IHousekeepingTask,
  ICreateHousekeepingTaskInput,
  IUpdateHousekeepingTaskInput,
  ICompleteHousekeepingTaskInput,
  IMaintenanceRequest,
  ICreateMaintenanceRequestInput,
  IUpdateMaintenanceRequestInput,
  IResolveMaintenanceRequestInput,
  IHousekeepingDashboard,
  IMaintenanceDashboard,
  HousekeepingTaskStatus,
  MaintenanceStatus,
} from 'shared-types';

@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  // ============================================================================
  // HOUSEKEEPING
  // ============================================================================

  @Get('housekeeping/dashboard')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER')
  async getHousekeepingDashboard(): Promise<IHousekeepingDashboard> {
    return this.operationsService.getHousekeepingDashboard();
  }

  @Get('housekeeping/tasks')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER')
  async findAllHousekeepingTasks(
    @Query('status') status?: HousekeepingTaskStatus,
    @Query('assignedToId') assignedToId?: string,
  ): Promise<IHousekeepingTask[]> {
    return this.operationsService.findAllHousekeepingTasks(status, assignedToId);
  }

  @Post('housekeeping/tasks')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER')
  @UsePipes(new ZodValidationPipe(createHousekeepingTaskSchema))
  async createHousekeepingTask(
    @Body() body: ICreateHousekeepingTaskInput,
  ): Promise<IHousekeepingTask> {
    return this.operationsService.createHousekeepingTask(body);
  }

  @Patch('housekeeping/tasks/:id/assign')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER')
  @UsePipes(new ZodValidationPipe(updateHousekeepingTaskSchema))
  async assignHousekeepingTask(
    @Param('id') id: string,
    @Body('assignedToId') assignedToId: string,
  ): Promise<IHousekeepingTask> {
    const task = await this.operationsService.findAllHousekeepingTasks();
    const target = task.find((t) => t.id === id);
    if (!target) throw new Error('Task not found');
    return this.operationsService.createHousekeepingTask({
      roomId: target.roomId,
      assignedToId,
      notes: target.notes,
    });
  }

  @Post('housekeeping/tasks/:id/start')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'MANAGER', 'HOUSEKEEPER')
  async startHousekeepingTask(
    @Param('id') id: string,
  ): Promise<IHousekeepingTask> {
    return this.operationsService.startHousekeepingTask(id);
  }

  @Post('housekeeping/tasks/:id/complete')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'MANAGER', 'HOUSEKEEPER')
  @UsePipes(new ZodValidationPipe(completeHousekeepingTaskSchema))
  async completeHousekeepingTask(
    @Param('id') id: string,
    @Body() body: ICompleteHousekeepingTaskInput,
    @CurrentUser('id') userId?: string,
  ): Promise<IHousekeepingTask> {
    return this.operationsService.completeHousekeepingTask(id, body, userId);
  }

  @Post('housekeeping/tasks/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'MANAGER')
  async cancelHousekeepingTask(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.operationsService.cancelHousekeepingTask(id);
  }

  // ============================================================================
  // MAINTENANCE
  // ============================================================================

  @Get('maintenance/dashboard')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER')
  async getMaintenanceDashboard(): Promise<IMaintenanceDashboard> {
    return this.operationsService.getMaintenanceDashboard();
  }

  @Get('maintenance/requests')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER')
  async findAllMaintenanceRequests(
    @Query('status') status?: MaintenanceStatus,
  ): Promise<IMaintenanceRequest[]> {
    return this.operationsService.findAllMaintenanceRequests(status);
  }

  @Post('maintenance/requests')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER')
  @UsePipes(new ZodValidationPipe(createMaintenanceRequestSchema))
  async createMaintenanceRequest(
    @Body() body: ICreateMaintenanceRequestInput,
    @CurrentUser('id') userId: string,
  ): Promise<IMaintenanceRequest> {
    return this.operationsService.createMaintenanceRequest(body, userId);
  }

  @Post('maintenance/requests/:id/start')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'MANAGER')
  async startMaintenanceRequest(
    @Param('id') id: string,
  ): Promise<IMaintenanceRequest> {
    return this.operationsService.startMaintenanceRequest(id);
  }

  @Post('maintenance/requests/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'MANAGER')
  @UsePipes(new ZodValidationPipe(resolveMaintenanceRequestSchema))
  async resolveMaintenanceRequest(
    @Param('id') id: string,
    @Body() body: IResolveMaintenanceRequestInput,
    @CurrentUser('id') userId?: string,
  ): Promise<IMaintenanceRequest> {
    return this.operationsService.resolveMaintenanceRequest(id, body, userId);
  }

  @Post('maintenance/requests/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'MANAGER')
  async cancelMaintenanceRequest(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.operationsService.cancelMaintenanceRequest(id);
  }
}
