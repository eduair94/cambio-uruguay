import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { guideHubs } from '../../utils/guideHubs'

/**
 * El presupuesto de caracteres del snippet de los DIECISÉIS temas (`/temas/<slug>`).
 *
 * POR QUÉ ESTE ARCHIVO. No nació de una deuda que alguien dejara para después: nació de un
 * AGUJERO, igual que el pozo de las descripciones de plantilla (2026-11-02) y el del piso de
 * título (2026-11-03). Los dos presupuestos del directorio de páginas leen el `.vue`
 * —`seoTitleBudget.test.ts` y `seoDescriptionBudget.test.ts`, entre comillas y por plantilla— y
 * `app/pages/temas/[slug].vue` no declara ninguna cadena: arma su `<title>` y su meta description
 * con una flecha sobre el catálogo de temas (`title: () => \`${hub.seoTitle} | Cambio Uruguay\``,
 * `description: () => hub.description`). Los dos lectores devuelven `null` y los dieciséis temas
 * se caen del conteo sin aparecer en ninguna lista. `guideHubs.test.ts`, que es el test del
 * catálogo, les exigía `length > 0` y nada más.
 *
 * Medido el 2026-11-17, antes de esta tanda: **16 de 16 títulos pasados de 60 caracteres** con la
 * marca puesta —o sea NINGUNO se publicaba entero— y **13 de 16 descripciones pasadas de 155**. El
 * peor título llegaba a 101 caracteres («Emprender en Uruguay: monotributo, empresa unipersonal,
 * facturar y qué empresa abrir»), 41 de más: el SERP mostraba menos de la mitad y elegía él qué
 * poner. Y la peor descripción, 198. Es el modo de fallar que `value.ts` tiene un nivel más
 * arriba: no hay rojo, hay una medición que no alcanza a la página, y se lee igual que «acá no hay
 * deuda».
 *
 * Y son páginas del tramo que más rinde: `/temas/*` es uno de los `CONTENIDO_BUCKETS` de
 * `classes/revenueplan/value.ts`, 8× el promedio del sitio. Son además los hubs del enlazado
 * recíproco del sitio (`temaHuerfanas.test.ts` existe porque una página sin tema no recibe ningún
 * enlace), así que lo que se gana acá no es sólo el clic del tema: es la puerta de entrada a sus
 * guías.
 *
 * SE MIDE CON LA MARCA PUESTA, por la misma razón que `guideSnippetBudget.test.ts`: la página la
 * agrega SIEMPRE, sin la condición del `titleTemplate` de app.vue, así que los 17 caracteres de
 * « | Cambio Uruguay» salen de los 60 y medir el texto solo daría verde sobre un título cortado.
 *
 * LOS DOS POZOS SÓLO PUEDEN BAJAR. Si CI falla acá, el título o la descripción que escribiste no
 * entra entero en el SERP: dejá el dato o el nombre propio adelante y recortá.
 */
const MAX_TITLE = 60
const MAX_DESCRIPTION = 155

/** Espejo de lo que hace la página: la marca se agrega siempre. */
const rendered = (seoTitle: string) => `${seoTitle} | Cambio Uruguay`

const HUB_PAGE = readFileSync(join(__dirname, '..', '..', 'pages', 'temas', '[slug].vue'), 'utf8')

/**
 * Los temas con el título pasado. **SÓLO PUEDE BAJAR.**
 *
 * 16 → 0 el 2026-11-20, en la misma tanda que descubre el pozo (medido el 2026-11-17). Los
 * dieciséis entran en una sola tanda y no de a uno porque son UN cambio —el snippet de los
 * dieciséis temas— y una fila por tema en el libro de cambios se pisaría con las otras quince
 * (`experiments_overlap.test.ts`): la fila es `temas-snippet-que-entra-al-serp`, sobre `/temas/*`.
 *
 * Ninguno de los dieciséis era un título largo por descuido: los dieciséis eran el nombre del tema
 * seguido de la lista de sus sub-temas, o sea gastaban los 43 caracteres que el SERP publica en
 * repetir el H1 y dejaban los sub-temas —que es lo que se busca— del lado cortado. Ahora el nombre
 * del tema entra con los dos o tres nouns por los que se lo busca («Importar a Uruguay: courier y
 * franquicia», «Comprar un auto en Uruguay: 0km o usado», «Deudas en Uruguay: préstamos y
 * Clearing»). Ninguno afirma nada nuevo: los nouns que quedaron son miembros declarados del propio
 * hub, y los que se cayeron viven en la descripción y en la página del tema.
 *
 * Tres dejaron de abrir por el nombre del tema para abrir por lo más buscado de adentro, que es la
 * misma decisión que las nueve tandas de títulos de guía: `finanzas-personales-y-jubilacion-uruguay`
 * abre por «Jubilación, AFAP», `derechos-y-reclamos-uruguay` por «Reclamos», y
 * `pareja-familia-y-dinero-uruguay` por «Dinero en pareja». Y uno perdió el relleno que
 * `glosario-cambiario-titulo-sin-relleno` ya había sacado de una guía el 2026-11-10: el «y más» de
 * trámites.
 */
