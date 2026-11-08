// Whether the visitor is in the strict consent region (the EEA, the United Kingdom, Switzerland),
// for the scripts the site loads itself. gtag learns it on its own (`consent default` with
// `region`); Microsoft Clarity needs the answer before it loads, and only for a visitor who has
// not chosen yet (plugins/clarity.client.ts asks once per tab and keeps the answer).
//
// The country is Cloudflare's `cf-ipcountry`. Unknown (`XX`), Tor (`T1`) or no header at all (a
// request that did not come through Cloudflare, local development) count as strict: when the
// country cannot be told, the visitor waits for "Aceptar".
//
// `private, no-store`: the answer differs per visitor, so neither Cloudflare nor the browser may
// keep it. The edge cache bypasses any response without `s-maxage` (server/plugins/edge-cache.ts),
// and this one never carries it.
import { strictConsentCountry } from '../../utils/clarityPolicy'

export default defineEventHandler(event => {
  setResponseHeaders(event, {
    'cache-control': 'private, no-store',
    'x-robots-tag': 'noindex',
  })
  return { strict: strictConsentCountry(getRequestHeader(event, 'cf-ipcountry')) }
})
