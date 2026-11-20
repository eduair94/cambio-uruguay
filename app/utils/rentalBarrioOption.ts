// app/utils/rentalBarrioOption.ts
// Qué nombres ofrecen los selectores de barrio y de zona de los alquileres.
import { rentalBarrioNamePlausible } from './rentalBarrioName'

/*
 * Los selectores de barrio y de zona de los alquileres ofrecían direcciones:
 *  - el de barrios de /alquileres-uruguay (`facets.neighborhoods` de /api/rentals);
 *  - el de zonas (components/rentals/zones/Explorer.vue, en /alquileres-uruguay,
 *    /alquiler-ideal-uruguay y /barrios-alquileres-uruguay), que además ofrecía las superficies
 *    ("40 m2 40 m2") y "Uruguay" que las páginas de barrio ya rechazaban;
 *  - los de /oportunidades-inmobiliarias-uruguay (por presupuesto) y /analisis-alquileres-uruguay.
 *
 * La tarjeta de búsqueda de Mercado Libre da el lugar en una sola línea, "<calle>, <barrio>,
 * <departamento>", y `parseLocationLine` (classes/rentals/normalize.ts) toma como barrio lo que está
 * justo antes del departamento. En el interior la ciudad se llama como el departamento y la tarjeta
 * suele saltear el barrio, así que "Sarandí 888, Maldonado" guarda "Sarandí 888" como barrio.
 *
 * Medido el 2026-11-08 sobre los 647 nombres que ofrecía el selector de barrios en los 19
 * departamentos: 153 eran direcciones o relleno, entre ellos 68 de los 205 de Maldonado, 40 de los
 * 55 de Paysandú y 9 de los 12 de Florida. Montevideo mostraba 100 y ninguno lo era, pero sólo
 * porque el selector se cortaba en el nombre número 250 antes de filtrar. Leído fuente por fuente,
 * Montevideo tenía 77 direcciones más ("JACKSON 1100", "Av. Bolivia 2000", "Misiones & Sarandí").
 *
 * Sólo los selectores. La ficha nombra su lugar con la línea del propio aviso a propósito: su
 * título lleva la calle (experimento `fichas-alquiler-calle-precio-total-y-miga-al-barrio`,
 * abierto hasta el 2026-12-06). Las páginas de barrio siguen con `rentalBarrioNamePlausible`, y una
 * URL que filtra por una de estas direcciones sigue funcionando.
 *
 * Precisión antes que cobertura:
 *  - El nombre pelado de una calle ("Leandro Gómez") queda, porque pueblos y barrios también llevan
 *    nombres de personas y de fechas ("José Pedro Varela", "18 de Julio", "25 de Mayo").
 *  - Una esquina sin marca ("Ituzaingó y Sarandí") no se distingue de "Pinamar y Pinepark".
 *  - Los lugares de verdad con forma de dirección se nombran uno por uno en `NAMED_LIKE_AN_ADDRESS`.
 *    Mercado Libre imprime esos nombres donde va el barrio. Ese día sólo uno tenía avisos: Camino
 *    Eguzquiza, una zona de Casasweb.
 *  - El nombre de un asentamiento ("Barrio 2000", "Villa La Ruta", "Fracc Sobre Ruta 74") puede
 *    llevar un tipo de vía o un número al final. Las demás marcas (esquina, puerta, relleno) valen
 *    igual.
 *  - Un nombre con la codificación rota ("Malvín Norte" leído como Latin-1) no se ofrece: la
 *    grafía buena está al lado.
 */

/**
 * Invisible characters in Mercado Libre's names: "Jardín Pinares" arrived with a soft hyphen
 * (U+00AD). The zero-width joiner goes last because ESLint's no-misleading-character-class reads
 * one placed between two other characters of a class as a single joined character.
 */
const INVISIBLE = /[\u00AD\u200C\u2060\uFEFF\u200D]/g
const ZERO_WIDTH_SPACE = /\u200B/g
/**
 * UTF-8 read as Latin-1: the "í" of "Malvín Norte" arrived as "Ã" plus a soft hyphen (U+00AD).
 * No Spanish or Portuguese name has "Ã" or "Â" before a character in U+0080–U+00BF ("SÃO" has an
 * "O" after it).
 */
const MOJIBAKE = /[\u00C2\u00C3][\u0080-\u00BF]/

/**
 * The form the patterns read: no accents, no invisible characters, one space, lower case. Only for
 * matching; the selectors keep showing each name as the portal wrote it.
 */
