import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/layout/admin-page-header';

import { ComingSoon } from '@/app/admin/_components/coming-soon';

export const instant = false;

export const metadata: Metadata = { title: 'Khuyến mãi' };

export default function AdminPromotionsPage() {
  return (
    <>
      <AdminPageHeader
        title='Khuyến mãi'
        description='Mã giảm giá áp dụng khi thanh toán.'
      />
      <ComingSoon
        phase='Giai đoạn 4'
        endpoints={[
          'GET /admin/promotions',
          'POST /admin/promotions',
          'PATCH /admin/promotions/:id',
          'DELETE /admin/promotions/:id',
        ]}
      />
    </>
  );
}
