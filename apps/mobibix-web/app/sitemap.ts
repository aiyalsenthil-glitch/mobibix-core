import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://REMOVED_DOMAIN';
  const now = new Date();

  const routes: MetadataRoute.Sitemap = [
    // ── Core Public Pages ──────────────────────────────
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/features`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

    // ── Feature Deep-Dives ─────────────────────────────
    { url: `${baseUrl}/features/job-cards`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/features/whatsapp-notifications`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/features/inventory`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/features/gst-billing`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/features/multi-shop`, lastModified: now, changeFrequency: 'monthly', priority: 0.80 },
    { url: `${baseUrl}/features/crm`, lastModified: now, changeFrequency: 'monthly', priority: 0.80 },

    // ── Regional Landing Pages ─────────────────────────
    { url: `${baseUrl}/regions/india`, lastModified: now, changeFrequency: 'monthly', priority: 0.90 },
    { url: `${baseUrl}/regions/uae`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/regions/saudi-arabia`, lastModified: now, changeFrequency: 'monthly', priority: 0.82 },
    { url: `${baseUrl}/regions/malaysia`, lastModified: now, changeFrequency: 'monthly', priority: 0.80 },
    { url: `${baseUrl}/regions/indonesia`, lastModified: now, changeFrequency: 'monthly', priority: 0.78 },

    // ── Comparison Pages ───────────────────────────────
    { url: `${baseUrl}/compare/repairdesk`, lastModified: now, changeFrequency: 'monthly', priority: 0.88 },
    { url: `${baseUrl}/compare/repairshopr`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/compare/fixably`, lastModified: now, changeFrequency: 'monthly', priority: 0.80 },
    { url: `${baseUrl}/compare/vyapar`, lastModified: now, changeFrequency: 'monthly', priority: 0.80 },
    { url: `${baseUrl}/compare/khatabook`, lastModified: now, changeFrequency: 'monthly', priority: 0.78 },
    { url: `${baseUrl}/compare/tally`, lastModified: now, changeFrequency: 'monthly', priority: 0.78 },
    { url: `${baseUrl}/compare/busy`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },

    // ── Legal & Auth ───────────────────────────────────
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/cancellation-and-refund`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/contact-us`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/shipping-and-exchange`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/support/kb`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  return routes;
}
