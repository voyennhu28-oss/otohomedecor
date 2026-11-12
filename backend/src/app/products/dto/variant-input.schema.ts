import { z } from 'zod';

/**
 * Dữ liệu 1 variant khi admin nhập. Dùng chung cho:
 *  - POST /admin/products (tạo product kèm variant)
 *  - module product-variants (thêm / sửa variant)
 *  - import Excel
 */

const money = z.number().int().min(0); // VND, không có số lẻ

export const variantOptionSchema = z.object({
  name: z.string().trim().min(1).max(50), // "Màu", "Kích thước"
  value: z.string().trim().min(1).max(50), // "Xám", "3 chỗ"
});

export const dimensionsSchema = z.object({
  lengthCm: z.number().positive(),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
});

export const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1)
  .max(50)
  .regex(/^[A-Z0-9_-]+$/, 'SKU chỉ gồm chữ, số, "-" và "_"');

/** Các field của variant, chưa có rule so sánh giữa các field (để còn .partial() khi sửa). */
export const variantFieldsSchema = z
  .object({
    sku: skuSchema,
    name: z.string().trim().min(1).max(150), // "Sofa 3 chỗ - Xám"
    options: z.array(variantOptionSchema).max(5).default([]),
    price: money.min(1),
    compareAtPrice: money.nullable().optional(), // giá gạch ngang
    stock: z.number().int().min(0).default(0),
    dimensions: dimensionsSchema.nullable().optional(),
    weightKg: z.number().min(0).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();

/** Giá gạch ngang (nếu có) phải lớn hơn giá bán. */
export const isValidCompareAtPrice = (price: number, compareAtPrice?: number | null) =>
  compareAtPrice == null || compareAtPrice > price;

export const COMPARE_AT_PRICE_MESSAGE = 'Giá gạch ngang phải lớn hơn giá bán';

/** Variant đầy đủ khi tạo mới. */
export const variantInputSchema = variantFieldsSchema.refine(
  (v) => isValidCompareAtPrice(v.price, v.compareAtPrice),
  { message: COMPARE_AT_PRICE_MESSAGE, path: ['compareAtPrice'] },
);

export type VariantInput = z.infer<typeof variantInputSchema>;
