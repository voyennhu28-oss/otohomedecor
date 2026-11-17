import type { Metadata } from 'next';
import Link from 'next/link';

import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';

export const metadata: Metadata = { title: 'Quên mật khẩu' };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className='text-5xl leading-tight font-medium'>Quên mật khẩu</h1>
      <p className='mt-4 text-sm leading-relaxed text-muted-foreground'>
        Nhập email đã đăng ký, cửa hàng sẽ gửi link để bạn đặt mật khẩu mới.
      </p>
      <div className='mt-10'>
        <ForgotPasswordForm />
      </div>
      <p className='mt-8 text-sm text-muted-foreground'>
        Nhớ ra rồi?{' '}
        <Link
          href='/sign-in'
          className='font-medium text-foreground underline underline-offset-4'
        >
          Đăng nhập
        </Link>
      </p>
    </>
  );
}
