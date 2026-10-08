// "Habitaciones y residencias" del directorio de /alquileres-uruguay: avisos donde se alquila una
// cama o un cuarto —residencia estudiantil, pensión, hogar, casa compartida— y no una vivienda.
//
// POR QUÉ NO ALCANZA EL TIPO: el portal clasifica por lo que el vendedor eligió en un menú, y una
// residencia de quince cuartos se publica como "casa". Medido el 2026-10-07 sobre las 62.181
// propiedades públicas: "Residencia Estudiantil En El Centro" figuraba como casa de 15 dormitorios a
// $ 9.350, que es el precio de UNA cama, y sumaba a la mediana de las casas del Centro. El tipo
// `habitacion` entra siempre; casa, apartamento y "otro", sólo por el título.
//
// "RESIDENCIA" SOLA NO DICE NADA: de los 290 títulos con esa palabra, la mitad eran casas de lujo
// ("Exclusiva Residencia en Carrasco", "Residencia de categoría en Pando"). Por eso dos listas:
//   - FUERTE: frases que sólo usa quien alquila camas ("residencia estudiantil", "hogar femenino",
//     "habitaciones individuales", "apartamento compartido", "alquilo cuartos").
//   - DÉBIL: la palabra sola ("residencia", "pensión", "hostel"). Ahí decide el precio: entre los
//     títulos con la palabra sola, la cama más cara pedía $ 12.000 y la vivienda entera más barata,
//     $ 23.800 ("Residencia exclusiva de 1 dormitorio con balcón").
// Las dos tienen techo, porque hasta la frase fuerte aparece en la casa entera que se ofrece PARA
// montar una residencia ("Casa de 5 dormitorios | Cowork | Residencia Estudiantil", $ 60.000); la
// cama más cara con frase fuerte pedía $ 19.000.
//
// Medido con la regla final, el mismo día: 1.477 propiedades, 53 de ellas por el título. Leídas a
// mano, 52 son camas o cuartos; la otra es un precio mal leído ("Exclusiva residencia en la
// Península" a $ 3.000). "2 cuartos" y "Alquiler 2 habitaciones 1 baño" son CONTEOS de una
// vivienda, no camas: por eso "cuarto" y "pieza" sólo cuentan detrás de un verbo de alquiler y sin
// número. El tipo `habitacion` mismo estaba contaminado de viviendas enteras (dos tercios, por el
// título que Facebook arma solo); eso se corrige en el backend (`inferPropertyType`), no acá.
//
// Locales, oficinas, garajes y terrenos nunca entran: "consultorio compartido" y "cochera en Opta
// Coliving" son de otro mercado.
//
// PRECISIÓN SOBRE RECALL: un aviso de Facebook que dice "Alquiler a estudiantes terciarios" sin
// ninguna de estas frases queda afuera. Se prefiere eso a esconder un monoambiente "ideal
// estudiantes", que es una vivienda.
//
// MISMO PATRÓN EN MONGO Y EN JS. Las cadenas van a `$regex` con `$options: 'i'` y a `RegExp(…, 'i')`.
// Mongo no pliega acentos en una expresión regular (la collation no aplica), así que las vocales
// acentuadas van en clases explícitas.

import type { RentalPropertyType } from './rentals'

/** `?residencias=ocultar` saca las habitaciones y residencias; `solo` deja únicamente ésas. */
export type RentalSharedLivingFilter = '' | 'ocultar' | 'solo'

export const RENTAL_SHARED_LIVING_FILTERS: readonly Exclude<RentalSharedLivingFilter, ''>[] =
  Object.freeze(['ocultar', 'solo'] as const)

export function normalizeRentalSharedLivingFilter(input: unknown): RentalSharedLivingFilter {
  const raw = Array.isArray(input) ? input[0] : input
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return value === 'ocultar' || value === 'solo' ? value : ''
}

/** Techo de la frase fuerte, en pesos (el precio más barato de la propiedad). */
export const RENTAL_SHARED_LIVING_STRONG_MAX_UYU = 30_000
/** Techo de la palabra sola. */
export const RENTAL_SHARED_LIVING_WEAK_MAX_UYU = 15_000

/** Tipos del portal donde el título puede revelar una residencia. El resto no es vivienda. */
export const RENTAL_SHARED_LIVING_TEXT_TYPES: readonly RentalPropertyType[] = Object.freeze([
  'casa',
  'apartamento',
  'otro',
])

const WHO_WORDS =
  'estudiantes|estudiantil(?:es)?|universitari[oa]s?|femenin[oa]s?|masculin[oa]s?|mixt[oa]s?|' +
  'deportistas|trabajador[ae]s|j[oó]venes|se[nñ]oritas|chic[oa]s|varones|mujeres|hombres'
const WHO = `(?:${WHO_WORDS})`

