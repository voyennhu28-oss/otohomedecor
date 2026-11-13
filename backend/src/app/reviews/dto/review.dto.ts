import { ReviewStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { objectId } from '../../../common/dto/param.dto';
import { itemPerPageQuery, pageQuery } from '../../../common/dto/query.dto';

const rating = z.number().int().min(1).max(5);
const comment = z.string().trim().min(1).max(2000);
const ratingQuery = z.coerce.number().int().min(1).max(5);

export const REVIEW_SORTS = ['newest', 'rating_desc', 'rating_asc'] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

export class ProductReviewParamDto extends createZodDto(z.object({ productID: objectId })) {}

export class ReviewImageParamDto extends createZodDto(
  z.object({ id: objectId, publicID: z.string().min(1).max(200) }),
) {}

/** GET /products/:productID/reviews?rating=5&sort=newest&page=1 */
export class ReviewListQueryDto extends createZodDto(
  z.object({
    rating: ratingQuery.optional(), // chỉ xem review N sao
    sort: z.enum(REVIEW_SORTS).default('newest'),
    page: pageQuery,
    itemPerPage: itemPerPageQuery(50, 10),
  }),
) {}

/**
 * POST /products/:productID/reviews. Chỉ khi có đơn ĐÃ GIAO chứa sản phẩm; mỗi đơn 1 review.
 * Không gửi orderID thì tự chọn đơn đã giao gần nhất chưa đánh giá.
 */
export class CreateReviewDto extends createZodDto(
  z.object({ rating, comment: comment.optional(), orderID: objectId.optional() }).strict(),
) {}

/** PATCH /reviews/:id (chủ review). comment = null để xóa nội dung. */
export class UpdateReviewDto extends createZodDto(
  z
    .object({ rating: rating.optional(), comment: comment.nullable().optional() })
    .strict()
    .refine((d) => d.rating !== undefined || d.comment !== undefined, 'Không có gì để cập nhật'),
) {}

/** GET /admin/reviews */
export class AdminReviewListQueryDto extends createZodDto(
  z.object({
    status: z.nativeEnum(ReviewStatus).optional(),
    productID: objectId.optional(),
    rating: ratingQuery.optional(),
    page: pageQuery,
    itemPerPage: itemPerPageQuery(100, 20),
  }),
) {}

/** PATCH /admin/reviews/:id/status: ẩn (hidden), duyệt (approved) hoặc chờ duyệt (pending). */
export class UpdateReviewStatusDto extends createZodDto(
  z.object({ status: z.nativeEnum(ReviewStatus) }).strict(),
) {}
