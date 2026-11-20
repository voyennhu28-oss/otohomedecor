import { CtaLink } from '@/app/(shop)/_components/cta-link';

export default function ProductNotFound() {
  return (
    <section className='container mx-auto flex min-h-[60svh] flex-col items-start justify-center gap-6 px-6 py-20'>
      <p className='label-caps text-muted-foreground'>Không tìm thấy</p>
      <h1 className='max-w-[18ch] text-5xl leading-[1.05] text-balance md:text-6xl'>
        Mẫu đèn này không còn ở cửa hàng
      </h1>
      <p className='max-w-[48ch] text-base leading-relaxed text-muted-foreground'>
        Có thể mẫu đã ngừng bán hoặc đường dẫn bị sai. Bạn xem các mẫu khác,
        hoặc nhắn cho cửa hàng nếu muốn đặt làm lại.
      </p>
      <CtaLink href='/products'>Xem các mẫu đèn</CtaLink>
    </section>
  );
}
