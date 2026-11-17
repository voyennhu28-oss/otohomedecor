import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Yêu thích' };

export default function WishlistPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      <h1 className='text-5xl font-medium'>Yêu thích</h1>
      <p className='mt-4 text-muted-foreground'>GET /me/wishlist.</p>
    </section>
  );
}
