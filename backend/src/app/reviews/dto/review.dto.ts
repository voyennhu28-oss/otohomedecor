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

export class ProductReviewParamDto extends createZodDto(
  z.object({ productID: objectId }),
) {}

export class ReviewImageParamDto extends createZodDto(
  z.object({ id: objectId, publicID: z.string().min(1).max(200) }),
) {}

export class ReviewListQueryDto extends createZodDto(
  z.object({
    rating: ratingQuery.optional(),
    sort: z.enum(REVIEW_SORTS).default('newest'),
    page: pageQuery,
    itemPerPage: itemPerPageQuery(50, 10),
  }),
) {}

export class CreateReviewDto extends createZodDto(
  z
    .object({
      rating,
      comment: comment.optional(),
      orderID: objectId.optional(),
    })
    .strict(),
) {}

export class UpdateReviewDto extends createZodDto(
  z
    .object({
      rating: rating.optional(),
      comment: comment.nullable().optional(),
    })
    .strict()
    .refine(
      (d) => d.rating !== undefined || d.comment !== undefined,
      'Không có gì để cập nhật',
    ),
) {}

export class AdminReviewListQueryDto extends createZodDto(
  z.object({
    status: z.nativeEnum(ReviewStatus).optional(),
    productID: objectId.optional(),
    rating: ratingQuery.optional(),
    page: pageQuery,
    itemPerPage: itemPerPageQuery(100, 20),
  }),
) {}

export class UpdateReviewStatusDto extends createZodDto(
  z.object({ status: z.nativeEnum(ReviewStatus) }).strict(),
) {}
