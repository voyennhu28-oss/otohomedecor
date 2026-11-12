import { buildPublicProductWhere, PRODUCT_ORDER_BY } from './product-filter';

const NOT_DELETED = { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };

describe('buildPublicProductWhere', () => {
  it('không có bộ lọc: chỉ lấy sản phẩm đang bán', () => {
    expect(buildPublicProductWhere({})).toEqual({ AND: [{ status: 'active' }] });
  });

  it('đủ mọi bộ lọc của plan mục 8', () => {
    const where = buildPublicProductWhere(
      {
        room: 'living-room',
        style: 'japandi',
        material: ['oak', 'rattan'],
        color: 'Xám',
        minPrice: 1_000_000,
        maxPrice: 20_000_000,
        q: 'sofa',
        inStock: true,
      },
      ['cat-1', 'cat-2'],
    );

    expect(where.AND).toEqual([
      { status: 'active' },
      { categoryID: { in: ['cat-1', 'cat-2'] } },
      { rooms: { has: 'living-room' } },
      { styles: { has: 'japandi' } },
      { materials: { hasSome: ['oak', 'rattan'] } },
      { colors: { has: 'Xám' } },
      { minPrice: { gte: 1_000_000, lte: 20_000_000 } },
      { name: { contains: 'sofa', mode: 'insensitive' } },
      {
        OR: [
          { allowBackorder: true },
          { variants: { some: { isActive: true, stock: { gt: 0 }, ...NOT_DELETED } } },
        ],
      },
    ]);
  });

  it('chỉ có minPrice: không đặt cận trên', () => {
    expect(buildPublicProductWhere({ minPrice: 500_000 }).AND).toContainEqual({
      minPrice: { gte: 500_000 },
    });
  });

  it('chỉ có maxPrice: cận dưới là 0', () => {
    expect(buildPublicProductWhere({ maxPrice: 0 }).AND).toContainEqual({
      minPrice: { gte: 0, lte: 0 },
    });
  });

  it('inStock=false: không lọc tồn kho', () => {
    expect(buildPublicProductWhere({ inStock: false }).AND).toHaveLength(1);
  });
});

describe('PRODUCT_ORDER_BY', () => {
  it('mọi kiểu sắp xếp đều kết thúc bằng id để phân trang ổn định', () => {
    for (const orderBy of Object.values(PRODUCT_ORDER_BY)) {
      expect(orderBy.at(-1)).toEqual({ id: 'desc' });
    }
  });

  it('giá sắp theo minPrice', () => {
    expect(PRODUCT_ORDER_BY.price_asc[0]).toEqual({ minPrice: 'asc' });
    expect(PRODUCT_ORDER_BY.price_desc[0]).toEqual({ minPrice: 'desc' });
  });
});
