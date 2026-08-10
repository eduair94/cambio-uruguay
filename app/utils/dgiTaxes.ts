// app/utils/dgiTaxes.ts
// Todo lo que pasa entre una persona y la DGI: cuándo hay que presentar la declaración de IRPF,
// cuándo se cobra la devolución, qué se paga de multa si llegás tarde, y cuándo prescribe una
// deuda tributaria.
//
// Alimenta /declaracion-de-irpf-uruguay y /prescripcion-de-deudas-con-el-estado-uruguay. Vive en
// un solo módulo porque el régimen sancionatorio (art. 94) aplica a las dos páginas y duplicarlo
// sería la forma más fácil de que se desincronicen.
//
// POR QUÉ EXISTE: de la auditoría de los subs uruguayos (ver la nota de memoria de la sesión).
// «Declaración jurada de IRPF: ¿estoy obligado, en qué fechas, cómo cobro la devolución?» y
// «tengo deuda con DGI, ¿cuánto es la multa y prescribe?» aparecieron marcados por dos análisis
// temáticos independientes cada uno. La guía /guias/como-funciona-el-irpf-uruguay explica el
// impuesto (franjas, deducciones) pero no el TRÁMITE, y de prescripción tributaria no había nada:
// `debtRelief.ts` cubre sólo la prescripción CIVIL, que es otro régimen.
//
// EL ERROR QUE ESTE MÓDULO EXISTE PARA EVITAR: creer que la patente y la contribución prescriben
// como los impuestos de DGI. No: el Código Tributario art. 1 EXCLUYE expresamente los tributos
// departamentales y aduaneros de su ámbito.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-10:
//   - Código Tributario (Ley 14.306), art. 1 — ámbito de aplicación
//     https://www.impo.com.uy/bases/codigo-tributario/14306-1974/1
//   - Código Tributario, art. 38 — prescripción
//     https://www.impo.com.uy/bases/codigo-tributario/14306-1974/38
//   - Código Tributario, art. 39 — interrupción de la prescripción
//     https://www.impo.com.uy/bases/codigo-tributario/14306-1974/39
//   - Código Tributario, art. 94 — mora, multa y recargos
//     https://www.impo.com.uy/bases/codigo-tributario/14306-1974/94
//   - DGI, «Cómo opera en DGI la prescripción»
//     https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/opera-dgi-prescripcion
//   - DGI, calendario de la campaña 2026 de IRPF
//     https://www.gub.uy/direccion-general-impositiva/comunicacion/noticias/calendario-campana-2026-irpf

/** Fecha en que cada regla y cifra se contrastó con las fuentes de arriba. */
export const DGI_VERIFIED_AT = '2026-08-10'

export interface DgiSource {
  label: string
  url: string
}

export const DGI_SOURCES: readonly DgiSource[] = Object.freeze([
  {
    label: 'Código Tributario art. 1 — ámbito (excluye departamentales y aduaneros)',
    url: 'https://www.impo.com.uy/bases/codigo-tributario/14306-1974/1',
  },
  {
    label: 'Código Tributario art. 38 — prescripción',
    url: 'https://www.impo.com.uy/bases/codigo-tributario/14306-1974/38',
  },
  {
    label: 'Código Tributario art. 39 — interrupción',
    url: 'https://www.impo.com.uy/bases/codigo-tributario/14306-1974/39',
  },
  {
    label: 'Código Tributario art. 94 — mora, multa y recargos',
    url: 'https://www.impo.com.uy/bases/codigo-tributario/14306-1974/94',
  },
  {
    label: 'DGI — Cómo opera en DGI la prescripción',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/opera-dgi-prescripcion',
  },
  {
    label: 'DGI — Calendario de la campaña 2026 de IRPF',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/noticias/calendario-campana-2026-irpf',
  },
])

// ---------------------------------------------------------------------------
// Declaración jurada de IRPF
// ---------------------------------------------------------------------------

/**
 * Los datos de la campaña, guardados CON el ejercicio al que corresponden.
 *
 * El umbral se publica en pesos y cambia todos los años. NO lo convertimos a BPC: no encontramos
 * fuente que exprese la regla en BPC, y deducir el múltiplo dividiendo sería inventar una norma.
 */
