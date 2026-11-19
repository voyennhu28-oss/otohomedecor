import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DataTableSkeleton } from '@/components/admin/data-table-state';
import { PaymentsManager } from '@/features/admin-payments/components/payments-manager';

export const instant = false;

export const metadata: Metadata = { title: 'Thanh toán' };

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={<DataTableSkeleton label='Đang tải giao dịch' />}>
      <PaymentsManager />
    </Suspense>
  );
}
