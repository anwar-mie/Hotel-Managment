import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  LoginInput,
  RegisterInput,
  RefreshTokenInput,
  ChangePasswordInput,
  AuthResponse,
  AuthTokens,
  AuthUser,
} from 'shared-schemas';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshTokenExpiryDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret =
      this.configService.get<string>('JWT_SECRET') ?? 'hotel_jwt_super_secret_key_change_in_prod';
    this.jwtExpiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') ?? '24h';
    this.refreshTokenExpiryDays = Number(
      this.configService.get<string>('REFRESH_TOKEN_EXPIRES_DAYS') ?? 30,
    );
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: {
    id: string;
    name: string;
    email: string;
    role: any;
    status: any;
    createdAt: Date;
    updatedAt: Date;
  }): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    role: string;
  }): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiresIn as any,
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpiryDays);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async register(data: RegisterInput): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcryptjs.hash(data.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role ?? 'RECEPTIONIST',
        status: 'ACTIVE',
      },
    });

    // Record audit trail
    await this.prisma.auditLog.create({
      data: {
        action: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        metadata: {
          email: user.email,
          role: user.role,
        },
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      tokens,
      user: this.sanitizeUser(user),
    };
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcryptjs.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Your account is currently inactive. Contact your administrator.');
    }

    // Record audit trail
    await this.prisma.auditLog.create({
      data: {
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      tokens,
      user: this.sanitizeUser(user),
    };
  }

  async refreshToken(data: RefreshTokenInput): Promise<AuthTokens> {
    const hashed = this.hashToken(data.refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashed },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (storedToken.revokedAt) {
      // Possible token theft / reuse detected: revoke all user sessions
      await this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token was already revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (storedToken.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive');
    }

    // Revoke used refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Issue new pair
    return this.generateTokens(storedToken.user);
  }

  async logout(userId: string, refreshToken?: string): Promise<{ success: boolean; message: string }> {
    if (refreshToken) {
      const hashed = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: {
          tokenHash: hashed,
          userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    } else {
      // Revoke all sessions for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: userId,
        userId,
      },
    });

    return {
      success: true,
      message: 'Successfully logged out',
    };
  }

  async changePassword(
    userId: string,
    data: ChangePasswordInput,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcryptjs.compare(data.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password does not match');
    }

    const saltRounds = 10;
    const passwordHash = await bcryptjs.hash(data.newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all active refresh tokens so user re-authenticates
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'PASSWORD_CHANGED',
        entityType: 'User',
        entityId: userId,
        userId,
      },
    });

    return {
      success: true,
      message: 'Password changed successfully. Please log in again.',
    };
  }

  async getMe(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }
}
