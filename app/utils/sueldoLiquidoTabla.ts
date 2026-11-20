// app/utils/sueldoLiquidoTabla.ts
// Las tablas y el texto con cifras de `/herramientas/calculadora-sueldo-liquido`.
//
// POR QUÉ EXISTE (2026-11-20). La página era el formulario y casi nada de prosa: la nota estaba
// en un slot que `ToolShell` no dibuja y las respuestas de las preguntas frecuentes sólo salían en
// el JSON-LD. En Search Console (28 días al 17/11) tenía 16.657 impresiones en posición 7 con
// consultas que el HTML no contestaba: qué es el nominal y qué el líquido, de líquido a nominal,
// montos sueltos ("60000 nominales a liquidos") y el salario mínimo líquido.
//
// TODA cifra sale de `computePayroll` / `nominalForLiquido`, el mismo cálculo que la calculadora,
// así que la tabla no puede separarse de lo que la herramienta da. Las reglas viven en
// `payroll.ts`; acá sólo se eligen los montos y se escriben las frases. El test
// `tests/unit/sueldoLiquidoTabla.test.ts` fija los valores publicados.
//
// PURO (sin Vue/Nuxt, imports relativos): lo cargan la página y el test. No importa `lowWage.ts`
// (arrastraría el costo de vida al chunk de la calculadora): el test ata `SUELDO_TABLA_SMN` a
// `SMN_VIGENTE`.

import { round, URUGUAY, type BracketDetail } from './calculators'
import { formatNumber, formatUYU } from './format'
import {
  computePayroll,
  fonasaRate,
  nominalForLiquido,
  PAYROLL_UY,
  type PayrollResult,
} from './payroll'

/** Fecha en que se releyeron las fuentes de `SUELDO_TABLA_SOURCES`. */
export const SUELDO_TABLA_VERIFIED_AT = '2026-11-20'

/**
 * Salario mínimo nacional desde el 1.º de julio de 2026: Decreto 319/025, art. 2 («Fíjase el monto
 * del Salario Mínimo Nacional, en la suma de $ 25.383 … a partir del 1° de julio de 2026»), y BPS,
 * Valores actuales (octubre y noviembre de 2026).
 */
export const SUELDO_TABLA_SMN = 25383
export const SUELDO_TABLA_SMN_DECRETO = 'Decreto 319/025'
export const SUELDO_TABLA_SMN_DESDE = '1.º de julio de 2026'

/**
 * Los nominales de la tabla principal: del salario mínimo a $ 250.000, los montos que la gente
 * escribe en Google. Por debajo del tope jubilatorio ($ 288.836) y sin ninguna fila justo en un
 * escalón (2,5, 10 o 15 BPC), donde el líquido salta.
 */
export const SUELDO_TABLA_NOMINALES = Object.freeze([
  SUELDO_TABLA_SMN,
  30000,
  35000,
  40000,
  45000,
  50000,
  60000,
  70000,
  80000,
  90000,
  100000,
  120000,
  150000,
  200000,
  250000,
])

/**
 * Los líquidos de la tabla inversa. $ 55.000 queda afuera a propósito: entre $ 54.394 y
 * $ 55.011 de líquido (y entre $ 75.704 y $ 76.915) dos nominales distintos dan lo mismo en mano,
 * porque el líquido BAJA cuando el nominal pasa 10 BPC (+6 % a la base del IRPF) y 15 BPC (el
 * crédito pasa de 14 % a 8 %). La tabla daría el menor, que es correcto, pero a un lector le
 * parecería un error.
 *
 * Empieza en $ 25.000: cobrar $ 20.000 en mano pide $ 24.876 nominales, menos que el salario
 * mínimo nacional, y la tabla le estaría proponiendo a alguien un contrato de jornada completa por
 * debajo del mínimo legal.
 */
export const SUELDO_TABLA_LIQUIDOS = Object.freeze([
  25000, 30000, 35000, 40000, 45000, 50000, 60000, 70000, 80000, 100000, 120000, 150000,
])

/** Los nominales de la tabla con hijos o cónyuge: uno sin IRPF, uno entre 10 y 15 BPC, uno arriba. */
export const SUELDO_TABLA_FAMILIA_NOMINALES = Object.freeze([50000, 80000, 120000])

