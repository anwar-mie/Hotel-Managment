export interface IRoomType {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: number | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    rooms?: number;
    stays?: number;
  };
}

export interface ICreateRoomTypeInput {
  name: string;
  description?: string | null;
  capacity: number;
  basePrice: number;
}

export interface IUpdateRoomTypeInput {
  name?: string;
  description?: string | null;
  capacity?: number;
  basePrice?: number;
}

export interface IRoomTypeFilterQuery {
  search?: string;
  minCapacity?: number;
  maxPrice?: number;
}
