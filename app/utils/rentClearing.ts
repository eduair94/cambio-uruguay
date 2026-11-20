// Research-backed content and the guarantee matcher for
// `pages/alquilar-estando-en-clearing.vue` — how to rent a home in Uruguay while
// listed in the "clearing".
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so the matcher can be
// unit-tested in plain Node via vitest (`tests/unit/rentClearing.test.ts`).
//
// SOURCING RULE (same spirit as `rentGuide.ts` and `companyTypes.ts`): every
// factual claim about a provider or a law is stamped to a PRIMARY source and a
// verification date. Where a claim could NOT be confirmed against a primary
// source it is marked so in the data, never dressed up as verified. Provider
// terms are volatile — re-check the links each review. The structural laws
// (Ley 18.331 de 2008, Ley 19.889 de 2020, Ley 20.212 de 2023, DL 14.219) are stable.
//
// First review, 2026-07-18:
//   - Clearing = privado (Equifax), telco→Clearing no BCU: IMPO revista, gub.uy
//     Huella Financiera, equifax.uy, bcu.gub.uy Central de Riesgos.
//   - Caducidad y acceso: Ley 18.331 arts. 22 y 14 (IMPO), Decreto 414/009.
//   - Seguro (Porto): "No estar en el Clearing" es EXCLUYENTE (portoseguroalquiler
//     /requisitos y /preguntas-frecuentes; dominio de asesor autorizado).
//   - FGA estatal (CGN/MVOT): no embargos, no BCU cat. 4/5, Clearing hasta 4
//     incumplimientos con refinanciación (gub.uy/tramites/garantia-alquiler).
//   - Ley 20.212 art. 631: los organismos públicos no pueden negar sus servicios
//     por ser deudor / figurar en fuentes comerciales (gub.uy MVOT + IMPO).
//
// Second review, 2026-11-19 (every quote re-read on 2026-11-20):
//   - ANDA SÍ publica que acepta gente en el Clearing. La primera revisión leyó
//     sólo la página del inquilino y dijo lo contrario; sus preguntas frecuentes
//     para propietarios e inmobiliarias dicen "Personas registradas en Clearing de
//     Informes pueden acceder al servicio. (Todos los casos están sujetos a
//     aprobación por parte de ANDA)". Su reglamento (art. 11) le reserva negar sin
//     dar motivos, por eso el selector la deja en "Posible" y nunca más arriba.
//   - FIDECIU: "No estar en el clearing de informes (no excluyente, se analiza
//     cada caso)" (fideciu.uy/requisitos-garantia-alquiler).
//   - Contaduría (SGA/CGN): es la garantía que el art. 631 de la Ley 20.212 nombra.
//     Sólo funcionarios públicos, empleados de empresas inscriptas en el SGA,
//     jubilados y pensionistas; el FGA excluye justamente a esas personas
//     (gub.uy/tramites/alquiler-contaduria-general-nacion y /garantia-alquiler).
//   - Siete aseguradoras, cada una en su propio sitio: ver INSURER_STANCES.
//   - Depósito BHU: especificación ES.AHR.04 v21 (PDF escaneado, leído de la imagen).
//   - Desalojo sin garantía 6 días hábiles (LUC art. 439) contra 20 días en el
//     régimen común (DL 14.219 art. 48).

export const RENT_CLEARING_LAST_REVIEWED = '2026-11-19'

// --- Primary sources -------------------------------------------------------

export interface ClearingSource {
  label: string
  url: string
  detail: string
}