const DEUDA_HUB_TITULO = [
  // POZO PAGADO el 2026-11-20: ningún tema sale con el título cortado del SERP.
  //
  // La marca literal es la que `classes/revenueplan/debtFree.ts::parseStringList` busca para
  // distinguir «este pozo se terminó» de su propio modo de fallar, que es devolver `[]` cuando no
  // entiende la forma de la lista. El comentario va DENTRO de la lista porque el lector exige que
  // el `]` abra su propia línea y prettier colapsa cualquier array que entre en 100 columnas salvo
  // los que llevan un comentario.
]

/**
 * Los temas con la descripción pasada. **SÓLO PUEDE BAJAR.**
 *
 * 13 → 0 el 2026-11-20, en la misma tanda y por el mismo motivo que los títulos: es el otro lado
 * del mismo snippet. Las tres que ya entraban (`ahorrar-e-invertir-uruguay` 152,
 * `deudas-y-credito-uruguay` 149, `comprar-vivienda-uruguay` 146) no se tocaron.
 *
 * El patrón de las trece es el que las nueve corridas de `seoDescriptionBudget.test.ts` ya
 * describieron y acá se repite entero: once abrían con una etiqueta de género («Todo sobre el
 * dólar en Uruguay:», «Entendé la economía uruguaya:», «Cómo manejar el dinero en pareja en
 * Uruguay:», «Ordená tu vida financiera en Uruguay:»), o sea el único renglón que el SERP publica
 * lo gastaban en decir que la página es un tema, y los sub-temas por los que se la busca caían del
 * lado cortado. Ahora arranca el contenido.
 *
 * Una precisión que no es de estilo: la descripción de un tema es TAMBIÉN la entradilla de su
 * página (`<p class="hub-lead">`), la bajada de su imagen de OG y el texto de su tarjeta en
 * `/temas`, así que las trece se escribieron para leerse como prosa y no como una lista de
 * palabras clave. Y ninguna afirma nada que el hub no tenga declarado: cada noun que quedó es una
 * guía o un `resources` del propio tema (el alquiler de temporada, la transferencia de un auto con
 * deuda, las facturas del hogar que entraron a finanzas el 2026-10-25). Dos claims que la versión
 * vieja arrastraba se cayeron a propósito en vez de recortarse: «por qué no hay impuesto a la
 * herencia» pasa a «qué paga una sucesión», porque la sucesión sí paga ITP, y la «e-factura» de
 * emprender no es miembro declarado de ese hub. Y una tercera se corrigió en la revisión del
 * 2026-11-20: la de economía decía «cuánto es la inflación», y ningún miembro de ese hub publica
 * una cifra de inflación (la guía `inflacion-y-dolar-uruguay` explica que la mide el IPC del INE,
 * `/indicadores` da UI, UR y BPC, y la calculadora de inflación no es miembro del tema). Ahora
 * dice «qué es la inflación y cómo la mide el INE», que es lo que el hub tiene. La ata el último
 * test de este archivo.
 */
const DEUDA_HUB_DESCRIPCION = [
  // POZO PAGADO el 2026-11-20: ninguna descripción de tema sale cortada del SERP. Misma marca y
  // mismo motivo que la lista de arriba.
]

const TITLE_OVER_BUDGET = 0
const DESCRIPTION_OVER_BUDGET = 0

/**
 * El piso de temas leídos. Sube con cada tema nuevo y baja sólo si alguien saca uno: es lo que
 * impide que este archivo quede verde sobre un catálogo que se encogió, que es el contrapeso que
 * `RESOLVED` es en `seoDescriptionBudget.test.ts`.
 */
const HUBS_MEASURED = 16

