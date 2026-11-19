import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DataTableSkeleton } from '@/components/admin/data-table-state';
import { OrderDetail } from '@/features/admin-orders/components/order-detail';

export const instant = false;

export const metadata: Metadata = { title: 'Chi tiết đơn hàng' };

export default function AdminOrderDetailPage() {
  return (
    <Suspense
      fallback={<DataTableSkeleton label='Đang tải đơn hàng' rows={4} />}
    >
      <OrderDetail />
    </Suspense>
  );
}
