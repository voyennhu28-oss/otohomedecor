import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function DataTableState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: IconSvgElement;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-sm border border-dashed px-6 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <span className='mb-4 flex size-11 items-center justify-center rounded-sm bg-muted text-muted-foreground'>
          <HugeiconsIcon icon={icon} size={22} strokeWidth={1.5} />
        </span>
      )}
      <p className='font-medium'>{title}</p>
      {description && (
        <p className='mt-1 max-w-sm text-sm text-muted-foreground'>
          {description}
        </p>
      )}
      {action && <div className='mt-5'>{action}</div>}
    </div>
  );
}

export function DataTableSkeleton({
  rows = 6,
  label,
}: {
  rows?: number;
  label: string;
}) {
  return (
    <div role='status' aria-label={label} className='flex flex-col gap-4'>
      <div className='flex flex-wrap gap-2'>
        <Skeleton className='h-8 w-64 rounded-sm' />
        <Skeleton className='h-8 w-36 rounded-sm' />
        <Skeleton className='h-8 w-36 rounded-sm' />
      </div>
      <div className='overflow-hidden rounded-sm border'>
        <div className='h-10 border-b bg-muted/50' />
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className='flex items-center gap-3 border-b px-4 py-3 last:border-0'
          >
            <Skeleton className='size-9 rounded-sm' />
            <div className='flex flex-1 flex-col gap-1.5'>
              <Skeleton className='h-3.5 w-40 rounded-sm' />
              <Skeleton className='h-3 w-24 rounded-sm' />
            </div>
            <Skeleton className='h-5 w-20 rounded-sm' />
          </div>
        ))}
      </div>
    </div>
  );
}
