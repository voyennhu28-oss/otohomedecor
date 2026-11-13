import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ImageItem, Prisma, ProductStatus } from '@prisma/client';
import { MATERIALS, ROOMS, STYLES } from '../../common/constants/catalog.const';
import { NOT_DELETED, PrismaService } from '../../common/prisma/prisma.service';
import { withRetry } from '../../common/prisma/with-retry';
import { PrismaBaseService } from '../../common/services/prisma-base.service';
import { pickAvailableSlug } from '../../common/utils/string-util/slug.util';
import { StringUtilService } from '../../common/utils/string-util/string-util.service';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  AdminProductListQueryDto,
  ProductListQueryDto,
} from './dto/product-query.dto';
import { buildPublicProductWhere, PRODUCT_ORDER_BY } from './product-filter';
import { computeProductSummary } from './product-summary';
import { assertSkusAvailable } from './variant-sku';

/** Slug trùng đường dẫn tĩnh /products/featured, /products/filters → không được dùng. */
const RESERVED_SLUGS = ['featured', 'filters'];

/** Thông tin hiển thị trên thẻ sản phẩm ở trang danh sách. */
const PRODUCT_CARD_SELECT = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  images: true,
  minPrice: true,
  maxPrice: true,
  colors: true,
  ratingAvg: true,
  ratingCount: true,
  soldCount: true,
  isFeatured: true,
  allowBackorder: true,
} satisfies Prisma.ProductSelect;

/** Variant khách được thấy ở trang chi tiết. */
const PUBLIC_VARIANT_SELECT = {
  id: true,
  sku: true,
  name: true,
  options: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  dimensions: true,
  weightKg: true,
  images: true,
} satisfies Prisma.ProductVariantSelect;

const CATEGORY_SELECT = { id: true, name: true, slug: true } as const;

const emptyPage = () => ({ list: [], totalItems: 0, totalPages: 0 });

export interface RecalculateOptions {
  /** Client của transaction đang chạy (mặc định: client gốc). */
  tx?: Prisma.TransactionClient;
  ensureSelling?: boolean;
}

/** Sản phẩm "active" (hiện cho khách) phải có ít nhất 1 variant đang bán. */
const assertCanBeActive = (status: ProductStatus | undefined, sellingVariants: number) => {
  if (status === ProductStatus.active && sellingVariants === 0) {
    throw new BadRequestException(
      'Sản phẩm phải có ít nhất 1 variant đang bán mới chuyển sang "active" được',
    );
  }
};

@Injectable()
export class ProductsService extends PrismaBaseService<'product'> {
  constructor(
    prismaService: PrismaService,
    private readonly categoriesService: CategoriesService,
    private readonly stringUtilService: StringUtilService,
  ) {
    super(prismaService, 'product');
  }

  // ───────────── public ─────────────

  /** GET /products: lọc + sắp xếp + phân trang (plan mục 8). */
  async findPublicList(query: ProductListQueryDto) {
    const { sort, page, itemPerPage, category, ...filters } = query;

    let categoryIDs: string[] | undefined;
    if (category) {
      categoryIDs = await this.categoriesService.getActiveIDsWithDescendants(category);
      if (!categoryIDs.length) return emptyPage(); // danh mục không tồn tại / đang ẩn
    }

    const where = buildPublicProductWhere(filters, categoryIDs);
    const [list, totalItems] = await Promise.all([
      this.extended.findMany({
        where,
        orderBy: PRODUCT_ORDER_BY[sort],
        select: PRODUCT_CARD_SELECT,
        skip: (page - 1) * itemPerPage,
        take: itemPerPage,
      }),
      this.extended.count({ where }), // PHẢI dùng cùng where với findMany
    ]);
    return { list, totalItems, totalPages: Math.ceil(totalItems / itemPerPage) };
  }

  /** GET /products/featured */
  findFeatured(limit: number) {
    return this.extended.findMany({
      where: { status: ProductStatus.active, isFeatured: true },
      orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
      select: PRODUCT_CARD_SELECT,
      take: limit,
    });
  }

