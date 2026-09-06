import {
  rentalAvailabilityAdvertId,
  type RentalAvailabilityAdvert,
  type RentalAvailabilityMutation,
  type RentalAvailabilityOwnState,
  type RentalAvailabilitySummary,
} from '~/utils/rentalAvailability'

export function rentalAvailabilityErrorCode(error: unknown): string {
  const value = error as { data?: { code?: string; data?: { code?: string } }; statusCode?: number }
  return (
    value?.data?.data?.code ||
    value?.data?.code ||
    (value?.statusCode === 401 ? 'auth_required' : 'temporarily_unavailable')
  )
}

export function useRentalAvailability() {
  const auth = useAuthStore()
  const revision = useState<number>('rental-availability-revision', () => 0)
  const activeDialog = useState<string | null>('rental-availability-dialog', () => null)
  const owner = useState<string | null>('rental-availability-owner', () => null)
  const own = useState<Record<string, RentalAvailabilityOwnState>>(
    'rental-availability-own',
    () => ({})
  )
  const summaries = useState<Record<string, RentalAvailabilitySummary>>(
    'rental-availability-summaries',
    () => ({})
  )
  const busy = useState<Record<string, boolean>>('rental-availability-busy', () => ({}))
  const currentKeys = useState<Record<string, string | null>>(
    'rental-availability-current-keys',
    () => ({})
  )
  watch(
    () => auth.user?.uid,
    uid => {
      if (owner.value !== (uid || null)) {
        owner.value = uid || null
        own.value = {}
      }
    },
    { immediate: true }
  )

  const key = (advert: RentalAvailabilityAdvert) =>
    rentalAvailabilityAdvertId(advert.source, advert.listingId) || ''
  const changedAccount = () =>
    Object.assign(new Error('Account changed'), { data: { code: 'auth_required' } })
  function syncSummaries(
    offers: (RentalAvailabilityAdvert & { availability?: RentalAvailabilitySummary })[]
  ) {
    for (const offer of offers) {
      const id = key(offer)
      if (id && offer.availability) summaries.value[id] = offer.availability
    }
  }
  async function privateFetch<T>(uid: string, options: Parameters<typeof $fetch>[1]): Promise<T> {
    const token = await auth.getToken()
    if (!token || auth.user?.uid !== uid) throw changedAccount()
    const result = await $fetch<T>('/api/me/rental-availability', {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      timeout: 15000,
    })
    if (auth.user?.uid !== uid) throw changedAccount()
    return result as T
  }

  async function inspect(advert: RentalAvailabilityAdvert) {
    const id = key(advert),
      uid = auth.user?.uid
    const identity = { source: advert.source, listingId: advert.listingId }
    if (!id)
      throw Object.assign(new Error('Invalid advert'), { data: { code: 'advert_unavailable' } })
    const publicRequest = $fetch<{
      summary: RentalAvailabilitySummary
      currentPropertyKey: string | null
    }>('/api/rentals/availability', {
      query: identity,
      cache: 'no-store',
      timeout: 15000,
    }).then(result => {
      summaries.value[id] = result.summary
      currentKeys.value[id] = result.currentPropertyKey
    })
    const privateRequest = uid
      ? privateFetch<RentalAvailabilityOwnState>(uid, { query: identity }).then(result => {
          if (auth.user?.uid !== uid) throw changedAccount()
          own.value[id] = result
        })
      : Promise.resolve()
    await Promise.all([publicRequest, privateRequest])
  }

  async function submit(advert: RentalAvailabilityAdvert, withdraw: boolean) {
    const id = key(advert),
      uid = auth.user?.uid,
      current = own.value[id]
    if (!uid || !current) throw changedAccount()
    if (busy.value[id]) return
    busy.value[id] = true
    try {
      const payload = {
        source: advert.source,
        listingId: advert.listingId,
        revision: current.revision,
      }
      const result = await privateFetch<RentalAvailabilityMutation>(uid, {
        method: withdraw ? 'DELETE' : 'POST',
        ...(withdraw ? { query: payload } : { body: payload }),
        cache: 'no-store',
        timeout: 15000,
      })
      if (auth.user?.uid !== uid) throw changedAccount()
      own.value[id] = {
        ...current,
        reported: result.reported,
        expiresAt: result.expiresAt,
        revision: result.revision,
      }
      summaries.value[id] = result.summary
      revision.value = Math.max(Date.now(), revision.value + 1)
      return result
    } catch (error) {
      if (rentalAvailabilityErrorCode(error) === 'report_changed')
        await inspect(advert).catch(() => {})
      throw error
    } finally {
      busy.value[id] = false
    }
  }

  function withRevision<T extends Record<string, unknown>>(
    query: T
  ): T & { availabilityRevision?: number } {
    return { ...query, ...(revision.value ? { availabilityRevision: revision.value } : {}) }
  }

  // An active report dialog keeps its context if the new report hides its card.
  function watchChanges(refresh: () => unknown) {
    let seen = revision.value
    watch([revision, activeDialog], () => {
      if (!activeDialog.value && revision.value !== seen) {
        seen = revision.value
        void refresh()
      }
    })
  }

  return {
    auth,
    revision,
    activeDialog,
    own,
    summaries,
    currentKeys,
    syncSummaries,
    busy,
    key,
    inspect,
    submit,
    withRevision,
    watchChanges,
  }
}