/** Frases que sólo usa quien alquila camas o cuartos. */
export const RENTAL_SHARED_LIVING_STRONG = [
  // Residencia estudiantil / Hogar femenino / Residencia para deportistas / Alojamiento de estudiantes.
  `\\b(?:residencias?|hogar(?:es)?|alojamientos?)\\s+(?:(?:para|de)\\s+)?${WHO}\\b`,
  // Pensión estudiantil / Pensión para varones.
  `\\bpensi[oó]n(?:es)?\\s+(?:(?:para|de)\\s+)?${WHO}\\b`,
  // Casa compartida / Habitaciones compartidas / Alquiler compartido. NO "garage compartido",
  // "parrillero compartido" ni "patio compartido": esos los tiene cualquier edificio.
  '\\b(?:habitaci[oó]n(?:es)?|piezas?|cuartos?|casa|apartamento|apto|vivienda|departamento|alquiler)\\s+compartid[oa]s?\\b',
  // "Apartamento amueblado y compartido para 4 estudiantes".
  `\\bcompartid[oa]s?\\s+(?:con|para|entre)\\s+(?:\\d+\\s+)?(?:otr[oa]s|personas|${WHO_WORDS})\\b`,
  // Habitaciones individuales / Habitación para estudiantes / Habitación estudiante o trabajadores.
  `\\bhabitaci[oó]n(?:es)?\\s+(?:individual(?:es)?|(?:para\\s+)?${WHO}|(?:para\\s+)?estudiante)\\b`,
  // Alquilo cuartos / Renta de piezas / Alquilo habitación simple o doble: el cuarto ES lo que se
  // alquila. Sin número delante: "Alquiler 2 habitaciones 1 baño" describe un apartamento.
  '\\b(?:renta|alquiler|alquilo|alquila|alquilan|arriendo)\\s+(?:de\\s+)?(?:cuartos?|piezas?|habitaci[oó]n(?:es)?)\\b',
].join('|')

/** La palabra sola: sólo cuenta a precio de cama. "Residencial" (el barrio) no es "residencia". */
export const RENTAL_SHARED_LIVING_WEAK =
  '\\b(?:residencias?|pensi[oó]n(?:es)?|hostel(?:es)?|hospedajes?|alojamientos?|co-?living)\\b'

const STRONG = new RegExp(RENTAL_SHARED_LIVING_STRONG, 'i')
const WEAK = new RegExp(RENTAL_SHARED_LIVING_WEAK, 'i')

export interface RentalSharedLivingSubject {
  propertyType: unknown
  title: unknown
  priceUyu: unknown
}

/** ¿Es una habitación o una residencia? La misma regla que `rentalSharedLivingBranches()`. */
export function rentalIsSharedLiving(property: RentalSharedLivingSubject): boolean {
  if (property.propertyType === 'habitacion') return true
  if (!(RENTAL_SHARED_LIVING_TEXT_TYPES as readonly unknown[]).includes(property.propertyType))
    return false
  const title = typeof property.title === 'string' ? property.title : ''
  const price = property.priceUyu
  if (typeof price !== 'number' || !Number.isFinite(price)) return false
  return (
    (price <= RENTAL_SHARED_LIVING_STRONG_MAX_UYU && STRONG.test(title)) ||
    (price <= RENTAL_SHARED_LIVING_WEAK_MAX_UYU && WEAK.test(title))
  )
}

/**
 * Las tres ramas de la regla, como condiciones de `$match`. `solo` las une con `$or`; `ocultar`, con
 * `$nor`. Leen campos GUARDADOS de la propiedad (tipo, título y precio más barato), así que valen
 * igual antes y después de que `rentalPublicStages` recalcule el precio sobre los avisos vigentes:
 * para una propiedad de un solo aviso vigente —todas menos una en 54.645— los dos precios coinciden.
 */
export function rentalSharedLivingBranches(): Record<string, unknown>[] {
  const types = { $in: [...RENTAL_SHARED_LIVING_TEXT_TYPES] }
  return [
    { propertyType: 'habitacion' },
    {
      propertyType: types,
      priceUyu: { $type: 'number', $lte: RENTAL_SHARED_LIVING_STRONG_MAX_UYU },
      title: { $regex: RENTAL_SHARED_LIVING_STRONG, $options: 'i' },
    },
    {
      propertyType: types,
      priceUyu: { $type: 'number', $lte: RENTAL_SHARED_LIVING_WEAK_MAX_UYU },
      title: { $regex: RENTAL_SHARED_LIVING_WEAK, $options: 'i' },
    },
  ]
}

export function rentalSharedLivingCondition(
  filter: RentalSharedLivingFilter
): Record<string, unknown> | null {
  if (filter === 'solo') return { $or: rentalSharedLivingBranches() }
  if (filter === 'ocultar') return { $nor: rentalSharedLivingBranches() }
  return null
}
