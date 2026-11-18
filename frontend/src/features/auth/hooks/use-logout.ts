'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ME_QUERY_KEY } from '@/features/auth/hooks/use-me';
import { authService } from '@/services/auth.service';

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.setQueryData(ME_QUERY_KEY, null);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== ME_QUERY_KEY[0],
      });
      toast.success('Đã đăng xuất');
      router.replace('/');
    },
    onError: (error) => toast.error(error.message),
  });
}
