// app/utils/salarioVacacional.ts
// Datos de /salario-vacacional-uruguay: cuántos días de licencia le tocan a cada trabajador, cuándo
// se paga el salario vacacional, cuánto es el mínimo que fija la ley y el simulador que lo calcula.
//
// POR QUÉ EXISTE: el sitio ya contesta «cuándo se cobra el aguinaldo»
// (/cuando-se-cobra-el-aguinaldo-uruguay) y ya calcula el sueldo líquido, pero la otra partida anual
// —la licencia y su salario vacacional— aparecía sólo como una línea suelta dentro de la calculadora
// de sueldo. La pregunta que se busca en enero y en febrero es concreta: cuántos días me tocan,
// cuándo me lo tienen que pagar y por qué el número que me depositaron es menor al sueldo de esos
// días. Las tres tienen respuesta en la norma, y ninguna estaba escrita.
//
// SEGUNDA PASADA (2026-09-22), contrastada contra IMPO, MTSS, DGI y BPS:
//   - La escala por antigüedad estaba mal: publicaba un día extra a los 5, 9, 13, 17 años. La
//     Ley 12.590 (art. 2) da «un día complementario por cada cuatro años de antigüedad» a quien
//     tiene más de cinco años, y el MTSS lo lee así: «al quinto año de trabajo se genera un día…
//     al octavo año, el trabajador generó dos días; a los doce años, tres días». O sea 5/8/12/16/20,
//     que es lo que ahora devuelve `diasDeLicencia` (extras = floor(años / 4) con años >= 5).
//   - El «impuesto a las retribuciones» que resta el Decreto 615/989 (art. 3) es el IRP, derogado
//     por la Ley 18.083 (art. 1) en 2007. Ninguna norma posterior dice si la retención de IRPF
//     ocupa su lugar en el jornal líquido; la FAQ del MTSS sólo dice «se le hacen los descuentos».
//     El simulador lo expone como opción etiquetada, no como hecho.
//   - Se suma un simulador: reusa `computePayroll` (utils/payroll.ts) para los aportes personales
//     del mes, y aplica la fórmula operativa del MTSS para un mensual: (sueldo − descuentos) ÷ 30 ×
//     días de licencia. Los aportes y la BPC ya están auditados ahí; no se vuelven a declarar.
//   - No hubo ningún cambio legal de la licencia anual ni del salario vacacional con vigencia 2026.
//     La única novedad reciente que el MTSS lista en su régimen de licencia es el subsidio por
//     paternidad de la Ley 20.312, que es del 2 de agosto de 2024 y no toca la licencia anual.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA: ningún porcentaje fijo de IRPF sobre el salario
// vacacional. La DGI lo grava «aplicando una tasa proporcional equivalente a la tasa marginal
// máxima» que le tocó al resto de las rentas de trabajo de esa persona (Decreto 148/007, art. 55
// bis): el simulador la ESTIMA a partir del nominal mensual que el lector escribe, y lo dice.
//
// FUENTES PRIMARIAS, verificadas el 2026-09-22 (ver SALARIO_VACACIONAL_SOURCES para la lista):
//   - Ley 12.590 (1958), arts. 1, 2, 4, 10 y 25 — licencia anual de 20 días, día complementario
//     por antigüedad, generación del derecho, jornal de vacaciones y pago antes de la licencia.
//   - Ley 16.101 (10/11/1989), arts. 4 y 5 — crea la «suma para el mejor goce de la licencia»:
//     mínimo 100 % del jornal líquido de vacaciones, pagada antes del inicio y en proporción a los
//     días.
//   - Decreto 615/989, arts. 3, 4, 6 y 7 — jornal líquido, exención, pago antes y fraccionamiento.
//   - Ley 13.556, art. 3 — el jornal se toma a los valores vigentes al momento de gozar la licencia.
//   - Decreto 49/000, arts. 1 y 2 — no remuneratorio y fuera de la base del aguinaldo.
//   - Ley 18.083, art. 1 — deroga el IRP.
//   - Decreto 148/007, arts. 48 y 55 bis, y Ley 19.321 — el IRPF sobre el salario vacacional.
//   - DGI, «IRPF para trabajadores dependientes» (11/06/2026) y Consultas 5934 y 6530.
//   - BPS, material ATyR (03/02/2023) — exento de contribuciones a la seguridad social.
//   - MTSS, «Régimen de licencia», «Salario vacacional» y «Preguntas frecuentes en materia laboral».

