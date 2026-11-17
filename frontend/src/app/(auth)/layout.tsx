import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='flex flex-1 flex-col'>
      <header className='container mx-auto flex h-16 items-center justify-between px-6'>
        <Link
          href='/'
          className='font-heading text-xl uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          Oto Home Decor
        </Link>
        <Link
          href='/'
          className='text-sm underline-offset-4 outline-none hover:underline focus-visible:underline'
        >
          Về trang chủ
        </Link>
      </header>
      <main className='flex flex-1 justify-center px-6 pt-10 pb-20 sm:items-center sm:pt-0'>
        <div className='w-full max-w-sm'>{children}</div>
      </main>
    </div>
  );
}
