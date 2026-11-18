import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

type CtaLinkProps = React.ComponentProps<typeof Link> & {
  variant?: 'solid' | 'outline';
};

export function CtaLink({
  variant = 'solid',
  className,
  children,
  ...props
}: CtaLinkProps) {
  return (
    <Link
      className={cn(
        'group/cta inline-flex h-14 w-full max-w-sm items-center justify-between gap-6 rounded-sm border px-6 label-caps transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none md:h-16',
        variant === 'solid'
          ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
          : 'border-border hover:border-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <HugeiconsIcon
        icon={ArrowRight02Icon}
        size={22}
        strokeWidth={1.5}
        aria-hidden
        className='transition-transform group-hover/cta:translate-x-1 motion-reduce:transition-none'
      />
    </Link>
  );
}
