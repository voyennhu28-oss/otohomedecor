import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/layout/admin-page-header';

import { ComingSoon } from '@/app/admin/_components/coming-soon';

// Trang nằm sau AuthGuard (chờ GET /me ở trình duyệt) nên không prerender được: tắt kiểm tra instant navigation.
export const instant = false;

export const metadata: Metadata = { title: 'Sản phẩm' };

export default function AdminProductsPage() {
  return (
    <>
      <AdminPageHeader
        title='Sản phẩm'
        description='Sản phẩm, biến thể, tồn kho và ảnh.'
      />
      <ComingSoon
        phase='Giai đoạn 1'
        endpoints={[
          'GET /admin/products',
          'POST /admin/products',
          'PATCH /admin/products/:id',
          'DELETE /admin/products/:id',
          '/admin/products/:productID/variants',
          'PATCH /admin/variants/:variantID/stock',
          '/admin/products/:productID/images',
          'POST /admin/products/export | import',
        ]}
      />
    </>
  );
}
