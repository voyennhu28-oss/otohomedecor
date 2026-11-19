import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DataTableSkeleton } from '@/components/admin/data-table-state';
import { CollectionsManager } from '@/features/admin-collections/components/collections-manager';

export const instant = false;

export const metadata: Metadata = { title: 'Bộ sưu tập' };

export default function AdminCollectionsPage() {
  return (
    <Suspense fallback={<DataTableSkeleton label='Đang tải bộ sưu tập' />}>
      <CollectionsManager />
    </Suspense>
  );
}
