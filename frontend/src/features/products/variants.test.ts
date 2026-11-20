import { describe, expect, it } from 'vitest';

import type { PublicVariant } from '@/features/products/types';
import {
  FALLBACK_GROUP,
  createVariantModel,
  discountPercent,
  maxQuantity,
  stockNote,
} from '@/features/products/variants';

function variant(
  id: string,
  options: [string, string][],
  stock = 5,
  patch: Partial<PublicVariant> = {},
): PublicVariant {
  return {
    id,
    sku: id.toUpperCase(),
    name: options.map(([, value]) => value).join(' - ') || id,
    options: options.map(([name, value]) => ({ name, value })),
    price: 1000,
    compareAtPrice: null,
    stock,
    dimensions: null,
    weightKg: 1,
    images: [],
    ...patch,
  };
}

const lamps = [
  variant(
    'a',
    [
      ['Kích thước', 'Ø50'],
      ['Màu', 'Trắng'],
    ],
    0,
  ),
  variant(
    'b',
    [
      ['Kích thước', 'Ø50'],
      ['Màu', 'Vàng'],
    ],
    3,
  ),
  variant(
    'c',
    [
      ['Kích thước', 'Ø70'],
      ['Màu', 'Trắng'],
    ],
    8,
  ),
  variant(
    'd',
    [
      ['Kích thước', 'Ø90'],
      ['Màu', 'Vàng'],
    ],
    0,
  ),
];

describe('createVariantModel', () => {
  const model = createVariantModel(lamps, false);

  it('nhóm tùy chọn theo thứ tự xuất hiện', () => {
    expect(model.groups).toEqual([
      { name: 'Kích thước', values: ['Ø50', 'Ø70', 'Ø90'] },
      { name: 'Màu', values: ['Trắng', 'Vàng'] },
    ]);
  });

  it('mặc định chọn biến thể đầu tiên còn hàng', () => {
    expect(model.initial.id).toBe('b');
    expect(createVariantModel(lamps, true).initial.id).toBe('a');
  });

  it('phân biệt tổ hợp không có và tổ hợp hết hàng', () => {
    const selection = model.selectionOf(lamps[1]);
    expect(model.valueState(selection, 'Màu', 'Trắng')).toBe('sold-out');
    expect(model.valueState(selection, 'Kích thước', 'Ø70')).toBe('missing');
    expect(model.valueState(selection, 'Kích thước', 'Ø90')).toBe('sold-out');
    expect(model.valueState(selection, 'Kích thước', 'Ø50')).toBe('available');
  });

  it('chọn giá trị không khớp tổ hợp thì nhảy sang biến thể gần nhất còn hàng', () => {
    const selection = model.selectionOf(lamps[1]);
    expect(model.pick(selection, 'Kích thước', 'Ø70')?.id).toBe('c');
    expect(model.pick(selection, 'Màu', 'Trắng')?.id).toBe('a');
  });

  it('dùng tên biến thể khi tùy chọn không đồng nhất', () => {
    const mixed = createVariantModel(
      [variant('x', [['Màu', 'Đỏ']]), variant('y', [])],
      false,
    );
    expect(mixed.groups).toEqual([
      { name: FALLBACK_GROUP, values: ['Đỏ', 'y'] },
    ]);
  });

  it('không có nhóm khi chỉ 1 biến thể', () => {
    expect(createVariantModel([lamps[2]], false).groups).toEqual([]);
  });
});

describe('tồn kho và giá', () => {
  it('ghi chú tồn kho', () => {
    expect(stockNote(lamps[2], false, 0).tone).toBe('ok');
    expect(stockNote(lamps[1], false, 0).text).toBe('Chỉ còn 3 chiếc');
    expect(stockNote(lamps[0], true, 10).text).toBe(
      'Làm theo đơn, cần thêm khoảng 10 ngày',
    );
    expect(stockNote(lamps[0], false, 0).tone).toBe('out');
  });

  it('giới hạn số lượng', () => {
    expect(maxQuantity(lamps[1], false)).toBe(3);
    expect(maxQuantity(lamps[0], false)).toBe(0);
    expect(maxQuantity(lamps[0], true)).toBe(99);
  });

  it('tính phần trăm giảm', () => {
    expect(discountPercent(3900000, 4490000)).toBe(13);
    expect(discountPercent(1000, null)).toBeNull();
    expect(discountPercent(1000, 900)).toBeNull();
  });
});
