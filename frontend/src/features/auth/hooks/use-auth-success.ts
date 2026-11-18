'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ME_QUERY_KEY } from '@/features/auth/hooks/use-me';
import type { AuthResult } from '@/features/auth/types';

function safeNextPath(): string | null {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

export function useAuthSuccess() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return ({ user }: AuthResult) => {
    queryClient.setQueryData(ME_QUERY_KEY, user);
    const fallback = user.role === 'admin' ? '/admin' : '/account';
    router.replace(safeNextPath() ?? fallback);
  };
}
