import { Prisma } from '@prisma/client';

/** Field chưa có trong document cũ cũng tính như null (giống NOT_DELETED). */
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

/** Bộ sưu tập khách được thấy: đang bật và `now` nằm trong khoảng [startsAt, endsAt). */
export const visibleCollectionWhere = (
  now: Date,
): Prisma.CollectionWhereInput => ({
  AND: [
    { isActive: true },
    unsetOr('startsAt', { lte: now }),
    unsetOr('endsAt', { gt: now }),
  ],
});

/** Trả về thông báo lỗi nếu khoảng thời gian sai, null nếu hợp lệ. */
export const scheduleError = (
  startsAt: Date | null | undefined,
  endsAt: Date | null | undefined,
) =>
  startsAt && endsAt && endsAt <= startsAt ? 'endsAt phải sau startsAt' : null;
