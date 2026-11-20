import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DataTableSkeleton } from '@/components/admin/data-table-state';
import { UsersManager } from '@/features/admin-users/components/users-manager';

export const instant = false;

export const metadata: Metadata = { title: 'Tài khoản' };

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<DataTableSkeleton label='Đang tải tài khoản' />}>
      <UsersManager />
    </Suspense>
  );
}
