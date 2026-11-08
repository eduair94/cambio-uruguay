// app/utils/rentalPageSnippet.ts
// El <title> y la meta description de la ficha de alquiler: lo que se lee en el resultado de
// Google y en la tarjeta de WhatsApp antes de entrar.
//
// Medido el 2026-11-07 sobre las fichas del sitemap: títulos de 72 a 109 caracteres con el precio
// después del carácter ~60 (Google corta en ~60), el barrio en mayúsculas del portal, y una
// descripción que repetía el título sin los gastos comunes ni el total que la página sí muestra.
// Y las búsquedas por dirección ("bulevar españa 2255", "cufre 1773") son la intención declarada
// más grande del grupo: 871 impresiones en posición ~9 con 0,7 % de CTR, sin la calle en el título.
//
// Puro y con sus propios textos en es/en/pt, para que cada regla se pruebe en vitest. El H1 sigue
// siendo el título del portal: esto cambia el snippet, no la página.
import { rentalPlaceKey } from './rentalBarrioName'
import { rentalPlaceTitleCase } from './rentalDisplayPlace'
import { rentalNumberLocale } from './rentalPresentation'
import {
  RENTAL_SOURCE_LABEL,
  totalMonthlyUyu,
  type RentalCurrency,
  type RentalOffer,
} from './rentals'

/** Lo que Google muestra de un título; la ficha ya no le suma " | Cambio Uruguay" (17 más). */
export const RENTAL_TITLE_MAX = 60
export const RENTAL_DESCRIPTION_MAX = 155

export interface RentalSnippetInput {
  /** Stored type (`apartamento`, `casa`…). */
  propertyType: string
  bedrooms: number | null
  bathrooms: number | null
  area: number | null
  /** The adverts disagree on the facts (the page's `uncertainData`): no room counts are claimed. */
  uncertain: boolean
  /** `rentalStreet(property)`: the advert's own address string, '' when it has none. */
  street: string
  /** `rentalDisplayPlace()`: "Pocitos", or the department when the advert names no barrio. */
  place: string
  department: string
  /** The advert the page prices by default, with the amounts the API already repriced. */
  offer: Pick<
    RentalOffer,
    'price' | 'currency' | 'priceUyu' | 'commonExpenses' | 'commonExpensesCurrency'
  >
  usdUyu: number
}

interface Pieces {
  head: string
  street: string | null
  place: string
  /** null when the place IS the department: "Montevideo, Montevideo" says nothing twice. */
  department: string | null
  price: string
}

interface SnippetCopy {
  types: Record<string, string>
  head(type: string, label: string, bedrooms: number | null): string
  /** In order of preference; the first one that fits wins, the last one is used anyway. */
  titles(pieces: Pieces): Array<string | null>
  lead(label: string, place: string): string
  split(rent: string, expenses: string, total: string): string
  splitWithoutTotal(rent: string, expenses: string): string
  none(rent: string): string
  unknown(rent: string): string
  bedrooms(n: number): string
  studio: string
  bathrooms(n: number): string
}

const withPrice = (text: string, price: string) => (price ? `${text}: ${price}` : text)

