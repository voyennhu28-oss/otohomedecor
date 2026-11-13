import { BadRequestException, ConflictException } from '@nestjs/common';
import type { CartItem } from '@prisma/client';
import { getSaleStatus } from '../carts/sale-status';
import type { SaleVariant } from '../product-variants/product-variants.service';

export interface CheckoutLine {
  variant: SaleVariant;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  assemblyFee: number;
  /** true: có sẵn hàng → trừ kho. false: hàng đặt làm không đủ kho → không trừ, cộng leadTimeDays. */
  reserveStock: boolean;
}

/**
 * Dựng các dòng của đơn từ giỏ hàng + dữ liệu variant ĐỌC TỪ DB (giá luôn lấy từ DB).
 * Có dòng không mua được thì báo lỗi cho cả đơn để khách sửa giỏ trước.
 */
export const buildCheckoutLines = (
  items: CartItem[],
  variants: SaleVariant[],
  withAssembly: boolean,
): CheckoutLine[] => {
  const byID = new Map(variants.map((v) => [v.id, v]));

  return items.map(({ variantID, quantity }) => {
    const variant = byID.get(variantID);
    const status = getSaleStatus(variant, quantity);

    if (!variant || status === 'unavailable') {
      throw new BadRequestException(
        `${variant ? `"${variant.name}"` : 'Có sản phẩm'} đã ngừng bán, vui lòng xóa khỏi giỏ hàng`,
      );
    }
    if (status === 'insufficient_stock' || status === 'out_of_stock') {
      throw new ConflictException(
        variant.stock > 0
          ? `"${variant.name}" chỉ còn ${variant.stock} sản phẩm`
          : `"${variant.name}" đã hết hàng`,
      );
    }

    const { product } = variant;
    return {
      variant,
      quantity,
      unitPrice: variant.price,
      lineTotal: variant.price * quantity,
      assemblyFee: withAssembly && product.requiresAssembly ? product.assemblyFee * quantity : 0,
      reserveStock: status === 'available',
    };
  });
};

export const sumBy = <T>(list: T[], pick: (item: T) => number) =>
  list.reduce((sum, item) => sum + pick(item), 0);
