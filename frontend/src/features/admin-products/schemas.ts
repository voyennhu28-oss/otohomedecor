import { z } from 'zod';

import {
  MATERIALS,
  PRODUCT_STATUSES,
  ROOMS,
  STYLES,
  type Material,
  type ProductStatus,
  type Room,
  type Style,
} from '@/constants/catalog';
import type {
  AdminProductDetail,
  CreateProductInput,
  ProductFieldsInput,
  ProductVariant,
  UpdateProductInput,
  UpdateVariantInput,
  VariantInput,
} from '@/features/products/types';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU_PATTERN = /^[A-Z0-9_-]+$/;

const keys = <T extends Record<string, string>>(object: T) =>
  Object.keys(object) as [
    Extract<keyof T, string>,
    ...Extract<keyof T, string>[],
  ];

const intField = (label: string, min: number, max?: number) => {
  let schema = z
    .number(`Nhập ${label}`)
    .int(`${label[0].toUpperCase()}${label.slice(1)} là số nguyên`)
    .min(min, `${label[0].toUpperCase()}${label.slice(1)} tối thiểu ${min}`);
  if (max !== undefined) {
    schema = schema.max(
      max,
      `${label[0].toUpperCase()}${label.slice(1)} tối đa ${max}`,
    );
  }
  return schema;
};

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nhập tên sản phẩm')
    .max(200, 'Tên tối đa 200 ký tự'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(120, 'Slug tối đa 120 ký tự')
    .refine(
      (value) => value === '' || SLUG_PATTERN.test(value),
      'Chỉ dùng chữ thường không dấu, số và dấu gạch ngang',
    )
    .refine(
      (value) => value !== 'featured' && value !== 'filters',
      'Slug này là đường dẫn hệ thống, hãy chọn slug khác',
    ),
  shortDescription: z.string().trim().max(500, 'Mô tả ngắn tối đa 500 ký tự'),
  description: z.string().max(20_000, 'Mô tả tối đa 20.000 ký tự'),
  categoryID: z.string().min(1, 'Chọn danh mục'),
  rooms: z.array(z.enum(keys(ROOMS))),
  styles: z.array(z.enum(keys(STYLES))),
  materials: z.array(z.enum(keys(MATERIALS))),
  tags: z
    .array(z.string().trim().min(1).max(30, 'Mỗi tag tối đa 30 ký tự'))
    .max(20, 'Tối đa 20 tag'),
  requiresAssembly: z.boolean(),
  assemblyFee: intField('phí lắp đặt', 0),
  allowBackorder: z.boolean(),
  leadTimeDays: intField('số ngày làm', 0, 365),
  warrantyMonths: intField('số tháng bảo hành', 0, 120),
  isFeatured: z.boolean(),
  status: z.enum(keys(PRODUCT_STATUSES)),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const editProductSchema = productFormSchema.refine(
  (values) => values.slug !== '',
  { path: ['slug'], message: 'Nhập slug' },
);

export const variantFormSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, 'Nhập SKU')
      .max(50, 'SKU tối đa 50 ký tự')
      .regex(SKU_PATTERN, 'SKU chỉ gồm chữ không dấu, số, "-" và "_"'),
    name: z
      .string()
      .trim()
      .min(1, 'Nhập tên biến thể')
      .max(150, 'Tên tối đa 150 ký tự'),
    options: z
      .array(
        z.object({
          name: z
            .string()
            .trim()
            .min(1, 'Nhập tên thuộc tính')
            .max(50, 'Tối đa 50 ký tự'),
          value: z
            .string()
            .trim()
            .min(1, 'Nhập giá trị')
            .max(50, 'Tối đa 50 ký tự'),
        }),
      )
      .max(5, 'Tối đa 5 thuộc tính'),
    price: intField('giá bán', 1),
    compareAtPrice: z
      .number()
      .int('Giá gạch ngang là số nguyên')
      .min(0, 'Giá gạch ngang không được âm')
      .nullable(),
    stock: intField('tồn kho', 0),
    weightKg: z.number('Nhập khối lượng').min(0, 'Khối lượng không được âm'),
    lengthCm: z.number().positive('Phải lớn hơn 0').nullable(),
    widthCm: z.number().positive('Phải lớn hơn 0').nullable(),
    heightCm: z.number().positive('Phải lớn hơn 0').nullable(),
    isActive: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (
      values.compareAtPrice !== null &&
      values.compareAtPrice <= values.price
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['compareAtPrice'],
        message: 'Giá gạch ngang phải lớn hơn giá bán',
      });
    }
    const dims = [values.lengthCm, values.widthCm, values.heightCm];
    const filled = dims.filter((value) => value !== null).length;
    if (filled > 0 && filled < 3) {
      (['lengthCm', 'widthCm', 'heightCm'] as const).forEach((key) => {
        if (values[key] === null) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: 'Nhập đủ dài, rộng, cao',
          });
        }
      });
    }
  });

export type VariantFormValues = z.infer<typeof variantFormSchema>;