import { round } from './calculators'
import { computePayroll } from './payroll'

export interface SalarioVacacionalSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const SALARIO_VACACIONAL_VERIFIED_AT = '2026-09-22'

/** Licencia anual mínima, en días, para cualquier trabajador de la actividad privada (Ley 12.590, art. 1). */
export const LICENCIA_BASE_DIAS = 20

/** Años de servicio en la misma empresa a partir de los cuales corre el día complementario (Ley 12.590, art. 2). */
export const ANTIGUEDAD_PRIMER_DIA_EXTRA = 5

/** Cada cuántos años de antigüedad se suma otro día complementario (Ley 12.590, art. 2). */
export const ANTIGUEDAD_CADA_ANIOS = 4

/** Divisor del sueldo mensual para obtener el jornal de vacaciones (Ley 12.590, art. 10, lit. A). */
export const JORNAL_DIVISOR_MENSUAL = 30

// ---------------------------------------------------------------------------
// Cuántos días
// ---------------------------------------------------------------------------

/**
 * Días de licencia anual que corresponden según los años de servicio en la misma empresa.
 *
 * La base son 20 días (Ley 12.590, art. 1). El art. 2 da «un día complementario de licencia por cada
 * cuatro años de antigüedad» a quienes tienen más de cinco años en la misma empresa. El MTSS lo
 * traduce al calendario: «al quinto año de trabajo se genera un día de licencia por antigüedad…
 * al octavo año, el trabajador generó dos días; a los doce años, tres días», y de ahí uno más cada
 * cuatro (16, 20, 24…). No hay tope. El día que se genera un año se goza al siguiente.
 *
 * Cuenta la antigüedad en la MISMA empresa, y el art. 2 aclara que el cambio de propietario no la
 * corta. Años negativos o no numéricos se leen como cero: la función no puede devolver menos que el
 * mínimo legal.
 */
export function diasDeLicencia(aniosDeAntiguedad: number): number {
  const anios = Number.isFinite(aniosDeAntiguedad) ? Math.max(0, Math.floor(aniosDeAntiguedad)) : 0
  if (anios < ANTIGUEDAD_PRIMER_DIA_EXTRA) return LICENCIA_BASE_DIAS
  const extras = Math.floor(anios / ANTIGUEDAD_CADA_ANIOS)
  return LICENCIA_BASE_DIAS + extras
}

export interface LicenciaEscalon {
  /** Años de antigüedad en la misma empresa a partir de los cuales rige el escalón. */
  readonly desdeAnios: number
  readonly dias: number
  readonly detail: string
}

/**
 * Los primeros escalones de la escala, para mostrarlos en la página. Se derivan de
 * {@link diasDeLicencia} en vez de escribirse a mano: si la regla cambia, la tabla cambia con ella y
 * no queda una fila vieja contradiciendo a la función.
 */
export const LICENCIA_ESCALONES: readonly LicenciaEscalon[] = Object.freeze(
  [0, 5, 8, 12, 16, 20].map(desdeAnios => ({
    desdeAnios,
    dias: diasDeLicencia(desdeAnios),
    detail:
      desdeAnios === 0
        ? 'El mínimo legal, para todo trabajador de la actividad privada, sin importar la antigüedad.'
        : desdeAnios === ANTIGUEDAD_PRIMER_DIA_EXTRA
          ? 'Al cumplir cinco años en la misma empresa se genera el primer día complementario. El cambio de dueño de la empresa no corta la antigüedad.'
          : `A los ${desdeAnios} años de servicio en la misma empresa (un día más por cada cuatro años, según la lectura del MTSS). El día generado se goza al año siguiente.`,
  }))
)

// ---------------------------------------------------------------------------
// Cuánto
// ---------------------------------------------------------------------------

