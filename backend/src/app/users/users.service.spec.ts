import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createPrismaModelMock, PrismaModelMock } from '../../../test/mocks/prisma.mock';
import type { UserInfo } from '../../common/decorators/user.decorator';
import { NOT_DELETED, PrismaService } from '../../common/prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { UsersService } from './users.service';

const ADMIN_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const USER_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const P1 = 'cccccccccccccccccccccccc';
const P2 = 'dddddddddddddddddddddddd';

const admin: UserInfo = { userID: ADMIN_ID, userEmail: 'admin@x.com', role: Role.admin };

const SENSITIVE = ['password', 'resetPasswordToken', 'resetPasswordExp', 'tokenVersion'];

/** Mọi lệnh đọc / ghi trả user ra ngoài phải omit đủ các field nhạy cảm. */
const expectOmitSensitive = (args: { omit?: Record<string, boolean> }) => {
  for (const field of SENSITIVE) expect(args.omit?.[field]).toBe(true);
};

describe('UsersService', () => {
  let service: UsersService;
  let user: PrismaModelMock;
  let order: { aggregate: jest.Mock };
  let transaction: jest.Mock;
  let products: { findCardsByIDs: jest.Mock; ensureActive: jest.Mock };

  beforeEach(() => {
    user = createPrismaModelMock();
    order = { aggregate: jest.fn() };
    const prisma = { user, order, extended: { user } } as unknown as PrismaService;
    transaction = jest.fn((fn: (tx: unknown) => unknown) => fn(prisma));
    Object.assign(prisma, { $transaction: transaction });
    products = { findCardsByIDs: jest.fn(), ensureActive: jest.fn() };
    service = new UsersService(prisma, products as unknown as ProductsService);
  });

  // ───────────── /me ─────────────

  describe('getMe / updateMe', () => {
    it('getMe: không trả field nhạy cảm; không có → 404', async () => {
      user.findUnique.mockResolvedValueOnce({ id: USER_ID }).mockResolvedValueOnce(null);
      await expect(service.getMe(USER_ID)).resolves.toEqual({ id: USER_ID });
      expectOmitSensitive(user.findUnique.mock.calls[0][0]);
      await expect(service.getMe(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updateMe: cập nhật đúng user trong token, không trả field nhạy cảm', async () => {
      user.findUnique.mockResolvedValue({ id: USER_ID, status: UserStatus.active });
      user.update.mockResolvedValue({ id: USER_ID, fullName: 'Mới' });

      await service.updateMe(USER_ID, { fullName: 'Mới' });

      const args = user.update.mock.calls[0][0];
      expect(args).toMatchObject({ where: { id: USER_ID }, data: { fullName: 'Mới' } });
      expectOmitSensitive(args);
    });

    it('updateMe: tài khoản đã xóa → 404, không ghi', async () => {
      user.findUnique.mockResolvedValue(null);
      await expect(service.updateMe(USER_ID, { fullName: 'X' })).rejects.toBeInstanceOf(NotFoundException);
      expect(user.update).not.toHaveBeenCalled();
    });
  });

  // ───────────── wishlist ─────────────

  describe('wishlist', () => {
    it('getWishlist: rỗng thì không truy vấn sản phẩm', async () => {
      user.findUnique.mockResolvedValue({ wishlistProductIDs: [] });
      await expect(service.getWishlist(USER_ID)).resolves.toEqual([]);
      expect(products.findCardsByIDs).not.toHaveBeenCalled();
    });

    it('getWishlist: thêm sau hiện trước, sản phẩm đã ẩn / xóa không hiện', async () => {
      user.findUnique.mockResolvedValue({ wishlistProductIDs: [P1, 'hidden', P2] });
      products.findCardsByIDs.mockResolvedValue([{ id: P1 }, { id: P2 }]);
      await expect(service.getWishlist(USER_ID)).resolves.toEqual([{ id: P2 }, { id: P1 }]);
    });

    it('getWishlist: tài khoản không tồn tại → 404', async () => {
      user.findUnique.mockResolvedValue(null);
      await expect(service.getWishlist(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('addToWishlist: atomic, chỉ push khi chưa có (thêm 2 lần không trùng)', async () => {
      user.findUnique
        .mockResolvedValueOnce({ id: USER_ID, status: UserStatus.active })
        .mockResolvedValueOnce({ wishlistProductIDs: [P1] });

      await expect(service.addToWishlist(USER_ID, P1)).resolves.toEqual({ wishlistProductIDs: [P1] });

      expect(products.ensureActive).toHaveBeenCalledWith(P1);
      expect(user.updateMany).toHaveBeenCalledWith({
        where: { id: USER_ID, ...NOT_DELETED, NOT: { wishlistProductIDs: { has: P1 } } },
        data: { wishlistProductIDs: { push: P1 } },
      });
    });

    it('addToWishlist: sản phẩm không đang bán → 404, không ghi', async () => {
      user.findUnique.mockResolvedValue({ id: USER_ID });
      products.ensureActive.mockRejectedValue(new NotFoundException());
      await expect(service.addToWishlist(USER_ID, P1)).rejects.toBeInstanceOf(NotFoundException);
      expect(user.updateMany).not.toHaveBeenCalled();
    });

    it('removeFromWishlist: đọc + ghi trong transaction, bỏ đúng sản phẩm', async () => {
      user.findFirst.mockResolvedValue({ wishlistProductIDs: [P1, P2] });

      await expect(service.removeFromWishlist(USER_ID, P1)).resolves.toEqual({ wishlistProductIDs: [P2] });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(user.findFirst.mock.calls[0][0].where).toEqual({ id: USER_ID, ...NOT_DELETED });
      expect(user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { wishlistProductIDs: { set: [P2] } },
      });
    });

    it('removeFromWishlist: sản phẩm không có trong wishlist thì không ghi', async () => {
      user.findFirst.mockResolvedValue({ wishlistProductIDs: [P2] });
      await expect(service.removeFromWishlist(USER_ID, P1)).resolves.toEqual({ wishlistProductIDs: [P2] });
      expect(user.update).not.toHaveBeenCalled();
    });

    it('removeFromWishlist: tài khoản không tồn tại → 404', async () => {
      user.findFirst.mockResolvedValue(null);
      await expect(service.removeFromWishlist(USER_ID, P1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('BUG-08: có request thêm sản phẩm chen vào (P2034) → đọc lại, không làm mất sản phẩm vừa thêm', async () => {
      const conflict = new Prisma.PrismaClientKnownRequestError('WriteConflict', { code: 'P2034', clientVersion: 't' });
      user.findFirst
        .mockResolvedValueOnce({ wishlistProductIDs: [P1] })
        .mockResolvedValueOnce({ wishlistProductIDs: [P1, P2] }); // P2 vừa được thêm
      user.update.mockRejectedValueOnce(conflict).mockResolvedValue({});

      await expect(service.removeFromWishlist(USER_ID, P1)).resolves.toEqual({ wishlistProductIDs: [P2] });
      expect(transaction).toHaveBeenCalledTimes(2);
      expect(user.update).toHaveBeenLastCalledWith({
        where: { id: USER_ID },
        data: { wishlistProductIDs: { set: [P2] } },
      });
    });
  });

  // ───────────── admin ─────────────

  describe('findAll', () => {
    it('lọc theo role / status / từ khóa, phân trang, count cùng where, không trả field nhạy cảm', async () => {
      user.findMany.mockResolvedValue([{ id: USER_ID }]);
      user.count.mockResolvedValue(41);

      const result = await service.findAll({ page: 3, itemPerPage: 20, q: 'an', role: Role.customer, status: UserStatus.active });

      const args = user.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        role: Role.customer,
        status: UserStatus.active,
        OR: [
          { email: { contains: 'an', mode: 'insensitive' } },
          { fullName: { contains: 'an', mode: 'insensitive' } },
          { phone: { contains: 'an' } },
        ],
      });
      expect(args).toMatchObject({ skip: 40, take: 20 });
      expectOmitSensitive(args);
      expect(user.count).toHaveBeenCalledWith({ where: args.where });
      expect(result).toEqual({ list: [{ id: USER_ID }], totalItems: 41, totalPages: 3 });
    });

    it('không lọc gì thì where rỗng', async () => {
      user.findMany.mockResolvedValue([]);
      user.count.mockResolvedValue(0);
      await service.findAll({ page: 1, itemPerPage: 10 });
      expect(user.findMany.mock.calls[0][0].where).toEqual({});
    });
  });

  describe('findOne', () => {
    it('kèm địa chỉ, số đơn và tổng chi tiêu (chỉ đơn đã giao)', async () => {
      user.findUnique.mockResolvedValue({ id: USER_ID });
      order.aggregate.mockResolvedValue({ _sum: { total: 5_000_000 } });

      await expect(service.findOne(USER_ID)).resolves.toEqual({ id: USER_ID, totalSpent: 5_000_000 });
      expectOmitSensitive(user.findUnique.mock.calls[0][0]);
      expect(order.aggregate).toHaveBeenCalledWith({
        where: { userID: USER_ID, status: 'delivered' },
        _sum: { total: true },
      });
    });

    it('chưa có đơn → totalSpent 0; không có user → 404', async () => {
      user.findUnique.mockResolvedValueOnce({ id: USER_ID }).mockResolvedValueOnce(null);
      order.aggregate.mockResolvedValue({ _sum: { total: null } });
      await expect(service.findOne(USER_ID)).resolves.toMatchObject({ totalSpent: 0 });
      await expect(service.findOne(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { email: 'moi@x.com', password: 'Password1', fullName: 'Mới', role: Role.customer, status: UserStatus.active };

    it('hash mật khẩu, không trả field nhạy cảm', async () => {
      user.findUnique.mockResolvedValue(null);
      user.create.mockResolvedValue({ id: USER_ID });

      await service.create(dto);

      const args = user.create.mock.calls[0][0];
      expect(args.data.password).not.toBe(dto.password);
      await expect(bcrypt.compare(dto.password, args.data.password)).resolves.toBe(true);
      expectOmitSensitive(args);
    });

    it('email đã dùng → 409', async () => {
      user.findUnique.mockResolvedValue({ deletedAt: null });
      await expect(service.create(dto)).rejects.toThrow(new ConflictException('Email đã được sử dụng'));
      expect(user.create).not.toHaveBeenCalled();
    });

    it('email của tài khoản đã xóa → 409 (đọc bằng client gốc, thấy cả bản ghi đã xóa)', async () => {
      user.findUnique.mockResolvedValue({ deletedAt: new Date() });
      await expect(service.create(dto)).rejects.toThrow('đã bị xóa');
      expect(user.findUnique).toHaveBeenCalledWith({ where: { email: dto.email }, select: { deletedAt: true } });
    });
  });

  describe('update', () => {
    beforeEach(() => {
      user.findUnique.mockResolvedValue({ id: USER_ID, status: UserStatus.active, tokenVersion: 2 });
      user.update.mockResolvedValue({ id: USER_ID });
    });

    it('admin không tự hạ quyền chính mình → 400', async () => {
      await expect(service.update(admin, ADMIN_ID, { role: Role.customer })).rejects.toBeInstanceOf(BadRequestException);
      expect(user.update).not.toHaveBeenCalled();
    });

    it('admin không tự khóa chính mình → 400', async () => {
      await expect(service.update(admin, ADMIN_ID, { status: UserStatus.inactive })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('admin tự sửa thông tin khác của mình thì được', async () => {
      await service.update(admin, ADMIN_ID, { role: Role.admin, fullName: 'Admin' });
      expect(user.update).toHaveBeenCalled();
    });

    it('BUG-02: khóa user khác → tăng tokenVersion (thu hồi refresh token)', async () => {
      await service.update(admin, USER_ID, { status: UserStatus.inactive });
      const args = user.update.mock.calls[0][0];
      expect(args.data).toEqual({ status: UserStatus.inactive, tokenVersion: 3 });
      expectOmitSensitive(args);
    });

    it('user đã bị khóa sẵn, hoặc chỉ sửa field khác → không tăng tokenVersion', async () => {
      user.findUnique.mockResolvedValue({ id: USER_ID, status: UserStatus.inactive, tokenVersion: null });
      await service.update(admin, USER_ID, { status: UserStatus.inactive });
      await service.update(admin, USER_ID, { fullName: 'X' });
      expect(user.update.mock.calls[0][0].data).toEqual({ status: UserStatus.inactive });
      expect(user.update.mock.calls[1][0].data).toEqual({ fullName: 'X' });
    });

    it('user không tồn tại → 404', async () => {
      user.findUnique.mockResolvedValue(null);
      await expect(service.update(admin, USER_ID, { fullName: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('admin không tự xóa chính mình → 400', async () => {
      await expect(service.remove(admin, ADMIN_ID)).rejects.toBeInstanceOf(BadRequestException);
      expect(user.softDelete).not.toHaveBeenCalled();
    });

    it('soft delete user khác', async () => {
      user.findUnique.mockResolvedValue({ id: USER_ID });
      await expect(service.remove(admin, USER_ID)).resolves.toEqual({ id: USER_ID });
      expect(user.softDelete).toHaveBeenCalledWith({ id: USER_ID });
    });

    it('user không tồn tại → 404', async () => {
      user.findUnique.mockResolvedValue(null);
      await expect(service.remove(admin, USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ───────────── auth ─────────────

  describe('dùng cho auth', () => {
    it('findForAuth: tìm theo id hoặc email', async () => {
      user.findUnique.mockResolvedValue({ id: USER_ID });
      await service.findForAuth({ email: 'a@x.com' });
      expect(user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@x.com' } });
    });

    it('setResetPasswordToken: lưu hash + hạn dùng', async () => {
      const exp = new Date();
      await service.setResetPasswordToken(USER_ID, 'hash', exp);
      expect(user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { resetPasswordToken: 'hash', resetPasswordExp: exp },
      });
    });

    it('findByResetPasswordToken: chỉ token còn hạn của user đang hoạt động', async () => {
      await service.findByResetPasswordToken('hash');
      expect(user.findFirst).toHaveBeenCalledWith({
        where: { resetPasswordToken: 'hash', resetPasswordExp: { gt: expect.any(Date) }, status: UserStatus.active },
        select: { id: true, tokenVersion: true },
      });
    });

    it('updatePassword: hash mật khẩu mới, xóa token reset, tăng tokenVersion (thiếu = 0)', async () => {
      await expect(service.updatePassword({ id: USER_ID }, 'NewPassword1')).resolves.toBe(1);
      await expect(service.updatePassword({ id: USER_ID, tokenVersion: 4 }, 'NewPassword1')).resolves.toBe(5);

      const { where, data } = user.update.mock.calls[0][0];
      expect(where).toEqual({ id: USER_ID });
      expect(data).toMatchObject({ resetPasswordToken: null, resetPasswordExp: null, tokenVersion: 1 });
      await expect(bcrypt.compare('NewPassword1', data.password)).resolves.toBe(true);
    });
  });
});
