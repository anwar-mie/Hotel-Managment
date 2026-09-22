export type IdentificationType =
  | 'PASSPORT'
  | 'NATIONAL_ID'
  | 'DRIVING_LICENSE'
  | 'OTHER';

export interface IGuest {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  nationality: string | null;
  identificationType: string | null;
  identificationNumber: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    bookedReservations?: number;
    stays?: number;
  };
}

export interface ICreateGuestInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  nationality?: string | null;
  identificationType?: IdentificationType | string | null;
  identificationNumber?: string | null;
}

export interface IUpdateGuestInput {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  nationality?: string | null;
  identificationType?: IdentificationType | string | null;
  identificationNumber?: string | null;
}

export interface IGuestFilterQuery {
  search?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  identificationNumber?: string;
  page?: number;
  limit?: number;
}

export interface IGuestLookupResult {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  identificationType: string | null;
  identificationNumber: string | null;
}
