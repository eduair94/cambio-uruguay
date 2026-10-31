// La multa por no votar en Uruguay, y los ocho actos que quedan trabados mientras no se pague.
//
// POR QUÉ ESTE CATÁLOGO. El sitio ya contesta la multa de UNA elección concreta
// (`/elecciones-bps-2026`, que es el 22/11/2026 y tiene su propio régimen de justificación, el de
// la Ley 16.241). Lo que no tenía en ninguna de sus páginas es el régimen GENERAL, que es el que
// rige para las nacionales y las departamentales y el que explica la consecuencia que a la gente
// le aparece años después: la credencial sin el sello frena trámites. Medido el 2026-10-31 con
// grep sobre `pages/` y `utils/`: cero menciones de «credencial cívica» y cero de la Ley 16.017
// fuera de la página del BPS.
//
// LA REGLA DEL ARCHIVO. Cada fila cita su artículo o su página oficial, y nada se publica con más
// firmeza que la fuente:
//
//   - La multa va en UNIDADES REAJUSTABLES porque así la escribe el artículo 8. Los montos en
//     pesos NO se calculan acá: los fija la Corte Electoral por elección y se copian de su propia
//     página con la fecha en que se leyó. Multiplicar la UR de hoy por tres daría un número que
//     ninguna oficina va a cobrar, que es exactamente el error que este repo no comete.
//   - La Corte Electoral publica el monto de la PRIMERA omisión (1 UR) y su versión duplicada
//     (2 UR). El de las omisiones siguientes (3 UR, o 6 UR duplicado) no lo publica, así que acá
//     queda en UR y sin pesos.
//   - `curableConLaMulta` existe porque el artículo 11, literal D, dice en voz alta que esa
//     prohibición «no será subsanada con el pago de la multa»: es el único acto de los ocho que
//     pagar no desbloquea, y es el dato que más cambia una decisión.

/** Una fuente oficial, con la fecha en que se leyó. */
export interface VotingFineSource {
  label: string
  url: string
  /** ISO. Cuándo se verificó el contenido citado. */
  checkedAt: string
}

/** Cuánto es la multa, en unidades reajustables, según el artículo 8 y el 12 de la Ley 16.017. */
export interface VotingFineTier {
  /** `primera` = primera omisión; `siguientes` = cada una de las posteriores. */
  key: 'primera' | 'siguientes'
  label: string
  /** UR del artículo 8. */
  ur: number
  /** UR con el duplicado del artículo 12 (profesional de la UdelaR o funcionario público). */
  urDuplicada: number
  articulo: string
}

/** Un monto que la Corte Electoral publicó para una elección concreta. */
export interface VotingFinePublished {
  /** Cómo la Corte Electoral nombra la elección. */
  eleccion: string
  /** ISO del día de la elección, cuando la fuente lo declara. */
  dia?: string
  /** Pesos uruguayos de la primera omisión (1 UR). */
  pesos: number
  /** Pesos de la versión duplicada del artículo 12 (2 UR). */
  pesosDuplicada: number
  /** Filas extra que esa elección tenga (las empresas, en la del BPS). */
  extras?: readonly { label: string; ur: number; pesos: number }[]
  fuente: string
}

/** Un acto que no se puede hacer mientras la credencial no tenga el sello. */
export interface VotingBlockedAct {
  articulo: string
  label: string
  detalle: string
  /** False sólo donde la propia ley dice que pagar la multa no levanta la prohibición. */
  curableConLaMulta: boolean
}

/** Una causa que la ley admite para no votar, con su plazo y ante quién se presenta. */
export interface VotingJustification {
  literal: 'A' | 'B' | 'C'
  label: string
  prueba: string
  plazo: string
  ante: string
}

/**
 * Artículo 8: una UR la primera vez, tres por cada una de las siguientes. Artículo 12: el doble
 * cuando el omiso es profesional con título de la Universidad de la República o funcionario
 * público.
 */
