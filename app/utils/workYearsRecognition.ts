// El reconocimiento de años trabajados antes de abril de 1996, y su plazo.
//
// Catálogo puro (sin imports de Vue/Nuxt) para `/reconocer-anos-trabajados-uruguay`.
//
// POR QUÉ ESTA PÁGINA. La historia laboral nominada del BPS arranca el 1/4/1996. Todo lo que
// alguien trabajó ANTES de esa fecha no está registrado, y si no se reconoce no cuenta para la
// jubilación. Eso ya no se puede pedir en cualquier momento: la Ley 20.130 lo puso en un
// cronograma por fecha de nacimiento, con una fecha de cierre por franja. El sitio ya tiene
// `/cuando-me-puedo-jubilar-uruguay` (la EDAD y los años que se exigen por generación); esta
// página es la otra mitad, que es de dónde salen esos años.
//
// REGLA DE ESTE ARCHIVO: cada fecha y cada plazo sale del cuadro que el propio BPS publica, y va
// con su cita. Lo que el BPS no publica —el costo del trámite— no se publica acá, que es la misma
// convención que sigue `bpsCertificates.ts` con el importe del timbre profesional.

/** Día en que se leyeron las fuentes de este archivo. */
export const WORK_YEARS_VERIFIED_AT = '2026-09-26'

/** Última actualización que declara el cuadro del BPS. */
export const WORK_YEARS_SOURCE_UPDATED_AT = '2026-07-21'

/**
 * El día desde el que existe la historia laboral nominada.
 *
 * Textual del BPS: «La historia laboral nominada es un detalle de los servicios y remuneraciones
 * registradas en BPS a partir del 1/4/1996». Es la frontera de toda esta página: lo posterior
 * está registrado y se corrige por otra vía; lo anterior hay que reconocerlo.
 */
export const HISTORIA_LABORAL_START = '1996-04-01'

export interface WorkYearsSource {
  readonly label: string
  readonly url: string
}

export const WORK_YEARS_SOURCES: readonly WorkYearsSource[] = Object.freeze([
  {
    label: 'BPS — Reconocimiento de años trabajados (el cuadro de plazos por fecha de nacimiento)',
    url: 'https://www.bps.gub.uy/20542/reconocimiento-de-anos-trabajados.html',
  },
  {
    label: 'BPS — Reconocimiento de años trabajados (requisitos y modalidad del trámite)',
    url: 'https://www.bps.gub.uy/11452/reconocimiento-de-anos-trabajados.html',
  },
  {
    label: 'BPS — Constancia de historia laboral nominada',
    url: 'https://www.bps.gub.uy/11438/constancia-de-historia-laboral-nominada.html',
  },
  {
    label: 'BPS — Reconstrucción de la historia laboral (actividades anteriores a abril de 1996)',
    url: 'https://www.bps.gub.uy/15430/reconstruccion-de-la-historia-laboral.html',
  },
  {
    label: 'IMPO — Ley 20.130',
    url: 'https://www.impo.com.uy/bases/leyes/20130-2023',
  },
  {
    label: 'IMPO — Decreto 228/023',
    url: 'https://www.impo.com.uy/bases/decretos/228-2023',
  },
])

/**
 * Los dos años extra que el BPS le da a quien vive afuera.
 *
 * Textual: «Los plazos para las solicitudes de reconocimiento de años trabajados para personas
 * residentes en el exterior se extienden por dos años más en cada franja». El BPS no desglosa si
 * se corre también la apertura, así que acá se aplica SÓLO al cierre —que es lo que «plazo»
 * significa en el cuadro— y la página imprime la frase entera para que se lea el original.
 */
export const ABROAD_EXTRA_YEARS = 2

export interface WorkYearsBracket {
  readonly key: string
  /** La franja tal como la nombra el cuadro del BPS. */
  readonly birthLabel: string
  /** Primer día de nacimiento de la franja en ISO; `null` si el cuadro no le pone piso. */
  readonly bornFrom: string | null
  /** Último día de nacimiento de la franja en ISO; `null` si el cuadro no le pone techo. */
  readonly bornTo: string | null
  /** «Desde» del cuadro: el día en que se abre la ventana para esa franja. */
  readonly opensOn: string
  /** «Hasta» del cuadro: el último día para pedirlo. */
  readonly closesOn: string
  /** La franja (1), cuyo cierre se corrió por el Decreto de MTSS del 21/5/2026. */
  readonly extendedByDecree: boolean
}

