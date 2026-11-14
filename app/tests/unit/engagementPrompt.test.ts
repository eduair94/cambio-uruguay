import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as vue from 'vue'
import { describe, expect, it, vi } from 'vitest'
import * as engagement from '../../utils/engagement'
import * as capture from '../../utils/capture'

const source = readFileSync(resolve(__dirname, '../../composables/useEngagementPrompt.ts'), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})

interface Prompt {
  allowed: vue.Ref<boolean>
  element: vue.Ref<HTMLElement | null>
  dismiss: () => void
  engage: (action: string) => void
}

function createSession(options: { unavailableStorage?: boolean; savedDismissal?: string } = {}) {
  let now = 1_800_000_000_000
  const route = vue.reactive({ path: '/dolar-hoy' })
  const track = vi.fn()
  const local = new Map<string, string>()
  const session = new Map<string, string>()
  if (options.savedDismissal) local.set(engagement.ENGAGEMENT_DISMISS_KEY, options.savedDismissal)
  const memory = new Map<string, vue.Ref>()
  const observations: {
    element: HTMLElement
    visible: () => void
    stop: ReturnType<typeof vi.fn>
  }[] = []
  const storageListeners = new Set<(event: { key: string }) => void>()
  const scopes: vue.EffectScope[] = []
  const unmounts: (() => void)[] = []
  const storage = (values: Map<string, string>) => ({
    getItem(key: string) {
      if (options.unavailableStorage) throw new Error('Storage unavailable')
      return values.get(key) ?? null
    },
    setItem(key: string, value: string) {
      if (options.unavailableStorage) throw new Error('Storage unavailable')
      values.set(key, value)
    },
  })

  function mount(kind: engagement.FollowUpKind): Prompt {
    const mounted: (() => void)[] = []
    const context = {
      exports: {} as { useEngagementPrompt: (kind: engagement.FollowUpKind) => Prompt },
      require(name: string) {
        if (name === '~/utils/engagement') return engagement
        if (name === '~/utils/capture') return capture
        if (name === '~/utils/newsletterFunnel')
          return {
            observeFirstImpression(element: HTMLElement, visible: () => void) {
              const stop = vi.fn()
              observations.push({ element, visible, stop })
              return stop
            },
          }
        throw new Error(`Unexpected import: ${name}`)
      },
      useRoute: () => route,
      useTrack: () => track,
      useState(key: string, init: () => unknown) {
        if (!memory.has(key)) memory.set(key, vue.ref(init()))
        return memory.get(key)
      },
      ref: vue.ref,
      watch: vue.watch,
      nextTick: vue.nextTick,
      onMounted: (fn: () => void) => mounted.push(fn),
      onBeforeUnmount: (fn: () => void) => unmounts.push(fn),
      localStorage: storage(local),
      sessionStorage: storage(session),
      Date: { now: () => now },
      window: {
        addEventListener: (_event: string, fn: (event: { key: string }) => void) =>
          storageListeners.add(fn),
        removeEventListener: (_event: string, fn: (event: { key: string }) => void) =>
          storageListeners.delete(fn),
      },
    }
    runInNewContext(outputText, context)
    const scope = vue.effectScope()
    scopes.push(scope)
    const prompt = scope.run(() => context.exports.useEngagementPrompt(kind))!
    mounted.forEach(fn => fn())
    return prompt
  }

  async function observe(prompt: Prompt) {
    const element = {} as HTMLElement
    prompt.element.value = element
    await vue.nextTick()
    return observations.at(-1)!
  }

  return {
    mount,
    observe,
    route,
    track,
    local,
    session,
    advance: (milliseconds: number) => {
      now += milliseconds
    },
    storageChanged: (key: string) => storageListeners.forEach(fn => fn({ key })),
    cleanup: () => {
      unmounts.forEach(fn => fn())
      scopes.forEach(scope => scope.stop())
    },
  }
}

