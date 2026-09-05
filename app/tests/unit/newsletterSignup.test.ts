import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import { describe, expect, it, vi } from 'vitest'
import * as funnel from '../../utils/newsletterFunnel'

// Execute the actual form's setup without mounting Nuxt or making network requests.
// This covers its wiring and payload, beyond the pure submit helper's ordering.
const filename = resolve(__dirname, '../../components/NewsletterSignup.vue')
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const script = compileScript(descriptor, { id: 'newsletter-signup-test' })
const { outputText } = ts.transpileModule(script.content, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})

function createForm(post: () => Promise<unknown>) {
  const track = vi.fn()
  const fetch = vi.fn(post)
  const emit = vi.fn()
  const route = {
    path: '/tarjetas-de-credito-uruguay',
    fullPath: '/tarjetas-de-credito-uruguay?email=private@example.com#confirmation',
  }
  const context = {
    exports: {} as {
      default: {
        setup: (
          props: object,
          ctx: { expose: () => void; emit: typeof emit }
        ) => {
          email: vue.Ref<string>
          website: vue.Ref<string>
          state: vue.Ref<string>
          submit: () => Promise<void>
        }
      }
    },
    require: (name: string) => {
      if (name === 'vue') return vue
      if (name === 'vue-i18n') return { useI18n: () => ({ locale: vue.ref('es') }) }
      if (name === '~/utils/newsletterFunnel') return funnel
      throw new Error(`Unexpected import: ${name}`)
    },
    useRoute: () => route,
    useTrack: () => track,
    $fetch: fetch,
  }
  runInNewContext(outputText, context)
  const form = context.exports.default.setup({}, { expose: () => {}, emit })
  form.email.value = 'private@example.com'
  return { form, track, fetch, emit, route }
}

describe('newsletter form measurement', () => {
  it('counts success only after the request succeeds and keeps personal data in the API', async () => {
    let complete!: () => void
    const { form, track, fetch, emit, route } = createForm(
      () => new Promise<void>(resolve => (complete = resolve))
    )
    const pending = form.submit()
    expect(form.state.value).toBe('submitting')
    expect(track.mock.calls).toEqual([
      ['newsletter_submit', { content_path: '/tarjetas-de-credito-uruguay', locale: 'es' }],
    ])
    expect(emit).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith('/api/newsletter/subscribe', {
      method: 'POST',
      body: { email: 'private@example.com', locale: 'es', website: '' },
    })

    // An impatient second click cannot create another request or conversion.
    await form.submit()
    expect(fetch).toHaveBeenCalledTimes(1)
    // Attribute the result to the page that submitted, even if navigation races it.
    route.path = '/newsletter'
    complete()
    await pending
    expect(form.state.value).toBe('sent')
    expect(track.mock.calls).toEqual([
      ['newsletter_submit', { content_path: '/tarjetas-de-credito-uruguay', locale: 'es' }],
      ['newsletter_signup', { content_path: '/tarjetas-de-credito-uruguay', locale: 'es' }],
    ])
    expect(emit.mock.calls).toEqual([['subscribed']])
    await form.submit()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledTimes(2)
  })

  it('records a rejected request as an error without a signup, response text or email', async () => {
    const { form, track, emit } = createForm(async () => {
      throw new Error('Could not subscribe private@example.com')
    })
    await form.submit()
    expect(form.state.value).toBe('error')
    expect(track.mock.calls).toEqual([
      ['newsletter_submit', { content_path: '/tarjetas-de-credito-uruguay', locale: 'es' }],
      ['newsletter_error', { content_path: '/tarjetas-de-credito-uruguay', locale: 'es' }],
    ])
    expect(emit).not.toHaveBeenCalled()
  })
})
