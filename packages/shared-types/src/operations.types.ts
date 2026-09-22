import type { IRoom } from './room.types.js';
import type { IAuthUser } from './auth.types.js';

export type HousekeepingTaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type MaintenanceStatus =
  | 'REPORTED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CANCELLED';

export interface IHousekeepingTask {
  id: string;
  roomId: string;
  room?: IRoom;
  assignedToId: string | null;
  assignedTo?: IAuthUser | null;
  status: HousekeepingTaskStatus;
  notes: string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICreateHousekeepingTaskInput {
  roomId: string;
  assignedToId?: string | null;
  notes?: string | null;
}

export interface IUpdateHousekeepingTaskInput {
  assignedToId?: string | null;
  notes?: string | null;
  status?: HousekeepingTaskStatus;
}

export interface ICompleteHousekeepingTaskInput {
  notes?: string | null;
  markInspected?: boolean; // if true, sets room housekeeping status to INSPECTED, otherwise CLEAN
}

export interface IMaintenanceRequest {
  id: string;
  roomId: string;
  room?: IRoom;
  reportedById: string;
  reportedBy?: IAuthUser;
  title: string;
  description: string | null;
  status: MaintenanceStatus;
  resolvedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICreateMaintenanceRequestInput {
  roomId: string;
  title: string;
  description?: string | null;
  setRoomOutOfOrder?: boolean; // if true, automatically blocks room
}

export interface IUpdateMaintenanceRequestInput {
  title?: string;
  description?: string | null;
  status?: MaintenanceStatus;
}

export interface IResolveMaintenanceRequestInput {
  resolutionNotes?: string;
  restoreRoomStatus?: boolean; // if true, sets room to VACANT and DIRTY
}

export interface IHousekeepingDashboard {
  dirtyRoomsCount: number;
  cleanRoomsCount: number;
  inspectedRoomsCount: number;
  outOfServiceRoomsCount: number;
  pendingTasksCount: number;
  inProgressTasksCount: number;
  completedTodayCount: number;
  tasks: IHousekeepingTask[];
}

export interface IMaintenanceDashboard {
  reportedCount: number;
  inProgressCount: number;
  resolvedTodayCount: number;
  outOfOrderRoomsCount: number;
  openRequests: IMaintenanceRequest[];
}
