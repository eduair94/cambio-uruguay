// Plan D — CyberLunes y Black Friday: espejo (app-side) del calendario de eventos, más las
// transformaciones puras que usan `/ciberlunes-y-black-friday-uruguay` y su API.
//
// `app/utils` es un namespace de auto-import PLANO: cada export lleva el prefijo `priceEvent`/
// `PRICE_EVENT_` para no chocar con otra página. Este archivo NO importa `classes/priceevents/`
// (raíz): los dos paquetes compilan bajo tsconfigs separados (ver AGENTS.md, "Dos build surfaces") y
// el build de Nuxt no puede tirar de un módulo de la raíz. `PRICE_EVENT_CALENDAR` es el ESPEJO A MANO
// de `classes/priceevents/calendar.ts::PRICE_EVENTS` (mismas claves, mismas fechas, mismo orden) —
// sólo un TEST del suite del app puede compararlos directamente
// (`app/tests/unit/priceEventsCalendarParity.test.ts`, que sí puede importar el archivo de la raíz
// porque es un test y no build de producción; un test de la raíz jamás puede importar de `app/`, ver
// `classes/priceevents/calendar.ts`). Cambiá los dos juntos.

import { isEquiparCategorySlug } from './equiparCategoryPages'
import { dateLocale } from './format'

// ---------------------------------------------------------------------------
// Calendario (espejo de classes/priceevents/calendar.ts)
// ---------------------------------------------------------------------------

export interface PriceEventCalendarEntry {
  key: string
  label: string
  start: string | null
  end: string | null
  confirmed: boolean
  source: string | null
  note: string
}

/**
 * Verificado el 16–17/9/2026 (ver `docs/superpowers/plans/2026-09-16-directorios-d-eventos.md`):
 * CyberLunes lo organiza la CEDU dos veces por año, junio y noviembre. La edición de noviembre de
 * 2026 TODAVÍA NO TIENE FECHA PUBLICADA — se muestra "a confirmar por la CEDU" hasta que un humano
 * cargue la fecha real con su fuente, acá y en el espejo de la raíz. Nunca inventar una fecha para
 * completar esta lista.
 */
export const PRICE_EVENT_CALENDAR: readonly PriceEventCalendarEntry[] = [
  {
    key: 'ciberlunes-2025-11',
    label: 'CyberLunes noviembre 2025',
    start: '2025-11-03',
    end: '2025-11-05',
    confirmed: true,
    source:
      'https://cuti.org.uy/en/destacados/noviembre-comienza-con-una-nueva-edicion-de-ciberlunes-con-hasta-70-off/',
    note: '',
  },
  {
    key: 'ciberlunes-2026-06',
    label: 'CyberLunes junio 2026',
    start: '2026-06-01',
    end: '2026-06-03',
    confirmed: true,
    source: 'https://www.sodimac.com.uy/sodimac-uy/content/Ciberlunes/',
    note: '',
  },
  {
    key: 'ciberlunes-2026-11',
    label: 'CyberLunes noviembre 2026',
    start: null,
    end: null,
    confirmed: false,
    source: 'https://www.cedu.org.uy/ciberlunes/',
    note: 'La CEDU todavía no publicó la fecha.',
  },
  {
    key: 'black-friday-2026',
    label: 'Black Friday 2026',
    start: '2026-11-27',
    end: '2026-11-30',
    confirmed: true,
    source: null,
    note: 'Del viernes 27 al lunes 30 de noviembre (Cyber Monday de EE.UU.).',
  },
]

const PRICE_EVENT_UNCONFIRMED_WINDOW_START = '2026-11-01'
const PRICE_EVENT_UNCONFIRMED_WINDOW_END = '2026-11-08'

function priceEventWindowOf(entry: PriceEventCalendarEntry): { start: string; end: string } {
  if (entry.start !== null && entry.end !== null) return { start: entry.start, end: entry.end }
  return { start: PRICE_EVENT_UNCONFIRMED_WINDOW_START, end: PRICE_EVENT_UNCONFIRMED_WINDOW_END }
}

/**
 * Ediciones dentro de [start, end] inclusive; la de noviembre de 2026 (sin fecha) activa la ventana
 * amplia con `confirmed: false`. `null` si ningún evento cubre `today`. Espejo exacto de
 * `classes/priceevents/calendar.ts::activeEvent` — comparado por `priceEventsCalendarParity.test.ts`.
 */
export function priceEventActiveEvent(today: string): PriceEventCalendarEntry | null {
  const active = PRICE_EVENT_CALENDAR.map(entry => ({
    entry,
    ...priceEventWindowOf(entry),
  })).filter(w => w.start <= today && today <= w.end)
  if (!active.length) return null
  return (active.find(w => w.entry.confirmed) ?? active[0]!).entry
}

// ---------------------------------------------------------------------------
// Fechas: cuenta regresiva y ediciones pasadas
// ---------------------------------------------------------------------------

export interface PriceEventCountdown {
  event: PriceEventCalendarEntry
  /** Días de hoy al `start` del evento; `null` cuando el evento todavía no tiene fecha confirmada. */
  daysUntilStart: number | null
}