describe('el snippet de los temas entra en el SERP', () => {
  it(`mide los ${HUBS_MEASURED} temas del catálogo`, () => {
    expect(guideHubs.length).toBeGreaterThanOrEqual(HUBS_MEASURED)
  })

  it('ningún título trae ya la marca', () => {
    // La página la agrega siempre, así que un título que la traiga la publicaría dos veces.
    const offenders = guideHubs
      .filter(hub => /cambio uruguay/i.test(hub.seoTitle))
      .map(hub => hub.slug)
    expect(offenders).toEqual([])
  })

  const titulosLargos = guideHubs
    .filter(hub => rendered(hub.seoTitle).length > MAX_TITLE)
    .map(hub => hub.slug)
    .sort()
  const descripcionesLargas = guideHubs
    .filter(hub => hub.description.length > MAX_DESCRIPTION)
    .map(hub => hub.slug)
    .sort()

  it(`tiene como mucho ${TITLE_OVER_BUDGET} títulos pasados de ${MAX_TITLE} caracteres`, () => {
    const offenders = guideHubs
      .map(hub => ({ slug: hub.slug, title: rendered(hub.seoTitle) }))
      .filter(hub => hub.title.length > MAX_TITLE)
      .map(hub => `${hub.title.length} ${hub.slug}: ${hub.title}`)
      .sort()
    expect(offenders.length, offenders.join('\n')).toBeLessThanOrEqual(TITLE_OVER_BUDGET)
  })

  it(`tiene como mucho ${DESCRIPTION_OVER_BUDGET} descripciones pasadas de ${MAX_DESCRIPTION} caracteres`, () => {
    const offenders = guideHubs
      .filter(hub => hub.description.length > MAX_DESCRIPTION)
      .map(hub => `${hub.description.length} ${hub.slug}: ${hub.description}`)
      .sort()
    expect(offenders.length, offenders.join('\n')).toBeLessThanOrEqual(DESCRIPTION_OVER_BUDGET)
  })

  // Las dos deudas por nombre y no por número, que es lo que hace que `npm run seo_debt` pueda
  // nombrarlas, y lo que impide que arreglar un tema y pasarse con otro deje el contador igual.
  it('los temas con el título pasado son exactamente los declarados', () => {
    expect(titulosLargos).toEqual([...DEUDA_HUB_TITULO].sort())
  })

  it('los temas con la descripción pasada son exactamente los declarados', () => {
    expect(descripcionesLargas).toEqual([...DEUDA_HUB_DESCRIPCION].sort())
  })

  // Un tema renombrado dejaría su slug viejo en la lista y el cruce del informe quedaría apuntando
  // a una ruta que no existe, que es el modo de fallar que `experiments_routes.test.ts` ataja en el
  // libro de cambios.
  it('ninguna de las dos listas nombra un tema que no existe', () => {
    const existen = new Set(guideHubs.map(hub => hub.slug))
    for (const slug of [...DEUDA_HUB_TITULO, ...DEUDA_HUB_DESCRIPCION])
      expect(existen.has(slug), slug).toBe(true)
  })

  // Dos temas con el mismo título o la misma descripción se disputan la misma intención y Google
  // reparte las impresiones entre los dos. Misma regla que el catálogo de guías y el directorio de
  // páginas ya aplican.
  it.each([
    ['título', (hub: (typeof guideHubs)[number]) => hub.seoTitle],
    ['descripción', (hub: (typeof guideHubs)[number]) => hub.description],
  ] as const)('ningún %s se repite entre dos temas', (_what, pick) => {
    const byText = new Map<string, string[]>()
    for (const hub of guideHubs) {
      const text = pick(hub).trim()
      byText.set(text, [...(byText.get(text) ?? []), hub.slug])
    }
    const repeated = [...byText.entries()]
      .filter(([, slugs]) => slugs.length > 1)
      .map(([text, slugs]) => `${slugs.join(' + ')}: ${text}`)
    expect(repeated, repeated.join('\n')).toEqual([])
  })

  // El guardarraíl que hace honesto a todo lo anterior, y el que faltaba: si la página dejara de
  // componer su snippet con estos dos campos, este archivo seguiría contando cadenas que el SERP no
  // ve y los dos presupuestos quedarían en verde sobre nada. Es exactamente el agujero que este
  // pozo vino a tapar, un archivo más allá.
  it('la página del tema compone su snippet con el seoTitle y la descripción del catálogo', () => {
    expect(HUB_PAGE).toContain('${hub.value?.seoTitle ?? ')
    expect(HUB_PAGE).toContain('| Cambio Uruguay`')
    expect(HUB_PAGE).toContain('description: () => hub.value?.description')
  })

  // La descripción de un tema es su entradilla, la bajada de su OG y su tarjeta en `/temas`: lo
  // que promete lo tiene que dar un miembro del hub. «Cuánto es la inflación» prometía una cifra que
  // ningún miembro de economía publica (revisión del 2026-11-20); lo que el hub sí explica es qué es
  // y cómo la mide el INE, y eso lo da la guía `inflacion-y-dolar-uruguay`.
  it('el tema de economía no promete una cifra de inflación que ningún miembro publica', () => {
    const economia = guideHubs.find(hub => hub.slug === 'economia-y-mercado-uruguay')
    expect(economia, 'economia-y-mercado-uruguay').toBeDefined()
    expect(economia!.description).not.toMatch(/cu[aá]nto es la inflaci[oó]n/i)
    if (/inflaci[oó]n/i.test(economia!.description))
      expect(economia!.guideSlugs).toContain('inflacion-y-dolar-uruguay')
  })
})
