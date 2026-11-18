'use client';

import { useState } from 'react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

import { AdminSidebar } from './admin-sidebar';
import { AdminTopbar } from './admin-topbar';

const SIDEBAR_COOKIE = 'sidebar_state';

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
          <div className='w-full max-w-screen-2xl flex-1 px-4 py-8 md:px-6'>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
