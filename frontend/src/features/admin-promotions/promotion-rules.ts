import type { Promotion } from '@/features/promotions/types';
import { parseOption, parsePositiveInt } from '@/hooks/use-url-filters';
import { formatVND } from '@/lib/format';

export type PromotionState =
  'running' | 'scheduled' | 'expired' | 'used_up' | 'paused';

export const PROMOTION_STATES: Record<PromotionState, string> = {
  running: 'Đang áp dụng',
  scheduled: 'Sắp áp dụng',
  expired: 'Hết hạn',
  used_up: 'Hết lượt',
  paused: 'Tạm ngừng',
};

type StateInput = Pick<
  Promotion,
  'isActive' | 'startsAt' | 'endsAt' | 'usageLimit' | 'usedCount'
>;

export function getPromotionState(
  promotion: StateInput,
  now = new Date(),
): PromotionState {
  if (!promotion.isActive) return 'paused';
  if (new Date(promotion.startsAt) > now) return 'scheduled';
  if (promotion.endsAt && new Date(promotion.endsAt) < now) return 'expired';
  if (
    promotion.usageLimit !== null &&
    promotion.usedCount >= promotion.usageLimit
  ) {
    return 'used_up';
  }
  return 'running';
}

type RuleInput = Pick<Promotion, 'type' | 'value' | 'maxDiscount'>;

export function describeDiscount(promotion: RuleInput) {
  switch (promotion.type) {
    case 'percentage':
      return promotion.maxDiscount
        ? `Giảm ${promotion.value}%, tối đa ${formatVND(promotion.maxDiscount)}`
        : `Giảm ${promotion.value}%`;
    case 'fixed_amount':
      return `Giảm ${formatVND(promotion.value)}`;
    case 'free_shipping':
      return 'Miễn phí vận chuyển';
  }
}

export function computeDiscount(
  promotion: RuleInput,
  subtotal: number,
  shippingFee: number,
) {
  switch (promotion.type) {
    case 'percentage':
      return Math.min(
        Math.floor((subtotal * promotion.value) / 100),
        promotion.maxDiscount ?? Infinity,
      );
    case 'fixed_amount':
      return Math.min(promotion.value, subtotal);
    case 'free_shipping':
      return shippingFee;
  }
}

export const PROMOTION_FILTER_DEFAULTS = {
  q: '',
  active: '',
  page: '1',
  size: '20',
};

export function toPromotionQuery(raw: typeof PROMOTION_FILTER_DEFAULTS) {
  const active = parseOption(raw.active, ['', 'true', 'false'] as const, '');
  const q = raw.q.trim().slice(0, 100);
  return {
    q: q || undefined,
    isActive: active === '' ? undefined : active === 'true',
    page: parsePositiveInt(raw.page, 1),
    itemPerPage: Math.min(parsePositiveInt(raw.size, 20), 100),
  };
}
