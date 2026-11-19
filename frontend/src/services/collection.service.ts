import type {
  Collection,
  CreateCollectionInput,
  UpdateCollectionInput,
} from '@/features/collections/types';
import { api } from '@/lib/api-client';

export const collectionService = {
  adminList: () => api.get<Collection[]>('/admin/collections'),

  create: (body: CreateCollectionInput) =>
    api.post<Collection>('/admin/collections', body),

  update: (id: string, body: UpdateCollectionInput) =>
    api.patch<Collection>(`/admin/collections/${id}`, body),

  remove: (id: string) =>
    api.delete<{ id: string }>(`/admin/collections/${id}`),

  uploadImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<Collection>(`/admin/collections/${id}/image`, form);
  },

  removeImage: (id: string) =>
    api.delete<Collection>(`/admin/collections/${id}/image`),

  addProducts: (id: string, productIDs: string[]) =>
    api.post<{ added: number }>(`/admin/collections/${id}/products`, {
      productIDs,
    }),

  removeProduct: (id: string, productID: string) =>
    api.delete<{ id: string }>(
      `/admin/collections/${id}/products/${productID}`,
    ),
};
