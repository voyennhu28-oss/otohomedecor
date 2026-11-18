'use client';

import {
  ArrowUpRight01Icon,
  Logout01Icon,
  UnfoldMoreIcon,
  UserCircleIcon,
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { UserAvatar } from '@/features/auth/components/user-avatar';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { useMe } from '@/features/auth/hooks/use-me';

export function AdminUserMenu() {
  const { data: user } = useMe();
  const logout = useLogout();
  const { isMobile, state } = useSidebar();

  if (!user) return null;

  const avatar = <UserAvatar user={user} shape='square' />;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size='lg'
                className='h-12 gap-3 px-2 data-popup-open:bg-sidebar-accent'
              />
            }
          >
            {avatar}
            <span className='grid flex-1 text-left leading-tight'>
              <span className='truncate text-sm font-medium'>
                {user.fullName}
              </span>
              <span className='truncate text-xs text-muted-foreground'>
                {user.email}
              </span>
            </span>
            <HugeiconsIcon
              icon={UnfoldMoreIcon}
              strokeWidth={1.75}
              className='ml-auto text-muted-foreground'
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? 'top' : state === 'collapsed' ? 'right' : 'top'}
            align={isMobile || state !== 'collapsed' ? 'start' : 'end'}
            sideOffset={8}
            className='w-(--anchor-width) min-w-60 rounded-sm'
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className='flex items-center gap-3 px-2 py-2 text-foreground'>
                {avatar}
                <span className='grid min-w-0 flex-1 leading-tight'>
                  <span className='truncate text-sm font-medium'>
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
              <DropdownMenuItem
                className='rounded-sm'
                render={<Link href='/account' />}
              >
                <HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.75} />
                Tài khoản của tôi
              </DropdownMenuItem>
              <DropdownMenuItem
                className='rounded-sm'
                render={<Link href='/' />}
              >
                <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.75} />
                Xem cửa hàng
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant='destructive'
              className='rounded-sm'
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.75} />
              {logout.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
