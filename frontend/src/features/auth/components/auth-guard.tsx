'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { useMe } from '@/features/auth/hooks/use-me';
import type { Role } from '@/features/auth/types';

type AuthGuardProps = {
  children: React.ReactNode;
  /** Chỉ cho role này vào (vd "admin"). Bỏ trống: chỉ cần đăng nhập. */
  role?: Role;
};

/**
 * Chặn trang cần đăng nhập ở phía client dựa vào GET /me.
 * Chỉ để giao diện đúng: bảo vệ thật nằm ở backend (@AdminOnly, guard JWT).
 */
export function AuthGuard({ children, role }: AuthGuardProps) {
  const router = useRouter();
  const { data: user, isPending, isError, refetch } = useMe();

  useEffect(() => {
    if (user === null) {
      const next = window.location.pathname + window.location.search;
      router.replace(`/sign-in?next=${encodeURIComponent(next)}`);
    }
  }, [user, router]);

  if (isError) {
    return (
      <GuardMessage title='Không tải được tài khoản'>
        <p>Kiểm tra kết nối mạng rồi thử lại.</p>
        <Button variant='outline' onClick={() => refetch()}>
          Thử lại
        </Button>
      </GuardMessage>
    );
  }

  if (isPending || user === null) {
    return (
      <div
        role='status'
        className='flex flex-1 items-center justify-center p-16'
      >
        <span className='text-sm text-muted-foreground'>Đang tải…</span>
      </div>
    );
  }

  if (role && user.role !== role) {
    return (
      <GuardMessage title='Không có quyền truy cập'>
        <p>Trang này chỉ dành cho quản trị viên.</p>
        <Link
          href='/'
          className='font-medium text-foreground underline underline-offset-4'
        >
          Về trang chủ
        </Link>
      </GuardMessage>
    );
  }

  return children;
}

function GuardMessage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className='flex flex-1 items-center justify-center px-6 py-24'>
      <div className='flex max-w-sm flex-col items-start gap-4 text-sm text-muted-foreground'>
        <h1 className='text-4xl leading-tight text-foreground'>{title}</h1>
        {children}
      </div>
    </div>
  );
}
