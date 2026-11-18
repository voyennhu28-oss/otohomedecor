import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { slugSchema } from '../../../common/dto/param.dto';
import { booleanQuery } from '../../../common/dto/query.dto';
import { scheduleError } from '../collection.util';

const fields = {
  name: z.string().trim().min(1).max(100),
  slug: slugSchema,
  description: z.string().trim().max(2000),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.number().int().min(0),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
};

const validSchedule = (
  dto: { startsAt?: Date | null; endsAt?: Date | null },
  ctx: z.RefinementCtx,
) => {
  const message = scheduleError(dto.startsAt, dto.endsAt);
  if (message) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['endsAt'] });
  }
};

export class CreateCollectionDto extends createZodDto(
  z
    .object({
      name: fields.name,
      slug: fields.slug.optional(),
      description: fields.description.optional(),
      isActive: fields.isActive.optional(),
      isFeatured: fields.isFeatured.optional(),
      sortOrder: fields.sortOrder.optional(),
      startsAt: fields.startsAt.optional(),
      endsAt: fields.endsAt.optional(),
    })
    .strict()
    .superRefine(validSchedule),
) {}

export class UpdateCollectionDto extends createZodDto(
  z
    .object({
      name: fields.name.optional(),
      slug: fields.slug.optional(),
      description: fields.description.nullable().optional(),
      isActive: fields.isActive.optional(),
      isFeatured: fields.isFeatured.optional(),
      sortOrder: fields.sortOrder.optional(),
      startsAt: fields.startsAt.nullable().optional(),
      endsAt: fields.endsAt.nullable().optional(),
    })
    .strict()
    .superRefine(validSchedule),
) {}

export class CollectionListQueryDto extends createZodDto(
  z.object({ featured: booleanQuery.optional() }),
) {}
