import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { objectId } from '../../../common/dto/param.dto';
import {
  variantFieldsSchema,
  variantInputSchema,
} from '../../products/dto/variant-input.schema';

export class CreateVariantDto extends createZodDto(variantInputSchema) {}

export class UpdateVariantDto extends createZodDto(
  variantFieldsSchema.omit({ stock: true }).partial().strict(),
) {}

export class UpdateStockDto extends createZodDto(
  z
    .object({
      stock: z.number().int().min(0).optional(),
      adjust: z
        .number()
        .int()
        .refine((n) => n !== 0, 'adjust phải khác 0')
        .optional(),
    })
    .strict()
    .refine((d) => (d.stock === undefined) !== (d.adjust === undefined), {
      message: 'Gửi đúng 1 trong 2: "stock" hoặc "adjust"',
    }),
) {}

export class ProductIDParamDto extends createZodDto(
  z.object({ productID: objectId }),
) {}

export class ProductVariantParamDto extends createZodDto(
  z.object({ productID: objectId, variantID: objectId }),
) {}

export class VariantIDParamDto extends createZodDto(
  z.object({ variantID: objectId }),
) {}
