import { z } from 'zod';

const money = z.number().int().min(0);

export const variantOptionSchema = z.object({
  name: z.string().trim().min(1).max(50),
  value: z.string().trim().min(1).max(50),
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

export const variantFieldsSchema = z
  .object({
    sku: skuSchema,
    name: z.string().trim().min(1).max(150),
    options: z.array(variantOptionSchema).max(5).default([]),
    price: money.min(1),
    compareAtPrice: money.nullable().optional(),
    stock: z.number().int().min(0).default(0),
    dimensions: dimensionsSchema.nullable().optional(),
    weightKg: z.number().min(0).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();

export const isValidCompareAtPrice = (
  price: number,
  compareAtPrice?: number | null,
) => compareAtPrice == null || compareAtPrice > price;

export const COMPARE_AT_PRICE_MESSAGE = 'Giá gạch ngang phải lớn hơn giá bán';

export const variantInputSchema = variantFieldsSchema.refine(
  (v) => isValidCompareAtPrice(v.price, v.compareAtPrice),
  { message: COMPARE_AT_PRICE_MESSAGE, path: ['compareAtPrice'] },
);

export type VariantInput = z.infer<typeof variantInputSchema>;
