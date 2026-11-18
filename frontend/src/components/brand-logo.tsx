import Image from 'next/image';

import { cn } from '@/lib/utils';

const LOGO = { src: '/images/oto_logo.png', width: 978, height: 385 };

type BrandLogoProps = {
  className?: string;
  sizes: string;
  eager?: boolean;
};

export function BrandLogo({ className, sizes, eager = false }: BrandLogoProps) {
  return (
    <Image
      src={LOGO.src}
      alt='O The o'
      width={LOGO.width}
      height={LOGO.height}
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      className={cn('h-12 w-auto', className)}
    />
  );
}
