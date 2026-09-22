// app/utils/sponsorships.ts
// Patrocinios: la fila patrocinada de la home y, más adelante, la tarjeta patrocinada de un
// prestamista o una garantía. Qué se vende y bajo qué condiciones lo publica /publicidad.
//
// El modelo copia al de los anuncios manuales (`useAds` + `AdSlot`): la pieza existe en el código
// desde ya, pero NO dibuja nada hasta que runtimeConfig (`public.sponsorships.homeRow`, env
// `NUXT_PUBLIC_SPONSORSHIPS_HOME_ROW`) nombre a un patrocinador de este registro. Sin id, el DOM
// de la home es byte a byte el mismo que hoy. Con un id que no está acá, tampoco: un patrocinio
// se firma con su copia y su URL revisadas en un commit, no con una variable de entorno suelta.
//
// La regla que no se negocia, y que /acerca publica desde 2026-06: "el orden lo determina siempre
// el precio". La fila patrocinada es un bloque APARTE del ranking, con la etiqueta "Publicidad",
// `rel="sponsored"` y el host del destino a la vista. Nunca entra a `topExchanges`, nunca lo
// reordena y nunca cambia un puntaje. `tests/unit/sponsoredCasaRow.test.ts` lo vigila.
//
// Módulo PURO (sin Vue/Nuxt): la lectura de runtimeConfig la hace `composables/useSponsorships.ts`.

import { hostnameOf, withUtm } from './outboundUtm'

export interface Sponsorship {
  /** Identificador estable, en kebab-case. Es el id de campaña en la URL saliente. */
  id: string
  /** Nombre público del patrocinador. */
  name: string
  /** Una línea: qué ofrece. La escribe el patrocinador y se publica tal cual, como publicidad. */
  tagline: string
  /** Destino https, sin utm (se agregan al armar el enlace). */
  url: string
  /**
   * La clave de la casa en el directorio (`origins.ts`), cuando el patrocinador es una casa de
   * cambio que el sitio ya lista. Sirve para enlazar también su ficha propia (/casa/<origin>),
   * donde el lector ve la cotización real al lado del anuncio.
   */
  origin?: string
}

/** Vacío hasta que haya un patrocinio firmado. Cada entrada entra por commit, con fecha. */
export const SPONSORSHIPS: readonly Sponsorship[] = Object.freeze([])

export type SponsorshipPlacement = 'home-after-rates'

export function getSponsorship(id: string, registry: readonly Sponsorship[] = SPONSORSHIPS) {
  return registry.find(s => s.id === id)
}

export interface SponsoredRowModel {
  id: string
  name: string
  tagline: string
  href: string
  host: string
  origin?: string
}

/**
 * Lo que la fila dibuja, o `null` si no hay nada que dibujar: id vacío, id que no está en el
 * registro, o URL que no es un destino http(s). Un solo lugar para las tres condiciones, así el
 * componente es `v-if="row"` y nada más.
 */
export function resolveSponsoredRow(
  configuredId: unknown,
  placement: SponsorshipPlacement,
  registry: readonly Sponsorship[] = SPONSORSHIPS
): SponsoredRowModel | null {
  const id = typeof configuredId === 'string' ? configuredId.trim() : ''
  if (!id) return null
  const sponsor = getSponsorship(id, registry)
  if (!sponsor) return null
  const href = withUtm(sponsor.url, {
    medium: 'sponsored',
    campaign: sponsor.id,
    content: placement,
  })
  const host = hostnameOf(href)
  if (!href || !host) return null
  return {
    id: sponsor.id,
    name: sponsor.name,
    tagline: sponsor.tagline,
    href,
    host,
    ...(sponsor.origin ? { origin: sponsor.origin } : {}),
  }
}
