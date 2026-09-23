// app/utils/fonasaRefund.ts
// Datos y aritmética de /devolucion-fonasa-uruguay: el excedente de aportes al FONASA que el BPS
// devuelve una vez por año.
//
// POR QUÉ EXISTE: el sitio hablaba de la devolución de FONASA de pasada en seis páginas
// (`cambiar-de-mutualista-uruguay` la tiene hasta en sus keywords) y no tenía ninguna que la
// explicara. Es una pregunta estacional y masiva —el BPS le pagó a más de 155.000 personas por el
// ejercicio 2024— y la respuesta que circula («si ganás mucho te devuelven») no alcanza para saber
// si te toca ni cuánto.
//
// LO QUE ESTA PÁGINA CONTESTA Y NADIE MÁS: el tope anual NO es un umbral de sueldo. Es la suma del
// costo promedio equivalente (CPE) mensual de la cobertura, incrementada en un 25 %, sumando la
// tuya y la de quienes tenés a cargo. Los «$ 113.167» que publica el BPS son el sueldo desde el
// cual, para el caso más simple (una persona sola, doce meses de cobertura), los aportes superan
// ese tope: no son la regla, son un ejemplo. Por eso alguien con hijos a cargo puede ganar bastante
// más y no tener devolución — su tope es más alto, porque cubre a más gente.
//
// EL CAMBIO QUE VIENE: el Decreto 317/025 (26/12/2025) hizo dos cosas en el mismo texto. Su
// artículo 18 fijó el CPE en $ 6.693 desde el 1.º de enero de 2026, y su artículo 17 sustituyó el
// artículo 13 del Decreto 221/011, o sea la metodología con la que se calcula. El MEF aclaró que el
// cambio de metodología NO toca la devolución que se paga en 2026: recién impacta en la de 2027.
// Es el dato que más se malinterpreta del tema y por eso está en la página, no acá.
//
// LO QUE CAMBIÓ EL 2026-09-15: el BPS publicó las cifras del ejercicio 2025 (se cobra desde el 21
// de setiembre de 2026) y habilitó la consulta de «¿me toca?» por web, teléfono y WhatsApp —el
// 1.º de setiembre para quienes tienen Usuario Personal BPS, el 7 para todo el mundo—. Esos números
// entraron a `FONASA_EXERCISES`, y se agregaron `FONASA_CONSULTA` (los tres canales y las dos
// fechas de habilitación) y `FONASA_COBRO` (el plazo para elegir depósito y la red de cobro
// presencial). También se agregó `FONASA_ANTICIPO`: el anticipo MENSUAL de FONASA que pagan los
// titulares de servicios personales no incluidos por otra actividad — un trámite distinto (mensual,
// no anual) que se confunde con esta devolución porque comparte el nombre.
//
// LO QUE CAMBIÓ EL 2026-09-22: la página publicaba el CPE de enero ($ 6.693) y decía que no había
// encontrado el ajuste posterior. Existe y es localizable: el Decreto 163/026 (promulgado el
// 17/07/2026, Diario Oficial del 23/07/2026) subió el CPE a $ 6.858 desde el 1.º de julio de 2026
// (art. 11) en el mismo texto que autorizó el aumento de cuotas y tickets de julio (individuales
// hasta 2,13 %, art. 5; tope de $ 880 por tasa moderadora y 1,60 % para las que están entre $ 660 y
// $ 880, art. 8; ASSE hasta 1,00 %, art. 12). El cuadro «Ajustes de precios de salud – julio 2026»
// del MSP (21/07/2026) trae las mismas cifras. El CPE pasó a ser una lista fechada (`CPE_HISTORY`)
// y los dos ajustes del año quedaron en `HEALTH_PRICE_ADJUSTMENTS`, porque la pregunta «¿cuánto
// subió la cuota?» llega a esta página junto con la de la devolución. Regla de la casa: una cifra
// nunca se «actualiza» a ojo, se relee de la norma y se fecha, o se saca.
//
// FUENTES PRIMARIAS, verificadas el 2026-09-22 (ver FONASA_SOURCES para la lista completa):
//   - Ley 18.731 art. 3 — la comparación al 31 de diciembre y el excedente a devolver. VIGENTE.
//     https://www.impo.com.uy/bases/leyes/18731-2011/3
//   - Decreto 317/025 arts. 5, 8, 10, 17 y 18 — ajuste de enero de 2026, nueva metodología del CPE
//     y su valor desde el 1/1/2026. https://www.impo.com.uy/bases/decretos-originales/317-2025
//   - Decreto 163/026 arts. 5, 8, 11, 12, 16 y 17 — ajuste de julio de 2026 y CPE desde el
//     1/7/2026. https://www.impo.com.uy/bases/decretos/163-2026
//   - MSP, «Ajustes de precios de salud – julio 2026» (PDF del 21/07/2026) — el cuadro con las
//     mismas cifras
//   - MEF, «Preguntas y respuestas sobre el cambio al CPE» (09/01/2026) — el impacto recién en 2027
//   - Presidencia (03/09/2025 y 03/09/2026) — cifras y calendario de los ejercicios 2024 y 2025
//   - BPS — cómo se arma el tope anual (sólo los meses con beneficio; el CPE de los hijos a medias
//     entre los dos generantes) y la retención de IRPF sobre lo devuelto
//   - BPS — devolución Fonasa 2026 (consulta, cobro) y anticipo Fonasa de servicios personales

