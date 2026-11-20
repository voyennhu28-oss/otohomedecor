'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type {
  AdminUserQuery,
  UpdateUserInput,
} from '@/features/admin-users/types';
import { ME_QUERY_KEY } from '@/features/auth/hooks/use-me';
import { userService } from '@/services/user.service';

export const ADMIN_USERS_KEY = ['admin', 'users'] as const;

export function useAdminUsers(query: AdminUserQuery) {
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, 'list', query],
    queryFn: () => userService.adminList(query),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, 'detail', id],
    queryFn: () => userService.adminDetail(id as string),
    enabled: id !== null,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY }),
      queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
    ]);
}

export function useCreateUser() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: userService.create, onSuccess: invalidate });
}

export function useUpdateUser() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateUserInput }) =>
      userService.update(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: userService.remove, onSuccess: invalidate });
}
