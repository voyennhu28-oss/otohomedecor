'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Toaster } from '@/components/ui/sonner';
import { ME_QUERY_KEY } from '@/features/auth/hooks/use-me';
import { ApiError, setAuthFailureHandler } from '@/lib/api-client';

/** Trang cần đăng nhập: hết phiên thì đưa về /sign-in. Trang công khai chỉ xóa user. */
const PROTECTED_PREFIXES = ['/account', '/admin'];

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            // Lỗi 4xx (sai quyền, không tìm thấy...) thử lại cũng vô ích
            retry: (failureCount, error) =>
              !(
                error instanceof ApiError &&
                error.status >= 400 &&
                error.status < 500
              ) && failureCount < 2,
          },
        },
      }),
  );

  useEffect(() => {
    setAuthFailureHandler(() => {
      queryClient.setQueryData(ME_QUERY_KEY, null);
      const { pathname } = window.location;
      if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
      }
    });
    return () => setAuthFailureHandler(null);
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster theme='light' position='top-center' />
    </QueryClientProvider>
  );
}
