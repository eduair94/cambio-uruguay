// Framework-agnostic catalogue + helpers for the Uruguayan economic-indicator
// pages (`pages/indicadores/index.vue` and `pages/indicadores/[indicador].vue`).
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so it can be
// unit-tested in plain Node via vitest and shared by the pages, the server
// sitemap route and the route guard.
//
// These pages target very high recurring Uruguayan searches ("valor de la unidad
// indexada hoy", "unidad reajustable", "valor de la BPC"). The live-valued
// indicators (UI, UR) read their current value from the same API the rest of the
// site uses; the BPC is a yearly legal value and is stored statically here. The
// editorial bodies are Spanish-only (the audience is Uruguay), like the guides.

import type { ExchangeRate } from '../types/api'
import { BCU_ORIGIN } from './rateSource'

/** A single FAQ entry rendered both as visible copy and FAQPage schema. */
export interface IndicatorFaq {
  question: string
  answer: string
}

/** A related internal link shown on the indicator page. */
export interface IndicatorLink {
  label: string
  to: string
}

/** A complete economic indicator, addressable at `/indicadores/{slug}`. */
export interface Indicator {
  /** URL-safe identifier, e.g. `'unidad-indexada'`. */
  slug: string
  /**
   * API `ExchangeRate.code` used to read the live value, or `null` for
   * statically-valued indicators (the BPC, a yearly legal figure).
   */
  code: 'UI' | 'UR' | null
  /** Full name, e.g. `'Unidad Indexada'`. */
  name: string
  /** Short abbreviation, e.g. `'UI'`. */
  abbr: string
  /** Uppercase label for the OG image. */
  tag: string
  /** One-line summary for meta description / cards. */
  shortDef: string
  /** First explanatory paragraph (what it is). */
  whatItIs: string
  /** Bullet list of common real-world uses. */
  usedFor: string[]
  /** How and how often it is updated. */
  howUpdated: string
  /**
   * Reference value used when there is no live `code` (BPC) or as a defensive
   * fallback if the API row is missing. For UI/UR the live API value wins.
   */
  referenceValue: number
  /** Context for {@link referenceValue}, e.g. `'Vigente en 2026'`. */
  referenceLabel: string
  /** Decimal places used to display the value. */
  decimals: number
  /** Frequently-asked questions (also emitted as FAQPage JSON-LD). */
  faqs: IndicatorFaq[]
  /** Related internal links. */
  related: IndicatorLink[]
  /** ISO date (`YYYY-MM-DD`) of last editorial review. */
  updatedAt: string
}

/**
 * The catalogue of indicators, in the order shown on `/indicadores`.
 *
 * UI and UR are read live from the API (BCU is the authoritative source); the BPC
 * is the yearly legal value and must be refreshed each January.
 */
