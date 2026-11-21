// La historia laboral del BPS: qué dice, el plazo para observarla y por qué vía se reclama.
//
// Catálogo puro (sin imports de Vue/Nuxt) que compone la guía `/guias/historia-laboral-bps-uruguay`,
// igual que `domesticWork.ts` compone la del trabajo doméstico: las fechas, los nombres de trámite
// y las citas viven acá y la guía las redacta, así que no hay un segundo literal que pueda
// separarse del primero.
//
// POR QUÉ ESTA GUÍA. El sitio ya tiene las dos mitades de al lado y le faltaba el medio:
// `/reconocer-anos-trabajados-uruguay` cubre lo ANTERIOR al 1/4/1996 (que no está registrado y hay
// que pedir que se reconozca, con plazo por fecha de nacimiento) y
// `/denunciar-trabajo-en-negro-uruguay` cubre la relación laboral no declarada (MTSS, BPS, juicio).
// Ninguna de las dos habla del registro en sí: cómo se mira, qué hay que revisar y —lo que no está
// escrito en ningún lado de forma legible— que ese registro se CIERRA. La Ley 16.713 da un año
// para observarlo desde que el BPS lo pone de manifiesto, y pasado ese año queda inmodificable
// salvo dos excepciones. El Decreto 228/023 fija la primera puesta de manifiesto para el
// 31/12/2027: o sea que el reloj todavía no arrancó, y eso es exactamente lo que una guía puede
// contestar hoy y no va a poder contestar en 2029.
//
// REGLA DE ESTE ARCHIVO, la misma que `workYearsRecognition.ts`: cada fecha, cada plazo y cada
// nombre de trámite sale de una fuente oficial leída, y va con su cita. Lo que el BPS no publica no
// se publica acá — ninguna de las páginas del BPS que describen estos trámites publica un costo, y
// por eso esta guía no dice ninguno.

/** Día en que se leyeron todas las fuentes de este archivo. */
export const HILA_VERIFIED_AT = '2026-11-21'

/**
 * El día desde el que existe la historia laboral nominada.
 *
 * Textual del BPS: «La historia laboral nominada es un detalle de los servicios y remuneraciones
 * registradas en BPS a partir del 1/4/1996». Es la frontera que decide por qué vía se reclama un
 * período que falta, y la misma constante que usa `workYearsRecognition.ts` para lo de antes.
 */
export const HILA_START = '1996-04-01'

/**
 * La primera puesta de manifiesto del Registro de Historia Laboral.
 *
 * Decreto 228/023, artículo 19 («Información al trabajador: puesta de manifiesto del Registro de
 * Historia Laboral»): «se efectuará por primera vez el 31 de diciembre de 2027» y «en lo sucesivo
 * se pondrá de manifiesto actualizada cada 3 años en igual fecha».
 */
export const HILA_FIRST_DISCLOSURE = '2027-12-31'

/** Cada cuántos años se repite la puesta de manifiesto, según el mismo artículo 19. */
export const HILA_DISCLOSURE_EVERY_YEARS = 3

/**
 * El plazo para observar el registro, en años.
 *
 * Ley 16.713, artículo 90 numeral 1, en la redacción dada por el artículo 226 de la Ley 20.130:
 * el afiliado «dispondrá de un plazo de un año para observar la información del registro de
 * historia laboral», contado desde la puesta de manifiesto del artículo anterior.
 */
export const HILA_OBSERVATION_YEARS = 1

/**
 * La fecha de nacimiento tope (inclusive) que manda a «Reconocimiento de años trabajados» incluso
 * para períodos posteriores a abril de 1996.
 *
 * Es una excepción que el propio BPS escribe en la página de «Denuncias de trabajadores», y no una
 * deducción nuestra: quien nació hasta el 1/6/1968 inclusive denuncia las actividades no
 * registradas por ese otro trámite, según sus plazos.
 */
export const HILA_RECOGNITION_BIRTH_CUTOFF = '1968-06-01'

