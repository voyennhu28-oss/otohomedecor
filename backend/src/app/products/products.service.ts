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
import { CollectionsService } from '../collections/collections.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  AdminProductListQueryDto,
  ProductListQueryDto,
} from './dto/product-query.dto';
import { buildPublicProductWhere, PRODUCT_ORDER_BY } from './product-filter';
import { computeProductSummary } from './product-summary';
import { assertSkusAvailable } from './variant-sku';

const RESERVED_SLUGS = ['featured', 'filters'];

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
  tx?: Prisma.TransactionClient;
  ensureSelling?: boolean;
}

const assertCanBeActive = (
  status: ProductStatus | undefined,
  sellingVariants: number,
) => {
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
    private readonly collectionsService: CollectionsService,
  ) {
    super(prismaService, 'product');
  }

  async findPublicList(query: ProductListQueryDto) {
    const { sort, page, itemPerPage, category, collection, ...filters } = query;

    const scope = await this.resolveScope(category, collection);
    if (!scope) return emptyPage();

    const where = buildPublicProductWhere(
      filters,
      scope.categoryIDs,
      scope.collectionID,
    );
    const [list, totalItems] = await Promise.all([
      this.extended.findMany({
        where,
        orderBy: PRODUCT_ORDER_BY[sort],
        select: PRODUCT_CARD_SELECT,
        skip: (page - 1) * itemPerPage,
        take: itemPerPage,
      }),
      this.extended.count({ where }),
    ]);
    return {
      list,
      totalItems,
      totalPages: Math.ceil(totalItems / itemPerPage),
    };
  }

  findFeatured(limit: number) {
    return this.extended.findMany({
      where: { status: ProductStatus.active, isFeatured: true },
      orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
      select: PRODUCT_CARD_SELECT,
      take: limit,
    });
  }

  async getFilterOptions(categorySlug?: string, collectionSlug?: string) {
    const scope = await this.resolveScope(categorySlug, collectionSlug);

    const products = scope
      ? await this.extended.findMany({
          where: {
            status: ProductStatus.active,
            ...(scope.categoryIDs && {
              categoryID: { in: scope.categoryIDs },
            }),
            ...(scope.collectionID && {
              collectionIDs: { has: scope.collectionID },
            }),
          },
          select: {
            rooms: true,
            styles: true,
            materials: true,
            colors: true,
            minPrice: true,
            maxPrice: true,
          },
        })
      : [];

    const used = (pick: (p: (typeof products)[number]) => string[]) =>
      new Set(products.flatMap(pick));
    const usedRooms = used((p) => p.rooms);
    const usedStyles = used((p) => p.styles);
    const usedMaterials = used((p) => p.materials);

    return {
      rooms: ROOMS.filter((r) => usedRooms.has(r)),
      styles: STYLES.filter((s) => usedStyles.has(s)),
      materials: MATERIALS.filter((m) => usedMaterials.has(m)),
      colors: [...used((p) => p.colors)].sort((a, b) =>
        a.localeCompare(b, 'vi'),
      ),
      price: products.length
        ? {
            min: products.reduce(
              (min, p) => Math.min(min, p.minPrice),
              Infinity,
            ),
            max: products.reduce((max, p) => Math.max(max, p.maxPrice), 0),
          }
        : { min: 0, max: 0 },
    };
  }

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
    const { collectionIDs, ...rest } = product;
    return {
      ...rest,
      collections:
        await this.collectionsService.findVisibleByIDs(collectionIDs),
    };
  }

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

  async findAdminList(query: AdminProductListQueryDto) {
    const {
      q,
      status,
      categoryID,
      collectionID,
      isFeatured,
      page,
      itemPerPage,
    } = query;
    const where: Prisma.ProductWhereInput = {
      ...(status && { status }),
      ...(categoryID && { categoryID }),
      ...(collectionID && { collectionIDs: { has: collectionID } }),
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
    return {
      list,
      totalItems,
      totalPages: Math.ceil(totalItems / itemPerPage),
    };
  }

  async findAdminByID(id: string) {
    const product = await this.extended.findUnique({
      where: { id },
      include: {
        category: { select: CATEGORY_SELECT },
        variants: { where: NOT_DELETED, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    const collections = await this.collectionsService.findByIDs(
      product.collectionIDs,
    );
    return {
      ...product,
      collectionIDs: collections.map((c) => c.id),
      collections,
    };
  }

  async create(dto: CreateProductDto) {
    const { variants, ...productData } = dto;

    assertCanBeActive(
      productData.status,
      variants.filter((v) => v.isActive).length,
    );
    await this.categoriesService.ensureExists(productData.categoryID);
    await this.collectionsService.ensureAllExist(
      productData.collectionIDs ?? [],
    );
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
        collectionIDs: productData.collectionIDs ?? [],
        slug,
        ...computeProductSummary(variants),
        variants: { create: variants },
      },
      include: { variants: true },
    });
  }

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
    if (dto.categoryID)
      await this.categoriesService.ensureExists(dto.categoryID);
    if (dto.collectionIDs)
      await this.collectionsService.ensureAllExist(dto.collectionIDs);
    if (dto.slug && dto.slug !== current.slug) {
      await this.assertSlugAvailable(dto.slug, id);
    }

    return this.extended.update({ where: { id }, data: dto });
  }

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

  async addToCollection(collectionID: string, productIDs: string[]) {
    await this.collectionsService.ensureAllExist([collectionID]);
    const found = await this.extended.count({
      where: { id: { in: productIDs } },
    });
    if (found !== productIDs.length) {
      throw new NotFoundException('Có sản phẩm không tồn tại hoặc đã bị xóa');
    }

    const { count } = await this.prismaService.product.updateMany({
      where: {
        id: { in: productIDs },
        NOT: { collectionIDs: { has: collectionID } },
        ...NOT_DELETED,
      },
      data: { collectionIDs: { push: collectionID } },
    });
    return { added: count };
  }

  removeFromCollection(collectionID: string, productID: string) {
    return withRetry(() =>
      this.prismaService.$transaction(async (tx) => {
        const product = await tx.product.findFirst({
          where: { id: productID, ...NOT_DELETED },
          select: { collectionIDs: true },
        });
        if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
        if (!product.collectionIDs.includes(collectionID)) {
          throw new NotFoundException('Sản phẩm không thuộc bộ sưu tập này');
        }

        await tx.product.update({
          where: { id: productID },
          data: {
            collectionIDs: {
              set: product.collectionIDs.filter((id) => id !== collectionID),
            },
          },
        });
        return { id: productID };
      }),
    );
  }

  async findOneOrThrow(id: string) {
    const product = await this.extended.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }

  async ensureActive(id: string) {
    const product = await this.extended.findFirst({
      where: { id, status: ProductStatus.active },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
  }

  findCardsByIDs(ids: string[]) {
    return this.extended.findMany({
      where: { id: { in: ids }, status: ProductStatus.active },
      select: PRODUCT_CARD_SELECT,
    });
  }

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

  async addSoldCount(
    items: { productID: string; quantity: number }[],
    tx: Prisma.TransactionClient,
  ) {
    const byProduct = new Map<string, number>();
    for (const { productID, quantity } of items) {
      byProduct.set(productID, (byProduct.get(productID) ?? 0) + quantity);
    }
    for (const [id, quantity] of byProduct) {
      await tx.product.updateMany({
        where: { id },
        data: { soldCount: { increment: quantity } },
      });
    }
  }

  async setRating(
    productID: string,
    rating: { ratingAvg: number; ratingCount: number },
    tx: Prisma.TransactionClient,
  ) {
    await tx.product.updateMany({ where: { id: productID }, data: rating });
  }

  appendImages(productID: string, images: { url: string; publicID: string }[]) {
    return this.updateImages(productID, (current) => {
      const nextOrder = current.reduce(
        (max, img) => Math.max(max, img.sortOrder + 1),
        0,
      );
      return [
        ...current,
        ...images.map((img, i) => ({
          ...img,
          alt: null,
          sortOrder: nextOrder + i,
        })),
      ];
    });
  }

  removeImage(productID: string, publicID: string) {
    return this.updateImages(productID, (current) => {
      const remaining = current.filter((img) => img.publicID !== publicID);
      if (remaining.length === current.length) {
        throw new NotFoundException('Sản phẩm không có ảnh này');
      }
      return remaining;
    });
  }

  private async resolveScope(
    categorySlug?: string,
    collectionSlug?: string,
  ): Promise<{ categoryIDs?: string[]; collectionID?: string } | null> {
    const [categoryIDs, collectionID] = await Promise.all([
      categorySlug
        ? this.categoriesService.getActiveIDsWithDescendants(categorySlug)
        : undefined,
      collectionSlug
        ? this.collectionsService.getVisibleIDBySlug(collectionSlug)
        : undefined,
    ]);
    if (categoryIDs?.length === 0 || collectionID === null) return null;
    return { categoryIDs, collectionID };
  }

  private updateImages(
    productID: string,
    change: (current: ImageItem[]) => ImageItem[],
  ) {
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

  private async assertSlugAvailable(slug: string, exceptID?: string) {
    if (RESERVED_SLUGS.includes(slug)) {
      throw new BadRequestException(
        `Slug "${slug}" là đường dẫn hệ thống, hãy chọn slug khác`,
      );
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
