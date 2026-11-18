import { ShoppingBag02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

import { ImagePlaceholder } from './image-placeholder';
import type { PlaceholderProduct } from './placeholder-data';

type ProductTileProps = {
  product: PlaceholderProduct;
  className?: string;
};

export function ProductTile({ product, className }: ProductTileProps) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        'group flex flex-col gap-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4',
        className,
      )}
    >
      <ImagePlaceholder
        label={product.photo}
        className='aspect-square rounded-lg'
      />
      <div className='grid grid-cols-[1fr_auto] items-start gap-4'>
        <div className='min-w-0'>
          <p className='font-heading text-xl leading-snug font-semibold underline-offset-4 group-hover:underline'>
            {product.name}
          </p>
          <p className='mt-1.5 text-[11px] tracking-[0.14em] text-muted-foreground uppercase'>
            {product.detail}
          </p>
          <p className='mt-3 text-base tabular-nums'>
            {formatVND(product.price)}
          </p>
        </div>
        <span
          aria-hidden
          className='flex size-12 items-center justify-center rounded-sm bg-secondary transition-colors group-hover:bg-primary group-hover:text-primary-foreground motion-reduce:transition-none md:size-14'
        >
          <HugeiconsIcon icon={ShoppingBag02Icon} size={20} strokeWidth={1.5} />
        </span>
      </div>
    </Link>
  );
}
