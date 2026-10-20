import { loadAgencySitemapUrls } from '../../utils/agencySitemap'

// Same shape as the rental source: cached apart from navigation, and a failed
// refresh throws so it cannot replace a good cached list with an empty one.
export default defineCachedEventHandler(() => loadAgencySitemapUrls(), {
  name: 'agency-sitemap-urls',
  getKey: () => 'public-directory',
  maxAge: 60 * 60,
  swr: true,
})