export const RENT_CLEARING_SOURCES: readonly ClearingSource[] = Object.freeze([
  {
    label: 'IMPO — Clearing de Informes: guía al consumidor',
    url: 'https://www.impo.com.uy/revista/clearing-de-informes-guia-de-orientacion-a-los-consumidores/',
    detail:
      'El Clearing es un bureau de crédito privado (Equifax) y el titular puede pedir su historial gratis cada 6 meses.',
  },
  {
    label: 'BCU — Central de Riesgos Crediticios',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Central_de_Riesgos.aspx',
    detail:
      'Consolida solo información de instituciones financieras reguladas; no lista deudas de telecomunicaciones ni servicios públicos.',
  },
  {
    label: 'gub.uy — Huella Financiera (MIDES)',
    url: 'https://www.gub.uy/ministerio-desarrollo-social/pin/ahorro-credito-sistema-financiero/huella-financiera',
    detail:
      'Explica que Equifax-Clearing es una base privada (Ley 18.331) distinta de la Central de Riesgos del BCU, y que las deudas con servicios públicos (UTE, OSE y Antel fijo) permanecen sólo 5 años.',
  },
  {
    label: 'Ley 18.331, art. 22 (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/18331-2008/22',
    detail:
      'Caducidad: los datos comerciales de personas físicas se registran 5 años desde su incorporación; si siguen impagos, un solo nuevo registro por otros 5. Las obligaciones canceladas quedan 5 años no renovables desde la cancelación. El acreedor tiene 5 días hábiles para comunicar la cancelación y la base 3 días hábiles para actualizar el dato.',
  },
  {
    label: 'Ley 18.331, art. 14 (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/18331-2008/14',
    detail:
      'Derecho de acceso gratuito cada 6 meses; la información debe darse en 5 días hábiles, clara y sin codificaciones.',
  },
  {
    label: 'Ley 20.212, art. 631 (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/20212-2023/631',
    detail:
      'No puede negarse a las personas deudoras el acceso a servicios de organismos públicos, "incluyendo entre otros los servicios de garantía de alquiler de la Contaduría General de la Nación", por figurar en fuentes de datos comerciales.',
  },
  {
    label: 'MVOT — Estar en el Clearing no es obstáculo (Ley 20.212)',
    url: 'https://www.gub.uy/ministerio-vivienda-ordenamiento-territorial/comunicacion/noticias/estar-clearing-es-obstaculo-para-inscribirse-planes-programas-del-mvot',
    detail:
      'El Ministerio aplica la Ley 20.212 a la garantía de alquiler "en sus tres variantes": garantía de alquiler, para jóvenes y para retornados.',
  },
  {
    label: 'gub.uy — Garantía de alquiler de la Contaduría (SGA)',
    url: 'https://www.gub.uy/tramites/alquiler-contaduria-general-nacion',
    detail:
      'Para funcionarios públicos y empleados de empresas inscriptas en el registro del SGA (6 meses de antigüedad), jubilados y pensionistas. Pide el Informe de Líquido Disponible y la cédula; cobra el 3 % del alquiler a cada parte y lo descuenta del recibo. Consultas: 0800 8765.',
  },
  {
    label: 'gub.uy — Fondo de Garantía de Alquileres (FGA / CGN-MVOT)',
    url: 'https://www.gub.uy/tramites/garantia-alquiler',
    detail:
      'Requiere no tener embargos ni ser categoría 4 o 5 del BCU; en el Clearing tolera hasta 4 incumplimientos presentando su refinanciación. Ingreso 15–100 UR, alquiler de hasta 18 UR (21 UR en vivienda promovida), 120 días para usar el certificado. Excluye a jubilados, pensionistas, funcionarios públicos y empleados de empresas con convenio con la Contaduría.',
  },
  {
    label: 'ANV — Fondo de Garantía de Alquiler',
    url: 'https://www.anv.gub.uy/fondo-de-garantia-de-alquiler',
    detail: 'Inquilino y propietario pagan cada uno una comisión mensual del 3 % del alquiler.',
  },
  {
    label: 'ANDA — Preguntas frecuentes del propietario',
    url: 'https://anda.com.uy/garantia-de-alquiler/propietario/preguntas-frecuentes/',
    detail:
      '"Personas registradas en Clearing de Informes pueden acceder al servicio. (Todos los casos están sujetos a aprobación por parte de ANDA)."',
  },
  {
    label: 'ANDA — Preguntas frecuentes de la inmobiliaria',
    url: 'https://anda.com.uy/garantia-de-alquiler/inmobiliaria/preguntas-frecuentes/',
    detail:
      'Repite que las personas registradas en el Clearing pueden acceder, sujeto a aprobación.',
  },
  {
    label: 'ANDA — Garantía de alquiler (inquilino)',
    url: 'https://anda.com.uy/garantia-de-alquiler/inquilino/',
    detail:
      'Requisitos: ser socio, alquiler de hasta el 40 % del ingreso nominal (se pueden sumar ingresos), 4 meses de antigüedad en la actividad privada, pasivos sin antigüedad; "Sujeto a aprobación crediticia o de riesgo". Teléfono 2400 0714.',
  },
  {
    label: 'ANDA — Preguntas frecuentes del inquilino',
    url: 'https://anda.com.uy/garantia-de-alquiler/inquilino/preguntas-frecuentes/',
    detail:
      'Cuesta el 3 % del alquiler garantizado por mes, se descuenta del sueldo o la pasividad y el contrato mínimo es de un año.',
  },
  {
    label: 'ANDA — Reglamentación de la garantía de alquiler (PDF)',
    url: 'https://anda.com.uy/wp-content/uploads/2025/10/REGLAMENTACION-GARANTIA-DE-ALQUILER.pdf',
    detail:
      'Art. 11: ANDA puede negar una solicitud "sin necesidad de exponer los motivos". Art. 4: el solicitante puede sumar la fianza de otro afiliado como garantía complementaria.',
  },
  {
    label: 'ANDA — Preguntas frecuentes de préstamos',
    url: 'https://anda.com.uy/prestamos/preguntas-frecuentes/',
    detail:
      '"Sí, podés afiliarte a ANDA y solicitar tu préstamo estando en el Clearing de Informes." Según el antecedente puede pedir una garantía.',
  },
  {
    label: 'ANDA — Socios',
    url: 'https://anda.com.uy/socios/',
    detail: 'Cuota social del Socio Integral: $ 831.',
  },
  {
    label: 'FIDECIU — Requisitos de la garantía de alquiler',
    url: 'https://www.fideciu.uy/requisitos-garantia-alquiler/',
    detail:
      '"No estar en el clearing de informes (no excluyente, se analiza cada caso)". Seis meses de antigüedad o ser pasivo, ser socio de COMAG (afiliación automática al firmar). Teléfono 2909 1111.',
  },
  {
    label: 'FIDECIU — Preguntas frecuentes',
    url: 'https://www.fideciu.uy/faq/',
    detail:
      'Con incumplimientos en el Clearing "se evalúa tu caso particular" y se puede sumar un co-garante. Alquiler de hasta el 40 % del ingreso nominal (30 % en jubilados y pensionistas).',
  },
  {
    label: 'Porto Seguro — Requisitos de garantía de alquiler',
    url: 'https://www.portoseguroalquiler.com.uy/requisitos',
    detail:
      '"No estar en el Clearing" figura como requisito; asegura hasta el 30% del ingreso líquido y admite sumar ingresos de hasta 5 personas. (Dominio de asesor autorizado.)',
  },
  {
    label: 'Porto Seguro — Preguntas frecuentes',
    url: 'https://www.portoseguroalquiler.com.uy/preguntas-frecuentes',
    detail:
      'Confirma que estar en el Clearing es excluyente y que tras pagar la deuda hay que esperar al menos 6 meses.',
  },
  {
    label: 'San Cristóbal Seguros — Garantía de alquiler',
    url: 'https://www.sancristobalseguros.com.uy/institucional/garantia-de-alquiler/',
    detail:
      'Se reserva el análisis de crédito del inquilino y los cogarantes: "control de Clearing, calificación BCU y análisis interno".',
  },
  {
    label: 'Mapfre — Garantía de alquiler de vivienda',
    url: 'https://www.mapfre.com.uy/garantia-de-alquiler/alquiler-de-vivienda/',
    detail:
      '"Evaluación crediticia previa obligatoria. Emisión sujeta a análisis de riesgo." No nombra el Clearing.',
  },
  {
    label: 'Mapfre — Garantía de alquiler para comercios',
    url: 'https://www.mapfre.com.uy/empresas/seguro-garantia-alquiler-comercio/',
    detail: 'Para locales sí lo nombra: "control de Clearing y análisis interno".',
  },
  {
    label: 'BSE — Garantía de alquiler',
    url: 'https://www.bse.com.uy/portal-comercial/seguros/garantia-de-alquiler/',
    detail:
      'El asesor hace "un chequeo de tu perfil crediticio"; quien no califique entre los que suman ingresos tiene que ser sustituido. No nombra el Clearing.',
  },
  {
    label: 'SBI Seguros — Garantía de alquiler',
    url: 'https://sbi.uy/seguros-personales/garantia-alquiler/',
    detail:
      'Pide "Resultado favorable del análisis crediticio" y alquiler de hasta el 30 % de los ingresos líquidos. No nombra el Clearing.',
  },
  {
    label: 'Sancor Seguros — Garantía de alquiler',
    url: 'https://www.sancorseguros.com.uy/patrimoniales/garantia-alquiler',
    detail:
      'El primer paso es un "Análisis Crediticio"; alquiler de hasta el 30 % de los ingresos de hasta tres integrantes del núcleo familiar. No nombra el Clearing.',
  },
  {
    label: 'Seguros SURA — Garantía de alquiler',
    url: 'https://www.segurossura.com.uy/garantia-de-alquiler-personas/',
    detail:
      'Publica los documentos que pide y ningún criterio crediticio. El Clearing aparece sólo ante un incumplimiento: "También te incluiremos en clearing el incumplimiento".',
  },
  {
    label: 'BHU — Garantía de alquiler (depósito)',
    url: 'https://bhu.com.uy/ahorro/garantia-de-alquiler',
    detail:
      'El depósito en garantía es en unidades indexadas y se acuerda entre arrendador e inquilino; publica la especificación ES.AHR.04.',
  },
  {
    label: 'BHU — Especificación ES.AHR.04, versión 21 (PDF)',
    url: 'https://bhu.com.uy/sites/default/files/2023-04/ES.AHR.04.pdf',
    detail:
      'Comisión del 5 % sobre lo depositado, integración hasta en 10 cuotas, el depositante puede ser el inquilino u otra persona, retiro con autorización de la otra parte o por orden judicial, y con un embargo del depositante sólo se libera al beneficiario.',
  },
  {
    label: 'Decreto-Ley 14.219, art. 38 (IMPO)',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974/38',
    detail: 'El depósito no puede superar cinco meses de alquiler en una vivienda.',
  },
  {
    label: 'Decreto-Ley 14.219, art. 48 (IMPO)',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974/48',
    detail: 'En el régimen común, el desalojo por falta de pago da un plazo de veinte días.',
  },
  {
    label: 'Ley 19.889 (LUC), art. 421 — Régimen sin garantía (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/19889-2020/421',
    detail:
      'Define el arrendamiento sin garantía: "La ausencia de garantías de cualquier naturaleza a favor del arrendador".',
  },
  {
    label: 'Ley 19.889 (LUC), art. 422 (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/19889-2020/422',
    detail: 'El arrendador no puede exigir el pago anticipado de más de un mes de alquiler.',
  },
  {
    label: 'Ley 19.889 (LUC), art. 439 (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/19889-2020/439',
    detail:
      'Sin garantía, el desalojo del mal pagador se decreta con un plazo de seis días hábiles.',
  },
])

