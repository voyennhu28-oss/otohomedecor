'use client';

import {
  ArrowDown01Icon,
  DashboardSquare01Icon,
  Logout01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getGivenName,
  UserAvatar,
} from '@/features/auth/components/user-avatar';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { useMe } from '@/features/auth/hooks/use-me';
import { cn } from '@/lib/utils';

import { ACCOUNT_NAV } from './nav-items';

const itemClass = 'rounded-sm py-2.5';

export function HeaderUserMenu({ className }: { className?: string }) {
  const { data: user, isPending } = useMe();
  const logout = useLogout();

  if (isPending) {
    return <div aria-hidden className={cn('h-9 w-28', className)} />;
  }

  if (!user) {
    return (
      <Link
        href='/sign-in'
        className={cn(
          'flex items-center gap-2 text-[15px] underline-offset-4 outline-none hover:underline focus-visible:underline',
          className,
        )}
      >
        <HugeiconsIcon icon={UserIcon} size={20} strokeWidth={1.5} />
        Đăng nhập
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'group/account flex items-center gap-2.5 rounded-sm py-1 pr-1 pl-1 text-[15px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-muted',
          className,
        )}
      >
        <UserAvatar user={user} />
        <span className='max-w-32 truncate'>{getGivenName(user.fullName)}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={16}
          strokeWidth={1.75}
          className='text-muted-foreground transition-transform group-data-popup-open/account:rotate-180'
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align='end'
        sideOffset={10}
        className='w-64 rounded-sm p-1.5'
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className='flex items-center gap-3 px-2.5 py-2.5'>
            <UserAvatar user={user} className='size-10' />
            <span className='grid min-w-0 flex-1 leading-snug'>
              <span className='truncate text-sm font-medium text-foreground'>
                {user.fullName}
              </span>
              <span className='truncate text-xs text-muted-foreground'>
                {user.email}
              </span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {ACCOUNT_NAV.map((item) => (
            <DropdownMenuItem
              key={item.href}
              className={itemClass}
              render={<Link href={item.href} />}
            >
              <HugeiconsIcon icon={item.icon} strokeWidth={1.5} />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        {user.role === 'admin' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={itemClass}
              render={<Link href='/admin' />}
            >
              <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={1.5} />
              Trang quản trị
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={itemClass}
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.5} />
          {logout.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
