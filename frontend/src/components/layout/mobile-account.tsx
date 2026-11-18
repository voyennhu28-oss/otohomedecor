'use client';

import {
  DashboardSquare01Icon,
  Logout01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { UserAvatar } from '@/features/auth/components/user-avatar';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { useMe } from '@/features/auth/hooks/use-me';
import { cn } from '@/lib/utils';

import { ACCOUNT_NAV } from './nav-items';

const rowClass =
  'flex items-center gap-3 py-2.5 text-[15px] outline-none focus-visible:underline disabled:opacity-50';

export function MobileAccount({ onNavigate }: { onNavigate: () => void }) {
  const { data: user, isPending } = useMe();
  const logout = useLogout();

  if (isPending) return <div aria-hidden className='h-24' />;

  if (!user) {
    return (
      <div className='grid grid-cols-2 gap-3'>
        <Link
          href='/sign-in'
          onClick={onNavigate}
          className={cn(buttonVariants({ size: 'lg' }), 'h-12 rounded-sm')}
        >
          Đăng nhập
        </Link>
        <Link
          href='/sign-up'
          onClick={onNavigate}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'h-12 rounded-sm',
          )}
        >
          Tạo tài khoản
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className='flex items-center gap-3 pb-4'>
        <UserAvatar user={user} className='size-10' />
        <div className='grid min-w-0 leading-snug'>
          <span className='truncate font-medium'>{user.fullName}</span>
          <span className='truncate text-sm text-muted-foreground'>
            {user.email}
          </span>
        </div>
      </div>
      <nav aria-label='Tài khoản' className='flex flex-col border-t pt-2'>
        {ACCOUNT_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={rowClass}
          >
            <HugeiconsIcon
              icon={item.icon}
              size={20}
              strokeWidth={1.5}
              className='text-muted-foreground'
            />
            {item.label}
          </Link>
        ))}
        {user.role === 'admin' && (
          <Link href='/admin' onClick={onNavigate} className={rowClass}>
            <HugeiconsIcon
              icon={DashboardSquare01Icon}
              size={20}
              strokeWidth={1.5}
              className='text-muted-foreground'
            />
            Trang quản trị
          </Link>
        )}
        <button
          type='button'
          disabled={logout.isPending}
          onClick={() => {
            onNavigate();
            logout.mutate();
          }}
          className={cn(rowClass, 'text-left')}
        >
          <HugeiconsIcon
            icon={Logout01Icon}
            size={20}
            strokeWidth={1.5}
            className='text-muted-foreground'
          />
          {logout.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
        </button>
      </nav>
    </div>
  );
}
