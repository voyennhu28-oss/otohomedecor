import type { Metadata } from 'next';

export const instant = false;

export const metadata: Metadata = { title: 'Đơn hàng của tôi' };

export default function OrdersPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      <h1 className='text-5xl font-medium'>Đơn hàng của tôi</h1>
      <p className='mt-4 text-muted-foreground'>GET /me/orders.</p>
    </section>
  );
}
