'use client';

import { useQuery } from '@tanstack/react-query';

import type { User } from '@/features/auth/types';
import { ApiError } from '@/lib/api-client';
import { userService } from '@/services/user.service';

export const ME_QUERY_KEY = ['me'] as const;

/**
 * Người đang đăng nhập. `data` là `null` khi chưa đăng nhập (401),
 * `undefined` khi đang tải.
 */
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
    // Không thử lại: header đang chờ kết quả này để hiện "Đăng nhập" / "Tài khoản".
    // Thử lại khi backend không phản hồi làm header trống thêm vài giây (1s + 2s).
    // Lỗi thì header coi như chưa đăng nhập; React Query tự hỏi lại khi có mạng
    // lại hoặc khi người dùng quay lại tab.
    retry: false,
  });
}
