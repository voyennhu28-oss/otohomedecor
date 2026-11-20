import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { RemoteImage } from '@/components/remote-image';
import type { PublicCollection } from '@/features/collections/types';
import { cn } from '@/lib/utils';

import { ImagePlaceholder } from '@/components/image-placeholder';

export function CollectionShowcase({
  collections,
}: {
  collections: PublicCollection[];
}) {
  const [lead, ...rest] = collections;
  if (!lead) return null;

  return (
    <ul className='grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-y-10'>
      <li className='reveal md:col-span-2 lg:col-span-7 lg:row-span-2'>
        <CollectionCard collection={lead} featured />
      </li>
      {rest.map((collection, index) => (
        <li
          key={collection.id}
          className={cn(
            'reveal lg:col-span-5',
            rest.length === 1 && 'lg:row-span-2',
          )}
          style={{ '--reveal-delay': (index + 1) * 8 } as React.CSSProperties}
        >
          <CollectionCard collection={collection} />
        </li>
      ))}
    </ul>
  );
}

function CollectionCard({
  collection,
  featured = false,
}: {
  collection: PublicCollection;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/products?collection=${collection.slug}`}
      className='group flex h-full flex-col gap-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4'
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-lg bg-secondary/60',
          featured ? 'aspect-4/3 lg:aspect-auto lg:flex-1' : 'aspect-16/9',
        )}
      >
        {collection.image ? (
          <RemoteImage
            src={collection.image.url}
            alt={collection.image.alt ?? `Bộ sưu tập ${collection.name}`}
            sizes={
              featured
                ? '(min-width: 1024px) 55vw, 100vw'
                : '(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw'
            }
            className='object-cover transition-transform duration-1200 ease-soft group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100'
          />
        ) : (
          <ImagePlaceholder
            label={`Ảnh bìa bộ sưu tập ${collection.name}`}
            tone='mid'
            className='absolute inset-0 h-full'
          />
        )}
      </div>
      <div className='flex items-start justify-between gap-6'>
        <div className='min-w-0'>
          <p className='label-caps text-muted-foreground'>Bộ sưu tập</p>
          <h3
            className={cn(
              'mt-2 leading-tight underline-offset-4 group-hover:underline',
              featured ? 'text-4xl md:text-5xl' : 'text-3xl',
            )}
          >
            {collection.name}
          </h3>
          {collection.description && (
            <p
              className={cn(
                'mt-3 max-w-[52ch] text-sm leading-relaxed text-muted-foreground',
                !featured && 'line-clamp-2',
              )}
            >
              {collection.description}
            </p>
          )}
        </div>
        <span
          aria-hidden
          className='mt-1 flex size-11 shrink-0 items-center justify-center rounded-sm border transition-colors group-hover:border-foreground group-hover:bg-foreground group-hover:text-background motion-reduce:transition-none'
        >
          <HugeiconsIcon
            icon={ArrowRight02Icon}
            size={18}
            strokeWidth={1.5}
            className='transition-transform duration-500 ease-soft group-hover:translate-x-0.5 motion-reduce:transition-none'
          />
        </span>
      </div>
    </Link>
  );
}
