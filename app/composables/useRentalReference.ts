// app/composables/useRentalReference.ts
import {
  hasRentalReferenceQuery,
  readStoredRentalReference,
  rentalReferenceFromHistoryState,
  rentalReferenceFromQuery,
  rentalReferenceHistoryState,
  sameRentalReference,
  withoutRentalReferenceQuery,
  writeStoredRentalReference,
  type RentalReference,
} from '~/utils/rentalReference'

function tabStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

/**
 * The directory's reference point as session state, never in the URL (see utils/rentalReference.ts
 * for why). It is read from, in order: the current history entry (Back, Forward and a reload replay
 * what that entry showed), then what this tab last showed (`useState` across client navigation,
 * sessionStorage across reloads).
 *
 * The server never knows the point, so it renders without it; the client takes it in onMounted,
 * after hydration, and the list re-sorts there. An old link that still carries refLat/refLng/
 * refLabel is honoured once (the server reads it like any query) and then replaced by the same
 * address without them.
 */
export function useRentalReference() {
  const route = useRoute()
  const router = useRouter()
  const nuxtApp = useNuxtApp()
  const remembered = useState<RentalReference | null>('rental-reference', () => null)
  // Off on the server and while hydrating, so the first client render matches the server's.
  // On a client navigation into the page it is on from the start: the first request has the point.
  const ready = ref(import.meta.client && !nuxtApp.isHydrating)
  // history.state is not reactive. A route change re-reads it; this also re-reads it after a
  // navigation made here, even one whose route object did not change.
  const revision = ref(0)

  const reference = computed<RentalReference | null>(() => {
    void route.fullPath
    void revision.value
    // An old link's point, while it is still in the address bar, is what the server rendered.
    const linked = rentalReferenceFromQuery(route.query)
    if (linked) return linked
    if (!ready.value || typeof window === 'undefined') return remembered.value
    const own = rentalReferenceFromHistoryState(window.history.state)
    return own === undefined ? remembered.value : own
  })

  // What is shown is what the tab remembers: Back to an older point makes that one the current.
  watch(reference, next => {
    if (!ready.value) return
    if (!sameRentalReference(remembered.value, next)) remembered.value = next
    writeStoredRentalReference(tabStorage(), next)
  })

  /**
   * Navigates to `location`, whose query must NOT carry the point, with `next` as the new entry's
   * point. Changing only the point is a navigation of its own (forced when the address does not
   * change), so Back undoes it, as it did when the point lived in the URL.
   */
  async function navigate(
    location: { query: Record<string, string> },
    next: RentalReference | null
  ) {
    const force = !sameRentalReference(next, reference.value)
    try {
      return await router.push({ ...location, state: rentalReferenceHistoryState(next), force })
    } finally {
      revision.value++
    }
  }

  onMounted(() => {
    const legacy = hasRentalReferenceQuery(route.query)
    const linked = legacy ? rentalReferenceFromQuery(route.query) : null
    // A point in the link wins over the one this tab remembered: it is what the server rendered.
    if (linked) remembered.value = linked
    else if (!remembered.value) remembered.value = readStoredRentalReference(tabStorage())
    ready.value = true
    if (!legacy) return
    // Out of the address bar as soon as the client runs. The first page view of an old link may
    // still carry it; GA4's query redaction is the second layer for that one hit.
    void router
      .replace({
        query: withoutRentalReferenceQuery(route.query),
        hash: route.hash,
        ...(linked ? { state: rentalReferenceHistoryState(linked) } : {}),
      })
      .finally(() => {
        revision.value++
      })
  })

  return { reference, navigate }
}
