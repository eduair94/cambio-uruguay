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
// terms are volatile — re-check the links each review. The two structural laws
// (Ley 18.331 de 2008, Ley 19.889 de 2020, Ley 20.212 de 2023) are stable.
//
// The verdicts were verified on 2026-07-18 against:
//   - Clearing = privado (Equifax), telco→Clearing no BCU: IMPO revista, gub.uy
//     Huella Financiera, equifax.uy, bcu.gub.uy Central de Riesgos.
//   - Caducidad y acceso: Ley 18.331 arts. 22 y 14 (IMPO), Decreto 414/009.
//   - Seguro (Porto): "No estar en el Clearing" es EXCLUYENTE (portoseguroalquiler
//     /requisitos y /preguntas-frecuentes; dominio de asesor autorizado).
//   - ANDA: "Sujeto a aprobación crediticia o de riesgo"; no publica si consulta
//     Clearing/BCU (anda.com.uy).
//   - FGA estatal (CGN/MVOT): no embargos, no BCU cat. 4/5, Clearing hasta 4
//     incumplimientos con refinanciación (gub.uy/tramites/garantia-alquiler).
//   - Ley 20.212 art. 631: los organismos públicos no pueden negar sus servicios
//     por ser deudor / figurar en fuentes comerciales (gub.uy MVOT + IMPO).
//   - BHU depósito: dinero acordado entre partes, sin evaluación crediticia
//     (bhu.com.uy; corroborado por rentGuide.ts, verificado 2026-07-12).
//   - Sin garantía: Ley 19.889 art. 422 (IMPO), plazos de desalojo más breves.

export const RENT_CLEARING_LAST_REVIEWED = '2026-07-18'

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
      'Explica que Equifax-Clearing es una base privada (Ley 18.331) distinta de la Central de Riesgos del BCU, y que las deudas con servicios públicos permanecen 5 años.',
  },
  {
    label: 'Ley 18.331, art. 22 (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/18331-2008/22',
    detail:
      'Caducidad: los datos comerciales de personas físicas se registran 5 años desde su incorporación; si siguen impagos, un solo nuevo registro por otros 5. Las obligaciones canceladas quedan 5 años no renovables desde la cancelación.',
  },
  {
    label: 'Ley 18.331, art. 14 (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/18331-2008/14',
    detail:
      'Derecho de acceso gratuito cada 6 meses; la información debe darse en 5 días hábiles, clara y sin codificaciones.',
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
      'Confirma que estar en el Clearing es excluyente y que tras pagar la deuda se estudia el comportamiento crediticio antes de aprobar.',
  },
  {
    label: 'ANDA — Garantía de alquiler (inquilino)',
    url: 'https://anda.com.uy/garantia-de-alquiler/inquilino/',
    detail:
      'La garantía está "sujeta a aprobación crediticia o de riesgo" y exige ser socio; la página no publica si consulta el Clearing o el BCU.',
  },
  {
    label: 'gub.uy — Fondo de Garantía de Alquileres (FGA / CGN-MVOT)',
    url: 'https://www.gub.uy/tramites/garantia-alquiler',
    detail:
      'Requiere no tener embargos ni ser categoría 4 o 5 del BCU; en el Clearing tolera hasta 4 incumplimientos presentando su refinanciación. Ingreso 15–100 UR.',
  },
  {
    label: 'MVOT — Estar en el Clearing no es obstáculo (Ley 20.212)',
    url: 'https://www.gub.uy/ministerio-vivienda-ordenamiento-territorial/comunicacion/noticias/estar-clearing-es-obstaculo-para-inscribirse-planes-programas-del-mvot',
    detail:
      'La Ley 20.212 (art. 631) prohíbe a los organismos públicos negar el acceso a sus servicios —incluida la garantía de alquiler— a personas por ser deudoras o figurar en fuentes de datos comerciales.',
  },
  {
    label: 'BHU — Garantía de alquiler (depósito)',
    url: 'https://bhu.com.uy/ahorro/garantia-de-alquiler',
    detail:
      'El depósito en garantía se acuerda entre arrendador e inquilino (Ley 14.219); no describe evaluación crediticia, de Clearing ni de BCU del inquilino.',
  },
  {
    label: 'Ley 19.889 (LUC), art. 422 — Régimen sin garantía (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/19889-2020/422',
    detail:
      'Marco de arrendamiento sin garantía de ninguna clase; contrapartida: los plazos de desalojo por falta de pago son más breves que en el régimen común.',
  },
])

// --- The routes (formal guarantees + practical paths) ----------------------

/**
 * What a route does with your Clearing when you apply. This is the single fact
 * the page exists to make legible.
 *  - 'excluyente'       : being in the Clearing gets you rejected. (Porto Seguro)
 *  - 'tolerante'        : it does look, but tolerates the Clearing within limits. (FGA)
 *  - 'evalua-no-publica': it runs a credit/risk check but does not publish
 *                          whether it queries the Clearing specifically. (ANDA)
 *  - 'no-mira-tu-clearing': the route does not assess YOUR credit history at all
 *                          (a deposit is money; a garante is assessed instead of you;
 *                          the sin-garantía regime has nothing to evaluate).
 *  - 'no-confirmado'    : could not be confirmed against a primary source.
 */
