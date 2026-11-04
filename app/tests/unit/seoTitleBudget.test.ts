import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import en from '../../i18n/locales/json/en.json'
import es from '../../i18n/locales/json/es.json'
import pt from '../../i18n/locales/json/pt.json'
import { currencyDisplayName } from '../../utils/currencyPages'
import { FRONTERA_ROUTES } from '../../utils/frontera'
import { growthEntryMessages } from '../../utils/growthEntryMessages'
import { noiseNavigationMessages } from '../../utils/noiseNavigationMessages'
import { finesNavigationMessages } from '../../utils/finesNavigationMessages'
import { recordingConsentMessages } from '../../utils/recordingConsentMessages'

/**
 * El presupuesto de caracteres de los títulos que llevan datos adentro.
 *
 * Google corta el `<title>` cerca de los 600 px —unos 60 caracteres— y lo reemplaza por
 * lo que él quiera. Un título que se pasa no es un título largo: es un título que no se
 * publicó. Estas tres claves son las que arman su texto en tiempo de render (la cifra del
 * día en la home, el departamento en /dolar/*, la moneda + el departamento en /frontera/*),
 * así que la única forma de saber si entran es medirlas con los valores reales.
 *
 * SE MIDE CON LA MARCA PUESTA. El `titleTemplate` de app.vue agrega " | Cambio Uruguay"
 * cuando el título no la trae, y ese sufijo se lleva 17 de los 60. Medir el mensaje solo
 * daría siempre verde y dejaría pasar exactamente el título que se corta en el SERP.
 * `withBrand()` repite esa regla acá porque app.vue no se puede importar en el entorno
 * node de vitest; si alguna vez cambia allá, este test miente y hay que actualizarlo.
 */
const MAX_TITLE = 60

/** Espejo del titleTemplate de app.vue: la marca se agrega sólo si no está ya. */
function withBrand(title: string): string {
  return /cambio uruguay/i.test(title) ? title : `${title} | Cambio Uruguay`
}

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

/**
 * Cotizaciones de prueba con TRES dígitos enteros, no dos. El dólar cotiza hoy cerca de
 * 40, pero un título que sólo entra mientras el peso aguante no es un título que entre:
 * el presupuesto se mide contra el peor caso plausible, que es el día en que la cifra
 * crece un dígito. Van sin el "$": el símbolo lo pone el propio mensaje, como en
 * `seo.historicalDetailDescriptionLive`.
 */
const SAMPLE_SELL = '140,65'
const SAMPLE_BUY = '140,00'

/**
 * Los departamentos más largos del país. La lista viva sale del payload de casas
 * (`utils/departments.ts` la deriva de localData), así que acá van a mano los tres peores
 * casos de los 19: si entran estos, entran todos.
 */
const LONGEST_DEPARTMENTS = ['Treinta y Tres', 'Cerro Largo', 'Montevideo']

describe('los títulos con datos adentro entran en el SERP', () => {
  for (const [code, messages] of LOCALES) {
    const t = translator(code, messages)

    it(`${code}: la home cabe con y sin la cifra del día`, () => {
      const fallback = withBrand(t('seo.homeTitle'))
      const live = withBrand(t('seo.homeTitleLive', { sell: SAMPLE_SELL, buy: SAMPLE_BUY }))

      expect(fallback.length, fallback).toBeLessThanOrEqual(MAX_TITLE)
      expect(live.length, live).toBeLessThanOrEqual(MAX_TITLE)

      // VA LA CIFRA DE VENTA Y NO LA DE COMPRA, y es a propósito. Las dos juntas se leen como la
      // pizarra de UNA casa, y no lo son: son el mínimo de venta y el máximo de compra de ~40 casas
      // distintas. Los calificadores que lo aclaran ("desde", "hasta") son los que dice la
      // descripción y no entran acá; sin ellos el par puede salir cruzado —el que vende más barato
      // no tiene por qué ser el que compra más caro— y quedar absurdo en el SERP.
      expect(live).toContain(SAMPLE_SELL)
      expect(live).not.toContain(SAMPLE_BUY)
    })

    it(`${code}: /dolar/<departamento> cabe con el departamento más largo`, () => {
      for (const department of LONGEST_DEPARTMENTS) {
        const title = withBrand(t('dolarDepto.metaTitle', { department }))
        expect(title.length, title).toBeLessThanOrEqual(MAX_TITLE)
      }
    })

    it(`${code}: /frontera/<ruta> cabe en las ocho rutas reales`, () => {
      for (const route of FRONTERA_ROUTES) {
        const title = withBrand(
          t('frontera.metaTitle', {
            currency: currencyDisplayName(route.code, code),
            department: route.departmentName,
          })
        )
        expect(title.length, `${route.slug}: ${title}`).toBeLessThanOrEqual(MAX_TITLE)
      }
    })
  }
})

