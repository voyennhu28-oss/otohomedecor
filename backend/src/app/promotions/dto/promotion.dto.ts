import { PromotionType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  booleanQuery,
  itemPerPageQuery,
  pageQuery,
  searchQuery,
} from '../../../common/dto/query.dto';
import { getRuleViolation } from '../promotion.util';

/** "welcome10" → "WELCOME10" */
export const promotionCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,30}$/, 'Mã gồm 3–30 ký tự: chữ, số, "-" hoặc "_"');

const fields = {
  code: promotionCodeSchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable(),
  type: z.nativeEnum(PromotionType),
  value: z.number().int().min(0), // % (1–100) hoặc số tiền VND; free_shipping bỏ qua
  maxDiscount: z.number().int().min(1).nullable(), // trần tiền giảm, chỉ cho loại %
  minOrderValue: z.number().int().min(0),
  usageLimit: z.number().int().min(1).nullable(), // tổng lượt dùng, null = không giới hạn
  perUserLimit: z.number().int().min(1).nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable(),
  isActive: z.boolean(),
};

/** POST /admin/promotions */
export class CreatePromotionDto extends createZodDto(
  z
    .object({
      ...fields,
      description: fields.description.optional(),
      value: fields.value.default(0),
      maxDiscount: fields.maxDiscount.optional(),
      minOrderValue: fields.minOrderValue.default(0),
      usageLimit: fields.usageLimit.optional(),
      perUserLimit: fields.perUserLimit.optional(),
      startsAt: fields.startsAt.default(() => new Date()),
      endsAt: fields.endsAt.optional(),
      isActive: fields.isActive.default(true),
    })
    .strict()
    .superRefine((dto, ctx) => {
      const message = getRuleViolation({
        ...dto,
        maxDiscount: dto.maxDiscount ?? null,
        endsAt: dto.endsAt ?? null,
        usageLimit: dto.usageLimit ?? null,
        usedCount: 0,
      });
      if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }),
) {}

/** PATCH /admin/promotions/:id. Rule giữa các field kiểm tra trong service (cần giá trị hiện tại). */
export class UpdatePromotionDto extends createZodDto(z.object(fields).partial().strict()) {}

/** GET /admin/promotions?q=&isActive=&page=&itemPerPage= */
export class PromotionListQueryDto extends createZodDto(
  z.object({
    q: searchQuery.optional(), // tìm theo mã hoặc tên
    isActive: booleanQuery.optional(),
    page: pageQuery,
    itemPerPage: itemPerPageQuery(100, 20),
  }),
) {}
