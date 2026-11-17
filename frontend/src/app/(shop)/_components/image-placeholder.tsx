import { cn } from '@/lib/utils';

const TONES = {
  light: 'bg-foreground/4',
  mid: 'bg-foreground/7',
  deep: 'bg-foreground/10',
} as const;

type ImagePlaceholderProps = {
  /** Mô tả ảnh thật sẽ đặt vào đây. Khi thay bằng <Image>, dùng làm `alt`. */
  label: string;
  tone?: keyof typeof TONES;
  className?: string;
};

/**
 * Khối giữ chỗ cho ảnh. Vuông góc, không bo, nền xám nhạt.
 * Đặt tỉ lệ bằng `className` (vd `aspect-4/5`).
 */
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
