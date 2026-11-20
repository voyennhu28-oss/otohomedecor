'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ME_QUERY_KEY, useMe } from '@/features/auth/hooks/use-me';
import type { AddCartItemInput } from '@/features/cart/types';
import { ApiError } from '@/lib/api-client';
import { cartService } from '@/services/cart.service';

export const CART_QUERY_KEY = ['cart'] as const;

type AddToCartInput = AddCartItemInput & { label: string };

export function useAddToCart() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const goSignIn = () => {
    toast.info('Đăng nhập để thêm sản phẩm vào giỏ');
    router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
  };

  const mutation = useMutation({
    mutationFn: ({ variantID, quantity }: AddToCartInput) =>
      cartService.addItem({ variantID, quantity }),
    onSuccess: (cart, { label, quantity = 1 }) => {
      queryClient.setQueryData(CART_QUERY_KEY, cart);
      toast.success('Đã thêm vào giỏ', {
        description: `${label} × ${quantity}`,
      });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        queryClient.setQueryData(ME_QUERY_KEY, null);
        goSignIn();
        return;
      }
      toast.error(error.message);
    },
  });

  const add = (input: AddToCartInput) => {
    if (me === null) {
      goSignIn();
      return;
    }
    mutation.mutate(input);
  };

  return { add, isPending: mutation.isPending };
}