/**
 * El título tiene que contestar la consulta que lo trae. La home vive de "dolar hoy"
 * (de 2.652 a 31.786 impresiones en dos meses), y sin la palabra del día el título es
 * genérico por más cifra que lleve.
 */
describe('los títulos de la home dicen "hoy"', () => {
  const TODAY_WORD = { es: 'hoy', en: 'today', pt: 'hoje' } as const

  for (const [code, messages] of LOCALES) {
    it(`${code}: la palabra del día está en las dos variantes`, () => {
      const t = translator(code, messages)
      const word = TODAY_WORD[code]
      expect(t('seo.homeTitle').toLowerCase()).toContain(word)
      expect(
        t('seo.homeTitleLive', { sell: SAMPLE_SELL, buy: SAMPLE_BUY }).toLowerCase()
      ).toContain(word)
    })
  }
})

// ---------------------------------------------------------------------------
// El mismo presupuesto, aplicado a los títulos que viven en las páginas
// ---------------------------------------------------------------------------

/**
 * Los tres bloques de arriba miden las tres claves de i18n que arman su texto en
 * tiempo de render. Son las tres que más impresiones mueven, pero son TRES: las
 * otras ~110 páginas escriben su `<title>` en el propio `.vue` y nadie las medía.
 *
 * Medidas por primera vez el 2026-09-04, noventa de esas ciento diez pasaban de
 * los 60 caracteres — el 82 %. No es un detalle de forma: el título que se pasa
 * es el título que Google recorta o reescribe, y en estas páginas lo que se
 * perdía era justamente la cola, que es donde estaba el dato que las diferencia
 * ("...y por qué la culpa no decide", "...el rendimiento del saldo en Prex y
 * Mercado Pago"). El head genérico sobrevivía entero.
 *
 * Se leen los literales locales y los catálogos puros importados que usan estas páginas:
 *
 *   title: 'Texto literal'
 *   title: () => `${title} | Cambio Uruguay`   con  const title = '...'
 *   title: () => `${title.value} | Cambio Uruguay` con computed(() => t('clave'))
 *
 * Los mensajes locales se resuelven siguiendo el import, el catálogo de useI18n y
 * la clave literal. Los computed con datos o mensajes dinámicos de la API siguen fuera.
 * Eso es una limitación real y no una excusa: por eso el test también fija
 * `MEASURABLE`, así que convertir una página medible en una dinámica no puede
 * usarse para bajar el número de abajo sin que se note.
 *
 * OVER_BUDGET SÓLO PUEDE BAJAR. Si CI falla acá porque subió, el título que
 * agregaste no entra en el SERP: acortalo a 43 caracteres o menos (los otros 17
 * se los lleva " | Cambio Uruguay" que pega el titleTemplate de app.vue).
 */
const PAGES_DIR = join(__dirname, '..', '..', 'pages')

function pageFiles(dir: string = PAGES_DIR): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return pageFiles(full)
    return name.endsWith('.vue') ? [full] : []
  })
}

// Sólo datos puros: importar estos catálogos no ejecuta el componente ni una página Nuxt.
// El binding y la ruta del import deben coincidir con el useI18n real de la página.
const LOCAL_TITLE_MESSAGES: Record<string, Record<string, unknown>> = {
  '~/utils/growthEntryMessages': growthEntryMessages.es,
  '~/utils/noiseNavigationMessages': noiseNavigationMessages.es,
  '~/utils/finesNavigationMessages': finesNavigationMessages.es,
  '~/utils/recordingConsentMessages': recordingConsentMessages.es,
}