// --- The routes (formal guarantees + practical paths) ----------------------

/**
 * What a route does with your Clearing when you apply. This is the single fact
 * the page exists to make legible.
 *  - 'excluyente'           : being in the Clearing gets you rejected. (Porto Seguro)
 *  - 'tolerante'            : it does look, but tolerates the Clearing within limits. (FGA)
 *  - 'ley-impide-negar'     : Ley 20.212 art. 631 names it among the services that
 *                             cannot be denied for being in the Clearing. (Contaduría)
 *  - 'admite-con-aprobacion': it publishes that people in the Clearing can apply,
 *                             each case subject to its own approval. (ANDA, FIDECIU)
 *  - 'no-mira-tu-clearing'  : the route does not assess YOUR credit history at all
 *                             (a deposit is money; a garante is assessed instead of you;
 *                             the sin-garantía regime has nothing to evaluate).
 *  - 'no-confirmado'        : could not be confirmed against a primary source.
 */
export type ClearingCheck =
  | 'excluyente'
  | 'tolerante'
  | 'ley-impide-negar'
  | 'admite-con-aprobacion'
  | 'no-mira-tu-clearing'
  | 'no-confirmado'

export const CLEARING_CHECK_LABEL: Record<ClearingCheck, string> = {
  excluyente: 'Te rechaza por el clearing',
  tolerante: 'Mira el clearing, pero lo tolera',
  'ley-impide-negar': 'No puede negarte por el clearing (Ley 20.212)',
  'admite-con-aprobacion': 'Acepta gente en el clearing, con aprobación',
  'no-mira-tu-clearing': 'No mira tu historial crediticio',
  'no-confirmado': 'Sin fuente que lo confirme',
}

