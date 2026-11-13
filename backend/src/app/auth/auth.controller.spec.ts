import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { AutoMockingModule } from '../../../test/auto-mocking/auto-mocking.module';
import { IS_PUBLIC } from '../../common/decorators/public.decorator';
import type { UserInfo } from '../../common/decorators/user.decorator';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL, TokenKeys } from './consts/jwt.const';

const tokens = { accessToken: 'access.jwt', refreshToken: 'refresh.jwt' };
const user = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  email: 'c@x.com',
  fullName: 'C',
  role: Role.customer,
};
const currentUser: UserInfo = {
  userID: user.id,
  userEmail: user.email,
  role: Role.customer,
};

const createResponse = () =>
  ({ cookie: jest.fn(), clearCookie: jest.fn() }) as unknown as Response & {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
  };

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module = await AutoMockingModule.createTestingModule({
      controllers: [AuthController],
    });
    controller = module.get(AuthController);
    authService = module.get(AuthService);
  });

  /** Cả 2 cookie phải httpOnly + Secure + SameSite=Lax (chống CSRF); refresh chỉ gửi tới /api/auth. */
  const expectTokenCookies = (res: ReturnType<typeof createResponse>) => {
    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.cookie).toHaveBeenCalledWith(
      TokenKeys.ACCESS_TOKEN_KEY,
      tokens.accessToken,
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: ACCESS_TOKEN_TTL * 1000,
      }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      TokenKeys.REFRESH_TOKEN_KEY,
      tokens.refreshToken,
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: REFRESH_TOKEN_TTL * 1000,
      }),
    );
  };

  describe('quyền truy cập (metadata)', () => {
    const isPublic = (method: keyof AuthController) =>
      Reflect.getMetadata(IS_PUBLIC, AuthController.prototype[method]) === true;

    it.each([
      'signUp',
      'signIn',
      'refreshToken',
      'logout',
      'forgotPassword',
      'resetPassword',
    ] as const)('%s là @Public()', (method) => {
      expect(isPublic(method)).toBe(true);
    });

    it('changePassword cần đăng nhập (không @Public)', () => {
      expect(isPublic('changePassword')).toBe(false);
    });
  });

  describe('signUp', () => {
    it('gọi service, set cookie và trả về user + token', async () => {
      const dto = { email: 'c@x.com', password: '12345678', fullName: 'C' };
      authService.signUp.mockResolvedValue({ user, ...tokens } as any);
      const res = createResponse();

      const result = await controller.signUp(dto, res);

      expect(authService.signUp).toHaveBeenCalledWith(dto);
      expectTokenCookies(res);
      expect(result).toEqual({ user, ...tokens });
    });
  });

  describe('signIn', () => {
    it('đúng thông tin: set cookie và trả về user + token', async () => {
      const dto = { email: 'c@x.com', password: '12345678' };
      authService.signIn.mockResolvedValue({ user, ...tokens } as any);
      const res = createResponse();

      const result = await controller.signIn(dto, res);

      expect(authService.signIn).toHaveBeenCalledWith(dto);
      expectTokenCookies(res);
      expect(result).toEqual({ user, ...tokens });
    });

    it('sai thông tin: ném lỗi và KHÔNG set cookie', async () => {
      authService.signIn.mockRejectedValue(new UnauthorizedException());
      const res = createResponse();

      await expect(
        controller.signIn({ email: 'c@x.com', password: 'wrong' }, res),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => authService.refreshToken.mockResolvedValue(tokens));

    it('ưu tiên token trong cookie', async () => {
      const res = createResponse();
      await controller.refreshToken('from-cookie', { refreshToken: 'from-body' }, res);
      expect(authService.refreshToken).toHaveBeenCalledWith('from-cookie');
      expectTokenCookies(res);
    });

    it('không có cookie thì dùng token trong body (app mobile)', async () => {
      const res = createResponse();
      const result = await controller.refreshToken(undefined, { refreshToken: 'from-body' }, res);
      expect(authService.refreshToken).toHaveBeenCalledWith('from-body');
      expect(result).toEqual(tokens);
    });

    it('không có token ở đâu cả: chuyển undefined cho service xử lý', async () => {
      authService.refreshToken.mockRejectedValue(new UnauthorizedException());
      const res = createResponse();
      await expect(controller.refreshToken(undefined, {}, res)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(authService.refreshToken).toHaveBeenCalledWith(undefined);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('xóa cả 2 cookie với đúng path đã set', () => {
      const res = createResponse();
      const result = controller.logout(res);

      expect(res.clearCookie).toHaveBeenCalledWith(
        TokenKeys.ACCESS_TOKEN_KEY,
        expect.objectContaining({ path: '/' }),
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        TokenKeys.REFRESH_TOKEN_KEY,
        expect.objectContaining({ path: '/api/auth' }),
      );
      expect(result).toEqual({ message: expect.any(String) });
    });
  });

  describe('quên / đặt lại / đổi mật khẩu', () => {
    it('forgotPassword chuyển dto cho service', async () => {
      const response = { message: 'ok' };
      authService.forgotPassword.mockResolvedValue(response);
      await expect(controller.forgotPassword({ email: 'c@x.com' })).resolves.toBe(response);
      expect(authService.forgotPassword).toHaveBeenCalledWith({ email: 'c@x.com' });
    });

    it('resetPassword chuyển dto cho service', async () => {
      const dto = { token: 'a'.repeat(64), newPassword: 'newpass123' };
      authService.resetPassword.mockResolvedValue({ message: 'ok' });
      await controller.resetPassword(dto);
      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
    });

    it('changePassword truyền user lấy từ token, set cookie token mới cho phiên hiện tại', async () => {
      const dto = { oldPassword: 'old12345', newPassword: 'new12345' };
      authService.changePassword.mockResolvedValue({ message: 'ok', ...tokens });
      const res = createResponse();

      await expect(controller.changePassword(currentUser, dto, res)).resolves.toEqual({
        message: 'ok',
        ...tokens,
      });
      expect(authService.changePassword).toHaveBeenCalledWith(currentUser, dto);
      expectTokenCookies(res);
    });
  });

  describe('COOKIE_SAME_SITE', () => {
    it('đọc từ config (FE và API khác domain gốc thì đặt "none")', async () => {
      const config = { get: (key: string) => (key === 'COOKIE_SAME_SITE' ? 'none' : undefined) };
      const ctrl = new AuthController(authService, config as never);
      authService.signIn.mockResolvedValue({ user, ...tokens } as any);
      const res = createResponse();

      await ctrl.signIn({ email: 'c@x.com', password: '12345678' }, res);

      for (const [, , options] of res.cookie.mock.calls) {
        expect(options).toMatchObject({ sameSite: 'none', secure: true, httpOnly: true });
      }
    });
  });
});
