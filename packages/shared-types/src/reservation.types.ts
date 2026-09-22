import type { IGuest } from './guest.types.js';
import type { IRoomType } from './room-type.types.js';
import type { IRoom } from './room.types.js';

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW';

export type StayStatus =
  | 'SCHEDULED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED';

export interface IStayGuest {
  id: string;
  stayId: string;
  guestId: string;
  isPrimary: boolean;
  guest?: IGuest;
}

export interface IReservationStay {
  id: string;
  reservationId: string;
  roomId: string | null;
  room?: IRoom | null;
  roomTypeId: string;
  roomType?: IRoomType;
  checkInDate: Date | string;
  checkOutDate: Date | string;
  adults: number;
  children: number;
  ratePerNight: number;
  status: StayStatus;
  guests?: IStayGuest[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IReservation {
  id: string;
  reservationCode: string;
  status: ReservationStatus;
  bookerGuestId: string;
  booker?: IGuest;
  stays: IReservationStay[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICreateStayInput {
  roomTypeId: string;
  roomId?: string | null;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children?: number;
  ratePerNight?: number;
  guestIds?: string[];
}

export interface ICreateReservationInput {
  bookerGuestId: string;
  stays: ICreateStayInput[];
}

export interface IAvailabilityQuery {
  checkInDate: string;
  checkOutDate: string;
  roomTypeId?: string;
  guests?: number;
}

export interface IAvailableRoomType {
  roomType: IRoomType;
  availableRoomsCount: number;
  availablePhysicalRooms: {
    id: string;
    number: string;
    floor: number | null;
  }[];
}

export interface ICheckInInput {
  roomId?: string;
}

export interface ICheckOutInput {
  housekeepingNotes?: string;
}

export interface IAssignRoomInput {
  roomId: string;
}

export interface IReservationFilterQuery {
  status?: ReservationStatus;
  search?: string;
  bookerGuestId?: string;
  checkInAfter?: string;
  checkOutBefore?: string;
  page?: number;
  limit?: number;
}

export interface ICalendarStayItem {
  stayId: string;
  reservationId: string;
  reservationCode: string;
  guestName: string;
  roomId: string | null;
  roomNumber: string | null;
  roomTypeName: string;
  checkInDate: Date | string;
  checkOutDate: Date | string;
  status: StayStatus;
}
