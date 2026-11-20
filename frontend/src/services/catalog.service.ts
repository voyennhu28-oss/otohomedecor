import type { PublicCategoryNode } from '@/features/categories/types';
import type { PublicCollection } from '@/features/collections/types';
import type {
  ProductCard,
  ProductDetail,
  ProductFilterOptions,
} from '@/features/products/types';
import type { ProductReviewPage } from '@/features/reviews/types';
import { api } from '@/lib/api-client';
import { toQueryString } from '@/lib/query-string';
import type { Page } from '@/types/api';

const SERVER_TIMEOUT_MS = 8000;

const publicRead = () => ({
  skipAuthRefresh: true,
  signal: AbortSignal.timeout(SERVER_TIMEOUT_MS),
});

export const catalogService = {
  featuredProducts: (limit = 8) =>
    api.get<ProductCard[]>(
      `/products/featured${toQueryString({ limit })}`,
      publicRead(),
    ),

  products: (query: object) =>
    api.get<Page<ProductCard>>(
      `/products${toQueryString(query)}`,
      publicRead(),
    ),

  productFilters: (scope: { category?: string; collection?: string }) =>
    api.get<ProductFilterOptions>(
      `/products/filters${toQueryString(scope)}`,
      publicRead(),
    ),

  categories: () => api.get<PublicCategoryNode[]>('/categories', publicRead()),

  collections: (featured?: boolean) =>
    api.get<PublicCollection[]>(
      `/collections${toQueryString({ featured })}`,
      publicRead(),
    ),

  product: (slug: string) =>
    api.get<ProductDetail>(
      `/products/${encodeURIComponent(slug)}`,
      publicRead(),
    ),

  relatedProducts: (slug: string, limit = 8) =>
    api.get<ProductCard[]>(
      `/products/${encodeURIComponent(slug)}/related${toQueryString({ limit })}`,
      publicRead(),
    ),

  productReviews: (productID: string, itemPerPage: number) =>
    api.get<ProductReviewPage>(
      `/products/${productID}/reviews${toQueryString({ itemPerPage })}`,
      publicRead(),
    ),
};