/** "4,5 %": coma decimal y espacio, como escribe el resto del sitio. */
export function pctUy(n: number): string {
  return `${formatNumber(n, Number.isInteger(n) ? 0 : 1)} %`
}

/** Pesos sin centavos si el monto es entero, con centavos si no. */
export function pesos(n: number): string {
  return formatUYU(n, Number.isInteger(n) ? 0 : 2)
}

/** Pesos redondeados al peso: lo que muestran las tablas y los resúmenes. */
function pesosRedondo(n: number): string {
  return formatUYU(Math.round(n), 0)
}

export interface SueldoLiquidoFila {
  nominal: number
  esSalarioMinimo: boolean
  /** Jubilatorio + FONASA + FRL. */
  aportes: number
  /** IRPF retenido en el mes. */
  irpf: number
  liquido: number
  /** Líquido sobre nominal, en %, con un decimal. */
  quedaPct: number
}

/** La tabla principal: trabajador dependiente sin hijos ni cónyuge a cargo, BPC vigente. */
export function sueldoLiquidoRows(): SueldoLiquidoFila[] {
  return SUELDO_TABLA_NOMINALES.map(nominal => {
    const r = computePayroll({ nominal })
    return {
      nominal,
      esSalarioMinimo: nominal === SUELDO_TABLA_SMN,
      aportes: r.aportes,
      irpf: r.irpf.tax,
      liquido: r.liquido,
      quedaPct: round((r.liquido / nominal) * 100, 1),
    }
  })
}

/**
 * El menor nominal en pesos enteros cuyo líquido llega a `liquido`. `nominalForLiquido` da el
 * nominal con un margen de $ 0,50 de líquido; de ahí se sube peso a peso hasta el primero que
 * alcanza, así la cifra publicada no depende de dónde cortó la bisección. Por debajo del nominal
 * exacto el líquido nunca alcanza (es el menor), así que empezar unos pesos antes es seguro.
 */
export function nominalNecesario(liquido: number): number {
  let n = Math.max(Math.floor(nominalForLiquido(liquido)) - 2, 0)
  while (computePayroll({ nominal: n }).liquido < liquido) n++
  return n
}

/** La tabla inversa. */
export function nominalNecesarioRows(): Array<{ liquido: number; nominal: number }> {
  return SUELDO_TABLA_LIQUIDOS.map(liquido => ({ liquido, nominal: nominalNecesario(liquido) }))
}

export interface SueldoFamiliaFila {
  nominal: number
  sinCargas: number
  unHijo: number
  dosHijos: number
  /** Cónyuge o concubino a cargo, sin hijos. */
  conyuge: number
}

export function sueldoFamiliaRows(): SueldoFamiliaFila[] {
  return SUELDO_TABLA_FAMILIA_NOMINALES.map(nominal => ({
    nominal,
    sinCargas: computePayroll({ nominal }).liquido,
    unHijo: computePayroll({ nominal, hijos: 1 }).liquido,
    dosHijos: computePayroll({ nominal, hijos: 2 }).liquido,
    conyuge: computePayroll({ nominal, conyugeACargo: true }).liquido,
  }))
}

/** Las cuatro situaciones de la tabla de FONASA del BPS. */
const FONASA_SITUACIONES = Object.freeze([
  { id: 'solo', label: 'Sin hijos ni cónyuge a cargo', hijos: 0, conyuge: false },
  { id: 'hijos', label: 'Con hijos a cargo', hijos: 1, conyuge: false },
  { id: 'conyuge', label: 'Con cónyuge o concubino a cargo', hijos: 0, conyuge: true },
  { id: 'conyuge-hijos', label: 'Con cónyuge e hijos a cargo', hijos: 1, conyuge: true },
])

/** La tasa de FONASA de cada situación, hasta 2,5 BPC y por encima (sale de `fonasaRate`). */
export function fonasaTabla(
  bpc: number = URUGUAY.bpc
): Array<{ id: string; label: string; hasta: number; masDe: number }> {
  return FONASA_SITUACIONES.map(s => ({
    id: s.id,
    label: s.label,
    hasta: fonasaRate(2 * bpc, bpc, s.hijos, s.conyuge),
    masDe: fonasaRate(5 * bpc, bpc, s.hijos, s.conyuge),
  }))
}

