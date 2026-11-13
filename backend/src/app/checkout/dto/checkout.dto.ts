import { PaymentMethod } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { objectId } from '../../../common/dto/param.dto';
import { promotionCodeSchema } from '../../promotions/dto/promotion.dto';

/** COD hoặc chuyển khoản VietQR, SePay xác nhận qua webhook (plan mục 12). */
export const SUPPORTED_PAYMENT_METHODS = [PaymentMethod.cod, PaymentMethod.bank_transfer] as const;

const fields = {
  addressID: objectId, // địa chỉ trong sổ địa chỉ của chính user
  // FE gửi "" khi ô mã trống → coi như không có mã
  promotionCode: z.preprocess((v) => (v === '' ? undefined : v), promotionCodeSchema.optional()),
  withAssembly: z.boolean().default(false), // lắp đặt cho các sản phẩm requiresAssembly
};

/** POST /checkout/preview: tính tiền, không ghi DB. */
export class CheckoutPreviewDto extends createZodDto(z.object(fields).strict()) {}

/** POST /checkout */
export class CheckoutDto extends createZodDto(
  z
    .object({
      ...fields,
      paymentMethod: z.enum(SUPPORTED_PAYMENT_METHODS, {
        errorMap: () => ({ message: `Hiện chỉ hỗ trợ: ${SUPPORTED_PAYMENT_METHODS.join(', ')}` }),
      }),
      note: z.string().trim().max(500).optional(), // ghi chú cho shop
    })
    .strict(),
) {}
