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
  id: string
  label: string
  start: string | null
  end: string | null
  confirmed: boolean
  source: string | null
  note: string
}

/**
 * Verificado el 16–17/9/2026 (ver `docs/superpowers/plans/2026-09-16-directorios-d-eventos.md`) y
 * de nuevo el 19/10/2026: CyberLunes lo organiza la CEDU dos veces por año, junio y noviembre; la
 * edición de noviembre de 2026 es del lunes 2 al miércoles 4 (nota de la CEDU del 16/9/2026 y
 * ciberlunes.uy). Black Friday es el viernes siguiente al Día de Acción de Gracias de EE.UU. (jueves
 * 26 de noviembre de 2026 según la OPM). Una edición nueva se carga con su fuente, acá y en el
 * espejo de la raíz. Nunca inventar una fecha para completar esta lista.
 */
export const PRICE_EVENT_CALENDAR: readonly PriceEventCalendarEntry[] = [
  {
    id: 'ciberlunes-2025-11',
    label: 'CyberLunes noviembre 2025',
    start: '2025-11-03',
    end: '2025-11-05',
    confirmed: true,
    source:
      'https://cuti.org.uy/en/destacados/noviembre-comienza-con-una-nueva-edicion-de-ciberlunes-con-hasta-70-off/',
    note: '',
  },
  {
    id: 'ciberlunes-2026-06',
    label: 'CyberLunes junio 2026',
    start: '2026-06-01',
    end: '2026-06-03',
    confirmed: true,
    source: 'https://www.sodimac.com.uy/sodimac-uy/content/Ciberlunes/',
    note: '',
  },
  // Keep byte-for-byte in sync with classes/priceevents/calendar.ts (parity test).
  {
    id: 'ciberlunes-2026-11',
    label: 'CyberLunes noviembre 2026',
    start: '2026-11-02',
    end: '2026-11-04',
    confirmed: true,
    source:
      'https://www.cedu.org.uy/camara-de-la-economia-digital-del-uruguay-invita-a-empresas-a-sumarse-al-ciberlunes/',
    note: 'Lo organiza la Cámara de la Economía Digital del Uruguay (CEDU), que publicó la fecha el 16 de setiembre de 2026.',
  },
  {
    id: 'black-friday-2026',
    label: 'Black Friday 2026',
    start: '2026-11-27',
    end: '2026-11-30',
    confirmed: true,
    source: 'https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/',
    note: 'Es el viernes siguiente al Día de Acción de Gracias de EE.UU. (jueves 26 de noviembre). Lo seguimos hasta el lunes 30, el Cyber Monday de EE.UU.',
  },
]

// La ventana adivinada de una edición SIN fecha. Hoy ninguna la usa (la de noviembre de 2026 se
// fechó el 16/9/2026) y está escrita para esa edición: antes de cargar otra sin fecha, moverla acá y
// en la raíz (`classes/priceevents/calendar.ts`, cuyo test falla si aparece una edición sin fecha).
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

/**
 * `upcoming`: todavía no empieza (`today < start`), `daysUntilStart` cuenta.
 * `first-day`: `today === start` — el único día en que "hoy empieza" es cierto.
 * `in-progress`: `start < today <= end` — incluye el ÚLTIMO día del evento, que sigue siendo hoy
 * "en curso", no "primer día" (ese fue el bug: clamplear `daysUntilStart` a 0 con `Math.max(0, …)`
 * hacía que CUALQUIER día de un evento de varios días — 28, 29 y 30 de noviembre, no sólo el 27 —
 * mostrara "Hoy es el primer día de Black Friday").
 * `undated`: no hay ningún evento confirmado activo ni por venir, pero una edición sin fecha (fue el
 * caso de CyberLunes noviembre 2026 hasta que la CEDU la fechó el 16/9/2026; hoy no hay ninguna)
 * todavía puede razonablemente ser "la próxima" — `today` cae dentro de su ventana adivinada (ver
 * `priceEventWindowOf`).
 * `none`: no hay ningún evento confirmado Y la edición sin fecha ya pasó su ventana adivinada sin que
 * nadie haya cargado la fecha real. Ese fue el segundo bug: sin este estado, la página seguía
 * anunciando "CyberLunes noviembre 2026: a confirmar por la CEDU" en diciembre, cuando esa ventana
 * (1 al 8 de noviembre) ya cerró — una afirmación falsa hasta que un humano cargue las próximas
 * ediciones. Un evento vencido nunca es "la próxima".
 */
