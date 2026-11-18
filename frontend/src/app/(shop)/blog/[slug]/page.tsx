import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Bài viết' };

export default function BlogPostPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      <h1 className='text-5xl font-medium'>Bài viết</h1>
      <p className='mt-4 text-muted-foreground'>Nội dung bài viết.</p>
    </section>
  );
}
