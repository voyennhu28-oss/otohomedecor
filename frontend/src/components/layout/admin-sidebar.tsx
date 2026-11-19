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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { usePendingOrderCount } from '@/features/admin-dashboard/hooks/use-admin-dashboard';

import { ADMIN_NAV, isAdminNavActive } from './admin-nav';
import { AdminUserMenu } from './admin-user-menu';

export function AdminSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { data: pendingOrders } = usePendingOrderCount();

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className='h-16 justify-center border-b border-sidebar-border px-4 group-data-[collapsible=icon]:px-2'>
        <Link
          href='/admin'
          onClick={closeOnMobile}
          className='flex items-center gap-2.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring'
        >
          <BrandLogo
            eager
            sizes='112px'
            className='h-11 group-data-[collapsible=icon]:hidden'
          />
          <span className='rounded-sm bg-sidebar-accent px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground group-data-[collapsible=icon]:hidden'>
            Quản trị
          </span>
          <span className='hidden size-8 items-center justify-center rounded-sm bg-sidebar-accent group-data-[collapsible=icon]:flex'>
            <HugeiconsIcon icon={Store01Icon} strokeWidth={1.75} />
            <span className='sr-only'>Trang quản trị</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className='gap-0 py-3'>
        {ADMIN_NAV.map((group, index) => (
          <SidebarGroup
            key={group.label ?? index}
            className='px-3 py-0 not-first:mt-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:not-first:mt-2'
          >
            {group.label && (
              <SidebarGroupLabel className='mb-1 h-6 px-2.5 text-[11px] font-medium tracking-[0.08em] text-muted-foreground/80 uppercase'>
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className='gap-0.5'>
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
                        className='h-8 gap-2.5 rounded-sm px-2.5 text-sidebar-foreground/85 hover:text-sidebar-foreground data-active:text-sidebar-foreground [&_svg]:text-muted-foreground data-active:[&_svg]:text-sidebar-foreground'
                      >
                        <HugeiconsIcon icon={item.icon} strokeWidth={1.75} />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {item.badge === 'pendingOrders' &&
                        !!pendingOrders &&
                        pendingOrders > 0 && (
                          <SidebarMenuBadge
                            className='top-1.5! rounded-sm bg-secondary text-[11px] text-secondary-foreground'
                            aria-label={`${pendingOrders} đơn chờ xác nhận`}
                          >
                            {pendingOrders > 99 ? '99+' : pendingOrders}
                          </SidebarMenuBadge>
                        )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className='border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-2'>
        <AdminUserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
