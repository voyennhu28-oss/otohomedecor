import type { ImageItem } from '@/features/products/types';
import type {
  AdminReviewListItem,
  AdminReviewQuery,
  ProductReviewPage,
  ProductReviewQuery,
  Review,
  ReviewStatus,
} from '@/features/reviews/types';
import { api } from '@/lib/api-client';
import { toQueryString } from '@/lib/query-string';
import type { Page } from '@/types/api';

export const reviewService = {
  productReviews: (productID: string, query: ProductReviewQuery) =>
    api.get<ProductReviewPage>(
      `/products/${productID}/reviews${toQueryString(query)}`,
      { skipAuthRefresh: true },
    ),

  adminList: (query: AdminReviewQuery) =>
    api.get<Page<AdminReviewListItem>>(`/admin/reviews${toQueryString(query)}`),

  updateStatus: (id: string, status: ReviewStatus) =>
    api.patch<Review>(`/admin/reviews/${id}/status`, { status }),

  removeImage: (id: string, publicID: string) =>
    api.delete<ImageItem[]>(
      `/admin/reviews/${id}/images/${encodeURIComponent(publicID)}`,
    ),
};