function localMessageTitle(source: string, titleVariable: string): string | null {
  const computedTitle = [
    ...source.matchAll(
      /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*computed\(\(\)\s*=>\s*t\('([^']+)'\)\)/g
    ),
  ].find(match => match[1] === titleVariable)
  if (!computedTitle) return null
  const local = source.match(
    /useI18n\(\{\s*useScope:\s*'local',\s*messages:\s*([A-Za-z_$][\w$]*)\s*\}\)/
  )
  if (!local) return null
  const imported = [
    ...source.matchAll(/import\s+\{\s*([A-Za-z_$][\w$]*)\s*\}\s+from\s+'(~\/utils\/[^']+)'/g),
  ].find(match => match[1] === local[1])
  if (!imported) return null
  let value: unknown = LOCAL_TITLE_MESSAGES[imported[2]]
  for (const key of computedTitle[2].split('.')) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) return null
    value = (value as Record<string, unknown>)[key]
  }
  return typeof value === 'string' ? value : null
}

/** El mensaje del `<title>` de una página, o `null` si no se puede leer del archivo. */
function staticTitle(source: string): string | null {
  // El `})` de cierre va anclado a la columna 0: `useSeoMeta` se llama siempre en
  // el nivel superior del `<script setup>`. Además de ser exacto, evita el
  // backtracking cuadrático de un `\n\s*\}\)` (regexp/no-super-linear-backtracking).
  const block = source.match(/useSeoMeta\(\{[\s\S]*?\n\}\)/)
  if (!block) return null
  const entry = block[0].match(/\n\s*title:\s*(.+)/)
  if (!entry) return null
  const expression = entry[1].trim().replace(/,$/, '')

  const literal = expression.match(/^'((?:[^'\\]|\\.)*)'$/)
  if (literal) return literal[1]

  // `() => \`${title} | Cambio Uruguay\`` — resolver el const del mismo archivo.
  const interpolated = expression.match(
    /^(?:\(\)\s*=>\s*)?`\$\{([A-Za-z_$][\w$]*)(\.value)?\}\s*\|\s*Cambio Uruguay`$/
  )
  if (!interpolated) return null
  if (interpolated[2]) {
    const title = localMessageTitle(source, interpolated[1])
    return title === null ? null : `${title} | Cambio Uruguay`
  }
  const declaration = source.match(
    new RegExp(`\\n(?:const|let)\\s+${interpolated[1]}\\s*=\\s*\\n?\\s*'((?:[^'\\\\]|\\\\.)*)'`)
  )
  return declaration ? `${declaration[1]} | Cambio Uruguay` : null
}

