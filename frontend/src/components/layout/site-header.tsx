import Link from 'next/link';
import { Suspense } from 'react';

import { BrandLogo } from '@/components/brand-logo';

import { HeaderUserMenu } from './header-user-menu';
import { MobileNav } from './mobile-nav';
import { ShopNavLinks, ShopNavList } from './shop-nav-links';

const NAV_CLASS = 'hidden gap-8 text-[15px] md:flex';

export function SiteHeader() {
  return (
    <header className='sticky top-0 z-40 border-b bg-background/95 backdrop-blur'>
      <div className='container mx-auto grid h-16 grid-cols-[1fr_auto] items-center gap-6 px-6 md:h-20 md:grid-cols-3'>
        <Suspense fallback={<ShopNavList className={NAV_CLASS} />}>
          <ShopNavLinks className={NAV_CLASS} />
        </Suspense>
        <Link
          href='/'
          className='order-first outline-none focus-visible:ring-2 focus-visible:ring-ring md:order-0 md:justify-self-center'
        >
          <BrandLogo
            eager
            sizes='(min-width: 768px) 163px, 112px'
            className='h-11 md:h-16'
          />
        </Link>
        <div className='hidden items-center justify-self-end md:flex'>
          <HeaderUserMenu />
        </div>
        <MobileNav className='justify-self-end md:hidden' />
      </div>
    </header>
  );
}
