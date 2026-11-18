import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/layout/admin-page-header';

import { ComingSoon } from '@/app/admin/_components/coming-soon';

// Trang nằm sau AuthGuard (chờ GET /me ở trình duyệt) nên không prerender được: tắt kiểm tra instant navigation.
export const instant = false;

export const metadata: Metadata = { title: 'Thanh toán' };

export default function AdminPaymentsPage() {
  return (
    <>
      <AdminPageHeader
        title='Thanh toán'
        description='Giao dịch chuyển khoản SePay, đối soát giao dịch chưa khớp đơn.'
      />
      <ComingSoon phase='Giai đoạn 2' endpoints={['GET /admin/payments']} />
    </>
  );
}
