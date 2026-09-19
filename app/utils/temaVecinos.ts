/**
 * "Más sobre este tema": cada página que pertenece a un tema lleva al tema y a las demás páginas y
 * términos del mismo tema, en los dos sentidos.
 *
 * Medido en producción el 2026-09-19 (enlaces del contenido, sin el menú): de las páginas de un
 * mismo grupo se enlazaban entre sí el 23 % en venta de vivienda, el 24 % en dólar, el 30 % entre
 * las evoluciones de precio, el 38 % en alquiler y el 58 % en autos. Los temas de `/temas` no
 * enlazaban ninguna página de datos de autos (0 de 8) ni de venta de vivienda (0 de 5), ninguna
 * página de datos enlazaba de vuelta a su tema, y ningún término del glosario enlazaba a un tema.
 *
 * La pertenencia sale de UN lugar, `utils/guideHubs.ts`: una página es del tema si figura en sus
 * `resources`, si es una de sus guías (`guideSlugs`) o si es uno de sus términos (`terms`). Como el
 * bloque de cada miembro lista a los demás miembros, el vínculo es recíproco por construcción, y
 * sumar una página a un tema la conecta con todo el tema sin tocar ninguna otra página.
 *
 * Módulo puro: lo dibuja `components/TemaVecinos.vue` desde el layout, y "Seguí leyendo" no repite
 * lo que este bloque ya mostró.
 *
 * Lee `temaIndex.json`, NO `guideHubs.ts`: el bloque vive en el layout, así que todo lo que importe
 * viaja en el JavaScript de cada página, y `guideHubs` arrastra las 145 guías completas (~140 KB
 * sólo `guides.ts`) y el glosario sus definiciones (~64 KB). El índice guarda sólo rutas, etiquetas,
 * slugs y nombres; lo genera y lo vigila `tests/unit/temaIndex.test.ts` (regenerar con
 * `npx vitest run tests/unit/temaIndex.test.ts -u` después de editar un tema o el glosario).
 */
import { navEntryForPath } from './directorioAnalisis'
import { DIRECTORIOS } from './directorios'
import { normalizeRelatedPath } from './relatedPages'
import TEMA_INDEX from './temaIndex.json'

/** Un tema del índice: lo mínimo que el bloque necesita de `utils/guideHubs.ts`. */
export interface TemaIndexHub {
  readonly slug: string
  readonly title: string
  readonly icon: string
  readonly resources: readonly { readonly to: string; readonly label: string }[]
  readonly guides: readonly string[]
  readonly terms: readonly { readonly slug: string; readonly term: string }[]
}

export const TEMA_HUBS: readonly TemaIndexHub[] = (TEMA_INDEX as { hubs: TemaIndexHub[] }).hubs

/** Una página puede ser de varios temas (una evolución es de su mercado y de "economía"). */
export const TEMA_VECINOS_MAX_GRUPOS = 2
/**
 * Tope de páginas por tema. Tiene que alcanzar para el tema más grande menos la propia página: si
 * recortara, el vínculo dejaría de ser recíproco (el test lo exige).
 */
export const TEMA_VECINOS_MAX_LINKS = 24
/**
 * Los términos son un complemento, y en el orden del tema van primero los más usados. Con 12, una
 * página en dos temas llegaba a 53 enlaces (`/historico`: 29 páginas + 24 términos); las páginas no
 * se recortan porque son las que hacen recíproco el vínculo.
 */
export const TEMA_VECINOS_MAX_TERMS = 8

export interface TemaVecinoLink {
  readonly to: string
  /** Etiqueta del menú (trilingüe) cuando la página está en el menú. */
  readonly labelKey: string | null
  /** Etiqueta escrita en el tema, para las páginas que no están en el menú. */
  readonly label: string
}

export interface TemaVecinoTerm {
  readonly slug: string
  readonly term: string
}

export interface TemaVecinoGrupo {
  readonly hub: { readonly slug: string; readonly title: string; readonly icon: string }
  readonly links: readonly TemaVecinoLink[]
  readonly terms: readonly TemaVecinoTerm[]
}

/** Los directorios de cuyos datos sale `route` (como directorio, página `tambien` o análisis). */
function directoriosDe(route: string): string[] {
  return DIRECTORIOS.filter(
    entry =>
      entry.to === route ||
      (entry.tambien ?? []).some(link => link.to === route) ||
      (entry.analisis ?? []).includes(route)
  ).map(entry => entry.to)
}

/**
 * Los temas de los que `route` es parte: recurso, guía o término. Primero el tema donde está el
 * directorio del que salen sus datos: la evolución del alquiler es de "Alquilar" antes que de
 * "Economía y mercado", aunque "Economía" venga antes en `guideHubs.ts`.
 */
export function temasDeRuta(route: string): TemaIndexHub[] {
  const clean = normalizeRelatedPath(route)
  const sources = directoriosDe(clean)
  const own = (hub: TemaIndexHub) =>
    Number(hub.resources.some(resource => sources.includes(resource.to)))
  return TEMA_HUBS.filter(
    hub =>
      hub.resources.some(resource => resource.to === clean) ||
      hub.guides.some(slug => `/guias/${slug}` === clean) ||
      hub.terms.some(term => `/glosario/${term.slug}` === clean)
  ).sort((a, b) => own(b) - own(a))
}

/**
 * Los grupos a mostrar en `path`, o `[]` si la página no pertenece a ningún tema (o si es el propio
 * tema, que ya lista todo). `exclude` son rutas que otro bloque de la misma página ya mostró.
 */
export function temaVecinosParaRuta(
  path: string,
  exclude: readonly string[] = []
): TemaVecinoGrupo[] {
  const route = normalizeRelatedPath(path)
  if (route === '/temas' || route.startsWith('/temas/')) return []
  const seen = new Set<string>([route, ...exclude])
  const grupos: TemaVecinoGrupo[] = []
  for (const hub of temasDeRuta(route).slice(0, TEMA_VECINOS_MAX_GRUPOS)) {
    // El orden es el del tema (editorial, en utils/guideHubs.ts), no "datos primero": con esa regla,
    // en autos usados salían monopatines y bicicletas antes que "comprar un auto con deuda".
    const links: TemaVecinoLink[] = []
    for (const resource of hub.resources) {
      if (seen.has(resource.to) || links.length >= TEMA_VECINOS_MAX_LINKS) continue
      seen.add(resource.to)
      links.push({
        to: resource.to,
        labelKey: navEntryForPath(resource.to)?.labelKey ?? null,
        label: resource.label,
      })
    }
    const terms: TemaVecinoTerm[] = []
    for (const term of hub.terms) {
      const to = `/glosario/${term.slug}`
      if (seen.has(to) || terms.length >= TEMA_VECINOS_MAX_TERMS) continue
      seen.add(to)
      terms.push(term)
    }
    grupos.push({ hub: { slug: hub.slug, title: hub.title, icon: hub.icon }, links, terms })
  }
  return grupos
}

/** Todas las rutas que el bloque muestra en `path`, para que "Seguí leyendo" no las repita. */
export function temaVecinosRutas(path: string, exclude: readonly string[] = []): string[] {
  return temaVecinosParaRuta(path, exclude).flatMap(grupo => [
    `/temas/${grupo.hub.slug}`,
    ...grupo.links.map(link => link.to),
    ...grupo.terms.map(term => `/glosario/${term.slug}`),
  ])
}
