import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { objectId } from '../../../common/dto/param.dto';

export const MAX_QUANTITY_PER_ITEM = 99;
export const MAX_ITEMS_PER_CART = 50;

const quantity = z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM);

export class AddCartItemDto extends createZodDto(
  z.object({ variantID: objectId, quantity: quantity.default(1) }).strict(),
) {}

export class UpdateCartItemDto extends createZodDto(
  z.object({ quantity }).strict(),
) {}

export class CartVariantParamDto extends createZodDto(
  z.object({ variantID: objectId }),
) {}
