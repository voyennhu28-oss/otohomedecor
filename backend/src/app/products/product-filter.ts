import { Prisma, ProductStatus } from '@prisma/client';
import { NOT_DELETED } from '../../common/prisma/prisma.service';
import type { ProductListQueryDto, ProductSort } from './dto/product-query.dto';

export const buildPublicProductWhere = (
  query: Omit<
    ProductListQueryDto,
    'sort' | 'page' | 'itemPerPage' | 'category' | 'collection'
  >,
  categoryIDs?: string[],
  collectionID?: string,
): Prisma.ProductWhereInput => {
  const { room, style, material, color, minPrice, maxPrice, inStock, q } =
    query;
  const conditions: Prisma.ProductWhereInput[] = [
    { status: ProductStatus.active },
  ];

  if (categoryIDs) conditions.push({ categoryID: { in: categoryIDs } });
  if (collectionID) conditions.push({ collectionIDs: { has: collectionID } });
  if (room) conditions.push({ rooms: { has: room } });
  if (style) conditions.push({ styles: { has: style } });
  if (material?.length) conditions.push({ materials: { hasSome: material } });
  if (color) conditions.push({ colors: { has: color } });

  if (minPrice !== undefined || maxPrice !== undefined) {
    conditions.push({
      minPrice: {
        gte: minPrice ?? 0,
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    });
  }

  if (q) conditions.push({ name: { contains: q, mode: 'insensitive' } });

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