export type RouteId =
  | 'deposito'
  | 'sin-garantia'
  | 'cgn'
  | 'fga'
  | 'garante'
  | 'dueno-directo'
  | 'anda'
  | 'fideciu'
  | 'seguro'

export interface GuaranteeRoute {
  id: RouteId
  name: string
  /** One-line what-it-is. */
  summary: string
  checksClearing: ClearingCheck
  /** The one-line answer printed in the short-answer block. */
  verdictLine: string
  /** What the provider actually evaluates. */
  evaluates: string
  /** Why it does (or does not) work for someone in the clearing. */
  forClearing: string
  /** The honest downside to weigh. */
  caveat: string
  /**
   * Primary source URL for the clearing verdict. Absent when the route is
   * market practice with no official page behind it (garante, dueño directo).
   */
  sourceUrl?: string
}

export const GUARANTEE_ROUTES: readonly GuaranteeRoute[] = Object.freeze([
  {
    id: 'deposito',
    name: 'Depósito en garantía (BHU o entre partes)',
    summary: 'Inmovilizás dinero como respaldo en lugar de un informe crediticio.',
    checksClearing: 'no-mira-tu-clearing',
    verdictLine: 'Es dinero, no un informe: no hay historial que consultar.',
    evaluates: 'Nada de tu historial: es dinero acordado entre arrendador e inquilino.',
    forClearing:
      'Es la ruta que menos depende de tu pasado. No hay informe que consultar, así que el clearing no aparece en la ecuación.',
    caveat:
      'Necesitás el dinero disponible. El tope legal es de 5 meses de alquiler; el BHU cobra una comisión del 5 % sobre lo depositado y deja integrarlo hasta en 10 cuotas. El depósito lo puede hacer otra persona que aporte los fondos, y para retirarlo hace falta la autorización de la otra parte o una orden judicial. Si el depósito queda alcanzado por un embargo de quien depositó, el BHU sólo puede liberarle los fondos al arrendador.',
    sourceUrl: 'https://bhu.com.uy/sites/default/files/2023-04/ES.AHR.04.pdf',
  },
  {
    id: 'sin-garantia',
    name: 'Régimen sin garantía (Ley 19.889)',
    summary: 'Contrato especial de vivienda que no lleva garantía de ninguna clase.',
    checksClearing: 'no-mira-tu-clearing',
    verdictLine: 'El contrato no lleva garantía de ninguna clase, así que no hay nada que evaluar.',
    evaluates: 'No hay garantía, así que no hay historial que evaluar.',
    forClearing:
      'Si el propietario lo ofrece, tu clearing es irrelevante: la ley arma un contrato sin garantía ni garante.',
    caveat:
      'El propietario tiene que querer usarlo: no podés imponerlo. No puede exigirte más de un mes de alquiler por adelantado, pero si dejás de pagar el desalojo se decreta con un plazo de 6 días hábiles, contra 20 días en el régimen común.',
    sourceUrl: 'https://www.impo.com.uy/bases/leyes/19889-2020/421',
  },
  {
    id: 'cgn',
    name: 'Garantía de la Contaduría (CGN / SGA)',
    summary:
      'El Servicio de Garantía de Alquileres de la Contaduría General de la Nación, que descuenta el alquiler del recibo.',
    checksClearing: 'ley-impide-negar',
    verdictLine:
      'Si sos funcionario público, jubilado o pensionista, o tu empresa está inscripta en el registro del SGA: la Ley 20.212 (art. 631) la nombra y no pueden negártela por figurar en el Clearing.',
    evaluates:
      'Tu Informe de Líquido Disponible: que el sueldo o la pasividad alcance para descontar el alquiler. El trámite publica como requisitos ese informe y la cédula.',
    forClearing:
      'El artículo 631 de la Ley 20.212 nombra este servicio: no te lo pueden negar por figurar en el Clearing. El alquiler se descuenta directo de tu recibo.',
    caveat:
      'Es para funcionarios públicos y empleados de empresas privadas inscriptas en el registro del SGA (en los dos casos con 6 meses de antigüedad), jubilados y pensionistas, y también para beneficiarios del convenio con el MVOT o del subsidio del BPS. Cuesta el 3 % del alquiler por mes a cada parte. Consultas: 0800 8765.',
    sourceUrl: 'https://www.gub.uy/tramites/alquiler-contaduria-general-nacion',
  },
  {
    id: 'fga',
    name: 'Garantía estatal FGA (CGN / MVOT)',
    summary:
      'El fondo estatal de garantía de alquileres, administrado por la Contaduría y el MVOT.',
    checksClearing: 'tolerante',
    verdictLine: 'Tolera hasta 4 incumplimientos del Clearing si presentás su refinanciación.',
    evaluates:
      'Ingreso formal del núcleo (15 a 100 UR), continuidad laboral de más de 3 meses, y los registros: sin embargos, sin categoría 4 o 5 del BCU.',
    forClearing:
      'Tolera el Clearing: podés inscribirte con hasta 4 incumplimientos si presentás su refinanciación. Además, por la Ley 20.212 el Estado no puede negarte el acceso solo por ser deudor. El Ministerio lo aplica a sus tres variantes: garantía de alquiler, para jóvenes y para retornados.',
    caveat:
      'Pide ingreso formal comprobable y no estar en categoría 4 o 5 del BCU ni tener embargos. Cubre alquileres de hasta 18 UR (21 UR en vivienda promovida), cuesta el 3 % del alquiler por mes a cada parte y, con el certificado emitido, tenés 120 días para encontrar la vivienda. No es para funcionarios públicos, jubilados, pensionistas ni empleados de empresas con convenio con la Contaduría: esa puerta es la de la CGN.',
    sourceUrl: 'https://www.gub.uy/tramites/garantia-alquiler',
  },
  {
    id: 'garante',
    name: 'Garante o garantía real (un tercero respalda)',
    summary: 'Una persona con propiedad o buen respaldo se ofrece como garantía.',
    checksClearing: 'no-mira-tu-clearing',
    verdictLine: 'La evaluación recae en quien te garantiza, no en vos.',
    evaluates: 'Al garante: su propiedad, su solvencia o su historial, no el tuyo.',
    forClearing:
      'El peso de la evaluación se traslada a quien te garantiza. Si esa persona tiene un perfil limpio, tu clearing pesa mucho menos.',
    caveat:
      'Quien te garantiza asume una obligación real: no sumes a nadie sin que entienda lo que firma. ANDA y FIDECIU lo prevén por escrito: un co-obligado o un co-garante puede completar tu solicitud. Con una aseguradora, sumar a alguien no te salva: Porto Seguro rechaza si cualquiera de los solicitantes está en el Clearing y San Cristóbal controla el Clearing del inquilino y de los cogarantes.',
  },
  {
    id: 'dueno-directo',
    name: 'Dueño directo (sin inmobiliaria)',
    summary: 'Alquilar a un propietario particular que decide sus propias condiciones.',
    checksClearing: 'no-mira-tu-clearing',
    verdictLine:
      'Un particular pone sus propias condiciones: muchas veces alcanza con depósito o adelanto.',
    evaluates: 'Lo que el dueño decida: muchas veces alcanza con depósito, adelanto y confianza.',
    forClearing:
      'Un particular no suele correr un informe de Clearing como una inmobiliaria o una aseguradora. Podés ofrecer depósito o adelantar meses para dar respaldo.',
    caveat:
      'Sin inmobiliaria hay menos intermediación y más riesgo de estafa: verificá que el inmueble y la persona existan, usá un pago trazable y exigí contrato y recibo.',
  },
  {
    id: 'anda',
    name: 'Garantía ANDA',
    summary:
      'La garantía de la Asociación Nacional de Afiliados, que descuenta el alquiler del sueldo o la pasividad.',
    checksClearing: 'admite-con-aprobacion',
    verdictLine:
      'Publica que "Personas registradas en Clearing de Informes pueden acceder al servicio", sujeto a su aprobación.',
    evaluates:
      'Pide ser socio, que el alquiler no pase del 40 % de tu ingreso nominal (podés sumar ingresos de otras personas) y 4 meses de antigüedad en la actividad privada; los pasivos no necesitan antigüedad. Todo "sujeto a aprobación crediticia o de riesgo".',
    forClearing:
      'ANDA lo publica en sus preguntas frecuentes para propietarios e inmobiliarias: "Personas registradas en Clearing de Informes pueden acceder al servicio", con todos los casos sujetos a su aprobación. También dice que podés afiliarte estando en el Clearing.',
    caveat:
      'No es automático: su reglamento le reserva el derecho de negar una solicitud sin exponer los motivos (art. 11). Cuesta el 3 % del alquiler garantizado por mes más la cuota social, el alquiler se descuenta de tu sueldo o pasividad y el contrato tiene que ser de un año como mínimo. Preguntá por tu caso antes de afiliarte: 2400 0714.',
    sourceUrl: 'https://anda.com.uy/garantia-de-alquiler/propietario/preguntas-frecuentes/',
  },
  {
    id: 'fideciu',
    name: 'Garantía FIDECIU',
    summary:
      'Una garantía que se pide en una inmobiliaria: FIDECIU dice "en cualquier inmobiliaria del país" y publica el listado de las que operan con ella.',
    checksClearing: 'admite-con-aprobacion',
    verdictLine:
      'En sus requisitos para dependientes, no estar en el Clearing es "no excluyente, se analiza cada caso".',
    evaluates:
      'Seis meses de antigüedad en el trabajo (o ser pasivo o pensionista), los tres últimos recibos y que el alquiler no pase del 40 % del ingreso nominal (30 % en jubilados y pensionistas).',
    forClearing:
      'En sus requisitos figura "No estar en el clearing de informes (no excluyente, se analiza cada caso)", y sus preguntas frecuentes agregan que, con incumplimientos registrados, podés sumar un co-garante.',
    caveat:
      'Se pide en una inmobiliaria ("en cualquier inmobiliaria del país", según FIDECIU). A los dependientes les pide ser socios de COMAG (la afiliación es automática al firmar el contrato). No publica cuánto cuesta. Consultas: 2909 1111.',
    sourceUrl: 'https://www.fideciu.uy/requisitos-garantia-alquiler/',
  },
  {
    id: 'seguro',
    name: 'Seguro de alquiler (Porto Seguro)',
    summary: 'Una aseguradora emite una póliza que respalda al propietario.',
    checksClearing: 'excluyente',
    verdictLine:
      'Porto Seguro lo publica como excluyente: si alguno de los solicitantes figura en el Clearing, rechaza la solicitud.',
    evaluates:
      'El comportamiento crediticio del solicitante. Asegura hasta el 30% del ingreso líquido y permite sumar ingresos de hasta 5 personas.',
    forClearing:
      'Es justo la ruta que te van a rechazar: "no estar en el Clearing" es un requisito excluyente. Tras pagar la deuda, Porto pide esperar al menos 6 meses antes de solicitarla.',
    caveat:
      'Porto Seguro es la única que lo publica como excluyente. San Cristóbal controla el Clearing y la calificación del BCU; Mapfre, el BSE, SBI y Sancor hacen un análisis crediticio antes de emitir, y SURA no publica el criterio. Ninguna de las siete que leímos publica que acepte personas en el Clearing.',
    sourceUrl: 'https://www.portoseguroalquiler.com.uy/preguntas-frecuentes',
  },
])

