import { describe, expect, it } from 'vitest'
import {
  rentalLookalikeFacts,
  rentalLookalikeGenericTitle,
  rentalLookalikeKey,
  rentalLookalikePreference,
  rentalLookalikes,
  splitRentalLookalikes,
  type RentalLookalikeRow,
} from '../../utils/rentalLookalike'
import type { RentalOffer, RentalSource } from '../../utils/rentals'

// Las filas medidas el 8/11/2026 en /api/rentals/ficha (scratchpad de la auditoría): títulos,
// dormitorios, baños, superficie, precio, coordenadas y anunciantes tal como los publicaba cada
// portal. Las claves van sin dígitos a propósito (el escáner de secretos del repo).
type Row = Omit<RentalLookalikeRow, 'offers'> & {
  key: string
  offers: Array<Partial<RentalOffer> & Pick<RentalOffer, 'source' | 'price' | 'currency'>>
}
function row(
  key: string,
  source: RentalSource,
  overrides: Partial<Row> & { price?: number; seller?: string } = {}
): Row {
  const { price = 60000, seller = '', ...rest } = overrides
  return {
    key,
    title: 'Alquiler 2 Dormitorios Y Servicio, Cochera, Balcón',
    bedrooms: 2,
    bathrooms: 3,
    area: 84,
    latitude: -34.9130046,
    longitude: -56.1558734,
    neighborhood: 'Pocitos',
    department: 'Montevideo',
    offers: [{ source, price, currency: 'UYU', sellerName: seller }],
    ...rest,
  }
}
const facts = (value: Row) => rentalLookalikeFacts(value)

// Bulevar España: la misma vivienda en Mercado Libre (dos claves), El País e InfoCasas.
const subject = row('nhbyn-mercadolibre-new', 'mercadolibre', { seller: 'Mercado Libre' })
const mercadoLibre = row('nhbyn-mercadolibre', 'mercadolibre', { seller: 'Mercado Libre' })
const elPais = row('nhbyn-elpais', 'elpais', {
  title: 'Alquiler 2 dormitorios y servicio, cochera, balcón',
  neighborhood: 'POCITOS',
  latitude: -34.913005,
  longitude: -56.155873,
  seller: 'REMAX UNICO',
})
// InfoCasas publica la superficie total (90 m²) donde los otros dos dicen 84.
const infoCasas = row('tkufq-infocasas', 'infocasas', {
  title: 'Alquiler 2 dormitorios y servicio, cochera, balcón',
  area: 90,
  latitude: -34.913004570033,
  longitude: -56.15587335598,
  seller: 'RE/MAX',
})

describe('rentalLookalikeKey', () => {
  it('folds accents, case and punctuation: the three portals share one key', () => {
    const keys = [mercadoLibre, elPais, infoCasas].map(item => rentalLookalikeKey(facts(item)))
    expect(new Set(keys).size).toBe(1)
    expect(keys[0]).toBe('alquiler 2 dormitorios y servicio cochera balcon|2|3|UYU:60000')
  })

  it('keeps the first 60 folded characters of the title', () => {
    const long = row('long-title', 'infocasas', {
      title: `${'Apartamento luminoso con vista al mar '.repeat(3)}y garaje`,
    })
    expect(facts(long).title).toHaveLength(60)
  })
})