/**
 * El cuadro del BPS, fila por fila.
 *
 * Las dos primeras franjas cierran EL MISMO DÍA (31/5/2027) y no es un error de transcripción: el
 * Decreto de MTSS del 21/5/2026 le extendió el plazo a la primera, que vencía antes, y la dejó
 * empatada con la segunda. Es el dato más útil del cuadro y el que se pierde si uno mira sólo su
 * propia fila: hoy hay dos generaciones enteras compitiendo por la misma fecha de cierre.
 */
export const WORK_YEARS_BRACKETS: readonly WorkYearsBracket[] = Object.freeze([
  {
    key: 'hasta-1963',
    birthLabel: 'Hasta el 1/6/1963, inclusive',
    bornFrom: null,
    bornTo: '1963-06-01',
    opensOn: '2023-06-01',
    closesOn: '2027-05-31',
    extendedByDecree: true,
  },
  {
    key: '1963-1968',
    birthLabel: 'Entre el 2/6/1963 y el 1/6/1968',
    bornFrom: '1963-06-02',
    bornTo: '1968-06-01',
    opensOn: '2025-06-01',
    closesOn: '2027-05-31',
    extendedByDecree: false,
  },
  {
    key: '1968-1973',
    birthLabel: 'Entre el 2/6/1968 y el 1/6/1973',
    bornFrom: '1968-06-02',
    bornTo: '1973-06-01',
    opensOn: '2027-06-01',
    closesOn: '2029-05-31',
    extendedByDecree: false,
  },
  {
    key: 'desde-1973',
    birthLabel: 'Desde el 2/6/1973, inclusive',
    bornFrom: '1973-06-02',
    bornTo: null,
    opensOn: '2029-06-01',
    closesOn: '2031-05-31',
    extendedByDecree: false,
  },
])

/** `true` si `iso` es una fecha calendario válida escrita como `YYYY-MM-DD`. */
export function isCalendarDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number]
  if (month < 1 || month > 12 || day < 1) return false
  // El día 0 del mes siguiente es el último del mes pedido, y así el 31 de febrero no pasa.
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Suma años a una fecha ISO sin salirse del calendario.
 *
 * El 29 de febrero baja al 28 en un año común. Las cuatro fechas del cuadro caen en 31/5 o 1/6, así
 * que hoy el recorte no se usa; está igual porque una fila nueva del BPS no tiene por qué caer en
 * un día cómodo.
 */
export function addYears(iso: string, years: number): string {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number]
  const target = year + years
  const lastDay = new Date(Date.UTC(target, month, 0)).getUTCDate()
  const safeDay = Math.min(day, lastDay)
  return `${String(target).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(
    safeDay
  ).padStart(2, '0')}`
}

/**
 * La franja que le toca a quien nació el día `iso`, o `null` si la fecha no es una fecha.
 *
 * Los bordes del cuadro son inclusivos de los dos lados («Hasta el 1/6/1963, inclusive», «Entre el
 * 2/6/1963 y el 1/6/1968»), así que la comparación de cadenas ISO alcanza y no hace falta `Date`:
 * un `new Date('1963-06-01')` interpretado en la zona del navegador es justamente cómo se pierde
 * un día en el borde.
 */
export function bracketForBirthDate(iso: string): WorkYearsBracket | null {
  if (!isCalendarDate(iso)) return null
  return (
    WORK_YEARS_BRACKETS.find(
      bracket =>
        (bracket.bornFrom === null || iso >= bracket.bornFrom) &&
        (bracket.bornTo === null || iso <= bracket.bornTo)
    ) ?? null
  )
}

/** El último día para pedirlo, con los dos años extra si la persona reside en el exterior. */
export function closesOnFor(bracket: WorkYearsBracket, abroad = false): string {
  return abroad ? addYears(bracket.closesOn, ABROAD_EXTRA_YEARS) : bracket.closesOn
}

/** `upcoming` = todavía no abrió, `open` = se puede pedir hoy, `closed` = venció. */
export type WorkYearsWindowState = 'upcoming' | 'open' | 'closed'

/**
 * En qué estado está la ventana de una franja el día `today` (ISO).
 *
 * Los dos extremos del cuadro cuentan: el «Desde» y el «Hasta» son días en los que se puede pedir.
 *
 * La APERTURA no se corre nunca, ni para quien vive afuera: el BPS extiende «los plazos», y correr
 * también el «Desde» sería decirle a alguien que su ventana todavía no abrió cuando el cuadro dice
 * que sí. Los dos años extra alargan el final y nada más.
 */
