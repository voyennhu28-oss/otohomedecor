import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/layout/admin-page-header';

import { ComingSoon } from '@/app/admin/_components/coming-soon';

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
