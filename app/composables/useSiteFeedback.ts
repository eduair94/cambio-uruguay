// Browser side of the site-wide feedback (utils/siteFeedback.ts): the memory of what this browser
// already answered (localStorage, never sent), a random per-browser id and the POST itself.
import { useTheme } from 'vuetify'
import {
  EMPTY_MEMORY,
  parseMemory,
  rememberAnswer,
  type FeedbackMemory,
  type FeedbackTech,
} from '~/utils/siteFeedback'

const MEMORY_KEY = 'cu_feedback_v1'
const CLIENT_KEY = 'cu_feedback_client'

export interface FeedbackPayload {
  kind: 'suggestion' | 'bug' | 'praise' | 'helpful'
  helpful?: 'yes' | 'no'
  message?: string
  email?: string
  includeTech?: boolean
  /** Honeypot value; always empty for a person. */
  website?: string
}

function storage(): Storage | null {
  if (!import.meta.client) return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function useSiteFeedback() {
  const route = useRoute()
  const { locale } = useI18n()
  const theme = useTheme()

  function readMemory(): FeedbackMemory {
    return parseMemory(storage()?.getItem(MEMORY_KEY))
  }

  function writeMemory(memory: FeedbackMemory) {
    try {
      storage()?.setItem(MEMORY_KEY, JSON.stringify(memory))
    } catch {
      // Private mode or full storage: the question may come back, nothing worse.
    }
  }

  function update(change: (memory: FeedbackMemory) => FeedbackMemory): FeedbackMemory {
    const next = change(readMemory())
    writeMemory(next)
    return next
  }

  function clientId(): string | null {
    const store = storage()
    if (!store) return null
    try {
      let id = store.getItem(CLIENT_KEY)
      if (!id || !/^[a-z\d]{12,40}$/i.test(id)) {
        id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b =>
          b.toString(16).padStart(2, '0')
        ).join('')
        store.setItem(CLIENT_KEY, id)
      }
      return id
    } catch {
      return null
    }
  }

  function collectTech(): FeedbackTech | null {
    if (!import.meta.client) return null
    const dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100
    return {
      viewport: `${window.innerWidth}x${window.innerHeight}@${dpr}`,
      screen: `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`,
      theme: theme.global.current.value.dark ? 'dark' : 'light',
      language: navigator.language || null,
      online: typeof navigator.onLine === 'boolean' ? navigator.onLine : null,
      referrer: /^https?:\/\//.test(document.referrer) ? document.referrer.slice(0, 200) : null,
    }
  }

  /** Sends one answer. Throws with `statusCode` on failure so the caller can say what went wrong. */
  async function submit(payload: FeedbackPayload): Promise<void> {
    await $fetch('/api/site-feedback', {
      method: 'POST',
      body: {
        ...payload,
        path: route.path,
        locale: locale.value,
        clientId: clientId(),
        tech: payload.includeTech ? collectTech() : undefined,
      },
    })
  }

  return {
    readMemory,
    update,
    remember: (path: string) => update(memory => rememberAnswer(memory, path, Date.now())),
    submit,
    empty: EMPTY_MEMORY,
  }
}