export interface IrpfCampaign {
  /** Año de los ingresos que se declaran. */
  incomeYear: number
  /** Año en que se presenta. */
  campaignYear: number
  /** Ingreso nominal anual por encima del cual un dependiente puede quedar obligado. */
  incomeThreshold: number
  /** Apertura del formulario para dependientes. */
  opensForDependents: string
  /** Apertura general de la campaña. */
  opens: string
  /** Último día para presentar. */
  deadline: string
  /** Desde cuándo se cobran las devoluciones originadas en la declaración. */
  refundsFrom: string
  /** Día del mes que corta el cobro de la devolución (ver REFUND_RULE). */
  refundCutoffDay: number
}

export const IRPF_CAMPAIGN: IrpfCampaign = Object.freeze({
  incomeYear: 2025,
  campaignYear: 2026,
  incomeThreshold: 963_510,
  opensForDependents: '2026-06-26',
  opens: '2026-06-29',
  deadline: '2026-08-31',
  refundsFrom: '2026-07-28',
  refundCutoffDay: 15,
})

/** La regla que casi nadie conoce y que decide si cobrás este mes o el que viene. */
export const REFUND_RULE =
  'Si presentás antes del día 15, la devolución se cobra antes de fin de mes en bancos o redes de cobranza. Si presentás después, pasa al mes siguiente.'

export type FilerKind = 'dependiente' | 'independiente' | 'capital'

export interface ObligationCase {
  kind: FilerKind
  /** El caso, en las palabras del lector. */
  situation: string
  /** Qué lo dispara. */
  detail: string
}

/**
 * Quiénes SÍ están obligados. La propia DGI arranca aclarando que «la mayoría de las personas no
 * están obligadas», así que la página tiene que dejar clarísimo el borde.
 */
export const OBLIGATION_CASES: readonly ObligationCase[] = Object.freeze([
  {
    kind: 'dependiente',
    situation: 'Superaste el tope y no cobraste nada en diciembre',
    detail:
      'Si tus ingresos nominales del año superaron el tope y en diciembre no tuviste ingresos, el ajuste anual no se te pudo hacer en el recibo y hay que declarar.',
  },
  {
    kind: 'dependiente',
    situation: 'Superaste el tope y tuviste más de un empleador',
    detail:
      'Cada empleador retiene como si fuera el único, así que la suma casi nunca coincide con lo que te correspondía. Es el caso más común.',
  },
  {
    kind: 'dependiente',
    situation: 'Tuviste ingresos simultáneos y no presentaste el formulario 3100',
    detail:
      'El 3100 es el que le avisa a un empleador que tenés otro ingreso para que retenga bien. Sin él, la retención queda mal y se corrige declarando.',
  },
  {
    kind: 'dependiente',
    situation: 'Optaste por la reducción del 5 % por núcleo familiar',
    detail: 'Haber optado por esa reducción en la retención mensual obliga a declarar después.',
  },
  {
    kind: 'independiente',
    situation: 'Prestaste servicios personales fuera de relación de dependencia',
    detail:
      'Profesionales y no profesionales que facturaron por su cuenta y no tributaron IRAE por esas rentas están obligados.',
  },
  {
    kind: 'capital',
    situation: 'Tuviste rentas de capital sin retención',
    detail:
      'Intereses, alquileres o incrementos patrimoniales sobre los que nadie te retuvo. Se declaran en el formulario 1101.',
  },
])

/** El caso que NO obliga. Se publica explícito porque es la mayoría de la gente. */
export const NOT_OBLIGATED =
  'Trabajador dependiente con un solo empleador, ingresos por debajo del tope y que cobró en diciembre: el ajuste anual ya se hizo en el recibo y no hay que presentar nada.'

export interface IrpfForm {
  code: string
  use: string
}

export const IRPF_FORMS: readonly IrpfForm[] = Object.freeze([
  { code: '1102', use: 'Declaración individual.' },
  { code: '1103', use: 'Declaración por núcleo familiar.' },
  { code: '1101', use: 'Rentas de capital.' },
])

// ---------------------------------------------------------------------------
// Mora: qué se paga por llegar tarde (Código Tributario art. 94)
// ---------------------------------------------------------------------------

export interface MoraTier {
  /** Cuándo se paga. */
  when: string
  /** Multa sobre el tributo, en porcentaje. */
  pct: number
  detail: string
}

/**
 * La multa por mora escala con el atraso. Se configura «por el solo vencimiento del término»:
 * no hace falta que DGI te intime ni que te enteres.
 */
export const MORA_TIERS: readonly MoraTier[] = Object.freeze([
  {
    when: 'Dentro de los 5 días hábiles del vencimiento',
    pct: 5,
    detail: 'La ventana barata. Si te acordaste tarde pero enseguida, es acá.',
  },
  {
    when: 'Entre los 5 días hábiles y los 90 días corridos',
    pct: 10,
    detail: 'El tramo intermedio.',
  },
  {
    when: 'Después de los 90 días corridos',
    pct: 20,
    detail: 'El máximo de la multa por mora.',
  },
])

