// "Visto hoy en InfoCasas": la frescura del aviso donde se decide, debajo del precio, y no a doce
// pantallas de distancia en "Origen y vigencia".
//
// Medido el 8/11/2026 con la ventana visible del directorio (lastSeen de los últimos 10 días): el
// 22,7 % de las propiedades no se había vuelto a ver en dos días o más y el 11 % en cinco o más; en
// Facebook, el 43,8 % llevaba dos días o más. La cosecha de Marketplace es una MUESTRA por diseño,
// así que no volver a ver un aviso no prueba que se haya ido: el texto de 2 a 4 días dice lo que
// sabemos ("no lo volvimos a ver") y sólo desde los 5 días avisa que puede que ya no esté.
//
// Los días se cuentan en UTC, el mismo calendario con el que la cosecha escribe `lastSeen`
// (`new Date().toISOString().slice(0, 10)` en sync_rentals.ts), y contra el instante del render
// (`renderedAt`), así el servidor y el navegador escriben el mismo texto.

export type RentalSeenTone = 'fresh' | 'quiet' | 'warning'

export interface RentalSeenLabel {
  /** Días completos desde la última lectura; 0 = hoy. */
  days: number
  tone: RentalSeenTone
  /** La clave del texto largo (tarjeta de decisión) y la del corto (barra del teléfono). */
  key: 'seenToday' | 'seenYesterday' | 'seenQuiet' | 'seenStale'
  shortKey: 'seenTodayShort' | 'seenYesterdayShort' | 'seenDaysShort'
}

/** Desde cuántos días el texto pasa a advertir que el aviso puede ya no estar. */
export const RENTAL_SEEN_WARNING_DAYS = 5

const DAY_MS = 86_400_000

export function rentalSeenLabel(
  lastSeen: string | null | undefined,
  renderedAt: number | Date
): RentalSeenLabel | null {
  if (typeof lastSeen !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(lastSeen)) return null
  const seen = Date.parse(`${lastSeen.slice(0, 10)}T00:00:00Z`)
  const now = typeof renderedAt === 'number' ? renderedAt : renderedAt.getTime()
  if (!Number.isFinite(seen) || !Number.isFinite(now)) return null
  const today = Date.parse(`${new Date(now).toISOString().slice(0, 10)}T00:00:00Z`)
  // Un reloj atrasado no convierte "hoy" en "mañana".
  const days = Math.max(0, Math.round((today - seen) / DAY_MS))
  if (days === 0) return { days, tone: 'fresh', key: 'seenToday', shortKey: 'seenTodayShort' }
  if (days === 1)
    return { days, tone: 'fresh', key: 'seenYesterday', shortKey: 'seenYesterdayShort' }
  if (days < RENTAL_SEEN_WARNING_DAYS)
    return { days, tone: 'quiet', key: 'seenQuiet', shortKey: 'seenDaysShort' }
  return { days, tone: 'warning', key: 'seenStale', shortKey: 'seenDaysShort' }
}
