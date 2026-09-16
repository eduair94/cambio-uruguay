// Suplemento solidario (Ley 20.130, Decreto 232/023). Verificado el 2026-09-15 contra
// https://www.bps.gub.uy/20541/suplemento-solidario.html y
// https://www.bps.gub.uy/6182/montos-y-aumentos-de-pasividades.html
import { AJUSTE_PASIVIDADES_2026_PCT, BPS_FIGURES_2026_UPDATED_AT } from './bpsFigures2026'
import type { FaqItem } from './faqAnswers'

export const SUPLEMENTO_VERIFIED_AT = '2026-09-15'
/** Valor base 2026 ("lleva deducciones de ingresos previsionales"). */
export const BASE_2026 = 17591
/** Se descuenta el 33 % del monto de las prestaciones previsionales, incluida la que da origen. */
export const DEDUCTION_PCT = 33
// La jubilación mínima y la pensión vejez/invalidez NO se exportan desde acá: viven, con ese mismo
// nombre, sólo en `bpsFigures2026.ts`. `utils/` es un namespace plano para el auto-import de Nuxt,
// así que re-exportarlas duplicaría el nombre en ese namespace — quien las necesite las importa
// del módulo canónico. El BPS reajusta todos los marzos y una cifra sólo puede tener una casa.
/** Aumento general de pasividades 2026. */
export const AUMENTO_2026_PCT = AJUSTE_PASIVIDADES_2026_PCT
export const AUMENTO_2026_FROM = BPS_FIGURES_2026_UPDATED_AT

export const ELIGIBLE: readonly string[] = [
  'Jubilados de cualquier caja que se jubilaron dentro del Sistema Previsional Común (SPC), el régimen nuevo de la Ley 20.130.',
  'Pensionistas por sobrevivencia de 65 años o más, cuando la persona fallecida estaba comprendida en el SPC.',
]
export const RESIDENCY_RULE =
  'Residir en Uruguay y haber residido en el país por lo menos 10 de los últimos 20 años.'

export const APPLY_STEPS: readonly { title: string; detail: string }[] = [
  {
    title: 'Presentás una declaración jurada',
    detail:
      'De ingresos y de residencia, ante el BPS, al pedir la jubilación o pensión o cuando cambian tus ingresos.',
  },
  {
    title: 'El BPS calcula el monto',
    detail:
      'Al valor base le descuenta el 33 % de tus prestaciones previsionales y, si tenés otros ingresos, la parte que corresponda según tu edad.',
  },
  {
    title: 'Lo cobrás junto con la pasividad',
    detail:
      'Rige desde el otorgamiento de la jubilación o pensión y se mantiene mientras se cumplan las condiciones.',
  },
]

export interface SupplementOptions {
  otherIncome?: number
  age?: number
}

/**
 * Estimación del suplemento: base menos el 33 % de la pasividad. Otros ingresos: se descuenta el
 * 33 % (65 años o más) o el 100 % (menos de 65) de TODO el otro ingreso declarado.
 *
 * El BPS aplica sobre esos otros ingresos un tope que no publica en la página del suplemento, así
 * que descontar desde el primer peso es deliberadamente conservador: el suplemento real sólo puede
 * ser igual o mayor al que devuelve esta función, nunca menor. La copia de la página y el FAQ dicen
 * exactamente eso; si algún día el BPS publica el valor del tope, se cambian juntos.
 */
export function estimateSupplement(pension: number, opts: SupplementOptions = {}): number | null {
  const other = opts.otherIncome ?? 0
  if (!Number.isFinite(pension) || pension < 0 || !Number.isFinite(other) || other < 0) return null
  const age = opts.age
  const otherPct = age != null && Number.isFinite(age) && age < 65 ? 1 : DEDUCTION_PCT / 100
  const value = BASE_2026 - (DEDUCTION_PCT / 100) * pension - otherPct * other
  return Math.max(0, Math.round(value))
}