const COPY: Record<'es' | 'en' | 'pt', SnippetCopy> = {
  es: {
    types: {
      apartamento: 'Apartamento',
      casa: 'Casa',
      habitacion: 'Habitación',
      local: 'Local',
      oficina: 'Oficina',
      garaje: 'Garaje',
      terreno: 'Terreno',
      otro: 'Propiedad',
    },
    // "Monoambiente" ya dice apartamento: "Apartamento monoambiente" se comía 12 caracteres.
    head: (type, label, n) =>
      n === null
        ? label
        : n === 0
          ? type === 'apartamento'
            ? 'Monoambiente'
            : `${label} monoambiente`
          : `${label} ${n} dorm.`,
    titles: ({ head, street, place, department, price }) => [
      street && withPrice(`${head} en alquiler en ${street}, ${place}`, price),
      street && withPrice(`${head} en ${street}, ${place}`, price),
      street && withPrice(`${head} en ${street}`, price),
      department && withPrice(`${head} en alquiler en ${place}, ${department}`, price),
      withPrice(`${head} en alquiler en ${place}`, price),
      withPrice(`${head} en ${place}`, price),
    ],
    lead: (label, place) => `${label} en ${place}: `,
    split: (rent, expenses, total) => `${rent} + ${expenses} de gastos comunes (${total} por mes)`,
    splitWithoutTotal: (rent, expenses) => `${rent} + ${expenses} de gastos comunes por mes`,
    none: rent => `${rent} por mes, sin gastos comunes`,
    unknown: rent => `${rent} por mes, gastos comunes no informados`,
    bedrooms: n => `${n} dorm.`,
    studio: 'monoambiente',
    bathrooms: n => (n === 1 ? '1 baño' : `${n} baños`),
  },
  en: {
    types: {
      apartamento: 'Apartment',
      casa: 'House',
      habitacion: 'Room',
      local: 'Commercial space',
      oficina: 'Office',
      garaje: 'Garage',
      terreno: 'Land',
      otro: 'Property',
    },
    head: (type, label, n) =>
      n === null
        ? label
        : n === 0
          ? type === 'apartamento'
            ? 'Studio'
            : `Studio ${label.toLowerCase()}`
          : `${n}-bed ${label.toLowerCase()}`,
    titles: ({ head, street, place, department, price }) => [
      street && withPrice(`${head} for rent at ${street}, ${place}`, price),
      street && withPrice(`${head} at ${street}, ${place}`, price),
      street && withPrice(`${head} at ${street}`, price),
      department && withPrice(`${head} for rent in ${place}, ${department}`, price),
      withPrice(`${head} for rent in ${place}`, price),
      withPrice(`${head} in ${place}`, price),
    ],
    lead: (label, place) => `${label} in ${place}: `,
    split: (rent, expenses, total) => `${rent} + ${expenses} common charges (${total} a month)`,
    splitWithoutTotal: (rent, expenses) => `${rent} + ${expenses} common charges a month`,
    none: rent => `${rent} a month, no common charges`,
    unknown: rent => `${rent} a month, common charges not stated`,
    bedrooms: n => `${n} bed`,
    studio: 'studio',
    bathrooms: n => (n === 1 ? '1 bathroom' : `${n} bathrooms`),
  },
  pt: {
    types: {
      apartamento: 'Apartamento',
      casa: 'Casa',
      habitacion: 'Quarto',
      local: 'Loja',
      oficina: 'Escritório',
      garaje: 'Garagem',
      terreno: 'Terreno',
      otro: 'Imóvel',
    },
    head: (type, label, n) =>
      n === null
        ? label
        : n === 0
          ? type === 'apartamento'
            ? 'Studio'
            : `${label} studio`
          : `${label} ${n} ${n === 1 ? 'quarto' : 'quartos'}`,
    titles: ({ head, street, place, department, price }) => [
      street && withPrice(`${head} para alugar em ${street}, ${place}`, price),
      street && withPrice(`${head} em ${street}, ${place}`, price),
      street && withPrice(`${head} em ${street}`, price),
      department && withPrice(`${head} para alugar em ${place}, ${department}`, price),
      withPrice(`${head} para alugar em ${place}`, price),
      withPrice(`${head} em ${place}`, price),
    ],
    lead: (label, place) => `${label} em ${place}: `,
    split: (rent, expenses, total) => `${rent} + ${expenses} de condomínio (${total} por mês)`,
    splitWithoutTotal: (rent, expenses) => `${rent} + ${expenses} de condomínio por mês`,
    none: rent => `${rent} por mês, sem condomínio`,
    unknown: rent => `${rent} por mês, condomínio não informado`,
    bedrooms: n => (n === 1 ? '1 quarto' : `${n} quartos`),
    studio: 'studio',
    bathrooms: n => (n === 1 ? '1 banheiro' : `${n} banheiros`),
  },
}

const copyFor = (locale: string): SnippetCopy =>
  COPY[locale.startsWith('en') ? 'en' : locale.startsWith('pt') ? 'pt' : 'es']

const clean = (value: unknown): string =>
  typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/g, ' ') : ''

/**
 * "$ 14.500", "US$ 1.700". En el snippet el dólar va como "US$", la forma del resto del sitio
 * (autos, ventas); la ficha por dentro sigue con su "U$S" (`rentalMoney`).
 */
export function rentalSnippetMoney(value: number, currency: RentalCurrency, locale = 'es'): string {
  const amount = new Intl.NumberFormat(rentalNumberLocale(locale), {
    maximumFractionDigits: 0,
  }).format(value)
  return `${currency === 'USD' ? 'US$' : '$'} ${amount}`
}

