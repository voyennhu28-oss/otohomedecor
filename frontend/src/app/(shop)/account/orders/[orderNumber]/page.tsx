import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Chi tiết đơn hàng' };

export default function OrderDetailPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      {/* Trang động: khi làm thật thì đọc params bằng `const { x } = await props.params`. cacheComponents đang bật nên phần đọc params / gọi API phải bọc trong <Suspense> hoặc có loading.tsx */}
      <h1 className='text-5xl uppercase'>Chi tiết đơn hàng</h1>
      <p className='mt-4 text-muted-foreground'>GET /me/orders/:orderNumber.</p>
    </section>
  );
}
