// La lógica pura de `/computadoras-usadas-uruguay`: la consulta de la URL, el filtro de Mongo, su
// evaluador en memoria (el de la vista previa de dev), el orden y los textos que no pueden mentir.
//
// Lo que más se vigila acá es la regla de la página: un total de piezas SÓLO si el job lo publicó
// entero. `newPartialUsd` existe en el documento y ningún texto lo puede imprimir.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  COMPUTER_FACET_SPECS,
  COMPUTER_USED_FROM_NEW_NOTE,
  computerAvisoSlugValid,
  computerComponentsFrom,
  computerCpuFamilyLabel,
  computerDirectoryLinkForPart,
  computerDriveLabel,
  computerFacetRowsInMemory,
  computerFaultsLine,
  computerFilterChips,
  computerFilterMatches,
  computerFiltered,
  computerGpuLabel,
  computerListInMemory,
  computerMatch,
  computerNormalizeQuery,
  computerPartAnchor,
  computerPartLink,
  computerPickSimilar,
  computerPriceLine,
  computerQueryParams,
  computerQueryWithout,
  computerRatioText,
  computerOfferHost,
  computerSafeOfferUrl,
  computerSafePermalink,
  computerSortRows,
  computerSortSpec,
  computerSpecChips,
  computerStorageLabel,
  computerUsesNewForUsed,
  computerValuationSummary,
  computerVerdictLabel,
  type ComputerQuery,
} from '../../utils/computadoras'
import type {
  ComputerPublicListing,
  ComputerPublicPart,
  ComputerPublicValuation,
  ComputerPublicValuedPart,
} from '../../utils/computadorasPublic'

const TODAY = '2026-11-23'
/** Los montos llevan espacio duro entre el signo y la cifra (el celular nunca los parte en dos). */
const nb = (text: string) => text.replace(/\$ /g, '$' + String.fromCharCode(160))

function listing(overrides: Partial<ComputerPublicListing> = {}): ComputerPublicListing {
  return {
    slug: 'fb-1000000001',
    source: 'facebook',
    url: 'https://www.facebook.com/marketplace/item/1000000001/',
    title: 'PC Gamer i5 12400F + RTX 3060',
    image: null,
    kind: 'desktop',
    kindGroup: 'computer',
    price: 23900,
    currency: 'UYU',
    priceUsd: 598,
    priceUyu: 23900,
    currencyInferred: false,
    department: 'Montevideo',
    city: 'Montevideo',
    condition: 'good',
    sellerType: null,
    brand: null,
    cpu: null,
    cpuBrand: null,
    cpuFamily: null,
    gpu: null,
    gpuSlug: null,
    gpuDedicated: null,
    ramGb: null,
    ramType: null,
    storage: [],
    storageGb: null,
    hasSsd: null,
    screenInches: null,
    psuWatts: null,
    chipset: null,
    includes: { monitor: false, monitorInches: null, peripherals: false },
    faults: [],
    detailRead: false,
    specCount: 0,
    valuation: null,
    comparables: null,
    firstSeen: '2026-11-20',
    lastSeen: TODAY,
    publishedAt: '2026-11-21',
    ...overrides,
  }
}

function part(overrides: Partial<ComputerPublicValuedPart> = {}): ComputerPublicValuedPart {
  return {
    role: 'cpu',
    label: 'Intel Core i5-12400F',
    slug: 'cpu:i5-12400f',
    estimated: false,
    newUsd: 165,
    usedUsd: 120,
    newN: 8,
    usedN: 4,
    ...overrides,
  }
}

function valuation(overrides: Partial<ComputerPublicValuation> = {}): ComputerPublicValuation {
  return {
    parts: [part(), part({ role: 'gpu', label: 'RTX 3060', slug: 'gpu:rtx-3060' })],
    newTotalUsd: 330,
    usedTotalUsd: 240,
    newPartialUsd: 330,
    usedPartialUsd: 240,
    missingNew: [],
    missingUsed: [],
    ratio: 0.8,
    reference: 'used',
    verdict: 'por-debajo',
    sameNew: null,
    ...overrides,
  }
}

