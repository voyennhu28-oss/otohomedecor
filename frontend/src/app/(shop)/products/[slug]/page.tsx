import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Chi tiết sản phẩm' };

export default function ProductDetailPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      <h1 className='text-5xl font-medium'>Chi tiết sản phẩm</h1>
      <p className='mt-4 text-muted-foreground'>
        GET /products/:slug (variants, ảnh), /products/:slug/related.
      </p>
    </section>
  );
}
