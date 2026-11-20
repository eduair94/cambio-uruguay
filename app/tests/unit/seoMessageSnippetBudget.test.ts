import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import en from '../../i18n/locales/json/en.json'
import es from '../../i18n/locales/json/es.json'
import pt from '../../i18n/locales/json/pt.json'
import { CAR_COMPARISON_MESSAGES } from '../../utils/carComparisonMessages'
import { finesNavigationMessages } from '../../utils/finesNavigationMessages'
import { growthEntryMessages } from '../../utils/growthEntryMessages'
import { noiseNavigationMessages } from '../../utils/noiseNavigationMessages'
import { recordingConsentMessages } from '../../utils/recordingConsentMessages'
import { rentalAnalysisMessages } from '../../utils/rentalAnalysisMessages'
import { rentalFitMessages } from '../../utils/rentalFitMessages'
import { rentalZoneMessages } from '../../utils/rentalZoneMessages'

/**
 * El décimo y el undécimo pozo: los títulos y las descripciones que viven en un catálogo de
 * mensajes y no en la página, con una clave FUERA de `seo.`.
 *
 * POR QUÉ HACE FALTA. Es el mismo agujero que el sexto, el séptimo, el octavo y el noveno, corrido
 * otra vez un archivo más allá. Los lectores de `seoTitleBudget.test.ts` y
 * `seoDescriptionBudget.test.ts` leen el `.vue`: para `staticTitle` una `t('x')` es una llamada,
 * el piso de título se detiene en un identificador seguido de `(` y `literalChain` deja `()=>t()`
 * de resto, así que los tres devuelven `null` y la página sale del conteo. El octavo y el noveno
 * pozo (`seoTitleBudget.test.ts` y `seoDescriptionI18n.test.ts`) miden el JSON, pero sólo una
 * tabla de claves `seo.*`. Y `/dolar-hoy` se titula con `dolarHoy.metaTitle`, `/mejor-casa-de-cambio`
 * con `mejorCasa.metaTitle` y `/herramientas/carrito-importacion` se titulaba con `importCart.h1`.
 *
 * Medido por la auditoría del 2026-11-20 contra producción: `/dolar-hoy` servía un título de 68
 * caracteres y una descripción de 175, `/mejor-casa-de-cambio` un título de 70 y el carrito de
 * importación uno de 83 con una descripción de 184 — mientras ninguno de los cuatro presupuestos
 * de arriba nombraba estas rutas, y su deuda declarada era verdad de lo que medían. Ese mismo día se curaron esas cuatro rutas (las cuatro
 * libres de toda ventana de medición abierta) y el resto quedó declarado abajo, por nombre.
 *
 * LO QUE ESTE LECTOR MIDE, y nada más (después de sacar la flecha `() =>`):
 *
 *   t('clave')
 *   `${t('clave')} | Cambio Uruguay`
 *   X, X.value o `${X.value} | Cambio Uruguay`   con  const X = computed(() => t('clave'))
 *
 * El catálogo es el del `t` que la página desestructura sin alias: el de `useI18n({ useScope:
 * 'local', messages: M })`, resuelto por el import de `M` contra `LOCAL_CATALOGS`, o el global
 * (`i18n/locales/json/*.json`) si viene de un `useI18n()` pelado. Se miden los tres idiomas y una
 * ruta está en deuda si se pasa en cualquiera: `staticTitle` mide el local sólo en español, y los
 * títulos en inglés y portugués de `/alquilar-estando-en-clearing` se pasaban sin que nadie lo viera.
 *
 * SE SALTEA, y es a propósito: una clave global bajo `seo.` (la miden el octavo y el noveno pozo),
 * una clave que falta en algún idioma (`/tickets-mutualistas-uruguay` las agrega en tiempo de render
 * con `mergeLocaleMessage`) y un valor con `{`, porque su largo depende de un parámetro.
 *
 * LO QUE ESTE POZO NO MIDE, DICHO EN VOZ ALTA, con lo que midió la auditoría del 2026-11-20:
 *
 *   - Las claves con parámetros: `casaPage.metaTitle` (69/64/68 en es/en/pt con un nombre de casa
 *     real), `dolarDepto.metaDescription`, `cotizacion.metaDescription` y `chairDetail.metaTitle`.
 *     Medirlas pide una fijación de peor caso como la de `LONGEST_DEPARTMENTS`, no una lectura del
 *     JSON.
 *   - La plantilla de `/precio/[slug]`, armada con datos del SIPC: título de 72 y descripción de 177
 *     en `/precio/agua-mineral-sin-gas-bidon-salus`. Reservada hasta el 2026-11-30 por
 *     `super-mediana-en-el-titulo`.
 *   - La descripción viva de `/herramientas/conversor-unidad-indexada` (162), calculada con la UI
 *     del día. Reservada hasta el 2026-12-15 por `tablas-ur-ui-con-los-montos-que-se-buscan`.
 *   - Los 36 idiomas traducidos por máquina (`i18n/extra/*.json`): sólo se miden es/en/pt. Una
 *     clave acortada acá puede seguir larga en alemán o ruso (la traducción de Google la alarga),
 *     y `npm run i18n:translate` es lo que la pone al día.
 *
 * CONDENA Y NO ABSUELVE, como los otros pozos de catálogo: una clave que entra acá no prueba que la
 * página entre —el `.vue` puede envolverla en otra cosa—, así que los lectores de los otros archivos
 * se quedan donde están.
 */
