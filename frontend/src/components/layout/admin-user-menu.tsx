'use client';

import {
  ArrowUpRight01Icon,
  Logout01Icon,
  UnfoldMoreIcon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { useLogout } from '@/features/auth/hooks/use-logout';
import { useMe } from '@/features/auth/hooks/use-me';

/** "Nguyễn Văn An" → "NA" */
function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Tài khoản admin ở chân sidebar: tên, email, đăng xuất. */
export function AdminUserMenu() {
  const { data: user } = useMe();
  const logout = useLogout();
  const { isMobile, state } = useSidebar();

  // Layout admin nằm trong AuthGuard nên lúc này user luôn có
  if (!user) return null;

  const avatar = (
    <Avatar className='size-8 rounded-sm after:rounded-sm'>
      {user.avatarUrl && (
        <AvatarImage
          src={user.avatarUrl}
          alt={user.fullName}
          className='rounded-sm'
        />
      )}
      <AvatarFallback className='rounded-sm bg-secondary text-xs font-medium text-secondary-foreground'>
        {initials(user.fullName)}
      </AvatarFallback>
    </Avatar>
  );

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
