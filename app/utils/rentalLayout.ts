/**
 * Cómo se dibuja la lista de alquileres: mosaico (tarjetas en columnas) o filas
 * horizontales. Es preferencia del visitante y NO viaja en la URL: la misma
 * búsqueda tiene que seguir siendo una sola dirección indexable.
 */
export type RentalLayout = 'mosaico' | 'lista'

export const RENTAL_LAYOUT_STORAGE_KEY = 'cu_rentals_layout'

/** El servidor y la primera pintura usan mosaico; lo guardado se aplica al montar. */
export const DEFAULT_RENTAL_LAYOUT: RentalLayout = 'mosaico'

export function normalizeRentalLayout(value: unknown): RentalLayout {
  return value === 'lista' ? 'lista' : DEFAULT_RENTAL_LAYOUT
}

export function readRentalLayout(): RentalLayout {
  if (typeof window === 'undefined') return DEFAULT_RENTAL_LAYOUT
  try {
    return normalizeRentalLayout(window.localStorage.getItem(RENTAL_LAYOUT_STORAGE_KEY))
  } catch {
    // Modo privado o almacenamiento bloqueado: la preferencia se pierde, la página no.
    return DEFAULT_RENTAL_LAYOUT
  }
}

export function writeRentalLayout(layout: RentalLayout): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(RENTAL_LAYOUT_STORAGE_KEY, layout)
  } catch {
    /* nada que hacer: la vista ya cambió en pantalla */
  }
}
