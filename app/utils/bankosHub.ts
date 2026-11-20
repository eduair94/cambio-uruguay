// El resumen que publica el índice /descuentos-con-tarjeta-uruguay: cuántas marcas y locales
// cubre cada emisor, quién lidera cada rubro y el texto de beneficio que más repite cada uno.
//
// POR QUÉ EXISTE: el índice es la página que el buscador trae para las preguntas ENTRE emisores
// ("¿qué tarjeta tiene descuento en más comercios?", "¿qué emisores tienen promociones
// frecuentes?") y su HTML de servidor no contestaba ninguna. La respuesta ya viajaba: la página
// pide en el servidor GET /api/bankos/brands (el catálogo entero reducido por marca) y lo recortaba
// a 48 nombres. Este módulo cuenta, sobre esa MISMA respuesta, lo que la página imprime — ninguna
// cifra escrita a mano y ningún pedido más. Contra /api/bankos/analysis (otra reducción del mismo
// catálogo) da lo mismo emisor por emisor: medido el 2026-11-20 sobre la lectura viva.
//
// Cobertura, no ahorro: el catálogo trae el TEXTO de cada beneficio y no un porcentaje comparable,
// así que acá no se promedia ningún porcentaje (la misma regla que bankosAnalysis.ts).
//
// PURE: sin Vue ni Nuxt, imports relativos, para que el test lo cargue sin levantar Nitro.

import { BANKOS_BANKS, BANKOS_CARDS } from './bankos'
import type { BankSlice, BrandRow, CategoryCount, OfferTier } from './bankosBrands'
import { categoryPageForCategory } from './bankosPages'
import type { FaqItem } from './faqAnswers'
import { siteTimeZone } from './format'

/** El cuerpo de GET /api/bankos/brands sin parámetros, en lo que este módulo lee. */
export interface HubInput {
  brands?: Array<BrandRow & { pageSlug?: string | null }>
  categories?: CategoryCount[]
  tiers?: OfferTier[]
  banks?: BankSlice[]
  totals?: { brands: number; locations: number }
  generatedAt?: string | null
}

export interface HubQuote {
  /** El texto del emisor, tal cual lo publica. */
  text: string
  /** En cuántas marcas aparece ese texto. */
  brands: number
}

export interface HubIssuer {
  bankId: string
  name: string
  color: string
  brands: number
  locations: number
  /** Marcas que ningún otro emisor del catálogo descuenta. */
  exclusive: number
  /**
   * Marcas con un beneficio publicado con débito, haya o no uno de crédito al lado (Scotiabank
   * tiene marcas sólo de débito, así que no es "también"). `null` cuando el emisor tiene un solo
   * medio de pago en el catálogo: ahí no hay un débito "aparte" que contar.
   */
  debit: number | null
  /** El emisor tiene una sola tarjeta (o QR) en el catálogo. */
  singleMedium: boolean
  topCredit: HubQuote | null
  topDebit: HubQuote | null
  /** Hasta dos rubros con más marcas de este emisor, sin "Otros". */
  topCategories: { category: string; label: string; brands: number }[]
  /** Marcas donde el texto de este emisor (crédito o débito) nombra un día de la semana. */
  brandsNamingDay: number
}

export interface HubLeader {
  bankId: string
  name: string
  brands: number
  locations: number
}

export interface HubCategory {
  category: string
  label: string
  /** Marcas del rubro con beneficio de algún emisor. */
  brands: number
  /** Los tres emisores con más marcas en el rubro. */
  podium: { bankId: string; name: string; brands: number }[]
}

export interface HubTopBrand {
  name: string
  locations: number
  pageSlug: string
}