describe('shared invitation attention budget', () => {
  it('does not claim an impression merely by mounting or observing an off-screen card', async () => {
    const harness = createSession()
    try {
      const prompt = harness.mount('account')
      expect(prompt.allowed.value).toBe(true)
      await harness.observe(prompt)
      expect(harness.track).not.toHaveBeenCalled()
      expect(harness.session.has(engagement.ENGAGEMENT_SESSION_KEY)).toBe(false)
    } finally {
      harness.cleanup()
    }
  })

  it('lets one visible invitation remain and suppresses another instance and the next route', async () => {
    const harness = createSession()
    try {
      const account = harness.mount('account')
      const newsletter = harness.mount('newsletter')
      const accountObserver = await harness.observe(account)
      await harness.observe(newsletter)
      accountObserver.visible()
      await vue.nextTick()
      expect(account.allowed.value).toBe(true)
      expect(newsletter.allowed.value).toBe(false)
      expect(harness.session.get(engagement.ENGAGEMENT_SESSION_KEY)).toBe('1')
      expect(harness.track.mock.calls).toEqual([
        ['followup_view', { prompt_kind: 'account', content_path: '/dolar-hoy' }],
      ])
      harness.route.path = '/tarjetas-de-credito-uruguay'
      await vue.nextTick()
      expect(account.allowed.value).toBe(false)
      expect(newsletter.allowed.value).toBe(false)
      expect(accountObserver.stop).toHaveBeenCalled()
    } finally {
      harness.cleanup()
    }
  })

  it('claims the shared budget atomically when two visibility callbacks arrive in the same turn', async () => {
    const harness = createSession()
    try {
      const first = harness.mount('account')
      const second = harness.mount('newsletter')
      const firstObserver = await harness.observe(first)
      const secondObserver = await harness.observe(second)
      firstObserver.visible()
      secondObserver.visible()
      await vue.nextTick()
      expect(harness.track.mock.calls.filter(([event]) => event === 'followup_view')).toHaveLength(
        1
      )
      expect(first.allowed.value).toBe(true)
      expect(second.allowed.value).toBe(false)
    } finally {
      harness.cleanup()
    }
  })

  it('propagates a dismissal across instances and preserves it for sixty days', async () => {
    const harness = createSession()
    try {
      const first = harness.mount('account')
      const second = harness.mount('newsletter')
      first.dismiss()
      await vue.nextTick()
      expect(first.allowed.value).toBe(false)
      expect(second.allowed.value).toBe(false)
      expect(harness.local.get(engagement.ENGAGEMENT_DISMISS_KEY)).toBe('1800000000000')
      harness.advance(engagement.ENGAGEMENT_DISMISS_DAYS * 86_400_000 - 1)
      harness.route.path = '/tarjetas-de-credito-uruguay'
      await vue.nextTick()
      expect(second.allowed.value).toBe(false)
      harness.advance(1)
      harness.route.path = '/dolar-hoy'
      await vue.nextTick()
      expect(second.allowed.value).toBe(true)
    } finally {
      harness.cleanup()
    }
  })

  it('restores a refusal in a new session and accepts refusals from another tab', async () => {
    const harness = createSession({ savedDismissal: '1799999999000' })
    try {
      const prompt = harness.mount('newsletter')
      expect(prompt.allowed.value).toBe(false)
      harness.advance(engagement.ENGAGEMENT_DISMISS_DAYS * 86_400_000)
      harness.route.path = '/otra-pagina'
      await vue.nextTick()
      expect(prompt.allowed.value).toBe(true)
      harness.local.set(
        capture.CAPTURE_DISMISS_KEY,
        String(1_800_000_000_000 + engagement.ENGAGEMENT_DISMISS_DAYS * 86_400_000)
      )
      harness.storageChanged(capture.CAPTURE_DISMISS_KEY)
      expect(prompt.allowed.value).toBe(false)
    } finally {
      harness.cleanup()
    }
  })

  it('keeps impressions in shared memory when browser storage is unavailable', async () => {
    const harness = createSession({ unavailableStorage: true })
    try {
      const first = harness.mount('account')
      const second = harness.mount('newsletter')
      const observation = await harness.observe(first)
      observation.visible()
      await vue.nextTick()
      expect(second.allowed.value).toBe(false)
      harness.route.path = '/otra-pagina'
      await vue.nextTick()
      expect(first.allowed.value).toBe(false)
      expect(second.allowed.value).toBe(false)
      expect(harness.mount('account').allowed.value).toBe(false)
      expect(harness.local.size).toBe(0)
      expect(harness.session.size).toBe(0)
    } finally {
      harness.cleanup()
    }
  })

  it('keeps a refusal without an impression when browser storage is unavailable', async () => {
    const harness = createSession({ unavailableStorage: true })
    try {
      const first = harness.mount('account')
      const second = harness.mount('newsletter')
      const secondObserver = await harness.observe(second)
      first.dismiss()
      // A queued visibility callback must not overtake the refusal.
      secondObserver.visible()
      await vue.nextTick()
      expect(second.allowed.value).toBe(false)
      expect(harness.mount('account').allowed.value).toBe(false)
      harness.route.path = '/otra-pagina'
      await vue.nextTick()
      expect(first.allowed.value).toBe(false)
      expect(harness.track.mock.calls.filter(([event]) => event === 'followup_view')).toHaveLength(
        0
      )
      expect(harness.local.size).toBe(0)
      expect(harness.session.size).toBe(0)
    } finally {
      harness.cleanup()
    }
  })
})