const q = (raw: Record<string, unknown> = {}): ComputerQuery => computerNormalizeQuery(raw)

describe('computerNormalizeQuery', () => {
  it('sin nada es la vista por defecto: computadoras, más recientes, página 1', () => {
    const query = q()
    expect(query.tipo).toBe('')
    expect(query.orden).toBe('recientes')
    expect(query.pagina).toBe(1)
    expect(computerFiltered(query)).toBe(false)
  })

  it('descarta lo que no puede coincidir con ningún documento', () => {
    const query = q({
      tipo: 'tostadora',
      marca: 'via',
      familia: '<script>',
      placa: 'rtx-3060',
      procesador: 'gpu:rtx-3060',
      ramMin: '12',
      fuente: 'olx',
      dias: '5',
      orden: 'azar',
      pagina: '0',
    })
    expect(query).toMatchObject({
      tipo: '',
      marca: '',
      familia: '',
      placa: '',
      procesador: '',
      ramMin: null,
      fuente: '',
      dias: null,
      orden: 'recientes',
      pagina: 1,
    })
  })

  it('lee los montos como se escriben acá y da vuelta un rango invertido', () => {
    const query = q({ precioMinUsd: 'US$ 1.500', precioMaxUsd: '300' })
    expect(query.precioMinUsd).toBe(300)
    expect(query.precioMaxUsd).toBe(1500)
  })

  it('acepta las identidades de pieza con su rol adelante', () => {
    const query = q({ placa: 'gpu:rtx-3060-ti', procesador: 'CPU:i5-12400F' })
    expect(query.placa).toBe('gpu:rtx-3060-ti')
    expect(query.procesador).toBe('cpu:i5-12400f')
  })

  it('ida y vuelta por la URL sin perder nada ni agregar vacíos', () => {
    const raw = {
      q: 'gamer',
      tipo: 'piezas',
      marca: 'amd',
      familia: 'ryzen-5',
      placa: 'gpu:rx-580',
      dedicada: '1',
      ramMin: '16',
      ssd: '1',
      precioMinUsd: '100',
      precioMaxUsd: '900',
      departamento: 'Canelones',
      fuente: 'facebook',
      sinFallas: '1',
      debajo: '1',
      dias: '7',
      orden: 'precio_asc',
      pagina: '3',
    }
    const params = computerQueryParams(q(raw))
    expect(params).toEqual(raw)
    expect(computerQueryParams(q())).toEqual({})
  })

  it('el orden solo no vuelve indexable ni no indexable a la página', () => {
    expect(computerFiltered(q({ orden: 'ram' }))).toBe(false)
    expect(computerFiltered(q({ tipo: 'notebook' }))).toBe(true)
  })

  it('sacar la marca saca la familia y el procesador', () => {
    const next = computerQueryWithout(
      q({ marca: 'intel', familia: 'core-i5', procesador: 'cpu:i5-12400f', pagina: '4' }),
      ['marca']
    )
    expect(next).toMatchObject({ marca: '', familia: '', procesador: '', pagina: 1 })
  })

  it('los chips no muestran la vista por defecto y nombran la placa por su faceta', () => {
    expect(computerFilterChips(q())).toEqual([])
    const chips = computerFilterChips(q({ placa: 'gpu:rtx-3060', debajo: '1' }), {
      kinds: [],
      cpuBrands: [],
      cpuFamilies: [],
      gpus: [{ value: 'gpu:rtx-3060', label: 'RTX 3060 12 GB', count: 4 }],
      departments: [],
      sources: [],
      rams: [],
    })
    expect(chips.map(chip => chip.label)).toEqual(['RTX 3060 12 GB', 'Pide menos de lo que vale'])
  })
})

