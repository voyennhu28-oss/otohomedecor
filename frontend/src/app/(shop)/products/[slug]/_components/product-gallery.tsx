'use client';

import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';

import { ImagePlaceholder } from '@/components/image-placeholder';
import { RemoteImage } from '@/components/remote-image';
import type { ImageItem } from '@/features/products/types';
import { cn } from '@/lib/utils';

const ZOOM = 1.9;

export function ProductGallery({
  images,
  name,
}: {
  images: ImageItem[];
  name: string;
}) {
  const imageKey = images.map((image) => image.url).join('|');
  const [index, setIndex] = useState(0);
  const [syncedKey, setSyncedKey] = useState(imageKey);
  if (syncedKey !== imageKey) {
    setSyncedKey(imageKey);
    setIndex(0);
  }
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  const current = images[index] ?? images[0];
  const count = images.length;
  const go = (step: 1 | -1) =>
    setIndex((value) => (value + step + count) % count);

  if (!current) {
    return (
      <ImagePlaceholder
        label={`Ảnh sản phẩm: ${name}`}
        className='aspect-square rounded-lg'
      />
    );
  }

  return (
    <div className='flex flex-col gap-4 lg:flex-row-reverse lg:items-start'>
      <div
        className='group/gallery relative aspect-square flex-1 overflow-hidden rounded-lg bg-secondary/45'
        onPointerMove={(event) => {
          if (event.pointerType !== 'mouse') return;
          const rect = event.currentTarget.getBoundingClientRect();
          setZoom({
            x: ((event.clientX - rect.left) / rect.width) * 100,
            y: ((event.clientY - rect.top) / rect.height) * 100,
          });
        }}
        onPointerLeave={() => setZoom(null)}
      >
        <div
          key={current.url}
          className='absolute inset-0 transition-transform duration-500 ease-soft motion-safe:animate-fade motion-reduce:transition-none'
          style={{
            transform: zoom ? `scale(${ZOOM})` : undefined,
            transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : undefined,
          }}
        >
          <RemoteImage
            src={current.url}
            alt={current.alt ?? `${name}, ảnh ${index + 1}`}
            sizes='(min-width: 1024px) 50vw, 100vw'
            loading={index === 0 ? 'eager' : undefined}
            fetchPriority={index === 0 ? 'high' : undefined}
            className='object-cover'
          />
        </div>

        {count > 1 && (
          <>
            <span className='absolute bottom-4 left-4 rounded-sm bg-background/90 px-2 py-1 text-xs tabular-nums'>
              {index + 1} / {count}
            </span>
            <div className='absolute right-4 bottom-4 flex gap-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover/gallery:opacity-100 lg:focus-within:opacity-100'>
              <GalleryButton label='Ảnh trước' onClick={() => go(-1)}>
                <HugeiconsIcon
                  icon={ArrowLeft01Icon}
                  size={16}
                  strokeWidth={1.75}
                />
              </GalleryButton>
              <GalleryButton label='Ảnh sau' onClick={() => go(1)}>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  strokeWidth={1.75}
                />
              </GalleryButton>
            </div>
          </>
        )}
      </div>

      {count > 1 && (
        <ul
          aria-label='Chọn ảnh'
          className='no-scrollbar flex gap-3 overflow-x-auto lg:max-h-[calc(100svh-10rem)] lg:w-20 lg:flex-col lg:overflow-y-auto'
        >
          {images.map((image, imageIndex) => (
            <li key={image.url} className='shrink-0'>
              <button
                type='button'
                aria-label={`Xem ảnh ${imageIndex + 1}`}
                aria-current={imageIndex === index ? 'true' : undefined}
                onClick={() => setIndex(imageIndex)}
                className={cn(
                  'relative block size-18 overflow-hidden rounded-sm bg-secondary/45 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-ring lg:size-20',
                  imageIndex === index
                    ? 'ring-1 ring-foreground ring-offset-2'
                    : 'opacity-60 hover:opacity-100',
                )}
              >
                <RemoteImage
                  src={image.url}
                  alt=''
                  sizes='80px'
                  className='object-cover'
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GalleryButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      aria-label={label}
      onClick={onClick}
      className='flex size-10 items-center justify-center rounded-sm bg-background/90 transition-colors outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring'
    >
      {children}
    </button>
  );
}