export interface FonasaSource {
  readonly label: string
  readonly url: string
}

export interface FonasaExercise {
  /** Año civil de los aportes que se comparan contra el tope. */
  readonly year: number
  /** Primer día de pago (ISO). */
  readonly paidFrom: string
  /** Personas alcanzadas, según el comunicado oficial. */
  readonly people: number
  /** Total devuelto, en pesos. */
  readonly totalPesos: number
  /** Promedio de ingresos mensuales nominales desde el cual hubo devolución, trabajadores. */
  readonly workerThreshold: number
  /** Ídem para jubilados y pensionistas. */
  readonly retireeThreshold: number
}

/** Fecha en la que se contrastó todo lo de este archivo contra la fuente oficial. */
export const FONASA_VERIFIED_AT = '2026-09-22'

/**
 * El 25 % del artículo 3 de la Ley 18.731: el tope no es el CPE, es el CPE más un cuarto.
 * Expresado como multiplicador porque así se usa en `annualCap`.
 */
export const CPE_UPLIFT = 1.25

export interface CpeValue {
  /** Primer día en que rige (ISO). */
  readonly from: string
  /** Costo promedio equivalente mensual, en pesos. */
  readonly monthly: number
  /** Norma y artículo que lo fijan. */
  readonly norm: string
  readonly url: string
}

/**
 * El CPE de 2026, fechado. Se agrega una fila por cada decreto que lo mueve, nunca una estimación:
 * el art. 17 del Decreto 317/025 lo ata a los ajustes de cuotas salud, que en Uruguay son dos por
 * año, así que la lista crece con cada uno.
 */
export const CPE_HISTORY: readonly CpeValue[] = [
  {
    from: '2026-01-01',
    monthly: 6693,
    norm: 'Decreto 317/025, artículo 18',
    url: 'https://www.impo.com.uy/bases/decretos-originales/317-2025',
  },
  {
    from: '2026-07-01',
    monthly: 6858,
    norm: 'Decreto 163/026, artículo 11',
    url: 'https://www.impo.com.uy/bases/decretos/163-2026',
  },
]

/** El CPE con el que arrancó el año (el que el MEF explicó en enero y el que usa el anticipo). */
export const CPE_JAN_2026: CpeValue = CPE_HISTORY[0]!
/** El CPE vigente: la última fila con decreto publicado. */
export const CPE_CURRENT: CpeValue = CPE_HISTORY[CPE_HISTORY.length - 1]!

/** Costo promedio equivalente mensual vigente, en pesos (alias de `CPE_CURRENT`). */
export const CPE_MONTHLY = CPE_CURRENT.monthly
export const CPE_FROM = CPE_CURRENT.from

/**
 * Cuándo cambia ese valor, que NO es sólo en enero.
 *
 * El artículo 17 del Decreto 317/025 —el que sustituyó el art. 13 del Decreto 221/011— dice que el
 * CPE «se ajustará en las mismas oportunidades que determine el Poder Ejecutivo para las cuotas
 * salud», y recién «adicionalmente, en enero de cada año» se recalcula incorporando los cambios en
 * las expectativas de vida. O sea que cada ajuste de cuotas salud mueve el CPE, y en Uruguay esos
 * ajustes son típicamente dos por año. En 2026 ya pasó: el de julio (Decreto 163/026) lo movió.
 *
 * La regla va sin cifras a propósito: el valor vive en `CPE_HISTORY`, con su decreto y su fecha.
 */