// 110 → 111 el 2026-09-09: la comparativa de portales de alquiler.
// 111 → 120 el 2026-09-12: nueve páginas nuevas de las últimas corridas ya se leían y nadie había
// subido el piso, así que el bound tenía nueve de sobra — sobrante suficiente para que volver
// dinámico un título medido pasara inadvertido, que es lo único que este número existe para evitar.
// 120 → 144 el 2026-09-20: el bound volvía a tener veinticuatro de sobra, que es el mismo
// sobrante que la nota de arriba describe como el único accidente que este número existe para
// evitar. Queda otra vez en el conteo real.
// 144 → 175 el 2026-10-09: el bound volvía a tener TREINTA Y UNO de sobra, que es el mismo
// sobrante que las dos notas de arriba describen como el único accidente que este número existe
// para evitar — treinta y un títulos medidos se podrían volver dinámicos, o sea salir del control
// del largo y del de canibalización, sin que nada se ponga en rojo. Las páginas que lo aflojaron se
// publicaron de a una sin volver a apretarlo, que es exactamente cómo esto se desajusta. Queda otra
// vez en el conteo real.
// 175 → 176 el 2026-10-10: `/credito-fiscal-por-alquiler-uruguay`. Se aprieta en el mismo commit
// que publica la página, que es la disciplina que las cuatro notas de arriba piden a gritos: el
// desajuste no viene de nadie tocando este número, viene de publicar una página y no volver a él.
// 176 → 177 el 2026-10-11: `/pension-por-sobrevivencia-uruguay`, en el mismo commit que publica
// la página.
// 177 → 178 el 2026-10-12: `/valor-catastral-uruguay`, en el mismo commit que publica la página.
// Su descripción NO entra en `seoDescriptionBudget` y eso es correcto: lleva la tasa catastral
// convertida con la UR del día, que es justo lo que ese test deja fuera de su alcance.
// 178 → 179 el 2026-10-13: `/jubilacion-por-incapacidad-uruguay`, apretado en el mismo commit
// que publica la página.
// 179 → 180 el 2026-10-14: `/pagar-el-alquiler-en-efectivo-uruguay`, apretado en el mismo commit
// que publica la página.
// 180 → 181 el 2026-10-19: `/alquiler-de-temporada-uruguay`, en el mismo commit que publica la
// página. Su título entra acá porque es un literal de la página y no una cadena armada desde
// `utils/seasonalRental.ts`: el plazo de 120 días que imprime es la definición legal del contrato
// y no se mueve con el día, y que no se despegue de la constante lo vigila
// `seasonalRental.test.ts`.
const MEASURABLE = 181
// 44 → 33 el 2026-09-07: once de los títulos más largos reescritos a 43 caracteres o menos. Los
// once perdían la cola en el SERP, y la cola era el dato — «2 puntos o 9», «mora y 72 h», «1 mes
// por año», «6 países», «13 temas», «ChauDeudas o MiDeuda» —, así que en cada uno se conservó la
// cifra o la marca y se soltó el relleno que ya repite la descripción.
//
// 33 → 16 el 2026-09-09: diecisiete títulos, los catorce que quedaban arriba de los 69 caracteres
// más los tres que viven en los catálogos de mensajes locales (el peor de todos estaba ahí: 85).
// Acá el criterio fue al revés que en la tanda anterior: el que tenía una cifra publicable se la
// llevó AL TÍTULO en vez de dejarla sólo en la descripción («200.000 UI», «US$ 800 al año», «3 días
// por duelo», «5 años», «precio por kilo»), porque la mitad recortada era una explicación que la
// descripción ya da entera y la cifra es lo único que el título puede decir y el SERP no puede
// reescribir. En los tres de catálogo se recortaron las tres traducciones, no sólo la medida: el
// test mide `es` y dejar `en`/`pt` largos habría escondido el mismo defecto en dos idiomas.
// El bound quedó en el conteo real (16) y no en un número redondo: el sobrante de 3 que tenía el 33
// alcanzaba para que tres páginas nuevas entraran cortadas sin poner nada en rojo.
//
// 16 → 0 el 2026-09-12: los dieciséis que quedaban, todos entre 76 y 83 caracteres. Esto deja de ser
// un trinquete que cuenta deuda vieja y pasa a ser contrato: no queda número para subir, y un título
// nuevo que no entre en el SERP pone CI en rojo el día que se escribe y no meses después.
// El criterio de recorte fue el de la tanda anterior — el que tenía cifra publicable se la llevó al
// título («66 % a 40 %», «98 días, paternidad 20», «10 días», «las 3 vías») y el resto soltó la
// explicación que la descripción ya da entera. Ninguno perdió la palabra por la que se lo busca.
const OVER_BUDGET = 0

describe('el lector sigue los títulos trasladados a mensajes locales', () => {
  for (const [file, title] of [
    ['alquilar-estando-en-clearing.vue', growthEntryMessages.es.clearing.seoTitle],
    ['tarjetas-de-credito-uruguay/index.vue', growthEntryMessages.es.cards.seoTitle],
    ['denunciar-ruidos-molestos-uruguay.vue', noiseNavigationMessages.es.title],
    ['multas-de-transito-y-patente-uruguay.vue', finesNavigationMessages.es.title],
    ['grabacion-sin-consentimiento-uruguay.vue', recordingConsentMessages.es.title],
  ]) {
    it(`mide el mensaje importado real de ${file}`, () => {
      expect(staticTitle(readFileSync(join(PAGES_DIR, file), 'utf8'))).toBe(
        `${title} | Cambio Uruguay`
      )
    })
  }

  it('no inventa títulos cuando la clave o el catálogo no se pueden resolver', () => {
    const source = readFileSync(join(PAGES_DIR, 'alquilar-estando-en-clearing.vue'), 'utf8')
    expect(staticTitle(source.replace("t('clearing.seoTitle')", "t('missing.title')"))).toBeNull()
    expect(
      staticTitle(source.replace("'~/utils/growthEntryMessages'", "'~/utils/unknownMessages'"))
    ).toBeNull()
    expect(staticTitle(source.replace("t('clearing.seoTitle')", 't(dynamicTitleKey)'))).toBeNull()
  })
})

