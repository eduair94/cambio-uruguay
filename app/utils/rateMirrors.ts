// app/utils/rateMirrors.ts
// Qué casas NO publican pizarra propia, sino la de otra institución.
//
// POR QUÉ EXISTE: tres scrapers del backend (`classes/cambios/cambio_romantico.ts`,
// `cambio_federal.ts`, `cambio_argentino.ts`) no leen el sitio de la casa: leen las filas de BROU
// del día en la base y las devuelven verbatim, filtrando eBROU. O sea que la cotización de esas
// tres casas es, byte a byte, la de BROU.
//
// LOS DOS PROBLEMAS QUE ESO CAUSA, y que este módulo existe para resolver:
//
//   1. SEO. Cualquier estadística derivada que publiquemos para un espejo —máximo del período,
//      racha, mayor salto diario— sale idéntica a la de BROU. Publicar cuatro páginas con los
//      mismos números es exactamente la señal de contenido duplicado que deja páginas en
//      «Rastreada: actualmente sin indexar». El plan de crecimiento orgánico lo anotó como P2.3.
//
//   2. Honestidad. Alguien que compara casas y ve la misma cifra en cuatro no está viendo un
//      empate de mercado: está viendo una pizarra sola, repetida. Decírselo es información útil
//      que ninguna de las cuatro páginas da hoy.
//
// POR QUÉ NO SE CANONICALIZA LA PÁGINA ENTERA A BROU, que era la letra del plan: la consulta
// «cambio romántico» es navegacional y su respuesta correcta es la página de esa casa, no la de
// BROU. Un canonical la borraría del índice para su propia marca. Lo que hay que eliminar es el
// bloque DUPLICADO, no la página: acá se suprimen las estadísticas derivadas y en su lugar se
// publica el hecho —que replica la pizarra de BROU—, que es contenido único de esa URL y además
// verdadero.
//
// SI SE AGREGA UN ESPEJO NUEVO: agregarlo acá y en ningún otro lado. La lista se testea contra
// los scrapers reales en `app/tests/unit/rateMirrors.test.ts`.

/** Origen que replica la pizarra de otro, y a quién replica. */
export interface RateMirror {
  /** Slug de la casa que replica. */
  origin: string
  /** Slug de la casa cuya pizarra publica. */
  source: string
  /** Nombre legible de la fuente, para la frase que ve el lector. */
  sourceName: string
  /** Filas que el scraper descarta de la fuente, si descarta alguna. */
  excludes?: readonly string[]
}

/**
 * Las tres casas que publican la pizarra de BROU. Verificado leyendo los scrapers: los tres hacen
 * `db.allEntries({ origin: "brou", date })` y devuelven esas filas.
 */
export const RATE_MIRRORS: readonly RateMirror[] = Object.freeze([
  {
    origin: 'cambio_romantico',
    source: 'brou',
    sourceName: 'BROU',
    excludes: ['EBROU'],
  },
  {
    origin: 'cambio_federal',
    source: 'brou',
    sourceName: 'BROU',
    excludes: ['EBROU'],
  },
  {
    origin: 'cambio_argentino',
    source: 'brou',
    sourceName: 'BROU',
    excludes: ['EBROU'],
  },
])

/** `undefined` cuando la casa publica pizarra propia, que es el caso de las 40 y pico restantes. */
export function mirrorOf(origin: string | null | undefined): RateMirror | undefined {
  if (!origin) return undefined
  const key = origin.trim().toLowerCase()
  return RATE_MIRRORS.find(m => m.origin === key)
}

/** Atajo para las guardas de render. */
export function isRateMirror(origin: string | null | undefined): boolean {
  return mirrorOf(origin) !== undefined
}

/**
 * Estadística derivada = máximo, mínimo, racha, mayor salto. En un espejo son las de la fuente y
 * publicarlas duplica cuatro páginas; en el resto son propias de la casa y son justamente el
 * contenido que hace única a cada URL.
 */
export function publishesOwnStats(origin: string | null | undefined): boolean {
  return !isRateMirror(origin)
}

/** La ruta del hub de la casa cuya pizarra se replica, para enlazarla desde el aviso. */
export function mirrorSourcePath(mirror: RateMirror): string {
  return `/casa/${mirror.source}`
}
