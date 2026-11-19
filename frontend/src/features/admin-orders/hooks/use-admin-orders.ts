'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type { OrderStatus } from '@/constants/orders';
import type {
  AdminOrderQuery,
  AdminPaymentQuery,
} from '@/features/orders/types';
import { orderService } from '@/services/order.service';
import { paymentService } from '@/services/payment.service';

export const ADMIN_ORDERS_KEY = ['admin', 'orders'] as const;
export const ADMIN_PAYMENTS_KEY = ['admin', 'payments'] as const;

export const orderDetailKey = (id: string) =>
  [...ADMIN_ORDERS_KEY, 'detail', id] as const;

export function useAdminOrders(query: AdminOrderQuery) {
  return useQuery({
    queryKey: [...ADMIN_ORDERS_KEY, 'list', query],
    queryFn: () => orderService.adminList(query),
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: orderDetailKey(id),
    queryFn: () => orderService.adminDetail(id),
  });
}

export function useAdminPayments(query: AdminPaymentQuery) {
  return useQuery({
    queryKey: [...ADMIN_PAYMENTS_KEY, 'list', query],
    queryFn: () => paymentService.adminList(query),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateOrders() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEY }),
      queryClient.invalidateQueries({ queryKey: ADMIN_PAYMENTS_KEY }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
    ]);
}

export function useUpdateOrderStatus() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: OrderStatus;
      note?: string;
    }) => orderService.updateStatus(id, { status, note }),
    onSuccess: invalidate,
  });
}

export function useMarkOrderPaid() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      orderService.markPaid(id, note ? { note } : {}),
    onSuccess: invalidate,
  });
}

export function useExportOrders() {
  return useMutation({ mutationFn: orderService.exportExcel });
}
