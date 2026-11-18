import { describe, expect, it } from 'vitest';

import { toProductQuery } from '@/features/admin-products/filters';
import {
  createProductSchema,
  emptyVariant,
  toCreateProductInput,
  toProductFormValues,
  toUpdateProductInput,
  toUpdateVariantInput,
  toVariantFormValues,
  variantFormSchema,
  type VariantFormValues,
} from '@/features/admin-products/schemas';
import type {
  AdminProductDetail,
  ProductVariant,
} from '@/features/products/types';

const variant = (
  patch: Partial<VariantFormValues> = {},
): VariantFormValues => ({
  ...emptyVariant(),
  sku: 'den-so-m',
  name: 'Đèn sò - M',
  price: 1_200_000,
  ...patch,
});

const product: AdminProductDetail = {
  id: 'p1',
  name: 'Đèn sò điệp',
  slug: 'den-so-diep',
  shortDescription: null,
  description: null,
  categoryID: 'c1',
  images: [],
  rooms: ['bedroom'],
  styles: [],
  materials: [],
  colors: [],
  tags: ['vo-so'],
  minPrice: 1_200_000,
  maxPrice: 1_200_000,
  requiresAssembly: false,
  assemblyFee: 0,
  allowBackorder: false,
  leadTimeDays: 0,
  warrantyMonths: 6,
  isFeatured: false,
  status: 'draft',
  ratingAvg: 0,
  ratingCount: 0,
  soldCount: 0,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  deletedAt: null,
  category: { id: 'c1', name: 'Đèn', slug: 'den' },
  variants: [],
};

describe('variantFormSchema', () => {
  it('SKU tự viết hoa, giá gạch ngang phải lớn hơn giá bán', () => {
    const ok = variantFormSchema.safeParse(
      variant({ compareAtPrice: 1_500_000 }),
    );
    expect(ok.success && ok.data.sku).toBe('DEN-SO-M');
    const bad = variantFormSchema.safeParse(
      variant({ compareAtPrice: 1_000_000 }),
    );
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0].path).toEqual(['compareAtPrice']);
  });

  it('kích thước nhập đủ cả 3 hoặc bỏ trống cả 3', () => {
    expect(variantFormSchema.safeParse(variant()).success).toBe(true);
    const partial = variantFormSchema.safeParse(variant({ lengthCm: 30 }));
    expect(partial.error?.issues.map((issue) => issue.path[0])).toEqual([
      'widthCm',
      'heightCm',
    ]);
  });

  it('giá trống (NaN) báo lỗi', () => {
    expect(
      variantFormSchema.safeParse(variant({ price: Number.NaN })).success,
    ).toBe(false);
  });
});

describe('createProductSchema', () => {
  const base = { ...toProductFormValues(null, 'c1'), name: 'Đèn sò' };

  it('báo SKU trùng giữa các biến thể', () => {
    const result = createProductSchema.safeParse({
      ...base,
      variants: [variant(), variant({ sku: 'DEN-SO-M', name: 'Bản 2' })],
    });
    expect(result.error?.issues[0].path).toEqual(['variants', 1, 'sku']);
  });

  it('"Đang bán" cần ít nhất 1 biến thể đang bán', () => {
    const result = createProductSchema.safeParse({
      ...base,
      status: 'active',
      variants: [variant({ isActive: false })],
    });
    expect(result.error?.issues[0].path).toEqual(['status']);
  });

  it('toCreateProductInput bỏ field trống, gửi kích thước khi đủ 3 số', () => {
    const parsed = createProductSchema.parse({
      ...base,
      variants: [variant({ lengthCm: 30, widthCm: 30, heightCm: 40 })],
    });
    const input = toCreateProductInput(parsed);
    expect(input).not.toHaveProperty('slug');
    expect(input.shortDescription).toBeUndefined();
    expect(input.variants[0]).toMatchObject({
      sku: 'DEN-SO-M',
      dimensions: { lengthCm: 30, widthCm: 30, heightCm: 40 },
      compareAtPrice: null,
    });
  });
});

describe('toUpdate*', () => {
  it('chỉ gửi field sản phẩm đã đổi', () => {
    const values = {
      ...toProductFormValues(product),
      name: 'Đèn sò điệp lớn',
      tags: ['vo-so', 'thu-cong'],
    };
    expect(toUpdateProductInput(values, product)).toEqual({
      name: 'Đèn sò điệp lớn',
      tags: ['vo-so', 'thu-cong'],
    });
    expect(toUpdateProductInput(toProductFormValues(product), product)).toEqual(
      {},
    );
  });

  it('biến thể: không bao giờ gửi stock, chỉ gửi field đã đổi', () => {
    const original: ProductVariant = {
      id: 'v1',
      productID: 'p1',
      sku: 'DEN-SO-M',
      name: 'Đèn sò - M',
      options: [{ name: 'Màu', value: 'Trắng' }],
      price: 1_200_000,
      compareAtPrice: null,
      stock: 7,
      dimensions: null,
      weightKg: 1,
      images: [],
      isActive: true,
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    };
    const values = {
      ...toVariantFormValues(original),
      price: 1_300_000,
      stock: 99,
    };
    expect(toUpdateVariantInput(values, original)).toEqual({
      price: 1_300_000,
    });
  });
});

describe('toProductQuery', () => {
  it('đọc URL, bỏ giá trị sai', () => {
    expect(
      toProductQuery({
        q: '  sò ',
        status: 'active',
        category: 'not-an-id',
        featured: 'true',
        page: '2',
        size: '500',
      }),
    ).toEqual({
      q: 'sò',
      status: 'active',
      categoryID: undefined,
      isFeatured: true,
      page: 2,
      itemPerPage: 100,
    });
  });
});