describe('los títulos escritos en las páginas entran en el SERP', () => {
  const measured = pageFiles()
    .map(file => ({
      file: relative(PAGES_DIR, file),
      title: staticTitle(readFileSync(file, 'utf8')),
    }))
    .filter((page): page is { file: string; title: string } => page.title !== null)
    .map(page => ({ ...page, rendered: withBrand(page.title) }))

  it(`lee el título de ${MEASURABLE} páginas sin ejecutar la app`, () => {
    // El contrapeso de la deuda de abajo: si alguien vuelve dinámico un título
    // para sacarlo de la cuenta, este número baja y el test lo dice.
    expect(measured.length).toBeGreaterThanOrEqual(MEASURABLE)
  })

  // Dos páginas con el mismo `<title>` se disputan la misma consulta y Google reparte las
  // impresiones entre las dos, que es el defecto que el bloque de canibalización del final de
  // `seoContract.test.ts` mide para una familia concreta. Acá se mide para todo el directorio.
  it('ningún título se repite entre dos páginas', () => {
    const byTitle = new Map<string, string[]>()
    for (const page of measured) {
      const key = page.rendered.trim()
      byTitle.set(key, [...(byTitle.get(key) ?? []), page.file])
    }
    const repeated = [...byTitle.entries()]
      .filter(([, pages]) => pages.length > 1)
      .map(([title, pages]) => `${pages.join(' + ')}: ${title}`)
    expect(repeated, repeated.join('\n')).toEqual([])
  })

  it(`tiene como mucho ${OVER_BUDGET} títulos pasados de ${MAX_TITLE} caracteres`, () => {
    const offenders = measured
      .filter(page => page.rendered.length > MAX_TITLE)
      .map(page => `${page.rendered.length} ${page.file}: ${page.rendered}`)
      .sort()
    expect(offenders.length, offenders.join('\n')).toBeLessThanOrEqual(OVER_BUDGET)
  })
})

// ---------------------------------------------------------------------------
// El mismo presupuesto, aplicado a los títulos que el lector de arriba no alcanzaba
// ---------------------------------------------------------------------------

/**
 * El PISO del `<title>`, para las páginas que `staticTitle` no puede leer.
 *
 * POR QUÉ HACE FALTA UN SEGUNDO LECTOR. `OVER_BUDGET` quedó en 0 el 2026-09-12 y el comentario lo
 * declara contrato: «un título nuevo que no entre en el SERP pone CI en rojo el día que se escribe».
 * Era verdad de lo que `staticTitle` mide, que es el mismo modo de fallar que
 * `seoDescriptionBudget.test.ts` se encontró el 2026-11-02 con las descripciones escritas con
 * plantilla: no hay rojo, hay una medición que no alcanza a la página. Medido hoy, `staticTitle`
 * resolvía 190 de las 300 páginas que declaran un `title:` dentro de `useSeoMeta` (185 por sí mismo
 * más los 5 de catálogo i18n; su propio `MEASURABLE` está en 181, o sea con nueve de sobra), y entre
 * las 110 que no leía había un título de **94 caracteres** —`/prestamos-uruguay`, del tramo que
 * rinde 8×— y otros cuatro pasados de 60. El lector nuevo llega a 247; las 53 que faltan arman su
 * título con un `computed(() => { ... })` o una clave de i18n dinámica y siguen fuera de los dos.
 *
 * Y LO PEOR ES QUE EL PUNTO CIEGO ESTÁ CORRELACIONADO CON EL DEFECTO. `staticTitle` saca la
 * expresión con `block.match(/\n\s*title:\s*(.+)/)`, o sea lee lo que queda de ESA línea. Cuando el
 * título es largo, `  title: () =>` más la cadena pasa de las 100 columnas y prettier parte la
 * línea; a partir de ahí la expresión que el lector ve es `() =>` y la página deja de contarse. El
 * título que no entra en el SERP es exactamente el que tiende a no entrar en una línea, así que el
 * control se iba apagando justo en los casos que existía para atrapar.
 *
 * Las otras dos formas que se le escapaban no son de largo sino de escritura, y las tres salieron de
 * las cinco páginas medidas:
 *
 *   title: () =>            ← el valor en la línea siguiente (`/prestamos-uruguay`, 94)
 *     'cadena larga',
 *   title: metaTitle,       ← un identificador pelado, sin la plantilla de la marca
 *   title: () => `${title} | Cambio Uruguay`,  con  const title = `… ${dato} …`
 *
 * LA MEDICIÓN ES UN PISO, igual que en las descripciones de plantilla: un `${...}` que no resuelve a
 * un literal se descarta, así que lo que se cuenta es el texto FIJO y el título real sólo puede ser
 * más largo. Este pozo CONDENA Y NO ABSUELVE: un piso que pasa de 60 está cortado seguro; uno que
 * entra no prueba nada, y por eso el lector de arriba y sus tests se quedan donde están.
 *
 * La diferencia con el pozo de las descripciones es que acá el piso NO alcanza solo: la forma más
 * común de este repo es `title: () => \`${title} | Cambio Uruguay\``, cuyo texto fijo son los 17
 * caracteres de la marca. Sin resolver el identificador, el piso de 192 páginas sería 17 y la
 * medición no diría nada — así que se sigue el `const` del mismo archivo, y lo que no se puede
 * seguir aporta vacío.
 */
