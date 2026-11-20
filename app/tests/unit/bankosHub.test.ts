// El resumen del índice /descuentos-con-tarjeta-uruguay sale contado de la misma respuesta que la
// página ya pide en el servidor (GET /api/bankos/brands). Estos casos atan cada cifra publicada a
// esa cuenta, y la plantilla a no escribir ninguna a mano.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { reduceBrands, type BrandsRawData } from '../../utils/bankosBrands'
import {
  EMPTY_HUB_SUMMARY,
  HUB_DAY_MIN_BRANDS,
  buildHubFaq,
  buildHubSummary,
  hubHeadline,
  hubReadLabel,
  namesWeekday,
  type HubInput,
} from '../../utils/bankosHub'

/** Un catálogo chico con las formas que importan: medio de pago único, días, "Otros", empates. */
const RAW: BrandsRawData = {
  brands: {
    cafe: { brandId: 'cafe', name: 'Café Uno', categories: ['Cafeterías'] },
    super: { brandId: 'super', name: 'Super Dos', categories: ['Mercados'] },
    super2: { brandId: 'super2', name: 'Super Cuatro', categories: ['Mercados'] },
    farma: { brandId: 'farma', name: 'Farmacia Tres', categories: ['Farmacias'] },
    resto: { brandId: 'resto', name: 'Resto Cinco', categories: ['Restaurantes', 'Otros'] },
    varios: { brandId: 'varios', name: 'Varios Seis', categories: ['Otros'] },
  },
  brandLocations: {
    cafe: ['l1', 'l2'],
    super: ['l3', 'l4', 'l5'],
    super2: ['l6'],
    farma: ['l7'],
    resto: ['l8', 'l9', 'l10', 'l11'],
    varios: ['l12'],
  },
  bankBrands: {
    itau: {
      cafe: { creditDescription: '15% con crédito Itaú', debitDescription: null },
      super: {
        creditDescription: '15% con crédito Itaú',
        debitDescription: '15% con débito Itaú Volar',
      },
      resto: { creditDescription: '25% con Itaú Black', debitDescription: null },
    },
    brou: {
      super: {
        creditDescription: 'Los miércoles 10% con crédito BROU',
        debitDescription: null,
        availableDays: [3],
      },
      super2: {
        creditDescription: 'Los miércoles 10% con crédito BROU',
        debitDescription: '5% con débito BROU',
      },
      farma: { creditDescription: '20% con crédito BROU', debitDescription: null },
      varios: { creditDescription: '20% con crédito BROU', debitDescription: null },
    },
    clubelpais: {
      resto: {
        creditDescription: null,
        debitDescription: '20% presentando tarjeta Club El País',
      },
    },
  },
}

function input(raw: BrandsRawData = RAW, generatedAt: string | null = '2026-11-20T02:54:32.160Z') {
  const reduced = reduceBrands(raw, {})
  return {
    ...reduced,
    brands: reduced.brands.map(b => ({ ...b, pageSlug: b.locations >= 2 ? b.brandId : null })),
    generatedAt,
  } satisfies HubInput
}

const summary = buildHubSummary(input())
const label = hubReadLabel(summary.generatedAt)

