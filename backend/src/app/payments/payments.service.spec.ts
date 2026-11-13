import { BadRequestException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { createPrismaModelMock, PrismaModelMock } from '../../../test/mocks/prisma.mock';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderNotificationService } from '../orders/order-notification.service';
import { OrdersService } from '../orders/orders.service';
import { SepayWebhookDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

const ORDER_NUMBER = 'HD261113-7K3M9Q';
const ACCOUNT = '0123456789';

const sepayEnv: Record<string, unknown> = {
  SEPAY_BANK: 'VCB',
  SEPAY_ACCOUNT_NUMBER: ACCOUNT,
  SEPAY_ACCOUNT_NAME: 'HOME DECOR',
  ORDER_UNPAID_TIMEOUT_MINUTES: 30,
};

const payload = (overrides: Partial<SepayWebhookDto> = {}): SepayWebhookDto => ({
  id: 92704,
  gateway: 'Vietcombank',
  transactionDate: '2026-11-13 10:00:00',
  accountNumber: ACCOUNT,
  code: 'HD2611137K3M9Q',
  content: 'HD2611137K3M9Q chuyen tien',
  transferType: 'in',
  transferAmount: 1_000_000,
  accumulated: 0,
  subAccount: null,
  referenceCode: 'FT123',
  description: '',
  ...overrides,
});

const pendingOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 'o1',
  orderNumber: ORDER_NUMBER,
  status: OrderStatus.pending,
  paymentStatus: PaymentStatus.pending,
  paymentMethod: PaymentMethod.bank_transfer,
  total: 1_000_000,
  createdAt: new Date('2026-11-13T02:50:00Z'),
  ...overrides,
});

