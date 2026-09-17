import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  priceEventCountdown,
  priceEventDropRows,
  priceEventFaq,
  priceEventFormatDate,
  priceEventPastEditions,
  type PriceEventDropDoc,
  type PriceEventSnapshotResponse,
} from '../../utils/priceEvents'

// ---------------------------------------------------------------------------
// priceEventCountdown
// ---------------------------------------------------------------------------

describe('priceEventCountdown', () => {
  it('muestra el evento confirmado más próximo que todavía no terminó', () => {
    const result = priceEventCountdown('2026-09-17')
    expect(result?.event.key).toBe('black-friday-2026')
    expect(result?.daysUntilStart).not.toBeNull()
  })

  it('daysUntilStart es 0 el mismo día del inicio', () => {
    const result = priceEventCountdown('2026-11-27')
    expect(result).toEqual({
      event: expect.objectContaining({ key: 'black-friday-2026' }),
      daysUntilStart: 0,
    })
  })

  it('daysUntilStart es 1 un día antes del inicio', () => {
    const result = priceEventCountdown('2026-11-26')
    expect(result?.event.key).toBe('black-friday-2026')
    expect(result?.daysUntilStart).toBe(1)
  })

  it('cuando no queda ningún evento confirmado por delante, cae al que espera fecha', () => {
    const result = priceEventCountdown('2026-12-01')
    expect(result).toEqual({
      event: expect.objectContaining({ key: 'ciberlunes-2026-11', confirmed: false }),
      daysUntilStart: null,
    })
  })
})

// ---------------------------------------------------------------------------
// priceEventPastEditions
// ---------------------------------------------------------------------------

describe('priceEventPastEditions', () => {
  it('antes de la primera edición no hay ninguna pasada', () => {
    expect(priceEventPastEditions('2025-01-01')).toEqual([])
  })

  it('en orden cronológico, y nunca incluye la edición sin fecha confirmada', () => {
    const result = priceEventPastEditions('2026-09-17')
    expect(result.map(e => e.key)).toEqual(['ciberlunes-2025-11', 'ciberlunes-2026-06'])
  })

  it('Black Friday pasa a ser pasado después de su ventana', () => {
    const result = priceEventPastEditions('2026-12-01')
    expect(result.map(e => e.key)).toEqual([
      'ciberlunes-2025-11',
      'ciberlunes-2026-06',
      'black-friday-2026',
    ])
  })
})

// ---------------------------------------------------------------------------
// priceEventFormatDate
// ---------------------------------------------------------------------------

describe('priceEventFormatDate', () => {
  it('usa la grafía uruguaya ("setiembre", no "septiembre")', () => {
    expect(priceEventFormatDate('2026-09-17')).toBe('17 de setiembre de 2026')
  })

  it('acepta un ISO con hora (generatedAt)', () => {
    expect(priceEventFormatDate('2026-09-17T13:21:59.000Z')).toBe('17 de setiembre de 2026')
  })
})

// ---------------------------------------------------------------------------
// priceEventDropRows
// ---------------------------------------------------------------------------

function drop(overrides: Partial<PriceEventDropDoc> = {}): PriceEventDropDoc {
  return {
    listingId: 'l-1',
    vertical: 'equipar',
    category: 'heladera',
    productKey: null,
    sellerKey: 'tienda-x',
    sellerName: 'Tienda X',
    title: 'Heladera 300L',
    url: 'https://example.com/heladera',
    currency: 'UYU',
    price: 18000,
    listPrice: null,
    priorMin: 20000,
    priorMax: 22000,
    priorMedian: 21000,
    priorPoints: 30,
    classes: ['baja-real'],
    dropPct: 10,
    ...overrides,
  }
}

describe('priceEventDropRows', () => {
  it('sin snapshot no hay filas', () => {
    expect(priceEventDropRows(null)).toEqual([])
  })

  it('equipar con categoría publicada enlaza a /equipar-casa-uruguay/<categoria>', () => {
    const [row] = priceEventDropRows({
      topDrops: [drop({ vertical: 'equipar', category: 'heladera' })],
    })
    expect(row!.internalHref).toBe('/equipar-casa-uruguay/heladera')
  })

  it('equipar con categoría que no existe en el registro no enlaza', () => {
    const [row] = priceEventDropRows({
      topDrops: [drop({ vertical: 'equipar', category: 'categoria-inexistente' })],
    })
    expect(row!.internalHref).toBeNull()
  })

  it('celulares con productKey phone:<key> enlaza a /celulares-uruguay/<key>', () => {
    const [row] = priceEventDropRows({
      topDrops: [
        drop({ vertical: 'celulares', category: null, productKey: 'phone:iphone-15-pro' }),
      ],
    })
    expect(row!.internalHref).toBe('/celulares-uruguay/iphone-15-pro')
  })

  it('sillas siempre enlaza al hub, sin depender de category/productKey', () => {
    const [row] = priceEventDropRows({
      topDrops: [drop({ vertical: 'sillas', category: null, productKey: null })],
    })
    expect(row!.internalHref).toBe('/sillas-escritorio-uruguay')
  })

  it('una vertical sin directorio propio no enlaza adentro, sólo afuera con url', () => {
    const [row] = priceEventDropRows({
      topDrops: [drop({ vertical: 'otra-cosa', category: null, productKey: null })],
    })
    expect(row!.internalHref).toBeNull()
    expect(row!.url).toBe('https://example.com/heladera')
  })
})