describe('buildHubSummary', () => {
  it('toma los totales de la lectura y cuenta emisores y textos', () => {
    expect(summary.totals).toEqual({
      brands: 6,
      locations: 12,
      issuers: 3,
      offerTexts: 7,
      installmentTexts: 0,
      dayTexts: 1,
      dailyTexts: 0,
      // Super Cuatro: "Los miércoles" en el texto del BROU, sin días marcados.
      dayOnlyInText: 1,
    })
    expect(summary.generatedAt).toBe('2026-11-20T02:54:32.160Z')
  })

  it('ordena los emisores por marcas y trae cada campo del recorte', () => {
    expect(summary.issuers.map(i => i.bankId)).toEqual(['brou', 'itau', 'clubelpais'])
    const brou = summary.issuers[0]!
    expect(brou).toMatchObject({
      name: 'BROU',
      brands: 4,
      locations: 6,
      exclusive: 3,
      debit: 1,
      singleMedium: false,
    })
  })

  it('no inventa un débito aparte para un emisor de un solo medio de pago', () => {
    const club = summary.issuers.find(i => i.bankId === 'clubelpais')!
    expect(club.debit).toBeNull()
    expect(club.singleMedium).toBe(true)
    expect(summary.singleMedium).toEqual(['Club El País'])
  })

  it('cita el texto más repetido de cada emisor y medio de pago', () => {
    const itau = summary.issuers.find(i => i.bankId === 'itau')!
    expect(itau.topCredit).toEqual({ text: '15% con crédito Itaú', brands: 2 })
    expect(itau.topDebit).toEqual({ text: '15% con débito Itaú Volar', brands: 1 })
    const brou = summary.issuers[0]!
    // Dos textos con 2 marcas: el desempate es el de reduceBrands (alfabético).
    expect(brou.topCredit).toEqual({ text: '20% con crédito BROU', brands: 2 })
    expect(brou.topDebit).toEqual({ text: '5% con débito BROU', brands: 1 })
  })

  it('cuenta las marcas cuyo texto nombra un día, con o sin días marcados', () => {
    expect(summary.issuers.find(i => i.bankId === 'brou')!.brandsNamingDay).toBe(2)
    expect(summary.issuers.find(i => i.bankId === 'itau')!.brandsNamingDay).toBe(0)
    const raw: BrandsRawData = JSON.parse(JSON.stringify(RAW))
    raw.bankBrands.brou!.farma!.creditDescription = 'Los viernes 10% con crédito BROU'
    const s = buildHubSummary(input(raw))
    expect(s.issuers.find(i => i.bankId === 'brou')!.brandsNamingDay).toBe(3)
    expect(s.totals.dayOnlyInText).toBe(2)
  })

  it('reconoce días escritos de varias formas, y no confunde el mar con el martes', () => {
    expect(namesWeekday('Los viernes 20% con OCA')).toBe(true)
    expect(namesWeekday('20% los fines de semana')).toBe(true)
    expect(namesWeekday('25% en categorías seleccionadas (mar, jue y dom)')).toBe(true)
    expect(namesWeekday('15% todos los días con Itaú')).toBe(false)
    expect(namesWeekday('10% en el Hotel Vista al Mar')).toBe(false)
    expect(namesWeekday('20% en Mar y Sierra, y Domino')).toBe(false)
  })

  it('arma el podio de cada rubro con su desempate y traduce el rubro a su etiqueta', () => {
    const mercados = summary.categories.find(c => c.category === 'Mercados')!
    expect(mercados.label).toBe('Supermercados')
    expect(mercados.brands).toBe(2)
    expect(mercados.podium).toEqual([
      { bankId: 'brou', name: 'BROU', brands: 2 },
      { bankId: 'itau', name: 'Itaú', brands: 1 },
    ])
    const restaurantes = summary.categories.find(c => c.category === 'Restaurantes')!
    // Empate 1 a 1: va por nombre.
    expect(restaurantes.podium.map(p => p.name)).toEqual(['Club El País', 'Itaú'])
  })

  it('deja "Otros" afuera de los rubros y de los rubros fuertes de cada emisor', () => {
    expect(summary.categories.some(c => c.category === 'Otros')).toBe(false)
    for (const i of summary.issuers) {
      expect(
        i.topCategories.some(c => c.category === 'Otros'),
        i.name
      ).toBe(false)
      expect(i.topCategories.length).toBeLessThanOrEqual(2)
    }
    expect(summary.issuers[0]!.topCategories).toEqual([
      { category: 'Mercados', label: 'Supermercados', brands: 2 },
      { category: 'Farmacias', label: 'Farmacias', brands: 1 },
    ])
  })

  it('lista a los emisores del catálogo sin descuentos en esta lectura', () => {
    expect(summary.withoutDiscounts).toContain('Santander')
    expect(summary.withoutDiscounts).not.toContain('BROU')
    expect(summary.withoutDiscounts).toHaveLength(7)
  })

  it('separa líderes por marcas y por locales', () => {
    expect(summary.leaders.byBrands?.bankId).toBe('brou')
    // Itaú: 2 + 3 + 4 = 9 locales contra 6 del BROU.
    expect(summary.leaders.byLocations?.bankId).toBe('itau')
  })

  it('conserva las marcas de la sección de marcas: con página, por locales', () => {
    expect(summary.topBrands.map(b => b.pageSlug)).toEqual(['resto', 'super', 'cafe'])
  })

  it('devuelve el resumen vacío ante una entrada nula o rota', () => {
    expect(buildHubSummary(null)).toEqual(EMPTY_HUB_SUMMARY)
    expect(buildHubSummary(undefined)).toEqual(EMPTY_HUB_SUMMARY)
    expect(buildHubSummary({})).toEqual(EMPTY_HUB_SUMMARY)
    expect(buildHubSummary({ brands: 'x' } as unknown as HubInput)).toEqual(EMPTY_HUB_SUMMARY)
  })
})

