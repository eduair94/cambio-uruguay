// app/composables/useAdFree.ts
//
// Who sees ads on this page view, and the account's ad-free period. The decision itself lives in
// plugins/ad-free.client.ts; this is the shared state and the one request that refreshes it.
import {
  AD_FREE_HINT_KEY,
  isAdFreeActive,
  parseHint,
  type AdFreeCurrency,
  type AdFreeHint,
  type AdFreeProvider,
  type DonationStatus,
  type ViewerStatus,
} from '~/utils/adFree'

export interface AdFreeSummary {
  active: boolean
  until: string | null
  donations: {
    provider: AdFreeProvider
    amount: number
    currency: AdFreeCurrency
    status: DonationStatus
    approvedAt: string | null
    createdAt: string
  }[]
}

/**
 * `unknown` during SSR, hydration and while a signed-in visitor waits for the server; then `ads`
 * or `free`. The AdSense loader waits for `ads` (app.vue); manual units and the sponsored row hide
 * only on `free` (utils/adFree.ts → viewerShowsAds).
 */
export function useAdFreeViewer() {
  return useState<ViewerStatus>('cu_adfree_viewer', () => 'unknown')
}

export function readAdFreeHint(): AdFreeHint | null {
  if (!import.meta.client) return null
  try {
    return parseHint(window.localStorage.getItem(AD_FREE_HINT_KEY))
  } catch {
    return null
  }
}

export function writeAdFreeHint(hint: AdFreeHint | null): void {
  if (!import.meta.client) return
  try {
    if (hint) window.localStorage.setItem(AD_FREE_HINT_KEY, JSON.stringify(hint))
    else window.localStorage.removeItem(AD_FREE_HINT_KEY)
  } catch {
    // Storage blocked (private window): the decision just is not remembered between pages.
  }
}

export function useAdFree() {
  const viewer = useAdFreeViewer()
  const summary = useState<AdFreeSummary | null>('cu_adfree_summary', () => null)
  const store = useAuthStore()
  const { authFetch } = useAuthFetch()

  /**
   * Ask the server about the signed-in account, store the hint and settle `viewer`. Returns null
   * when nobody is signed in or the request failed; on a failure a donor's hint is left alone.
   */
  async function refresh(): Promise<AdFreeSummary | null> {
    const token = await store.getToken()
    const uid = store.user?.uid
    if (!token || !uid) {
      writeAdFreeHint(null)
      summary.value = null
      viewer.value = 'ads'
      return null
    }
    try {
      const fresh = await authFetch<AdFreeSummary>('/api/me/ad-free')
      summary.value = fresh
      writeAdFreeHint({ uid, until: fresh.until, checkedAt: new Date().toISOString() })
      viewer.value = isAdFreeActive(fresh.until) ? 'free' : 'ads'
      return fresh
    } catch {
      const hint = readAdFreeHint()
      if (!(hint && hint.uid === uid && isAdFreeActive(hint.until))) viewer.value = 'ads'
      return null
    }
  }

  return { viewer, summary, refresh }
}
