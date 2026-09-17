import { describe, expect, it } from 'vitest'
import { UTE_IVA_RATE, UTE_TARIFFS } from '../../utils/householdBills'
import type { EquiparBand, EquiparItemDoc, EquiparOffer, EquiparTier } from '../../utils/equipar'
import {
  EQUIPAR_CATEGORY_PAGES,
  EQUIPAR_PLAN_REDONDO_SOURCE,
  EQUIPAR_PLAN_REDONDO_WINDOW,
  equiparCategoryFaq,
  equiparCategoryPage,
  equiparCategoryTitle,
  equiparGrammarFor,
  equiparHourlyCostUyu,
  equiparPlanRedondoWindowApplies,
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
  it('para colchón (usedOk false en el registro) responde que NO conviene usado, con o sin items', () => {
    const page = equiparCategoryPage('colchon') as EquiparCategoryPage
    expect(page.usedOk).toBe(false)
    for (const items of [
      [],
      [item('colchon', '2plazas', '2 plazas (140 cm)', 'S', { newBand: band(9500) })],
    ]) {
      const faq = equiparCategoryFaq(page, items, '2026-09-10T00:00:00.000Z')
      const usadoQA = faq.find(qa => qa.question.toLowerCase().includes('usad'))
      expect(usadoQA).toBeDefined()
      expect(usadoQA?.answer.startsWith('No')).toBe(true)
      expect(usadoQA?.answer.toLowerCase()).not.toMatch(/^sí/)
      expect(usadoQA?.answer.toLowerCase()).not.toContain('sí, conviene')
    }
  })

  it('C1: una categoría usedOk:true (heladera) sin items NO dice que el usado no conviene', () => {
    const heladera = equiparCategoryPage('heladera') as EquiparCategoryPage
    expect(heladera.usedOk).toBe(true)
    const faq = equiparCategoryFaq(heladera, [], null)
    const usadoQA = faq.find(qa => qa.question.toLowerCase().includes('usad'))
    expect(usadoQA?.answer.toLowerCase()).not.toContain('no conviene')
    expect(usadoQA?.answer.startsWith('Sí')).toBe(true)
    // Sin banda usada relevada, lo dice en vez de callarlo.
    expect(usadoQA?.answer).toContain('Todavía no relevamos suficientes ofertas usadas')
  })

  it('usedOk/usedNote salen siempre de la página (registro), nunca de si la corrida trajo items', () => {
    // Mismo escenario que rompía antes del fix: una categoría usedOk:true sin ningún item hoy.
    for (const page of EQUIPAR_CATEGORY_PAGES) {
      const faq = equiparCategoryFaq(page, [], null)
      const usadoQA = faq.find(qa => qa.question.toLowerCase().includes('usad'))
      if (page.usedOk) {
        // Sin nota del registro la respuesta es neutral (I3: no afirma que sea segura), pero nunca
        // dice que no conviene.
        expect(usadoQA?.answer.startsWith('No'), page.key).toBe(false)
        expect(usadoQA?.answer.toLowerCase(), page.key).not.toContain('no conviene')
        if (page.usedNote) expect(usadoQA?.answer.startsWith('Sí'), page.key).toBe(true)
      } else {
        expect(usadoQA?.answer.startsWith('No'), page.key).toBe(true)
      }
    }
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

  // Los items ahora traen hasta 6 usados detrás de los nuevos: un usado más barato no puede
  // contestar "¿dónde está más barata?", que habla de la oferta nueva.
  it('no nombra a un vendedor de usado aunque sea más barato', () => {
    const page = equiparCategoryPage('heladera') as EquiparCategoryPage
    const items = [
      item('heladera', 'media', 'Media (130 a 330 L)', 'S', {
        newBand: band(24000, 30),
        offers: [offer('ElDorado', 23000), offer('Marketplace', 9000, 'used')],
      }),
    ]
    const dondeQA = equiparCategoryFaq(page, items, null).find(qa =>
      qa.question.startsWith('¿Dónde')
    )
    expect(dondeQA?.answer).toContain('ElDorado')
    expect(dondeQA?.answer).not.toContain('Marketplace')
  })

  it('la respuesta del Plan Redondo usa la ventana exportada', () => {
    const calefon = equiparCategoryPage('calefon') as EquiparCategoryPage
    const answer =
      equiparCategoryFaq(calefon, [], null).find(qa => qa.question.includes('Plan Redondo'))
        ?.answer ?? ''
    expect(answer).toContain(
      `entre el ${EQUIPAR_PLAN_REDONDO_WINDOW.from} y el ${EQUIPAR_PLAN_REDONDO_WINDOW.to}`
    )
    expect(answer).toContain(`verificado el ${EQUIPAR_PLAN_REDONDO_WINDOW.verifiedAt}`)
  })
})

describe('I2: el FAQ nombra la variante y no mezcla datos de dos variantes', () => {
  const heladera = (): EquiparCategoryPage => equiparCategoryPage('heladera') as EquiparCategoryPage
  const usadoDe = (items: EquiparItemDoc[]): string =>
    equiparCategoryFaq(heladera(), items, '2026-09-10T00:00:00.000Z').find(qa =>
      qa.question.toLowerCase().includes('usad')
    )?.answer ?? ''
  const dondeDe = (items: EquiparItemDoc[]): string =>
    equiparCategoryFaq(heladera(), items, '2026-09-10T00:00:00.000Z').find(qa =>
      qa.question.startsWith('¿Dónde')
    )?.answer ?? ''

  it('la mediana usada y el ahorro salen del MISMO item, con su variante', () => {
    // Antes: la mediana usada salía de la primera variante con banda usada (media, sin ahorro) y el
    // ahorro de la primera con ahorro (grande): "$ 14.000 ... ahorra 50 %", dos variantes pegadas.
    const items = [
      item('heladera', 'media', 'Media (130 a 330 L)', 'S', {
        usedBand: band(14000, 8),
        usedSavingPct: null,
      }),
      item('heladera', 'grande', 'Grande (más de 330 L)', 'S', {
        newBand: band(40000, 20),
        usedBand: band(20000, 6),
        usedSavingPct: 50,
      }),
    ]
    const answer = usadoDe(items)
    expect(answer).toContain('Media (130 a 330 L): $ 14.000 (8 ofertas)')
    expect(answer).toContain('Grande (más de 330 L): $ 20.000 (6 ofertas), alrededor de 50 % menos')
    // Ningún ahorro queda pegado a la mediana de la variante que no lo tiene.
    const media = answer.slice(answer.indexOf('Media ('), answer.indexOf('Grande ('))
    expect(media).not.toContain('%')
  })

  it('"¿dónde está más barata?" dice en qué variante, y compara variantes cuando hay varias', () => {
    const items = [
      item('heladera', 'frigobar', 'Frigobar (hasta 120 L)', 'S', {
        newBand: band(12000, 9),
        offers: [offer('TiendaChica', 11500)],
      }),
      item('heladera', 'media', 'Media (130 a 330 L)', 'S', {
        newBand: band(24000, 30),
        offers: [offer('ElDorado', 23000), offer('TYT', 22500)],
      }),
    ]
    const answer = dondeDe(items)
    expect(answer).toContain('Media (130 a 330 L), TYT a $ 22.500')
    expect(answer).toContain('Frigobar (hasta 120 L), TiendaChica a $ 11.500')
    expect(answer).not.toContain('ElDorado')
  })

  it('con una sola variante la nombra igual', () => {
    const items = [
      item('heladera', 'media', 'Media (130 a 330 L)', 'S', {
        newBand: band(24000, 30),
        offers: [offer('TYT', 22500)],
      }),
    ]
    expect(dondeDe(items)).toContain('en Media (130 a 330 L) la tenía TYT a $ 22.500')
  })
})

describe('I3: el FAQ no afirma que una compra usada sea segura', () => {
  it('ninguna respuesta de ninguna categoría dice "segura", con o sin datos', () => {
    for (const page of EQUIPAR_CATEGORY_PAGES) {
      const withData = [
        item(page.key, 'x', 'Variante', page.tier, {
          newBand: band(20000),
          usedBand: band(12000, 6),
          usedSavingPct: 40,
          offers: [offer('Tienda', 19000)],
        }),
      ]
      for (const items of [[], withData]) {
        for (const qa of equiparCategoryFaq(page, items, null)) {
          expect(qa.answer.toLowerCase(), `${page.key}: ${qa.answer}`).not.toContain('segur')
        }
      }
    }
  })

  it('sin nota de usado (estufa, a gas incluida) sólo dice que el usado se mide aparte', () => {
    const estufa = equiparCategoryPage('estufa') as EquiparCategoryPage
    expect(estufa.usedOk).toBe(true)
    expect(estufa.usedNote).toBeNull()
    const answer =
      equiparCategoryFaq(estufa, [], null).find(qa => qa.question.toLowerCase().includes('usad'))
        ?.answer ?? ''
    expect(answer.startsWith('Sí')).toBe(false)
    expect(answer.startsWith('No')).toBe(false)
    expect(answer).toContain('segunda mano')
    expect(answer).toContain('aparte')
  })

  it('con nota de usado la conserva', () => {
    const heladera = equiparCategoryPage('heladera') as EquiparCategoryPage
    const answer =
      equiparCategoryFaq(heladera, [], null).find(qa => qa.question.toLowerCase().includes('usad'))
        ?.answer ?? ''
    expect(answer).toContain(heladera.usedNote as string)
  })
})

describe('Plan Redondo: la ventana de compras sólo donde la categoría entra', () => {
  const EXCLUIDAS = ['microondas', 'horno-electrico', 'lavarropas']

  it('las tres categorías que el plan excluye no llevan la ventana ni "se acredita"', () => {
    for (const key of EXCLUIDAS) {
      const page = equiparCategoryPage(key) as EquiparCategoryPage
      expect(equiparPlanRedondoWindowApplies(page), key).toBe(false)
      const answer =
        equiparCategoryFaq(page, [], null).find(qa => qa.question.includes('Plan Redondo'))
          ?.answer ?? ''
      expect(answer, key).toContain(page.planRedondo as string)
      expect(answer, key).not.toContain('Rige para compras')
      expect(answer, key).not.toContain('se acredita')
      expect(answer, key).toContain(`verificado el ${EQUIPAR_PLAN_REDONDO_WINDOW.verifiedAt}`)
    }
  })

  it('las que entran (calefón, aire, secarropas, cocina) sí la llevan; sin plan, tampoco aplica', () => {
    for (const key of ['calefon', 'aire-acondicionado', 'secarropas', 'cocina']) {
      expect(equiparPlanRedondoWindowApplies(equiparCategoryPage(key) as EquiparCategoryPage), key).toBe(
        true
      )
    }
    expect(
      equiparPlanRedondoWindowApplies(equiparCategoryPage('heladera') as EquiparCategoryPage)
    ).toBe(false)
  })
})

describe('equiparGrammarFor', () => {
  it('devuelve el género de la categoría y masculino singular para una desconocida', () => {
    expect(equiparGrammarFor('estufa')).toEqual({ gender: 'f', plural: false })
    expect(equiparGrammarFor('ventilador')).toEqual({ gender: 'm', plural: false })
    expect(equiparGrammarFor('toallas')).toEqual({ gender: 'f', plural: true })
    expect(equiparGrammarFor('no-existe')).toEqual({ gender: 'm', plural: false })
  })
})

describe('I1: concordancia de género/número en las respuestas por defecto', () => {
  it('"no conviene" concuerda: masculino singular (cuchillo) y femenino plural (toallas)', () => {
    const cuchillo = equiparCategoryPage('cuchillo') as EquiparCategoryPage
    const toallas = equiparCategoryPage('toallas') as EquiparCategoryPage
    expect(cuchillo.usedOk).toBe(false)
    expect(cuchillo.usedNote).toBeNull()
    expect(toallas.usedOk).toBe(false)
    expect(toallas.usedNote).toBeNull()

    const cuchilloAnswer =
      equiparCategoryFaq(cuchillo, [], null).find(qa => qa.question.toLowerCase().includes('usad'))
        ?.answer ?? ''
    const toallasAnswer =
      equiparCategoryFaq(toallas, [], null).find(qa => qa.question.toLowerCase().includes('usad'))
        ?.answer ?? ''

    expect(cuchilloAnswer).toContain('comprarlo usado no conviene')
    expect(toallasAnswer).toContain('comprarlas usadas no conviene')
  })

  it('"no conviene" concuerda en masculino plural (cubiertos, forzando usedOk:false para el caso)', () => {
    // El registro real dice `cubiertos.usedOk === true` (comprobado en el test de arriba con
    // EQUIPAR_CATEGORY_PAGES), así que no hay ninguna categoría real masculina-plural con
    // usedOk:false para ejercitar esta rama. Se construye la página a mano para probar la
    // concordancia del helper de gramática en ese caso, sin tocar el dato real de `cubiertos`.
    const cubiertosNoUsado: EquiparCategoryPage = {
      ...(equiparCategoryPage('cubiertos') as EquiparCategoryPage),
      usedOk: false,
      usedNote: null,
    }
    const answer =
      equiparCategoryFaq(cubiertosNoUsado, [], null).find(qa =>
        qa.question.toLowerCase().includes('usad')
      )?.answer ?? ''
    expect(answer).toContain('comprarlos usados no conviene')
  })

  it('"dónde está/están más barato/a" concuerda: masculino, femenino plural y masculino plural', () => {
    const cuchillo = equiparCategoryPage('cuchillo') as EquiparCategoryPage
    const toallas = equiparCategoryPage('toallas') as EquiparCategoryPage
    const cubiertos = equiparCategoryPage('cubiertos') as EquiparCategoryPage

    const answerFor = (page: EquiparCategoryPage): string =>
      equiparCategoryFaq(page, [], null).find(qa => qa.question.startsWith('¿Dónde'))?.answer ?? ''

    expect(answerFor(cuchillo)).toContain('dónde está más barato')
    expect(answerFor(toallas)).toContain('dónde están más baratas')
    expect(answerFor(cubiertos)).toContain('dónde están más baratos')
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
