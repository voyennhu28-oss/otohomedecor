import { cn } from '@/lib/utils';

const TONES = {
  light: 'bg-secondary/45',
  mid: 'bg-secondary/70',
  deep: 'bg-secondary',
} as const;

type ImagePlaceholderProps = {
  label: string;
  tone?: keyof typeof TONES;
  className?: string;
};

export function ImagePlaceholder({
  label,
  tone = 'light',
  className,
}: ImagePlaceholderProps) {
  return (
    <div
      role='img'
      aria-label={label}
      className={cn('relative w-full overflow-hidden', TONES[tone], className)}
    >
      <span className='absolute bottom-3 left-3 max-w-[80%] text-xs text-muted-foreground'>
        {label}
      </span>
    </div>
  );
}