export function routeById(id: RouteId): GuaranteeRoute | undefined {
  return GUARANTEE_ROUTES.find(r => r.id === id)
}

// --- The short answer ------------------------------------------------------

export interface ClearingAnswerGroup {
  id: 'no-miran' | 'aceptan' | 'rechazan'
  title: string
  routes: GuaranteeRoute[]
}

const ANSWER_GROUP_OF: Record<ClearingCheck, ClearingAnswerGroup['id'] | null> = {
  'no-mira-tu-clearing': 'no-miran',
  'ley-impide-negar': 'aceptan',
  tolerante: 'aceptan',
  'admite-con-aprobacion': 'aceptan',
  excluyente: 'rechazan',
  'no-confirmado': null,
}

/**
 * The three answers to "¿quién me acepta estando en el clearing?", derived from
 * each route's `checksClearing` so the short answer can never disagree with the
 * table below it. Routes keep catalogue order inside each group.
 */
export function clearingAnswerGroups(): ClearingAnswerGroup[] {
  const groups: ClearingAnswerGroup[] = [
    { id: 'no-miran', title: 'No miran tu historial', routes: [] },
    { id: 'aceptan', title: 'Te aceptan con condiciones, y está publicado', routes: [] },
    { id: 'rechazan', title: 'Te rechazan o no publican que te acepten', routes: [] },
  ]
  for (const route of GUARANTEE_ROUTES) {
    const id = ANSWER_GROUP_OF[route.checksClearing]
    groups.find(g => g.id === id)?.routes.push(route)
  }
  return groups
}