/**
 * El jornal líquido de vacaciones: el jornal nominal de vacaciones menos los aportes a la seguridad
 * social y el impuesto a las retribuciones (Decreto 615/989, art. 3; ese impuesto es el IRP,
 * derogado por la Ley 18.083). Es la base sobre la que se calcula el salario vacacional, y la razón
 * por la que el salario vacacional siempre es menor que el sueldo nominal de esos mismos días.
 */
export function jornalLiquidoDeVacaciones(jornalNominal: number, descuentos: number): number {
  const nominal = Number.isFinite(jornalNominal) ? Math.max(0, jornalNominal) : 0
  const desc = Number.isFinite(descuentos) ? Math.max(0, descuentos) : 0
  return Math.max(0, nominal - desc)
}

/**
 * El mínimo legal del salario vacacional: el 100 % del jornal líquido de vacaciones (Ley 16.101,
 * art. 4) por cada día de licencia que se goza, porque la suma se abona «en proporción a los días de
 * duración de la misma» (art. 5).
 *
 * Es un mínimo: un convenio colectivo o el contrato pueden fijar más, nunca menos.
 */
export function salarioVacacionalMinimo(jornalLiquido: number, diasGozados: number): number {
  const jornal = Number.isFinite(jornalLiquido) ? Math.max(0, jornalLiquido) : 0
  const dias = Number.isFinite(diasGozados) ? Math.max(0, diasGozados) : 0
  return jornal * dias
}

// ---------------------------------------------------------------------------
// Simulador
// ---------------------------------------------------------------------------

export interface SalarioVacacionalSimulacionInput {
  /** Sueldo nominal mensual en pesos (el del contrato, antes de descuentos). */
  readonly sueldoNominal: number
  /** Días de licencia que se van a gozar en este tramo. */
  readonly diasDeLicencia: number
  /** Hijos a cargo (mueven la tasa de FONASA). */
  readonly hijos?: number
  /** Cónyuge o concubino/a a cargo sin cobertura propia (mueve la tasa de FONASA). */
  readonly conyugeACargo?: boolean
  /**
   * HIPÓTESIS, no norma: restar también la retención de IRPF del mes al calcular el jornal líquido.
   * El Decreto 615/989 resta «el impuesto a las retribuciones» (el IRP, derogado en 2007) y ninguna
   * norma posterior dice si el IRPF ocupa su lugar; la FAQ del MTSS sólo dice «se le hacen los
   * descuentos». Por defecto NO se resta: sólo los aportes personales.
   */
  readonly restarIrpf?: boolean
  /** Valor de la BPC, por si cambia (por defecto la auditada en utils/calculators.ts). */
  readonly bpc?: number
}

export interface SalarioVacacionalSimulacion {
  readonly sueldoNominal: number
  readonly dias: number
  /** sueldo ÷ 30 (Ley 12.590, art. 10, lit. A). */
  readonly jornalNominal: number
  readonly jubilatorio: number
  readonly fonasa: number
  readonly fonasaRate: number
  readonly frl: number
  /** jubilatorio + FONASA + FRL del mes. */
  readonly aportes: number
  /** Retención de IRPF del mes sobre el sueldo (informativa; sólo se resta si `restarIrpf`). */
  readonly irpfRetenidoMes: number
  /** Lo que efectivamente se restó al sueldo para llegar al líquido: aportes, más IRPF si es hipótesis. */
  readonly descuentosAplicados: number
  readonly restarIrpf: boolean
  /** (sueldo − descuentos) ÷ 30. */
  readonly jornalLiquido: number
  /** jornal líquido × días: el mínimo legal (Ley 16.101, art. 4). */
  readonly salarioVacacional: number
  /**
   * Tasa marginal máxima de IRPF que alcanzó el sueldo nominal mensual, en %. Es la tasa
   * proporcional del art. 55 bis del Decreto 148/007; cero si el sueldo no genera impuesto.
   * Estimación: supone que ese sueldo es la única renta de trabajo de la persona.
   */
  readonly tasaMarginalMaxima: number
  /** salario vacacional × tasa marginal máxima. */
  readonly irpfSobreSalarioVacacional: number
  /** salario vacacional − IRPF sobre el salario vacacional. Sin aportes: la suma está exenta de CESS. */
  readonly neto: number
}

