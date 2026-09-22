import type { IRoomType } from './room-type.types.js';

export type FrontDeskStatus = 'VACANT' | 'OCCUPIED' | 'OUT_OF_ORDER';

export type HousekeepingStatus = 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'OUT_OF_SERVICE';

export interface IRoom {
  id: string;
  number: string;
  floor: number | null;
  frontDeskStatus: FrontDeskStatus;
  housekeepingStatus: HousekeepingStatus;
  roomTypeId: string;
  roomType?: IRoomType;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICreateRoomInput {
  number: string;
  floor?: number | null;
  roomTypeId: string;
  frontDeskStatus?: FrontDeskStatus;
  housekeepingStatus?: HousekeepingStatus;
}

export interface IUpdateRoomInput {
  number?: string;
  floor?: number | null;
  roomTypeId?: string;
  frontDeskStatus?: FrontDeskStatus;
  housekeepingStatus?: HousekeepingStatus;
}

export interface IUpdateRoomStatusInput {
  frontDeskStatus?: FrontDeskStatus;
  housekeepingStatus?: HousekeepingStatus;
}

export interface IBulkCreateRoomsInput {
  floor: number;
  roomTypeId: string;
  startNumber: number;
  count: number;
  prefix?: string;
}

export interface IRoomFilterQuery {
  floor?: number;
  roomTypeId?: string;
  frontDeskStatus?: FrontDeskStatus;
  housekeepingStatus?: HousekeepingStatus;
  search?: string;
}

export interface IRoomStats {
  total: number;
  frontDesk: {
    vacant: number;
    occupied: number;
    outOfOrder: number;
  };
  housekeeping: {
    clean: number;
    dirty: number;
    inspected: number;
    outOfService: number;
  };
  readyForGuest: number; // VACANT and (CLEAN or INSPECTED)
}
