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

const siteUrl = 'https://melochat.me';
const seoTitle = 'Melo Chat — พบเจอ จับคู่ แชท และเชื่อมต่อ';
const seoDescription = 'Melo Chat เว็บไซต์หาคู่และสร้างความสัมพันธ์ ค้นหาคนใหม่ จับคู่ ดูฟีดและโพสต์ แชทพร้อมแปลภาษา และเพิ่มความน่าเชื่อถือด้วยการยืนยันตัวตน';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Melo Chat',
  title: {
    default: seoTitle,
    template: '%s | Melo Chat',
  },
  description: seoDescription,
  keywords: [
    'Melo Chat',
    'เว็บหาคู่',
    'หาคู่',
    'แอปหาคู่',
    'dating',
    'match',
    'chat',
    'แชทแปลภาษา',
    'verified profile',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Melo Chat',
    title: seoTitle,
    description: seoDescription,
    locale: 'th_TH',
    images: [
      {
        url: '/icon.png',
        width: 512,
        height: 512,
        alt: 'Melo Chat',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: seoTitle,
    description: seoDescription,
    images: ['/icon.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Melo Chat',
    statusBarStyle: 'default',
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

const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Melo Chat',
  url: siteUrl,
  description: seoDescription,
  inLanguage: ['th', 'en', 'de'],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
      </head>
      <body>
        <SiteProviders>{children}</SiteProviders>
      </body>
    </html>
  );
}
