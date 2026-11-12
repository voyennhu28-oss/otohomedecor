import { createZodDto } from 'nestjs-zod';
import z from 'zod';
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
export class IDDto extends createZodDto(
  z.object({
    id: objectId,
  }),
) {}

export class ExportExcelDto extends createZodDto(
  z.object({
    ids: z.array(z.string().uuid()).optional().nullable().default(null),
    select: z.string().optional().nullish().default(null),
  }),
) {}
