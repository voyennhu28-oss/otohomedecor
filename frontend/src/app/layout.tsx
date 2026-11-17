import type { Metadata } from 'next';
import { Geist_Mono, Inter, Oswald } from 'next/font/google';

import { Providers } from '@/components/providers';
import { cn } from '@/lib/utils';

import './globals.css';

// Nội dung: Inter. Tiêu đề: Oswald (chữ cao, hẹp). Cả hai đều có bộ chữ tiếng Việt.
const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'vietnamese'],
});

const oswald = Oswald({
  variable: '--font-display',
  subsets: ['latin', 'vietnamese'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Oto Home Decor',
    template: '%s | Oto Home Decor',
  },
  description: 'Đèn ngủ vỏ sò làm thủ công và đồ trang trí nhỏ.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang='vi'
      className={cn(
        'h-full font-sans antialiased',
        inter.variable,
        oswald.variable,
        geistMono.variable,
      )}
    >
      <body className='flex min-h-full flex-col'>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
