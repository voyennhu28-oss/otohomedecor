import type { Metadata } from 'next';
import {
  Be_Vietnam_Pro,
  Cormorant_Garamond,
  Geist_Mono,
} from 'next/font/google';

import { Providers } from '@/components/providers';
import { cn } from '@/lib/utils';

import './globals.css';

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
});

const beVietnam = Be_Vietnam_Pro({
  variable: '--font-be-vietnam',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'O The o',
    template: '%s | O The o',
  },
  description: 'Đèn trang trí làm từ vỏ sò, ghép tay từng chiếc.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang='vi'
      className={cn(
        'h-full font-sans antialiased',
        cormorant.variable,
        beVietnam.variable,
        geistMono.variable,
      )}
    >
      <body className='flex min-h-full flex-col'>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
