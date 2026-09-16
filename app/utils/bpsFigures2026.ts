// Las cifras del BPS que 2026 comparte entre /suplemento-solidario-bps,
// /cuando-me-puedo-jubilar-uruguay y /pension-a-la-vejez-uruguay.
//
// Antes estaban declaradas TRES veces, con tres nombres distintos, en tres archivos
// (`suplementoSolidario.ts`, `retirementAge.ts`, `pensionVejez.ts`). El BPS reajusta pasividades
// todos los marzos: con tres copias, actualizar dos y olvidar la tercera deja una página
// publicando una cifra vieja sin que ninguna prueba se entere. Esa es exactamente la falla que ya
// pasó en este repo con la BPC. Acá hay una sola casa; los otros módulos importan o re-exportan.
//
// Verificado el 2026-09-16 contra
// https://www.bps.gub.uy/6182/montos-y-aumentos-de-pasividades.html ("Última actualización:
// 09/02/2026") y
// https://www.bps.gub.uy/23862/ajuste-definitivo-de-jubilaciones-y-pensiones-para-2026.html
//
// Los literales en prosa (FAQ, copys) siguen escritos a mano porque se leen mejor así; lo que no
// puede volver a duplicarse es la CONSTANTE.
//
// Módulo PURO: sin imports de Vue/Nuxt, para que vitest lo cargue en node.

/** La página del BPS de la que salen los montos de esta tanda. */
export const BPS_FIGURES_2026_SOURCE_URL =
  'https://www.bps.gub.uy/6182/montos-y-aumentos-de-pasividades.html'

/** La "última actualización" que declara esa misma página del BPS. */
export const BPS_FIGURES_2026_UPDATED_AT = '2026-02-09'

/** Cuándo contrastamos estas cifras contra el BPS. */
export const BPS_FIGURES_2026_VERIFIED_AT = '2026-09-16'

/** Jubilación mínima general, en pesos por mes. */
export const JUBILACION_MINIMA_2026 = 20935

/**
 * La fila del BPS se llama literalmente "Pensión vejez e invalidez": es UN monto para DOS
 * prestaciones distintas, la pensión a la vejez y la pensión por invalidez.
 */
export const PENSION_VEJEZ_INVALIDEZ_2026 = 18575

/** Ajuste general de jubilaciones y pensiones 2026: se paga desde marzo, retroactivo a enero. */
export const AJUSTE_PASIVIDADES_2026_PCT = 5.97