/** Multa aplicable cuando se pide facilidades de pago, en cualquier momento del plazo. */
export const MORA_FACILIDADES_PCT = 10

/**
 * Además de la multa corren recargos mensuales. NO publicamos una tasa: el art. 94 dice que la
 * fija el Poder Ejecutivo y sólo pone un techo relativo a las tasas del BCU, así que cualquier
 * número concreto que pusiéramos acá envejecería mal.
 */
export const RECARGOS_RULE =
  'Sobre la multa corren además recargos mensuales, calculados día por día. La tasa la fija el Poder Ejecutivo y no puede superar en más de un 10 % las tasas máximas fijadas por el Banco Central del Uruguay, así que el importe final hay que pedirlo a DGI.'

/** El caso en que se puede pagar sin multa ni recargos. */
export const GOOD_HISTORY_RELIEF =
  'Los organismos recaudadores pueden aceptar el pago sin multa ni recargos cuando el contribuyente tiene buena historia de pago (al menos un año) y paga dentro del mes del vencimiento, o cuando un tercero doloso le impidió cumplir.'

// ---------------------------------------------------------------------------
// Prescripción tributaria (Código Tributario arts. 38 y 39)
// ---------------------------------------------------------------------------

/** Plazo general de prescripción del derecho al cobro de los tributos, en años. */
export const PRESCRIPTION_YEARS = 5

/** Plazo ampliado, en años. */
export const PRESCRIPTION_YEARS_EXTENDED = 10

/** Desde cuándo se cuenta. Es lo que más se malinterpreta: no corre desde que te reclaman. */
export const PRESCRIPTION_START =
  'Se cuenta a partir de la terminación del año civil en que se produjo el hecho gravado. Para impuestos anuales sobre ingresos o utilidades, el hecho gravado se considera ocurrido al cierre del ejercicio económico.'

/** Los supuestos que llevan el plazo a 10 años. */
export const EXTENSION_CAUSES: readonly string[] = Object.freeze([
  'Defraudación.',
  'No haber cumplido con la obligación de inscribirse.',
  'No haber denunciado el acaecimiento del hecho generador.',
  'No haber presentado las declaraciones.',
  'Cuando el tributo lo determina el organismo recaudador y este no tuvo conocimiento del hecho.',
])

/** Qué interrumpe el plazo (art. 39). Interrumpir = volver a cero. */
export const INTERRUPTION_CAUSES: readonly string[] = Object.freeze([
  'El acta final de inspección.',
  'La notificación de la resolución del organismo competente.',
])

/** La regla práctica que cambia todo: la prescripción no se aplica sola. */
export const PRESCRIPTION_NOT_AUTOMATIC =
  'La prescripción NO opera automáticamente: opera a petición de parte. Aunque el plazo esté cumplido, hay que hacer el trámite administrativo en el que se declara prescripto el derecho al cobro. Si no lo pedís, la deuda te sigue figurando.'

/** Sanciones e intereses siguen al tributo, salvo la contravención. */
export const SANCTIONS_PRESCRIPTION =
  'El derecho al cobro de las sanciones e intereses prescribe en el mismo plazo que el tributo al que corresponden. La excepción son las sanciones por contravención y por instigación pública a no pagar tributos: ahí el plazo es siempre de cinco años.'

/**
 * EL PUNTO CRÍTICO. El Código Tributario art. 1 dice, textual: «Las disposiciones de este Código
 * son aplicables a todos los tributos, con excepción de los aduaneros y los departamentales».
 * Es decir: la patente y la contribución inmobiliaria NO prescriben por el art. 38.
 */
export const DEPARTMENTAL_EXCLUSION =
  'El Código Tributario excluye expresamente de su ámbito a los tributos aduaneros y a los departamentales. La patente de rodados y la contribución inmobiliaria son departamentales: no se rigen por el plazo del artículo 38, sino por las normas de cada intendencia. Preguntá en la intendencia que corresponde, no asumas los cinco años.'

export interface DebtRegime {
  label: string
  who: string
  rule: string
  /** Ruta interna del sitio que desarrolla ese régimen, si existe. */
  to?: string
}

