import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { tools } from '../../utils/tools'

/**
 * El duodécimo y el decimotercer pozo: el título y la descripción que una herramienta hereda del
 * catálogo `utils/tools.ts`.
 *
 * POR QUÉ HACE FALTA. `components/ToolShell.vue` arma el `<title>` con `${tool.title} | Cambio
 * Uruguay` y la descripción con `tool.description` cada vez que la página no le pasa `seo-title` ni
 * `seo-description`. El texto vive en el catálogo y no en la página, así que ninguno de los lectores
 * de `seoTitleBudget.test.ts` ni de `seoDescriptionBudget.test.ts` lo ve: la página no tiene
 * `useSeoMeta`. `toolSnippets.test.ts` mide a mano las tres herramientas que arman su snippet con
 * datos (IVA, sueldo líquido, inflación), y nadie medía las otras. Medido el 2026-11-20 contra
 * producción: cinco títulos pasados de 60 (el peor, `/herramientas/calculadora-plazo-fijo`, 75) y
 * tres descripciones pasadas de 155 (la peor, `/herramientas/costo-real-de-invertir-afuera`, 212).
 *
 * QUÉ SE MIDE. Por cada herramienta del catálogo sin `to` (las que viven bajo `/herramientas/`):
 *
 *   - un `seo-title="literal"` en el `<ToolShell>` se mide con la marca del titleTemplate;
 *   - un `:seo-title=` dinámico NO es de este pozo (lo miden `toolSnippets`, `costOfLivingTitle` y los
 *     tests de IRPF y UI);
 *   - si no hay ninguno, el título es el del catálogo, con la marca que le pega `ToolShell`.
 *
 * Y lo mismo para la descripción, contra 155. Se mide sólo en español: el catálogo tiene un solo
 * idioma.
 *
 * El 2026-11-20 `utils/tools.ts` lo estaba editando otra rama, así que el pozo nació con su deuda
 * entera y sin curar ninguna. Lo que se propuso ese día para cada una, con la marca:
 *
 *   - calculadora-propinas: «Calculadora de propinas y dividir la cuenta» (60)
 *   - calculadora-presupuesto-viaje: «Presupuesto de viaje: dólares a llevar» (55)
 *   - costo-real-de-invertir-afuera: «Costo real de invertir afuera» (46), y la descripción «Dólares
 *     en un ETF del exterior, ida y vuelta: giros, corresponsales, comisión del bróker, retención de
 *     EE.UU. e IRPF uruguayo, y el rendimiento efectivo.» (153)
 *   - calculadora-plazo-fijo: «Simulador de plazo fijo BROU en dólares» (56), reservada hasta el
 *     2026-11-29
 *   - calculadora-prestamo: «Simulador de préstamos con cada prestamista» (60), reservada hasta el
 *     2026-11-29
 *   - las descripciones de calculadora-impuestos-importacion y calculadora-impuestos-inversiones,
 *     reservadas hasta el 2026-11-30
 */
const MAX_TITLE = 60
const MAX_DESCRIPTION = 155

/** Espejo del titleTemplate de app.vue: la marca se agrega sólo si no está ya. */
function withBrand(title: string): string {
  return /cambio uruguay/i.test(title) ? title : `${title} | Cambio Uruguay`
}

const APP_DIR = join(__dirname, '..', '..')
const TOOLS_DIR = join(APP_DIR, 'pages', 'herramientas')

/**
 * Las herramientas que arman su propio `useSeoMeta` y no usan `ToolShell`. Su título y su
 * descripción los mide `seoMessageSnippetBudget.test.ts`. Una nueva fuera de `ToolShell` que no esté
 * acá pone CI en rojo, para que no salga del conteo en silencio.
 */
const OWN_SEO_TOOLS = ['carrito-importacion']

/**
 * La apertura del `<ToolShell ...>`. Corta en el primer `>`, que en este repo nunca aparece dentro
 * de un atributo del componente.
 */
function shellTag(source: string): string | null {
  const start = source.indexOf('<ToolShell')
  if (start === -1) return null
  const end = source.indexOf('>', start)
  return end === -1 ? null : source.slice(start, end)
}

/** Un atributo literal (`name="..."`), `dynamic` si viene ligado (`:name=`), o `null`. */
function attribute(tag: string, name: string): string | 'dynamic' | null {
  if (new RegExp(`\\s:${name}=`).test(tag)) return 'dynamic'
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null
}