describe('hubReadLabel', () => {
  it('fecha la lectura en la hora de Uruguay', () => {
    // 02:54 UTC del 20 son las 23:54 del 19 en Montevideo.
    expect(label).toBe('19 de noviembre de 2026')
    expect(hubReadLabel('2027-04-30')).toBe('30 de abril de 2027')
  })
  it('no inventa una fecha', () => {
    expect(hubReadLabel(null)).toBe('')
    expect(hubReadLabel('no es fecha')).toBe('')
  })
})

describe('hubHeadline', () => {
  it('nombra a dos líderes cuando no coinciden', () => {
    expect(hubHeadline(summary, label)).toBe(
      'Hay 6 marcas con descuento en 12 locales, de 3 emisores, según la lectura del 19 de noviembre de 2026. BROU es el que cubre más marcas (4) y Itaú el que tiene más locales (9).'
    )
  })
  it('nombra a uno solo cuando lidera las dos cuentas, y sin fecha no la menciona', () => {
    const raw: BrandsRawData = JSON.parse(JSON.stringify(RAW))
    delete raw.bankBrands.itau!.resto
    const s = buildHubSummary(input(raw, null))
    expect(hubHeadline(s, hubReadLabel(s.generatedAt))).toBe(
      'Hay 6 marcas con descuento en 12 locales, de 3 emisores. BROU es el que más cubre: 4 marcas y 6 locales.'
    )
  })
  it('escribe miles con punto', () => {
    const s = { ...summary, totals: { ...summary.totals, brands: 2530, locations: 4849 } }
    expect(hubHeadline(s, '')).toContain('2.530 marcas con descuento en 4.849 locales')
  })
  it('no dice nada sin datos', () => {
    expect(hubHeadline(EMPTY_HUB_SUMMARY, label)).toBe('')
  })
})

const STATIC_FAQ_IDS = [
  'que-bancos',
  'como-ver',
  'credito-debito',
  'combinar',
  'mercadopago',
  'cerca',
  'gratis',
  'actualizacion',
  'fuente',
]

