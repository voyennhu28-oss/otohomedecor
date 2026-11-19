import { normalizeSearch } from '@/features/admin-categories/tree';
import type { Collection } from '@/features/collections/types';
import { parseOption, parsePositiveInt } from '@/hooks/use-url-filters';

export type CollectionState = 'live' | 'scheduled' | 'ended' | 'off';

export const COLLECTION_STATES: Record<CollectionState, string> = {
  live: 'Đang hiển thị',
  scheduled: 'Sắp diễn ra',
  ended: 'Đã kết thúc',
  off: 'Đang tắt',
};

export function getCollectionState(
  collection: Pick<Collection, 'isActive' | 'startsAt' | 'endsAt'>,
  now = new Date(),
): CollectionState {
  if (!collection.isActive) return 'off';
  if (collection.startsAt && new Date(collection.startsAt) > now) {
    return 'scheduled';
  }
  if (collection.endsAt && new Date(collection.endsAt) <= now) return 'ended';
  return 'live';
}

export const COLLECTION_SORTS = {
  order: 'Theo thứ tự hiển thị',
  name: 'Tên A → Z',
  newest: 'Mới tạo nhất',
  ending: 'Sắp kết thúc',
} as const;

type SortKey = keyof typeof COLLECTION_SORTS;

export const COLLECTION_FILTER_DEFAULTS = {
  q: '',
  status: '',
  featured: '',
  sort: 'order',
  page: '1',
  size: '20',
};

export type CollectionFilters = {
  q: string;
  status: CollectionState | '';
  featured: '' | 'true' | 'false';
  sort: SortKey;
  page: number;
  size: number;
};

export function parseCollectionFilters(
  raw: typeof COLLECTION_FILTER_DEFAULTS,
): CollectionFilters {
  return {
    q: raw.q.trim(),
    status: parseOption<CollectionState | ''>(
      raw.status,
      ['', 'live', 'scheduled', 'ended', 'off'],
      '',
    ),
    featured: parseOption(raw.featured, ['', 'true', 'false'] as const, ''),
    sort: parseOption(
      raw.sort,
      Object.keys(COLLECTION_SORTS) as SortKey[],
      'order',
    ),
    page: parsePositiveInt(raw.page, 1),
    size: Math.min(parsePositiveInt(raw.size, 20), 100),
  };
}

export function hasCollectionFilters(filters: CollectionFilters) {
  return (
    filters.q !== '' ||
    filters.status !== '' ||
    filters.featured !== '' ||
    filters.sort !== 'order'
  );
}

export function filterCollections(
  collections: Collection[],
  filters: CollectionFilters,
  now = new Date(),
) {
  const q = normalizeSearch(filters.q);
  const rows = collections.filter((collection) => {
    if (
      q &&
      !normalizeSearch(collection.name).includes(q) &&
      !collection.slug.includes(q)
    ) {
      return false;
    }
    if (
      filters.status &&
      getCollectionState(collection, now) !== filters.status
    ) {
      return false;
    }
    if (
      filters.featured &&
      String(collection.isFeatured) !== filters.featured
    ) {
      return false;
    }
    return true;
  });

  switch (filters.sort) {
    case 'name':
      return rows.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    case 'newest':
      return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'ending':
      return rows.sort((a, b) => {
        if (!a.endsAt) return 1;
        if (!b.endsAt) return -1;
        return a.endsAt.localeCompare(b.endsAt);
      });
    default:
      return rows;
  }
}
