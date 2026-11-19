import { format, parseISO, startOfWeek } from 'date-fns';

import type { Dashboard } from '@/features/admin-dashboard/types';

export type RevenuePoint = {
  key: string;
  label: string;
  tooltip: string;
  revenue: number;
  orders: number;
};

export const WEEKLY_AFTER_DAYS = 92;

export function toRevenuePoints(days: Dashboard['revenueByDay']): {
  points: RevenuePoint[];
  grouping: 'day' | 'week';
} {
  if (days.length <= WEEKLY_AFTER_DAYS) {
    return {
      grouping: 'day',
      points: days.map((day) => {
        const date = parseISO(day.date);
        return {
          key: day.date,
          label: format(date, 'dd/MM'),
          tooltip: format(date, 'dd/MM/yyyy'),
          revenue: day.revenue,
          orders: day.orders,
        };
      }),
    };
  }

  const weeks = new Map<string, RevenuePoint & { end: string }>();
  for (const day of days) {
    const date = parseISO(day.date);
    const start = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const week = weeks.get(start) ?? {
      key: start,
      label: '',
      tooltip: '',
      revenue: 0,
      orders: 0,
      end: day.date,
    };
    week.revenue += day.revenue;
    week.orders += day.orders;
    week.end = day.date;
    weeks.set(start, week);
  }

  return {
    grouping: 'week',
    points: [...weeks.values()].map(({ end, ...week }) => {
      const first = days.find((day) => day.date >= week.key)?.date ?? week.key;
      return {
        ...week,
        label: format(parseISO(first), 'dd/MM'),
        tooltip: `${format(parseISO(first), 'dd/MM')} – ${format(parseISO(end), 'dd/MM/yyyy')}`,
      };
    }),
  };
}

const compact = new Intl.NumberFormat('vi-VN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCompactVND(value: number) {
  return value === 0 ? '0' : compact.format(value);
}
