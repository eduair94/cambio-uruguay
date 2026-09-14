// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import { renderToString } from '@vue/server-renderer'
import ts from 'typescript'
import * as vue from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MOVING_REVIEW_REFERENCES } from '../../utils/movingReviewSources'
import { movingReviewsCopy } from '../../utils/movingReviewsCopy'
import type { MovingReviewsResult } from '../../utils/movingReviews'

const filename = resolve(__dirname, '../../components/moving/ProviderReviews.vue')
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const { outputText } = ts.transpileModule(
  compileScript(descriptor, { id: 'moving-reviews-lifecycle', inlineTemplate: true }).content,
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
)
const apps: vue.App[] = []
afterEach(() => {
  apps.splice(0).forEach(app => app.unmount())
  document.body.replaceChildren()
})

async function settle() {
  await vue.nextTick()
  // Native details.toggle is queued as a browser task, after the open attribute changes.
  await new Promise(resolve => setTimeout(resolve, 0))
  await vue.nextTick()
}

interface PendingReview {
  signal: AbortSignal
  key: string
  resolve: (result: MovingReviewsResult) => void
}

async function renderReviews(openBeforeHydration = false) {
  const requests: PendingReview[] = []
  const fetch = vi.fn(
    (_url: string, options: { signal: AbortSignal; query: { profileKey: string } }) =>
      new Promise<MovingReviewsResult>(resolve =>
        requests.push({ signal: options.signal, key: options.query.profileKey, resolve })
      )
  )
  // Compile the shipped SFC. Only framework auto-imports, transport and the visual button
  // shell are supplied by this harness; the component's lifecycle and template stay intact.
  const context = {
    ...vue,
    exports: {} as { default?: vue.Component },
    require(name: string) {
      if (name === 'vue') return vue
      if (name === '~/utils/movingReviewSources') return { MOVING_REVIEW_REFERENCES }
      if (name === '~/utils/movingReviewsCopy') return { movingReviewsCopy }
      throw new Error(`Unexpected import: ${name}`)
    },
    AbortController,
    useI18n: () => ({ locale: vue.ref('es') }),
    $fetch: fetch,
  }
  runInNewContext(outputText, context)
  const component = context.exports.default!
  function createApp() {
    const app = vue.createSSRApp({
      render: () => vue.h(component, { providerId: 'mudanzas-lugo' }),
    })
    app.component('VBtn', {
      setup:
        (_props, { slots }) =>
        () =>
          vue.h('button', slots.default?.()),
    })
    return app
  }
  const container = document.createElement('div')
  container.innerHTML = await renderToString(createApp())
  document.body.append(container)
  const details = container.querySelector('details')!
  if (openBeforeHydration) {
    details.open = true
    await settle()
  }
  expect(fetch).not.toHaveBeenCalled()
  const app = createApp()
  app.mount(container)
  apps.push(app)
  await settle()
  return { container, details, requests, fetch }
}

function resolveReview(request: PendingReview) {
  request.resolve({
    providerId: 'mudanzas-lugo',
    profileKey: request.key,
    platform: 'google',
    status: 'no_reviews',
    rating: null,
    count: null,
    profileUrl: 'https://www.google.com/maps',
    profileLabel: 'Synthetic test profile',
    checkedAt: null,
    attributions: [],
  })
}

describe('moving reviews hydration and request lifecycle', () => {
  it('honors a native opening before hydration and displays its response without reopening', async () => {
    const { container, details, requests, fetch } = await renderReviews(true)
    expect(details.open).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    // A queued toggle for the same state must not duplicate the onMounted lookup.
    details.dispatchEvent(new Event('toggle'))
    await settle()
    expect(fetch).toHaveBeenCalledTimes(1)
    resolveReview(requests[0])
    await settle()
    expect(container.textContent).toContain(movingReviewsCopy('es').noReviews)
    container.querySelector('button')!.click()
    await settle()
    expect(fetch).toHaveBeenCalledTimes(2)
    resolveReview(requests[1])
    await settle()
    expect(container.textContent).toContain(movingReviewsCopy('es').noReviews)
  })

  it('keeps reopened requests abortable when an older request finishes after reopening', async () => {
    const { container, details, requests, fetch } = await renderReviews()
    details.open = true
    await settle()
    expect(fetch).toHaveBeenCalledTimes(1)
    details.open = false
    await settle()
    expect(requests[0].signal.aborted).toBe(true)
    details.open = true
    await settle()
    expect(fetch).toHaveBeenCalledTimes(2)
    resolveReview(requests[0])
    await settle()
    expect(container.textContent).not.toContain(movingReviewsCopy('es').noReviews)
    details.open = false
    await settle()
    expect(requests[1].signal.aborted).toBe(true)
    resolveReview(requests[1])
    await settle()
    expect(container.textContent).not.toContain(movingReviewsCopy('es').noReviews)
  })
})
