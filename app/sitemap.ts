import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://oriastudio.ai',
      changeFrequency: 'monthly',
      priority: 1,
    },
    { url: 'https://oriastudio.ai/privacy', changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://oriastudio.ai/terms', changeFrequency: 'yearly', priority: 0.3 },
  ]
}