export const indicators: readonly Indicator[] = Object.freeze([
  {
    slug: 'unidad-indexada',
    code: 'UI',
    name: 'Unidad Indexada',
    abbr: 'UI',
    tag: 'INDICADOR',
    shortDef:
      'La Unidad Indexada (UI) es una unidad de valor que se ajusta a diario según la inflación. Mirá su valor de hoy y convertilo a pesos.',
    whatItIs:
      'La Unidad Indexada (UI) es una unidad de valor creada en Uruguay que se ajusta todos los días según la inflación, medida por el Índice de Precios al Consumo (IPC). Su objetivo es mantener el poder de compra a lo largo del tiempo: como su valor en pesos sube con la inflación, un monto expresado en UI conserva su valor real aunque pasen los meses o los años.',
    usedFor: [
      'Alquileres ajustados por inflación',
      'Préstamos y créditos hipotecarios',
      'Depósitos y ahorros en UI',
      'Contratos y obligaciones de largo plazo',
    ],
    howUpdated:
      'El Instituto Nacional de Estadística (INE) publica el valor de la UI todos los días, calculado a partir de la inflación del IPC con un rezago de algunas semanas.',
    referenceValue: 6.58,
    referenceLabel: 'Valor de referencia',
    decimals: 4,
    faqs: [
      {
        question: '¿Cuánto vale la Unidad Indexada hoy?',
        answer:
          'El valor de la UI se actualiza todos los días. En esta página mostramos el valor vigente tomado del Banco Central del Uruguay; multiplicá la cantidad de UI por ese valor para obtener el monto en pesos.',
      },
      {
        question: '¿Cómo se calcula la Unidad Indexada?',
        answer:
          'La UI se ajusta diariamente según la variación del Índice de Precios al Consumo (IPC) que publica el INE, por lo que acompaña a la inflación.',
      },
      {
        question: '¿Para qué se usa la UI en Uruguay?',
        answer:
          'Se usa principalmente en alquileres, préstamos hipotecarios, depósitos y contratos de largo plazo, para que los montos mantengan su valor real frente a la inflación.',
      },
      {
        question: '¿Qué diferencia hay entre la UI y la UR?',
        answer:
          'La UI se ajusta por la inflación (IPC) y de forma diaria; la Unidad Reajustable (UR) se ajusta por la evolución de los salarios y se publica una vez al mes.',
      },
    ],
    related: [
      { label: 'Conversor de Unidad Indexada', to: '/herramientas/conversor-unidad-indexada' },
      { label: 'Calculadora de inflación', to: '/herramientas/calculadora-inflacion' },
      { label: 'Unidad Reajustable (UR)', to: '/indicadores/unidad-reajustable' },
    ],
    updatedAt: '2026-06-20',
  },
  {
    slug: 'unidad-reajustable',
    code: 'UR',
    name: 'Unidad Reajustable',
    abbr: 'UR',
    tag: 'INDICADOR',
    shortDef:
      'La Unidad Reajustable (UR) se ajusta según los salarios y se usa sobre todo en alquileres. Consultá su valor de hoy y pasalo a pesos.',
    whatItIs:
      'La Unidad Reajustable (UR) es una unidad de valor que se ajusta según la evolución del Índice Medio de Salarios. A diferencia de la Unidad Indexada, que sigue a la inflación, la UR acompaña a los salarios, por lo que se utiliza en contratos donde se busca seguir la capacidad de pago de las personas, como muchos alquileres y préstamos del Banco Hipotecario.',
    usedFor: [
      'Alquileres con ajuste por UR',
      'Préstamos del Banco Hipotecario (BHU)',
      'Cuotas y obligaciones de largo plazo',
      'Topes y referencias en normativa',
    ],
    howUpdated:
      'El Instituto Nacional de Estadística (INE) publica el valor de la UR una vez al mes, en base a la variación del Índice Medio de Salarios.',
    referenceValue: 1921.36,
    referenceLabel: 'Valor de referencia',
    decimals: 2,
    faqs: [
      {
        question: '¿Cuánto vale la Unidad Reajustable hoy?',
        answer:
          'La UR se actualiza una vez al mes. En esta página mostramos el valor vigente tomado del Banco Central del Uruguay; multiplicá la cantidad de UR por ese valor para obtener el monto en pesos.',
      },
      {
        question: '¿Cómo se ajusta la UR?',
        answer:
          'La Unidad Reajustable se ajusta según la evolución del Índice Medio de Salarios que calcula el INE, por lo que sigue a los salarios y no directamente a la inflación.',
      },
      {
        question: '¿Para qué se usa la UR?',
        answer:
          'Se usa sobre todo en alquileres con ajuste anual y en préstamos del Banco Hipotecario del Uruguay (BHU), además de servir como referencia en distintas normas.',
      },
      {
        question: '¿La UR es lo mismo que la UI?',
        answer:
          'No. La UR sigue a los salarios y se actualiza mensualmente; la UI sigue a la inflación (IPC) y se actualiza a diario. Por eso sus valores y su evolución son distintos.',
      },
    ],
    related: [
      { label: 'Unidad Indexada (UI)', to: '/indicadores/unidad-indexada' },
      { label: 'Calculadora de inflación', to: '/herramientas/calculadora-inflacion' },
      { label: 'Glosario financiero', to: '/glosario' },
    ],
    updatedAt: '2026-06-20',
  },
  {
    slug: 'bpc',
    code: null,
    name: 'Base de Prestaciones y Contribuciones',
    abbr: 'BPC',
    tag: 'INDICADOR',
    shortDef:
      'La BPC es el valor de referencia que usa el Estado para tributos, multas, prestaciones y los topes del IRPF. Mirá su valor 2026 y convertilo a pesos.',
    whatItIs:
      'La Base de Prestaciones y Contribuciones (BPC) es un valor de referencia que fija el Estado uruguayo una vez al año y que se usa para expresar montos en muchas normas: tributos, multas, prestaciones sociales, asignaciones familiares y, muy especialmente, las franjas del IRPF. Al estar expresados en BPC, esos montos se actualizan automáticamente cada año cuando se fija el nuevo valor.',
    usedFor: [
      'Franjas y mínimos no imponibles del IRPF',
      'Multas y tributos expresados en BPC',
      'Prestaciones sociales y asignaciones familiares',
      'Topes y referencias en normativa estatal',
    ],
    howUpdated:
      'El valor de la BPC se fija una vez al año, con vigencia desde el 1° de enero, mediante decreto del Poder Ejecutivo.',
    referenceValue: 6864,
    referenceLabel: 'Vigente en 2026',
    decimals: 0,
    faqs: [
      {
        question: '¿Cuánto vale la BPC en 2026?',
        answer:
          'La BPC vigente en 2026 es de $6.864, fijada por decreto con vigencia desde el 1° de enero. El valor se actualiza una vez al año.',
      },
      {
        question: '¿Para qué sirve la BPC?',
        answer:
          'La BPC se usa como unidad de referencia en tributos, multas, prestaciones sociales y, sobre todo, en las franjas del IRPF, que se expresan en cantidades de BPC.',
      },
      {
        question: '¿Cómo paso un monto en BPC a pesos?',
        answer:
          'Multiplicá la cantidad de BPC por el valor vigente. Por ejemplo, 10 BPC en 2026 equivalen a $68.640 (10 × $6.864).',
      },
      {
        question: '¿Cada cuánto cambia la BPC?',
        answer:
          'La BPC se actualiza una vez al año, con vigencia desde el 1° de enero, por lo que conviene verificar el valor del año en curso.',
      },
    ],
    related: [
      { label: 'Calculadora de IRPF', to: '/herramientas/calculadora-irpf' },
      { label: 'Calculadora de aguinaldo', to: '/herramientas/calculadora-aguinaldo' },
      { label: 'Unidad Indexada (UI)', to: '/indicadores/unidad-indexada' },
    ],
    updatedAt: '2026-06-20',
  },
])

