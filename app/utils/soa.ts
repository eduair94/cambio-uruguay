// app/utils/soa.ts
// El Seguro Obligatorio de Automotores (SOA) de Uruguay, artículo por artículo de la Ley 18.412.
//
// POR QUÉ EXISTE. El sitio ya tiene la familia del auto entera —el directorio de usados, el
// mercado, las oportunidades, los autos chocados y con deuda, las multas y la patente, el asesor
// de compra— y el SOA aparecía SÓLO como un ítem de costo: `utils/carAdvisor.ts` y
// `/que-auto-comprar-uruguay` lo suman al gasto mensual, `/conviene-auto-moto-o-omnibus-uruguay`
// lo mete en la cuenta del traslado y la descripción del tema «Comprar y mantener un auto» lo
// nombra. En ninguna parte se dice QUÉ cubre, y ahí está el malentendido que cuesta plata.
//
// LAS DOS COSAS QUE ESTA PÁGINA CONTESTA Y NO ESTABAN EN NINGUNA PARTE DEL SITIO:
//
//  1. El SOA NO te cubre a vos. El artículo 6 saca de la condición de «tercero» al propietario,
//     al tomador del seguro y al conductor, y además al cónyuge o concubino y a los ascendientes,
//     descendientes y colaterales hasta el segundo grado DE CUALQUIERA DE ELLOS. O sea que el
//     seguro obligatorio del auto familiar no cubre a la familia que viaja en ese auto.
//  2. El SOA NO paga la chapa. El artículo 2 define el accidente como «todo hecho del cual resulta
//     un daño personal, de lesión o muerte, sufrido por un tercero»: la indemnización es por la
//     persona, no por el vehículo. El auto abollado se reclama por derecho común (art. 24) o con
//     una cobertura de mayor cuantía (art. 23), que es otro seguro y es voluntario.
//
// EL TOPE SE PUBLICA EN UI, NO EN PESOS. El artículo 8 lo fija en unidades indexadas y por eso se
// mueve todos los días con el IPC; el sitio ya publica el valor de la UI en vivo
// (`utils/indicators.ts`, `/indicadores/unidad-indexada`), así que la página hace la cuenta con la
// lectura del día y NO guarda ningún monto en pesos acá. Si la lectura en vivo falla, la página
// publica las UI sin la equivalencia: estampar un valor viejo de la UI como «hoy» es exactamente
// el error que `liveIndicatorReading()` existe para no cometer.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA: cuánto SALE un SOA. El precio es comercial, lo pone cada
// aseguradora y el artículo 11 consagra la libertad de contratación, así que no hay una cifra
// oficial que citar. La multa del artículo 25 tampoco se publica en pesos: la ley no la fija en
// pesos sino en «dos veces el importe promedio del costo del SOA del mercado», que es un promedio
// de precios comerciales. Se publica la REGLA, que es el dato verificable, y no una cuenta nuestra.
//
// LA ESCALERA DEL ARTÍCULO 8 YA TERMINÓ. El tope arrancó en 150.000 UI el primer año, pasó a
// 200.000 el segundo y quedó en 250.000 «a partir del tercer año». La ley se promulgó el
// 17/11/2008 y entró en vigencia a los 180 días (art. 31, con el ajuste de la Ley 18.491), así que
// el tramo de 250.000 UI es el único vigente desde 2012. Los dos primeros se conservan acá porque
// circulan citados como si fueran el tope de hoy.
//
// FUENTES PRIMARIAS, cotejadas contra el texto vigente en impo.com.uy el 2026-10-09 (lista completa
// en SOA_SOURCES). El documento está marcado «Documento Actualizado» y sin nota de derogación; el
// artículo 25 lleva la redacción que le dio la Ley 19.996 de 03/11/2021, art. 46, y su literal B
// está reglamentado por el Decreto 22/024 de 29/01/2024.
//
// MÓDULO PURO (sin Vue/Nuxt) para que vitest-node lo cargue con imports relativos.

/** Fecha en la que se cotejó todo este archivo contra el texto oficial en impo.com.uy. */
export const SOA_VERIFIED_AT = '2026-10-09'

/** El enlace al artículo puntual, que es como se cita acá: la ley entera no es una fuente. */
const ley = (article: number) => `https://www.impo.com.uy/bases/leyes/18412-2008/${article}`

