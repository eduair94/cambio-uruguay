// El 17-08-2026 un tuit puso 1.225 sesiones en /tarjetas-de-credito-uruguay y GA4
// contó 1.274 `newsletter_capture_view`. Las dos cifras no se pueden comparar: el
// evento salía en el `watch(visible)`, o sea apenas la tarjeta entraba al DOM, con
// el lector todavía arriba de todo. 1.274 significaba "la tarjeta se montó", no
// "alguien la vio", así que el embudo nunca existió.
//
// Este archivo fija las dos mitades del arreglo: la vista se cuenta cuando el
// observador dice que la tarjeta está en pantalla (una sola vez por sesión), y el
// envío emite intención, éxito y error por separado — sin las tres, una tasa de
// conversión no se puede calcular y cualquier experimento sobre la tarjeta es
// infalsificable, que es el defecto real.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  createNewsletterViewReporter,
  NEWSLETTER_VIEW_SESSION_KEY,
  observeFirstImpression,
  runNewsletterSubmit,
} from '../../utils/newsletterFunnel'

const read = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8')

/** sessionStorage de mentira: lo que sobrevive a un F5 dentro de la misma pestaña. */
function fakeSession() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    map,
  }
}

/** IntersectionObserver de mentira: el test decide cuándo la tarjeta entra en pantalla. */
function fakeObserver() {
  const state = { observed: [] as unknown[], disconnected: 0, fire: (_visible: boolean) => {} }
  class FakeIO {
    constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
      // Un observador de verdad deja de llamar apenas se lo desconecta; si el
      // doble no lo imita, el test no distingue "se soltó" de "se soltó dos veces".
      state.fire = visible => {
        if (state.disconnected === 0) cb([{ isIntersecting: visible }])
      }
    }
    observe(el: unknown) {
      state.observed.push(el)
    }
    disconnect() {
      state.disconnected += 1
    }
  }
  return { state, FakeIO }
}

const EL = {} as Element

describe('cuándo se cuenta una vista de la tarjeta', () => {
  it('no cuenta nada por montarse: crear el reporter no emite el evento', () => {
    const track = vi.fn()
    createNewsletterViewReporter({ track, source: () => '/tarjetas-de-credito-uruguay' })
    expect(track).not.toHaveBeenCalled()
  })

  it('cuenta la vista recién cuando el observador dice que está en pantalla', () => {
    const track = vi.fn()
    const reporter = createNewsletterViewReporter({
      track,
      source: () => '/tarjetas-de-credito-uruguay',
      session: () => fakeSession(),
    })
    const { state, FakeIO } = fakeObserver()
    observeFirstImpression(EL, () => reporter.report(), FakeIO)

    expect(state.observed).toEqual([EL])
    // Un entry que no intersecta es el scroll pasando por al lado, no una vista.
    state.fire(false)
    expect(track).not.toHaveBeenCalled()

    state.fire(true)
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('newsletter_capture_view', {
      source: '/tarjetas-de-credito-uruguay',
    })
  })

  it('suelta el observador con la primera vista: la tarjeta se cuenta una sola vez', () => {
    const track = vi.fn()
    const reporter = createNewsletterViewReporter({
      track,
      source: () => '/x',
      session: () => null,
    })
    const { state, FakeIO } = fakeObserver()
    observeFirstImpression(EL, () => reporter.report(), FakeIO)

    state.fire(true)
    state.fire(true)
    reporter.report()
    expect(track).toHaveBeenCalledTimes(1)
    expect(state.disconnected).toBe(1)
  })

  it('no vuelve a contar en la misma sesión aunque se recargue la página', () => {
    const track = vi.fn()
    const session = fakeSession()
    createNewsletterViewReporter({ track, source: () => '/x', session: () => session }).report()
    expect(track).toHaveBeenCalledTimes(1)
    expect(session.map.get(NEWSLETTER_VIEW_SESSION_KEY)).toBe('1')

    // Segundo reporter = la misma pestaña después de un F5: la sesión de GA4 sigue
    // siendo una sola, así que una segunda vista inflaría el denominador.
    createNewsletterViewReporter({ track, source: () => '/y', session: () => session }).report()
    expect(track).toHaveBeenCalledTimes(1)
  })

  it('sigue contando una vez cuando el navegador no deja tocar sessionStorage', () => {
    const track = vi.fn()
    const hostile = {
      getItem: () => {
        throw new Error('private mode')
      },
      setItem: () => {
        throw new Error('private mode')
      },
    }
    const reporter = createNewsletterViewReporter({
      track,
      source: () => '/x',
      session: () => hostile,
    })
    reporter.report()
    reporter.report()
    expect(track).toHaveBeenCalledTimes(1)
  })

  it('sin IntersectionObserver no inventa una vista', () => {
    const onVisible = vi.fn()
    const stop = observeFirstImpression(EL, onVisible, null)
    stop()
    expect(onVisible).not.toHaveBeenCalled()
  })
})

describe('el embudo del formulario', () => {
  it('emite intención antes del pedido y éxito recién cuando resuelve', async () => {
    const calls: string[] = []
    const outcome = await runNewsletterSubmit({
      post: async () => {
        calls.push('post')
      },
      onSubmit: () => calls.push('newsletter_submit'),
      onSuccess: () => calls.push('newsletter_signup'),
      onError: () => calls.push('newsletter_error'),
    })
    expect(outcome).toBe('sent')
    expect(calls).toEqual(['newsletter_submit', 'post', 'newsletter_signup'])
  })

  it('un pedido que falla cuenta como error y nunca como conversión', async () => {
    const calls: string[] = []
    const outcome = await runNewsletterSubmit({
      post: async () => {
        throw new Error('502')
      },
      onSubmit: () => calls.push('newsletter_submit'),
      onSuccess: () => calls.push('newsletter_signup'),
      onError: () => calls.push('newsletter_error'),
    })
    expect(outcome).toBe('error')
    expect(calls).toEqual(['newsletter_submit', 'newsletter_error'])
  })
})

// Contrato a nivel de fuente, como `ga4-key-events.test.ts`: acá no hay runtime de
// Nuxt para montar el componente, así que lo que se vigila es el cableado.
describe('el cableado de los componentes', () => {
  const capture = read('components/NewsletterCapture.vue')
  const signup = read('components/NewsletterSignup.vue')

  it('la tarjeta ya no emite la vista desde el watch de visibilidad', () => {
    expect(capture).not.toContain("track('newsletter_capture_view'")
    expect(capture).toContain('observeFirstImpression')
  })

  it('la conversión sigue colgada del éxito, no de la intención', () => {
    expect(signup).toContain("onSuccess: () => track('newsletter_signup'")
    expect(signup).toContain("onSubmit: () => track('newsletter_submit'")
    expect(signup).toContain("onError: () => track('newsletter_error'")
  })
})