/**
 * Simula el salario vacacional mínimo de un trabajador MENSUAL de la actividad privada con la
 * fórmula operativa que publica el MTSS: «a ese sueldo mensual se le hacen los descuentos, se
 * divide entre 30 y lo que da se multiplica por [los días]». Los descuentos son los aportes
 * personales del mes (jubilatorio, FONASA y FRL) que ya calcula `computePayroll`; el IRPF del mes
 * sólo se resta como hipótesis etiquetada.
 *
 * Después estima el IRPF que la DGI retiene sobre el propio salario vacacional: una tasa
 * proporcional igual a la tasa marginal máxima que alcanzó el resto de las rentas de trabajo
 * (Decreto 148/007, art. 55 bis), cero si esas rentas no generan impuesto. Sobre el salario
 * vacacional no hay aportes al BPS (Decreto 615/989, art. 4; BPS ATyR 2023).
 *
 * Entradas no numéricas o negativas se leen como cero.
 */
export function simularSalarioVacacional(
  input: SalarioVacacionalSimulacionInput
): SalarioVacacionalSimulacion {
  const sueldo = Number.isFinite(input.sueldoNominal) ? Math.max(0, input.sueldoNominal) : 0
  const dias = Number.isFinite(input.diasDeLicencia) ? Math.max(0, input.diasDeLicencia) : 0
  const restarIrpf = !!input.restarIrpf

  const payroll = computePayroll({
    nominal: sueldo,
    hijos: input.hijos,
    conyugeACargo: input.conyugeACargo,
    bpc: input.bpc,
  })

  const descuentosAplicados = round(payroll.aportes + (restarIrpf ? payroll.irpf.tax : 0))
  const jornalNominal = round(sueldo / JORNAL_DIVISOR_MENSUAL)
  const jornalLiquido = round(
    jornalLiquidoDeVacaciones(sueldo, descuentosAplicados) / JORNAL_DIVISOR_MENSUAL
  )
  const salarioVacacional = round(salarioVacacionalMinimo(jornalLiquido, dias))

  // Art. 55 bis: la tasa proporcional es la marginal máxima de las demás rentas de trabajo, y es
  // cero cuando esas rentas no generan impuesto (después del crédito por deducciones).
  const tasaMarginalMaxima =
    payroll.irpf.tax > 0
      ? payroll.irpf.brackets.reduce((max, b) => (b.taxable > 0 ? Math.max(max, b.rate) : max), 0)
      : 0
  const irpfSobreSalarioVacacional = round((salarioVacacional * tasaMarginalMaxima) / 100)

  return {
    sueldoNominal: round(sueldo),
    dias,
    jornalNominal,
    jubilatorio: payroll.jubilatorio.amount,
    fonasa: payroll.fonasa.amount,
    fonasaRate: payroll.fonasa.rate,
    frl: payroll.frl.amount,
    aportes: payroll.aportes,
    irpfRetenidoMes: payroll.irpf.tax,
    descuentosAplicados,
    restarIrpf,
    jornalLiquido,
    salarioVacacional,
    tasaMarginalMaxima,
    irpfSobreSalarioVacacional,
    neto: round(salarioVacacional - irpfSobreSalarioVacacional),
  }
}

// ---------------------------------------------------------------------------
// Qué entra, qué no, y según qué régimen
// ---------------------------------------------------------------------------

export interface SalarioVacacionalRegimen {
  readonly id: 'mensual' | 'jornalero' | 'variable' | 'mixto'
  readonly label: string
  /** Cómo se obtiene el jornal de vacaciones (Ley 12.590, art. 10). */
  readonly jornal: string
  readonly source: string
}

