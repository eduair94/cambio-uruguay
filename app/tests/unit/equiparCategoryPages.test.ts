import { describe, expect, it } from 'vitest'
import { UTE_IVA_RATE, UTE_TARIFFS } from '../../utils/householdBills'
import type { EquiparBand, EquiparItemDoc, EquiparOffer, EquiparTier } from '../../utils/equipar'
import {
  EQUIPAR_CATEGORY_PAGES,
  EQUIPAR_PLAN_REDONDO_SOURCE,
  equiparCategoryFaq,
  equiparCategoryPage,
  equiparCategoryTitle,
  equiparHourlyCostUyu,
  isEquiparCategorySlug,
  type EquiparCategoryPage,
} from '../../utils/equiparCategoryPages'

const band = (median: number, n = 12): EquiparBand => ({
  p25: Math.round(median * 0.8),
  median,
  p75: Math.round(median * 1.25),
  min: Math.round(median * 0.6),
  n,
})

const offer = (
  seller: string,
  priceUyu: number,
  condition: 'new' | 'used' = 'new'
): EquiparOffer => ({
  seller,
  title: `${seller} - producto`,
  url: `https://example.com/${seller}`,
  price: priceUyu,
  currency: 'UYU',
  priceUyu,
  condition,
  source: 'store',
  observedAt: '2026-09-10T00:00:00.000Z',
})

function item(
  category: string,
  variant: string,
  variantLabel: string,
  tier: EquiparTier,
  extra: Partial<EquiparItemDoc> = {}
): EquiparItemDoc {
  return {
    key: `${category}:${variant}`,
    category,
    categoryLabel: category,
    variant,
    variantLabel,
    room: 'cocina',
    tier,
    rank: 1,
    variantRank: 1,
    image: null,
    regime: 'commodity',
    reason: 'porque sí',
    usedOk: true,
    quantity: 1,
    newBand: null,
    usedBand: null,
    usedSavingPct: null,
    products: [],
    offers: [],
    suspectDropped: 0,
    observedAt: '2026-09-10T00:00:00.000Z',
    firstSeen: '2026-09-01',
    lastSeen: '2026-09-10',
    ...extra,
  }
}

describe('isEquiparCategorySlug', () => {
  it('acepta una clave real del registro', () => {
    expect(isEquiparCategorySlug('aire-acondicionado')).toBe(true)
  })

  it('rechaza claves parciales, vacías o con intento de path traversal', () => {
    expect(isEquiparCategorySlug('aire')).toBe(false)
    expect(isEquiparCategorySlug('')).toBe(false)
    expect(isEquiparCategorySlug('../x')).toBe(false)
  })
})

describe('equiparCategoryPage', () => {
  it('devuelve la página por clave y undefined si no existe', () => {
    expect(equiparCategoryPage('heladera')?.label).toBe('Heladera')
    expect(equiparCategoryPage('no-existe')).toBeUndefined()
  })
})

describe('forma editorial de las 38 páginas', () => {
  it('todo h1 mide 70 caracteres o menos', () => {
    for (const page of EQUIPAR_CATEGORY_PAGES) {
      expect(page.h1.length, `${page.key}: "${page.h1}" (${page.h1.length})`).toBeLessThanOrEqual(
        70
      )
    }
  })

  it('toda description mide entre 110 y 160 caracteres y no repite cifras del título', () => {
    for (const page of EQUIPAR_CATEGORY_PAGES) {
      expect(
        page.description.length,
        `${page.key}: "${page.description}" (${page.description.length})`
      ).toBeGreaterThanOrEqual(110)
      expect(page.description.length).toBeLessThanOrEqual(160)
      expect(page.description).not.toMatch(/\d/)
    }
  })

  it('ningún texto usa la grafía española "septiembre" (acá se escribe "setiembre")', () => {
    for (const page of EQUIPAR_CATEGORY_PAGES) {
      const haystack = [
        page.h1,
        page.description,
        page.planRedondo ?? '',
        ...(page.guide ?? []),
      ].join(' ')
      expect(haystack.toLowerCase()).not.toContain('septiembre')
    }
  })
})

describe('Plan Redondo de UTE', () => {
  const APLICA = new Set([
    'calefon',
    'aire-acondicionado',
    'secarropas',
    'cocina',
    'lavarropas',
    'horno-electrico',
    'microondas',
  ])

  it('sólo declara condición en las 7 categorías que verificó ute.com.uy', () => {
    for (const page of EQUIPAR_CATEGORY_PAGES) {
      if (APLICA.has(page.key)) {
        expect(page.planRedondo, page.key).not.toBeNull()
      } else {
        expect(page.planRedondo, page.key).toBeNull()
      }
    }
  })

  it('la heladera no está en el plan (UTE no la lista)', () => {
    expect(equiparCategoryPage('heladera')?.planRedondo).toBeNull()
  })

  it('publica una fuente verificable', () => {
    expect(EQUIPAR_PLAN_REDONDO_SOURCE).toBe(
      'https://www.ute.com.uy/clientes/soluciones-para-el-hogar/planredondo'
    )
  })
})

