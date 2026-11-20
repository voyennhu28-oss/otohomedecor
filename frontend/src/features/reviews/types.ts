import type { ImageItem } from '@/features/products/types';
import type { Page } from '@/types/api';

export const REVIEW_STATUSES = {
  approved: 'Đang hiển thị',
  pending: 'Chờ duyệt',
  hidden: 'Đã ẩn',
} as const;

export type ReviewStatus = keyof typeof REVIEW_STATUSES;

export type Review = {
  id: string;
  productID: string;
  userID: string;
  orderID: string;
  rating: number;
  comment: string | null;
  images: ImageItem[];
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminReviewListItem = Review & {
  user: { id: string; email: string; fullName: string } | null;
  product: { id: string; name: string; slug: string } | null;
};

export type AdminReviewQuery = {
  status?: ReviewStatus;
  productID?: string;
  rating?: number;
  page?: number;
  itemPerPage?: number;
};

export const REVIEW_SORTS = {
  newest: 'Mới nhất',
  rating_desc: 'Điểm cao trước',
  rating_asc: 'Điểm thấp trước',
} as const;

export type ReviewSort = keyof typeof REVIEW_SORTS;

export type PublicReview = Pick<
  Review,
  'id' | 'rating' | 'comment' | 'images' | 'createdAt' | 'updatedAt'
> & { user: { fullName: string; avatarUrl: string | null } };

export type ReviewStats = {
  average: number;
  count: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
};

export type ProductReviewPage = Page<PublicReview> & { stats: ReviewStats };

export type ProductReviewQuery = {
  rating?: number;
  sort?: ReviewSort;
  page?: number;
  itemPerPage?: number;
};