export interface SoaSource {
  readonly label: string
  readonly url: string
}

/** Un ítem de una lista de la ley: lo que dice, y el artículo que lo dice. */
export interface SoaItem {
  readonly id: string
  /** Qué dice, en la lengua del lector. */
  readonly label: string
  /** El detalle que cambia la respuesta, no un resumen del label. */
  readonly detail: string
  /** El artículo exacto, citable. */
  readonly article: string
  readonly url: string
}

/** Un tramo de la escalera del artículo 8, en unidades indexadas. */
export interface SoaCoverageStep {
  readonly id: string
  /** Desde cuándo rige, tal como lo dice la ley. */
  readonly since: string
  /** El tope en UI. */
  readonly ui: number
  /** `true` sólo en el tramo que rige hoy. */
  readonly current: boolean
}

/**
 * El tope del seguro, artículo 8, en UNIDADES INDEXADAS por vehículo asegurado y por accidente.
 *
 * El último tramo es el vigente y los dos anteriores se conservan porque se citan como si lo
 * fueran: la escalera terminó en 2012.
 */
export const SOA_COVERAGE_STEPS: readonly SoaCoverageStep[] = Object.freeze([
  { id: 'primer-ano', since: 'Primer año de vigencia', ui: 150_000, current: false },
  { id: 'segundo-ano', since: 'Segundo año', ui: 200_000, current: false },
  { id: 'tercer-ano', since: 'A partir del tercer año', ui: 250_000, current: true },
])

/** El tope vigente, en UI. */
export const SOA_COVERAGE_UI: number = SOA_COVERAGE_STEPS.find(step => step.current)?.ui ?? 250_000

/**
 * El tope en pesos al valor de la UI que se le pase, o `null` si no hay lectura en vivo.
 *
 * Devuelve `null` y no un número calculado con un valor de referencia a propósito: la página sólo
 * puede publicar esta cifra cuando la leyó hoy.
 */
export function soaCoverageInPesos(uiValue: number | null | undefined): number | null {
  if (typeof uiValue !== 'number' || !Number.isFinite(uiValue) || uiValue <= 0) return null
  return SOA_COVERAGE_UI * uiValue
}

/**
 * Quién NO es «tercero», artículo 6. Es la lista que decide a quién NO le paga este seguro, y es
 * la razón de ser de la página.
 */
export const SOA_NON_THIRD_PARTIES: readonly SoaItem[] = Object.freeze([
  {
    id: 'propietario-conductor-familia',
    label: 'El propietario, el tomador del seguro, el conductor y su familia cercana',
    detail:
      'Incluye al cónyuge o concubino, a los ascendientes y descendientes por consanguinidad, afinidad o adopción, y a los parientes colaterales hasta el segundo grado de cualquiera de los tres, respecto del seguro del mismo vehículo. Es la exclusión que sorprende: el SOA del auto de la familia no cubre a quien viaja en él.',
    article: 'Ley 18.412, art. 6 literal A',
    url: ley(6),
  },
  {
    id: 'dependientes',
    label: 'Los dependientes que iban trabajando en el vehículo y ya tienen otra cobertura',
    detail:
      'Dependientes a cualquier título del propietario, del tomador o del conductor, cuando viajaban en el mismo vehículo desempeñando tareas que tienen otra cobertura de seguro.',
    article: 'Ley 18.412, art. 6 literal B',
    url: ley(6),
  },
  {
    id: 'transporte-oneroso',
    label: 'Los pasajeros que pagaron el viaje y tienen otra cobertura',
    detail:
      'Personas transportadas a título oneroso que cuenten con otra cobertura de seguro. La condición es que exista esa otra cobertura: no alcanza con haber pagado el viaje.',
    article: 'Ley 18.412, art. 6 literal C',
    url: ley(6),
  },
  {
    id: 'vehiculo-hurtado',
    label: 'Los ocupantes de un vehículo hurtado',
    detail:
      'Salvo que prueben que desconocían esa circunstancia, o que no hubo voluntad de ocupar el vehículo.',
    article: 'Ley 18.412, art. 6 literal D',
    url: ley(6),
  },
  {
    id: 'dolo',
    label: 'La víctima que buscó el daño',
    detail:
      'La víctima o sus causahabientes cuando medió dolo de su parte en la producción de las lesiones o la muerte.',
    article: 'Ley 18.412, art. 6 literal E',
    url: ley(6),
  },
])