export type PriceEventCountdownStatus =
  'upcoming' | 'first-day' | 'in-progress' | 'undated' | 'none'

export interface PriceEventCountdown {
  /** `null` sólo cuando `status === 'none'`: no hay ningún evento, confirmado o no, que mostrar. */
  event: PriceEventCalendarEntry | null
  status: PriceEventCountdownStatus
  /** Días de hoy al `start` del evento. Sólo tiene sentido cuando `status === 'upcoming'`; `null` en
   * cualquier otro estado (nunca 0 disfrazando un "hoy empieza" o un "sigue en curso"). */
  daysUntilStart: number | null
  /** El `end` del evento en curso, para "en curso hasta el <fecha>". Sólo tiene sentido cuando
   * `status === 'in-progress'`; `null` en cualquier otro estado. */
  endsOn: string | null
}

function priceEventDaysBetween(fromIso: string, toIso: string): number {
  const msPerDay = 86_400_000
  return Math.round(
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / msPerDay
  )
}

/**
 * La próxima edición a mostrar: el evento CONFIRMADO más próximo que todavía no terminó (por venir, o
 * ya en curso hoy); si no queda ninguno, el que espera fecha PERO sólo mientras `today` siga dentro de
 * su ventana adivinada (`priceEventWindowOf`) — pasada esa ventana, afirmar que sigue siendo "la
 * próxima" ya no tiene base, así que se declara `'none'` en su lugar. Nunca devuelve `null`: siempre
 * hay algo honesto que decir, aunque sea "todavía no hay fechas publicadas".
 *
 * `today` es un parámetro (nunca `Date.now()` adentro): la página lo calcula una sola vez en el
 * servidor con `useState` y no abre un reloj que tickea en el cliente (ver el global constraint del
 * plan: el countdown no puede renderizar un reloj vivo).
 *
 * `calendar` existe sólo para los tests: desde que la CEDU fechó noviembre de 2026 el calendario real
 * no tiene ninguna edición sin fecha, y las ramas `undated`/`none` se siguen probando con uno
 * sintético en vez de quedar sin probar hasta la próxima edición anunciada sin fecha.
 */
export function priceEventCountdown(
  today: string,
  calendar: readonly PriceEventCalendarEntry[] = PRICE_EVENT_CALENDAR
): PriceEventCountdown {
  const confirmedActiveOrUpcoming = priceEventUpcomingEditions(today, calendar)

  if (confirmedActiveOrUpcoming.length) {
    const event = confirmedActiveOrUpcoming[0]!
    if (today < event.start) {
      return {
        event,
        status: 'upcoming',
        daysUntilStart: priceEventDaysBetween(today, event.start),
        endsOn: null,
      }
    }
    if (today === event.start) {
      return { event, status: 'first-day', daysUntilStart: null, endsOn: null }
    }
    // El filtro de arriba ya garantiza `event.start < today <= event.end` en esta rama.
    return { event, status: 'in-progress', daysUntilStart: null, endsOn: event.end }
  }

  const unconfirmed = calendar.find(entry => !entry.confirmed) ?? null
  if (unconfirmed && today <= priceEventWindowOf(unconfirmed).end) {
    return { event: unconfirmed, status: 'undated', daysUntilStart: null, endsOn: null }
  }

  return { event: null, status: 'none', daysUntilStart: null, endsOn: null }
}

/**
 * Las ediciones CONFIRMADAS que todavía no terminaron (por venir o en curso hoy), en orden
 * cronológico. La cuenta regresiva titula sólo con la primera, pero quien llega buscando "cuándo es
 * el Black Friday" a fines de octubre tiene que ver también esa fecha, aunque antes venga el
 * CyberLunes: por eso el bloque "Cuándo es" las lista todas.
 */
