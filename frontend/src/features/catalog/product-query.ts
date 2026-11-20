import {
  MATERIALS,
  type Material,
  ROOMS,
  type Room,
  STYLES,
  type Style,
} from '@/constants/catalog';
import type { ProductSort } from '@/features/products/types';
import { toQueryString } from '@/lib/query-string';

export const PRODUCT_SORTS: Record<ProductSort, string> = {
  newest: 'Mới nhất',
  best_selling: 'Bán chạy',
  rating: 'Đánh giá cao',
  price_asc: 'Giá thấp đến cao',
  price_desc: 'Giá cao đến thấp',
};

export const CATALOG_PAGE_SIZE = 12;
export const CATALOG_PATH = '/products';

export type CatalogQuery = {
  q?: string;
  category?: string;
  collection?: string;
  room?: Room;
  style?: Style;
  material?: Material[];
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort: ProductSort;
  page: number;
};

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function first(value: string | string[] | undefined) {
  const text = Array.isArray(value) ? value[0] : value;
  const trimmed = text?.trim();
  return trimmed ? trimmed : undefined;
}

function isKey<T extends object>(
  record: T,
  key: string,
): key is Extract<keyof T, string> {
  return Object.hasOwn(record, key);
}

function pickKey<T extends object>(record: T, value: string | undefined) {
  return value !== undefined && isKey(record, value) ? value : undefined;
}

function slug(value: string | undefined) {
  const text = value?.toLowerCase();
  return text && text.length <= 120 && SLUG_PATTERN.test(text)
    ? text
    : undefined;
}

function money(value: string | undefined) {
  if (value === undefined || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
}

function materials(value: string | undefined) {
  if (!value) return undefined;
  const list = [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter((item): item is Material => isKey(MATERIALS, item)),
    ),
  ];
  return list.length > 0 ? list : undefined;
}

export function parseCatalogQuery(params: CatalogSearchParams): CatalogQuery {
  const q = first(params.q)?.slice(0, 100);
  const color = first(params.color);
  let minPrice = money(first(params.minPrice));
  let maxPrice = money(first(params.maxPrice));
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  const page = Number(first(params.page));
  const inStock = first(params.inStock);

  return {
    q,
    category: slug(first(params.category)),
    collection: slug(first(params.collection)),
    room: pickKey(ROOMS, first(params.room)),
    style: pickKey(STYLES, first(params.style)),
    material: materials(first(params.material)),
    color: color && color.length <= 50 ? color : undefined,
    minPrice,
    maxPrice,
    inStock: inStock === 'true' ? true : undefined,
    sort: pickKey(PRODUCT_SORTS, first(params.sort)) ?? 'newest',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function toParams(query: CatalogQuery) {
  return {
    q: query.q,
    category: query.category,
    collection: query.collection,
    room: query.room,
    style: query.style,
    material: query.material?.join(','),
    color: query.color,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    inStock: query.inStock ? 'true' : undefined,
    sort: query.sort === 'newest' ? undefined : query.sort,
    page: query.page > 1 ? query.page : undefined,
  };
}

export function catalogHref(
  query: CatalogQuery,
  patch: Partial<CatalogQuery> = {},
) {
  const next = { ...query, page: 1, ...patch };
  return `${CATALOG_PATH}${toQueryString(toParams(next))}`;
}

export function toProductListParams(query: CatalogQuery) {
  return {
    ...toParams(query),
    sort: query.sort,
    page: query.page,
    itemPerPage: CATALOG_PAGE_SIZE,
  };
}

export const FILTER_KEYS = [
  'category',
  'collection',
  'room',
  'style',
  'material',
  'color',
  'minPrice',
  'maxPrice',
  'inStock',
] as const satisfies readonly (keyof CatalogQuery)[];

export function countActiveFilters(query: CatalogQuery) {
  return FILTER_KEYS.filter((key) =>
    key === 'maxPrice'
      ? query.minPrice === undefined && query.maxPrice !== undefined
      : query[key] !== undefined,
  ).length;
}

export function clearedQuery(query: CatalogQuery): CatalogQuery {
  return { sort: query.sort, page: 1, q: query.q };
}