// --- Insurers: what each one publishes about the clearing ------------------

export type InsurerVerdict = 'rechaza' | 'consulta-clearing' | 'analisis-crediticio' | 'no-publica'

export const INSURER_VERDICT_LABEL: Record<InsurerVerdict, string> = {
  rechaza: 'Te rechaza por el clearing',
  'consulta-clearing': 'Consulta el Clearing',
  'analisis-crediticio': 'Hace análisis crediticio',
  'no-publica': 'No publica el criterio',
}

export interface InsurerStance {
  id: string
  name: string
  verdict: InsurerVerdict
  /** What the insurer's own page says, quoted where it matters. */
  published: string
  sourceUrl: string
}

/** Read on each insurer's own site on 2026-11-19 (re-read 2026-11-20). */
export const INSURER_STANCES: readonly InsurerStance[] = Object.freeze([
  {
    id: 'porto-seguro',
    name: 'Porto Seguro',
    verdict: 'rechaza',
    published:
      '"Sí es excluyente": si alguno de los solicitantes está en el Clearing, rechaza la solicitud. Después de pagar la deuda pide esperar al menos 6 meses.',
    sourceUrl: 'https://www.portoseguroalquiler.com.uy/preguntas-frecuentes',
  },
  {
    id: 'san-cristobal',
    name: 'San Cristóbal Seguros',
    verdict: 'consulta-clearing',
    published:
      'Se reserva el análisis de crédito del inquilino y los cogarantes: "control de Clearing, calificación BCU y análisis interno".',
    sourceUrl: 'https://www.sancristobalseguros.com.uy/institucional/garantia-de-alquiler/',
  },
  {
    id: 'mapfre',
    name: 'Mapfre',
    verdict: 'analisis-crediticio',
    published:
      'Para vivienda: "Evaluación crediticia previa obligatoria. Emisión sujeta a análisis de riesgo." No nombra el Clearing; en su garantía para comercios sí lo controla.',
    sourceUrl: 'https://www.mapfre.com.uy/garantia-de-alquiler/alquiler-de-vivienda/',
  },
  {
    id: 'bse',
    name: 'BSE',
    verdict: 'analisis-crediticio',
    published:
      'El asesor hace "un chequeo de tu perfil crediticio", y quien no califique entre los que suman ingresos tiene que ser sustituido. No nombra el Clearing.',
    sourceUrl: 'https://www.bse.com.uy/portal-comercial/seguros/garantia-de-alquiler/',
  },
  {
    id: 'sbi',
    name: 'SBI Seguros',
    verdict: 'analisis-crediticio',
    published:
      'Pide "Resultado favorable del análisis crediticio" y que el alquiler no pase del 30 % de los ingresos líquidos. No nombra el Clearing.',
    sourceUrl: 'https://sbi.uy/seguros-personales/garantia-alquiler/',
  },
  {
    id: 'sancor',
    name: 'Sancor Seguros',
    verdict: 'analisis-crediticio',
    published:
      'El primer paso es un "Análisis Crediticio", y el alquiler no puede pasar del 30 % de los ingresos de hasta tres integrantes del núcleo familiar. No nombra el Clearing.',
    sourceUrl: 'https://www.sancorseguros.com.uy/patrimoniales/garantia-alquiler',
  },
  {
    id: 'sura',
    name: 'Seguros SURA',
    verdict: 'no-publica',
    published:
      'Publica los documentos que pide y ningún criterio crediticio. El Clearing aparece sólo si no pagás: "También te incluiremos en clearing el incumplimiento".',
    sourceUrl: 'https://www.segurossura.com.uy/garantia-de-alquiler-personas/',
  },
])

