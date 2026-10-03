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

/**
 * 116 → 104 el 2026-10-02: los doce títulos más largos del catálogo, de 104 a 84 caracteres
 * contando la marca (el peor era más de dos veces el presupuesto).
 *
 * Mismo criterio que las corridas de descripciones, y el mismo patrón, que acá pesa más porque el
 * título es lo único del snippet que decide el clic: los doce gastaban el renglón en la ETIQUETA
 * DEL TEMA y después anunciaban el ÍNDICE de la guía («Precio del oro en Uruguay: cómo se cotiza y
 * dónde comprarlo o venderlo», «Cajeros automáticos en Uruguay para turistas: redes, límites y
 * comisiones», «Cómo elegir la tarjeta de crédito con mejores beneficios en Uruguay»), o sea
 * prometían las secciones en vez de contestar. Y la cola —la parte que el SERP corta— era justo
 * donde estaba la respuesta.
 *
 * Ahora cada título la trae adelante: que la onza troy son 31,1035 g, que 1 USDT vale casi USD 1 y
 * no es un dólar billete, que el domingo casi todas las casas de cambio cierran, que con tarjeta
 * del exterior el hotel va sin IVA, que en el cajero pagás dos comisiones (la de la red y la de tu
 * banco), que en AliExpress la cuenta es la franquicia anual de USD 800 o el 60 % del régimen
 * simplificado, que el depósito de alquiler es tuyo, que lo que baja el precio de un dólar es el
 * deterioro y no la «cara chica», que el dólar no se predice, que una moneda poco operada se paga
 * con más spread, que al casarte sin capitulaciones rige la sociedad conyugal y que la mejor
 * tarjeta depende de cómo gastás.
 *
 * Ninguna cifra es nueva: todas ya estaban en el cuerpo de su guía. Y ninguna se escribió con más
 * firmeza que la fuente — el cuerpo dice que en Carrasco se cambia «prácticamente las 24 horas»,
 * así que el título usa el dato que sí es categórico (el domingo cierran) y no inventa un horario.
 *
 * 104 → 92 el 2026-10-03, segunda tanda de títulos: doce pasados del presupuesto, de 83 a 77
 * caracteres contando la marca. Mismo defecto y misma cura, con un cuidado extra: estos doce no
 * eran sólo largos, eran la ETIQUETA seguida del índice en su forma más pura («Criptomonedas en
 * Uruguay: regulación e impuestos (qué dice la ley)», «Comisión inmobiliaria en Uruguay: cuánto
 * cobran y quién paga»), o sea prometían las secciones y la respuesta caía del lado cortado.
 *
 * Ahora cada uno contesta: que el dólar fiscal es la cotización de COMPRA del BROU del día hábil
 * anterior, que las criptomonedas son activos y no moneda de curso legal, que en una cuenta
 * conjunta indistinta cualquiera de los dos retira todo el saldo sin consultar, que los billetes
 * van de $ 20 a $ 2.000 y las monedas de 1 a 50, que la UI ajusta por el IPC, que un préstamo se
 * compara por su costo total y nunca por la cuota, que primero se ahorra y mucho después se
 * invierte, que en una compra del exterior la cuenta es la franquicia anual de USD 800 o el 60 %
 * del régimen simplificado, que la reforma jubilatoria sube la edad por generación y no para todos
 * a la vez, que la separación de bienes se pacta ANTES de casarse (después ya no hay
 * capitulaciones, hay disolución judicial), que la comisión inmobiliaria no tiene tope legal —el
 * 3 % más IVA sale de un arancel privado de la Cámara, de 2007— y que el débito gasta lo tuyo
 * mientras el crédito te presta.
 *
 * Ninguna cifra es nueva y ninguna se escribió con más firmeza que su fuente, que acá descartó dos
 * títulos ya redactados: la guía de cripto dice expresamente que el tratamiento impositivo NO está
 * resuelto, así que el título afirma lo único categórico y se calla el impuesto; y la de débito vs
 * crédito iba a decir que el débito baja el IVA y el crédito no, cuando su propio cuerpo dice que
 * la rebaja de la Ley 19.210 es de «la tarjeta de débito y otros medios electrónicos» —el crédito
 * es uno— y que el porcentaje vigente hay que verificarlo. Por la misma razón el de jubilaciones
 * dice «edad por generación» y no una edad.
 *
 * Y TRES de los doce títulos más largos se quedaron sin tocar aunque estaban redactados: sus rutas
 * (`/guias/me-certifique-subsidio-por-enfermedad-uruguay`,
 * `/guias/no-pagar-prestamo-e-irse-del-pais-uruguay`,
 * `/guias/trabajar-para-el-exterior-desde-uruguay`) están dentro de la ventana abierta de
 * `descripciones-de-las-guias-respuesta-primero`, que cierra el 2026-10-29, y `AGENTS.md` es
 * explícito en que dos filas sobre las mismas rutas arruinan la medición de las dos. Entraron en su
 * lugar los tres más largos con la ruta libre. Esos tres entran cuando su ventana cierre.
 *
 * 92 → 80 el 2026-10-03, tercera tanda: doce más, de 78 a 74 caracteres contando la marca.
 *
 * Misma cura y, otra vez, el mismo defecto de origen: once de los doce eran la ETIQUETA DEL TEMA
 * seguida del índice de la guía («Alquiler temporario y Airbnb en Uruguay: lo que hay que saber»,
 * «Billeteras digitales en Uruguay: cómo funcionan y cuál elegir», «TEA, TNA y CFT: cómo entender
 * el costo real de un crédito»), o sea prometían las secciones y dejaban la respuesta del lado que
 * el SERP corta. El doceavo, `/guias/garantias-de-alquiler-uruguay`, era lo contrario de una
 * etiqueta y fallaba igual: enumeraba los cinco proveedores («ANDA, Contaduría, Porto, Sura o
 * Mapfre») sin decir cuánto cuesta ninguno, que es la pregunta.
 *
 * Ahora cada uno contesta: que el anfitrión de un temporario paga IRPF, que una billetera de
 * dinero electrónico no es un banco, que en la garantía de alquiler se paga 3 % mensual (retención)
 * o una prima (seguro de fianza), que los derechos posesorios se titulan a los veinte años, que la
 * cédula de un argentino sale de la residencia Mercosur y no de un trámite propio, que BILLETE es
 * el dólar en efectivo y CABLE el que va o viene del exterior, que si no pagás el prendario te
 * rematan el auto, que al cobrar del exterior el costo está en el retiro y no en la acreditación,
 * que una suba de tasas de la Fed tiende a un dólar global más fuerte, que un crédito se compara
 * por el costo total y nunca por la cuota, que para comprar dólares online hace falta cuenta
 * habilitada, y que en pareja lo que rompe la confianza son las deudas ocultas.
 *
 * Ninguna cifra es nueva: el 3 % y los veinte años ya estaban en el cuerpo de su guía. Y ninguna se
 * escribió con más firmeza que su fuente, que acá descartó dos redacciones: el de billeteras iba a
 * decir «sin garantía COPAB» cuando su propio cuerpo dice que el saldo no está cubierto
 * «directamente» —el matiz no es adorno, los fondos sí quedan respaldados según la normativa del
 * BCU—, así que el título afirma la diferencia que la guía sí da por categórica; y el de la Fed
 * conserva el «tiende» porque el cuerpo avisa que «no es una regla matemática», y además dice
 * «dólar global» para no prometer la cotización uruguaya, que la guía explica que tiene su propia
 * dinámica.
 *
 * SÓLO PUEDE BAJAR.
 */
const TITLE_OVER_BUDGET = 80

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
