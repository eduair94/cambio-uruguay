// app/utils/salarioVacacional.ts
// Datos de /salario-vacacional-uruguay: cuántos días de licencia le tocan a cada trabajador, cuándo
// se paga el salario vacacional y cuánto es el mínimo que fija la ley.
//
// POR QUÉ EXISTE: el sitio ya contesta «cuándo se cobra el aguinaldo»
// (/cuando-se-cobra-el-aguinaldo-uruguay) y ya calcula el sueldo líquido, pero la otra partida anual
// —la licencia y su salario vacacional— aparecía sólo como una línea suelta dentro de la calculadora
// de sueldo. La pregunta que se busca en enero y en febrero es concreta: cuántos días me tocan,
// cuándo me lo tienen que pagar y por qué el número que me depositaron es menor al sueldo de esos
// días. Las tres tienen respuesta en la norma, y ninguna estaba escrita.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA: ningún porcentaje de retención. El salario vacacional está
// alcanzado por el IRPF y la DGI lo grava «aplicando una tasa proporcional equivalente a la tasa
// marginal máxima» que le tocó al resto de las rentas de trabajo de esa persona: es un número propio
// de cada recibo, no una tasa publicable. Tampoco se publica ningún monto en pesos: el jornal
// líquido de vacaciones sale de cada liquidación.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-28 (ver SALARIO_VACACIONAL_SOURCES para la lista):
//   - Ley 12.590 (1958), arts. 1, 2 y 25 — licencia anual de 20 días, día complementario por
//     antigüedad, y pago del jornal antes de empezar la licencia.
//   - Ley 16.101 (10/11/1989), arts. 4 y 5 — crea la «suma para el mejor goce de la licencia»:
//     mínimo 100 % del jornal líquido de vacaciones, pagada antes del inicio y en proporción a los
//     días.
//   - Decreto 615/989, arts. 3 y 4 — define el jornal líquido de vacaciones y la exención.
//   - MTSS, «Régimen de licencia» y «Salario vacacional» — la lectura oficial vigente.
//   - DGI, «IRPF para trabajadores dependientes» — la suma para el mejor goce de la licencia integra
//     los ingresos comprendidos y se grava aparte del resto.

export interface SalarioVacacionalSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const SALARIO_VACACIONAL_VERIFIED_AT = '2026-08-28'

/** Licencia anual mínima, en días, para cualquier trabajador de la actividad privada (Ley 12.590, art. 1). */
export const LICENCIA_BASE_DIAS = 20

/** Años de servicio en la misma empresa a partir de los cuales corre el día complementario (Ley 12.590, art. 2). */
export const ANTIGUEDAD_PRIMER_DIA_EXTRA = 5

/** Cada cuántos años de antigüedad se suma otro día complementario (Ley 12.590, art. 2). */
export const ANTIGUEDAD_CADA_ANIOS = 4

// ---------------------------------------------------------------------------
// Cuántos días
// ---------------------------------------------------------------------------

/**
 * Días de licencia anual que corresponden según los años de servicio en la misma empresa.
 *
 * La base son 20 días (Ley 12.590, art. 1). El art. 2 da «un día complementario de licencia por cada
 * cuatro años de antigüedad» a quienes tienen más de cinco años en la misma empresa, y el MTSS lo
 * explicita como el escalón que efectivamente se aplica: al cumplir cinco años se genera un día
 * adicional, y después uno más cada cuatro años. No hay tope.
 *
 * Cuenta la antigüedad en la MISMA empresa, y el art. 2 aclara que el cambio de propietario no la
 * corta. Años negativos o no numéricos se leen como cero: la función no puede devolver menos que el
 * mínimo legal.
 */
