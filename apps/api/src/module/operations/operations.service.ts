import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
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

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // HOUSEKEEPING
  // ============================================================================

  async getHousekeepingDashboard(): Promise<IHousekeepingDashboard> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      dirtyRoomsCount,
      cleanRoomsCount,
      inspectedRoomsCount,
      outOfServiceRoomsCount,
      pendingTasksCount,
      inProgressTasksCount,
      completedTodayCount,
      tasks,
    ] = await Promise.all([
      this.prisma.room.count({ where: { housekeepingStatus: 'DIRTY' } }),
      this.prisma.room.count({ where: { housekeepingStatus: 'CLEAN' } }),
      this.prisma.room.count({ where: { housekeepingStatus: 'INSPECTED' } }),
      this.prisma.room.count({ where: { housekeepingStatus: 'OUT_OF_SERVICE' } }),
      this.prisma.housekeepingTask.count({ where: { status: 'PENDING' } }),
      this.prisma.housekeepingTask.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.housekeepingTask.count({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: todayStart },
        },
      }),
      this.prisma.housekeepingTask.findMany({
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
        orderBy: { createdAt: 'desc' },
        include: {
          room: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
    ]);

    return {
      dirtyRoomsCount,
      cleanRoomsCount,
      inspectedRoomsCount,
      outOfServiceRoomsCount,
      pendingTasksCount,
      inProgressTasksCount,
      completedTodayCount,
      tasks: tasks.map((t: any) => ({
        ...t,
        room: t.room ? { ...t.room, basePrice: undefined } : undefined,
      })),
    };
  }

  async findAllHousekeepingTasks(
    status?: HousekeepingTaskStatus,
    assignedToId?: string,
  ): Promise<IHousekeepingTask[]> {
    const where: any = {};
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;

    const tasks = await this.prisma.housekeepingTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        room: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return tasks.map((t: any) => ({
      ...t,
      room: t.room ? { ...t.room, basePrice: undefined } : undefined,
    }));
  }

  async createHousekeepingTask(
    input: ICreateHousekeepingTaskInput,
  ): Promise<IHousekeepingTask> {
    const room = await this.prisma.room.findUnique({
      where: { id: input.roomId },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID '${input.roomId}' not found`);
    }

    if (input.assignedToId) {
      const user = await this.prisma.user.findUnique({
        where: { id: input.assignedToId },
      });
      if (!user) {
        throw new NotFoundException(`Staff user with ID '${input.assignedToId}' not found`);
      }
    }

    const task = await this.prisma.housekeepingTask.create({
      data: {
        roomId: input.roomId,
        assignedToId: input.assignedToId ?? null,
        notes: input.notes ?? null,
        status: 'PENDING',
      },
      include: {
        room: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return task;
  }

  async startHousekeepingTask(taskId: string): Promise<IHousekeepingTask> {
    const task = await this.prisma.housekeepingTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Housekeeping task with ID '${taskId}' not found`);
    }

    if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot start task in status '${task.status}'`);
    }

    const updated = await this.prisma.housekeepingTask.update({
      where: { id: taskId },
      data: { status: 'IN_PROGRESS' },
      include: {
        room: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return updated;
  }

  async completeHousekeepingTask(
    taskId: string,
    input: ICompleteHousekeepingTaskInput,
    userId?: string,
  ): Promise<IHousekeepingTask> {
    const task = await this.prisma.housekeepingTask.findUnique({
      where: { id: taskId },
      include: { room: true },
    });

    if (!task) {
      throw new NotFoundException(`Housekeeping task with ID '${taskId}' not found`);
    }

    if (task.status === 'COMPLETED') {
      throw new BadRequestException('Task is already completed');
    }

    const nextRoomStatus = input.markInspected ? 'INSPECTED' : 'CLEAN';

    const [updatedTask] = await this.prisma.$transaction([
      this.prisma.housekeepingTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          notes: input.notes ?? task.notes,
        },
        include: {
          room: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
      this.prisma.room.update({
        where: { id: task.roomId },
        data: {
          housekeepingStatus: nextRoomStatus,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          action: 'HOUSEKEEPING_TASK_COMPLETED',
          entityType: 'HousekeepingTask',
          entityId: taskId,
          userId: userId ?? null,
          metadata: {
            roomId: task.roomId,
            roomNumber: task.room.number,
            newHousekeepingStatus: nextRoomStatus,
          },
        },
      }),
    ]);

    return updatedTask;
  }

  async cancelHousekeepingTask(taskId: string): Promise<{ success: boolean; message: string }> {
    const task = await this.prisma.housekeepingTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Housekeeping task with ID '${taskId}' not found`);
    }

    await this.prisma.housekeepingTask.update({
      where: { id: taskId },
      data: { status: 'CANCELLED' },
    });

    return {
      success: true,
      message: 'Housekeeping task cancelled',
    };
  }

  // ============================================================================
  // MAINTENANCE
  // ============================================================================

  async getMaintenanceDashboard(): Promise<IMaintenanceDashboard> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      reportedCount,
      inProgressCount,
      resolvedTodayCount,
      outOfOrderRoomsCount,
      openRequests,
    ] = await Promise.all([
      this.prisma.maintenanceRequest.count({ where: { status: 'REPORTED' } }),
      this.prisma.maintenanceRequest.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.maintenanceRequest.count({
        where: {
          status: 'RESOLVED',
          resolvedAt: { gte: todayStart },
        },
      }),
      this.prisma.room.count({ where: { frontDeskStatus: 'OUT_OF_ORDER' } }),
      this.prisma.maintenanceRequest.findMany({
        where: { status: { in: ['REPORTED', 'IN_PROGRESS'] } },
        orderBy: { createdAt: 'desc' },
        include: {
          room: true,
          reportedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
    ]);

    return {
      reportedCount,
      inProgressCount,
      resolvedTodayCount,
      outOfOrderRoomsCount,
      openRequests,
    };
  }

  async findAllMaintenanceRequests(status?: MaintenanceStatus): Promise<IMaintenanceRequest[]> {
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.maintenanceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        room: true,
        reportedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async createMaintenanceRequest(
    input: ICreateMaintenanceRequestInput,
    userId: string,
  ): Promise<IMaintenanceRequest> {
    const room = await this.prisma.room.findUnique({
      where: { id: input.roomId },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID '${input.roomId}' not found`);
    }

    const transactionOps: any[] = [
      this.prisma.maintenanceRequest.create({
        data: {
          roomId: input.roomId,
          reportedById: userId,
          title: input.title,
          description: input.description ?? null,
          status: 'REPORTED',
        },
        include: {
          room: true,
          reportedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
    ];

    if (input.setRoomOutOfOrder !== false) {
      transactionOps.push(
        this.prisma.room.update({
          where: { id: input.roomId },
          data: {
            frontDeskStatus: 'OUT_OF_ORDER',
            housekeepingStatus: 'OUT_OF_SERVICE',
          },
        }),
      );
    }

    transactionOps.push(
      this.prisma.auditLog.create({
        data: {
          action: 'MAINTENANCE_REPORTED',
          entityType: 'MaintenanceRequest',
          entityId: input.roomId,
          userId,
          metadata: {
            title: input.title,
            roomNumber: room.number,
            roomBlocked: input.setRoomOutOfOrder !== false,
          },
        },
      }),
    );

    const results = await this.prisma.$transaction(transactionOps);
    return results[0];
  }

  async startMaintenanceRequest(id: string): Promise<IMaintenanceRequest> {
    const req = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
    });

    if (!req) {
      throw new NotFoundException(`Maintenance request with ID '${id}' not found`);
    }

    return this.prisma.maintenanceRequest.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
      include: {
        room: true,
        reportedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async resolveMaintenanceRequest(
    id: string,
    input: IResolveMaintenanceRequestInput,
    userId?: string,
  ): Promise<IMaintenanceRequest> {
    const req = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!req) {
      throw new NotFoundException(`Maintenance request with ID '${id}' not found`);
    }

    if (req.status === 'RESOLVED') {
      throw new BadRequestException('Maintenance request is already resolved');
    }

    const transactionOps: any[] = [
      this.prisma.maintenanceRequest.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          description: input.resolutionNotes
            ? `${req.description ?? ''}\n[Resolution]: ${input.resolutionNotes}`.trim()
            : req.description,
        },
        include: {
          room: true,
          reportedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
    ];

    if (input.restoreRoomStatus !== false) {
      // Unblock room, set to VACANT and DIRTY so housekeeping turns it over
      transactionOps.push(
        this.prisma.room.update({
          where: { id: req.roomId },
          data: {
            frontDeskStatus: 'VACANT',
            housekeepingStatus: 'DIRTY',
          },
        }),
      );

      // Auto-schedule turnover task
      transactionOps.push(
        this.prisma.housekeepingTask.create({
          data: {
            roomId: req.roomId,
            status: 'PENDING',
            notes: 'Turnover cleaning following maintenance resolution',
          },
        }),
      );
    }

    transactionOps.push(
      this.prisma.auditLog.create({
        data: {
          action: 'MAINTENANCE_RESOLVED',
          entityType: 'MaintenanceRequest',
          entityId: id,
          userId: userId ?? null,
          metadata: {
            roomId: req.roomId,
            roomNumber: req.room.number,
          },
        },
      }),
    );

    const results = await this.prisma.$transaction(transactionOps);
    return results[0];
  }

  async cancelMaintenanceRequest(id: string): Promise<{ success: boolean; message: string }> {
    const req = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
    });

    if (!req) {
      throw new NotFoundException(`Maintenance request with ID '${id}' not found`);
    }

    await this.prisma.maintenanceRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return {
      success: true,
      message: 'Maintenance request cancelled',
    };
  }
}
