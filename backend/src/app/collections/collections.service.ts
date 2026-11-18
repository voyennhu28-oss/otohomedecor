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

/** Thông tin gắn kèm sản phẩm (badge, link sang trang bộ sưu tập). */
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

  // ───────────── public ─────────────

  /** GET /collections: bộ sưu tập đang hiển thị. */
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

  /** GET /collections/:slug. 404 nếu đang tắt hoặc ngoài thời gian hiển thị. */
  async findPublicBySlug(slug: string) {
    const collection = await this.extended.findFirst({
      where: { AND: [{ slug }, visibleCollectionWhere(new Date())] },
      select: PUBLIC_SELECT,
    });
    if (!collection) throw new NotFoundException('Không tìm thấy bộ sưu tập');
    return collection;
  }

  // ───────────── dùng cho products ─────────────

  /** ID của bộ sưu tập đang hiển thị theo slug, null nếu không có. Products dùng để lọc. */
  async getVisibleIDBySlug(slug: string): Promise<string | null> {
    const collection = await this.extended.findFirst({
      where: { AND: [{ slug }, visibleCollectionWhere(new Date())] },
      select: { id: true },
    });
    return collection?.id ?? null;
  }

  /** Bộ sưu tập đang hiển thị trong danh sách ID (trang chi tiết sản phẩm). */
  findVisibleByIDs(ids: string[]): Promise<CollectionSummary[]> {
    if (!ids.length) return Promise.resolve([]);
    return this.extended.findMany({
      where: { AND: [{ id: { in: ids } }, visibleCollectionWhere(new Date())] },
      orderBy: ORDER_BY,
      select: SUMMARY_SELECT,
    });
  }

  /** Bộ sưu tập chưa xóa (mọi trạng thái) trong danh sách ID (trang admin). */
  findByIDs(ids: string[]): Promise<CollectionSummary[]> {
    if (!ids.length) return Promise.resolve([]);
    return this.extended.findMany({
      where: { id: { in: ids } },
      orderBy: ORDER_BY,
      select: SUMMARY_SELECT,
    });
  }

  /** Ném 404 nếu có ID không tồn tại hoặc đã bị xóa. Products dùng khi gán collectionIDs. */
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

  // ───────────── admin ─────────────

  /** GET /admin/collections: tất cả (cả đang tắt / hết hạn). Số sản phẩm lấy qua GET /admin/products?collectionID= */
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

  /**
   * Soft delete + đổi slug để giải phóng (index @unique tính cả bản ghi đã xóa).
   * Product.collectionIDs vẫn giữ ID này: mọi chỗ đọc đều chỉ lấy bộ sưu tập chưa xóa nên không ảnh hưởng.
   * Giữ ảnh bìa trên Cloudinary vì soft delete còn khôi phục được.
   */
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

  /**
   * Thay (hoặc bỏ khi `image` = null) ảnh bìa. Trả về ảnh cũ để xóa trên Cloudinary sau khi DB đã ghi.
   * Transaction: 2 lần upload chen nhau thì lần sau xung đột và chạy lại, không làm sót ảnh cũ.
   */
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

  // ───────────── helpers ─────────────

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
