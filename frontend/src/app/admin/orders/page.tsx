import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DataTableSkeleton } from '@/components/admin/data-table-state';
import { OrdersManager } from '@/features/admin-orders/components/orders-manager';

export const instant = false;

export const metadata: Metadata = { title: 'Đơn hàng' };

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<DataTableSkeleton label='Đang tải đơn hàng' />}>
      <OrdersManager />
    </Suspense>
  );
}
