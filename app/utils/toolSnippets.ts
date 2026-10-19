// app/utils/toolSnippets.ts
// El `<title>`, la meta description y el `<h1>` de las calculadoras cuya respuesta tiene un dato:
// IVA, sueldo líquido e inflación.
//
// POR QUÉ EXISTE. La regla que el sitio ya midió: el experimento `indicadores-ur-ui-valor-vivo`
// (16/9/2026) puso el valor vigente de la UR/UI en el título y la descripción y la porción de clics
// de esas páginas subió; el que perdió fue el título "que responde" SIN cifra. Estas tres
// calculadoras tenían título y descripción de catálogo (`utils/tools.ts`), genéricos, en posición
// ~9 y sin clics en Search Console (90 días al 2026-10-17): "cuanto es el iva en uruguay",
// "calcular iva", "nominal a liquido", "salario liquido uruguay", "calculadora de inflacion
// uruguay". El snippet ahora contesta primero con el dato (la tasa, el líquido de un sueldo, la
// variación de la UI) y después dice qué hace la herramienta.
//
// POR QUÉ NO SE TOCA EL CATÁLOGO. `tools.ts` alimenta también el índice `/herramientas`, las fichas
// "Más herramientas" de cada calculadora y la imagen OG; cambiarlo movería páginas que otras filas
// de `docs/seo/experiments.json` están midiendo. Por eso el texto entra por las props `seoTitle`,
// `seoDescription` y `heading` de `ToolShell`, que sólo afectan a la página que las pasa.
//
// PURO (sin Vue/Nuxt, imports relativos): lo cargan las páginas y `tests/unit/toolSnippets.test.ts`.

import { addIva } from './calculators'
import { formatNumber, formatUYU } from './format'
import { changeOverDays, dayLabelEs, type EvolutionPoint } from './indicators'
import { IVA_TASA_BASICA, IVA_TASA_MINIMA } from './ivaTarjeta'
import { computePayroll } from './payroll'

/** Fecha en que se leyeron las fuentes de este archivo. */
export const TOOL_SNIPPETS_VERIFIED_AT = '2026-10-19'

/** Lo que una página le pasa a `ToolShell`. Sin la marca: la agrega el `titleTemplate`. */
export interface ToolSnippet {
  title: string
  /** `undefined` cuando falta el dato: `ToolShell` vuelve a la descripción del catálogo. */
  description?: string
  heading?: string
}

// ---------------------------------------------------------------------------
// IVA
// ---------------------------------------------------------------------------

/**
 * Las tasas son las del art. 34 del Título 10 del T.O. 2023 («A) Básica del 22%… B) Mínima del
 * 10%», IMPO, leído el 2026-10-19), que es la misma fuente que `ivaTarjeta.ts`. Lo que va a la
 * tasa mínima es la lista del art. 36 del mismo título: pan blanco común, carne, pescado, arroz,
 * fideos, aceite, azúcar, yerba, café, medicamentos, hospedaje en hoteles, entre otros.
 */
export const TOOL_SNIPPET_IVA_SOURCES = Object.freeze([
  {
    label:
      'IMPO — Texto Ordenado 2023, Título 10, art. 34: tasas del IVA (básica 22 %, mínima 10 %)',
    url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
  },
  {
    label: 'IMPO — Texto Ordenado 2023, Título 10, art. 36: qué va a la tasa mínima',
    url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/36_T10',
  },
  {
    label: 'DGI — ¿Cuáles son los bienes y servicios gravados a la tasa básica del 22%?',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/son-bienes-servicios-gravados-tasa-basica-del-22',
  },
])

/** El ejemplo de la descripción: un número redondo que cualquiera reproduce de cabeza. */
export const TOOL_SNIPPET_IVA_EXAMPLE = 1000

export function toolSnippetIva(): ToolSnippet {
  const example = addIva(TOOL_SNIPPET_IVA_EXAMPLE, IVA_TASA_BASICA)
  return {
    title: `IVA en Uruguay: ${IVA_TASA_BASICA} % y ${IVA_TASA_MINIMA} % (calculadora)`,
    description:
      `El IVA es ${IVA_TASA_BASICA} % (tasa básica) o ${IVA_TASA_MINIMA} % (mínima: pan blanco, carne, ` +
      `medicamentos). ${formatUYU(example.net, 0)} + IVA = ${formatUYU(example.gross, 0)}. ` +
      'Sumalo o sacalo de cualquier monto.',
  }
}