export interface HubSummary {
  generatedAt: string | null
  totals: {
    brands: number
    locations: number
    issuers: number
    /** Textos de beneficio distintos de la lectura. */
    offerTexts: number
    /** Cuántos de esos textos ofrecen cuotas sin recargo o sin interés. */
    installmentTexts: number
    /** Textos que nombran un día de la semana, el fin de semana o una lista de días. */
    dayTexts: number
    /** Textos que dicen "todos los días". */
    dailyTexts: number
    /**
     * Beneficios (marca × emisor) cuyo texto nombra un día sin que el catálogo les marque días.
     * El filtro "Hoy" del mapa lee los días marcados y no el texto (appliesOnDay en bankos.ts), así
     * que a éstos los muestra cualquier día: medido el 2026-11-20, 274, y 156 eran de OCA ("los
     * viernes" escrito, sin días marcados).
     */
    dayOnlyInText: number
  }
  issuers: HubIssuer[]
  leaders: { byBrands: HubLeader | null; byLocations: HubLeader | null }
  /** Emisores del catálogo sin ninguna marca en esta lectura. */
  withoutDiscounts: string[]
  /** Emisores de la lectura con un solo medio de pago, en orden alfabético. */
  singleMedium: string[]
  categories: HubCategory[]
  topBrands: HubTopBrand[]
}

export const EMPTY_HUB_SUMMARY: HubSummary = Object.freeze({
  generatedAt: null,
  totals: {
    brands: 0,
    locations: 0,
    issuers: 0,
    offerTexts: 0,
    installmentTexts: 0,
    dayTexts: 0,
    dailyTexts: 0,
    dayOnlyInText: 0,
  },
  issuers: [],
  leaders: { byBrands: null, byLocations: null },
  withoutDiscounts: [],
  singleMedium: [],
  categories: [],
  topBrands: [],
}) as HubSummary

/** Emisores con más marcas que esto entran en la respuesta sobre los días. */
export const HUB_DAY_MIN_BRANDS = 100

/** Cuántas marcas muestra la sección de marcas del índice. */
const TOP_BRANDS = 48

const OTHER_CATEGORY = 'Otros'
const INSTALLMENTS = /sin recargo|sin inter[eé]s/i
const WEEKDAY =
  /\b(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?|fin(?:es)? de semana)\b/i
// Las abreviaturas, sólo en lista ("(mar, jue y dom)", la forma de Santander): "mar" suelto
// también es el mar, y un hotel que lo nombra no restringe ningún día.
const DAY_ABBR = String.raw`(?:lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\.?`
const WEEKDAY_LIST = new RegExp(String.raw`\b${DAY_ABBR}(?:,| y) ?${DAY_ABBR}(?![a-záéíóúñ])`, 'i')
const DAILY = /todos los d[ií]as/i

/** El texto nombra un día de la semana, el fin de semana o una lista abreviada de días. */
export function namesWeekday(text: string): boolean {
  return WEEKDAY.test(text) || WEEKDAY_LIST.test(text)
}

const numberFmt = new Intl.NumberFormat('es-UY')
const fmt = (n: number) => numberFmt.format(n)
const byName = (a: string, b: string) => a.localeCompare(b, 'es')

function categoryLabel(category: string): string {
  return categoryPageForCategory(category)?.label ?? category
}

/** "e" delante de una palabra que suena con i ("Santander e Itaú"), "y" en el resto. */
function conjunction(next: string): string {
  return /^h?[ií](?![aeoué])/i.test(next) ? 'e' : 'y'
}

/** "A", "A y B", "A, B y C" ("…, Santander e Itaú"). */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  const last = names[names.length - 1]!
  return `${names.slice(0, -1).join(', ')} ${conjunction(last)} ${last}`
}

function quoteOf(tier: OfferTier | undefined): HubQuote | null {
  return tier ? { text: tier.text, brands: tier.brands } : null
}

/**
 * Todo lo que el índice imprime, contado de una sola respuesta del catálogo. Nunca tira: una
 * entrada nula o rota devuelve el resumen vacío y la página esconde los bloques.
 */
