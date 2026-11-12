import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { IS_ADMIN_ONLY } from '../decorators/admin-only.decorator';
import { UserInfo } from '../decorators/user.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const adminOnly = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_ONLY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!adminOnly) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: UserInfo }>();
    if (req.user?.role !== Role.admin) {
      throw new ForbiddenException('Chỉ admin mới được truy cập');
    }
    return true;
  }
}
