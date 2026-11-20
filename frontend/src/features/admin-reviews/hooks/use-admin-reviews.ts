'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type { AdminReviewQuery, ReviewStatus } from '@/features/reviews/types';
import { reviewService } from '@/services/review.service';

export const ADMIN_REVIEWS_KEY = ['admin', 'reviews'] as const;

export function useAdminReviews(query: AdminReviewQuery) {
  return useQuery({
    queryKey: [...ADMIN_REVIEWS_KEY, query],
    queryFn: () => reviewService.adminList(query),
    placeholderData: keepPreviousData,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_REVIEWS_KEY }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
    ]);
}

export function useUpdateReviewStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReviewStatus }) =>
      reviewService.updateStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useRemoveReviewImage() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, publicID }: { id: string; publicID: string }) =>
      reviewService.removeImage(id, publicID),
    onSuccess: invalidate,
  });
}
