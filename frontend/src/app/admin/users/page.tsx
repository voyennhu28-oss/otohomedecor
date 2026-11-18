import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/layout/admin-page-header';

import { ComingSoon } from '@/app/admin/_components/coming-soon';

export const instant = false;

export const metadata: Metadata = { title: 'Tài khoản' };

export default function AdminUsersPage() {
  return (
    <>
      <AdminPageHeader
        title='Tài khoản'
        description='Khách hàng và quản trị viên.'
      />
      <ComingSoon
        phase='Giai đoạn 5'
        endpoints={[
          'GET /admin/users',
          'GET /admin/users/:id',
          'POST /admin/users',
          'PATCH /admin/users/:id',
          'DELETE /admin/users/:id',
        ]}
      />
    </>
  );
}
