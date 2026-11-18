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
  value: z.number().int().min(0),
  maxDiscount: z.number().int().min(1).nullable(),
  minOrderValue: z.number().int().min(0),
  usageLimit: z.number().int().min(1).nullable(),
  perUserLimit: z.number().int().min(1).nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable(),
  isActive: z.boolean(),
};

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

export class UpdatePromotionDto extends createZodDto(
  z.object(fields).partial().strict(),
) {}

export class PromotionListQueryDto extends createZodDto(
  z.object({
    q: searchQuery.optional(),
    isActive: booleanQuery.optional(),
    page: pageQuery,
    itemPerPage: itemPerPageQuery(100, 20),
  }),
) {}
