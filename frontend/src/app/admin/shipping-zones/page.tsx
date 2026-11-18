import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/layout/admin-page-header';

import { ComingSoon } from '@/app/admin/_components/coming-soon';

// Trang nằm sau AuthGuard (chờ GET /me ở trình duyệt) nên không prerender được: tắt kiểm tra instant navigation.
export const instant = false;

export const metadata: Metadata = { title: 'Vùng giao hàng' };

export default function AdminShippingZonesPage() {
  return (
    <>
      <AdminPageHeader
        title='Vùng giao hàng'
        description='Tỉnh giao được và phí vận chuyển theo vùng.'
      />
      <ComingSoon
        phase='Giai đoạn 4'
        endpoints={[
          'GET /admin/shipping-zones',
          'POST /admin/shipping-zones',
          'PATCH /admin/shipping-zones/:id',
          'DELETE /admin/shipping-zones/:id',
        ]}
      />
    </>
  );
}
