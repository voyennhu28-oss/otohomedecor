import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';

import type { ProductDetail } from '@/features/products/types';
import { REVIEW_PAGE_SIZE } from '@/features/reviews/constants';
import { ApiError } from '@/lib/api-client';
import { catalogService } from '@/services/catalog.service';

import { type CatalogQuery, toProductListParams } from './product-query';

export const CATALOG_TAGS = {
  products: 'catalog:products',
  categories: 'catalog:categories',
  collections: 'catalog:collections',
  reviews: 'catalog:reviews',
} as const;

export const productTag = (slug: string) => `catalog:product:${slug}`;

async function fetchFeaturedProducts(limit: number) {
  'use cache';
  cacheTag(CATALOG_TAGS.products);
  try {
    const products = await catalogService.featuredProducts(limit);
    cacheLife('minutes');
    return products;
  } catch {
    cacheLife('seconds');
    return null;
  }
}

async function fetchShowcaseCollections(limit: number) {
  'use cache';
  cacheTag(CATALOG_TAGS.collections);
  try {
    const collections = await catalogService.collections();
    cacheLife('minutes');
    const featured = collections.filter((collection) => collection.isFeatured);
    return (featured.length > 0 ? featured : collections).slice(0, limit);
  } catch {
    cacheLife('seconds');
    return null;
  }
}

async function requestTimeOnFailure<T>(result: Promise<T | null>) {
  const value = await result;
  if (value === null) await connection();
  return value;
}

export const getFeaturedProducts = (limit = 8) =>
  requestTimeOnFailure(fetchFeaturedProducts(limit));

export const getShowcaseCollections = (limit = 4) =>
  requestTimeOnFailure(fetchShowcaseCollections(limit));

export async function getCatalogProducts(query: CatalogQuery) {
  'use cache';
  cacheTag(CATALOG_TAGS.products);
  try {
    const page = await catalogService.products(toProductListParams(query));
    cacheLife('minutes');
    return page;
  } catch {
    cacheLife('seconds');
    return null;
  }
}

export async function getProductFilters(
  category?: string,
  collection?: string,
) {
  'use cache';
  cacheTag(CATALOG_TAGS.products);
  try {
    const filters = await catalogService.productFilters({
      category,
      collection,
    });
    cacheLife('minutes');
    return filters;
  } catch {
    cacheLife('seconds');
    return null;
  }
}

export async function getCategoryTree() {
  'use cache';
  cacheTag(CATALOG_TAGS.categories);
  try {
    const tree = await catalogService.categories();
    cacheLife('minutes');
    return tree;
  } catch {
    cacheLife('seconds');
    return [];
  }
}

export async function getVisibleCollections() {
  'use cache';
  cacheTag(CATALOG_TAGS.collections);
  try {
    const collections = await catalogService.collections();
    cacheLife('minutes');
    return collections;
  } catch {
    cacheLife('seconds');
    return [];
  }
}

export type ProductResult =
  | { status: 'found'; product: ProductDetail }
  | { status: 'missing' }
  | { status: 'error' };

export async function getProduct(slug: string): Promise<ProductResult> {
  'use cache';
  cacheTag(CATALOG_TAGS.products, productTag(slug));
  try {
    const product = await catalogService.product(slug);
    cacheLife('minutes');
    return { status: 'found', product };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      cacheLife('minutes');
      return { status: 'missing' };
    }
    cacheLife('seconds');
    return { status: 'error' };
  }
}

export async function getRelatedProducts(slug: string) {
  'use cache';
  cacheTag(CATALOG_TAGS.products);
  try {
    const products = await catalogService.relatedProducts(slug, 8);
    cacheLife('minutes');
    return products;
  } catch {
    cacheLife('seconds');
    return [];
  }
}

export async function getFirstReviews(productID: string) {
  'use cache';
  cacheTag(CATALOG_TAGS.reviews);
  try {
    const page = await catalogService.productReviews(
      productID,
      REVIEW_PAGE_SIZE,
    );
    cacheLife('minutes');
    return page;
  } catch {
    cacheLife('seconds');
    return null;
  }
}