describe('buildHubFaq', () => {
  const faq = buildHubFaq(summary, label)

  it('no publica preguntas sin datos', () => {
    expect(buildHubFaq(EMPTY_HUB_SUMMARY, label)).toEqual([])
  })

  it('usa ids únicos y distintos de las preguntas fijas de la página', () => {
    const ids = faq.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.filter(id => STATIC_FAQ_IDS.includes(id))).toEqual([])
    // Ningún emisor del catálogo de prueba pasa de 100 marcas: la de los días no sale.
    expect(ids).toEqual(['mas-comercios', 'por-rubro', 'debito-por-emisor', 'cuotas'])
  })

  it('nunca imprime undefined ni NaN', () => {
    for (const f of faq) expect(`${f.question} ${f.answer}`).not.toMatch(/undefined|NaN|null/)
  })

  it('contesta la cobertura con el líder y los dos que le siguen', () => {
    expect(faq[0]!.answer).toBe(
      'BROU: 4 marcas en 6 locales, según la lectura del 19 de noviembre de 2026. Le siguen Itaú, con 3 marcas, y Club El País, con 1. Es cobertura contada del catálogo: no dice cuánto ahorrás.'
    )
    expect(faq[0]!.link?.to).toBe('/que-banco-tiene-mas-descuentos-uruguay')
  })

  it('contesta los tres rubros con la cuenta del podio', () => {
    expect(faq[1]!.answer).toBe(
      'Por cantidad de marcas adheridas: en supermercados, BROU (2 de 2); en farmacias, BROU (1 de 1); en restaurantes, Club El País (1 de 1). Los demás rubros están en la tabla de rubros de esta página.'
    )
  })

  it('compara el débito sólo entre emisores con los dos medios, por proporción', () => {
    expect(faq[2]!.answer).toBe(
      'Marcas con beneficio publicado con débito: Itaú 1 de 3; BROU 1 de 4. En el mapa, cada comercio muestra por separado el texto de crédito y el de débito.'
    )
    expect(faq[2]!.question).not.toContain('también')
  })

  it('pregunta por los días sólo con emisores grandes', () => {
    expect(faq.find(f => f.id === 'todos-los-dias')).toBeUndefined()
    const big = {
      ...summary,
      issuers: summary.issuers.map(i => ({ ...i, brands: HUB_DAY_MIN_BRANDS + 1 })),
    }
    const days = buildHubFaq(big, label).find(f => f.id === 'todos-los-dias')!
    expect(days.answer).toBe(
      'Depende del emisor: el día lo declara el texto de cada beneficio. De los 7 textos de beneficio, según la lectura del 19 de noviembre de 2026, 1 nombra días de la semana. Marcas con un texto que nombra un día, entre los emisores con más de 100: BROU 2 de 101. En Itaú y Club El País, ningún texto nombra un día. El filtro "Hoy" del mapa usa los días que el catálogo marca por comercio, y 1 beneficio nombra un día en su texto sin tenerlo marcado: leé el texto antes de pagar.'
    )
    const none = buildHubFaq({ ...summary, issuers: [] }, label)
    expect(none).toEqual([])
  })

  it('no promete que el filtro "Hoy" saque un beneficio que dice el día sólo en el texto', () => {
    // "Los viernes" escrito y ningún día marcado: appliesOnDay lo deja pasar cualquier día, así que
    // la respuesta no puede decir que el filtro lo saca.
    const raw: BrandsRawData = JSON.parse(JSON.stringify(RAW))
    raw.bankBrands.itau!.cafe!.creditDescription = '20% los viernes con crédito Itaú'
    const s = buildHubSummary(input(raw))
    const big = { ...s, issuers: s.issuers.map(i => ({ ...i, brands: HUB_DAY_MIN_BRANDS + 1 })) }
    const days = buildHubFaq(big, label).find(f => f.id === 'todos-los-dias')!
    expect(days.answer).not.toMatch(/deja sólo|sólo los que aplican/)
    expect(days.answer).toContain('2 beneficios nombran un día en su texto sin tenerlo marcado')
    expect(days.answer).toContain('Itaú 1 de 101')
    // Y nunca dice que un emisor "vale cualquier día" por callarse el día.
    expect(days.answer).not.toMatch(/cualquier día|todos los días con/)
  })

  it('pone "e" delante de Itaú', () => {
    const big = {
      ...summary,
      issuers: [summary.issuers[2]!, summary.issuers[1]!].map(i => ({
        ...i,
        brands: HUB_DAY_MIN_BRANDS + 1,
      })),
    }
    const days = buildHubFaq(big, label).find(f => f.id === 'todos-los-dias')!
    expect(days.answer).toContain('En Club El País e Itaú, ningún texto nombra un día')
  })

  it('saca la pregunta de cuotas en cuanto un beneficio ofrece cuotas sin recargo', () => {
    expect(faq.find(f => f.id === 'cuotas')!.answer).toContain('ninguno de los 7 textos')
    const raw: BrandsRawData = JSON.parse(JSON.stringify(RAW))
    raw.bankBrands.itau!.cafe!.creditDescription = '6 cuotas sin recargo con Itaú'
    const s = buildHubSummary(input(raw))
    expect(s.totals.installmentTexts).toBe(1)
    expect(buildHubFaq(s, label).some(f => f.id === 'cuotas')).toBe(false)
  })
})

describe('la plantilla del índice', () => {
  const src = readFileSync(
    join(__dirname, '..', '..', 'pages', 'descuentos-con-tarjeta-uruguay', 'index.vue'),
    'utf8'
  )
  const template = src.slice(0, src.indexOf('<script'))

  it('publica la tabla por emisor con el patrón móvil y su ancla', () => {
    expect(template).toContain('id="comparacion-por-emisor"')
    expect(template).toContain('cu-mobile-cards')
  })

  it('ya no usa la frase de plantilla por emisor', () => {
    expect(src).not.toContain('bankBlurb')
  })

  it('no escribe a mano las cifras de la rebaja de IVA', () => {
    expect(template).not.toMatch(/\b[29] puntos\b/)
    expect(template).not.toContain('2027')
  })

  it('no enlaza al análisis antes del primer h2', () => {
    const firstH2 = template.search(/<h2\b/)
    expect(firstH2).toBeGreaterThan(0)
    expect(template.slice(0, firstH2)).not.toContain('/que-banco-tiene-mas-descuentos-uruguay')
  })

  it('tiene un solo h1', () => {
    expect(template.match(/<h1\b/g)).toHaveLength(1)
  })

  it('esconde los 9 puntos de IVA cuando la lectura pasa su fecha de vencimiento', () => {
    expect(template).toContain('v-if="ivaNineActive"')
    expect(src).toMatch(/at\.slice\(0, 10\) <= IVA_NINE_POINTS_LAST_DAY/)
  })

  it('no dice "también con débito": hay marcas sólo de débito', () => {
    expect(src).not.toContain('También con débito')
    expect(src).not.toContain('también con débito')
  })
})