export const CPE_ADJUSTMENT_RULE =
  'Ese valor no queda fijo hasta el enero siguiente. El artículo 17 del Decreto 317/025 dispone que el costo promedio equivalente se ajusta en las mismas oportunidades que el Poder Ejecutivo determine para las cuotas salud, y que además, en enero de cada año, se recalcula incorporando los cambios en las expectativas de vida de la población. En 2026 ya pasó una vez: el ajuste de cuotas de julio, el Decreto 163/026, movió el CPE en la misma fecha. El próximo cambio llega con el próximo ajuste de cuotas salud, no con el calendario.'
/** Ejercicio al que le corresponde ese CPE (el que se cobra al año siguiente). */
export const CPE_EXERCISE = 2026

export interface HealthPriceAdjustment {
  /** «Enero de 2026», «Julio de 2026». */
  readonly label: string
  /** Desde cuándo rige (ISO). */
  readonly from: string
  /** Decreto que lo dispone. */
  readonly norm: string
  readonly url: string
  /** Aumento máximo autorizado de la cuota básica de afiliación individual a una mutualista, en %. */
  readonly individualQuotaMaxPct: number
  /** Tope de toda tasa moderadora (ticket u orden), en pesos. */
  readonly moderatorFeeCapPesos: number
  /** Aumento máximo de las tasas que ya están entre `bandFloorPesos` y el tope, en %. */
  readonly bandMaxPct: number
  readonly bandFloorPesos: number
  /** Aumento máximo de las cuotas de afiliación a ASSE, en %. */
  readonly asseMaxPct: number
  /** CPE mensual que fija el mismo decreto, en pesos. */
  readonly cpeMonthly: number
}

/**
 * Los dos ajustes de precios de salud de 2026, leídos del decreto y no de la prensa. Se publican
 * juntos porque la pregunta «¿cuánto subió la cuota?» llega a la página de la devolución, y porque
 * el CPE —el número que arma el tope— sale del MISMO decreto que sube tickets y cuotas.
 *
 * Lo que NO está acá, a propósito: un precio de cuota mutual en pesos. El Poder Ejecutivo sólo
 * autoriza el aumento máximo; cada institución fija y publica la suya.
 */
export const HEALTH_PRICE_ADJUSTMENTS: readonly HealthPriceAdjustment[] = [
  {
    label: 'Enero de 2026',
    from: '2026-01-01',
    norm: 'Decreto 317/025',
    url: 'https://www.impo.com.uy/bases/decretos-originales/317-2025',
    individualQuotaMaxPct: 2.5,
    moderatorFeeCapPesos: 880,
    bandMaxPct: 1.88,
    bandFloorPesos: 660,
    asseMaxPct: 2.96,
    cpeMonthly: 6693,
  },
  {
    label: 'Julio de 2026',
    from: '2026-07-01',
    norm: 'Decreto 163/026',
    url: 'https://www.impo.com.uy/bases/decretos/163-2026',
    individualQuotaMaxPct: 2.13,
    moderatorFeeCapPesos: 880,
    bandMaxPct: 1.6,
    bandFloorPesos: 660,
    asseMaxPct: 1,
    cpeMonthly: 6858,
  },
]

export const LATEST_ADJUSTMENT: HealthPriceAdjustment =
  HEALTH_PRICE_ADJUSTMENTS[HEALTH_PRICE_ADJUSTMENTS.length - 1]!

/**
 * Cómo verificar en el recibo si la mutualista aplicó bien el aumento de julio de 2026. El
 * Decreto 163/026 obliga a imprimir el texto exacto (art. 17) y a mostrar la cuota básica separada
 * del aporte al Fondo Nacional de Recursos, los complementos y los impuestos (art. 16).
 */
export const RECEIPT_RULE_JULY_2026 = {
  norm: 'Decreto 163/026, artículos 16 y 17',
  url: 'https://www.impo.com.uy/bases/decretos/163-2026',
  /** La frase que el recibo de julio de 2026 tiene que traer. */
  julyText:
    'El aumento máximo de la cuota básica autorizado por el Poder Ejecutivo, a aplicar en julio de 2026, es de 2,13% (dos con trece por ciento)',
  /** La frase de los meses siguientes, mientras no haya otro ajuste. */
  followingMonthsText:
    'De acuerdo a lo resuelto por el Poder Ejecutivo, no está autorizado incrementar el valor de la cuota básica en el presente mes',
} as const