describe('computerMatch', () => {
  it('por defecto son las computadoras enteras, y las piezas se piden', () => {
    expect(computerMatch(q(), TODAY, 4)).toMatchObject({ kindGroup: 'computer' })
    expect(computerMatch(q({ tipo: 'piezas' }), TODAY, 4)).toMatchObject({ kindGroup: 'part' })
    expect(computerMatch(q({ tipo: 'gpu' }), TODAY, 4)).toMatchObject({ kind: 'gpu' })
    const all = computerMatch(q({ tipo: 'todos' }), TODAY, 4)
    expect(all.kind).toBeUndefined()
    expect(all.kindGroup).toBeUndefined()
  })

  it('usa la ventana de frescura que recibe', () => {
    expect(computerMatch(q(), TODAY, 4).lastSeen).toEqual({ $gte: '2026-11-19' })
  })

  it('«pide menos que sus piezas» son los dos veredictos de abajo', () => {
    expect(computerMatch(q({ debajo: '1' }), TODAY, 4)['valuation.verdict']).toEqual({
      $in: ['muy-por-debajo', 'por-debajo'],
    })
  })

  it('«mejor relación» deja afuera lo que no tiene veredicto (null va primero en Mongo)', () => {
    const match = computerMatch(q({ orden: 'relacion' }), TODAY, 4)
    expect(match['valuation.verdict']).toEqual({ $ne: null })
    expect(match['valuation.ratio']).toEqual({ $ne: null })
    expect(computerSortSpec('relacion')).toMatchObject({ 'valuation.ratio': 1 })
  })

  it('la RAM descendente deja los avisos sin RAM al final, como Mongo', () => {
    const rows = [
      listing({ slug: 'fb-1', ramGb: null }),
      listing({ slug: 'fb-2', ramGb: 32 }),
      listing({ slug: 'fb-3', ramGb: 8 }),
    ]
    expect(computerSortRows(rows, computerSortSpec('ram')).map(row => row.slug)).toEqual([
      'fb-2',
      'fb-3',
      'fb-1',
    ])
  })
})

/**
 * El evaluador en memoria tiene que decir lo mismo que diría Mongo sobre los mismos filtros. Acá
 * cada caso es una fila y la consulta que la tiene que dejar entrar o afuera; lo que se prueba es
 * `computerFilterMatches(computerMatch(...))`, que es exactamente lo que corre la vista previa.
 */