const MAX_TITLE = 60
const MAX_DESCRIPTION = 155

/** Espejo del titleTemplate de app.vue: la marca se agrega sólo si no está ya. */
function withBrand(title: string): string {
  return /cambio uruguay/i.test(title) ? title : `${title} | Cambio Uruguay`
}

type Code = 'es' | 'en' | 'pt'
type Catalog = Record<Code, unknown>

const CODES: Code[] = ['es', 'en', 'pt']
const GLOBAL_CATALOG: Catalog = { es, en, pt }

/**
 * Los catálogos locales que este lector sabe abrir, por la ruta del import de la página. Son datos
 * puros: importarlos no ejecuta ningún componente. Una página nueva con un catálogo local que no
 * esté acá pone CI en rojo (ver «cada catálogo local medible está en la tabla»), para que no se
 * caiga del conteo en silencio.
 */
const LOCAL_CATALOGS: Record<string, Catalog> = {
  '~/utils/carComparisonMessages': CAR_COMPARISON_MESSAGES,
  '~/utils/finesNavigationMessages': finesNavigationMessages,
  '~/utils/growthEntryMessages': growthEntryMessages,
  '~/utils/noiseNavigationMessages': noiseNavigationMessages,
  '~/utils/recordingConsentMessages': recordingConsentMessages,
  '~/utils/rentalAnalysisMessages': rentalAnalysisMessages,
  '~/utils/rentalFitMessages': rentalFitMessages,
  '~/utils/rentalZoneMessages': rentalZoneMessages,
}

function translator(code: Code, messages: unknown) {
  const i18n = createI18n({
    legacy: false,
    locale: code,
    messages: { [code]: messages as Record<string, unknown> },
    missingWarn: false,
    fallbackWarn: false,
  })
  return i18n.global.t as (key: string) => string
}

const PAGES_DIR = join(__dirname, '..', '..', 'pages')

function pageFiles(dir: string = PAGES_DIR): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return pageFiles(full)
    return name.endsWith('.vue') ? [full] : []
  })
}

/** De `x.vue` y `x/index.vue` a la ruta del sitio, como en `seoTitleBudget.test.ts`. */
const routeOf = (file: string) =>
  file === 'index.vue' ? '/' : `/${file.replace(/\/index\.vue$/, '').replace(/\.vue$/, '')}`

/** Las líneas del objeto de `useSeoMeta`, con el `})` de cierre anclado a la columna 0. */
function seoMetaLines(lines: string[]): string[] {
  const start = lines.findIndex(line => line.startsWith('useSeoMeta({'))
  if (start === -1) return []
  const end = lines.indexOf('})', start)
  return end === -1 ? [] : lines.slice(start + 1, end)
}

/**
 * La expresión de una entrada del objeto CON sus líneas de continuación, cortando en la siguiente
 * entrada (`clave:` o la abreviada `clave,`). La abreviada propia (`description,`) devuelve el
 * nombre, que después se resuelve como un identificador.
 */
