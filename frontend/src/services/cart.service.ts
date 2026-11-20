import type { AddCartItemInput, Cart } from '@/features/cart/types';
import { api } from '@/lib/api-client';

export const cartService = {
  get: () => api.get<Cart>('/me/cart'),

  addItem: (input: AddCartItemInput) => api.post<Cart>('/me/cart/items', input),
};