/**
 * El último nominal en pesos enteros sin retención de IRPF, sin hijos ni otras deducciones. NO es
 * un umbral legal: la escala empieza en 7 BPC y el crédito del 14 % sobre los aportes cubre los
 * primeros pesos. Entre 7 y 10 BPC la retención no baja nunca, así que se busca por bisección.
 */
export function ultimoNominalSinIrpf(bpc: number = URUGUAY.bpc): number {
  const tax = (nominal: number) => computePayroll({ nominal, bpc }).irpf.tax
  let lo = Math.floor(7 * bpc) // retención cero
  let hi = Math.ceil(10 * bpc) // retención positiva
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (tax(mid) === 0) lo = mid
    else hi = mid
  }
  return lo
}

/**
 * El ejemplo del paso a paso: el resultado entero y sólo las franjas que pagan, cada una con el
 * tramo de la base que cae en ella (`to` es el tope de lo gravado, no el de la franja).
 */
export function sueldoPasoAPaso(nominal = 80000): { r: PayrollResult; franjas: BracketDetail[] } {
  const r = computePayroll({ nominal })
  const franjas = r.irpf.brackets
    .filter(b => b.tax > 0)
    .map(b => ({ ...b, to: b.from + b.taxable }))
  return { r, franjas }
}

/** Las frases con cifras de la sección explicativa (sin enlaces: los enlaces van en la página). */
export function sueldoLiquidoTextos(anio: number) {
  const bpc = URUGUAY.bpc
  const filas = sueldoLiquidoRows()
  const fila = (n: number) => {
    const f = filas.find(x => x.nominal === n)
    if (!f) throw new Error(`sueldoLiquidoTabla: falta la fila de ${n}`)
    return f
  }
  const ultimo = ultimoNominalSinIrpf()
  const fonasaSolo = fonasaRate(5 * bpc, bpc)
  const fonasaHijos = fonasaRate(5 * bpc, bpc, 1)
  const hijoMensual = (PAYROLL_UY.hijoDeduccionBpc * bpc) / 12
  const cincuenta = computePayroll({ nominal: 50000 })

  return {
    intro:
      `Entre el salario mínimo (${pesos(SUELDO_TABLA_SMN)}) y ${pesos(ultimo)} nominales te ` +
      `queda en mano el ${pctUy(fila(SUELDO_TABLA_SMN).quedaPct)}: te descuentan ` +
      `${pctUy(PAYROLL_UY.jubilatorioRate)} de aporte jubilatorio, ${pctUy(fonasaSolo)} de ` +
      `FONASA y ${pctUy(PAYROLL_UY.frlRate)} de FRL, y la retención de IRPF da cero. Por encima ` +
      `empieza el IRPF: de ${pesos(80000)} nominales quedan ${pesosRedondo(fila(80000).liquido)} ` +
      `y de ${pesos(100000)}, ${pesosRedondo(fila(100000).liquido)}.`,
    supuestos:
      `Valores ${anio} para un trabajador dependiente sin hijos ni cónyuge a cargo y sin otras ` +
      `deducciones, con la BPC de ${pesos(bpc)}. Si tu caso es otro, cargalo en la calculadora ` +
      'de arriba.',
    familia:
      `Con hijos a cargo, si ganás más de 2,5 BPC (${pesos(2.5 * bpc)}), tu FONASA sube de ` +
      `${pctUy(fonasaSolo)} a ${pctUy(fonasaHijos)}; en todos los casos sumás ` +
      `una deducción de IRPF de ${PAYROLL_UY.hijoDeduccionBpc} BPC al año por hijo ` +
      `(${pesos(hijoMensual)} por mes). La deducción baja el IRPF, pero el FONASA más alto se ` +
      'descuenta igual, pagues IRPF o no.',
    familiaComparacion:
      `Por eso, con un hijo, de ${pesos(50000)} y de ${pesos(120000)} nominales cobrás menos ` +
      `que sin cargas: a ${pesos(50000)} no te retienen IRPF, así que la deducción no tiene de ` +
      `dónde restar, y a ${pesos(120000)} el nominal ` +
      `pasa 15 BPC (${pesos(PAYROLL_UY.creditThresholdBpcMonthly * bpc)}) y la deducción vale ` +
      `el ${pctUy(PAYROLL_UY.creditRateHigh)} y no el ${pctUy(PAYROLL_UY.creditRateLow)}.`,
    pasoCierre:
      `Con ${pesos(50000)} nominales la cuenta termina antes: los aportes son ` +
      `${pesos(cincuenta.aportes)}, la escala da ${pesos(cincuenta.irpf.grossTax)} y el crédito ` +
      `(${pesos(cincuenta.irpf.credit)}) la cubre entera, así que no te retienen IRPF y quedan ` +
      `${pesosRedondo(cincuenta.liquido)}.`,
  }
}

