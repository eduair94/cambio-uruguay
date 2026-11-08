// @vitest-environment jsdom
// The rental survey card stores the FIRST TAP. Until 2026-11-08 a tap on Sí / En parte / No only
// revealed "Enviar" and sent nothing: 20 days, 0 rows. These mount the real component (compiled
// SFC, as helpers/sfc.ts does) with Vuetify stubbed and check what leaves the browser.
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as vue from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as rentalFeedback from '../../utils/rentalFeedback'
import { compileComponent, registerStubs } from './helpers/sfc'

const source = compileComponent('components/rentals/feedback/MicroSurvey.vue', 'micro-survey')
const ROW = 'ab12cd34ef56ab12cd34ef56'

function evaluate(globals: Record<string, unknown>, modules: Record<string, unknown>) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const context = {
    exports: {} as { default?: vue.Component },
    require: (name: string) => {
      if (name === 'vue') return vue
      if (name in modules) return modules[name]
      throw new Error(`Unexpected import: ${name}`)
    },
    ...vue,
    ...globals,
  }
  runInNewContext(outputText, context)
  return context.exports.default as vue.Component
}

const passthrough = (tag: string) =>
  vue.defineComponent({
    props: { type: { type: String, default: 'button' }, disabled: Boolean, loading: Boolean },
    setup:
      (props, { slots }) =>
      () =>
        vue.h(tag, { type: props.type, disabled: props.disabled }, slots.default?.()),
  })
const field = (tag: 'textarea' | 'input') =>
  vue.defineComponent({
    props: { modelValue: { type: String, default: '' }, label: { type: String, default: '' } },
    emits: ['update:modelValue'],
    setup:
      (props, { emit }) =>
      () =>
        vue.h(tag, {
          value: props.modelValue,
          'aria-label': props.label,
          onInput: (event: Event) =>
            emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
        }),
  })

const apps: vue.App[] = []
afterEach(() => {
  apps.splice(0).forEach(app => app.unmount())
  document.body.replaceChildren()
})

async function mount(options: { send?: () => Promise<{ id: string | null } | null> } = {}) {
  const observers: Array<{ enter: () => void }> = []
  class FakeIntersectionObserver {
    disconnected = false
    constructor(readonly callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
      // Like the real one: after disconnect() it delivers nothing more.
      observers.push({
        enter: () => {
          if (!this.disconnected) this.callback([{ isIntersecting: true }])
        },
      })
    }
    observe() {}
    disconnect() {
      this.disconnected = true
    }
  }
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  const feedback = {
    send: vi.fn(options.send ?? (async () => ({ id: ROW }))),
    followUp: vi.fn(async () => true),
    snoozed: vi.fn(() => false),
    snooze: vi.fn(),
  }
  const track = vi.fn()
  const clarity = { set: vi.fn(), event: vi.fn(), upgrade: vi.fn() }
  const component = evaluate(
    {
      useRoute: () => ({ path: '/alquileres/montevideo-cordon-1rt3jaj' }),
      useTrack: () => track,
      useRentalFeedback: () => feedback,
      IntersectionObserver: FakeIntersectionObserver,
    },
    { '~/utils/rentalFeedback': rentalFeedback, '~/services/clarity': clarity }
  )
  const host = document.createElement('div')
  document.body.append(host)
  const app = vue.createApp(component, {
    surface: 'ficha',
    propertyKey: 'montevideo-cordon-1rt3jaj',
    snoozeDays: 14,
  })
  registerStubs(app)
  app.component('VBtn', passthrough('button'))
  app.component('VChip', passthrough('button'))
  app.component('VTextarea', field('textarea'))
  app.component('VTextField', field('input'))
  app.mount(host)
  apps.push(app)
  await vue.nextTick()
  await vue.nextTick()
  return { host, feedback, track, clarity, observers }
}

const settle = async () => {
  for (let index = 0; index < 4; index++) await vue.nextTick()
}
const button = (host: HTMLElement, cta: string) =>
  host.querySelector<HTMLButtonElement>(`[data-cta="${cta}"]`)!

describe('the rental survey card', () => {
  it('stores the answer on the first tap, once, and says thanks', async () => {
    const { host, feedback, clarity } = await mount()
    expect(host.textContent).toContain('¿Te sirvió esta ficha?')
    button(host, 'rental-feedback-no').click()
    await settle()
    expect(feedback.send).toHaveBeenCalledTimes(1)
    expect(feedback.send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'micro',
        surface: 'ficha',
        found: 'no',
        path: '/alquileres/montevideo-cordon-1rt3jaj',
        propertyKey: 'montevideo-cordon-1rt3jaj',
      })
    )
    expect((feedback.send.mock.calls[0] as unknown[])[0]).not.toHaveProperty('reasons')
    expect(feedback.snooze).toHaveBeenCalledWith('ficha', 14)
    expect(host.textContent).toContain('Gracias, ya guardamos tu respuesta.')
    expect(clarity.set).toHaveBeenCalledWith('feedback', 'no')
    expect(clarity.event).toHaveBeenCalledWith('feedback_no')
    expect(clarity.upgrade).toHaveBeenCalledWith('feedback')
  })

  it('completes the same row with what fell short and a comment', async () => {
    const { host, feedback } = await mount()
    button(host, 'rental-feedback-en-parte').click()
    await settle()
    const reason = [...host.querySelectorAll('button')].find(item =>
      item.textContent?.includes('Avisos que ya no están disponibles')
    )!
    reason.click()
    const textarea = host.querySelector('textarea')!
    textarea.value = 'El aviso ya no estaba'
    textarea.dispatchEvent(new Event('input'))
    await settle()
    button(host, 'rental-feedback-follow-up').click()
    await settle()
    expect(feedback.followUp).toHaveBeenCalledWith(ROW, {
      reasons: ['avisos-viejos'],
      comment: 'El aviso ya no estaba',
      website: '',
    })
    expect(feedback.send).toHaveBeenCalledTimes(1)
    expect(host.textContent).toContain('Gracias, lo leemos todo.')
  })

  it('keeps the choices when the answer could not be stored, and the next tap retries', async () => {
    const { host, feedback } = await mount({ send: async () => null })
    button(host, 'rental-feedback-si').click()
    await settle()
    expect(host.textContent).toContain('No pudimos guardar tu respuesta')
    expect(feedback.snooze).not.toHaveBeenCalled()
    button(host, 'rental-feedback-si').click()
    await settle()
    expect(feedback.send).toHaveBeenCalledTimes(2)
  })

  it('reports the view once, when the card is on screen', async () => {
    const { track, observers } = await mount()
    expect(track).not.toHaveBeenCalled()
    observers[0]!.enter()
    observers[0]!.enter()
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('feedback_view', { surface: 'ficha' })
  })

  it('tags every answer and the suggestion box for GA4', async () => {
    const { host } = await mount()
    for (const cta of [
      'rental-feedback-si',
      'rental-feedback-en-parte',
      'rental-feedback-no',
      'rental-feedback-box',
    ]) {
      expect(host.querySelector(`[data-cta="${cta}"]`), cta).not.toBeNull()
    }
  })
})