describe('equiparCategoryTitle', () => {
  it('mete la mediana nueva en el título cuando hay banda, y respeta 70 caracteres', () => {
    const page = equiparCategoryPage('aire-acondicionado') as EquiparCategoryPage
    const items = [item('aire-acondicionado', '12000', '12.000 BTU', 'B', { newBand: band(16085) })]
    const title = equiparCategoryTitle(page, items)
    expect(title).toContain('$ 16.085')
    expect(title.length).toBeLessThanOrEqual(70)
  })

  it('sin ninguna banda nueva, devuelve el h1 estático', () => {
    const page = equiparCategoryPage('aire-acondicionado') as EquiparCategoryPage
    expect(equiparCategoryTitle(page, [])).toBe(page.h1)
    const withoutBand = [item('aire-acondicionado', '12000', '12.000 BTU', 'B')]
    expect(equiparCategoryTitle(page, withoutBand)).toBe(page.h1)
  })
})

describe('equiparCategoryFaq', () => {
  it('para colchón (usedOk false) responde que NO conviene usado', () => {
    const page = equiparCategoryPage('colchon') as EquiparCategoryPage
    const items = [
      item('colchon', '2plazas', '2 plazas (140 cm)', 'S', {
        usedOk: false,
        usedNote: 'Es la única compra de esta lista donde el usado no se recomienda.',
        newBand: band(9500),
      }),
    ]
    const faq = equiparCategoryFaq(page, items, '2026-09-10T00:00:00.000Z')
    const usadoQA = faq.find(qa => qa.question.toLowerCase().includes('usad'))
    expect(usadoQA).toBeDefined()
    expect(usadoQA?.answer.startsWith('No')).toBe(true)
    expect(usadoQA?.answer.toLowerCase()).not.toMatch(/^sí/)
    expect(usadoQA?.answer.toLowerCase()).not.toContain('sí, conviene')
  })

  it('para heladera con banda nueva y usada, incluye la mediana de cada una', () => {
    const page = equiparCategoryPage('heladera') as EquiparCategoryPage
    const items = [
      item('heladera', 'media', 'Media (130 a 330 L)', 'S', {
        newBand: band(24000),
        usedBand: band(14000),
        usedSavingPct: 41.6,
      }),
    ]
    const faq = equiparCategoryFaq(page, items, '2026-09-10T00:00:00.000Z')
    const answers = faq.map(qa => qa.answer).join(' | ')
    expect(answers).toContain('24.000')
    expect(answers).toContain('14.000')
  })

  it('sólo pregunta por el Plan Redondo cuando la categoría lo declara', () => {
    const heladera = equiparCategoryPage('heladera') as EquiparCategoryPage
    const calefon = equiparCategoryPage('calefon') as EquiparCategoryPage
    const faqHeladera = equiparCategoryFaq(heladera, [], null)
    const faqCalefon = equiparCategoryFaq(calefon, [], null)
    expect(faqHeladera.some(qa => qa.question.includes('Plan Redondo'))).toBe(false)
    expect(faqCalefon.some(qa => qa.question.includes('Plan Redondo'))).toBe(true)
  })

  it('nombra al vendedor de la oferta nueva más barata de la variante con más datos', () => {
    const page = equiparCategoryPage('heladera') as EquiparCategoryPage
    const items = [
      item('heladera', 'frigobar', 'Frigobar (hasta 120 L)', 'S', {
        newBand: band(12000, 4),
        offers: [offer('TiendaChica', 11500)],
      }),
      item('heladera', 'media', 'Media (130 a 330 L)', 'S', {
        newBand: band(24000, 30),
        offers: [offer('ElDorado', 23000), offer('TYT', 22500)],
      }),
    ]
    const faq = equiparCategoryFaq(page, items, '2026-09-10T00:00:00.000Z')
    const dondeQA = faq.find(qa => qa.question.startsWith('¿Dónde'))
    expect(dondeQA?.answer).toContain('TYT')
  })
})

describe('equiparHourlyCostUyu', () => {
  it('cobra kWh × $/kWh del escalón 101-600 × (1 + IVA), redondeado a un decimal', () => {
    const bracket = UTE_TARIFFS.find(t => t.id === 'simple')?.brackets?.find(b => b.upTo === 600)
    if (!bracket) throw new Error('fixture: falta el escalón 101-600 en UTE_TARIFFS')
    const expected = Math.round(2 * bracket.pricePerKwh * (1 + UTE_IVA_RATE) * 10) / 10
    expect(equiparHourlyCostUyu(2000)).toBe(expected)
  })

  it('estufa (2000 W) y ventilador (60 W) son los únicos con wattsExample', () => {
    for (const page of EQUIPAR_CATEGORY_PAGES) {
      if (page.key === 'estufa') expect(page.wattsExample).toBe(2000)
      else if (page.key === 'ventilador') expect(page.wattsExample).toBe(60)
      else expect(page.wattsExample).toBeNull()
    }
  })
})
