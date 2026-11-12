import { Body, Controller, HttpCode, Patch, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import { COOKIE_CONFIG_DEFAULT } from '../../common/decorators/cookie/cookie.const';
import { Cookies } from '../../common/decorators/cookie/cookie.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User, type UserInfo } from '../../common/decorators/user.decorator';
import { STRICT_THROTTLE } from '../../common/security/rate-limit/rate-limit.const';
import { AuthService } from './auth.service';
import {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  TokenKeys,
} from './consts/jwt.const';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password.dto';
import { RefreshTokenDto, SignInDto, SignUpDto } from './dto/sign.dto';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly refreshCookiePath: string;

  constructor(
    private readonly authService: AuthService,
    config: ConfigService,
  ) {
    // Refresh token chỉ được gửi kèm request tới /api/auth/*
    this.refreshCookiePath = `${config.get<string>('APP_PREFIX') ?? '/api'}/auth`;
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @Post('sign-up')
  async signUp(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signUp(dto);
    this.setTokenCookies(res, result);
    return result;
  }

  @Public()
  @Throttle(STRICT_THROTTLE) // chống dò mật khẩu
  @HttpCode(200)
  @Post('sign-in')
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signIn(dto);
    this.setTokenCookies(res, result);
    return result;
  }

  @Public()
  @HttpCode(200)
  @Post('refresh-token')
  async refreshToken(
    @Cookies(TokenKeys.REFRESH_TOKEN_KEY) cookieToken: string | undefined,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshToken(
      cookieToken ?? dto.refreshToken,
    );
    this.setTokenCookies(res, tokens);
    return tokens;
  }

  @Public()
  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(TokenKeys.ACCESS_TOKEN_KEY, this.cookieOptions());
    res.clearCookie(
      TokenKeys.REFRESH_TOKEN_KEY,
      this.cookieOptions(this.refreshCookiePath),
    );
    return { message: 'Đã đăng xuất' };
  }

  @Public()
  @Throttle(STRICT_THROTTLE) // chống spam email
  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle(STRICT_THROTTLE) // chống dò token
  @HttpCode(200)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Throttle(STRICT_THROTTLE) // chống dò mật khẩu cũ khi bị lộ token
  @Patch('change-password')
  changePassword(@User() user: UserInfo, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user, dto);
  }

  private cookieOptions(path = '/'): CookieOptions {
    return { ...COOKIE_CONFIG_DEFAULT, path };
  }

  private setTokenCookies(
    res: Response,
    { accessToken, refreshToken }: Tokens,
  ) {
    res.cookie(TokenKeys.ACCESS_TOKEN_KEY, accessToken, {
      ...this.cookieOptions(),
      maxAge: ACCESS_TOKEN_TTL * 1000,
    });
    res.cookie(TokenKeys.REFRESH_TOKEN_KEY, refreshToken, {
      ...this.cookieOptions(this.refreshCookiePath),
      maxAge: REFRESH_TOKEN_TTL * 1000,
    });
  }
}
