'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type {
  PromotionQuery,
  UpdatePromotionInput,
} from '@/features/promotions/types';
import { promotionService } from '@/services/promotion.service';

export const ADMIN_PROMOTIONS_KEY = ['admin', 'promotions'] as const;

export function useAdminPromotions(query: PromotionQuery) {
  return useQuery({
    queryKey: [...ADMIN_PROMOTIONS_KEY, query],
    queryFn: () => promotionService.adminList(query),
    placeholderData: keepPreviousData,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ADMIN_PROMOTIONS_KEY });
}

export function useCreatePromotion() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: promotionService.create,
    onSuccess: invalidate,
  });
}

export function useUpdatePromotion() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePromotionInput }) =>
      promotionService.update(id, body),
    onSuccess: invalidate,
  });
}

export function useDeletePromotion() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: promotionService.remove,
    onSuccess: invalidate,
  });
}
