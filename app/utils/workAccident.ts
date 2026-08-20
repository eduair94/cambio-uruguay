// app/utils/workAccident.ts
// Datos de /accidente-de-trabajo-uruguay — qué te corresponde cuando te accidentás trabajando.
//
// EL HILO QUE LA ORIGINA (r/LegalUruguay, 19/8/2026, "Accidente Laboral"): un pistero de estación de
// servicio al que una baranda rebatible sin amortiguación le amputó parcialmente un dedo. Le
// activaron el BSE el mismo día. Lo que lo trajo a preguntar no fue la cobertura: fue que la empresa
// le mandó a decir que "lo vieron nervioso arriba del camión".
//
// LA TESIS: **la culpa no decide nada.** El artículo 9 de la Ley 16.074 es explícito — mantenés el
// derecho a la indemnización aun con culpa leve o grave tuya, y también por caso fortuito o fuerza
// mayor; sólo lo perdés si provocaste el accidente DOLOSAMENTE, es decir a propósito. Estar
// nervioso, distraído o incluso haber hecho mal la maniobra no es dolo. La versión que la empresa
// intenta instalar es irrelevante para lo que el BSE te debe, y saberlo cambia la conversación
// entera: no hay nada que negociar sobre de quién fue la culpa.
//
// Módulo PURO (sin Vue, sin Nuxt) para que la página y su test compartan una sola verdad. Cada
// afirmación trae el artículo y la fuente.
//
// Informativo, no es asesoramiento legal. Un accidente con secuela permanente se consulta con un
// abogado laboralista: acá está lo que el sistema dice, no lo que conviene hacer en tu caso.

/** Fecha (YYYY-MM-DD) en que se verificó cada dato contra su fuente. */
export const WORK_ACCIDENT_REVIEWED = '2026-08-20'

export interface SourceLink {
  label: string
  url: string
  publisher: string
}

const LEY_16074: SourceLink = {
  label: 'Ley 16.074 — Seguro sobre accidentes del trabajo y enfermedades profesionales',
  url: 'https://www.impo.com.uy/bases/leyes/16074-1989',
  publisher: 'IMPO',
}

export interface LegalFact {
  id: string
  /** La afirmación, en una línea. */
  claim: string
  /** El artículo exacto. */
  norm: string
  /** Cita textual cuando la hay. Es lo que hace verificable la afirmación. */
  quote: string | null
  /** Qué significa en la práctica. */
  meaning: string
  source: SourceLink
}

export const ACCIDENT_FACTS: readonly LegalFact[] = Object.freeze([
  {
    id: 'culpa',
    claim: 'Tu culpa no te saca la indemnización. Sólo te la saca haberlo hecho a propósito.',
    norm: 'Ley 16.074, artículo 9',
    quote:
      'Los siniestrados y en su caso los causahabientes, mantienen el derecho a la indemnización aún cuando el accidente se haya producido mediante culpa leve o grave de parte de aquéllos, o por caso fortuito o fuerza mayor, pero lo pierden en el caso de haberlo provocado dolosamente.',
    meaning:
      'Es la respuesta a la escena más común: la empresa buscando instalar que fue tu descuido. Aunque hubiera sido tu descuido, y aunque hubiera sido culpa grave, el derecho sigue en pie. La única puerta que lo cierra es el dolo, que significa haberlo provocado a propósito — no estar nervioso, no estar distraído, no haber hecho mal una maniobra.',
    source: LEY_16074,
  },
  {
    id: 'denuncia',
    claim: 'Denunciar el accidente es obligación del empleador, y tiene plazo.',
    norm: 'Ley 16.074, artículo 48',
    quote: null,
    meaning:
      'La denuncia patronal ante el BSE la presenta la empresa: 72 horas en Montevideo y 5 días hábiles en el interior. No cumplir tiene multa, con un mínimo de 50 UR y de 100 UR en caso de reincidencia. Si tu empleador no la presenta, podés acudir igual al BSE — la cobertura no depende de que él haga el trámite.',
    source: LEY_16074,
  },
  {
    id: 'temporaria',
    claim: 'Mientras estás de licencia por el accidente cobrás dos tercios.',
    norm: 'Ley 16.074, artículo 19',
    quote: null,
    meaning:
      'La indemnización temporaria se calcula sobre las 2/3 partes del jornal o sueldo mensual que ganabas al momento del accidente, y corre desde el cuarto día de ausencia. Los primeros tres días quedan a cargo del empleador según el régimen laboral que te aplique.',
    source: LEY_16074,
  },
  {
    id: 'sin-seguro',
    claim: 'Si tu patrón no te aseguró, el BSE igual te atiende y te indemniza.',
    norm: 'Ley 16.074, artículo 8',
    quote:
      'con independencia de que sus patronos hayan cumplido o no con la obligación de asegurarlos',
    meaning:
      'La mitad buena y la mala son del mismo artículo. Estar en negro no te deja sin cobertura: el BSE asiste e indemniza igual. Pero cuando el patrono no estaba asegurado, la indemnización se calcula tomando como base un salario mínimo nacional, no tu sueldo real. Al empleador, en cambio, el BSE puede multarlo con el doble de las primas omitidas la primera vez.',
    source: LEY_16074,
  },
  {
    id: 'monopolio',
    claim: 'El seguro es del Banco de Seguros del Estado, y es obligatorio.',
    norm: 'Ley 16.074',
    quote: null,
    meaning:
      'Todo empleador tiene que contratar el seguro de accidentes de trabajo y enfermedades profesionales con el BSE, que tiene el monopolio de esa cobertura en Uruguay. Por eso "te activaron el BSE" no es un favor de la empresa: es el sistema funcionando como debe.',
    source: {
      label: 'MTSS — Accidentes de trabajo y enfermedades profesionales',
      url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/accidentes-trabajo-enfermedades-profesionales',
      publisher: 'Ministerio de Trabajo y Seguridad Social',
    },
  },
])

