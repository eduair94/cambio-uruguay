// El directorio de alquileres mandaba cada aviso DOS veces en el payload del SSR: una dentro de
// `offers` y otra como `matchingOffer`, que la API arma como copia aparte del mismo aviso. devalue
// (el serializador del payload de Nuxt) escribe un objeto una sola vez por identidad, así que
// compartir la referencia borra la segunda copia sin cambiar ni un valor de lo que revive el
// cliente. Este test cuida que sólo se comparta lo que es igual de verdad.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse, stringify } from 'devalue'
import { describe, expect, it } from 'vitest'
import { shareMatchingOffer } from '../../utils/rentalSharedOffer'

const APP = join(__dirname, '..', '..')
const pagina = readFileSync(join(APP, 'pages', 'alquileres-uruguay.vue'), 'utf8')

interface Offer {
  source: string
  listingId: string
  price: number
  availability?: { reports: number; label: string }
  details?: { images: string[]; amenities: string[] }
}
interface Item {
  key: string
  offers: Offer[]
  matchingOffer?: Offer | null
}
interface Response {
  total: number
  items: Item[]
}

function offer(listingId: string, price = 30000): Offer {
  return {
    source: 'mercadolibre',
    listingId,
    price,
    availability: { reports: 0, label: 'sin reportes' },
    details: { images: ['a.webp', 'b.webp'], amenities: ['parrillero'] },
  }
}

// La misma oferta con las claves en otro orden: así la arma la API, objeto por objeto.
function reordered(o: Offer): Offer {
  return {
    details: { amenities: [...o.details!.amenities], images: [...o.details!.images] },
    price: o.price,
    listingId: o.listingId,
    availability: { label: o.availability!.label, reports: o.availability!.reports },
    source: o.source,
  }
}

describe('shareMatchingOffer', () => {
  it('comparte la referencia cuando la oferta coincidente es igual a su única oferta', () => {
    const only = offer('MLU1')
    const input: Response = {
      total: 1,
      items: [{ key: 'p1', offers: [only], matchingOffer: reordered(only) }],
    }
    const snapshot = JSON.stringify(input)
    const result = shareMatchingOffer(input)
    expect(result.items[0]!.matchingOffer).toBe(result.items[0]!.offers[0])
    expect(result).not.toBe(input)
    expect(JSON.stringify(input)).toBe(snapshot)
    expect(input.items[0]!.matchingOffer).not.toBe(input.items[0]!.offers[0])
  })

  it('con dos ofertas comparte la que coincide', () => {
    const a = offer('MLU1', 30000)
    const b = offer('MLU2', 32000)
    const result = shareMatchingOffer({
      total: 1,
      items: [{ key: 'p1', offers: [a, b], matchingOffer: reordered(b) }],
    })
    expect(result.items[0]!.matchingOffer).toBe(result.items[0]!.offers[1])
  })

  it('no reemplaza una oferta que difiere en un campo', () => {
    const only = offer('MLU1')
    const changedPrice = { ...reordered(only), price: 31000 }
    const changedAvailability = {
      ...reordered(only),
      availability: { reports: 2, label: 'sin reportes' },
    }
    for (const matching of [changedPrice, changedAvailability]) {
      const original = JSON.parse(JSON.stringify(matching))
      const result = shareMatchingOffer({
        total: 1,
        items: [{ key: 'p1', offers: [only], matchingOffer: matching }],
      })
      const kept = result.items[0]!.matchingOffer
      expect(kept).toEqual(original)
      expect(kept).not.toBe(result.items[0]!.offers[0])
    }
  })

  it('una oferta extra o una lista distinta de imágenes tampoco se comparte', () => {
    const only = offer('MLU1')
    const extraField = { ...reordered(only), stayPriceSuspect: true } as Offer
    const fewerImages = {
      ...reordered(only),
      details: { images: ['a.webp'], amenities: ['parrillero'] },
    }
    for (const matching of [extraField, fewerImages]) {
      const result = shareMatchingOffer({
        total: 1,
        items: [{ key: 'p1', offers: [only], matchingOffer: matching }],
      })
      expect(result.items[0]!.matchingOffer).not.toBe(result.items[0]!.offers[0])
    }
  })

  it('deja igual un aviso que no está en offers y un ítem sin oferta coincidente', () => {
    const only = offer('MLU1')
    const elsewhere = offer('MLU9')
    const withoutMatch: Item = { key: 'p2', offers: [only] }
    const result = shareMatchingOffer({
      total: 2,
      items: [{ key: 'p1', offers: [only], matchingOffer: elsewhere }, withoutMatch],
    })
    expect(result.items[0]!.matchingOffer).toBe(elsewhere)
    expect(result.items[1]).toBe(withoutMatch)
  })

  it('devuelve tal cual una respuesta vacía o sin ítems', () => {
    expect(shareMatchingOffer(null)).toBeNull()
    expect(shareMatchingOffer(undefined)).toBeUndefined()
    const sinItems = { total: 0 } as unknown as Response
    expect(shareMatchingOffer(sinItems)).toBe(sinItems)
  })

  it('devalue escribe la oferta una sola vez y revive exactamente los mismos datos', () => {
    const input: Response = {
      total: 3,
      items: ['MLU1', 'MLU2', 'MLU3'].map(id => {
        const o = offer(id)
        return { key: id, offers: [o], matchingOffer: reordered(o) }
      }),
    }
    const before = stringify(input)
    const after = stringify(shareMatchingOffer(input))
    expect(after.length).toBeLessThan(before.length)
    // Mismos valores; sólo puede cambiar el orden de las claves de matchingOffer, que nadie lee.
    expect(parse(after)).toStrictEqual(parse(before))
    expect(parse(after)).toStrictEqual(input)
  })
})

describe('la página del directorio', () => {
  it('pasa la respuesta del SSR por shareMatchingOffer', () => {
    const at = pagina.indexOf("'rental-directory',")
    expect(at).toBeGreaterThan(-1)
    expect(pagina.slice(at, at + 300)).toContain('shareMatchingOffer')
  })

  it('carga la dirección de referencia sólo cuando hace falta', () => {
    expect(pagina).not.toMatch(/import ReferenceAddress from/)
    expect(pagina).toMatch(
      /defineAsyncComponent\(\s*\(\) => import\('~\/components\/rentals\/ReferenceAddress\.vue'\)\s*\)/
    )
  })

  // Diferido (#342), el detalle del mapa le sacó al chunk de la página su fachada: usa el carrusel
  // de fotos, que sólo usa esta página, y Rollup lo dejó dentro del chunk de la página para
  // dárselo. En el build del 20/11/2026 la página salió sin su CSS y todo su código pasó a ser
  // prefetch en cada página del sitio (app/modules/catalogue-prefetch/README.md).
  it('importa el detalle del mapa de forma estática', () => {
    expect(pagina).toMatch(
      /^import MapPropertyDetail from '~\/components\/rentals\/MapPropertyDetail\.vue'$/m
    )
    expect(pagina).not.toContain("import('~/components/rentals/MapPropertyDetail.vue')")
  })
})