// ---------------------------------------------------------------------------
// Sueldo líquido
// ---------------------------------------------------------------------------

/**
 * El año de los parámetros de `payroll.ts` (BPC, topes). `toolSnippets.test.ts` lo ata a la BPC
 * de `utils/indicators.ts`: el día que se cargue la BPC de otro año, el test pide mover éste.
 */
export const TOOL_SNIPPET_PAYROLL_YEAR = 2026

/**
 * El sueldo del ejemplo. Va por DEBAJO de 10 BPC a propósito: por encima, el Decreto 148/007
 * art. 63 suma 6 % a la renta antes de aplicar la escala del IRPF, y el ejemplo publicado tiene que
 * coincidir con la regla sin depender de ese detalle (el test lo verifica).
 */
export const TOOL_SNIPPET_SUELDO_NOMINAL = 50000

export function toolSnippetSueldoLiquido(nominal = TOOL_SNIPPET_SUELDO_NOMINAL): ToolSnippet {
  const r = computePayroll({ nominal })
  const pct = (n: number) => `${formatNumber(n, Number.isInteger(n) ? 0 : 1)} %`
  const irpf = r.irpf.tax > 0 ? `IRPF, ${formatUYU(r.irpf.tax, 0)}` : 'IRPF, cero'
  return {
    title: `Sueldo líquido ${TOOL_SNIPPET_PAYROLL_YEAR}: de nominal a líquido`,
    description:
      `${formatUYU(nominal, 0)} nominales son ${formatUYU(r.liquido, 0)} en mano en ` +
      `${TOOL_SNIPPET_PAYROLL_YEAR} (sin hijos): ${pct(r.jubilatorio.rate)} jubilatorio, ` +
      `${pct(r.fonasa.rate)} FONASA y ${pct(r.frl.rate)} FRL; ${irpf}. Calculá el tuyo.`,
  }
}

// ---------------------------------------------------------------------------
// Inflación
// ---------------------------------------------------------------------------

/** La variación a 12 meses de la UI según el BCU, con la fecha de su último dato. */
export interface UiYearChange {
  pct: number
  /** ISO del último punto de la serie. */
  date: string
}

/**
 * La UI se ajusta todos los días por el IPC, y su serie del BCU es lo que el sitio lee en vivo
 * (`/indicadores/unidad-indexada` publica el mismo número). Es un dato oficial de HOY sin cargar a
 * mano la inflación del INE, que cambia una vez por mes. `null` si la serie no alcanza para medir 12
 * meses: entonces la descripción vuelve a la del catálogo, sin cifra.
 */
export function uiYearChange(points: readonly EvolutionPoint[]): UiYearChange | null {
  const pct = changeOverDays(points)
  if (pct === null) return null
  let newest: string | null = null
  let newestTime = -Infinity
  for (const p of points) {
    const t = Date.parse(p.date)
    if (!Number.isNaN(t) && t > newestTime) {
      newestTime = t
      newest = p.date
    }
  }
  return newest ? { pct, date: newest } : null
}

/**
 * El `<h1>` y el título no dependen del dato (el catálogo decía "Calculadora de inflación y poder de
 * compra", sin "Uruguay", que es la palabra de las tres consultas que traen impresiones); la
 * descripción lleva la variación de la UI sólo si la lectura fue viva.
 */
export function toolSnippetInflacion(change: UiYearChange | null): ToolSnippet {
  const title = 'Calculadora de inflación en Uruguay'
  if (!change) return { title, heading: title }
  const day = dayLabelEs(change.date)
  const when = day ? `BCU, ${day}` : 'BCU'
  const verb = change.pct >= 0 ? 'subió' : 'bajó'
  return {
    title,
    heading: title,
    description:
      `La UI, que sigue al IPC, ${verb} ${formatNumber(Math.abs(change.pct), 2)} % en 12 meses ` +
      `(${when}). Calculá cuánto pierde tu plata con la inflación.`,
  }
}
