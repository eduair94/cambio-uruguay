// /llms-full.txt: la versión larga de llms.txt, generada del catálogo de guías.
//
// Lo que se pinnea acá es la PARIDAD con las páginas: cada guía una vez, la canónica exacta que
// emite `pages/guias/[slug].vue` y la fecha tal cual la lee el JSON-LD. Un bloque que dijera otra
// URL u otra fecha de la misma guía sería una contradicción publicada, no un detalle de formato.
import { describe, expect, it, vi } from 'vitest'

import type { Guide } from '../../utils/guides'
import { guideSlugs, guides } from '../../utils/guides'
import {
  LLMS_SITE_URL,
  guideCanonicalUrl,
  guideSummary,
  renderGuideBlock,
  renderLlmsFull,
} from '../../utils/llmsFull'
import { installNitroGlobals } from './helpers/nitro'

// Re-importar el route trae el catálogo entero de guías (145 al 2026-09-22); mismo presupuesto que
// sitemap-urls.test.ts, por la misma razón.
vi.setConfig({ testTimeout: 30_000 })

const SITE = 'https://cambio-uruguay.com'

it('the renderer and the guide page agree on the site origin', () => {
  expect(LLMS_SITE_URL).toBe(SITE)
})

function blocks(text: string): string[] {
  return text
    .trimEnd()
    .split('\n\n')
    .filter(block => block.startsWith('## '))
}

describe('renderLlmsFull over the real catalogue', () => {
  const output = renderLlmsFull(guides, SITE)

  it('lists every guide exactly once, in catalogue order', () => {
    const urls = output.match(/^https:\/\/cambio-uruguay\.com\/guias\/\S+$/gm) ?? []
    expect(urls).toEqual(guideSlugs().map(slug => `${SITE}/guias/${slug}`))
    expect(new Set(urls).size).toBe(guideSlugs().length)
  })

  it('drift guard: the number of guide blocks equals guideSlugs().length', () => {
    // Un módulo de guías nuevo que se spreadea en `guides` entra solo; uno que se olvidara de
    // spreadear no existiría para el sitemap tampoco, y este contador lo haría visible acá.
    expect(blocks(output)).toHaveLength(guideSlugs().length)
    expect(guideSlugs().length).toBeGreaterThanOrEqual(145)
  })

  it('prints the exact canonical the guide page emits: no locale prefix, no trailing slash', () => {
    for (const guide of guides) {
      expect(output).toContain(`\n${SITE}/guias/${guide.slug}\n`)
    }
    expect(output).not.toMatch(/\/en\/guias\//)
    expect(output).not.toMatch(/\/pt\/guias\//)
    expect(output).not.toMatch(/\/guias\/\S+\/\n/)
  })

  it('prints updatedAt verbatim, the same ISO value the page uses for datePublished', () => {
    for (const guide of guides) {
      expect(guide.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(output).toContain(`Actualizado: ${guide.updatedAt}\n${SITE}/guias/${guide.slug}`)
    }
  })

  it('every block carries a title, a one-line summary, the date and the canonical', () => {
    for (const block of blocks(output)) {
      const lines = block.split('\n')
      expect(lines).toHaveLength(4)
      expect(lines[0]).toMatch(/^## \S/)
      expect(lines[1]).toMatch(/^> \S/)
      expect(lines[2]).toMatch(/^Actualizado: \d{4}-\d{2}-\d{2}$/)
      expect(lines[3]).toMatch(/^https:\/\/cambio-uruguay\.com\/guias\/[a-z0-9-]+$/)
    }
  })

  it('is deterministic across two renders and carries the identity header', () => {
    expect(renderLlmsFull(guides, SITE)).toBe(output)
    expect(output.startsWith('# Cambio Uruguay — guías completas\n')).toBe(true)
    expect(output).toContain('Eduardo Airaudo')
    expect(output).toContain(`${SITE}/llms.txt`)
    expect(output).toContain(`las ${guides.length} guías`)
    expect(output.endsWith('\n')).toBe(true)
  })

  it('does not reword the catalogue: every title appears as written', () => {
    for (const guide of guides) {
      expect(output).toContain(`## ${guide.title.replace(/\s+/g, ' ').trim()}`)
    }
  })
})

describe('renderGuideBlock edge cases', () => {
  const base: Guide = {
    slug: 'guia-de-prueba',
    title: 'Guía  de\nprueba',
    description: '',
    tag: 'TEST',
    updatedAt: '2026-09-22',
    sections: [],
  }

  it('falls back to the first section body when the description is empty', () => {
    const guide: Guide = {
      ...base,
      sections: [{ heading: 'Primero', body: '  Cuerpo   de la\n primera sección. ' }],
    }
    expect(guideSummary(guide)).toBe('Cuerpo de la primera sección.')
    expect(renderGuideBlock(guide, SITE)).toBe(
      [
        '## Guía de prueba',
        '> Cuerpo de la primera sección.',
        'Actualizado: 2026-09-22',
        `${SITE}/guias/guia-de-prueba`,
      ].join('\n')
    )
  })

  it('still yields a well-formed block for a guide with no sections and no description', () => {
    expect(renderGuideBlock(base, SITE)).toBe(
      ['## Guía de prueba', 'Actualizado: 2026-09-22', `${SITE}/guias/guia-de-prueba`].join('\n')
    )
  })

  it('prefers the description over the first section when both exist', () => {
    const guide: Guide = {
      ...base,
      description: 'Resumen corto.',
      sections: [{ heading: 'Primero', body: 'Cuerpo largo.' }],
    }
    expect(guideSummary(guide)).toBe('Resumen corto.')
  })

  it('normalises a trailing slash on the site URL', () => {
    expect(guideCanonicalUrl('https://cambio-uruguay.com/', 'x')).toBe(`${SITE}/guias/x`)
    expect(guideCanonicalUrl('https://cambio-uruguay.com//', 'x')).toBe(`${SITE}/guias/x`)
  })
})

describe('GET /llms-full.txt (Nitro route)', () => {
  async function runHandler() {
    vi.resetModules()
    installNitroGlobals()
    const setResponseHeader = vi.fn()
    vi.stubGlobal('setResponseHeader', setResponseHeader)
    const mod = await import('../../server/routes/llms-full.txt.get')
    const handler = mod.default as unknown as (event: unknown) => string
    return { body: handler({}), setResponseHeader }
  }

  it('answers text/plain with a one-hour shared cache and the rendered catalogue', async () => {
    const { body, setResponseHeader } = await runHandler()
    expect(setResponseHeader).toHaveBeenCalledWith({}, 'content-type', 'text/plain; charset=utf-8')
    expect(setResponseHeader).toHaveBeenCalledWith(
      {},
      'cache-control',
      'public, max-age=0, must-revalidate, s-maxage=3600'
    )
    expect(body).toBe(renderLlmsFull(guides, SITE))
    expect(blocks(body)).toHaveLength(guideSlugs().length)
  })

  it('is byte-identical across two requests', async () => {
    const first = await runHandler()
    const second = await runHandler()
    expect(first.body).toBe(second.body)
  })
})