/**
 * Retención de IRPF sobre lo devuelto. Es una retención, no un impuesto nuevo: lo que se devuelve
 * fueron aportes que en su momento se dedujeron de la base del IRPF. 8 % desde el ejercicio 2016
 * (Res. DGI 3148/017); entre 2011 y 2015 fue 20 %.
 */
export const IRPF_RETENTION_PCT = 8
export const IRPF_RETENTION_PCT_LEGACY = 20

/** Primer año de pago en el que se nota el cambio de metodología del Decreto 317/025 (MEF). */
export const METHODOLOGY_FIRST_IMPACT_YEAR = 2027

/**
 * Ejercicios con cifras oficiales publicadas. Sólo se agrega un año cuando el BPS o Presidencia
 * publicaron sus números: nunca una proyección.
 */
export const FONASA_EXERCISES: readonly FonasaExercise[] = [
  {
    year: 2024,
    paidFrom: '2025-09-22',
    people: 155000,
    totalPesos: 7_774_000_000,
    workerThreshold: 113167,
    retireeThreshold: 122598,
  },
  {
    // BPS, novedad del 3/9/2026 (act. 7/9/2026): «más de 152.000 personas, por unos 8.676 millones».
    // Presidencia publicó el mismo día «más de 8.085 millones»: se conserva la cifra del BPS, que es
    // quien paga, y no se mezclan.
    year: 2025,
    paidFrom: '2026-09-21',
    people: 152000,
    totalPesos: 8_676_000_000,
    workerThreshold: 122629,
    retireeThreshold: 132848,
  },
]

/** El último ejercicio con cifras oficiales. */
export const LATEST_EXERCISE: FonasaExercise = FONASA_EXERCISES[FONASA_EXERCISES.length - 1]!

/** Cómo saber si estás comprendido en la devolución 2026 (BPS, verificado 2026-09-22). */
export const FONASA_CONSULTA = {
  web: 'https://www.bps.gub.uy/15053/',
  phone: '0800 2016',
  whatsapp: '092 366 272',
  whatsappUrl: 'https://wa.me/59892366272?text=FONASA',
  /** Usuarios registrados en BPS. */
  openedForRegistered: '2026-09-01',
  /** Toda la población. */
  openedForAll: '2026-09-07',
} as const

export const FONASA_COBRO = {
  /** Último día para elegir depósito en cuenta o dinero electrónico. */
  chooseBy: '2026-09-16',
  depositOptions: ['cuenta bancaria', 'MiDinero', 'DeAnda', 'Prex', 'OCA Blue'],
  depositWithin: '72 horas hábiles',
  inPerson: [
    'Abitab',
    'Redpagos',
    'ANDA',
    'supermercados El Dorado',
    'Tesorería del BPS (Colonia 1851, planta baja)',
  ],
} as const

/**
 * Anticipo mensual de FONASA de servicios personales (BPS, comunicado 6/2026). El mínimo publicado
 * es el 75 % del CPE que regía en enero de 2026. El CPE subió en julio, pero la relectura del
 * 2026-09-22 no cubrió la página del anticipo, así que la cifra se conserva con su base y su fecha:
 * no se recalcula a ojo. El monto que vale es el de la factura que emite el BPS.
 */
export const FONASA_ANTICIPO = {
  minPctOfCpe: 75,
  minMonthly: 5020,
  /** CPE mensual sobre el que el BPS calculó ese mínimo. */
  cpeBasisMonthly: CPE_JAN_2026.monthly,
  since: '2026-01-01',
  dueExample: 'la factura de los servicios de enero de 2026 venció el 24 de febrero',
  url: 'https://www.bps.gub.uy/9534/servicios-personales:-anticipo-fonasa.html',
} as const

export interface FonasaStep {
  readonly n: number
  readonly title: string
  readonly detail: string
}

