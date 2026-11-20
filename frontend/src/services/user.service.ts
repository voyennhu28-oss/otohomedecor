import type {
  AdminUserDetail,
  AdminUserQuery,
  CreateUserInput,
  UpdateUserInput,
} from '@/features/admin-users/types';
import type { User } from '@/features/auth/types';
import { api } from '@/lib/api-client';
import { toQueryString } from '@/lib/query-string';
import type { Page } from '@/types/api';

export const userService = {
  getMe: () => api.get<User>('/me'),

  adminList: (query: AdminUserQuery) =>
    api.get<Page<User>>(`/admin/users${toQueryString(query)}`),

  adminDetail: (id: string) => api.get<AdminUserDetail>(`/admin/users/${id}`),

  create: (body: CreateUserInput) => api.post<User>('/admin/users', body),

  update: (id: string, body: UpdateUserInput) =>
    api.patch<User>(`/admin/users/${id}`, body),

  remove: (id: string) => api.delete<{ id: string }>(`/admin/users/${id}`),
};
