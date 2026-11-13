import { z } from 'zod';

// Query string luôn là chuỗi, các helper dưới đây chuyển sang đúng kiểu.

/** "true" / "false" → boolean */
export const booleanQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

export const pageQuery = z.coerce.number().int().min(1).default(1);

export const itemPerPageQuery = (max: number, fallback: number) =>
  z.coerce.number().int().min(1).max(max).default(fallback);

/** Chuỗi tìm kiếm: bỏ khoảng trắng 2 đầu, 1–100 ký tự. */
export const searchQuery = z.string().trim().min(1).max(100);

/** "2026-11-01" hoặc ISO datetime → Date. */
export const dateQuery = z.coerce.date();

export const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Ngày trong query: "2026-11-13" hiểu là cả ngày theo giờ Việt Nam
 * (start = 00:00, end = 23:59:59.999); chuỗi ISO đầy đủ thì giữ nguyên.
 */
export const vnDateQuery = (edge: 'start' | 'end') =>
  z
    .string()
    .trim()
    .transform((value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? `${value}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}+07:00`
        : value,
    )
    .pipe(z.coerce.date());

/** "YYYY-MM-DD" của 1 thời điểm theo giờ Việt Nam. */
export const toVnDate = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: VN_TIMEZONE }).format(date);

export interface Page<T> {
  list: T[];
  totalItems: number;
  totalPages: number;
}

export const toPage = <T>(list: T[], totalItems: number, itemPerPage: number): Page<T> => ({
  list,
  totalItems,
  totalPages: Math.ceil(totalItems / itemPerPage),
});

/** skip / take cho Prisma từ page (bắt đầu từ 1). */
export const paginate = ({ page, itemPerPage }: { page: number; itemPerPage: number }) => ({
  skip: (page - 1) * itemPerPage,
  take: itemPerPage,
});
