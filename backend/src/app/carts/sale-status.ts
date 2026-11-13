import { ProductStatus } from '@prisma/client';
import type { SaleVariant } from '../product-variants/product-variants.service';

/**
 * Trạng thái mua của 1 dòng giỏ hàng, tính lại mỗi lần đọc (giá / tồn kho có thể đã đổi):
 *  - available           đủ hàng
 *  - made_to_order       hàng đặt làm (allowBackorder) không đủ kho: vẫn đặt được, giao sau leadTimeDays
 *  - insufficient_stock  còn hàng nhưng không đủ số lượng
 *  - out_of_stock        hết hàng
 *  - unavailable         variant / sản phẩm đã ngừng bán hoặc bị xóa
 */
export type SaleStatus =
  | 'available'
  | 'made_to_order'
  | 'insufficient_stock'
  | 'out_of_stock'
  | 'unavailable';

export const getSaleStatus = (variant: SaleVariant | undefined, quantity: number): SaleStatus => {
  if (!variant?.isActive || variant.product.status !== ProductStatus.active) return 'unavailable';
  if (variant.stock >= quantity) return 'available';
  if (variant.product.allowBackorder) return 'made_to_order';
  return variant.stock > 0 ? 'insufficient_stock' : 'out_of_stock';
};

export const isPurchasable = (status: SaleStatus) =>
  status === 'available' || status === 'made_to_order';

/** Ảnh hiển thị: ảnh đầu của variant, không có thì ảnh đầu của product. */
export const pickImageUrl = (variant: Pick<SaleVariant, 'images' | 'product'>) =>
  variant.images[0]?.url ?? variant.product.images[0]?.url ?? null;
