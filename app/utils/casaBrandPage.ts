// La página de MARCA de cada casa: la URL que tiene que contestar «cambio principal», «cotización
// brou», «cambio fénix» — la consulta que trae sólo el nombre.
//
// POR QUÉ EXISTE. Cada casa tenía cuatro familias de páginas que se presentaban como la de su marca:
// `/historico/<casa>` («Cambio Principal: todas las monedas, cotización y histórico»),
// `/casa/<casa>` («Cambio Principal: cotización dólar hoy, sucursales y opiniones»),
// `/historico/<casa>/<moneda>` («Cambio Principal Real hoy: …») y `/sucursales/<casa>/<depto>`. Las
// cuatro abrían la descripción con la misma frase («Dólar en Cambio Principal hoy: compra …») y las
// tres de arriba ponían la marca primero en el título. Google no tenía cómo elegir, y no eligió:
// Search Console 20/9–17/10/2026, la consulta «cambio principal» sola aparece con doce URLs propias
// de más de 30 impresiones, todas entre la posición 4 y la 10, y ninguna llega al podio. La curva
// de CTR del propio sitio paga el clic hasta la cuarta posición; de la quinta para abajo, casi nada.
//
// POR QUÉ ESTA Y NO `/casa/<casa>`. El sitio la había diseñado al revés: desde agosto de 2026 todos
// los enlaces internos con el nombre de una casa —la portada, la comparativa, la pizarra, las
// fichas de sucursal— apuntan a `/casa/<casa>`, y las otras familias le mandaban un enlace de
// «todo sobre X». Dos meses después Google sigue eligiendo la otra. Consultas de marca sola,
// 90 días al 17/10/2026: `/historico/<casa>` 28.090 impresiones, 184 clics, posición media 6,8;
// `/casa/<casa>` 8.723 impresiones, 33 clics, posición 8,5. Por casa, `/historico/<casa>` es la
// página que más impresiones de su marca junta en 12 a 15 casas; `/casa/<casa>`, en 2 a 4. Cuando
// el buscador ya decidió durante dos meses, la señal coherente es acompañarlo, no pelearle.
//
// LAS DOS SON LA MISMA PÁGINA. Lo que ocupa las dos es la pizarra de HOY de la casa, moneda por
// moneda. `/historico/<casa>` no tiene ningún histórico (la serie vive en
// `/historico/<casa>/<moneda>`); `/casa/<casa>` agrega récords y departamentos alrededor de la misma
// tabla. Es contenido duplicado de verdad, así que la ficha declara canónica a la página de marca
// (`casa/[origin]/index.vue`) y sale del sitemap. La ficha sigue existiendo y sirviendo a quien
// llega desde la portada: la canónica no borra nada, sólo dice a quién atribuirle la señal.
//
// LAS DEMÁS DICEN SU INTENCIÓN. «Dólar en BROU hoy» es la página del dólar, «Sucursales de Gales en
// Montevideo» la de sucursales, «Teléfonos de Cambio Principal» la del teléfono. Ninguna se borra:
// todas tienen consultas propias. Lo que cambia es que ya no se presentan como la de la marca y
// que enlazan a la de la marca con el nombre de la casa como ancla.
//
// PURE (sin Vue, sin Nuxt) para que las plantillas, el sitemap y los tests compartan exactamente la
// misma definición.

/** La ruta (sin prefijo de idioma) de la página de marca de una casa. */
export function casaBrandPath(origin: string): string {
  return `/historico/${origin}`
}

/**
 * A dónde mandar la marca de una casa HOY: su página de marca si publica cotizaciones, y si no su
 * ficha `/casa/<casa>`.
 *
 * La excepción no es teórica. `/historico/<casa>` responde 404 cuando el tablero del día trae otras
 * casas y ninguna fila de ésta (ver `historico/[origin]/index.vue`), y una casa con el scraper caído
 * queda exactamente así: el 19/10/2026 `localData` tenía 46 casas y el tablero 45 (faltaba
 * `cambio_minas`). La ficha existe para toda casa de `localData`. Así que la canónica de la ficha
 * y cada enlace con el nombre de la casa pasan por acá: una canónica o un enlace que apuntan a un
 * 404 son peores que ninguno.
 */
export function casaHubPath(origin: string, quotesToday: boolean): string {
  return quotesToday ? casaBrandPath(origin) : `/casa/${origin}`
}

/**
 * Orden de la tabla de la página de marca: el dólar primero.
 *
 * Quien busca «cotización brou» quiere el dólar, y la tabla venía ordenada alfabéticamente por
 * código: ARS, BRL, EUR… y el dólar al final. Después del dólar van las monedas en el orden en que
 * se leen en una pizarra, y el resto alfabético.
 */
const BRAND_TABLE_ORDER = ['USD', 'EUR', 'BRL', 'ARS']

/** Comparador de códigos de moneda para la tabla de la página de marca. */
export function compareBrandTableCodes(a: string, b: string): number {
  const rank = (code: string) => {
    const at = BRAND_TABLE_ORDER.indexOf(String(code).toUpperCase())
    return at === -1 ? BRAND_TABLE_ORDER.length : at
  }
  return rank(a) - rank(b) || String(a).localeCompare(String(b))
}