/** Cómo se obtiene el jornal de vacaciones según la forma de remuneración (Ley 12.590, art. 10). */
export const SALARIO_VACACIONAL_REGIMENES: readonly SalarioVacacionalRegimen[] = [
  {
    id: 'mensual',
    label: 'Sueldo mensual',
    jornal:
      '1/30 del sueldo mensual. El MTSS lo aplica así: al sueldo se le hacen los descuentos, se divide entre 30 y se multiplica por los días que salís.',
    source: 'Ley 12.590, art. 10, lit. A; FAQ del MTSS',
  },
  {
    id: 'jornalero',
    label: 'Jornalero',
    jornal:
      'El jornal vigente al momento de gozar la licencia. El salario vacacional es el jornal líquido multiplicado por los días de licencia.',
    source: 'Ley 12.590, art. 10, lit. B; Ley 13.556, art. 3; FAQ del MTSS',
  },
  {
    id: 'variable',
    label: 'Remuneración variable (comisiones, destajo)',
    jornal:
      'El promedio: el total de salarios del año civil anterior dividido por las jornadas trabajadas en ese período, actualizado con los aumentos que hubo hasta la licencia.',
    source: 'Ley 12.590, art. 10, lit. C; Ley 13.556, art. 3',
  },
  {
    id: 'mixto',
    label: 'Fijo más variable',
    jornal: 'Al jornal del fijo se le acumula el promedio de la parte variable.',
    source: 'Ley 12.590, art. 10, lit. D',
  },
]

export interface SalarioVacacionalComponente {
  readonly id: string
  readonly concepto: string
  /** 'entra' | 'no-entra' | 'aparte' */
  readonly regla: 'entra' | 'no-entra' | 'aparte'
  readonly reglaLabel: string
  readonly detail: string
  readonly source: string
}

/** Qué integra la base del salario vacacional, qué se le aplica encima y qué queda afuera. */
export const SALARIO_VACACIONAL_COMPONENTES: readonly SalarioVacacionalComponente[] = [
  {
    id: 'horas-extras',
    concepto: 'Horas extras',
    regla: 'entra',
    reglaLabel: 'Entran en la base',
    detail:
      'Se computa el promedio de horas extras del año civil (o fracción) que generó la licencia, a la tarifa vigente al momento del pago.',
    source: 'Ley 15.996 y Decreto 550/989, según el MTSS',
  },
  {
    id: 'tickets',
    concepto: 'Tickets de alimentación',
    regla: 'entra',
    reglaLabel: 'Entran en la base',
    detail:
      'Tienen naturaleza salarial: se computan para la licencia, el salario vacacional y la indemnización por despido. No para el aguinaldo.',
    source: 'FAQ del MTSS (art. 167, Ley 16.713)',
  },
  {
    id: 'aumento',
    concepto: 'Aumento de sueldo antes de salir',
    regla: 'entra',
    reglaLabel: 'Entra: valores vigentes',
    detail:
      'El jornal de vacaciones se toma según las remuneraciones vigentes en el momento en que se goza la licencia; si hay aumento durante la licencia, se reliquida.',
    source: 'Ley 13.556, art. 3',
  },
  {
    id: 'aportes-bps',
    concepto: 'Aportes al BPS (jubilatorio, FONASA, FRL) sobre la suma',
    regla: 'no-entra',
    reglaLabel: 'No se descuentan',
    detail:
      'La suma para el mejor goce de la licencia está libre de todo gravamen fiscal o social: no es materia gravada para las contribuciones a la seguridad social.',
    source: 'Decreto 615/989, art. 4; BPS, material ATyR 2023',
  },
  {
    id: 'irpf',
    concepto: 'IRPF sobre la suma',
    regla: 'aparte',
    reglaLabel: 'Sí, y aparte',
    detail:
      'Se grava separado del resto de las rentas de trabajo, a una tasa proporcional igual a la tasa marginal máxima que alcanzó el resto del sueldo; cero si ese sueldo no paga IRPF.',
    source: 'Decreto 148/007, arts. 48 y 55 bis; Ley 19.321; DGI (11/06/2026)',
  },
  {
    id: 'convenio',
    concepto: 'Complemento por convenio o laudo (más del 100 % legal)',
    regla: 'aparte',
    reglaLabel: 'Vale, con otras reglas',
    detail:
      'El 100 % es un mínimo mejorable. Lo que exceda el importe legal entra a la escala progresiva del IRPF, y queda exento de aportes sólo si no supera el 100 % del legal y se paga junto con él.',
    source: 'Decreto 615/989, art. 5; DGI (11/06/2026); BPS, material ATyR 2023',
  },
  {
    id: 'aguinaldo',
    concepto: 'El salario vacacional dentro del aguinaldo',
    regla: 'no-entra',
    reglaLabel: 'No integra el aguinaldo',
    detail:
      'Es una partida no remuneratoria y no se computa para el cálculo del sueldo anual complementario.',
    source: 'Decreto 49/000, arts. 1 y 2',
  },
  {
    id: 'umbral-180',
    concepto: 'El umbral de 180 BPC del crédito por deducciones (14 % u 8 %)',
    regla: 'no-entra',
    reglaLabel: 'No cuenta',
    detail:
      'Para decidir si el crédito por deducciones del IRPF es del 14 % o del 8 % no se consideran ni el aguinaldo ni la suma para el mejor goce de la licencia.',
    source: 'Decreto 148/007, art. 58; DGI (11/06/2026)',
  },
]

