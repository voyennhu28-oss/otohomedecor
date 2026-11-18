import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DataTableSkeleton } from '@/components/admin/data-table-state';
import { CategoriesManager } from '@/features/admin-categories/components/categories-manager';

export const instant = false;

export const metadata: Metadata = { title: 'Danh mục' };

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<DataTableSkeleton label='Đang tải danh mục' />}>
      <CategoriesManager />
    </Suspense>
  );
}
