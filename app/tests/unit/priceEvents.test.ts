import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  priceEventCountdown,
  priceEventCountdownHeadline,
  priceEventDropRows,
  priceEventFaq,
  priceEventFormatDate,
  priceEventOtherUnconfirmed,
  priceEventPastEditions,
  priceEventPct,
  type PriceEventCountdown,
  type PriceEventDropDoc,
  type PriceEventSnapshotResponse,
} from '../../utils/priceEvents'

// ---------------------------------------------------------------------------
// priceEventCountdown
//
// El bug que este bloque existe para atrapar: `Math.max(0, …)` clampeaba `daysUntilStart` a 0
// cualquier día DENTRO de la ventana de Black Friday (27 al 30 de noviembre), no sólo el primero, y
// la página leía ese 0 como "hoy es el primer día" los cuatro días seguidos. Cada día de la ventana
// tiene ahora su propio caso: el día antes, el primer día, un día del medio y el último día.
// ---------------------------------------------------------------------------

describe('priceEventCountdown', () => {
  it('un día antes del inicio: upcoming, con daysUntilStart', () => {
    const result = priceEventCountdown('2026-11-26')
    expect(result).toEqual({
      event: expect.objectContaining({ key: 'black-friday-2026' }),
      status: 'upcoming',
      daysUntilStart: 1,
      endsOn: null,
    })
  })

  it('el día del inicio: first-day, nunca upcoming con daysUntilStart 0', () => {
    const result = priceEventCountdown('2026-11-27')
    expect(result).toEqual({
      event: expect.objectContaining({ key: 'black-friday-2026' }),
      status: 'first-day',
      daysUntilStart: null,
      endsOn: null,
    })
  })

  it('un día del medio de la ventana (29): in-progress, con endsOn', () => {
    const result = priceEventCountdown('2026-11-29')
    expect(result).toEqual({
      event: expect.objectContaining({ key: 'black-friday-2026' }),
      status: 'in-progress',
      daysUntilStart: null,
      endsOn: '2026-11-30',
    })
  })

  it('el último día de la ventana (30): sigue in-progress, no "primer día"', () => {
    const result = priceEventCountdown('2026-11-30')
    expect(result).toEqual({
      event: expect.objectContaining({ key: 'black-friday-2026' }),
      status: 'in-progress',
      daysUntilStart: null,
      endsOn: '2026-11-30',
    })
  })

  it('dentro de la ventana adivinada de CyberLunes noviembre (05), cae en undated sólo si NO hay confirmado activo — acá Black Friday todavía gana', () => {
    // 2026-11-05 cae en la ventana [01, 08] que activeEvent() usa para la edición SIN fecha — pero
    // priceEventCountdown no depende de esa ventana: Black Friday, confirmado, sigue siendo el
    // evento a mostrar mientras no haya terminado.
    const result = priceEventCountdown('2026-11-05')
    expect(result.event?.key).toBe('black-friday-2026')
    expect(result.status).toBe('upcoming')
  })

  // El segundo bug que esta fecha atrapa: el 9 de noviembre la ventana adivinada de CyberLunes
  // [01, 08] YA CERRÓ, pero Black Friday (start 27) sigue sin empezar — el resultado tiene que
  // seguir siendo Black Friday `upcoming`, nunca `undated` ni `none` por culpa de una ventana ajena
  // que ya venció.
  it('con la ventana de CyberLunes vencida (09) pero Black Friday por venir: upcoming BF, no undated ni none', () => {
    const result = priceEventCountdown('2026-11-09')
    expect(result).toEqual({
      event: expect.objectContaining({ key: 'black-friday-2026' }),
      status: 'upcoming',
      daysUntilStart: 18,
      endsOn: null,
    })
  })

  // El bug de fondo de esta ronda: sin la regla de vencimiento, esto seguía devolviendo `undated`
  // con la edición de CyberLunes noviembre — una afirmación falsa en diciembre, con su ventana
  // adivinada (1 al 8 de noviembre) cerrada hace semanas y ningún evento confirmado por delante.
  it('el día después del fin de Black Friday, con la ventana de CyberLunes también vencida: none, sin evento', () => {
    const result = priceEventCountdown('2026-12-01')
    expect(result).toEqual({ event: null, status: 'none', daysUntilStart: null, endsOn: null })
  })
})

