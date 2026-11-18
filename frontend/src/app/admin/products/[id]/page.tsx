import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DataTableSkeleton } from '@/components/admin/data-table-state';
import { ProductEditor } from '@/features/admin-products/components/product-editor';

export const instant = false;

export const metadata: Metadata = { title: 'Sửa sản phẩm' };

export default function AdminProductDetailPage() {
  return (
    <Suspense
      fallback={<DataTableSkeleton label='Đang tải sản phẩm' rows={4} />}
    >
      <ProductEditor />
    </Suspense>
  );
}