interface ToolSnippet {
  route: string
  title: string | null
  description: string | null
}

interface ToolReading {
  snippets: ToolSnippet[]
  missingPages: string[]
  withoutShell: string[]
  wrongSlug: string[]
  ownSeoMeta: string[]
}

function readTools(): ToolReading {
  const reading: ToolReading = {
    snippets: [],
    missingPages: [],
    withoutShell: [],
    wrongSlug: [],
    ownSeoMeta: [],
  }
  for (const tool of tools) {
    if (tool.to) continue
    const file = join(TOOLS_DIR, `${tool.slug}.vue`)
    if (!existsSync(file)) {
      reading.missingPages.push(tool.slug)
      continue
    }
    const source = readFileSync(file, 'utf8')
    const tag = shellTag(source)
    if (tag === null) {
      reading.withoutShell.push(tool.slug)
      continue
    }
    if (!tag.includes(`slug="${tool.slug}"`)) reading.wrongSlug.push(tool.slug)
    if (source.includes('useSeoMeta(')) reading.ownSeoMeta.push(tool.slug)
    const title = attribute(tag, 'seo-title')
    const description = attribute(tag, 'seo-description')
    reading.snippets.push({
      route: `/herramientas/${tool.slug}`,
      title:
        title === 'dynamic'
          ? null
          : title === null
            ? `${tool.title} | Cambio Uruguay`
            : withBrand(title),
      description:
        description === 'dynamic' ? null : description === null ? tool.description : description,
    })
  }
  return reading
}

/**
 * Las herramientas cuyo título pasa de 60 con la marca. **SÓLO PUEDE BAJAR**, y la lista es exacta.
 */
const DEUDA_TITULO_HERRAMIENTA = [
  // Nació el 2026-11-20 con su deuda entera: `utils/tools.ts` lo editaba otra rama ese día. Los
  // títulos propuestos están en el comentario de arriba. Las dos primeras están reservadas hasta el
  // 2026-11-29; las otras tres, libres.
  //
  // El comentario va DENTRO de la lista por lo que `DEUDA_SIN_ENLACE` en `enlacesDeContexto.test.ts`
  // deja escrito: `classes/revenueplan/debtFree.ts::parseStringList` corta en el primer `\n]`, y
  // prettier aplasta a una sola línea cualquier array que entre en 100 columnas salvo los que llevan
  // un comentario.
  //
  // 5 → 2 el 2026-11-22: las tres libres se pagaron con un `seo-title` en el `<ToolShell>` y NO
  // tocando `utils/tools.ts`. El catálogo le da el título al `<h1>`, al índice `/herramientas`, a
  // los chips de «Más herramientas» de las otras diez y a la tarjeta OG, donde el renglón largo
  // informa y no cuesta nada; lo único que tenía que entrar en 60 era el `<title>`, que es el
  // renglón sobre el que se hace clic. Quedan las dos reservadas hasta el 2026-11-29.
  '/herramientas/calculadora-plazo-fijo',
  '/herramientas/calculadora-prestamo',
]

const TOOL_TITLE_OVER_BUDGET = 2

/** Lo mismo para las descripciones, contra 155. */
const DEUDA_DESCRIPCION_HERRAMIENTA = [
  // Nació el 2026-11-20 con su deuda entera, por el mismo motivo. Las dos de impuestos están
  // reservadas hasta el 2026-11-30; `costo-real-de-invertir-afuera` está libre.
  //
  // 3 → 2 el 2026-11-22: `costo-real-de-invertir-afuera` pasó de 212 a 153 con un
  // `seo-description` en su `<ToolShell>`. Los 212 siguen siendo el párrafo de arriba de la
  // página, que es donde entran enteros; lo que se recortó es el renglón del SERP, que a 212
  // Google cortaba justo antes de «rendimiento efectivo», que es la cifra por la que se entra.
  '/herramientas/calculadora-impuestos-importacion',
  '/herramientas/calculadora-impuestos-inversiones',
]

const TOOL_DESCRIPTION_OVER_BUDGET = 2

// El conteo real del 2026-11-20: una herramienta que pasa a un `:seo-title=` dinámico sale de este
// pozo, y el número lo delata si nadie la mide en otro lado.
const TOOL_TITLE_MEASURABLE = 11
const TOOL_DESCRIPTION_MEASURABLE = 11

