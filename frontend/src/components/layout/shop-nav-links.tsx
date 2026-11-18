'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

import { SHOP_NAV } from './nav-items';

type NavListProps = {
  className?: string;
  pathname?: string;
};

export function ShopNavList({ className, pathname }: NavListProps) {
  return (
    <nav aria-label='Menu chính' className={className}>
      {SHOP_NAV.map((item) => {
        const active =
          pathname !== undefined &&
          (pathname === item.href || pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'decoration-1 underline-offset-[6px] outline-none hover:underline focus-visible:underline',
              active && 'underline',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ShopNavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  return <ShopNavList className={className} pathname={pathname} />;
}
