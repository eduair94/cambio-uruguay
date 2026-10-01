import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { guides } from '../../utils/guides'

/**
 * El presupuesto de caracteres del snippet de las guías de `/guias/*`.
 *
 * `seoTitleBudget.test.ts` y `seoDescriptionBudget.test.ts` ya miden esto, pero los dos leen
 * `pages/**\/*.vue`: buscan el literal que la página escribe en su `useSeoMeta`. Las guías no
 * escriben ninguno. Las 146 viven en una ruta sola, `pages/guias/[slug].vue`, que compone su
 * `<title>` y su `description` con los campos del catálogo (`utils/guides.ts` y los nueve módulos
 * que le agrega), así que los dos presupuestos las leen como UNA página y los otros 145 snippets
 * no los medía nadie.
 *
 * No es un rincón del sitio: es el tramo `contenido`, que rinde 8× el promedio del sitio
 * (`classes/revenueplan/value.ts`), o sea el lugar donde un snippet cortado cuesta más caro. La
 * primera medición, el 2026-10-01, encontró **116 de 146 títulos pasados de 60 caracteres y 89
 * descripciones pasadas de 155** — más de la mitad del catálogo en cada señal, con el mismo
 * defecto que la primera corrida sobre las páginas: lo que se pierde es la cola, que es donde
 * está la cifra.
 *
 * LOS DOS NÚMEROS SÓLO PUEDEN BAJAR. Si CI falla acá, la guía que agregaste o editaste no entra
 * entera en el SERP: dejá el dato adelante y recortá (43 caracteres o menos para el título, que
 * los otros 17 se los lleva la marca; 155 para la descripción).
 */
const MAX_TITLE = 60
const MAX_DESCRIPTION = 155

/**
 * Espejo del `<title>` de `pages/guias/[slug].vue`, que lo arma como
 * `` `${guide.value?.title ?? 'Guía'} | Cambio Uruguay` ``: la marca se agrega SIEMPRE, sin la
 * condición del `titleTemplate` de `app.vue`. Medir el título solo daría 17 caracteres de más y
 * dejaría pasar exactamente el título que el SERP recorta. El último test de este archivo es el
 * que impide que esta copia mienta.
 */
const rendered = (title: string) => `${title} | Cambio Uruguay`

const GUIDE_PAGE = readFileSync(join(__dirname, '..', '..', 'pages', 'guias', '[slug].vue'), 'utf8')

/**
 * Cuántas guías tiene el catálogo. Es el contrapeso de los dos presupuestos de abajo: sin un piso,
 * borrar una guía larga bajaría la deuda sin arreglar nada.
 */
const MEASURED = 146

/** 116 el 2026-10-01, la primera medición. SÓLO PUEDE BAJAR. */
const TITLE_OVER_BUDGET = 116

/**
 * 89 → 77 el 2026-10-01: las doce más largas del catálogo, de 306 a 215 caracteres.
 *
 * Mismo criterio que las nueve corridas que `seoDescriptionBudget.test.ts` documenta para las
 * páginas, y el mismo patrón: once de las doce abrían con la ETIQUETA DEL TEMA («El subsidio por
 * enfermedad en Uruguay:», «Cómo facturar y tributar si trabajás freelance…», «Qué puede hacer
 * legalmente una empresa de cobranza…», «Consecuencias reales de no pagar un préstamo…»), que es
 * justo el renglón que el SERP publica, y la respuesta caía del lado cortado. Ahora arranca el
 * dato: el 70 % desde el cuarto día con tope de $ 67.754 (01/2026), que la exportación de
 * servicios no está gravada y la «tasa cero» no existe, que ninguna ley obliga a dar tolerancia
 * en el privado, el día 10 corrido de la Ley 10.449 y el recargo automático del 10 % de la
 * 18.572, los $ 55.000 del Consultorio Jurídico, el piso del 35 % de la Ley 17.829 y los 10 años
 * del Clearing, el 100 %/150 % de la Ley 15.996, el art. 52 de la Constitución, el mes de sueldo
 * por año con tope de seis mensualidades, los 5 de 15 puntos desde el 1/12/2023, los 20 días de
 * la Ley 12.590 y el «todo o nada» de los USD 200 de EE.UU.
 *
 * La doceava no era una etiqueta sino una afirmación de menos: `/guias/abogado-gratis-uruguay`
 * enumeraba las cuatro puertas sin decir cuál te toca, que es la pregunta.
 *
 * Ninguna cifra es nueva: todas ya estaban en la descripción vieja o en el cuerpo de su guía. Y
 * una que SÍ estaba se dejó afuera a propósito: la guía de Amazon fecha el registro del vendedor
 * el 1/10/2026 y en la misma línea avisa que esa fecha «ya se postergó dos veces», así que
 * publicarla en el snippet como vigente es el error recurrente del repo
 * ([[cifra-vieja-pasa-la-banda-de-plausibilidad]]); en su lugar entró la franquicia anual, que no
 * se mueve.
 */