describe('PaymentsService', () => {
  let service: PaymentsService;
  let payment: PrismaModelMock;
  let transaction: jest.Mock;
  const orders = { findForPayment: jest.fn(), markPaid: jest.fn(), findMineByNumber: jest.fn() };
  const notifications = { statusChanged: jest.fn() };
  let logWarn: jest.SpyInstance;

  const build = (env: Record<string, unknown> = sepayEnv) => {
    payment = createPrismaModelMock();
    const prisma = { payment, extended: { payment } } as unknown as PrismaService;
    transaction = jest.fn((fn: (tx: unknown) => unknown) => fn(prisma));
    Object.assign(prisma, { $transaction: transaction });
    return new PaymentsService(
      prisma,
      orders as unknown as OrdersService,
      notifications as unknown as OrderNotificationService,
      { get: (key: string) => env[key] } as unknown as ConfigService,
    );
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    logWarn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    orders.findForPayment.mockResolvedValue(pendingOrder());
    orders.markPaid.mockResolvedValue({ order: { id: 'o1' }, confirmed: true });
    service = build();
  });

  afterEach(() => jest.restoreAllMocks());

  describe('webhook SePay', () => {
    it('đúng mã + đúng số tiền: lưu Payment "paid", đánh dấu đơn đã trả, gửi email — chung 1 transaction', async () => {
      await expect(service.handleSepayWebhook(payload())).resolves.toEqual({ outcome: 'paid', orderNumber: ORDER_NUMBER });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(orders.findForPayment).toHaveBeenCalledWith(ORDER_NUMBER, expect.anything());
      expect(payment.create).toHaveBeenCalledWith({
        data: {
          orderID: 'o1',
          method: 'bank_transfer',
          amount: 1_000_000,
          status: 'paid',
          transactionID: '92704',
          rawResponse: expect.objectContaining({ id: 92704, referenceCode: 'FT123' }),
        },
      });
      expect(orders.markPaid).toHaveBeenCalledWith(
        pendingOrder(),
        expect.anything(),
        { changedBy: 'sepay', note: 'Nhận chuyển khoản Vietcombank #92704' },
      );
      expect(notifications.statusChanged).toHaveBeenCalledWith('o1');
    });

    it('đơn đã qua bước xác nhận (COD chuyển khoản trước): đánh dấu đã trả nhưng không gửi email trạng thái', async () => {
      orders.markPaid.mockResolvedValue({ order: { id: 'o1' }, confirmed: false });
      await service.handleSepayWebhook(payload());
      expect(notifications.statusChanged).not.toHaveBeenCalled();
    });

    it('SePay không nhận diện được `code` → tìm mã đơn trong nội dung chuyển khoản', async () => {
      await service.handleSepayWebhook(payload({ code: null, content: 'MBVCB.1234.hd2611137k3m9q thanh toan' }));
      expect(orders.findForPayment).toHaveBeenCalledWith(ORDER_NUMBER, expect.anything());
    });

    it.each([
      ['sai số tiền', {}, { transferAmount: 999_000 }, 'amount_mismatch'],
      ['đơn đã trả rồi', { paymentStatus: PaymentStatus.paid, status: OrderStatus.confirmed }, {}, 'already_paid'],
      ['đơn đã hủy', { status: OrderStatus.cancelled }, {}, 'order_closed'],
    ])('%s → lưu Payment "failed", KHÔNG đổi đơn, cảnh báo admin', async (_name, order, body, outcome) => {
      orders.findForPayment.mockResolvedValue(pendingOrder(order));

      await expect(service.handleSepayWebhook(payload(body))).resolves.toEqual({ outcome, orderNumber: ORDER_NUMBER });

      expect(payment.create.mock.calls[0][0].data.status).toBe(PaymentStatus.failed);
      expect(orders.markPaid).not.toHaveBeenCalled();
      expect(notifications.statusChanged).not.toHaveBeenCalled();
      expect(logWarn).toHaveBeenCalledWith(expect.stringContaining('Cần admin xử lý'));
    });

    it('SePay gửi lại giao dịch đã xử lý (transactionID @unique → P2002) → "duplicate", không xử lý lại', async () => {
      payment.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 't' }));
      await expect(service.handleSepayWebhook(payload())).resolves.toEqual({ outcome: 'duplicate' });
      expect(orders.markPaid).not.toHaveBeenCalled();
      expect(notifications.statusChanged).not.toHaveBeenCalled();
    });

    it.each([
      ['tiền ra', { transferType: 'out' as const }, 'not_incoming'],
      ['tài khoản khác của shop', { accountNumber: '999' }, 'other_account'],
      ['không có mã đơn', { code: null, content: 'chuyen tien an trua' }, 'no_order_code'],
    ])('%s → bỏ qua, không mở transaction', async (_name, body, reason) => {
      await expect(service.handleSepayWebhook(payload(body))).resolves.toEqual({ outcome: 'ignored', reason });
      expect(transaction).not.toHaveBeenCalled();
    });

    it('mã đơn không tồn tại → bỏ qua, không lưu Payment', async () => {
      orders.findForPayment.mockResolvedValue(null);
      await expect(service.handleSepayWebhook(payload())).resolves.toEqual({ outcome: 'ignored', reason: 'order_not_found' });
      expect(payment.create).not.toHaveBeenCalled();
    });

    it('lỗi hệ thống (DB) → ném lỗi để controller trả 5xx và SePay gửi lại', async () => {
      orders.findForPayment.mockRejectedValue(new Error('db down'));
      await expect(service.handleSepayWebhook(payload())).rejects.toThrow('db down');
    });

    it('xung đột transaction (2 lần gửi trùng cùng lúc) → chạy lại; lần sau gặp P2002 → duplicate', async () => {
      payment.create
        .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 't' }))
        .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 't' }));
      await expect(service.handleSepayWebhook(payload())).resolves.toEqual({ outcome: 'duplicate' });
      expect(transaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('thông tin chuyển khoản', () => {
    it('transferInfo: đủ thông tin + QR, hạn = lúc đặt + 30 phút', () => {
      const info = service.transferInfo(pendingOrder());
      expect(info).toMatchObject({ bank: 'VCB', accountNumber: ACCOUNT, accountName: 'HOME DECOR', amount: 1_000_000, content: 'HD2611137K3M9Q' });
      expect(info.expiresAt.toISOString()).toBe('2026-11-13T03:20:00.000Z');
    });

    it('chưa cấu hình SEPAY_BANK / SEPAY_ACCOUNT_NUMBER → 503, không cho đặt đơn chuyển khoản', () => {
      const unconfigured = build({});
      expect(() => unconfigured.assertTransferAvailable()).toThrow(ServiceUnavailableException);
      expect(() => unconfigured.transferInfo(pendingOrder())).toThrow(ServiceUnavailableException);
      expect(() => service.assertTransferAvailable()).not.toThrow();
    });

    it('chưa cấu hình tài khoản thì webhook không lọc theo số tài khoản', async () => {
      const unconfigured = build({});
      orders.findForPayment.mockResolvedValue(pendingOrder());
      orders.markPaid.mockResolvedValue({ order: { id: 'o1' }, confirmed: true });
      await expect(unconfigured.handleSepayWebhook(payload({ accountNumber: '999' }))).resolves.toMatchObject({ outcome: 'paid' });
    });

    it('getMyTransferInfo: đơn chuyển khoản đang chờ tiền của chính user', async () => {
      orders.findMineByNumber.mockResolvedValue(pendingOrder());
      await expect(service.getMyTransferInfo('u1', ORDER_NUMBER)).resolves.toMatchObject({ content: 'HD2611137K3M9Q' });
      expect(orders.findMineByNumber).toHaveBeenCalledWith('u1', ORDER_NUMBER);
    });

    it.each([
      ['COD', { paymentMethod: PaymentMethod.cod }, /không thanh toán bằng chuyển khoản/],
      ['đã trả', { paymentStatus: PaymentStatus.paid }, /đã được thanh toán/],
      ['đã hủy', { status: OrderStatus.cancelled }, /không còn chờ thanh toán/],
    ])('getMyTransferInfo: đơn %s → 400', async (_name, overrides, message) => {
      orders.findMineByNumber.mockResolvedValue(pendingOrder(overrides));
      await expect(service.getMyTransferInfo('u1', ORDER_NUMBER)).rejects.toThrow(message);
      await expect(service.getMyTransferInfo('u1', ORDER_NUMBER)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('admin', () => {
    it('findList: lọc theo trạng thái + mã đơn (qua quan hệ order), count cùng where', async () => {
      payment.findMany.mockResolvedValue([]);
      payment.count.mockResolvedValue(3);
      const result = await service.findList({ status: PaymentStatus.failed, orderNumber: 'HD2611', page: 1, itemPerPage: 20 });

      const args = payment.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        status: 'failed',
        order: { is: { orderNumber: { contains: 'HD2611', mode: 'insensitive' } } },
      });
      expect(payment.count).toHaveBeenCalledWith({ where: args.where });
      expect(result).toMatchObject({ totalItems: 3, totalPages: 1 });
    });
  });
});