export const VOTING_FINE_TIERS: readonly VotingFineTier[] = Object.freeze([
  Object.freeze({
    key: 'primera' as const,
    label: 'Primera elección en la que no votás',
    ur: 1,
    urDuplicada: 2,
    articulo: 'Ley 16.017, art. 8 (y art. 12 para el duplicado)',
  }),
  Object.freeze({
    key: 'siguientes' as const,
    label: 'Cada elección siguiente',
    ur: 3,
    urDuplicada: 6,
    articulo: 'Ley 16.017, art. 8 (y art. 12 para el duplicado)',
  }),
])

/**
 * Lo que la Corte Electoral publica en pesos, elección por elección. No se interpola ni se
 * proyecta: lo que no está en su página no está acá.
 */
export const VOTING_FINE_PUBLISHED: readonly VotingFinePublished[] = Object.freeze([
  Object.freeze({
    eleccion: 'Elecciones del BPS',
    dia: '2026-11-22',
    pesos: 1900,
    pesosDuplicada: 3800,
    extras: Object.freeze([
      Object.freeze({ label: 'Empresa de hasta 10 trabajadores', ur: 6, pesos: 11400 }),
      Object.freeze({ label: 'Empresa de 11 a 50 trabajadores', ur: 12, pesos: 22800 }),
      Object.freeze({ label: 'Empresa de más de 50 trabajadores', ur: 20, pesos: 38000 }),
    ]),
    fuente: 'corte-bps-2026',
  }),
  Object.freeze({
    eleccion: 'Elecciones Departamentales y Municipales 2025',
    pesos: 1820,
    pesosDuplicada: 3640,
    fuente: 'corte-multas',
  }),
  Object.freeze({
    eleccion: 'Elecciones Nacionales y Segunda Elección 2024',
    pesos: 1740,
    pesosDuplicada: 3480,
    fuente: 'corte-multas',
  }),
])

/**
 * Los ocho actos que la Ley 16.017 traba mientras la credencial no exhiba el sello (o su
 * constancia de la Junta Electoral). Orden: del que más aparece en la vida de alguien al que menos.
 */
export const VOTING_BLOCKED_ACTS: readonly VotingBlockedAct[] = Object.freeze([
  Object.freeze({
    articulo: 'art. 11, D',
    label: 'Ingresar a la Administración Pública',
    detalle:
      'Es el único de los ocho donde la ley dice que pagar la multa no alcanza: «esta prohibición no será subsanada con el pago de la multa prevista en el artículo 8».',
    curableConLaMulta: false,
  }),
  Object.freeze({
    articulo: 'art. 11, B',
    label: 'Cobrar sueldos, jubilaciones, pensiones y dietas',
    detalle:
      'Dietas, sueldos, jubilaciones y pensiones de cualquier naturaleza. La excepción son las pensiones alimenticias.',
    curableConLaMulta: true,
  }),
  Object.freeze({
    articulo: 'art. 11, C',
    label: 'Cobrarle al Estado cualquier otra cosa',
    detalle:
      'Dinero que deban el Poder Ejecutivo, el Legislativo, el Judicial, los gobiernos departamentales, los entes autónomos y los servicios descentralizados, por cualquier concepto.',
    curableConLaMulta: true,
  }),
  Object.freeze({
    articulo: 'art. 11, A',
    label: 'Firmar escrituras públicas',
    detalle:
      'Quedan afuera los testamentos y las escrituras de ventas judiciales, pero esa excepción no alcanza al comprador.',
    curableConLaMulta: true,
  }),
  Object.freeze({
    articulo: 'art. 9',
    label: 'Presentar escritos ante oficinas del Estado',
    detalle:
      'Escritos de cualquier naturaleza ante el Poder Legislativo, la Administración Central, los municipios, el Poder Judicial y la Justicia Electoral. El funcionario que los recibe tiene que anotar la serie, el número y el texto del último sello de la credencial de cada firmante.',
    curableConLaMulta: true,
  }),
  Object.freeze({
    articulo: 'art. 11, E',
    label: 'Inscribirse o rendir examen',
    detalle:
      'En las facultades de la Universidad, en los Institutos Normales y en los Institutos de Profesores.',
    curableConLaMulta: true,
  }),
  Object.freeze({
    articulo: 'art. 11, F',
    label: 'Comprar pasajes al exterior',
    detalle: 'Pasajes para el exterior en empresas de transporte de pasajeros.',
    curableConLaMulta: true,
  }),
  Object.freeze({
    articulo: 'art. 10',
    label: 'Entrar a una licitación del Estado',
    detalle:
      'Licitaciones de cualquier clase y llamados de precios ante oficinas del Estado: la credencial que se exhibe es la de la persona que interviene, sea por sí o por una empresa.',
    curableConLaMulta: true,
  }),
])

