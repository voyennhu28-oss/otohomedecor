import type { Metadata } from 'next';

import { AdminShell } from '@/components/layout/admin-shell';
import { AuthGuard } from '@/features/auth/components/auth-guard';

export const metadata: Metadata = {
  title: { default: 'Quản trị', template: '%s | Quản trị O The o' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <AuthGuard role='admin'>
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}
