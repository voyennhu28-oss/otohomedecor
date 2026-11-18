import type { Metadata } from 'next';

export const instant = false;

export const metadata: Metadata = { title: 'Tài khoản' };

export default function AccountPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      <h1 className='text-5xl font-medium'>Tài khoản</h1>
      <p className='mt-4 text-muted-foreground'>GET /me, PATCH /me.</p>
    </section>
  );
}
