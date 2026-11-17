import { cn } from '@/lib/utils';

/**
 * Quầng sáng của đèn trên nền tối. Chỉ dùng token màu (đen trắng), không thêm màu nhấn:
 * khi có ảnh thật chụp lúc đèn bật, ánh đèn trong ảnh sẽ là màu duy nhất.
 */
export function LampGlow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0', className)}
      style={{
        background:
          'radial-gradient(circle at 50% 58%, color-mix(in oklch, var(--background) 60%, transparent) 0%, color-mix(in oklch, var(--background) 12%, transparent) 22%, transparent 48%)',
      }}
    />
  );
}
