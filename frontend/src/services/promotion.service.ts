import type {
  Promotion,
  PromotionInput,
  PromotionQuery,
  UpdatePromotionInput,
} from '@/features/promotions/types';
import { api } from '@/lib/api-client';
import { toQueryString } from '@/lib/query-string';
import type { Page } from '@/types/api';

export const promotionService = {
  adminList: (query: PromotionQuery) =>
    api.get<Page<Promotion>>(`/admin/promotions${toQueryString(query)}`),

  create: (body: PromotionInput) =>
    api.post<Promotion>('/admin/promotions', body),

  update: (id: string, body: UpdatePromotionInput) =>
    api.patch<Promotion>(`/admin/promotions/${id}`, body),

  remove: (id: string) => api.delete<{ id: string }>(`/admin/promotions/${id}`),
};
