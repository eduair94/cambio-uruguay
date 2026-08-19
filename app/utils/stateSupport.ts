// app/utils/stateSupport.ts
// Lo que el Estado uruguayo pone encima de un sueldo bajo: transferencias, tarifas sociales y
// servicios, con la norma, el monto y la fecha de cada uno.
//
// POR QUÉ EXISTE. `lowWage.ts` contesta «¿alcanza?» y la respuesta, con el mínimo nacional,
// alquilando y solo en Montevideo, es que no: la resta da negativa. Esa página quedaba ahí, y
// quedarse ahí es un error de utilidad: la gente que cobra esto no está buscando que le
// confirmemos que no se puede, está buscando cómo se hace. Y una parte grande del cómo no es
// administración doméstica sino ingreso que ya existe, está escrito en una ley, y no se cobra
// porque nadie lo pidió. Este módulo es esa parte.
//
// LA REGLA DE LA CASA, otra vez: ningún monto sin fuente y sin fecha. Todo lo que sigue es una
// norma citada por artículo, una tabla publicada por BPS/MIDES/UTE/OSE con su vigencia, o una
// cuenta nuestra declarada como tal (las cuentas nuestras son dos: pasar los BPC a pesos, y
// resolver la fórmula del artículo 4 de la Ley 18.227).
//
// EL HALLAZGO CENTRAL DE ESTE MÓDULO, y la razón por la que la página cambia de tono sin mentir:
// la red uruguaya está construida alrededor de los NIÑOS y de la vulnerabilidad medida. Casi todo
// lo que mueve la aguja —asignaciones, Tarjeta Uruguay Social, el 85 % de la factura de UTE, el
// agua a $ 156,76— se activa por tener menores a cargo o por calificar por el Índice de Carencias
// Críticas del MIDES. El resultado, dicho sin vueltas: un hogar de dos adultos con un solo sueldo
// mínimo y dos hijos puede sumar varios miles de pesos por mes que hoy no cobra, mientras que una
// persona sola de 25 años con ese mismo sueldo cae en un hueco casi vacío. Las dos cosas son
// ciertas al mismo tiempo y la página tiene que decir las dos, porque quien lee es una o la otra.
//
// LO QUE NO SE AFIRMA. No decimos «te corresponde»: decimos qué dice la norma y qué evalúa el
// organismo. La elegibilidad de la Tarjeta Uruguay Social y de la Asignación Familiar del Plan de
// Equidad no se calcula con una fórmula pública de ingresos —se determina con el ICC, que pondera
// vivienda, entorno, composición del hogar y situación sanitaria (Ley 18.227 art. 2)—, así que
// cualquier calculadora que prometa un sí o un no sobre eso está inventando. Acá se separan las
// dos cosas: lo que se puede computar (la asignación contributiva, que sí tiene topes en pesos, y
// el monto que pagaría cada régimen) y lo que sólo puede decidir el MIDES (el ICC), donde la
// respuesta correcta es «pedí la evaluación», no un número.
//
// FUENTES, verificadas el 2026-08-19:
//   - BPS, «Asignación familiar» (Decreto-Ley 15.084): tabla de montos y topes con vigencia
//     1/2026 — $ 1.347 por beneficiario hasta $ 50.502 de ingresos familiares y $ 674 hasta
//     $ 84.688; el tope sube 1,2338 BPC ($ 8.468,80) por cada beneficiario adicional a partir del
//     tercero, y en ese tramo se paga la segunda franja; doble por discapacidad; incompatible con
//     cualquier otra asignación familiar.
//     https://www.bps.gub.uy/5470/asignacion-familiar.html
//   - BPS, «Plan de equidad» (Ley 18.227): $ 2.686,51 por el primer beneficiario, $ 1.151,38 de
//     complemento por el primero que curse nivel intermedio y $ 3.837,90 por beneficiario con
//     discapacidad, vigencia 1/2026.
//     https://www.bps.gub.uy/3540/plan-de-equidad.html
//   - IMPO, Ley 18.227: art. 2 (qué es «hogar» y qué pondera la vulnerabilidad), art. 4 (la
//     fórmula: $ 700 por el número de beneficiarios elevado a 0,6, dividido entre esa cantidad;
//     $ 300 igual para los de educación media; $ 1.000 por discapacidad), art. 6 (escolaridad y
//     controles médicos), art. 9 (incompatibilidad con el Decreto-Ley 15.084 y opción por ésta en
//     todo momento) y art. 10 (los valores son de enero de 2008 y se ajustan por IPC).
//     https://www.impo.com.uy/bases/leyes/18227-2007
//   - MIDES, «Tarjeta Uruguay Social»: montos de enero de 2026 por cantidad de menores en
//     modalidad simple y duplicada, adicionales por menores de 0 a 3 años y por embarazo, las dos
//     vías de acceso (primer veintil / poblaciones específicas) y la exoneración de IVA en las
//     compras.
//     https://www.gub.uy/ministerio-desarrollo-social/politicas-y-gestion/programas/tarjeta-uruguay-social
//   - MIDES, «Tarifas de servicios para beneficiarios de transferencias MIDES» y «Tarifa social
//     electricidad»: Bono Social de UTE (90 % TUS duplicada, 85 % TUS simple, 80 % AFAM-PE y
//     Asistencia a la Vejez), potencia contratada de hasta 4,5 kW, topes de 250 y 300 kWh, y que
//     se aplica solo, sin trámite; tarifa social de OSE ($ 156,76 hasta 15 m³).
//     https://www.gub.uy/ministerio-desarrollo-social/comunicacion/publicaciones/tarifas-servicios-para-beneficiarios-transferencias-mides
//     https://www.gub.uy/ministerio-desarrollo-social/node/9143
//   - MIDES, «Uruguay Trabaja» (Ley 18.240): 30 horas semanales hasta 9 meses con un apoyo a la
//     inserción laboral de 2,35 BPC.
//     https://www.gub.uy/ministerio-desarrollo-social/politicas-y-gestion/programas/uruguay-trabaja
//   - MVOT, trámite «FGA: Garantía de alquiler»: ingreso líquido del núcleo de 15 a 100 UR (30 a
//     100 en el plan joven), garantía de hasta 18 UR (21 en vivienda promovida), 120 días para
//     buscar vivienda, sin costo, y las exclusiones.
//     https://www.gub.uy/tramites/fga-garantia-alquiler
//   - DGI, «Unidad Reajustable»: julio de 2026, $ 1.923,44 (el valor de cada mes rige el mes
//     siguiente, o sea que es el que corre en agosto de 2026).
//     https://www.gub.uy/direccion-general-impositiva/datos-y-estadisticas/datos/unidad-reajustable-ur
//   - MSP, trámite «Carné de salud»: sin costo para usuarios de ASSE, 0,4 UR para el resto.
//     https://www.gub.uy/tramites/carne-salud
//   - INDA (MIDES), trámite «Solicitud de acceso a Programa INDA»: Sistema Nacional de Comedores y
//     apoyo a enfermos crónicos, sin costo, 0800 7263.
//     https://www.gub.uy/tramites/solicitud-acceso-programa-inda
//   - MIEM, «Programa Canasta de Servicios»: subsidio de acceso a luz, agua y gas más equipamiento
//     y conectividad para hogares con ICC en barrios con intervención de vivienda.
//     https://www.miem.gub.uy/energia/programa-canasta-de-servicios
//   - Presidencia / MIEM: prórroga del 50 % en recargas de garrafas de 13 kg para beneficiarios
//     MIDES. La última prórroga que pudimos verificar llega al 31/12/2025: por eso el programa va
//     marcado como «confirmar vigencia» y no se suma a ningún total.
//     https://www.gub.uy/presidencia/comunicacion/noticias/gobierno-extiende-descuento-50-garrafas-13-kilos-para-beneficiarios-del-mides
//   - BPS, «Fonasa» y «Afiliación mutual trabajadores»: el amparo del trabajador alcanza a los
//     hijos menores de 18 o con discapacidad y a los hijos del cónyuge no amparados.
//     https://www.bps.gub.uy/10310/fondo-nacional-de-salud-fonasa.html
//   - Intendencia de Montevideo, «Tarjetas STM»: escolares gratis con túnica de lunes a viernes,
//     estudiantes categoría A con viajes subsidiados, y Tarjeta de Gestión Social.
//     https://montevideo.gub.uy/areas-tematicas/sistema-de-transporte-metropolitano/tarjetas-stm
//
// Módulo PURO (sin Vue ni Nuxt) para que la página y los tests compartan una sola fuente.

import { URUGUAY } from './calculators'

