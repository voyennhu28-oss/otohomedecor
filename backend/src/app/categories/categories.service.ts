import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NOT_DELETED, PrismaService } from '../../common/prisma/prisma.service';
import { PrismaBaseService } from '../../common/services/prisma-base.service';
import { pickAvailableSlug } from '../../common/utils/string-util/slug.util';
import { StringUtilService } from '../../common/utils/string-util/string-util.service';
import {
  buildTree,
  getAncestors,
  getDescendantIDs,
} from './category-tree.util';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

const PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  imageUrl: true,
  parentID: true,
  sortOrder: true,
} satisfies Prisma.CategorySelect;

const ORDER_BY: Prisma.CategoryOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { name: 'asc' },
];

/** Chỉ đếm sản phẩm / danh mục con chưa bị xóa. */
const COUNT_NOT_DELETED = {
  _count: {
    select: {
      products: { where: NOT_DELETED },
      children: { where: NOT_DELETED },
    },
  },
} satisfies Prisma.CategoryInclude;

@Injectable()
export class CategoriesService extends PrismaBaseService<'category'> {
  constructor(
    prismaService: PrismaService,
    private readonly stringUtilService: StringUtilService,
  ) {
    super(prismaService, 'category');
  }

  // ───────────── public ─────────────

  /** Cây danh mục đang hiển thị. Danh mục con của danh mục đang ẩn cũng bị ẩn. */
  async getPublicTree() {
    return buildTree(await this.findActive());
  }

  /** Chi tiết + breadcrumb + danh mục con. 404 nếu nó hoặc một tổ tiên đang ẩn. */
  async getPublicBySlug(slug: string) {
    const active = await this.findActive();
    const byID = new Map(active.map((c) => [c.id, c]));
    const category = active.find((c) => c.slug === slug);
    const ancestors = category && getAncestors(category, byID);
    if (!category || !ancestors) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    return {
      ...category,
      breadcrumb: [...ancestors, category].map(({ id, name, slug }) => ({
        id,
        name,
        slug,
      })),
      children: active.filter((c) => c.parentID === category.id),
    };
  }

  /**
   * ID của danh mục (theo slug) và mọi danh mục con cháu đang hiển thị.
   * Products dùng để lọc "sản phẩm thuộc danh mục, gồm cả danh mục con" (plan mục 8).
   */
  async getActiveIDsWithDescendants(slug: string): Promise<string[]> {
    const active = await this.findActive();
    const byID = new Map(active.map((c) => [c.id, c]));
    const root = active.find((c) => c.slug === slug);
    if (!root || !getAncestors(root, byID)) return [];
    return getDescendantIDs(root.id, active);
  }

  // ───────────── admin ─────────────

  /** Cây đầy đủ (cả danh mục đang ẩn), kèm số sản phẩm. */
  async getAdminTree() {
    const all = await this.extended.findMany({
      orderBy: ORDER_BY,
      include: COUNT_NOT_DELETED,
    });
    return buildTree(
      all.map(({ _count, ...c }) => ({
        ...c,
        productCount: _count.products,
      })),
    );
  }

  async findOne(id: string) {
    const category = await this.extended.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        ...COUNT_NOT_DELETED,
      },
    });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
    const { _count, ...rest } = category;
    return {
      ...rest,
      productCount: _count.products,
      childCount: _count.children,
    };
  }

  async create(dto: CreateCategoryDto) {
    if (dto.parentID) await this.assertValidParent(null, dto.parentID);
    const slug = dto.slug
      ? await this.assertSlugAvailable(dto.slug)
      : await this.generateUniqueSlug(dto.name);
    return this.extended.create({ data: { ...dto, slug } });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const current = await this.extended.findUnique({
      where: { id },
      select: { slug: true },
    });
    if (!current) throw new NotFoundException('Không tìm thấy danh mục');

    if (dto.parentID) await this.assertValidParent(id, dto.parentID);
    if (dto.slug && dto.slug !== current.slug) {
      await this.assertSlugAvailable(dto.slug, id);
    }
    return this.extended.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const category = await this.extended.findUnique({
      where: { id },
      include: COUNT_NOT_DELETED,
    });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
    if (category._count.children) {
      throw new ConflictException(
        `Danh mục còn ${category._count.children} danh mục con, hãy chuyển hoặc xóa chúng trước`,
      );
    }
    if (category._count.products) {
      throw new ConflictException(
        `Danh mục còn ${category._count.products} sản phẩm, hãy chuyển sản phẩm sang danh mục khác trước`,
      );
    }

    // Soft delete, đồng thời đổi slug để giải phóng slug cũ (slug là @unique,
    // index vẫn tính cả bản ghi đã xóa) → tạo lại danh mục cùng tên vẫn được.
    await this.extended.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        slug: `${category.slug}--deleted-${id}`,
      },
    });
    return { id };
  }

  /** slug → id của các danh mục chưa xóa (mọi trạng thái). Dùng cho import Excel sản phẩm. */
  async findIDsBySlugs(slugs: string[]): Promise<Map<string, string>> {
    const categories = await this.extended.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    });
    return new Map(categories.map((c) => [c.slug, c.id]));
  }

  /** Ném 404 nếu danh mục không tồn tại hoặc đã bị xóa. Products dùng khi gán categoryID. */
  async ensureExists(id: string) {
    const category = await this.extended.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
  }

  // ───────────── helpers ─────────────

  private findActive() {
    return this.extended.findMany({
      where: { isActive: true },
      orderBy: ORDER_BY,
      select: PUBLIC_SELECT,
    });
  }

  /**
   * Cha phải tồn tại, không phải chính nó, không phải con cháu của nó (tránh vòng lặp).
   * `id` = null khi tạo mới.
   */
  private async assertValidParent(id: string | null, parentID: string) {
    if (id === parentID) {
      throw new BadRequestException('Không thể chọn chính danh mục này làm danh mục cha');
    }
    const all = await this.extended.findMany({
      select: { id: true, parentID: true },
    });
    if (!all.some((c) => c.id === parentID)) {
      throw new NotFoundException('Không tìm thấy danh mục cha');
    }
    if (id && getDescendantIDs(id, all).includes(parentID)) {
      throw new BadRequestException(
        'Không thể chuyển danh mục vào bên trong danh mục con của nó',
      );
    }
  }

  /** Dùng client gốc vì index @unique của slug tính cả bản ghi đã xóa. */
  private async assertSlugAvailable(slug: string, exceptID?: string) {
    const existed = await this.client.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existed && existed.id !== exceptID) {
      throw new ConflictException(`Slug "${slug}" đã được dùng`);
    }
    return slug;
  }

  /** "Bàn trà" → "ban-tra"; đã có thì "ban-tra-2", "ban-tra-3"... */
  private async generateUniqueSlug(name: string) {
    const base = this.stringUtilService.toSlug(name) || 'danh-muc';
    const existing = await this.client.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
    });
    return pickAvailableSlug(
      base,
      existing.map((c) => c.slug),
    );
  }
}