  /**
   * GET /products/filters: các giá trị lọc đang có sản phẩm, để frontend dựng bộ lọc.
   * Đọc field lọc của mọi sản phẩm đang bán rồi gộp lại (đủ nhanh với vài nghìn sản phẩm).
   */
  async getFilterOptions(categorySlug?: string) {
    let categoryIDs: string[] | undefined;
    if (categorySlug) {
      categoryIDs = await this.categoriesService.getActiveIDsWithDescendants(categorySlug);
    }

    const products = await this.extended.findMany({
      where: {
        status: ProductStatus.active,
        ...(categoryIDs && { categoryID: { in: categoryIDs } }),
      },
      select: {
        rooms: true,
        styles: true,
        materials: true,
        colors: true,
        minPrice: true,
        maxPrice: true,
      },
    });

    const used = (pick: (p: (typeof products)[number]) => string[]) =>
      new Set(products.flatMap(pick));
    const usedRooms = used((p) => p.rooms);
    const usedStyles = used((p) => p.styles);
    const usedMaterials = used((p) => p.materials);

    return {
      // giữ thứ tự như trong hằng số
      rooms: ROOMS.filter((r) => usedRooms.has(r)),
      styles: STYLES.filter((s) => usedStyles.has(s)),
      materials: MATERIALS.filter((m) => usedMaterials.has(m)),
      colors: [...used((p) => p.colors)].sort((a, b) => a.localeCompare(b, 'vi')),
      price: products.length
        ? {
            min: products.reduce((min, p) => Math.min(min, p.minPrice), Infinity),
            max: products.reduce((max, p) => Math.max(max, p.maxPrice), 0),
          }
        : { min: 0, max: 0 },
    };
  }

  /** GET /products/:slug: chi tiết kèm danh mục và các variant đang bán (giá tăng dần). */
  async findPublicBySlug(slug: string) {
    const product = await this.extended.findFirst({
      where: { slug, status: ProductStatus.active },
      include: {
        category: { select: CATEGORY_SELECT },
        variants: {
          where: { isActive: true, ...NOT_DELETED },
          orderBy: { price: 'asc' },
          select: PUBLIC_VARIANT_SELECT,
        },
      },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }

  /** GET /products/:slug/related: cùng danh mục HOẶC cùng phong cách, bán chạy trước. */
  async findRelated(slug: string, limit: number) {
    const product = await this.extended.findFirst({
      where: { slug, status: ProductStatus.active },
      select: { id: true, categoryID: true, styles: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    const sameCategoryOrStyle: Prisma.ProductWhereInput[] = [
      { categoryID: product.categoryID },
    ];
    if (product.styles.length) {
      sameCategoryOrStyle.push({ styles: { hasSome: product.styles } });
    }

    return this.extended.findMany({
      where: {
        AND: [
          { status: ProductStatus.active },
          { id: { not: product.id } },
          { OR: sameCategoryOrStyle },
        ],
      },
      orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
      select: PRODUCT_CARD_SELECT,
      take: limit,
    });
  }

  // ───────────── admin ─────────────

  /** GET /admin/products: thấy cả draft / inactive, tìm theo tên hoặc SKU. */
  async findAdminList(query: AdminProductListQueryDto) {
    const { q, status, categoryID, isFeatured, page, itemPerPage } = query;
    const where: Prisma.ProductWhereInput = {
      ...(status && { status }),
      ...(categoryID && { categoryID }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { variants: { some: { sku: { contains: q, mode: 'insensitive' } } } },
        ],
      }),
    };

    const [list, totalItems] = await Promise.all([
      this.extended.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          category: { select: CATEGORY_SELECT },
          _count: { select: { variants: { where: NOT_DELETED } } },
        },
        skip: (page - 1) * itemPerPage,
        take: itemPerPage,
      }),
      this.extended.count({ where }),
    ]);
    return { list, totalItems, totalPages: Math.ceil(totalItems / itemPerPage) };
  }