const PAGES_WITH_TITLE = pageFiles().map(file => relative(PAGES_DIR, file))

/** De `x.vue` y `x/index.vue` a la ruta del sitio, como en `seoDescriptionBudget.test.ts`. */
const routeOf = (file: string) =>
  file === 'index.vue' ? '/' : `/${file.replace(/\/index\.vue$/, '').replace(/\.vue$/, '')}`

/**
 * Las líneas del objeto de `useSeoMeta`. El `})` de cierre va anclado a la columna 0 porque la
 * llamada vive siempre en el nivel superior del `<script setup>`: recorrer por líneas es exacto y
 * evita el backtracking de un `[\s\S]*?` sobre archivos de mil líneas.
 */
function seoMetaLines(lines: string[]): string[] {
  const start = lines.findIndex(line => line.startsWith('useSeoMeta({'))
  if (start === -1) return []
  const end = lines.indexOf('})', start)
  return end === -1 ? [] : lines.slice(start + 1, end)
}

/**
 * La expresión del `title:` CON sus líneas de continuación, que es la mitad que le faltaba al lector
 * de arriba. Corta en la siguiente entrada del objeto, y la siguiente entrada puede venir abreviada
 * (`description,`) además de con dos puntos — por eso el corte acepta `:` o `,`.
 */
function titleExpression(block: string[]): string | null {
  const head = block.findIndex(line => /^ {2}title:/.test(line))
  if (head === -1) return null
  const parts = [block[head]!.replace(/^ {2}title:/, '')]
  for (let i = head + 1; i < block.length; i++) {
    if (/^ {2}[a-z_$][\w$]*\s*[:,]/i.test(block[i]!)) break
    parts.push(block[i]!)
  }
  return parts.join('\n').trim().replace(/,$/, '')
}

/** El valor de un `const NAME = ...` del nivel superior, con sus líneas de continuación. */
function constantExpression(lines: string[], name: string): string | null {
  const head = lines.findIndex(line => new RegExp(`^(?:const|let) ${name} =`).test(line))
  if (head === -1) return null
  const first = lines[head]!.replace(new RegExp(`^(?:const|let) ${name} =`), '')
  const parts = [first]
  let previous = first
  for (let i = head + 1; i < lines.length; i++) {
    if (
      previous.trim() !== '' &&
      !previous.trimEnd().endsWith('+') &&
      !previous.trimEnd().endsWith('=')
    )
      break
    parts.push(lines[i]!)
    previous = lines[i]!
  }
  return parts.join('\n').trim().replace(/,$/, '')
}

/** Saca las envolturas que no aportan texto: `computed(...)` y la flecha sin argumentos. */
function unwrapTitle(expression: string): string {
  let current = expression.trim()
  for (let depth = 0; depth < 4; depth++) {
    const inner =
      /^computed\(([\s\S]*)\)$/.exec(current)?.[1] ?? /^\(\)\s*=>([\s\S]*)$/.exec(current)?.[1]
    if (inner === undefined) break
    current = inner.trim()
  }
  return current
}

/**
 * El texto FIJO de una expresión de título: cadenas y plantillas concatenadas, siguiendo los
 * identificadores del mismo archivo. Lo que no se puede resolver —una llamada, un ternario, un
 * `${a.b.c}`— aporta vacío, que es lo que hace de esto un piso.
 */