/**
 * Los días que el artículo 9 da para arreglarlo cuando el escrito ya se presentó sin la
 * credencial. Vencidos, el escrito «se tendrá por no presentado» y lo actuado se anula.
 */
export const VOTING_FILING_GRACE_DAYS = 30

/** Las tres causas del artículo 6, con la prueba y el plazo del artículo 7. */
export const VOTING_JUSTIFICATIONS: readonly VotingJustification[] = Object.freeze([
  Object.freeze({
    literal: 'A' as const,
    label: 'Enfermedad, invalidez o imposibilidad física',
    prueba:
      'Certificado de un médico del Ministerio de Salud Pública. Si no hay, el de otro médico; en defecto de los dos, una información sumaria ante el Juzgado de Paz.',
    plazo: 'Dentro de los 30 días siguientes a la elección',
    ante: 'La Junta Electoral que corresponda',
  }),
  Object.freeze({
    literal: 'B' as const,
    label: 'Estar ausente del país el día de la elección',
    prueba: 'Se acredita en el consulado, que remite los antecedentes a la Corte Electoral.',
    plazo: 'Dentro de los 20 días anteriores y los 20 posteriores a la elección',
    ante: 'La oficina consular uruguaya más cercana',
  }),
  Object.freeze({
    literal: 'C' as const,
    label: 'Fuerza mayor que impidió llegar a la mesa',
    prueba: 'Se describe con precisión y se prueba; la Junta resuelve.',
    plazo: 'Dentro de los 30 días siguientes a la elección',
    ante: 'La Junta Electoral que corresponda',
  }),
])

/** Las fuentes, por clave, para que cada cifra de la página las pueda citar. */
export const VOTING_FINE_SOURCES: Readonly<Record<string, VotingFineSource>> = Object.freeze({
  'ley-16017': Object.freeze({
    label: 'Ley 16.017, arts. 6 a 12 (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/16017-1989',
    checkedAt: '2026-10-31',
  }),
  'corte-multas': Object.freeze({
    label: 'Corte Electoral — Pago y solicitud de devolución de multas',
    url: 'https://www.gub.uy/corte-electoral/tramites-y-servicios/servicios/pago-solicitud-devolucion-multas',
    checkedAt: '2026-10-31',
  }),
  'corte-bps-2026': Object.freeze({
    label: 'Corte Electoral — Justificación y multas, Elecciones del BPS 2026',
    url: 'https://www.gub.uy/corte-electoral/comunicacion/publicaciones/justificacion-multas-voto-elecciones-del-bps-2026',
    checkedAt: '2026-10-31',
  }),
})

/** Cuándo se verificó el catálogo entero, para que la página lo imprima. */
export const VOTING_FINE_VERIFIED_AT = '2026-10-31'

/** El único acto que pagar la multa NO desbloquea, si existe. */
export function actoQueElPagoNoArregla(): VotingBlockedAct | undefined {
  return VOTING_BLOCKED_ACTS.find(a => !a.curableConLaMulta)
}

/** Los montos publicados, del más nuevo al más viejo, por el día o por el orden declarado. */
export function montosPublicados(): readonly VotingFinePublished[] {
  return VOTING_FINE_PUBLISHED
}

/**
 * El monto publicado de una elección, buscado por una parte de su nombre. Sin coincidencia
 * devuelve `undefined`: no hay una cifra «por defecto» que se pueda ofrecer en su lugar.
 */
export function montoDe(parteDelNombre: string): VotingFinePublished | undefined {
  const needle = parteDelNombre.trim().toLowerCase()
  if (!needle) return undefined
  return VOTING_FINE_PUBLISHED.find(m => m.eleccion.toLowerCase().includes(needle))
}

/** La fuente de una fila de montos. */
export function fuenteDe(fila: VotingFinePublished): VotingFineSource | undefined {
  return VOTING_FINE_SOURCES[fila.fuente]
}