function matchForm(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(INVISIBLE, '')
    .replace(ZERO_WIDTH_SPACE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Real places whose official name reads like an address. Sources: the localities of Mercado
 * Libre's location tree, INE, the Intendencia de Montevideo's 2023 barrio list, OpenStreetMap's
 * neighbourhoods ("Calafí 1 y 2" in Salto, "Rambla" in Artigas), and Casasweb's zones.
 */
const NAMED_LIKE_AN_ADDRESS = new Set(
  [
    'Ruta 37 Y 9',
    'Ruta 37 y 9 - Sierras del Tirol',
    'Km 110',
    'Calafí 1 y 2',
    'Ruta 67 (Barrio Campistegui)',
    'Rambla',
    'Radial Ruta 3',
    'Camino De La Cadena',
    'Camino Dodera',
    'Camino Lloveras',
    'Camino Eguzquiza',
    'Esquina Gonzalez',
    'La Lata Ruta 3 (Km. 375)',
    'La Paz (Ruta 3 Km. 346)',
    'Kilometro 18',
    'Plano 291',
    'Cota 205',
    'La Bolsa 01',
    'La Bolsa 02',
    'La Bolsa 03',
    'Km 16 Cno. Maldonado',
    'Km. 16 Cno. Maldonado',
    'Cno. el Tapir',
    'Municipal 18',
  ].map(matchForm)
)
/** A settlement's own name: "Barrio 2000", "Villa La Ruta", "Fracc Sobre Ruta 74", "MEVIR 25". */
const SETTLEMENT =
  /^(?:barrio|villa|fracc(?:ionamiento)?\.?|asentamiento|cooperativa|mevir|condominio|complejo|euskal\s?erria)\s/

/** Un tipo de vía como palabra suelta: "Av. Roosevelt", "AV.APARICIO SARAVIA", "Rbla. Mansa". */
const STREET_TYPE =
  /(?:^|[\s,.(])(?:av|avda|avenida|avenue|calle|cno|camino|ruta|rbla|rambla|bulevar|bvar|bv|pasaje|diagonal)(?=[\s.,:;/]|$)/
/** Una esquina o una referencia: "25 De Mayo Esquina Yerbal", "Sarandí Casi Ventura Alegre". */
const CORNER = /(?:^|\s)(?:esq|esquina|entre|casi|pasando)(?=[\s.,:;/]|$)/
/** La esquina de Mercado Libre: "Misiones & Sarandí". */
const AMPERSAND = /\s&\s/
/** "Frente al Complejo Polo del Este", "Frente A Atlantico". */
const FACING = /(?:^|\s)frente\s+al?(?=\s|$)/
/** Las marcas de una puerta: "S/n", "Sin Numero", "Nro.", "Nº 1988", "Apto 05". */
const DOOR_MARK = /(?:^|\s)(?:s\/n|sin\s+numero|nro|n[º°]|apto?)(?=[\s.,:;/\d]|$)/
/**
 * Un número de puerta al final: "Sarandí 888", "6 De Julio De 1784 1700", "Roosevelt 0". Tiene
 * dos cifras o más, o es un cero, y nunca va detrás de "los". Así "Lomas Solymar 1." y "Jardín De
 * Los 33" quedan como nombres.
 */
const DOOR_NUMBER = /\p{L}.*?(?<!\blos)\s(?:0|\d{2,5})\s*\.?$/u
/** "19 De Abril/306". */
const SLASH_NUMBER = /\p{L}\s*\/\s*\d/u
/** Las paradas de Punta del Este: "Pda. 37 Mansa", "Parada 17 De Avenida Roosevelt". */
const PARADA = /^(?:pda|parada)\.?\s*\d/
/** Una esquina con una calle de fecha, a la derecha o a la izquierda. */
const DATED_CORNER = /\sy\s+\d/
const DATE_FIRST_CORNER = /(?:^|\s)\d{1,2}\s+de\s+\p{L}+\s+y\s/u
/** Un día cero ("0 De Abril") y la marca de una copia ("Zona Estadio Duplicado"). */
const DAY_ZERO = /(?:^|\s)0+\s+de\s/
const DUPLICATE = /(?:^|\s)duplicad[oa](?=\s|$)/
/** Relleno del portal: "Otras", "Otros Barrios", "PEDIME INFO", "Nuevo !", "Uruguay.". */
const FILLER =
  /^(?:otras?|otros(?:\s+barrios)?|pedime\s+info|dentro\s+de\s+la\s+ciudad|zona\s+centrica|centrica|excelente\s+ubicacion|uruguay)\.?$|[!¡]/

const ADDRESS_PATTERNS = [
  STREET_TYPE,
  CORNER,
  AMPERSAND,
  FACING,
  DOOR_MARK,
  DOOR_NUMBER,
  SLASH_NUMBER,
  PARADA,
  DATED_CORNER,
  DATE_FIRST_CORNER,
  DAY_ZERO,
  DUPLICATE,
  FILLER,
]
/** The only marks of an address a settlement's name may carry. */
const SETTLEMENT_MAY_CARRY = new Set([STREET_TYPE, DOOR_NUMBER])

/** True when `name` reads as a street address, as portal filler or as a broken spelling. */
export function rentalAddressLike(name: unknown): boolean {
  if (typeof name !== 'string') return false
  if (MOJIBAKE.test(name)) return true
  const value = matchForm(name)
  if (!value || NAMED_LIKE_AN_ADDRESS.has(value)) return false
  const settlement = SETTLEMENT.test(value)
  return ADDRESS_PATTERNS.some(
    pattern => !(settlement && SETTLEMENT_MAY_CARRY.has(pattern)) && pattern.test(value)
  )
}

/**
 * What the barrio and zone selectors offer: a name the barrio pages would accept
 * (`rentalBarrioNamePlausible`) that is not an address.
 */
export function rentalBarrioOptionPlausible(name: unknown): boolean {
  return rentalBarrioNamePlausible(name) && !rentalAddressLike(name)
}

/** The ids of the zones a zone selector offers by name (`rentalBarrioOptionPlausible`). */
export function rentalOfferableZoneIds(
  zones: readonly { id: string; ref: { neighborhood: string } }[]
): Set<string> {
  return new Set(
    zones.filter(zone => rentalBarrioOptionPlausible(zone.ref.neighborhood)).map(zone => zone.id)
  )
}