function entryExpression(block: string[], name: 'title' | 'description'): string | null {
  if (block.includes(`  ${name},`)) return name
  const head = block.findIndex(line => line.startsWith(`  ${name}:`))
  if (head === -1) return null
  const parts = [block[head]!.slice(`  ${name}:`.length)]
  for (let i = head + 1; i < block.length; i++) {
    if (/^ {2}[a-z_$][\w$]*\s*[:,]/i.test(block[i]!)) break
    parts.push(block[i]!)
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim().replace(/,$/, '')
}

const T_CALL = /^t\('([\w.]+)'\)$/
const T_BRANDED = /^`\$\{t\('([\w.]+)'\)\} \| Cambio Uruguay`$/
const IDENTIFIER = /^([A-Za-z_$][\w$]*)(?:\.value)?$/
const IDENTIFIER_BRANDED = /^`\$\{([A-Za-z_$][\w$]*)\.value\} \| Cambio Uruguay`$/

/** La clave de `const NAME = computed(() => t('clave'))` en el nivel superior, si existe. */
function computedKey(lines: string[], name: string): string | null {
  const prefix = `const ${name} = computed(() => t('`
  const line = lines.find(candidate => candidate.startsWith(prefix))
  if (!line) return null
  return /^([\w.]+)'\)\)$/.exec(line.trimEnd().slice(prefix.length))?.[1] ?? null
}

/**
 * La clave literal de una expresión de título o descripción, o `null` si la expresión no es una de
 * las formas que este lector entiende. Una `t(claveDinamica)` no aporta nada: devuelve `null`.
 */
function messageKey(expression: string, lines: string[]): string | null {
  const body = expression.replace(/^\(\)\s*=>\s*/, '').trim()
  const direct = T_CALL.exec(body) ?? T_BRANDED.exec(body)
  if (direct) return direct[1]!
  const identifier = IDENTIFIER.exec(body) ?? IDENTIFIER_BRANDED.exec(body)
  return identifier ? computedKey(lines, identifier[1]!) : null
}

type Scope = { kind: 'global' } | { kind: 'local'; path: string | null }

/**
 * De dónde sale el `t` que la página desestructura sin alias. `{ t: globalT }` no cuenta: ese `t`
 * no se llama `t`. Devuelve `null` sólo si la página no tiene ningún `t` de `useI18n`; un `useI18n`
 * con argumentos que no son exactamente global ni local-con-import devuelve local sin ruta.
 */
function scopeOf(source: string): Scope | null {
  for (const call of source.matchAll(/const \{([^}]*)\} = useI18n\(([^)]*)\)/g)) {
    const names = call[1]!.split(',').map(name => name.trim())
    if (!names.includes('t')) continue
    const args = call[2]!.replace(/\s+/g, ' ').trim()
    if (args === '' || /^\{ useScope: ['"]global['"],? \}$/.test(args)) return { kind: 'global' }
    const local = /^\{ useScope: ['"]local['"], messages: ([A-Za-z_$][\w$]*),? \}$/.exec(args)
    // Cualquier otra forma (mensajes en línea, opciones en otro orden, `inheritLocale`…) es un
    // catálogo que este lector no sabe abrir: se delata como desconocido en vez de devolver
    // `null`, que sacaría la página del conteo sin poner nada en rojo.
    if (!local) return { kind: 'local', path: null }
    for (const imported of source.matchAll(/import \{([^}]*)\} from '(~\/utils\/[^']+)'/g)) {
      const bindings = imported[1]!.split(',').map(name => name.trim())
      if (bindings.includes(local[1]!)) return { kind: 'local', path: imported[2]! }
    }
    return { kind: 'local', path: null }
  }
  return null
}

/** El valor de una clave en un idioma del catálogo, si es una cadena. */
function lookup(catalog: Catalog, code: Code, key: string): string | null {
  let value: unknown = catalog[code]
  for (const part of key.split('.')) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, part)) return null
    value = (value as Record<string, unknown>)[part]
  }
  return typeof value === 'string' ? value : null
}

interface Measured {
  route: string
  key: string
  lengths: Record<Code, number>
  rendered: Record<Code, string>
}

interface Reading {
  titles: Measured[]
  descriptions: Measured[]
  /** Páginas con una forma medible cuyo catálogo local no está en `LOCAL_CATALOGS`. */
  unknownCatalogs: string[]
}

