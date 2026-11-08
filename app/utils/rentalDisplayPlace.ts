// app/utils/rentalDisplayPlace.ts
// Cómo se NOMBRA el lugar de un alquiler en la ficha, el título, el JSON-LD y las tarjetas.
//
// Sólo presentación: `property.neighborhood` sigue intacto para los filtros, `officialZone` y el
// enlace al barrio. Los portales escriben el mismo barrio como "POCITOS", "CORDON" (sin tilde),
// "parque miramar" o "Aeropuerto Internacional De Carrasco", y Casasweb llegó a escribir la
// superficie ("60 m2 60 m2"): medido el 2026-11-07, 10 de 10 avisos de Gallito en el título de la
// ficha decían "en POCITOS".
import { rentalBarrioNamePlausible, rentalPlaceKey } from './rentalBarrioName'

export interface RentalPlaceSource {
  department?: string | null
  neighborhood?: string | null
  officialZone?: { name?: string | null } | null
}

export interface RentalPlaceLinks {
  /** The ficha's link to its indexable barrio page (`barrioLink` of `/api/rentals/ficha/<key>`). */
  barrioLink?: { path?: string | null; label?: string | null } | null
}

const clean = (value: unknown): string =>
  typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/g, ' ') : ''

/** Siempre en minúscula dentro de un nombre: "Barra de Carrasco", "Bella Vista y Prado". */
const JOINERS = new Set(['de', 'del', 'y', 'en', 'al'])
/** Sólo detrás de "de": "Ciudad de la Costa", pero "La Teja", "Quinta Los Horneros", "La Paz". */
const ARTICLES = new Set(['la', 'las', 'los', 'el'])

/**
 * Mayúsculas de nombre propio en español. Un nombre escrito todo en mayúsculas (o todo en
 * minúsculas) se escribe con mayúscula inicial; uno que ya mezcla las dos se respeta, salvo las
 * preposiciones que el portal capitalizó ("Internacional De Carrasco"). El artículo sólo baja
 * después de "de": en "La Teja" o "Quinta Los Horneros" es parte del nombre. Lo que abre el texto
 * nunca baja, pero un número sí puede abrirlo ("26 de Marzo", "25 de Mayo"). Las tildes que el
 * portal no escribió no se inventan ("CORDON" queda "Cordon").
 */
export function rentalPlaceTitleCase(value: string): string {
  const text = clean(value)
  const singleCase = !(/\p{Lu}/u.test(text) && /\p{Ll}/u.test(text))
  let previous = ''
  return text.replace(/\p{L}+/gu, (word, offset: number) => {
    const lower = word.toLocaleLowerCase('es')
    const after = previous
    previous = lower
    if (offset > 0 && (JOINERS.has(lower) || (ARTICLES.has(lower) && after === 'de'))) return lower
    if (!singleCase) return word
    return lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1)
  })
}

/**
 * The barrio to name, or null when the advert does not give one worth naming.
 *
 * A plausible barrio is shown with the spelling of its own barrio page or of its official area
 * when either folds to the same name ("POCITOS" → "Pocitos", "CORDON" → "Cordón"); otherwise it
 * gets proper-name capitals. An implausible one ("60 m2 60 m2", "Uruguay") gives way to the
 * official area, which comes from the coordinate. A barrio that only repeats the department
 * ("Maldonado" in Maldonado) adds nothing next to it.
 */
export function rentalDisplayBarrio(
  property: RentalPlaceSource,
  links: RentalPlaceLinks = {}
): string | null {
  const raw = clean(property.neighborhood)
  const official = clean(property.officialZone?.name)
  if (raw && rentalBarrioNamePlausible(raw)) {
    const key = rentalPlaceKey(raw)
    const label = clean(links.barrioLink?.label)
    if (label && rentalPlaceKey(label) === key) return label
    if (official && rentalPlaceKey(official) === key) return official
    if (rentalPlaceKey(clean(property.department)) === key) return null
    return rentalPlaceTitleCase(raw)
  }
  return official || null
}

/** "Pocitos"; the department when the advert names no usable barrio; '' when it names neither. */
export function rentalDisplayPlace(
  property: RentalPlaceSource,
  links: RentalPlaceLinks = {}
): string {
  return rentalDisplayBarrio(property, links) ?? clean(property.department)
}

/** "Pocitos, Montevideo", or just "Montevideo": the place line of the ficha and the cards. */
export function rentalDisplayZone(
  property: RentalPlaceSource,
  links: RentalPlaceLinks = {}
): string {
  const barrio = rentalDisplayBarrio(property, links)
  const department = clean(property.department)
  if (!barrio) return department
  return department && rentalPlaceKey(department) !== rentalPlaceKey(barrio)
    ? `${barrio}, ${department}`
    : barrio
}