export function buildHubSummary(res: HubInput | null | undefined): HubSummary {
  if (!res || typeof res !== 'object' || !Array.isArray(res.brands)) return EMPTY_HUB_SUMMARY

  const brands = res.brands.filter(b => b && Array.isArray(b.offers))
  const tiers = Array.isArray(res.tiers) ? res.tiers : []
  const slices = Array.isArray(res.banks) ? res.banks : []
  const categoryCounts = Array.isArray(res.categories) ? res.categories : []

  // Marcas de cada emisor por rubro: una marca cuenta una vez en cada rubro que lista, la misma
  // regla que analyzeBankos.
  const perBankCategory = new Map<string, Map<string, number>>()
  // Los días se leen del TEXTO, y aparte de los días que el catálogo marca: no coinciden (OCA
  // escribe "los viernes" en 158 marcas y marca días en 2).
  const tierNamesDay = tiers.map(t => namesWeekday(t.text))
  const namesDayAt = (i: number) => i >= 0 && tierNamesDay[i] === true
  const perBankDay = new Map<string, number>()
  let dayOnlyInText = 0
  for (const row of brands) {
    const cats = Array.isArray(row.categories) ? row.categories : []
    for (const offer of row.offers) {
      let m = perBankCategory.get(offer.bankId)
      if (!m) perBankCategory.set(offer.bankId, (m = new Map()))
      for (const c of cats) m.set(c, (m.get(c) ?? 0) + 1)
      if (namesDayAt(offer.credit) || namesDayAt(offer.debit)) {
        perBankDay.set(offer.bankId, (perBankDay.get(offer.bankId) ?? 0) + 1)
        if (!offer.days?.length) dayOnlyInText += 1
      }
    }
  }

  const cardsOf = (bankId: string) => BANKOS_CARDS.filter(c => c.bankId === bankId)

  const issuers: HubIssuer[] = slices
    .filter(s => s && s.brands > 0)
    .map(s => {
      const bank = BANKOS_BANKS.find(b => b.id === s.bankId)
      const cards = cardsOf(s.bankId)
      const hasBoth = cards.some(c => c.type === 'credit') && cards.some(c => c.type === 'debit')
      const own = tiers.filter(t => t.bankId === s.bankId)
      const topCategories = [...(perBankCategory.get(s.bankId) ?? new Map<string, number>())]
        .filter(([c]) => c !== OTHER_CATEGORY)
        .sort((a, b) => b[1] - a[1] || byName(a[0], b[0]))
        .slice(0, 2)
        .map(([category, n]) => ({ category, label: categoryLabel(category), brands: n }))
      return {
        bankId: s.bankId,
        name: bank?.name ?? s.bankName,
        color: bank?.color ?? s.color,
        brands: s.brands,
        locations: s.locations,
        exclusive: s.exclusive,
        debit: hasBoth ? s.debit : null,
        singleMedium: cards.length === 1,
        topCredit: quoteOf(own.find(t => t.kind === 'credit')),
        topDebit: quoteOf(own.find(t => t.kind === 'debit')),
        topCategories,
        brandsNamingDay: perBankDay.get(s.bankId) ?? 0,
      }
    })
    .sort((a, b) => b.brands - a.brands || byName(a.name, b.name))

  const leaderOf = (i: HubIssuer | undefined): HubLeader | null =>
    i ? { bankId: i.bankId, name: i.name, brands: i.brands, locations: i.locations } : null
  const byLocations = [...issuers].sort(
    (a, b) => b.locations - a.locations || byName(a.name, b.name)
  )[0]

  const present = new Set(issuers.map(i => i.bankId))
  const nameOf = (bankId: string) => BANKOS_BANKS.find(b => b.id === bankId)?.name ?? bankId

  const categories: HubCategory[] = categoryCounts
    .filter(c => c && c.category !== OTHER_CATEGORY && c.brands > 0)
    .map(c => ({
      category: c.category,
      label: categoryLabel(c.category),
      brands: c.brands,
      podium: [...perBankCategory]
        .map(([bankId, m]) => ({ bankId, name: nameOf(bankId), brands: m.get(c.category) ?? 0 }))
        .filter(p => p.brands > 0)
        .sort((a, b) => b.brands - a.brands || byName(a.name, b.name))
        .slice(0, 3),
    }))
    .sort((a, b) => b.brands - a.brands || byName(a.label, b.label))

  const topBrands: HubTopBrand[] = brands
    .filter(b => b.pageSlug)
    .sort((a, b) => b.locations - a.locations)
    .slice(0, TOP_BRANDS)
    .map(b => ({ name: b.name, locations: b.locations, pageSlug: b.pageSlug! }))

  return {
    generatedAt: typeof res.generatedAt === 'string' ? res.generatedAt : null,
    totals: {
      brands: res.totals?.brands ?? 0,
      locations: res.totals?.locations ?? 0,
      issuers: issuers.length,
      offerTexts: tiers.length,
      installmentTexts: tiers.filter(t => INSTALLMENTS.test(t.text)).length,
      dayTexts: tierNamesDay.filter(Boolean).length,
      dailyTexts: tiers.filter(t => DAILY.test(t.text)).length,
      dayOnlyInText,
    },
    issuers,
    leaders: { byBrands: leaderOf(issuers[0]), byLocations: leaderOf(byLocations) },
    withoutDiscounts: BANKOS_BANKS.filter(b => !present.has(b.id)).map(b => b.name),
    singleMedium: issuers
      .filter(i => i.singleMedium)
      .map(i => i.name)
      .sort(byName),
    categories,
    topBrands,
  }
}

