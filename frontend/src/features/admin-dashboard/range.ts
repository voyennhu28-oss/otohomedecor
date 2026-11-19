import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfMonth,
  subDays,
} from 'date-fns';

import { parseOption } from '@/hooks/use-url-filters';

export const RANGE_PRESETS = {
  '7d': '7 ngày',
  '30d': '30 ngày',
  '90d': '90 ngày',
  month: 'Tháng này',
  custom: 'Tùy chọn',
} as const;

export type RangePreset = keyof typeof RANGE_PRESETS;

export const MAX_RANGE_DAYS = 366;

export const LOW_STOCK_OPTIONS = [0, 5, 10, 20] as const;

export const DASHBOARD_FILTER_DEFAULTS = {
  range: '30d',
  from: '',
  to: '',
  low: '5',
};

export type DateRange = { from: string; to: string; days: number };

const DAY = 'yyyy-MM-dd';
const toDay = (date: Date) => format(date, DAY);

function parseDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

function presetRange(preset: Exclude<RangePreset, 'custom'>, today: Date) {
  const start =
    preset === 'month'
      ? startOfMonth(today)
      : subDays(today, { '7d': 6, '30d': 29, '90d': 89 }[preset]);
  return makeRange(start, today);
}

function makeRange(start: Date, end: Date): DateRange {
  return {
    from: toDay(start),
    to: toDay(end),
    days: differenceInCalendarDays(end, start) + 1,
  };
}

export function resolveRange(
  raw: typeof DASHBOARD_FILTER_DEFAULTS,
  today = new Date(),
): { preset: RangePreset; range: DateRange; invalid: string | null } {
  const preset = parseOption<RangePreset>(
    raw.range,
    Object.keys(RANGE_PRESETS) as RangePreset[],
    '30d',
  );
  if (preset !== 'custom') {
    return { preset, range: presetRange(preset, today), invalid: null };
  }
  const start = parseDay(raw.from);
  const end = parseDay(raw.to);
  const fallback = presetRange('30d', today);
  if (!start || !end) {
    return {
      preset,
      range: fallback,
      invalid: 'Chọn đủ ngày bắt đầu và kết thúc',
    };
  }
  if (end < start) {
    return {
      preset,
      range: fallback,
      invalid: 'Ngày kết thúc phải sau ngày bắt đầu',
    };
  }
  const range = makeRange(start, end);
  if (range.days > MAX_RANGE_DAYS) {
    return {
      preset,
      range: fallback,
      invalid: `Tối đa ${MAX_RANGE_DAYS} ngày`,
    };
  }
  return { preset, range, invalid: null };
}

export function previousRange(range: DateRange): DateRange {
  const end = subDays(parseISO(range.from), 1);
  return makeRange(subDays(end, range.days - 1), end);
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function rangeLabel(range: DateRange) {
  const from = format(parseISO(range.from), 'dd/MM/yyyy');
  const to = format(parseISO(range.to), 'dd/MM/yyyy');
  return from === to ? from : `${from} – ${to}`;
}
