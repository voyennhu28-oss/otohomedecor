import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';

export const metadata: Metadata = { title: 'Đặt lại mật khẩu' };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className='text-5xl leading-tight font-medium'>Đặt lại mật khẩu</h1>
      <p className='mt-4 text-sm leading-relaxed text-muted-foreground'>
        Đặt mật khẩu mới cho tài khoản. Sau khi lưu, mọi thiết bị đang đăng nhập
        sẽ phải đăng nhập lại.
      </p>
      <div className='mt-10'>
        <Suspense
          fallback={<p className='text-sm text-muted-foreground'>Đang tải…</p>}
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </>
  );
}