/** "19 de noviembre de 2026", en la hora de Uruguay; '' sin fecha o con una fecha rota. */
export function hubReadLabel(iso: string | null | undefined): string {
  if (!iso) return ''
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  return new Intl.DateTimeFormat('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: siteTimeZone(iso),
  }).format(at)
}

/** La frase que abre la página: el total y quién cubre más. '' sin datos. */
export function hubHeadline(summary: HubSummary, readLabel: string): string {
  const { totals, leaders } = summary
  if (!totals.brands || !leaders.byBrands) return ''
  const when = readLabel ? `, según la lectura del ${readLabel}` : ''
  const issuers = `${fmt(totals.issuers)} emisor${totals.issuers === 1 ? '' : 'es'}`
  const first = `Hay ${fmt(totals.brands)} marcas con descuento en ${fmt(totals.locations)} locales, de ${issuers}${when}.`
  const a = leaders.byBrands
  const b = leaders.byLocations
  const second =
    !b || b.bankId === a.bankId
      ? `${a.name} es el que más cubre: ${fmt(a.brands)} marcas y ${fmt(a.locations)} locales.`
      : `${a.name} es el que cubre más marcas (${fmt(a.brands)}) y ${b.name} el que tiene más locales (${fmt(b.locations)}).`
  return `${first} ${second}`
}

/** Los rubros que contesta la pregunta "¿con qué tarjeta conviene…?", en ese orden. */
const FAQ_CATEGORIES: { category: string; phrase: string }[] = [
  { category: 'Mercados', phrase: 'en supermercados' },
  { category: 'Farmacias', phrase: 'en farmacias' },
  { category: 'Restaurantes', phrase: 'en restaurantes' },
]

/**
 * Preguntas contestadas con las cifras de la lectura. [] sin datos: la página deja entonces sólo
 * las preguntas fijas sobre cómo usar el mapa.
 */