function titleFloor(expression: string, lines: string[], depth = 0): string {
  if (depth > 3) return ''
  let rest = unwrapTitle(expression)
  let text = ''
  for (let step = 0; step < 40 && rest.length > 0; step++) {
    rest = rest.replace(/^[\s+]+/, '')
    if (rest.length === 0) break

    const quoted = /^'((?:[^'\\]|\\.)*)'/.exec(rest)
    if (quoted) {
      text += quoted[1]!.replace(/\\'/g, "'")
      rest = rest.slice(quoted[0].length)
      continue
    }

    if (rest.startsWith('`')) {
      const close = rest.indexOf('`', 1)
      if (close === -1) break
      text += rest.slice(1, close).replace(/\$\{[^}]*\}/g, hole => {
        const name = /^\$\{\s*([A-Za-z_$][\w$]*)(?:\.value)?\s*\}$/.exec(hole)?.[1]
        if (name === undefined) return ''
        const declaration = constantExpression(lines, name)
        return declaration === null ? '' : titleFloor(declaration, lines, depth + 1)
      })
      rest = rest.slice(close + 1)
      continue
    }

    const identifier = /^([A-Za-z_$][\w$]*)(?:\.value)?(?![\w$(])/.exec(rest)
    if (identifier) {
      const declaration = constantExpression(lines, identifier[1]!)
      if (declaration !== null) text += titleFloor(declaration, lines, depth + 1)
      rest = rest.slice(identifier[0].length)
      continue
    }

    break
  }
  return text
}

/** El piso del título de una página, o `null` cuando no queda nada fijo que medir. */
function pageTitleFloor(source: string): string | null {
  const lines = source.split('\n')
  const block = seoMetaLines(lines)
  if (block.length === 0) return null
  const expression = titleExpression(block)
  if (expression === null) return null
  const floor = titleFloor(expression, lines).replace(/\s+/g, ' ').trim()
  return floor === '' ? null : floor
}

/**
 * Las rutas cuyo PISO de título ya pasa los 60 con la marca. **SÓLO PUEDE BAJAR.**
 *
 * 5 → 4 el 2026-11-03, la primera medición. Se cura `/prestamos-uruguay` (94 con la marca, el peor
 * del sitio y el único del tramo `contenido` entre los cinco), que era además la única de las cinco
 * con la ruta libre de toda ventana de medición abierta junto con `/tiendas-online-uruguay`
 * (`npm run seo_debt`), y entre esas dos manda el tramo: 8× contra 0,2×.
 *
 * 4 → 3 el 2026-11-04. Se cura `/tiendas-online-uruguay` (74), que era la que quedaba libre: las
 * otras tres siguen reservadas hasta el 9 y el 24 de noviembre, así que la cola de este pozo no
 * tiene nada más que se pueda tocar hoy. Entra con la cifra puesta —cuántas de las tiendas
 * relevadas tienen reseñas públicas de Google o Trustpilot— y su medición exacta vive en
 * `titlesCutBySerp.test.ts`, como la de los otros títulos con datos adentro.
 *
 * Las tres que quedan, con el día en que se libera cada una:
 *
 *   - `/banco-o-casa-de-cambio-uruguay` (75) y `/cobrar-giro-del-exterior-uruguay` (68) — reservadas
 *     por `casas-grupo-antes-de-cambiar` (2026-10-11), se liberan el 2026-11-09.
 *   - `/declarar-dinero-en-efectivo-uruguay` (73 de piso, 80 con el umbral puesto) — reservada por
 *     `dos-huerfanas-de-aduana-entran-a-su-tema` (2026-10-26), se libera el 2026-11-24.
 */
const DEUDA_TITULO_PISO = [
  // El comentario va DENTRO de la lista por lo que `DEUDA_SIN_ENLACE` en `enlacesDeContexto.test.ts`
  // deja escrito: `classes/revenueplan/debtFree.ts::parseStringList` corta en el primer `\n]`, o sea
  // exige que el cierre abra su propia línea, y prettier aplasta a una sola línea cualquier array
  // que entre en 100 columnas salvo los que llevan un comentario.
  '/banco-o-casa-de-cambio-uruguay',
  '/cobrar-giro-del-exterior-uruguay',
  '/declarar-dinero-en-efectivo-uruguay',
]

const TITLE_FLOOR_OVER_BUDGET = 3

