import type { Metadata } from 'next';
import Image from 'next/image';
import { Suspense } from 'react';

import { SectionTitle } from '@/components/section-title';

import { ArrowLink } from './_components/arrow-link';
import { CtaLink } from './_components/cta-link';
import {
  CollectionsSection,
  CollectionsSkeleton,
  FeaturedProducts,
  FeaturedProductsSkeleton,
} from './_components/home-sections';
import { ImagePlaceholder } from '@/components/image-placeholder';
import { LampSwitch } from './_components/lamp-switch';
import { Marquee } from './_components/marquee';
import { MAKING_STEPS } from './_components/making-steps';

export const metadata: Metadata = {
  title: 'Đèn trang trí làm từ vỏ sò',
  description:
    'Đèn trang trí ghép tay từ vỏ sò thật. Khi bật, ánh sáng đi qua lớp vỏ mỏng và hiện rõ từng đường vân.',
};

const SHELLS = [
  { name: 'Sò điệp', photo: 'Ảnh cận: vỏ sò điệp xếp lớp' },
  { name: 'Vỏ ốc', photo: 'Ảnh cận: vỏ ốc xoắn dưới ánh đèn' },
  { name: 'Xà cừ', photo: 'Ảnh cận: mảnh xà cừ ánh cầu vồng' },
];

const rise = (delay: number) => ({ animationDelay: `${delay}ms` });

export default function HomePage() {
  return (
    <>
      <section className='grid lg:grid-cols-[3fr_2fr] lg:items-center'>
        <div className='overflow-hidden'>
          <Image
            src='/images/oto_banner.png'
            alt='Đèn trang trí vỏ sò O The o đang sáng trên bàn gỗ trong phòng khách'
            width={1280}
            height={720}
            sizes='(min-width: 1024px) 60vw, 100vw'
            loading='eager'
            fetchPriority='high'
            className='aspect-video w-full object-cover motion-safe:animate-settle'
          />
        </div>
        <div className='flex flex-col items-start gap-6 px-6 py-14 md:px-12 lg:px-12 lg:py-16 xl:px-20'>
          <p className='label-caps motion-safe:animate-rise' style={rise(100)}>
            Làm thủ công
          </p>
          <h1
            className='text-5xl leading-[1.05] font-medium text-balance motion-safe:animate-rise md:text-6xl xl:text-7xl'
            style={rise(220)}
          >
            Đèn trang trí làm từ vỏ sò
          </h1>
          <p
            className='max-w-[48ch] text-base leading-relaxed text-muted-foreground motion-safe:animate-rise'
            style={rise(360)}
          >
            Mỗi chiếc đèn được ghép tay từ vỏ sò thật. Khi bật, ánh sáng đi qua
            lớp vỏ mỏng và hiện rõ từng đường vân; khi tắt, đèn vẫn là một món
            trang trí đẹp cho góc nhà.
          </p>
          <div
            className='mt-2 flex flex-col items-start gap-6 motion-safe:animate-rise'
            style={rise(500)}
          >
            <CtaLink href='/products'>Xem các mẫu đèn</CtaLink>
            <ArrowLink href='#bat-den'>Xem lúc đèn bật</ArrowLink>
          </div>
        </div>
      </section>

      <Marquee
        items={[
          'Đèn trang trí vỏ sò',
          'Ghép tay từng chiếc',
          'Mỗi chiếc một vân vỏ',
        ]}
      />

      <LampSwitch />

      <section
        aria-labelledby='noi-bat-title'
        className='container mx-auto grid gap-12 px-6 py-20 md:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.3fr)] lg:items-center lg:gap-16'
      >
        <div className='flex reveal flex-col items-start gap-6'>
          <SectionTitle
            id='noi-bat-title'
            serif='Sản phẩm'
            caps='nổi bật'
            stacked
          />
          <p className='max-w-[40ch] text-base leading-relaxed text-muted-foreground'>
            Những mẫu đèn được chọn nhiều. Mỗi chiếc làm tay nên vân vỏ sẽ khác
            ảnh một chút.
          </p>
          <ArrowLink href='/products'>Xem tất cả sản phẩm</ArrowLink>
        </div>
        <div
          className='min-w-0 reveal'
          style={{ '--reveal-delay': 10 } as React.CSSProperties}
        >
          <Suspense fallback={<FeaturedProductsSkeleton />}>
            <FeaturedProducts />
          </Suspense>
        </div>
      </section>

      <Suspense fallback={<CollectionsSkeleton />}>
        <CollectionsSection />
      </Suspense>

      <section
        aria-labelledby='cach-lam-title'
        className='container mx-auto px-6 py-20 md:py-28'
      >
        <div className='grid gap-6 md:grid-cols-12 md:items-end'>
          <SectionTitle
            id='cach-lam-title'
            serif='Cách làm'
            caps='một chiếc đèn'
            stacked
            className='reveal md:col-span-6'
          />
          <p className='max-w-prose reveal text-base leading-relaxed text-muted-foreground md:col-span-5 md:col-start-8'>
            Mỗi chiếc đèn đi qua bốn bước, đều làm bằng tay.
          </p>
        </div>

        <ol className='mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 md:mt-20 lg:grid-cols-4'>
          {MAKING_STEPS.map((step, index) => (
            <li
              key={step.title}
              className='flex reveal flex-col gap-4 border-t pt-6'
              style={{ '--reveal-delay': index * 6 } as React.CSSProperties}
            >
              <span
                aria-hidden
                className='font-heading text-6xl leading-none italic tabular-nums'
              >
                {index + 1}
              </span>
              <h3 className='display-caps text-xl font-semibold'>
                {step.title}
              </h3>
              <p className='max-w-[38ch] text-sm leading-relaxed text-muted-foreground'>
                {step.note}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby='cau-chuyen-title'
        className='container mx-auto grid gap-12 px-6 py-20 md:py-28 lg:grid-cols-12 lg:items-center lg:gap-10'
      >
        <ul className='grid grid-cols-3 gap-3 sm:gap-6 lg:col-span-7'>
          {SHELLS.map((shell, index) => (
            <li
              key={shell.name}
              className='flex reveal flex-col gap-4'
              style={{ '--reveal-delay': index * 8 } as React.CSSProperties}
            >
              <ImagePlaceholder
                label={shell.photo}
                tone='deep'
                className='aspect-4/5 rounded-lg'
              />
              <span className='border-b pb-4 text-center display-caps text-sm font-semibold sm:text-lg'>
                {shell.name}
              </span>
            </li>
          ))}
        </ul>

        <div className='flex reveal flex-col items-start gap-6 lg:col-span-4 lg:col-start-9'>
          <SectionTitle
            id='cau-chuyen-title'
            serif='Câu chuyện'
            caps='vỏ sò'
            stacked
          />
          <p className='text-base leading-relaxed text-muted-foreground'>
            O The o làm đèn trang trí từ vỏ sò, cùng vài món nhỏ khác cho góc
            nhà. Vỏ sò là vỏ tự nhiên nên vân và dáng mỗi chiếc mỗi khác: chiếc
            bạn nhận sẽ gần giống ảnh, không giống hệt.
          </p>
          <p className='text-base leading-relaxed text-muted-foreground'>
            Muốn hỏi kích thước, độ sáng hay chọn vỏ trước khi đặt, hãy nhắn cho
            cửa hàng.
          </p>
          <CtaLink href='/about' variant='outline' className='mt-4'>
            Về cửa hàng
          </CtaLink>
          <ArrowLink href='/contact'>Liên hệ</ArrowLink>
        </div>
      </section>
    </>
  );
}
