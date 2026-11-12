import { CreateProductDto } from '../dto/product.dto';
import {
  cellBoolean,
  cellList,
  cellNumber,
  cellOptions,
  cellText,
  groupRowsByProduct,
  toCreateProductInput,
  toExcelRows,
} from './product-excel.mapper';

describe('đọc giá trị ô Excel', () => {
  it('cellText: ô trống / toàn khoảng trắng → undefined', () => {
    expect(cellText('  Sofa ')).toBe('Sofa');
    expect(cellText('   ')).toBeUndefined();
    expect(cellText(null)).toBeUndefined();
    expect(cellText(12)).toBe('12');
  });

  it('cellNumber: chữ → NaN để Zod báo lỗi', () => {
    expect(cellNumber(1500000)).toBe(1_500_000);
    expect(cellNumber('2000')).toBe(2000);
    expect(cellNumber('')).toBeUndefined();
    expect(cellNumber('abc')).toBeNaN();
  });

  it('cellBoolean', () => {
    expect(cellBoolean(true)).toBe(true);
    for (const yes of ['TRUE', '1', 'x', 'Có', 'yes']) expect(cellBoolean(yes)).toBe(true);
    expect(cellBoolean('FALSE')).toBe(false);
    expect(cellBoolean('')).toBeUndefined();
  });

  it('cellList / cellOptions', () => {
    expect(cellList('oak, rattan,,')).toEqual(['oak', 'rattan']);
    expect(cellOptions('Màu: Xám; Kích thước: 3 chỗ; hỏng')).toEqual([
      { name: 'Màu', value: 'Xám' },
      { name: 'Kích thước', value: '3 chỗ' },
    ]);
  });
});

describe('groupRowsByProduct', () => {
  it('nhóm theo slug, không có slug thì theo name; báo dòng thiếu cả hai', () => {
    const { groups, rowsWithoutProduct } = groupRowsByProduct([
      { name: 'Sofa A', slug: 'sofa-a', sku: 'A1' }, // dòng 2
      { name: 'Sofa A', slug: 'sofa-a', sku: 'A2' }, // dòng 3
      { name: 'Đèn B', sku: 'B1' }, //                dòng 4
      { sku: 'C1' }, //                               dòng 5
      { name: 'Đèn B', sku: 'B2' }, //                dòng 6
    ]);
    expect(groups.map((g) => g.rowNumbers)).toEqual([[2, 3], [4, 6]]);
    expect(rowsWithoutProduct).toEqual([5]);
  });
});

describe('toCreateProductInput', () => {
  const group = {
    rowNumbers: [2, 3],
    rows: [
      {
        name: 'Sofa A', categorySlug: 'sofa', rooms: 'living-room', materials: 'oak, linen',
        requiresAssembly: 'x', assemblyFee: 300000,
        sku: 'sofa-a-1', variantName: '2 chỗ', options: 'Màu: Be', price: 9900000, stock: 3,
        lengthCm: 160, widthCm: 85, heightCm: 80,
      },
      { name: 'BỎ QUA', rooms: 'kids', sku: 'sofa-a-2', variantName: '3 chỗ', price: '12900000' },
    ],
  };

  it('field product lấy từ dòng đầu; mỗi dòng là 1 variant; qua được validate của API', () => {
    const input = toCreateProductInput(group, 'aaaaaaaaaaaaaaaaaaaaaaaa');
    expect(input).toMatchObject({ name: 'Sofa A', rooms: ['living-room'], requiresAssembly: true });
    expect(input.variants[0].dimensions).toEqual({ lengthCm: 160, widthCm: 85, heightCm: 80 });
    expect(input.variants[1].dimensions).toBeUndefined();

    const parsed = CreateProductDto.schema.safeParse(input);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.variants.map((v) => v.sku)).toEqual(['SOFA-A-1', 'SOFA-A-2']);
  });

  it('dữ liệu sai → Zod chỉ ra đúng variant', () => {
    const bad = { ...group, rows: [{ ...group.rows[0], price: 'không rõ' }] };
    const parsed = CreateProductDto.schema.safeParse(toCreateProductInput(bad, 'aaaaaaaaaaaaaaaaaaaaaaaa'));
    expect(parsed.error?.issues.map((i) => i.path.join('.'))).toEqual(['variants.0.price']);
  });
});

describe('toExcelRows', () => {
  it('mỗi variant 1 dòng, mảng nối bằng dấu phẩy, option nối bằng chấm phẩy', () => {
    const rows = toExcelRows([
      {
        name: 'Sofa A', slug: 'sofa-a', status: 'active', shortDescription: null,
        rooms: ['living-room'], styles: [], materials: ['oak', 'linen'], tags: [],
        requiresAssembly: true, assemblyFee: 300000, allowBackorder: false,
        leadTimeDays: 0, warrantyMonths: 24, isFeatured: false,
        category: { slug: 'sofa' },
        variants: [
          { sku: 'A1', name: '2 chỗ', options: [{ name: 'Màu', value: 'Be' }, { name: 'Size', value: 'S' }], price: 1, compareAtPrice: null, stock: 3, weightKg: 40, dimensions: null, isActive: true },
          { sku: 'A2', name: '3 chỗ', options: [], price: 2, compareAtPrice: 3, stock: 0, weightKg: 50, dimensions: { lengthCm: 1, widthCm: 2, heightCm: 3 }, isActive: false },
        ],
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ categorySlug: 'sofa', materials: 'oak, linen', options: 'Màu: Be; Size: S', compareAtPrice: '', lengthCm: '' });
    expect(rows[1]).toMatchObject({ sku: 'A2', compareAtPrice: 3, heightCm: 3, variantActive: false });
  });
});
