import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Đăng nhập' };

export default function SignInPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      <h1 className='text-5xl uppercase'>Đăng nhập</h1>
      <p className='mt-4 text-muted-foreground'>POST /auth/sign-in.</p>
    </section>
  );
}
