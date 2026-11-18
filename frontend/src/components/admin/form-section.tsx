import { cn } from '@/lib/utils';

export function FormSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-sm border bg-card', className)}>
      <header className='flex items-start justify-between gap-4 border-b px-5 py-4'>
        <div className='min-w-0'>
          <h2 className='font-sans text-sm font-semibold'>{title}</h2>
          {description && (
            <p className='mt-0.5 text-xs text-muted-foreground'>
              {description}
            </p>
          )}
        </div>
        {actions && <div className='shrink-0'>{actions}</div>}
      </header>
      <div className='flex flex-col gap-5 p-5'>{children}</div>
    </section>
  );
}
