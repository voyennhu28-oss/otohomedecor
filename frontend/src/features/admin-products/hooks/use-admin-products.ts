'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { ADMIN_CATEGORIES_KEY } from '@/features/admin-categories/hooks/use-admin-categories';
import type {
  AdminProductDetail,
  AdminProductQuery,
  ImageItem,
  StockInput,
  UpdateProductInput,
  UpdateVariantInput,
  VariantInput,
} from '@/features/products/types';
import { productService } from '@/services/product.service';

export const ADMIN_PRODUCTS_KEY = ['admin', 'products'] as const;
const listKey = (query: AdminProductQuery) =>
  [...ADMIN_PRODUCTS_KEY, 'list', query] as const;
export const productDetailKey = (id: string) =>
  [...ADMIN_PRODUCTS_KEY, 'detail', id] as const;

export function useAdminProducts(query: AdminProductQuery) {
  return useQuery({
    queryKey: listKey(query),
    queryFn: () => productService.adminList(query),
    placeholderData: keepPreviousData,
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: productDetailKey(id),
    queryFn: () => productService.adminDetail(id),
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return {
    products: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_KEY }),
    productsAndCategories: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_KEY }),
        queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY }),
      ]),
  };
}

export function useCreateProduct() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: productService.create,
    onSuccess: invalidate.productsAndCategories,
  });
}

export function useUpdateProduct() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProductInput }) =>
      productService.update(id, body),
    onSuccess: (_, { body }) =>
      body.categoryID
        ? invalidate.productsAndCategories()
        : invalidate.products(),
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: productService.remove,
    onSuccess: invalidate.productsAndCategories,
  });
}

export function useImportProducts() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: productService.importExcel,
    onSuccess: invalidate.productsAndCategories,
  });
}

export function useExportProducts() {
  return useMutation({ mutationFn: productService.exportExcel });
}

export function useCreateVariant(productID: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: VariantInput) =>
      productService.createVariant(productID, body),
    onSuccess: invalidate.products,
  });
}

export function useUpdateVariant(productID: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      variantID,
      body,
    }: {
      variantID: string;
      body: UpdateVariantInput;
    }) => productService.updateVariant(productID, variantID, body),
    onSuccess: invalidate.products,
  });
}

export function useDeleteVariant(productID: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (variantID: string) =>
      productService.removeVariant(productID, variantID),
    onSuccess: invalidate.products,
  });
}

export function useUpdateStock() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      variantID,
      body,
    }: {
      variantID: string;
      body: StockInput;
    }) => productService.updateStock(variantID, body),
    onSuccess: invalidate.products,
  });
}

function useSetImages(productID: string) {
  const queryClient = useQueryClient();
  return (images: ImageItem[]) => {
    queryClient.setQueryData<AdminProductDetail>(
      productDetailKey(productID),
      (old) => (old ? { ...old, images } : old),
    );
    return queryClient.invalidateQueries({
      queryKey: [...ADMIN_PRODUCTS_KEY, 'list'],
    });
  };
}

export function useUploadImages(productID: string) {
  const setImages = useSetImages(productID);
  return useMutation({
    mutationFn: (files: File[]) =>
      productService.uploadImages(productID, files),
    onSuccess: setImages,
  });
}

export function useDeleteImage(productID: string) {
  const setImages = useSetImages(productID);
  return useMutation({
    mutationFn: (publicID: string) =>
      productService.removeImage(productID, publicID),
    onSuccess: setImages,
  });
}
