import { computeProductSummary } from './product-summary';

const variant = (
  price: number,
  options: { name: string; value: string }[] = [],
  extra: { isActive?: boolean; deletedAt?: Date | null } = {},
) => ({ price, options, isActive: true, deletedAt: null, ...extra });

describe('computeProductSummary', () => {
  it('min / max theo variant đang bán', () => {
    expect(
      computeProductSummary([variant(12_000_000), variant(9_500_000), variant(15_000_000)]),
    ).toMatchObject({ minPrice: 9_500_000, maxPrice: 15_000_000 });
  });

  it('bỏ qua variant đang tắt hoặc đã xóa', () => {
    const summary = computeProductSummary([
      variant(1_000, [], { isActive: false }),
      variant(2_000, [], { deletedAt: new Date() }),
      variant(5_000),
    ]);
    expect(summary).toMatchObject({ minPrice: 5_000, maxPrice: 5_000 });
  });

  it('không còn variant đang bán: giá 0, không có màu', () => {
    expect(computeProductSummary([variant(1_000, [], { isActive: false })])).toEqual({
      minPrice: 0,
      maxPrice: 0,
      colors: [],
    });
  });

  it('colors: lấy option tên "Màu" / "Màu sắc" / "Color", không trùng, không phân biệt hoa thường', () => {
    const summary = computeProductSummary([
      variant(1, [{ name: 'Màu', value: 'Xám' }, { name: 'Kích thước', value: '3 chỗ' }]),
      variant(1, [{ name: 'màu sắc', value: 'Be' }]),
      variant(1, [{ name: 'Color', value: 'xám' }]), // trùng "Xám"
      variant(1, [{ name: 'Chất liệu', value: 'Gỗ sồi' }]),
    ]);
    expect(summary.colors).toEqual(['Xám', 'Be']);
  });
});
