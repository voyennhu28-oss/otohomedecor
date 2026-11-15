import Link from 'next/link';

const NAV = [
  { href: '/products', label: 'Sản phẩm' },
  { href: '/about', label: 'Giới thiệu' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Liên hệ' },
];

export function SiteHeader() {
  return (
    <header className='sticky top-0 z-40 border-b bg-background/95 backdrop-blur'>
      <div className='container mx-auto grid h-16 grid-cols-3 items-center px-6'>
        <nav className='flex gap-6 text-sm'>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className='hover:underline'>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href='/'
          className='justify-self-center font-heading text-2xl uppercase'
        >
          Oto Home Decor
        </Link>
        <div className='flex gap-6 justify-self-end text-sm'>
          {/* TODO: đổi theo trạng thái đăng nhập (GET /me) + nút giỏ hàng (Sheet) */}
          <Link href='/sign-in' className='hover:underline'>
            Đăng nhập
          </Link>
          <Link href='/account' className='hover:underline'>
            Tài khoản
          </Link>
        </div>
      </div>
    </header>
  );
}
