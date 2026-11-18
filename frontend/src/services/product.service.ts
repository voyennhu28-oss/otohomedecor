import type {
  AdminProductDetail,
  AdminProductListItem,
  AdminProductQuery,
  CreateProductInput,
  ImageItem,
  Product,
  ProductImportResult,
  ProductVariant,
  StockInput,
  UpdateProductInput,
  UpdateVariantInput,
  VariantInput,
} from '@/features/products/types';
import { api } from '@/lib/api-client';
import type { Page } from '@/types/api';

function toQueryString(query: AdminProductQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export const productService = {
  adminList: (query: AdminProductQuery) =>
    api.get<Page<AdminProductListItem>>(
      `/admin/products${toQueryString(query)}`,
    ),

  adminDetail: (id: string) =>
    api.get<AdminProductDetail>(`/admin/products/${id}`),

  create: (body: CreateProductInput) =>
    api.post<Product & { variants: ProductVariant[] }>('/admin/products', body),

  update: (id: string, body: UpdateProductInput) =>
    api.patch<Product>(`/admin/products/${id}`, body),

  remove: (id: string) => api.delete<{ id: string }>(`/admin/products/${id}`),

  exportExcel: (ids?: string[]) =>
    api.download('/admin/products/export', ids?.length ? { ids } : undefined),

  importExcel: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ProductImportResult>('/admin/products/import', form);
  },

  createVariant: (productID: string, body: VariantInput) =>
    api.post<ProductVariant>(`/admin/products/${productID}/variants`, body),

  updateVariant: (
    productID: string,
    variantID: string,
    body: UpdateVariantInput,
  ) =>
    api.patch<ProductVariant>(
      `/admin/products/${productID}/variants/${variantID}`,
      body,
    ),

  removeVariant: (productID: string, variantID: string) =>
    api.delete<{ id: string }>(
      `/admin/products/${productID}/variants/${variantID}`,
    ),

  updateStock: (variantID: string, body: StockInput) =>
    api.patch<{ id: string; sku: string; stock: number }>(
      `/admin/variants/${variantID}/stock`,
      body,
    ),

  uploadImages: (productID: string, files: File[]) => {
    const form = new FormData();
    for (const file of files) form.append('files', file);
    return api.post<ImageItem[]>(`/admin/products/${productID}/images`, form);
  },

  removeImage: (productID: string, publicID: string) =>
    api.delete<ImageItem[]>(
      `/admin/products/${productID}/images/${encodeURIComponent(publicID)}`,
    ),
};