export function diasDeLicencia(aniosDeAntiguedad: number): number {
  const anios = Number.isFinite(aniosDeAntiguedad) ? Math.max(0, Math.floor(aniosDeAntiguedad)) : 0
  if (anios < ANTIGUEDAD_PRIMER_DIA_EXTRA) return LICENCIA_BASE_DIAS
  const extras = 1 + Math.floor((anios - ANTIGUEDAD_PRIMER_DIA_EXTRA) / ANTIGUEDAD_CADA_ANIOS)
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
  [0, 5, 9, 13, 17, 21].map(desdeAnios => ({
    desdeAnios,
    dias: diasDeLicencia(desdeAnios),
    detail:
      desdeAnios === 0
        ? 'El mínimo legal, para todo trabajador de la actividad privada, sin importar la antigüedad.'
        : `A los ${desdeAnios} años de servicio en la misma empresa. El cambio de dueño de la empresa no corta la antigüedad.`,
  }))
)

// ---------------------------------------------------------------------------
// Cuánto
// ---------------------------------------------------------------------------

/**
 * El jornal líquido de vacaciones: el jornal nominal de vacaciones menos los aportes a la seguridad
 * social y el impuesto a las retribuciones (Decreto 615/989, art. 3). Es la base sobre la que se
 * calcula el salario vacacional, y la razón por la que el salario vacacional siempre es menor que el
 * sueldo nominal de esos mismos días.
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
// Cuándo
// ---------------------------------------------------------------------------

export interface SalarioVacacionalHito {
  readonly key: 'derecho' | 'jornal' | 'suma'
  readonly label: string
  /** Cuándo ocurre, en el lenguaje de la norma. */
  readonly when: string
  /** Qué lo fija. */
  readonly source: string
  readonly detail: string
}

