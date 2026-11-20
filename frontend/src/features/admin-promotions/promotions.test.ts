import { describe, expect, it } from 'vitest';

import {
  computeDiscount,
  describeDiscount,
  getPromotionState,
  PROMOTION_FILTER_DEFAULTS,
  toPromotionQuery,
} from '@/features/admin-promotions/promotion-rules';
import {
  getPromotionFormSchema,
  toCreatePromotionInput,
  toPromotionFormValues,
  toUpdatePromotionInput,
} from '@/features/admin-promotions/schemas';
import type { Promotion } from '@/features/promotions/types';
import { formatVND } from '@/lib/format';

const NOW = new Date('2026-11-20T12:00:00.000Z');

const promotion = (patch: Partial<Promotion> = {}): Promotion => ({
  id: 'p1',
  code: 'WELCOME10',
  name: 'Khách mới',
  description: null,
  type: 'percentage',
  value: 10,
  maxDiscount: 500_000,
  minOrderValue: 1_000_000,
  usageLimit: 100,
  usedCount: 3,
  perUserLimit: 1,
  startsAt: '2026-11-01T00:00:00.000Z',
  endsAt: '2026-12-31T16:59:00.000Z',
  isActive: true,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  deletedAt: null,
  ...patch,
});

describe('promotion rules', () => {
  it('trạng thái theo thứ tự: tạm ngừng, chưa tới, hết hạn, hết lượt', () => {
    expect(getPromotionState(promotion({ isActive: false }), NOW)).toBe(
      'paused',
    );
    expect(
      getPromotionState(
        promotion({ startsAt: '2026-12-01T00:00:00.000Z' }),
        NOW,
      ),
    ).toBe('scheduled');
    expect(
      getPromotionState(promotion({ endsAt: '2026-11-19T00:00:00.000Z' }), NOW),
    ).toBe('expired');
    expect(getPromotionState(promotion({ usedCount: 100 }), NOW)).toBe(
      'used_up',
    );
    expect(getPromotionState(promotion(), NOW)).toBe('running');
  });

  it('mô tả và tính tiền giảm giống backend', () => {
    expect(describeDiscount(promotion())).toBe(
      `Giảm 10%, tối đa ${formatVND(500_000)}`,
    );
    expect(computeDiscount(promotion(), 8_000_000, 30_000)).toBe(500_000);
    expect(
      computeDiscount(
        promotion({ type: 'fixed_amount', value: 200_000, maxDiscount: null }),
        150_000,
        30_000,
      ),
    ).toBe(150_000);
    expect(
      computeDiscount(
        promotion({ type: 'free_shipping', value: 0 }),
        1,
        45_000,
      ),
    ).toBe(45_000);
  });

  it('đọc bộ lọc URL', () => {
    expect(
      toPromotionQuery({
        ...PROMOTION_FILTER_DEFAULTS,
        active: 'false',
        q: ' tet ',
      }),
    ).toEqual({ q: 'tet', isActive: false, page: 1, itemPerPage: 20 });
  });
});

describe('promotion form', () => {
  const base = { ...toPromotionFormValues(), code: 'tet', name: 'Tết' };

  it('giá trị theo loại mã', () => {
    const schema = getPromotionFormSchema('create');
    expect(
      schema.safeParse({ ...base, value: 150 }).error?.issues[0].path,
    ).toEqual(['value']);
    expect(
      schema.safeParse({ ...base, type: 'fixed_amount', value: null }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...base, type: 'free_shipping', value: null }).success,
    ).toBe(true);
  });

  it('không cho giới hạn lượt nhỏ hơn số đã dùng', () => {
    const result = getPromotionFormSchema('edit', 30).safeParse({
      ...toPromotionFormValues(promotion()),
      usageLimit: 20,
    });
    expect(result.error?.issues[0].path).toEqual(['usageLimit']);
  });

  it('tạo mới: mã viết hoa, free ship gửi value 0 và bỏ trần giảm', () => {
    const parsed = getPromotionFormSchema('create').parse({
      ...base,
      type: 'free_shipping',
      value: null,
      maxDiscount: 100_000,
    });
    expect(toCreatePromotionInput(parsed)).toMatchObject({
      code: 'TET',
      value: 0,
      maxDiscount: null,
      endsAt: null,
    });
    expect(toCreatePromotionInput(parsed)).not.toHaveProperty('startsAt');
  });

  it('sửa: chỉ gửi field đã đổi', () => {
    const original = promotion();
    const values = toPromotionFormValues(original);
    expect(toUpdatePromotionInput(values, original)).toEqual({});
    expect(
      toUpdatePromotionInput(
        { ...values, type: 'fixed_amount', value: 100_000 },
        original,
      ),
    ).toEqual({ type: 'fixed_amount', value: 100_000, maxDiscount: null });
  });
});
