import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createPrismaModelMock, PrismaModelMock } from '../../../test/mocks/prisma.mock';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { ProductVariantsService } from './product-variants.service';

const P = 'product-1';
const V = 'variant-1';

const existingVariant = (overrides = {}) => ({
  id: V,
  productID: P,
  sku: 'SOFA-2C',
  price: 9_000_000,
  compareAtPrice: 10_000_000,
  isActive: true,
  ...overrides,
});

describe('ProductVariantsService', () => {
  let service: ProductVariantsService;
  let variant: PrismaModelMock;
  let prisma: PrismaService;
  let transaction: jest.Mock;
  let products: {
    findOneOrThrow: jest.Mock;
    recalculateSummary: jest.Mock;
  };

  /** recalculateSummary được gọi trong transaction (tx = mock prisma), với ensureSelling tương ứng. */
  const expectRecalculated = (ensureSelling: boolean) =>
    expect(products.recalculateSummary).toHaveBeenCalledWith(P, { tx: prisma, ensureSelling });

  beforeEach(() => {
    variant = createPrismaModelMock();
    prisma = {
      productVariant: variant,
      extended: { productVariant: variant },
    } as unknown as PrismaService;
    transaction = jest.fn((fn: (tx: unknown) => unknown) => fn(prisma));
    Object.assign(prisma, { $transaction: transaction });
    products = {
      findOneOrThrow: jest.fn().mockResolvedValue({ id: P, status: 'active' }),
      recalculateSummary: jest.fn(),
    };
    service = new ProductVariantsService(prisma, products as unknown as ProductsService);
  });

  describe('create', () => {
    const dto = { sku: 'SOFA-3C', name: '3 chỗ', options: [], price: 12_000_000, stock: 5, weightKg: 50, isActive: true };

    it('tạo variant rồi tính lại giá / màu của product trong cùng transaction', async () => {
      variant.findMany.mockResolvedValue([]); // SKU chưa có
      variant.create.mockResolvedValue({ id: 'new' });

      await expect(service.create(P, dto)).resolves.toEqual({ id: 'new' });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(variant.create).toHaveBeenCalledWith({ data: { ...dto, productID: P } });
      expectRecalculated(false);
    });

    it('SKU đã tồn tại → 409, không tạo', async () => {
      variant.findMany.mockResolvedValue([{ sku: 'SOFA-3C' }]);
      await expect(service.create(P, dto)).rejects.toBeInstanceOf(ConflictException);
      expect(variant.create).not.toHaveBeenCalled();
      expect(products.recalculateSummary).not.toHaveBeenCalled();
    });

    it('product không tồn tại → 404', async () => {
      products.findOneOrThrow.mockRejectedValue(new NotFoundException());
      await expect(service.create(P, dto)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      variant.findFirst.mockResolvedValue(existingVariant());
      variant.update.mockImplementation(({ data }) => data);
    });

    it('cập nhật rồi tính lại giá / màu của product trong cùng transaction', async () => {
      await service.update(P, V, { price: 8_500_000 });
      expect(variant.update).toHaveBeenCalledWith({ where: { id: V }, data: { price: 8_500_000 } });
      expectRecalculated(false);
    });

    it('variant không thuộc product này → 404', async () => {
      variant.findFirst.mockResolvedValue(null);
      await expect(service.update(P, V, { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
      expect(variant.findFirst).toHaveBeenCalledWith({ where: { id: V, productID: P } });
    });

    it('giá mới >= giá gạch ngang hiện tại → 400 (so với giá trị đang lưu)', async () => {
      await expect(service.update(P, V, { price: 10_000_000 })).rejects.toBeInstanceOf(BadRequestException);
      expect(variant.update).not.toHaveBeenCalled();
    });

    it('bỏ giá gạch ngang (null) thì đổi giá thoải mái', async () => {
      await service.update(P, V, { price: 15_000_000, compareAtPrice: null });
      expect(variant.update).toHaveBeenCalled();
    });

    it('đổi sang SKU đã có → 409', async () => {
      variant.findMany.mockResolvedValue([{ sku: 'SOFA-3C' }]);
      await expect(service.update(P, V, { sku: 'SOFA-3C' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('tắt variant đang bán: kiểm tra "còn variant đang bán" trong transaction', async () => {
      await service.update(P, V, { isActive: false });
      expectRecalculated(true);
    });

    it('tắt variant đang bán cuối cùng của product active → 409 (lỗi từ recalculateSummary, transaction rollback)', async () => {
      products.recalculateSummary.mockRejectedValue(new ConflictException());
      await expect(service.update(P, V, { isActive: false })).rejects.toBeInstanceOf(ConflictException);
    });

    it('variant đang tắt mà tắt tiếp / sửa field khác thì không cần kiểm tra', async () => {
      variant.findFirst.mockResolvedValue(existingVariant({ isActive: false }));
      await service.update(P, V, { isActive: false });
      expectRecalculated(false);
    });

    it('BUG-08: 2 admin cùng tắt 2 variant cuối → transaction sau xung đột (P2034), chạy lại thì nhận 409', async () => {
      const conflict = new Prisma.PrismaClientKnownRequestError('WriteConflict', { code: 'P2034', clientVersion: 't' });
      products.recalculateSummary
        .mockRejectedValueOnce(conflict) // lần 1: document product đã bị transaction kia ghi
        .mockRejectedValueOnce(new ConflictException()); // lần 2: đọc lại thấy không còn variant đang bán

      await expect(service.update(P, V, { isActive: false })).rejects.toBeInstanceOf(ConflictException);
      expect(transaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('remove', () => {
    it('soft delete, đổi SKU để giải phóng, tính lại product trong cùng transaction', async () => {
      variant.findFirst.mockResolvedValue(existingVariant());

      await expect(service.remove(P, V)).resolves.toEqual({ id: V });

      expect(variant.update).toHaveBeenCalledWith({
        where: { id: V },
        data: { deletedAt: expect.any(Date), sku: `SOFA-2C--deleted-${V}` },
      });
      expectRecalculated(true);
    });

    it('xóa variant đang bán cuối cùng của product active → 409', async () => {
      variant.findFirst.mockResolvedValue(existingVariant());
      products.recalculateSummary.mockRejectedValue(new ConflictException());
      await expect(service.remove(P, V)).rejects.toBeInstanceOf(ConflictException);
    });

    it('variant đang tắt thì xóa luôn, không cần kiểm tra', async () => {
      variant.findFirst.mockResolvedValue(existingVariant({ isActive: false }));
      await service.remove(P, V);
      expectRecalculated(false);
    });

    it('variant không thuộc product → 404, không ghi', async () => {
      variant.findFirst.mockResolvedValue(null);
      await expect(service.remove(P, V)).rejects.toBeInstanceOf(NotFoundException);
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  describe('findByProduct', () => {
    it('kiểm tra product tồn tại rồi lấy mọi variant chưa xóa', async () => {
      variant.findMany.mockResolvedValue([{ id: V }]);
      await expect(service.findByProduct(P)).resolves.toEqual([{ id: V }]);
      expect(products.findOneOrThrow).toHaveBeenCalledWith(P);
      expect(variant.findMany).toHaveBeenCalledWith({ where: { productID: P }, orderBy: { createdAt: 'asc' } });
    });
  });

  describe('updateStock', () => {
    beforeEach(() => {
      variant.findUnique.mockResolvedValue({ id: V, stock: 4, sku: 'SOFA-2C' });
    });

    it('{ stock }: đặt tồn kho', async () => {
      await service.updateStock(V, { stock: 20 });
      expect(variant.update).toHaveBeenCalledWith({ where: { id: V }, data: { stock: 20 } });
    });

    it('{ adjust > 0 }: cộng kho, không cần điều kiện', async () => {
      variant.updateMany.mockResolvedValue({ count: 1 });
      await service.updateStock(V, { adjust: 5 });
      const args = variant.updateMany.mock.calls[0][0];
      expect(args.data).toEqual({ stock: { increment: 5 } });
      expect(args.where.stock).toBeUndefined();
    });

    it('{ adjust < 0 }: trừ atomic, chỉ khi còn đủ', async () => {
      variant.updateMany.mockResolvedValue({ count: 1 });
      await service.updateStock(V, { adjust: -3 });
      const args = variant.updateMany.mock.calls[0][0];
      expect(args.where).toMatchObject({ id: V, stock: { gte: 3 } });
      expect(args.data).toEqual({ stock: { increment: -3 } });
    });

    it('trừ quá tồn kho → 409', async () => {
      variant.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.updateStock(V, { adjust: -10 })).rejects.toThrow('hiện còn 4');
    });

    it('variant không tồn tại → 404', async () => {
      variant.findUnique.mockResolvedValue(null);
      await expect(service.updateStock(V, { stock: 1 })).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