export const FONASA_STEPS: readonly FonasaStep[] = [
  {
    n: 1,
    title: 'El BPS compara, no vos',
    detail:
      'La ley obliga a comparar, al 31 de diciembre de cada año, tus aportes personales al FONASA del año civil contra tu tope anual. Esa cuenta la hace el BPS con la información que ya tiene; no hay un formulario para pedir la devolución del excedente.',
  },
  {
    n: 2,
    title: 'Consultás si te toca',
    detail:
      'Por la web (bps.gub.uy), el 0800 2016 o el WhatsApp 092 366 272 podés saber si estás comprendido, sin necesidad de Usuario Personal. La consulta se habilitó el 1.º de setiembre de 2026 para quienes ya tienen Usuario Personal BPS, y desde el 7 de setiembre para el resto de la población. Con Usuario Personal además ves el monto y el detalle del cálculo en «Consultar detalle de devolución Fonasa».',
  },
  {
    n: 3,
    title: 'Elegís dónde cobrar',
    // Sin tiempo verbal a propósito: la fecha límite (16 de setiembre de 2026) pasa a mitad de la
    // vida útil de la página y «si elegís antes del 16» quedaría falso al día siguiente.
    detail: `Es la única parte del trámite que depende de vos: con depósito en cuenta bancaria o dinero electrónico elegido hasta el 16 de setiembre de 2026, el BPS acredita el primer día de pago; sin esa opción registrada, el cobro es presencial con cédula en ${FONASA_COBRO.inPerson.join(', ')}.`,
  },
  {
    n: 4,
    title: 'Te retienen el IRPF',
    detail:
      'Lo que llega a tu cuenta es neto: el BPS retiene 8 % de IRPF sobre la devolución. No es un impuesto extra, es la contracara de que esos aportes en su momento salieron de la base del IRPF.',
  },
  {
    n: 5,
    title: 'Si tenés deuda, queda retenida',
    detail:
      'Cuando hay retención por deuda la devolución no se paga sola: hay que iniciar el trámite en el servicio de solicitudes de ATYR del BPS.',
  },
]

export interface FonasaFaq {
  readonly question: string
  readonly short: string
  readonly answer: string
}

const pesos = (n: number) => n.toLocaleString('es-UY')

