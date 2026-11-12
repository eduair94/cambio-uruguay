import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

import en from '../../i18n/locales/json/en.json'
import es from '../../i18n/locales/json/es.json'
import pt from '../../i18n/locales/json/pt.json'

/**
 * EL NOVENO POZO: las descripciones que viven en i18n y ningún presupuesto medía.
 *
 * POR QUÉ HACE FALTA, Y POR QUÉ ES EL MISMO AGUJERO DEL SEXTO, EL SÉPTIMO Y EL OCTAVO.
 *
 * `seoDescriptionBudget.test.ts` tiene DOS lectores y los dos leen el `.vue`: el de comillas mide
 * 174 páginas y el piso de plantilla del 2026-11-02 agrega 14, o sea 188. Ninguno de los dos puede
 * medir `description: () => t('seo.algoDescription')`, porque el texto no está en la página sino en
 * `i18n/locales/json/*.json`: para el lector de comillas es una llamada y para el de plantilla no es
 * una plantilla, así que la página sale del conteo sin aparecer en ninguna lista de deuda. Medido el
 * 2026-11-12, son **95 de las 309 páginas que declaran un `description:`** dentro de `useSeoMeta`, y
 * de las claves de i18n que las alimentan no había NINGUNA medida: la única que tiene test propio es
 * `homeDescriptionLive` (`homeDescriptionLive.test.ts`), y lo tiene contra 160 y no contra los 155
 * que usan los otros tres presupuestos del repo.
 *
 * O sea el modo de fallar de siempre, y es el cuarto archivo seguido en el que aparece: los dos
 * presupuestos de descripción decían «pozo pagado: 0» y era verdad de lo que medían, mientras
 * **ocho claves de i18n describían ocho páginas que nadie contaba**. Es exactamente lo que el
 * octavo pozo encontró el 2026-11-11 del lado del TÍTULO, un archivo más allá y con las mismas ocho
 * páginas: `seoTitleBudget.test.ts` ya tiene su tabla `I18N_TITLE_ROUTES` para `seo.*Title` y esta
 * es su mitad simétrica, que nunca se escribió.
 *
 * Medido el 2026-11-12 sobre los tres idiomas, tres de las ocho estaban pasadas de 155:
 *
 *   - `homeDescription` 227 (es), 198 (en), 157 (pt) — el peor del archivo, setenta y dos
 *     caracteres de más en español. Es la descripción de la HOME, la que se sirve cuando el payload
 *     del mercado no llega. RESERVADA: ver `DEUDA_DESCRIPCION_I18N`.
 *   - `compareDescription` 195 (es), 176 (en), 184 (pt) — `/comparar`, pasada en los TRES idiomas.
 *     Abría por la etiqueta de formato («Compará la evolución histórica de la cotización del dólar y
 *     otras divisas entre varias casas de cambio de Uruguay en un mismo gráfico»), que es el renglón
 *     que el SERP publica, y dejaba del lado cortado lo único que diferencia a la página. Pasa a
 *     143/127/132 con lo que la página sí afirma: hasta 4 casas (`compare.maxHouses`), compra o
 *     venta (`compare.buy`/`compare.sell`), de 7 días a todo el histórico (`compare.range7d` …
 *     `compare.rangeAll`) y el mínimo, el máximo y el promedio de cada una (`compare.min`/`max`/`avg`).
 *   - `advancedDescription` 159 (es) — `/avanzado`, cuatro de más. Soltó los cincuenta caracteres de
 *     etiqueta de adelante («Vista avanzada del comparador de cambio en Uruguay:») y arranca por lo
 *     que se hace en la página; pasa a 136. El inglés (151) y el portugués (149) ya entraban y se
 *     quedan como están, por lo mismo que el octavo pozo dejó escrito: tocar un espejo que entra no
 *     mide nada.
 *
 * Ninguna afirmación es nueva: las tres salen de los mensajes de la propia página, y no se publica
 * ninguna cifra viva congelada en un literal, que es el error recurrente del repo.
 *
 * LO QUE ESTE POZO NO MIDE, DICHO EN VOZ ALTA. Las cuatro claves de descripción CON parámetros
 * quedan fuera: su largo real depende de un nombre de casa o de la cifra del día, que llegan del
 * payload y no de un catálogo, así que medirlas pide una fijación de peor caso como la
 * `LONGEST_DEPARTMENTS` de `seoTitleBudget.test.ts` y no una lectura del JSON. No es una absolución,
 * y por eso va medido acá: con las tasas de tres dígitos y el nombre más largo del catálogo de
 * `utils/casasDirectory.ts` («BROU (Banco República)», 22 caracteres), `sucursalesDescription` da
 * **178 (es) y 168 (pt)** —su texto fijo ya mide 154 sin los placeholders, o sea que se pasa con
 * cualquier casa— y `homeDescriptionLive` da **156/156/157**, que entra en el 160 de su propio test
 * y no en los 155 de acá. Las dos describen rutas RESERVADAS por el libro de cambios
 * (`/sucursales/<casa>` hasta el 2026-11-19, `/` hasta el 2026-11-30), así que se arreglan en su
 * propia corrida y con el peor caso fijado. `sucursalesLocationDescription` (154),
 * `historicalOriginDescription` (135), `historicalDetailDescription` (151) y
 * `historicalDetailDescriptionLive` (150) entran con ese mismo peor caso; las dos últimas describen
 * rutas que toca el PR abierto #156.
 *
 * CONDENA Y NO ABSUELVE, como los tres pozos anteriores: una clave que entra en 155 acá no prueba
 * que la página entre —el `.vue` puede envolverla— y por eso los dos lectores de
 * `seoDescriptionBudget.test.ts` se quedan donde están.
 */
