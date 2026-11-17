import { cn } from '@/lib/utils';

// Các sắc độ màu cát nhạt (token muted / secondary)
const TONES = {
  light: 'bg-secondary/45',
  mid: 'bg-secondary/70',
  deep: 'bg-secondary',
} as const;

type ImagePlaceholderProps = {
  /** Mô tả ảnh thật sẽ đặt vào đây. Khi thay bằng <Image>, dùng làm `alt`. */
  label: string;
  tone?: keyof typeof TONES;
  className?: string;
};

/**
 * Khối giữ chỗ cho ảnh, nền màu cát nhạt.
 * Đặt tỉ lệ và bo góc bằng `className` (vd `aspect-4/5 rounded-lg`).
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
