import { Controller, ExecutionContext, ForbiddenException, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AdminOnly } from '../decorators/admin-only.decorator';
import { UserInfo } from '../decorators/user.decorator';
import { AdminGuard } from './admin.guard';

@Controller()
class OpenController {
  @Get() open() {}
  @AdminOnly() @Get() adminMethod() {}
}

@AdminOnly()
@Controller()
class AdminController {
  @Get() list() {}
}

const makeContext = (
  cls: new () => object,
  handler: (...args: any[]) => any,
  user?: Partial<UserInfo>,
) =>
  ({
    getClass: () => cls,
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('AdminGuard', () => {
  const guard = new AdminGuard(new Reflector());
  const admin = { userID: '1', userEmail: 'a@x.com', role: Role.admin };
  const customer = { userID: '2', userEmail: 'c@x.com', role: Role.customer };

  it('cho qua route không gắn @AdminOnly, kể cả khi chưa đăng nhập', () => {
    const p = OpenController.prototype;
    expect(guard.canActivate(makeContext(OpenController, p.open))).toBe(true);
    expect(guard.canActivate(makeContext(OpenController, p.open, customer))).toBe(true);
  });

  it('@AdminOnly ở method: admin qua, customer và khách bị 403', () => {
    const h = OpenController.prototype.adminMethod;
    expect(guard.canActivate(makeContext(OpenController, h, admin))).toBe(true);
    expect(() => guard.canActivate(makeContext(OpenController, h, customer))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(makeContext(OpenController, h))).toThrow(ForbiddenException);
  });

  it('@AdminOnly ở class áp dụng cho mọi method', () => {
    const h = AdminController.prototype.list;
    expect(guard.canActivate(makeContext(AdminController, h, admin))).toBe(true);
    expect(() => guard.canActivate(makeContext(AdminController, h, customer))).toThrow(ForbiddenException);
  });
});