// ---------------------------------------------------------------------------
// Cuándo
// ---------------------------------------------------------------------------

export interface SalarioVacacionalHito {
  readonly id: 'derecho' | 'jornal' | 'suma'
  readonly label: string
  /** Cuándo ocurre, en el lenguaje de la norma. */
  readonly when: string
  /** Qué lo fija. */
  readonly source: string
  readonly detail: string
}

export const SALARIO_VACACIONAL_HITOS: readonly SalarioVacacionalHito[] = [
  {
    id: 'derecho',
    label: 'Se genera el derecho',
    when: 'Al completar 12 meses, 24 quincenas o 52 semanas de trabajo',
    source: 'Ley 12.590, art. 4; MTSS — Régimen de licencia',
    detail:
      'Recién ahí hay licencia entera, y los meses cuentan con uno o varios patronos. Quien todavía no llegó a ese período genera licencia proporcional: se ajusta al año civil y corresponde la parte generada hasta el 31 de diciembre (el MTSS la calcula a 1,66 días por mes para un mensual).',
  },
  {
    id: 'jornal',
    label: 'Se paga el jornal de la licencia',
    when: 'Antes de empezar la licencia, salvo los mensuales',
    source: 'Ley 12.590, art. 25',
    detail:
      'La remuneración de todo el período de licencia se hace efectiva antes de comenzarla. La excepción son los trabajadores con remuneración mensual, que la cobran con el sueldo del mes.',
  },
  {
    id: 'suma',
    label: 'Se paga el salario vacacional',
    when: 'Antes del inicio de la licencia y en proporción a los días',
    source: 'Ley 16.101, art. 5; Decreto 615/989, arts. 6 y 7',
    detail:
      'La suma para el mejor goce de la licencia se abona antes de que la licencia empiece —no después, no con el sueldo del mes siguiente ni todo junto a fin de año— y en proporción a los días que se van a gozar. Si la licencia se fracciona, cada tramo lleva su parte. El último día para pagarla es, entonces, el día anterior al inicio de la licencia.',
  },
]

// ---------------------------------------------------------------------------
// Preguntas y fuentes
// ---------------------------------------------------------------------------

export interface SalarioVacacionalFaq {
  readonly question: string
  readonly short: string
  readonly answer: string
}

