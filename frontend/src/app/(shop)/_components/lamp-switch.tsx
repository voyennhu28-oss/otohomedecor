'use client';

import { useState } from 'react';

import { LampGlow } from '@/components/lamp-glow';
import { SectionTitle } from '@/components/section-title';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { ImagePlaceholder } from './image-placeholder';

export function LampSwitch() {
  const [on, setOn] = useState(false);

  return (
    <section
      id='bat-den'
      aria-labelledby='bat-den-title'
      className={cn(
        'scroll-mt-20 transition-colors duration-500 motion-reduce:transition-none',
        on ? 'bg-foreground text-background' : 'bg-background text-foreground',
      )}
    >
      <div className='container mx-auto grid gap-10 px-6 py-20 md:grid-cols-12 md:items-center md:gap-6 md:py-32'>
        <div className='flex flex-col gap-6 md:col-span-5'>
          <SectionTitle
            id='bat-den-title'
            serif='Lúc tắt và'
            caps='lúc bật'
            stacked
          />
          <p
            aria-live='polite'
            className='max-w-[42ch] text-base leading-relaxed opacity-80'
          >
            {on
              ? 'Khi bật, ánh sáng đi qua lớp vỏ mỏng và hiện rõ từng đường vân, phủ lên góc phòng một màu ấm.'
              : 'Khi tắt, đèn vẫn là một món trang trí: vân vỏ sò và màu ngà tự nhiên, đặt trên kệ, bàn trà hay bàn làm việc đều hợp.'}
          </p>
          <Button
            variant='outline'
            size='lg'
            aria-pressed={on}
            onClick={() => setOn((value) => !value)}
            className='mt-4 h-14 w-full max-w-sm justify-start rounded-sm border-current bg-transparent px-6 label-caps text-inherit hover:bg-current/10 hover:text-inherit md:h-16'
          >
            {on ? 'Tắt đèn' : 'Bật đèn'}
          </Button>
        </div>

        <div className='relative aspect-4/5 overflow-hidden rounded-lg md:col-span-6 md:col-start-7'>
          <ImagePlaceholder
            label='Ảnh đèn lúc tắt, ánh sáng ban ngày'
            tone='mid'
            className={cn(
              'absolute inset-0 h-full transition-opacity duration-500 motion-reduce:transition-none',
              on ? 'opacity-0' : 'opacity-100',
            )}
          />
          <div
            role='img'
            aria-label='Ảnh đèn lúc bật trong phòng tối'
            aria-hidden={!on}
            className={cn(
              'absolute inset-0 overflow-hidden bg-background/5 transition-opacity duration-500 motion-reduce:transition-none',
              on ? 'opacity-100' : 'opacity-0',
            )}
          >
            <LampGlow />
            <span className='absolute bottom-3 left-3 text-xs text-background/60'>
              Ảnh đèn lúc bật trong phòng tối
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