describe('rentalLookalikes', () => {
  it('folds every copy of the Bulevar España flat, the 7 % surface gap included', () => {
    for (const copy of [mercadoLibre, elPais, infoCasas])
      expect(rentalLookalikes(facts(subject), facts(copy))).toBe(true)
    expect(rentalLookalikes(facts(elPais), facts(infoCasas))).toBe(true)
  })

  it('folds 9fedu4 (El País) with 1ul3cu4 (Mercado Libre) about 1 km apart: an ML pin never vetoes', () => {
    const base = {
      title: 'ALQUILER APARTAMENTO DOS DORMITORIOS 2 GARAJES POCITOS',
      bedrooms: 2,
      bathrooms: 2,
      area: 69,
    }
    const fromElPais = row('pocitos-brasil-elpais', 'elpais', {
      ...base,
      price: 42000,
      latitude: -34.91423081654041,
      longitude: -56.15951256977278,
      seller: 'DELGADO GERARDO',
    })
    const fromMercadoLibre = row('pocitos-mercadolibre', 'mercadolibre', {
      ...base,
      price: 42000,
      latitude: -34.9085301,
      longitude: -56.1504057,
      seller: 'Mercado Libre',
    })
    expect(rentalLookalikes(facts(fromElPais), facts(fromMercadoLibre))).toBe(true)
  })

  it('vetoes two exact points more than 300 m apart, even with the same advert text', () => {
    const near = row('exact-near', 'infocasas', { latitude: -34.9130046, longitude: -56.1558734 })
    const far = row('exact-far', 'elpais', { latitude: -34.9085301, longitude: -56.1504057 })
    expect(rentalLookalikes(facts(near), facts(far))).toBe(false)
  })

  it('does not fold two generic "alquiler de apartamento 2 dormitorios" at $ 37.000 with different areas', () => {
    const generic = {
      title: 'Alquiler de apartamento 2 dormitorios',
      bedrooms: 2,
      bathrooms: 1,
      price: 37000,
    }
    const small = row('generic-small', 'mercadolibre', { ...generic, area: 45 })
    const large = row('generic-large', 'elpais', { ...generic, area: 60 })
    expect(rentalLookalikeGenericTitle(small.title)).toBe(true)
    expect(rentalLookalikes(facts(small), facts(large))).toBe(false)
    // Sin superficie en uno de los dos, un título genérico no alcanza.
    const unknown = row('generic-unknown', 'elpais', { ...generic, area: null })
    expect(rentalLookalikes(facts(small), facts(unknown))).toBe(false)
    // Con la misma superficie sí: es lo único que los identifica.
    const twin = row('generic-twin', 'elpais', { ...generic, area: 45 })
    expect(rentalLookalikes(facts(small), facts(twin))).toBe(true)
  })

  it('treats the barrio name as generic: naming Pocitos does not make a title specific', () => {
    expect(
      rentalLookalikeGenericTitle('Alquiler apartamento 2 dormitorios Pocitos', ['pocitos'])
    ).toBe(true)
    expect(rentalLookalikeGenericTitle('Alq apto Ellauri 1084 103', ['pocitos'])).toBe(false)
  })

  it('treats the price written in the title as generic, and keeps a door number specific', () => {
    // "$ 37.000" folds to "37 000": the "000" made the title look specific.
    expect(rentalLookalikeGenericTitle('Alquiler apartamento 2 dormitorios $ 37.000')).toBe(true)
    expect(rentalLookalikeGenericTitle('Apartamento U$S 1.200 en Pocitos', ['pocitos'])).toBe(true)
    expect(rentalLookalikeGenericTitle('Apto 2 dorm. $ 37.000 + GC 8.000')).toBe(true)
    expect(rentalLookalikeGenericTitle('Alquiler 2 dormitorios 37 mil')).toBe(true)
    // Written without a separator, only the advert's own price counts as a price.
    expect(
      rentalLookalikeGenericTitle('Alquiler apartamento 2 dormitorios $37000', [], [37000])
    ).toBe(true)
    // A surface with its unit is generic too, "m²" included (it folds to "m").
    expect(rentalLookalikeGenericTitle('Apartamento 2 dormitorios 120 m²')).toBe(true)
    // A number that is neither a price, an amount nor a surface stays specific: a door, a unit.
    expect(
      rentalLookalikeGenericTitle('Alquiler apartamento 2 dormitorios 1084', [], [37000])
    ).toBe(false)
    expect(rentalLookalikeGenericTitle('Alquiler apartamento 2 dormitorios 103', [], [37000])).toBe(
      false
    )
    expect(rentalLookalikeGenericTitle('Alq apto Ellauri 1084 103', ['pocitos'], [25500])).toBe(
      false
    )
  })

  it('does not fold two units whose only title is "2 dormitorios $ 37.000" when one has no area', () => {
    const generic = {
      title: 'Alquiler apartamento 2 dormitorios $ 37.000',
      bedrooms: 2,
      bathrooms: 1,
      price: 37000,
    }
    const withArea = row('price-title-area', 'mercadolibre', { ...generic, area: 45 })
    const noArea = row('price-title-no-area', 'elpais', { ...generic, area: null })
    expect(rentalLookalikes(facts(withArea), facts(noArea))).toBe(false)
    // The same text without separators, "$37000": the advert's own price is generic too.
    const bare = { ...generic, title: 'Alquiler apartamento 2 dormitorios $37000' }
    expect(
      rentalLookalikes(
        facts(row('bare-area', 'mercadolibre', { ...bare, area: 45 })),
        facts(row('bare-no-area', 'elpais', { ...bare, area: null }))
      )
    ).toBe(false)
    // With the same area they still fold: it is the only thing that identifies them.
    const twin = row('price-title-twin', 'elpais', { ...generic, area: 45 })
    expect(rentalLookalikes(facts(withArea), facts(twin))).toBe(true)
  })

  it('folds the three iMas.uy adverts: same seller, same exact point, same price and layout', () => {
    const imas = (key: string, barrio: string) =>
      row(key, 'elpais', {
        title: `Apartamento Alquiler ${barrio} Montevideo iMas.uy R...`,
        neighborhood: barrio.toUpperCase(),
        bedrooms: 1,
        bathrooms: 1,
        area: null,
        price: 25500,
        latitude: -34.8518246,
        longitude: -56.2054531,
        seller: 'INMOBILIARIA MAS',
      })
    const [pasoMolino, sayago, prado] = [
      imas('imas-paso-molino', 'Paso Molino'),
      imas('imas-sayago', 'Sayago'),
      imas('imas-prado', 'Prado'),
    ].map(facts)
    expect(rentalLookalikes(pasoMolino!, sayago!)).toBe(true)
    expect(rentalLookalikes(sayago!, prado!)).toBe(true)
    expect(rentalLookalikes(pasoMolino!, prado!)).toBe(true)
    // "Mercado Libre" no es un anunciante: dos avisos de ML en el mismo punto no se juntan por eso.
    const mlA = row('ml-point-a', 'mercadolibre', { title: 'Otro título', seller: 'Mercado Libre' })
    const mlB = row('ml-point-b', 'mercadolibre', { title: 'Distinto', seller: 'Mercado Libre' })
    expect(rentalLookalikes(facts(mlA), facts(mlB))).toBe(false)
  })

  it('never folds a different price, currency, bedroom or bathroom count', () => {
    const base = facts(mercadoLibre)
    expect(rentalLookalikes(base, facts(row('pricier', 'infocasas', { price: 61000 })))).toBe(false)
    expect(
      rentalLookalikes(
        base,
        facts({
          ...row('dollars', 'infocasas'),
          offers: [{ source: 'infocasas', price: 60000, currency: 'USD' }],
        })
      )
    ).toBe(false)
    expect(rentalLookalikes(base, facts(row('three-bed', 'infocasas', { bedrooms: 3 })))).toBe(
      false
    )
    expect(rentalLookalikes(base, facts(row('two-bath', 'infocasas', { bathrooms: 2 })))).toBe(
      false
    )
  })
})

