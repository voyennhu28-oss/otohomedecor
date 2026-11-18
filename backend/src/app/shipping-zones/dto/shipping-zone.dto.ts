import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PROVINCES } from '../../../common/constants/catalog.const';

const money = z.number().int().min(0);

const fields = {
  name: z.string().trim().min(1).max(100),
  provinces: z
    .array(z.enum(PROVINCES))
    .min(1)
    .max(PROVINCES.length)
    .transform((list) => [...new Set(list)]),
  baseFee: money,
  baseWeightKg: z.number().positive().max(1000),
  feePerKg: money,
  bulkySurcharge: money,
  freeShipThreshold: money.min(1).nullable(),
  estimatedDays: z.number().int().min(1).max(60),
  isActive: z.boolean(),
};

export class CreateShippingZoneDto extends createZodDto(
  z
    .object({
      ...fields,
      bulkySurcharge: fields.bulkySurcharge.default(0),
      freeShipThreshold: fields.freeShipThreshold.optional(),
      isActive: fields.isActive.default(true),
    })
    .strict(),
) {}

export class UpdateShippingZoneDto extends createZodDto(
  z.object(fields).partial().strict(),
) {}
