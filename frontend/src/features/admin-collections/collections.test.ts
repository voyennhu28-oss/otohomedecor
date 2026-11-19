import { describe, expect, it } from 'vitest';

import {
  COLLECTION_FILTER_DEFAULTS,
  filterCollections,
  getCollectionState,
  parseCollectionFilters,
} from '@/features/admin-collections/filters';
import {
  getCollectionFormSchema,
  toCollectionFormValues,
  toCreateCollectionInput,
  toUpdateCollectionInput,
} from '@/features/admin-collections/schemas';
import type { Collection } from '@/features/collections/types';

const NOW = new Date('2026-11-19T12:00:00.000Z');

const collection = (patch: Partial<Collection> = {}): Collection => ({
  id: 'c1',
  name: 'Biển xanh',
  slug: 'bien-xanh',
  description: null,
  image: null,
  isActive: true,
  isFeatured: false,
  sortOrder: 0,
  startsAt: null,
  endsAt: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  deletedAt: null,
  ...patch,
});

describe('getCollectionState', () => {
  it('tắt / sắp diễn ra / đã kết thúc / đang hiển thị', () => {
    expect(getCollectionState(collection({ isActive: false }), NOW)).toBe(
      'off',
    );
    expect(
      getCollectionState(
        collection({ startsAt: '2026-12-01T00:00:00.000Z' }),
        NOW,
      ),
    ).toBe('scheduled');
    expect(
      getCollectionState(
        collection({ endsAt: '2026-11-19T12:00:00.000Z' }),
        NOW,
      ),
    ).toBe('ended');
    expect(getCollectionState(collection(), NOW)).toBe('live');
  });
});

describe('filterCollections', () => {
  const list = [
    collection({
      id: 'a',
      name: 'Đèn biển',
      slug: 'den-bien',
      isFeatured: true,
    }),
    collection({ id: 'b', name: 'Tết', slug: 'tet', isActive: false }),
    collection({
      id: 'c',
      name: 'Giáng sinh',
      slug: 'giang-sinh',
      endsAt: '2026-12-26T00:00:00.000Z',
    }),
  ];
  const filters = (patch: Partial<typeof COLLECTION_FILTER_DEFAULTS>) =>
    parseCollectionFilters({ ...COLLECTION_FILTER_DEFAULTS, ...patch });
  const ids = (rows: Collection[]) => rows.map((row) => row.id);

  it('tìm không dấu, lọc trạng thái và nổi bật', () => {
    expect(ids(filterCollections(list, filters({ q: 'den' }), NOW))).toEqual([
      'a',
    ]);
    expect(
      ids(filterCollections(list, filters({ status: 'off' }), NOW)),
    ).toEqual(['b']);
    expect(
      ids(filterCollections(list, filters({ featured: 'true' }), NOW)),
    ).toEqual(['a']);
  });

  it('sắp kết thúc: bộ sưu tập có hạn lên trước', () => {
    expect(
      ids(filterCollections([...list], filters({ sort: 'ending' }), NOW))[0],
    ).toBe('c');
  });
});

describe('collection form', () => {
  it('kết thúc phải sau bắt đầu', () => {
    const result = getCollectionFormSchema('create').safeParse({
      ...toCollectionFormValues(),
      name: 'Tết',
      startsAt: '2026-12-10T08:00',
      endsAt: '2026-12-01T08:00',
    });
    expect(result.error?.issues[0].path).toEqual(['endsAt']);
  });

  it('tạo mới bỏ field trống, sửa chỉ gửi field đã đổi', () => {
    const create = toCreateCollectionInput({
      ...toCollectionFormValues(),
      name: 'Tết',
    });
    expect(create).toEqual({
      name: 'Tết',
      sortOrder: 0,
      isActive: true,
      isFeatured: false,
    });

    const original = collection({ endsAt: '2026-12-26T00:00:00.000Z' });
    const values = toCollectionFormValues(original);
    expect(toUpdateCollectionInput(values, original)).toEqual({});
    expect(
      toUpdateCollectionInput(
        { ...values, endsAt: '', isFeatured: true },
        original,
      ),
    ).toEqual({ endsAt: null, isFeatured: true });
  });
});
