import {
  BadRequestException,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { MailUtilService } from '../../common/utils/mail-util/mail-util.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { JwtPayload, RESET_PASSWORD_TTL, TokenType } from './consts/jwt.const';

// Bọc bcrypt.compare để kiểm tra được lời gọi (namespace import không spyOn được)
jest.mock('bcrypt', () => {
  const actual = jest.requireActual<typeof import('bcrypt')>('bcrypt');
  return { ...actual, compare: jest.fn(actual.compare) };
});

const ACCESS_SECRET = 'access-secret-test';
const REFRESH_SECRET = 'refresh-secret-test';
const PASSWORD = 'Password123';

/** Chờ các việc chạy nền (gửi mail fire-and-forget) xong. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

interface TestUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  password: string;
  tokenVersion?: number | null;
}

const makeUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  email: 'an@example.com',
  fullName: 'An',
  role: Role.customer,
  status: UserStatus.active,
  password: bcrypt.hashSync(PASSWORD, 4),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let jwt: JwtService;
  let user: TestUser | null;
  let users: Record<
    'create' | 'findForAuth' | 'getMe' | 'setResetPasswordToken' | 'findByResetPasswordToken' | 'updatePassword',
    jest.Mock
  >;
  let mail: { send: jest.Mock };
  let logError: jest.SpyInstance;

  beforeEach(() => {
    user = makeUser();
    // Mock có trạng thái: updatePassword đổi hash và tăng tokenVersion giống UsersService thật
    users = {
      create: jest.fn(async (dto) => ({ id: 'new-id', ...dto, password: undefined })),
      findForAuth: jest.fn(async () => user),
      getMe: jest.fn(async (id: string) => ({ id, email: user?.email })),
      setResetPasswordToken: jest.fn().mockResolvedValue(undefined),
      findByResetPasswordToken: jest.fn(),
      updatePassword: jest.fn(async (target: TestUser, plain: string) => {
        const tokenVersion = (target.tokenVersion ?? 0) + 1;
        Object.assign(user!, { password: await bcrypt.hash(plain, 4), tokenVersion });
        return tokenVersion;
      }),
    };
    mail = { send: jest.fn().mockResolvedValue(undefined) };
    jwt = new JwtService({ secret: ACCESS_SECRET });
    const config = {
      getOrThrow: () => REFRESH_SECRET,
      get: (key: string) => (key === 'FE_URL' ? 'https://shop.example.com, https://admin.example.com' : undefined),
    };
    service = new AuthService(
      users as unknown as UsersService,
      jwt,
      mail as unknown as MailUtilService,
      config as never,
    );
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => logError.mockRestore());

  const signIn = () => service.signIn({ email: user!.email, password: PASSWORD });
  const decodeRefresh = (token: string) => jwt.verify<JwtPayload>(token, { secret: REFRESH_SECRET });

  describe('signUp', () => {
    it('luôn tạo customer đang hoạt động và trả kèm cặp token', async () => {
      const dto = { email: 'moi@example.com', password: PASSWORD, fullName: 'Mới' };
      const result = await service.signUp(dto);

      expect(users.create).toHaveBeenCalledWith({ ...dto, role: Role.customer, status: UserStatus.active });
      expect(result.user).toMatchObject({ id: 'new-id', email: dto.email });
      expect(jwt.verify(result.accessToken)).toMatchObject({ userID: 'new-id', type: TokenType.ACCESS });
      expect(decodeRefresh(result.refreshToken)).toMatchObject({ type: TokenType.REFRESH, ver: 0 });
    });
  });

  describe('signIn', () => {
    it('đúng thông tin: trả user (không có password) + token', async () => {
      const result = await signIn();
      expect(users.getMe).toHaveBeenCalledWith(user!.id);
      expect(result.user).toEqual({ id: user!.id, email: user!.email });
      expect(jwt.verify<JwtPayload>(result.accessToken)).toMatchObject({
        userID: user!.id,
        userEmail: user!.email,
        role: Role.customer,
        type: TokenType.ACCESS,
      });
    });

    it('access token và refresh token ký bằng 2 secret khác nhau', async () => {
      const { accessToken, refreshToken } = await signIn();
      expect(() => jwt.verify(refreshToken)).toThrow();
      expect(() => jwt.verify(accessToken, { secret: REFRESH_SECRET })).toThrow();
    });

    it('sai mật khẩu → 401', async () => {
      await expect(service.signIn({ email: user!.email, password: 'sai-mat-khau' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('BUG-07: email không tồn tại → 401 cùng thông báo, VẪN chạy bcrypt.compare (chống dò email)', async () => {
      const wrongPassword = (await service
        .signIn({ email: user!.email, password: 'sai-mat-khau' })
        .catch((e: Error) => e.message)) as string;
      user = null;
      const compare = bcrypt.compare as unknown as jest.Mock;
      compare.mockClear();

      const noUser = service.signIn({ email: 'khong-co@example.com', password: PASSWORD });

      await expect(noUser).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(noUser).rejects.toThrow(wrongPassword);
      // so với hash giả có cùng cost (10) với hash thật → thời gian xử lý như nhau
      expect(compare).toHaveBeenCalledWith(PASSWORD, expect.stringMatching(/^\$2[aby]\$10\$/));
    });

    it('tài khoản bị khóa + đúng mật khẩu → 403', async () => {
      user!.status = UserStatus.inactive;
      await expect(signIn()).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('tài khoản bị khóa + sai mật khẩu → 401 (không lộ trạng thái khóa)', async () => {
      user!.status = UserStatus.inactive;
      await expect(service.signIn({ email: user!.email, password: 'sai-mat-khau' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('token hợp lệ → cặp token mới', async () => {
      const { refreshToken } = await signIn();
      const tokens = await service.refreshToken(refreshToken);
      expect(decodeRefresh(tokens.refreshToken)).toMatchObject({ userID: user!.id, ver: 0 });
      expect(jwt.verify(tokens.accessToken)).toMatchObject({ type: TokenType.ACCESS });
    });

    it('thiếu token → 401', async () => {
      await expect(service.refreshToken(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('token rác / sai chữ ký → 401', async () => {
      await expect(service.refreshToken('abc.def.ghi')).rejects.toBeInstanceOf(UnauthorizedException);
      const forged = jwt.sign({ userID: user!.id, type: TokenType.REFRESH }, { secret: 'other' });
      await expect(service.refreshToken(forged)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('token hết hạn → 401', async () => {
      const expired = jwt.sign(
        { userID: user!.id, type: TokenType.REFRESH, exp: Math.floor(Date.now() / 1000) - 10 },
        { secret: REFRESH_SECRET },
      );
      await expect(service.refreshToken(expired)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('ký đúng secret nhưng type không phải refresh → 401', async () => {
      const wrongType = jwt.sign({ userID: user!.id, type: TokenType.ACCESS }, { secret: REFRESH_SECRET });
      await expect(service.refreshToken(wrongType)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('dùng access token thay refresh token → 401', async () => {
      const { accessToken } = await signIn();
      await expect(service.refreshToken(accessToken)).rejects.toMatchObject({ status: 401 });
    });

    it('user đã bị xóa → 401', async () => {
      const { refreshToken } = await signIn();
      user = null;
      await expect(service.refreshToken(refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('user bị khóa → 403', async () => {
      const { refreshToken } = await signIn();
      user!.status = UserStatus.inactive;
      await expect(service.refreshToken(refreshToken)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('BUG-02: tokenVersion trong DB đã tăng (bị khóa rồi mở lại...) → 401', async () => {
      const { refreshToken } = await signIn();
      user!.tokenVersion = 1;
      await expect(service.refreshToken(refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('token cũ (phát trước khi có tokenVersion, không có claim ver) vẫn dùng được với user chưa đổi gì', async () => {
      const legacy = jwt.sign(
        { userID: user!.id, userEmail: user!.email, role: user!.role, type: TokenType.REFRESH },
        { secret: REFRESH_SECRET },
      );
      await expect(service.refreshToken(legacy)).resolves.toHaveProperty('accessToken');
    });
  });

  describe('changePassword', () => {
    const me = () => ({ userID: user!.id, userEmail: user!.email, role: user!.role });

    it('BUG-02: refresh token phát TRƯỚC khi đổi mật khẩu bị từ chối (401)', async () => {
      const { refreshToken: stolen } = await signIn();
      await service.changePassword(me(), { oldPassword: PASSWORD, newPassword: 'NewPassword1' });
      await expect(service.refreshToken(stolen)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('BUG-02: refresh token phát SAU khi đổi mật khẩu dùng bình thường', async () => {
      const result = await service.changePassword(me(), { oldPassword: PASSWORD, newPassword: 'NewPassword1' });
      expect(result.message).toMatch(/thành công/);
      expect(decodeRefresh(result.refreshToken).ver).toBe(1);
      await expect(service.refreshToken(result.refreshToken)).resolves.toHaveProperty('accessToken');

      const { refreshToken } = await service.signIn({ email: user!.email, password: 'NewPassword1' });
      await expect(service.refreshToken(refreshToken)).resolves.toHaveProperty('accessToken');
    });

    it('mật khẩu cũ sai → 400, không đổi', async () => {
      await expect(
        service.changePassword(me(), { oldPassword: 'sai-mat-khau', newPassword: 'NewPassword1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(users.updatePassword).not.toHaveBeenCalled();
    });

    it('tài khoản không còn tồn tại → 401', async () => {
      const current = me();
      user = null;
      await expect(
        service.changePassword(current, { oldPassword: PASSWORD, newPassword: 'NewPassword1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    const MESSAGE = /Nếu email tồn tại/;

    it('email tồn tại: lưu HASH của token (hết hạn 15 phút) và gửi link chứa token gốc', async () => {
      const before = Date.now();
      await expect(service.forgotPassword({ email: user!.email })).resolves.toEqual({ message: expect.stringMatching(MESSAGE) });
      await flush();

      const [userID, tokenHash, expiresAt] = users.setResetPasswordToken.mock.calls[0];
      expect(userID).toBe(user!.id);
      expect((expiresAt as Date).getTime()).toBeGreaterThanOrEqual(before + RESET_PASSWORD_TTL * 1000);

      const { to, text, html } = mail.send.mock.calls[0][0];
      const token = /token=([a-f0-9]{64})/.exec(text)![1];
      expect(to).toBe(user!.email);
      expect(createHash('sha256').update(token).digest('hex')).toBe(tokenHash);
      expect(html).toContain(`https://shop.example.com/reset-password?token=${token}`); // FE_URL đầu tiên
    });

    it('BUG-03: fullName chứa HTML được escape trong email', async () => {
      user!.fullName = '<a href="https://evil.example">Bấm vào đây</a>';
      await service.forgotPassword({ email: user!.email });
      await flush();

      const { html } = mail.send.mock.calls[0][0];
      expect(html).not.toContain('<a href="https://evil.example">');
      expect(html).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;');
    });

    it('email không tồn tại: cùng thông báo, không ghi token, không gửi mail', async () => {
      user = null;
      await expect(service.forgotPassword({ email: 'khong-co@example.com' })).resolves.toEqual({
        message: expect.stringMatching(MESSAGE),
      });
      await flush();
      expect(users.setResetPasswordToken).not.toHaveBeenCalled();
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('tài khoản bị khóa: không gửi mail', async () => {
      user!.status = UserStatus.inactive;
      await service.forgotPassword({ email: user!.email });
      await flush();
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('BUG-07: trả lời ngay, không chờ gửi mail (SMTP chậm không làm chậm response)', async () => {
      mail.send.mockReturnValue(new Promise(() => undefined)); // SMTP treo mãi
      await expect(service.forgotPassword({ email: user!.email })).resolves.toHaveProperty('message');
    });

    it('gửi mail / ghi token lỗi: vẫn trả thông báo chung, chỉ ghi log', async () => {
      mail.send.mockRejectedValue(new Error('SMTP down'));
      await expect(service.forgotPassword({ email: user!.email })).resolves.toHaveProperty('message');
      await flush();
      expect(logError).toHaveBeenCalledWith(expect.stringContaining(user!.id), expect.stringContaining('SMTP down'));

      users.setResetPasswordToken.mockRejectedValue('db down');
      await service.forgotPassword({ email: user!.email });
      await flush();
      expect(logError).toHaveBeenLastCalledWith(expect.any(String), 'db down');
    });
  });

  describe('resetPassword', () => {
    const token = 'a'.repeat(64);

    it('token sai / hết hạn → 400', async () => {
      users.findByResetPasswordToken.mockResolvedValue(null);
      await expect(service.resetPassword({ token, newPassword: 'NewPassword1' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(users.findByResetPasswordToken).toHaveBeenCalledWith(createHash('sha256').update(token).digest('hex'));
      expect(users.updatePassword).not.toHaveBeenCalled();
    });

    it('BUG-02: reset thành công thì refresh token phát trước đó bị từ chối', async () => {
      const { refreshToken: old } = await signIn();
      users.findByResetPasswordToken.mockResolvedValue({ id: user!.id, tokenVersion: user!.tokenVersion });

      await expect(service.resetPassword({ token, newPassword: 'NewPassword1' })).resolves.toEqual({
        message: expect.stringMatching(/thành công/),
      });
      expect(users.updatePassword).toHaveBeenCalledWith({ id: user!.id, tokenVersion: undefined }, 'NewPassword1');
      await expect(service.refreshToken(old)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
