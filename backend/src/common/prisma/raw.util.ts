export const rawDate = (date: Date) => ({ $date: date.toISOString() });

type RawValue = unknown;

export const rawNumber = (value: RawValue): number => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const inner =
      v.$numberLong ?? v.$numberInt ?? v.$numberDouble ?? v.$numberDecimal;
    if (inner !== undefined) return Number(inner);
  }
  return 0;
};

export const rawId = (value: RawValue): string => {
  if (value && typeof value === 'object' && '$oid' in value)
    return String((value as { $oid: unknown }).$oid);
  return String(value ?? '');
};