/** Fecha en que se contrastaron normas, montos y trámites contra las fuentes de arriba. */
export const STATE_SUPPORT_VERIFIED_AT = '2026-08-19'

/** BPC vigente, tomada del módulo de calculadoras para no tener dos verdades en el repo. */
export const BPC = URUGUAY.bpc

/**
 * Unidad Reajustable que rige en agosto de 2026. La DGI publica el valor de cada mes y aclara que
 * «el valor de la UR de cada mes es el que se aplicará durante el mes siguiente»: el de julio,
 * $ 1.923,44, es el que corre hoy. Está acá porque el requisito de ingreso del Fondo de Garantía
 * de Alquiler está escrito en UR y sin convertirlo no se entiende a quién deja afuera.
 */
export const UR = Object.freeze({
  valor: 1923.44,
  mesPublicado: '2026-07',
  rigeEn: '2026-08',
  fuente: 'DGI',
})

// ─────────────────────────────────────────────────────────────────────────────
// 1. ASIGNACIONES FAMILIARES: los dos regímenes, y por qué importa cuál te toca
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asignación Familiar del Plan de Equidad (Ley 18.227). Los montos que publica BPS son «por el
 * primer beneficiario» porque el artículo 4 los define con una escala: el monto POR BENEFICIARIO
 * es el resultado de multiplicar el valor base por la cantidad de beneficiarios elevada a 0,6 y
 * dividir entre esa cantidad. O sea que el hogar cobra base × nʰ, con h = 0,6, y cada hijo suma
 * menos que el anterior. Con un solo beneficiario la fórmula devuelve exactamente el valor que
 * publica BPS, y ése es el control de que la estamos leyendo bien.
 */
export const AFAM_PE = Object.freeze({
  ley: 'Ley 18.227',
  vigencia: '2026-01',
  /** Valor base por beneficiario en gestación, menor de 5 años o escolar. */
  primerBeneficiario: 2686.51,
  /** Complemento por los beneficiarios que cursan nivel intermedio (educación media). */
  complementoMedia: 1151.38,
  /** Monto fijo por beneficiario con discapacidad: no entra en la escala. */
  discapacidad: 3837.9,
  /** El exponente del artículo 4. */
  exponente: 0.6,
  /** Los valores originales del artículo 4, expresados a enero de 2008 (art. 10). */
  baseLey2008: Object.freeze({ general: 700, media: 300, discapacidad: 1000 }),
})

/**
 * Asignación familiar contributiva (Decreto-Ley 15.084): la que genera el trabajador de la
 * actividad privada por sus hijos, y la que más se deja sin cobrar de las dos, porque no aparece
 * sola: hay que solicitarla.
 *
 * OJO CON EL TOPE, que es el detalle que decide todo en esta banda de sueldos: se mide sobre la
 * SUMA de los ingresos salariales del generante y su cónyuge o concubino. Dos sueldos mínimos
 * ($ 50.766) ya pasan el primer tope de $ 50.502 por 264 pesos, y el hogar cae de $ 1.347 a $ 674
 * por hijo. No es un error de la tabla: es cómo está escrita.
 */
export const AFAM_15084 = Object.freeze({
  ley: 'Decreto-Ley 15.084',
  vigencia: '2026-01',
  /** Monto mensual por beneficiario cuando los ingresos del hogar no pasan el primer tope. */
  montoFranja1: 1347,
  /** Monto mensual por beneficiario en la segunda franja. */
  montoFranja2: 674,
  topeFranja1: 50502,
  /** Tope de la segunda franja para hogares de hasta DOS beneficiarios. */
  topeFranja2: 84688,
  /** Lo que sube cada tope por beneficiario adicional a partir del tercero (1,2338 BPC). */
  incrementoPorBeneficiarioExtra: 8468.8,
  /** Se paga cada dos meses aunque el monto esté expresado por mes. */
  pagoBimestral: true,
})

export interface AsignacionInput {
  /** Menores a cargo sin discapacidad. */
  menores: number
  /** De ésos, cuántos cursan educación media (liceo o UTU). */
  enMedia: number
  /** Menores a cargo con discapacidad acreditada. */
  conDiscapacidad: number
  /** Suma de los ingresos salariales NOMINALES del hogar (generante + cónyuge o concubino). */
  ingresoSalarialHogar: number
}

export interface AsignacionMonto {
  /** Total mensual que cobraría el hogar por este régimen. */
  total: number
  /** Lo que sale por los menores sin discapacidad. */
  base: number
  /** Complemento por educación media (solo Plan de Equidad). */
  media: number
  /** Lo que sale por los menores con discapacidad. */
  discapacidad: number
  /** Explicación corta de cómo salió el número, para mostrarla al lado. */
  detalle: string
}

/**
 * Resuelve el artículo 4 de la Ley 18.227. El complemento por educación media se calcula con la
 * misma escala pero sobre la cantidad de beneficiarios que cursan ese nivel, que es lo que dice el
 * literal B: no es un monto plano por chico.
 */
export function montoAfamPlanEquidad(input: AsignacionInput): AsignacionMonto {
  const n = Math.max(0, Math.floor(input.menores || 0))
  const m = Math.min(Math.max(0, Math.floor(input.enMedia || 0)), n)
  const d = Math.max(0, Math.floor(input.conDiscapacidad || 0))

  const base = n > 0 ? AFAM_PE.primerBeneficiario * Math.pow(n, AFAM_PE.exponente) : 0
  const media = m > 0 ? AFAM_PE.complementoMedia * Math.pow(m, AFAM_PE.exponente) : 0
  const discapacidad = d * AFAM_PE.discapacidad

  const partes: string[] = []
  if (n > 0)
    partes.push(
      n === 1
        ? `${money(AFAM_PE.primerBeneficiario)} por el único beneficiario`
        : `${money(AFAM_PE.primerBeneficiario)} × ${n} elevado a 0,6 = ${money(base)} por los ${n}`
    )
  if (m > 0)
    partes.push(
      `más ${money(media)} de complemento por ${m === 1 ? 'el que cursa' : `los ${m} que cursan`} nivel medio`
    )
  if (d > 0) partes.push(`más ${money(discapacidad)} por discapacidad (monto fijo)`)

  return {
    total: round2(base + media + discapacidad),
    base: round2(base),
    media: round2(media),
    discapacidad: round2(discapacidad),
    detalle: partes.join(', ') || 'Sin menores a cargo no hay asignación.',
  }
}

/**
 * Resuelve la tabla del Decreto-Ley 15.084. El beneficiario con discapacidad cobra doble, como
 * publica BPS.
 *
 * La lectura del tramo de tres o más beneficiarios es la literal de BPS: los topes suben
 * $ 8.468,80 por cada beneficiario adicional y «en este caso, el monto a percibir será el de la
 * segunda franja». Es decir, el tope extendido paga $ 674; el primer tope, si el hogar sigue por
 * debajo, paga $ 1.347. El importe exacto lo liquida BPS, y así se dice en la página.
 */
export function montoAfam15084(input: AsignacionInput): AsignacionMonto & { franja: 0 | 1 | 2 } {
  const n = Math.max(0, Math.floor(input.menores || 0))
  const d = Math.max(0, Math.floor(input.conDiscapacidad || 0))
  const total = n + d
  const ingreso = Math.max(0, input.ingresoSalarialHogar || 0)

  if (total === 0) {
    return {
      total: 0,
      base: 0,
      media: 0,
      discapacidad: 0,
      franja: 0,
      detalle: 'Sin menores a cargo no hay asignación.',
    }
  }

  const extra = Math.max(0, total - 2) * AFAM_15084.incrementoPorBeneficiarioExtra
  const tope1 = AFAM_15084.topeFranja1
  const tope2 = AFAM_15084.topeFranja2 + extra

  let porBeneficiario = 0
  let franja: 0 | 1 | 2 = 0
  if (ingreso <= tope1) {
    porBeneficiario = AFAM_15084.montoFranja1
    franja = 1
  } else if (ingreso <= tope2) {
    porBeneficiario = AFAM_15084.montoFranja2
    franja = 2
  }

  const base = n * porBeneficiario
  const discapacidad = d * porBeneficiario * 2

  const detalle =
    franja === 0
      ? `Los ingresos salariales del hogar (${money(ingreso)}) pasan el tope de ${money(tope2)}: no se genera derecho al cobro, aunque se mantiene la asistencia materno-infantil.`
      : `${money(porBeneficiario)} por beneficiario (${franja === 1 ? `hogar por debajo de ${money(tope1)}` : `hogar entre ${money(tope1)} y ${money(tope2)}`})` +
        (d > 0 ? `, doble por cada beneficiario con discapacidad` : '')

  return {
    total: round2(base + discapacidad),
    base: round2(base),
    media: 0,
    discapacidad: round2(discapacidad),
    franja,
    detalle,
  }
}

