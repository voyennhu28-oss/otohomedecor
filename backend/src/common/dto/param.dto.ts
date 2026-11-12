import { createZodDto } from 'nestjs-zod';
import z from 'zod';
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
export class IDDto extends createZodDto(
  z.object({
    id: objectId,
  }),
) {}

/** "ban-tra", "sofa-3-cho": chữ thường không dấu, số, gạch ngang giữa các từ. */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang',
  );

export class SlugDto extends createZodDto(z.object({ slug: slugSchema })) {}

export class ExportExcelDto extends createZodDto(
  z.object({
    ids: z.array(objectId).optional().nullable().default(null),
    select: z.string().optional().nullish().default(null),
  }),
) {}
