// app/utils/complaintRouting.ts
// Datos de /a-quien-le-reclamo-uruguay: qué organismo corresponde a cada problema, y qué puede y
// qué NO puede hacer cada uno.
//
// POR QUÉ EXISTE Y POR QUÉ NO DUPLICA LO QUE HAY: el sitio ya cubre muy bien la Ley 17.250 y el
// procedimiento ante Defensa del Consumidor — `consumerRights.ts` son ~1.300 líneas con
// escenarios, artículos, pasos, audiencia de conciliación y el régimen sancionatorio. Lo que NO
// existía en todo el repo era el RUTEO: grep de «URSEC», «URSEA» y «Superintendencia» sobre ese
// módulo daba CERO.
//
// Y el ruteo es el problema caro: Defensa del Consumidor no es competente para todo. Presentar el
// reclamo en el organismo equivocado cuesta meses. Los clusters del corpus que lo piden son
// «Antel / internet» («¿Qué hacer cuando Antel incumple contrato y no te da una solución?»), las
// facturas de UTE, y los reclamos a bancos y financieras.
//
// LO QUE NO PUBLICAMOS: los plazos de URSEC. La búsqueda sólo devolvió reglas de reguladores de
// otros países, y un plazo equivocado hace perder el derecho. Va el organismo, que sí está
// verificado, y la indicación de confirmar el plazo ahí.
//
// FUENTES, verificadas el 2026-08-10:
//   - BCU, «Reclamos y denuncias» (15 días corridos y, sobre todo, lo que el BCU NO puede hacer)
//     https://usuariofinanciero.bcu.gub.uy/reclamos-y-denuncias/
//   - gub.uy, «Reclamos ante URSEA» (15 días hábiles ante la prestadora)
//     https://www.gub.uy/tramites/reclamos-ursea
//   - gub.uy, «Consulta, reclamo y/o denuncia en materia de defensa del consumidor»
//     https://www.gub.uy/tramites/consulta-reclamo-yo-denuncia-materia-defensa-consumidor
//   - URSEC — unidad reguladora de los servicios de comunicaciones
//     https://www.gub.uy/unidad-reguladora-servicios-comunicaciones/

/** Fecha en que competencias y plazos se contrastaron con cada organismo. */
export const ROUTING_VERIFIED_AT = '2026-08-10'

export type RoutingBodyId = 'dnc' | 'ursea' | 'ursec' | 'bcu' | 'mtss'

export interface RoutingBody {
  id: RoutingBodyId
  /** Sigla o nombre corto. */
  name: string
  fullName: string
  /** Qué problemas le tocan, en las palabras del lector. */
  covers: readonly string[]
  /** Plazo que hay que esperar tras reclamar a la empresa, si está verificado. */
  waitAfterProvider: string | null
  /** Enlace al trámite o al canal oficial. */
  url: string
  icon: string
}

/**
 * El ruteo. `dnc` es el default: si el problema no cae en un regulador sectorial, va a Defensa
 * del Consumidor.
 */
export const ROUTING_BODIES: readonly RoutingBody[] = Object.freeze([
  {
    id: 'dnc',
    name: 'Defensa del Consumidor',
    fullName: 'Área de Defensa del Consumidor — Ministerio de Economía y Finanzas',
    covers: [
      'Compras de productos, en local o por internet.',
      'Servicios contratados a empresas privadas en general.',
      'Publicidad engañosa y cláusulas abusivas.',
      'Garantías, cambios y devoluciones.',
    ],
    waitAfterProvider: null,
    url: 'https://www.gub.uy/tramites/consulta-reclamo-yo-denuncia-materia-defensa-consumidor',
    icon: 'mdi-scale-balance',
  },
  {
    id: 'ursea',
    name: 'URSEA',
    fullName: 'Unidad Reguladora de Servicios de Energía y Agua',
    covers: [
      'Energía eléctrica: UTE, incluida la facturación.',
      'Agua y saneamiento: OSE.',
      'Combustibles líquidos.',
    ],
    waitAfterProvider: '15 días hábiles',
    url: 'https://www.gub.uy/tramites/reclamos-ursea',
    icon: 'mdi-flash-outline',
  },
  {
    id: 'ursec',
    name: 'URSEC',
    fullName: 'Unidad Reguladora de Servicios de Comunicaciones',
    covers: [
      'Telefonía fija y móvil: Antel, Movistar, Claro.',
      'Internet y datos.',
      'Servicios postales.',
    ],
    waitAfterProvider: null,
    url: 'https://www.gub.uy/unidad-reguladora-servicios-comunicaciones/',
    icon: 'mdi-wifi',
  },
  {
    id: 'bcu',
    name: 'BCU',
    fullName: 'Banco Central del Uruguay — Superintendencia de Servicios Financieros',
    covers: [
      'Bancos, financieras y administradoras de crédito.',
      'Aseguradoras.',
      'Cualquier institución supervisada por el BCU.',
    ],
    waitAfterProvider: '15 días corridos',
    url: 'https://usuariofinanciero.bcu.gub.uy/reclamos-y-denuncias/',
    icon: 'mdi-bank-outline',
  },
  {
    id: 'mtss',
    name: 'MTSS',
    fullName: 'Ministerio de Trabajo y Seguridad Social',
    covers: [
      'Sueldo impago, categoría o laudo mal aplicado.',
      'Despido y liquidación.',
      'Condiciones de trabajo.',
    ],
    waitAfterProvider: null,
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/consultas-laborales-salariales-via-web',
    icon: 'mdi-briefcase-outline',
  },
])

