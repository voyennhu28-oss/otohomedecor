import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, Role } from '@prisma/client';
import { createPrismaModelMock, PrismaModelMock } from '../../../test/mocks/prisma.mock';
import type { UserInfo } from '../../common/decorators/user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ExcelUtilService } from '../../common/utils/excel-util/excel-util.service';
import { OrderNotificationService } from './order-notification.service';
import { ProductVariantsService } from '../product-variants/product-variants.service';
import { ProductsService } from '../products/products.service';
import { PromotionsService } from '../promotions/promotions.service';
import { buildAdminOrderWhere, MAX_EXPORT_ORDERS, OrdersService } from './orders.service';

const customer: UserInfo = { userID: 'u1', userEmail: 'khach@x.com', role: Role.customer };
const admin: UserInfo = { userID: 'a1', userEmail: 'admin@x.com', role: Role.admin };
const ORDER_NUMBER = 'HD261113-ABCDEF';

const items = [
  { productID: 'p1', variantID: 'v1', quantity: 2, stockReserved: true, sku: 'A' },
  { productID: 'p2', variantID: 'v2', quantity: 1, stockReserved: false, sku: 'B' }, // hàng đặt làm
];

const storedOrder = (overrides: Record<string, unknown> = {}) => ({
  status: OrderStatus.pending,
  items,
  promotionID: 'promo1',
  paymentMethod: PaymentMethod.cod,
  paymentStatus: PaymentStatus.pending,
  ...overrides,
});

