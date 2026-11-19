import type {
  AdminPaymentListItem,
  AdminPaymentQuery,
} from '@/features/orders/types';
import { api } from '@/lib/api-client';
import { toQueryString } from '@/lib/query-string';
import type { Page } from '@/types/api';

export const paymentService = {
  adminList: (query: AdminPaymentQuery) =>
    api.get<Page<AdminPaymentListItem>>(
      `/admin/payments${toQueryString(query)}`,
    ),
};