export function buildHubFaq(summary: HubSummary, readLabel: string): FaqItem[] {
  const { issuers, totals } = summary
  if (!totals.brands || !issuers.length) return []
  const items: FaqItem[] = []
  const when = readLabel ? `, según la lectura del ${readLabel}` : ''

  // ── Cobertura ───────────────────────────────────────────────────────────
  const [lead, second, third] = issuers
  const followers = !second
    ? ''
    : !third
      ? ` Le sigue ${second.name}, con ${fmt(second.brands)} marcas.`
      : ` Le siguen ${second.name}, con ${fmt(second.brands)} marcas, ${conjunction(third.name)} ${third.name}, con ${fmt(third.brands)}.`
  items.push({
    id: 'mas-comercios',
    question: '¿Qué tarjeta tiene descuento en más comercios?',
    answer:
      `${lead!.name}: ${fmt(lead!.brands)} marcas en ${fmt(lead!.locations)} locales${when}.` +
      followers +
      ' Es cobertura contada del catálogo: no dice cuánto ahorrás.',
    link: {
      label: 'El análisis por emisor, con las marcas exclusivas',
      to: '/que-banco-tiene-mas-descuentos-uruguay',
    },
  })

  // ── Por rubro ───────────────────────────────────────────────────────────
  const rubros = FAQ_CATEGORIES.flatMap(({ category, phrase }) => {
    const cat = summary.categories.find(c => c.category === category)
    const top = cat?.podium[0]
    return cat && top ? [`${phrase}, ${top.name} (${fmt(top.brands)} de ${fmt(cat.brands)})`] : []
  })
  if (rubros.length) {
    items.push({
      id: 'por-rubro',
      question: '¿Con qué tarjeta conviene pagar el supermercado, la farmacia o el restaurante?',
      answer: `Por cantidad de marcas adheridas: ${rubros.join('; ')}. Los demás rubros están en la tabla de rubros de esta página.`,
    })
  }

  // ── Débito ──────────────────────────────────────────────────────────────
  const withDebit = issuers
    .filter(i => i.debit !== null)
    .sort((a, b) => b.debit! / b.brands - a.debit! / a.brands || byName(a.name, b.name))
  if (withDebit.length) {
    items.push({
      id: 'debito-por-emisor',
      question: '¿En qué emisores hay descuento con débito?',
      answer:
        'Marcas con beneficio publicado con débito: ' +
        withDebit.map(i => `${i.name} ${fmt(i.debit!)} de ${fmt(i.brands)}`).join('; ') +
        '. En el mapa, cada comercio muestra por separado el texto de crédito y el de débito.',
    })
  }

  // ── Días ────────────────────────────────────────────────────────────────
  // Nunca "no nombra día" = "vale todos los días": un texto puede callarse el día y el comercio
  // restringirlo igual. Se cuenta lo que los textos dicen, y el filtro "Hoy" se describe por lo
  // que lee (los días marcados), no por lo que promete.
  const big = issuers.filter(i => i.brands > HUB_DAY_MIN_BRANDS)
  if (big.length && totals.offerTexts > 0) {
    const share = (i: HubIssuer) => i.brandsNamingDay / i.brands
    const withDay = big
      .filter(i => i.brandsNamingDay > 0)
      .sort((a, b) => share(b) - share(a) || byName(a.name, b.name))
    const withoutDay = big.filter(i => i.brandsNamingDay === 0).map(i => i.name)
    const verb = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`
    const texts =
      `De los ${fmt(totals.offerTexts)} textos de beneficio${when}, ${verb(totals.dayTexts, 'nombra', 'nombran')} días de la semana` +
      (totals.dailyTexts ? ` y ${verb(totals.dailyTexts, 'dice', 'dicen')} "todos los días".` : '.')
    const perIssuer = withDay.length
      ? ` Marcas con un texto que nombra un día, entre los emisores con más de ${fmt(HUB_DAY_MIN_BRANDS)}: ` +
        withDay.map(i => `${i.name} ${fmt(i.brandsNamingDay)} de ${fmt(i.brands)}`).join('; ') +
        '.'
      : ''
    const none = withoutDay.length
      ? ` En ${joinNames(withoutDay)}, ningún texto nombra un día.`
      : ''
    const filter = totals.dayOnlyInText
      ? ` El filtro "Hoy" del mapa usa los días que el catálogo marca por comercio, y ${verb(totals.dayOnlyInText, 'beneficio nombra', 'beneficios nombran')} un día en su texto sin tenerlo marcado: leé el texto antes de pagar.`
      : ' El filtro "Hoy" del mapa usa los días que el catálogo marca por comercio; igual leé el texto antes de pagar.'
    items.push({
      id: 'todos-los-dias',
      question: '¿Hay descuentos que valgan todos los días?',
      answer:
        'Depende del emisor: el día lo declara el texto de cada beneficio. ' +
        texts +
        perIssuer +
        none +
        filter,
    })
  }

  // ── Cuotas: sólo mientras el catálogo no traiga ninguna ─────────────────
  if (totals.installmentTexts === 0 && totals.offerTexts > 0) {
    items.push({
      id: 'cuotas',
      question: '¿Dónde veo las cuotas sin recargo?',
      answer: `Acá no: el catálogo releva descuentos y no planes de financiación, y ninguno de los ${fmt(totals.offerTexts)} textos de beneficio de esta lectura ofrece cuotas sin recargo.`,
      link: { label: '¿Cuotas o contado? La cuenta completa', to: '/conviene-comprar-en-cuotas' },
    })
  }

  return items
}
