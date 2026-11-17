import type { Metadata } from 'next';
import Link from 'next/link';

import { SignInForm } from '@/features/auth/components/sign-in-form';

export const metadata: Metadata = { title: 'Đăng nhập' };

export default function SignInPage() {
  return (
    <>
      <h1 className='text-5xl leading-tight font-medium'>Đăng nhập</h1>
      <p className='mt-4 text-sm text-muted-foreground'>
        Chưa có tài khoản?{' '}
        <Link
          href='/sign-up'
          className='font-medium text-foreground underline underline-offset-4'
        >
          Tạo tài khoản
        </Link>
      </p>
      <div className='mt-10'>
        <SignInForm />
      </div>
    </>
  );
}
