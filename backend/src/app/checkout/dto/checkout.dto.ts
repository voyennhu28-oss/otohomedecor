import { PaymentMethod } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { objectId } from '../../../common/dto/param.dto';
import { promotionCodeSchema } from '../../promotions/dto/promotion.dto';

export const SUPPORTED_PAYMENT_METHODS = [
  PaymentMethod.cod,
  PaymentMethod.bank_transfer,
] as const;

const fields = {
  addressID: objectId,
  promotionCode: z.preprocess(
    (v) => (v === '' ? undefined : v),
    promotionCodeSchema.optional(),
  ),
  withAssembly: z.boolean().default(false),
};

export class CheckoutPreviewDto extends createZodDto(
  z.object(fields).strict(),
) {}

export class CheckoutDto extends createZodDto(
  z
    .object({
      ...fields,
      paymentMethod: z.enum(SUPPORTED_PAYMENT_METHODS, {
        errorMap: () => ({
          message: `Hiện chỉ hỗ trợ: ${SUPPORTED_PAYMENT_METHODS.join(', ')}`,
        }),
      }),
      note: z.string().trim().max(500).optional(),
    })
    .strict(),
) {}
