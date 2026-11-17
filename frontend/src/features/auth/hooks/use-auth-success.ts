'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ME_QUERY_KEY } from '@/features/auth/hooks/use-me';
import type { AuthResult } from '@/features/auth/types';

/** Chỉ nhận đường dẫn nội bộ ("/account"), chặn "//evil.com" hay "https://...". */
function safeNextPath(): string | null {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

/**
 * Sau khi đăng nhập / đăng ký: lưu user vào cache của `useMe` (cookie đã do backend set),
 * rồi chuyển tới `?next=` nếu có, không thì admin vào /admin, khách vào /account.
 */
export function useAuthSuccess() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return ({ user }: AuthResult) => {
    queryClient.setQueryData(ME_QUERY_KEY, user);
    const fallback = user.role === 'admin' ? '/admin' : '/account';
    router.replace(safeNextPath() ?? fallback);
  };
}
