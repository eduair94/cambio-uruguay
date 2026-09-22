// app/utils/affiliates.ts
// Registro de enlaces de afiliado: qué socios existen, cómo se presentan y qué se le dice al lector.
//
// La URL de afiliado NO vive acá. Este repo es público y un enlace de afiliado con el id de la
// cuenta adentro es una credencial a medias: cualquiera puede copiarlo y cobrar por nuestras
// referencias. La URL real llega por runtimeConfig (`public.affiliates.<id>`, env
// `NUXT_PUBLIC_AFFILIATES_<ID>`), y `fallbackUrl` queda VACÍO a propósito en todos los socios:
// sin URL configurada el componente no dibuja nada, ni siquiera un enlace orgánico, porque un
// bloque "recomendado" sin acuerdo detrás es una recomendación que nadie firmó.
//
// Reglas (las mismas de /publicidad, que las publica):
//   - Un enlace de afiliado nunca cambia un ranking ni el texto de una guía. La guía dice lo que
//     dice con o sin el enlace; el enlace se agrega debajo, con su aviso al lado.
//   - Siempre `rel="sponsored"`, siempre con el aviso visible (`AffiliateDisclosure`), nunca
//     escondido detrás de un desplegable.
//   - Sólo socios que la guía ya nombra por su nombre y compara con tarifas públicas.
//
// Módulo PURO (sin Vue/Nuxt): la resolución de runtimeConfig la hace `composables/useAffiliates.ts`.

import { hostnameOf, withUtm } from './outboundUtm'

export interface Affiliate {
  /** Identificador estable, en kebab-case. Es el id de campaña en la URL saliente. */
  id: string
  /** Nombre público del socio, tal como aparece en la guía. */
  partner: string
  /** Texto del enlace. Dice qué se abre, no "hacé clic acá". */
  label: string
  /** Qué gana el sitio si el lector abre una cuenta, en una línea y en primera persona del plural. */
  disclosure: string
  /**
   * URL cuando runtimeConfig no trae ninguna. VACÍA en todos los socios (ver arriba): el enlace
   * sólo existe con un acuerdo configurado en el entorno del build.
   */
  fallbackUrl: string
  /** Rutas del sitio donde este enlace puede aparecer (sin locale). */
  pages: readonly string[]
}

export const AFFILIATES: readonly Affiliate[] = Object.freeze([
  {
    id: 'payoneer',
    partner: 'Payoneer',
    label: 'Abrir una cuenta en Payoneer',
    disclosure:
      'Si abrís la cuenta desde este enlace, Payoneer puede pagarnos una comisión. No cambia lo que pagás ni lo que dice la guía.',
    fallbackUrl: '',
    pages: ['/guias/enviar-recibir-dinero-exterior'],
  },
  {
    id: 'wise',
    partner: 'Wise',
    label: 'Abrir una cuenta en Wise',
    disclosure:
      'Si abrís la cuenta desde este enlace, Wise puede pagarnos una comisión. No cambia lo que pagás ni lo que dice la guía.',
    fallbackUrl: '',
    pages: ['/guias/enviar-recibir-dinero-exterior'],
  },
  {
    id: 'seguro-viaje',
    partner: 'Seguro de viaje',
    label: 'Cotizar un seguro de viaje',
    disclosure:
      'Si contratás desde este enlace, la aseguradora puede pagarnos una comisión. No cambia el precio que te cotiza.',
    fallbackUrl: '',
    pages: ['/guias/dolares-para-viajar'],
  },
])

export function getAffiliate(id: string): Affiliate | undefined {
  return AFFILIATES.find(a => a.id === id)
}

/** Los afiliados que pueden aparecer en una ruta, en el orden del registro. */
export function affiliatesFor(page: string): Affiliate[] {
  return AFFILIATES.filter(a => a.pages.includes(page))
}

/**
 * `seguro-viaje` → `seguroViaje`: la clave de `runtimeConfig.public.affiliates` que Nuxt llena
 * desde `NUXT_PUBLIC_AFFILIATES_SEGURO_VIAJE`. Nuxt mapea la env a camelCase, así que el id en
 * kebab-case y la clave de config no coinciden letra a letra y hay que traducir.
 */
export function affiliateConfigKey(id: string): string {
  return id.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

/** La URL base del afiliado: la de runtimeConfig si hay, si no la de respaldo, si no `''`. */
export function resolveAffiliateUrl(
  id: string,
  overrides: Readonly<Record<string, unknown>> = {}
): string {
  const affiliate = getAffiliate(id)
  if (!affiliate) return ''
  const override = overrides[affiliateConfigKey(id)]
  const base = typeof override === 'string' && override.trim() ? override : affiliate.fallbackUrl
  return base.trim()
}

/** La URL saliente con atribución. `''` si no hay base o no es http(s). */
export function buildAffiliateUrl(base: string, id: string, content?: string): string {
  return withUtm(base, { medium: 'affiliate', campaign: id, content })
}

export interface AffiliateLinkModel {
  id: string
  partner: string
  label: string
  disclosure: string
  href: string
  host: string
}

/**
 * Lo que el componente dibuja, o `null` cuando no hay nada que dibujar. Decide en un solo lugar
 * las tres condiciones: el id existe, hay URL configurada y la URL es un destino http(s) real.
 */
export function affiliateLink(
  id: string,
  overrides: Readonly<Record<string, unknown>> = {},
  content?: string
): AffiliateLinkModel | null {
  const affiliate = getAffiliate(id)
  if (!affiliate) return null
  const href = buildAffiliateUrl(resolveAffiliateUrl(id, overrides), id, content)
  const host = hostnameOf(href)
  if (!href || !host) return null
  return {
    id: affiliate.id,
    partner: affiliate.partner,
    label: affiliate.label,
    disclosure: affiliate.disclosure,
    href,
    host,
  }
}
