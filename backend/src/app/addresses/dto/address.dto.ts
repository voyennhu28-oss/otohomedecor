import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PROVINCES } from '../../../common/constants/catalog.const';
import { fullNameSchema, phoneSchema } from '../../users/dto/user-fields';

const text = (max: number) => z.string().trim().min(1).max(max);

const fields = {
  fullName: fullNameSchema,
  phone: phoneSchema,
  province: z.enum(PROVINCES),
  district: text(100).nullable(),
  ward: text(100),
  street: text(200),
};

export class CreateAddressDto extends createZodDto(
  z
    .object({
      ...fields,
      district: fields.district.optional(),
      isDefault: z.boolean().default(false),
    })
    .strict(),
) {}

export class UpdateAddressDto extends createZodDto(
  z.object(fields).partial().strict(),
) {}
