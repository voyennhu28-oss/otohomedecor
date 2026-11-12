import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class GetOptionsParams extends createZodDto(
  z
    .object({
      limit: z.number().optional().default(10),
      select: z.string().optional(),
    })
    .passthrough(),
) {}

export interface Options {
  getOptions(params: GetOptionsParams);
}
