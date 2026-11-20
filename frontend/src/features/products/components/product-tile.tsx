import { ShoppingBag02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { ImagePlaceholder } from '@/components/image-placeholder';
import { RemoteImage } from '@/components/remote-image';
import type { ProductCard } from '@/features/products/types';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

type ProductTileProps = {
  product: ProductCard;
  sizes?: string;
  dense?: boolean;
  className?: string;
};

function priceText({ minPrice, maxPrice }: ProductCard) {
  if (minPrice === 0) return 'Liên hệ';
  return minPrice === maxPrice
    ? formatVND(minPrice)
    : `Từ ${formatVND(minPrice)}`;
}

export function ProductTile({
  product,
  sizes = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 78vw',
  dense = false,
  className,
}: ProductTileProps) {
  const [cover, hover] = [...product.images].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        'group flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4',
        dense ? 'gap-4' : 'gap-5',
        className,
      )}
    >
      <div className='relative aspect-square overflow-hidden rounded-lg bg-secondary/45'>
        {cover ? (
          <>
            <RemoteImage
              src={cover.url}
              alt={cover.alt ?? product.name}
              sizes={sizes}
              className='object-cover transition-transform duration-900 ease-soft group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100'
            />
            {hover && (
              <RemoteImage
                src={hover.url}
                alt=''
                sizes={sizes}
                className='object-cover opacity-0 transition-opacity duration-700 ease-soft group-hover:opacity-100 motion-reduce:transition-none'
              />
            )}
          </>
        ) : (
          <ImagePlaceholder
            label={`Ảnh sản phẩm: ${product.name}`}
            className='absolute inset-0 h-full'
          />
        )}
        {product.allowBackorder && (
          <span className='absolute top-3 left-3 rounded-sm bg-background/90 px-2 py-1 text-[11px] tracking-[0.12em] uppercase'>
            Làm theo đơn
          </span>
        )}
      </div>

      <div
        className={cn(
          'grid items-start gap-4',
          dense ? 'sm:grid-cols-[1fr_auto]' : 'grid-cols-[1fr_auto]',
        )}
      >
        <div className='min-w-0'>
          <p
            className={cn(
              'font-heading leading-snug font-semibold underline-offset-4 group-hover:underline',
              dense ? 'text-lg sm:text-xl' : 'text-xl',
            )}
          >
            {product.name}
          </p>
          {product.shortDescription && (
            <p className='mt-1.5 line-clamp-1 text-sm text-muted-foreground'>
              {product.shortDescription}
            </p>
          )}
          <p className='mt-3 flex flex-wrap items-baseline gap-x-3 text-base tabular-nums'>
            {priceText(product)}
            {product.ratingCount > 0 && (
              <span
                className='text-xs text-muted-foreground'
                aria-label={`${product.ratingAvg} trên 5 sao, ${product.ratingCount} đánh giá`}
              >
                ★ {product.ratingAvg.toLocaleString('vi-VN')} (
                {product.ratingCount})
              </span>
            )}
          </p>
        </div>
        <span
          aria-hidden
          className={cn(
            'size-12 items-center justify-center rounded-sm bg-secondary transition-colors group-hover:bg-primary group-hover:text-primary-foreground motion-reduce:transition-none md:size-14',
            dense ? 'hidden sm:flex' : 'flex',
          )}
        >
          <HugeiconsIcon icon={ShoppingBag02Icon} size={20} strokeWidth={1.5} />
        </span>
      </div>
    </Link>
  );
}
