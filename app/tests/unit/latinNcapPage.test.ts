// `/latin-ncap-uruguay`: que la página no pueda afirmar más de lo que la tabla sostiene.
//
// Lo que se vigila acá son las tres formas en que esta página podría mentir sin que nada se rompa:
//
//  1. Un número del snippet escrito a mano que se separa de los datos. Por eso `ncapSeo()` los
//     calcula y el test exige que el texto contenga los que calculó, además del tope de 155.
//  2. Una nota comparada entre protocolos. Latin NCAP cambió la escala en 2020, así que una función
//     que ordene o mida tiene que quedarse dentro de un protocolo.
//  3. Un nombre de modelo inventado por el separador de guiones ("Hr V", "Hb20", "Up").
import { describe, expect, it } from 'vitest'

import type { LatinNcapEntry } from '../../utils/carAdvisorFigures'
import { LATIN_NCAP } from '../../utils/latinNcap'
import {
  LATIN_NCAP_PATH,
  LATIN_NCAP_URL,
  NCAP_PROTOCOLS,
  ncapAdultScore,
  ncapBrandGroups,
  ncapModelName,
  ncapSameYearPairs,
  ncapSeo,
  ncapSplits,
  ncapStats,
} from '../../utils/latinNcapPage'

const entry = (over: Partial<LatinNcapEntry>): LatinNcapEntry => ({
  marketSlug: 'ford-ka',
  testedName: 'Ford Ka + 2 Airbags',
  testYear: 2020,
  protocol: '2020+',
  adultStars: null,
  childStars: null,
  stars: 3,
  url: 'https://www.latinncap.com/es/resultado/1/x',
  ...over,
})

describe('ncapModelName', () => {
  it('reconstruye marca y modelo del slug', () => {
    expect(ncapModelName('chevrolet-onix')).toMatchObject({
      brand: 'Chevrolet',
      model: 'Onix',
      label: 'Chevrolet Onix',
    })
    expect(ncapModelName('peugeot-2008').label).toBe('Peugeot 2008')
  })

  it('usa el nombre que escribe Latin NCAP donde el slug no alcanza', () => {
    expect(ncapModelName('honda-hr-v').model).toBe('HR-V')
    expect(ncapModelName('hyundai-hb20').model).toBe('HB20')
    expect(ncapModelName('volkswagen-t-cross').model).toBe('T-Cross')
    expect(ncapModelName('volkswagen-up').model).toBe('up!')
    expect(ncapModelName('hyundai-grand-i10').model).toBe('Grand i10')
    expect(ncapModelName('chevrolet-onix-plus').model).toBe('Onix Plus')
    expect(ncapModelName('toyota-sw4').model).toBe('SW4')
  })

  it('escribe Citroën con diéresis', () => {
    expect(ncapModelName('citroen-c3').label).toBe('Citroën C3')
  })

  // El modo de fallar silencioso de un mapa de marcas es imprimir "Byd" en una página publicada.
  it('tira excepción ante una marca que no está en el mapa', () => {
    expect(() => ncapModelName('byd-dolphin')).toThrow(/byd/)
  })

  it('cubre TODAS las marcas de la tabla', () => {
    for (const row of LATIN_NCAP) expect(() => ncapModelName(row.marketSlug)).not.toThrow()
  })
})

describe('ncapAdultScore', () => {
  it('toma la nota única del protocolo 2020 y la del adulto en los anteriores', () => {
    expect(ncapAdultScore(entry({ protocol: '2020+', stars: 0 }))).toBe(0)
    expect(
      ncapAdultScore(entry({ protocol: '2016-2019', stars: null, adultStars: 4, childStars: 2 }))
    ).toBe(4)
  })

  it('devuelve 0 y no null cuando la nota ES cero', () => {
    // Un `|| null` acá borraría del informe justo los trece ensayos de 0 de 5.
    expect(ncapAdultScore(entry({ stars: 0 }))).not.toBeNull()
  })
})

describe('ncapBrandGroups', () => {
  const groups = ncapBrandGroups()

  it('agrupa los modelos de la tabla sin perder ni duplicar ensayos', () => {
    const tests = groups.flatMap(group => group.models).flatMap(model => model.entries)
    expect(tests).toHaveLength(LATIN_NCAP.length)
    const models = groups.flatMap(group => group.models.map(model => model.slug))
    expect(new Set(models).size).toBe(models.length)
    expect(new Set(models)).toEqual(new Set(LATIN_NCAP.map(row => row.marketSlug)))
  })

  it('ordena marcas y modelos alfabéticamente, y los ensayos del más nuevo al más viejo', () => {
    expect(groups.map(group => group.brand)).toEqual(
      [...groups.map(group => group.brand)].sort((a, b) => a.localeCompare(b, 'es'))
    )
    for (const group of groups) {
      expect(group.models.map(model => model.model)).toEqual(
        [...group.models.map(model => model.model)].sort((a, b) => a.localeCompare(b, 'es'))
      )
      for (const model of group.models) {
        const years = model.entries.map(test => test.testYear)
        expect(years).toEqual([...years].sort((a, b) => b - a))
      }
    }
  })
})

