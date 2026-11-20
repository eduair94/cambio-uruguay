import { describe, expect, it } from 'vitest'
import { createHead } from 'unhead/server'
import {
  fallbackErrorHead,
  recoveredSsrHead,
  type SsrRecoverySnapshot,
} from '../../utils/chunkError'

const snapshot: SsrRecoverySnapshot = {
  url: 'https://cambio-uruguay.com/precio/papa-rosada',
  html: '<main><h1>Papa rosada</h1></main>',
  title: 'Papa rosada | Cambio Uruguay',
  description: 'Precios publicados por cada comercio.',
  canonical: 'https://cambio-uruguay.com/precio/papa-rosada',
  robots: 'index, follow',
}

describe('error head rendered by the installed head manager', () => {
  it('restores one exact title, canonical and robots over conflicting defaults', async () => {
    const head = createHead()
    head.push({
      title: 'Internal Server Error',
      titleTemplate: '%s | Cambio Uruguay',
      meta: [
        { name: 'description', content: 'Site default' },
        { name: 'robots', content: 'noindex' },
      ],
      link: [{ rel: 'canonical', href: 'https://cambio-uruguay.com/' }],
    })
    head.push(recoveredSsrHead(snapshot))
    const tags = await head.resolveTags()
    expect(tags.filter(tag => tag.tag === 'title').map(tag => tag.textContent)).toEqual([
      snapshot.title,
    ])
    expect(tags.filter(tag => tag.props.rel === 'canonical').map(tag => tag.props.href)).toEqual([
      snapshot.canonical,
    ])
    expect(tags.filter(tag => tag.props.name === 'robots').map(tag => tag.props.content)).toEqual([
      snapshot.robots,
    ])
    expect(tags.find(tag => tag.props.name === 'description')?.props.content).toBe(
      snapshot.description
    )
  })

  it('preserves deliberate noindex and does not invent absent metadata', async () => {
    const head = createHead()
    head.push({ meta: [{ name: 'description', content: 'Site default' }] })
    head.push(
      recoveredSsrHead({
        ...snapshot,
        description: null,
        canonical: null,
        robots: 'noindex, follow',
      })
    )
    const tags = await head.resolveTags()
    expect(tags.some(tag => tag.props.name === 'description')).toBe(false)
    expect(tags.some(tag => tag.props.rel === 'canonical')).toBe(false)
    expect(tags.find(tag => tag.props.name === 'robots')?.props.content).toBe('noindex, follow')
  })

  it('keeps an absent robots tag absent instead of adding a client-only directive', async () => {
    const head = createHead()
    head.push({ meta: [{ name: 'robots', content: 'index, follow' }] })
    head.push(recoveredSsrHead({ ...snapshot, robots: null }))
    expect((await head.resolveTags()).some(tag => tag.props.name === 'robots')).toBe(false)
  })

  it('does not turn a client-side 404 or 500 into a noindex on the original HTTP 200', async () => {
    for (const statusCode of [404, 500]) {
      const head = createHead()
      head.push({ meta: [{ name: 'robots', content: 'index, follow' }] })
      head.push(fallbackErrorHead('Cambio Uruguay', statusCode, false))
      const tags = await head.resolveTags()
      expect(tags.find(tag => tag.props.name === 'robots')?.props.content).toBe('index, follow')
      expect(tags.find(tag => tag.tag === 'title')?.textContent).toBe('Cambio Uruguay')
    }
  })

  it('makes a real server 404 noindex while keeping the same head after hydration', async () => {
    const head = createHead()
    head.push({ meta: [{ name: 'robots', content: 'index, follow' }] })
    head.push(fallbackErrorHead('Página no encontrada | Cambio Uruguay', 404, true))
    const tags = await head.resolveTags()
    expect(tags.find(tag => tag.props.name === 'robots')?.props.content).toBe('noindex, follow')
    expect(tags.find(tag => tag.tag === 'title')?.textContent).toBe(
      'Página no encontrada | Cambio Uruguay'
    )
  })
})
