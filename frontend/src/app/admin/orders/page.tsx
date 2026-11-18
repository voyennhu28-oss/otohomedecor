import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/layout/admin-page-header';

import { ComingSoon } from '@/app/admin/_components/coming-soon';

export const instant = false;

export const metadata: Metadata = { title: 'Đơn hàng' };

export default function AdminOrdersPage() {
  return (
    <>
      <AdminPageHeader
        title='Đơn hàng'
        description='Xác nhận, giao hàng và theo dõi trạng thái đơn.'
      />
      <ComingSoon
        phase='Giai đoạn 2'
        endpoints={[
          'GET /admin/orders',
          'GET /admin/orders/:id',
          'PATCH /admin/orders/:id/status',
          'POST /admin/orders/:id/mark-paid',
          'POST /admin/orders/export',
        ]}
      />
    </>
  );
}
