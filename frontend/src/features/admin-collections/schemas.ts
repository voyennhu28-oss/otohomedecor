import { format } from 'date-fns';
import { z } from 'zod';

import type {
  Collection,
  CreateCollectionInput,
  UpdateCollectionInput,
} from '@/features/collections/types';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const dateTimeField = z
  .string()
  .refine(
    (value) => value === '' || LOCAL_DATETIME.test(value),
    'Thời gian không hợp lệ',
  );

const baseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nhập tên bộ sưu tập')
    .max(100, 'Tên tối đa 100 ký tự'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(120, 'Slug tối đa 120 ký tự')
    .refine(
      (value) => value === '' || SLUG_PATTERN.test(value),
      'Chỉ dùng chữ thường không dấu, số và dấu gạch ngang',
    ),
  description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự'),
  sortOrder: z
    .number('Nhập số thứ tự')
    .int('Thứ tự là số nguyên')
    .min(0, 'Thứ tự không được âm'),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  startsAt: dateTimeField,
  endsAt: dateTimeField,
});

export type CollectionFormValues = z.infer<typeof baseSchema>;

export function getCollectionFormSchema(mode: 'create' | 'edit') {
  return baseSchema.superRefine((values, ctx) => {
    if (mode === 'edit' && values.slug === '') {
      ctx.addIssue({ code: 'custom', path: ['slug'], message: 'Nhập slug' });
    }
    if (
      values.startsAt &&
      values.endsAt &&
      new Date(values.endsAt) <= new Date(values.startsAt)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
      });
    }
  });
}

export const COLLECTION_FORM_FIELDS = [
  'name',
  'slug',
  'description',
  'sortOrder',
  'isActive',
  'isFeatured',
  'startsAt',
  'endsAt',
] as const;

export function toLocalInput(iso: string | null | undefined) {
  return iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : '';
}

const toISO = (local: string) => new Date(local).toISOString();

export function toCollectionFormValues(
  collection?: Collection | null,
): CollectionFormValues {
  return {
    name: collection?.name ?? '',
    slug: collection?.slug ?? '',
    description: collection?.description ?? '',
    sortOrder: collection?.sortOrder ?? 0,
    isActive: collection?.isActive ?? true,
    isFeatured: collection?.isFeatured ?? false,
    startsAt: toLocalInput(collection?.startsAt),
    endsAt: toLocalInput(collection?.endsAt),
  };
}

export function toCreateCollectionInput(
  values: CollectionFormValues,
): CreateCollectionInput {
  return {
    name: values.name,
    ...(values.slug && { slug: values.slug }),
    ...(values.description && { description: values.description }),
    sortOrder: values.sortOrder,
    isActive: values.isActive,
    isFeatured: values.isFeatured,
    ...(values.startsAt && { startsAt: toISO(values.startsAt) }),
    ...(values.endsAt && { endsAt: toISO(values.endsAt) }),
  };
}

export function toUpdateCollectionInput(
  values: CollectionFormValues,
  original: Collection,
): UpdateCollectionInput {
  const body: UpdateCollectionInput = {};
  if (values.name !== original.name) body.name = values.name;
  if (values.slug !== original.slug) body.slug = values.slug;
  if (values.description !== (original.description ?? '')) {
    body.description = values.description || null;
  }
  if (values.sortOrder !== original.sortOrder)
    body.sortOrder = values.sortOrder;
  if (values.isActive !== original.isActive) body.isActive = values.isActive;
  if (values.isFeatured !== original.isFeatured) {
    body.isFeatured = values.isFeatured;
  }
  if (values.startsAt !== toLocalInput(original.startsAt)) {
    body.startsAt = values.startsAt ? toISO(values.startsAt) : null;
  }
  if (values.endsAt !== toLocalInput(original.endsAt)) {
    body.endsAt = values.endsAt ? toISO(values.endsAt) : null;
  }
  return body;
}