describe('computerFilterMatches con los filtros reales', () => {
  const desktop = listing({
    slug: 'fb-1000000001',
    title: 'PC Gamer Ryzen 5 5600 Gráfica RTX',
    cpuBrand: 'amd',
    cpuFamily: 'ryzen-5',
    cpu: {
      brand: 'amd',
      family: 'ryzen-5',
      model: '5600',
      slug: 'cpu:ryzen-5-5600',
      label: 'AMD Ryzen 5 5600',
      generation: null,
      socket: 'AM4',
      ramType: 'ddr4',
      mobile: false,
      year: 2022,
      basis: 'title',
    },
    gpuSlug: 'gpu:rtx-3060',
    gpuDedicated: true,
    ramGb: 16,
    hasSsd: true,
    valuation: valuation(),
  })
  const notebook = listing({
    slug: 'ml-MLU1234567890',
    source: 'mercadolibre',
    kind: 'notebook',
    title: 'Notebook Lenovo',
    ramGb: 8,
    hasSsd: null,
    faults: ['bateria'],
    department: 'Salto',
    publishedAt: '2026-11-10',
  })
  const gpuPart = listing({
    slug: 'fb-1000000002',
    kind: 'gpu',
    kindGroup: 'part',
    priceUsd: 550,
    gpuSlug: 'gpu:rtx-3060',
  })
  const stale = listing({ slug: 'fb-1000000003', lastSeen: '2026-11-01' })

  const cases: Array<[string, Record<string, unknown>, ComputerPublicListing, boolean]> = [
    ['vista por defecto: computadora', {}, desktop, true],
    ['vista por defecto: pieza afuera', {}, gpuPart, false],
    ['vencido afuera', {}, stale, false],
    ['piezas: pieza', { tipo: 'piezas' }, gpuPart, true],
    ['marca', { marca: 'amd' }, desktop, true],
    ['marca que no es', { marca: 'intel' }, desktop, false],
    ['procesador exacto', { procesador: 'cpu:ryzen-5-5600' }, desktop, true],
    ['placa con todos', { tipo: 'todos', placa: 'gpu:rtx-3060' }, gpuPart, true],
    ['RAM mínima cumple', { ramMin: '16' }, desktop, true],
    ['RAM mínima no cumple', { ramMin: '16' }, notebook, false],
    ['SSD con dato', { ssd: '1' }, desktop, true],
    ['SSD sin dato no cumple', { ssd: '1' }, notebook, false],
    ['texto sin tildes encuentra con tildes', { q: 'grafica' }, desktop, true],
    ['texto que no está', { q: 'macbook' }, desktop, false],
    ['sin fallas: con falla afuera', { sinFallas: '1' }, notebook, false],
    ['sin fallas: sin falla adentro', { sinFallas: '1' }, desktop, true],
    ['debajo', { debajo: '1' }, desktop, true],
    ['debajo sin valuación afuera', { debajo: '1' }, notebook, false],
    ['últimos 7 días afuera', { dias: '7' }, notebook, false],
    ['departamento', { departamento: 'Salto' }, notebook, true],
    ['fuente', { fuente: 'mercadolibre' }, notebook, true],
    ['precio en dólares', { precioMaxUsd: '500' }, desktop, false],
    ['relación: sin veredicto afuera', { orden: 'relacion' }, notebook, false],
  ]

  it.each(cases)('%s', (_name, raw, row, expected) => {
    expect(computerFilterMatches(computerMatch(q(raw), TODAY, 4), row)).toBe(expected)
  })

  it('un operador que no conoce tira en vez de coincidir por las dudas', () => {
    expect(() => computerFilterMatches({ price: { $mod: [2, 0] } }, desktop)).toThrow()
  })

  it('las facetas en memoria cuentan sin su propio filtro, como el pipeline', () => {
    const rows = [desktop, notebook, gpuPart]
    const spec = COMPUTER_FACET_SPECS.find(item => item.name === 'kinds')!
    const query = q({ tipo: 'notebook' })
    const facet = computerFacetRowsInMemory(
      rows,
      computerMatch(spec.relax(query), TODAY, 4),
      spec.field,
      spec.limit
    )
    expect(facet.map(row => row._id).sort()).toEqual(['desktop', 'gpu', 'notebook'])
  })

  it('una faceta no gasta un lugar en las filas sin el dato', () => {
    // El `$limit` de Mongo corta antes de que el vacío se descarte: con tres lugares para la marca
    // y un grupo null grande, la tercera marca desaparecía (Apple, en la primera corrida real).
    const noCpu = (slug: string) => listing({ slug, cpuBrand: null })
    const rows = [
      desktop,
      { ...desktop, slug: 'fb-intel', cpuBrand: 'intel' as const },
      { ...desktop, slug: 'fb-apple', cpuBrand: 'apple' as const },
      noCpu('fb-a'),
      noCpu('fb-b'),
      noCpu('fb-c'),
    ]
    const facet = computerFacetRowsInMemory(rows, computerMatch(q(), TODAY, 4), 'cpuBrand', 3)
    expect(facet.map(row => row._id).sort()).toEqual(['amd', 'apple', 'intel'])
  })

  it('el listado en memoria arma total, página y facetas con las mismas piezas', () => {
    const response = computerListInMemory([desktop, notebook, gpuPart, stale], null, q(), TODAY)
    expect(response.status).toBe('preparing')
    expect(response.total).toBe(2)
    expect(response.items.map(item => item.slug)).toEqual([desktop.slug, notebook.slug])
    expect(response.facets.kinds.map(facet => facet.value).sort()).toEqual([
      'desktop',
      'gpu',
      'notebook',
    ])
    expect(response.facets.rams.map(facet => facet.count)).toEqual([2, 1, 0])
  })
})