function readPage(file: string, source: string, reading: Reading): void {
  const lines = source.split('\n')
  const block = seoMetaLines(lines)
  if (block.length === 0) return
  for (const kind of ['title', 'description'] as const) {
    const expression = entryExpression(block, kind)
    if (expression === null) continue
    const key = messageKey(expression, lines)
    if (key === null) continue
    const scope = scopeOf(source)
    if (scope === null) continue
    let catalog = GLOBAL_CATALOG
    if (scope.kind === 'local') {
      const local = scope.path === null ? undefined : LOCAL_CATALOGS[scope.path]
      if (!local) {
        reading.unknownCatalogs.push(`${file} (${scope.path ?? 'sin import'})`)
        continue
      }
      catalog = local
    } else if (key.startsWith('seo.')) continue
    const values = CODES.map(code => lookup(catalog, code, key))
    if (values.some(value => value === null || value.includes('{'))) continue
    const rendered = {} as Record<Code, string>
    const lengths = {} as Record<Code, number>
    for (const code of CODES) {
      const text = translator(code, catalog[code])(key)
      rendered[code] = kind === 'title' ? withBrand(text) : text
      lengths[code] = rendered[code].length
    }
    const entry = { route: routeOf(file), key, lengths, rendered }
    if (kind === 'title') reading.titles.push(entry)
    else reading.descriptions.push(entry)
  }
}

function readAllPages(): Reading {
  const reading: Reading = { titles: [], descriptions: [], unknownCatalogs: [] }
  for (const full of pageFiles()) {
    const file = relative(PAGES_DIR, full).replace(/\\/g, '/')
    readPage(file, readFileSync(full, 'utf8'), reading)
  }
  return reading
}

const overOf = (entries: Measured[], max: number) =>
  entries.filter(entry => CODES.some(code => entry.lengths[code] > max))

const describeOver = (entries: Measured[]) =>
  entries
    .map(entry => `${entry.route} (${entry.key}) ${CODES.map(c => `${c}:${entry.lengths[c]}`)}`)
    .sort()

/**
 * Las rutas cuyo título de catálogo se pasa de 60 con la marca en algún idioma. **SÓLO PUEDE
 * BAJAR**, y la lista tiene que ser EXACTA: una ruta curada que siga acá pone CI en rojo.
 */
const DEUDA_TITULO_MENSAJE = [
  // 14 → 11 el 2026-11-20, el día que nació: se curan `/dolar-hoy` (68 → 57), `/mejor-casa-de-cambio`
  // (70 → 59) y `/herramientas/carrito-importacion` (83 → 55, con una clave `importCart.metaTitle`
  // propia: antes el `<title>` era el H1 entero). Las tres sueltan relleno y conservan las palabras
  // de las consultas que las traen; «en Uruguay» se va porque la marca ya lo dice.
  //
  // 11 → 10 el 2026-11-20: `/por-que-sube-el-dolar`, 81/89/79 con la marca en es/en/pt → 59/57/57.
  // El título repetía la pregunta del lector y le agregaba una etiqueta genérica («Análisis y
  // correlación») que el SERP cortaba junto con la marca; ahora conserva las dos formas de la
  // consulta («sube o baja») y gasta el resto en lo que la página sí contesta.
  //
  // Las diez que quedan no se tocaron. `/dolar/records` está reservada hasta el 2026-11-29;
  // `/alquilar-estando-en-clearing` (68 en inglés, 70 en portugués: el español entra) tenía su
  // página en manos de otra rama. `npm run seo_debt` dice cuál se puede tocar hoy.
  //
  // El comentario va DENTRO de la lista por lo que `DEUDA_SIN_ENLACE` en `enlacesDeContexto.test.ts`
  // deja escrito: `classes/revenueplan/debtFree.ts::parseStringList` corta en el primer `\n]`, y
  // prettier aplasta a una sola línea cualquier array que entre en 100 columnas salvo los que llevan
  // un comentario.
  '/alquilar-estando-en-clearing',
  '/analiticas',
  '/conectar',
  '/dolar/records',
  '/guias',
  '/pizarra',
  '/preguntas-frecuentes',
  '/sillas-escritorio-uruguay',
  '/sillas-escritorio-uruguay/precios',
  '/ultimos-cambios',
]

const MESSAGE_TITLE_OVER_BUDGET = 10

