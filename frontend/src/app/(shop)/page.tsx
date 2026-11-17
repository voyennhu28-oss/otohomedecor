import type { Metadata } from 'next';

import { ArrowLink } from './_components/arrow-link';
import { ImagePlaceholder } from './_components/image-placeholder';
import { LampSwitch } from './_components/lamp-switch';
import {
  FEATURED_PRODUCTS,
  MAKING_STEPS,
} from './_components/placeholder-data';
import { ProductTile } from './_components/product-tile';

export const metadata: Metadata = {
  title: 'Đèn ngủ vỏ sò làm thủ công',
  description:
    'Đèn ngủ ghép tay từ vỏ sò thật. Ánh sáng đi qua lớp vỏ mỏng nên dịu, đủ để ngủ.',
};

export default function HomePage() {
  const [lead, ...rest] = FEATURED_PRODUCTS;

  return (
    <>
      {/* Hero: tiêu đề lớn + cặp ảnh kiểu trang đôi tạp chí */}
      <section className='container mx-auto px-6 pt-12 pb-20 md:pt-20 md:pb-32'>
        <h1 className='text-[clamp(3rem,9vw,8.5rem)] leading-none uppercase'>
          <span className='md:block'>Đèn ngủ </span>
          <span className='md:block'>làm từ vỏ sò</span>
        </h1>

        <div className='mt-10 grid gap-8 md:mt-16 md:grid-cols-12 md:gap-6'>
          <ImagePlaceholder
            label='Ảnh đèn ngủ vỏ sò đang bật trên tủ đầu giường, phòng tối'
            tone='mid'
            className='aspect-4/5 sm:aspect-4/3 md:col-span-8 lg:aspect-3/2'
          />
          <div className='flex flex-col gap-8 md:col-span-4'>
            <ImagePlaceholder
              label='Ảnh cận: vân vỏ sò khi có ánh sáng phía sau'
              className='hidden aspect-4/5 md:block'
            />
            <p className='max-w-sm text-base leading-relaxed'>
              Đèn ngủ ghép tay từ vỏ sò thật. Ánh sáng đi qua lớp vỏ mỏng nên
              dịu, đủ để ngủ.
            </p>
            <div className='flex flex-wrap gap-x-8 gap-y-3'>
              <ArrowLink href='/products'>Xem đèn ngủ</ArrowLink>
              <ArrowLink href='#bat-den'>Xem lúc đèn bật</ArrowLink>
            </div>
          </div>
        </div>
      </section>

      {/* Bật / tắt đèn: điểm nhấn của trang */}
      <LampSwitch />

      {/* Sản phẩm nổi bật */}
      <section
        aria-labelledby='noi-bat-title'
        className='container mx-auto px-6 py-20 md:py-32'
      >
        <div className='mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 md:mb-14'>
          <h2 id='noi-bat-title' className='text-3xl uppercase md:text-5xl'>
            Sản phẩm nổi bật
          </h2>
          <ArrowLink href='/products'>Xem tất cả sản phẩm</ArrowLink>
        </div>
        <div className='grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-12 md:gap-x-6 md:gap-y-12'>
          <ProductTile
            product={lead}
            size='large'
            className='col-span-2 md:col-span-6 md:row-span-2'
          />
          {rest.map((product) => (
            <ProductTile
              key={product.slug}
              product={product}
              className='md:col-span-3'
            />
          ))}
        </div>
      </section>

      {/* Cách làm: đây đúng là một quy trình nên đánh số */}
      <section
        aria-labelledby='cach-lam-title'
        className='container mx-auto px-6 py-20 md:py-32'
      >
        <div className='grid gap-6 md:grid-cols-12'>
          <h2
            id='cach-lam-title'
            className='text-3xl uppercase md:col-span-5 md:text-5xl'
          >
            Cách làm một chiếc đèn
          </h2>
          <p className='max-w-prose text-base leading-relaxed text-muted-foreground md:col-span-6 md:col-start-7'>
            Mỗi chiếc đèn đi qua bốn bước, đều làm bằng tay.
          </p>
        </div>

        <ol className='mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 md:mt-20 lg:grid-cols-4'>
          {MAKING_STEPS.map((step, index) => (
            <li key={step.title} className='flex flex-col gap-4 border-t pt-6'>
              <span
                aria-hidden
                className='font-heading text-5xl leading-none tabular-nums'
              >
                {index + 1}
              </span>
              <h3 className='text-2xl uppercase'>{step.title}</h3>
              <p className='max-w-[38ch] text-sm leading-relaxed text-muted-foreground'>
                {step.note}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Về cửa hàng */}
      <section
        aria-labelledby='cua-hang-title'
        className='container mx-auto px-6 py-20 md:py-32'
      >
        <div className='grid gap-10 md:grid-cols-12 md:items-end md:gap-6'>
          <ImagePlaceholder
            label='Ảnh bàn làm việc: vỏ sò đã phân loại và khung đèn đang ghép'
            tone='deep'
            className='aspect-4/5 md:col-span-5'
          />
          <div className='flex flex-col gap-6 md:col-span-6 md:col-start-7'>
            <h2
              id='cua-hang-title'
              className='text-4xl leading-none uppercase md:text-6xl'
            >
              Mỗi chiếc đèn do cửa hàng tự làm
            </h2>
            <p className='max-w-prose text-base leading-relaxed'>
              Oto Home Decor làm đèn ngủ vỏ sò và một số đồ trang trí nhỏ. Vỏ sò
              là vỏ tự nhiên nên vân và dáng mỗi chiếc mỗi khác: chiếc bạn nhận
              sẽ gần giống ảnh, không giống hệt.
            </p>
            <p className='max-w-prose text-base leading-relaxed text-muted-foreground'>
              Muốn hỏi kích thước, độ sáng hay chọn vỏ trước khi đặt, hãy nhắn
              cho cửa hàng.
            </p>
            <div className='flex flex-wrap gap-x-8 gap-y-3'>
              <ArrowLink href='/about'>Về cửa hàng</ArrowLink>
              <ArrowLink href='/contact'>Liên hệ</ArrowLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
