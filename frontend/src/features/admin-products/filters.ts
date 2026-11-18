import { PRODUCT_STATUSES, type ProductStatus } from '@/constants/catalog';
import type { AdminProductQuery } from '@/features/products/types';
import { parseOption, parsePositiveInt } from '@/hooks/use-url-filters';

export const PRODUCT_FILTER_DEFAULTS = {
  q: '',
  status: '',
  category: '',
  featured: '',
  page: '1',
  size: '20',
};

export type ProductFilterValues = typeof PRODUCT_FILTER_DEFAULTS;

const STATUS_KEYS = Object.keys(PRODUCT_STATUSES) as ProductStatus[];
const OBJECT_ID = /^[a-f\d]{24}$/i;

export function toProductQuery(raw: ProductFilterValues): AdminProductQuery {
  const q = raw.q.trim().slice(0, 100);
  const status = parseOption<ProductStatus | ''>(
    raw.status,
    ['', ...STATUS_KEYS],
    '',
  );
  const featured = parseOption(raw.featured, ['', 'true', 'false'], '');
  return {
    q: q || undefined,
    status: status || undefined,
    categoryID: OBJECT_ID.test(raw.category) ? raw.category : undefined,
    isFeatured: featured === '' ? undefined : featured === 'true',
    page: parsePositiveInt(raw.page, 1),
    itemPerPage: Math.min(parsePositiveInt(raw.size, 20), 100),
  };
}

export function hasProductFilters(query: AdminProductQuery) {
  return (
    query.q !== undefined ||
    query.status !== undefined ||
    query.categoryID !== undefined ||
    query.isFeatured !== undefined
  );
}
