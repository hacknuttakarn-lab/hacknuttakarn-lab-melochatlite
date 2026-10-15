import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Melo Chat',
    short_name: 'Melo Chat',
    description: 'เว็บหาคู่และสร้างความสัมพันธ์ พร้อม Feed, Match, Chat, การแปลภาษา และการยืนยันตัวตน',
    start_url: '/account',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#16a6a0',
    icons: [
      { src: '/melo-logo.png', sizes: '192x192', type: 'image/png' },
      { src: '/melo-logo.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
