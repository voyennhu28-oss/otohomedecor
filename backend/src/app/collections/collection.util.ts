import { Prisma } from '@prisma/client';

const unsetOr = (
  field: 'startsAt' | 'endsAt',
  condition: Prisma.DateTimeNullableFilter,
): Prisma.CollectionWhereInput => ({
  OR: [
    { [field]: null },
    { [field]: { isSet: false } },
    { [field]: condition },
  ],
});

export const visibleCollectionWhere = (
  now: Date,
): Prisma.CollectionWhereInput => ({
  AND: [
    { isActive: true },
    unsetOr('startsAt', { lte: now }),
    unsetOr('endsAt', { gt: now }),
  ],
});

export const scheduleError = (
  startsAt: Date | null | undefined,
  endsAt: Date | null | undefined,
) =>
  startsAt && endsAt && endsAt <= startsAt ? 'endsAt phải sau startsAt' : null;
