import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReviewStatus } from '@prisma/client';
import type { UserInfo } from '../../common/decorators/user.decorator';
import { paginate, toPage } from '../../common/dto/query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { withRetry } from '../../common/prisma/with-retry';
import { PrismaBaseService } from '../../common/services/prisma-base.service';
import { ImageUploadService } from '../../common/utils/file-util/image-upload.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import {
  AdminReviewListQueryDto,
  CreateReviewDto,
  ReviewListQueryDto,
  ReviewSort,
  UpdateReviewDto,
} from './dto/review.dto';
import { buildRatingStats, roundRating } from './review-rating';

const REVIEW_ORDER_BY: Record<ReviewSort, Prisma.ReviewOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }],
  rating_desc: [{ rating: 'desc' }, { createdAt: 'desc' }],
  rating_asc: [{ rating: 'asc' }, { createdAt: 'desc' }],
};

/** Review công khai: tên + ảnh đại diện người viết, KHÔNG lộ email / userID / orderID. */
const PUBLIC_REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  images: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { fullName: true, avatarUrl: true } },
} satisfies Prisma.ReviewSelect;

/**
 * Quy tắc:
 *  - Chỉ viết review khi có đơn ĐÃ GIAO chứa sản phẩm; mỗi đơn 1 review (unique userID + productID + orderID).
 *  - Mọi thay đổi review (thêm / sửa / xóa / đổi trạng thái) tính lại ratingAvg, ratingCount của
 *    product TRONG CÙNG transaction. Chỉ review "approved" được tính và hiển thị.
 */
@Injectable()
export class ReviewsService extends PrismaBaseService<'review'> {
  constructor(
    prismaService: PrismaService,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly imageUpload: ImageUploadService,
  ) {
    super(prismaService, 'review');
  }

  // ───────────── public ─────────────

  /** GET /products/:productID/reviews: review đã duyệt + thống kê số sao (luôn tính trên mọi review đã duyệt). */
  async findPublic(productID: string, { rating, sort, ...pagination }: ReviewListQueryDto) {
    await this.productsService.ensureActive(productID);

    const approved: Prisma.ReviewWhereInput = { productID, status: ReviewStatus.approved };
    const where: Prisma.ReviewWhereInput = { ...approved, ...(rating && { rating }) };
    const [list, totalItems, groups] = await Promise.all([
      this.extended.findMany({
        where,
        select: PUBLIC_REVIEW_SELECT,
        orderBy: REVIEW_ORDER_BY[sort],
        ...paginate(pagination),
      }),
      this.extended.count({ where }),
      this.extended.groupBy({ by: ['rating'], where: approved, _count: { _all: true } }),
    ]);

    return {
      ...toPage(list, totalItems, pagination.itemPerPage),
      stats: buildRatingStats(groups.map((g) => ({ rating: g.rating, count: g._count._all }))),
    };
  }

  // ───────────── của tôi ─────────────

