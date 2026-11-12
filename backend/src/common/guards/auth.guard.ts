import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import {
  JwtPayload,
  TokenKeys,
  TokenType,
} from '../../app/auth/consts/jwt.const';
import { IS_PUBLIC } from '../decorators/public.decorator';
import { UserInfo } from '../decorators/user.decorator';

/**
 * Global guard: mọi route cần access token, trừ route gắn `@Public()`.
 * Token lấy từ header `Authorization: Bearer ...` hoặc cookie `accessToken`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: UserInfo }>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Chưa đăng nhập');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    if (payload.type !== TokenType.ACCESS) {
      throw new UnauthorizedException('Token không hợp lệ');
    }

    req.user = {
      userID: payload.userID,
      userEmail: payload.userEmail,
      role: payload.role,
    };
    return true;
  }

  private extractToken(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type?.toLowerCase() === 'bearer' && token) return token;
    return req.cookies?.[TokenKeys.ACCESS_TOKEN_KEY];
  }
}
