import type { Metadata } from 'next';

// Trang nằm sau AuthGuard (chờ GET /me ở trình duyệt) nên không prerender được: tắt kiểm tra instant navigation.
export const instant = false;

export const metadata: Metadata = { title: 'Chi tiết đơn hàng' };

export default function OrderDetailPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      {/* Trang động: khi làm thật thì đọc params bằng `const { x } = await props.params`. cacheComponents đang bật nên phần đọc params / gọi API phải bọc trong <Suspense> hoặc có loading.tsx */}
      <h1 className='text-5xl font-medium'>Chi tiết đơn hàng</h1>
      <p className='mt-4 text-muted-foreground'>GET /me/orders/:orderNumber.</p>
    </section>
  );
}
