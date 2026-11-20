import { describe, expect, it } from 'vitest';

import {
  findCategory,
  getActiveFilters,
} from '@/features/catalog/active-filters';
import {
  CATALOG_PAGE_SIZE,
  catalogHref,
  clearedQuery,
  countActiveFilters,
  parseCatalogQuery,
  toProductListParams,
} from '@/features/catalog/product-query';
import type { PublicCategoryNode } from '@/features/categories/types';
import { getPageItems } from '@/lib/pagination';

const category = (
  slug: string,
  children: PublicCategoryNode[] = [],
): PublicCategoryNode => ({
  id: slug,
  name: slug.toUpperCase(),
  slug,
  description: null,
  imageUrl: null,
  parentID: null,
  sortOrder: 0,
  children,
});

describe('parseCatalogQuery', () => {
  it('trả về mặc định khi không có tham số', () => {
    expect(parseCatalogQuery({})).toEqual({
      q: undefined,
      category: undefined,
      collection: undefined,
      room: undefined,
      style: undefined,
      material: undefined,
      color: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      inStock: undefined,
      sort: 'newest',
      page: 1,
    });
  });

  it('giữ giá trị hợp lệ và bỏ giá trị sai', () => {
    const query = parseCatalogQuery({
      q: '  đèn  ',
      category: 'Den-Ban',
      collection: 'ha long',
      room: 'bedroom',
      style: 'gothic',
      material: 'seashell,plastic,capiz,seashell',
      color: 'Trắng ngà',
      minPrice: '500000',
      maxPrice: 'abc',
      inStock: 'true',
      sort: 'price_desc',
      page: '3',
    });
    expect(query).toMatchObject({
      q: 'đèn',
      category: 'den-ban',
      collection: undefined,
      room: 'bedroom',
      style: undefined,
      material: ['seashell', 'capiz'],
      color: 'Trắng ngà',
      minPrice: 500000,
      maxPrice: undefined,
      inStock: true,
      sort: 'price_desc',
      page: 3,
    });
  });

  it('đổi chỗ khoảng giá ngược và lấy giá trị đầu của mảng', () => {
    const query = parseCatalogQuery({
      minPrice: '900',
      maxPrice: '100',
      page: ['0', '2'],
      sort: ['unknown'],
      inStock: 'false',
    });
    expect(query).toMatchObject({
      minPrice: 100,
      maxPrice: 900,
      page: 1,
      sort: 'newest',
      inStock: undefined,
    });
  });

  it('không nhận key kế thừa từ prototype', () => {
    expect(parseCatalogQuery({ room: 'toString' }).room).toBeUndefined();
  });
});

describe('catalogHref', () => {
  const base = parseCatalogQuery({
    material: 'seashell',
    sort: 'rating',
    page: '4',
  });

  it('về trang 1 khi đổi bộ lọc và bỏ giá trị mặc định', () => {
    expect(catalogHref(base, { room: 'office' })).toBe(
      '/products?room=office&material=seashell&sort=rating',
    );
    expect(catalogHref(base, { sort: 'newest', material: undefined })).toBe(
      '/products',
    );
  });

  it('giữ trang khi patch có page', () => {
    expect(catalogHref(base, { page: 5 })).toBe(
      '/products?material=seashell&sort=rating&page=5',
    );
  });

  it('nối nhiều chất liệu bằng dấu phẩy', () => {
    expect(catalogHref(base, { material: ['seashell', 'conch'] })).toContain(
      'material=seashell%2Cconch',
    );
  });
});

describe('toProductListParams', () => {
  it('luôn gửi sort, page và itemPerPage', () => {
    expect(toProductListParams(parseCatalogQuery({}))).toMatchObject({
      sort: 'newest',
      page: 1,
      itemPerPage: CATALOG_PAGE_SIZE,
      inStock: undefined,
    });
  });
});

describe('bộ lọc đang chọn', () => {
  const tree = [category('den', [category('den-ban')]), category('trang-tri')];
  const query = parseCatalogQuery({
    q: 'sò',
    category: 'den-ban',
    material: 'seashell,conch',
    minPrice: '100000',
    maxPrice: '200000',
    inStock: 'true',
  });

  it('tìm danh mục ở cấp con', () => {
    expect(findCategory(tree, 'den-ban')?.name).toBe('DEN-BAN');
    expect(findCategory(tree, 'khong-co')).toBeUndefined();
  });

  it('đếm khoảng giá là 1 bộ lọc và không đếm từ khóa', () => {
    expect(countActiveFilters(query)).toBe(4);
    expect(countActiveFilters(clearedQuery(query))).toBe(0);
    expect(clearedQuery(query).q).toBe('sò');
  });

  it('tạo chip có patch bỏ đúng giá trị', () => {
    const chips = getActiveFilters(query, {
      categories: tree,
      collections: [],
    });
    expect(chips.map((chip) => chip.key)).toEqual([
      'q',
      'category',
      'material-seashell',
      'material-conch',
      'price',
      'inStock',
    ]);
    expect(chips[1].label).toBe('DEN-BAN');
    expect(chips[2].patch).toEqual({ material: ['conch'] });
    expect(chips[4].patch).toEqual({
      minPrice: undefined,
      maxPrice: undefined,
    });
  });
});

describe('getPageItems', () => {
  it('rút gọn bằng dấu ba chấm', () => {
    expect(getPageItems(1, 3)).toEqual([1, 2, 3]);
    expect(getPageItems(6, 12)).toEqual([
      1,
      'ellipsis',
      4,
      5,
      6,
      7,
      8,
      'ellipsis',
      12,
    ]);
    expect(getPageItems(4, 12)).toEqual([1, 2, 3, 4, 5, 6, 'ellipsis', 12]);
  });
});