export const FONASA_FAQ: readonly FonasaFaq[] = [
  {
    question: '¿Cómo saber si tengo devolución de FONASA?',
    short: 'Web, teléfono o WhatsApp: no hace falta ningún trámite',
    answer: `Podés consultarlo en ${FONASA_CONSULTA.web}, llamando al ${FONASA_CONSULTA.phone} o por WhatsApp al ${FONASA_CONSULTA.whatsapp}. La consulta se habilitó el 1.º de setiembre de 2026 para quienes tienen Usuario Personal BPS, y desde el 7 de setiembre para el resto de la población.`,
  },
  {
    question: '¿Cuándo es la devolución de FONASA 2026?',
    short: 'Se empieza a pagar el 21 de setiembre',
    answer: `El primer día de pago del ejercicio ${LATEST_EXERCISE.year} es el 21 de setiembre de 2026. Con depósito en cuenta bancaria o dinero electrónico elegido hasta el 16 de setiembre, el BPS acredita el dinero dentro de las ${FONASA_COBRO.depositWithin} siguientes a ese primer día de pago.`,
  },
  {
    question: '¿A quién le corresponde la devolución de FONASA?',
    short: 'No es un sueldo fijo: depende de tu tope anual',
    answer: `No hay un ingreso fijo desde el cual se cobra: depende de tu tope anual (el CPE de tu cobertura y la de quienes tenés a cargo, más 25 %). Como referencia, por el ejercicio ${LATEST_EXERCISE.year} el BPS informó que les corresponde devolución a los trabajadores con un promedio mensual nominal superior a $ ${pesos(LATEST_EXERCISE.workerThreshold)} y a los jubilados o pensionistas con más de $ ${pesos(LATEST_EXERCISE.retireeThreshold)}. Quien atribuye cobertura a más personas tiene un tope más alto y necesita ganar más para superarlo.`,
  },
  {
    question: '¿Qué pasa si no elegí cómo cobrar antes del 16 de setiembre?',
    short: 'Se cobra presencial, con cédula',
    answer: `Sin depósito en cuenta bancaria o dinero electrónico elegido hasta el 16 de setiembre de 2026, el cobro es presencial con cédula de identidad en ${FONASA_COBRO.inPerson.join(', ')}.`,
  },
  {
    question: '¿Hay que pedir la devolución de FONASA?',
    short: 'El cálculo es de oficio; lo que elegís es dónde cobrar',
    answer:
      'La comparación entre tus aportes y el tope la hace el BPS al 31 de diciembre de cada año, por mandato del artículo 3 de la Ley 18.731. No existe un trámite para pedir el excedente. Lo que sí conviene tener resuelto antes de setiembre es la forma de cobro: con cuenta bancaria o dinero electrónico registrado se deposita el primer día de pago.',
  },
  {
    question: '¿Desde qué sueldo te devuelven?',
    short: 'No hay un sueldo fijo: depende de a cuánta gente cubrís',
    answer: `No hay un umbral único. Por el ejercicio ${LATEST_EXERCISE.year} el BPS informó que les corresponde devolución a los trabajadores con un promedio de ingresos mensuales superior a $ ${pesos(LATEST_EXERCISE.workerThreshold)} y a los jubilados o pensionistas con más de $ ${pesos(LATEST_EXERCISE.retireeThreshold)} (valores nominales). Esas cifras corresponden al caso más simple. Si atribuís cobertura a hijos o a tu cónyuge, tu tope anual sube y hace falta ganar más para superarlo.`,
  },
  {
    question: '¿Qué es el CPE y por qué se le suma 25 %?',
    short: 'Es el costo de tu cobertura; el 25 % lo pone la ley',
    answer: `El costo promedio equivalente es lo que le cuesta al Seguro Nacional de Salud atender a cada beneficiario a lo largo de su vida. El artículo 3 de la Ley 18.731 no compara tus aportes contra el CPE pelado: los compara contra el CPE incrementado en un 25 %. Recién por encima de eso hay excedente. Desde el 1.º de julio de 2026 el CPE mensual es de $ ${pesos(CPE_CURRENT.monthly)} (${CPE_CURRENT.norm}); entre enero y junio de 2026 fue de $ ${pesos(CPE_JAN_2026.monthly)} (${CPE_JAN_2026.norm}).`,
  },
  {
    question: '¿Cuentan los hijos y el cónyuge?',
    short: 'Sí, y suben tu tope',
    answer:
      'El tope suma el CPE del beneficiario y el de quienes tienen cobertura a través suyo. En el caso de menores de 18 años o mayores con discapacidad, el CPE se reparte en partes iguales entre quienes generan el beneficio: si ambos padres le dan cobertura al mismo hijo, cada uno computa medio CPE por mes.',
  },
  {
    question: '¿Y si no tuve cobertura los doce meses?',
    short: 'El tope se prorratea por mes',
    answer:
      'Sólo se computan los meses en los que efectivamente tuviste el beneficio: el BPS lo escribe así, «se deben considerar exclusivamente los meses del ejercicio en los cuales la persona fue beneficiaria». Medio año de cobertura es medio tope, lo que en la práctica hace más fácil superarlo con el mismo sueldo mensual. Los meses en el seguro de paro cuentan, porque del subsidio se sigue descontando FONASA; los meses sin trabajo y sin subsidio, no.',
  },
  {
    question: 'Me quedé sin trabajo: ¿sigo en FONASA y me toca la devolución?',
    short: 'Cobertura hasta fin de ese mes; el tope, sólo por los meses con beneficio',
    answer: `La cobertura llega hasta el último día del mes en que te desvinculaste o en que terminó el seguro de paro (en el seguro seguís cubierto y aportando), según la respuesta del BPS actualizada el 15/09/2025. Para la devolución, el BPS computa sólo los meses en los que fuiste beneficiario, así que el tope de ese año es más chico y la referencia de $ ${pesos(LATEST_EXERCISE.workerThreshold)} no te aplica tal cual: se compara lo que aportaste en esos meses contra el tope de esos meses.`,
  },
  {
    question: '¿Cuánto te retienen de IRPF?',
    short: '8 % desde el ejercicio 2016',
    answer:
      'El BPS retiene 8 % de IRPF sobre el monto devuelto, según la Res. DGI 3148/017. Entre los ejercicios 2011 y 2015 la retención había sido de 20 %. Se retiene porque esos aportes personales ya se habían deducido de la base del impuesto cuando los pagaste.',
  },
  {
    question: '¿El cambio de metodología del CPE me baja la devolución de este año?',
    short: `No: recién se nota en la de ${METHODOLOGY_FIRST_IMPACT_YEAR}`,
    answer: `El Decreto 317/025 sustituyó, en su artículo 17, la metodología con la que se calcula el CPE —pasó a usar curvas de supervivencia y a promediar la cápita de los 18 años previos en lugar de asumir cobertura desde el nacimiento—. El MEF aclaró que ese cambio no afecta la devolución que se paga en 2026 y que recién impactará en la de ${METHODOLOGY_FIRST_IMPACT_YEAR}, porque la que se cobra ahora se calcula sobre el ejercicio anterior.`,
  },
  {
    question: '¿Cuánto subieron la cuota mutual y los tickets en julio de 2026?',
    short: 'Cuotas individuales hasta 2,13 %, tope de $ 880 por ticket, CPE a $ 6.858',
    answer: `El Decreto 163/026 (Diario Oficial del 23/07/2026) autorizó hasta ${LATEST_ADJUSTMENT.individualQuotaMaxPct.toLocaleString('es-UY')} % de aumento en la cuota básica de afiliación individual a las mutualistas, mantuvo el tope de $ ${pesos(LATEST_ADJUSTMENT.moderatorFeeCapPesos)} por ticket u orden y limitó a ${LATEST_ADJUSTMENT.bandMaxPct.toLocaleString('es-UY', { minimumFractionDigits: 2 })} % el aumento de las tasas que ya estaban entre $ ${pesos(LATEST_ADJUSTMENT.bandFloorPesos)} y $ ${pesos(LATEST_ADJUSTMENT.moderatorFeeCapPesos)}; las cuotas de ASSE, hasta ${LATEST_ADJUSTMENT.asseMaxPct.toLocaleString('es-UY', { minimumFractionDigits: 2 })} %. En el mismo texto, el artículo 11 llevó el CPE a $ ${pesos(LATEST_ADJUSTMENT.cpeMonthly)}. No hay un precio oficial de cuota mutual en pesos: cada institución fija el suyo dentro de ese máximo.`,
  },
  {
    question: '¿Qué pasa si tengo deuda con el BPS?',
    short: 'Queda retenida hasta que hagas el trámite',
    answer:
      'Si tu devolución quedó retenida por deuda, no se libera sola: hay que iniciar la gestión a través del servicio «Iniciar solicitudes de trámites» de ATYR en el BPS.',
  },
]