// ---------------------------------------------------------------------------
// priceEventFaq
// ---------------------------------------------------------------------------

const BANNED_WORDS = ['engaña', 'trucho', 'falso', 'estafa', 'fraude', 'mentira']

function snapshot(overrides: Partial<PriceEventSnapshotResponse> = {}): PriceEventSnapshotResponse {
  return {
    day: '2026-09-17',
    event: null,
    generatedAt: '2026-09-17T09:00:00.000Z',
    trackingSince: null,
    analyzed: 100,
    eligible: 40,
    byVertical: {},
    topDrops: [],
    dropsCount: 0,
    inflatedCount: 0,
    sellers: [],
    ...overrides,
  }
}

describe('priceEventFaq', () => {
  it('sin snapshot todavía explica las dos reglas base', () => {
    const faq = priceEventFaq(null)
    expect(faq.map(f => f.id)).toContain('ciberlunes-que-es-baja-real')
    expect(faq.map(f => f.id)).toContain('ciberlunes-que-es-tachado-por-encima')
    expect(faq.map(f => f.id)).not.toContain('ciberlunes-desde-cuando')
  })

  it('agrega "desde cuándo" sólo si el snapshot trae trackingSince, con la fecha formateada', () => {
    const faq = priceEventFaq(snapshot({ trackingSince: '2026-09-01' }))
    const entry = faq.find(f => f.id === 'ciberlunes-desde-cuando')
    expect(entry?.answer).toContain('1 de setiembre de 2026')
  })

  it('nunca inventa una fecha cuando trackingSince es null', () => {
    const faq = priceEventFaq(snapshot({ trackingSince: null }))
    expect(faq.some(f => f.id === 'ciberlunes-desde-cuando')).toBe(false)
  })

  it('ninguna respuesta usa una palabra acusatoria', () => {
    const faq = priceEventFaq(snapshot({ trackingSince: '2026-09-01' }))
    for (const item of faq) {
      for (const word of BANNED_WORDS) {
        expect(item.question.toLowerCase()).not.toContain(word)
        expect(item.answer.toLowerCase()).not.toContain(word)
      }
    }
  })

  it('siempre incluye la aclaración de que no hay regla de 30 días en Uruguay', () => {
    const faq = priceEventFaq(null)
    const entry = faq.find(f => f.id === 'ciberlunes-regla-de-30-dias')
    expect(entry?.answer).toMatch(/no en uruguay/i)
  })
})

// ---------------------------------------------------------------------------
// Contrato de la página (h1, SEO, JSON-LD, FAQ, sin acusaciones)
// ---------------------------------------------------------------------------

describe('la página /ciberlunes-y-black-friday-uruguay cumple su propio contrato', () => {
  const pagePath = join(__dirname, '..', '..', 'pages', 'ciberlunes-y-black-friday-uruguay.vue')
  const source = readFileSync(pagePath, 'utf8')

  it('tiene un único <h1', () => {
    expect(source.match(/<h1[\s>]/g)).toHaveLength(1)
  })

  it('declara useSeoMeta y el canonical literal (no localePath)', () => {
    expect(source).toMatch(/useSeoMeta\s*\(/)
    expect(source).toMatch(/rel:\s*'canonical'/)
    expect(source).toContain('https://cambio-uruguay.com/ciberlunes-y-black-friday-uruguay')
    expect(source).not.toMatch(/canonical[\s\S]{0,80}localePath/)
  })

  it('emite JSON-LD con BreadcrumbList', () => {
    expect(source).toContain('application/ld+json')
    expect(source).toContain('BreadcrumbList')
  })

  it('usa FaqSection', () => {
    expect(source).toContain('<FaqSection')
  })

  it('no contiene ninguna palabra acusatoria', () => {
    const lower = source.toLowerCase()
    for (const word of BANNED_WORDS) {
      expect(lower).not.toContain(word)
    }
  })

  it('no enlaza a /celulares-uruguay todavía (esa página no existe hasta que otra rama la publique)', () => {
    expect(source).not.toContain('/celulares-uruguay')
  })

  it('enlaza a los cuatro hubs relacionados que sí existen', () => {
    for (const path of [
      '/descuentos-con-tarjeta-uruguay',
      '/equipar-casa-uruguay',
      '/sillas-escritorio-uruguay',
      '/derechos-consumidor-compras-online',
    ]) {
      expect(source).toContain(path)
    }
  })
})
