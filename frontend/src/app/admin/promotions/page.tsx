import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DataTableSkeleton } from '@/components/admin/data-table-state';
import { PromotionsManager } from '@/features/admin-promotions/components/promotions-manager';

export const instant = false;

export const metadata: Metadata = { title: 'Khuyến mãi' };

export default function AdminPromotionsPage() {
  return (
    <Suspense fallback={<DataTableSkeleton label='Đang tải mã giảm giá' />}>
      <PromotionsManager />
    </Suspense>
  );
}