// --- The matcher -----------------------------------------------------------

export type DebtKind = 'telco-servicios' | 'tarjeta-consumo' | 'banco-financiera' | 'no-se'
export type IncomeKind = 'formal' | 'informal' | 'ninguno'
export type AdvanceKind = 'no' | 'poco' | 'varios'
export type YesNoUnknown = 'si' | 'no' | 'no-se'

export interface ClearingMatchInput {
  /** Where the debt most likely sits — decides the BCU category 4/5 risk for the FGA. */
  debt: DebtKind
  /** Provable formal income unlocks the state and association routes. */
  income: IncomeKind
  /** A guarantor with a clean profile available. */
  guarantor: YesNoUnknown
  /** How many months of deposit / advance you could gather. */
  advance: AdvanceKind
  /** Whether renting from a private owner (no agency) is an option for you. */
  directOwner: YesNoUnknown
  /**
   * Public employee, retiree/pensioner, or employee of a company registered with
   * the Contaduría's SGA. Opens the CGN guarantee and closes the FGA.
   */
  cgn: YesNoUnknown
}

export type Fit = 'alta' | 'media' | 'baja' | 'descartada'

export interface RankedRoute {
  route: GuaranteeRoute
  fit: Fit
  /** Case-specific one-liner explaining the fit for THIS person. */
  reason: string
}

const FIT_RANK: Record<Fit, number> = { alta: 0, media: 1, baja: 2, descartada: 3 }
export const FIT_LABEL: Record<Fit, string> = {
  alta: 'Buena chance',
  media: 'Posible',
  baja: 'Cuesta arriba',
  descartada: 'Casi seguro que no',
}

/**
 * Could a bank/financial default have put you in BCU category 4 or 5? That
 * category is the FGA's only hard bar. A telco/utility debt lives in the private
 * Clearing and does NOT feed the BCU register, so it should not trigger it.
 */
function maybeBcuBarred(debt: DebtKind): boolean {
  return debt === 'banco-financiera' || debt === 'no-se'
}

/**
 * Rank every route for this person. Pure and deterministic: same input → same
 * output, so the whole thing is unit-testable. The static `checksClearing`
 * verdict never changes; what changes is the `fit` for THIS case.
 */
