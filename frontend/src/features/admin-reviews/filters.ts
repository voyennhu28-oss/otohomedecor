import type { AdminReviewQuery, ReviewStatus } from '@/features/reviews/types';
import { parseOption, parsePositiveInt } from '@/hooks/use-url-filters';

export const REVIEW_FILTER_DEFAULTS = {
  status: '',
  rating: '',
  product: '',
  pname: '',
  page: '1',
  size: '20',
};

const OBJECT_ID = /^[a-f\d]{24}$/i;

export function toReviewQuery(
  raw: typeof REVIEW_FILTER_DEFAULTS,
): AdminReviewQuery {
  const status = parseOption<ReviewStatus | ''>(
    raw.status,
    ['', 'approved', 'pending', 'hidden'],
    '',
  );
  const rating = Number(raw.rating);
  return {
    status: status || undefined,
    rating:
      Number.isInteger(rating) && rating >= 1 && rating <= 5
        ? rating
        : undefined,
    productID: OBJECT_ID.test(raw.product) ? raw.product : undefined,
    page: parsePositiveInt(raw.page, 1),
    itemPerPage: Math.min(parsePositiveInt(raw.size, 20), 100),
  };
}

export const STATUS_ACTIONS: Record<ReviewStatus, string> = {
  approved: 'Hiển thị',
  pending: 'Chuyển về chờ duyệt',
  hidden: 'Ẩn đánh giá',
};