function priceEventDaysBetween(fromIso: string, toIso: string): number {
  const msPerDay = 86_400_000
  return Math.round(
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / msPerDay
  )
}

/**
 * La próxima edición a mostrar: el evento CONFIRMADO más próximo que todavía no terminó, o —si no
 * queda ninguno confirmado por delante— el que espera fecha. `today` es un parámetro (nunca
 * `Date.now()` adentro): la página lo calcula una sola vez en el servidor con `useState` y no abre un
 * reloj que tickea en el cliente (ver el global constraint del plan: el countdown no puede renderizar
 * un reloj vivo).
 */
export function priceEventCountdown(today: string): PriceEventCountdown | null {
  const confirmedUpcoming = PRICE_EVENT_CALENDAR.filter(
    (entry): entry is PriceEventCalendarEntry & { start: string; end: string } =>
      entry.confirmed && entry.start !== null && entry.end !== null && entry.end >= today
  ).sort((a, b) => a.start.localeCompare(b.start))

  if (confirmedUpcoming.length) {
    const event = confirmedUpcoming[0]!
    return { event, daysUntilStart: Math.max(0, priceEventDaysBetween(today, event.start)) }
  }

  const unconfirmed = PRICE_EVENT_CALENDAR.find(entry => !entry.confirmed) ?? null
  return unconfirmed ? { event: unconfirmed, daysUntilStart: null } : null
}

/** Ediciones ya cerradas (`end < today`), en orden cronológico — para el bloque "ediciones pasadas". */
export function priceEventPastEditions(today: string): PriceEventCalendarEntry[] {
  return PRICE_EVENT_CALENDAR.filter(entry => entry.end !== null && entry.end < today).sort(
    (a, b) => (a.start ?? '').localeCompare(b.start ?? '')
  )
}

/**
 * `'2026-11-27'` (o un ISO con hora, como `generatedAt`) -> `'27 de noviembre de 2026'`, grafía
 * uruguaya (ver `dateLocale`). Nunca se usa para decidir nada, sólo para mostrar.
 *
 * Una fecha calendario (`YYYY-MM-DD`, sin hora) NO es una lectura de medianoche: convertirla a
 * `America/Montevideo` (UTC-3) la corre un día para atrás (17 de setiembre a medianoche UTC es 16 a
 * las 21:00 en Montevideo). Mismo criterio que `rentalPresentation.ts::rentalDate` y
 * `propertyOpportunityPresentation.ts`: una fecha pura se formatea en UTC; un timestamp real
 * (`generatedAt`), en el huso de Montevideo.
 */
export function priceEventFormatDate(iso: string): string {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso)
  const time = Date.parse(isDateOnly ? `${iso}T00:00:00Z` : iso)
  if (Number.isNaN(time)) return iso
  return new Date(time).toLocaleDateString(dateLocale('es'), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: isDateOnly ? 'UTC' : 'America/Montevideo',
  })
}

// ---------------------------------------------------------------------------
// Snapshot: las formas que devuelve GET /api/price-events (no el documento crudo de Mongo)
// ---------------------------------------------------------------------------

export type PriceEventOutcome = 'baja-real' | 'tachado-por-encima' | 'precio-de-siempre'

export interface PriceEventDropDoc {
  listingId: string
  vertical: string
  category: string | null
  productKey: string | null
  sellerKey: string
  sellerName: string
  title: string
  url: string
  currency: 'UYU' | 'USD'
  price: number
  listPrice: number | null
  priorMin: number
  priorMax: number
  priorMedian: number
  priorPoints: number
  classes: PriceEventOutcome[]
  dropPct: number | null
}

export interface PriceEventSellerStat {
  sellerKey: string
  sellerName: string
  withListPrice: number
  inflated: number
  /** `inflated / withListPrice` como porcentaje, con 1 decimal. */
  share: number
}

export interface PriceEventVerticalStats {
  eligible: number
  drops: number
  inflated: number
}

export interface PriceEventSnapshotResponse {
  day: string
  event: PriceEventCalendarEntry | null
  generatedAt: string
  trackingSince: string | null
  analyzed: number
  eligible: number
  byVertical: Record<string, PriceEventVerticalStats>
  topDrops: PriceEventDropDoc[]
  dropsCount: number
  inflatedCount: number
  sellers: PriceEventSellerStat[]
}

export interface PriceEventDayPoint {
  day: string
  eligible: number
  drops: number
  inflated: number
}

export interface PriceEventApiResponse {
  current: PriceEventSnapshotResponse | null
  days: PriceEventDayPoint[]
  events: readonly PriceEventCalendarEntry[]
}

// ---------------------------------------------------------------------------
// Filas de la tabla de bajas, con el enlace interno cuando se puede derivar
// ---------------------------------------------------------------------------

export interface PriceEventDropRow extends PriceEventDropDoc {
  /** Enlace propio del sitio cuando la oferta pertenece a un directorio publicado; si no, `null` y la
   * fila sólo enlaza afuera con `url`. */
  internalHref: string | null
}

