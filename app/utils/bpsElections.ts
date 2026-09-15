// Elecciones de directores sociales del BPS, 22 de noviembre de 2026. Todo verificado el
// 2026-09-15 contra el BPS y la Corte Electoral; la multa en pesos se calcula con la UR viva.
import type { FaqItem } from './faqAnswers'

export const BPS_ELECTIONS_VERIFIED_AT = '2026-09-15'
export const ELECTION_DATE = '2026-11-22'
export const WHAT_IS_ELECTED =
  'Tres representantes sociales del Directorio del BPS: uno por los trabajadores activos, uno por los jubilados y pensionistas y uno por las empresas contribuyentes. El voto es secreto, personal y obligatorio para quienes están en el padrón.'

export interface VoterOrder {
  orden: string
  who: string
  cutoff: string
  excluded: string[]
}

export const VOTERS: readonly VoterOrder[] = [
  {
    orden: 'Trabajadores activos',
    who: 'Mayores de 18 años con vínculo laboral dependiente activo o en actividad subsidiada al 28 de febrero de 2026 (si no cumplían ese día, se toma el 31 de julio de 2025).',
    cutoff: '2026-02-28',
    excluded: ['Afiliados a las cajas Civil, Bancaria, Notarial y Profesional'],
  },
  {
    orden: 'Jubilados y pensionistas',
    who: 'Jubilados, pensionistas por sobrevivencia e invalidez mayores de 18 años y pensionistas a la vejez, al 28 de febrero de 2026.',
    cutoff: '2026-02-28',
    excluded: [
      'Asistencia a la vejez',
      'Pensiones especiales y graciables',
      'Rentas del Banco de Seguros',
    ],
  },
  {
    orden: 'Empresas',
    who: 'Empresas registradas y al día con sus obligaciones al 28 de febrero de 2026; votan por un mandatario (hasta diez empresas por mandatario, registro cerrado el 15 de junio de 2026).',
    cutoff: '2026-02-28',
    excluded: [
      'Afiliadas a las cajas Civil, Bancaria, Notarial y Profesional',
      'Servicio doméstico',
      'Construcción',
    ],
  },
]

export const EXEMPT: readonly string[] = [
  'Mayores de 75 años (trabajadores, jubilados, pensionistas y titulares de empresas unipersonales)',
  'Titulares de prestaciones por incapacidad, sin importar la edad',
]

export interface Fine {
  who: string
  ur: number | readonly number[]
  note: string
}

export const FINES: readonly Fine[] = [
  {
    who: 'Trabajadores, jubilados y pensionistas',
    ur: 1,
    note: 'Misma multa que por no votar en las últimas elecciones nacionales.',
  },
  {
    who: 'Funcionarios públicos y profesionales con título de la UdelaR',
    ur: 2,
    note: 'Misma regla que en las elecciones nacionales.',
  },
  {
    who: 'Empresas',
    ur: [6, 12, 20],
    note: 'Según la cantidad de trabajadores dependientes, cualquiera sea la naturaleza jurídica.',
  },
]

export interface CalendarItem {
  from: string
  to?: string
  label: string
}

export const CALENDAR: readonly CalendarItem[] = [
  { from: '2026-02-28', label: 'Cierre del padrón' },
  { from: '2026-08-24', label: 'Publicación del padrón' },
  { from: '2026-08-26', to: '2026-09-14', label: 'Reclamos al padrón ante la Corte Electoral' },
  { from: '2026-09-22', label: 'Padrón definitivo y planes circuitales (dónde votás)' },
  { from: '2026-10-23', label: 'Cierre del registro de hojas de votación' },
  { from: '2026-11-22', label: 'Elección' },
  { from: '2026-11-23', to: '2027-01-21', label: 'Plazo para justificar el no voto' },
  { from: '2026-11-24', label: 'Escrutinio definitivo' },
  { from: '2027-02-01', to: '2027-05-04', label: 'Control del voto obligatorio y multas' },
]

export const JUSTIFICATION_CAUSES: readonly string[] = [
  'Enfermedad, invalidez o imposibilidad física',
  'Razones de fuerza mayor',
  'Estar fuera del país el día de la elección',
  'Residir en un departamento distinto al del circuito asignado',
  'Ser mayor de 75 años o titular de una prestación por incapacidad (no hace falta justificar)',
]

