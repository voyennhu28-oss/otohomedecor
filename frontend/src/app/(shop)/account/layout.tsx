import { AccountNav } from '@/components/layout/account-nav';
import { AuthGuard } from '@/features/auth/components/auth-guard';

/**
 * Chưa đăng nhập thì AuthGuard chuyển về /sign-in?next=...
 * Giống khu admin: MỖI page.tsx bên dưới phải có `export const instant = false`.
 */
export default function AccountLayout({ children }: LayoutProps<'/account'>) {
  return (
    <AuthGuard>
      <div className='container mx-auto grid gap-10 px-6 py-12 md:grid-cols-[220px_1fr]'>
        <AccountNav />
        <div>{children}</div>
      </div>
    </AuthGuard>
  );
}
