import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Đơn hàng' };

export default function AdminOrdersPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      <h1 className='text-5xl font-medium'>Đơn hàng</h1>
      <p className='mt-4 text-muted-foreground'>GET /admin/orders.</p>
    </section>
  );
}
