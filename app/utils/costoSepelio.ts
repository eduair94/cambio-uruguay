// Cuánto cuesta un sepelio en Uruguay: lo que se publica, lo que no y las coberturas que lo pagan.
//
// Catálogo puro (sin imports de Vue/Nuxt) que compone la guía `/guias/cuanto-cuesta-un-sepelio-uruguay`,
// igual que `historiaLaboral.ts` compone la suya: las tarifas, los plazos y las citas viven acá y la
// guía las redacta, así que no hay un segundo literal que pueda separarse del primero.
//
// POR QUÉ ESTA GUÍA. El autocompletado uruguayo pregunta «cuánto cuesta un sepelio», «cuánto sale
// un velorio», «servicios fúnebres uruguay» y «cuánto cuesta una cremación en Uruguay», y el sitio
// sólo tenía `/guias/subsidio-expensas-funerarias-bps-uruguay`, que contesta otra cosa: cuánto
// REINTEGRA el BPS. Esta guía contesta lo de antes de pagar —qué cobra la Intendencia, qué incluye un
// servicio, quién lo cubre— y manda a esa otra para el reintegro, sin repetir su detalle.
//
// REGLA DE ESTE ARCHIVO. Cada tarifa sale de una norma o una ficha oficial leída el 2026-11-22, con su
// cita. Las empresas fúnebres que se revisaron no publican precios (la de Martinelli lo dice con
// todas las letras: «Los costos son variables según el tipo de servicio fúnebre elegido»), así que
// esta guía no publica ninguno: ni un precio de empresa ni un rango o promedio de prensa. El único
// precio privado que aparece es la cuota mensual que ANDA publica en su propio comunicado, con su
// fecha. Lo que no se pudo leer (el digesto de Maldonado no respondió; los demás departamentos no se
// revisaron) se declara como hueco en la propia guía.

import { LICENCIAS_ESPECIALES } from './licenciasEspeciales'

/** Día en que se leyeron todas las fuentes de este archivo. */
export const SEPELIO_VERIFIED_AT = '2026-11-22'

/**
 * Hasta cuándo se pueden sostener las cifras en pesos sin volver a leerlas.
 *
 * Dos de ellas vencen solas: el BPS actualiza el tope del subsidio cada 1.º de enero (y en 2026
 * publicó la ficha nueva el 9 de febrero), y la Intendencia de Canelones ajusta sus tasas cada
 * semestre (la planilla vigente es la del segundo semestre de 2026). Para esta fecha hay que
 * releer las dos fuentes, no correr la fecha: lo hace la rutina de febrero de 2027 (la misma del
 * ajuste de pasividades). No hay un test que se ponga rojo solo, porque rompería la CI de todos.
 */
export const SEPELIO_REVIEW_BY = '2027-02-28'

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

/** Separador de miles uruguayo sin depender de ICU: `11544` → `'11.544'`. */
export const miles = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/** Pesos como los escribe el resto del sitio: `44716` → `'$ 44.716'`. */
export const sepelioPesos = (value: number): string => `$ ${miles(value)}`

/** Unidades indexadas: `1720` → `'1.720 UI'`. */
export const sepelioUi = (value: number): string => `${miles(value)} UI`