export const EXAMPLES: readonly { pension: number; supplement: number }[] = [
  { pension: 15000, supplement: 12641 },
  { pension: 30000, supplement: 7691 },
  { pension: 53400, supplement: 0 },
]

export const SUPLEMENTO_SOURCES: readonly { label: string; url: string }[] = [
  {
    label: 'BPS — Suplemento solidario',
    url: 'https://www.bps.gub.uy/20541/suplemento-solidario.html',
  },
  {
    label: 'BPS — Montos y aumentos de pasividades 2026',
    url: 'https://www.bps.gub.uy/6182/montos-y-aumentos-de-pasividades.html',
  },
  { label: 'Ley 20.130 (BPS)', url: 'https://www.bps.gub.uy/20600/' },
  { label: 'Decreto 232/023 (BPS)', url: 'https://www.bps.gub.uy/20802/' },
  {
    label: 'El Observador — BPS paga un suplemento de más de $ 17 mil en 2026',
    url: 'https://www.elobservador.com.uy/nacional/bps-paga-un-suplemento-mas-17-mil-2026-quienes-pueden-cobrarlo-y-cuales-son-los-requisitos-n6056845',
  },
]

export const SUPLEMENTO_FAQ: readonly FaqItem[] = [
  {
    id: 'que-es',
    question: '¿Qué es el suplemento solidario del BPS?',
    answer:
      'Es un complemento que la Ley 20.130 creó para las pasividades bajas del sistema nuevo: el BPS paga la diferencia entre un valor base ($ 17.591 en 2026) y una parte de lo que ya cobrás, junto con la jubilación o pensión.',
  },
  {
    id: 'quien-cobra',
    question: '¿Quién puede cobrar el suplemento solidario?',
    answer:
      'Jubilados de cualquier caja dentro del Sistema Previsional Común y pensionistas por sobrevivencia de 65 años o más cuando el causante estaba en ese sistema, con residencia en el país de al menos 10 de los últimos 20 años.',
  },
  {
    id: 'cuanto-es',
    question: '¿Cuánto es el suplemento solidario en 2026?',
    answer:
      'El valor base es de $ 17.591. Lo que cobrás es ese valor menos el 33 % de tus prestaciones previsionales y, si tenés otros ingresos, una deducción adicional. Con una jubilación de $ 30.000 quedan unos $ 7.691.',
  },
  {
    id: 'como-se-calcula',
    question: '¿Cómo se calcula?',
    answer:
      'Base menos el 33 % del total de tus jubilaciones y pensiones. La calculadora descuenta además el 33 % de todos tus otros ingresos si tenés 65 años o más, o el 100 % si tenés menos. El BPS aplica sobre esos otros ingresos un tope que no publica en esa página, así que es una estimación conservadora: la cifra real puede ser mayor. Con $ 53.306 de pasividad el suplemento se agota.',
  },
  {
    id: 'regimen-viejo',
    question: '¿Lo cobran los jubilados del régimen anterior?',
    answer:
      'No. Está reservado a quienes se jubilan por el Sistema Previsional Común de la Ley 20.130. Las pasividades del régimen anterior tienen la jubilación mínima ($ 20.935 en 2026) como piso, no el suplemento.',
  },
  {
    id: 'como-se-pide',
    question: '¿Cómo se pide?',
    answer:
      'Con una declaración jurada de ingresos y residencia ante el BPS. Rige desde que se otorga la jubilación o pensión y se mantiene mientras sigas cumpliendo las condiciones; el BPS lo liquida junto con la pasividad.',
  },
  {
    id: 'pension-vejez',
    question: '¿Es lo mismo que la pensión a la vejez?',
    answer:
      'No. La pensión por vejez e invalidez ($ 18.575 en 2026) es una prestación no contributiva para quien no tiene jubilación; el suplemento solidario complementa una jubilación o pensión del sistema nuevo que quedó baja.',
  },
]
