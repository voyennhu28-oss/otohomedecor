'use client';

import { ViewIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className='relative'>
      <Input
        type={visible ? 'text' : 'password'}
        className={cn('pr-11', className)}
        {...props}
      />
      <button
        type='button'
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
        className='absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
      >
        <HugeiconsIcon
          icon={visible ? ViewOffSlashIcon : ViewIcon}
          size={18}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
    </div>
  );
}
