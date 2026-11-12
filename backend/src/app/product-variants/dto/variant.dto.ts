import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { objectId } from '../../../common/dto/param.dto';
import {
  variantFieldsSchema,
  variantInputSchema,
} from '../../products/dto/variant-input.schema';

/** POST /admin/products/:productID/variants */
export class CreateVariantDto extends createZodDto(variantInputSchema) {}

/**
 * PATCH /admin/products/:productID/variants/:variantID
 * Không sửa tồn kho ở đây: tồn kho đổi qua PATCH /admin/variants/:variantID/stock.
 * Rule "giá gạch ngang > giá bán" kiểm tra trong service (cần giá trị hiện tại).
 */
export class UpdateVariantDto extends createZodDto(
  variantFieldsSchema.omit({ stock: true }).partial().strict(),
) {}

/**
 * PATCH /admin/variants/:variantID/stock
 *  - { "stock": 20 }   đặt tồn kho = 20 (kiểm kê)
 *  - { "adjust": -3 }  trừ 3 / { "adjust": 5 } cộng 5 (nhập / xuất kho)
 */
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