export function matchRentRoutes(input: ClearingMatchInput): RankedRoute[] {
  const hasGuarantor = input.guarantor === 'si'
  const formalIncome = input.income === 'formal'
  const canDirect = input.directOwner === 'si' || input.directOwner === 'no-se'
  const bcuRisk = maybeBcuBarred(input.debt)

  const ranked: RankedRoute[] = GUARANTEE_ROUTES.map(route => {
    switch (route.id) {
      case 'seguro':
        // Excluyente by definition while you are in the clearing.
        return {
          route,
          fit: 'descartada' as Fit,
          reason:
            'Porto Seguro lo publica como excluyente y ninguna de las otras seis aseguradoras que leímos publica que acepte personas en el Clearing. Dejalo para cuando el dato caduque o lleves más de 6 meses con la deuda cancelada.',
        }

      case 'deposito': {
        if (input.advance === 'varios')
          return {
            route,
            fit: 'alta',
            reason:
              'Podés juntar varios meses: es tu ruta más sólida, porque no depende de ningún informe crediticio.',
          }
        if (input.advance === 'poco')
          return {
            route,
            fit: 'media',
            reason:
              'Con uno o dos meses ya podés proponer un depósito. No mira tu clearing; el límite es cuánto podés inmovilizar.',
          }
        return {
          route,
          fit: 'baja',
          reason:
            'Sin dinero para inmovilizar cuesta, pero sigue siendo la vía que ignora tu historial: sumá un adelanto de a poco o combinalo con un dueño directo.',
        }
      }

      case 'cgn': {
        if (input.cgn === 'si')
          return {
            route,
            fit: 'alta',
            reason:
              'Tu puerta es la Contaduría: la Ley 20.212 la nombra entre los servicios que no te pueden negar por figurar en el Clearing, y el alquiler se descuenta de tu recibo. Pedí el Informe de Líquido Disponible para saber hasta cuánto podés alquilar.',
          }
        if (input.cgn === 'no')
          return {
            route,
            fit: 'descartada',
            reason:
              'Es para funcionarios públicos y empleados de empresas inscriptas en el registro de la Contaduría (con 6 meses de antigüedad), jubilados, pensionistas y beneficiarios del convenio con el MVOT o del subsidio del BPS.',
          }
        return {
          route,
          fit: 'media',
          reason:
            'Si sos funcionario público, jubilado o pensionista, o tu empresa está inscripta en el registro de la Contaduría, esta es tu puerta y por ley no te la pueden negar por el Clearing. Preguntá en tu trabajo o al 0800 8765.',
        }
      }

      case 'fga': {
        if (input.cgn === 'si')
          return {
            route,
            fit: 'descartada',
            reason:
              'El fondo del Ministerio excluye a quienes pueden usar la garantía de la Contaduría. Sólo entrás si la Contaduría te da una constancia de que no cumplís sus requisitos.',
          }
        if (!formalIncome)
          return {
            route,
            fit: 'descartada',
            reason:
              'El FGA exige ingreso formal comprobable (15 a 100 UR). Sin eso no calificás, aunque tolere el clearing.',
          }
        // Unsure whether the Contaduría covers you: the FGA may still not be
        // your door, so the reason says so instead of leaving it implied.
        const cgnHint =
          input.cgn === 'no-se'
            ? ' Si sos funcionario público, jubilado o pensionista, no es tu puerta: el fondo excluye a quienes pueden usar la garantía de la Contaduría.'
            : ''
        if (bcuRisk)
          return {
            route,
            fit: 'media',
            reason:
              'Tolera el clearing, pero si tu deuda bancaria te dejó en categoría 4 o 5 del BCU quedás fuera. Consultá tu categoría gratis en el BCU antes de tramitar.' +
              cgnHint,
          }
        return {
          route,
          fit: 'alta',
          reason:
            'Tenés ingreso formal y tu deuda no debería estar en el BCU: el FGA tolera hasta 4 incumplimientos del Clearing con refinanciación, y la Ley 20.212 le impide negarte solo por ser deudor.' +
            cgnHint,
        }
      }

      case 'garante': {
        if (hasGuarantor)
          return {
            route,
            fit: 'alta',
            reason:
              'Tenés un garante con perfil limpio: trasladás el peso de la evaluación a esa persona y tu clearing importa mucho menos.',
          }
        return {
          route,
          fit: 'baja',
          reason:
            'Depende de conseguir a alguien con propiedad o buen respaldo dispuesto a firmar por vos. Si aparece, es una vía muy fuerte.',
        }
      }

      case 'dueno-directo': {
        if (canDirect)
          return {
            route,
            fit: input.advance === 'no' ? 'media' : 'alta',
            reason:
              'Un particular rara vez corre un informe de Clearing. Ofrecé depósito o adelanto para dar respaldo y cerrar la confianza; cuidado con las estafas.',
          }
        return {
          route,
          fit: 'baja',
          reason:
            'Si preferís inmobiliaria, esta vía se te cierra un poco; aun así, ampliá la búsqueda a dueños directos porque son los más flexibles con el clearing.',
        }
      }

      case 'sin-garantia': {
        // Always available in principle, but the owner must offer it.
        return {
          route,
          fit: 'media',
          reason:
            'Tu clearing es irrelevante si el propietario acepta este régimen. No podés imponerlo y el desalojo por mora es más rápido, pero es una puerta real: preguntá por avisos que lo ofrezcan.',
        }
      }

      case 'anda': {
        if (formalIncome)
          return {
            route,
            fit: 'media',
            reason:
              'ANDA publica que las personas registradas en el Clearing pueden acceder a su garantía, con cada caso sujeto a su aprobación. Pide ser socio, 4 meses de antigüedad en la actividad privada y que el alquiler no pase del 40 % de tu ingreso nominal.',
          }
        if (input.income === 'informal')
          return {
            route,
            fit: 'baja',
            reason:
              'ANDA admite independientes, unipersonales y monotributistas con certificado de ingresos de escribano o contador, los tres últimos pagos de BPS y DGI, y un garante o un depósito.',
          }
        return {
          route,
          fit: 'descartada',
          reason:
            'Sin ingresos comprobables no llegás al requisito: el alquiler garantizado sale de tu ingreso nominal.',
        }
      }

      case 'fideciu': {
        if (formalIncome)
          return {
            route,
            fit: 'media',
            reason:
              'No estar en el Clearing figura como "no excluyente, se analiza cada caso", y con incumplimientos registrados podés sumar un co-garante. Pide 6 meses de antigüedad y se pide en una inmobiliaria.',
          }
        if (input.income === 'informal')
          return {
            route,
            fit: 'baja',
            reason:
              'Admite independientes con certificado de ingresos de contador de los últimos 12 meses, certificados de BPS y DGI al día, el último balance y un depósito aval.',
          }
        return {
          route,
          fit: 'descartada',
          reason:
            'Sin ingresos comprobables no llegás al requisito: el alquiler no puede pasar del 40 % de tu ingreso nominal.',
        }
      }

      default:
        return { route, fit: 'baja' as Fit, reason: '' }
    }
  })

  return ranked.sort((a, b) => {
    const byFit = FIT_RANK[a.fit] - FIT_RANK[b.fit]
    if (byFit !== 0) return byFit
    // Stable tie-break by catalogue order so the output is deterministic.
    return GUARANTEE_ROUTES.indexOf(a.route) - GUARANTEE_ROUTES.indexOf(b.route)
  })
}
