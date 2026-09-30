import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteProviders } from '@/components/SiteProviders';

const themeBootScript = `
(() => {
  try {
    const mode = localStorage.getItem('melo-web-theme-mode');
    const legacy = localStorage.getItem('melo-web-theme');
    const preference = mode === 'light' || mode === 'dark' || mode === 'system'
      ? mode
      : legacy === 'light' || legacy === 'dark'
        ? legacy
        : 'system';
    const theme = preference === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {}
})();
`;

export const metadata: Metadata = {
  title: 'Melo Chat — Dating, Feed & Chat',
  description:
    'Melo Chat helps people discover meaningful relationships, share through Feed, chat with translation, and connect with verified profiles.',
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <SiteProviders>{children}</SiteProviders>
      </body>
    </html>
  );
}
