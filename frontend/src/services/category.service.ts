import type {
  AdminCategoryNode,
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/features/categories/types';
import { api } from '@/lib/api-client';

export const categoryService = {
  adminTree: () => api.get<AdminCategoryNode[]>('/admin/categories'),

  create: (body: CreateCategoryInput) =>
    api.post<Category>('/admin/categories', body),

  update: (id: string, body: UpdateCategoryInput) =>
    api.patch<Category>(`/admin/categories/${id}`, body),

  remove: (id: string) => api.delete<{ id: string }>(`/admin/categories/${id}`),
};
