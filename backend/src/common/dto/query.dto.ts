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
