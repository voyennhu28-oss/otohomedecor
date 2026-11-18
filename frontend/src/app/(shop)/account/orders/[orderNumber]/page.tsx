import type { Metadata } from 'next';

export const instant = false;

export const metadata: Metadata = { title: 'Chi tiết đơn hàng' };

export default function OrderDetailPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      <h1 className='text-5xl font-medium'>Chi tiết đơn hàng</h1>
      <p className='mt-4 text-muted-foreground'>GET /me/orders/:orderNumber.</p>
    </section>
  );
}