/** Los tres regímenes que la gente mezcla. Separarlos ES la respuesta. */
export const DEBT_REGIMES: readonly DebtRegime[] = Object.freeze([
  {
    label: 'Tributos nacionales (DGI, BPS)',
    who: 'IRPF, IVA, IRAE, aportes.',
    rule: 'Código Tributario art. 38: cinco años desde el fin del año civil del hecho gravado, diez en los supuestos agravados. Hay que pedirla.',
  },
  {
    label: 'Tributos departamentales',
    who: 'Patente de rodados, contribución inmobiliaria, tasas municipales.',
    rule: 'Fuera del Código Tributario (art. 1). Rige lo que disponga cada intendencia.',
  },
  {
    label: 'Deuda privada',
    who: 'Bancos, financieras, tarjetas, estudios de cobranza.',
    rule: 'Régimen civil y comercial, con plazos distintos según el título. Nada que ver con el tributario.',
    to: '/saldar-deudas-uruguay',
  },
])

export interface DgiFaq {
  question: string
  short: string
  answer: string
}

export const DGI_FAQ: readonly DgiFaq[] = Object.freeze([
  {
    question: '¿Tengo que presentar declaración de IRPF?',
    short: 'La mayoría no. El caso típico que sí es haber tenido más de un empleador.',
    answer:
      'La propia DGI aclara que la mayoría de las personas no están obligadas. Si sos dependiente, tuviste un solo empleador, cobraste en diciembre y no superaste el tope del año, el ajuste anual ya se hizo en tu recibo y no tenés que hacer nada. Estás obligado si tuviste más de un empleador y superaste el tope, si superaste el tope y no cobraste en diciembre, si tuviste ingresos simultáneos y no presentaste el formulario 3100, si optaste por la reducción del 5 % por núcleo familiar, si prestaste servicios personales fuera de relación de dependencia, o si tuviste rentas de capital sin retención.',
  },
  {
    question: '¿Cuándo cobro la devolución?',
    short: 'Depende de si presentaste antes o después del día 15.',
    answer:
      'Las devoluciones originadas en la declaración jurada se empiezan a pagar el 28 de julio. Si presentaste antes del día 15, cobrás antes de fin de mes en bancos o redes de cobranza; si presentaste después, pasa al mes siguiente. Es la regla que más cambia la fecha de cobro y casi nadie la tiene presente.',
  },
  {
    question: 'Me da a pagar y no llego: ¿cuánto es la multa?',
    short: '5 % dentro de los 5 días hábiles, 10 % hasta 90 días, 20 % después.',
    answer:
      'La mora se configura por el solo vencimiento del plazo: no hace falta que DGI te intime. La multa es del 5 % si pagás dentro de los cinco días hábiles siguientes al vencimiento, 10 % entre esos cinco días hábiles y los 90 días corridos, y 20 % pasados los 90 días. Si pedís facilidades de pago, se aplica el 10 %. Además corren recargos mensuales que fija el Poder Ejecutivo.',
  },
  {
    question: '¿Prescriben las deudas con DGI?',
    short: 'Sí, a los 5 años — o 10 si no declaraste. Pero no se aplica sola.',
    answer:
      'El derecho al cobro prescribe a los cinco años contados desde el fin del año civil en que se produjo el hecho gravado. El plazo se estira a diez años si hubo defraudación, si no te inscribiste, si no denunciaste el hecho generador, si no presentaste las declaraciones, o si el organismo no tuvo conocimiento del hecho. Y hay una trampa práctica: la prescripción no opera automáticamente, opera a petición de parte. Hay que hacer el trámite para que se declare.',
  },
  {
    question: '¿La patente vieja prescribe a los cinco años igual que un impuesto de DGI?',
    short: 'No. El Código Tributario excluye los tributos departamentales.',
    answer:
      'El artículo 1 del Código Tributario dice que sus disposiciones se aplican a todos los tributos «con excepción de los aduaneros y los departamentales». La patente de rodados y la contribución inmobiliaria son departamentales, así que el plazo del artículo 38 no las rige: hay que ver qué dispone la intendencia que corresponde. Es la confusión más cara de esta página, porque lleva a dejar correr una deuda creyendo que se va a caer sola.',
  },
  {
    question: '¿Qué interrumpe el plazo de prescripción?',
    short: 'El acta final de inspección y la notificación de la resolución del organismo.',
    answer:
      'Interrumpir significa que el plazo vuelve a empezar de cero. En materia tributaria lo interrumpen el acta final de inspección y la notificación de la resolución del organismo competente. Por eso una inspección vieja puede haber reiniciado un plazo que creías cumplido.',
  },
])
