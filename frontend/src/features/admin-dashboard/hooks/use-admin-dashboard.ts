'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { DashboardQuery } from '@/features/admin-dashboard/types';
import { dashboardService } from '@/services/dashboard.service';
import { orderService } from '@/services/order.service';

export const ADMIN_DASHBOARD_KEY = ['admin', 'dashboard'] as const;

export function useAdminDashboard(query: DashboardQuery, enabled = true) {
  return useQuery({
    queryKey: [...ADMIN_DASHBOARD_KEY, query],
    queryFn: () => dashboardService.get(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePendingOrderCount() {
  return useQuery({
    queryKey: ['admin', 'orders', 'pending-count'],
    queryFn: () =>
      orderService
        .adminList({ status: 'pending', page: 1, itemPerPage: 1 })
        .then((page) => page.totalItems),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