const MAX_DESCRIPTION = 155

const LOCALES = [
  ['es', es],
  ['en', en],
  ['pt', pt],
] as const

function translator(code: 'es' | 'en' | 'pt', messages: unknown) {
  const i18n = createI18n({
    legacy: false,
    locale: code,
    messages: { [code]: messages as Record<string, unknown> },
    missingWarn: false,
    fallbackWarn: false,
  })
  return i18n.global.t as (key: string, params?: Record<string, unknown>) => string
}

const PAGES_DIR = join(__dirname, '..', '..', 'pages')

/**
 * La clave de i18n que describe cada página, y la ruta que describe.
 *
 * Son las mismas ocho páginas que `I18N_TITLE_ROUTES` en `seoTitleBudget.test.ts`, y no es
 * casualidad: una página que se titula desde i18n se describe desde i18n.
 */
const I18N_DESCRIPTION_ROUTES = {
  advancedDescription: '/avanzado',
  compareDescription: '/comparar',
  historicalDescription: '/historico',
  homeDescription: '/',
  mapaDescription: '/mapa',
  nearbyCasasDescription: '/casa-de-cambio-cerca-de-mi',
  offlineDescription: '/offline',
  sucursalesIndexDescription: '/sucursales',
} as const

/** El archivo de página de una ruta: `/historico` → `historico/index.vue`, `/` → `index.vue`. */
const pageFileOf = (route: string) =>
  route === '/' ? ['index.vue'] : [`${route.slice(1)}.vue`, `${route.slice(1)}/index.vue`]

/**
 * Las rutas cuya descripción de i18n sigue pasada de 155 en algún idioma. **SÓLO PUEDE BAJAR.**
 *
 * 3 → 1 el 2026-11-12, el día que nace el pozo: de las tres pasadas se curan las dos cuya ruta está
 * libre de toda ventana de medición abierta (`npm run seo_debt`), que son `/comparar` y `/avanzado`.
 *
 * Queda una y está RESERVADA: `/` (`homeDescription`, 227 en español). La reserva es la fila
 * `home-descripcion-por-idioma` del 2026-11-01, que mide la descripción VIVA de la home contra
 * «dolar hoy» y sus variantes; tocar ahora la descripción de respaldo de la misma página le cambia
 * el sujeto al experimento. Se libera el 2026-11-30 y desde entonces `npm run seo_debt` la nombra
 * sola. En la misma corrida entra `homeDescriptionLive`, que es de la misma ruta y mide 156 con
 * cifras de tres dígitos: el único que lo mide hoy es `homeDescriptionLive.test.ts` y lo hace contra
 * 160, así que los dos presupuestos de la home se unifican en 155 cuando la ventana cierre.
 */
const DEUDA_DESCRIPCION_I18N = [
  // El comentario va DENTRO de la lista por lo que `DEUDA_SIN_ENLACE` en `enlacesDeContexto.test.ts`
  // deja escrito: `classes/revenueplan/debtFree.ts::parseStringList` corta en el primer `\n]`, o sea
  // exige que el cierre abra su propia línea, y prettier aplasta a una sola línea cualquier array
  // que entre en 100 columnas salvo los que llevan un comentario.
  '/',
]

