import { Prisma, ProductStatus } from '@prisma/client';
import { NOT_DELETED } from '../../common/prisma/prisma.service';
import type { ProductListQueryDto, ProductSort } from './dto/product-query.dto';

/**
 * Điều kiện lọc sản phẩm cho trang danh sách (plan mục 8).
 * Mỗi bộ lọc là một điều kiện trong AND, nên đọc từ trên xuống là thấy đủ.
 *
 * @param categoryIDs ID danh mục + con cháu (undefined = không lọc theo danh mục)
 */
export const buildPublicProductWhere = (
  query: Omit<ProductListQueryDto, 'sort' | 'page' | 'itemPerPage'>,
  categoryIDs?: string[],
): Prisma.ProductWhereInput => {
  const { room, style, material, color, minPrice, maxPrice, inStock, q } = query;
  const conditions: Prisma.ProductWhereInput[] = [
    { status: ProductStatus.active }, // khách chỉ thấy sản phẩm đang bán
  ];

  if (categoryIDs) conditions.push({ categoryID: { in: categoryIDs } });
  if (room) conditions.push({ rooms: { has: room } });
  if (style) conditions.push({ styles: { has: style } });
  if (material?.length) conditions.push({ materials: { hasSome: material } });
  if (color) conditions.push({ colors: { has: color } });

  // Lọc theo giá thấp nhất của sản phẩm (giá "từ ...")
  if (minPrice !== undefined || maxPrice !== undefined) {
    conditions.push({
      minPrice: {
        gte: minPrice ?? 0,
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    });
  }

  // Prisma không có full-text search trên MongoDB: dùng regex không phân biệt hoa thường
  if (q) conditions.push({ name: { contains: q, mode: 'insensitive' } });

  // Còn hàng = hàng đặt làm (luôn cho đặt) HOẶC có variant đang bán còn tồn kho
  if (inStock) {
    conditions.push({
      OR: [
        { allowBackorder: true },
        {
          variants: {
            some: { isActive: true, stock: { gt: 0 }, ...NOT_DELETED },
          },
        },
      ],
    });
  }

  return { AND: conditions };
};

/** Cách sắp xếp. Luôn có `id` cuối cùng để phân trang ổn định khi giá trị bằng nhau. */
export const PRODUCT_ORDER_BY: Record<
  ProductSort,
  Prisma.ProductOrderByWithRelationInput[]
> = {
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  price_asc: [{ minPrice: 'asc' }, { id: 'desc' }],
  price_desc: [{ minPrice: 'desc' }, { id: 'desc' }],
  best_selling: [{ soldCount: 'desc' }, { id: 'desc' }],
  rating: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }, { id: 'desc' }],
};
