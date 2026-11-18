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

  async getPublicTree() {
    return buildTree(await this.findActive());
  }

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

  async getActiveIDsWithDescendants(slug: string): Promise<string[]> {
    const active = await this.findActive();
    const byID = new Map(active.map((c) => [c.id, c]));
    const root = active.find((c) => c.slug === slug);
    if (!root || !getAncestors(root, byID)) return [];
    return getDescendantIDs(root.id, active);
  }

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

    await this.extended.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        slug: `${category.slug}--deleted-${id}`,
      },
    });
    return { id };
  }

  async findIDsBySlugs(slugs: string[]): Promise<Map<string, string>> {
    const categories = await this.extended.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    });
    return new Map(categories.map((c) => [c.slug, c.id]));
  }

  async ensureExists(id: string) {
    const category = await this.extended.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
  }

  private findActive() {
    return this.extended.findMany({
      where: { isActive: true },
      orderBy: ORDER_BY,
      select: PUBLIC_SELECT,
    });
  }

  private async assertValidParent(id: string | null, parentID: string) {
    if (id === parentID) {
      throw new BadRequestException(
        'Không thể chọn chính danh mục này làm danh mục cha',
      );
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
