import { cn } from '@/lib/utils';

type SectionTitleProps = {
  serif: string;
  caps: string;
  as?: 'h1' | 'h2' | 'h3';
  stacked?: boolean;
  id?: string;
  className?: string;
};

export function SectionTitle({
  serif,
  caps,
  as: Tag = 'h2',
  stacked = false,
  id,
  className,
}: SectionTitleProps) {
  return (
    <Tag
      id={id}
      className={cn(
        'text-5xl leading-[1.05] text-balance md:text-6xl',
        className,
      )}
    >
      <span className={cn('italic', stacked && 'block')}>{serif}</span>{' '}
      <span
        className={cn(
          'display-caps text-[0.7em] font-semibold',
          stacked && 'mt-2 block',
        )}
      >
        {caps}
      </span>
    </Tag>
  );
}
