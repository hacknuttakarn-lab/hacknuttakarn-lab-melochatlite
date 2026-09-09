import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteProviders } from '@/components/SiteProviders';

export const metadata: Metadata = {
  title: 'Melo Chat — Meet. Travel. Connect.',
  description:
    'Melo Chat connects people through friendship, relationships, trips, events, communities, partner deals, safety tools, and rewards.',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F9FC' },
    { media: '(prefers-color-scheme: dark)', color: '#090D14' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <SiteProviders>{children}</SiteProviders>
      </body>
    </html>
  );
}
