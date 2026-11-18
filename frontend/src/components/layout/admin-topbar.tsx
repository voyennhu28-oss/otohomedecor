'use client';

import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

import { findAdminNavItem } from './admin-nav';

type Crumb = { label: string; href?: string };

// Đoạn đường dẫn con có tên cố định; còn lại (ID, mã đơn...) hiện "Chi tiết"
const SEGMENT_LABELS: Record<string, string> = {
  new: 'Thêm mới',
  edit: 'Chỉnh sửa',
  import: 'Nhập Excel',
};

function buildCrumbs(pathname: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Quản trị', href: '/admin' }];
  const item = findAdminNavItem(pathname);

  if (!item || item.href === '/admin') {
    crumbs.push({ label: 'Bảng điều khiển' });
    return crumbs;
  }

  crumbs.push({ label: item.label, href: item.href });
  const rest = pathname.slice(item.href.length).split('/').filter(Boolean);
  let href = item.href;
  for (const segment of rest) {
    href += `/${segment}`;
    crumbs.push({ label: SEGMENT_LABELS[segment] ?? 'Chi tiết', href });
  }

  // Mục cuối là trang hiện tại, không cần link
  delete crumbs[crumbs.length - 1].href;
  return crumbs;
}

export function AdminTopbar() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <header className='sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6'>
      <SidebarTrigger className='-ml-1 rounded-sm text-muted-foreground' />
      <Separator orientation='vertical' className='my-5' />

      <Breadcrumb className='min-w-0 flex-1'>
        <BreadcrumbList className='flex-nowrap sm:gap-2'>
          {crumbs.map((crumb, index) => (
            <Fragment key={`${index}-${crumb.label}`}>
              {index > 0 && <BreadcrumbSeparator className='hidden sm:block' />}
              <BreadcrumbItem
                // Mobile chỉ hiện trang hiện tại cho khỏi tràn
                className={cn(
                  'min-w-0',
                  index < crumbs.length - 1 && 'hidden sm:inline-flex',
                )}
              >
                {crumb.href ? (
                  <BreadcrumbLink render={<Link href={crumb.href} />}>
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className='truncate font-medium'>
                    {crumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <Link
        href='/'
        target='_blank'
        rel='noopener'
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'rounded-sm',
        )}
      >
        <span className='hidden sm:inline'>Xem cửa hàng</span>
        <span className='sr-only sm:hidden'>Xem cửa hàng (mở tab mới)</span>
        <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.75} />
      </Link>
    </header>
  );
}