export function windowStateOn(
  today: string,
  bracket: WorkYearsBracket,
  abroad = false
): WorkYearsWindowState {
  if (today < bracket.opensOn) return 'upcoming'
  return today > closesOnFor(bracket, abroad) ? 'closed' : 'open'
}

/** Días que faltan para el cierre de una franja; negativo si ya venció. */
export function daysUntilClose(today: string, bracket: WorkYearsBracket, abroad = false): number {
  const close = Date.parse(`${closesOnFor(bracket, abroad)}T00:00:00Z`)
  return Math.round((close - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
}

export interface WorkYearsFaqItem {
  readonly question: string
  readonly answer: string
}

export const WORK_YEARS_FAQ: readonly WorkYearsFaqItem[] = Object.freeze([
  {
    question: '¿Desde cuándo está registrada mi historia laboral en el BPS?',
    answer:
      'Desde el 1.º de abril de 1996. El BPS define la historia laboral nominada como «un detalle de los servicios y remuneraciones registradas en BPS a partir del 1/4/1996». Lo que trabajaste antes de esa fecha no figura ahí, y para que cuente hay que pedir el reconocimiento de esos años.',
  },
  {
    question: '¿Puedo pedir el reconocimiento en cualquier momento?',
    answer:
      'No. El BPS publica un cuadro que asigna a cada fecha de nacimiento una ventana con un día de apertura y un día de cierre. Quien nació hasta el 1/6/1963 y quien nació entre el 2/6/1963 y el 1/6/1968 tienen plazo hasta el 31/5/2027; quien nació entre el 2/6/1968 y el 1/6/1973, hasta el 31/5/2029; y desde el 2/6/1973, hasta el 31/5/2031.',
  },
  {
    question: '¿Por qué dos franjas vencen el mismo día?',
    answer:
      'Porque a la primera le corrieron el plazo. El cuadro marca la fila de los nacidos hasta el 1/6/1963 con una nota: «Plazo extendido de acuerdo al Decreto de MTSS del 21/05/2026». Con esa extensión quedó empatada con la franja siguiente, y las dos cierran el 31/5/2027.',
  },
  {
    question: '¿Y si vivo en el exterior?',
    answer:
      'El cuadro aclara que «los plazos para las solicitudes de reconocimiento de años trabajados para personas residentes en el exterior se extienden por dos años más en cada franja», y el trámite es otro: «Reconocimiento de años trabajados en Uruguay para residentes en el exterior».',
  },
  {
    question: '¿Qué pasa si me jubilo antes de que venza mi plazo?',
    answer:
      'El BPS lo resuelve expresamente: «Quienes cumplan con los requisitos para jubilarse antes del plazo establecido por su edad podrán reconocer estos años al solicitar su jubilación».',
  },
  {
    question: '¿Alcanza con pedir la cita antes del cierre?',
    answer:
      'Sí, y es el detalle que más caro sale pasar por alto. El BPS dice que quien reside en Uruguay «deberá agendarse antes de finalizar el plazo (aunque la fecha de reserva sea posterior)». O sea que lo que tiene que estar dentro del plazo es la reserva, no la atención.',
  },
  {
    question: '¿Qué documentación piden?',
    answer:
      'Tiene que presentarse el titular o un apoderado registrado en BPS con la cédula de identidad vigente y la Declaración de períodos trabajados completa. Después, según si la actividad fue como dependiente o no dependiente, el BPS evalúa si pide alguna otra documentación. El trámite es presencial.',
  },
  {
    question: '¿Y si el período que me falta es posterior a abril de 1996?',
    answer:
      'Ese no es este trámite: está registrado o debería estarlo, y lo que corresponde es denunciar la diferencia. El BPS indica que las personas nacidas luego del 1/6/1968 pueden denunciar diferencias en los aportes o períodos de trabajo posteriores a abril de 1996, si residen en Uruguay, a través del trámite «Denuncias de trabajadores».',
  },
  {
    question: '¿Cuánto cuesta?',
    answer:
      'No lo publicamos. La ficha del trámite del BPS detalla requisitos, modalidad y etapas, pero no declara un costo, y preferimos decirte que lo confirmes en el BPS antes de publicar un número que no podemos sostener con una fuente.',
  },
])