/** La edad a la que el reclamo pasa a resolverse dentro del trámite jubilatorio. */
export const HILA_RETIREMENT_AGE = 60

/** Cuántos meses antes de esa edad ya aplica esa vía («o le faltan hasta 6 meses»). */
export const HILA_RETIREMENT_MONTHS_AHEAD = 6

// ---------------------------------------------------------------------------
// Las cuatro vías
// ---------------------------------------------------------------------------

export type HilaVia = 'reconocimiento' | 'jubilacion' | 'consultenos' | 'denuncia'

export interface HilaViaInfo {
  readonly via: HilaVia
  /** Cómo se llama el trámite en el BPS, textual. */
  readonly tramite: string
  /** Una línea con qué es. */
  readonly que: string
  /** Por qué le toca a este caso. */
  readonly porque: string
  /** La página del BPS que lo describe. */
  readonly url: string
  /** Nuestra página con el detalle, si existe. */
  readonly nuestra?: string
}

export const HILA_VIAS: Readonly<Record<HilaVia, HilaViaInfo>> = Object.freeze({
  denuncia: {
    via: 'denuncia',
    tramite: 'Denunciar diferencias de salarios y actividades no declaradas',
    que: 'El servicio en línea del BPS para avisar que un empleador no declaró tu actividad, la declaró mal o puso otras fechas de entrada o salida. Se hace con Usuario Personal BPS.',
    porque:
      'El período que falta es posterior a abril de 1996, así que es una declaración que tu empleador tenía que presentar y no presentó.',
    url: 'https://www.bps.gub.uy/11439/denuncias-de-trabajadores.html',
    nuestra: '/denunciar-trabajo-en-negro-uruguay',
  },
  reconocimiento: {
    via: 'reconocimiento',
    tramite: 'Reconocimiento de años trabajados',
    que: 'El trámite para registrar actividades que no figuran en la historia laboral. Es presencial, con cédula vigente y la declaración de períodos trabajados.',
    porque:
      'Es la vía que el BPS indica para lo anterior a abril de 1996 y, aunque el período sea posterior, también para quien nació hasta el 1/6/1968 inclusive.',
    url: 'https://www.bps.gub.uy/11452/reconocimiento-de-anos-trabajados.html',
    nuestra: '/reconocer-anos-trabajados-uruguay',
  },
  jubilacion: {
    via: 'jubilacion',
    tramite: 'Solicitud de jubilación',
    que: 'El reclamo no va por separado: se plantea dentro del propio trámite de jubilación.',
    porque:
      'El BPS lo indica para quien no está trabajando y ya tiene 60 años, o le faltan hasta 6 meses para cumplirlos.',
    url: 'https://www.bps.gub.uy/11439/denuncias-de-trabajadores.html',
    nuestra: '/cuando-me-puedo-jubilar-uruguay',
  },
  consultenos: {
    via: 'consultenos',
    tramite: 'Consúltenos',
    que: 'El formulario de consultas del BPS. Tema «Trabajadores», motivo «Denuncias de trabajadores».',
    porque:
      'Si ya iniciaste el trámite jubilatorio, el BPS pide comunicarse por ahí en lugar de abrir una denuncia nueva.',
    url: 'https://www.bps.gub.uy/11439/denuncias-de-trabajadores.html',
  },
})

export interface HilaDecision {
  /** Cuándo fue el período que falta. */
  readonly periodo: string
  /** La condición que el BPS agrega, o un guion cuando no agrega ninguna. */
  readonly condicion: string
  /** La vía que corresponde. */
  readonly via: HilaVia
}

/**
 * Por dónde se reclama, caso por caso.
 *
 * Es una tabla DECLARADA y no una función: las dos excepciones que el BPS escribe en la página de
 * «Denuncias de trabajadores» —haber nacido hasta el 1/6/1968 y estar a menos de seis meses de los
 * 60 sin trabajar— pueden darse juntas, y el BPS no publica cuál manda en ese caso. Una función que
 * devolviera UNA respuesta tendría que inventar ese desempate, que es justo lo que este archivo no
 * hace. La tabla dice qué condición lleva a qué trámite y deja que el lector se reconozca en más de
 * una fila; la última fila es el caso general, y por eso va al final.
 */
