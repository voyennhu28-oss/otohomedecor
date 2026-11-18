import Link from 'next/link';

import { ACCOUNT_NAV } from './nav-items';

export function AccountNav() {
  return (
    <nav className='flex flex-col gap-2 text-sm'>
      {ACCOUNT_NAV.map((item) => (
        <Link key={item.href} href={item.href} className='hover:underline'>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