const I18N_DESCRIPTION_OVER_BUDGET = 1

describe('las descripciones que viven en i18n también entran en el SERP', () => {
  const KEYS = Object.keys(I18N_DESCRIPTION_ROUTES) as (keyof typeof I18N_DESCRIPTION_ROUTES)[]

  // El guard que cierra el agujero: una clave de descripción nueva y sin parámetros queda medida
  // sola. Sin esto el pozo mide ocho claves para siempre y la novena nace fuera de todo
  // presupuesto, que es justo cómo llegaron acá las tres de hoy.
  //
  // El filtro es `escription` y no `endsWith('Description')` a propósito: así entra también un
  // `…DescriptionLive` sin parámetros, que con el ancla al final se escaparía de los dos tamices.
  it('la tabla nombra exactamente las claves de descripción de `seo` sin parámetros', () => {
    const seo = es.seo as Record<string, unknown>
    const sinParametros = Object.entries(seo)
      .filter(
        ([key, value]) =>
          /escription/i.test(key) && typeof value === 'string' && !value.includes('{')
      )
      .map(([key]) => key)
      .sort()
    expect(sinParametros).toEqual([...KEYS].sort())
  })

  // Una clave renombrada o una página movida dejarían la tabla apuntando al vacío y el presupuesto
  // seguiría verde contra una ruta que ya no existe, igual que en los otros pozos.
  it('cada ruta de la tabla es una página real', () => {
    for (const key of KEYS) {
      const route = I18N_DESCRIPTION_ROUTES[key]
      const found = pageFileOf(route).some(file => existsSync(join(PAGES_DIR, file)))
      expect(found, `${key} → ${route}`).toBe(true)
    }
  })

  for (const [code, messages] of LOCALES) {
    const t = translator(code, messages)

    it(`${code}: las ${KEYS.length} claves entran en ${MAX_DESCRIPTION} caracteres`, () => {
      const offenders = KEYS.map(name => ({ name, description: t(`seo.${name}`) }))
        .filter(entry => entry.description.length > MAX_DESCRIPTION)
        .map(
          entry =>
            `${entry.description.length} ${I18N_DESCRIPTION_ROUTES[entry.name]} (${entry.name}): ${entry.description}`
        )
        .sort()
      expect(offenders.length, offenders.join('\n')).toBeLessThanOrEqual(
        I18N_DESCRIPTION_OVER_BUDGET
      )
    })

    // Una clave que no resuelve devuelve su propio nombre y mediría 20 caracteres: entraría en el
    // presupuesto y el pozo diría que todo está bien sobre una descripción que no existe.
    it(`${code}: las ${KEYS.length} claves tienen texto en este idioma`, () => {
      for (const key of KEYS) {
        const text = t(`seo.${key}`)
        expect(text, key).not.toBe(`seo.${key}`)
        expect(text.length, key).toBeGreaterThan(40)
      }
    })
  }

  // La deuda dice la verdad, en los tres idiomas a la vez: una ruta ya curada tiene que delatarse
  // acá en vez de inflar el presupuesto y dejar que la próxima descripción nazca cortada.
  it('la deuda nombra exactamente las rutas que siguen pasadas', () => {
    const over = new Set<string>()
    for (const [code, messages] of LOCALES) {
      const t = translator(code, messages)
      for (const key of KEYS)
        if (t(`seo.${key}`).length > MAX_DESCRIPTION) over.add(I18N_DESCRIPTION_ROUTES[key])
    }
    expect([...over].sort()).toEqual([...DEUDA_DESCRIPCION_I18N].sort())
  })

  it('ninguna ruta en deuda es inventada', () => {
    const known: string[] = KEYS.map(key => I18N_DESCRIPTION_ROUTES[key])
    expect(DEUDA_DESCRIPCION_I18N.filter(route => !known.includes(route))).toEqual([])
  })

  // Las dos curadas hoy conservan lo que las hace distintas de la otra: `/comparar` es la página de
  // varias casas en un gráfico y `/avanzado` la de los filtros y el mapa. Si una descripción pierde
  // su propia afirmación, el recorte dejó de ser un recorte.
  it('las dos descripciones curadas conservan su afirmación', () => {
    const t = translator('es', es)
    expect(t('seo.compareDescription')).toMatch(/4 casas de cambio/)
    expect(t('seo.advancedDescription')).toMatch(/mapa de sucursales/)
  })
})
