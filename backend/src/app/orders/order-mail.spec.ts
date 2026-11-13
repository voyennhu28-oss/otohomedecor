import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import type { TransferInfo } from '../payments/sepay.util';
import { buildOrderPlacedEmail, buildStatusEmail, MailOrder } from './order-mail';

const order = (overrides: Partial<MailOrder> = {}): MailOrder => ({
  orderNumber: 'HD261113-7K3M9Q',
  items: [
    {
      productID: 'p1', variantID: 'v1', name: 'Sofa <b>Japandi</b>', variantName: '3 chỗ', sku: 'SOFA-3',
      imageUrl: null, unitPrice: 12_000_000, quantity: 1, lineTotal: 12_000_000, assemblyFee: 0, stockReserved: true,
    },
  ],
  subtotal: 12_000_000,
  shippingFee: 50_000,
  assemblyFee: 300_000,
  discount: 500_000,
  total: 11_850_000,
  promotionCode: 'WELCOME10',
  shippingAddress: { fullName: 'Nguyễn An', phone: '0901234567', province: 'Hà Nội', district: null, ward: 'Phường Hoàn Kiếm', street: '1 Tràng Tiền' },
  paymentMethod: PaymentMethod.cod,
  paymentStatus: PaymentStatus.pending,
  status: OrderStatus.pending,
  cancelReason: null,
  expectedDeliveryAt: new Date('2026-11-20T03:00:00Z'),
  ...overrides,
});

const ctx = { customerName: 'An <script>', orderUrl: 'https://shop.vn/orders/HD261113-7K3M9Q' };

const transfer: TransferInfo = {
  bank: 'VCB',
  accountNumber: '0123456789',
  accountName: 'HOME DECOR',
  amount: 11_850_000,
  content: 'HD2611137K3M9Q',
  qrUrl: 'https://vietqr.app/img?acc=0123456789&bank=VCB&amount=11850000&des=HD2611137K3M9Q',
  expiresAt: new Date('2026-11-13T03:30:00Z'),
};

describe('order-mail', () => {
  describe('buildOrderPlacedEmail', () => {
    it('COD: tiêu đề có mã đơn, đủ tiền, địa chỉ, link đơn; báo thanh toán khi nhận hàng', () => {
      const email = buildOrderPlacedEmail(order(), ctx, null);
      expect(email.subject).toBe('[Home Decor] Đặt hàng thành công #HD261113-7K3M9Q');
      expect(email.html).toContain('11.850.000đ');
      expect(email.html).toContain('Giảm giá (WELCOME10)');
      expect(email.html).toContain('Phí lắp đặt');
      expect(email.html).toContain('1 Tràng Tiền, Phường Hoàn Kiếm, Hà Nội');
      expect(email.html).toContain('href="https://shop.vn/orders/HD261113-7K3M9Q"');
      expect(email.html).toContain('COD');
      expect(email.text).toContain('Thanh toán khi nhận hàng');
    });

    it('chuyển khoản: có QR, số tài khoản, nội dung chuyển khoản, hạn thanh toán', () => {
      const email = buildOrderPlacedEmail(order({ paymentMethod: PaymentMethod.bank_transfer }), ctx, transfer);
      expect(email.html).toContain('<img src="https://vietqr.app/img?acc=0123456789&amp;bank=VCB');
      expect(email.html).toContain('0123456789');
      expect(email.html).toContain('HD2611137K3M9Q');
      expect(email.html).toContain('ĐÚNG nội dung');
      expect(email.text).toContain('Nội dung: HD2611137K3M9Q');
    });

    it('escape dữ liệu người dùng nhập (tên sản phẩm, tên khách)', () => {
      const { html } = buildOrderPlacedEmail(order(), ctx, null);
      expect(html).not.toContain('<b>Japandi</b>');
      expect(html).toContain('Sofa &lt;b&gt;Japandi&lt;/b&gt;');
      expect(html).not.toContain('<script>');
    });

    it('không có giảm giá / lắp đặt thì không hiện dòng đó', () => {
      const { html } = buildOrderPlacedEmail(order({ discount: 0, assemblyFee: 0, promotionCode: null }), ctx, null);
      expect(html).not.toContain('Giảm giá');
      expect(html).not.toContain('Phí lắp đặt');
    });
  });

  describe('buildStatusEmail', () => {
    it.each([
      [OrderStatus.confirmed, {}, 'Đơn hàng đã được xác nhận'],
      [OrderStatus.confirmed, { paymentMethod: PaymentMethod.bank_transfer, paymentStatus: PaymentStatus.paid }, 'Đã nhận thanh toán'],
      [OrderStatus.shipping, {}, 'Đơn hàng đang được giao'],
      [OrderStatus.delivered, {}, 'Giao hàng thành công'],
      [OrderStatus.cancelled, {}, 'Đơn hàng đã bị hủy'],
      [OrderStatus.returned, {}, 'Đã ghi nhận trả hàng'],
    ])('%s → "%s"', (status, overrides, title) => {
      const email = buildStatusEmail(order({ status, ...overrides }), ctx);
      expect(email?.subject).toBe(`[Home Decor] ${title} #HD261113-7K3M9Q`);
    });

    it('trạng thái không cần báo (pending, processing) → null', () => {
      expect(buildStatusEmail(order({ status: OrderStatus.pending }), ctx)).toBeNull();
      expect(buildStatusEmail(order({ status: OrderStatus.processing }), ctx)).toBeNull();
    });

    it('hủy: kèm lý do (đã escape); đã trả tiền thì báo hoàn tiền', () => {
      const email = buildStatusEmail(
        order({ status: OrderStatus.cancelled, cancelReason: 'Hết hàng <i>', paymentStatus: PaymentStatus.refunded }),
        ctx,
      );
      expect(email?.html).toContain('Lý do: Hết hàng &lt;i&gt;.');
      expect(email?.html).toContain('hoàn lại');
    });

    it('đang giao: kèm ngày dự kiến', () => {
      expect(buildStatusEmail(order({ status: OrderStatus.shipping }), ctx)?.text).toContain('20 tháng 11');
    });
  });
});
