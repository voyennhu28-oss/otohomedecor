import type { Metadata } from 'next';
import { Suspense } from 'react';

import { getProduct } from '@/features/catalog/queries';

import {
  ProductDetailSkeleton,
  ProductDetailView,
} from './_components/product-detail';

type ProductPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProduct(slug);
  if (result.status !== 'found') return { title: 'Sản phẩm' };

  const { product } = result;
  const cover = [...product.images].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )[0];
  const description =
    product.shortDescription ??
    `${product.name}, đèn trang trí ghép tay từ vỏ tự nhiên.`;

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: cover ? [{ url: cover.url, alt: cover.alt ?? product.name }] : [],
    },
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailView params={params} />
    </Suspense>
  );
}
