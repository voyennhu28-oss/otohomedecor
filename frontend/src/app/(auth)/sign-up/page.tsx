import type { Metadata } from 'next';
import Link from 'next/link';

import { SignUpForm } from '@/features/auth/components/sign-up-form';

export const metadata: Metadata = { title: 'Tạo tài khoản' };

export default function SignUpPage() {
  return (
    <>
      <h1 className='text-5xl leading-none uppercase'>Tạo tài khoản</h1>
      <p className='mt-4 text-sm text-muted-foreground'>
        Đã có tài khoản?{' '}
        <Link
          href='/sign-in'
          className='font-medium text-foreground underline underline-offset-4'
        >
          Đăng nhập
        </Link>
      </p>
      <div className='mt-10'>
        <SignUpForm />
      </div>
    </>
  );
}
