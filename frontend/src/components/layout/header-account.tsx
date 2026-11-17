'use client';

import Link from 'next/link';

import { useLogout } from '@/features/auth/hooks/use-logout';
import { useMe } from '@/features/auth/hooks/use-me';
import { cn } from '@/lib/utils';

const linkClass =
  'underline-offset-4 outline-none hover:underline focus-visible:underline disabled:opacity-50';

type HeaderAccountProps = {
  className?: string;
  /** Gọi sau khi bấm một link (vd để đóng menu mobile). */
  onNavigate?: () => void;
};

/** Phần tài khoản trên header, đổi theo trạng thái đăng nhập (GET /me). */
export function HeaderAccount({ className, onNavigate }: HeaderAccountProps) {
  const { data: user, isPending } = useMe();
  const logout = useLogout();

  // Giữ chỗ khi đang tải để header không nhảy
  if (isPending) return <div aria-hidden className={cn('h-5', className)} />;

  if (!user) {
    return (
      <div className={className}>
        <Link href='/sign-in' onClick={onNavigate} className={linkClass}>
          Đăng nhập
        </Link>
        <Link href='/sign-up' onClick={onNavigate} className={linkClass}>
          Tạo tài khoản
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      {user.role === 'admin' && (
        <Link href='/admin' onClick={onNavigate} className={linkClass}>
          Quản trị
        </Link>
      )}
      <Link href='/account' onClick={onNavigate} className={linkClass}>
        Tài khoản
      </Link>
      <button
        type='button'
        onClick={() => {
          onNavigate?.();
          logout.mutate();
        }}
        disabled={logout.isPending}
        className={cn(linkClass, 'text-left')}
      >
        {logout.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
      </button>
    </div>
  );
}
