import type { Metadata } from 'next';

export const instant = false;

export const metadata: Metadata = { title: 'Sổ địa chỉ' };

export default function AddressesPage() {
  return (
    <section className='container mx-auto px-6 py-16'>
      <h1 className='text-5xl font-medium'>Sổ địa chỉ</h1>
      <p className='mt-4 text-muted-foreground'>
        GET/POST/PATCH/DELETE /me/addresses.
      </p>
    </section>
  );
}
