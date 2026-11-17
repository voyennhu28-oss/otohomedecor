import Link from 'next/link';

import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

import { ImagePlaceholder } from './image-placeholder';
import type { PlaceholderProduct } from './placeholder-data';

type ProductTileProps = {
  product: PlaceholderProduct;
  size?: 'default' | 'large';
  className?: string;
};

export function ProductTile({
  product,
  size = 'default',
  className,
}: ProductTileProps) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        'group flex flex-col gap-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4',
        className,
      )}
    >
      <ImagePlaceholder
        label={product.photo}
        tone={size === 'large' ? 'mid' : 'light'}
        className={
          size === 'large' ? 'aspect-square md:aspect-8/9' : 'aspect-square'
        }
      />
      <div
        className={cn(
          'flex items-start justify-between gap-4',
          size === 'default' && 'flex-col gap-2 lg:flex-row lg:gap-4',
        )}
      >
        <div className='min-w-0'>
          <p
            className={cn(
              'font-medium underline-offset-4 group-hover:underline',
              size === 'large' ? 'text-lg' : 'text-sm',
            )}
          >
            {product.name}
          </p>
          <p className='mt-1 text-sm text-muted-foreground'>{product.detail}</p>
        </div>
        <p
          className={cn(
            'shrink-0 tabular-nums',
            size === 'large' ? 'text-lg' : 'text-sm',
          )}
        >
          {formatVND(product.price)}
        </p>
      </div>
    </Link>
  );
}
