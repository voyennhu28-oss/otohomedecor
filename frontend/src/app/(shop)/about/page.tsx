import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Giới thiệu' };

export default function AboutPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      <h1 className='text-5xl font-medium'>Giới thiệu</h1>
      <p className='mt-4 text-muted-foreground'>Câu chuyện thương hiệu.</p>
    </section>
  );
}