export const FONASA_SOURCES: readonly FonasaSource[] = [
  {
    label: 'Ley 18.731, artículo 3 — la comparación anual y el excedente a devolver (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/18731-2011/3',
  },
  {
    label:
      'Decreto 317/025, artículos 5, 8, 10, 17 y 18 — ajuste de enero de 2026, nueva metodología del CPE y su valor desde el 1/1/2026 (IMPO)',
    url: 'https://www.impo.com.uy/bases/decretos-originales/317-2025',
  },
  {
    label:
      'Decreto 163/026, artículos 5, 8, 11, 12, 16 y 17 — ajuste de julio de 2026: cuotas individuales hasta 2,13 %, tope de $ 880 por tasa moderadora, CPE de $ 6.858 desde el 1/7/2026 (IMPO)',
    url: 'https://www.impo.com.uy/bases/decretos/163-2026',
  },
  {
    label: 'MSP — Ajustes de precios de salud, julio de 2026 (cuadro publicado el 21/07/2026)',
    url: 'https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/2026-07/ajustes-precios-salud-julio-2026.pdf',
  },
  {
    label: 'MEF — Preguntas y respuestas sobre el cambio al CPE y su impacto en la devolución',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/preguntas-respuestas-sobre-cambio-costo-promedio-equivalente-su-impacto',
  },
  {
    label:
      'Presidencia — Más de 155.000 personas cobrarán la devolución del excedente (03/09/2025)',
    url: 'https://www.gub.uy/presidencia/comunicacion/noticias/155000-personas-cobraran-devolucion-del-excedente-aportes-fonasa',
  },
  {
    label:
      'BPS — Cálculo de la devolución Fonasa: sólo los meses con beneficio, el CPE de los hijos en partes iguales, y la retención de IRPF',
    url: 'https://www.bps.gub.uy/10576/calculo-de-la-devolucion-fonasa.html',
  },
  {
    label: 'BPS — Cálculo del tope anual',
    url: 'https://www.bps.gub.uy/8965/calculo-del-tope-anual.html',
  },
  {
    label: 'BPS — Devolución Fonasa (montos, canales y calendario)',
    url: 'https://www.bps.gub.uy/23298/devolucion-fonasa.html',
  },
  {
    label:
      'BPS — Devolución Fonasa: a partir del 21 de setiembre comienza el pago del ejercicio 2025 (novedad del 3/9/2026)',
    url: 'https://www.bps.gub.uy/24521/devolucion-fonasa.html',
  },
  {
    label: 'BPS — Normativa de devolución Fonasa (Leyes 18.731 y 18.922, Res. DGI 3148/017)',
    url: 'https://www.bps.gub.uy/10588/normativa-de-devolucion-fonasa.html',
  },
  {
    label: 'BPS — Consulta de devolución Fonasa',
    url: 'https://devolucionfonasa.bps.gub.uy/',
  },
  {
    label: 'BPS — Devolución Fonasa 2026',
    url: 'https://www.bps.gub.uy/10573/devolucion-fonasa.html',
  },
  {
    label: 'Presidencia — BPS habilitó la consulta de la devolución Fonasa 2026',
    url: 'https://www.gub.uy/presidencia/comunicacion/noticias/devolucion-fonasa-bps-consulta-2026',
  },
  {
    label:
      'BPS — Luego del subsidio por desempleo, de ser despedido o renunciar, ¿por cuánto tiempo tengo cobertura Fonasa? (actualizado el 15/09/2025)',
    url: 'https://www.bps.gub.uy/23321/luego-de-finalizado-mi-subsidio-por-desempleo-por-despido-de-ser-despedido_a-o-renunciar-por-cuanto-tiempo-tendre-cobertura-fonasa.html',
  },
  {
    label: 'BPS — Servicios personales: anticipo Fonasa',
    url: 'https://www.bps.gub.uy/9534/servicios-personales:-anticipo-fonasa.html',
  },
]