/** Lo mismo para las descripciones, contra 155. **SÓLO PUEDE BAJAR**, y la lista es exacta. */
const DEUDA_DESCRIPCION_MENSAJE = [
  // 17 → 15 el 2026-11-20, el día que nació: se curan `/dolar-hoy` (175 → 150 en español, 168 → 145
  // en portugués; el inglés ya entraba en 155) y `/herramientas/carrito-importacion` (184 → 154),
  // sin perder la franquicia de USD 800, que es la cifra que la página calcula.
  //
  // 15 → 14 el 2026-11-20: `/por-que-sube-el-dolar`, 156 en español y 158 en portugués → 151 y 146,
  // y de paso pasa a nombrar las CUATRO series que la página correlaciona: le faltaba el blue
  // argentino, que es un `driversFor('USD')` como el real, el índice dólar y el bono a 10 años.
  //
  // Reservadas ese día: `/comparar-plataformas-dolar-uruguay` hasta el 2026-11-26,
  // `/grabacion-sin-consentimiento-uruguay` (sólo el inglés, 158) hasta el 2026-11-22 y
  // `/tarjetas-de-credito-uruguay` hasta el 2026-11-30. Mismo motivo que arriba para el comentario
  // adentro.
  '/acerca',
  '/autos-usados-uruguay/comparar',
  '/barrios-alquileres-uruguay',
  '/comparar-plataformas-dolar-uruguay',
  '/conectar',
  '/economia-uruguay',
  '/estadisticas-reddit',
  '/grabacion-sin-consentimiento-uruguay',
  '/guias',
  '/noticias',
  '/preguntas-frecuentes',
  '/sillas-escritorio-uruguay',
  '/sillas-escritorio-uruguay/precios',
  '/tarjetas-de-credito-uruguay',
]

const MESSAGE_DESCRIPTION_OVER_BUDGET = 14

// El conteo real del 2026-11-20, por el mismo motivo que `MEASURABLE` en `seoTitleBudget.test.ts`:
// si el piso fuera más bajo, una página podría dejar de leerse acá sin poner nada en rojo.
const MESSAGE_TITLE_MEASURABLE = 34
const MESSAGE_DESCRIPTION_MEASURABLE = 36

describe('los títulos y descripciones de catálogo fuera de `seo.` entran en el SERP', () => {
  const reading = readAllPages()

  it('cada catálogo local medible está en la tabla', () => {
    expect(reading.unknownCatalogs, reading.unknownCatalogs.join('\n')).toEqual([])
  })

  it(`lee el título de ${MESSAGE_TITLE_MEASURABLE} páginas y la descripción de ${MESSAGE_DESCRIPTION_MEASURABLE}`, () => {
    expect(reading.titles.length).toBeGreaterThanOrEqual(MESSAGE_TITLE_MEASURABLE)
    expect(reading.descriptions.length).toBeGreaterThanOrEqual(MESSAGE_DESCRIPTION_MEASURABLE)
  })

  it(`tiene como mucho ${MESSAGE_TITLE_OVER_BUDGET} títulos pasados de ${MAX_TITLE}`, () => {
    const over = describeOver(overOf(reading.titles, MAX_TITLE))
    expect(over.length, over.join('\n')).toBeLessThanOrEqual(MESSAGE_TITLE_OVER_BUDGET)
  })

  it(`tiene como mucho ${MESSAGE_DESCRIPTION_OVER_BUDGET} descripciones pasadas de ${MAX_DESCRIPTION}`, () => {
    const over = describeOver(overOf(reading.descriptions, MAX_DESCRIPTION))
    expect(over.length, over.join('\n')).toBeLessThanOrEqual(MESSAGE_DESCRIPTION_OVER_BUDGET)
  })

  it('la deuda de títulos nombra exactamente las rutas que siguen pasadas', () => {
    const over = overOf(reading.titles, MAX_TITLE)
    expect(
      [...new Set(over.map(entry => entry.route))].sort(),
      describeOver(over).join('\n')
    ).toEqual([...DEUDA_TITULO_MENSAJE].sort())
  })

  it('la deuda de descripciones nombra exactamente las rutas que siguen pasadas', () => {
    const over = overOf(reading.descriptions, MAX_DESCRIPTION)
    expect(
      [...new Set(over.map(entry => entry.route))].sort(),
      describeOver(over).join('\n')
    ).toEqual([...DEUDA_DESCRIPCION_MENSAJE].sort())
  })

  it('ninguna ruta en deuda es inventada', () => {
    const titled = reading.titles.map(entry => entry.route)
    const described = reading.descriptions.map(entry => entry.route)
    expect(DEUDA_TITULO_MENSAJE.filter(route => !titled.includes(route))).toEqual([])
    expect(DEUDA_DESCRIPCION_MENSAJE.filter(route => !described.includes(route))).toEqual([])
  })
})

