'use client';

import { ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import type { PlaceholderProduct } from './placeholder-data';
import { ProductTile } from './product-tile';

type ProductRailProps = {
  products: PlaceholderProduct[];
  label: string;
};

export function ProductRail({ products, label }: ProductRailProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [progress, setProgress] = useState({ start: 0, size: 1 });

  const update = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const size = el.scrollWidth ? el.clientWidth / el.scrollWidth : 1;
    const start = el.scrollWidth ? el.scrollLeft / el.scrollWidth : 0;
    setProgress({ start, size });
  }, []);

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update]);

  const scrollBy = (direction: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.8,
      behavior: reduce ? 'auto' : 'smooth',
    });
  };

  const atStart = progress.start <= 0.001;
  const atEnd = progress.start + progress.size >= 0.999;

  return (
    <div className='min-w-0'>
      <ul
        ref={listRef}
        onScroll={update}
        tabIndex={0}
        aria-label={label}
        className='-mx-6 flex snap-x snap-mandatory scroll-px-6 [scrollbar-width:none] gap-6 overflow-x-auto px-6 pb-2 outline-none focus-visible:ring-2 focus-visible:ring-ring lg:mx-0 lg:scroll-px-0 lg:px-0 [&::-webkit-scrollbar]:hidden'
      >
        {products.map((product) => (
          <li
            key={product.slug}
            className='w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-[38%]'
          >
            <ProductTile product={product} />
          </li>
        ))}
      </ul>

      <div className='mt-10 flex items-center gap-6'>
        <div aria-hidden className='relative h-0.5 flex-1 bg-border'>
          <div
            className='absolute inset-y-0 bg-foreground'
            style={{
              left: `${progress.start * 100}%`,
              width: `${progress.size * 100}%`,
            }}
          />
        </div>
        <div className='flex gap-2'>
          {(
            [
              [-1, ArrowLeft02Icon, 'Xem sản phẩm trước', atStart],
              [1, ArrowRight02Icon, 'Xem sản phẩm tiếp', atEnd],
            ] as const
          ).map(([direction, icon, ariaLabel, disabled]) => (
            <button
              key={direction}
              type='button'
              aria-label={ariaLabel}
              disabled={disabled}
              onClick={() => scrollBy(direction)}
              className={cn(
                'flex size-11 items-center justify-center rounded-sm border transition-colors outline-none hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none',
              )}
            >
              <HugeiconsIcon icon={icon} size={18} strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
