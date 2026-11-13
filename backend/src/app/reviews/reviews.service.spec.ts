import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, ReviewStatus, Role } from '@prisma/client';
import { createPrismaModelMock, PrismaModelMock } from '../../../test/mocks/prisma.mock';
import type { UserInfo } from '../../common/decorators/user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ImageUploadService } from '../../common/utils/file-util/image-upload.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { buildRatingStats, roundRating } from './review-rating';
import { ReviewsService } from './reviews.service';

const user: UserInfo = { userID: 'u1', userEmail: 'khach@x.com', role: Role.customer };
const P = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const O1 = 'bbbbbbbbbbbbbbbbbbbbbbbb'; // đơn giao gần nhất
const O2 = 'cccccccccccccccccccccccc';

describe('review-rating', () => {
  it('buildRatingStats: đủ 5 mức sao, trung bình làm tròn 1 chữ số', () => {
    expect(buildRatingStats([{ rating: 5, count: 2 }, { rating: 4, count: 1 }])).toEqual({
      average: 4.7,
      count: 3,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 },
    });
    expect(buildRatingStats([])).toEqual({ average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  });

  it('roundRating: null (chưa có review) → 0', () => {
    expect(roundRating(4.333)).toBe(4.3);
    expect(roundRating(4.25)).toBe(4.3);
    expect(roundRating(null)).toBe(0);
  });
});

describe('ReviewsService', () => {
  let service: ReviewsService;
  let review: PrismaModelMock & { groupBy: jest.Mock; aggregate: jest.Mock };
  let transaction: jest.Mock;
  const products = { ensureActive: jest.fn(), findOneOrThrow: jest.fn(), setRating: jest.fn() };
  const orders = { findReviewableOrderIDs: jest.fn() };
  const imageUpload = { destroyQuietly: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    review = Object.assign(createPrismaModelMock(), { groupBy: jest.fn(), aggregate: jest.fn() });
    review.create.mockImplementation(({ data }) => Promise.resolve({ id: 'r1', ...data }));
    review.update.mockImplementation(({ data }) => Promise.resolve({ id: 'r1', ...data }));
    review.findMany.mockResolvedValue([]);
    review.aggregate.mockResolvedValue({ _avg: { rating: 4.666 }, _count: { _all: 3 } });
    orders.findReviewableOrderIDs.mockResolvedValue([O1, O2]);
    const prisma = { review, extended: { review } } as unknown as PrismaService;
    transaction = jest.fn((fn: (tx: unknown) => unknown) => fn(prisma));
    Object.assign(prisma, { $transaction: transaction });
    service = new ReviewsService(
      prisma,
      products as unknown as ProductsService,
      orders as unknown as OrdersService,
      imageUpload as unknown as ImageUploadService,
    );
  });

  /** ratingAvg / ratingCount được tính lại trong cùng transaction, chỉ từ review đã duyệt. */
  const expectRatingRecalculated = () => {
    expect(review.aggregate).toHaveBeenCalledWith({
      where: { productID: P, status: ReviewStatus.approved },
      _avg: { rating: true },
      _count: { _all: true },
    });
    expect(products.setRating).toHaveBeenCalledWith(P, { ratingAvg: 4.7, ratingCount: 3 }, expect.anything());
  };

  describe('findPublic', () => {
    it('chỉ review đã duyệt của sản phẩm đang bán; không lộ email / userID; kèm thống kê', async () => {
      review.findMany.mockResolvedValue([{ id: 'r1' }]);
      review.count.mockResolvedValue(11);
      review.groupBy.mockResolvedValue([
        { rating: 5, _count: { _all: 8 } },
        { rating: 1, _count: { _all: 3 } },
      ]);

      const result = await service.findPublic(P, { sort: 'rating_desc', page: 2, itemPerPage: 10 });

      expect(products.ensureActive).toHaveBeenCalledWith(P);
      const args = review.findMany.mock.calls[0][0];
      expect(args).toMatchObject({
        where: { productID: P, status: 'approved' },
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
        skip: 10,
        take: 10,
      });
      expect(args.select.user).toEqual({ select: { fullName: true, avatarUrl: true } });
      expect(args.select).not.toHaveProperty('userID');
      expect(result).toMatchObject({
        list: [{ id: 'r1' }],
        totalItems: 11,
        totalPages: 2,
        stats: { average: 3.9, count: 11, distribution: { 5: 8, 1: 3 } }, // (8×5 + 3×1) / 11 = 3.909
      });
    });

    it('lọc theo số sao: danh sách lọc, thống kê vẫn tính trên mọi review đã duyệt', async () => {
      review.count.mockResolvedValue(0);
      review.groupBy.mockResolvedValue([]);
      await service.findPublic(P, { rating: 5, sort: 'newest', page: 1, itemPerPage: 10 });
      expect(review.findMany.mock.calls[0][0].where).toEqual({ productID: P, status: 'approved', rating: 5 });
      expect(review.groupBy.mock.calls[0][0].where).toEqual({ productID: P, status: 'approved' });
    });

    it('sản phẩm không đang bán → 404', async () => {
      products.ensureActive.mockRejectedValue(new NotFoundException());
      await expect(service.findPublic(P, { sort: 'newest', page: 1, itemPerPage: 10 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('tự chọn đơn đã giao gần nhất chưa đánh giá; tính lại điểm trong cùng transaction', async () => {
      review.findMany.mockResolvedValue([{ orderID: O1 }]); // đơn O1 đã đánh giá

      await service.create(user, P, { rating: 5, comment: 'Đẹp' });

      expect(orders.findReviewableOrderIDs).toHaveBeenCalledWith('u1', P, expect.anything());
      expect(review.create.mock.calls[0][0].data).toEqual({
        productID: P,
        userID: 'u1',
        orderID: O2,
        rating: 5,
        comment: 'Đẹp',
      });
      expect(transaction).toHaveBeenCalledTimes(1);
      expectRatingRecalculated();
    });

    it('chọn đơn cụ thể', async () => {
      await service.create(user, P, { rating: 4, orderID: O2 });
      expect(review.create.mock.calls[0][0].data.orderID).toBe(O2);
    });

    it('chưa có đơn đã giao chứa sản phẩm → 400, không ghi', async () => {
      orders.findReviewableOrderIDs.mockResolvedValue([]);
      await expect(service.create(user, P, { rating: 5 })).rejects.toThrow(/đơn hàng đã giao/);
      expect(review.create).not.toHaveBeenCalled();
      expect(products.setRating).not.toHaveBeenCalled();
    });

    it('chọn đơn không hợp lệ (chưa giao / không có sản phẩm / của người khác) → 400', async () => {
      await expect(service.create(user, P, { rating: 5, orderID: 'dddddddddddddddddddddddd' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('đã đánh giá hết các đơn → 409; chọn đơn đã đánh giá → 409', async () => {
      review.findMany.mockResolvedValue([{ orderID: O1 }, { orderID: O2 }]);
      await expect(service.create(user, P, { rating: 5 })).rejects.toThrow('Bạn đã đánh giá sản phẩm này rồi');
      await expect(service.create(user, P, { rating: 5, orderID: O1 })).rejects.toThrow(/cho đơn hàng này/);
    });

    it('2 request cùng lúc cho 1 đơn: index unique (P2002) → 409 thân thiện', async () => {
      review.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 't' }));
      await expect(service.create(user, P, { rating: 5 })).rejects.toThrow(
        new ConflictException('Bạn đã đánh giá sản phẩm này cho đơn hàng này'),
      );
    });

    it('sản phẩm không tồn tại → 404', async () => {
      products.findOneOrThrow.mockRejectedValue(new NotFoundException());
      await expect(service.create(user, P, { rating: 5 })).rejects.toBeInstanceOf(NotFoundException);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('2 review cùng lúc cho 1 sản phẩm (P2034 khi ghi điểm) → chạy lại', async () => {
      products.setRating
        .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 't' }))
        .mockResolvedValue(undefined);
      await service.create(user, P, { rating: 5 });
      expect(transaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('sửa / xóa của tôi', () => {
    it('updateMine: chỉ chủ review; tính lại điểm', async () => {
      review.findFirst.mockResolvedValue({ productID: P, images: [] });
      await service.updateMine('u1', 'r1', { rating: 3 });
      expect(review.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', userID: 'u1' },
        select: { productID: true, images: true },
      });
      expect(review.update.mock.calls[0][0]).toMatchObject({ where: { id: 'r1' }, data: { rating: 3 } });
      expectRatingRecalculated();
    });

    it('removeMine: xóa rồi tính lại điểm, xóa ảnh trên Cloudinary SAU khi DB đã xóa', async () => {
      review.findFirst.mockResolvedValue({
        productID: P,
        images: [{ url: 'u', publicID: 'hd-review-r1-a', alt: null, sortOrder: 0 }],
      });
      await expect(service.removeMine('u1', 'r1')).resolves.toEqual({ id: 'r1' });
      expect(review.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
      expectRatingRecalculated();
      expect(imageUpload.destroyQuietly).toHaveBeenCalledWith(['hd-review-r1-a']);
      expect(imageUpload.destroyQuietly.mock.invocationCallOrder[0]).toBeGreaterThan(
        review.delete.mock.invocationCallOrder[0],
      );
    });

    it('removeMine: xóa DB lỗi thì KHÔNG xóa ảnh', async () => {
      review.findFirst.mockResolvedValue({ productID: P, images: [{ url: 'u', publicID: 'x', alt: null, sortOrder: 0 }] });
      review.delete.mockRejectedValue(new Error('db down'));
      await expect(service.removeMine('u1', 'r1')).rejects.toThrow('db down');
      expect(imageUpload.destroyQuietly).not.toHaveBeenCalled();
    });

    it('review của người khác / không tồn tại → 404, không ghi', async () => {
      review.findFirst.mockResolvedValue(null);
      await expect(service.updateMine('u1', 'r1', { rating: 1 })).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.removeMine('u1', 'r1')).rejects.toBeInstanceOf(NotFoundException);
      expect(review.update).not.toHaveBeenCalled();
      expect(review.delete).not.toHaveBeenCalled();
    });
  });

  describe('admin', () => {
    it('updateStatus: ẩn review → tính lại điểm (review ẩn không được tính)', async () => {
      review.findUnique.mockResolvedValue({ productID: P });
      await service.updateStatus('r1', ReviewStatus.hidden);
      expect(review.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { status: 'hidden' } });
      expectRatingRecalculated();
    });

    it('updateStatus: không có review → 404', async () => {
      review.findUnique.mockResolvedValue(null);
      await expect(service.updateStatus('x', ReviewStatus.hidden)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('chưa còn review nào được duyệt → điểm về 0', async () => {
      review.findUnique.mockResolvedValue({ productID: P });
      review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } });
      await service.updateStatus('r1', ReviewStatus.hidden);
      expect(products.setRating).toHaveBeenCalledWith(P, { ratingAvg: 0, ratingCount: 0 }, expect.anything());
    });

    it('findAdminList: lọc theo trạng thái / sản phẩm / số sao, kèm user + product', async () => {
      review.count.mockResolvedValue(0);
      await service.findAdminList({ status: ReviewStatus.hidden, productID: P, rating: 1, page: 1, itemPerPage: 20 });
      const args = review.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ status: 'hidden', productID: P, rating: 1 });
      expect(args.include.user.select).toMatchObject({ email: true });
      expect(review.count).toHaveBeenCalledWith({ where: args.where });
    });
  });
});
