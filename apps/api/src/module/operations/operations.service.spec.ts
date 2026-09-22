import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OperationsService } from './operations.service.js';

describe('OperationsService', () => {
  let service: OperationsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      room: {
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      housekeepingTask: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      maintenanceRequest: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((promises) => Promise.all(promises)),
    };

    service = new OperationsService(prismaMock);
  });

  describe('getHousekeepingDashboard', () => {
    it('should aggregate room statuses and active tasks', async () => {
      prismaMock.room.count
        .mockResolvedValueOnce(5)  // dirty
        .mockResolvedValueOnce(20) // clean
        .mockResolvedValueOnce(4)  // inspected
        .mockResolvedValueOnce(1); // out of service

      prismaMock.housekeepingTask.count
        .mockResolvedValueOnce(3)  // pending
        .mockResolvedValueOnce(2)  // in-progress
        .mockResolvedValueOnce(6); // completed today

      prismaMock.housekeepingTask.findMany.mockResolvedValue([
        {
          id: 'task-1',
          roomId: 'room-1',
          status: 'PENDING',
          room: { id: 'room-1', number: '101' },
          assignedTo: null,
        },
      ]);

      const dashboard = await service.getHousekeepingDashboard();

      expect(dashboard.dirtyRoomsCount).toBe(5);
      expect(dashboard.cleanRoomsCount).toBe(20);
      expect(dashboard.pendingTasksCount).toBe(3);
      expect(dashboard.tasks).toHaveLength(1);
    });
  });

  describe('completeHousekeepingTask', () => {
    it('should mark task COMPLETED and update room to CLEAN by default', async () => {
      prismaMock.housekeepingTask.findUnique.mockResolvedValue({
        id: 'task-1',
        roomId: 'room-1',
        status: 'IN_PROGRESS',
        notes: null,
        room: { id: 'room-1', number: '101' },
      });

      const updatedTaskMock = {
        id: 'task-1',
        status: 'COMPLETED',
        roomId: 'room-1',
      };

      prismaMock.$transaction.mockResolvedValue([
        updatedTaskMock,
        {},
        {},
      ]);

      const result = await service.completeHousekeepingTask('task-1', {
        markInspected: false,
      });

      expect(result.status).toBe('COMPLETED');
      expect(prismaMock.room.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'room-1' },
          data: { housekeepingStatus: 'CLEAN' },
        }),
      );
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should update room to INSPECTED if markInspected is true', async () => {
      prismaMock.housekeepingTask.findUnique.mockResolvedValue({
        id: 'task-1',
        roomId: 'room-1',
        status: 'IN_PROGRESS',
        room: { id: 'room-1', number: '101' },
      });

      prismaMock.$transaction.mockResolvedValue([
        { id: 'task-1', status: 'COMPLETED' },
        {},
        {},
      ]);

      await service.completeHousekeepingTask('task-1', {
        markInspected: true,
      });

      expect(prismaMock.room.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'room-1' },
          data: { housekeepingStatus: 'INSPECTED' },
        }),
      );
    });
  });

  describe('createMaintenanceRequest', () => {
    it('should report defect and block room by setting OUT_OF_ORDER', async () => {
      prismaMock.room.findUnique.mockResolvedValue({
        id: 'room-1',
        number: '102',
      });

      const createdTicket = {
        id: 'maint-1',
        roomId: 'room-1',
        title: 'AC leaking water',
        status: 'REPORTED',
      };

      prismaMock.$transaction.mockResolvedValue([
        createdTicket,
        {},
        {},
      ]);

      const result = await service.createMaintenanceRequest(
        {
          roomId: 'room-1',
          title: 'AC leaking water',
          setRoomOutOfOrder: true,
        },
        'user-admin',
      );

      expect(result.id).toBe('maint-1');
      expect(prismaMock.room.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'room-1' },
          data: {
            frontDeskStatus: 'OUT_OF_ORDER',
            housekeepingStatus: 'OUT_OF_SERVICE',
          },
        }),
      );
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('resolveMaintenanceRequest', () => {
    it('should resolve ticket, unblock room to VACANT & DIRTY, and schedule turnover task', async () => {
      prismaMock.maintenanceRequest.findUnique.mockResolvedValue({
        id: 'maint-1',
        roomId: 'room-1',
        status: 'IN_PROGRESS',
        room: { id: 'room-1', number: '102' },
      });

      prismaMock.$transaction.mockResolvedValue([
        { id: 'maint-1', status: 'RESOLVED' },
        {},
        {},
        {},
      ]);

      const result = await service.resolveMaintenanceRequest('maint-1', {
        resolutionNotes: 'AC compressor filter replaced and tested',
        restoreRoomStatus: true,
      });

      expect(result.status).toBe('RESOLVED');
      expect(prismaMock.room.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'room-1' },
          data: {
            frontDeskStatus: 'VACANT',
            housekeepingStatus: 'DIRTY',
          },
        }),
      );
      expect(prismaMock.housekeepingTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            roomId: 'room-1',
            status: 'PENDING',
          }),
        }),
      );
    });
  });
});