export function fineInPesos(ur: number, urValue: number | null | undefined): number | null {
  if (!Number.isFinite(ur) || ur <= 0) return null
  if (urValue == null || !Number.isFinite(urValue) || urValue <= 0) return null
  return Math.round(ur * urValue)
}

export interface BpsSource {
  label: string
  url: string
}

export const BPS_ELECTIONS_SOURCES: readonly BpsSource[] = [
  {
    label: 'BPS — Elecciones de Directores Sociales, noviembre 2026',
    url: 'https://www.bps.gub.uy/24184/elecciones-de-directores-sociales-del-bps---noviembre-2026.html',
  },
  {
    label: 'BPS — Elecciones de Directores Sociales 2026 (padrón y consultas)',
    url: 'https://www.bps.gub.uy/24209/elecciones-de-directores-sociales-2026.html',
  },
  {
    label: 'Corte Electoral — Calendario electoral, elecciones BPS 2026',
    url: 'https://www.gub.uy/corte-electoral/comunicacion/publicaciones/calendario-electoral-elecciones-bps-2026',
  },
  {
    label: 'Presidencia — Las elecciones del BPS serán el 22 de noviembre',
    url: 'https://www.gub.uy/presidencia/comunicacion/noticias/elecciones-bps-cuando-son-mayo-2026',
  },
  {
    label: 'El Observador — Cuándo se vota, quiénes están obligados y cuánto sale la multa',
    url: 'https://www.elobservador.com.uy/nacional/elecciones-obligatorias-bps-2026-cuando-se-vota-quienes-estan-obligados-y-cuanto-sale-la-multa-no-hacerlo-n6054566',
  },
  {
    label: 'Montevideo Portal — Quiénes votan, cómo consultar el padrón y las multas',
    url: 'https://www.montevideo.com.uy/Noticias/Elecciones-del-BPS-2026-quienes-votan-como-consultar-el-padron-y-cuales-son-las-multas-uc973797',
  },
]

export const BPS_ELECTIONS_FAQ: readonly FaqItem[] = [
  {
    id: 'cuando-son',
    question: '¿Cuándo son las elecciones del BPS 2026?',
    answer:
      'El domingo 22 de noviembre de 2026. Se eligen los tres representantes sociales del Directorio del BPS: trabajadores, jubilados y pensionistas, y empresas.',
  },
  {
    id: 'son-obligatorias',
    question: '¿Es obligatorio votar en las elecciones del BPS?',
    answer:
      'Sí, para quienes figuran en el padrón: trabajadores dependientes mayores de 18, jubilados y pensionistas, y empresas contribuyentes. No están obligados los mayores de 75 años ni quienes cobran una prestación por incapacidad.',
  },
  {
    id: 'cuanto-es-la-multa',
    question: '¿Cuánto es la multa por no votar?',
    answer:
      'Para trabajadores, jubilados y pensionistas es la misma que por no votar en las elecciones nacionales: 1 unidad reajustable (2 UR para funcionarios públicos y profesionales con título de la UdelaR). Para las empresas, 6, 12 o 20 UR según la cantidad de trabajadores. El valor en pesos depende de la UR vigente el día del cobro.',
  },
  {
    id: 'donde-voto',
    question: '¿Dónde voto y cómo consulto el padrón?',
    answer:
      'El padrón se consulta en el sitio del BPS con la cédula. El plan circuital, con el lugar de votación, se publica desde el 22 de setiembre de 2026 por la Corte Electoral.',
  },
  {
    id: 'como-justifico',
    question: '¿Cómo justifico si no pude votar?',
    answer:
      'Entre el 23 de noviembre de 2026 y el 21 de enero de 2027, ante la Corte Electoral, con la causal documentada: enfermedad, invalidez, fuerza mayor, estar fuera del país o residir en otro departamento.',
  },
  {
    id: 'jubilados-votan',
    question: '¿Los jubilados tienen que votar?',
    answer:
      'Sí, si tienen menos de 75 años y cobran jubilación, pensión por sobrevivencia o invalidez, o pensión a la vejez. Quedan fuera del padrón las asistencias a la vejez, las pensiones especiales y graciables y las rentas del Banco de Seguros.',
  },
  {
    id: 'empresa-mandatario',
    question: '¿Cómo vota una empresa?',
    answer:
      'Por medio de un mandatario registrado ante el BPS (el registro cerró el 15 de junio de 2026; cada mandatario puede representar hasta diez empresas). Si no designó mandatario o este no vota, la multa es de 6, 12 o 20 UR.',
  },
]
