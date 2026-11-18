'use client';

import { useState } from 'react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

import { AdminSidebar } from './admin-sidebar';
import { AdminTopbar } from './admin-topbar';

// Cookie do SidebarProvider tự ghi mỗi lần đóng / mở
const SIDEBAR_COOKIE = 'sidebar_state';

/**
 * Mở / thu gọn lần trước. Shell chỉ render ở client (nằm sau AuthGuard, chờ GET /me),
 * nên đọc cookie ngay lúc khởi tạo state mà không lệch với HTML từ server.
 */
function readSidebarOpen() {
  if (typeof document === 'undefined') return true;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${SIDEBAR_COOKIE}=([^;]*)`),
  );
  return match ? match[1] !== 'false' : true;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [defaultOpen] = useState(readSidebarOpen);

  return (
    <TooltipProvider delay={300}>
      <SidebarProvider defaultOpen={defaultOpen} className='flex-1'>
        <AdminSidebar />
        <SidebarInset className='min-w-0'>
          <AdminTopbar />
          <div className='flex-1 px-4 py-6 md:px-6 lg:px-8'>{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
