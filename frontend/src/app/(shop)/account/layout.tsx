import { AccountNav } from '@/components/layout/account-nav';

// TODO: chặn khách chưa đăng nhập (kiểm tra GET /me ở client, 401 thì chuyển về /sign-in)
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='container mx-auto grid gap-10 px-6 py-12 md:grid-cols-[220px_1fr]'>
      <AccountNav />
      <div>{children}</div>
    </div>
  );
}
