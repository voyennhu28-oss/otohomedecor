'use client';

import { useQuery } from '@tanstack/react-query';

import type { User } from '@/features/auth/types';
import { ApiError } from '@/lib/api-client';
import { userService } from '@/services/user.service';

export const ME_QUERY_KEY = ['me'] as const;

export function useMe() {
  return useQuery<User | null>({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      try {
        return await userService.getMe();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}