/** Qué cubre igual, y es lo que no se espera. */
export const SOA_COVERED: readonly SoaItem[] = Object.freeze([
  {
    id: 'dano-personal',
    label: 'El daño personal, la lesión o la muerte de un tercero',
    detail:
      'La ley define el accidente como «todo hecho del cual resulta un daño personal, de lesión o muerte, sufrido por un tercero», determinado en forma cierta. La indemnización es por la persona: este seguro no se mide en chapa.',
    article: 'Ley 18.412, art. 2',
    url: ley(2),
  },
  {
    id: 'caso-fortuito',
    label: 'Aun en caso fortuito o fuerza mayor',
    detail:
      'El mismo artículo 2 lo dice expresamente: el accidente queda cubierto «aún en los supuestos de caso fortuito o fuerza mayor». No hace falta que haya culpa de nadie.',
    article: 'Ley 18.412, art. 2',
    url: ley(2),
  },
  {
    id: 'piezas-y-carga',
    label: 'Lo que se desprende del vehículo y lo que lleva encima',
    detail:
      'El seguro alcanza los daños causados por las piezas que se desprenden y por la carga transportada dentro del vehículo o sobre él.',
    article: 'Ley 18.412, art. 5',
    url: ley(5),
  },
  {
    id: 'incapacidad-total',
    label: 'La incapacidad total y permanente, hasta el 100 % del capital',
    detail:
      'La incapacidad total y permanente, según baremo médico, puede llegar al 100 % del capital asegurado, igual que el caso de muerte. Las lesiones se pagan como porcentaje de esa suma.',
    article: 'Ley 18.412, art. 8',
    url: ley(8),
  },
  {
    id: 'varias-victimas',
    label: 'Varias víctimas en un mismo accidente, pero sin pasar el tope',
    detail:
      'Si un accidente lesiona a varias personas, la indemnización de cada una se reduce proporcionalmente para que el total no supere el límite del vehículo.',
    article: 'Ley 18.412, art. 8',
    url: ley(8),
  },
])

/** Los vehículos que NO necesitan SOA, artículo 3. */
export const SOA_EXCLUDED_VEHICLES: readonly SoaItem[] = Object.freeze([
  {
    id: 'rieles',
    label: 'Los que circulan sobre rieles',
    detail: 'Trenes y tranvías quedan fuera de la obligación.',
    article: 'Ley 18.412, art. 3 literal A',
    url: ley(3),
  },
  {
    id: 'predio-cerrado',
    label: 'Los usados sólo dentro de un predio sin acceso del público',
    detail:
      'Vehículos utilizados exclusivamente en el interior de establecimientos industriales, comerciales o agropecuarios, de playas ferroviarias o de cualquier otro lugar al que el público no tenga acceso.',
    article: 'Ley 18.412, art. 3 literal B',
    url: ley(3),
  },
  {
    id: 'deposito-judicial',
    label: 'Los que están en depósito judicial',
    detail:
      'La exclusión dura lo que dura el depósito: el vehículo no circula, y la obligación vuelve cuando se levanta y sale de nuevo a la vía pública.',
    article: 'Ley 18.412, art. 3 literal C',
    url: ley(3),
  },
  {
    id: 'sin-circulacion-vial',
    label: 'En general, todo vehículo no utilizado para la circulación vial',
    detail:
      'Es el inciso que cierra la lista. Un ciclomotor que circula por la vía pública NO entra acá: la ley lo nombra expresamente al fijar la multa del artículo 25.',
    article: 'Ley 18.412, art. 3 literal D',
    url: ley(3),
  },
])

/** Los plazos que le corren al damnificado. */
export interface SoaDeadline extends SoaItem {
  /** El plazo tal como se lee; la ley mezcla días hábiles y años a propósito. */
  readonly deadline: string
}

export const SOA_DEADLINES: readonly SoaDeadline[] = Object.freeze([
  {
    id: 'respuesta-aseguradora',
    label: 'La aseguradora tiene que contestar el reclamo',
    deadline: '30 días hábiles',
    detail:
      'El reclamo ante la aseguradora es un procedimiento obligatorio y previo. Vencido ese plazo sin respuesta, o ante una denegatoria, queda abierta la vía judicial.',
    article: 'Ley 18.412, arts. 12 y 13',
    url: ley(12),
  },
  {
    id: 'prescripcion',
    label: 'El derecho a reclamar prescribe',
    deadline: '2 años',
    detail:
      'Se cuentan desde el hecho generador del perjuicio, no desde el alta médica ni desde el cierre del expediente policial.',
    article: 'Ley 18.412, art. 14',
    url: ley(14),
  },
])

