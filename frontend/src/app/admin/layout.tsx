import { AdminSidebar } from '@/components/layout/admin-sidebar';

// TODO: chỉ cho role "admin" (kiểm tra GET /me ở client). Bảo vệ thật nằm ở backend (@AdminOnly)
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='flex min-h-screen flex-1'>
      <AdminSidebar />
      <main className='flex-1 p-6'>{children}</main>
    </div>
  );
}
