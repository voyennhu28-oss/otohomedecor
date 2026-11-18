'use client';

import { Menu01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { MobileAccount } from './mobile-account';
import { SHOP_NAV } from './nav-items';

/** Menu cho màn hình nhỏ: panel trượt từ phải, chữ lớn như trang mục lục. */
export function MobileNav({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant='ghost'
            size='icon'
            aria-label='Mở menu'
            className={className}
          />
        }
      >
        <HugeiconsIcon icon={Menu01Icon} size={22} strokeWidth={1.75} />
      </SheetTrigger>
      <SheetContent side='right' className='gap-0 p-6'>
        <SheetTitle className='sr-only'>Menu</SheetTitle>
        <nav className='mt-12 flex flex-col'>
          {SHOP_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className='border-b py-3 font-heading text-4xl font-medium outline-none first:border-t focus-visible:underline'
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className='mt-auto pt-10'>
          <MobileAccount onNavigate={close} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
