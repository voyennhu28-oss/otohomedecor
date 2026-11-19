'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ADMIN_PRODUCTS_KEY } from '@/features/admin-products/hooks/use-admin-products';
import type { UpdateCollectionInput } from '@/features/collections/types';
import { collectionService } from '@/services/collection.service';

export const ADMIN_COLLECTIONS_KEY = ['admin', 'collections'] as const;

export function useAdminCollections() {
  return useQuery({
    queryKey: ADMIN_COLLECTIONS_KEY,
    queryFn: collectionService.adminList,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return {
    collections: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_COLLECTIONS_KEY }),
    products: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_KEY }),
  };
}

export function useCreateCollection() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: collectionService.create,
    onSuccess: invalidate.collections,
  });
}

export function useUpdateCollection() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCollectionInput }) =>
      collectionService.update(id, body),
    onSuccess: invalidate.collections,
  });
}

export function useDeleteCollection() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: collectionService.remove,
    onSuccess: () =>
      Promise.all([invalidate.collections(), invalidate.products()]),
  });
}

export function useUploadCollectionImage() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      collectionService.uploadImage(id, file),
    onSuccess: invalidate.collections,
  });
}

export function useRemoveCollectionImage() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: collectionService.removeImage,
    onSuccess: invalidate.collections,
  });
}

export function useAddCollectionProducts(collectionID: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (productIDs: string[]) =>
      collectionService.addProducts(collectionID, productIDs),
    onSuccess: invalidate.products,
  });
}

export function useRemoveCollectionProduct(collectionID: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (productID: string) =>
      collectionService.removeProduct(collectionID, productID),
    onSuccess: invalidate.products,
  });
}
