import {
  ArrowDownRight01Icon,
  ArrowUpRight01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type StatTileProps = {
  label: string;
  value: string;
  change?: number | null;
  upIsGood?: boolean;
  comparedTo?: string;
  hint?: React.ReactNode;
  loading?: boolean;
  className?: string;
};

export function StatTile({
  label,
  value,
  change,
  upIsGood = true,
  comparedTo,
  hint,
  loading,
  className,
}: StatTileProps) {
  const hasChange = change !== undefined && change !== null && change !== 0;
  const good = hasChange && change > 0 === upIsGood;

  return (
    <div className={cn('flex flex-col gap-2 rounded-sm border p-4', className)}>
      <p className='text-sm text-muted-foreground'>{label}</p>
      {loading ? (
        <Skeleton className='h-8 w-32 rounded-sm' />
      ) : (
        <p className='text-2xl font-semibold tracking-tight'>{value}</p>
      )}
      {loading ? (
        <Skeleton className='h-4 w-40 rounded-sm' />
      ) : (
        (change !== undefined || hint) && (
          <p className='flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground'>
            {change === null ? (
              <span>Kỳ trước chưa có số liệu</span>
            ) : change === 0 ? (
              <span>Không đổi so với {comparedTo}</span>
            ) : (
              change !== undefined && (
                <>
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 font-medium',
                      good ? 'text-foreground' : 'text-destructive',
                    )}
                  >
                    <HugeiconsIcon
                      icon={
                        change > 0 ? ArrowUpRight01Icon : ArrowDownRight01Icon
                      }
                      size={14}
                      strokeWidth={2}
                    />
                    {change > 0 ? '+' : ''}
                    {change.toLocaleString('vi-VN')}%
                  </span>
                  <span>so với {comparedTo}</span>
                </>
              )
            )}
            {hint}
          </p>
        )
      )}
    </div>
  );
}
