export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'HOUSEKEEPER'
  | 'ACCOUNTANT';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IAuthResponse {
  tokens: IAuthTokens;
  user: IAuthUser;
}

export interface ILoginInput {
  email: string;
  password: string;
}

export interface IRegisterInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface IRefreshTokenInput {
  refreshToken: string;
}

export interface IChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
