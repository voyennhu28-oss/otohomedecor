import { ProductStatus } from '@prisma/client';
import type { SaleVariant } from '../product-variants/product-variants.service';

export type SaleStatus =
  | 'available'
  | 'made_to_order'
  | 'insufficient_stock'
  | 'out_of_stock'
  | 'unavailable';

export const getSaleStatus = (
  variant: SaleVariant | undefined,
  quantity: number,
): SaleStatus => {
  if (!variant?.isActive || variant.product.status !== ProductStatus.active)
    return 'unavailable';
  if (variant.stock >= quantity) return 'available';
  if (variant.product.allowBackorder) return 'made_to_order';
  return variant.stock > 0 ? 'insufficient_stock' : 'out_of_stock';
};

export const isPurchasable = (status: SaleStatus) =>
  status === 'available' || status === 'made_to_order';

export const pickImageUrl = (
  variant: Pick<SaleVariant, 'images' | 'product'>,
) => variant.images[0]?.url ?? variant.product.images[0]?.url ?? null;