describe('la valuación: nunca un parcial como total', () => {
  it('con los dos totales, los dos', () => {
    expect(computerValuationSummary(valuation())).toEqual({
      newTotal: nb('Armarla con piezas nuevas: US$ 330'),
      usedTotal: nb('Sus piezas usadas: US$ 240'),
      coverage: null,
    })
  })

  it('sin total nuevo dice cuántas piezas tienen precio, y no imprime la suma parcial', () => {
    const summary = computerValuationSummary(
      valuation({
        parts: [part(), part({ role: 'gpu', slug: 'gpu:rtx-3060', newUsd: null })],
        newTotalUsd: null,
        newPartialUsd: 165,
        missingNew: ['RTX 3060'],
      })
    )
    expect(summary.newTotal).toBeNull()
    expect(summary.coverage).toBe('1 de 2 piezas con precio nuevo')
    expect(JSON.stringify(summary)).not.toContain('165')
  })

  it('ningún texto de las páginas ni de los componentes imprime newPartialUsd', () => {
    const root = join(__dirname, '..', '..')
    for (const file of [
      'pages/computadoras-usadas-uruguay/index.vue',
      'pages/computadoras-usadas-uruguay/aviso/[slug].vue',
      'components/computadoras/ListingCard.vue',
      'components/computadoras/PartsBreakdown.vue',
    ])
      expect(readFileSync(join(root, file), 'utf8'), file).not.toMatch(/PartialUsd/)
  })

  it('una pieza supuesta a precio nuevo en el total usado lo dice', () => {
    expect(computerUsesNewForUsed(valuation())).toBe(false)
    expect(
      computerUsesNewForUsed(
        valuation({ parts: [part({ role: 'case', estimated: true, usedFromNew: true })] })
      )
    ).toBe(true)
    expect(COMPUTER_USED_FROM_NEW_NOTE).toContain('nueva más barata')
  })

  it('el veredicto es neutro y dice contra qué compara', () => {
    expect(computerVerdictLabel(listing({ valuation: valuation() }))).toBe(
      'Pide menos que sus piezas usadas'
    )
    expect(
      computerVerdictLabel(
        listing({ valuation: valuation({ reference: 'new', usedTotalUsd: null }) })
      )
    ).toBe('Pide menos que armarla nueva')
    expect(
      computerVerdictLabel(
        listing({
          kind: 'gpu',
          kindGroup: 'part',
          valuation: valuation({ verdict: 'muy-por-debajo' }),
        })
      )
    ).toBe('Pide mucho menos que la misma pieza usada')
    expect(
      computerVerdictLabel(
        listing({
          kind: 'notebook',
          valuation: valuation({ verdict: 'por-encima', reference: 'comparables' }),
        })
      )
    ).toBe('Pide más que notebooks iguales')
    // Antes del 24/11/2026 las notebooks guardaban `used` queriendo decir las iguales.
    expect(
      computerVerdictLabel(
        listing({ kind: 'notebook', valuation: valuation({ verdict: 'parejo' }) })
      )
    ).toBe('Pide lo mismo que notebooks iguales')
    for (const verdict of ['muy-por-debajo', 'por-debajo', 'parejo', 'por-encima'] as const)
      expect(
        computerVerdictLabel(listing({ valuation: valuation({ verdict }) }))?.toLowerCase()
      ).not.toMatch(/ganga|oportunidad/)
  })

  it('el cociente cita el monto de su referencia', () => {
    expect(computerRatioText(listing({ valuation: valuation() }))).toBe(
      nb('Pide 80 % de lo que valen sus piezas usadas (US$ 240).')
    )
    expect(
      computerRatioText(
        listing({
          valuation: valuation({ reference: 'new', usedTotalUsd: null, ratio: 0.62 }),
        })
      )
    ).toBe(nb('Pide 62 % de lo que cuesta armarla con piezas nuevas (US$ 330).'))
    expect(
      computerRatioText(
        listing({
          kind: 'desktop',
          valuation: valuation({ reference: 'comparables', ratio: 0.9 }),
          comparables: { label: 'x', medianUsd: 640, n: 5, basis: 'cpu+gpu' },
        })
      )
    ).toBe(nb('Pide 90 % de lo que piden por PCs iguales (mediana de 5 avisos: US$ 640).'))
    expect(
      computerRatioText(
        listing({
          kind: 'notebook',
          valuation: valuation({ parts: [], ratio: 0.81, reference: 'comparables' }),
          comparables: { label: 'x', medianUsd: 430, n: 7, basis: 'model' },
        })
      )
    ).toBe(nb('Pide 81 % de lo que piden por notebooks iguales (mediana de 7 avisos: US$ 430).'))
    expect(computerRatioText(listing({ valuation: valuation({ ratio: null }) }))).toBeNull()
  })
})