export const SALARIO_VACACIONAL_FAQ: readonly SalarioVacacionalFaq[] = [
  {
    question: '¿Cuándo se cobra el salario vacacional en Uruguay?',
    short: 'Antes de que empiece la licencia, no después',
    answer:
      'La Ley 16.101 (art. 5) dice que la suma para el mejor goce de la licencia «deberá ser abonada antes del inicio de la licencia y en proporción a los días de duración de la misma». No es una partida de fin de año ni se cobra al volver: se paga antes de irte, junto con el jornal de la licencia, que por el art. 25 de la Ley 12.590 también se abona antes de comenzarla salvo para los trabajadores mensuales. Si la licencia se parte en dos, cada tramo lleva su parte (Decreto 615/989, art. 7).',
  },
  {
    question: '¿Cuánto es el salario vacacional?',
    short: 'Mínimo, el 100 % del jornal líquido de vacaciones por día',
    answer:
      'El monto mínimo del beneficio equivale al 100 % del jornal líquido de vacaciones (Ley 16.101, art. 4), y se paga en proporción a los días de licencia. Para un mensual, el MTSS lo calcula así: al sueldo se le hacen los descuentos, se divide entre 30 y se multiplica por los días que salís; para un jornalero, jornal líquido por días de licencia. Es un mínimo legal: un convenio colectivo o el contrato pueden mejorarlo, nunca reducirlo.',
  },
  {
    question: '¿Por qué el salario vacacional me da menos que el sueldo de esos días?',
    short: 'Porque se calcula sobre el jornal LÍQUIDO, no sobre el nominal',
    answer:
      'Porque la base no es el jornal nominal. El Decreto 615/989 (art. 3) define el jornal líquido de vacaciones como el jornal nominal de vacaciones menos los aportes de contribución a la seguridad social y el impuesto a las retribuciones (ese impuesto, el IRP, está derogado desde 2007 por la Ley 18.083). El 100 % se aplica sobre ese líquido, así que el salario vacacional siempre queda por debajo del sueldo nominal de los mismos días. Y encima el propio salario vacacional paga IRPF, aparte.',
  },
  {
    question: '¿Cuántos días de licencia me corresponden?',
    short: '20 días; 21 a los 5 años, 22 a los 8, 23 a los 12, y uno más cada 4',
    answer:
      'La licencia anual remunerada es de veinte días como mínimo (Ley 12.590, art. 1). Quien tiene más de cinco años de servicio en la misma empresa suma un día complementario por cada cuatro años de antigüedad (art. 2), sin tope: según la lectura del MTSS, un día al quinto año, dos al octavo, tres a los doce, y así cada cuatro años. El día que se genera un año se goza al siguiente, y el cambio de propietario de la empresa no corta la antigüedad acumulada.',
  },
  {
    question: '¿El salario vacacional paga IRPF o aportes al BPS?',
    short: 'Aportes no; IRPF sí, y se grava aparte del resto del sueldo',
    answer:
      'Aportes al BPS, no: la suma está libre de todo gravamen fiscal o social (Decreto 615/989, art. 4) y el BPS la trata como no gravada por las contribuciones a la seguridad social. IRPF, sí: el Decreto 148/007 (art. 48) la incluye entre las rentas del trabajo, y desde la Ley 19.321 el aguinaldo y el salario vacacional obligatorios por ley se gravan de forma independiente del resto, a una tasa proporcional igual a la tasa marginal máxima que alcanzaron esos otros ingresos, cero si no generan impuesto (art. 55 bis). Lo que un convenio agregue por encima del mínimo legal entra a la escala progresiva común.',
  },
  {
    question: '¿Se puede partir la licencia en dos?',
    short: 'Sí, por convenio colectivo, y el tramo menor no baja de 10 días',
    answer:
      'La Ley 12.590 (art. 1) manda gozar la licencia en un solo período continuado, y habilita a dividirla en dos períodos continuos mediando convenio colectivo aprobado, con el menor no inferior a diez días. Cuando se fracciona, el salario vacacional acompaña a cada tramo: se paga antes de cada uno y en proporción a sus días (Decreto 615/989, art. 7).',
  },
  {
    question: 'Me voy del trabajo. ¿Cobro la licencia y el salario vacacional?',
    short: 'Sí: la licencia no gozada se paga al egreso, con IRPF',
    answer:
      'Cuando termina la relación laboral se liquida la licencia generada y no gozada, que según el MTSS se paga sin descuentos de aportes, junto con el salario vacacional que le corresponde. Quien no llegó al año completo cobra la parte proporcional ajustada al año civil. Ojo con el impuesto: la DGI (Consulta 6530, 2023) considera que la licencia no gozada y el salario vacacional pagados al egreso están gravados por IRPF.',
  },
]