  /** GET /admin/products/:id: đầy đủ, gồm cả variant đang tắt. */
  async findAdminByID(id: string) {
    const product = await this.extended.findUnique({
      where: { id },
      include: {
        category: { select: CATEGORY_SELECT },
        variants: { where: NOT_DELETED, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }

  /**
   * POST /admin/products: tạo product và các variant trong 1 lần ghi
   * (nested create, Prisma tự chạy trong transaction).
   */
  async create(dto: CreateProductDto) {
    const { variants, ...productData } = dto;

    assertCanBeActive(productData.status, variants.filter((v) => v.isActive).length);
    await this.categoriesService.ensureExists(productData.categoryID);
    await assertSkusAvailable(
      this.prismaService,
      variants.map((v) => v.sku),
    );
    const slug = productData.slug
      ? await this.assertSlugAvailable(productData.slug)
      : await this.generateUniqueSlug(productData.name);

    return this.extended.create({
      data: {
        ...productData,
        slug,
        ...computeProductSummary(variants), // minPrice, maxPrice, colors
        variants: { create: variants },
      },
      include: { variants: true },
    });
  }

  /** PATCH /admin/products/:id */
  async update(id: string, dto: UpdateProductDto) {
    const current = await this.extended.findUnique({
      where: { id },
      select: {
        slug: true,
        _count: {
          select: { variants: { where: { isActive: true, ...NOT_DELETED } } },
        },
      },
    });
    if (!current) throw new NotFoundException('Không tìm thấy sản phẩm');

    assertCanBeActive(dto.status, current._count.variants);
    if (dto.categoryID) await this.categoriesService.ensureExists(dto.categoryID);
    if (dto.slug && dto.slug !== current.slug) {
      await this.assertSlugAvailable(dto.slug, id);
    }

    return this.extended.update({ where: { id }, data: dto });
  }

  /**
   * DELETE /admin/products/:id: soft delete product và mọi variant của nó.
   * Đổi slug / SKU thành "...--deleted-<id>" để giải phóng (index @unique tính cả bản ghi đã xóa).
   * Đơn hàng cũ không bị ảnh hưởng vì đơn lưu snapshot.
   *
   * CỐ Ý giữ ảnh trên Cloudinary: soft delete còn khôi phục được, và đơn hàng cũ (snapshot)
   * vẫn trỏ tới imageUrl. Nếu sau này có xóa cứng thì phải xóa ảnh (images[].publicID) ở bước đó.
   */
  async remove(id: string) {
    const product = await this.extended.findUnique({
      where: { id },
      select: {
        slug: true,
        variants: { where: NOT_DELETED, select: { id: true, sku: true } },
      },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    const deletedAt = new Date();
    await this.prismaService.$transaction([
      this.prismaService.product.update({
        where: { id },
        data: { deletedAt, slug: `${product.slug}--deleted-${id}` },
      }),
      ...product.variants.map((variant) =>
        this.prismaService.productVariant.update({
          where: { id: variant.id },
          data: { deletedAt, sku: `${variant.sku}--deleted-${variant.id}` },
        }),
      ),
    ]);
    return { id };
  }

  // ───────────── dùng cho module khác (variants, images, wishlist) ─────────────

  /** Product chưa xóa (mọi trạng thái), ném 404 nếu không có. */
  async findOneOrThrow(id: string) {
    const product = await this.extended.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }

  /** Ném 404 nếu sản phẩm không tồn tại hoặc không đang bán. */
  async ensureActive(id: string) {
    const product = await this.extended.findFirst({
      where: { id, status: ProductStatus.active },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
  }

  /** Thẻ sản phẩm đang bán theo danh sách ID (wishlist). */
  findCardsByIDs(ids: string[]) {
    return this.extended.findMany({
      where: { id: { in: ids }, status: ProductStatus.active },
      select: PRODUCT_CARD_SELECT,
    });
  }

  /**
   * Tính lại minPrice / maxPrice / colors từ variant hiện có.
   * PHẢI gọi sau mỗi lần tạo / sửa / xóa variant, trong CÙNG transaction với lần ghi variant.
   *
   * Hàm luôn ghi vào document product, nên 2 transaction sửa variant của cùng product sẽ
   * xung đột (P2034) và bị chạy lại tuần tự: summary luôn đúng, và kiểm tra `ensureSelling`
   * không bị lọt khi 2 admin cùng tắt 2 variant cuối (write skew).
   *
   * @param ensureSelling ném 409 nếu product đang "active" mà không còn variant đang bán
   */
  async recalculateSummary(
    productID: string,
    { tx = this.prismaService, ensureSelling = false }: RecalculateOptions = {},
  ) {
    const variants = await tx.productVariant.findMany({
      where: { productID, ...NOT_DELETED },
      select: { price: true, isActive: true, options: true },
    });

    if (ensureSelling && !variants.some((v) => v.isActive)) {
      const product = await tx.product.findFirst({
        where: { id: productID, ...NOT_DELETED },
        select: { status: true },
      });
      if (product?.status === ProductStatus.active) {
        throw new ConflictException(
          'Đây là variant đang bán cuối cùng của sản phẩm đang hiển thị. Hãy thêm variant khác hoặc chuyển sản phẩm sang "draft" / "inactive" trước',
        );
      }
    }

    await tx.product.update({
      where: { id: productID },
      data: computeProductSummary(variants),
    });
  }

  /**
   * Cộng (hoặc trừ khi quantity âm) lượt bán `soldCount` theo các dòng đơn hàng.
   * Dùng client gốc trong tx: product đã xóa vẫn được cập nhật cho đúng thống kê.
   */
  async addSoldCount(items: { productID: string; quantity: number }[], tx: Prisma.TransactionClient) {
    const byProduct = new Map<string, number>();
    for (const { productID, quantity } of items) {
      byProduct.set(productID, (byProduct.get(productID) ?? 0) + quantity);
    }
    for (const [id, quantity] of byProduct) {
      await tx.product.updateMany({ where: { id }, data: { soldCount: { increment: quantity } } });
    }
  }

  /** Thêm ảnh vào cuối danh sách ảnh của product. Trả về danh sách ảnh mới. */
  appendImages(productID: string, images: { url: string; publicID: string }[]) {
    // Transaction: 2 lần upload song song không bị trùng sortOrder (lần sau xung đột và chạy lại)
    return this.updateImages(productID, (current) => {
      const nextOrder = current.reduce((max, img) => Math.max(max, img.sortOrder + 1), 0);
      return [
        ...current,
        ...images.map((img, i) => ({ ...img, alt: null, sortOrder: nextOrder + i })),
      ];
    });
  }

  /** Bỏ 1 ảnh khỏi product theo publicID (Cloudinary). Trả về danh sách ảnh còn lại. */
  removeImage(productID: string, publicID: string) {
    // Transaction: ảnh vừa upload xong trong lúc đang xóa không bị `set` ghi đè mất
    return this.updateImages(productID, (current) => {
      const remaining = current.filter((img) => img.publicID !== publicID);
      if (remaining.length === current.length) {
        throw new NotFoundException('Sản phẩm không có ảnh này');
      }
      return remaining;
    });
  }

  // ───────────── helpers ─────────────

  /**
   * Đọc - sửa - ghi lại cả mảng ảnh trong 1 transaction (Prisma không có `pull` cho composite list).
   * Request khác ghi chen vào giữa → xung đột P2034 → withRetry chạy lại với dữ liệu mới.
   */
  private updateImages(productID: string, change: (current: ImageItem[]) => ImageItem[]) {
    return withRetry(() =>
      this.prismaService.$transaction(async (tx) => {
        const product = await tx.product.findFirst({
          where: { id: productID, ...NOT_DELETED },
          select: { images: true },
        });
        if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

        const images = change(product.images);
        await tx.product.update({
          where: { id: productID },
          data: { images: { set: images } },
        });
        return images;
      }),
    );
  }

  /** Dùng client gốc vì index @unique của slug tính cả bản ghi đã xóa. */
  private async assertSlugAvailable(slug: string, exceptID?: string) {
    if (RESERVED_SLUGS.includes(slug)) {
      throw new BadRequestException(`Slug "${slug}" là đường dẫn hệ thống, hãy chọn slug khác`);
    }
    const existed = await this.client.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existed && existed.id !== exceptID) {
      throw new ConflictException(`Slug "${slug}" đã được dùng`);
    }
    return slug;
  }

  private async generateUniqueSlug(name: string) {
    const base = this.stringUtilService.toSlug(name) || 'san-pham';
    const existing = await this.client.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
    });
    return pickAvailableSlug(
      base,
      existing.map((p) => p.slug),
      RESERVED_SLUGS,
    );
  }

}