describe('splitRentalLookalikes', () => {
  it('sets the copies of the subject apart and keeps one row per other unit, the better one', () => {
    // La otra vivienda del ejemplo: 1lb9cvq en Mercado Libre (sin gastos) y su copia de InfoCasas.
    const other = {
      title: 'Alquila Apartamento Pocitos 2 Dormitorios 2 Baños Garaje',
      bedrooms: 2,
      bathrooms: 2,
      area: 75,
      latitude: null,
      longitude: null,
    }
    const otherMl: Row = {
      ...row('lbcvq-mercadolibre', 'mercadolibre', other),
      offers: [{ source: 'mercadolibre', price: 60000, currency: 'UYU', commonExpenses: null }],
    }
    const otherIc: Row = {
      ...row('echevarriarza-infocasas', 'infocasas', other),
      offers: [
        {
          source: 'infocasas',
          price: 60000,
          currency: 'UYU',
          url: 'https://www.infocasas.com.uy/echevarriarza',
          image: 'https://cdn1.infocasas.com.uy/repo/img/photo.jpg',
          commonExpenses: 12000,
          commonExpensesCurrency: 'UYU',
        },
      ],
    }
    const distinct = row('distinct-unit', 'infocasas', {
      title: 'Apartamento con terraza en Pocitos',
      price: 58000,
    })
    const { kept, copies } = splitRentalLookalikes(
      facts(subject),
      [mercadoLibre, otherMl, elPais, otherIc, infoCasas, distinct],
      facts,
      item => rentalLookalikePreference(item)
    )
    expect(copies.map(item => item.key).sort()).toEqual(
      ['nhbyn-elpais', 'nhbyn-mercadolibre', 'tkufq-infocasas'].sort()
    )
    // La copia con foto y gastos conocidos representa a su vivienda, en el lugar de la primera.
    expect(kept.map(item => item.key)).toEqual(['echevarriarza-infocasas', 'distinct-unit'])
  })
})
