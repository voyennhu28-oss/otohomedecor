import type { Metadata } from 'next';

import { AdminShell } from '@/components/layout/admin-shell';
import { AuthGuard } from '@/features/auth/components/auth-guard';

export const metadata: Metadata = {
  title: { default: 'Quản trị', template: '%s | Quản trị O The o' },
  robots: { index: false, follow: false },
};

/**
 * Chỉ cho role "admin" (theo GET /me). Bảo vệ thật nằm ở backend (@AdminOnly).
 * AuthGuard chỉ render trang sau khi có /me ở trình duyệt, nên MỖI page.tsx bên dưới phải có
 * `export const instant = false` (đặt ở layout không áp xuống page; thiếu thì Next báo "dropped segment").
 */
export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <AuthGuard role='admin'>
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}
