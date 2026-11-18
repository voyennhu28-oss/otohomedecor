import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { objectId } from '../../../common/dto/param.dto';
import { httpUrlSchema } from '../../../common/dto/url.schema';
import { fullNameSchema, phoneSchema } from './user-fields';

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