const count = (value: number | null, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max
/** Bedrooms describe a dwelling: "Oficina monoambiente" or "Habitación 1 dorm." say nothing. */
const DWELLINGS = new Set(['apartamento', 'casa', 'otro'])
const bedroomsOf = (input: RentalSnippetInput): number | null =>
  !input.uncertain && DWELLINGS.has(input.propertyType) && count(input.bedrooms, 20)
    ? input.bedrooms
    : null

/** A Plus Code ("4XVJ+R84") is a geocoder's output, never a street someone searches for. */
const PLUS_CODE = /(?:^|[\s,])[2-9CFGHJMPQRVWX]{2,8}\+[2-9CFGHJMPQRVWX]{0,3}(?=$|[\s,])/i
const PLUS_CODES = new RegExp(PLUS_CODE.source, 'gi')
/** The word right before a number that makes it something other than a door number. */
const NOT_A_DOOR_AFTER = new Set([
  'km',
  'kilometro',
  'ruta',
  'ref',
  'referencia',
  'cod',
  'codigo',
  'id',
  'lote',
  'padron',
  'cp',
  'manzana',
  'mz',
  'solar',
  'apto',
  'apartamento',
  'ap',
  'apt',
  'piso',
  'unidad',
  'depto',
  'dpto',
  'oficina',
  'of',
  'local',
  'block',
  'bloque',
  'torre',
  'y',
  'e',
  'entre',
  'esq',
  'esquina',
  'casi',
])
/** What may follow a door number in the same segment: the unit or the corner, cut off below. */
const AFTER_A_DOOR = new Set([
  'apto',
  'apartamento',
  'ap',
  'apt',
  'piso',
  'unidad',
  'depto',
  'dpto',
  'oficina',
  'of',
  'local',
  'block',
  'bloque',
  'torre',
  'bis',
  'esq',
  'esquina',
  'casi',
  'y',
  'entre',
])
const NUMBER_SIGNS = new Set(['n', 'nº', 'nro', 'num', 'numero'])
const STREET_TYPES = new Set([
  'calle',
  'avenida',
  'av',
  'avda',
  'bulevar',
  'bv',
  'bvar',
  'camino',
  'cno',
  'ruta',
  'rambla',
  'pasaje',
  'psje',
  'plaza',
])
const word = (token: string | undefined) => rentalPlaceKey(token ?? '').replace(/\P{L}/gu, '')

/**
 * The street and door number the title may carry ("Cufré 1773"), or null.
 *
 * Only an address the advert itself publishes with a 2–5 digit door number: "Av, Brasil Libertad"
 * (El País's own corner string) or "Galarza" carry none, a Plus Code is a geocoder's, "Ref 4885"
 * is an agency code, "18 de Julio" is a street NAME, "Ruta 8 km 22" is not a door, and
 * "15000 Ciudad de la Costa" is a postal code. Precision over recall: when in doubt the title
 * names the barrio, as it always did.
 */
export function rentalSnippetStreet(street: string): string | null {
  const text = clean(street)
  if (!text || PLUS_CODE.test(text)) return null
  const tokens = text.split(/[,;]/)[0]!.trim().split(' ')
  for (let index = tokens.length - 1; index > 0; index--) {
    const door = tokens[index]!.match(/^(\d{2,5})\.?$/)?.[1]
    if (!door) continue
    const after = word(tokens[index + 1])
    if (NOT_A_DOOR_AFTER.has(word(tokens[index - 1]))) continue
    if (after === 'de' || after === 'del') continue
    if (tokens[index + 1] !== undefined && !AFTER_A_DOOR.has(after)) continue
    let name = tokens.slice(0, index)
    if (NUMBER_SIGNS.has(word(name[name.length - 1]))) name = name.slice(0, -1)
    if (
      (name.join(' ').match(/\p{L}/gu) ?? []).length < 3 ||
      name.every(token => STREET_TYPES.has(word(token)) || !/\p{L}/u.test(token))
    )
      continue
    // Nobody searches "calle alejandro fleming 1700": the word costs 6 of the 60 characters. A
    // numbered street ("Calle 25") keeps it, or the number would read as the street's name.
    if (word(name[0]) === 'calle' && /^\p{L}/u.test(name[1] ?? '')) name = name.slice(1)
    return rentalPlaceTitleCase(`${name.join(' ')} ${door}`)
  }
  return null
}

const SOURCE_NAMES = new Set(
  [
    ...Object.keys(RENTAL_SOURCE_LABEL),
    ...Object.values(RENTAL_SOURCE_LABEL),
    'gallito',
    'el pais',
    'mercado libre',
  ].map(rentalPlaceKey)
)

/**
 * The address as the description may repeat it: the advert's own string without what only a
 * geocoder or a portal writes there — Plus Codes, a bare postal code, "Uruguay", the barrio and
 * the department the description already names, or a portal's name ("Casasweb" as the address of
 * an El País advert, measured 2026-11-07).
 */
export function rentalSnippetAddress(street: string, place: string, department: string): string {
  const skip = new Set(['uruguay', rentalPlaceKey(place), rentalPlaceKey(department)])
  const segments = clean(street)
    .split(',')
    .map(segment =>
      segment
        .replace(PLUS_CODES, ' ')
        .trim()
        .replace(/^\d{5}\s+(?=\p{L})/u, '')
        .trim()
    )
    .filter(segment => {
      const key = rentalPlaceKey(segment)
      return /\p{L}/u.test(segment) && !skip.has(key) && !SOURCE_NAMES.has(key)
    })
  return segments.length ? rentalPlaceTitleCase(segments.join(', ')) : ''
}

function pieces(input: RentalSnippetInput, locale: string): Pieces {
  const copy = copyFor(locale)
  const place = clean(input.place) || 'Uruguay'
  const department = clean(input.department)
  const label = copy.types[input.propertyType] ?? copy.types.otro!
  const bedrooms = bedroomsOf(input)
  const price =
    Number.isFinite(input.offer.price) && input.offer.price > 0
      ? rentalSnippetMoney(input.offer.price, input.offer.currency, locale)
      : ''
  return {
    head: copy.head(input.propertyType, label, bedrooms),
    street: rentalSnippetStreet(input.street),
    place,
    department:
      department && rentalPlaceKey(department) !== rentalPlaceKey(place) ? department : null,
    price,
  }
}

/** The short name of the dwelling: "Apartamento 2 dorm.", "Monoambiente". The breadcrumb's leaf. */
export function rentalPageCrumb(input: RentalSnippetInput, locale = 'es'): string {
  return pieces(input, locale).head
}

/**
 * The first candidate of 60 characters or fewer: street and door number first (with and without
 * "en alquiler"), then barrio and department, then the barrio alone. The last one is used even
 * when it is longer — a barrio's name is never cut.
 */
export function rentalPageTitle(input: RentalSnippetInput, locale = 'es'): string {
  const candidates = copyFor(locale)
    .titles(pieces(input, locale))
    .filter((title): title is string => Boolean(title))
  return candidates.find(title => title.length <= RENTAL_TITLE_MAX) ?? candidates.at(-1)!
}

/** Cut at a word, never mid-word, with the ellipsis inside the budget. */
function fitWords(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const end = cut.lastIndexOf(' ')
  return `${(end > 0 ? cut.slice(0, end) : cut.slice(0, max - 1)).replace(/[\s,:;·+]+$/, '')}…`
}

/**
 * Rent + gastos comunes = total, then the facts the page shows, at most 155 characters. A fact
 * that does not fit is left out whole; the cost sentence goes first because it is what the page
 * adds to the portal's own advert. Gastos comunes the advert does not state are said to be
 * unstated, never assumed; zero only when the advert publishes it. A total that needed a dollar
 * conversion is marked approximate.
 */
export function rentalPageDescription(input: RentalSnippetInput, locale = 'es'): string {
  const copy = copyFor(locale)
  const { place } = pieces(input, locale)
  const label = copy.types[input.propertyType] ?? copy.types.otro!
  const { offer } = input
  const rent = rentalSnippetMoney(offer.price, offer.currency, locale)
  let costs: string
  if (offer.commonExpenses === 0) costs = copy.none(rent)
  else if (
    typeof offer.commonExpenses === 'number' &&
    Number.isFinite(offer.commonExpenses) &&
    offer.commonExpenses > 0 &&
    offer.commonExpensesCurrency
  ) {
    const expenses = rentalSnippetMoney(offer.commonExpenses, offer.commonExpensesCurrency, locale)
    const total = totalMonthlyUyu(offer, input.usdUyu)
    const converted = offer.currency === 'USD' || offer.commonExpensesCurrency === 'USD'
    costs =
      total === null
        ? copy.splitWithoutTotal(rent, expenses)
        : copy.split(
            rent,
            expenses,
            `${converted ? '≈ ' : ''}${rentalSnippetMoney(total, 'UYU', locale)}`
          )
  } else costs = copy.unknown(rent)
  const squareMeters = new Intl.NumberFormat(rentalNumberLocale(locale), {
    maximumFractionDigits: 1,
  })
  const area =
    typeof input.area === 'number' && Number.isFinite(input.area) && input.area > 0
      ? `${squareMeters.format(input.area)} m²`
      : ''
  const bedrooms = bedroomsOf(input)
  const facts = [
    bedrooms === null ? '' : bedrooms === 0 ? copy.studio : copy.bedrooms(bedrooms),
    !input.uncertain && count(input.bathrooms, 20) && input.bathrooms > 0
      ? copy.bathrooms(input.bathrooms)
      : '',
    area,
    rentalSnippetAddress(input.street, place, input.department),
  ].filter(Boolean)
  let text = fitWords(`${copy.lead(label, place)}${costs}`, RENTAL_DESCRIPTION_MAX)
  for (const fact of facts) {
    const next = `${text} · ${fact}`
    if (next.length <= RENTAL_DESCRIPTION_MAX) text = next
  }
  return text
}