// ---------------------------------------------------------------------------
// Aritmética
// ---------------------------------------------------------------------------

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const safe = (n: number) => (Number.isFinite(n) ? n : 0)

export interface AnnualCapInput {
  /** CPE mensual en pesos del ejercicio que se calcula. */
  readonly cpeMonthly: number
  /** Meses del año civil con beneficio (0 a 12). */
  readonly months: number
  /** Cuántos CPE mensuales computás: 1 vos, +1 el cónyuge, +0,5 por cada hijo compartido. */
  readonly cpeUnits: number
}

/**
 * Tope anual = suma de los CPE mensuales que te corresponden, incrementada en 25 %.
 *
 * Se redondea al peso porque el resultado se compara contra un aporte que también viene redondeado;
 * arrastrar centésimos daría una falsa precisión sobre una cifra que sólo el BPS puede confirmar.
 */
export function annualCap({ cpeMonthly, months, cpeUnits }: AnnualCapInput): number {
  const cpe = Math.max(0, safe(cpeMonthly))
  const m = clamp(safe(months), 0, 12)
  const units = Math.max(0, safe(cpeUnits))
  return Math.round(cpe * m * units * CPE_UPLIFT)
}

export interface RefundEstimate {
  /** Excedente bruto: lo aportado por encima del tope. Nunca negativo. */
  readonly excess: number
  /** Retención de IRPF sobre el excedente. */
  readonly retention: number
  /** Lo que efectivamente se cobra. */
  readonly net: number
  /** Cuánto falta para llegar al tope cuando no hay excedente. */
  readonly shortfall: number
}

export interface RefundInput {
  /** Aportes personales al FONASA del año civil, en pesos. */
  readonly contributions: number
  /** Tope anual, normalmente el de `annualCap`. */
  readonly cap: number
  /** Retención de IRPF en puntos porcentuales. */
  readonly retentionPct?: number
}

export function estimateRefund({
  contributions,
  cap,
  retentionPct = IRPF_RETENTION_PCT,
}: RefundInput): RefundEstimate {
  const aportes = Math.max(0, safe(contributions))
  const tope = Math.max(0, safe(cap))
  const excess = Math.max(0, Math.round(aportes - tope))
  const retention = Math.round((excess * clamp(safe(retentionPct), 0, 100)) / 100)
  return {
    excess,
    retention,
    net: excess - retention,
    shortfall: excess > 0 ? 0 : Math.round(tope - aportes),
  }
}