/** Preguntas que la página no contestaba, con las cifras de las tablas. */
export function sueldoLiquidoFaqExtra(anio: number): Array<{ q: string; a: string }> {
  const bpc = URUGUAY.bpc
  const at = (nominal: number) => computePayroll({ nominal })
  const smn = at(SUELDO_TABLA_SMN)
  const sesenta = at(60000)
  const primerConIrpf = ultimoNominalSinIrpf() + 1
  return [
    {
      q: '¿El sueldo nominal es lo que cobro en mano?',
      a:
        'No. El nominal es el sueldo antes de los descuentos, el que figura en el contrato; en ' +
        'mano cobrás el líquido, que es el nominal menos los aportes (jubilatorio, FONASA y FRL) ' +
        `y, si corresponde, el IRPF. Por ejemplo, ${pesos(50000)} nominales son ` +
        `${pesosRedondo(at(50000).liquido)} líquidos en ${anio}, sin hijos ni cónyuge a cargo.`,
    },
    {
      q: `¿Cuánto es el salario mínimo líquido en ${anio}?`,
      a:
        `El salario mínimo nacional es ${pesos(SUELDO_TABLA_SMN)} nominales por mes desde el ` +
        `${SUELDO_TABLA_SMN_DESDE} (${SUELDO_TABLA_SMN_DECRETO}). Descontados el aporte ` +
        `jubilatorio, FONASA y el FRL quedan ${pesosRedondo(smn.liquido)} en mano; no paga IRPF.`,
    },
    {
      q: `¿Cuánto son ${pesos(60000)} nominales en mano?`,
      a:
        `${pesosRedondo(sesenta.liquido)} en ${anio}, sin hijos ni cónyuge a cargo: te ` +
        `descuentan ${pesosRedondo(sesenta.aportes)} de aportes y no te retienen IRPF. ` +
        `${pesos(80000)} nominales son ${pesosRedondo(at(80000).liquido)} y ${pesos(100000)}, ` +
        `${pesosRedondo(at(100000).liquido)}.`,
    },
    {
      q: '¿Desde qué sueldo me descuentan IRPF?',
      a:
        `La escala del IRPF empieza en 7 BPC (${pesos(7 * bpc)} por mes en ${anio}), pero sin ` +
        'hijos ni otras deducciones la retención recién aparece en ' +
        `${pesos(primerConIrpf)} nominales: hasta ahí el crédito del ` +
        `${pctUy(PAYROLL_UY.creditRateLow)} sobre tus aportes cubre lo que da la escala.`,
    },
  ]
}

/** Las fuentes que se suman a las de la página, releídas el `SUELDO_TABLA_VERIFIED_AT`. */
export const SUELDO_TABLA_SOURCES = Object.freeze([
  {
    label:
      'BPS — Comunicado R 5/2026: escala mensual del IRPF, tasa de deducción y deducción por hijo',
    url: 'https://www.bps.gub.uy/23860/2026---comunicado-r-5---valores-escalas-irpf-2026.html',
  },
  {
    label: 'IMPO — Decreto 148/007, art. 63: retención mensual (6 % por encima de 10 BPC)',
    url: 'https://www.impo.com.uy/bases/decretos/148-2007/63',
  },
  {
    label: 'IMPO — Texto Ordenado 2023, Título 7, art. 49: tasa de deducción y deducción por hijo',
    url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/49_T7',
  },
  {
    label: 'BPS — Valores actuales: BPC, salario mínimo nacional y tope de aportación',
    url: 'https://www.bps.gub.uy/5478/',
  },
  {
    label: 'BPS — Fondo de Reconversión Laboral (FRL): aporte personal 0,10 %',
    url: 'https://www.bps.gub.uy/10322/fondo-reconversion-laboral-frl.html',
  },
  {
    label: 'IMPO — Decreto 319/025: salario mínimo nacional',
    url: 'https://www.impo.com.uy/bases/decretos/319-2025',
  },
])
