import { ProductStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MATERIALS, ROOMS, STYLES } from '../../../common/constants/catalog.const';
import { objectId, slugSchema } from '../../../common/dto/param.dto';

// Query string luôn là chuỗi, các helper dưới đây chuyển sang đúng kiểu.

/** "oak,rattan" → ["oak", "rattan"], mỗi giá trị phải nằm trong `values`. */
const commaList = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .transform((s) => s.split(',').map((v) => v.trim()).filter(Boolean))
    .pipe(z.array(z.enum(values)).min(1));

/** "true" / "false" → boolean */
const booleanQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

const price = z.coerce.number().int().min(0);
const page = z.coerce.number().int().min(1).default(1);
const itemPerPage = (max: number, fallback: number) =>
  z.coerce.number().int().min(1).max(max).default(fallback);

export const PRODUCT_SORTS = [
  'newest',
  'price_asc',
  'price_desc',
  'best_selling',
  'rating',
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/**
 * GET /products (plan mục 8). Ví dụ:
 * ?category=sofa&room=living-room&style=japandi&material=oak,rattan&color=Xám
 * &minPrice=1000000&maxPrice=20000000&inStock=true&q=sofa&sort=price_asc&page=1&itemPerPage=20
 */
export class ProductListQueryDto extends createZodDto(
  z
    .object({
      category: slugSchema.optional(), // gồm cả danh mục con
      room: z.enum(ROOMS).optional(),
      style: z.enum(STYLES).optional(),
      material: commaList(MATERIALS).optional(), // có ít nhất 1 chất liệu trong danh sách
      color: z.string().trim().min(1).max(50).optional(), // lấy từ GET /products/filters
      minPrice: price.optional(),
      maxPrice: price.optional(),
      inStock: booleanQuery.optional(),
      q: z.string().trim().min(1).max(100).optional(), // tìm theo tên
      sort: z.enum(PRODUCT_SORTS).default('newest'),
      page,
      itemPerPage: itemPerPage(60, 20),
    })
    .refine(
      (q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice,
      { message: 'minPrice phải nhỏ hơn hoặc bằng maxPrice', path: ['minPrice'] },
    ),
) {}

/** GET /products/featured?limit=8 và GET /products/:slug/related?limit=8 */
export class ProductLimitQueryDto extends createZodDto(
  z.object({ limit: z.coerce.number().int().min(1).max(24).default(8) }),
) {}

/** GET /products/filters?category=sofa */
export class ProductFiltersQueryDto extends createZodDto(
  z.object({ category: slugSchema.optional() }),
) {}

/** GET /admin/products: thấy cả sản phẩm draft / inactive. q tìm theo tên hoặc SKU. */
export class AdminProductListQueryDto extends createZodDto(
  z.object({
    q: z.string().trim().min(1).max(100).optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    categoryID: objectId.optional(),
    isFeatured: booleanQuery.optional(),
    page,
    itemPerPage: itemPerPage(100, 20),
  }),
) {}
