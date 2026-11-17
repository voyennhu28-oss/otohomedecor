import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tổng quan' };

export default function AdminDashboardPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      <h1 className='text-5xl font-medium'>Tổng quan</h1>
      <p className='mt-4 text-muted-foreground'>GET /admin/dashboard.</p>
    </section>
  );
}
