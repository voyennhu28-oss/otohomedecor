import { Promotion, PromotionType } from '@prisma/client';

const vnd = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;

export type DiscountRule = Pick<Promotion, 'type' | 'value' | 'maxDiscount'>;

/**
 * Số tiền giảm (VND, plan mục 10):
 *  - percentage: subtotal × value%, làm tròn xuống, tối đa maxDiscount
 *  - fixed_amount: value, không vượt quá subtotal
 *  - free_shipping: bằng phí ship
 */
export const computeDiscount = (promo: DiscountRule, subtotal: number, shippingFee: number) => {
  switch (promo.type) {
    case PromotionType.percentage:
      return Math.min(Math.floor((subtotal * promo.value) / 100), promo.maxDiscount ?? Infinity);
    case PromotionType.fixed_amount:
      return Math.min(promo.value, subtotal);
    case PromotionType.free_shipping:
      return shippingFee;
  }
};

export type UsageRule = Pick<
  Promotion,
  'isActive' | 'startsAt' | 'endsAt' | 'minOrderValue' | 'usageLimit' | 'usedCount' | 'perUserLimit'
>;

/**
 * Lý do mã KHÔNG dùng được cho đơn này, hoặc null nếu dùng được.
 * @param usedByUser số đơn chưa hủy của user đã dùng mã này
 */
export const getUnusableReason = (
  promo: UsageRule,
  { subtotal, usedByUser, now = new Date() }: { subtotal: number; usedByUser: number; now?: Date },
): string | null => {
  if (!promo.isActive) return 'Mã giảm giá đang tạm ngừng';
  if (promo.startsAt > now) return 'Mã giảm giá chưa đến thời gian áp dụng';
  if (promo.endsAt && promo.endsAt < now) return 'Mã giảm giá đã hết hạn';
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
    return 'Mã giảm giá đã hết lượt sử dụng';
  }
  if (promo.perUserLimit != null && usedByUser >= promo.perUserLimit) {
    return 'Bạn đã dùng hết lượt của mã giảm giá này';
  }
  if (subtotal < promo.minOrderValue) {
    return `Đơn hàng từ ${vnd(promo.minOrderValue)} mới dùng được mã này`;
  }
  return null;
};

export type PromotionRules = Pick<
  Promotion,
  'type' | 'value' | 'maxDiscount' | 'startsAt' | 'endsAt' | 'usageLimit' | 'usedCount'
>;

/** Lỗi cấu hình mã (admin nhập), hoặc null nếu hợp lệ. Dùng cho cả tạo mới và sửa. */
export const getRuleViolation = (promo: PromotionRules): string | null => {
  if (promo.type === PromotionType.percentage && (promo.value < 1 || promo.value > 100)) {
    return 'Mã giảm theo % phải có value từ 1 đến 100';
  }
  if (promo.type === PromotionType.fixed_amount && promo.value < 1) {
    return 'Mã giảm tiền phải có value (số tiền giảm) lớn hơn 0';
  }
  if (promo.endsAt && promo.endsAt <= promo.startsAt) return 'endsAt phải sau startsAt';
  if (promo.usageLimit != null && promo.usageLimit < promo.usedCount) {
    return `usageLimit không được nhỏ hơn số lượt đã dùng (${promo.usedCount})`;
  }
  return null;
};

/**
 * Chuẩn hóa field không áp dụng cho loại mã: free_shipping không có value,
 * chỉ loại percentage mới có maxDiscount.
 */
export const normalizeRules = <T extends Partial<Pick<Promotion, 'type' | 'value' | 'maxDiscount'>>>(
  promo: T,
  type: PromotionType,
): T => ({
  ...promo,
  ...(type === PromotionType.free_shipping && { value: 0 }),
  ...(type !== PromotionType.percentage && { maxDiscount: null }),
});
