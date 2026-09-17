/**
 * Task 10: qué vendedores mostrados en /sillas-escritorio-uruguay y /equipar-casa-uruguay tienen
 * ficha propia en /tiendas-online-uruguay/<key>. La ficha 404s de verdad para una clave curada sin
 * documento (ver server/api/stores/[slug].get.ts), así que un nombre de vendedor sólo se enlaza
 * cuando su clave está en esta lista — de lo contrario queda como texto plano, igual que hoy.
 *
 * Comparte UNA sola petición entre ambas páginas bajo su PROPIA clave de `useFetch`
 * (`store-profile-keys`), nunca la del hub (`tiendas-online-index`) ni la de una ficha individual
 * (`store-<key>`): Nuxt cachea el payload por clave, así que reusar una de esas con un `transform`
 * distinto serviría la forma equivocada a quien la pidió primero. La lista es corta (una clave por
 * tienda curada con ficha, nunca el documento entero), así que el payload SSR que viaja es chico.
 */
import type { StoresIndexResponse } from '~/server/api/stores/index.get'

/** Pure a propósito: se puede probar sin runtime de Nuxt (tests/unit corre en node, sin `useFetch`). */
export function storeProfileKeysFromResponse(
  response: StoresIndexResponse | null | undefined
): string[] {
  return (response?.stores ?? []).filter(store => store.hasProfile).map(store => store.key)
}

export function useStoreProfileKeys() {
  const { data } = useFetch('/api/stores', {
    key: 'store-profile-keys',
    transform: (response: StoresIndexResponse) => storeProfileKeysFromResponse(response),
    default: () => [] as string[],
  })
  return data
}
