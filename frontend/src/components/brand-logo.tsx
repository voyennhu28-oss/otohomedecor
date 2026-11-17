import Image from 'next/image';

import { cn } from '@/lib/utils';

// public/images/oto_logo.png: 978 × 385, nền trong suốt
const LOGO = { src: '/images/oto_logo.png', width: 978, height: 385 };

type BrandLogoProps = {
  /** Chiều cao đặt qua class (vd `h-12`), chiều rộng tự theo tỉ lệ. */
  className?: string;
  /** Độ rộng hiển thị để trình duyệt chọn đúng kích thước ảnh (vd "160px"). */
  sizes: string;
  /** Logo nằm ở màn hình đầu (header): tải ngay, không chờ cuộn tới. */
  eager?: boolean;
};

/** Logo cửa hàng O The o (dạng ảnh, nền trong suốt). Trên nền tối nên để cỡ lớn vì chữ nâu hơi chìm. */
export function BrandLogo({ className, sizes, eager = false }: BrandLogoProps) {
  return (
    <Image
      src={LOGO.src}
      alt='O The o'
      width={LOGO.width}
      height={LOGO.height}
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      className={cn('h-12 w-auto', className)}
    />
  );
}