describe('formato', () => {
  it('el precio en su moneda, con el equivalente en dólares y la moneda deducida dicha', () => {
    expect(computerPriceLine(listing())).toEqual({
      main: nb('$ 23.900'),
      usd: nb('≈ US$ 598'),
      inferred: null,
    })
    expect(
      computerPriceLine(
        listing({ price: 950, currency: 'USD', priceUsd: 950, currencyInferred: true })
      )
    ).toEqual({ main: nb('US$ 950'), usd: null, inferred: 'precio leído en dólares' })
  })

  it('un disco sin tipo declarado dice la capacidad y que el tipo no está', () => {
    expect(computerDriveLabel({ type: 'unknown', gb: 1000 })).toBe(
      'Disco de 1 TB (tipo no declarado)'
    )
    expect(computerDriveLabel({ type: 'nvme', gb: 512 })).toBe('SSD NVMe de 512 GB')
    expect(
      computerStorageLabel([
        { type: 'ssd', gb: 240 },
        { type: 'hdd', gb: 1024 },
      ])
    ).toBe('SSD de 240 GB + Disco rígido de 1 TB')
  })

  it('la placa integrada se dice integrada; la dedicada con su memoria', () => {
    expect(
      computerGpuLabel({
        gpu: {
          brand: 'intel',
          model: 'Iris Xe',
          slug: null,
          label: 'Iris Xe',
          vramGb: null,
          integrated: true,
          year: 2020,
          basis: 'title',
        },
      })
    ).toBe('Gráficos integrados (Iris Xe)')
    expect(
      computerGpuLabel({
        gpu: {
          brand: 'nvidia',
          model: 'RTX 3060',
          slug: 'gpu:rtx-3060',
          label: 'RTX 3060',
          vramGb: 12,
          integrated: false,
          year: 2021,
          basis: 'title',
        },
      })
    ).toBe('RTX 3060 12 GB')
    expect(computerGpuLabel({ gpu: null })).toBeNull()
  })

  it('los datos de la tarjeta son sólo los que se leyeron', () => {
    expect(computerSpecChips(listing())).toEqual([])
    expect(computerSpecChips(listing({ ramGb: 16, ramType: 'ddr4' }))).toEqual(['16 GB DDR4'])
  })

  it('las fallas se citan como lo que dice el aviso', () => {
    expect(computerFaultsLine(['no-enciende', 'para-repuesto'])).toBe(
      'El aviso dice: no enciende, para repuesto'
    )
    expect(computerFaultsLine([])).toBeNull()
  })

  it('una familia desconocida se muestra igual, con nombre legible', () => {
    expect(computerCpuFamilyLabel('core-i7')).toBe('Core i7')
    expect(computerCpuFamilyLabel('snapdragon-x')).toBe('Snapdragon x')
  })
})

