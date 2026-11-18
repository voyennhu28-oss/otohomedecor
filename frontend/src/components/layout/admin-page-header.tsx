import { cn } from '@/lib/utils';

type AdminPageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className='min-w-0'>
        <h1 className='text-3xl leading-tight'>{title}</h1>
        {description && (
          <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
        )}
      </div>
      {actions && (
        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          {actions}
        </div>
      )}
    </div>
  );
}
