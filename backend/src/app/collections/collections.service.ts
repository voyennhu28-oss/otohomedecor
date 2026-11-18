import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ImageItem, Prisma } from '@prisma/client';
import { NOT_DELETED, PrismaService } from '../../common/prisma/prisma.service';
import { withRetry } from '../../common/prisma/with-retry';
import { PrismaBaseService } from '../../common/services/prisma-base.service';
import { pickAvailableSlug } from '../../common/utils/string-util/slug.util';
import { StringUtilService } from '../../common/utils/string-util/string-util.service';
import { scheduleError, visibleCollectionWhere } from './collection.util';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

const PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  image: true,
  isFeatured: true,
  sortOrder: true,
  startsAt: true,
  endsAt: true,
} satisfies Prisma.CollectionSelect;

const SUMMARY_SELECT = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.CollectionSelect;

const ORDER_BY: Prisma.CollectionOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { name: 'asc' },
];

export type CollectionSummary = Prisma.CollectionGetPayload<{
  select: typeof SUMMARY_SELECT;
}>;

@Injectable()
export class CollectionsService extends PrismaBaseService<'collection'> {
  constructor(
    prismaService: PrismaService,
    private readonly stringUtilService: StringUtilService,
  ) {
    super(prismaService, 'collection');
  }

  findPublicList(featured?: boolean) {
    return this.extended.findMany({
      where: {
        AND: [
          visibleCollectionWhere(new Date()),
          ...(featured !== undefined ? [{ isFeatured: featured }] : []),
        ],
      },
      orderBy: ORDER_BY,
      select: PUBLIC_SELECT,
    });
  }

  async findPublicBySlug(slug: string) {
    const collection = await this.extended.findFirst({
      where: { AND: [{ slug }, visibleCollectionWhere(new Date())] },
      select: PUBLIC_SELECT,
    });
    if (!collection) throw new NotFoundException('Không tìm thấy bộ sưu tập');
    return collection;
  }

  async getVisibleIDBySlug(slug: string): Promise<string | null> {
    const collection = await this.extended.findFirst({
      where: { AND: [{ slug }, visibleCollectionWhere(new Date())] },
      select: { id: true },
    });
    return collection?.id ?? null;
  }

  findVisibleByIDs(ids: string[]): Promise<CollectionSummary[]> {
    if (!ids.length) return Promise.resolve([]);
    return this.extended.findMany({
      where: { AND: [{ id: { in: ids } }, visibleCollectionWhere(new Date())] },
      orderBy: ORDER_BY,
      select: SUMMARY_SELECT,
    });
  }

  findByIDs(ids: string[]): Promise<CollectionSummary[]> {
    if (!ids.length) return Promise.resolve([]);
    return this.extended.findMany({
      where: { id: { in: ids } },
      orderBy: ORDER_BY,
      select: SUMMARY_SELECT,
    });
  }

  async ensureAllExist(ids: string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return;
    const found = await this.extended.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      const foundIDs = new Set(found.map((c) => c.id));
      const missing = unique.filter((id) => !foundIDs.has(id));
      throw new NotFoundException(
        `Không tìm thấy bộ sưu tập: ${missing.join(', ')}`,
      );
    }
  }

  findAdminList() {
    return this.extended.findMany({ orderBy: ORDER_BY });
  }

  async findOne(id: string) {
    const collection = await this.extended.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Không tìm thấy bộ sưu tập');
    return collection;
  }

  async create(dto: CreateCollectionDto) {
    const slug = dto.slug
      ? await this.assertSlugAvailable(dto.slug)
      : await this.generateUniqueSlug(dto.name);
    return this.extended.create({ data: { ...dto, slug } });
  }

  async update(id: string, dto: UpdateCollectionDto) {
    const current = await this.findOne(id);

    const message = scheduleError(
      dto.startsAt === undefined ? current.startsAt : dto.startsAt,
      dto.endsAt === undefined ? current.endsAt : dto.endsAt,
    );
    if (message) throw new BadRequestException(message);
    if (dto.slug && dto.slug !== current.slug) {
      await this.assertSlugAvailable(dto.slug, id);
    }
    return this.extended.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const collection = await this.findOne(id);
    await this.extended.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        slug: `${collection.slug}--deleted-${id}`,
      },
    });
    return { id };
  }

  setImage(id: string, image: Pick<ImageItem, 'url' | 'publicID'> | null) {
    return withRetry(() =>
      this.prismaService.$transaction(async (tx) => {
        const current = await tx.collection.findFirst({
          where: { id, ...NOT_DELETED },
          select: { image: true },
        });
        if (!current) throw new NotFoundException('Không tìm thấy bộ sưu tập');

        const collection = await tx.collection.update({
          where: { id },
          data: {
            image: image
              ? { set: { ...image, alt: null, sortOrder: 0 } }
              : { unset: true },
          },
        });
        return { collection, previous: current.image };
      }),
    );
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
    const base = this.stringUtilService.toSlug(name) || 'bo-suu-tap';
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
