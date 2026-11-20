import {
  ENGAGEMENT_DISMISS_KEY,
  ENGAGEMENT_SESSION_KEY,
  mayShowFollowUp,
  type FollowUpKind,
} from '~/utils/engagement'
import { CAPTURE_DISMISS_KEY } from '~/utils/capture'
import { observeFirstImpression } from '~/utils/newsletterFunnel'

/** A shared attention budget, claimed by visibility rather than by mounting below the fold. */
export function useEngagementPrompt(kind: FollowUpKind) {
  const route = useRoute()
  const track = useTrack()
  const memory = useState('followup-memory', () => ({
    seen: false,
    dismissedAt: null as string | null,
  }))
  const allowed = ref(false)
  const impressed = ref(false)
  const element = ref<HTMLElement | null>(null)
  let stopObserving: (() => void) | null = null

  function reset() {
    impressed.value = false
    let seen = memory.value.seen
    let dismissedAt = memory.value.dismissedAt
    try {
      seen ||= sessionStorage.getItem(ENGAGEMENT_SESSION_KEY) === '1'
      // Honour the old newsletter refusal as well as the shared preference.
      const dates = [
        dismissedAt,
        localStorage.getItem(ENGAGEMENT_DISMISS_KEY),
        localStorage.getItem(CAPTURE_DISMISS_KEY),
      ]
        .map(Number)
        .filter(n => Number.isFinite(n) && n > 0)
      dismissedAt = dates.length ? String(Math.max(...dates)) : null
    } catch {
      // The in-memory budget still applies if browser storage is unavailable.
    }
    memory.value = { seen, dismissedAt }
    allowed.value = mayShowFollowUp({ seen, dismissedAt, now: Date.now() })
  }

  function report() {
    if (impressed.value || !allowed.value) return
    // Observers can fire in the same turn, before Vue flushes shared-state watchers.
    // Claim synchronously so only one instance owns this session's invitation.
    if (!mayShowFollowUp({ ...memory.value, now: Date.now() })) {
      allowed.value = false
      return
    }
    impressed.value = true
    memory.value.seen = true
    try {
      sessionStorage.setItem(ENGAGEMENT_SESSION_KEY, '1')
    } catch {
      /* Keep the in-memory budget. */
    }
    track('followup_view', { prompt_kind: kind, content_path: route.path })
  }

  function dismiss() {
    const now = String(Date.now())
    memory.value.dismissedAt = now
    allowed.value = false
    try {
      localStorage.setItem(ENGAGEMENT_DISMISS_KEY, now)
    } catch {
      /* Keep the refusal for this session. */
    }
    track('followup_dismiss', { prompt_kind: kind, content_path: route.path })
  }

  function engage(action: string) {
    report()
    track('followup_action', { prompt_kind: kind, action, content_path: route.path })
  }

  function observe(el: HTMLElement | null) {
    stopObserving?.()
    stopObserving = el ? observeFirstImpression(el, report) : null
  }
  watch(element, observe)
  watch(
    () => memory.value.dismissedAt,
    value => {
      if (!mayShowFollowUp({ seen: false, dismissedAt: value, now: Date.now() }))
        allowed.value = false
    }
  )
  watch(
    () => memory.value.seen,
    seen => {
      if (seen && !impressed.value) allowed.value = false
    }
  )
  watch(
    () => route.path,
    () => {
      stopObserving?.()
      reset()
      nextTick(() => observe(element.value))
    }
  )
  function onStorage(event: StorageEvent) {
    if (event.key === ENGAGEMENT_DISMISS_KEY || event.key === CAPTURE_DISMISS_KEY) reset()
  }
  onMounted(() => {
    reset()
    window.addEventListener('storage', onStorage)
  })
  onBeforeUnmount(() => {
    stopObserving?.()
    window.removeEventListener('storage', onStorage)
  })
  return { allowed, element, dismiss, engage }
}
