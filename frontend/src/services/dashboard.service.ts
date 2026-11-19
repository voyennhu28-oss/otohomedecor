import type {
  Dashboard,
  DashboardQuery,
} from '@/features/admin-dashboard/types';
import { api } from '@/lib/api-client';
import { toQueryString } from '@/lib/query-string';

export const dashboardService = {
  get: (query: DashboardQuery) =>
    api.get<Dashboard>(`/admin/dashboard${toQueryString(query)}`),
};
