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

const MEASURABLE = 110
const OVER_BUDGET = 60

describe('el lector sigue los títulos trasladados a mensajes locales', () => {
  for (const [file, title] of [
    ['alquilar-estando-en-clearing.vue', growthEntryMessages.es.clearing.seoTitle],
    ['tarjetas-de-credito-uruguay.vue', growthEntryMessages.es.cards.seoTitle],
    ['denunciar-ruidos-molestos-uruguay.vue', noiseNavigationMessages.es.title],
    ['multas-de-transito-y-patente-uruguay.vue', finesNavigationMessages.es.title],
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

  it(`tiene como mucho ${OVER_BUDGET} títulos pasados de ${MAX_TITLE} caracteres`, () => {
    const offenders = measured
      .filter(page => page.rendered.length > MAX_TITLE)
      .map(page => `${page.rendered.length} ${page.file}: ${page.rendered}`)
      .sort()
    expect(offenders.length, offenders.join('\n')).toBeLessThanOrEqual(OVER_BUDGET)
  })
})
