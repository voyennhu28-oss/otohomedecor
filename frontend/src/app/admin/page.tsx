import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DataTableSkeleton } from '@/components/admin/data-table-state';
import { AdminDashboard } from '@/features/admin-dashboard/components/admin-dashboard';

export const instant = false;

export const metadata: Metadata = { title: 'Bảng điều khiển' };

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={<DataTableSkeleton label='Đang tải số liệu' rows={4} />}
    >
      <AdminDashboard />
    </Suspense>
  );
}