export type ClearingCheck =
  | 'excluyente'
  | 'tolerante'
  | 'evalua-no-publica'
  | 'no-mira-tu-clearing'
  | 'no-confirmado'

export const CLEARING_CHECK_LABEL: Record<ClearingCheck, string> = {
  excluyente: 'Te rechaza por el clearing',
  tolerante: 'Mira el clearing, pero lo tolera',
  'evalua-no-publica': 'Evalúa tu crédito (no aclara si mira el clearing)',
  'no-mira-tu-clearing': 'No mira tu historial crediticio',
  'no-confirmado': 'Sin fuente que lo confirme',
}

export type RouteId =
  | 'deposito'
  | 'sin-garantia'
  | 'fga'
  | 'garante'
  | 'dueno-directo'
  | 'anda'
  | 'seguro'

export interface GuaranteeRoute {
  id: RouteId
  name: string
  /** One-line what-it-is. */
  summary: string
  checksClearing: ClearingCheck
  /** What the provider actually evaluates. */
  evaluates: string
  /** Why it does (or does not) work for someone in the clearing. */
  forClearing: string
  /** The honest downside to weigh. */
  caveat: string
  /** Primary source URL for the clearing verdict. */
  sourceUrl: string
}

export const GUARANTEE_ROUTES: readonly GuaranteeRoute[] = Object.freeze([
  {
    id: 'deposito',
    name: 'Depósito en garantía (BHU o entre partes)',
    summary: 'Inmovilizás dinero como respaldo en lugar de un informe crediticio.',
    checksClearing: 'no-mira-tu-clearing',
    evaluates: 'Nada de tu historial: es dinero acordado entre arrendador e inquilino.',
    forClearing:
      'Es la ruta que menos depende de tu pasado. No hay informe que consultar, así que el clearing no aparece en la ecuación.',
    caveat:
      'Necesitás el dinero disponible. El depósito en BHU llega hasta 5 meses de alquiler con un arancel de apertura del 5% y puede integrarse hasta en 10 pagos; para retirarlo hace falta acuerdo de la otra parte.',
    sourceUrl: 'https://bhu.com.uy/ahorro/garantia-de-alquiler',
  },
  {
    id: 'sin-garantia',
    name: 'Régimen sin garantía (Ley 19.889)',
    summary: 'Contrato especial de vivienda que no lleva garantía de ninguna clase.',
    checksClearing: 'no-mira-tu-clearing',
    evaluates: 'No hay garantía, así que no hay historial que evaluar.',
    forClearing:
      'Si el propietario lo ofrece, tu clearing es irrelevante: la ley arma un contrato sin garantía ni garante.',
    caveat:
      'El propietario tiene que querer usarlo; no podés imponerlo. A cambio, los plazos de desalojo por falta de pago son más breves que en el régimen común: leé el contrato con cuidado.',
    sourceUrl: 'https://www.impo.com.uy/bases/leyes/19889-2020/422',
  },
  {
    id: 'fga',
    name: 'Garantía estatal FGA (CGN / MVOT)',
    summary:
      'El fondo estatal de garantía de alquileres, administrado por la Contaduría y el MVOT.',
    checksClearing: 'tolerante',
    evaluates:
      'Ingreso formal del núcleo (15 a 100 UR), continuidad laboral de más de 3 meses, y los registros: sin embargos, sin categoría 4 o 5 del BCU.',
    forClearing:
      'Tolera el Clearing: podés inscribirte con hasta 4 incumplimientos si presentás su refinanciación. Además, por la Ley 20.212 el Estado no puede negarte el acceso solo por ser deudor.',
    caveat:
      'Necesitás ingreso formal comprobable y no estar en categoría 4 o 5 del BCU (eso suele venir de deudas bancarias, no de una telco). Si tu deuda es solo telco, este bloqueo no debería aplicarte.',
    sourceUrl: 'https://www.gub.uy/tramites/garantia-alquiler',
  },
  {
    id: 'garante',
    name: 'Garante o garantía real (un tercero respalda)',
    summary: 'Una persona con propiedad o buen respaldo se ofrece como garantía.',
    checksClearing: 'no-mira-tu-clearing',
    evaluates: 'Al garante: su propiedad, su solvencia o su historial, no el tuyo.',
    forClearing:
      'El peso de la evaluación se traslada a quien te garantiza. Si esa persona tiene un perfil limpio, tu clearing pesa mucho menos.',
    caveat:
      'Quien te garantiza asume una obligación real. No sumes a alguien sin que entienda y acepte lo que firma. No pudimos confirmar con fuente primaria que ningún proveedor mire igual tu clearing, así que preguntá caso por caso.',
    sourceUrl: 'https://www.gub.uy/tramites/garantia-alquiler',
  },
  {
    id: 'dueno-directo',
    name: 'Dueño directo (sin inmobiliaria)',
    summary: 'Alquilar a un propietario particular que decide sus propias condiciones.',
    checksClearing: 'no-mira-tu-clearing',
    evaluates: 'Lo que el dueño decida: muchas veces alcanza con depósito, adelanto y confianza.',
    forClearing:
      'Un particular no suele correr un informe de Clearing como una inmobiliaria o una aseguradora. Podés ofrecer depósito o adelantar meses para dar respaldo.',
    caveat:
      'Sin inmobiliaria hay menos intermediación y más riesgo de estafa: verificá que el inmueble y la persona existan, usá un pago trazable y exigí contrato y recibo.',
    sourceUrl: 'https://www.impo.com.uy/bases/leyes/19889-2020/422',
  },
  {
    id: 'anda',
    name: 'Garantía ANDA',
    summary: 'Garantía de una cooperativa muy aceptada por inmobiliarias.',
    checksClearing: 'evalua-no-publica',
    evaluates:
      'Está "sujeta a aprobación crediticia o de riesgo". Pide ser socio, alquiler de hasta el 40% del ingreso nominal y antigüedad laboral (4 meses privado / 1 mes público).',
    forClearing:
      'Hace una evaluación de riesgo, pero no publica si consulta el Clearing. Puede aprobarte o no: es un "depende" que conviene consultar directo antes de ilusionarte.',
    caveat:
      'Como corre una aprobación crediticia, no hay garantía de que pase estando en clearing. Preguntá tu caso puntual antes de pagar afiliación o reservar una vivienda.',
    sourceUrl: 'https://anda.com.uy/garantia-de-alquiler/inquilino/',
  },
  {
    id: 'seguro',
    name: 'Seguro de alquiler (Porto Seguro)',
    summary: 'Una aseguradora emite una póliza que respalda al propietario.',
    checksClearing: 'excluyente',
    evaluates:
      'El comportamiento crediticio del solicitante. Asegura hasta el 30% del ingreso líquido y permite sumar ingresos de hasta 5 personas.',
    forClearing:
      'Es justo la ruta que te van a rechazar: "no estar en el Clearing" es un requisito excluyente. Tras pagar la deuda, Porto pide esperar unos 6 meses antes de reevaluar.',
    caveat:
      'Verificamos Porto Seguro. Otras aseguradoras (SURA, Mapfre) no publican sus criterios; no asumas que son más flexibles sin preguntar.',
    sourceUrl: 'https://www.portoseguroalquiler.com.uy/preguntas-frecuentes',
  },
])