describe('OrdersService', () => {
  let service: OrdersService;
  let order: PrismaModelMock & { aggregate: jest.Mock };
  let transaction: jest.Mock;
  const variants = { restoreStock: jest.fn() };
  const products = { addSoldCount: jest.fn() };
  const promotions = { release: jest.fn() };
  const excel = { generateExcel: jest.fn().mockReturnValue('workbook') };
  const notifications = { statusChanged: jest.fn(), orderPlaced: jest.fn() };
  const config = { get: (key: string) => (key === 'ORDER_UNPAID_TIMEOUT_MINUTES' ? 30 : undefined) };

  beforeEach(() => {
    jest.resetAllMocks(); // xóa cả implementation / hàng đợi "Once" của test trước
    excel.generateExcel.mockReturnValue('workbook');
    order =Object.assign(createPrismaModelMock(), { aggregate: jest.fn() });
    order.update.mockImplementation(({ data }) => Promise.resolve(data));
    const prisma = { order, extended: { order } } as unknown as PrismaService;
    transaction = jest.fn((fn: (tx: unknown) => unknown) => fn(prisma));
    Object.assign(prisma, { $transaction: transaction });
    service = new OrdersService(
      prisma,
      variants as unknown as ProductVariantsService,
      products as unknown as ProductsService,
      promotions as unknown as PromotionsService,
      excel as unknown as ExcelUtilService,
      notifications as unknown as OrderNotificationService,
      config as unknown as ConfigService,
    );
  });

  /** data của lần tx.order.update cuối cùng */
  const updated = () => order.update.mock.calls.at(-1)![0].data;

  describe('admin đổi trạng thái', () => {
    it('ghi lịch sử (ai đổi, ghi chú, thời điểm)', async () => {
      order.findUnique.mockResolvedValue(storedOrder());
      await service.updateStatus(admin, 'o1', { status: OrderStatus.confirmed, note: 'Đã gọi khách' });

      expect(updated()).toEqual({
        status: OrderStatus.confirmed,
        statusHistory: { push: { status: 'confirmed', note: 'Đã gọi khách', changedBy: 'admin@x.com', at: expect.any(Date) } },
      });
    });

    it('bước chuyển không hợp lệ → 400, không ghi gì', async () => {
      order.findUnique.mockResolvedValue(storedOrder({ status: OrderStatus.pending }));
      await expect(service.updateStatus(admin, 'o1', { status: OrderStatus.delivered })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(order.update).not.toHaveBeenCalled();
      expect(variants.restoreStock).not.toHaveBeenCalled();
    });

    it('đơn không tồn tại → 404', async () => {
      order.findUnique.mockResolvedValue(null);
      await expect(service.updateStatus(admin, 'x', { status: OrderStatus.confirmed })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('shipping: set shippedAt', async () => {
      order.findUnique.mockResolvedValue(storedOrder({ status: OrderStatus.processing }));
      await service.updateStatus(admin, 'o1', { status: OrderStatus.shipping });
      expect(updated().shippedAt).toBeInstanceOf(Date);
    });

    it('hủy: hoàn kho CHỈ dòng đã trừ kho, trả lượt mã, lưu lý do — trong cùng transaction', async () => {
      order.findUnique.mockResolvedValue(storedOrder({ status: OrderStatus.confirmed }));
      await service.updateStatus(admin, 'o1', { status: OrderStatus.cancelled, note: 'Khách đổi ý' });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(variants.restoreStock).toHaveBeenCalledWith([items[0]], expect.anything());
      expect(promotions.release).toHaveBeenCalledWith('promo1', expect.anything());
      expect(updated()).toMatchObject({ status: 'cancelled', cancelReason: 'Khách đổi ý', cancelledAt: expect.any(Date) });
      expect(updated().paymentStatus).toBeUndefined(); // chưa trả tiền
    });

    it('hủy đơn đã trả tiền → paymentStatus refunded; đơn không có mã thì không trả lượt', async () => {
      order.findUnique.mockResolvedValue(storedOrder({ paymentStatus: PaymentStatus.paid, promotionID: null }));
      await service.updateStatus(admin, 'o1', { status: OrderStatus.cancelled });
      expect(updated()).toMatchObject({ paymentStatus: PaymentStatus.refunded, cancelReason: null });
      expect(promotions.release).not.toHaveBeenCalled();
    });

    it('delivered: cộng soldCount; COD thì chuyển sang đã thu tiền', async () => {
      order.findUnique.mockResolvedValue(storedOrder({ status: OrderStatus.shipping }));
      await service.updateStatus(admin, 'o1', { status: OrderStatus.delivered });

      expect(products.addSoldCount).toHaveBeenCalledWith(items, expect.anything());
      expect(updated()).toMatchObject({ deliveredAt: expect.any(Date), paymentStatus: 'paid', paidAt: expect.any(Date) });
    });

    it('delivered đơn online đã trả tiền: không đổi paymentStatus / paidAt', async () => {
      order.findUnique.mockResolvedValue(
        storedOrder({ status: OrderStatus.shipping, paymentMethod: PaymentMethod.bank_transfer, paymentStatus: PaymentStatus.paid }),
      );
      await service.updateStatus(admin, 'o1', { status: OrderStatus.delivered });
      expect(updated().paymentStatus).toBeUndefined();
      expect(updated().paidAt).toBeUndefined();
    });

    it('returned: trừ lại soldCount, đã trả tiền → refunded, KHÔNG tự cộng kho', async () => {
      order.findUnique.mockResolvedValue(storedOrder({ status: OrderStatus.delivered, paymentStatus: PaymentStatus.paid }));
      await service.updateStatus(admin, 'o1', { status: OrderStatus.returned });

      expect(products.addSoldCount).toHaveBeenCalledWith(
        [{ productID: 'p1', quantity: -2 }, { productID: 'p2', quantity: -1 }],
        expect.anything(),
      );
      expect(updated().paymentStatus).toBe(PaymentStatus.refunded);
      expect(variants.restoreStock).not.toHaveBeenCalled();
    });

    it('2 admin cùng hủy: lần sau xung đột (P2034), chạy lại thấy đã hủy → 400, chỉ hoàn kho 1 lần', async () => {
      const conflict = new Prisma.PrismaClientKnownRequestError('WriteConflict', { code: 'P2034', clientVersion: 't' });
      order.findUnique
        .mockResolvedValueOnce(storedOrder())
        .mockResolvedValueOnce(storedOrder({ status: OrderStatus.cancelled }));
      order.update.mockRejectedValueOnce(conflict);

      await expect(service.updateStatus(admin, 'o1', { status: OrderStatus.cancelled })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(transaction).toHaveBeenCalledTimes(2);
      // lần 1 bị rollback cùng transaction; lần 2 không chạy tới bước hoàn kho
      expect(variants.restoreStock).toHaveBeenCalledTimes(1);
    });
  });

  describe('email sau khi đổi trạng thái', () => {
    it('gửi SAU khi transaction commit', async () => {
      order.findUnique.mockResolvedValue(storedOrder());
      order.update.mockImplementation(({ data }) => Promise.resolve({ id: 'o1', ...data }));
      await service.updateStatus(admin, 'o1', { status: OrderStatus.confirmed });
      expect(notifications.statusChanged).toHaveBeenCalledWith('o1');
      expect(notifications.statusChanged.mock.invocationCallOrder[0]).toBeGreaterThan(order.update.mock.invocationCallOrder[0]);
    });

    it('chuyển trạng thái thất bại thì không gửi', async () => {
      order.findUnique.mockResolvedValue(storedOrder({ status: OrderStatus.cancelled }));
      await expect(service.updateStatus(admin, 'o1', { status: OrderStatus.confirmed })).rejects.toThrow();
      expect(notifications.statusChanged).not.toHaveBeenCalled();
    });
  });

  describe('thanh toán chuyển khoản', () => {
    const paymentOrder = (overrides: Record<string, unknown> = {}) => ({
      id: 'o1',
      orderNumber: ORDER_NUMBER,
      status: OrderStatus.pending,
      paymentStatus: PaymentStatus.pending,
      paymentMethod: PaymentMethod.bank_transfer,
      total: 1_000_000,
      createdAt: new Date(),
      ...overrides,
    });

    it('findForPayment: tìm theo mã đơn, trong tx được truyền vào', async () => {
      const tx = { order: { findUnique: jest.fn().mockResolvedValue(paymentOrder()) } };
      await service.findForPayment(ORDER_NUMBER, tx as never);
      expect(tx.order.findUnique.mock.calls[0][0].where).toEqual({ orderNumber: ORDER_NUMBER });
    });

    it('markPaid: đơn chờ xác nhận → đã trả tiền + "Đã xác nhận" + ghi lịch sử', async () => {
      const result = await service.markPaid({ id: 'o1', status: OrderStatus.pending }, { order } as never, {
        changedBy: 'sepay',
        note: 'Nhận chuyển khoản #1',
      });
      expect(result.confirmed).toBe(true);
      expect(updated()).toEqual({
        paymentStatus: 'paid',
        paidAt: expect.any(Date),
        status: 'confirmed',
        statusHistory: { push: { status: 'confirmed', note: 'Nhận chuyển khoản #1', changedBy: 'sepay', at: expect.any(Date) } },
      });
    });

    it('markPaid: đơn đã qua bước xác nhận → chỉ đổi trạng thái thanh toán', async () => {
      const result = await service.markPaid({ id: 'o1', status: OrderStatus.processing }, { order } as never, {
        changedBy: 'sepay',
      });
      expect(result.confirmed).toBe(false);
      expect(updated()).toEqual({ paymentStatus: 'paid', paidAt: expect.any(Date) });
    });

    it('markPaidManually: admin xác nhận đã nhận tiền → gửi email "đã xác nhận"', async () => {
      order.findUnique.mockResolvedValue(paymentOrder());
      order.update.mockImplementation(({ data }) => Promise.resolve({ id: 'o1', ...data }));

      await service.markPaidManually(admin, 'o1');

      expect(updated()).toMatchObject({
        paymentStatus: 'paid',
        statusHistory: { push: expect.objectContaining({ changedBy: 'admin@x.com', note: 'Admin xác nhận đã nhận tiền' }) },
      });
      expect(notifications.statusChanged).toHaveBeenCalledWith('o1');
    });

    it.each([
      ['đã trả tiền', { paymentStatus: PaymentStatus.paid }, /đã được thanh toán/],
      ['đã hủy', { status: OrderStatus.cancelled }, /đã hủy/],
    ])('markPaidManually: đơn %s → 400', async (_name, overrides, message) => {
      order.findUnique.mockResolvedValue(paymentOrder(overrides));
      await expect(service.markPaidManually(admin, 'o1')).rejects.toThrow(message);
      expect(order.update).not.toHaveBeenCalled();
    });

    it('markPaidManually: không có đơn → 404', async () => {
      order.findUnique.mockResolvedValue(null);
      await expect(service.markPaidManually(admin, 'x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('cron: hủy đơn chuyển khoản quá hạn', () => {
    const now = new Date('2026-11-13T10:00:00Z');

    it('chỉ lấy đơn bank_transfer đang chờ, chưa trả tiền, tạo trước hạn 30 phút', async () => {
      order.findMany.mockResolvedValue([]);
      await expect(service.cancelExpiredUnpaid(now)).resolves.toBe(0);
      expect(order.findMany.mock.calls[0][0]).toMatchObject({
        where: {
          paymentMethod: 'bank_transfer',
          status: 'pending',
          paymentStatus: 'pending',
          createdAt: { lt: new Date('2026-11-13T09:30:00Z') },
        },
        take: 100,
      });
    });

    it('hủy từng đơn: hoàn kho, ghi "system"; đơn vừa được thanh toán thì bỏ qua', async () => {
      order.findMany.mockResolvedValue([
        { id: 'o1', orderNumber: 'A' },
        { id: 'o2', orderNumber: 'B' },
      ]);
      order.findUnique
        .mockResolvedValueOnce(storedOrder()) // o1: vẫn chờ tiền
        .mockResolvedValueOnce(storedOrder({ status: OrderStatus.confirmed, paymentStatus: PaymentStatus.paid })); // o2: tiền vừa về

      await expect(service.cancelExpiredUnpaid(now)).resolves.toBe(1);

      expect(order.update).toHaveBeenCalledTimes(1);
      expect(updated()).toMatchObject({
        status: 'cancelled',
        cancelReason: expect.stringContaining('30 phút'),
        statusHistory: { push: expect.objectContaining({ changedBy: 'system' }) },
      });
      expect(variants.restoreStock).toHaveBeenCalledTimes(1);
    });

    it('đơn đã trả tiền nhưng vẫn pending (hiếm) cũng không bị hủy', async () => {
      order.findMany.mockResolvedValue([{ id: 'o1', orderNumber: 'A' }]);
      order.findUnique.mockResolvedValue(storedOrder({ paymentStatus: PaymentStatus.paid }));
      await expect(service.cancelExpiredUnpaid(now)).resolves.toBe(0);
      expect(order.update).not.toHaveBeenCalled();
    });

    it('lỗi hệ thống ở 1 đơn: ghi log, vẫn xử lý các đơn khác', async () => {
      const logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      order.findMany.mockResolvedValue([
        { id: 'o1', orderNumber: 'A' },
        { id: 'o2', orderNumber: 'B' },
      ]);
      order.findUnique.mockRejectedValueOnce(new Error('db down')).mockResolvedValueOnce(storedOrder());

      await expect(service.cancelExpiredUnpaid(now)).resolves.toBe(1);
      expect(logError).toHaveBeenCalledWith(expect.stringContaining('A'), expect.anything());
      logError.mockRestore();
    });
  });

  describe('đơn của tôi', () => {
    it('findMine: lọc theo userID trong token + trạng thái, phân trang', async () => {
      order.findMany.mockResolvedValue([]);
      order.count.mockResolvedValue(11);
      const result = await service.findMine('u1', { status: OrderStatus.pending, page: 2, itemPerPage: 10 });

      const args = order.findMany.mock.calls[0][0];
      expect(args).toMatchObject({ where: { userID: 'u1', status: 'pending' }, skip: 10, take: 10 });
      expect(order.count).toHaveBeenCalledWith({ where: args.where });
      expect(result).toEqual({ list: [], totalItems: 11, totalPages: 2 });
    });

    it('findMineByNumber: tìm theo mã đơn VÀ userID; đơn người khác → 404', async () => {
      order.findFirst.mockResolvedValue(null);
      await expect(service.findMineByNumber('u1', ORDER_NUMBER)).rejects.toBeInstanceOf(NotFoundException);
      expect(order.findFirst).toHaveBeenCalledWith({ where: { orderNumber: ORDER_NUMBER, userID: 'u1' } });
    });

    it('cancelMine: đơn pending → hủy, người đổi là email của khách', async () => {
      order.findFirst.mockResolvedValue({ id: 'o1' });
      order.findUnique.mockResolvedValue(storedOrder());
      await service.cancelMine(customer, ORDER_NUMBER, 'Đặt nhầm');

      expect(updated()).toMatchObject({
        status: 'cancelled',
        cancelReason: 'Đặt nhầm',
        statusHistory: { push: expect.objectContaining({ changedBy: 'khach@x.com' }) },
      });
      expect(variants.restoreStock).toHaveBeenCalled();
    });

    it('cancelMine: đơn đã xác nhận → 400 (khách không tự hủy được, admin thì được)', async () => {
      order.findFirst.mockResolvedValue({ id: 'o1' });
      order.findUnique.mockResolvedValue(storedOrder({ status: OrderStatus.confirmed }));
      await expect(service.cancelMine(customer, ORDER_NUMBER)).rejects.toThrow(/không thể tự hủy/);
      expect(variants.restoreStock).not.toHaveBeenCalled();
    });
  });

  describe('admin: danh sách / chi tiết / export', () => {
    it('buildAdminOrderWhere: đủ các bộ lọc, email lọc qua quan hệ user', () => {
      const from = new Date('2026-11-01T00:00:00+07:00');
      const to = new Date('2026-11-30T23:59:59.999+07:00');
      expect(
        buildAdminOrderWhere({
          status: OrderStatus.pending,
          paymentMethod: PaymentMethod.cod,
          paymentStatus: PaymentStatus.pending,
          from,
          to,
          orderNumber: 'abc',
          email: 'an@',
        }),
      ).toEqual({
        status: 'pending',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        createdAt: { gte: from, lte: to },
        orderNumber: { contains: 'abc', mode: 'insensitive' },
        user: { is: { email: { contains: 'an@', mode: 'insensitive' } } },
      });
      expect(buildAdminOrderWhere({})).toEqual({});
      expect(buildAdminOrderWhere({ from })).toEqual({ createdAt: { gte: from } });
    });

    it('findAdminList: kèm thông tin khách, count cùng where', async () => {
      order.findMany.mockResolvedValue([]);
      order.count.mockResolvedValue(0);
      await service.findAdminList({ page: 1, itemPerPage: 20, status: OrderStatus.shipping });
      const args = order.findMany.mock.calls[0][0];
      expect(args.include.user.select).toMatchObject({ email: true, fullName: true });
      expect(order.count).toHaveBeenCalledWith({ where: args.where });
    });

    it('findAdminByID: 404 khi không có', async () => {
      order.findUnique.mockResolvedValueOnce({ id: 'o1' }).mockResolvedValueOnce(null);
      await expect(service.findAdminByID('o1')).resolves.toEqual({ id: 'o1' });
      await expect(service.findAdminByID('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('exportExcel: mỗi đơn 1 dòng, có header kể cả khi không có đơn', async () => {
      order.findMany.mockResolvedValue([
        {
          orderNumber: ORDER_NUMBER,
          createdAt: new Date('2026-11-13T03:00:00Z'),
          status: OrderStatus.pending,
          user: { email: 'an@x.com', fullName: 'An' },
          shippingAddress: { fullName: 'An', phone: '0901', province: 'Hà Nội', district: null, ward: 'P. X', street: '1 Y' },
          items: [{ sku: 'A', quantity: 2 }, { sku: 'B', quantity: 1 }],
          subtotal: 100, shippingFee: 10, assemblyFee: 0, discount: 0, total: 110,
          promotionCode: null, paymentMethod: 'cod', paymentStatus: 'pending', note: null,
        },
      ]);

      await expect(service.exportExcel({})).resolves.toBe('workbook');
      const sheet = excel.generateExcel.mock.calls[0][0].worksheets[0];
      expect(sheet.fieldsExtend).toContain('orderNumber');
      expect(sheet.data[0]).toMatchObject({
        orderNumber: ORDER_NUMBER,
        status: 'Chờ xác nhận',
        customerEmail: 'an@x.com',
        address: '1 Y, P. X, Hà Nội',
        items: 'A x2; B x1',
        total: 110,
        promotionCode: '',
      });
    });

    it(`exportExcel: quá ${MAX_EXPORT_ORDERS} đơn → 400`, async () => {
      order.findMany.mockResolvedValue(new Array(MAX_EXPORT_ORDERS + 1).fill({}));
      await expect(service.exportExcel({})).rejects.toThrow(/lọc theo khoảng ngày/);
    });
  });

  describe('dùng cho checkout / users', () => {
    it('createInTx: sinh mã đơn, trạng thái pending và dòng lịch sử đầu tiên', async () => {
      const tx = { order: { create: jest.fn(({ data }) => data) } };
      const created = await service.createInTx(tx as never, { userID: 'u1' } as never, 'khach@x.com');
      expect(created).toMatchObject({
        userID: 'u1',
        orderNumber: expect.stringMatching(/^HD\d{6}-/),
        status: 'pending',
        paymentStatus: 'pending',
        statusHistory: [{ status: 'pending', changedBy: 'khach@x.com', at: expect.any(Date) }],
      });
    });

    it('countPromotionUsage: chỉ đếm đơn CHƯA hủy của user', async () => {
      order.count.mockResolvedValue(1);
      await expect(service.countPromotionUsage('u1', 'promo1')).resolves.toBe(1);
      expect(order.count).toHaveBeenCalledWith({
        where: { userID: 'u1', promotionID: 'promo1', status: { not: 'cancelled' } },
      });
    });

    it('totalSpent: chỉ đơn đã giao; chưa có đơn → 0', async () => {
      order.aggregate.mockResolvedValueOnce({ _sum: { total: 5_000 } }).mockResolvedValueOnce({ _sum: { total: null } });
      await expect(service.totalSpent('u1')).resolves.toBe(5_000);
      await expect(service.totalSpent('u1')).resolves.toBe(0);
      expect(order.aggregate.mock.calls[0][0].where).toEqual({ userID: 'u1', status: 'delivered' });
    });
  });
});
