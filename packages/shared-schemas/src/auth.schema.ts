import { z } from "zod";

export const UserRoleEnum = z.enum([
  "ADMIN",
  "MANAGER",
  "RECEPTIONIST",
  "HOUSEKEEPER",
  "ACCOUNTANT",
]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const UserStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);
export type UserStatus = z.infer<typeof UserStatusEnum>;

export const loginSchema = z.object({
  email: z
    .string()
    .email({ message: "Please provide a valid email address" })
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .trim(),
  email: z
    .string()
    .email({ message: "Please provide a valid email address" })
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" }),
  role: UserRoleEnum.optional().default("RECEPTIONIST"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, { message: "Refresh token is required" })
    .trim(),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: "Current password is required" }),
  newPassword: z
    .string()
    .min(6, { message: "New password must be at least 6 characters long" }),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuthResponse {
  tokens: AuthTokens;
  user: AuthUser;
}
