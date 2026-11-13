import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { makeSaleVariant } from '../../../test/factories/sale-variant.factory';
import { createPrismaModelMock, PrismaModelMock } from '../../../test/mocks/prisma.mock';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductVariantsService } from '../product-variants/product-variants.service';
import { CartsService } from './carts.service';
import { MAX_ITEMS_PER_CART, MAX_QUANTITY_PER_ITEM } from './dto/cart.dto';

const V1 = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const V2 = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const at = (iso: string) => new Date(iso);

describe('CartsService', () => {
  let service: CartsService;
  let cart: PrismaModelMock & { upsert: jest.Mock };
  let transaction: jest.Mock;
  let variants: { findForSale: jest.Mock };
  /** Giỏ "trong DB": upsert ghi vào đây, findUnique đọc ra. */
  let stored: { variantID: string; quantity: number; addedAt: Date }[];

  beforeEach(() => {
    stored = [];
    cart = Object.assign(createPrismaModelMock(), { upsert: jest.fn() });
    cart.findUnique.mockImplementation(() => Promise.resolve({ items: stored }));
    cart.upsert.mockImplementation(({ update }) => {
      stored = update.items.set;
      return Promise.resolve({});
    });
    const prisma = { cart, extended: { cart } } as unknown as PrismaService;
    transaction = jest.fn((fn: (tx: unknown) => unknown) => fn(prisma));
    Object.assign(prisma, { $transaction: transaction });
    variants = { findForSale: jest.fn().mockResolvedValue([makeSaleVariant({ id: V1, stock: 5, price: 1_000 })]) };
    service = new CartsService(prisma, variants as unknown as ProductVariantsService);
  });

  describe('getCart', () => {
    it('giỏ chưa tạo → giỏ rỗng, không thể checkout', async () => {
      cart.findUnique.mockResolvedValue(null);
      await expect(service.getCart('u1')).resolves.toEqual({ items: [], totalQuantity: 0, subtotal: 0, canCheckout: false });
    });

    it('giá / tồn kho lấy từ DB lúc xem; mới thêm hiện trước; subtotal chỉ tính dòng mua được', async () => {
      stored = [
        { variantID: V1, quantity: 2, addedAt: at('2026-11-01') },
        { variantID: V2, quantity: 1, addedAt: at('2026-11-02') },
        { variantID: 'deleted', quantity: 1, addedAt: at('2026-10-01') },
      ];
      variants.findForSale.mockResolvedValue([
        makeSaleVariant({ id: V1, price: 1_000, stock: 5 }),
        makeSaleVariant({ id: V2, price: 9_000, stock: 0 }),
      ]);

      const result = await service.getCart('u1');

      expect(result.items.map((i) => [i.variantID, i.status])).toEqual([
        [V2, 'out_of_stock'],
        [V1, 'available'],
        ['deleted', 'unavailable'],
      ]);
      expect(result.items[1]).toMatchObject({ lineTotal: 2_000, variant: { price: 1_000, stock: 5 }, product: { slug: 'sofa-japandi' } });
      expect(result.items[2]).toMatchObject({ product: null, variant: null, lineTotal: 0 });
      expect(result).toMatchObject({ subtotal: 2_000, totalQuantity: 2, canCheckout: false });
    });

    it('hàng đặt làm thiếu kho: vẫn mua được, kèm thời gian sản xuất', async () => {
      stored = [{ variantID: V1, quantity: 3, addedAt: new Date() }];
      variants.findForSale.mockResolvedValue([makeSaleVariant({ id: V1, stock: 0 }, { allowBackorder: true, leadTimeDays: 21 })]);
      const result = await service.getCart('u1');
      expect(result.items[0]).toMatchObject({ status: 'made_to_order', variant: { leadTimeDays: 21 } });
      expect(result.canCheckout).toBe(true);
    });
  });

  describe('addItem', () => {
    it('thêm mới vào giỏ (tạo giỏ nếu chưa có) trong transaction', async () => {
      const result = await service.addItem('u1', { variantID: V1, quantity: 2 });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(cart.upsert).toHaveBeenCalledWith({
        where: { userID: 'u1' },
        create: { userID: 'u1', items: [{ variantID: V1, quantity: 2, addedAt: expect.any(Date) }] },
        update: { items: { set: [{ variantID: V1, quantity: 2, addedAt: expect.any(Date) }] } },
      });
      expect(result.items).toHaveLength(1);
    });

    it('đã có trong giỏ → cộng dồn, giữ thời điểm thêm ban đầu', async () => {
      const addedAt = at('2026-11-01');
      stored = [{ variantID: V1, quantity: 2, addedAt }];
      await service.addItem('u1', { variantID: V1, quantity: 1 });
      expect(stored).toEqual([{ variantID: V1, quantity: 3, addedAt }]);
    });

    it('cộng dồn vượt tồn kho → 409 kèm số lượng còn', async () => {
      stored = [{ variantID: V1, quantity: 4, addedAt: new Date() }];
      await expect(service.addItem('u1', { variantID: V1, quantity: 2 })).rejects.toThrow(
        new ConflictException('"Sofa 3 chỗ - Xám" chỉ còn 5 sản phẩm'),
      );
      expect(cart.upsert).not.toHaveBeenCalled();
    });

    it('hết hàng → 409 "đã hết hàng"; hàng đặt làm thì vẫn thêm được', async () => {
      variants.findForSale.mockResolvedValue([makeSaleVariant({ id: V1, stock: 0 })]);
      await expect(service.addItem('u1', { variantID: V1, quantity: 1 })).rejects.toThrow(/đã hết hàng/);

      variants.findForSale.mockResolvedValue([makeSaleVariant({ id: V1, stock: 0 }, { allowBackorder: true })]);
      await expect(service.addItem('u1', { variantID: V1, quantity: 10 })).resolves.toBeDefined();
    });

    it(`vượt ${MAX_QUANTITY_PER_ITEM} cái / dòng → 400`, async () => {
      variants.findForSale.mockResolvedValue([makeSaleVariant({ id: V1, stock: 1_000 })]);
      stored = [{ variantID: V1, quantity: MAX_QUANTITY_PER_ITEM, addedAt: new Date() }];
      await expect(service.addItem('u1', { variantID: V1, quantity: 1 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`giỏ đã đủ ${MAX_ITEMS_PER_CART} sản phẩm khác nhau → 400`, async () => {
      stored = Array.from({ length: MAX_ITEMS_PER_CART }, (_, i) => ({ variantID: `x${i}`, quantity: 1, addedAt: new Date() }));
      await expect(service.addItem('u1', { variantID: V1, quantity: 1 })).rejects.toThrow(/tối đa/);
    });

    it('variant ngừng bán / không tồn tại → 404, không mở transaction', async () => {
      variants.findForSale.mockResolvedValue([makeSaleVariant({ id: V1 }, { status: 'inactive' })]);
      await expect(service.addItem('u1', { variantID: V1, quantity: 1 })).rejects.toBeInstanceOf(NotFoundException);
      variants.findForSale.mockResolvedValue([]);
      await expect(service.addItem('u1', { variantID: V1, quantity: 1 })).rejects.toBeInstanceOf(NotFoundException);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('2 request sửa giỏ cùng lúc: xung đột P2034 → đọc lại và ghi, không mất dòng của request kia', async () => {
      const conflict = new Prisma.PrismaClientKnownRequestError('WriteConflict', { code: 'P2034', clientVersion: 't' });
      let first = true;
      cart.findUnique.mockImplementation(() =>
        Promise.resolve({ items: first ? [] : [{ variantID: V2, quantity: 1, addedAt: new Date() }] }),
      );
      cart.upsert.mockImplementationOnce(() => {
        first = false;
        return Promise.reject(conflict);
      });

      await service.addItem('u1', { variantID: V1, quantity: 1 });
      expect(stored.map((i) => i.variantID)).toEqual([V2, V1]);
    });
  });

  describe('updateItem / removeItem / clear', () => {
    beforeEach(() => {
      stored = [
        { variantID: V1, quantity: 1, addedAt: new Date() },
        { variantID: V2, quantity: 1, addedAt: new Date() },
      ];
    });

    it('updateItem: đặt lại số lượng', async () => {
      await service.updateItem('u1', V1, 4);
      expect(stored.find((i) => i.variantID === V1)?.quantity).toBe(4);
    });

    it('updateItem: vượt tồn kho → 409; không có trong giỏ → 404', async () => {
      await expect(service.updateItem('u1', V1, 6)).rejects.toBeInstanceOf(ConflictException);
      stored = [];
      await expect(service.updateItem('u1', V1, 1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removeItem: bỏ đúng dòng; không có cũng không lỗi', async () => {
      await service.removeItem('u1', V1);
      expect(stored.map((i) => i.variantID)).toEqual([V2]);
      await expect(service.removeItem('u1', 'khong-co')).resolves.toBeDefined();
    });

    it('clearCart / clear (dùng trong checkout): xóa hết items', async () => {
      await service.clearCart('u1');
      expect(cart.updateMany).toHaveBeenCalledWith({ where: { userID: 'u1' }, data: { items: { set: [] } } });

      const tx = { cart: { updateMany: jest.fn() } };
      await service.clear('u1', tx as never);
      expect(tx.cart.updateMany).toHaveBeenCalled();
    });
  });
});
