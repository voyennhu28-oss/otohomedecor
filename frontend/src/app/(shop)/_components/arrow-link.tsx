import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

type ArrowLinkProps = React.ComponentProps<typeof Link>;

/** Link điều hướng kiểu chữ + mũi tên. */
export function ArrowLink({ className, children, ...props }: ArrowLinkProps) {
  return (
    <Link
      className={cn(
        'group/arrow inline-flex items-center gap-2 text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4',
        className,
      )}
      {...props}
    >
      {children}
      <HugeiconsIcon
        icon={ArrowRight02Icon}
        size={16}
        strokeWidth={1.75}
        aria-hidden
        className='transition-transform group-hover/arrow:translate-x-1 motion-reduce:transition-none'
      />
    </Link>
  );
}
