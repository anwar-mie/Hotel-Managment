import {
  Controller,
  Post,
  Get,
  Body,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
  type LoginInput,
  type RegisterInput,
  type RefreshTokenInput,
  type ChangePasswordInput,
  type AuthUser,
  type AuthResponse,
  type AuthTokens,
} from 'shared-schemas';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() body: RegisterInput): Promise<AuthResponse> {
    return this.authService.register(body);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() body: LoginInput): Promise<AuthResponse> {
    return this.authService.login(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  async refresh(@Body() body: RefreshTokenInput): Promise<AuthTokens> {
    return this.authService.refreshToken(body);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @Body('refreshToken') refreshToken?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.logout(userId, refreshToken);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(changePasswordSchema))
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() body: ChangePasswordInput,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.changePassword(userId, body);
  }

  @Get('me')
  getMe(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
