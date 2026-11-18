import { toVnDate } from '../../common/dto/query.dto';

const DAY_MS = 86_400_000;
export const DEFAULT_RANGE_DAYS = 30;

const vnStartOfDay = (vnDate: string) =>
  new Date(`${vnDate}T00:00:00.000+07:00`);
const vnEndOfDay = (vnDate: string) => new Date(`${vnDate}T23:59:59.999+07:00`);

export const resolveRange = (from?: Date, to?: Date, now = new Date()) => {
  const end = to ?? vnEndOfDay(toVnDate(now));
  const start =
    from ??
    vnStartOfDay(
      toVnDate(new Date(end.getTime() - (DEFAULT_RANGE_DAYS - 1) * DAY_MS)),
    );
  return { from: start, to: end };
};

export const listVnDates = (from: Date, to: Date): string[] => {
  const dates: string[] = [];
  const last = toVnDate(to);
  for (let day = toVnDate(from); day <= last;) {
    dates.push(day);
    day = toVnDate(new Date(vnStartOfDay(day).getTime() + DAY_MS));
  }
  return dates;
};

export const fillDaily = (
  dates: string[],
  daily: { date: string; revenue: number; orders: number }[],
) => {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  return dates.map(
    (date) => byDate.get(date) ?? { date, revenue: 0, orders: 0 },
  );
};
