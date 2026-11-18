import {
  flattenTree,
  normalizeSearch,
  type FlatCategory,
} from '@/features/admin-categories/tree';
import type { AdminCategoryNode } from '@/features/categories/types';
import { parseOption, parsePositiveInt } from '@/hooks/use-url-filters';

export const STATUS_FILTERS = {
  all: 'Mọi trạng thái',
  visible: 'Hiển thị',
  hidden: 'Đang ẩn',
  'hidden-by-parent': 'Ẩn theo danh mục cha',
} as const;

export const LEVEL_FILTERS = {
  all: 'Mọi cấp',
  root: 'Danh mục gốc',
  child: 'Danh mục con',
} as const;

export const PRODUCT_FILTERS = {
  all: 'Mọi số sản phẩm',
  has: 'Có sản phẩm',
  empty: 'Chưa có sản phẩm',
} as const;

export const SORT_OPTIONS = {
  tree: 'Theo cây (thứ tự hiển thị)',
  name: 'Tên A → Z',
  products: 'Nhiều sản phẩm nhất',
  newest: 'Mới tạo nhất',
} as const;

type Keys<T> = Extract<keyof T, string>;
const keysOf = <T extends object>(object: T) =>
  Object.keys(object) as Keys<T>[];

export const CATEGORY_FILTER_DEFAULTS = {
  q: '',
  status: 'all',
  level: 'all',
  parent: '',
  products: 'all',
  sort: 'tree',
  page: '1',
  size: '20',
};

export type CategoryFilters = {
  q: string;
  status: Keys<typeof STATUS_FILTERS>;
  level: Keys<typeof LEVEL_FILTERS>;
  parent: string;
  products: Keys<typeof PRODUCT_FILTERS>;
  sort: Keys<typeof SORT_OPTIONS>;
  page: number;
  size: number;
};

export function parseCategoryFilters(
  raw: typeof CATEGORY_FILTER_DEFAULTS,
): CategoryFilters {
  return {
    q: raw.q.trim(),
    status: parseOption(raw.status, keysOf(STATUS_FILTERS), 'all'),
    level: parseOption(raw.level, keysOf(LEVEL_FILTERS), 'all'),
    parent: raw.parent,
    products: parseOption(raw.products, keysOf(PRODUCT_FILTERS), 'all'),
    sort: parseOption(raw.sort, keysOf(SORT_OPTIONS), 'tree'),
    page: parsePositiveInt(raw.page, 1),
    size: Math.min(parsePositiveInt(raw.size, 20), 100),
  };
}

export function isFlatMode(filters: CategoryFilters) {
  return (
    filters.q !== '' ||
    filters.status !== 'all' ||
    filters.level !== 'all' ||
    filters.parent !== '' ||
    filters.products !== 'all' ||
    filters.sort !== 'tree'
  );
}

export function filterCategories(
  tree: AdminCategoryNode[],
  filters: CategoryFilters,
  collapsed: ReadonlySet<string>,
): FlatCategory[] {
  if (!isFlatMode(filters)) return flattenTree(tree, { collapsed });

  const q = normalizeSearch(filters.q);
  const rows = flattenTree(tree).filter(
    ({ node, depth, ancestors, hiddenByAncestor }) => {
      if (
        q &&
        !normalizeSearch(node.name).includes(q) &&
        !node.slug.includes(q)
      ) {
        return false;
      }
      if (filters.status === 'visible' && (!node.isActive || hiddenByAncestor))
        return false;
      if (filters.status === 'hidden' && node.isActive) return false;
      if (
        filters.status === 'hidden-by-parent' &&
        (!node.isActive || !hiddenByAncestor)
      )
        return false;
      if (filters.level === 'root' && depth > 0) return false;
      if (filters.level === 'child' && depth === 0) return false;
      if (
        filters.parent &&
        !ancestors.some((ancestor) => ancestor.id === filters.parent)
      )
        return false;
      if (filters.products === 'has' && node.productCount === 0) return false;
      if (filters.products === 'empty' && node.productCount > 0) return false;
      return true;
    },
  );

  switch (filters.sort) {
    case 'name':
      return rows.sort((a, b) => a.node.name.localeCompare(b.node.name, 'vi'));
    case 'products':
      return rows.sort(
        (a, b) =>
          b.node.productCount - a.node.productCount ||
          a.node.name.localeCompare(b.node.name, 'vi'),
      );
    case 'newest':
      return rows.sort((a, b) =>
        b.node.createdAt.localeCompare(a.node.createdAt),
      );
    default:
      return rows;
  }
}

export function paginate<T>(rows: T[], page: number, size: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, totalPages);
  return {
    items: rows.slice((current - 1) * size, current * size),
    page: current,
    totalPages,
    totalItems: rows.length,
  };
}
