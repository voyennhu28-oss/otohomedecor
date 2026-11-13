import { PromotionType } from '@prisma/client';
import {
  computeDiscount,
  getRuleViolation,
  getUnusableReason,
  normalizeRules,
  PromotionRules,
  UsageRule,
} from './promotion.util';

const NOW = new Date('2026-11-13T00:00:00Z');
const DAY = 86_400_000;

describe('promotion.util', () => {
  describe('computeDiscount', () => {
    it('percentage: làm tròn xuống, có trần maxDiscount', () => {
      const p = { type: PromotionType.percentage, value: 10, maxDiscount: 500_000 };
      expect(computeDiscount(p, 1_234_567, 30_000)).toBe(123_456);
      expect(computeDiscount(p, 20_000_000, 30_000)).toBe(500_000);
      expect(computeDiscount({ ...p, maxDiscount: null }, 20_000_000, 30_000)).toBe(2_000_000);
    });

    it('fixed_amount: không vượt quá subtotal', () => {
      const p = { type: PromotionType.fixed_amount, value: 200_000, maxDiscount: null };
      expect(computeDiscount(p, 1_000_000, 30_000)).toBe(200_000);
      expect(computeDiscount(p, 150_000, 30_000)).toBe(150_000);
    });

    it('free_shipping: bằng phí ship', () => {
      const p = { type: PromotionType.free_shipping, value: 0, maxDiscount: null };
      expect(computeDiscount(p, 1_000_000, 45_000)).toBe(45_000);
      expect(computeDiscount(p, 1_000_000, 0)).toBe(0);
    });
  });

  describe('getUnusableReason', () => {
    const promo = (overrides: Partial<UsageRule> = {}): UsageRule => ({
      isActive: true,
      startsAt: new Date(NOW.getTime() - DAY),
      endsAt: new Date(NOW.getTime() + DAY),
      minOrderValue: 1_000_000,
      usageLimit: 100,
      usedCount: 10,
      perUserLimit: 1,
      ...overrides,
    });
    const check = (p: UsageRule, subtotal = 2_000_000, usedByUser = 0) =>
      getUnusableReason(p, { subtotal, usedByUser, now: NOW });

    it('hợp lệ → null', () => {
      expect(check(promo())).toBeNull();
      expect(check(promo({ endsAt: null, usageLimit: null, perUserLimit: null }), 2_000_000, 99)).toBeNull();
    });

    it.each([
      ['đang tắt', promo({ isActive: false }), /tạm ngừng/],
      ['chưa tới ngày', promo({ startsAt: new Date(NOW.getTime() + 1000) }), /chưa đến/],
      ['đã hết hạn', promo({ endsAt: new Date(NOW.getTime() - 1000) }), /hết hạn/],
      ['hết tổng lượt', promo({ usedCount: 100 }), /hết lượt sử dụng/],
    ])('%s → báo lý do', (_name, p, reason) => {
      expect(check(p)).toMatch(reason);
    });

    it('user đã dùng hết lượt của mình', () => {
      expect(check(promo(), 2_000_000, 1)).toMatch(/Bạn đã dùng hết/);
    });

    it('chưa đủ giá trị đơn tối thiểu (có ghi số tiền)', () => {
      expect(check(promo(), 999_999)).toBe('Đơn hàng từ 1.000.000đ mới dùng được mã này');
      expect(check(promo(), 1_000_000)).toBeNull();
    });
  });

  describe('getRuleViolation / normalizeRules', () => {
    const rules = (overrides: Partial<PromotionRules> = {}): PromotionRules => ({
      type: PromotionType.percentage,
      value: 10,
      maxDiscount: null,
      startsAt: NOW,
      endsAt: null,
      usageLimit: null,
      usedCount: 0,
      ...overrides,
    });

    it('hợp lệ → null', () => {
      expect(getRuleViolation(rules())).toBeNull();
      expect(getRuleViolation(rules({ type: PromotionType.free_shipping, value: 0 }))).toBeNull();
    });

    it.each([
      ['% = 0', rules({ value: 0 })],
      ['% > 100', rules({ value: 101 })],
      ['giảm tiền = 0', rules({ type: PromotionType.fixed_amount, value: 0 })],
      ['endsAt trước startsAt', rules({ endsAt: new Date(NOW.getTime() - 1) })],
      ['endsAt bằng startsAt', rules({ endsAt: NOW })],
      ['usageLimit nhỏ hơn số lượt đã dùng', rules({ usageLimit: 5, usedCount: 6 })],
    ])('%s → lỗi', (_name, r) => {
      expect(getRuleViolation(r)).not.toBeNull();
    });

    it('free_shipping bỏ value; chỉ loại % mới có maxDiscount', () => {
      expect(normalizeRules({ value: 50, maxDiscount: 1 }, PromotionType.free_shipping)).toEqual({ value: 0, maxDiscount: null });
      expect(normalizeRules({ value: 50, maxDiscount: 1 }, PromotionType.fixed_amount)).toEqual({ value: 50, maxDiscount: null });
      expect(normalizeRules({ value: 50, maxDiscount: 1 }, PromotionType.percentage)).toEqual({ value: 50, maxDiscount: 1 });
    });
  });
});