  async create(user: UserInfo, productID: string, dto: CreateReviewDto) {
    await this.productsService.findOneOrThrow(productID);
    try {
      return await this.inTransaction(productID, async (tx) => {
        const orderID = await this.pickOrderToReview(user.userID, productID, dto.orderID, tx);
        return tx.review.create({
          data: { productID, userID: user.userID, orderID, rating: dto.rating, comment: dto.comment },
          select: PUBLIC_REVIEW_SELECT,
        });
      });
    } catch (error) {
      // 2 request cùng lúc cho cùng đơn: index unique chặn bản thứ 2
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Bạn đã đánh giá sản phẩm này cho đơn hàng này');
      }
      throw error;
    }
  }

  async updateMine(userID: string, id: string, dto: UpdateReviewDto) {
    const review = await this.findMineOrThrow(userID, id);
    return this.inTransaction(review.productID, (tx) =>
      tx.review.update({ where: { id }, data: dto, select: PUBLIC_REVIEW_SELECT }),
    );
  }

  /** Xóa review, rồi xóa ảnh của nó trên Cloudinary (chạy nền, sau khi DB đã xóa). */
  async removeMine(userID: string, id: string) {
    const review = await this.findMineOrThrow(userID, id);
    await this.inTransaction(review.productID, (tx) => tx.review.delete({ where: { id } }));
    this.imageUpload.destroyQuietly(review.images.map((img) => img.publicID));
    return { id };
  }

  // ───────────── admin ─────────────

  async findAdminList({ status, productID, rating, ...pagination }: AdminReviewListQueryDto) {
    const where: Prisma.ReviewWhereInput = {
      ...(status && { status }),
      ...(productID && { productID }),
      ...(rating && { rating }),
    };
    const [list, totalItems] = await Promise.all([
      this.extended.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...paginate(pagination),
      }),
      this.extended.count({ where }),
    ]);
    return toPage(list, totalItems, pagination.itemPerPage);
  }

  /** Ẩn / duyệt review: review không còn "approved" thì không tính vào điểm và không hiển thị. */
  async updateStatus(id: string, status: ReviewStatus) {
    const review = await this.extended.findUnique({ where: { id }, select: { productID: true } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    return this.inTransaction(review.productID, (tx) =>
      tx.review.update({ where: { id }, data: { status } }),
    );
  }

  // ───────────── helpers ─────────────

  /**
   * Đơn dùng để viết review: đơn đã giao chứa sản phẩm và chưa có review của user.
   * Gửi orderID thì phải là 1 trong các đơn đó; không gửi thì lấy đơn giao gần nhất chưa đánh giá.
   */
  private async pickOrderToReview(
    userID: string,
    productID: string,
    requestedOrderID: string | undefined,
    tx: Prisma.TransactionClient,
  ) {
    const orderIDs = await this.ordersService.findReviewableOrderIDs(userID, productID, tx);
    if (!orderIDs.length) {
      throw new BadRequestException('Chỉ đánh giá được sản phẩm trong đơn hàng đã giao thành công');
    }
    if (requestedOrderID && !orderIDs.includes(requestedOrderID)) {
      throw new BadRequestException('Đơn hàng này chưa giao hoặc không có sản phẩm này');
    }

    const reviewed = await tx.review.findMany({
      where: { userID, productID, orderID: { in: orderIDs } },
      select: { orderID: true },
    });
    const done = new Set(reviewed.map((r) => r.orderID));
    const orderID = requestedOrderID ?? orderIDs.find((id) => !done.has(id));
    if (!orderID || done.has(orderID)) {
      throw new ConflictException(
        requestedOrderID ? 'Bạn đã đánh giá sản phẩm này cho đơn hàng này' : 'Bạn đã đánh giá sản phẩm này rồi',
      );
    }
    return orderID;
  }

  private async findMineOrThrow(userID: string, id: string) {
    const review = await this.extended.findFirst({
      where: { id, userID },
      select: { productID: true, images: true },
    });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    return review;
  }

  /**
   * Ghi review rồi tính lại điểm của product trong 1 transaction. Bước tính lại ghi vào
   * document product, nên 2 review cùng lúc cho 1 sản phẩm sẽ xung đột và chạy lại tuần tự
   * → ratingAvg / ratingCount luôn đúng.
   */
  private inTransaction<T>(productID: string, write: (tx: Prisma.TransactionClient) => Promise<T>) {
    return withRetry(() =>
      this.prismaService.$transaction(async (tx) => {
        const result = await write(tx);
        const { _avg, _count } = await tx.review.aggregate({
          where: { productID, status: ReviewStatus.approved },
          _avg: { rating: true },
          _count: { _all: true },
        });
        await this.productsService.setRating(
          productID,
          { ratingAvg: roundRating(_avg.rating), ratingCount: _count._all },
          tx,
        );
        return result;
      }),
    );
  }
}
