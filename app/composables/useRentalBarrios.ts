/**
 * Las páginas de precio de alquiler por barrio que se pueden indexar (`/api/rentals/barrios`).
 *
 * La usan el hub `/barrios-alquileres-uruguay` y cada ficha de alquiler: una sola clave y un solo
 * handler, así Nuxt comparte la petición y no avisa de opciones incompatibles. Se renderiza en el
 * servidor (el enlazado es para los buscadores) pero no bloquea una navegación del cliente. Si
 * falla, devuelve la lista vacía: los enlaces desaparecen y la página sigue igual.
 */
import type { RentalBarrioSummary } from '~/utils/rentalBarrio'

export type RentalBarrioListItem = Pick<
  RentalBarrioSummary,
  'department' | 'neighborhood' | 'path' | 'listings'
>
interface RentalBarrioList {
  barrios: RentalBarrioListItem[]
}

export function useRentalBarrios() {
  return useAsyncData<RentalBarrioList>(
    'rental-barrios',
    () =>
      $fetch<RentalBarrioList>('/api/rentals/barrios').catch(() => ({
        barrios: [] as RentalBarrioListItem[],
      })),
    { default: () => ({ barrios: [] }), lazy: true }
  )
}