/** Si el otro no tiene seguro, se fugó, o el auto era robado: arts. 19 a 22. */
export const SOA_SPECIAL_COVERAGE: readonly SoaItem[] = Object.freeze([
  {
    id: 'situaciones',
    label: 'Las tres situaciones que igual se indemnizan',
    detail:
      'Un vehículo no identificado, un vehículo carente de seguro obligatorio y un vehículo hurtado u obtenido con violencia. En los tres casos el damnificado cobra, por el procedimiento de los artículos siguientes.',
    article: 'Ley 18.412, art. 19',
    url: ley(19),
  },
  {
    id: 'quien-paga',
    label: 'Hoy lo paga una aseguradora, no el Fondo',
    detail:
      'El Fondo de Indemnización de Coberturas Especiales que administra la UNASEV pagaba dos tercios el primer año y un tercio el segundo; a partir del tercero la totalidad corre por cuenta de la aseguradora designada. Ese tramo es el único vigente.',
    article: 'Ley 18.412, art. 20',
    url: ley(20),
  },
  {
    id: 'que-aseguradora',
    label: 'La aseguradora la asigna la UNASEV, en proporción a lo que cada una vende',
    detail:
      'La UNASEV opera como centro de distribución y adjudica entre las aseguradoras en proporción a las coberturas de automotores que cada una vende. Si hay que ir a juicio, la acción se dirige contra la aseguradora que indicó ese centro de distribución.',
    article: 'Ley 18.412, art. 22 (redacción de la Ley 19.924, art. 61)',
    url: ley(22),
  },
])

/** Qué pasa si circulás sin SOA: art. 25 a 28. */
export const SOA_ENFORCEMENT: readonly SoaItem[] = Object.freeze([
  {
    id: 'multa',
    label: 'Multa de dos veces el precio promedio de mercado del SOA',
    detail:
      'La ley no fija la multa en pesos: la fija en «dos veces el importe promedio del costo del Seguro Obligatorio de Automotores (SOA) del mercado», para ciclomotores y vehículos de todas las categorías. La aplican el Ministerio del Interior, las intendencias o el MTOP, y lo recaudado va al Fondo de Seguridad Vial.',
    article: 'Ley 18.412, art. 25 literal A (redacción de la Ley 19.996, art. 46)',
    url: ley(25),
  },
  {
    id: 'secuestro',
    label: 'El vehículo se puede secuestrar de forma preventiva',
    detail:
      'El Ministerio del Interior puede disponer el secuestro preventivo de todo vehículo automotor que circule sin seguro obligatorio, y su depósito a costa del propietario, poseedor o tenedor.',
    article: 'Ley 18.412, art. 25 literal A',
    url: ley(25),
  },
  {
    id: 'cruce-sucive',
    label: 'No hace falta que te paren: se cruza con el SUCIVE',
    detail:
      'El Ministerio del Interior puede exigir a las aseguradoras las fechas de inicio y fin de cada póliza con su matrícula, acceder al SUCIVE y al registro de vehículos y comparar las dos bases. Si una matrícula no tiene póliza, emite, notifica y aplica la multa. El literal B está reglamentado por el Decreto 22/024.',
    article: 'Ley 18.412, art. 25 literal B',
    url: ley(25),
  },
  {
    id: 'tramites-bloqueados',
    label: 'Sin SOA no se hace ningún trámite del vehículo',
    detail:
      'Los registros y las oficinas competentes no pueden procesar trámites sobre el vehículo sin verificar el seguro. Si el propietario no lo acredita, se aplica una multa equivalente al costo promedio de mercado del SOA.',
    article: 'Ley 18.412, arts. 27 y 28',
    url: ley(27),
  },
])

export interface SoaFaq {
  readonly question: string
  readonly answer: string
}

