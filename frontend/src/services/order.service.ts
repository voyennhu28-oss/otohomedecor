import type { OrderStatus } from '@/constants/orders';
import type {
  AdminOrderDetail,
  AdminOrderFilter,
  AdminOrderListItem,
  AdminOrderQuery,
  Order,
} from '@/features/orders/types';
import { api } from '@/lib/api-client';
import { toQueryString } from '@/lib/query-string';
import type { Page } from '@/types/api';

export const orderService = {
  adminList: (query: AdminOrderQuery) =>
    api.get<Page<AdminOrderListItem>>(`/admin/orders${toQueryString(query)}`),

  adminDetail: (id: string) => api.get<AdminOrderDetail>(`/admin/orders/${id}`),

  updateStatus: (id: string, body: { status: OrderStatus; note?: string }) =>
    api.patch<Order>(`/admin/orders/${id}/status`, body),

  markPaid: (id: string, body: { note?: string }) =>
    api.post<Order>(`/admin/orders/${id}/mark-paid`, body),

  exportExcel: (filter: AdminOrderFilter) =>
    api.download('/admin/orders/export', filter),
};
