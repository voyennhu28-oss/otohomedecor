'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpdateCategoryInput } from '@/features/categories/types';
import { categoryService } from '@/services/category.service';

export const ADMIN_CATEGORIES_KEY = ['admin', 'categories'] as const;

export function useAdminCategories() {
  return useQuery({
    queryKey: ADMIN_CATEGORIES_KEY,
    queryFn: categoryService.adminTree,
  });
}

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY });
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: categoryService.create,
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCategoryInput }) =>
      categoryService.update(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: categoryService.remove,
    onSuccess: invalidate,
  });
}
