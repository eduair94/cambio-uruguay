export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.siteUrl

  const robotsTxt = `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml

# Disallow sensitive areas
Disallow: /api/
Disallow: /_nuxt/
Disallow: /.nuxt/

# SEO optimization
Crawl-delay: 1`

  setHeader(event, 'content-type', 'text/plain')
  return robotsTxt
})