describe('el lector de catálogos entiende sus formas, y nada más', () => {
  const lines = (...rows: string[]) => rows

  it('lee las tres formas de clave literal', () => {
    expect(messageKey("() => t('a.b')", [])).toBe('a.b')
    expect(messageKey("() => `${t('a.b')} | Cambio Uruguay`", [])).toBe('a.b')
    const source = lines("const title = computed(() => t('x.title'))", '')
    expect(messageKey('() => `${title.value} | Cambio Uruguay`', source)).toBe('x.title')
    expect(messageKey('title', source)).toBe('x.title')
    expect(messageKey('() => title.value', source)).toBe('x.title')
  })

  it('una clave dinámica o un computed con datos no aportan nada', () => {
    expect(messageKey('() => t(dynamicKey)', [])).toBeNull()
    expect(messageKey("() => t('a', { n: 1 })", [])).toBeNull()
    const source = lines('const title = computed(() => `${data.value.name}`)')
    expect(messageKey('() => `${title.value} | Cambio Uruguay`', source)).toBeNull()
    expect(messageKey('title', [])).toBeNull()
  })

  it('el `t` es el que se desestructura sin alias', () => {
    expect(scopeOf('const { t, locale } = useI18n()')).toEqual({ kind: 'global' })
    expect(scopeOf('const { locale, t: globalT } = useI18n()')).toBeNull()
    const local = [
      "import { a, rentalFitMessages } from '~/utils/rentalFitMessages'",
      "const { t } = useI18n({ useScope: 'local', messages: rentalFitMessages })",
      "const { t: globalT } = useI18n({ useScope: 'global' })",
    ].join('\n')
    expect(scopeOf(local)).toEqual({ kind: 'local', path: '~/utils/rentalFitMessages' })
  })

  it('una entrada de varias líneas o abreviada se lee entera', () => {
    const block = ['  title: () =>', "    t('a.b'),", '  description,', '  ogTitle: x,']
    expect(entryExpression(block, 'title')).toBe("() => t('a.b')")
    expect(entryExpression(block, 'description')).toBe('description')
  })

  it('un catálogo local que no está en la tabla se delata en vez de salir del conteo', () => {
    const source = [
      "import { otherMessages } from '~/utils/otherMessages'",
      "const { t } = useI18n({ useScope: 'local', messages: otherMessages })",
      'useSeoMeta({',
      "  title: () => t('title'),",
      '})',
    ].join('\n')
    const reading: Reading = { titles: [], descriptions: [], unknownCatalogs: [] }
    readPage('x.vue', source, reading)
    expect(reading.unknownCatalogs).toEqual(['x.vue (~/utils/otherMessages)'])
    expect(reading.titles).toEqual([])
  })

  it('un `useI18n` local de otra forma también se delata (en línea, opciones en otro orden)', () => {
    const page = (call: string) =>
      [`const { t } = ${call}`, 'useSeoMeta({', "  title: () => t('title'),", '})'].join('\n')
    const reading: Reading = { titles: [], descriptions: [], unknownCatalogs: [] }
    readPage(
      'inline.vue',
      page("useI18n({ useScope: 'local', messages: { es: { title: 'x' } } })"),
      reading
    )
    readPage(
      'reordered.vue',
      page("useI18n({ messages: pageMessages, useScope: 'local' })"),
      reading
    )
    expect(reading.unknownCatalogs).toEqual([
      'inline.vue (sin import)',
      'reordered.vue (sin import)',
    ])
    expect(reading.titles).toEqual([])
  })

  it('mide los tres idiomas de una clave global y saltea las `seo.*`', () => {
    const source = (key: string) =>
      ['const { t } = useI18n()', 'useSeoMeta({', `  title: () => t('${key}'),`, '})'].join('\n')
    const reading: Reading = { titles: [], descriptions: [], unknownCatalogs: [] }
    readPage('dolar-hoy.vue', source('dolarHoy.metaTitle'), reading)
    readPage('index.vue', source('seo.homeTitle'), reading)
    expect(reading.titles.map(entry => entry.route)).toEqual(['/dolar-hoy'])
    expect(reading.titles[0]!.rendered.pt).toBe(withBrand(pt.dolarHoy.metaTitle))
  })
})
