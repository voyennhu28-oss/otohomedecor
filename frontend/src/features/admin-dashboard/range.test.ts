import { describe, expect, it } from 'vitest';

import { toRevenuePoints } from '@/features/admin-dashboard/chart-data';
import {
  DASHBOARD_FILTER_DEFAULTS,
  percentChange,
  previousRange,
  resolveRange,
} from '@/features/admin-dashboard/range';

const TODAY = new Date(2026, 10, 19, 15, 0);
const raw = (patch: Partial<typeof DASHBOARD_FILTER_DEFAULTS>) => ({
  ...DASHBOARD_FILTER_DEFAULTS,
  ...patch,
});

describe('resolveRange', () => {
  it('preset tính theo ngày hôm nay, gồm cả hôm nay', () => {
    expect(resolveRange(raw({}), TODAY).range).toEqual({
      from: '2026-10-21',
      to: '2026-11-19',
      days: 30,
    });
    expect(resolveRange(raw({ range: '7d' }), TODAY).range.from).toBe(
      '2026-11-13',
    );
    expect(resolveRange(raw({ range: 'month' }), TODAY).range).toEqual({
      from: '2026-11-01',
      to: '2026-11-19',
      days: 19,
    });
  });

  it('tùy chọn: kiểm tra đủ ngày, thứ tự, tối đa 366 ngày', () => {
    expect(
      resolveRange(
        raw({ range: 'custom', from: '2026-11-01', to: '2026-11-10' }),
        TODAY,
      ),
    ).toMatchObject({ invalid: null, range: { days: 10 } });
    expect(
      resolveRange(
        raw({ range: 'custom', from: '2026-11-10', to: '2026-11-01' }),
        TODAY,
      ).invalid,
    ).toMatch(/sau ngày bắt đầu/);
    expect(
      resolveRange(
        raw({ range: 'custom', from: '2025-01-01', to: '2026-11-01' }),
        TODAY,
      ).invalid,
    ).toBe('Tối đa 366 ngày');
  });
});

describe('toRevenuePoints', () => {
  const days = (count: number) =>
    Array.from({ length: count }, (_, index) => {
      const date = new Date(2026, 0, 1 + index);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return { date: iso, revenue: 100, orders: 1 };
    });

  it('≤ 92 ngày: mỗi ngày một cột', () => {
    const { grouping, points } = toRevenuePoints(days(30));
    expect(grouping).toBe('day');
    expect(points).toHaveLength(30);
    expect(points[0]).toMatchObject({ label: '01/01', tooltip: '01/01/2026' });
  });

  it('> 92 ngày: gộp theo tuần (bắt đầu thứ Hai), tổng không đổi', () => {
    const { grouping, points } = toRevenuePoints(days(120));
    expect(grouping).toBe('week');
    expect(points[0].tooltip).toBe('01/01 – 04/01/2026');
    expect(points.reduce((sum, point) => sum + point.revenue, 0)).toBe(12_000);
  });
});

describe('so sánh kỳ trước', () => {
  it('kỳ trước cùng số ngày, liền trước', () => {
    expect(
      previousRange({ from: '2026-11-01', to: '2026-11-10', days: 10 }),
    ).toEqual({ from: '2026-10-22', to: '2026-10-31', days: 10 });
  });

  it('phần trăm thay đổi, kỳ trước bằng 0 thì không so được', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(90, 120)).toBe(-25);
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(0, 0)).toBe(0);
  });
});