/** Qué hacer, en orden, y por qué ese orden. */
export interface AccidentStep {
  step: string
  detail: string
}

export const ACCIDENT_STEPS: readonly AccidentStep[] = Object.freeze([
  {
    step: 'Atenderte en el BSE, aunque parezca menor',
    detail:
      'La atención por el BSE es lo que deja el accidente registrado como accidente de trabajo. Una lesión que se atiende por mutualista como si fuera un problema común queda fuera del sistema, y reconstruirlo después es mucho más difícil que entrar bien de entrada.',
  },
  {
    step: 'Verificar que la denuncia patronal exista',
    detail:
      'Es obligación de la empresa y tiene plazo: 72 horas en Montevideo, 5 días hábiles en el interior. Si no la presentó, podés acudir al BSE igual. La denuncia declara que hubo un accidente laboral; no reparte culpas ni las decide.',
  },
  {
    step: 'Escribir tu propia versión el mismo día',
    detail:
      'Qué estabas haciendo, quién te lo pidió, con qué herramienta, en qué estado estaba. No para pelear con nadie: porque dentro de un mes ese detalle no lo vas a tener igual de fresco, y es lo único que después contrapesa una versión distinta.',
  },
  {
    step: 'Guardar todo lo que documente el estado del lugar',
    detail:
      'Fotos del equipo o la instalación, mensajes donde te pidieron la tarea, testigos. Si el sistema no tenía amortiguación, freno o protección, eso es una condición del lugar de trabajo y no una característica tuya.',
  },
  {
    step: 'No firmar una versión que no es la tuya',
    detail:
      'Nada te obliga a suscribir un relato que no coincide con lo que pasó. Y no hace falta para cobrar: el artículo 9 mantiene el derecho aun mediando culpa tuya, así que aceptar una culpa que no tuviste no te compra nada y sí puede pesar en lo que venga después.',
  },
  {
    step: 'Si queda secuela permanente, consultar a un abogado laboralista',
    detail:
      'La indemnización temporaria es una cosa y la incapacidad permanente es otra, con su propia evaluación. Ahí ya no alcanza con saber lo que dice la ley: hace falta alguien que mire tu caso.',
  },
])

/** Los malentendidos que aparecen en cada hilo sobre esto. */
export interface AccidentMyth {
  myth: string
  reality: string
  norm?: string
}

export const ACCIDENT_MYTHS: readonly AccidentMyth[] = Object.freeze([
  {
    myth: 'Si fue tu descuido, perdés la cobertura.',
    reality:
      'No. El derecho se mantiene con culpa leve o grave del trabajador, y también por caso fortuito o fuerza mayor. Sólo se pierde si provocaste el accidente dolosamente, o sea a propósito.',
    norm: 'Ley 16.074, art. 9',
  },
  {
    myth: 'La empresa decide si fue accidente laboral.',
    reality:
      'No lo decide. Presenta la denuncia patronal, que declara el hecho; quien determina la cobertura y la atención es el BSE. Que la empresa prefiera otra versión no cambia lo que el BSE te debe.',
    norm: 'Ley 16.074, art. 48',
  },
  {
    myth: 'Si estoy en negro, no me cubre nada.',
    reality:
      'Te cubre. El BSE atiende e indemniza aunque el patrón no te haya asegurado. Lo que cambia es el cálculo: se toma como base un salario mínimo nacional en vez de tu sueldo real.',
    norm: 'Ley 16.074, art. 8',
  },
  {
    myth: 'Cobrás el sueldo completo mientras estás de licencia.',
    reality:
      'La indemnización temporaria son las 2/3 partes del jornal o sueldo mensual, y empieza desde el cuarto día de ausencia.',
    norm: 'Ley 16.074, art. 19',
  },
])

/** ¿Este relato pierde la cobertura? La regla del artículo 9, como función. */
export function keepsCompensation(
  cause: 'culpa_leve' | 'culpa_grave' | 'caso_fortuito' | 'fuerza_mayor' | 'dolo'
): boolean {
  return cause !== 'dolo'
}