export function priceEventUpcomingEditions(
  today: string,
  calendar: readonly PriceEventCalendarEntry[] = PRICE_EVENT_CALENDAR
): (PriceEventCalendarEntry & { start: string; end: string })[] {
  return calendar
    .filter(
      (entry): entry is PriceEventCalendarEntry & { start: string; end: string } =>
        entry.confirmed && entry.start !== null && entry.end !== null && entry.end >= today
    )
    .sort((a, b) => a.start.localeCompare(b.start))
}

/** `'2026-11-02'` -> `'lunes 2'` (día de la semana y número, en UTC: es una fecha calendario). */
function priceEventWeekdayAndDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  const weekday = date.toLocaleDateString(dateLocale('es'), { weekday: 'long', timeZone: 'UTC' })
  return `${weekday} ${date.getUTCDate()}`
}

/** `'2026-11-02'` -> `'noviembre'`, sacado de la fecha larga (que sí lo da en minúscula: el mes
 * suelto, `{ month: 'long' }`, sale con mayúscula inicial en es-UY). */
function priceEventMonthName(iso: string): string {
  return priceEventFormatDate(iso)
    .replace(/^\d+ de /, '')
    .replace(/ de \d{4}$/, '')
}

/**
 * `'2026-11-27'` -> `'El viernes 27 de noviembre de 2026'`. Con el día de la semana porque quien
 * busca "cuándo es" planea la compra por día, no por número.
 */
