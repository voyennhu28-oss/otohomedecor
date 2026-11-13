import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PROVINCES } from '../../../common/constants/catalog.const';
import { fullNameSchema, phoneSchema } from '../../users/dto/user-fields';

const text = (max: number) => z.string().trim().min(1).max(max);

const fields = {
  fullName: fullNameSchema, // tên người nhận
  phone: phoneSchema,
  province: z.enum(PROVINCES), // lấy từ GET /shipping-zones/provinces
  district: text(100).nullable(), // không bắt buộc: từ 01/07/2025 không còn cấp huyện
  ward: text(100), // phường / xã
  street: text(200), // số nhà, tên đường
};

/** POST /me/addresses. Địa chỉ đầu tiên luôn là mặc định. */
export class CreateAddressDto extends createZodDto(
  z
    .object({
      ...fields,
      district: fields.district.optional(),
      isDefault: z.boolean().default(false),
    })
    .strict(),
) {}

/** PATCH /me/addresses/:id. Đặt mặc định dùng PATCH /me/addresses/:id/default. */
export class UpdateAddressDto extends createZodDto(z.object(fields).partial().strict()) {}