/** Una lista en prosa: `['a', 'b', 'c']` → `'a, b y c'` (o `'a, b o c'`). */
export const listaEs = (items: readonly string[], conjuncion: 'y' | 'o' = 'y'): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} ${conjuncion} ${items[items.length - 1]}`

/** Una fecha ISO como se lee acá: `'2026-11-22'` → `'22/11/2026'`. */
export const fechaUy = (iso: string): string => {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number]
  return `${day}/${month}/${year}`
}

// ---------------------------------------------------------------------------
// La unidad indexada con la que se convierten las tarifas de Montevideo
// ---------------------------------------------------------------------------

/**
 * Valor de la UI del día de la lectura, en pesos.
 *
 * INE, «Unidad Indexada, Noviembre 2026» (publicado el 5/11/2026, valores del 6/11 al 5/12/2026):
 * fila «22/11/2026 6,7119». La tarifa legal de Montevideo es la cifra en UI y no envejece; los pesos
 * son una conversión fechada, y la guía lo dice al lado de cada uno.
 */
export const SEPELIO_UI_VALUE = 6.7119

/** El día de la UI de arriba. */
export const SEPELIO_UI_VALUE_AT = '2026-11-22'

/** Una tarifa en UI convertida a pesos redondeados con {@link SEPELIO_UI_VALUE}. */
export const uiEnPesos = (ui: number): number => Math.round(ui * SEPELIO_UI_VALUE)

// ---------------------------------------------------------------------------
// Montevideo: lo que cobra el Servicio Fúnebre y Necrópolis
// ---------------------------------------------------------------------------

export interface TarifaMontevideo {
  readonly id: string
  /** El concepto, como lo entiende una persona y sin cambiar lo que dice la norma. */
  readonly concepto: string
  /** La tarifa en unidades indexadas, textual de la norma. */
  readonly ui: number
  /** Artículo y numeral del Digesto Departamental que la fija. */
  readonly norma: string
}

/**
 * Las tarifas que una familia puede encontrarse al morir alguien en Montevideo.
 *
 * Digesto Departamental, art. A.210.1 («Fijar los costos de los servicios de la Dirección del
 * Servicio Fúnebre y Necrópolis»), fuente principal Dto. JDM 38.513 del 29/12/2023, marcado
 * «Vigente»; más los arts. 221, 221.1 y 221.2 de la Sección X (arrendamiento de locales
 * funerarios departamentales), los dos primeros por Res. IM 0691/24 del 6/2/2024. El plazo de dos
 * años del arrendamiento es del art. 218 y el de cinco años del urnario, del art. 219.
 */
export const MVD_TARIFAS: readonly TarifaMontevideo[] = Object.freeze([
  {
    id: 'inhumacion-fosa',
    concepto: 'Sepultura en tubular, fosa en tierra o párvulo',
    ui: 1070,
    norma: 'Art. A.210.1, 1.a',
  },
  {
    id: 'inhumacion-local',
    concepto: 'Sepultura en un nicho o sepulcro propio, o en uno arrendado',
    ui: 750,
    norma: 'Art. A.210.1, 1.b',
  },
  {
    id: 'cremacion-cadaver',
    concepto: 'Cremación de un cuerpo',
    ui: 1720,
    norma: 'Art. A.210.1, 3.b',
  },
  {
    id: 'cremacion-en-vida',
    concepto: 'Solicitud de cremación hecha en vida',
    ui: 1040,
    norma: 'Art. A.210.1, 3.c',
  },
  {
    id: 'cremacion-restos',
    concepto: 'Cremación de restos que ya estaban sepultados',
    ui: 750,
    norma: 'Art. A.210.1, 3.a',
  },
  {
    id: 'reduccion-fosa',
    concepto: 'Reducción de restos de tubular, fosa o párvulo',
    ui: 1410,
    norma: 'Art. A.210.1, 2.c',
  },
  {
    id: 'arrendamiento',
    concepto: 'Uso de un espacio arrendado para el ataúd (hasta dos años)',
    ui: 550,
    norma: 'Arts. 218 y 221',
  },
  {
    id: 'prorroga',
    concepto: 'Prórroga de ese arrendamiento, por única vez',
    ui: 900,
    norma: 'Art. 221.1',
  },
  {
    id: 'urnario',
    concepto: 'Renovación de un urnario municipal (cinco años)',
    ui: 1420,
    norma: 'Arts. 219 y 221.2',
  },
  {
    id: 'traslado',
    concepto: 'Retiro o ingreso de un ataúd, restos o cenizas',
    ui: 750,
    norma: 'Art. A.210.1, 4.a',
  },
])

/** Una tarifa de Montevideo por su id; tira si no existe, para que un id mal escrito no pase. */
export const mvdTarifa = (id: string): TarifaMontevideo => {
  const tarifa = MVD_TARIFAS.find(row => row.id === id)
  if (!tarifa) throw new Error(`Tarifa de Montevideo desconocida: ${id}`)
  return tarifa
}

/**
 * La tasa ANUAL de mantenimiento de un nicho para un ataúd, en UI, por cementerio.
 *
 * Art. 200, literal a (Dto. JDM 38.513 del 29/12/2023, art. 43): «abonarán anualmente los siguientes
 * valores». Para dos ataúdes se suma un 20 % y para más de dos, un 30 %. Importa en el momento del
 * sepelio por el art. 210.2: «Para la realización de cualquier trámite ante el Servicio Fúnebre y de
 * Necrópolis se deberá estar al día en el pago de la tasa anual de mantenimiento».
 */
export const MVD_TASA_ANUAL_NICHO_UI: Readonly<Record<string, number>> = Object.freeze({
  Central: 400,
  Buceo: 400,
  'Paso Molino': 370,
  Cerro: 300,
  Norte: 300,
})

/** Cuántos años queda un cuerpo en un nicho tubular del Cementerio del Norte (art. R.1405). */
export const MVD_TUBULAR_YEARS = 2

/** Cuántas horas tienen que pasar desde el fallecimiento para cremar (art. D.2499). */
export const MVD_CREMACION_HORAS_MINIMAS = 24

/** Hasta qué edad la cremación de un cuerpo no tiene costo (art. A.210.1, numeral 8.h). */
export const MVD_CREMACION_GRATIS_HASTA_ANOS = 5

/**
 * El servicio velatorio y sepelio gratuito de la Intendencia de Montevideo.
 *
 * Ficha «Servicio velatorio y sepelio» del portal de trámites de la IM (actualizada el 16/1/2026):
 * «El servicio comprende: ataúd, sala, vehículo para el traslado del cuerpo y vehículo acompañante
 * para siete personas»; «No tiene costo». La exoneración de los trámites posteriores es del art.
 * 210.1.3 (Res. IM 0691/24), que exceptúa sólo la renovación del arrendamiento de urnario.
 */
export const MVD_SERVICIO_GRATUITO = Object.freeze({
  incluye: Object.freeze([
    'ataúd',
    'sala velatoria',
    'vehículo para el traslado del cuerpo',
    'vehículo acompañante para siete personas',
  ]),
  /** Las prestaciones que, cobradas al morir, habilitan el servicio a un adulto. */
  prestaciones: Object.freeze([
    'pensión por invalidez',
    'pensión por vejez',
    'asistencia a la vejez',
    'Tarjeta Uruguay Social (TUS)',
    'Asignaciones Familiares del Plan de Equidad (AFAM-PE)',
  ]),
  /** Lo que la ficha pide llevar. */
  requisitos: Object.freeze([
    'el certificado de defunción',
    'los oficios policiales de la seccional actuante',
    'la cédula del fallecido (si no tenía, un formulario de identificación de la seccional o de Identificación Civil)',
    'la cédula vigente de quien lo pide',
  ]),
  /** Dónde se pide, en persona. */
  salas: Object.freeze(['Gral. Flores 3824 (Cerrito de la Victoria)', 'Grecia 4128 (Cerro)']),
  telefono: '1950',
  edadMenores: 18,
})

// ---------------------------------------------------------------------------
// Canelones: la planilla de tasas del segundo semestre de 2026
// ---------------------------------------------------------------------------

export interface TarifaCanelones {
  readonly id: string
  readonly concepto: string
  /** En pesos, textual de la planilla. */
  readonly uyu: number
  /** Qué es la cifra, cuando no es el precio de todo. */
  readonly nota: string
}

/**
 * Intendencia de Canelones, «Tasas tarifas y precios segundo semestre 2026» (PDF «Ajuste Tasas,
 * Tarifas y Precios Julio 2026», Ordenanza de Necrópolis, Res. 15/06285).
 *
 * La tasa de inhumación es un porcentaje de un ficto por tipo de sepultura: en fosa (permiso de 3
 * años) el ficto es $ 30.900 y el 4 % para un cuerpo del propio departamento da $ 1.236; en nicho o
 * panteón (2 años) el ficto es $ 59.200 y el 2 % da $ 1.184. La cremación de un cuerpo ($ 3.082)
 * coincide con la ficha de gub.uy «Cremaciones en cementerios y hornos privados - Canelones»
 * (actualizada el 30/7/2026), que aclara que esa tasa la percibe la Intendencia «por cada
 * Cremación» y la cobra la empresa privada: no es el precio de la cremación.
 */
/** Los dos fictos de la planilla y el porcentaje para un cuerpo del propio departamento. */
export const CANELONES_FICTO_FOSA = 30900
export const CANELONES_FICTO_NICHO = 59200
export const CANELONES_PCT_FOSA = 4
export const CANELONES_PCT_NICHO = 2

export const CANELONES_TARIFAS: readonly TarifaCanelones[] = Object.freeze([
  {
    id: 'inhumacion-fosa',
    concepto: 'Tasa de sepultura en fosa (permiso por 3 años)',
    uyu: 1236,
    nota: `Para un cuerpo del propio departamento: el ${CANELONES_PCT_FOSA} % de un ficto de ${sepelioPesos(CANELONES_FICTO_FOSA)}`,
  },
  {
    id: 'inhumacion-nicho',
    concepto: 'Tasa de sepultura en nicho o panteón (2 años)',
    uyu: 1184,
    nota: `Para un cuerpo del propio departamento: el ${CANELONES_PCT_NICHO} % de un ficto de ${sepelioPesos(CANELONES_FICTO_NICHO)}`,
  },
  {
    id: 'cremacion',
    concepto: 'Tasa municipal por la cremación de un cuerpo',
    uyu: 3082,
    nota: 'La percibe la Intendencia y la cobra la empresa que crema: no es el precio de la cremación',
  },
  {
    id: 'nicho-anual',
    concepto: 'Arrendamiento de un nicho municipal',
    uyu: 11243,
    nota: 'Por un año',
  },
  {
    id: 'urnario',
    concepto: 'Arrendamiento de un urnario',
    uyu: 3990,
    nota: 'Por cinco años',
  },
  {
    id: 'cenizario',
    concepto: 'Arrendamiento de un cenizario',
    uyu: 3188,
    nota: 'Por cinco años',
  },
])

/** Una tarifa de Canelones por su id; tira si no existe. */
export const canelonesTarifa = (id: string): TarifaCanelones => {
  const tarifa = CANELONES_TARIFAS.find(row => row.id === id)
  if (!tarifa) throw new Error(`Tarifa de Canelones desconocida: ${id}`)
  return tarifa
}

/** El día desde el que rige la planilla de Canelones (segundo semestre de 2026). */
export const CANELONES_VIGENCIA_DESDE = '2026-07-01'

// ---------------------------------------------------------------------------
// El subsidio del BPS (el detalle vive en la otra guía)
// ---------------------------------------------------------------------------

/**
 * Los topes del subsidio por expensas funerarias, valor al 1/1/2026.
 *
 * BPS, ficha 3494 «Subsidio por expensas funerarias y gastos complementarios» (actualizada el
 * 9/2/2026), releída el 2026-11-22: «tope por todo concepto (expensas funerarias y gastos
 * complementarios) de: $ 44.716 (valor al 1/1/2026)»; «Los Gastos complementarios tienen un tope de
 * $ 22.358». La guía `/guias/subsidio-expensas-funerarias-bps-uruguay` publica los mismos números
 * escritos a mano en `guidesTrabajoBps.ts`; `tests/unit/costoSepelio.test.ts` exige que coincidan,
 * para que un ajuste de enero en una no deje a la otra publicando el tope viejo.
 */
export const BPS_SUBSIDIO_TOPE = 44716
export const BPS_GASTOS_COMPLEMENTARIOS_TOPE = 22358
export const BPS_SUBSIDIO_VIGENCIA = '2026-01-01'

/** «El plazo de presentación es de 180 días desde el día siguiente al fallecimiento». */
export const BPS_SUBSIDIO_PLAZO_DIAS = 180

/** Ficha 11428 del trámite: «Todas las partidas tienen una vigencia de 30 días». */
export const BPS_PARTIDA_VIGENCIA_DIAS = 30

// ---------------------------------------------------------------------------
// Lo que publica un plan de previsión: ANDA
// ---------------------------------------------------------------------------

/**
 * Lo que incluye el servicio fúnebre de ANDA para socios de Montevideo.
 *
 * ANDA, «Reglamento General Servicio Fúnebre» (versión 2025, enlazada desde anda.com.uy/servicio-funebre),
 * art. 5 literal a. Es la lista de rubros más completa que se encontró publicada por quien presta o
 * contrata el servicio, y por eso la guía la usa para explicar de qué se compone un sepelio. El
 * art. 9 agrega lo que NO incluye: «Los tributos por inhumación y entierro, independientemente del
 * cementerio donde se realicen los mismos serán a cargo del afiliado».
 */
export const ANDA_RUBROS_MONTEVIDEO: readonly string[] = Object.freeze([
  'ataúd social liso tapizado con seis manijas y almohada',
  'plaqueta con el nombre e imagen religiosa a elección',
  'arreglo y preparación del cuerpo',
  'mortaja',
  'álbum para firmas',
  'capilla ardiente en el domicilio o en una casa velatoria',
  'traslado del cuerpo al velatorio y al cementerio dentro de Montevideo',
  'sala velatoria',
  'carroza fúnebre',
  'transporte para hasta cuatro familiares de la sala al cementerio con regreso a un domicilio',
  'aviso radial o en prensa escrita a una columna',
  'trámites de inhumación (sellados, inscripciones y timbres)',
])

/**
 * La cuota mensual del servicio fúnebre de ANDA, ADEMÁS de la cuota social.
 *
 * Comunicado de ANDA publicado el 9/6/2026: «El nuevo valor regirá a partir del 1/7/2026», tabla
 * «Afiliados con posterioridad al 01/06/2015», fila «Servicio Fúnebre 132». El reglamento (arts. 1 y
 * 3) lo define como una cuota adicional que se paga «además de la cuota social».
 */
export const ANDA_CUOTA_FUNEBRE = 132
export const ANDA_CUOTA_VIGENCIA = '2026-07-01'
/** La cuota de arriba es la de quienes se afiliaron después de este día. */
export const ANDA_CUOTA_AFILIADOS_DESDE = '2015-06-01'

export interface CarenciaPorEdad {
  readonly edad: string
  readonly meses: number
}

/**
 * Cuánto hay que esperar desde que se firma el contrato hasta tener derecho al servicio.
 *
 * Reglamento de ANDA, art. 12: «Menores de 60 años (hasta 59 años): adquieren el derecho a los seis
 * meses»; de 60 a 74, a los doce meses; desde los 75, a los 24 meses. «La carencia se cuenta desde la
 * fecha de firma del contrato.» Es lo que hace que un plan contratado el día del fallecimiento no
 * cubra ese fallecimiento.
 */
export const ANDA_CARENCIA: readonly CarenciaPorEdad[] = Object.freeze([
  { edad: 'con hasta 59 años', meses: 6 },
  { edad: 'entre los 60 y los 74 años', meses: 12 },
  { edad: 'con 75 años o más', meses: 24 },
])

// ---------------------------------------------------------------------------
// Trámites y plazos
// ---------------------------------------------------------------------------

/**
 * La inscripción de la defunción en el Registro Civil.
 *
 * gub.uy, «Inscripción de defunciones» (actualizada el 20/2/2026): «Plazos: 10 días hábiles» a
 * partir del otro día del fallecimiento, «En zonas rurales son 20 días hábiles», con dos personas
 * mayores de 18 años como declarantes y «No tiene costo».
 */
export const INSCRIPCION_DIAS_HABILES = 10
export const INSCRIPCION_DIAS_HABILES_RURAL = 20

/**
 * Lo que cuesta la partida de defunción en la Dirección General del Registro de Estado Civil.
 *
 * gub.uy, «Solicitud de partidas - Defunción» (actualizada el 28/7/2026): la manuscrita común sale
 * «$153» y la urgente «$ 612»; «Las partidas digitales no tienen costo». La misma ficha dice que
 * para el Registro las partidas no pierden vigencia y que «La validez depende de la oficina donde
 * sean presentadas»: el BPS, por ejemplo, la pide con 30 días.
 */
export const PARTIDA_MANUSCRITA_COMUN = 153
export const PARTIDA_MANUSCRITA_URGENTE = 612

/**
 * La licencia por duelo, tomada del catálogo de `/licencias-especiales-uruguay` en vez de repetirla.
 * Ley 18.345, art. 7, releído en IMPO el 2026-11-22: «tendrán derecho a disponer de una licencia de
 * tres días hábiles».
 */
export const LICENCIA_DUELO = LICENCIAS_ESPECIALES.find(licencia => licencia.slug === 'duelo')!

// ---------------------------------------------------------------------------
// Preguntas y fuentes
// ---------------------------------------------------------------------------

export interface SepelioFaq {
  readonly question: string
  readonly answer: string
}

const cremarMvd = mvdTarifa('cremacion-cadaver').ui
const fosaMvd = mvdTarifa('inhumacion-fosa').ui
const conversion = `al valor de la UI del ${fechaUy(SEPELIO_UI_VALUE_AT)}`

export const SEPELIO_FAQ: readonly SepelioFaq[] = Object.freeze([
  {
    question: '¿Cuánto cuesta un sepelio en Uruguay?',
    answer: `Las empresas fúnebres que revisamos no publican sus precios: el servicio se presupuesta según lo que se elija. Lo que sí es público son las tasas de los cementerios. En Montevideo, cremar un cuerpo cuesta ${sepelioUi(cremarMvd)} (unos ${sepelioPesos(uiEnPesos(cremarMvd))} ${conversion}) y la sepultura en fosa o tubular, ${sepelioUi(fosaMvd)} (unos ${sepelioPesos(uiEnPesos(fosaMvd))}). Esas tasas van aparte del servicio de la empresa.`,
  },
  {
    question: '¿Cuánto cuesta cremar a una persona en Montevideo?',
    answer: `La tasa de la Intendencia por cremar un cuerpo es de ${sepelioUi(cremarMvd)}, unos ${sepelioPesos(uiEnPesos(cremarMvd))} ${conversion}. La cremación no reemplaza al servicio fúnebre, que se contrata igual, y no se puede hacer antes de que pasen ${MVD_CREMACION_HORAS_MINIMAS} horas del fallecimiento. La de un niño de hasta ${MVD_CREMACION_GRATIS_HASTA_ANOS} años de edad no tiene costo.`,
  },
  {
    question: '¿Quién puede pedir que se creme a un familiar?',
    answer:
      'En Montevideo, la cremación necesita autorización previa del Servicio Fúnebre y Necrópolis. Vale primero la voluntad que la persona dejó por escrito en vida, con firma certificada. Si no la dejó, el orden es el cónyuge o concubino, después los hijos mayores de edad, los padres, los hermanos mayores de edad y, por último, el familiar directo más próximo.',
  },
  {
    question: '¿La Intendencia de Montevideo da un velorio y sepelio gratis?',
    answer: `Sí, para algunos casos. El servicio sin costo incluye ${listaEs(MVD_SERVICIO_GRATUITO.incluye)}. Es para menores de ${MVD_SERVICIO_GRATUITO.edadMenores} años y para adultos que al morir recibían alguna de estas prestaciones: ${MVD_SERVICIO_GRATUITO.prestaciones.join(', ')}. La ficha agrega que no deben tener cobertura del BPS ni servicio fúnebre privado, que trabajadores en actividad y jubilados no tienen derecho y que la persona tiene que haber fallecido en Montevideo.`,
  },
  {
    question: 'Si no había plata ni cobertura, ¿qué pasa en Canelones?',
    answer:
      'La Intendencia de Canelones tiene un servicio fúnebre gratuito que exonera de tributos municipales a las personas de escasos recursos que fallecen, y con la inhumación quedan exonerados también la reducción posterior y la colocación de un ornato simple. Se acredita con una constancia de precariedad que expide el Juez de Paz de lunes a viernes, o la comisaría seccional los sábados, domingos y feriados, y se presenta en la oficina de la localidad.',
  },
  {
    question: '¿Qué incluye un servicio fúnebre básico?',
    answer: `Las empresas que revisamos no publican sus paquetes, pero ANDA publica el reglamento de su servicio. Para Montevideo incluye ${ANDA_RUBROS_MONTEVIDEO.slice(0, 9).join(', ')}, entre otros rubros. Y aclara que los tributos por inhumación quedan a cargo del afiliado, aunque el servicio esté cubierto.`,
  },
  {
    question: '¿Sirve contratar un plan fúnebre cuando la persona ya está muy enferma?',
    answer: `Puede que no llegue a cubrirlo, porque los planes tienen carencia: un tiempo de espera desde la firma. En el de ANDA, por ejemplo, el derecho se adquiere ${listaEs(ANDA_CARENCIA.map(c => `a los ${c.meses} meses para quien lo contrata ${c.edad}`))}, contados desde que se firma el contrato. Antes de pagar la primera cuota, pedí el reglamento y fijate esa cláusula.`,
  },
  {
    question: '¿Cuántos días tengo para inscribir la defunción?',
    answer: `${INSCRIPCION_DIAS_HABILES} días hábiles desde el día siguiente al fallecimiento, o ${INSCRIPCION_DIAS_HABILES_RURAL} en zonas rurales. La inscripción en el Registro Civil no tiene costo y van dos personas mayores de 18 años como declarantes, con el certificado de defunción. Pasado el plazo se tramita como inscripción tardía.`,
  },
  {
    question: '¿Cuántos días de licencia por duelo me corresponden?',
    answer: `Si trabajás en la actividad privada, ${LICENCIA_DUELO.dias} pagos por el fallecimiento de padre, madre, hijos, cónyuge, concubino, hermanos, hijos adoptivos o padres adoptantes (Ley 18.345, artículo ${LICENCIA_DUELO.articulo}). La ley no incluye abuelos, tíos ni suegros, aunque tu convenio colectivo puede darte más.`,
  },
])

export interface SepelioSource {
  readonly label: string
  readonly url: string
  readonly publisher: string
}

export const SEPELIO_SOURCES: readonly SepelioSource[] = Object.freeze([
  {
    label:
      'Digesto Departamental, art. A.210.1 — costos del Servicio Fúnebre y Necrópolis en UI: sepultura, reducción, cremación, traslados y exoneraciones (Dto. JDM 38.513 del 29/12/2023, vigente)',
    url: 'https://normativa.montevideo.gub.uy/content/a2101',
    publisher: 'Intendencia de Montevideo',
  },
  {
    label:
      'Digesto Departamental, Servicio Fúnebre y Necrópolis — tasa anual de nichos (art. 200), estar al día para cualquier trámite (art. 210.2), exoneraciones de los arts. 210.1.2 y 210.1.3 y arrendamiento de espacios y urnarios (arts. 216 a 221.2)',
    url: 'https://normativa.montevideo.gub.uy/armado/60306',
    publisher: 'Intendencia de Montevideo',
  },
  {
    label:
      'Art. 210.1.3 — exonera los costos del Servicio Fúnebre Departamental a quien cobraba pensión por invalidez o vejez, asistencia a la vejez, TUS o AFAM-PE sin cobertura fúnebre privada (Res. IM 0691/24)',
    url: 'https://normativa.montevideo.gub.uy/articulo/91883',
    publisher: 'Intendencia de Montevideo',
  },
  {
    label:
      'Arts. D.2499 a D.2507 — la cremación: 24 horas desde el fallecimiento, autorización previa, quién puede pedirla y certificado médico',
    url: 'https://normativa.montevideo.gub.uy/articulos/52835',
    publisher: 'Intendencia de Montevideo',
  },
  {
    label:
      'Arts. R.1402 a R.1414 — nichos tubulares del Cementerio del Norte: permanencia de dos años y cremación de oficio de lo que no se retira',
    url: 'https://normativa.montevideo.gub.uy/armado/52814',
    publisher: 'Intendencia de Montevideo',
  },
  {
    label:
      'Servicio velatorio y sepelio — qué comprende, a quién está destinado, requisitos y «No tiene costo» (actualizada el 16/1/2026)',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/servicio-velatorio-y-sepelio',
    publisher: 'Intendencia de Montevideo',
  },
  {
    label:
      'Solicitud en vida de cremación — 1.040 UI, sólo la cremación: el servicio fúnebre lo hace una empresa privada (actualizada el 5/6/2026)',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/solicitud-en-vida-de-cremacion',
    publisher: 'Intendencia de Montevideo',
  },
  {
    label:
      'Renovación de espacios para urnas — 1.420 UI en todos los cementerios, contrato por cinco años',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/arrendamiento-o-renovacion-en-urnarios-pertenecientes-a-la-intendencia',
    publisher: 'Intendencia de Montevideo',
  },
  {
    label:
      'Cementerio del Norte — «el único donde se realizan cremaciones tanto de servicio fúnebre privado como municipal» entre los cementerios municipales',
    url: 'https://municipiod.montevideo.gub.uy/node/689',
    publisher: 'Municipio D, Intendencia de Montevideo',
  },
  {
    label: 'Unidad Indexada, noviembre de 2026 — valor del 22/11/2026: 6,7119',
    url: 'https://www5.ine.gub.uy/documents/Estad%C3%ADsticasecon%C3%B3micas/PDF/UI/2026/UI%20Noviembre%202026.pdf',
    publisher: 'INE',
  },
  {
    label:
      'Tasas, tarifas y precios del segundo semestre de 2026 — tasa de inhumación sobre ficto, arrendamiento de nichos y urnarios, cremaciones (Ordenanza de Necrópolis, Res. 15/06285)',
    url: 'https://www.imcanelones.gub.uy/sites/default/files/2026-07/Tasas_Tarifas_Precios_Julio_2026.pdf',
    publisher: 'Intendencia de Canelones',
  },
  {
    label:
      'Servicio fúnebre gratuito - Canelones — exonera de tributos municipales a quien fallece con escasos recursos, con constancia de precariedad (actualizada el 30/7/2026)',
    url: 'https://www.gub.uy/tramites/servicio-funebre-gratuito-canelones',
    publisher: 'gub.uy',
  },
  {
    label:
      'Cremaciones en cementerios y hornos privados - Canelones — tasa de $ 3.082 por cremación, cobrada por la empresa privada (actualizada el 30/7/2026)',
    url: 'https://www.gub.uy/tramites/cremaciones-cementerios-hornos-privados-canelones',
    publisher: 'gub.uy',
  },
  {
    label:
      'Subsidio por expensas funerarias y gastos complementarios — topes al 1/1/2026 y plazo de 180 días (actualizada el 9/2/2026)',
    url: 'https://www.bps.gub.uy/3494/subsidio-por-expensas-funerarias-y-gastos-complementarios.html',
    publisher: 'BPS',
  },
  {
    label:
      'Trámite del subsidio por expensas funerarias — «Todas las partidas tienen una vigencia de 30 días» (actualizada el 29/12/2025)',
    url: 'https://www.bps.gub.uy/11428/',
    publisher: 'BPS',
  },
  {
    label:
      'Inscripción de defunciones — 10 días hábiles, 20 en zonas rurales, dos declarantes y sin costo (actualizada el 20/2/2026)',
    url: 'https://www.gub.uy/tramites/inscripcion-defunciones',
    publisher: 'gub.uy',
  },
  {
    label:
      'Solicitud de partidas - Defunción — digital sin costo, manuscrita común $ 153 y urgente $ 612 (actualizada el 28/7/2026)',
    url: 'https://www.gub.uy/tramites/solicitud-partidas-defuncion',
    publisher: 'gub.uy',
  },
  {
    label:
      'Certificado de defunción electrónico — el sistema en línea del MSP para médicos y empresas fúnebres',
    url: 'https://www.gub.uy/ministerio-salud-publica/tramites-y-servicios/servicios/nuevo-certificado-de-defuncion-electronico',
    publisher: 'MSP',
  },
  {
    label: 'Ley 18.345, artículo 7 — licencia por duelo de tres días hábiles',
    url: 'https://www.impo.com.uy/bases/leyes/18345-2008/7',
    publisher: 'IMPO',
  },
  {
    label:
      'Reglamento General del Servicio Fúnebre — qué incluye (art. 5), tributos a cargo del afiliado (art. 9) y carencia por edad (art. 12)',
    url: 'https://anda.com.uy/wp-content/uploads/2025/09/Reglamento-General-Servicio-Funebre-2025.pdf',
    publisher: 'ANDA',
  },
  {
    label:
      'Comunicado del 9/6/2026 — cuota del servicio fúnebre de $ 132 desde el 1/7/2026 para afiliados posteriores al 1/6/2015',
    url: 'https://anda.com.uy/novedades/comunicado-de-la-asociacion-nacional-de-afiliados-4/',
    publisher: 'ANDA',
  },
  {
    label:
      'Preguntas frecuentes — «Los costos son variables según el tipo de servicio fúnebre elegido» y «La cremación, no reemplaza el servicio fúnebre»',
    url: 'https://www.martinelli.com.uy/sitio/index.php?sitio=1&mid=html&func=load&value=serviciosFunebres_faqs',
    publisher: 'Martinelli',
  },
  {
    label: 'Servicio fúnebre — convenio de cobertura con Martinelli, sin precio publicado',
    url: 'https://www.smi.com.uy/mvdcms/Afiliados/Servicio-Funebre-uc48',
    publisher: 'SMI',
  },
  {
    label: 'Servicio previsional — cobertura fúnebre con empresas adheridas, sin precio publicado',
    url: 'https://www.hospitalevangelico.com.uy/servicios/complementarios/previsional',
    publisher: 'Hospital Evangélico',
  },
  {
    label: 'Cobertura de servicio fúnebre y cremación — empresas adheridas, sin precio publicado',
    url: 'https://www.semm.com.uy/servicios-adicionales/cobertura-de-servicio-funebre-y-cremacion/',
    publisher: 'SEMM',
  },
])
