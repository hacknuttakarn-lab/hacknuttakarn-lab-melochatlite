import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/account/', '/settings/', '/support/'],
    },
    sitemap: 'https://melochat.me/sitemap.xml',
    host: 'https://melochat.me',
  };
}
