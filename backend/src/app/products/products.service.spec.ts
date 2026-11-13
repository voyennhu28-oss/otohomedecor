import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    const prisma = {
      product,
      productVariant: variant,
      extended: { product, productVariant: variant },
    } as unknown as PrismaService;
    // $transaction([...]) chạy các thao tác; $transaction(fn) gọi fn với tx = chính mock này
    transaction = jest.fn((arg: unknown) =>
      typeof arg === 'function' ? arg(prisma) : Promise.all(arg as Promise<unknown>[]),
    );
    Object.assign(prisma, { $transaction: transaction });
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

    it('BUG-04: "active" mà mọi variant đều tắt → 400, không tạo', async () => {
      const dto = createDto({ status: 'active' });
      dto.variants = dto.variants.map((v) => ({ ...v, isActive: false }));

      await expect(service.create(dto)).rejects.toThrow(/ít nhất 1 variant đang bán/);
      await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(product.create).not.toHaveBeenCalled();
    });

    it('"active" có ít nhất 1 variant đang bán thì tạo được', async () => {
      const dto = createDto({ status: 'active' });
      dto.variants[0] = { ...dto.variants[0], isActive: false };
      await expect(service.create(dto)).resolves.toMatchObject({ status: 'active', minPrice: 12_000_000 });
    });

    it('"draft" mà mọi variant đều tắt vẫn tạo được', async () => {
      const dto = createDto({ status: 'draft' });
      dto.variants = dto.variants.map((v) => ({ ...v, isActive: false }));
      await expect(service.create(dto)).resolves.toMatchObject({ minPrice: 0, maxPrice: 0 });
    });

    it('slug tự nhập chưa ai dùng → dùng nguyên slug đó', async () => {
      product.findUnique.mockResolvedValue(null);
      await expect(service.create(createDto({ slug: 'sofa-dep' }))).resolves.toMatchObject({ slug: 'sofa-dep' });
    });

    it('slug tự sinh bị trùng (kể cả sản phẩm đã xóa) → thêm hậu tố', async () => {
      product.findMany.mockResolvedValue([{ slug: 'sofa-bang-japandi' }]);
      const created = await service.create(createDto());
      expect(created.slug).not.toBe('sofa-bang-japandi');
      expect(created.slug.startsWith('sofa-bang-japandi-')).toBe(true);
    });

    it('tên không sinh được slug → dùng "san-pham"', async () => {
      await expect(service.create(createDto({ name: '!!!' }))).resolves.toMatchObject({ slug: 'san-pham' });
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

    it('đổi sang slug khác: kiểm tra slug mới; trùng sản phẩm khác → 409', async () => {
      product.findUnique
        .mockResolvedValueOnce(current(1)) // sản phẩm đang sửa
        .mockResolvedValueOnce({ id: 'other' }); // slug mới đã thuộc sản phẩm khác
      await expect(service.update('p1', { slug: 'ghe' })).rejects.toBeInstanceOf(ConflictException);
      expect(product.update).not.toHaveBeenCalled();
    });

    it('giữ nguyên slug cũ thì không kiểm tra lại slug', async () => {
      product.findUnique.mockResolvedValue(current(1));
      await service.update('p1', { slug: 'sofa', name: 'Sofa mới' });
      expect(product.findUnique).toHaveBeenCalledTimes(1);
      expect(product.update).toHaveBeenCalled();
    });
  });

  describe('admin: danh sách / chi tiết', () => {
    it('findAdminList: lọc theo trạng thái, danh mục, nổi bật, tìm theo tên hoặc SKU', async () => {
      product.findMany.mockResolvedValue([]);
      product.count.mockResolvedValue(21);

      const result = await service.findAdminList({
        q: 'sofa',
        status: 'draft',
        categoryID: CATEGORY_ID,
        isFeatured: false,
        page: 2,
        itemPerPage: 20,
      });

      const args = product.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        status: 'draft',
        categoryID: CATEGORY_ID,
        isFeatured: false,
        OR: [
          { name: { contains: 'sofa', mode: 'insensitive' } },
          { variants: { some: { sku: { contains: 'sofa', mode: 'insensitive' } } } },
        ],
      });
      expect(args).toMatchObject({ skip: 20, take: 20 });
      expect(product.count).toHaveBeenCalledWith({ where: args.where });
      expect(result).toMatchObject({ totalItems: 21, totalPages: 2 });
    });

    it('findAdminList: không lọc gì thì where rỗng', async () => {
      product.findMany.mockResolvedValue([]);
      product.count.mockResolvedValue(0);
      await service.findAdminList({ page: 1, itemPerPage: 20 });
      expect(product.findMany.mock.calls[0][0].where).toEqual({});
    });

    it('findAdminByID: trả chi tiết; không có → 404', async () => {
      product.findUnique.mockResolvedValueOnce({ id: 'p1' }).mockResolvedValueOnce(null);
      await expect(service.findAdminByID('p1')).resolves.toEqual({ id: 'p1' });
      await expect(service.findAdminByID('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('public: các trường hợp còn lại', () => {
    it('findFeatured: chỉ sản phẩm active + nổi bật, giới hạn số lượng', async () => {
      product.findMany.mockResolvedValue([]);
      await service.findFeatured(6);
      expect(product.findMany.mock.calls[0][0]).toMatchObject({
        where: { status: 'active', isFeatured: true },
        take: 6,
      });
    });

    it('getFilterOptions theo danh mục: lọc theo ID danh mục và con cháu', async () => {
      categories.getActiveIDsWithDescendants.mockResolvedValue(['c1', 'c2']);
      product.findMany.mockResolvedValue([]);
      await service.getFilterOptions('phong-khach');
      expect(product.findMany.mock.calls[0][0].where).toEqual({
        status: 'active',
        categoryID: { in: ['c1', 'c2'] },
      });
    });

    it('findPublicBySlug: có sản phẩm thì trả kèm variant đang bán', async () => {
      product.findFirst.mockResolvedValue({ id: 'p1', variants: [] });
      await expect(service.findPublicBySlug('sofa')).resolves.toEqual({ id: 'p1', variants: [] });
    });

    it('findRelated: sản phẩm không có style thì chỉ lấy cùng danh mục', async () => {
      product.findFirst.mockResolvedValue({ id: 'p1', categoryID: 'sofa', styles: [] });
      product.findMany.mockResolvedValue([]);
      await service.findRelated('sofa-bang', 4);
      expect(product.findMany.mock.calls[0][0].where.AND[2]).toEqual({ OR: [{ categoryID: 'sofa' }] });
    });

    it('findRelated: không có sản phẩm → 404', async () => {
      product.findFirst.mockResolvedValue(null);
      await expect(service.findRelated('x', 4)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('dùng cho module khác', () => {
    const variants = [
      { price: 5_000, isActive: true, options: [{ name: 'Màu', value: 'Đen' }] },
      { price: 3_000, isActive: false, options: [] }, // đang tắt → không tính
      { price: 8_000, isActive: true, options: [] },
    ];

    it('recalculateSummary: tính từ variant chưa xóa rồi lưu vào product', async () => {
      variant.findMany.mockResolvedValue(variants);

      await service.recalculateSummary('p1');

      expect(variant.findMany.mock.calls[0][0].where).toMatchObject({ productID: 'p1' });
      expect(product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { minPrice: 5_000, maxPrice: 8_000, colors: ['Đen'] },
      });
    });

    it('recalculateSummary: chạy trên client của transaction được truyền vào', async () => {
      const tx = { productVariant: createPrismaModelMock(), product: createPrismaModelMock() };
      tx.productVariant.findMany.mockResolvedValue(variants);

      await service.recalculateSummary('p1', { tx: tx as never });

      expect(tx.product.update).toHaveBeenCalled();
      expect(product.update).not.toHaveBeenCalled();
    });

    it('recalculateSummary + ensureSelling: product active hết variant đang bán → 409, không ghi', async () => {
      variant.findMany.mockResolvedValue([{ price: 1, isActive: false, options: [] }]);
      product.findFirst.mockResolvedValue({ status: 'active' });

      await expect(service.recalculateSummary('p1', { ensureSelling: true })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(product.update).not.toHaveBeenCalled();
    });

    it('recalculateSummary + ensureSelling: product draft thì vẫn ghi bình thường', async () => {
      variant.findMany.mockResolvedValue([{ price: 1, isActive: false, options: [] }]);
      product.findFirst.mockResolvedValue({ status: 'draft' });

      await service.recalculateSummary('p1', { ensureSelling: true });
      expect(product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { minPrice: 0, maxPrice: 0, colors: [] },
      });
    });

    it('recalculateSummary + ensureSelling: còn variant đang bán thì không cần đọc product', async () => {
      variant.findMany.mockResolvedValue(variants);
      await service.recalculateSummary('p1', { ensureSelling: true });
      expect(product.findFirst).not.toHaveBeenCalled();
    });

    it('appendImages: thêm vào cuối trong transaction, sortOrder nối tiếp ảnh cũ', async () => {
      const old = [
        { url: 'x', publicID: 'x', alt: null, sortOrder: 0 },
        { url: 'y', publicID: 'y', alt: null, sortOrder: 3 },
      ];
      product.findFirst.mockResolvedValue({ images: old });

      const images = await service.appendImages('p1', [
        { url: 'u1', publicID: 'a' },
        { url: 'u2', publicID: 'b' },
      ]);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(images).toEqual([
        ...old,
        { url: 'u1', publicID: 'a', alt: null, sortOrder: 4 },
        { url: 'u2', publicID: 'b', alt: null, sortOrder: 5 },
      ]);
      expect(product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { images: { set: images } } });
    });

    it('removeImage: bỏ đúng ảnh trong transaction; ảnh không có → 404', async () => {
      product.findFirst.mockResolvedValue({ images: [{ publicID: 'a' }, { publicID: 'b' }] });
      await expect(service.removeImage('p1', 'a')).resolves.toEqual([{ publicID: 'b' }]);
      expect(product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { images: { set: [{ publicID: 'b' }] } },
      });

      product.update.mockClear();
      await expect(service.removeImage('p1', 'khong-co')).rejects.toBeInstanceOf(NotFoundException);
      expect(product.update).not.toHaveBeenCalled();
    });

    it('BUG-08: ghi ảnh bị xung đột (P2034) thì đọc lại và chạy lại', async () => {
      const conflict = new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 't' });
      product.findFirst
        .mockResolvedValueOnce({ images: [{ publicID: 'a' }] })
        .mockResolvedValueOnce({ images: [{ publicID: 'a' }, { publicID: 'moi-upload' }] });
      product.update.mockRejectedValueOnce(conflict).mockResolvedValue({});

      // Lần 2 đọc thấy ảnh vừa upload xong → không bị ghi đè mất
      await expect(service.removeImage('p1', 'a')).resolves.toEqual([{ publicID: 'moi-upload' }]);
      expect(transaction).toHaveBeenCalledTimes(2);
    });

    it('appendImages / removeImage: product không tồn tại → 404', async () => {
      product.findFirst.mockResolvedValue(null);
      await expect(service.appendImages('x', [])).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.removeImage('x', 'a')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('findOneOrThrow / ensureActive: 404 khi không có', async () => {
      product.findUnique.mockResolvedValueOnce({ id: 'p1', status: 'draft' }).mockResolvedValueOnce(null);
      await expect(service.findOneOrThrow('p1')).resolves.toEqual({ id: 'p1', status: 'draft' });
      await expect(service.findOneOrThrow('x')).rejects.toBeInstanceOf(NotFoundException);

      product.findFirst.mockResolvedValueOnce({ id: 'p1' }).mockResolvedValueOnce(null);
      await expect(service.ensureActive('p1')).resolves.toBeUndefined();
      await expect(service.ensureActive('x')).rejects.toBeInstanceOf(NotFoundException);
      expect(product.findFirst.mock.calls[0][0].where).toEqual({ id: 'p1', status: 'active' });
    });

    it('findCardsByIDs: chỉ lấy sản phẩm đang bán trong danh sách', async () => {
      product.findMany.mockResolvedValue([]);
      await service.findCardsByIDs(['a', 'b']);
      expect(product.findMany.mock.calls[0][0].where).toEqual({ id: { in: ['a', 'b'] }, status: 'active' });
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
