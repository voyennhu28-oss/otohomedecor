import { OrderStatus, PaymentStatus } from '@prisma/client';
import { findOrderNumberInText } from '../orders/order-number';
import { createHmac } from 'node:crypto';
import { buildTransferInfo, evaluateTransfer, safeEqual, verifySepaySignature } from './sepay.util';

describe('sepay.util', () => {
  describe('buildTransferInfo', () => {
    const order = { orderNumber: 'HD261113-7K3M9Q', total: 1_250_000, createdAt: new Date('2026-11-13T03:00:00Z') };
    const info = buildTransferInfo({ bank: 'VCB', accountNumber: '0123456789', accountName: 'CONG TY HOME DECOR' }, order, 30);

    it('nội dung chuyển khoản = mã đơn bỏ dấu "-", đọc ngược lại được mã đơn', () => {
      expect(info.content).toBe('HD2611137K3M9Q');
      expect(findOrderNumberInText(info.content)).toBe(order.orderNumber);
    });

    it('QR VietQR có đủ tài khoản, ngân hàng, số tiền, nội dung', () => {
      const url = new URL(info.qrUrl);
      expect(url.origin + url.pathname).toBe('https://vietqr.app/img');
      expect(Object.fromEntries(url.searchParams)).toEqual({
        acc: '0123456789',
        bank: 'VCB',
        amount: '1250000',
        des: 'HD2611137K3M9Q',
        template: 'compact',
      });
    });

    it('số tiền = tổng đơn; hạn thanh toán = lúc đặt + timeout', () => {
      expect(info).toMatchObject({ amount: 1_250_000, bank: 'VCB', accountName: 'CONG TY HOME DECOR' });
      expect(info.expiresAt.toISOString()).toBe('2026-11-13T03:30:00.000Z');
    });
  });

  describe('evaluateTransfer', () => {
    const order = (overrides = {}) => ({ status: OrderStatus.pending, paymentStatus: PaymentStatus.pending, total: 500_000, ...overrides });

    it('đúng số tiền, đơn chưa trả → paid', () => {
      expect(evaluateTransfer(order(), 500_000)).toBe('paid');
      expect(evaluateTransfer(order({ status: OrderStatus.confirmed }), 500_000)).toBe('paid'); // COD khách chuyển khoản trước
    });

    it('thiếu hoặc thừa dù 1đ → amount_mismatch', () => {
      expect(evaluateTransfer(order(), 499_999)).toBe('amount_mismatch');
      expect(evaluateTransfer(order(), 500_001)).toBe('amount_mismatch');
    });

    it('đơn đã trả → already_paid (ưu tiên hơn sai số tiền)', () => {
      expect(evaluateTransfer(order({ paymentStatus: PaymentStatus.paid }), 1)).toBe('already_paid');
    });

    it('đơn đã hủy / trả hàng → order_closed', () => {
      expect(evaluateTransfer(order({ status: OrderStatus.cancelled }), 500_000)).toBe('order_closed');
      expect(evaluateTransfer(order({ status: OrderStatus.returned }), 500_000)).toBe('order_closed');
    });
  });

  describe('verifySepaySignature', () => {
    const secret = 'secret';
    const rawBody = Buffer.from('{"id":1,"content":"Thanh toán"}');
    const now = 1_763_000_000_000; // ms
    const timestamp = String(now / 1000);
    // Giá trị tính độc lập theo tài liệu SePay: HMAC-SHA256(secret, "<timestamp>.<raw body>"), hex
    const signature = `sha256=${createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex')}`;
    const check = (overrides: Partial<Parameters<typeof verifySepaySignature>[0]> = {}) =>
      verifySepaySignature({ rawBody, timestamp, signature, secret, now, ...overrides });

    it('đúng → ok (cả khi lệch giờ trong vòng 5 phút, 2 chiều)', () => {
      expect(check()).toBe('ok');
      expect(check({ now: now + 300_000 })).toBe('ok');
      expect(check({ now: now - 300_000 })).toBe('ok');
    });

    it('lệch quá 5 phút → expired', () => {
      expect(check({ now: now + 301_000 })).toBe('expired');
      expect(check({ now: now - 301_000 })).toBe('expired');
    });

    it('thiếu body / chữ ký / timestamp, timestamp không phải số → missing', () => {
      expect(check({ rawBody: undefined })).toBe('missing');
      expect(check({ signature: undefined })).toBe('missing');
      expect(check({ timestamp: undefined })).toBe('missing');
      expect(check({ timestamp: '17630abc' })).toBe('missing');
    });

    it('sai secret / body bị sửa / thiếu tiền tố "sha256=" → invalid', () => {
      expect(check({ secret: 'other' })).toBe('invalid');
      expect(check({ rawBody: Buffer.from('{"id":1,"content":"Thanh toan"}') })).toBe('invalid');
      expect(check({ signature: signature.replace('sha256=', '') })).toBe('invalid');
    });
  });

  it('safeEqual: so sánh đúng, kể cả 2 chuỗi khác độ dài', () => {
    expect(safeEqual('secret-key', 'secret-key')).toBe(true);
    expect(safeEqual('secret-key', 'secret-kez')).toBe(false);
    expect(safeEqual('a', 'a-much-longer-value')).toBe(false);
  });
});
