import { z } from 'zod';

import {
  PROMOTION_TYPES,
  type Promotion,
  type PromotionInput,
  type PromotionType,
  type UpdatePromotionInput,
} from '@/features/promotions/types';
import {
  LOCAL_DATETIME_PATTERN,
  localInputToISO,
  toLocalInput,
} from '@/lib/datetime';

const CODE_PATTERN = /^[A-Z0-9_-]{3,30}$/;

const optionalInt = (min: number, label: string) =>
  z
    .number()
    .int(`${label} là số nguyên`)
    .min(min, `${label} tối thiểu ${min.toLocaleString('vi-VN')}`)
    .nullable();

const dateTime = z
  .string()
  .refine(
    (value) => value === '' || LOCAL_DATETIME_PATTERN.test(value),
    'Thời gian không hợp lệ',
  );

const baseSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(CODE_PATTERN, 'Mã gồm 3–30 ký tự: chữ không dấu, số, "-" hoặc "_"'),
  name: z
    .string()
    .trim()
    .min(1, 'Nhập tên chương trình')
    .max(100, 'Tên tối đa 100 ký tự'),
  description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự'),
  type: z.enum(
    Object.keys(PROMOTION_TYPES) as [PromotionType, ...PromotionType[]],
  ),
  value: z.number().int('Giá trị là số nguyên').nullable(),
  maxDiscount: optionalInt(1, 'Mức giảm tối đa'),
  minOrderValue: z
    .number('Nhập giá trị đơn tối thiểu (0 nếu không yêu cầu)')
    .int('Giá trị là số nguyên')
    .min(0, 'Không được âm'),
  usageLimit: optionalInt(1, 'Tổng lượt dùng'),
  perUserLimit: optionalInt(1, 'Lượt mỗi khách'),
  startsAt: dateTime,
  endsAt: dateTime,
  isActive: z.boolean(),
});

export type PromotionFormValues = z.infer<typeof baseSchema>;

export function getPromotionFormSchema(mode: 'create' | 'edit', usedCount = 0) {
  return baseSchema.superRefine((values, ctx) => {
    const issue = (path: keyof PromotionFormValues, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });

    if (values.type === 'percentage') {
      if (values.value === null || values.value < 1 || values.value > 100) {
        issue('value', 'Nhập % giảm từ 1 đến 100');
      }
    } else if (values.type === 'fixed_amount') {
      if (values.value === null || values.value < 1) {
        issue('value', 'Nhập số tiền giảm lớn hơn 0');
      }
    }
    if (mode === 'edit' && values.startsAt === '') {
      issue('startsAt', 'Nhập thời gian bắt đầu');
    }
    const start = values.startsAt ? new Date(values.startsAt) : new Date();
    if (values.endsAt && new Date(values.endsAt) <= start) {
      issue('endsAt', 'Thời gian kết thúc phải sau thời gian bắt đầu');
    }
    if (values.usageLimit !== null && values.usageLimit < usedCount) {
      issue('usageLimit', `Không được nhỏ hơn số lượt đã dùng (${usedCount})`);
    }
  });
}

export const PROMOTION_FORM_FIELDS = [
  'code',
  'name',
  'description',
  'type',
  'value',
  'maxDiscount',
  'minOrderValue',
  'usageLimit',
  'perUserLimit',
  'startsAt',
  'endsAt',
  'isActive',
] as const;

export function toPromotionFormValues(
  promotion?: Promotion | null,
): PromotionFormValues {
  return {
    code: promotion?.code ?? '',
    name: promotion?.name ?? '',
    description: promotion?.description ?? '',
    type: promotion?.type ?? 'percentage',
    value:
      promotion && promotion.type !== 'free_shipping' ? promotion.value : null,
    maxDiscount: promotion?.maxDiscount ?? null,
    minOrderValue: promotion?.minOrderValue ?? 0,
    usageLimit: promotion?.usageLimit ?? null,
    perUserLimit: promotion?.perUserLimit ?? null,
    startsAt: toLocalInput(promotion?.startsAt),
    endsAt: toLocalInput(promotion?.endsAt),
    isActive: promotion?.isActive ?? true,
  };
}

function normalized(values: PromotionFormValues) {
  return {
    value: values.type === 'free_shipping' ? 0 : (values.value ?? 0),
    maxDiscount: values.type === 'percentage' ? values.maxDiscount : null,
  };
}

export function toCreatePromotionInput(
  values: PromotionFormValues,
): PromotionInput {
  return {
    code: values.code,
    name: values.name,
    ...(values.description && { description: values.description }),
    type: values.type,
    ...normalized(values),
    minOrderValue: values.minOrderValue,
    usageLimit: values.usageLimit,
    perUserLimit: values.perUserLimit,
    ...(values.startsAt && { startsAt: localInputToISO(values.startsAt) }),
    endsAt: values.endsAt ? localInputToISO(values.endsAt) : null,
    isActive: values.isActive,
  };
}

export function toUpdatePromotionInput(
  values: PromotionFormValues,
  original: Promotion,
): UpdatePromotionInput {
  const { value, maxDiscount } = normalized(values);
  const body: UpdatePromotionInput = {};
  if (values.code !== original.code) body.code = values.code;
  if (values.name !== original.name) body.name = values.name;
  if (values.description !== (original.description ?? '')) {
    body.description = values.description || null;
  }
  if (values.type !== original.type) body.type = values.type;
  if (value !== original.value) body.value = value;
  if (maxDiscount !== original.maxDiscount) body.maxDiscount = maxDiscount;
  if (values.minOrderValue !== original.minOrderValue) {
    body.minOrderValue = values.minOrderValue;
  }
  if (values.usageLimit !== original.usageLimit) {
    body.usageLimit = values.usageLimit;
  }
  if (values.perUserLimit !== original.perUserLimit) {
    body.perUserLimit = values.perUserLimit;
  }
  if (values.startsAt !== toLocalInput(original.startsAt)) {
    body.startsAt = localInputToISO(values.startsAt);
  }
  if (values.endsAt !== toLocalInput(original.endsAt)) {
    body.endsAt = values.endsAt ? localInputToISO(values.endsAt) : null;
  }
  if (values.isActive !== original.isActive) body.isActive = values.isActive;
  return body;
}