/** `'phone:iphone-15-pro'` -> `'iphone-15-pro'`. `null` si no tiene ese prefijo. */
function priceEventPhoneSlug(productKey: string | null): string | null {
  if (!productKey || !productKey.startsWith('phone:')) return null
  const slug = productKey.slice('phone:'.length)
  return slug || null
}

/**
 * El enlace interno se deriva por vertical en el momento de servir la fila, nunca se guarda en el
 * análisis: así una categoría que gana o pierde página propia (equipar) o una vertical que todavía no
 * tiene hub público (celulares, hasta que ese directorio se publique en otra rama) cambia acá sin
 * tocar el job que escribió el dato.
 */
function priceEventInternalHref(doc: PriceEventDropDoc): string | null {
  if (doc.vertical === 'equipar' && doc.category && isEquiparCategorySlug(doc.category)) {
    return `/equipar-casa-uruguay/${doc.category}`
  }
  // El directorio de celulares todavía no está publicado (lo agrega otra rama que merge antes que
  // ésta): la derivación queda lista y sin efecto porque hoy no hay filas de vertical `celulares`.
  const phoneSlug = priceEventPhoneSlug(doc.productKey)
  if (doc.vertical === 'celulares' && phoneSlug) {
    return `/celulares-uruguay/${phoneSlug}`
  }
  if (doc.vertical === 'sillas') {
    return '/sillas-escritorio-uruguay'
  }
  return null
}

export function priceEventDropRows(
  current: Pick<PriceEventSnapshotResponse, 'topDrops'> | null
): PriceEventDropRow[] {
  if (!current) return []
  return current.topDrops.map(doc => ({ ...doc, internalHref: priceEventInternalHref(doc) }))
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export interface PriceEventFaqItem {
  id: string
  question: string
  answer: string
}

/**
 * FAQ de la página. Las dos primeras preguntas explican la regla siempre, con o sin datos; la de
 * "desde cuándo" sólo aparece si el snapshot trae `trackingSince` (nunca se inventa una fecha). Sin
 * adjetivos: describe la regla y nunca acusa a una tienda puntual — ver el global constraint "Sin
 * acusaciones" del plan.
 */
export function priceEventFaq(current: PriceEventSnapshotResponse | null): PriceEventFaqItem[] {
  const faq: PriceEventFaqItem[] = [
    {
      id: 'ciberlunes-que-es-baja-real',
      question: '¿Qué es una "baja real"?',
      answer:
        'Que el precio de hoy de esa oferta puntual está al menos 10 % por debajo del precio más bajo ' +
        'que esa misma oferta tuvo en los últimos 60 días. La comparación es siempre contra el propio ' +
        'historial de la oferta, nunca contra otra tienda ni contra un precio de lista.',
    },
    {
      id: 'ciberlunes-que-es-tachado-por-encima',
      question: '¿Qué es un precio tachado por encima del historial?',
      answer:
        'Que el precio de lista (el que aparece tachado junto al precio con descuento) de hoy es al ' +
        'menos 10 % más alto que el precio de venta más caro que esa misma oferta tuvo en los últimos ' +
        '60 días. Es una comparación contra lo que nosotros vimos, no una prueba de que ese precio ' +
        'anterior nunca existió: sólo relevamos las tiendas de nuestro directorio, desde la fecha que ' +
        'decimos abajo.',
    },
  ]

  if (current?.trackingSince) {
    faq.push({
      id: 'ciberlunes-desde-cuando',
      question: '¿Desde cuándo tienen este historial?',
      answer:
        `Empezamos a guardar un precio diario por oferta el ${priceEventFormatDate(current.trackingSince)}. ` +
        'Antes de esa fecha no tenemos con qué comparar, así que una oferta necesita al menos 21 días ' +
        'de historial propio antes de que la clasifiquemos.',
    })
  }

  faq.push({
    id: 'ciberlunes-por-que-no-estan-todas-las-tiendas',
    question: '¿Por qué no aparecen todas las tiendas de Uruguay?',
    answer:
      'Porque sólo podemos comparar el historial de las tiendas que relevamos todos los días para ' +
      '/equipar-casa-uruguay y /sillas-escritorio-uruguay. Una tienda fuera de esa lista puede tener ' +
      'una baja real o un precio tachado por encima de su historial y esta página no lo va a mostrar, ' +
      'simplemente porque no lo medimos.',
  })

  faq.push({
    id: 'ciberlunes-regla-de-30-dias',
    question: '¿Es cierto que el precio anterior tuvo que estar 30 días vigente?',
    answer:
      'No en Uruguay. Esa regla es de una directiva europea y no existe en la Ley 17.250 ni en el ' +
      'Decreto 244/000: ninguno de los dos le pone un plazo mínimo al precio anterior. Lo que la ley sí ' +
      'exige está en el art. 24 (no inducir a error sobre el precio) y en el art. 26 (probar el precio ' +
      'publicitado es responsabilidad de quien anuncia, no tuya).',
  })

  return faq
}
