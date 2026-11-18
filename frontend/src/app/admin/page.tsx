import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/layout/admin-page-header';

import { ComingSoon } from '@/app/admin/_components/coming-soon';

export const instant = false;

export const metadata: Metadata = { title: 'Bảng điều khiển' };

export default function AdminDashboardPage() {
  return (
    <>
      <AdminPageHeader
        title='Bảng điều khiển'
        description='Doanh thu, đơn hàng và việc cần xử lý.'
      />
      <ComingSoon phase='Giai đoạn 3' endpoints={['GET /admin/dashboard']} />
    </>
  );
}