/** Look up an indicator by slug. Returns `null` when the slug is unknown. */
export function indicatorFromSlug(slug: string): Indicator | null {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return null
  return indicators.find(i => i.slug === normalized) ?? null
}

/** Every indicator slug, for sitemap generation and internal linking. */
export function listIndicatorSlugs(): string[] {
  return indicators.map(i => i.slug)
}

/**
 * Resolve the current value of an indicator from a set of API rows.
 *
 * For live-valued indicators (UI, UR) the authoritative BCU row wins, falling
 * back to any row with the right code, and finally to the static
 * {@link Indicator.referenceValue}. Statically-valued indicators (BPC) always
 * return their reference value.
 *
 * @returns the value in pesos for one unit of the indicator.
 */
export function currentIndicatorValue(rows: readonly ExchangeRate[], indicator: Indicator): number {
  if (!indicator.code) return indicator.referenceValue

  let fallback: number | null = null
  for (const row of rows) {
    if (row.code !== indicator.code) continue
    const value = typeof row.sell === 'number' && row.sell > 0 ? row.sell : row.buy
    if (typeof value !== 'number' || value <= 0) continue
    if (row.origin === BCU_ORIGIN) return value // authoritative
    if (fallback === null) fallback = value
  }
  return fallback ?? indicator.referenceValue
}
