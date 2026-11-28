// Cuánto hace que el sitio funciona, probado con un tercero que no controlamos: Internet Archive.
//
// Para quien duda de usar el sitio, "funcionamos desde 2022" escrito por nosotros no prueba nada.
// La Wayback Machine sí: guarda copias fechadas de las páginas y cualquiera las puede abrir. Acá
// vive lo que se le muestra al lector (la sección «Desde cuándo funcionamos» de /acerca y la
// pastilla de la barra de confianza de la portada).
//
// LOS DATOS SON FIJOS Y FECHADOS, NO SE CONSULTAN EN CADA PEDIDO. La API de la Wayback contesta
// lento y a veces con una página HTML de "Temporarily Offline" en vez de JSON (ver
// classes/stores/signals/age.ts), y una página que espera al archivo para dibujarse se cae con él.
// Lo único que cambia con el tiempo se calcula: cuánto pasó desde la primera captura.
//
// Cómo se relevó (2026-11-28), por si hay que rehacerlo:
//   • Primera captura del dominio entero, con cualquier código:
//     https://web.archive.org/cdx/search/cdx?url=cambio-uruguay.com&matchType=domain&limit=1
//   • Capturas de la portada con respuesta 200 (una por año sale de acá):
//     https://web.archive.org/cdx/search/cdx?url=cambio-uruguay.com/&filter=statuscode:200
//   • El texto de cada nota se leyó del HTML archivado (`/web/<timestamp>id_/<url>`), no de la
//     copia que dibuja la Wayback, que reescribe enlaces y agrega su barra.
// El primer commit del repositorio es del 2022-12-30: tres días DESPUÉS de la primera captura,
// porque el sitio se publicó antes de subir el código. La fecha que se publica es la del archivo.

export const ARCHIVE_SITE = 'cambio-uruguay.com'

/** Día en que se consultó el archivo; las cifras de abajo son de ese día. */
export const ARCHIVE_CHECKED_ON = '2026-11-28'

/** La copia más vieja que Internet Archive tiene de cualquier página del dominio. */
export const ARCHIVE_FIRST_CAPTURE = '20221227222132'

/**
 * Capturas con respuesta 200 de todo el dominio al día de `ARCHIVE_CHECKED_ON` (298). Se publica
 * con su fecha: el número sólo crece, así que viejo nunca exagera.
 */
export const ARCHIVE_CAPTURE_COUNT = 298

export interface ArchiveSnapshot {
  /** `YYYYMMDDhhmmss`, en UTC, como lo escribe la Wayback. */
  timestamp: string
  /** La URL archivada, exactamente como figura en el índice (con o sin `www`). */
  url: string
  /** Qué se ve en esa copia: lo que el lector puede comprobar al abrirla. */
  note: string
}

/** Una copia de la portada por año, de la más vieja a la más nueva. */
export const ARCHIVE_SNAPSHOTS: readonly ArchiveSnapshot[] = [
  {
    timestamp: '20221227222132',
    url: 'https://cambio-uruguay.com/',
    note: 'La primera copia guardada. El sitio ya comparaba cotizaciones: «más de 10 casas de cambio».',
  },
  {
    timestamp: '20230102180118',
    url: 'https://cambio-uruguay.com/',
    note: 'Una semana después ya decía «más de 40 casas de cambio».',
  },
  {
    timestamp: '20240619001649',
    url: 'https://cambio-uruguay.com/',
    note: 'A mitad de año, el mismo comparador de más de 40 casas de cambio.',
  },
  {
    timestamp: '20250201003829',
    url: 'https://cambio-uruguay.com/',
    note: 'El comparador, en su tercer año, con dólares, pesos argentinos y reales.',
  },
  {
    timestamp: '20261010233934',
    url: 'https://cambio-uruguay.com/',
    note: 'La portada actual: 43 casas de cambio comparadas, con datos del BCU.',
  },
]

/** `20221227222132` → `2022-12-27` (el día en UTC, como lo guarda el archivo). */
export function waybackDate(timestamp: string): string {
  return `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`
}

/** La copia archivada tal como la dibuja la Wayback Machine. */
export function waybackSnapshotUrl(timestamp: string, url: string): string {
  return `https://web.archive.org/web/${timestamp}/${url}`
}

/** El calendario con todas las capturas del sitio, desde la primera. */
export function waybackCalendarUrl(): string {
  return `https://web.archive.org/web/*/${ARCHIVE_SITE}`
}

export interface TimeOnline {
  years: number
  months: number
}

/** El día de calendario de `nowMs` en Uruguay: el aniversario cae el mismo día para todos. */
function uruguayDay(nowMs: number): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Montevideo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date(nowMs))
  const get = (type: string): number => Number(parts.find(p => p.type === type)?.value)
  return { y: get('year'), m: get('month'), d: get('day') }
}

/**
 * Años y meses de calendario COMPLETOS entre `sinceIso` (`YYYY-MM-DD`) y `nowMs`. Un mes cuenta
 * recién el mismo día del mes: el 26/12/2026 todavía son 3 años y 11 meses desde el 27/12/2022.
 */
export function timeOnline(sinceIso: string, nowMs: number): TimeOnline {
  const [sy, sm, sd] = sinceIso.split('-').map(Number) as [number, number, number]
  const now = uruguayDay(nowMs)
  let total = (now.y - sy) * 12 + (now.m - sm)
  if (now.d < sd) total -= 1
  if (total < 0) total = 0
  return { years: Math.floor(total / 12), months: total % 12 }
}

/**
 * «3 años y 11 meses», «3 years and 11 months»: el plural y la conjunción los pone ICU, así sirve
 * para los 38 idiomas sin una clave de traducción por idioma. El día del aniversario no escribe
 * «0 meses». Un código que Intl no acepta cae al castellano en vez de romper la página.
 */
export function formatTimeOnline({ years, months }: TimeOnline, locale: string): string {
  const build = (tag: string): string => {
    const unit = (value: number, name: 'year' | 'month'): string =>
      new Intl.NumberFormat(tag, { style: 'unit', unit: name, unitDisplay: 'long' }).format(value)
    const parts: string[] = []
    if (years > 0 || months === 0) parts.push(unit(years, 'year'))
    if (months > 0) parts.push(unit(months, 'month'))
    return new Intl.ListFormat(tag, { style: 'long', type: 'conjunction' }).format(parts)
  }
  try {
    return build(locale)
  } catch {
    return build('es')
  }
}
