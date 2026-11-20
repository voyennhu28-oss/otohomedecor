import { MATERIALS, ROOMS, STYLES } from '@/constants/catalog';
import type { PublicCategoryNode } from '@/features/categories/types';
import type { PublicCollection } from '@/features/collections/types';
import { formatVND } from '@/lib/format';

import type { CatalogQuery } from './product-query';

export type ActiveFilter = {
  key: string;
  label: string;
  patch: Partial<CatalogQuery>;
};

export function findCategory(
  nodes: PublicCategoryNode[],
  slug: string | undefined,
): PublicCategoryNode | undefined {
  if (!slug) return undefined;
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const found = findCategory(node.children, slug);
    if (found) return found;
  }
  return undefined;
}

function priceLabel(min: number | undefined, max: number | undefined) {
  if (min !== undefined && max !== undefined) {
    return `${formatVND(min)} – ${formatVND(max)}`;
  }
  if (min !== undefined) return `Từ ${formatVND(min)}`;
  return `Đến ${formatVND(max ?? 0)}`;
}

export function getActiveFilters(
  query: CatalogQuery,
  {
    categories,
    collections,
  }: { categories: PublicCategoryNode[]; collections: PublicCollection[] },
): ActiveFilter[] {
  const filters: ActiveFilter[] = [];

  if (query.q) {
    filters.push({ key: 'q', label: `“${query.q}”`, patch: { q: undefined } });
  }
  if (query.category) {
    filters.push({
      key: 'category',
      label: findCategory(categories, query.category)?.name ?? query.category,
      patch: { category: undefined },
    });
  }
  if (query.collection) {
    filters.push({
      key: 'collection',
      label:
        collections.find((item) => item.slug === query.collection)?.name ??
        query.collection,
      patch: { collection: undefined },
    });
  }
  for (const material of query.material ?? []) {
    const rest = query.material?.filter((item) => item !== material) ?? [];
    filters.push({
      key: `material-${material}`,
      label: MATERIALS[material],
      patch: { material: rest.length > 0 ? rest : undefined },
    });
  }
  if (query.room) {
    filters.push({
      key: 'room',
      label: ROOMS[query.room],
      patch: { room: undefined },
    });
  }
  if (query.style) {
    filters.push({
      key: 'style',
      label: STYLES[query.style],
      patch: { style: undefined },
    });
  }
  if (query.color) {
    filters.push({
      key: 'color',
      label: `Màu ${query.color}`,
      patch: { color: undefined },
    });
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filters.push({
      key: 'price',
      label: priceLabel(query.minPrice, query.maxPrice),
      patch: { minPrice: undefined, maxPrice: undefined },
    });
  }
  if (query.inStock) {
    filters.push({
      key: 'inStock',
      label: 'Còn hàng',
      patch: { inStock: undefined },
    });
  }

  return filters;
}