export const HILA_DECISION: readonly HilaDecision[] = Object.freeze([
  {
    periodo: 'Antes del 1/4/1996',
    condicion: 'Cualquiera: esos años no están registrados',
    via: 'reconocimiento',
  },
  {
    periodo: 'Desde el 1/4/1996',
    condicion: 'Naciste hasta el 1/6/1968 inclusive',
    via: 'reconocimiento',
  },
  {
    periodo: 'Desde el 1/4/1996',
    condicion: 'No estás trabajando y tenés 60 años, o te faltan hasta 6 meses',
    via: 'jubilacion',
  },
  {
    periodo: 'Desde el 1/4/1996',
    condicion: 'Ya iniciaste el trámite de jubilación',
    via: 'consultenos',
  },
  {
    periodo: 'Desde el 1/4/1996',
    condicion: 'Cualquier otro caso',
    via: 'denuncia',
  },
])

// ---------------------------------------------------------------------------
// Qué revisar cuando la bajás
// ---------------------------------------------------------------------------

export interface HilaCheck {
  readonly title: string
  readonly body: string
}

/**
 * Lo que hay que mirar en la constancia, y no es «si figura o no figura».
 *
 * Cada ítem es un dato que el registro guarda y que cambia la jubilación: el artículo 90 cierra la
 * información ENTERA, no sólo la existencia del período, así que una fecha de alta corrida o una
 * remuneración menor también quedan firmes si nadie las observa.
 */
export const HILA_CHECKS: readonly HilaCheck[] = Object.freeze([
  {
    title: 'Que estén todos los períodos',
    body: 'Un empleo entero que no aparece es el caso más visible, y el que más se busca. Revisá también los cortos: una zafra, una suplencia, un mes de prueba.',
  },
  {
    title: 'Las fechas de entrada y de salida',
    body: 'El BPS admite la denuncia también cuando hay diferencias en las fechas de comienzo o de finalización de la actividad declarada, no sólo cuando falta todo el período.',
  },
  {
    title: 'Las remuneraciones declaradas',
    body: 'La jubilación se calcula sobre lo declarado. Una subdeclaración —menos sueldo del que cobrabas— es la otra mitad del trámite: se llama «diferencias de salarios».',
  },
  {
    title: 'Que las empresas sean las tuyas',
    body: 'Si figura una empresa en la que nunca trabajaste, es información del registro y se observa igual que una que falta.',
  },
])

// ---------------------------------------------------------------------------
// Preguntas y fuentes
// ---------------------------------------------------------------------------

export interface HilaFaq {
  readonly question: string
  readonly answer: string
}

