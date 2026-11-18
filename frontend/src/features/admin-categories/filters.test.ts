import { describe, expect, it } from 'vitest';

import {
  CATEGORY_FILTER_DEFAULTS,
  filterCategories,
  isFlatMode,
  paginate,
  parseCategoryFilters,
} from '@/features/admin-categories/filters';
import {
  collectParentIds,
  collectSubtreeIds,
  flattenTree,
} from '@/features/admin-categories/tree';
import type { AdminCategoryNode } from '@/features/categories/types';

let seq = 0;
function node(
  name: string,
  patch: Partial<AdminCategoryNode> = {},
  children: AdminCategoryNode[] = [],
): AdminCategoryNode {
  seq += 1;
  const id = patch.id ?? `id-${seq}`;
  return {
    id,
    name,
    slug: patch.slug ?? name.toLowerCase().replace(/\s+/g, '-'),
    description: null,
    imageUrl: null,
    parentID: null,
    sortOrder: 0,
    isActive: true,
    createdAt: `2026-11-${String(seq).padStart(2, '0')}T00:00:00.000Z`,
    updatedAt: '2026-11-01T00:00:00.000Z',
    deletedAt: null,
    productCount: 0,
    ...patch,
    children: children.map((child) => ({ ...child, parentID: id })),
  };
}

const tree = [
  node('Phòng khách', { id: 'living', slug: 'phong-khach' }, [
    node('Sofa', { id: 'sofa', productCount: 12 }),
  ]),
  node('Trang trí', { id: 'decor', slug: 'trang-tri', isActive: false }, [
    node('Đèn', { id: 'lamp', slug: 'den' }, [
      node('Đèn treo', { id: 'pendant', slug: 'den-treo', productCount: 3 }),
    ]),
  ]),
];

const filters = (patch: Partial<typeof CATEGORY_FILTER_DEFAULTS> = {}) =>
  parseCategoryFilters({ ...CATEGORY_FILTER_DEFAULTS, ...patch });
const ids = (rows: ReturnType<typeof filterCategories>) =>
  rows.map((row) => row.node.id);

describe('flattenTree', () => {
  it('giữ thứ tự cây, tính cấp, tổ tiên và tổ tiên đang ẩn', () => {
    const rows = flattenTree(tree);
    expect(ids(rows)).toEqual(['living', 'sofa', 'decor', 'lamp', 'pendant']);
    const pendant = rows.find((row) => row.node.id === 'pendant')!;
    expect(pendant.depth).toBe(2);
    expect(pendant.ancestors.map((a) => a.id)).toEqual(['decor', 'lamp']);
    expect(pendant.hiddenByAncestor?.id).toBe('decor');
  });

  it('bỏ con của nhánh đang thu gọn', () => {
    expect(ids(flattenTree(tree, { collapsed: new Set(['decor']) }))).toEqual([
      'living',
      'sofa',
      'decor',
    ]);
  });

  it('collectSubtreeIds / collectParentIds', () => {
    expect([...collectSubtreeIds(tree[1])]).toEqual([
      'decor',
      'lamp',
      'pendant',
    ]);
    expect([...collectParentIds(tree)]).toEqual(['living', 'decor', 'lamp']);
  });
});

describe('filterCategories', () => {
  it('không lọc: dạng cây, tôn trọng nhánh thu gọn', () => {
    expect(isFlatMode(filters())).toBe(false);
    expect(ids(filterCategories(tree, filters(), new Set(['living'])))).toEqual(
      ['living', 'decor', 'lamp', 'pendant'],
    );
  });

  it('tìm không dấu theo tên và theo slug, bỏ qua nhánh thu gọn', () => {
    const collapsed = new Set(['decor']);
    expect(
      ids(filterCategories(tree, filters({ q: 'den' }), collapsed)),
    ).toEqual(['lamp', 'pendant']);
    expect(
      ids(filterCategories(tree, filters({ q: 'TREO' }), collapsed)),
    ).toEqual(['pendant']);
  });

  it('lọc trạng thái hiển thị / đang ẩn / ẩn theo cha', () => {
    const none = new Set<string>();
    expect(
      ids(filterCategories(tree, filters({ status: 'visible' }), none)),
    ).toEqual(['living', 'sofa']);
    expect(
      ids(filterCategories(tree, filters({ status: 'hidden' }), none)),
    ).toEqual(['decor']);
    expect(
      ids(
        filterCategories(tree, filters({ status: 'hidden-by-parent' }), none),
      ),
    ).toEqual(['lamp', 'pendant']);
  });

  it('lọc cấp, thuộc danh mục (cả cháu) và số sản phẩm', () => {
    const none = new Set<string>();
    expect(
      ids(filterCategories(tree, filters({ level: 'root' }), none)),
    ).toEqual(['living', 'decor']);
    expect(
      ids(filterCategories(tree, filters({ parent: 'decor' }), none)),
    ).toEqual(['lamp', 'pendant']);
    expect(
      ids(filterCategories(tree, filters({ products: 'has' }), none)),
    ).toEqual(['sofa', 'pendant']);
  });

  it('sắp xếp theo số sản phẩm', () => {
    expect(
      ids(
        filterCategories(tree, filters({ sort: 'products' }), new Set()),
      ).slice(0, 2),
    ).toEqual(['sofa', 'pendant']);
  });
});

describe('parseCategoryFilters / paginate', () => {
  it('giá trị URL sai thì về mặc định, size tối đa 100', () => {
    const parsed = filters({ status: 'xyz', page: '-3', size: '999' });
    expect(parsed.status).toBe('all');
    expect(parsed.page).toBe(1);
    expect(parsed.size).toBe(100);
  });

  it('cắt trang và kéo trang vượt quá về trang cuối', () => {
    const rows = Array.from({ length: 45 }, (_, index) => index);
    expect(paginate(rows, 2, 20)).toMatchObject({
      items: rows.slice(20, 40),
      page: 2,
      totalPages: 3,
      totalItems: 45,
    });
    expect(paginate(rows, 9, 20).page).toBe(3);
    expect(paginate([], 1, 20)).toMatchObject({ totalPages: 1, totalItems: 0 });
  });
});
