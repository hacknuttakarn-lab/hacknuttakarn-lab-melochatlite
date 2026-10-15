import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://melochat.me';
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/login`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/register`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy-policy`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
