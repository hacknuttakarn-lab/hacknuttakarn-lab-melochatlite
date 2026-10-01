import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Melo Chat',
    short_name: 'Melo Chat',
    description: 'Melo Chat Lite',
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