export function routeById(id: RouteId): GuaranteeRoute | undefined {
  return GUARANTEE_ROUTES.find(r => r.id === id)
}

// --- The matcher -----------------------------------------------------------

export type DebtKind = 'telco-servicios' | 'tarjeta-consumo' | 'banco-financiera' | 'no-se'
export type IncomeKind = 'formal' | 'informal' | 'ninguno'
export type AdvanceKind = 'no' | 'poco' | 'varios'
export type YesNoUnknown = 'si' | 'no' | 'no-se'

export interface ClearingMatchInput {
  /** Where the debt most likely sits — decides the BCU category 4/5 risk for the FGA. */
  debt: DebtKind
  /** Provable formal income unlocks the state and cooperative routes. */
  income: IncomeKind
  /** A guarantor with a clean profile available. */
  guarantor: YesNoUnknown
  /** How many months of deposit / advance you could gather. */
  advance: AdvanceKind
  /** Whether renting from a private owner (no agency) is an option for you. */
  directOwner: YesNoUnknown
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
            'Estando en el clearing te rechazan: es un requisito excluyente. Dejalo para cuando el dato caduque o lo tengas cancelado hace más de 6 meses.',
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

      case 'fga': {
        if (!formalIncome)
          return {
            route,
            fit: 'descartada',
            reason:
              'El FGA exige ingreso formal comprobable (15 a 100 UR). Sin eso no calificás, aunque tolere el clearing.',
          }
        if (bcuRisk)
          return {
            route,
            fit: 'media',
            reason:
              'Tolera el clearing, pero si tu deuda bancaria te dejó en categoría 4 o 5 del BCU quedás fuera. Consultá tu categoría gratis en el BCU antes de tramitar.',
          }
        return {
          route,
          fit: 'alta',
          reason:
            'Tenés ingreso formal y tu deuda no debería estar en el BCU: el FGA tolera hasta 4 incumplimientos del Clearing con refinanciación, y la Ley 20.212 le impide negarte solo por ser deudor.',
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
            fit: 'baja',
            reason:
              'Corre una aprobación de riesgo y no publica si mira el clearing: puede salir o no. Consultá tu caso puntual antes de afiliarte o reservar.',
          }
        return {
          route,
          fit: 'descartada',
          reason:
            'Sin ingreso formal y con una evaluación crediticia de por medio, es poco probable estando en clearing.',
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
