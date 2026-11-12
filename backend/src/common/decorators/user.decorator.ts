import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role, User as UserModel } from '@prisma/client';

/** Payload của access token, được AuthGuard gắn vào `req.user`. */
export interface UserInfo {
  userID: UserModel['id'];
  userEmail: UserModel['email'];
  role: Role;
}

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as UserInfo;
  },
);

export type WithUser<T> = T & { user: UserInfo };
