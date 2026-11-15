import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sản phẩm' };

export default function ProductsPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      <h1 className='text-5xl uppercase'>Sản phẩm</h1>
      <p className='mt-4 text-muted-foreground'>
        Danh sách + bộ lọc: GET /products, GET /products/filters.
      </p>
    </section>
  );
}
