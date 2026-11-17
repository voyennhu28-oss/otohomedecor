'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { ImagePlaceholder } from './image-placeholder';

/**
 * Cho khách xem đèn lúc tắt và lúc bật. Bấm nút thì cả khối chuyển sang nền
 * tối, ảnh đổi sang đèn đang sáng. Chỉ đổi khi khách bấm.
 */
export function LampSwitch() {
  const [on, setOn] = useState(false);

  return (
    <section
      id='bat-den'
      aria-labelledby='bat-den-title'
      className={cn(
        'scroll-mt-16 transition-colors duration-500 motion-reduce:transition-none',
        on ? 'bg-foreground text-background' : 'bg-background text-foreground',
      )}
    >
      <div className='container mx-auto grid gap-10 px-6 py-20 md:grid-cols-12 md:items-center md:gap-6 md:py-32'>
        <div className='flex flex-col gap-6 md:col-span-5'>
          <h2
            id='bat-den-title'
            className='text-4xl leading-none uppercase md:text-6xl'
          >
            Lúc tắt và lúc bật
          </h2>
          <p
            aria-live='polite'
            className='max-w-[42ch] text-base leading-relaxed opacity-80'
          >
            {on
              ? 'Ban đêm, ánh sáng đi qua lớp vỏ mỏng và hiện rõ từng đường vân. Đủ sáng để tìm đường, đủ dịu để ngủ.'
              : 'Ban ngày, đèn là một món trang trí: vân vỏ sò và màu ngà tự nhiên, đặt trên kệ hay tủ đầu giường đều hợp.'}
          </p>
          <Button
            variant='outline'
            size='lg'
            aria-pressed={on}
            onClick={() => setOn((value) => !value)}
            className='h-11 self-start border-current bg-transparent px-6 text-inherit hover:bg-current/10 hover:text-inherit'
          >
            {on ? 'Tắt đèn' : 'Bật đèn'}
          </Button>
        </div>

        <div className='relative aspect-4/5 md:col-span-6 md:col-start-7'>
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
            {/* Quầng sáng giữ chỗ, thay bằng ảnh thật chụp lúc đèn bật */}
            <div
              aria-hidden
              className='absolute inset-0'
              style={{
                background:
                  'radial-gradient(circle at 50% 58%, color-mix(in oklch, var(--background) 60%, transparent) 0%, color-mix(in oklch, var(--background) 12%, transparent) 22%, transparent 48%)',
              }}
            />
            <span className='absolute bottom-3 left-3 text-xs text-background/60'>
              Ảnh đèn lúc bật trong phòng tối
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
