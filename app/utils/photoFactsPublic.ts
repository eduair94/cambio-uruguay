// Lo único que se publica de `photofacts` (la colección privada que escribe `currency-photo-facts`,
// ver docs/app/PHOTO_FACTS.md): lo que las fotos de UN aviso muestran y el aviso no dice.
//
// Qué y por qué, medido el 2026-11-23 sobre 250 avisos, con Claude Opus 5.5 y Sonnet 5.5 etiquetando
// A CIEGAS (sin ver la respuesta de Haiku) y contando sólo donde los dos coincidían, que es el
// precedente de los gastos comunes leídos del texto:
//  - "sin muebles": 92 de 92 correctos.
//  - "amueblada": 53 de 55 (96,4 %), y los dos errores eran de InfoCasas (6 de 8), el portal que les
//    vende a sus anunciantes amueblar ambientes de forma virtual. Sin InfoCasas, 47 de 47. Por eso
//    InfoCasas no muestra "amueblada".
//  - "cocina integrada": 57 de 60 (95 %).
// NO pasaron y no se publican: balcón/terraza (77 %; los etiquetadores discutieron 26 avisos), patio
// (87 %), aire (94,9 %, por una décima), y parrillero y piscina, que dieron bien pero con menos de 30
// casos. Humedad, daño o estado no se preguntan.
//
// Las reglas que no se negocian:
//  - Nunca contradice ni repite lo que el aviso declara: si el aviso dice amueblado o sin muebles,
//    el mobiliario de las fotos no se muestra.
//  - Siempre con la foto que lo muestra, y diciendo que lo vio una IA.
//  - Sólo la configuración medida (modelo y esquema): otro modelo es otra serie y hay que volver a medir.

export const PHOTO_FACTS_MEASURED = Object.freeze({
  on: '2026-11-23',
  model: 'claude-haiku-5-5',
  schema: 1,
})

export type PublicPhotoFact = 'amueblada' | 'sin_muebles' | 'cocina_integrada'

export const PUBLIC_PHOTO_FACTS: readonly PublicPhotoFact[] = Object.freeze([
  'amueblada',
  'sin_muebles',
  'cocina_integrada',
])

/** Portales cuyas fotos pueden traer amoblamiento virtual: "amueblada" no se muestra para ellos. */
const VIRTUAL_STAGING_SOURCES: ReadonlySet<string> = new Set(['infocasas'])

export interface PublicPhotoFacts {
  listingId: string
  readAt: string
  facts: Array<{ fact: PublicPhotoFact; photo: string }>
}

interface StoredPhotoFacts {
  ok?: unknown
  schema?: unknown
  model?: unknown
  readAt?: unknown
  source?: unknown
  listingId?: unknown
  photos?: Array<{ url?: unknown } | null | undefined>
  facts?: {
    furniture?: unknown
    furniturePhoto?: unknown
    seen?: Record<string, unknown>
  }
}

const isHttps = (value: unknown): value is string =>
  typeof value === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(value)

/**
 * La proyección pública, campo por campo, de un documento de `photofacts` para la oferta que se
 * muestra. `null` si no hay nada publicable. `declaredFurnished` es lo que dice el AVISO
 * (`offer.furnished`): `true`/`false` apagan el mobiliario de las fotos.
 */
export function publicPhotoFacts(
  doc: StoredPhotoFacts | null | undefined,
  offer: { listingId: string; source: string; declaredFurnished: boolean | null | undefined }
): PublicPhotoFacts | null {
  if (!doc || doc.ok !== true) return null
  if (doc.schema !== PHOTO_FACTS_MEASURED.schema) return null
  if (typeof doc.model !== 'string' || !doc.model.startsWith(PHOTO_FACTS_MEASURED.model))
    return null
  if (doc.listingId !== offer.listingId) return null
  const photoAt = (index: unknown): string | null => {
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) return null
    const url = doc.photos?.[index]?.url
    return isHttps(url) ? url : null
  }
  const facts: PublicPhotoFacts['facts'] = []
  const declared = offer.declaredFurnished === true || offer.declaredFurnished === false
  const furniturePhoto = photoAt(doc.facts?.furniturePhoto)
  if (!declared && furniturePhoto) {
    if (doc.facts?.furniture === 'no') facts.push({ fact: 'sin_muebles', photo: furniturePhoto })
    else if (doc.facts?.furniture === 'si' && !VIRTUAL_STAGING_SOURCES.has(offer.source))
      facts.push({ fact: 'amueblada', photo: furniturePhoto })
  }
  const kitchen = photoAt(doc.facts?.seen?.integratedKitchen)
  if (kitchen) facts.push({ fact: 'cocina_integrada', photo: kitchen })
  if (!facts.length) return null
  return {
    listingId: offer.listingId,
    readAt: typeof doc.readAt === 'string' ? doc.readAt.slice(0, 10) : '',
    facts,
  }
}
