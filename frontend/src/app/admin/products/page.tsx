import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DataTableSkeleton } from '@/components/admin/data-table-state';
import { ProductsManager } from '@/features/admin-products/components/products-manager';

export const instant = false;

export const metadata: Metadata = { title: 'Sản phẩm' };

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<DataTableSkeleton label='Đang tải sản phẩm' />}>
      <ProductsManager />
    </Suspense>
  );
}
