import type { ImageItem } from '@/features/products/types';

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