export const createProductSchema = productFormSchema
  .extend({
    variants: z
      .array(variantFormSchema)
      .min(1, 'Sản phẩm phải có ít nhất 1 biến thể')
      .max(50, 'Tối đa 50 biến thể'),
  })
  .superRefine(({ variants, status }, ctx) => {
    const seen = new Map<string, number>();
    variants.forEach(({ sku }, index) => {
      if (seen.has(sku)) {
        ctx.addIssue({
          code: 'custom',
          path: ['variants', index, 'sku'],
          message: `SKU "${sku}" bị trùng với biến thể ${(seen.get(sku) ?? 0) + 1}`,
        });
      } else {
        seen.set(sku, index);
      }
    });
    if (status === 'active' && !variants.some((variant) => variant.isActive)) {
      ctx.addIssue({
        code: 'custom',
        path: ['status'],
        message: 'Cần ít nhất 1 biến thể đang bán để chuyển sang "Đang bán"',
      });
    }
  });

export type CreateProductFormValues = z.infer<typeof createProductSchema>;

export const PRODUCT_FORM_FIELDS = [
  'name',
  'slug',
  'shortDescription',
  'description',
  'categoryID',
  'rooms',
  'styles',
  'materials',
  'tags',
  'requiresAssembly',
  'assemblyFee',
  'allowBackorder',
  'leadTimeDays',
  'warrantyMonths',
  'isFeatured',
  'status',
] as const;

export const VARIANT_FORM_FIELDS = [
  'sku',
  'name',
  'options',
  'price',
  'compareAtPrice',
  'stock',
  'weightKg',
  'isActive',
] as const;

export function emptyVariant(): VariantFormValues {
  return {
    sku: '',
    name: '',
    options: [],
    price: Number.NaN,
    compareAtPrice: null,
    stock: 0,
    weightKg: 0,
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    isActive: true,
  };
}

export function toProductFormValues(
  product?: AdminProductDetail | null,
  categoryID = '',
): ProductFormValues {
  return {
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    shortDescription: product?.shortDescription ?? '',
    description: product?.description ?? '',
    categoryID: product?.categoryID ?? categoryID,
    rooms: product?.rooms ?? [],
    styles: product?.styles ?? [],
    materials: product?.materials ?? [],
    tags: product?.tags ?? [],
    requiresAssembly: product?.requiresAssembly ?? false,
    assemblyFee: product?.assemblyFee ?? 0,
    allowBackorder: product?.allowBackorder ?? false,
    leadTimeDays: product?.leadTimeDays ?? 0,
    warrantyMonths: product?.warrantyMonths ?? 0,
    isFeatured: product?.isFeatured ?? false,
    status: product?.status ?? 'draft',
  };
}

export function toVariantFormValues(
  variant: ProductVariant,
): VariantFormValues {
  return {
    sku: variant.sku,
    name: variant.name,
    options: variant.options,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    stock: variant.stock,
    weightKg: variant.weightKg,
    lengthCm: variant.dimensions?.lengthCm ?? null,
    widthCm: variant.dimensions?.widthCm ?? null,
    heightCm: variant.dimensions?.heightCm ?? null,
    isActive: variant.isActive,
  };
}

function productFields(values: ProductFormValues): ProductFieldsInput {
  return {
    name: values.name,
    ...(values.slug && { slug: values.slug }),
    shortDescription: values.shortDescription || null,
    description: values.description || null,
    categoryID: values.categoryID,
    rooms: values.rooms as Room[],
    styles: values.styles as Style[],
    materials: values.materials as Material[],
    tags: values.tags,
    requiresAssembly: values.requiresAssembly,
    assemblyFee: values.requiresAssembly ? values.assemblyFee : 0,
    allowBackorder: values.allowBackorder,
    leadTimeDays: values.allowBackorder ? values.leadTimeDays : 0,
    warrantyMonths: values.warrantyMonths,
    isFeatured: values.isFeatured,
    status: values.status as ProductStatus,
  };
}

export function toVariantInput(values: VariantFormValues): VariantInput {
  return {
    sku: values.sku,
    name: values.name,
    options: values.options,
    price: values.price,
    compareAtPrice: values.compareAtPrice,
    stock: values.stock,
    weightKg: values.weightKg,
    dimensions:
      values.lengthCm !== null &&
      values.widthCm !== null &&
      values.heightCm !== null
        ? {
            lengthCm: values.lengthCm,
            widthCm: values.widthCm,
            heightCm: values.heightCm,
          }
        : null,
    isActive: values.isActive,
  };
}

export function toCreateProductInput(
  values: CreateProductFormValues,
): CreateProductInput {
  const fields = productFields(values);
  return {
    ...fields,
    shortDescription: fields.shortDescription ?? undefined,
    description: fields.description ?? undefined,
    variants: values.variants.map(toVariantInput),
  };
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

export function toUpdateProductInput(
  values: ProductFormValues,
  original: AdminProductDetail,
): UpdateProductInput {
  const next = productFields(values);
  return Object.fromEntries(
    Object.entries(next).filter(
      ([key, value]) =>
        !same(original[key as keyof AdminProductDetail] ?? null, value ?? null),
    ),
  ) as UpdateProductInput;
}

export function toUpdateVariantInput(
  values: VariantFormValues,
  original: ProductVariant,
): UpdateVariantInput {
  const next = toVariantInput(values);
  delete next.stock;
  return Object.fromEntries(
    Object.entries(next).filter(
      ([key, value]) =>
        !same(original[key as keyof ProductVariant] ?? null, value ?? null),
    ),
  ) as UpdateVariantInput;
}