describe('rutas', () => {
  it('el slug del aviso tiene una de dos formas', () => {
    expect(computerAvisoSlugValid('fb-1234567890')).toBe(true)
    expect(computerAvisoSlugValid('ml-MLU1234567890')).toBe(true)
    expect(computerAvisoSlugValid('ml-mlu1234567890')).toBe(false)
    expect(computerAvisoSlugValid('../../etc/passwd')).toBe(false)
  })

  it('el ancla de una pieza no lleva dos puntos, y la ficha enlaza a la misma', () => {
    expect(computerPartAnchor('cpu:i5-12400f')).toBe('cpu-i5-12400f')
    expect(computerPartAnchor('ram:ddr4:16')).toBe('ram-ddr4-16')
    expect(computerPartLink('gpu:rtx-3060-ti')).toBe(
      '/precios-componentes-pc-uruguay#gpu-rtx-3060-ti'
    )
  })

  it('la oferta más barata: una URL https con dominio, y dice dónde está', () => {
    const store = 'https://thotcomputacion.com.uy/producto/cpu-intel-core-i5-12400f/'
    expect(computerSafeOfferUrl(store)).toBe(store)
    expect(computerSafeOfferUrl('javascript:alert(1)')).toBe('')
    expect(computerSafeOfferUrl('http://inseguro.com.uy/x')).toBe('')
    expect(computerSafeOfferUrl('https://usuario:clave@evil.com/x')).toBe('')
    expect(computerOfferHost(store)).toBe('thotcomputacion.com.uy')
    expect(computerOfferHost('https://articulo.mercadolibre.com.uy/MLU-1-x')).toBe('Mercado Libre')
  })

  it('sólo enlaza el aviso original de Marketplace o Mercado Libre Uruguay', () => {
    expect(computerSafePermalink('https://www.facebook.com/marketplace/item/1234567890/')).not.toBe(
      ''
    )
    expect(computerSafePermalink('https://articulo.mercadolibre.com.uy/MLU-1-x')).not.toBe('')
    expect(computerSafePermalink('https://evil.example/marketplace/item/1')).toBe('')
    expect(computerSafePermalink('javascript:alert(1)')).toBe('')
  })

  it('el enlace de una pieza al directorio incluye las piezas sueltas', () => {
    expect(computerDirectoryLinkForPart({ slug: 'gpu:rtx-3060', role: 'gpu' })).toEqual({
      path: '/computadoras-usadas-uruguay',
      query: { tipo: 'todos', placa: 'gpu:rtx-3060' },
    })
    expect(computerDirectoryLinkForPart({ slug: 'ram:ddr4:16', role: 'ram' })).toBeNull()
  })
})

describe('ficha y componentes', () => {
  it('las parecidas, las de precio más cercano primero y sin el propio aviso', () => {
    const subject = listing({ slug: 'fb-1', priceUsd: 500 })
    const picked = computerPickSimilar(subject, [
      listing({ slug: 'fb-1', priceUsd: 500 }),
      listing({ slug: 'fb-2', priceUsd: 900 }),
      listing({ slug: 'fb-3', priceUsd: 450 }),
      listing({ slug: 'fb-4', priceUsd: 550 }),
    ])
    expect(picked.map(row => row.slug)).toEqual(['fb-3', 'fb-4', 'fb-2'])
  })

  it('la tabla de componentes agrupa por rol, saca lo que no tiene precio y ordena por uso', () => {
    const row = (overrides: Partial<ComputerPublicPart>): ComputerPublicPart => ({
      slug: 'cpu:x',
      role: 'cpu',
      label: 'X',
      facts: {},
      new: { medianUsd: 100, p25Usd: 90, minUsd: 80, n: 5, sellers: 3, cheapest: null },
      used: null,
      inCatalog: 1,
      history: [],
      updatedAt: TODAY,
      ...overrides,
    })
    const response = computerComponentsFrom(
      [
        row({ slug: 'gpu:a', role: 'gpu', label: 'A', inCatalog: 2 }),
        row({ slug: 'gpu:b', role: 'gpu', label: 'B', inCatalog: 9 }),
        row({ slug: 'gpu:c', role: 'gpu', label: 'C', new: null, used: null }),
        row({ slug: 'cpu:d', role: 'cpu', label: 'D' }),
      ],
      null
    )
    expect(response.roles.map(table => table.role)).toEqual(['cpu', 'gpu'])
    expect(response.roles[1]!.parts.map(item => item.slug)).toEqual(['gpu:b', 'gpu:a'])
    expect(computerComponentsFrom([], null).status).toBe('preparing')
  })
})
