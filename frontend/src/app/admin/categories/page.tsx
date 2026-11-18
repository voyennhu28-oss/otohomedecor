import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/layout/admin-page-header';

import { ComingSoon } from '@/app/admin/_components/coming-soon';

export const metadata: Metadata = { title: 'Danh mục' };

export default function AdminCategoriesPage() {
  return (
    <>
      <AdminPageHeader
        title='Danh mục'
        description='Cây danh mục sản phẩm hiển thị ở cửa hàng.'
      />
      <ComingSoon
        phase='Giai đoạn 1'
        endpoints={[
          'GET /admin/categories',
          'POST /admin/categories',
          'PATCH /admin/categories/:id',
          'DELETE /admin/categories/:id',
        ]}
      />
    </>
  );
}