export function priceEventDayLabelLong(iso: string): string {
  const label = `el ${priceEventWeekdayAndDay(iso)} de ${priceEventMonthName(iso)} de ${iso.slice(0, 4)}`
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * El rango de una edición, con los días de la semana: `'Del lunes 2 al miércoles 4 de noviembre de
 * 2026'`; si cruza de mes, `'Del sábado 30 de mayo al lunes 1 de junio de 2026'`; si cruza de año,
 * cada punta lleva el suyo. `''` para una edición sin fecha (nunca se inventa una).
 */
export function priceEventRangeLabel(
  entry: Pick<PriceEventCalendarEntry, 'start' | 'end'>
): string {
  const { start, end } = entry
  if (!start || !end) return ''
  if (start === end) return priceEventDayLabelLong(start)
  const startYear = start.slice(0, 4)
  const endYear = end.slice(0, 4)
  const endPart = `${priceEventWeekdayAndDay(end)} de ${priceEventMonthName(end)} de ${endYear}`
  let startPart = priceEventWeekdayAndDay(start)
  if (start.slice(0, 7) !== end.slice(0, 7)) startPart += ` de ${priceEventMonthName(start)}`
  if (startYear !== endYear) startPart += ` de ${startYear}`
  return `Del ${startPart} al ${endPart}`
}

/** `'2026-11-02'`/`'2026-11-04'` -> `'2-4/11'`, la forma corta que entra en el `<title>`. */
export function priceEventShortRange(
  entry: Pick<PriceEventCalendarEntry, 'start' | 'end'>
): string {
  const { start, end } = entry
  if (!start || !end) return ''
  const day = (iso: string) => String(Number(iso.slice(8, 10)))
  const month = (iso: string) => String(Number(iso.slice(5, 7)))
  if (start === end) return `${day(start)}/${month(start)}`
  if (start.slice(0, 7) === end.slice(0, 7)) return `${day(start)}-${day(end)}/${month(end)}`
  return `${day(start)}/${month(start)}-${day(end)}/${month(end)}`
}

/**
 * La edición confirmada más reciente (por `start`) cuyo `id` empieza con `prefix` — `'ciberlunes-'`
 * o `'black-friday-'`. La usa la FAQ de fechas, que así contesta la edición vigente sin que nadie
 * reescriba la pregunta cuando se cargue la del año que viene.
 */
export function priceEventLatestEdition(
  prefix: string,
  calendar: readonly PriceEventCalendarEntry[] = PRICE_EVENT_CALENDAR
): (PriceEventCalendarEntry & { start: string; end: string }) | null {
  const editions = calendar
    .filter(
      (entry): entry is PriceEventCalendarEntry & { start: string; end: string } =>
        entry.confirmed && entry.start !== null && entry.end !== null && entry.id.startsWith(prefix)
    )
    .sort((a, b) => b.start.localeCompare(a.start))
  return editions[0] ?? null
}

/**
 * `count === 1 ? singular : plural` — un solo helper para toda la página en vez de un ternario suelto
 * por lugar (final review M3: "Faltan 1 días", "1 ofertas", "1 bajas" eran tres bugs del mismo tipo).
 * Sirve tanto para sustantivos ("oferta"/"ofertas") como para frases enteras con su propio verbo
 * ("Falta"/"Faltan", "oferta bajó"/"ofertas bajaron"), que es más simple y más seguro que conjugar
 * sustantivo y verbo por separado en cada lugar que los usa.
 */
export function priceEventPlural(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

/**
 * El texto principal del bloque de fechas para un `PriceEventCountdown` ya resuelto. Centralizado
 * acá (no en el template) para poder probar cada estado con un `toBe` exacto, incluidos los dos que
 * este archivo existe para arreglar: ningún día del evento dice "primer día" salvo el primero, y
 * ninguna edición sin fecha sigue anunciándose "próxima" después de que su ventana adivinada cerró.
 *
 * F2 (revisión final, hallazgo 2): el caso `none` fechaba la afirmación con el `today` DEL
 * VISITANTE ("Al 15 de diciembre de 2026 todavía no hay fechas publicadas…") — eso implica que
 * revisamos la fuente el día de la visita, que no es cierto, y produce una fecha distinta en cada
 * visita para la misma ausencia de datos. La frase nueva no necesita ninguna fecha para ser honesta:
 * "todavía no cargamos fechas para la próxima edición" describe el ESTADO DE NUESTROS DATOS (el
 * array no tiene una fila vigente), no un chequeo puntual contra la fuente — sigue siendo cierta sin
 * importar cuándo se lea.
 */
export function priceEventCountdownHeadline(countdown: PriceEventCountdown): string {
  switch (countdown.status) {
    case 'upcoming': {
      const days = countdown.daysUntilStart!
      return (
        `${priceEventPlural(days, 'Falta', 'Faltan')} ${days} ${priceEventPlural(days, 'día', 'días')} ` +
        `para ${countdown.event!.label}.`
      )
    }
    case 'first-day':
      return `Hoy empieza ${countdown.event!.label}.`
    case 'in-progress':
      return `${countdown.event!.label}: en curso hasta el ${priceEventFormatDate(countdown.endsOn ?? '')}.`
    case 'undated':
      return `${countdown.event!.label}: a confirmar por la CEDU.`
    case 'none':
      return 'Todavía no cargamos fechas para la próxima edición de CyberLunes ni de Black Friday.'
  }
}

/**
 * La edición sin fecha confirmada (hoy, sólo puede haber una a la vez en `PRICE_EVENT_CALENDAR`),
 * cuando NO es ya el evento que `priceEventCountdown` eligió como titular Y todavía sigue dentro de su
 * ventana adivinada — un evento con fecha fija (Black Friday) puede ganar el titular aunque CyberLunes
 * noviembre, todavía sin fecha, sea el que en la práctica venga antes; sin esta segunda línea esa
 * edición desaparecería de la página por completo mientras dura la ventana de Black Friday. Devuelve
 * `null` cuando no queda ninguna edición sin fecha (todas confirmadas), cuando la sin fecha YA es el
 * titular (evitar repetir la misma línea dos veces el día en que la CEDU confirme la fecha real), o
 * cuando su ventana adivinada ya venció — la misma regla que hace caer a `priceEventCountdown` en
 * `'none'`: una edición vencida nunca es "la próxima", ni siquiera como nota aparte.
 */
export function priceEventOtherUnconfirmed(
  today: string,
  calendar: readonly PriceEventCalendarEntry[] = PRICE_EVENT_CALENDAR
): PriceEventCalendarEntry | null {
  const unconfirmed = calendar.find(entry => !entry.confirmed)
  if (!unconfirmed) return null
  if (today > priceEventWindowOf(unconfirmed).end) return null
  const headline = priceEventCountdown(today, calendar)
  if (headline.event?.id === unconfirmed.id) return null
  return unconfirmed
}

/** Ediciones ya cerradas (`end < today`), en orden cronológico — para el bloque "ediciones pasadas". */
export function priceEventPastEditions(
  today: string,
  calendar: readonly PriceEventCalendarEntry[] = PRICE_EVENT_CALENDAR
): PriceEventCalendarEntry[] {
  return calendar
    .filter(entry => entry.end !== null && entry.end < today)
    .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''))
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

/**
 * "Hoy" para esta página = la fecha CALENDARIO en América/Montevideo, no la fecha UTC del servidor
 * (final review M4). `sync_price_events.ts` (raíz) sí usa la fecha UTC porque escribe un `day:
 * YYYY-MM-DD` que tiene que calzar con el `lastSeen` que ya graban equipar/sillas — esta función es
 * SÓLO para lo que el visitante lee: la cuenta regresiva y "ediciones pasadas" tienen que resolver al
 * mismo día que ve una persona en Montevideo, no al de Greenwich. Ej.: `2026-11-27T01:30:00Z` (la
 * madrugada del 27 en UTC) todavía es `26` de noviembre en Montevideo (UTC-3) — sin este ajuste, la
 * página diría "Hoy empieza Black Friday" tres horas antes de que sea cierto ahí. Calculado UNA vez
 * en el servidor (`useState` en la página) y nunca de nuevo en el cliente, para que SSR e hidratación
 * calculen el mismo valor.
 */
export function priceEventMontevideoToday(now: Date = new Date()): string {
  // 'en-CA' es el único locale común de Intl que formatea como YYYY-MM-DD directamente, sin tener
  // que reordenar partes a mano.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Montevideo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * "hoy" cuando `day` (el día del snapshot) coincide con `today` (el día del visitante, ver
 * {@link priceEventMontevideoToday}), o la fecha formateada en caso contrario — final review M2: un
 * snapshot viejo (una corrida flaca conservó el anterior, una caída del cron) nunca debe seguir
 * afirmando "hoy" una vez que el calendario avanzó. Ambos parámetros son `YYYY-MM-DD`.
 */
export function priceEventDayLabel(day: string, today: string): string {
  return day === today ? 'hoy' : priceEventFormatDate(day)
}

/**
 * Formatea un porcentaje como lo escribe Uruguay: coma decimal, un decimal fijo, sin espacio antes
 * del `%` — mismo criterio que `formatPctEs` (`utils/casaIntents.ts`) y el formateador de
 * `utils/costOfLiving.ts`. `dropPct`/`share` ya vienen redondeados a 1 decimal desde
 * `classes/priceevents/aggregate.ts`; esto sólo controla cómo se IMPRIME esa cifra (`11.3` -> `11,3%`),
 * nunca la redondea de nuevo.
 */
export function priceEventPct(value: number): string {
  return `${value.toLocaleString('es-UY', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

/**
 * Qué fracción de las ofertas elegibles de hoy vino de MercadoLibre — final review M5: la revisión
 * final midió ~94 % en un día puntual, pero hardcodear esa cifra en la página la hubiera dejado mal
 * el día que la mezcla cambiara (más tiendas propias, menos ML). Se MIDE de `bySource` en cada
 * respuesta en vez de citarse de memoria. `null` cuando no hay `eligible` (nada que dividir) o
 * cuando `bySource` no trae la clave `mercadolibre` en absoluto.
 */
export function priceEventMlSharePct(
  current: Pick<PriceEventSnapshotResponse, 'bySource' | 'eligible'> | null
): number | null {
  if (!current || !current.eligible) return null
  const ml = current.bySource?.mercadolibre
  if (typeof ml !== 'number') return null
  return Math.round((ml / current.eligible) * 1000) / 10
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
  /** Ofertas elegibles de hoy, por `source` (`mercadolibre`, `fenicio`, …) — final review M5, para
   * medir (nunca hardcodear) qué fracción del día es MercadoLibre. Ver `priceEventMlSharePct`. */
  bySource: Record<string, number>
  /** Ofertas que la guarda de plausibilidad (I2a, raíz) descartó por implausibles — documentativo acá,
   * la página no lo muestra todavía. */
  suspect: number
}

export interface PriceEventDayPoint {
  day: string
  eligible: number
  drops: number
  inflated: number
}

/**
 * Final review M7: la página nunca lee `events` — el calendario que pinta viene siempre de
 * `PRICE_EVENT_CALENDAR` (el espejo estático de acá arriba), independiente de la base. Devolverlo
 * también en la respuesta HTTP era ~40 KB por visita que nadie leía; se sacó del contrato de la API
 * (ver `app/server/api/price-events.get.ts`) y de este tipo. Si algún día una página SÍ necesita el
 * calendario servido por la API (en vez de importarlo directo), agregarlo de nuevo acá y actualizar
 * `app/tests/unit/priceEventsApi.test.ts` en el mismo cambio.
 */
export interface PriceEventApiResponse {
  current: PriceEventSnapshotResponse | null
  days: PriceEventDayPoint[]
}

// ---------------------------------------------------------------------------
// Filas de la tabla de bajas, con el enlace interno cuando se puede derivar
// ---------------------------------------------------------------------------

/**
 * Sólo los campos que la fila de la tabla de bajas realmente pinta (o necesita para derivar
 * `internalHref`) — final review M7: `PriceEventDropDoc` completo trae `listPrice`/`priorMax`/
 * `priorMedian`/`priorPoints`/`classes`, que esta tabla nunca muestra (`topDrops` ya viene filtrado a
 * puras `baja-real` desde `aggregate.ts`, así que `classes` no aporta nada acá). El `transform` de
 * `useFetch` en la página recorta la respuesta cruda a esta forma ANTES de guardarla en el estado
 * reactivo, así que el payload que de verdad viaja al cliente (y el que queda en el HTML hidratado)
 * es más chico que lo que `GET /api/price-events` sirve. Un objeto `PriceEventDropDoc` completo
 * sigue satisfaciendo este tipo sin cambios (subconjunto estructural), así que los tests existentes
 * que arman filas con el fixture completo no se rompen.
 */
export type PriceEventDropRowFields = Pick<
  PriceEventDropDoc,
  | 'listingId'
  | 'vertical'
  | 'category'
  | 'productKey'
  | 'sellerKey'
  | 'sellerName'
  | 'title'
  | 'url'
  | 'currency'
  | 'price'
  | 'priorMin'
  | 'dropPct'
>

export interface PriceEventDropRow extends PriceEventDropRowFields {
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
 * análisis: así una categoría que gana o pierde página propia (equipar), o una vertical nueva que
 * todavía no tiene hub público, cambia acá sin tocar el job que escribió el dato.
 */
function priceEventInternalHref(
  doc: Pick<PriceEventDropRowFields, 'vertical' | 'category' | 'productKey'>
): string | null {
  if (doc.vertical === 'equipar' && doc.category && isEquiparCategorySlug(doc.category)) {
    return `/equipar-casa-uruguay/${doc.category}`
  }
  // Rebase C: /celulares-uruguay ya está publicado en esta rama. `productKey` para esta vertical es
  // `phone:<key>`, y `<key>` es literalmente `PhoneModel.slug` (classes/phones/identify.ts,
  // classes/phones/catalog.ts) — el mismo slug que arma la URL de la ficha en
  // celulares-uruguay/[modelo].vue, así que no hace falta ninguna traducción entre los dos.
  const phoneSlug = priceEventPhoneSlug(doc.productKey)
  if (doc.vertical === 'celulares' && phoneSlug) {
    return `/celulares-uruguay/${phoneSlug}`
  }
  if (doc.vertical === 'sillas') {
    return '/sillas-escritorio-uruguay'
  }
  // `sync_movilidad.ts` también graba `pricewatchoffers` (vertical `movilidad`) y el detector de
  // verticales lo suma solo; su `category` es la clave del registro (`classes/movilidad/registry.ts`),
  // y cada una tiene su página. Una categoría que no sea ninguna de las dos no enlaza adentro.
  const movilidadHref = doc.category ? PRICE_EVENT_MOVILIDAD_PAGES[doc.category] : undefined
  if (doc.vertical === 'movilidad' && movilidadHref) {
    return movilidadHref
  }
  return null
}

const PRICE_EVENT_MOVILIDAD_PAGES: Record<string, string> = {
  'monopatin-electrico': '/monopatines-electricos-uruguay',
  'bicicleta-electrica': '/bicicletas-electricas-uruguay',
}

export function priceEventDropRows(
  current: { topDrops: readonly PriceEventDropRowFields[] } | null
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
 * FAQ de la página. Abren las fechas de la edición vigente de Black Friday y de CyberLunes (del
 * calendario); después, dos preguntas explican la regla siempre, con o sin datos; la de
 * "desde cuándo" sólo aparece si el snapshot trae `trackingSince` (nunca se inventa una fecha). Sin
 * adjetivos: describe la regla y nunca acusa a una tienda puntual — ver el global constraint "Sin
 * acusaciones" del plan.
 *
 * F2 (revisión final, hallazgo 5): "el mínimo/máximo que esa misma oferta tuvo en los últimos 60
 * días" sonaba a que hay un dato por cada uno de esos 60 días — la regla real exige sólo 10 días de
 * datos DENTRO de esa ventana (`PRICE_EVENT_MIN_POINTS`, `classes/priceevents/types.ts`). Esta FAQ
 * alimenta el JSON-LD de la página (schema.org FAQPage), así que la precisión acá no es cosmética.
 */
export function priceEventFaq(
  current: Pick<PriceEventSnapshotResponse, 'trackingSince'> | null,
  calendar: readonly PriceEventCalendarEntry[] = PRICE_EVENT_CALENDAR
): PriceEventFaqItem[] {
  const faq: PriceEventFaqItem[] = []

  // Las fechas van primero: "cuándo es el black friday en uruguay 2026" y sus variantes son casi
  // todas las impresiones de la página en Search Console (20/9–17/10/2026). Salen del calendario,
  // nunca de un literal, así que la respuesta y el bloque "Cuándo es" no pueden contradecirse.
  const blackFriday = priceEventLatestEdition('black-friday-', calendar)
  if (blackFriday) {
    faq.push({
      id: 'ciberlunes-cuando-es-black-friday',
      question: `¿Cuándo es el ${blackFriday.label} en Uruguay?`,
      answer: [`${priceEventDayLabelLong(blackFriday.start)}.`, blackFriday.note]
        .filter(Boolean)
        .join(' '),
    })
  }
  const ciberlunes = priceEventLatestEdition('ciberlunes-', calendar)
  if (ciberlunes) {
    faq.push({
      id: 'ciberlunes-cuando-es-ciberlunes',
      question: `¿Cuándo es el ${ciberlunes.label}?`,
      answer: [
        `${priceEventRangeLabel(ciberlunes)}.`,
        ciberlunes.note,
        'Se hace dos veces por año, en junio y en noviembre.',
      ]
        .filter(Boolean)
        .join(' '),
    })
  }

  faq.push(
    {
      id: 'ciberlunes-que-es-baja-real',
      question: '¿Qué es una "baja real"?',
      answer:
        'Que el precio de hoy de esa oferta puntual está al menos 10 % por debajo del mínimo que ' +
        'registramos en los 60 días anteriores (con al menos 10 días de datos). La comparación es ' +
        'siempre contra el propio historial de la oferta, nunca contra otra tienda ni contra un precio ' +
        'de lista.',
    },
    {
      id: 'ciberlunes-que-es-tachado-por-encima',
      question: '¿Qué es un precio tachado por encima del historial?',
      answer:
        'Que el precio de lista (el que aparece tachado junto al precio con descuento) de hoy es al ' +
        'menos 10 % más alto que el máximo que registramos en los 60 días anteriores (con al menos 10 ' +
        'días de datos). Es una comparación contra lo que nosotros vimos, no una prueba de que ese ' +
        'precio anterior nunca existió: sólo relevamos las tiendas de nuestro directorio, desde la ' +
        'fecha que decimos abajo.',
    }
  )

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
      '/equipar-casa-uruguay, /sillas-escritorio-uruguay, /celulares-uruguay, ' +
      '/monopatines-electricos-uruguay y /bicicletas-electricas-uruguay. Una tienda fuera de ' +
      'esa lista puede tener una baja real o un precio tachado por encima de su historial y esta ' +
      'página no lo va a mostrar, simplemente porque no lo medimos.',
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