// 247 el 2026-11-03, el conteo real y por el mismo motivo que `MEASURABLE`: si el piso fuera más
// bajo, un título nuevo podría dejar de leerse acá sin poner nada en rojo. Sube con cada página que
// nace y baja sólo si alguien vuelve ilegible un título que hoy se mide, que es lo que tiene que
// delatar.
const FLOOR_MEASURABLE = 247

describe('los títulos que el lector de una línea no alcanzaba también entran en el SERP', () => {
  const floors = PAGES_WITH_TITLE.map(file => ({
    file,
    route: routeOf(file),
    floor: pageTitleFloor(readFileSync(join(PAGES_DIR, file), 'utf8')),
  })).filter((page): page is { file: string; route: string; floor: string } => page.floor !== null)

  const over = floors.filter(page => withBrand(page.floor).length > MAX_TITLE)

  it(`lee el piso de ${FLOOR_MEASURABLE} páginas sin ejecutar la app`, () => {
    expect(floors.length).toBeGreaterThanOrEqual(FLOOR_MEASURABLE)
  })

  // El guard que impide que los dos lectores se separen en silencio: todo lo que `staticTitle` lee,
  // este piso lo tiene que leer también. Sin esto, un refactor podría dejar el lector nuevo ciego a
  // una página que el viejo sí medía y el total seguiría pareciendo sano.
  it('alcanza a todas las páginas que el lector de arriba ya leía', () => {
    const conPiso = new Set(floors.map(page => page.file))
    const perdidas = PAGES_WITH_TITLE.filter(
      file =>
        staticTitle(readFileSync(join(PAGES_DIR, file), 'utf8')) !== null && !conPiso.has(file)
    )
    expect(perdidas, perdidas.join('\n')).toEqual([])
  })

  it(`tiene como mucho ${TITLE_FLOOR_OVER_BUDGET} pisos pasados de ${MAX_TITLE} caracteres`, () => {
    const offenders = over
      .map(page => `${withBrand(page.floor).length} ${page.route}: ${withBrand(page.floor)}`)
      .sort()
    expect(offenders.length, offenders.join('\n')).toBeLessThanOrEqual(TITLE_FLOOR_OVER_BUDGET)
  })

  // La deuda dice la verdad: una ruta ya curada tiene que delatarse acá en vez de inflar el
  // presupuesto y dejar que el próximo título nazca cortado contra un contador que sobra.
  it('cada ruta en deuda sigue pasada, y la deuda nombra a todas las que lo están', () => {
    expect(over.map(page => page.route).sort()).toEqual([...DEUDA_TITULO_PISO].sort())
  })

  it('ninguna ruta en deuda es inventada', () => {
    const known = floors.map(page => page.route)
    expect(DEUDA_TITULO_PISO.filter(route => !known.includes(route))).toEqual([])
  })

  it('lee las tres formas que se le escapaban al lector de una línea, y nada más', () => {
    // La línea partida: `titleExpression` devuelve la expresión ENTERA (la flecha la saca después
    // `unwrapTitle`), que es justo lo que el lector de arriba perdía al quedarse en su propia línea.
    const wrapped = [
      'useSeoMeta({',
      '  title: () =>',
      "    'Una cadena larga',",
      '  description,',
      '})',
    ]
    expect(titleExpression(seoMetaLines(wrapped))).toBe("() =>\n    'Una cadena larga'")
    expect(pageTitleFloor(wrapped.join('\n'))).toBe('Una cadena larga')

    const lines = [
      "const metaTitle = 'Banco o casa de cambio'",
      'useSeoMeta({',
      '  title: metaTitle,',
      '})',
    ]
    expect(pageTitleFloor(lines.join('\n'))).toBe('Banco o casa de cambio')

    const template = [
      'const title = `Hasta US$ ${THRESHOLD} no declarás nada`',
      'useSeoMeta({',
      '  title: () => `${title} | Cambio Uruguay`,',
      '})',
    ]
    expect(pageTitleFloor(template.join('\n'))).toBe('Hasta US$ no declarás nada | Cambio Uruguay')

    // Lo que no resuelve aporta vacío, nunca un largo inventado.
    expect(titleFloor('() => t(claveDinamica)', [])).toBe('')
    expect(titleFloor('() => `${data.value.name} | Cambio Uruguay`', [])).toBe(' | Cambio Uruguay')
  })
})