export const HILA_FAQ: readonly HilaFaq[] = Object.freeze([
  {
    question: '¿Dónde veo mi historia laboral del BPS?',
    answer:
      'En el servicio en línea «Consultar mis aportes», con Usuario Personal BPS, y en la app BPS Personas. La constancia que baja de ahí sale con código QR, así que el BPS aclara que no hay que ir a una oficina a que te la sellen.',
  },
  {
    question: '¿Puedo verla si no tengo usuario del BPS?',
    answer:
      'Sí, pidiéndola en una oficina: el titular va con su cédula de identidad vigente y en buen estado. También la puede pedir un apoderado inscripto en el BPS, con su cédula y la del titular. Si la persona falleció, la piden los herederos con un certificado notarial que identifique quiénes tienen derecho hereditario.',
  },
  {
    question: '¿Desde cuándo está registrada?',
    answer:
      'Desde el 1.º de abril de 1996. El BPS define la historia laboral nominada como «un detalle de los servicios y remuneraciones registradas en BPS a partir del 1/4/1996». Lo que trabajaste antes no figura ahí y se pide por «Reconocimiento de años trabajados».',
  },
  {
    question: '¿Es cierto que la historia laboral se cierra?',
    answer:
      'Sí. La Ley 16.713, en la redacción que le dio la Ley 20.130, le da al afiliado un año para observar la información desde que el BPS la pone de manifiesto. Si no la observa en ese plazo, se entiende que la acepta y el registro queda inmodificable, con dos excepciones: lo que surja de una inspección o investigación del propio BPS y lo que pruebe una sentencia judicial firme en un juicio en el que el organismo haya sido parte.',
  },
  {
    question: '¿Cuándo empieza a correr ese año?',
    answer:
      'Todavía no empezó. El Decreto 228/023 fija que la puesta de manifiesto «se efectuará por primera vez el 31 de diciembre de 2027» y que después se repite actualizada cada 3 años en la misma fecha. Mientras tanto la información está disponible en todo momento en la web del BPS, y la propia ley pone en cabeza del interesado la carga de consultarla periódicamente.',
  },
  {
    question: 'Sigo trabajando en el empleo que quiero observar. ¿Pierdo el plazo?',
    answer:
      'No, si reservás el derecho. La ley prevé que quien siga trabajando al vencer el plazo pueda reservar su derecho a observar, y en ese caso el año corre desde que termina la relación laboral. El decreto aclara que esa reserva es únicamente del período generado en el vínculo laboral vigente al vencimiento del plazo.',
  },
  {
    question: 'Mi empleador no pagó los aportes. ¿Por eso no figuro?',
    answer:
      'No debería: son dos cosas distintas. La ley obliga a presentar la declaración «se hayan o no efectuado los aportes correspondientes», así que una actividad puede estar registrada aunque el aporte esté impago. Si el período no figura, lo que falta es la declaración.',
  },
  {
    question: '¿Cuánto sale el trámite?',
    answer:
      'Ninguna de las páginas del BPS que describen estos trámites publica un costo, así que acá no se publica ninguno. Preguntalo en el BPS antes de ir.',
  },
])

export interface HilaSource {
  readonly label: string
  readonly url: string
}

export const HILA_SOURCES: readonly HilaSource[] = Object.freeze([
  {
    label: 'BPS — Constancia de historia laboral nominada (qué es, canales y documentación)',
    url: 'https://www.bps.gub.uy/11438/constancia-de-historia-laboral-nominada.html',
  },
  {
    label: 'BPS — Denuncias de trabajadores (la vía para lo posterior a abril de 1996)',
    url: 'https://www.bps.gub.uy/11439/denuncias-de-trabajadores.html',
  },
  {
    label: 'BPS — Nueva vía para el ingreso de denuncias de trabajadores (el servicio en línea)',
    url: 'https://www.bps.gub.uy/19111/nueva-via-para-el-ingreso-de-denuncias-de-trabajadores.html',
  },
  {
    label:
      'BPS — Si en mi historia laboral no se encuentran registrados años de trabajo posteriores a abril de 1996',
    url: 'https://www.bps.gub.uy/20831/si-en-mi-historia-laboral-no-se-encuentran-registrados-anos-de-trabajo-posteriores-a-abril-de-1996-que-debo-hacer.html',
  },
  {
    label: 'BPS — Reconocimiento de años trabajados (requisitos y modalidad)',
    url: 'https://www.bps.gub.uy/11452/reconocimiento-de-anos-trabajados.html',
  },
  {
    label: 'IMPO — Ley 16.713, artículo 87 (declaración de los empleadores)',
    url: 'https://www.impo.com.uy/bases/leyes/16713-1995/87',
  },
  {
    label: 'IMPO — Ley 16.713, artículo 89 (información al trabajador)',
    url: 'https://www.impo.com.uy/bases/leyes/16713-1995/89',
  },
  {
    label: 'IMPO — Ley 16.713, artículo 90 (observación de la información)',
    url: 'https://www.impo.com.uy/bases/leyes/16713-1995/90',
  },
  {
    label: 'IMPO — Decreto 228/023, artículo 19 (puesta de manifiesto) y artículo 20 (reserva)',
    url: 'https://www.impo.com.uy/bases/decretos/228-2023',
  },
])
