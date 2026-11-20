export const PROMOTION_TYPES = {
  percentage: 'Giảm theo %',
  fixed_amount: 'Giảm số tiền',
  free_shipping: 'Miễn phí vận chuyển',
} as const;

export type PromotionType = keyof typeof PROMOTION_TYPES;

export type Promotion = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: PromotionType;
  value: number;
  maxDiscount: number | null;
  minOrderValue: number;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number | null;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type PromotionInput = {
  code: string;
  name: string;
  description?: string | null;
  type: PromotionType;
  value?: number;
  maxDiscount?: number | null;
  minOrderValue?: number;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  startsAt?: string;
  endsAt?: string | null;
  isActive?: boolean;
};

export type UpdatePromotionInput = Partial<PromotionInput>;

export type PromotionQuery = {
  q?: string;
  isActive?: boolean;
  page?: number;
  itemPerPage?: number;
};
