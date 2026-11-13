import { BadRequestException, ConflictException } from '@nestjs/common';
import { makeSaleVariant } from '../../../test/factories/sale-variant.factory';
import { getSaleStatus, isPurchasable, pickImageUrl } from '../carts/sale-status';
import { buildCheckoutLines, sumBy } from './checkout-lines';

const item = (variantID: string, quantity: number) => ({ variantID, quantity, addedAt: new Date() });

describe('getSaleStatus', () => {
  it.each([
    ['đủ hàng', makeSaleVariant({ stock: 3 }), 3, 'available'],
    ['thiếu hàng', makeSaleVariant({ stock: 2 }), 3, 'insufficient_stock'],
    ['hết hàng', makeSaleVariant({ stock: 0 }), 1, 'out_of_stock'],
    ['hàng đặt làm thiếu kho', makeSaleVariant({ stock: 0 }, { allowBackorder: true }), 5, 'made_to_order'],
    ['hàng đặt làm còn kho', makeSaleVariant({ stock: 9 }, { allowBackorder: true }), 5, 'available'],
    ['variant tắt', makeSaleVariant({ isActive: false }), 1, 'unavailable'],
    ['product draft', makeSaleVariant({}, { status: 'draft' }), 1, 'unavailable'],
    ['không tìm thấy (đã xóa)', undefined, 1, 'unavailable'],
  ] as const)('%s → %s', (_name, variant, quantity, expected) => {
    expect(getSaleStatus(variant, quantity)).toBe(expected);
  });

  it('chỉ available / made_to_order là mua được', () => {
    expect(isPurchasable('available')).toBe(true);
    expect(isPurchasable('made_to_order')).toBe(true);
    expect(isPurchasable('insufficient_stock')).toBe(false);
    expect(isPurchasable('unavailable')).toBe(false);
  });

  it('pickImageUrl: ưu tiên ảnh variant, rồi ảnh product, không có thì null', () => {
    const img = { url: 'https://cdn/v.jpg', publicID: null, alt: null, sortOrder: 0 };
    expect(pickImageUrl(makeSaleVariant({ images: [img] }))).toBe('https://cdn/v.jpg');
    expect(pickImageUrl(makeSaleVariant())).toBe('https://cdn/p1.jpg');
    expect(pickImageUrl(makeSaleVariant({}, { images: [] }))).toBeNull();
  });
});

describe('buildCheckoutLines', () => {
  it('giá lấy từ DB, thành tiền = giá × số lượng, đủ hàng thì trừ kho', () => {
    const [line] = buildCheckoutLines([item('v1', 2)], [makeSaleVariant({ price: 1_500_000 })], false);
    expect(line).toMatchObject({ unitPrice: 1_500_000, quantity: 2, lineTotal: 3_000_000, assemblyFee: 0, reserveStock: true });
  });

  it('phí lắp đặt chỉ tính khi khách chọn VÀ sản phẩm cần lắp', () => {
    const needs = makeSaleVariant({}, { requiresAssembly: true, assemblyFee: 300_000 });
    expect(buildCheckoutLines([item('v1', 2)], [needs], true)[0].assemblyFee).toBe(600_000);
    expect(buildCheckoutLines([item('v1', 2)], [needs], false)[0].assemblyFee).toBe(0);
    const noNeed = makeSaleVariant({}, { requiresAssembly: false, assemblyFee: 300_000 });
    expect(buildCheckoutLines([item('v1', 2)], [noNeed], true)[0].assemblyFee).toBe(0);
  });

  it('hàng đặt làm không đủ kho: vẫn đặt được nhưng KHÔNG trừ kho', () => {
    const v = makeSaleVariant({ stock: 1 }, { allowBackorder: true });
    expect(buildCheckoutLines([item('v1', 3)], [v], false)[0].reserveStock).toBe(false);
  });

  it('không đủ hàng → 409 có số lượng còn lại; hết hàng → 409', () => {
    expect(() => buildCheckoutLines([item('v1', 5)], [makeSaleVariant({ stock: 2 })], false)).toThrow(
      new ConflictException('"Sofa 3 chỗ - Xám" chỉ còn 2 sản phẩm'),
    );
    expect(() => buildCheckoutLines([item('v1', 1)], [makeSaleVariant({ stock: 0 })], false)).toThrow(/hết hàng/);
  });

  it('variant đã ngừng bán / bị xóa → 400', () => {
    expect(() => buildCheckoutLines([item('v1', 1)], [makeSaleVariant({ isActive: false })], false)).toThrow(
      BadRequestException,
    );
    expect(() => buildCheckoutLines([item('khong-co', 1)], [makeSaleVariant()], false)).toThrow(/Có sản phẩm đã ngừng bán/);
  });

  it('sumBy', () => {
    expect(sumBy([{ a: 1 }, { a: 2 }], (x) => x.a)).toBe(3);
    expect(sumBy([], () => 1)).toBe(0);
  });
});
