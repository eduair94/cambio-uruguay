import {
  normalizeRentalAlertFilters,
  type RentalAlertSubscription,
  type RentalAlertCapabilities,
  type RentalAlertsResponse,
} from '~/utils/rentalAlerts'

type AlertKind = 'rental-search' | 'rental-opportunity'
export interface RentalAlertDraft {
  kind: AlertKind
  filters: Record<string, unknown>
  channels: { push: boolean; email: boolean }
  frequency: 'hourly' | 'daily'
  name: string
  locale: 'es' | 'en' | 'pt'
  origin: string
  savedAt: number
  editingId?: string
  ownerUid?: string
  activateOnSave?: boolean
}
const STORAGE_KEY = 'cu_rental_alert_draft_v1'
const MAX_AGE = 24 * 60 * 60 * 1000

export function rentalAlertErrorCode(error: unknown): string {
  const e = error as { data?: { data?: { code?: string }; code?: string }; statusCode?: number }
  return (
    e?.data?.data?.code ||
    e?.data?.code ||
    (e?.statusCode === 401 ? 'auth_required' : 'temporarily_unavailable')
  )
}

export function useRentalAlerts() {
  const { authFetch } = useAuthFetch()
  const auth = useAuthStore()
  const { locale } = useI18n()
  const route = useRoute()
  const open = useState('rental-alert-dialog', () => false)
  const draft = useState<RentalAlertDraft | null>('rental-alert-draft', () => null)
  const items = useState<RentalAlertSubscription[]>('rental-alert-items', () => [])
  const capabilities = useState<RentalAlertCapabilities | null>(
    'rental-alert-capabilities',
    () => null
  )
  const owner = useState<string | null>('rental-alert-owner', () => null)
  const pending = useState('rental-alert-pending', () => false)
  const loadError = useState('rental-alert-load-error', () => '')
  const storageFailed = useState('rental-alert-storage-error', () => false)
  const limit = useState('rental-alert-limit', () => 10)
  const waitingForLogin = useState('rental-alert-waiting-login', () => false)
  const revision = useState('rental-alert-load-revision', () => 0)
  const returnFocusId = useState('rental-alert-return-focus', () => '')

  function persist() {
    if (!import.meta.client) return
    try {
      if (draft.value)
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, draft: draft.value }))
      else sessionStorage.removeItem(STORAGE_KEY)
      storageFailed.value = false
    } catch {
      storageFailed.value = true
    }
  }
  function recover() {
    if (!import.meta.client || draft.value) return
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw || raw.length > 12000) return
      const stored = JSON.parse(raw)
      const value = stored?.draft
      if (
        stored?.version !== 1 ||
        !value ||
        !['rental-search', 'rental-opportunity'].includes(value.kind) ||
        !Number.isFinite(value.savedAt) ||
        Date.now() - value.savedAt > MAX_AGE ||
        value.savedAt > Date.now() + 60000 ||
        !value.filters ||
        typeof value.filters !== 'object' ||
        Array.isArray(value.filters) ||
        !['hourly', 'daily'].includes(value.frequency) ||
        !['es', 'en', 'pt'].includes(value.locale) ||
        typeof value.origin !== 'string' ||
        !value.origin.startsWith('/') ||
        value.origin.startsWith('//')
      )
        return
      if (typeof value.editingId === 'string') {
        if (!auth.ready) return
        if (value.ownerUid !== auth.user?.uid) {
          sessionStorage.removeItem(STORAGE_KEY)
          return
        }
      }
      draft.value = {
        kind: value.kind,
        filters: value.filters,
        frequency: value.frequency,
        locale: value.locale,
        channels: { push: value.channels?.push === true, email: value.channels?.email === true },
        name: typeof value.name === 'string' ? value.name.slice(0, 80) : '',
        origin: value.origin,
        savedAt: value.savedAt,
        ...(typeof value.editingId === 'string'
          ? {
              editingId: value.editingId,
              ownerUid: value.ownerUid,
              activateOnSave: value.activateOnSave === true,
            }
          : {}),
      }
    } catch {
      /* A malformed local draft never blocks the search. */
    }
  }
  function begin(kind: AlertKind, filters: Record<string, unknown>) {
    const matchingFilters = normalizeRentalAlertFilters(kind, filters)
    if (import.meta.client) returnFocusId.value = document.activeElement?.id || ''
    draft.value = {
      kind,
      filters: JSON.parse(JSON.stringify(matchingFilters)),
      channels: { push: false, email: false },
      frequency: 'hourly',
      name: '',
      locale: locale.value.startsWith('en') ? 'en' : locale.value.startsWith('pt') ? 'pt' : 'es',
      origin: route.fullPath,
      savedAt: Date.now(),
    }
    persist()
    open.value = true
  }
  function edit(item: RentalAlertSubscription, activateOnSave = false) {
    begin(item.kind, item.filters)
    Object.assign(draft.value!, {
      editingId: item.id,
      ownerUid: auth.user?.uid,
      name: item.name,
      frequency: item.frequency,
      channels: { ...item.channels },
      locale: item.locale,
      activateOnSave,
    })
    persist()
  }
  function discard() {
    draft.value = null
    waitingForLogin.value = false
    persist()
  }
  function signIn() {
    persist()
    waitingForLogin.value = true
    open.value = false
    auth.openDialog()
  }
  async function refresh(): Promise<boolean> {
    if (!auth.user) {
      capabilities.value = null
      items.value = []
      return false
    }
    const uid = auth.user.uid
    const request = ++revision.value
    pending.value = true
    loadError.value = ''
    try {
      const result = await authFetch<RentalAlertsResponse>('/api/me/rental-alerts')
      if (request !== revision.value || auth.user?.uid !== uid) return false
      items.value = result.items
      capabilities.value = result.capabilities
      limit.value = result.limit
      owner.value = uid
      return true
    } catch (error) {
      if (request === revision.value) {
        loadError.value = rentalAlertErrorCode(error)
        capabilities.value = null
      }
      return false
    } finally {
      if (request === revision.value) pending.value = false
    }
  }
  async function save() {
    if (!draft.value) throw new Error('Missing alert draft')
    const value = draft.value
    if (value.editingId && value.ownerUid !== auth.user?.uid) throw accountChanged()
    const result = value.editingId
      ? await mutate<{ item: RentalAlertSubscription }>(
          `/api/me/rental-alerts/${encodeURIComponent(value.editingId)}`,
          {
            method: 'PATCH',
            body: {
              name: value.name,
              frequency: value.frequency,
              channels: value.channels,
              ...(value.activateOnSave ? { active: true } : {}),
            },
          }
        )
      : await mutate<{ item: RentalAlertSubscription; alreadyExists: boolean }>(
          '/api/me/rental-alerts',
          {
            method: 'POST',
            body: {
              kind: value.kind,
              filters: value.filters,
              name: value.name,
              channels: value.channels,
              frequency: value.frequency,
              locale: value.locale,
            },
          }
        )
    items.value = [...items.value.filter(item => item.id !== result.item.id), result.item]
    if (draft.value === value) discard()
    return result
  }
  async function setActive(item: RentalAlertSubscription, active: boolean) {
    const result = await mutate<{ item: RentalAlertSubscription }>(
      `/api/me/rental-alerts/${encodeURIComponent(item.id)}`,
      { method: 'PATCH', body: { active } }
    )
    items.value = items.value.map(row => (row.id === item.id ? result.item : row))
  }
  async function remove(item: RentalAlertSubscription) {
    await mutate(`/api/me/rental-alerts/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
    items.value = items.value.filter(row => row.id !== item.id)
  }
  function accountChanged() {
    return Object.assign(new Error('Account changed'), { data: { code: 'auth_required' } })
  }
  async function mutate<T>(url: string, options: Parameters<typeof $fetch>[1]): Promise<T> {
    const uid = auth.user?.uid
    if (!uid) throw accountChanged()
    const token = await auth.getToken()
    if (!token || auth.user?.uid !== uid) throw accountChanged()
    const result = await $fetch<T>(url, {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (auth.user?.uid !== uid) throw accountChanged()
    return result as T
  }
  watch(
    () => auth.user?.uid,
    uid => {
      if (owner.value !== (uid ?? null)) {
        ++revision.value
        owner.value = uid ?? null
        items.value = []
        capabilities.value = null
        loadError.value = ''
        pending.value = false
      }
      if (draft.value?.editingId && draft.value.ownerUid !== uid) {
        discard()
        open.value = false
      }
      if (uid && !draft.value) recover()
    }
  )
  return {
    open,
    draft,
    items,
    capabilities,
    pending,
    loadError,
    limit,
    storageFailed,
    waitingForLogin,
    returnFocusId,
    begin,
    edit,
    discard,
    recover,
    persist,
    signIn,
    refresh,
    save,
    setActive,
    remove,
  }
}
