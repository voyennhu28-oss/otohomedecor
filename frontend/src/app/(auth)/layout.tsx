import Link from 'next/link';

import { BrandLogo } from '@/components/brand-logo';
import { LampGlow } from '@/components/lamp-glow';
import { SectionTitle } from '@/components/section-title';

const logoLinkClass =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * Desktop: bên trái là panel tối có quầng đèn (cùng hình ảnh với phần "Lúc tắt và lúc bật"
 * ở trang chủ) và logo ở góc trên; bên phải là form.
 * Mobile: panel ẩn, logo chuyển lên header sáng phía trên form.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='grid flex-1 lg:grid-cols-2'>
      <aside className='relative hidden overflow-hidden bg-foreground text-background lg:flex lg:flex-col lg:justify-between lg:p-10'>
        <LampGlow />
        <Link href='/' className={`relative self-start ${logoLinkClass}`}>
          <BrandLogo eager sizes='203px' className='h-20' />
        </Link>
        <SectionTitle
          as='h2'
          serif='Đèn trang trí'
          caps='làm từ vỏ sò'
          stacked
          className='relative md:text-6xl xl:text-7xl'
        />
      </aside>

      <div className='flex flex-col'>
        <header className='flex h-16 items-center justify-between px-6 md:h-20 lg:justify-end lg:px-10'>
          <Link href='/' className={`lg:hidden ${logoLinkClass}`}>
            <BrandLogo sizes='163px' className='h-11 md:h-16' />
          </Link>
          <Link
            href='/'
            className='text-sm underline-offset-4 outline-none hover:underline focus-visible:underline'
          >
            Về trang chủ
          </Link>
        </header>
        <main className='flex flex-1 justify-center px-6 pt-10 pb-20 sm:items-center sm:pt-0'>
          <div className='w-full max-w-sm'>{children}</div>
        </main>
      </div>
    </div>
  );
}