describe('el título y la descripción que una herramienta hereda del catálogo entran en el SERP', () => {
  const reading = readTools()
  const titled = reading.snippets.filter(
    (tool): tool is ToolSnippet & { title: string } => tool.title !== null
  )
  const described = reading.snippets.filter(
    (tool): tool is ToolSnippet & { description: string } => tool.description !== null
  )
  const titlesOver = titled.filter(tool => tool.title.length > MAX_TITLE)
  const descriptionsOver = described.filter(tool => tool.description.length > MAX_DESCRIPTION)

  // El espejo de arriba repite la regla de `ToolShell.vue`. Si allá cambia, este pozo mide otra
  // cosa que la que se publica y tiene que ponerse rojo.
  it('ToolShell sigue armando el snippet con el catálogo cuando la página no lo pasa', () => {
    const shell = readFileSync(join(APP_DIR, 'components', 'ToolShell.vue'), 'utf8')
    expect(shell).toContain(
      "props.seoTitle || `${tool.value?.title ?? 'Herramienta'} | Cambio Uruguay`"
    )
    expect(shell).toContain('props.seoDescription || tool.value?.description')
  })

  it('cada herramienta del catálogo tiene su página y usa ToolShell con su propio slug', () => {
    expect(reading.missingPages).toEqual([])
    expect(reading.wrongSlug).toEqual([])
    expect(reading.withoutShell.sort()).toEqual([...OWN_SEO_TOOLS].sort())
  })

  it('ninguna página con ToolShell pisa el snippet con su propio useSeoMeta', () => {
    expect(reading.ownSeoMeta).toEqual([])
  })

  it(`lee el título de ${TOOL_TITLE_MEASURABLE} herramientas y la descripción de ${TOOL_DESCRIPTION_MEASURABLE}`, () => {
    expect(titled.length).toBeGreaterThanOrEqual(TOOL_TITLE_MEASURABLE)
    expect(described.length).toBeGreaterThanOrEqual(TOOL_DESCRIPTION_MEASURABLE)
  })

  it(`tiene como mucho ${TOOL_TITLE_OVER_BUDGET} títulos pasados de ${MAX_TITLE}`, () => {
    const over = titlesOver.map(tool => `${tool.title.length} ${tool.route}: ${tool.title}`)
    expect(over.length, over.join('\n')).toBeLessThanOrEqual(TOOL_TITLE_OVER_BUDGET)
  })

  it(`tiene como mucho ${TOOL_DESCRIPTION_OVER_BUDGET} descripciones pasadas de ${MAX_DESCRIPTION}`, () => {
    const over = descriptionsOver.map(tool => `${tool.description.length} ${tool.route}`)
    expect(over.length, over.join('\n')).toBeLessThanOrEqual(TOOL_DESCRIPTION_OVER_BUDGET)
  })

  it('la deuda nombra exactamente las herramientas que siguen pasadas', () => {
    expect(titlesOver.map(tool => tool.route).sort()).toEqual([...DEUDA_TITULO_HERRAMIENTA].sort())
    expect(descriptionsOver.map(tool => tool.route).sort()).toEqual(
      [...DEUDA_DESCRIPCION_HERRAMIENTA].sort()
    )
  })

  it('ninguna ruta en deuda es inventada', () => {
    const routes = reading.snippets.map(tool => tool.route)
    expect(DEUDA_TITULO_HERRAMIENTA.filter(route => !routes.includes(route))).toEqual([])
    expect(DEUDA_DESCRIPCION_HERRAMIENTA.filter(route => !routes.includes(route))).toEqual([])
  })

  it('lee el atributo literal, reconoce el ligado y no inventa ninguno', () => {
    const tag = '<ToolShell slug="x" seo-title="Hola" :seo-description="snippet.description"'
    expect(attribute(tag, 'seo-title')).toBe('Hola')
    expect(attribute(tag, 'seo-description')).toBe('dynamic')
    expect(attribute('<ToolShell slug="x"', 'seo-title')).toBeNull()
    expect(shellTag('<template><ToolShell\n  slug="x"\n  :faq="faq"\n>')).toBe(
      '<ToolShell\n  slug="x"\n  :faq="faq"\n'
    )
  })
})
