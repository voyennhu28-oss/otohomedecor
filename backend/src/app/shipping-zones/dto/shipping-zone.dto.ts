import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PROVINCES } from '../../../common/constants/catalog.const';

const money = z.number().int().min(0); // VND

const fields = {
  name: z.string().trim().min(1).max(100), // "Nội thành HCM", "Miền Bắc"
  provinces: z
    .array(z.enum(PROVINCES))
    .min(1)
    .max(PROVINCES.length)
    .transform((list) => [...new Set(list)]),
  baseFee: money, // phí cho baseWeightKg đầu tiên
  baseWeightKg: z.number().positive().max(1000),
  feePerKg: money, // mỗi kg tiếp theo
  bulkySurcharge: money, // phụ phí hàng cồng kềnh
  freeShipThreshold: money.min(1).nullable(), // đơn >= mức này thì free ship (trừ hàng cồng kềnh)
  estimatedDays: z.number().int().min(1).max(60),
  isActive: z.boolean(),
};

/** POST /admin/shipping-zones. Một tỉnh chỉ thuộc 1 vùng đang hoạt động. */
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

/** PATCH /admin/shipping-zones/:id */
export class UpdateShippingZoneDto extends createZodDto(
  z.object(fields).partial().strict(),
) {}
