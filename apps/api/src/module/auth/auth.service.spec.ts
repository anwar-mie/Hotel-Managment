import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import bcryptjs from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaMock: any;
  let jwtServiceMock: any;
  let configServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    jwtServiceMock = {
      signAsync: vi.fn().mockResolvedValue('mock_jwt_access_token'),
    };

    configServiceMock = {
      get: vi.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test_secret';
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'REFRESH_TOKEN_EXPIRES_DAYS') return '7';
        return undefined;
      }),
    };

    authService = new AuthService(prismaMock, jwtServiceMock, configServiceMock);
  });

  describe('register', () => {
    it('should throw ConflictException if user already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'existing@hotel.com' });

      await expect(
        authService.register({
          name: 'Existing User',
          email: 'existing@hotel.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully register a new user and return tokens', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'new-user-id',
        name: 'New Receptionist',
        email: 'receptionist@hotel.com',
        role: 'RECEPTIONIST',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.refreshToken.create.mockResolvedValue({});
      prismaMock.auditLog.create.mockResolvedValue({});

      const result = await authService.register({
        name: 'New Receptionist',
        email: 'receptionist@hotel.com',
        password: 'password123',
        role: 'RECEPTIONIST',
      });

      expect(result.tokens.accessToken).toBe('mock_jwt_access_token');
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.user.email).toBe('receptionist@hotel.com');
      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(prismaMock.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'unknown@hotel.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hash = await bcryptjs.hash('correct_password', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@hotel.com',
        passwordHash: hash,
        status: 'ACTIVE',
      });

      await expect(
        authService.login({
          email: 'user@hotel.com',
          password: 'wrong_password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is inactive', async () => {
      const hash = await bcryptjs.hash('password123', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@hotel.com',
        passwordHash: hash,
        status: 'INACTIVE',
      });

      await expect(
        authService.login({
          email: 'user@hotel.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should log in successfully and record audit log', async () => {
      const hash = await bcryptjs.hash('password123', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-id',
        name: 'Manager User',
        email: 'manager@hotel.com',
        role: 'MANAGER',
        status: 'ACTIVE',
        passwordHash: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.refreshToken.create.mockResolvedValue({});
      prismaMock.auditLog.create.mockResolvedValue({});

      const result = await authService.login({
        email: 'manager@hotel.com',
        password: 'password123',
      });

      expect(result.tokens.accessToken).toBe('mock_jwt_access_token');
      expect(result.user.name).toBe('Manager User');
      expect(prismaMock.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should throw UnauthorizedException if token not found', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        authService.refreshToken({ refreshToken: 'invalid-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should rotate token if valid', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revokedAt: null,
        expiresAt: futureDate,
        user: {
          id: 'u-1',
          email: 'u1@hotel.com',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
      prismaMock.refreshToken.update.mockResolvedValue({});
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await authService.refreshToken({ refreshToken: 'valid-token' });

      expect(result.accessToken).toBe('mock_jwt_access_token');
      expect(prismaMock.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rt-1' },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('changePassword', () => {
    it('should throw BadRequestException if current password is wrong', async () => {
      const hash = await bcryptjs.hash('oldPassword', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u-1',
        passwordHash: hash,
      });

      await expect(
        authService.changePassword('u-1', {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