describe('priceEventCountdownHeadline', () => {
  const base: PriceEventCountdown = {
    event: {
      key: 'black-friday-2026',
      label: 'Black Friday 2026',
      start: '2026-11-27',
      end: '2026-11-30',
      confirmed: true,
      source: null,
      note: '',
    },
    status: 'upcoming',
    daysUntilStart: null,
    endsOn: null,
  }

  it('upcoming: "Faltan N días para <label>."', () => {
    expect(priceEventCountdownHeadline({ ...base, status: 'upcoming', daysUntilStart: 5 })).toBe(
      'Faltan 5 días para Black Friday 2026.'
    )
  })

  it('first-day: "Hoy empieza <label>." — nunca "faltan 0 días"', () => {
    expect(priceEventCountdownHeadline({ ...base, status: 'first-day' })).toBe(
      'Hoy empieza Black Friday 2026.'
    )
  })

  it('in-progress: "<label>: en curso hasta el <fecha>."', () => {
    expect(
      priceEventCountdownHeadline({ ...base, status: 'in-progress', endsOn: '2026-11-30' })
    ).toBe('Black Friday 2026: en curso hasta el 30 de noviembre de 2026.')
  })

  it('undated: "<label>: a confirmar por la CEDU."', () => {
    expect(
      priceEventCountdownHeadline({
        ...base,
        event: { ...base.event, key: 'ciberlunes-2026-11', label: 'CyberLunes noviembre 2026' },
        status: 'undated',
      })
    ).toBe('CyberLunes noviembre 2026: a confirmar por la CEDU.')
  })

  it('none: avisa que no hay fechas publicadas, sin nombrar un evento vencido', () => {
    expect(priceEventCountdownHeadline({ ...base, event: null, status: 'none' })).toBe(
      'Todavía no hay fechas publicadas para la próxima edición de CyberLunes ni de Black Friday.'
    )
  })
})

// ---------------------------------------------------------------------------
// priceEventOtherUnconfirmed
// ---------------------------------------------------------------------------

describe('priceEventOtherUnconfirmed', () => {
  it('Black Friday nearer (gana el titular): la edición sin fecha se muestra aparte', () => {
    const result = priceEventOtherUnconfirmed('2026-09-17')
    expect(result?.key).toBe('ciberlunes-2026-11')
  })

  it('todavía dentro de su ventana adivinada (05 de noviembre): se muestra aparte igual', () => {
    const result = priceEventOtherUnconfirmed('2026-11-05')
    expect(result?.key).toBe('ciberlunes-2026-11')
  })

  it('con la ventana vencida (09 de noviembre) pero Black Friday por venir: ya no se muestra aparte', () => {
    expect(priceEventOtherUnconfirmed('2026-11-09')).toBeNull()
  })

  it('después de Black Friday, con la ventana también vencida: ninguna razón para mostrarla aparte', () => {
    expect(priceEventOtherUnconfirmed('2026-12-01')).toBeNull()
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
// priceEventPct
// ---------------------------------------------------------------------------

describe('priceEventPct', () => {
  it('coma decimal, un decimal fijo, sin espacio antes del %', () => {
    expect(priceEventPct(11.3)).toBe('11,3%')
  })

  it('completa el decimal que falta (11 -> "11,0%"), nunca lo trunca', () => {
    expect(priceEventPct(11)).toBe('11,0%')
  })

  it('redondea a 1 decimal si le llega algo con más (no se espera de aggregate.ts, pero no truena)', () => {
    expect(priceEventPct(11.36)).toBe('11,4%')
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

  it('el enlace de "Ver oferta" (tienda de terceros) lleva rel="nofollow noopener", como equipar/sillas', () => {
    expect(source).toMatch(/:href="row\.url"[^>]*rel="nofollow noopener"[^>]*>Ver oferta/)
  })

  it('los enlaces de fuente (CEDU/CUTI/Sodimac) conservan rel="noopener noreferrer"', () => {
    // Tres citas de fuente en el bloque de fechas: la del titular, la de "otra edición sin fecha" y
    // la de cada edición pasada — ninguna es un enlace de tienda y ninguna debe llevar `nofollow`.
    const sourceLinks = source.match(/:href="[^"]*\.source"[^>]*rel="[^"]*"/g) ?? []
    expect(sourceLinks.length).toBeGreaterThanOrEqual(3)
    for (const link of sourceLinks) {
      expect(link).toContain('rel="noopener noreferrer"')
    }
  })
})
