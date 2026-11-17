import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AuthGuard } from '@/features/auth/components/auth-guard';

/** Chỉ cho role "admin" (theo GET /me). Bảo vệ thật nằm ở backend (@AdminOnly). */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard role='admin'>
      <div className='flex min-h-screen flex-1'>
        <AdminSidebar />
        <main className='flex-1 p-6'>{children}</main>
      </div>
    </AuthGuard>
  );
}
