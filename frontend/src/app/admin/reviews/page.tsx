import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/layout/admin-page-header';

import { ComingSoon } from '@/app/admin/_components/coming-soon';

// Trang nằm sau AuthGuard (chờ GET /me ở trình duyệt) nên không prerender được: tắt kiểm tra instant navigation.
export const instant = false;

export const metadata: Metadata = { title: 'Đánh giá' };

export default function AdminReviewsPage() {
  return (
    <>
      <AdminPageHeader
        title='Đánh giá'
        description='Duyệt, ẩn đánh giá sản phẩm của khách.'
      />
      <ComingSoon
        phase='Giai đoạn 5'
        endpoints={[
          'GET /admin/reviews',
          'PATCH /admin/reviews/:id/status',
          'DELETE /admin/reviews/:id/images/:publicID',
        ]}
      />
    </>
  );
}
