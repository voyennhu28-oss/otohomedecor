import { z } from 'zod';

import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/features/categories/types';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HTTP_URL_PATTERN = /^https?:\/\//i;

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nhập tên danh mục')
    .max(100, 'Tên tối đa 100 ký tự'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(120, 'Slug tối đa 120 ký tự')
    .refine(
      (value) => value === '' || SLUG_PATTERN.test(value),
      'Chỉ dùng chữ thường không dấu, số và dấu gạch ngang (vd: den-treo-tuong)',
    ),
  parentID: z.string(),
  description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự'),
  imageUrl: z
    .string()
    .trim()
    .max(2048, 'URL tối đa 2048 ký tự')
    .refine(
      (value) =>
        value === '' || (HTTP_URL_PATTERN.test(value) && URL.canParse(value)),
      'URL phải bắt đầu bằng http:// hoặc https://',
    ),
  sortOrder: z
    .number('Nhập số thứ tự')
    .int('Thứ tự là số nguyên')
    .min(0, 'Thứ tự không được âm'),
  isActive: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export function getCategoryFormSchema(mode: 'create' | 'edit') {
  return mode === 'create'
    ? categoryFormSchema
    : categoryFormSchema.refine((values) => values.slug !== '', {
        path: ['slug'],
        message: 'Nhập slug',
      });
}

export const CATEGORY_FORM_FIELDS = [
  'name',
  'slug',
  'parentID',
  'description',
  'imageUrl',
  'sortOrder',
  'isActive',
] as const;

export function toFormValues(
  category?: Category | null,
  parentID?: string | null,
): CategoryFormValues {
  return {
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    parentID: category?.parentID ?? parentID ?? '',
    description: category?.description ?? '',
    imageUrl: category?.imageUrl ?? '',
    sortOrder: category?.sortOrder ?? 0,
    isActive: category?.isActive ?? true,
  };
}

export function toCreateInput(values: CategoryFormValues): CreateCategoryInput {
  return {
    name: values.name,
    ...(values.slug && { slug: values.slug }),
    ...(values.description && { description: values.description }),
    ...(values.imageUrl && { imageUrl: values.imageUrl }),
    parentID: values.parentID || null,
    sortOrder: values.sortOrder,
    isActive: values.isActive,
  };
}

export function toUpdateInput(
  values: CategoryFormValues,
  original: Category,
): UpdateCategoryInput {
  const next: UpdateCategoryInput = {
    name: values.name,
    slug: values.slug,
    description: values.description || null,
    imageUrl: values.imageUrl || null,
    parentID: values.parentID || null,
    sortOrder: values.sortOrder,
    isActive: values.isActive,
  };
  return Object.fromEntries(
    Object.entries(next).filter(
      ([key, value]) => original[key as keyof Category] !== value,
    ),
  ) as UpdateCategoryInput;
}
