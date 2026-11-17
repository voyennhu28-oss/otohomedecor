import Link from 'next/link';

import { BrandLogo } from '@/components/brand-logo';

import { HeaderAccount } from './header-account';
import { MobileNav } from './mobile-nav';
import { SHOP_NAV } from './nav-items';

// TODO: nút giỏ hàng (CartSheet)
export function SiteHeader() {
  return (
    <header className='sticky top-0 z-40 border-b bg-background/95 backdrop-blur'>
      <div className='container mx-auto grid h-16 grid-cols-[1fr_auto] items-center gap-6 px-6 md:h-20 md:grid-cols-3'>
        <nav className='hidden gap-8 text-[15px] md:flex'>
          {SHOP_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className='underline-offset-4 outline-none hover:underline focus-visible:underline'
            >
              {item.label}
            </Link>
          ))}
        </nav>
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
        <HeaderAccount className='hidden gap-8 justify-self-end text-[15px] md:flex' />
        <MobileNav className='justify-self-end md:hidden' />
      </div>
    </header>
  );
}
