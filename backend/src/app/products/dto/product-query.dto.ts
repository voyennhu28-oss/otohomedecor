import { ProductStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  MATERIALS,
  ROOMS,
  STYLES,
} from '../../../common/constants/catalog.const';
import { objectId, slugSchema } from '../../../common/dto/param.dto';
import {
  booleanQuery,
  itemPerPageQuery as itemPerPage,
  pageQuery as page,
} from '../../../common/dto/query.dto';

const commaList = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .transform((s) =>
      s
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(values)).min(1));

const price = z.coerce.number().int().min(0);

export const PRODUCT_SORTS = [
  'newest',
  'price_asc',
  'price_desc',
  'best_selling',
  'rating',
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export class ProductListQueryDto extends createZodDto(
  z
    .object({
      category: slugSchema.optional(),
      collection: slugSchema.optional(),
      room: z.enum(ROOMS).optional(),
      style: z.enum(STYLES).optional(),
      material: commaList(MATERIALS).optional(),
      color: z.string().trim().min(1).max(50).optional(),
      minPrice: price.optional(),
      maxPrice: price.optional(),
      inStock: booleanQuery.optional(),
      q: z.string().trim().min(1).max(100).optional(),
      sort: z.enum(PRODUCT_SORTS).default('newest'),
      page,
      itemPerPage: itemPerPage(60, 20),
    })
    .refine(
      (q) =>
        q.minPrice === undefined ||
        q.maxPrice === undefined ||
        q.minPrice <= q.maxPrice,
      {
        message: 'minPrice phải nhỏ hơn hoặc bằng maxPrice',
        path: ['minPrice'],
      },
    ),
) {}

export class ProductLimitQueryDto extends createZodDto(
  z.object({ limit: z.coerce.number().int().min(1).max(24).default(8) }),
) {}

export class ProductFiltersQueryDto extends createZodDto(
  z.object({
    category: slugSchema.optional(),
    collection: slugSchema.optional(),
  }),
) {}

export class AdminProductListQueryDto extends createZodDto(
  z.object({
    q: z.string().trim().min(1).max(100).optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    categoryID: objectId.optional(),
    collectionID: objectId.optional(),
    isFeatured: booleanQuery.optional(),
    page,
    itemPerPage: itemPerPage(100, 20),
  }),
) {}
