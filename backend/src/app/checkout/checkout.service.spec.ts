import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, PromotionType, Role } from '@prisma/client';
import { makeSaleVariant } from '../../../test/factories/sale-variant.factory';
import type { UserInfo } from '../../common/decorators/user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddressesService } from '../addresses/addresses.service';
import { CartsService } from '../carts/carts.service';
import { OrderNotificationService } from '../orders/order-notification.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { ProductVariantsService } from '../product-variants/product-variants.service';
import { PromotionsService } from '../promotions/promotions.service';
import { ShippingZonesService } from '../shipping-zones/shipping-zones.service';
import { CheckoutService } from './checkout.service';

const user: UserInfo = { userID: 'u1', userEmail: 'khach@x.com', role: Role.customer };
const ADDRESS_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

const address = {
  id: ADDRESS_ID,
  userID: 'u1',
  fullName: 'Nguyễn An',
  phone: '0901234567',
  province: 'Hồ Chí Minh',
  district: null,
  ward: 'Phường Bến Nghé',
  street: '1 Lê Lợi',
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const zone = {
  id: 'z1',
  name: 'Nội thành HCM',
  baseFee: 30_000,
  baseWeightKg: 5,
  feePerKg: 5_000,
  bulkySurcharge: 0,
  freeShipThreshold: null,
  estimatedDays: 2,
};

// 2 × đèn 1.5tr (2kg, có sẵn) + 1 × sofa đặt làm 12tr (hết kho, cần lắp 500k, sản xuất 14 ngày)
const lamp = makeSaleVariant({ id: 'v-lamp', productID: 'p-lamp', sku: 'DEN-1', name: 'Đèn bàn', price: 1_500_000, stock: 5, weightKg: 2 });
const sofa = makeSaleVariant(
  { id: 'v-sofa', productID: 'p-sofa', sku: 'SOFA-1', name: 'Sofa 3 chỗ', price: 12_000_000, stock: 0, weightKg: 3 },
  { name: 'Sofa Japandi', allowBackorder: true, requiresAssembly: true, assemblyFee: 500_000, leadTimeDays: 14 },
);
const cartItems = [
  { variantID: 'v-lamp', quantity: 2, addedAt: new Date() },
  { variantID: 'v-sofa', quantity: 1, addedAt: new Date() },
];

const promotion = {
  id: 'promo1',
  code: 'WELCOME10',
  name: 'Chào bạn mới',
  type: PromotionType.percentage,
  value: 10,
  maxDiscount: 500_000,
  usageLimit: 100,
  perUserLimit: 1,
};

describe('CheckoutService', () => {
  let service: CheckoutService;
  let transaction: jest.Mock;
  const tx = { tx: true };
  const deps = {
    carts: { getItems: jest.fn(), clear: jest.fn() },
    addresses: { findOwned: jest.fn() },
    variants: { findForSale: jest.fn(), reserveStock: jest.fn() },
    zones: { findForProvince: jest.fn() },
    promotions: { findApplicable: jest.fn(), consume: jest.fn() },
    orders: { createInTx: jest.fn(), countPromotionUsage: jest.fn() },
    payments: { assertTransferAvailable: jest.fn(), transferInfo: jest.fn() },
    notifications: { orderPlaced: jest.fn() },
  };

  beforeEach(() => {
    jest.resetAllMocks(); // xóa cả implementation / hàng đợi "Once" của test trước
    transaction = jest.fn((fn: (t: unknown) => unknown) => fn(tx));
    deps.carts.getItems.mockResolvedValue(cartItems);
    deps.addresses.findOwned.mockResolvedValue(address);
    deps.variants.findForSale.mockResolvedValue([lamp, sofa]);
    deps.zones.findForProvince.mockResolvedValue(zone);
    deps.promotions.findApplicable.mockResolvedValue(promotion);
    deps.orders.createInTx.mockImplementation((_tx, data) => Promise.resolve({ id: 'o1', orderNumber: 'HD261113-ABCDEF', ...data }));

    service = new CheckoutService(
      { $transaction: transaction } as unknown as PrismaService,
      deps.carts as unknown as CartsService,
      deps.addresses as unknown as AddressesService,
      deps.variants as unknown as ProductVariantsService,
      deps.zones as unknown as ShippingZonesService,
      deps.promotions as unknown as PromotionsService,
      deps.orders as unknown as OrdersService,
      deps.payments as unknown as PaymentsService,
      deps.notifications as unknown as OrderNotificationService,
    );
  });

  const expectNoWrites = () => {
    expect(deps.variants.reserveStock).not.toHaveBeenCalled();
    expect(deps.promotions.consume).not.toHaveBeenCalled();
    expect(deps.orders.createInTx).not.toHaveBeenCalled();
    expect(deps.carts.clear).not.toHaveBeenCalled();
  };

  // subtotal = 3.000.000 + 12.000.000; 2×2 + 3 = 7kg → 2kg thêm → ship 40.000
  const SUBTOTAL = 15_000_000;
  const SHIPPING = 40_000;

  describe('preview', () => {
    it('tính tiền ở server, KHÔNG ghi DB, không mở transaction', async () => {
      const result = await service.preview(user, { addressID: ADDRESS_ID, withAssembly: true });

      expect(result).toMatchObject({
        subtotal: SUBTOTAL,
        shippingFee: SHIPPING,
        assemblyFee: 500_000,
        discount: 0,
        total: SUBTOTAL + SHIPPING + 500_000,
        promotion: null,
        shippingZone: { name: 'Nội thành HCM', estimatedDays: 2 },
      });
      expect(result.items).toEqual([
        expect.objectContaining({ sku: 'DEN-1', unitPrice: 1_500_000, quantity: 2, lineTotal: 3_000_000, madeToOrder: false }),
        expect.objectContaining({ sku: 'SOFA-1', name: 'Sofa Japandi', assemblyFee: 500_000, madeToOrder: true }),
      ]);
      expect(result.shippingAddress).not.toHaveProperty('id');
      expect(result.shippingAddress).not.toHaveProperty('userID');
      expect(transaction).not.toHaveBeenCalled();
      expectNoWrites();
    });

    it('ngày giao dự kiến cộng thời gian sản xuất của hàng đặt làm', async () => {
      const before = Date.now();
      const { expectedDeliveryAt } = await service.preview(user, { addressID: ADDRESS_ID, withAssembly: false });
      const days = Math.round((expectedDeliveryAt.getTime() - before) / 86_400_000);
      expect(days).toBe(2 + 14);
    });

    it('có mã giảm giá: kiểm tra mã với subtotal, đếm lượt dùng của CHÍNH user', async () => {
      const result = await service.preview(user, { addressID: ADDRESS_ID, withAssembly: false, promotionCode: 'WELCOME10' });

      expect(result.discount).toBe(500_000); // 10% của 15tr = 1.5tr, trần 500k
      expect(result.total).toBe(SUBTOTAL + SHIPPING - 500_000);
      expect(result.promotion).toEqual({ code: 'WELCOME10', name: 'Chào bạn mới', type: 'percentage' });

      const [code, ctx] = deps.promotions.findApplicable.mock.calls[0];
      expect(code).toBe('WELCOME10');
      expect(ctx.subtotal).toBe(SUBTOTAL);
      await ctx.countUserUsage('promo1');
      expect(deps.orders.countPromotionUsage).toHaveBeenCalledWith('u1', 'promo1', expect.anything());
    });

    it('mã free_shipping: giảm đúng bằng phí ship, đơn vẫn ghi phí ship thật', async () => {
      deps.promotions.findApplicable.mockResolvedValue({ ...promotion, type: PromotionType.free_shipping, value: 0, maxDiscount: null });
      const result = await service.preview(user, { addressID: ADDRESS_ID, withAssembly: false, promotionCode: 'FREESHIP' });
      expect(result).toMatchObject({ shippingFee: SHIPPING, discount: SHIPPING, total: SUBTOTAL });
    });

    it('giỏ trống → 400', async () => {
      deps.carts.getItems.mockResolvedValue([]);
      await expect(service.preview(user, { addressID: ADDRESS_ID, withAssembly: false })).rejects.toThrow(
        new BadRequestException('Giỏ hàng trống'),
      );
    });

    it('địa chỉ không thuộc user → 404 (tìm theo cả userID trong token)', async () => {
      deps.addresses.findOwned.mockResolvedValue(null);
      await expect(service.preview(user, { addressID: ADDRESS_ID, withAssembly: false })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(deps.addresses.findOwned).toHaveBeenCalledWith('u1', ADDRESS_ID, expect.anything());
    });

    it('tỉnh chưa có vùng giao hàng → lỗi từ ShippingZonesService', async () => {
      deps.zones.findForProvince.mockRejectedValue(new BadRequestException('Chưa hỗ trợ giao hàng tới Hồ Chí Minh'));
      await expect(service.preview(user, { addressID: ADDRESS_ID, withAssembly: false })).rejects.toThrow(/Chưa hỗ trợ/);
    });
  });

  describe('checkout', () => {
    const dto = { addressID: ADDRESS_ID, withAssembly: true, promotionCode: 'WELCOME10', paymentMethod: 'cod' as const, note: 'Gọi trước khi giao' };

    it('mọi bước đọc / ghi chạy trong CÙNG 1 transaction', async () => {
      await service.checkout(user, dto);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(deps.carts.getItems).toHaveBeenCalledWith('u1', tx);
      expect(deps.variants.findForSale).toHaveBeenCalledWith(['v-lamp', 'v-sofa'], tx);
      expect(deps.variants.reserveStock).toHaveBeenCalledWith(expect.any(Array), tx);
      expect(deps.promotions.consume).toHaveBeenCalledWith(promotion, tx);
      expect(deps.carts.clear).toHaveBeenCalledWith('u1', tx);
    });

    it('chỉ trừ kho dòng có sẵn hàng (hàng đặt làm không trừ)', async () => {
      await service.checkout(user, dto);
      expect(deps.variants.reserveStock.mock.calls[0][0]).toEqual([{ variantID: 'v-lamp', quantity: 2, name: 'Đèn bàn' }]);
    });

    it('thứ tự: trừ kho → tăng lượt mã → tạo đơn → xóa giỏ', async () => {
      await service.checkout(user, dto);
      const order = [
        deps.variants.reserveStock.mock.invocationCallOrder[0],
        deps.promotions.consume.mock.invocationCallOrder[0],
        deps.orders.createInTx.mock.invocationCallOrder[0],
        deps.carts.clear.mock.invocationCallOrder[0],
      ];
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    });

    it('đơn là snapshot: tên, sku, giá, ảnh, địa chỉ, tiền tại lúc đặt', async () => {
      const { order, payment } = await service.checkout(user, dto);

      expect(payment).toBeNull(); // COD: không cần thông tin chuyển khoản
      const [, data, changedBy] = deps.orders.createInTx.mock.calls[0];
      expect(changedBy).toBe('khach@x.com');
      expect(data).toMatchObject({
        userID: 'u1',
        paymentMethod: 'cod',
        note: 'Gọi trước khi giao',
        subtotal: SUBTOTAL,
        shippingFee: SHIPPING,
        assemblyFee: 500_000,
        discount: 500_000,
        total: SUBTOTAL + SHIPPING + 500_000 - 500_000,
        promotionCode: 'WELCOME10',
        promotionID: 'promo1',
        shippingAddress: {
          fullName: 'Nguyễn An',
          phone: '0901234567',
          province: 'Hồ Chí Minh',
          district: null,
          ward: 'Phường Bến Nghé',
          street: '1 Lê Lợi',
        },
      });
      expect(data.items).toEqual([
        {
          productID: 'p-lamp', variantID: 'v-lamp', name: 'Sofa Japandi', variantName: 'Đèn bàn', sku: 'DEN-1',
          imageUrl: 'https://cdn/p1.jpg', unitPrice: 1_500_000, quantity: 2, lineTotal: 3_000_000, assemblyFee: 0, stockReserved: true,
        },
        expect.objectContaining({ variantID: 'v-sofa', sku: 'SOFA-1', assemblyFee: 500_000, stockReserved: false }),
      ]);
      expect(order).toMatchObject({ id: 'o1' });
    });

    it('không có mã thì không đụng tới promotions', async () => {
      await service.checkout(user, { ...dto, promotionCode: undefined });
      expect(deps.promotions.findApplicable).not.toHaveBeenCalled();
      expect(deps.promotions.consume).not.toHaveBeenCalled();
      expect(deps.orders.createInTx.mock.calls[0][1]).toMatchObject({ discount: 0, promotionID: undefined });
    });

    it('trừ kho thất bại (người khác vừa mua hết) → 409, không tạo đơn, không xóa giỏ', async () => {
      deps.variants.reserveStock.mockRejectedValue(new ConflictException('"Đèn bàn" không đủ hàng'));
      await expect(service.checkout(user, dto)).rejects.toBeInstanceOf(ConflictException);
      expect(deps.orders.createInTx).not.toHaveBeenCalled();
      expect(deps.carts.clear).not.toHaveBeenCalled();
    });

    it('mã vừa hết lượt → 409, không tạo đơn', async () => {
      deps.promotions.consume.mockRejectedValue(new ConflictException('Mã giảm giá vừa hết lượt sử dụng'));
      await expect(service.checkout(user, dto)).rejects.toBeInstanceOf(ConflictException);
      expect(deps.orders.createInTx).not.toHaveBeenCalled();
    });

    it('xung đột transaction (P2034, vd bấm đặt hàng 2 lần) → chạy lại toàn bộ; lần sau thấy giỏ trống → 400', async () => {
      const conflict = new Prisma.PrismaClientKnownRequestError('WriteConflict', { code: 'P2034', clientVersion: 't' });
      deps.carts.clear.mockRejectedValueOnce(conflict);
      deps.carts.getItems.mockResolvedValueOnce(cartItems).mockResolvedValueOnce([]);

      await expect(service.checkout(user, dto)).rejects.toThrow('Giỏ hàng trống');
      expect(transaction).toHaveBeenCalledTimes(2);
    });

    it('COD: không cần thông tin chuyển khoản; gửi email đặt hàng SAU khi tạo đơn', async () => {
      const { payment } = await service.checkout(user, dto);
      expect(payment).toBeNull();
      expect(deps.payments.assertTransferAvailable).not.toHaveBeenCalled();
      expect(deps.notifications.orderPlaced).toHaveBeenCalledWith('o1', null);
      expect(deps.notifications.orderPlaced.mock.invocationCallOrder[0]).toBeGreaterThan(
        deps.carts.clear.mock.invocationCallOrder[0],
      );
    });

    it('chuyển khoản: trả thông tin chuyển khoản + QR, email kèm thông tin đó', async () => {
      const transfer = { content: 'HD261113ABCDEF', qrUrl: 'https://vietqr.app/img?x' };
      deps.payments.transferInfo.mockReturnValue(transfer);

      const { order, payment } = await service.checkout(user, { ...dto, paymentMethod: 'bank_transfer' });

      expect(deps.payments.transferInfo).toHaveBeenCalledWith(order);
      expect(payment).toBe(transfer);
      expect(deps.notifications.orderPlaced).toHaveBeenCalledWith('o1', transfer);
      expect(deps.orders.createInTx.mock.calls[0][1]).toMatchObject({ paymentMethod: 'bank_transfer' });
    });

    it('chuyển khoản khi shop chưa cấu hình SePay → lỗi TRƯỚC khi tạo đơn', async () => {
      deps.payments.assertTransferAvailable.mockImplementation(() => {
        throw new ServiceUnavailableException('Shop chưa hỗ trợ chuyển khoản');
      });
      await expect(service.checkout(user, { ...dto, paymentMethod: 'bank_transfer' })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(transaction).not.toHaveBeenCalled();
      expectNoWrites();
    });

    it('đặt hàng lỗi thì không gửi email', async () => {
      deps.variants.reserveStock.mockRejectedValue(new ConflictException('hết hàng'));
      await expect(service.checkout(user, dto)).rejects.toBeInstanceOf(ConflictException);
      expect(deps.notifications.orderPlaced).not.toHaveBeenCalled();
    });

    it('transaction được nới timeout (Atlas ở xa)', async () => {
      await service.checkout(user, dto);
      expect(transaction.mock.calls[0][1]).toMatchObject({ timeout: expect.any(Number) });
      expect(transaction.mock.calls[0][1].timeout).toBeGreaterThan(5_000);
    });
  });
});
