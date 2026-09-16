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
  {
    label: 'Texto Ordenado 2023 DGI, art. 51 (Título 7) — crédito fiscal por arrendamiento',
    url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/51_T7',
  },
  {
    label: 'DGI — Crédito fiscal por arrendamiento de inmuebles en IRPF',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/credito-fiscal-arrendamiento-inmuebles-irpf',
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

// The procedure review is separate from campaign amounts, sanctions and debt
// prescription above/below. Do not advance DGI_VERIFIED_AT for these new links.
// DGI's 2026 campaign still links the pending-return (24/05/2024) and
// reliquidation (26/06/2025) guides. Form 1102 is work income, category II.
// Applications for older years do not establish that a credit remains payable.
export const IRPF_PROCEDURES_VERIFIED_AT = '2026-09-14'

export const IRPF_PROCEDURE_SOURCES = Object.freeze({
  portal: 'https://servicios.dgi.gub.uy/serviciosenlinea/irpf/principal_irpf',
  refunds:
    'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/devoluciones-del-irpf',
  pending:
    'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/usted-tiene-pendiente-presentacion-declaraciones-juradas-0',
  correction:
    'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/reliquidacion-declaracion-jurada-irpf',
  form1102:
    'https://www.gub.uy/direccion-general-impositiva/politicas-y-gestion/aplicacion-formulario-1102?hrt=436',
})

type IrpfProcedureLang = 'es' | 'en' | 'pt'
interface IrpfPastYearsCopy {
  heading: string
  cases: readonly {
    id: 'registered' | 'pending' | 'correction'
    heading: string
    body: string
    action: string
    source: 'portal' | 'pending' | 'correction'
  }[]
  limit: string
  verifiedLabel: string
  additionalSources: Record<'refunds' | 'form1102', string>
}

// Portal labels stay in Spanish in each locale so readers can find the actual
// public menu. No assumptions about controls behind authentication are included.
const IRPF_PAST_YEARS_COPY: Record<IrpfProcedureLang, IrpfPastYearsCopy> = {
  es: {
    heading: 'Devoluciones y declaraciones de años anteriores',
    cases: [
      {
        id: 'registered',
        heading: 'Ya presentaste y querés consultar la devolución',
        body: 'Ingresá con tu identidad digital a Servicios en Línea de DGI y buscá «Consulta de Devoluciones». El estado puede indicar que está disponible o que tiene observaciones. Para resolver estas últimas, DGI ofrece «Trámite devolución con observaciones»: allí identifica los formularios, años y documentos requeridos. El cobro queda sujeto a sus controles.',
        action: 'Consultar devoluciones en DGI',
        source: 'portal',
      },
      {
        id: 'pending',
        heading: 'Te quedó una declaración pendiente',
        body: 'El portal ofrece «Declaracion IRPF · Anteriores». Revisá el ejercicio que corresponde y sus datos; presentar un año atrasado puede dar saldo a pagar o crédito. La guía de declaraciones pendientes explica el acceso para omisos, pero no garantiza que resulte una devolución.',
        action: 'Ver la guía de declaraciones pendientes',
        source: 'pending',
      },
      {
        id: 'correction',
        heading: 'Necesitás corregir una declaración presentada',
        body: 'Para rentas de trabajo del formulario 1102, DGI indica usar la aplicación del período y seleccionar RELIQUIDACIÓN. Incluí toda la información del ejercicio: reemplaza la declaración anterior, no sólo los datos que cambiás. La guía oficial explica su presentación por web o redes de cobranza.',
        action: 'Ver cómo reliquidar el formulario 1102',
        source: 'correction',
      },
    ],
    limit:
      'Consultá a DGI por el ejercicio y tu situación concreta para saber si el crédito sigue cobrable. No apliques el calendario de la campaña actual a una devolución de otro año.',
    verifiedLabel: 'Fuentes de estos trámites consultadas el',
    additionalSources: {
      refunds: 'DGI: estados y observaciones de las devoluciones',
      form1102: 'DGI: aplicación e instructivos del formulario 1102 por ejercicio',
    },
  },
  en: {
    heading: 'Refunds and tax returns for previous years',
    cases: [
      {
        id: 'registered',
        heading: 'You filed a return and want to check the refund',
        body: 'Sign in to DGI online services with your digital identity and look for “Consulta de Devoluciones”. Its status may show that the refund is available or has issues requiring attention. “Trámite devolución con observaciones” identifies the forms, years and documents needed to address those issues. Payment remains subject to DGI checks.',
        action: 'Check refunds with DGI',
        source: 'portal',
      },
      {
        id: 'pending',
        heading: 'You have an unfiled return',
        body: 'The portal provides “Declaracion IRPF · Anteriores”. Review the relevant tax year and its information; filing late may result in tax owed or a credit. DGI’s guide for outstanding returns explains access for people who have not filed, but does not guarantee a refund.',
        action: 'Read the guide to outstanding returns',
        source: 'pending',
      },
      {
        id: 'correction',
        heading: 'You need to correct a filed return',
        body: 'For work income reported on form 1102, DGI instructs you to use the application for that year and select RELIQUIDACIÓN. Include all information for the year: it replaces the earlier return, not just the figures you change. The official guide explains submission online or through payment networks.',
        action: 'Read how to amend form 1102',
        source: 'correction',
      },
    ],
    limit:
      'Ask DGI whether the credit for your specific tax year and circumstances can still be collected. Do not apply the current campaign’s payment calendar to a refund for another year.',
    verifiedLabel: 'Sources for these procedures checked on',
    additionalSources: {
      refunds: 'DGI: refund status and issues requiring attention',
      form1102: 'DGI: form 1102 application and instructions by tax year',
    },
  },
  pt: {
    heading: 'Devoluções e declarações de anos anteriores',
    cases: [
      {
        id: 'registered',
        heading: 'Você já declarou e quer consultar a devolução',
        body: 'Acesse os serviços on-line da DGI com sua identidade digital e procure “Consulta de Devoluciones”. O estado pode indicar que a devolução está disponível ou tem pendências. Em “Trámite devolución con observaciones”, a DGI identifica os formulários, anos e documentos necessários para resolvê-las. O pagamento depende das verificações da DGI.',
        action: 'Consultar devoluções na DGI',
        source: 'portal',
      },
      {
        id: 'pending',
        heading: 'Ficou uma declaração por apresentar',
        body: 'O portal oferece “Declaracion IRPF · Anteriores”. Confira o exercício correspondente e seus dados; apresentar um ano em atraso pode resultar em imposto a pagar ou crédito. O guia de declarações pendentes explica o acesso para quem não declarou, mas não garante uma devolução.',
        action: 'Ver o guia de declarações pendentes',
        source: 'pending',
      },
      {
        id: 'correction',
        heading: 'Você precisa corrigir uma declaração apresentada',
        body: 'Para rendimentos do trabalho no formulário 1102, a DGI orienta usar o aplicativo do exercício e selecionar RELIQUIDACIÓN. Inclua todas as informações do ano: ela substitui a declaração anterior, não apenas os dados alterados. O guia oficial explica a apresentação pela internet ou pelas redes de cobrança.',
        action: 'Ver como retificar o formulário 1102',
        source: 'correction',
      },
    ],
    limit:
      'Consulte a DGI sobre o exercício e sua situação específica para saber se o crédito ainda pode ser recebido. Não aplique o calendário da campanha atual a uma devolução de outro ano.',
    verifiedLabel: 'Fontes destes procedimentos consultadas em',
    additionalSources: {
      refunds: 'DGI: estado e pendências das devoluções',
      form1102: 'DGI: aplicativo e instruções do formulário 1102 por exercício',
    },
  },
}

export function irpfPastYearsCopy(locale = 'es'): IrpfPastYearsCopy {
  return IRPF_PAST_YEARS_COPY[
    locale.startsWith('en') ? 'en' : locale.startsWith('pt') ? 'pt' : 'es'
  ]
}

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
// Crédito fiscal de IRPF por arrendamiento (T.O. 2023 DGI, art. 51 Título 7)
// ---------------------------------------------------------------------------
//
// EL HALLAZGO: el porcentaje vigente es 8 %, no el 6 % que circula en foros y notas
// viejas. El 6 % es dos cosas a la vez, y ninguna es "el crédito general de hoy":
// (a) fue la tasa histórica, para ejercicios cerrados antes del 31/12/2023, y
// (b) sigue siendo, en el MISMO artículo, el tope de un régimen distinto: los
// arrendamientos turísticos temporarios, no la vivienda permanente.
//
// Verificado por fetch directo a impo.com.uy el 2026-09-16 (ambas citas, verbatim).
//
// El dossier marcaba SIN VERIFICAR cinco puntos: plazo del contrato, si hace falta
// registrarlo, el formulario exacto, el tope contra el IRPF de rentas del trabajo y el
// orden IRPF→IASS. Los cinco se confirmaron el 2026-09-16 con cita verbatim propia contra
// la publicación de DGI "Crédito fiscal por arrendamiento de inmuebles en IRPF" (ver
// DGI_SOURCES) y se publican como hecho, cada uno con su cita textual abajo. La regla que
// sigue rigiendo: lo que no tenga cita verbatim propia no se afirma, va como "confirmá en
// DGI" — pero para estos cinco esa cita ya existe.
//
// TRAMPA DE FECHA: esa publicación de DGI está fechada 26/01/2026 y es la guía de la
// campaña 2026 (ejercicio 2025) — dice literalmente «el 8% del precio del arrendamiento
// efectivamente pagado correspondiente al año 2025». La REGLA no cambia de año a año: es
// el alquiler efectivamente pagado y DEVENGADO en el ejercicio que se declara, no un año
// fijo. Por eso ningún texto de esta sección cita «2025»: se generaliza como «el ejercicio
// que declarás» para no quedar vieja en la campaña 2027 (fix round 2, 2026-09-16).
//
// FIX ROUND 3 (2026-09-16): "la única condición es identificar al arrendador" era falso y
// se contradecía con la propia tabla de la sección. El artículo 51-T7 (T.O. 2023) exige eso
// y nada más EN EL TEXTO LEGAL, pero la guía operativa de DGI agrega condiciones propias
// para poder COMPUTAR el crédito: contrato escrito de un año o más (aunque esté vencido),
// ser titular del contrato de arrendamiento, y haber generado IRPF por rentas de trabajo en
// el ejercicio. La frase "única condición" / "no exige nada más" se retiró de toda la
// sección (prosa, FAQ y encabezados). Se agregó "titular del contrato", que no estaba
// publicado, y se corrigió RENTAL_CREDIT_CONTRACT_QUOTE: cortaba la oración antes de ", en
// tanto puedan identificar al arrendador" sin marcarlo — el texto completo de esta sección
// del T.O. 2023 (impo.com.uy) además confirma "titular" desde la propia ley: "Dicha
// imputación se realizará por parte del titular o titulares del contrato de arrendamiento,
// en las condiciones que establezca la reglamentación" (oración aparte, inmediatamente
// después de RENTAL_CREDIT_QUOTE, no incluida ahí porque esa cita ya cierra en un punto
// real y no está cortada a mitad de oración).

/** Cuándo se contrastaron estas cifras y citas contra el T.O. 2023 y la publicación de DGI. */
export const RENTAL_CREDIT_VERIFIED_AT = '2026-09-16'

/** El porcentaje vigente, para vivienda permanente. */
export const RENTAL_CREDIT_PCT = 8

/** El porcentaje histórico (ejercicios cerrados antes del 31/12/2023). No es el vigente. */
export const RENTAL_CREDIT_PCT_HISTORIC = 6

/** El tope del régimen turístico temporario, en el MISMO artículo. Tampoco es el vigente. */
export const RENTAL_CREDIT_TOURISM_PCT = 6

/**
 * Cita verbatim, T.O. 2023 DGI, art. 51 Título 7 (impo.com.uy). Es la que sostiene el 8 %.
 */
export const RENTAL_CREDIT_QUOTE =
  'Los contribuyentes que fueran arrendatarios de inmuebles con destino a vivienda permanente podrán imputar el pago de este impuesto hasta el monto equivalente al 8% (ocho por ciento) del precio del arrendamiento, siempre que se identifique el arrendador.'

/**
 * El mismo artículo, para un régimen DISTINTO (turístico temporario). De acá sale la confusión
 * del 6 %: no es un error de nadie, es otro párrafo del mismo artículo con otro destino.
 */
export const RENTAL_CREDIT_TOURISM_QUOTE =
  'Para los arrendamientos temporarios de inmuebles con fines turísticos, facúltase al Poder Ejecutivo a instrumentar un régimen de imputación de un monto de hasta el 6% (seis por ciento) del precio del arrendamiento, siempre que se identifique al arrendador.'

/**
 * Lo que exige el ARTÍCULO (identificar al arrendador) NO es lo mismo que lo que exige DGI para
 * poder computar el crédito. Antes esta constante decía "única condición" / "no exige nada más",
 * lo cual era falso y se contradecía con la propia tabla de la sección (fix round 3).
 */
export const RENTAL_CREDIT_CONDITION =
  'El artículo 51 (Título 7) del Texto Ordenado exige una sola cosa para el crédito en sí: identificar al arrendador (nombre y documento o RUT). Pero la guía operativa de DGI agrega condiciones propias para poder computarlo: el contrato tiene que ser escrito y de un año o más (aunque esté vencido), tenés que ser titular del contrato de arrendamiento, y tenés que haber generado IRPF por rentas de trabajo en el ejercicio que declarás. Cada una, con su cita, está en la tabla de abajo.'

/** Por qué el 6 % sigue circulando, en una sola idea. */
export const RENTAL_CREDIT_CONFUSION =
  'No es un error: el 6 % fue la tasa vigente para ejercicios cerrados antes del 31/12/2023, y en el mismo artículo del Texto Ordenado sigue siendo el tope de un régimen distinto (arrendamientos turísticos temporarios), no el de la vivienda permanente. Para alquilar donde vivís, hoy es 8 %.'

/** Publicación de DGI dedicada a este crédito. Fuente de las citas que siguen. */
export const RENTAL_CREDIT_SOURCE_URL =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/credito-fiscal-arrendamiento-inmuebles-irpf'

/**
 * La base de cálculo, generalizada a propósito. La guía de DGI de arriba habla del "año 2025"
 * porque es la guía de esa campaña puntual (fechada 26/01/2026): la regla de fondo no es un año
 * fijo, es el ejercicio que cada quien declara.
 */
export const RENTAL_CREDIT_BASIS =
  'El crédito se calcula sobre el 8 % del alquiler efectivamente pagado y devengado en el ejercicio que declarás, no sobre un año fijo: la guía de DGI que citamos es la de una campaña puntual y usa un año como ejemplo.'

/**
 * Los cinco puntos que el dossier marcaba sin verificar, YA confirmados con cita verbatim
 * propia contra la publicación de DGI de arriba (fetch 2026-09-16). Un elemento nuevo que no
 * traiga su propia cita verbatim de una fuente primaria no entra en esta lista: se hedgea.
 */
export interface RentalCreditFact {
  /** La pregunta que resuelve, en las palabras del lector. */
  heading: string
  /** Cita verbatim de la publicación de DGI (RENTAL_CREDIT_SOURCE_URL). */
  quote: string
}

/**
 * El contrato: escrito, un año o más, puede estar vencido. Cita verbatim DGI, fetch 2026-09-16.
 * Oración COMPLETA (fix round 3: la versión anterior cortaba antes de ", en tanto puedan
 * identificar al arrendador" sin marcar el corte, presentando una oración truncada como si
 * fuera la cita entera).
 */
export const RENTAL_CREDIT_CONTRACT_QUOTE =
  'Tendrán acceso entonces los contribuyentes del IRPF por rentas de trabajo que fueran arrendatarios de inmuebles con destino a vivienda permanente, cuyos contratos hayan sido celebrados por escrito (aunque se encuentren vencidos) y tengan un plazo igual o mayor a un año, en tanto puedan identificar al arrendador.'

/** No hace falta registrar el contrato. Cita verbatim DGI, fetch 2026-09-16. */
export const RENTAL_CREDIT_REGISTRATION_QUOTE =
  'No es condición necesaria que el contrato se encuentre inscripto para poder computar el crédito.'

/** Cómo se reclama: formulario 1102 o 1103. Cita verbatim DGI, fetch 2026-09-16. */
export const RENTAL_CREDIT_FORMS_QUOTE =
  'Debe presentar la declaración jurada correspondiente, formulario 1102 o 1103.'

/** El tope: el excedente no se devuelve ni se arrastra. Cita verbatim DGI, fetch 2026-09-16. */
export const RENTAL_CREDIT_CAP_QUOTE =
  'En caso de surgir un excedente, el mismo no podrá ser imputado a impuestos de futuros ejercicios ni dará derecho a devolución.'

/** Orden de imputación: primero IRPF, el excedente después contra IASS. Cita verbatim DGI, fetch 2026-09-16. */
export const RENTAL_CREDIT_ORDER_QUOTE =
  'El crédito fiscal por arrendamientos debe imputarse en primer término al IRPF y el excedente podrá imputarse al IASS.'

/**
 * Alquiler pagado por adelantado: sólo se imputa lo devengado en cada año, no el pago completo.
 * Cita verbatim DGI, fetch 2026-09-16.
 */
export const RENTAL_CREDIT_ADVANCE_QUOTE =
  'En caso que se pague el arrendamiento por adelantado (por ejemplo se abona el alquiler de dos años), únicamente se permite imputar el 8% del arrendamiento efectivamente pagado y devengado en el año correspondiente.'

/**
 * Dos o más arrendatarios en el mismo contrato: se reparte de común acuerdo, o en partes
 * iguales si no lo hay. Cita verbatim DGI, fetch 2026-09-16.
 */
export const RENTAL_CREDIT_MULTI_TENANT_QUOTE =
  'El crédito fiscal a computar, se deberá considerar de común acuerdo. En caso contrario, el crédito será considerado en partes iguales.'

/**
 * Sólo puede reclamarlo quien sea titular del contrato de arrendamiento. Cita verbatim DGI,
 * fetch 2026-09-16. Confirmado ADEMÁS, en una oración aparte, por el propio T.O. 2023 (art.
 * 51-T7, impo.com.uy): "Dicha imputación se realizará por parte del titular o titulares del
 * contrato de arrendamiento, en las condiciones que establezca la reglamentación." — es la
 * condición que la sección no publicaba (fix round 3).
 */
export const RENTAL_CREDIT_TITULAR_QUOTE =
  'Solamente podrán acceder a este crédito quienes sean titulares del contrato de arrendamiento.'

/**
 * Hay que haber generado IRPF por rentas de trabajo en el ejercicio. Cita verbatim DGI, fetch
 * 2026-09-16, cortada a propósito ANTES del año de la campaña («…durante el ejercicio 2025.»)
 * para no repetir el error del round 2 (esta guía es de la campaña 2026 y envejecería mal si
 * citáramos "2025" como si fuera la regla). El corte se marca con «…», tal como pide fix round 3
 * para cualquier cita que no cierre en el punto real de la oración.
 */
export const RENTAL_CREDIT_IRPF_REQUIRED_QUOTE =
  'En primer lugar, para computar el crédito fiscal es necesario haber generado IRPF por rentas de trabajo durante el ejercicio…'

/** Las nueve, en el orden en que responden las preguntas de la sección y del FAQ. */
export const RENTAL_CREDIT_FACTS: readonly RentalCreditFact[] = Object.freeze([
  { heading: 'El contrato', quote: RENTAL_CREDIT_CONTRACT_QUOTE },
  { heading: '¿Quién puede reclamarlo?', quote: RENTAL_CREDIT_TITULAR_QUOTE },
  { heading: 'Tenés que haber generado IRPF', quote: RENTAL_CREDIT_IRPF_REQUIRED_QUOTE },
  { heading: '¿Hay que registrarlo?', quote: RENTAL_CREDIT_REGISTRATION_QUOTE },
  { heading: 'Cómo se reclama', quote: RENTAL_CREDIT_FORMS_QUOTE },
  { heading: '¿Tiene tope?', quote: RENTAL_CREDIT_CAP_QUOTE },
  { heading: 'IRPF primero, después IASS', quote: RENTAL_CREDIT_ORDER_QUOTE },
  { heading: 'Si pagaste el alquiler adelantado', quote: RENTAL_CREDIT_ADVANCE_QUOTE },
  {
    heading: 'Si el contrato tiene más de un arrendatario',
    quote: RENTAL_CREDIT_MULTI_TENANT_QUOTE,
  },
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

/**
 * Qué interrumpe el plazo (art. 39). Interrumpir = volver a cero.
 *
 * Estaban SÓLO las dos primeras, presentadas como la lista completa. El artículo enumera seis, y
 * las que faltaban son justamente las que perjudican a quien está leyendo esta página: reconocer la
 * deuda —expresa o TÁCITAMENTE— y pagar cualquier parte de ella reinician el plazo entero. Alguien
 * que abona una cuota para "mostrar voluntad de pago" acaba de resucitar una deuda que podía estar
 * prescripta, y la página no se lo decía. El propio sitio ya lo advertía para las multas de
 * tránsito (`trafficFines.ts`), así que además se contradecía.
 *
 * Texto vigente leído en impo.com.uy el 2026-09-03. La lista termina abierta porque el artículo
 * termina abierto: "y por todos los demás medios del derecho común" no es una fórmula de cortesía.
 */
export const INTERRUPTION_CAUSES: readonly string[] = Object.freeze([
  'El acta final de inspección.',
  'La notificación de la resolución del organismo competente de la que resulte un crédito contra el sujeto pasivo.',
  'El reconocimiento expreso o tácito de la obligación por parte del deudor.',
  'Cualquier pago o consignación total o parcial de la deuda, cuando ella proceda.',
  'El emplazamiento judicial.',
  'Todos los demás medios del derecho común.',
])

/**
 * La consecuencia práctica de las dos causales que faltaban.
 *
 * Va aparte de la lista porque es lo único de este artículo que cambia lo que alguien HACE hoy.
 */
export const INTERRUPTION_WARNING =
  'Pagar una parte de la deuda, o reconocerla aunque sea tácitamente —firmar un convenio, pedir un plan de pagos, aceptar el saldo—, hace que el plazo vuelva a empezar de cero. Es la forma más común de perder una prescripción que ya estaba cumplida: se abona una cuota para "mostrar voluntad de pago" y el reloj arranca de nuevo. Antes de pagar cualquier cosa sobre una deuda vieja, mirá si ya está prescripta.'

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
    question: '¿Cuánto puedo descontar del IRPF por el alquiler?',
    short:
      'Hasta el 8 % del alquiler de tu vivienda permanente, si cumplís las condiciones de DGI.',
    answer:
      'Si sos arrendatario de tu vivienda permanente, podés imputar contra tu IRPF hasta el 8 % del alquiler efectivamente pagado y devengado en el ejercicio que declarás, no de un año fijo. El Texto Ordenado 2023 de DGI lo dice así: "los contribuyentes que fueran arrendatarios de inmuebles con destino a vivienda permanente podrán imputar el pago de este impuesto hasta el monto equivalente al 8% (ocho por ciento) del precio del arrendamiento, siempre que se identifique el arrendador". Esa identificación es lo único que exige el artículo, pero la guía operativa de DGI agrega condiciones propias para poder computarlo: tenés que ser titular del contrato de arrendamiento, el contrato tiene que ser escrito y de un año o más (aunque esté vencido), y tenés que haber generado IRPF por rentas de trabajo en el ejercicio.',
  },
  {
    question: '¿El crédito por alquiler es 6 % u 8 %?',
    short: 'Es 8 % para vivienda permanente. El 6 % es otra cosa, dos veces.',
    answer:
      'Es 8 %, no 6 %. El 6 % que circula es dos cosas distintas y ninguna es el crédito general vigente: fue la tasa histórica, para ejercicios cerrados antes del 31/12/2023, y en el mismo artículo del Texto Ordenado 2023 de DGI sigue siendo el tope de un régimen aparte, el de los arrendamientos turísticos temporarios ("facúltase al Poder Ejecutivo a instrumentar un régimen de imputación de un monto de hasta el 6% (seis por ciento) del precio del arrendamiento, siempre que se identifique al arrendador"). Si alquilás para vivir todo el año, el porcentaje que te corresponde es 8 %.',
  },
  {
    question: '¿Cómo reclamo el crédito por alquiler?',
    short:
      'Ser titular de un contrato escrito de un año o más (puede estar vencido), sin necesidad de registrarlo, con el formulario 1102 o 1103.',
    answer:
      'DGI da acceso al crédito a "los contribuyentes del IRPF por rentas de trabajo que fueran arrendatarios de inmuebles con destino a vivienda permanente, cuyos contratos hayan sido celebrados por escrito (aunque se encuentren vencidos) y tengan un plazo igual o mayor a un año, en tanto puedan identificar al arrendador". Además, "solamente podrán acceder a este crédito quienes sean titulares del contrato de arrendamiento", y hace falta haber generado IRPF por rentas de trabajo en el ejercicio que declarás. No hace falta registrar el contrato: "no es condición necesaria que el contrato se encuentre inscripto para poder computar el crédito". El trámite es la declaración jurada anual: "debe presentar la declaración jurada correspondiente, formulario 1102 o 1103".',
  },
  {
    question: '¿El crédito por alquiler tiene tope?',
    short: 'Sí: se aplica primero contra el IRPF, después contra el IASS, y el sobrante se pierde.',
    answer:
      'Sí. DGI aclara el orden y qué pasa con lo que sobra: "el crédito fiscal por arrendamientos debe imputarse en primer término al IRPF y el excedente podrá imputarse al IASS". Y si aun así queda un excedente, se pierde: "en caso de surgir un excedente, el mismo no podrá ser imputado a impuestos de futuros ejercicios ni dará derecho a devolución". No se cobra aparte ni se arrastra al año siguiente.',
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
    short: 'Seis cosas, y dos dependen de vos: reconocer la deuda o pagar una parte.',
    answer:
      'Interrumpir significa que el plazo vuelve a empezar de cero. El artículo 39 del Código Tributario enumera seis causales: el acta final de inspección; la notificación de la resolución del organismo competente de la que resulte un crédito contra el sujeto pasivo; el reconocimiento expreso o tácito de la obligación por parte del deudor; cualquier pago o consignación total o parcial de la deuda; el emplazamiento judicial; y todos los demás medios del derecho común. Las dos que más importan son las que dependen de vos: pagar una cuota para «mostrar voluntad de pago», o reconocer la deuda aunque sea tácitamente, reinicia el plazo entero sobre una deuda que quizá ya estaba prescripta.',
  },
])