export const SALARIO_VACACIONAL_HITOS: readonly SalarioVacacionalHito[] = [
  {
    key: 'derecho',
    label: 'Se genera el derecho',
    when: 'Al completar 1 año, 24 quincenas o 52 semanas de labor',
    source: 'MTSS — Régimen de licencia (Ley 12.590)',
    detail:
      'Recién ahí hay licencia entera. Quien todavía no llegó a ese período genera licencia proporcional: se ajusta al año civil y corresponde la parte generada hasta el 31 de diciembre.',
  },
  {
    key: 'jornal',
    label: 'Se paga el jornal de la licencia',
    when: 'Antes de empezar la licencia, salvo los mensuales',
    source: 'Ley 12.590, art. 25',
    detail:
      'La remuneración de todo el período de licencia se hace efectiva antes de comenzarla. La excepción son los trabajadores con remuneración mensual, que la cobran con el sueldo del mes.',
  },
  {
    key: 'suma',
    label: 'Se paga el salario vacacional',
    when: 'Antes del inicio de la licencia y en proporción a los días',
    source: 'Ley 16.101, art. 5',
    detail:
      'La suma para el mejor goce de la licencia se abona antes de que la licencia empiece —no después, no con el sueldo del mes siguiente— y en proporción a los días que se van a gozar. Si la licencia se fracciona, cada tramo lleva su parte.',
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
      'La Ley 16.101 (art. 5) dice que la suma para el mejor goce de la licencia «deberá ser abonada antes del inicio de la licencia y en proporción a los días de duración de la misma». No es una partida de fin de año ni se cobra al volver: se paga antes de irte, junto con el jornal de la licencia, que por el art. 25 de la Ley 12.590 también se abona antes de comenzarla salvo para los trabajadores mensuales.',
  },
  {
    question: '¿Cuánto es el salario vacacional?',
    short: 'Mínimo, el 100 % del jornal líquido de vacaciones por día',
    answer:
      'El monto mínimo del beneficio equivale al 100 % del jornal líquido de vacaciones (Ley 16.101, art. 4), y se paga en proporción a los días de licencia. Es un mínimo legal: un convenio colectivo o el contrato pueden mejorarlo, nunca reducirlo.',
  },
  {
    question: '¿Por qué el salario vacacional me da menos que el sueldo de esos días?',
    short: 'Porque se calcula sobre el jornal LÍQUIDO, no sobre el nominal',
    answer:
      'Porque la base no es el jornal nominal. El Decreto 615/989 (art. 3) define el jornal líquido de vacaciones como el jornal nominal de vacaciones menos los aportes de contribución a la seguridad social y el impuesto a las retribuciones. El 100 % se aplica sobre ese líquido, así que el salario vacacional siempre queda por debajo del sueldo nominal de los mismos días.',
  },
  {
    question: '¿Cuántos días de licencia me corresponden?',
    short: '20 días, más 1 a los 5 años y 1 más cada 4 años',
    answer:
      'La licencia anual remunerada es de veinte días como mínimo (Ley 12.590, art. 1). A partir de los cinco años de servicio en la misma empresa se suma un día complementario, y después uno más cada cuatro años de antigüedad (art. 2), sin tope. El art. 2 aclara además que el cambio de propietario de la empresa no corta la antigüedad acumulada.',
  },
  {
    question: '¿El salario vacacional paga IRPF?',
    short: 'Sí, y se grava aparte del resto del sueldo',
    answer:
      'Sí. La DGI incluye la «suma para el mejor goce de la licencia anual» entre los ingresos comprendidos del IRPF de los trabajadores dependientes, y aclara que el aguinaldo y el salario vacacional obligatorios por disposiciones legales «se gravan de forma independiente de las restantes rentas de trabajo, aplicando una tasa proporcional equivalente a la tasa marginal máxima» aplicada a esos otros ingresos. Por eso esta página no publica un porcentaje: la tasa depende de la franja en la que caiga cada persona.',
  },
  {
    question: '¿Se puede partir la licencia en dos?',
    short: 'Sí, por convenio colectivo, y el tramo menor no baja de 10 días',
    answer:
      'El MTSS indica que, mediando convenio colectivo aprobado, la licencia puede fraccionarse en dos períodos continuos, y que el menor de ellos no puede ser inferior a diez días. Cuando se fracciona, el salario vacacional acompaña a cada tramo: se paga antes de cada uno y en proporción a sus días.',
  },
  {
    question: 'Me voy del trabajo. ¿Cobro la licencia y el salario vacacional?',
    short: 'Sí: la licencia no gozada se paga al egreso',
    answer:
      'Cuando termina la relación laboral se liquida la licencia generada y no gozada, junto con el salario vacacional que le corresponde. El derecho se genera con el trabajo cumplido, y quien no llegó al año completo genera la parte proporcional ajustada al año civil, según el régimen que describe el MTSS.',
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
      'Decreto 615/989, arts. 3 y 4 — define el jornal líquido de vacaciones (nominal menos aportes a la seguridad social y el impuesto a las retribuciones) y declara la suma libre de gravamen fiscal o social',
    url: 'https://www.impo.com.uy/bases/decretos/615-1989',
  },
  {
    label:
      'Ley 12.590 (1958), arts. 1, 2 y 25 — licencia anual de veinte días, día complementario por cada cuatro años de antigüedad después de los cinco, y pago del jornal antes de comenzar la licencia',
    url: 'https://www.impo.com.uy/bases/leyes/12590-1958',
  },
  {
    label:
      'MTSS — «Régimen de licencia»: generación del derecho (1 año, 24 quincenas o 52 semanas), licencia proporcional y fraccionamiento por convenio colectivo',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/derecho-laboral-uruguayo/regimen-licencia',
  },
  {
    label:
      'MTSS — «Salario vacacional»: el 100 % del jornal líquido y el momento de pago, con las normas que lo rigen',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/derecho-laboral-uruguayo/salario-vacacional',
  },
  {
    label:
      'DGI — «IRPF para trabajadores dependientes»: la suma para el mejor goce de la licencia integra los ingresos comprendidos y se grava a la tasa marginal máxima, independiente del resto de las rentas de trabajo',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-para-trabajadores-dependientes',
  },
]
