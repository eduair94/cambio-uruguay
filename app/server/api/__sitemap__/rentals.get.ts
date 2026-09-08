import { loadRentalSitemapUrls } from '../../utils/rentalSitemap'

// Refresh independently from ordinary navigation. A failed refresh throws, so
// it cannot replace a successful cached catalogue with an empty or partial one.
export default defineCachedEventHandler(() => loadRentalSitemapUrls(), {
  name: 'rental-sitemap-urls',
  getKey: () => 'public-catalogue',
  maxAge: 60 * 60,
  swr: true,
})
