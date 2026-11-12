import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createPrismaModelMock, PrismaModelMock } from '../../../test/mocks/prisma.mock';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StringUtilService } from '../../common/utils/string-util/string-util.service';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto } from './dto/product.dto';
import { ProductListQueryDto } from './dto/product-query.dto';
import { ProductsService } from './products.service';

const CATEGORY_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

const createDto = (overrides: Partial<CreateProductDto> = {}): CreateProductDto => ({
  name: 'Sofa Băng Japandi',
  categoryID: CATEGORY_ID,
  rooms: ['living-room'],
  styles: ['japandi'],
  materials: ['oak'],
  tags: [],
  variants: [
    { sku: 'SOFA-2C-XAM', name: '2 chỗ - Xám', options: [{ name: 'Màu', value: 'Xám' }], price: 9_000_000, stock: 3, weightKg: 40, isActive: true },
    { sku: 'SOFA-3C-BE', name: '3 chỗ - Be', options: [{ name: 'Màu', value: 'Be' }], price: 12_000_000, stock: 0, weightKg: 55, isActive: true },
  ],
  ...overrides,
});

const listQuery = (overrides: Partial<ProductListQueryDto> = {}): ProductListQueryDto => ({
  sort: 'newest',
  page: 1,
  itemPerPage: 20,
  ...overrides,
});

