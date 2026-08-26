import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://oriastudio.ai',
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
