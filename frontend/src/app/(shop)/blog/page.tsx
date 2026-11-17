import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Blog' };

export default function BlogPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      <h1 className='text-5xl font-medium'>Blog</h1>
      <p className='mt-4 text-muted-foreground'>
        Backend chưa có API blog: tạm dùng dữ liệu tĩnh hoặc MDX.
      </p>
    </section>
  );
}
