import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { objectId, slugSchema } from '../../../common/dto/param.dto';
import { httpUrlSchema } from '../../../common/dto/url.schema';

const name = z.string().trim().min(1).max(100);
const description = z.string().trim().max(1000);
const imageUrl = httpUrlSchema;
const sortOrder = z.number().int().min(0);

/** POST /admin/categories. Không gửi slug thì tự sinh từ name. parentID null/không gửi = danh mục gốc. */
export class CreateCategoryDto extends createZodDto(
  z
    .object({
      name,
      slug: slugSchema.optional(),
      description: description.optional(),
      imageUrl: imageUrl.optional(),
      parentID: objectId.nullable().optional(),
      sortOrder: sortOrder.optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
) {}

/** PATCH /admin/categories/:id. Đổi name KHÔNG tự đổi slug (giữ link cũ / SEO). */
export class UpdateCategoryDto extends createZodDto(
  z
    .object({
      name: name.optional(),
      slug: slugSchema.optional(),
      description: description.nullable().optional(),
      imageUrl: imageUrl.nullable().optional(),
      parentID: objectId.nullable().optional(), // null = chuyển lên làm danh mục gốc
      sortOrder: sortOrder.optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
) {}
