import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { objectId } from '../../../common/dto/param.dto';
import { httpUrlSchema } from '../../../common/dto/url.schema';
import { fullNameSchema, phoneSchema } from './user-fields';

/** PATCH /me: chỉ sửa thông tin cá nhân. Gửi field khác (role, email...) sẽ bị 400. */
export class UpdateMeDto extends createZodDto(
  z
    .object({
      fullName: fullNameSchema.optional(),
      phone: phoneSchema.nullable().optional(),
      avatarUrl: httpUrlSchema.nullable().optional(),
    })
    .strict(),
) {}

export class ProductIDParamDto extends createZodDto(
  z.object({ productID: objectId }),
) {}