describe('ProductsService', () => {
  let service: ProductsService;
  let product: PrismaModelMock;
  let variant: PrismaModelMock;
  let transaction: jest.Mock;
  let categories: { getActiveIDsWithDescendants: jest.Mock; ensureExists: jest.Mock };

  beforeEach(() => {
    product = createPrismaModelMock();
    variant = createPrismaModelMock();
    transaction = jest.fn((operations: Promise<unknown>[]) => Promise.all(operations));
    const prisma = {
      product,
      productVariant: variant,
      extended: { product, productVariant: variant },
      $transaction: transaction,
    } as unknown as PrismaService;
    categories = { getActiveIDsWithDescendants: jest.fn(), ensureExists: jest.fn() };

    service = new ProductsService(
      prisma,
      categories as unknown as CategoriesService,
      new StringUtilService(),
    );
  });

  // ───────────── public ─────────────

  describe('findPublicList', () => {
    it('phân trang; count dùng cùng where với findMany', async () => {
      product.findMany.mockResolvedValue([{ id: 'p1' }]);
      product.count.mockResolvedValue(45);

      const result = await service.findPublicList(listQuery({ page: 3, itemPerPage: 20, sort: 'price_asc' }));

      const args = product.findMany.mock.calls[0][0];
      expect(args).toMatchObject({ skip: 40, take: 20, orderBy: [{ minPrice: 'asc' }, { id: 'desc' }] });
      expect(product.count).toHaveBeenCalledWith({ where: args.where });
      expect(result).toEqual({ list: [{ id: 'p1' }], totalItems: 45, totalPages: 3 });
    });

    it('lọc theo danh mục: dùng ID của danh mục và con cháu', async () => {
      categories.getActiveIDsWithDescendants.mockResolvedValue(['pk', 'sofa']);
      product.findMany.mockResolvedValue([]);
      product.count.mockResolvedValue(0);

      await service.findPublicList(listQuery({ category: 'phong-khach' }));

      expect(categories.getActiveIDsWithDescendants).toHaveBeenCalledWith('phong-khach');
      expect(product.findMany.mock.calls[0][0].where.AND).toContainEqual({ categoryID: { in: ['pk', 'sofa'] } });
    });

    it('danh mục không tồn tại / đang ẩn: trả trang rỗng, không truy vấn sản phẩm', async () => {
      categories.getActiveIDsWithDescendants.mockResolvedValue([]);
      const result = await service.findPublicList(listQuery({ category: 'khong-co' }));
      expect(result).toEqual({ list: [], totalItems: 0, totalPages: 0 });
      expect(product.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getFilterOptions', () => {
    it('gộp giá trị đang có, giữ thứ tự hằng số, tính khoảng giá', async () => {
      product.findMany.mockResolvedValue([
        { rooms: ['bedroom'], styles: ['modern'], materials: ['oak'], colors: ['Xám'], minPrice: 2_000_000, maxPrice: 5_000_000 },
        { rooms: ['living-room', 'bedroom'], styles: [], materials: ['rattan', 'oak'], colors: ['Be', 'Xám'], minPrice: 900_000, maxPrice: 1_200_000 },
      ]);

      await expect(service.getFilterOptions()).resolves.toEqual({
        rooms: ['living-room', 'bedroom'],
        styles: ['modern'],
        materials: ['oak', 'rattan'],
        colors: ['Be', 'Xám'],
        price: { min: 900_000, max: 5_000_000 },
      });
    });

    it('không có sản phẩm: khoảng giá 0', async () => {
      product.findMany.mockResolvedValue([]);
      await expect(service.getFilterOptions()).resolves.toMatchObject({ price: { min: 0, max: 0 } });
    });
  });

  describe('findPublicBySlug / findRelated', () => {
    it('chỉ lấy sản phẩm active; 404 nếu không có', async () => {
      product.findFirst.mockResolvedValue(null);
      await expect(service.findPublicBySlug('sofa')).rejects.toBeInstanceOf(NotFoundException);
      expect(product.findFirst.mock.calls[0][0].where).toEqual({ slug: 'sofa', status: 'active' });
    });

    it('related: cùng danh mục hoặc cùng style, bỏ chính nó', async () => {
      product.findFirst.mockResolvedValue({ id: 'p1', categoryID: 'sofa', styles: ['japandi'] });
      product.findMany.mockResolvedValue([]);

      await service.findRelated('sofa-bang', 8);

      expect(product.findMany.mock.calls[0][0]).toMatchObject({
        take: 8,
        where: {
          AND: [
            { status: 'active' },
            { id: { not: 'p1' } },
            { OR: [{ categoryID: 'sofa' }, { styles: { hasSome: ['japandi'] } }] },
          ],
        },
      });
    });
  });

  // ───────────── admin ─────────────

  describe('create', () => {
    beforeEach(() => {
      variant.findMany.mockResolvedValue([]); // chưa có SKU nào trùng
      product.findMany.mockResolvedValue([]); // chưa có slug nào trùng
      product.create.mockImplementation(({ data }) => data);
    });

    it('tạo product + variant trong 1 lần ghi, tự sinh slug, tự tính giá và màu', async () => {
      const created = await service.create(createDto());

      expect(categories.ensureExists).toHaveBeenCalledWith(CATEGORY_ID);
      expect(created).toMatchObject({
        slug: 'sofa-bang-japandi',
        minPrice: 9_000_000,
        maxPrice: 12_000_000,
        colors: ['Xám', 'Be'],
        variants: { create: expect.arrayContaining([expect.objectContaining({ sku: 'SOFA-2C-XAM' })]) },
      });
    });

    it('SKU đã tồn tại (kể cả của sản phẩm đã xóa) → 409, không tạo gì', async () => {
      variant.findMany.mockResolvedValue([{ sku: 'SOFA-3C-BE' }]);
      await expect(service.create(createDto())).rejects.toThrow(ConflictException);
      expect(product.create).not.toHaveBeenCalled();
    });

    it('slug tự nhập trùng đường dẫn hệ thống → 400', async () => {
      await expect(service.create(createDto({ slug: 'featured' }))).rejects.toBeInstanceOf(BadRequestException);
    });

    it('slug tự nhập đã có → 409', async () => {
      product.findUnique.mockResolvedValue({ id: 'other' });
      await expect(service.create(createDto({ slug: 'sofa' }))).rejects.toBeInstanceOf(ConflictException);
    });

    it('danh mục không tồn tại → lỗi từ CategoriesService', async () => {
      categories.ensureExists.mockRejectedValue(new NotFoundException());
      await expect(service.create(createDto())).rejects.toBeInstanceOf(NotFoundException);
      expect(product.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const current = (activeVariants: number) => ({ slug: 'sofa', _count: { variants: activeVariants } });

    it('chuyển sang active khi không còn variant đang bán → 400', async () => {
      product.findUnique.mockResolvedValue(current(0));
      await expect(service.update('p1', { status: 'active' })).rejects.toBeInstanceOf(BadRequestException);
      expect(product.update).not.toHaveBeenCalled();
    });

    it('đổi danh mục: kiểm tra danh mục mới tồn tại', async () => {
      product.findUnique.mockResolvedValue(current(1));
      await service.update('p1', { categoryID: CATEGORY_ID, status: 'active' });
      expect(categories.ensureExists).toHaveBeenCalledWith(CATEGORY_ID);
      expect(product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { categoryID: CATEGORY_ID, status: 'active' },
      });
    });

    it('không tồn tại → 404', async () => {
      product.findUnique.mockResolvedValue(null);
      await expect(service.update('x', { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('dùng cho module khác', () => {
    it('recalculateSummary: tính từ variant chưa xóa rồi lưu vào product', async () => {
      variant.findMany.mockResolvedValue([
        { price: 5_000, isActive: true, options: [{ name: 'Màu', value: 'Đen' }] },
        { price: 3_000, isActive: false, options: [] }, // đang tắt → không tính
        { price: 8_000, isActive: true, options: [] },
      ]);

      await service.recalculateSummary('p1');

      expect(variant.findMany.mock.calls[0][0].where).toMatchObject({ productID: 'p1' });
      expect(product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { minPrice: 5_000, maxPrice: 8_000, colors: ['Đen'] },
      });
    });

    it('appendImages: thêm vào cuối, sortOrder nối tiếp ảnh cũ', async () => {
      product.findUnique.mockResolvedValue({ images: [{ sortOrder: 0 }, { sortOrder: 3 }] });
      product.update.mockResolvedValue({ images: [] });

      await service.appendImages('p1', [
        { url: 'u1', publicID: 'a' },
        { url: 'u2', publicID: 'b' },
      ]);

      expect(product.update.mock.calls[0][0].data.images.push).toEqual([
        { url: 'u1', publicID: 'a', sortOrder: 4 },
        { url: 'u2', publicID: 'b', sortOrder: 5 },
      ]);
    });

    it('removeImage: bỏ đúng ảnh; ảnh không có → 404', async () => {
      product.findUnique.mockResolvedValue({ images: [{ publicID: 'a' }, { publicID: 'b' }] });
      await expect(service.removeImage('p1', 'a')).resolves.toEqual([{ publicID: 'b' }]);
      expect(product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { images: { set: [{ publicID: 'b' }] } },
      });

      await expect(service.removeImage('p1', 'khong-co')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft delete product và mọi variant trong 1 transaction, giải phóng slug và SKU', async () => {
      product.findUnique.mockResolvedValue({
        slug: 'sofa',
        variants: [{ id: 'v1', sku: 'SOFA-2C' }, { id: 'v2', sku: 'SOFA-3C' }],
      });
      product.update.mockResolvedValue({});
      variant.update.mockResolvedValue({});

      await expect(service.remove('p1')).resolves.toEqual({ id: 'p1' });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { deletedAt: expect.any(Date), slug: 'sofa--deleted-p1' },
      });
      expect(variant.update).toHaveBeenCalledWith({
        where: { id: 'v2' },
        data: { deletedAt: expect.any(Date), sku: 'SOFA-3C--deleted-v2' },
      });
    });

    it('không tồn tại → 404', async () => {
      product.findUnique.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
      expect(transaction).not.toHaveBeenCalled();
    });
  });
});
