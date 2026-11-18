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
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { findAdminNavEntry } from './admin-nav';

type Crumb = { label: string; href?: string };

const SEGMENT_LABELS: Record<string, string> = {
  new: 'Thêm mới',
  edit: 'Chỉnh sửa',
  import: 'Nhập Excel',
};

function buildCrumbs(pathname: string): Crumb[] {
  const entry = findAdminNavEntry(pathname);
  if (!entry) return [{ label: 'Bảng điều khiển' }];

  const { item, group } = entry;
  const crumbs: Crumb[] = [];
  if (group.label) crumbs.push({ label: group.label });
  crumbs.push({ label: item.label, href: item.href });

  let href = item.href;
  for (const segment of pathname
    .slice(item.href.length)
    .split('/')
    .filter(Boolean)) {
    href += `/${segment}`;
    crumbs.push({ label: SEGMENT_LABELS[segment] ?? 'Chi tiết', href });
  }

  delete crumbs[crumbs.length - 1].href;
  return crumbs;
}

export function AdminTopbar() {
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();
  const crumbs = buildCrumbs(pathname);
  const toggleLabel = isMobile
    ? 'Mở menu'
    : state === 'expanded'
      ? 'Thu gọn menu'
      : 'Mở rộng menu';

  return (
    <header className='sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6'>
      <Tooltip>
        <TooltipTrigger
          render={
            <SidebarTrigger className='-ml-1.5 rounded-sm text-muted-foreground hover:text-foreground' />
          }
        />
        <TooltipContent side='bottom' className='rounded-sm'>
          {toggleLabel}
          {!isMobile && <span className='opacity-60'>Ctrl+B</span>}
        </TooltipContent>
      </Tooltip>
      <Separator orientation='vertical' className='my-5' />

      <Breadcrumb className='min-w-0 flex-1'>
        <BreadcrumbList className='flex-nowrap sm:gap-2'>
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <Fragment key={`${index}-${crumb.label}`}>
                {index > 0 && (
                  <BreadcrumbSeparator className='hidden sm:block' />
                )}
                <BreadcrumbItem
                  className={cn('min-w-0', !isLast && 'hidden sm:inline-flex')}
                >
                  {crumb.href ? (
                    <BreadcrumbLink render={<Link href={crumb.href} />}>
                      {crumb.label}
                    </BreadcrumbLink>
                  ) : isLast ? (
                    <BreadcrumbPage className='truncate font-medium'>
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <Link
        href='/'
        target='_blank'
        rel='noopener'
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'rounded-sm text-muted-foreground',
        )}
      >
        <span className='sr-only sm:not-sr-only'>Xem cửa hàng</span>
        <span className='sr-only'> (mở tab mới)</span>
        <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.75} />
      </Link>
    </header>
  );
}
