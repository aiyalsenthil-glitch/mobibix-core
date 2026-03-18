import { MetadataRoute } from 'next';
import { getAllPosts } from '../lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://REMOVED_DOMAIN';
  const now = new Date();

  // 1. Core Pages
  const coreRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/features`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/contact-us`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/partner`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];

  // 3. Regional Landing Pages
  const regionRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/regions`, lastModified: now, changeFrequency: 'monthly', priority: 0.80 },
    { url: `${baseUrl}/regions/india`, lastModified: now, changeFrequency: 'monthly', priority: 0.90 },
    { url: `${baseUrl}/regions/uae`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/regions/saudi-arabia`, lastModified: now, changeFrequency: 'monthly', priority: 0.82 },
    { url: `${baseUrl}/regions/malaysia`, lastModified: now, changeFrequency: 'monthly', priority: 0.80 },
    { url: `${baseUrl}/regions/indonesia`, lastModified: now, changeFrequency: 'monthly', priority: 0.78 },
  ];

  // 4. Comparison Pages
  const comparisonRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/compare`, lastModified: now, changeFrequency: 'monthly', priority: 0.70 },
    { url: `${baseUrl}/compare/repairdesk`, lastModified: now, changeFrequency: 'monthly', priority: 0.88 },
    { url: `${baseUrl}/compare/repairshopr`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/compare/fixably`, lastModified: now, changeFrequency: 'monthly', priority: 0.80 },
    { url: `${baseUrl}/compare/vyapar`, lastModified: now, changeFrequency: 'monthly', priority: 0.80 },
    { url: `${baseUrl}/compare/khatabook`, lastModified: now, changeFrequency: 'monthly', priority: 0.78 },
    { url: `${baseUrl}/compare/tally`, lastModified: now, changeFrequency: 'monthly', priority: 0.78 },
    { url: `${baseUrl}/compare/busy`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
  ];

  // 5. City Landing Pages (Dynamic/Bulk generation)
  const cities = [
    'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai', 'kolkata', 'pune', 'ahmedabad',
    'jaipur', 'surat', 'lucknow', 'nagpur', 'indore', 'bhopal', 'visakhapatnam', 'patna',
    'vadodara', 'ludhiana', 'nashik', 'coimbatore', 'kochi', 'chandigarh'
  ];
  const cityRoutes: MetadataRoute.Sitemap = cities.map(city => ({
    url: `${baseUrl}/locations/${city}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8
  }));

  // 6. Blog Posts (Dynamic)
  const posts = getAllPosts();
  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // 7. Legal & Auth
  const legalRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/cancellation-and-refund`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/shipping-and-exchange`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/data-deletion`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  return [
    ...coreRoutes,
    ...regionRoutes,
    ...comparisonRoutes,
    ...cityRoutes,
    ...blogRoutes,
    ...legalRoutes
  ];
}