/** El paso que casi todos se saltean y que después les cierra la puerta. */
export const FIRST_STEP_RULE =
  'Casi todos los organismos exigen que primero reclames a la empresa y que tengas cómo probarlo. Pedí SIEMPRE el número de reclamo y guardá la constancia: sin eso, varios ni siquiera te dan trámite. Recién después, y cumplido el plazo de espera de cada uno, se escala.'

/**
 * Lo que el BCU dice expresamente que NO puede hacer. Es la parte que evita meses de expectativa
 * puesta en la ventanilla equivocada, y no aparecía en ningún lado del sitio.
 */
export const BCU_CANNOT: readonly string[] = Object.freeze([
  'Ordenar que te devuelvan un consumo desconocido de tarjeta de crédito o débito, ni un retiro de cajero.',
  'Ordenar que te corrijan la Central de Riesgos, salvo error documentado de la institución.',
  'Fijar daños y perjuicios.',
  'Resolver un conflicto contractual entre partes.',
])

/** Dónde sí se resuelve lo que el BCU no puede. */
export const BCU_CANNOT_WHERE =
  'Todo eso es competencia exclusiva de los órganos jurisdiccionales, es decir, de la Justicia. Que el BCU no pueda ordenarlo no significa que no tengas derecho: significa que la vía es otra.'

export interface RoutingFaq {
  question: string
  short: string
  answer: string
}

export const ROUTING_FAQ: readonly RoutingFaq[] = Object.freeze([
  {
    question: '¿Le reclamo a Defensa del Consumidor o a otro lado?',
    short:
      'Defensa del Consumidor es el default; los servicios regulados tienen su propio organismo.',
    answer:
      'Si el problema es con un producto o un servicio privado en general, va a Defensa del Consumidor. Pero si es con luz o agua, es URSEA; si es con telefonía, internet o correo, es URSEC; si es con un banco, una financiera o una aseguradora, es el Banco Central; y si es laboral, es el MTSS. Presentarlo en el lugar equivocado no lo redirige solo: te hace perder el tiempo.',
  },
  {
    question: '¿Puedo ir directo al organismo sin reclamar a la empresa?',
    short: 'Casi nunca. Y sin el número de reclamo varios ni te dan trámite.',
    answer:
      'La regla general es reclamar primero a la empresa y conservar la prueba de que lo hiciste. URSEA lo dice sin vueltas: si no presentaste el reclamo ante la prestadora, no le da trámite a la solicitud. Pedí el número de reclamo apenas lo hacés, anotá la fecha y guardá la constancia; es lo que después habilita todo lo demás.',
  },
  {
    question: '¿Cuánto tengo que esperar antes de escalar?',
    short: 'Depende del organismo: URSEA son 15 días hábiles y el BCU 15 días corridos.',
    answer:
      'No son el mismo plazo y conviene no confundirlos. Ante URSEA se escala transcurridos 15 días hábiles desde que reclamaste a la prestadora sin respuesta, o antes si la respuesta no te conforma. Ante el BCU, la institución tiene 15 días corridos para responder, prorrogables avisándote, y si no respondió o no te conforma, ahí presentás. Para URSEC conviene confirmar el plazo en su propio canal.',
  },
  {
    question: 'Me desconocieron un consumo de la tarjeta. ¿El BCU me lo hace devolver?',
    short: 'No. El BCU dice expresamente que no puede ordenar esa devolución.',
    answer:
      'El BCU no puede ordenar la devolución de un consumo desconocido de tarjeta ni de un retiro de cajero, ni fijar daños y perjuicios, ni resolver un conflicto contractual entre partes: eso es competencia exclusiva de la Justicia. Sí sirve denunciar ante el BCU para que quede registrado y para lo que hace a la conducta de la institución supervisada, pero si lo que buscás es que te devuelvan la plata, la vía es judicial.',
  },
  {
    question: '¿Y si la empresa nunca me contesta?',
    short: 'Ese silencio es justamente lo que habilita a escalar.',
    answer:
      'La falta de respuesta dentro del plazo es una de las causales para presentarte ante el organismo. Por eso importa tanto el número de reclamo y la fecha: es lo que prueba que el plazo empezó a correr y que se venció sin respuesta.',
  },
])
