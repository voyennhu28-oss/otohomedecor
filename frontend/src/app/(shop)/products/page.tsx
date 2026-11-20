import type { Metadata } from 'next';
import { Suspense } from 'react';

import type { CatalogSearchParams } from '@/features/catalog/product-query';

import { Catalog } from './_components/catalog';
import { CatalogSkeleton } from './_components/catalog-skeleton';

export const metadata: Metadata = {
  title: 'Sản phẩm',
  description:
    'Đèn trang trí ghép tay từ vỏ sò, vỏ điệp, xà cừ. Lọc theo chất liệu, không gian, phong cách và khoảng giá.',
};

export default function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <Catalog searchParams={searchParams} />
    </Suspense>
  );
}
