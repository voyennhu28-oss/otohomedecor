import { cn } from '@/lib/utils';

export function RatingStars({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  return (
    <span
      role='img'
      aria-label={`${rating} trên 5 sao`}
      className={cn('inline-flex gap-0.5 text-sm leading-none', className)}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={index < rating ? 'text-foreground' : 'text-border'}
        >
          ★
        </span>
      ))}
    </span>
  );
}
