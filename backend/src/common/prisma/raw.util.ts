/**
 * Helper cho `aggregateRaw` / `$runCommandRaw` của Prisma + MongoDB. Dữ liệu vào / ra ở dạng
 * MongoDB Extended JSON: ngày là { $date }, ObjectId là { $oid }, số lớn có thể là { $numberLong }.
 */

/** Date → giá trị dùng được trong pipeline thô (so sánh với field DateTime). */
export const rawDate = (date: Date) => ({ $date: date.toISOString() });

type RawValue = unknown;

/** Số trong kết quả thô: number, { $numberInt }, { $numberLong }, { $numberDouble } → number. */
export const rawNumber = (value: RawValue): number => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const inner = v.$numberLong ?? v.$numberInt ?? v.$numberDouble ?? v.$numberDecimal;
    if (inner !== undefined) return Number(inner);
  }
  return 0;
};

/** ObjectId trong kết quả thô: { $oid } hoặc chuỗi → chuỗi 24 ký tự hex. */
export const rawId = (value: RawValue): string => {
  if (value && typeof value === 'object' && '$oid' in value) return String((value as { $oid: unknown }).$oid);
  return String(value ?? '');
};
