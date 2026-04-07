import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/'],
    },
    // CRITICAL: Sitemap URL must match the canonical non-www domain
    sitemap: 'https://REMOVED_DOMAIN/sitemap.xml',
  };
}
