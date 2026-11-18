'use client';

import { Store01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BrandLogo } from '@/components/brand-logo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';

import { ADMIN_NAV, isAdminNavActive } from './admin-nav';
import { AdminUserMenu } from './admin-user-menu';

export function AdminSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  // Mobile: sidebar là Sheet, bấm link xong thì đóng lại
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className='h-16 justify-center border-b border-sidebar-border px-3 group-data-[collapsible=icon]:px-2'>
        <Link
          href='/admin'
          onClick={closeOnMobile}
          className='flex items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring'
        >
          <BrandLogo
            eager
            sizes='92px'
            className='h-9 group-data-[collapsible=icon]:hidden'
          />
          <span className='border-l border-sidebar-border pl-3 label-caps text-[0.625rem] text-muted-foreground group-data-[collapsible=icon]:hidden'>
            Quản trị
          </span>
          {/* Thu gọn: không đủ chỗ cho logo, chỉ hiện icon */}
          <span className='hidden size-8 items-center justify-center rounded-sm bg-sidebar-accent group-data-[collapsible=icon]:flex'>
            <HugeiconsIcon icon={Store01Icon} strokeWidth={1.75} />
            <span className='sr-only'>Trang quản trị</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className='py-2'>
        {ADMIN_NAV.map((group) => (
          <SidebarGroup key={group.label} className='py-1'>
            <SidebarGroupLabel className='h-7 label-caps text-[0.625rem] text-muted-foreground'>
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isAdminNavActive(item.href, pathname);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        render={
                          <Link
                            href={item.href}
                            onClick={closeOnMobile}
                            aria-current={active ? 'page' : undefined}
                          />
                        }
                        className='relative text-muted-foreground hover:text-sidebar-accent-foreground data-active:text-sidebar-accent-foreground data-active:before:absolute data-active:before:inset-y-2 data-active:before:left-0 data-active:before:w-0.5 data-active:before:rounded-full data-active:before:bg-sidebar-primary group-data-[collapsible=icon]:data-active:before:hidden'
                      >
                        <HugeiconsIcon icon={item.icon} strokeWidth={1.75} />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator className='mx-0' />
      <SidebarFooter>
        <AdminUserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
