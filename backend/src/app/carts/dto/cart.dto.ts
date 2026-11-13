import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { objectId } from '../../../common/dto/param.dto';

export const MAX_QUANTITY_PER_ITEM = 99;
export const MAX_ITEMS_PER_CART = 50;

const quantity = z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM);

/** POST /me/cart/items: đã có trong giỏ thì cộng dồn số lượng. */
export class AddCartItemDto extends createZodDto(
  z.object({ variantID: objectId, quantity: quantity.default(1) }).strict(),
) {}

/** PATCH /me/cart/items/:variantID: đặt lại số lượng. */
export class UpdateCartItemDto extends createZodDto(z.object({ quantity }).strict()) {}

export class CartVariantParamDto extends createZodDto(z.object({ variantID: objectId })) {}
