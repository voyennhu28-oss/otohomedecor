import { cn } from '@/lib/utils';

/** Lỗi chung của form (không thuộc riêng ô nào), vd "Email hoặc mật khẩu không đúng". */
export function FormAlert({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role='alert'
      className={cn(
        'border-l-2 border-destructive py-1 pl-3 text-sm text-destructive',
        className,
      )}
    >
      {children}
    </div>
  );
}