export const SALARIO_VACACIONAL_SOURCES: readonly SalarioVacacionalSource[] = [
  {
    label:
      'Ley 16.101 (10/11/1989), arts. 4 y 5 — «suma para el mejor goce de la licencia»: mínimo 100 % del jornal líquido de vacaciones, abonada antes del inicio de la licencia y en proporción a sus días',
    url: 'https://www.impo.com.uy/bases/leyes/16101-1989',
  },
  {
    label:
      'Decreto 615/989, arts. 3 a 7 — define el jornal líquido de vacaciones, declara la suma libre de gravamen fiscal o social, valida los regímenes más favorables y fija el pago antes de la licencia y por tramo',
    url: 'https://www.impo.com.uy/bases/decretos/615-1989',
  },
  {
    label:
      'Ley 12.590 (1958), arts. 1, 2, 4, 10 y 25 — licencia anual de veinte días, día complementario por cada cuatro años de antigüedad después de los cinco, generación del derecho, jornal de vacaciones según la forma de remuneración y pago del jornal antes de comenzar la licencia',
    url: 'https://www.impo.com.uy/bases/leyes/12590-1958',
  },
  {
    label:
      'Ley 13.556 (26/10/1966), art. 3 — el jornal de vacaciones se toma según las remuneraciones vigentes en el momento en que se goza la licencia, con reliquidación si hay aumento',
    url: 'https://www.impo.com.uy/bases/leyes/13556-1966',
  },
  {
    label:
      'Decreto 49/000 (09/02/2000), arts. 1 y 2 — el salario vacacional es no remuneratorio y no se computa para el sueldo anual complementario',
    url: 'https://www.impo.com.uy/bases/decretos/49-2000',
  },
  {
    label:
      'Ley 18.083 (27/12/2006), art. 1 — deroga el Impuesto a las Retribuciones Personales (IRP)',
    url: 'https://www.impo.com.uy/bases/leyes/18083-2006',
  },
  {
    label:
      'Decreto 148/007, arts. 48, 55 bis y 58 — la suma para el mejor goce de la licencia integra las rentas del trabajo; se grava a una tasa proporcional igual a la marginal máxima del resto (art. 55 bis, agregado por el Decreto 154/015); no cuenta para el umbral de 180 BPC',
    url: 'https://www.impo.com.uy/bases/decretos/148-2007',
  },
  {
    label:
      'Ley 19.321 (29/05/2015) — ajuste del IRPF en la liquidación del aguinaldo y el salario vacacional',
    url: 'https://www.impo.com.uy/bases/leyes/19321-2015',
  },
  {
    label:
      'DGI — Consulta 5934 (2016): el salario vacacional es objeto de retención de IRPF y se imputa al mes en que deba pagarse',
    url: 'https://www.impo.com.uy/bases/consultas-tributarias/5934-2016',
  },
  {
    label:
      'DGI — Consulta 6530 (2023): licencia no gozada y salario vacacional pagados al egreso, gravados por IRPF',
    url: 'https://www.impo.com.uy/bases/consultas-tributarias/6530-2023',
  },
  {
    label:
      'DGI — «IRPF para trabajadores dependientes» (11/06/2026): aguinaldo y salario vacacional se gravan aparte, a la tasa marginal máxima; el excedente sobre lo legal entra a la escala',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-para-trabajadores-dependientes',
  },
  {
    label:
      'BPS — Tributación y recaudación de CESS, material ATyR (03/02/2023): el salario vacacional está exento de todo gravamen fiscal o social; complementos exentos si no superan el 100 % del legal',
    url: 'https://www.bps.gub.uy/bps/file/20110/37/20230203-material-atyr.pdf',
  },
  {
    label:
      'MTSS — «Régimen de licencia»: generación del derecho, la escala por antigüedad (1 día al quinto año, 2 al octavo, 3 a los doce), horas extras en el jornal de licencia, egreso y seguro de paro',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/derecho-laboral-uruguayo/regimen-licencia',
  },
  {
    label:
      'MTSS — «Salario vacacional»: el 100 % del jornal líquido y el momento de pago, con las normas que lo rigen',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/derecho-laboral-uruguayo/salario-vacacional',
  },
  {
    label:
      'MTSS — «Preguntas frecuentes en materia laboral»: la fórmula del mensual (descuentos, ÷ 30, × días) y del jornalero, la licencia proporcional y los tickets de alimentación',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/preguntas-frecuentes/materia-laboral',
  },
  {
    label:
      'BPS — Tasas de aportes personales (jubilatorio 15 %, FONASA por franja y situación familiar, FRL 0,10 %), las que usa el simulador',
    url: 'https://www.bps.gub.uy/10314/tasas-fonasa.html',
  },
  {
    label:
      'Ley 18.572, art. 29 — recargo automático del 10 % sobre los créditos laborales impagos desde su exigibilidad',
    url: 'https://www.impo.com.uy/bases/leyes/18572-2009',
  },
]
