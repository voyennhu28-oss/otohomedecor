import { CreateProductDto } from './product.dto';
import { ProductListQueryDto } from './product-query.dto';

const errorPaths = (result: { success: boolean; error?: { issues: { path: (string | number)[] }[] } }) =>
  result.error?.issues.map((i) => i.path.join('.')) ?? [];

describe('ProductListQueryDto (query string → đúng kiểu)', () => {
  const parse = (query: Record<string, string>) => ProductListQueryDto.schema.safeParse(query);

  it('chuyển chuỗi sang số / boolean / mảng, có giá trị mặc định', () => {
    const result = parse({ material: 'oak, rattan', inStock: 'true', minPrice: '1000000', page: '2' });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      material: ['oak', 'rattan'],
      inStock: true,
      minPrice: 1_000_000,
      page: 2,
      itemPerPage: 20,
      sort: 'newest',
    });
  });

  it('giá trị ngoài danh sách cho phép → lỗi', () => {
    expect(errorPaths(parse({ material: 'oak,plastic' }))).toEqual(['material.1']);
    expect(parse({ room: 'garage' }).success).toBe(false);
    expect(parse({ sort: 'random' }).success).toBe(false);
  });

  it('minPrice > maxPrice → lỗi', () => {
    expect(errorPaths(parse({ minPrice: '500', maxPrice: '100' }))).toEqual(['minPrice']);
  });

  it('itemPerPage tối đa 60', () => {
    expect(parse({ itemPerPage: '500' }).success).toBe(false);
  });
});

describe('CreateProductDto', () => {
  const variant = (sku: string, extra: Record<string, unknown> = {}) => ({
    sku,
    name: sku,
    price: 1_000_000,
    ...extra,
  });
  const body = (extra: Record<string, unknown> = {}) => ({
    name: 'Sofa',
    categoryID: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    variants: [variant('sofa-1')],
    ...extra,
  });
  const parse = (input: unknown) => CreateProductDto.schema.safeParse(input);

  it('hợp lệ: SKU viết hoa, mảng mặc định rỗng, bỏ phần tử trùng', () => {
    const result = parse(body({ rooms: ['bedroom', 'bedroom'] }));
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      rooms: ['bedroom'],
      styles: [],
      variants: [{ sku: 'SOFA-1', stock: 0, options: [], isActive: true }],
    });
  });

  it('phải có ít nhất 1 variant', () => {
    expect(errorPaths(parse(body({ variants: [] })))).toEqual(['variants']);
  });

  it('SKU trùng trong cùng request → lỗi tại variant bị trùng', () => {
    expect(errorPaths(parse(body({ variants: [variant('A'), variant('a')] })))).toEqual(['variants.1.sku']);
  });

  it('giá gạch ngang phải lớn hơn giá bán', () => {
    const result = parse(body({ variants: [variant('A', { compareAtPrice: 900_000 })] }));
    expect(errorPaths(result)).toEqual(['variants.0.compareAtPrice']);
  });

  it('không nhận field tính tự động (minPrice, ratingAvg...)', () => {
    expect(parse(body({ minPrice: 1 })).success).toBe(false);
  });
});