export const SOA_FAQ: readonly SoaFaq[] = Object.freeze([
  {
    question: '¿El seguro obligatorio me cubre a mí si tengo un accidente?',
    answer:
      'No. El artículo 6 de la Ley 18.412 saca de la condición de tercero al propietario, al tomador del seguro y al conductor, y también al cónyuge o concubino y a los ascendientes, descendientes y colaterales hasta el segundo grado de cualquiera de ellos. Para cubrirte a vos hace falta otra cobertura, que es voluntaria.',
  },
  {
    question: '¿El SOA paga el arreglo del auto?',
    answer:
      'No. La ley define el accidente como el hecho del que resulta un daño personal, de lesión o muerte de un tercero (art. 2): la indemnización es por la persona. Los daños del vehículo se reclaman por derecho común o con una cobertura de mayor cuantía, que es un seguro aparte y voluntario (arts. 23 y 24).',
  },
  {
    question: '¿Cuál es el tope del seguro obligatorio?',
    answer:
      'El artículo 8 lo fija en 250.000 UI por vehículo asegurado y por accidente. Está en unidades indexadas, así que en pesos cambia todos los días con el valor de la UI. Los topes de 150.000 y 200.000 UI que todavía se citan eran los del primer y segundo año de vigencia de la ley, en 2009 y 2010.',
  },
  {
    question: '¿Y si el que me chocó no tenía seguro o se fue?',
    answer:
      'Igual se indemniza. El artículo 19 prevé tres casos: vehículo no identificado, vehículo sin seguro obligatorio y vehículo hurtado u obtenido con violencia. La UNASEV actúa como centro de distribución y asigna una aseguradora en proporción a las coberturas de automotores que vende cada una (art. 22).',
  },
  {
    question: '¿Cuánto tiempo tengo para reclamar?',
    answer:
      'Dos años desde el hecho que causó el perjuicio (art. 14). Antes de ir a juicio hay que reclamar a la aseguradora, que tiene 30 días hábiles para contestar; vencido ese plazo o ante una negativa, queda abierta la vía judicial (arts. 12 y 13).',
  },
  {
    question: '¿Qué pasa si circulo sin seguro obligatorio?',
    answer:
      'La multa es de dos veces el precio promedio de mercado del SOA y la aplican el Ministerio del Interior, las intendencias o el MTOP. El vehículo se puede secuestrar de forma preventiva y depositar a costa del propietario, y no hace falta que te paren: el Ministerio del Interior cruza las pólizas de las aseguradoras con el SUCIVE (art. 25).',
  },
  {
    question: '¿Un ciclomotor necesita SOA?',
    answer:
      'Sí, si circula por la vía pública. El artículo 3 excluye a los vehículos sobre rieles, a los que se usan sólo dentro de un predio sin acceso del público, a los que están en depósito judicial y a todo vehículo no utilizado para la circulación vial; el ciclomotor no entra en ninguno, y el artículo 25 lo nombra expresamente al fijar la multa.',
  },
  {
    question: '¿Cuánto sale el seguro obligatorio?',
    answer:
      'No hay un precio oficial que citar. El artículo 11 de la Ley 18.412 consagra la libertad de contratación: cada aseguradora fija su prima y el Banco Central aprueba condiciones y primas de referencia (art. 10). Por eso esta página publica el tope de la cobertura, que es legal, y no el precio, que es comercial.',
  },
])

/** Las fuentes primarias, una por norma citada. */
export const SOA_SOURCES: readonly SoaSource[] = Object.freeze([
  {
    label: 'Ley 18.412 — Seguro obligatorio de automotores (texto actualizado)',
    url: 'https://www.impo.com.uy/bases/leyes/18412-2008',
  },
  { label: 'Ley 18.412, art. 2 — Definición de accidente', url: ley(2) },
  { label: 'Ley 18.412, art. 3 — Automotores excluidos', url: ley(3) },
  { label: 'Ley 18.412, art. 6 — Exclusiones', url: ley(6) },
  { label: 'Ley 18.412, art. 8 — Límites del seguro', url: ley(8) },
  { label: 'Ley 18.412, arts. 12 y 13 — Procedimiento obligatorio y vía judicial', url: ley(12) },
  { label: 'Ley 18.412, art. 14 — Prescripción', url: ley(14) },
  { label: 'Ley 18.412, arts. 19 a 22 — Coberturas especiales', url: ley(19) },
  { label: 'Ley 18.412, art. 25 — Infracciones y sanciones', url: ley(25) },
  { label: 'Ley 18.412, arts. 27 y 28 — Contralor y oficinas competentes', url: ley(27) },
])
