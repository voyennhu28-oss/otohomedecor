import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailUtilService } from '../../common/utils/mail-util/mail-util.service';
import { OrderNotificationService } from './order-notification.service';

const flush = () => new Promise((resolve) => setImmediate(resolve));

const storedOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 'o1',
  orderNumber: 'HD261113-7K3M9Q',
  items: [],
  subtotal: 100, shippingFee: 0, assemblyFee: 0, discount: 0, total: 100, promotionCode: null,
  shippingAddress: { fullName: 'Người Nhận', phone: '0901', province: 'Hà Nội', district: null, ward: 'P', street: 'S' },
  paymentMethod: PaymentMethod.cod,
  paymentStatus: PaymentStatus.pending,
  status: OrderStatus.confirmed,
  cancelReason: null,
  expectedDeliveryAt: null,
  user: { email: 'khach@x.com', fullName: 'Khách' },
  ...overrides,
});

describe('OrderNotificationService', () => {
  let service: OrderNotificationService;
  const findUnique = jest.fn();
  const mail = { send: jest.fn() };
  let logError: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    findUnique.mockResolvedValue(storedOrder());
    mail.send.mockResolvedValue(undefined);
    service = new OrderNotificationService(
      { order: { findUnique } } as unknown as PrismaService,
      mail as unknown as MailUtilService,
      { get: () => 'https://shop.vn, https://admin.shop.vn' } as unknown as ConfigService,
    );
  });

  afterEach(() => logError.mockRestore());

  it('statusChanged: gửi tới email tài khoản, chào theo tên người nhận, link FE_URL đầu tiên', async () => {
    service.statusChanged('o1');
    await flush();

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'o1' },
      include: { user: { select: { email: true, fullName: true } } },
    });
    const sent = mail.send.mock.calls[0][0];
    expect(sent).toMatchObject({ to: 'khach@x.com', subject: expect.stringContaining('đã được xác nhận') });
    expect(sent.html).toContain('Chào Người Nhận');
    expect(sent.html).toContain('https://shop.vn/orders/HD261113-7K3M9Q');
  });

  it('trạng thái không cần báo → không gửi', async () => {
    findUnique.mockResolvedValue(storedOrder({ status: OrderStatus.processing }));
    service.statusChanged('o1');
    await flush();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('orderPlaced: kèm thông tin chuyển khoản nếu có', async () => {
    findUnique.mockResolvedValue(storedOrder({ status: OrderStatus.pending, paymentMethod: PaymentMethod.bank_transfer }));
    service.orderPlaced('o1', {
      bank: 'VCB', accountNumber: '0123', accountName: null, amount: 100, content: 'HD2611137K3M9Q',
      qrUrl: 'https://vietqr.app/img?x=1', expiresAt: new Date(),
    });
    await flush();
    expect(mail.send.mock.calls[0][0].html).toContain('HD2611137K3M9Q');
  });

  it('chạy nền: trả về ngay, không chờ SMTP', () => {
    mail.send.mockReturnValue(new Promise(() => undefined));
    expect(service.statusChanged('o1')).toBeUndefined();
  });

  it('gửi lỗi / đọc đơn lỗi → chỉ ghi log, không ném ra ngoài', async () => {
    mail.send.mockRejectedValue(new Error('SMTP down'));
    service.statusChanged('o1');
    await flush();
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('o1'), expect.stringContaining('SMTP down'));

    findUnique.mockRejectedValue('db down');
    service.orderPlaced('o1');
    await flush();
    expect(logError).toHaveBeenLastCalledWith(expect.stringContaining('đặt hàng'), 'db down');
  });

  it('đơn không tồn tại → không gửi', async () => {
    findUnique.mockResolvedValue(null);
    service.statusChanged('o1');
    await flush();
    expect(mail.send).not.toHaveBeenCalled();
  });
});
