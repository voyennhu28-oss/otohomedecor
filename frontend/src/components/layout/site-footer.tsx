import Link from 'next/link';

import { BrandLogo } from '@/components/brand-logo';

import { SHOP_NAV } from './nav-items';

const ACCOUNT_LINKS = [
  { href: '/account', label: 'Tài khoản' },
  { href: '/account/orders', label: 'Đơn hàng' },
  { href: '/account/wishlist', label: 'Yêu thích' },
] as const;

const linkClass =
  'text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:underline';

export function SiteFooter() {
  return (
    <footer className='border-t'>
      <div className='container mx-auto grid gap-12 px-6 py-16 text-sm md:grid-cols-12'>
        <div className='flex flex-col gap-4 md:col-span-5'>
          <Link
            href='/'
            className='self-start outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            <BrandLogo sizes='203px' className='h-20' />
          </Link>
          <p className='max-w-[36ch] leading-relaxed text-muted-foreground'>
            Đèn trang trí làm từ vỏ sò, ghép tay từng chiếc.
          </p>
        </div>

        <nav
          aria-labelledby='footer-shop'
          className='flex flex-col gap-3 md:col-span-3'
        >
          <h2 id='footer-shop' className='label-caps text-foreground'>
            Cửa hàng
          </h2>
          {SHOP_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>

        <nav
          aria-labelledby='footer-account'
          className='flex flex-col gap-3 md:col-span-3'
        >
          <h2 id='footer-account' className='label-caps text-foreground'>
            Tài khoản
          </h2>
          {ACCOUNT_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className='border-t'>
        <p className='container mx-auto px-6 py-6 text-xs text-muted-foreground'>
          © O The o
        </p>
      </div>
    </footer>
  );
}
