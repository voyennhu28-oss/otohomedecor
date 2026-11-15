import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Liên hệ' };

export default function ContactPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      <h1 className='text-5xl uppercase'>Liên hệ</h1>
      <p className='mt-4 text-muted-foreground'>
        Form liên hệ, địa chỉ, giờ mở cửa.
      </p>
    </section>
  );
}