describe('ncapSplits', () => {
  it('sólo compara ensayos del MISMO protocolo', () => {
    // 4 adulto (protocolo 2010-2015) y 0 de 5 (protocolo 2020) no son comparables: es el Citroën C3
    // de la tabla real, y un split que cruzara protocolos lo declararía una diferencia de 4.
    const cruzado = [
      entry({
        marketSlug: 'citroen-c3',
        protocol: '2010-2015',
        stars: null,
        adultStars: 4,
        childStars: 2,
      }),
      entry({ marketSlug: 'citroen-c3', protocol: '2020+', stars: 0, testYear: 2023 }),
    ]
    expect(ncapSplits(1, cruzado)).toEqual([])
  })

  it('encuentra la diferencia dentro de un protocolo y la ordena de mayor a menor', () => {
    const splits = ncapSplits(3)
    expect(splits.length).toBeGreaterThan(0)
    expect(splits.map(split => split.spread)).toEqual(
      [...splits.map(split => split.spread)].sort((a, b) => b - a)
    )
    for (const split of splits) {
      expect(split.worst.protocol).toBe(split.protocol)
      expect(split.best.protocol).toBe(split.protocol)
      expect(ncapAdultScore(split.best)! - ncapAdultScore(split.worst)!).toBe(split.spread)
    }
  })

  it('el extremo medido es un modelo con cinco estrellas de diferencia entre sus propios ensayos', () => {
    expect(ncapSplits(3)[0]!.spread).toBe(5)
  })
})

describe('ncapSameYearPairs', () => {
  const pairs = ncapSameYearPairs()

  it('cada par es del mismo modelo, protocolo y año, con notas distintas', () => {
    expect(pairs.length).toBeGreaterThan(0)
    for (const pair of pairs) {
      expect(pair.lower.marketSlug).toBe(pair.higher.marketSlug)
      expect(pair.lower.protocol).toBe(pair.higher.protocol)
      expect(pair.lower.testYear).toBe(pair.higher.testYear)
      expect(ncapAdultScore(pair.lower)!).toBeLessThan(ncapAdultScore(pair.higher)!)
    }
  })

  it('incluye el Tucson de 2022, que es el ejemplo que la página cita', () => {
    const tucson = pairs.find(pair => pair.slug === 'hyundai-tucson' && pair.testYear === 2022)
    expect(tucson).toBeDefined()
    expect(ncapAdultScore(tucson!.lower)).toBe(0)
    expect(ncapAdultScore(tucson!.higher)).toBe(3)
  })

  it('no inventa un par cuando los dos ensayos del año dieron lo mismo', () => {
    const empate = [
      entry({ marketSlug: 'fiat-strada', stars: 1, testedName: 'Cabina simple' }),
      entry({ marketSlug: 'fiat-strada', stars: 1, testedName: 'Cabina doble' }),
    ]
    expect(ncapSameYearPairs(empate)).toEqual([])
  })
})

describe('ncapStats', () => {
  const stats = ncapStats()

  it('cuenta la tabla y no una copia', () => {
    expect(stats.tests).toBe(LATIN_NCAP.length)
    expect(stats.models).toBe(new Set(LATIN_NCAP.map(row => row.marketSlug)).size)
    expect(stats.perProtocol.reduce((sum, row) => sum + row.tests, 0)).toBe(stats.tests)
    expect(stats.firstYear).toBeLessThan(stats.lastYear)
  })

  it('declara los tres protocolos con el mismo orden que NCAP_PROTOCOLS', () => {
    expect(stats.perProtocol.map(row => row.protocol)).toEqual(
      NCAP_PROTOCOLS.map(row => row.protocol)
    )
  })

  it('el reparto del protocolo vigente cabe en sus propios ensayos', () => {
    expect(stats.modern.zero + stats.modern.five).toBeLessThanOrEqual(stats.modern.tests)
    expect(stats.modern.tests).toBe(stats.perProtocol.find(row => row.protocol === '2020+')!.tests)
  })

  it('cuenta como modelo con varios ensayos sólo a los que de verdad tienen más de uno', () => {
    const counts = new Map<string, number>()
    for (const row of LATIN_NCAP) counts.set(row.marketSlug, (counts.get(row.marketSlug) ?? 0) + 1)
    expect(stats.multiTested).toBe([...counts.values()].filter(count => count > 1).length)
    expect(stats.sameYearModels).toBeLessThanOrEqual(stats.multiTested)
  })
})

describe('ncapSeo', () => {
  const stats = ncapStats()
  const { title, description } = ncapSeo(stats)

  // La regla de oro del sitio: una descripción con el número del día corre a ~1,4 % de CTR y una
  // genérica a 0,03-0,2 %. Y el número tiene que salir de los datos, no del teclado.
  it('trae los números que calculó, no unos escritos a mano', () => {
    expect(description).toContain(String(stats.tests))
    expect(description).toContain(String(stats.models))
    expect(description).toContain(String(stats.modern.zero))
    expect(description).toContain(String(stats.modern.five))
    expect(title).toContain(String(stats.models))
  })

  it('cabe en el snippet', () => {
    expect(description.length).toBeLessThanOrEqual(155)
    expect(title.length).toBeLessThanOrEqual(60)
  })

  it('se mueve si la tabla se mueve', () => {
    const recortada = LATIN_NCAP.filter(row => row.marketSlug === 'hyundai-tucson')
    expect(ncapSeo(ncapStats(recortada)).description).not.toBe(description)
  })
})

describe('la ruta', () => {
  it('es la canónica absoluta del sitio', () => {
    expect(LATIN_NCAP_PATH).toBe('/latin-ncap-uruguay')
    expect(LATIN_NCAP_URL).toBe(`https://cambio-uruguay.com${LATIN_NCAP_PATH}`)
  })
})