export type RegimenAsignacion = 'plan-equidad' | 'ley-15084' | 'ninguno'

export interface AsignacionComparada {
  /** El régimen que paga más. Los dos son incompatibles: se cobra uno. */
  elegido: RegimenAsignacion
  monto: number
  planEquidad: AsignacionMonto
  contributiva: AsignacionMonto & { franja: 0 | 1 | 2 }
  /** Diferencia mensual entre uno y otro, para dimensionar la opción del artículo 9. */
  diferencia: number
}

/**
 * Compara los dos regímenes. El artículo 9 de la Ley 18.227 los declara incompatibles y agrega que
 * «se podrá optar en todo momento» por el del Plan de Equidad: por eso tiene sentido mostrar los
 * dos montos y no sólo el que el hogar está cobrando. El Plan de Equidad, además, no exige empleo
 * formal —la vulnerabilidad se mide por el hogar, no por el recibo de sueldo—, así que un
 * trabajador registrado puede estar en él.
 */
export function compararAsignaciones(input: AsignacionInput): AsignacionComparada {
  const planEquidad = montoAfamPlanEquidad(input)
  const contributiva = montoAfam15084(input)
  const mejor = Math.max(planEquidad.total, contributiva.total)

  let elegido: RegimenAsignacion = 'ninguno'
  if (mejor > 0) elegido = planEquidad.total >= contributiva.total ? 'plan-equidad' : 'ley-15084'

  return {
    elegido,
    monto: round2(mejor),
    planEquidad,
    contributiva,
    diferencia: round2(Math.abs(planEquidad.total - contributiva.total)),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TARJETA URUGUAY SOCIAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tarjeta Uruguay Social (MIDES). El monto base depende de cuántos menores hay en el hogar por los
 * que se cobra AFAM-PE, con tope de cuatro, y existe en modalidad simple o duplicada según la
 * severidad de la situación medida por el ICC.
 *
 * Lo que casi nadie sabe y cambia la cuenta del supermercado: las compras con la tarjeta están
 * exoneradas de IVA. Sobre productos gravados a la tasa básica eso es plata, no un detalle.
 */
export const TUS = Object.freeze({
  organismo: 'MIDES',
  vigencia: '2026-01',
  /** Monto simple por cantidad de menores: índice 0 = ninguno o uno, y tope en cuatro. */
  simplePorMenores: Object.freeze([1935, 1935, 2936, 3734, 5205]),
  factorDuplicada: 2,
  adicionalMenor03: 470,
  adicionalEmbarazo: 470,
  /** La vía general: los 60.000 hogares con menor ingreso per cápita (primer veintil). */
  hogaresPrimerVeintil: 60000,
  comerciosSolidarios: 5000,
  exoneradaDeIva: true,
})

export interface TusInput {
  menores: number
  /** Modalidad duplicada: la define el MIDES según el ICC, no el hogar. */
  duplicada: boolean
  menores03: number
  embarazos: number
}

/** Monto mensual de la TUS para un hogar dado, con los adicionales publicados. */
export function montoTus(input: TusInput): number {
  const idx = Math.min(Math.max(0, Math.floor(input.menores || 0)), TUS.simplePorMenores.length - 1)
  const base = (TUS.simplePorMenores[idx] ?? 0) * (input.duplicada ? TUS.factorDuplicada : 1)
  const extras =
    Math.max(0, Math.floor(input.menores03 || 0)) * TUS.adicionalMenor03 +
    Math.max(0, Math.floor(input.embarazos || 0)) * TUS.adicionalEmbarazo
  return round2(base + extras)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TARIFAS: lo que no llega como plata pero baja la factura
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bono Social de UTE. Es el descuento más grande de todo el sistema y el que menos trámite tiene:
 * el MIDES le manda el padrón a UTE y se aplica solo. La contracara es que no se puede pedir: si
 * no estás en TUS, AFAM-PE o Asistencia a la Vejez, no hay puerta de entrada.
 */
export const BONO_SOCIAL_UTE = Object.freeze({
  organismo: 'UTE + MIDES',
  pctTusDuplicada: 90,
  pctTusSimple: 85,
  pctAfamPeYVejez: 80,
  potenciaMaxKw: 4.5,
  topeKwhHasta4Personas: 250,
  topeKwhCincoOMas: 300,
  tarifasAdmitidas: 'Residencial Simple, Doble Horario o Triple Horario',
  requiereTitularUnico: true,
  automatico: true,
})

/** Tarifa social de OSE: un importe fijo, no un porcentaje. */
export const TARIFA_SOCIAL_OSE = Object.freeze({
  organismo: 'OSE + MIDES',
  cargoHasta15m3: 156.76,
  interiorConSaneamiento: 250.85,
  topeM3: 15,
})

/**
 * Supergás. Va marcado aparte y NO se suma a ningún total: el beneficio se instrumenta por decreto
 * con plazo, se prorrogó varias veces, y la última prórroga que pudimos verificar termina el
 * 31/12/2025. Publicar «50 % de descuento» sin ese asterisco sería mandar a alguien a un
 * mostrador con una expectativa que no podemos sostener.
 */
export const SUPERGAS = Object.freeze({
  organismo: 'MIEM + ANCAP + MIDES',
  descuentoPct: 50,
  garrafaKg: 13,
  garrafasPorMes: 2,
  garrafasPorAnio: 12,
  ultimaProrrogaVerificada: '2025-12-31',
  vigenciaAConfirmar: true,
})

export type ProgramaTarifa = 'tus-duplicada' | 'tus-simple' | 'afam-pe' | 'ninguno'

/** Porcentaje de bonificación de UTE que corresponde a cada programa. */
export function bonificacionUte(programa: ProgramaTarifa): number {
  switch (programa) {
    case 'tus-duplicada':
      return BONO_SOCIAL_UTE.pctTusDuplicada
    case 'tus-simple':
      return BONO_SOCIAL_UTE.pctTusSimple
    case 'afam-pe':
      return BONO_SOCIAL_UTE.pctAfamPeYVejez
    default:
      return 0
  }
}

/** Tope de consumo bonificado según integrantes del hogar. */
export function topeKwhBonificado(personasHogar: number): number {
  return personasHogar >= 5
    ? BONO_SOCIAL_UTE.topeKwhCincoOMas
    : BONO_SOCIAL_UTE.topeKwhHasta4Personas
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. VIVIENDA, SALUD, TRABAJO Y ESTUDIO: lo que sí alcanza a un trabajador solo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fondo de Garantía de Alquiler. Acá está el hueco más nítido de todo el sistema y por eso va con
 * números: el trámite pide un ingreso líquido del núcleo de entre 15 y 100 UR. Con la UR de agosto
 * de 2026, 15 UR son $ 28.851,60 — más que el líquido de un salario mínimo entero. La garantía
 * estatal existe, es gratis, y quien cobra el mínimo y vive solo no llega al piso para pedirla.
 */
export const FGA = Object.freeze({
  organismo: 'MVOT + CGN + ANV',
  ingresoMinUR: 15,
  ingresoMaxUR: 100,
  ingresoMinJovenUR: 30,
  topeGarantiaUR: 18,
  topeGarantiaPromovidaUR: 21,
  diasParaBuscarVivienda: 120,
  continuidadLaboralMeses: 3,
  costoTramite: 0,
  excluye: Object.freeze([
    'propietarios de un inmueble en el mismo departamento',
    'deudores de programas habitacionales del MVOT o la ANV',
    'quienes ya tienen otra garantía del Estado',
    'jubilados y pensionistas',
    'funcionarios públicos y empleados de empresas con convenio con la CGN',
  ]),
})

/** El ingreso mínimo del FGA, en pesos de hoy. Cuenta nuestra: 15 UR × el valor vigente. */
export const FGA_INGRESO_MINIMO_PESOS = round2(FGA.ingresoMinUR * UR.valor)

/** Carné de salud: gratis en ASSE, 0,4 UR fuera. */
export const CARNE_SALUD = Object.freeze({
  costoUsuarioAsse: 0,
  costoNoAsseUR: 0.4,
  costoNoAssePesos: round2(0.4 * UR.valor),
})

/** Uruguay Trabaja (Ley 18.240). El monto está en BPC; el peso es cuenta nuestra. */
export const URUGUAY_TRABAJA = Object.freeze({
  ley: 'Ley 18.240',
  organismo: 'MIDES',
  apoyoBpc: 2.35,
  apoyoPesos: round2(2.35 * URUGUAY.bpc),
  horasSemana: 30,
  mesesMax: 9,
  edadMin: 18,
  edadMax: 64,
  desempleoMinAnios: 2,
  cuposReservados: Object.freeze({ afrodescendientes: 8, discapacidad: 4, trans: 2 }),
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. EL CATÁLOGO
// ─────────────────────────────────────────────────────────────────────────────

export type ApoyoTipo = 'plata' | 'tarifa' | 'servicio'

export type ApoyoPuerta = 'bps' | 'mides' | 'inda' | 'mvot' | 'msp' | 'inefop' | 'intendencia'

export interface Apoyo {
  id: string
  nombre: string
  organismo: string
  tipo: ApoyoTipo
  puerta: ApoyoPuerta
  /** Qué da, en una línea, con el monto cuando el monto está publicado. */
  da: string
  /** Quién califica, dicho como lo dice la norma. */
  quien: string
  /** Cómo se pide, con el dato operativo (teléfono, oficina, web). */
  como: string
  url: string
  /** Se aplica solo, sin trámite. */
  automatico?: boolean
  /** Necesita que el MIDES evalúe el hogar por el Índice de Carencias Críticas. */
  requiereIcc?: boolean
  /** Advertencia que va pegada al programa (vigencia por confirmar, requisito que excluye…). */
  alerta?: string
}

/**
 * El catálogo completo, ordenado por lo que más mueve el bolsillo de un hogar de esta banda.
 * `requiereIcc` es la línea divisoria de toda la página: separa lo que se pide con un trámite de
 * lo que depende de una evaluación del hogar que hace el MIDES.
 */
export const APOYOS: readonly Apoyo[] = Object.freeze([
  Object.freeze({
    id: 'afam-15084',
    nombre: 'Asignación familiar (la del trabajo)',
    organismo: 'BPS',
    tipo: 'plata' as ApoyoTipo,
    puerta: 'bps' as ApoyoPuerta,
    da: `$ 1.347 por mes y por hijo si los ingresos salariales del hogar no pasan $ 50.502, o $ 674 hasta $ 84.688. Doble por hijo con discapacidad. Se cobra cada dos meses.`,
    quien:
      'Trabajadores dependientes del sector privado (industria y comercio, rural, servicio doméstico, construcción), en actividad o en seguro de paro, jubilados y pensionistas de esas ramas, pequeños productores rurales de hasta 200 hectáreas y trabajadores a domicilio. El hijo tiene que estar escolarizado: hasta los 14 en primaria, hasta los 18 si cursa secundaria o UTU.',
    como: 'Se solicita en línea con usuario BPS o en una oficina. No aparece sola: hay que pedirla.',
    url: 'https://www.bps.gub.uy/5470/asignacion-familiar.html',
  }),
  Object.freeze({
    id: 'afam-pe',
    nombre: 'Asignación familiar del Plan de Equidad',
    organismo: 'BPS + MIDES',
    tipo: 'plata' as ApoyoTipo,
    puerta: 'bps' as ApoyoPuerta,
    da: `$ 2.686,51 por mes por el primer beneficiario, con una escala que suma menos por cada hijo siguiente, más $ 1.151,38 de complemento por educación media y $ 3.837,90 por hijo con discapacidad. Se cobra todos los meses.`,
    quien:
      'Hogares con menores a cargo en situación de vulnerabilidad socioeconómica, medida por el Índice de Carencias Críticas. No exige empleo formal ni lo excluye: la Ley 18.227 mide el hogar, no el recibo de sueldo.',
    como: 'Se solicita en BPS. Es incompatible con la asignación contributiva, y el artículo 9 deja optar por ésta en cualquier momento: si te corresponden las dos, conviene la más alta.',
    url: 'https://www.bps.gub.uy/3540/plan-de-equidad.html',
    requiereIcc: true,
  }),
  Object.freeze({
    id: 'tus',
    nombre: 'Tarjeta Uruguay Social',
    organismo: 'MIDES',
    tipo: 'plata' as ApoyoTipo,
    puerta: 'mides' as ApoyoPuerta,
    da: `De $ 1.935 a $ 5.205 por mes según cuántos menores tenga el hogar, el doble en modalidad duplicada, más $ 470 por cada menor de 0 a 3 años y $ 470 por embarazo. Se gasta en alimentos, higiene, limpieza, vestimenta y supergás, y las compras están exoneradas de IVA.`,
    quien:
      'Por vulnerabilidad: los 60.000 hogares con menor ingreso per cápita del país. Y por poblaciones específicas: personas trans, mujeres víctimas de violencia o trata, usuarias de refugios, personas con enfermedades crónicas en pobreza extrema, embarazadas y niños de 0 a 3 años en vulnerabilidad extrema.',
    como: 'Se pide en una oficina territorial del MIDES o al 0800 7263. Hay una visita al hogar para relevar la información.',
    url: 'https://www.gub.uy/ministerio-desarrollo-social/politicas-y-gestion/programas/tarjeta-uruguay-social',
    requiereIcc: true,
  }),
  Object.freeze({
    id: 'bono-social-ute',
    nombre: 'Bono Social de UTE',
    organismo: 'UTE + MIDES',
    tipo: 'tarifa' as ApoyoTipo,
    puerta: 'mides' as ApoyoPuerta,
    da: 'Descuenta el 90 % de la factura de luz con TUS duplicada, el 85 % con TUS simple y el 80 % con AFAM-PE o Asistencia a la Vejez, sobre un consumo de hasta 250 kWh al mes (300 en hogares de cinco o más).',
    quien:
      'Beneficiarios de TUS, AFAM-PE o Asistencia a la Vejez que sean titulares de un único servicio residencial, con potencia contratada de hasta 4,5 kW y tarifa Residencial Simple, Doble o Triple Horario.',
    como: 'No hay trámite: el MIDES le pasa el padrón a UTE y el descuento aparece en la factura.',
    url: 'https://www.gub.uy/ministerio-desarrollo-social/node/9143',
    automatico: true,
    requiereIcc: true,
  }),
  Object.freeze({
    id: 'tarifa-social-ose',
    nombre: 'Tarifa social de OSE',
    organismo: 'OSE + MIDES',
    tipo: 'tarifa' as ApoyoTipo,
    puerta: 'mides' as ApoyoPuerta,
    da: 'El agua pasa a costar $ 156,76 por mes con un consumo de hasta 15 m³, o $ 250,85 en el interior con saneamiento incluido. Lo que exceda se cobra a la tarifa familiar.',
    quien:
      'Integrantes de hogares beneficiarios de TUS, AFAM-PE, Asistencia a la Vejez, Canasta de Servicios o Accesos, y hogares en asentamientos regularizados por el PIAI o considerados vulnerables por la DINAVI.',
    como: 'Se gestiona ante OSE.',
    url: 'https://www.gub.uy/ministerio-desarrollo-social/comunicacion/publicaciones/tarifas-servicios-para-beneficiarios-transferencias-mides',
    requiereIcc: true,
  }),
  Object.freeze({
    id: 'supergas',
    nombre: 'Supergás con descuento',
    organismo: 'MIEM + ANCAP + MIDES',
    tipo: 'tarifa' as ApoyoTipo,
    puerta: 'mides' as ApoyoPuerta,
    da: 'La mitad del precio de la recarga de la garrafa de 13 kg, hasta dos por mes y doce al año.',
    quien:
      'Hogares con TUS, AFAM-PE, Asistencia a la Vejez y asignación familiar del BPS hasta la primera franja.',
    como: 'Se pide en el punto de venta o al call center de la distribuidora (ACODIKE, DUCSA, MEGAL o RIOGAS) diciendo que corresponde el precio diferencial, con la cédula.',
    url: 'https://www.gub.uy/presidencia/comunicacion/noticias/gobierno-extiende-descuento-50-garrafas-13-kilos-para-beneficiarios-del-mides',
    requiereIcc: true,
    alerta:
      'El beneficio se instrumenta por decreto con plazo y se fue prorrogando. La última prórroga que pudimos verificar termina el 31 de diciembre de 2025: preguntá en la distribuidora antes de contar con él.',
  }),
  Object.freeze({
    id: 'canasta-servicios',
    nombre: 'Canasta de Servicios',
    organismo: 'MIEM + MIDES',
    tipo: 'servicio' as ApoyoTipo,
    puerta: 'mides' as ApoyoPuerta,
    da: 'Subsidio para acceder a luz, agua y gas en condiciones seguras, más computadora recertificada y un giga de internet por mes en los hogares más vulnerables.',
    quien:
      'Hogares en vulnerabilidad socioeconómica según el ICC, ubicados en barrios con intervención de vivienda del MVOT o del Plan Juntos.',
    como: 'Por la oficina territorial del MIDES, con cédulas del núcleo, constancia de domicilio y comprobantes de ingreso.',
    url: 'https://www.miem.gub.uy/energia/programa-canasta-de-servicios',
    requiereIcc: true,
  }),
  Object.freeze({
    id: 'inda',
    nombre: 'Comedores y apoyo alimentario del INDA',
    organismo: 'INDA (MIDES)',
    tipo: 'servicio' as ApoyoTipo,
    puerta: 'inda' as ApoyoPuerta,
    da: 'Acceso al Sistema Nacional de Comedores y a los programas de apoyo a enfermos crónicos y riesgo nutricional. El trámite no tiene costo.',
    quien:
      'Se evalúa en una entrevista: cédulas de todo el núcleo, comprobantes de ingreso de cualquier tipo, constancia de escolaridad desde los 2 años y constancia de domicilio.',
    como: 'Entrevista previa agendada al 0800 7263, o en 18 de Julio 1453 en Montevideo; en el interior, por intendencias y oficinas territoriales del MIDES.',
    url: 'https://www.gub.uy/tramites/solicitud-acceso-programa-inda',
  }),
  Object.freeze({
    id: 'fonasa-hijos',
    nombre: 'Cobertura de salud para los hijos (Fonasa)',
    organismo: 'BPS',
    tipo: 'servicio' as ApoyoTipo,
    puerta: 'bps' as ApoyoPuerta,
    da: 'El aporte al Fonasa que ya te descuentan del sueldo ampara también a tus hijos menores de 18 o con discapacidad, y a los hijos de tu pareja que no estén amparados por su otro progenitor.',
    quien:
      'Trabajadores dependientes amparados por el Seguro Nacional de Salud. La tasa cambia según tengas hijos, cónyuge a cargo o ninguno de los dos.',
    como: 'Se tramita la afiliación mutual en BPS. El hijo no paga cuota aparte.',
    url: 'https://www.bps.gub.uy/10310/fondo-nacional-de-salud-fonasa.html',
  }),
  Object.freeze({
    id: 'carne-salud',
    nombre: 'Carné de salud',
    organismo: 'ASSE / MSP',
    tipo: 'servicio' as ApoyoTipo,
    puerta: 'msp' as ApoyoPuerta,
    da: `Gratis para usuarios de ASSE. Para el resto cuesta 0,4 UR, hoy ${money(0.4 * UR.valor)}.`,
    quien: 'Cualquier persona; es el papel que casi todo empleo pide antes de firmar.',
    como: 'Se agenda por el 0800 2773 en Montevideo.',
    url: 'https://www.gub.uy/tramites/carne-salud',
  }),
  Object.freeze({
    id: 'fga',
    nombre: 'Garantía de alquiler del Estado (FGA)',
    organismo: 'MVOT + CGN + ANV',
    tipo: 'servicio' as ApoyoTipo,
    puerta: 'mvot' as ApoyoPuerta,
    da: `Certificado de garantía respaldado por el Estado, sin costo de trámite, por un alquiler de hasta 18 UR (21 en vivienda promovida), con 120 días para buscar la vivienda.`,
    quien: `Mayores de 18 con al menos 3 meses de continuidad laboral y un ingreso líquido del núcleo de entre 15 y 100 UR —hoy, entre ${money(FGA_INGRESO_MINIMO_PESOS)} y ${money(FGA.ingresoMaxUR * UR.valor)}—. En el plan joven el piso es de 30 UR.`,
    como: 'Se tramita en el MVOT / ANV.',
    url: 'https://www.gub.uy/tramites/fga-garantia-alquiler',
    alerta: `El piso de 15 UR (${money(FGA_INGRESO_MINIMO_PESOS)}) deja afuera a quien cobra el salario mínimo y vive solo: el líquido no llega. Con dos ingresos en el núcleo, sí.`,
  }),
  Object.freeze({
    id: 'uruguay-trabaja',
    nombre: 'Uruguay Trabaja',
    organismo: 'MIDES',
    tipo: 'plata' as ApoyoTipo,
    puerta: 'mides' as ApoyoPuerta,
    da: `30 horas semanales de trabajo transitorio por hasta 9 meses, con un apoyo a la inserción laboral de 2,35 BPC —hoy ${money(URUGUAY_TRABAJA.apoyoPesos)} por mes— más formación, alfabetización y atención odontológica y oftalmológica.`,
    quien:
      'Personas de 18 a 64 años en vulnerabilidad socioeconómica, con nivel educativo por debajo de tercero de ciclo básico y más de dos años sin trabajo formal (se admiten hasta tres meses de aportes en esos dos años).',
    como: 'Por llamado público con sorteo, o derivado por otro programa social. MIDES, 2400 0302.',
    url: 'https://www.gub.uy/ministerio-desarrollo-social/politicas-y-gestion/programas/uruguay-trabaja',
    alerta:
      'No es para quien está trabajando: pide dos años de desempleo. Es una salida para el hogar donde el segundo adulto no consigue empleo, no para quien ya tiene el sueldo bajo.',
  }),
  Object.freeze({
    id: 'inefop',
    nombre: 'Cursos del INEFOP',
    organismo: 'INEFOP',
    tipo: 'servicio' as ApoyoTipo,
    puerta: 'inefop' as ApoyoPuerta,
    da: 'Formación en oficios y competencias laborales con certificado, para personas ocupadas y desocupadas. Según el curso hay apoyos económicos, que INEFOP informa en la entrevista de orientación.',
    quien: 'Mayores de 18 residentes en Uruguay, con documento vigente.',
    como: 'Inscripción en oportunidades.inefop.uy, con entrevista de orientación previa.',
    url: 'https://www.inefop.uy/cursos-inefop',
  }),
  Object.freeze({
    id: 'becas-educacion-media',
    nombre: 'Becas de apoyo económico y Butiá',
    organismo: 'MEC + ANEP + INEFOP',
    tipo: 'plata' as ApoyoTipo,
    puerta: 'mides' as ApoyoPuerta,
    da: 'Apoyo económico para sostener la educación media de los hijos: la Beca de Apoyo Económico se ordena por el Índice de Carencias Críticas del MIDES y por la trayectoria educativa; la Beca Butiá alcanza a estudiantes de 14 a 29 años de educación media.',
    quien:
      'Estudiantes de educación media pública —liceo, UTU, aulas comunitarias, escuelas rurales con ciclo básico y Programa Uruguay Estudia— menores de 30 años.',
    como: 'Se solicita en el propio centro educativo, en los períodos de inscripción que abren cada año.',
    url: 'https://www.gub.uy/ministerio-educacion-cultura/',
  }),
  Object.freeze({
    id: 'boleto-estudiantil',
    nombre: 'Boleto gratuito y estudiantil',
    organismo: 'Intendencia de Montevideo / MTOP',
    tipo: 'tarifa' as ApoyoTipo,
    puerta: 'intendencia' as ApoyoPuerta,
    da: 'Los escolares de primaria viajan gratis en las líneas urbanas de Montevideo de lunes a viernes de 7 a 19, con túnica y sin tarjeta. Los estudiantes de educación media tienen viajes subsidiados con la tarjeta STM.',
    quien:
      'Alumnos de centros educativos registrados en el STM, enviados por el centro en su nómina de estudiantes.',
    como: 'Se gestiona en el centro educativo; la tarjeta se retira en los locales del STM.',
    url: 'https://montevideo.gub.uy/areas-tematicas/sistema-de-transporte-metropolitano/tarjetas-stm',
  }),
])

// ─────────────────────────────────────────────────────────────────────────────
// 6. EL PLAN: qué de todo esto le toca a este hogar
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanInput {
  /** Suma de los ingresos salariales NOMINALES del hogar. */
  ingresoSalarialHogar: number
  personasHogar: number
  menores: number
  menoresEnMedia: number
  menores03: number
  menoresConDiscapacidad: number
  embarazos: number
  /** Si el MIDES ya calificó al hogar (o el hogar ya cobra TUS/AFAM-PE). */
  calificaMides: boolean
  /** Modalidad de la TUS, cuando el hogar califica. */
  tusDuplicada: boolean
  /** Lo que paga de luz por mes, si lo sabe. 0 = no lo puso. */
  facturaLuz: number
  /**
   * Líquido mensual del hogar, ya con los aportes descontados. Se pasa hecho en vez de
   * recalcularlo acá porque la página ya lo tiene: es el mismo número que muestra la calculadora
   * de arriba, y tener dos formas de obtenerlo es tener dos respuestas distintas.
   */
  liquidoHogar: number
}

export type EstadoApoyo = 'corresponde' | 'evaluar' | 'no-califica'

export interface ApoyoResuelto {
  apoyo: Apoyo
  estado: EstadoApoyo
  /** Plata mensual estimada, cuando el monto se puede computar. */
  monto: number
  /** Por qué está en ese estado, dicho corto. */
  porQue: string
}

export interface PlanResult {
  /** Plata en la mano por mes: asignaciones + TUS. */
  transferencias: number
  /** Ahorro mensual estimado en tarifas, sólo con lo que el hogar declaró. */
  ahorroTarifas: number
  /** Transferencias + ahorro de tarifas. */
  total: number
  asignacion: AsignacionComparada
  tus: number
  /** El descuento de UTE en pesos, si el hogar puso su factura. */
  descuentoUte: number
  items: ApoyoResuelto[]
}

/**
 * Arma el plan del hogar. Dos decisiones de diseño que importan:
 *
 * 1) Cuando el hogar no está calificado por el MIDES, los programas que dependen del ICC NO se
 *    marcan como «no califica»: se marcan como «evaluar», porque desde afuera no se puede saber.
 *    El único estado honesto ahí es «pedí la evaluación», y por eso el plan siempre termina con la
 *    puerta del MIDES abierta.
 * 2) El ahorro de tarifas sólo se suma si el hogar puso su factura de luz. No hay una factura
 *    promedio publicada que podamos usar sin inventarla, y un total inflado con un supuesto
 *    invisible es exactamente el tipo de número que después alguien usa para decidir.
 */
export function planDeApoyos(input: PlanInput): PlanResult {
  const asignacionInput: AsignacionInput = {
    menores: Math.max(0, Math.floor(input.menores || 0)),
    enMedia: Math.max(0, Math.floor(input.menoresEnMedia || 0)),
    conDiscapacidad: Math.max(0, Math.floor(input.menoresConDiscapacidad || 0)),
    ingresoSalarialHogar: Math.max(0, input.ingresoSalarialHogar || 0),
  }

  const asignacion = compararAsignaciones(asignacionInput)
  const califica = !!input.calificaMides
  const hayMenores = asignacionInput.menores + asignacionInput.conDiscapacidad > 0

  // La asignación que efectivamente se cobra: si el hogar no está calificado por el MIDES, la
  // única que se puede dar por segura es la contributiva.
  const asignacionSegura = califica ? asignacion.monto : asignacion.contributiva.total

  const tus = califica
    ? montoTus({
        menores: asignacionInput.menores + asignacionInput.conDiscapacidad,
        duplicada: !!input.tusDuplicada,
        menores03: Math.max(0, Math.floor(input.menores03 || 0)),
        embarazos: Math.max(0, Math.floor(input.embarazos || 0)),
      })
    : 0

  const programaUte: ProgramaTarifa = califica
    ? input.tusDuplicada
      ? 'tus-duplicada'
      : hayMenores
        ? 'tus-simple'
        : 'afam-pe'
    : 'ninguno'
  const pctUte = bonificacionUte(programaUte)
  const factura = Math.max(0, input.facturaLuz || 0)
  const descuentoUte = round2((factura * pctUte) / 100)

  const items: ApoyoResuelto[] = APOYOS.map(apoyo =>
    resolverApoyo(apoyo, {
      input,
      asignacion,
      asignacionInput,
      califica,
      hayMenores,
      tus,
      descuentoUte,
      pctUte,
    })
  )

  const transferencias = round2(asignacionSegura + tus)
  const ahorroTarifas = round2(descuentoUte)

  return {
    transferencias,
    ahorroTarifas,
    total: round2(transferencias + ahorroTarifas),
    asignacion,
    tus,
    descuentoUte,
    items,
  }
}

interface ResolverCtx {
  input: PlanInput
  asignacion: AsignacionComparada
  asignacionInput: AsignacionInput
  califica: boolean
  hayMenores: boolean
  tus: number
  descuentoUte: number
  pctUte: number
}

function resolverApoyo(apoyo: Apoyo, ctx: ResolverCtx): ApoyoResuelto {
  const { input, asignacion, califica, hayMenores, tus, descuentoUte, pctUte } = ctx

  switch (apoyo.id) {
    case 'afam-15084': {
      if (!hayMenores)
        return item(
          apoyo,
          'no-califica',
          0,
          'Es una prestación por hijos: sin menores a cargo, no.'
        )
      if (asignacion.contributiva.franja === 0)
        return item(apoyo, 'no-califica', 0, asignacion.contributiva.detalle)
      const nota =
        califica && asignacion.elegido === 'plan-equidad'
          ? `${asignacion.contributiva.detalle} Como el Plan de Equidad paga ${money(asignacion.diferencia)} más por mes, conviene esa.`
          : asignacion.contributiva.detalle
      return item(apoyo, 'corresponde', asignacion.contributiva.total, nota)
    }
    case 'afam-pe': {
      if (!hayMenores)
        return item(
          apoyo,
          'no-califica',
          0,
          'Es una prestación por hijos: sin menores a cargo, no.'
        )
      if (!califica)
        return item(
          apoyo,
          'evaluar',
          asignacion.planEquidad.total,
          `Si el hogar califica por el Índice de Carencias Críticas, serían ${money(asignacion.planEquidad.total)} por mes: ${asignacion.planEquidad.detalle}. Trabajar en blanco no lo impide.`
        )
      return item(
        apoyo,
        'corresponde',
        asignacion.planEquidad.total,
        `${asignacion.planEquidad.detalle}. ` +
          (asignacion.elegido === 'plan-equidad'
            ? `Paga ${money(asignacion.diferencia)} más por mes que la contributiva, y son incompatibles.`
            : `La contributiva paga ${money(asignacion.diferencia)} más por mes: conviene ésa.`)
      )
    }
    case 'tus': {
      if (!califica)
        return item(
          apoyo,
          'evaluar',
          0,
          'Depende de que el hogar entre en el primer veintil de ingreso per cápita, y eso lo mide el MIDES en una visita. No se puede saber desde acá.'
        )
      return item(apoyo, 'corresponde', tus, `${money(tus)} por mes, y las compras van sin IVA.`)
    }
    case 'bono-social-ute': {
      if (!califica)
        return item(
          apoyo,
          'evaluar',
          0,
          'Se activa sólo con TUS, AFAM-PE o Asistencia a la Vejez. Sin ninguna de las tres no hay forma de pedirlo.'
        )
      const base = input.facturaLuz > 0 ? money(descuentoUte) : `${pctUte} % de la factura`
      return item(
        apoyo,
        'corresponde',
        descuentoUte,
        `${base} por mes, hasta ${topeKwhBonificado(input.personasHogar)} kWh, si la potencia contratada no pasa de 4,5 kW. No hay trámite.`
      )
    }
    case 'tarifa-social-ose':
      return califica
        ? item(
            apoyo,
            'corresponde',
            0,
            `El agua queda en ${money(TARIFA_SOCIAL_OSE.cargoHasta15m3)} por mes hasta 15 m³.`
          )
        : item(apoyo, 'evaluar', 0, 'Va con los mismos programas del MIDES que el Bono Social.')
    case 'supergas':
      return califica
        ? item(apoyo, 'corresponde', 0, apoyo.alerta ?? '')
        : item(apoyo, 'evaluar', 0, 'Va con los programas del MIDES o con la asignación del BPS.')
    case 'canasta-servicios':
      return item(
        apoyo,
        'evaluar',
        0,
        'Además del ICC pide que el barrio tenga intervención de vivienda del MVOT o del Plan Juntos: se consulta en la oficina territorial.'
      )
    case 'inda':
      return item(
        apoyo,
        'evaluar',
        0,
        'No hay un tope de ingresos publicado: se evalúa en entrevista, y el trámite es gratis.'
      )
    case 'fonasa-hijos':
      return hayMenores
        ? item(
            apoyo,
            'corresponde',
            0,
            'Ya lo estás pagando en el recibo: asegurate de que los hijos figuren amparados.'
          )
        : item(apoyo, 'corresponde', 0, 'Tu propia cobertura sale del aporte que ya te descuentan.')
    case 'carne-salud':
      return item(
        apoyo,
        'corresponde',
        0,
        `Gratis si sos usuario de ASSE; si no, ${money(CARNE_SALUD.costoNoAssePesos)}.`
      )
    case 'fga': {
      const liquido = Math.max(0, input.liquidoHogar || 0)
      return liquido >= FGA_INGRESO_MINIMO_PESOS
        ? item(
            apoyo,
            'corresponde',
            0,
            `Con lo que declara este hogar, el líquido pasa el piso de 15 UR (${money(FGA_INGRESO_MINIMO_PESOS)}). Falta la continuidad laboral de 3 meses.`
          )
        : item(
            apoyo,
            'no-califica',
            0,
            `El piso son 15 UR de líquido del núcleo, hoy ${money(FGA_INGRESO_MINIMO_PESOS)}, y este hogar queda por debajo. Con un segundo ingreso entra.`
          )
    }
    case 'uruguay-trabaja':
      return item(
        apoyo,
        'evaluar',
        0,
        'Pide más de dos años sin trabajo formal: sirve para el adulto del hogar que no consigue empleo, no para quien ya está trabajando.'
      )
    case 'inefop':
      return item(apoyo, 'corresponde', 0, 'Abierto a personas ocupadas y desocupadas.')
    case 'becas-educacion-media':
      return ctx.asignacionInput.enMedia > 0
        ? item(
            apoyo,
            'evaluar',
            0,
            'Se ordena por el Índice de Carencias Críticas y por la trayectoria del estudiante: se pide en el liceo o la UTU.'
          )
        : item(apoyo, 'no-califica', 0, 'Es para estudiantes de educación media.')
    case 'boleto-estudiantil':
      return hayMenores
        ? item(apoyo, 'corresponde', 0, 'Se gestiona en el centro educativo.')
        : item(apoyo, 'no-califica', 0, 'Es para escolares y estudiantes.')
    default:
      return item(apoyo, 'evaluar', 0, '')
  }
}

function item(apoyo: Apoyo, estado: EstadoApoyo, monto: number, porQue: string): ApoyoResuelto {
  return { apoyo, estado, monto: round2(monto), porQue }
}

/**
 * Qué le pasa a la resta cuando entran las transferencias. Se compara contra la línea de pobreza
 * del INE que ya usa `lowWage.ts`, que es la única vara que no es opinión nuestra.
 */
export interface ConApoyosResult {
  antes: number
  despues: number
  lineaPobreza: number
  cruzaLaLinea: boolean
  yaEstaba: boolean
  margenAntes: number
  margenDespues: number
}

export function conApoyos(
  ingresoHogar: number,
  lineaPobreza: number,
  transferencias: number
): ConApoyosResult {
  const antes = Math.max(0, ingresoHogar || 0)
  const despues = round2(antes + Math.max(0, transferencias || 0))
  const yaEstaba = antes >= lineaPobreza
  return {
    antes: round2(antes),
    despues,
    lineaPobreza,
    cruzaLaLinea: !yaEstaba && despues >= lineaPobreza,
    yaEstaba,
    margenAntes: round2(antes - lineaPobreza),
    margenDespues: round2(despues - lineaPobreza),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. LAS PUERTAS, LA LETRA CHICA Y LA FAQ
// ─────────────────────────────────────────────────────────────────────────────

export interface Puerta {
  organismo: string
  para: string
  como: string
  url: string
}

/** Dónde se toca el timbre. Es la mitad operativa de la página: sin esto, no se pide nada. */
export const PUERTAS: readonly Puerta[] = Object.freeze([
  Object.freeze({
    organismo: 'BPS',
    para: 'Asignación familiar (las dos), cobertura de salud de los hijos, subsidios por enfermedad, maternidad y desempleo.',
    como: 'Servicios en línea con usuario BPS, o teléfono *1997 desde celular y 0800 1997 desde fijo, de lunes a viernes de 8 a 18.',
    url: 'https://www.bps.gub.uy/',
  }),
  Object.freeze({
    organismo: 'MIDES',
    para: 'Tarjeta Uruguay Social, la evaluación del hogar que después habilita el Bono Social de UTE, la tarifa de OSE y el supergás, Uruguay Trabaja y Asistencia a la Vejez.',
    como: 'Oficinas territoriales en todo el país, 0800 7263, o WhatsApp 092 643 370. La evaluación incluye una visita al hogar.',
    url: 'https://www.gub.uy/ministerio-desarrollo-social/',
  }),
  Object.freeze({
    organismo: 'INDA',
    para: 'Comedores y programas alimentarios.',
    como: 'Entrevista previa al 0800 7263; en Montevideo, 18 de Julio 1453.',
    url: 'https://www.gub.uy/tramites/solicitud-acceso-programa-inda',
  }),
  Object.freeze({
    organismo: 'MTSS',
    para: 'Cuál es el laudo de tu categoría y denuncias por incumplimiento. Es gratis y es el paso que más plata mueve cuando el sueldo está mal categorizado.',
    como: 'Consultas laborales y salariales por web.',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/consultas-laborales-salariales-via-web',
  }),
])

export interface ApoyosFaq {
  question: string
  short: string
  answer: string
}

export const APOYOS_FAQ: readonly ApoyosFaq[] = Object.freeze([
  {
    question: 'Trabajo en blanco y tengo hijos. ¿Me corresponde alguna asignación?',
    short: 'Sí: la contributiva, $ 1.347 por hijo por mes si el hogar no pasa $ 50.502.',
    answer:
      'La asignación familiar del Decreto-Ley 15.084 es justamente la del trabajador privado, y la genera el empleo: industria y comercio, rural, servicio doméstico y construcción, en actividad o en seguro de paro. BPS publica la tabla con vigencia enero de 2026: $ 1.347 por mes y por beneficiario si la suma de los ingresos salariales del hogar no pasa $ 50.502, y $ 674 si no pasa $ 84.688. Con hijos con discapacidad se cobra el doble. Dos detalles que cambian el resultado. El primero: el tope mira la SUMA de los ingresos del generante y su cónyuge o concubino, así que dos sueldos mínimos ($ 50.766) ya se pasan del primer tramo por poco más de doscientos pesos y el hogar cae a $ 674 por hijo. El segundo: no llega sola. Hay que solicitarla, se cobra cada dos meses, y se pide con el certificado de escolaridad del chico —hasta los 14 en primaria, hasta los 18 si cursa liceo o UTU—. Si nadie la pidió, no se está cobrando.',
  },
  {
    question: '¿Puedo cobrar la asignación del Plan de Equidad si tengo trabajo formal?',
    short: 'Sí. La Ley 18.227 mide al hogar, no al recibo de sueldo.',
    answer:
      'Es la confusión más cara de esta página. La Asignación Familiar del Plan de Equidad no es «la de los que no trabajan»: el artículo 1 de la Ley 18.227 la define para niños y adolescentes que integren hogares en situación de vulnerabilidad socioeconómica, y el artículo 2 aclara cómo se mide esa vulnerabilidad —ingresos del hogar, condiciones habitacionales y del entorno, composición del hogar, características de sus integrantes y situación sanitaria—. El BPS lo dice con todas las letras en su documento de actualización: se provee cobertura con independencia de si quien genera el derecho está en empleo formal o informal. Los montos de enero de 2026 son bastante más altos que los de la contributiva: $ 2.686,51 por el primer beneficiario, con una escala que hace que cada hijo siguiente sume menos, más $ 1.151,38 de complemento por el que curse nivel medio y $ 3.837,90 por hijo con discapacidad. Son incompatibles entre sí, y el artículo 9 permite optar por la del Plan de Equidad en todo momento. A cambio pide dos cosas todos los años: que los chicos estén inscriptos y asistan a clase, y que tengan los controles médicos al día.',
  },
  {
    question: '¿Cómo se calcula la asignación del Plan de Equidad si tengo tres hijos?',
    short: 'No se multiplica: la ley usa una escala con exponente 0,6.',
    answer:
      'El artículo 4 de la Ley 18.227 no fija un monto por chico sino una escala. El monto por beneficiario es el resultado de multiplicar el valor base por la cantidad de beneficiarios elevada a 0,6 y dividir esa cifra entre la misma cantidad. Puesto al derecho: lo que cobra el hogar es el valor base multiplicado por la cantidad de hijos elevada a 0,6. Con un hijo da exactamente el número que publica BPS; con dos no da el doble, y con tres tampoco da el triple. Es una escala de equivalencia, la misma idea por la que la línea de pobreza de un hogar de dos no es el doble que la de uno. El complemento por educación media se calcula igual, pero contando solamente a los que cursan ese nivel, y la prestación por discapacidad no entra en la escala: es un monto fijo por chico. Los valores de la ley están expresados a enero de 2008 y se ajustan por el índice de precios al consumo, que es por lo que el «700» del texto legal hoy son $ 2.686,51.',
  },
  {
    question: 'No tengo hijos y gano el mínimo. ¿Qué hay para mí?',
    short: 'Poco, y conviene decirlo: casi toda la red se activa por hijos o por el ICC.',
    answer:
      'Esta es la respuesta incómoda del artículo. La protección social uruguaya está construida alrededor de dos llaves: tener menores a cargo, y calificar como hogar vulnerable en el Índice de Carencias Críticas del MIDES. Una persona sola, sin hijos, trabajando en blanco por el salario mínimo, no abre ninguna de las dos: no genera asignación, no entra a la Tarjeta Uruguay Social salvo por las poblaciones específicas que la propia norma lista, y sin ninguna de esas dos tampoco llega el Bono Social de UTE ni la tarifa social de OSE, que se activan con el padrón del MIDES. Lo que sí hay es esto, y no es nada: el carné de salud gratis si sos usuario de ASSE, los cursos del INEFOP con certificado, la licencia por estudio paga que casi nadie pide, y la consulta gratuita al MTSS para saber cuál es el laudo de tu categoría, que en esta banda es lo que más plata mueve, porque una parte de estos sueldos no son «lo que paga el mercado» sino categorías mal asignadas. Y una advertencia concreta: la garantía de alquiler del Estado pide un ingreso líquido del núcleo de al menos 15 UR, hoy $ 28.851,60, así que con un solo salario mínimo no se llega al piso para pedirla; con dos ingresos en la casa, sí.',
  },
  {
    question: '¿Cuánto puede bajar la factura de luz y de agua?',
    short:
      'Hasta 90 % la luz y el agua a $ 156,76, pero sólo con TUS, AFAM-PE o Asistencia a la Vejez.',
    answer:
      'El Bono Social de UTE descuenta el 90 % de la factura para hogares con Tarjeta Uruguay Social duplicada, el 85 % con TUS simple y el 80 % con Asignación Familiar del Plan de Equidad o Asistencia a la Vejez. Aplica sobre un consumo de hasta 250 kWh por mes en hogares de una a cuatro personas y hasta 300 kWh en los de cinco o más, y exige tres cosas del lado de UTE: ser titular de un único servicio residencial, tener potencia contratada de hasta 4,5 kW y estar en tarifa Residencial Simple, Doble o Triple Horario. Lo mejor es que no hay trámite: el MIDES le pasa el padrón a UTE y el descuento aparece en la factura. La tarifa social de OSE funciona parecido pero con un importe fijo en vez de un porcentaje: $ 156,76 por mes con consumo de hasta 15 m³, o $ 250,85 en el interior con saneamiento incluido, y lo que exceda se cobra a la tarifa familiar. La contracara de que sea automático es que no se puede pedir por separado: la puerta de entrada es siempre la evaluación del MIDES.',
  },
  {
    question: '¿Cómo hago para que el MIDES evalúe mi hogar?',
    short: 'Oficina territorial o 0800 7263; hay una visita al hogar y la mide el ICC.',
    answer:
      'La Tarjeta Uruguay Social y la asignación del Plan de Equidad no se resuelven con un formulario de ingresos: se resuelven con el Índice de Carencias Críticas, que pondera ingresos, vivienda, entorno, composición del hogar y situación sanitaria. Por eso ninguna calculadora —tampoco la nuestra— puede decirte si calificás. Lo que sí se puede decir es el camino: presentarse en una oficina territorial del MIDES o llamar al 0800 7263 y pedir el relevamiento, que incluye una visita al hogar. Conviene llevar cédulas de todos los integrantes, constancia de domicilio (una factura de UTE u OSE sirve), comprobantes de ingresos de cualquier tipo —y si no hay recibo, una declaración jurada— y constancias de escolaridad de los chicos desde los 2 años. Ese mismo relevamiento es el que después habilita, sin trámite adicional, el descuento de UTE y la tarifa de OSE.',
  },
  {
    question: 'Con todo eso, ¿la cuenta cierra?',
    short: 'En un hogar con hijos cambia mucho; en una persona sola, casi nada.',
    answer:
      'Depende de cuál de los dos hogares seas, y esa es la conclusión honesta. Para un hogar con dos o tres menores que califique por el ICC, la suma de la asignación del Plan de Equidad, la Tarjeta Uruguay Social y el descuento de UTE es de varios miles de pesos por mes: es la diferencia entre pagar el alquiler y no pagarlo, y es plata que hoy hay hogares que no cobran simplemente porque nadie fue a pedirla. Para una persona sola que cobra el mínimo, no: el sistema casi no la ve, y la resta sigue dando lo que da. Lo que hay que evitar son las dos mentiras cómodas. Una es decir que con administración doméstica se resuelve, que no. La otra es decir que no hay nada que hacer, que tampoco: entre el laudo de la categoría, las asignaciones que no se piden y las tarifas sociales que se activan solas, hay ingreso real sobre la mesa que se está dejando pasar.',
  },
])

export interface StateSupportSource {
  label: string
  url: string
}

export const STATE_SUPPORT_SOURCES: readonly StateSupportSource[] = Object.freeze([
  {
    label: 'BPS — Asignación familiar (Decreto-Ley 15.084): montos y topes con vigencia 1/2026',
    url: 'https://www.bps.gub.uy/5470/asignacion-familiar.html',
  },
  {
    label: 'BPS — Plan de Equidad (Ley 18.227): montos vigentes y requisitos',
    url: 'https://www.bps.gub.uy/3540/plan-de-equidad.html',
  },
  {
    label: 'IMPO — Ley 18.227 (art. 2 vulnerabilidad, art. 4 la fórmula, art. 9 la opción)',
    url: 'https://www.impo.com.uy/bases/leyes/18227-2007',
  },
  {
    label:
      'BPS, Asesoría General en Seguridad Social — «Asignaciones familiares. Actualización» (Comentarios de Seguridad Social N.º 115): las franjas del Decreto-Ley 15.084 en BPC y que el Plan de Equidad cubre con independencia de si el empleo es formal o informal',
    url: 'https://www.bps.gub.uy/bps/file/22061/1/asignaciones-familiares.-actualizacion.pdf',
  },
  {
    label:
      'Presidencia — prórroga del 50 % en recargas de garrafas de 13 kg para beneficiarios del MIDES (última prórroga verificada: 31/12/2025)',
    url: 'https://www.gub.uy/presidencia/comunicacion/noticias/gobierno-extiende-descuento-50-garrafas-13-kilos-para-beneficiarios-del-mides',
  },
  {
    label: 'MIDES — Tarjeta Uruguay Social: montos de enero de 2026 y vías de acceso',
    url: 'https://www.gub.uy/ministerio-desarrollo-social/politicas-y-gestion/programas/tarjeta-uruguay-social',
  },
  {
    label: 'MIDES — Tarifas de servicios para beneficiarios de transferencias (UTE, OSE, supergás)',
    url: 'https://www.gub.uy/ministerio-desarrollo-social/comunicacion/publicaciones/tarifas-servicios-para-beneficiarios-transferencias-mides',
  },
  {
    label: 'MIDES — Tarifa social de electricidad (Bono Social): porcentajes por programa',
    url: 'https://www.gub.uy/ministerio-desarrollo-social/node/9143',
  },
  {
    label: 'MIDES — Uruguay Trabaja (Ley 18.240)',
    url: 'https://www.gub.uy/ministerio-desarrollo-social/politicas-y-gestion/programas/uruguay-trabaja',
  },
  {
    label: 'MIEM — Programa Canasta de Servicios',
    url: 'https://www.miem.gub.uy/energia/programa-canasta-de-servicios',
  },
  {
    label: 'MIDES / INDA — Solicitud de acceso a Programa INDA (comedores)',
    url: 'https://www.gub.uy/tramites/solicitud-acceso-programa-inda',
  },
  {
    label: 'MVOT — FGA: garantía de alquiler (ingreso de 15 a 100 UR)',
    url: 'https://www.gub.uy/tramites/fga-garantia-alquiler',
  },
  {
    label: 'DGI — Unidad Reajustable: $ 1.923,44 (valor de julio de 2026, rige en agosto)',
    url: 'https://www.gub.uy/direccion-general-impositiva/datos-y-estadisticas/datos/unidad-reajustable-ur',
  },
  {
    label: 'MSP — Carné de salud: sin costo para usuarios de ASSE',
    url: 'https://www.gub.uy/tramites/carne-salud',
  },
  {
    label: 'BPS — Fondo Nacional de Salud (Fonasa): amparo del núcleo familiar',
    url: 'https://www.bps.gub.uy/10310/fondo-nacional-de-salud-fonasa.html',
  },
  {
    label: 'Intendencia de Montevideo — Tarjetas STM (boleto escolar y estudiantil)',
    url: 'https://montevideo.gub.uy/areas-tematicas/sistema-de-transporte-metropolitano/tarjetas-stm',
  },
])

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades internas
// ─────────────────────────────────────────────────────────────────────────────

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

/** Formato de pesos para los textos generados. Redondea a peso: el centavo acá no informa. */
function money(n: number): string {
  return `$ ${Math.round(n).toLocaleString('es-UY', { maximumFractionDigits: 0 })}`
}
