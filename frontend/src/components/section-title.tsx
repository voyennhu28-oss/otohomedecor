import { cn } from '@/lib/utils';

type SectionTitleProps = {
  /** Phần chữ nghiêng, viết thường (vd "Sản phẩm"). */
  serif: string;
  /** Phần chữ hoa giãn rộng như logo (vd "nổi bật"). */
  caps: string;
  as?: 'h1' | 'h2' | 'h3';
  /** Xếp 2 phần thành 2 dòng thay vì cùng một dòng. */
  stacked?: boolean;
  id?: string;
  className?: string;
};

/**
 * Tiêu đề ghép 2 cách viết của cùng font Cormorant: nghiêng thường + chữ hoa giãn rộng
 * (nhỏ hơn một chút để 2 phần cân thị giác). Cỡ chữ đặt qua `className`.
 */
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
