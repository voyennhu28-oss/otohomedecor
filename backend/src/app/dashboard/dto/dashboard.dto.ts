import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { vnDateQuery } from '../../../common/dto/query.dto';

export const MAX_RANGE_DAYS = 366;
const DAY_MS = 86_400_000;

export class DashboardQueryDto extends createZodDto(
  z
    .object({
      from: vnDateQuery('start').optional(),
      to: vnDateQuery('end').optional(),
      lowStockThreshold: z.coerce.number().int().min(0).max(1000).default(5),
      topLimit: z.coerce.number().int().min(1).max(50).default(10),
    })
    .refine((q) => !q.from || !q.to || q.from <= q.to, {
      message: '"from" phải trước "to"',
      path: ['from'],
    })
    .refine(
      (q) =>
        !q.from ||
        !q.to ||
        q.to.getTime() - q.from.getTime() < MAX_RANGE_DAYS * DAY_MS,
      {
        message: `Tối đa ${MAX_RANGE_DAYS} ngày`,
        path: ['to'],
      },
    ),
) {}