const DESCRIPTION_OVER_BUDGET = 77

describe('los snippets de las guías entran en el SERP', () => {
  it(`mide las ${MEASURED} guías del catálogo`, () => {
    expect(guides.length).toBeGreaterThanOrEqual(MEASURED)
  })

  it('ninguna guía deja vacío su título o su descripción', () => {
    // La otra forma de bajar los contadores sin arreglar nada: una cadena vacía entra en cualquier
    // presupuesto y publica un snippet que Google reescribe entero.
    const offenders = guides
      .filter(guide => !guide.title.trim() || !guide.description.trim())
      .map(guide => guide.slug)
    expect(offenders).toEqual([])
  })

  it('ningún título trae ya la marca', () => {
    // La página la agrega siempre, así que un título que la traiga la publicaría dos veces.
    const offenders = guides
      .filter(guide => /cambio uruguay/i.test(guide.title))
      .map(guide => guide.slug)
    expect(offenders).toEqual([])
  })

  it(`tiene como mucho ${TITLE_OVER_BUDGET} títulos pasados de ${MAX_TITLE} caracteres`, () => {
    const offenders = guides
      .map(guide => ({ slug: guide.slug, title: rendered(guide.title) }))
      .filter(guide => guide.title.length > MAX_TITLE)
      .map(guide => `${guide.title.length} ${guide.slug}: ${guide.title}`)
      .sort()
    expect(offenders.length, offenders.join('\n')).toBeLessThanOrEqual(TITLE_OVER_BUDGET)
  })

  it(`tiene como mucho ${DESCRIPTION_OVER_BUDGET} descripciones pasadas de ${MAX_DESCRIPTION} caracteres`, () => {
    const offenders = guides
      .filter(guide => guide.description.length > MAX_DESCRIPTION)
      .map(guide => `${guide.description.length} ${guide.slug}: ${guide.description}`)
      .sort()
    expect(offenders.length, offenders.join('\n')).toBeLessThanOrEqual(DESCRIPTION_OVER_BUDGET)
  })

  // Dos guías con el mismo título o la misma descripción se disputan la misma intención y Google
  // reparte las impresiones entre las dos. Es la regla que `seoTitleBudget.test.ts` y
  // `seoDescriptionBudget.test.ts` ya aplican al directorio de páginas, acá sobre el catálogo.
  it.each([
    ['título', (guide: (typeof guides)[number]) => guide.title],
    ['descripción', (guide: (typeof guides)[number]) => guide.description],
  ] as const)('ningún %s se repite entre dos guías', (_what, pick) => {
    const byText = new Map<string, string[]>()
    for (const guide of guides) {
      const text = pick(guide).trim()
      byText.set(text, [...(byText.get(text) ?? []), guide.slug])
    }
    const repeated = [...byText.entries()]
      .filter(([, slugs]) => slugs.length > 1)
      .map(([text, slugs]) => `${slugs.join(' + ')}: ${text}`)
    expect(repeated, repeated.join('\n')).toEqual([])
  })

  // El guardarraíl que hace honesto a todo lo anterior: si la página dejara de componer su snippet
  // con estos dos campos, este archivo seguiría contando cadenas que el SERP no ve, y los dos
  // presupuestos quedarían en verde sobre nada.
  it('la página de la guía compone su snippet con el título y la descripción del catálogo', () => {
    expect(GUIDE_PAGE).toContain('${guide.value?.title ?? ')
    expect(GUIDE_PAGE).toContain('| Cambio Uruguay`')
    expect(GUIDE_PAGE).toContain('description: () => guide.value?.description')
  })
})
