// Research-backed content + the routing matcher for
// `pages/pensiones-estudiantiles-uruguay.vue` — dónde puede vivir en Uruguay
// alguien que estudia y se muda: pensión, residencia estudiantil, hogar de la
// intendencia, beca de alojamiento.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so the matcher can be
// unit-tested in plain Node via vitest (`tests/unit/studentHousing.test.ts`).
//
// SOURCING RULE (igual que `rentClearing.ts` y `rentGuide.ts`): cada afirmación
// sobre una norma o un programa lleva fuente primaria y fecha de verificación.
// Los PRECIOS son un relevamiento fechado, no una tarifa: se guardan con la
// fecha y el origen de la observación, nunca como "el precio de una pensión".
//
// Verificado el 2026-08-19/20 contra:
//   - Digesto Departamental de Montevideo, Vol. XV, Tít. VI, Cap. IV "De los
//     Hogares Estudiantiles" (arts. D.4107.23.1 a D.4107.23.20), incorporado por
//     la Resolución 3408/20 del 21/9/2020 (Decreto Departamental 37.545).
//   - Intendencia de Montevideo, Servicio de Convivencia Departamental
//     (permiso precario y revocable, inspecciones, denuncias).
//   - MIDES/INJU, Ciudad Universitaria: 180 plazas gratuitas, 18 a 24 años,
//     ingreso del hogar hasta 4,15 BPC, cupo femenino del 50 %.
//   - SCIBU (ex SCBU) Udelar, Programa Becas: beca de alojamiento de 2 BPC
//     mensuales de marzo a diciembre.
//   - Intendencia de Canelones (Hogar Estudiantil Canario), Intendencia de Río
//     Negro, Intendencia de Florida, Intendencia de Paysandú, Intendencia de
//     Salto, Ministerio del Interior (beca hogar estudiantil de hasta 5 UR).
//   - Relevamiento propio de avisos publicados en Mercado Libre Uruguay
//     (2026-08-20) y precios citados por residentes en r/uruguay.

export const STUDENT_HOUSING_LAST_REVIEWED = '2026-08-19'

/** Relevamiento de precios: fecha en que se miraron los avisos publicados. */
export const STUDENT_HOUSING_PRICES_SURVEYED = '2026-08-20'

/**
 * BPC 2026 (Base de Prestaciones y Contribuciones). Es un valor legal anual: se
 * usa para expresar en pesos las becas que la norma fija en BPC. Fuente: BPS.
 */
export const STUDENT_HOUSING_BPC = 6864

/**
 * Valor de referencia de la Unidad Reajustable a agosto de 2026. La UR se
 * actualiza todos los meses (INE): esto es una referencia para mostrar el orden
 * de magnitud de los topes fijados en UR, no un valor vigente para siempre.
 * La página tiene el valor vivo en /indicadores/unidad-reajustable.
 */
export const STUDENT_HOUSING_UR_REFERENCE = 1923

// --- Fuentes primarias -----------------------------------------------------

export interface StudentHousingSource {
  label: string
  url: string
  detail: string
}

export const STUDENT_HOUSING_SOURCES: readonly StudentHousingSource[] = Object.freeze([
  {
    label: 'Digesto de Montevideo — De los Hogares Estudiantiles',
    url: 'https://normativa.montevideo.gub.uy/articulos/90090',
    detail:
      'Arts. D.4107.23.1 a D.4107.23.20: definición, mínimos de habitación y baños, habilitación, registro de estudiantes, inspecciones sin aviso y sanciones de 5 a 35 UR o clausura.',
  },
  {
    label: 'Intendencia de Montevideo — Servicio de Convivencia Departamental',
    url: 'https://montevideo.gub.uy/institucional/dependencias/servicio-de-convivencia-departamental',
    detail:
      'Es quien otorga el permiso precario y revocable para operar un hogar estudiantil y quien recibe las denuncias por incumplimientos.',
  },
  {
    label: 'MIDES / INJU — Ciudad Universitaria',
    url: 'https://www.gub.uy/ministerio-desarrollo-social/comunicacion/comunicados/ciudad-universitaria-inju-0',
    detail:
      'Residencia gratuita para 180 jóvenes del interior: 18 a 24 años, educación media superior completa, ingreso del hogar hasta 4,15 BPC, sin residencia en Montevideo los 2 años previos y cupo femenino mínimo del 50 %. Se postula por la intendencia.',
  },
  {
    label: 'SCIBU Udelar — Programa Becas',
    url: 'https://bienestar.udelar.edu.uy/programa-becas/',
    detail:
      'La beca de alojamiento es de 2 BPC mensuales de marzo a diciembre, para quien acredita gasto de alojamiento en una localidad distinta a la de su familia. Convive con las becas de alimentación, transporte y materiales.',
  },
  {
    label: 'Udelar — Convocatoria de becas de Bienestar',
    url: 'https://udelar.edu.uy/convocatoria/becas-de-bienestar-universitario',
    detail:
      'Calendario anual de solicitudes: la ventana de primera vez cae en octubre del año anterior y las de renovación e ingreso caen en febrero y marzo.',
  },
  {
    label: 'Intendencia de Canelones — Hogar Estudiantil Canario',
    url: 'https://www.imcanelones.gub.uy/noticias/apertura-inscripciones-hogar-estudiantil-canario-2026',
    detail:
      'Hogar gratuito en Av. Millán 3552 (Montevideo) para canarios de 18 a 24 años, ingreso familiar de hasta 60 UR, domicilio en zonas rurales con dificultad de transporte y estudio en institución pública. Inscripciones del 1/12 al 31/1.',
  },
  {
    label: 'Intendencia de Río Negro — Becas de alojamiento',
    url: 'https://www.rionegro.gub.uy/gabinete-2025-2030/politicas-sociales/becas-de-alojamiento/',
    detail:
      'Hogares en Montevideo (Río Branco 1540), Young y Fray Bentos. Inscripción del 1/12 al 20/1 y entrevista con equipo técnico.',
  },
  {
    label: 'Ministerio del Interior — Becas Hogar Estudiantil',
    url: 'https://www.gub.uy/ministerio-interior/comunicacion/noticias/inscripciones-becas-hogar-estudiantil-2026',
    detail:
      'Hasta 5 UR mensuales para hijos de policías en actividad, retirados o pensionistas: menores de 21 años, ingreso familiar tope $ 125.400 y una sola beca por núcleo. Inscripción en abril.',
  },
  {
    label: 'Trámites Montevideo — Viabilidad de uso para hoteles, pensiones e inquilinatos',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/viabilidad-de-uso-para-hoteles-pensiones-inquilinatos-y-afines',
    detail:
      'El trámite por el que una casa puede funcionar como pensión: sin viabilidad de uso ni habilitación, el establecimiento es irregular.',
  },
  {
    label: 'Ley 17.250 — Relaciones de consumo',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000',
    detail:
      'El hospedaje es un servicio prestado en el mercado de consumo: quien te aloja por precio es proveedor y responde ante el Área de Defensa del Consumidor.',
  },
])

// --- Mínimos legales de un hogar estudiantil en Montevideo -----------------

export interface StudentHousingRule {
  id: string
  label: string
  rule: string
  article: string
}

/**
 * Los mínimos del Digesto de Montevideo. Se publican tal cual porque su valor
 * informativo es exactamente ese: son MUY bajos, y saberlo cambia lo que uno
 * pregunta antes de firmar. Que un lugar los cumpla no lo vuelve bueno.
 */
export const STUDENT_HOUSING_LEGAL_MINIMUMS: readonly StudentHousingRule[] = Object.freeze([
  {
    id: 'definicion',
    label: 'Qué cuenta como hogar estudiantil',
    rule: 'El establecimiento cuyo destino principal es alojar estudiantes de forma habitual. Si te alojan estudiantes y cobran por eso, la norma aplica aunque el aviso diga "coliving" o "residencia".',
    article: 'D.4107.23.1',
  },
  {
    id: 'tamano',
    label: 'Tamaño mínimo',
    rule: 'Al menos 3 habitaciones y 8 plazas. Por debajo de eso no es un hogar estudiantil a los efectos de la norma.',
    article: 'D.4107.23.2',
  },
  {
    id: 'habitacion',
    label: 'La habitación',
    rule: '7 m² mínimo, lado mínimo de 2 m y 2,5 m² por cada ocupante. El máximo legal es de 12 personas por habitación.',
    article: 'D.4107.23.9',
  },
  {
    id: 'banos',
    label: 'Los baños',
    rule: 'Un baño cada 12 ocupantes, de 3 m² mínimo. Es el número que más sorprende: 3 baños para 18 personas está por encima del mínimo legal.',
    article: 'D.4107.23.9',
  },
  {
    id: 'comunes',
    label: 'Cocina, estudio y lavadero',
    rule: 'Cocina de 4 m² mínimo, sala de estudio de 12 m² hasta 25 ocupantes, lavadero de 3 m² más 10 m² de secado.',
    article: 'D.4107.23.9',
  },
  {
    id: 'habilitacion',
    label: 'La habilitación',
    rule: 'Necesita autorización comercial del Servicio Contralor de la Edificación (o el centro comunal zonal) y un permiso precario y revocable del Servicio de Convivencia Departamental. Para tramitarlo hay que presentar certificado de la Dirección Nacional de Bomberos y certificado notarial de la titularidad.',
    article: 'D.4107.23.5',
  },
  {
    id: 'encargado',
    label: 'Encargado en el lugar',
    rule: 'Tiene que haber una persona encargada en el inmueble, con llaves de acceso para las inspecciones.',
    article: 'D.4107.23.17',
  },
  {
    id: 'registro',
    label: 'Registro de residentes',
    rule: 'El explotador debe llevar un registro actualizado de los estudiantes alojados y exigir constancia de inscripción al ingresar.',
    article: 'D.4107.23.14',
  },
  {
    id: 'inspecciones',
    label: 'Inspecciones',
    rule: 'La Intendencia inspecciona de forma periódica y sin coordinar antes. No hace falta que el dueño te avise ni que esté de acuerdo.',
    article: 'D.4107.23.16',
  },
  {
    id: 'sanciones',
    label: 'Qué arriesga el que incumple',
    rule: 'Multas de 5 a 35 UR, clausura preventiva de 30 días o clausura definitiva, con agravantes por obstruir la inspección o reincidir.',
    article: 'D.4107.23.20',
  },
])

// --- Relevamiento de precios ------------------------------------------------

export type StudentHousingPlaza =
  | 'cama-compartida'
  | 'habitacion-doble'
  | 'habitacion-individual'
  | 'individual-femenina'

export interface StudentHousingPriceBand {
  plaza: StudentHousingPlaza
  label: string
  /** Piso y techo observados, en pesos por mes. */
  min: number
  max: number
  /** Dónde cae la mayoría de lo observado. */
  typical: string
  detail: string
  observedOn: string
  sourceLabel: string
  sourceUrl: string
}

/**
 * Bandas observadas, NO tarifas. Salieron de mirar los avisos publicados en
 * Mercado Libre Uruguay el 2026-08-20 (≈30 avisos de Montevideo, descartando
 * ventas de inmuebles) y de precios citados por residentes en r/uruguay.
 *
 * Advertencia deliberada: las residencias estudiantiles con marca (Campus,
 * El Grinch/El Tatú Verde y similares) NO publican precio — hay que pedirlo. Por
 * eso las bandas de acá describen el mercado publicado, que es el más barato.
 */
export const STUDENT_HOUSING_PRICE_BANDS: readonly StudentHousingPriceBand[] = Object.freeze([
  {
    plaza: 'cama-compartida',
    label: 'Cama en habitación compartida',
    min: 4900,
    max: 7500,
    typical: '$ 5.000 a $ 7.500',
    detail:
      'Una cama en una pieza de 3 o 4. Es el piso real del mercado. Ojo con el aviso que dice "camas individuales": son camas de una plaza en una pieza compartida, no una habitación para vos sola.',
    observedOn: '2026-08-20',
    sourceLabel: 'Avisos publicados en Mercado Libre Uruguay',
    sourceUrl: 'https://listado.mercadolibre.com.uy/inmuebles/pension-estudiantil-montevideo',
  },
  {
    plaza: 'habitacion-doble',
    label: 'Habitación de a dos, en residencia estudiantil',
    min: 8000,
    max: 13500,
    typical: '$ 9.500 a $ 13.000 por persona',
    detail:
      'Lo que cobran las residencias con perfil estudiantil por una pieza de dos. Una residente de Parque Batlle publicó en julio de 2026 la escala de su casa: $ 8.000 a $ 9.000 la pieza de cuatro y $ 11.000 a $ 13.000 la de dos.',
    observedOn: '2026-07-20',
    sourceLabel: 'Relato de una residente en r/uruguay + avisos de Mercado Libre',
    sourceUrl: 'https://reddit.com/r/uruguay/comments/1v1rlgq/',
  },
  {
    plaza: 'habitacion-individual',
    label: 'Habitación individual en pensión',
    min: 8500,
    max: 15500,
    typical: '$ 9.000 a $ 12.000',
    detail:
      'Sí existe individual por menos de $ 10.000, pero casi siempre en pensión común y en Centro, Ciudad Vieja, Cordón, Aguada o Reducto. En el relevamiento aparecieron individuales desde $ 8.500 en Ciudad Vieja y $ 9.000 en Reducto; de $ 10.000 para arriba se multiplican.',
    observedOn: '2026-08-20',
    sourceLabel: 'Avisos publicados en Mercado Libre Uruguay',
    sourceUrl:
      'https://listado.mercadolibre.com.uy/inmuebles/habitacion-individual-pension-montevideo',
  },
  {
    plaza: 'individual-femenina',
    label: 'Habitación individual en casa solo de mujeres',
    min: 12000,
    max: 15500,
    typical: 'desde $ 12.000',
    detail:
      'El aviso que restringe a mujeres y ofrece pieza individual arranca más arriba: el más barato del relevamiento pedía $ 12.000 en Tres Cruces. Lo barato con pieza propia es la pensión mixta, no la casa femenina.',
    observedOn: '2026-08-20',
    sourceLabel: 'Avisos publicados en Mercado Libre Uruguay',
    sourceUrl:
      'https://listado.mercadolibre.com.uy/inmuebles/habitacion-individual-pension-montevideo',
  },
])

export function studentHousingBandFor(plaza: StudentHousingPlaza): StudentHousingPriceBand {
  const band = STUDENT_HOUSING_PRICE_BANDS.find(b => b.plaza === plaza)
  if (!band) throw new Error(`Unknown plaza: ${plaza}`)
  return band
}

// --- Barrios donde efectivamente hay pensiones -----------------------------

export interface StudentHousingArea {
  name: string
  detail: string
}

/**
 * Zonas donde el relevamiento y los relatos coinciden en que hay oferta barata.
 * Es información de calle: buena parte de las pensiones más baratas no publica
 * aviso y se consigue caminando y preguntando donde hay cartel.
 */
export const STUDENT_HOUSING_AREAS: readonly StudentHousingArea[] = Object.freeze([
  {
    name: 'Centro',
    detail:
      'La mayor densidad de avisos: Paraguay, Andes, Río Negro, Soriano, Mercedes, Florida, Barrios Amorín. Individuales desde $ 9.000 y compartidas desde $ 7.500.',
  },
  {
    name: 'Ciudad Vieja',
    detail:
      'Lo más barato con pieza propia que apareció publicado: individuales desde $ 8.500 por Misiones. Mirá bien la cuadra y el horario en que volvés.',
  },
  {
    name: 'Cordón',
    detail:
      'Zona clásica de residencia estudiantil por la cercanía a las facultades. Sobre Paysandú y Av. Uruguay hay varias en pocas cuadras.',
  },
  {
    name: 'Tres Cruces',
    detail:
      'Cómoda por la terminal si viajás seguido al interior. Es donde apareció la individual femenina más barata ($ 12.000).',
  },
  {
    name: 'Parque Rodó y Parque Batlle',
    detail:
      'Residencias con perfil más estudiantil y algo más caras; varias cerca del Hospital de Clínicas y de la Facultad de Ingeniería.',
  },
  {
    name: 'Aguada y Reducto',
    detail:
      'Más barato que Centro a cambio de caminar más. Ahí apareció una individual a $ 9.000 y una compartida a $ 5.500.',
  },
])

// --- Rutas -----------------------------------------------------------------

export type StudentHousingRouteId =
  | 'inju'
  | 'hogar-intendencia'
  | 'beca-alojamiento'
  | 'beca-gremial'
  | 'residencia-estudiantil'
  | 'pension-individual'
  | 'pension-compartida'
  | 'alquiler-compartido'

export type StudentHousingRouteKind = 'gratuita' | 'subsidio' | 'mercado'

export interface StudentHousingRoute {
  id: StudentHousingRouteId
  name: string
  kind: StudentHousingRouteKind
  /** Qué te cuesta a vos, por mes. */
  cost: string
  /** Cuándo se pide. Es el dato que más gente pierde. */
  window: string
  who: string
  requires: readonly string[]
  sourceLabel: string
  sourceUrl: string
}

export const STUDENT_HOUSING_ROUTES: readonly StudentHousingRoute[] = Object.freeze([
  {
    id: 'inju',
    name: 'Ciudad Universitaria (INJU / MIDES)',
    kind: 'gratuita',
    cost: 'Gratis',
    window: 'Se postula entre noviembre y enero, por la intendencia de tu departamento.',
    who: 'Jóvenes del interior que empiezan estudios terciarios o universitarios en Montevideo por primera vez.',
    requires: Object.freeze([
      '18 a 24 años al ingresar',
      'Educación media superior completa',
      'No haber residido en Montevideo los 2 años previos',
      'Ingreso del hogar de hasta 4,15 BPC',
      'Haber postulado a la beca del Fondo de Solidaridad',
    ]),
    sourceLabel: 'MIDES / INJU',
    sourceUrl:
      'https://www.gub.uy/ministerio-desarrollo-social/comunicacion/comunicados/ciudad-universitaria-inju-0',
  },
  {
    id: 'hogar-intendencia',
    name: 'Hogar estudiantil de tu intendencia',
    kind: 'gratuita',
    cost: 'Gratis o una cuota simbólica de gastos comunes',
    window:
      'Casi todas inscriben entre octubre y febrero, para el año siguiente. Es la ventana que más gente se pierde.',
    who: 'Estudiantes del interior, en un hogar que su propia intendencia sostiene en Montevideo o en la capital departamental.',
    requires: Object.freeze([
      'Ser del departamento y estar inscripto en una institución educativa',
      'Tope de ingreso del hogar (Canelones lo fija en 60 UR)',
      'Entrevista con el equipo técnico',
      'Mantener cierto porcentaje de materias aprobadas para renovar',
    ]),
    sourceLabel: 'Intendencia de Canelones (ejemplo del régimen)',
    sourceUrl:
      'https://www.imcanelones.gub.uy/noticias/apertura-inscripciones-hogar-estudiantil-canario-2026',
  },
  {
    id: 'beca-alojamiento',
    name: 'Beca de alojamiento del SCIBU (Udelar)',
    kind: 'subsidio',
    cost: 'Te PAGAN 2 BPC por mes, de marzo a diciembre',
    window:
      'La ventana de primera vez cae en octubre del año anterior; renovación en febrero e ingresantes en marzo.',
    who: 'Estudiantes de la Udelar que tienen que pagar alojamiento en una localidad distinta a la de su familia.',
    requires: Object.freeze([
      'Ser estudiante de la Udelar',
      'Acreditar el gasto de alojamiento fuera de la casa familiar',
      'Formulario, documentación y entrevista con trabajo social',
    ]),
    sourceLabel: 'SCIBU — Programa Becas',
    sourceUrl: 'https://bienestar.udelar.edu.uy/programa-becas/',
  },
  {
    id: 'beca-gremial',
    name: 'Beca de hogar de tu caja o tu gremio',
    kind: 'subsidio',
    cost: 'Hasta 5 UR por mes en el caso del Ministerio del Interior',
    window: 'El Ministerio del Interior inscribe en abril; cada gremio tiene su propio calendario.',
    who: 'Hijos de policías, bancarios, docentes y otros colectivos con hogar o beca propia.',
    requires: Object.freeze([
      'Vínculo con el colectivo (hijo de afiliado, activo o pasivo)',
      'Tope de ingreso familiar y una sola beca por núcleo',
      'No cobrar otra beca de alojamiento pública o privada',
    ]),
    sourceLabel: 'Ministerio del Interior',
    sourceUrl:
      'https://www.gub.uy/ministerio-interior/comunicacion/noticias/inscripciones-becas-hogar-estudiantil-2026',
  },
  {
    id: 'residencia-estudiantil',
    name: 'Residencia estudiantil privada',
    kind: 'mercado',
    cost: '$ 8.000 a $ 13.500 por persona, según cuántos duerman en la pieza',
    window: 'Todo el año, pero se llenan entre diciembre y marzo.',
    who: 'Quien quiere convivir con otros estudiantes, con limpieza de áreas comunes y sala de estudio.',
    requires: Object.freeze([
      'Seña o depósito (no está topeado por ley como en el alquiler)',
      'Constancia de inscripción: la norma obliga al hogar a pedírtela',
    ]),
    sourceLabel: 'Relevamiento de avisos publicados',
    sourceUrl: 'https://listado.mercadolibre.com.uy/inmuebles/pension-estudiantil-montevideo',
  },
  {
    id: 'pension-individual',
    name: 'Pensión común, habitación individual',
    kind: 'mercado',
    cost: '$ 8.500 a $ 15.500, con la mayoría entre $ 9.000 y $ 12.000',
    window: 'Todo el año. Buena parte no publica aviso.',
    who: 'Quien prioriza la puerta propia sobre el ambiente estudiantil. Convivís con gente que trabaja, no solo con estudiantes.',
    requires: Object.freeze([
      'Casi nunca piden garantía: eso es lo que la abarata',
      'Suele pedirse un mes o una seña por adelantado',
    ]),
    sourceLabel: 'Relevamiento de avisos publicados',
    sourceUrl:
      'https://listado.mercadolibre.com.uy/inmuebles/habitacion-individual-pension-montevideo',
  },
  {
    id: 'pension-compartida',
    name: 'Pensión común, cama en habitación compartida',
    kind: 'mercado',
    cost: '$ 4.900 a $ 7.500',
    window: 'Todo el año.',
    who: 'El piso del mercado. Sirve para aterrizar y buscar con calma desde adentro de Montevideo.',
    requires: Object.freeze([
      'Ir a ver el lugar antes de pagar',
      'Contar los baños y probar la presión de agua',
    ]),
    sourceLabel: 'Relevamiento de avisos publicados',
    sourceUrl: 'https://listado.mercadolibre.com.uy/inmuebles/pension-estudiantil-montevideo',
  },
  {
    id: 'alquiler-compartido',
    name: 'Alquilar entre varios',
    kind: 'mercado',
    cost: 'Depende del apartamento, más gastos comunes, UTE, OSE e internet',
    window: 'Todo el año, pero necesitás resolver la garantía antes.',
    who: 'Quien ya tiene con quién y puede armar la garantía. Más privacidad y más responsabilidad.',
    requires: Object.freeze([
      'Garantía (FGA, seguro, depósito o garante) y contrato',
      'Los servicios los pagás vos, aparte del alquiler',
    ]),
    sourceLabel: 'Guía de alquiler del sitio',
    sourceUrl: 'https://cambio-uruguay.com/alquilar-en-uruguay',
  },
])

export function studentHousingRouteById(
  id: StudentHousingRouteId
): StudentHousingRoute | undefined {
  return STUDENT_HOUSING_ROUTES.find(r => r.id === id)
}

// --- El matcher ------------------------------------------------------------

export type StudentHousingRoom = 'individual' | 'compartida' | 'indistinto'
export type StudentHousingGender = 'mujer' | 'varon' | 'indistinto'
export type StudentHousingOrigin = 'montevideo' | 'canelones' | 'interior'
export type StudentHousingStudies = 'udelar' | 'publica-no-udelar' | 'privada' | 'no-estudia'
export type StudentHousingIncome = 'bajo' | 'medio' | 'alto' | 'no-se'
export type StudentHousingWhen = 'ya' | 'proximo-ano'

export interface StudentHousingInput {
  /** Cuánto podés pagar por mes, en pesos. */
  budget: number
  room: StudentHousingRoom
  gender: StudentHousingGender
  origin: StudentHousingOrigin
  age: number
  studies: StudentHousingStudies
  income: StudentHousingIncome
  when: StudentHousingWhen
}

export type StudentHousingFit = 'alta' | 'media' | 'baja' | 'descartada'

export interface RankedStudentHousingRoute {
  route: StudentHousingRoute
  fit: StudentHousingFit
  reason: string
}

export const STUDENT_HOUSING_FIT_LABEL: Record<StudentHousingFit, string> = {
  alta: 'Te sirve',
  media: 'Puede servirte',
  baja: 'Difícil',
  descartada: 'No aplica',
}

const FIT_ORDER: Record<StudentHousingFit, number> = {
  alta: 0,
  media: 1,
  baja: 2,
  descartada: 3,
}

/** Las gratuitas primero cuando empatan en encaje: son plata que no gastás. */
const KIND_ORDER: Record<StudentHousingRouteKind, number> = {
  gratuita: 0,
  subsidio: 1,
  mercado: 2,
}

/**
 * Ordena las rutas de alojamiento para un caso concreto.
 *
 * No promete un cupo: dice dónde tenés chance real, dónde vas a chocar y —lo
 * más importante— si la ventana de inscripción ya cerró, porque casi todas las
 * opciones gratuitas se piden entre octubre y febrero para el año siguiente.
 */
export function matchStudentHousing(input: StudentHousingInput): RankedStudentHousingRoute[] {
  const { budget, room, gender, origin, age, studies, income, when } = input
  const fromInterior = origin === 'interior'
  const wantsIndividual = room === 'individual'
  const lowIncome = income === 'bajo' || income === 'no-se'
  const nextYear = when === 'proximo-ano'

  const individualBand = studentHousingBandFor('habitacion-individual')
  const sharedBand = studentHousingBandFor('cama-compartida')
  const femaleIndividualBand = studentHousingBandFor('individual-femenina')

  const ranked: RankedStudentHousingRoute[] = STUDENT_HOUSING_ROUTES.map(route => {
    switch (route.id) {
      case 'inju': {
        if (!fromInterior)
          return {
            route,
            fit: 'descartada',
            reason:
              origin === 'canelones'
                ? 'Es para quien viene del interior y no vivió en Montevideo los 2 años previos. Canelones tiene su propio hogar, que sí te sirve.'
                : 'Pide no haber residido en Montevideo los 2 años previos: viviendo acá no calificás.',
          }
        if (age < 18 || age > 24)
          return {
            route,
            fit: 'descartada',
            reason: `El rango es de 18 a 24 años al ingresar y tenés ${age}. Mirá el hogar de tu intendencia, que suele ser más flexible.`,
          }
        if (studies === 'no-estudia')
          return {
            route,
            fit: 'descartada',
            reason: 'Es para empezar estudios terciarios o universitarios en Montevideo.',
          }
        if (income === 'alto')
          return {
            route,
            fit: 'descartada',
            reason:
              'El ingreso del hogar no puede pasar de 4,15 BPC. Con ingreso alto la beca se va a quien la necesita más.',
          }
        if (studies === 'privada')
          return {
            route,
            fit: 'baja',
            reason:
              'Pide haber postulado a la beca del Fondo de Solidaridad, que es para Udelar, UTEC y UTU: estudiando en una privada quedás casi siempre afuera.',
          }
        return {
          route,
          fit: nextYear ? 'alta' : 'media',
          reason: nextYear
            ? 'Encajás en el perfil: gratis, 180 plazas y cupo femenino del 50 %. Se postula por tu intendencia entre noviembre y enero, así que preparalo ahora.'
            : 'Encajás en el perfil, pero la postulación de este año ya cerró (fue hasta el 12 de enero). Anotalo para la próxima ventana y resolvé lo de ahora con una pensión.',
        }
      }

      case 'hogar-intendencia': {
        if (origin === 'montevideo')
          return {
            route,
            fit: 'descartada',
            reason:
              'Los hogares los sostiene cada intendencia del interior para su propia gente. Montevideo no tiene uno para montevideanos.',
          }
        if (age < 17 || age > 28)
          return {
            route,
            fit: 'baja',
            reason:
              'La mayoría corta entre los 18 y los 24 o 25 años, aunque algunos (Salto) llegan a 28. Preguntá igual en tu intendencia: los topes cambian de un departamento a otro.',
          }
        if (income === 'alto')
          return {
            route,
            fit: 'baja',
            reason:
              'Casi todos ponen tope de ingreso del hogar (Canelones lo fija en 60 UR) y priorizan por situación socioeconómica.',
          }
        return {
          route,
          fit: nextYear ? 'alta' : 'media',
          reason: nextYear
            ? `Es la ruta más barata que existe y la que menos gente conoce: ${lowIncome ? 'con ingreso bajo entrás en la prioridad. ' : ''}Preguntá YA en Desarrollo Social de tu intendencia por la fecha de inscripción, que cae entre octubre y febrero.`
            : 'Te correspondería, pero la inscripción de este año cerró (casi todas van de octubre a febrero). Llamá igual a tu intendencia: a veces hay lista de espera o alguna plaza que se libera.',
        }
      }

      case 'beca-alojamiento': {
        if (studies !== 'udelar')
          return {
            route,
            fit: 'descartada',
            reason:
              studies === 'no-estudia'
                ? 'Es una beca de la Udelar para sus estudiantes.'
                : 'Es solo para estudiantes de la Udelar. Si tu institución tiene bienestar estudiantil propio, preguntá ahí por el equivalente.',
          }
        if (origin === 'montevideo')
          return {
            route,
            fit: 'baja',
            reason:
              'Hay que acreditar gasto de alojamiento en una localidad distinta a la de tu familia. Viviendo en Montevideo con tu familia acá, no.',
          }
        return {
          route,
          fit: 'alta',
          reason: `Son 2 BPC por mes de marzo a diciembre: hoy ${formatUyu(2 * STUDENT_HOUSING_BPC)}, que alcanza para pagar entera una pieza individual de pensión. Es la ruta con mejor relación entre esfuerzo y plata. La ventana de primera vez es en octubre.`,
        }
      }

      case 'beca-gremial': {
        return {
          route,
          fit: 'media',
          reason:
            'Depende de a qué colectivo pertenece tu familia, no de tu situación: si hay policía, bancario o docente en casa, preguntá. El Ministerio del Interior paga hasta 5 UR por mes (' +
            `${formatUyu(5 * STUDENT_HOUSING_UR_REFERENCE)} aproximados) y se inscribe en abril.`,
        }
      }

      case 'residencia-estudiantil': {
        if (wantsIndividual && budget < femaleIndividualBand.min)
          return {
            route,
            fit: 'baja',
            reason: `Con pieza individual, la residencia estudiantil se te va por arriba de ${formatUyu(femaleIndividualBand.min)}. Con tu presupuesto entrás compartiendo, no sola.`,
          }
        if (budget < sharedBand.max)
          return {
            route,
            fit: 'media',
            reason: `Con ${formatUyu(budget)} entrás en pieza de tres o cuatro. La escala típica es $ 8.000 a $ 9.000 la de cuatro y $ 11.000 a $ 13.000 la de dos.`,
          }
        return {
          route,
          fit: 'alta',
          reason:
            'Te da ambiente estudiantil, limpieza de áreas comunes y sala de estudio. Pedí el precio por mail o teléfono: las residencias con marca no lo publican.',
        }
      }

      case 'pension-individual': {
        if (room === 'compartida')
          return {
            route,
            fit: 'baja',
            reason:
              'Buscás compartida, así que esto es más caro de lo que necesitás. Queda como plan B si la convivencia no funciona.',
          }
        const femaleOnlyPremium = gender === 'mujer' && budget < femaleIndividualBand.min
        if (budget < individualBand.min)
          return {
            route,
            fit: 'baja',
            reason: `El piso observado de una pieza propia es ${formatUyu(individualBand.min)} y estás ${formatUyu(individualBand.min - budget)} por debajo. Se consigue caminando Centro y Ciudad Vieja y preguntando donde hay cartel: buena parte de esa oferta no publica aviso.`,
          }
        if (budget < 10000)
          return {
            route,
            fit: 'media',
            reason: femaleOnlyPremium
              ? `Con ${formatUyu(budget)} hay individuales, pero en pensión MIXTA (aparecieron desde ${formatUyu(individualBand.min)} en Ciudad Vieja y $ 9.000 en Reducto). La casa que restringe a mujeres y da pieza propia arranca en ${formatUyu(femaleIndividualBand.min)}: si la pieza propia es lo que no negociás, mixta es la única que entra en tu presupuesto.`
              : `Con ${formatUyu(budget)} entrás, pero es la franja angosta: aparecieron individuales desde ${formatUyu(individualBand.min)} en Ciudad Vieja y $ 9.000 en Reducto. Andá a verlas y contá los baños.`,
          }
        return {
          route,
          fit: 'alta',
          reason: `Con ${formatUyu(budget)} tenés varias opciones con pieza propia, sobre todo en Centro, Cordón y Tres Cruces. Y no te van a pedir garantía.`,
        }
      }

      case 'pension-compartida': {
        if (wantsIndividual)
          return {
            route,
            fit: budget < individualBand.min ? 'media' : 'baja',
            reason:
              budget < individualBand.min
                ? 'No es lo que buscás, pero con tu presupuesto es lo que entra seguro. Sirve para aterrizar un mes y seguir buscando desde adentro.'
                : 'Podés pagar algo mejor que esto: apuntá a la pieza individual.',
          }
        if (budget < sharedBand.min)
          return {
            route,
            fit: 'baja',
            reason: `Ni la cama más barata que apareció bajó de ${formatUyu(sharedBand.min)}. Con menos que eso la vía realista es un hogar estudiantil o una beca, no el mercado.`,
          }
        return {
          route,
          fit: 'alta',
          reason: `Con ${formatUyu(budget)} entrás cómoda. Es el piso del mercado y sirve para instalarte mientras buscás algo mejor con tiempo.`,
        }
      }

      case 'alquiler-compartido': {
        if (age < 18)
          return {
            route,
            fit: 'descartada',
            reason: 'Para firmar un contrato de alquiler hay que ser mayor de edad.',
          }
        if (budget < 10000)
          return {
            route,
            fit: 'baja',
            reason:
              'Entre dos, la cuenta cierra recién arriba de los $ 20.000 de alquiler, y arriba de eso van gastos comunes, UTE, OSE e internet. Además hay que resolver la garantía.',
          }
        return {
          route,
          fit: 'media',
          reason:
            'Si conseguís con quién, ganás privacidad y cocina propia. El costo escondido es la garantía y que los servicios los pagás aparte.',
        }
      }

      default:
        throw new Error(`Unhandled route: ${(route as StudentHousingRoute).id}`)
    }
  })

  return ranked.sort((a, b) => {
    const byFit = FIT_ORDER[a.fit] - FIT_ORDER[b.fit]
    if (byFit !== 0) return byFit
    return KIND_ORDER[a.route.kind] - KIND_ORDER[b.route.kind]
  })
}

/**
 * El veredicto corto: con esta plata y este requisito, qué conseguís de verdad.
 * Es la respuesta a la pregunta que la gente hace de verdad ("¿con 8 palos qué
 * consigo?"), separada del ranking de rutas.
 */
export interface StudentHousingVerdict {
  headline: string
  detail: string
  /** true cuando el presupuesto no alcanza para lo que pidió. */
  short: boolean
}

export function studentHousingVerdict(
  budget: number,
  room: StudentHousingRoom,
  gender: StudentHousingGender = 'indistinto'
): StudentHousingVerdict {
  const individual = studentHousingBandFor('habitacion-individual')
  const shared = studentHousingBandFor('cama-compartida')
  const femaleIndividual = studentHousingBandFor('individual-femenina')

  if (budget < shared.min)
    return {
      short: true,
      headline: `Con ${formatUyu(budget)} no entrás ni a la cama más barata`,
      detail: `Lo más barato del relevamiento fue ${formatUyu(shared.min)} por una cama en pieza compartida. Con menos que eso la vía real no es el mercado: es el hogar estudiantil de tu intendencia o una beca de alojamiento.`,
    }

  if (room === 'individual') {
    if (budget < individual.min)
      return {
        short: true,
        headline: `Individual por ${formatUyu(budget)} no aparece publicado`,
        detail: `El piso observado de una pieza propia fue ${formatUyu(individual.min)}. Con tu presupuesto entra una cama en pieza compartida (${shared.typical}); la individual a ese precio existe, pero se consigue caminando Centro y Ciudad Vieja y preguntando donde hay cartel de "pensión" o "pieza libre".`,
      }
    if (gender === 'mujer' && budget < femaleIndividual.min)
      return {
        short: false,
        headline: `Individual sí, pero en pensión mixta`,
        detail: `Con ${formatUyu(budget)} hay pieza propia desde ${formatUyu(individual.min)} en Ciudad Vieja y $ 9.000 en Reducto. Lo que no entra es la casa SOLO de mujeres con pieza individual: la más barata del relevamiento pedía ${formatUyu(femaleIndividual.min)}. Si la pieza propia es lo que no negociás, la mixta es la que te entra.`,
      }
    return {
      short: false,
      headline: `Con ${formatUyu(budget)} conseguís pieza propia`,
      detail: `Estás por encima del piso observado (${formatUyu(individual.min)}) y dentro de la franja donde se concentra la oferta (${individual.typical}). Zonas con más avisos: Centro, Cordón, Ciudad Vieja y Tres Cruces.`,
    }
  }

  if (budget < shared.max)
    return {
      short: false,
      headline: `Con ${formatUyu(budget)} entrás en pieza compartida`,
      detail: `La banda observada fue ${shared.typical} por una cama en pieza de tres o cuatro. Cuidado con el aviso que promete "camas individuales": es una cama de una plaza en una pieza compartida.`,
    }

  return {
    short: false,
    headline: `Con ${formatUyu(budget)} tenés margen para elegir`,
    detail: `Alcanza para compartida cómoda o para dar el salto a pieza propia, cuyo piso observado fue ${formatUyu(individual.min)}. Con ese margen, priorizá cuántos baños hay y a cuántas cuadras te queda la facultad.`,
  }
}

function formatUyu(value: number): string {
  return `$ ${Math.round(value).toLocaleString('es-UY')}`
}

// --- Qué mirar antes de pagar ----------------------------------------------

export interface StudentHousingCheck {
  id: string
  question: string
  why: string
}

/**
 * Checklist de visita. Sale de dos lados: los mínimos del Digesto y lo que
 * cuentan quienes vivieron en residencias (baños, agua caliente, reglas sobre
 * electrodomésticos, cámaras y depósito no devuelto).
 */
export const STUDENT_HOUSING_VISIT_CHECKLIST: readonly StudentHousingCheck[] = Object.freeze([
  {
    id: 'banos',
    question: '¿Cuántos baños hay y cuántas personas viven?',
    why: 'La norma exige apenas uno cada 12. Tres baños para 18 personas está por encima del mínimo legal y aun así es una fila todas las mañanas. Preguntá el número exacto de residentes, no el de plazas.',
  },
  {
    id: 'agua',
    question: '¿Puedo abrir una ducha ahora?',
    why: 'La presión y el agua caliente son la queja número uno. Si te dicen que no se puede probar, ya sabés.',
  },
  {
    id: 'reglas',
    question: '¿Qué electrodomésticos puedo usar en la pieza?',
    why: 'Muchas casas prohíben estufa, secador, plancha y calentador para bajar la factura. En invierno eso decide si vas a poder vivir ahí.',
  },
  {
    id: 'aire',
    question: '¿El aire o la calefacción funcionan y se pueden usar cuándo?',
    why: 'Que figure en el aviso no significa que esté permitido usarlo. Preguntá por horarios y por quién decide.',
  },
  {
    id: 'camaras',
    question: '¿Dónde hay cámaras y graban sonido?',
    why: 'En áreas comunes es habitual. Grabar audio de las conversaciones de quienes viven ahí es otra cosa: pedí que te digan por escrito qué se graba y quién lo mira.',
  },
  {
    id: 'deposito',
    question: '¿Cuánto es el depósito y en qué casos no me lo devuelven?',
    why: 'Acá no rige el tope del alquiler. Que quede por escrito: es el conflicto más frecuente al irse, sobre todo si te vas antes de tiempo.',
  },
  {
    id: 'plazo',
    question: '¿Cuánto dura el compromiso y con cuánto aviso me puedo ir?',
    why: 'Los "contratos" de seis meses son comunes y el preaviso rara vez está escrito. Si no lo aclaran, asumí que el depósito está en juego.',
  },
  {
    id: 'habilitacion',
    question: '¿Está habilitado por la Intendencia?',
    why: 'Un hogar estudiantil necesita autorización comercial y permiso del Servicio de Convivencia Departamental. Preguntarlo también sirve para medir la reacción.',
  },
  {
    id: 'residentes',
    question: '¿Puedo hablar con alguien que ya vive acá, sin el dueño delante?',
    why: 'Es la única forma de saber cómo se resuelven los problemas. Si eso incomoda, es información.',
  },
  {
    id: 'quien-vive',
    question: '¿Quiénes viven acá: estudian o trabajan?',
    why: 'No es mejor ni peor, pero cambia todo: horarios, ruido y con quién compartís cocina. La pensión común y la residencia estudiantil son dos mundos distintos.',
  },
])

// --- Lo que la pensión NO es ------------------------------------------------

export interface StudentHousingContrast {
  topic: string
  pension: string
  alquiler: string
}

/**
 * La diferencia que explica el precio: una pensión es hospedaje, no
 * arrendamiento. Por eso no te piden garantía, y por eso no tenés los plazos de
 * desalojo de la ley de arrendamientos.
 */
export const STUDENT_HOUSING_VS_RENT: readonly StudentHousingContrast[] = Object.freeze([
  {
    topic: 'Garantía',
    pension: 'Normalmente no piden. Como mucho, una seña o un mes por adelantado.',
    alquiler: 'Casi siempre exigen garantía: seguro, FGA, garante propietario o depósito.',
  },
  {
    topic: 'Contrato',
    pension: 'Suele ser un acuerdo simple o de palabra, a veces por 6 meses.',
    alquiler: 'Contrato escrito, con plazo y reajuste.',
  },
  {
    topic: 'Si dejás de pagar',
    pension: 'Te piden que te vayas. No tenés los plazos de la ley de arrendamientos.',
    alquiler: 'Hay un procedimiento de desalojo con plazos legales.',
  },
  {
    topic: 'Servicios',
    pension: 'Casi siempre incluidos en el precio (luz, agua, wifi).',
    alquiler: 'Los pagás aparte, además de los gastos comunes.',
  },
  {
    topic: 'A quién reclamás',
    pension:
      'Es una relación de consumo: el Área de Defensa del Consumidor toma el reclamo, y la Intendencia las condiciones del inmueble.',
    alquiler: 'Defensa del Consumidor no interviene en el arrendamiento entre particulares.',
  },
])

// --- Dónde reclamar ---------------------------------------------------------

export interface StudentHousingComplaintChannel {
  label: string
  detail: string
  contact: string
  url: string
}

export const STUDENT_HOUSING_COMPLAINTS: readonly StudentHousingComplaintChannel[] = Object.freeze([
  {
    label: 'Intendencia de Montevideo — Convivencia Departamental',
    detail:
      'Para las condiciones del establecimiento: hacinamiento, baños, higiene, funcionamiento sin habilitación. Inspecciona sin avisar y puede multar de 5 a 35 UR o clausurar.',
    contact: 'denuncias.convivencia@imm.gub.uy · 1950 5000',
    url: 'https://montevideo.gub.uy/institucional/dependencias/servicio-de-convivencia-departamental',
  },
  {
    label: 'Área de Defensa del Consumidor (MEF)',
    detail:
      'Para el cobro: un depósito que no te devuelven, un cargo que nunca acordaste, un servicio que prometieron y no está. El hospedaje es un servicio del mercado de consumo.',
    contact: 'Por gub.uy, gratis',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/politicas-y-gestion/defensa-del-consumidor',
  },
  {
    label: 'Bienestar Universitario (Udelar) — Programa Alojamientos',
    detail:
      'Trabaja específicamente sobre las condiciones de alojamiento estudiantil y participó en la redacción de la norma de 2020. Si estudiás en la Udelar, es el lugar donde te orientan.',
    contact: 'becas@bienestar.udelar.edu.uy · 2408 5865',
    url: 'https://bienestar.udelar.edu.uy/programa-alojamientos/',
  },
])

// --- Hogares estudiantiles por departamento --------------------------------

export interface StudentHogar {
  department: string
  /** Dónde están las plazas que ofrece esa intendencia. */
  where: string
  detail: string
  window: string
  url: string
  /** true si pudimos verificar el programa contra una fuente oficial. */
  verified: boolean
}

/**
 * Directorio de los hogares y becas de alojamiento que sostienen las
 * intendencias. Sólo se listan como verificados los que pudimos leer en una
 * fuente oficial el 2026-08-19: el resto queda como "consultá en tu intendencia"
 * porque inventar una dirección o una fecha acá le hace perder un año a alguien.
 */
export const STUDENT_HOGARES: readonly StudentHogar[] = Object.freeze([
  {
    department: 'Canelones',
    where: 'Montevideo (Av. Millán 3552)',
    detail:
      'Hogar Estudiantil Canario, gratuito. 18 a 24 años, ingreso familiar de hasta 60 UR, domicilio en zona rural con dificultad de transporte y estudio en institución pública. Estadía de dos años, con 20 horas de voluntariado y 50 % de materias aprobadas para renovar.',
    window: '1 de diciembre al 31 de enero',
    url: 'https://www.imcanelones.gub.uy/noticias/apertura-inscripciones-hogar-estudiantil-canario-2026',
    verified: true,
  },
  {
    department: 'Río Negro',
    where: 'Montevideo (Río Branco 1540), Young y Fray Bentos',
    detail:
      'Becas de alojamiento con entrevista de psicología y trabajo social. La constancia de inscripción se recibe sólo la primera semana de febrero.',
    window: '1 de diciembre al 20 de enero',
    url: 'https://www.rionegro.gub.uy/gabinete-2025-2030/politicas-sociales/becas-de-alojamiento/',
    verified: true,
  },
  {
    department: 'Paysandú',
    where: 'Paysandú, Salto y Montevideo',
    detail:
      'Beca de alojamiento en los hogares que gestiona la intendencia. La inscripción es por formulario web y entrega de documentación en la Secretaría de Familia.',
    window: '13 de octubre al 12 de diciembre',
    url: 'https://www.gub.uy/tramites/solicitud-beca-alojamiento-hogares-estudiantiles-intendencia-paysandu',
    verified: true,
  },
  {
    department: 'Florida',
    where: 'Florida y Montevideo',
    detail:
      'Dos hogares: uno en Florida para 15 a 23 años y otro en Montevideo para 18 a 25. El de Montevideo cobra una cuota mensual de gastos comunes y mantenimiento.',
    window: 'Se consulta en Desarrollo Social entre diciembre y febrero',
    url: 'https://www.gub.uy/tramites/becas-estudiantiles-apoyo-economico-alojamiento-florida',
    verified: true,
  },
  {
    department: 'Salto',
    where: 'Salto (Artigas y Piedras)',
    detail:
      'Hogar Estudiantil Universitario para estudiantes de 18 a 28 años del norte del río Negro que cursan UTU, terciario o universitario en Salto.',
    window: 'Se consulta en Desarrollo Social de la intendencia',
    url: 'https://www.salto.gub.uy/desarrollo-social/hogar-estudiantil-universitario',
    verified: true,
  },
  {
    department: 'Rivera',
    where: 'Rivera (José Pedro Varela 782) y Montevideo',
    detail:
      'Becas para los hogares estudiantiles departamentales. Los formularios se retiran en papel en el hogar de Rivera.',
    window: 'Cierra a mediados de diciembre',
    url: 'https://www.rivera.gub.uy/social/hogares-estudiantiles/',
    verified: true,
  },
  {
    department: 'San José',
    where: 'San José de Mayo y Montevideo',
    detail:
      'Alojamiento en Montevideo para quienes cursan en instituciones públicas de la capital, con una cuota mensual ajustada por IPC.',
    window: 'Se consulta en la intendencia; la convocatoria suele abrir en noviembre',
    url: 'https://sanjose.gub.uy/2024-becashogar/',
    verified: true,
  },
  {
    department: 'Treinta y Tres',
    where: 'Montevideo y Treinta y Tres (Villa Estudiantil)',
    detail:
      'Hogar estudiantil en Montevideo para quienes siguen carreras que no están en el departamento, y villa estudiantil en la capital departamental.',
    window: 'Inscripciones hacia fin de año, para el año siguiente',
    url: 'https://treintaytres.gub.uy/',
    verified: true,
  },
  {
    department: 'Lavalleja',
    where: 'Minas y Montevideo',
    detail:
      'Hogares estudiantiles gestionados por la intendencia, con trámite publicado en gub.uy.',
    window: 'Se consulta en la intendencia',
    url: 'https://www.gub.uy/intendencia-lavalleja/tramites-y-servicios/servicios/hogares-estudiantiles',
    verified: true,
  },
  {
    department: 'Artigas',
    where: 'Artigas y Montevideo',
    detail: 'Becas de hogar estudiantil. Contacto: ds.hogares.artigas@gmail.com · 1884 int. 4120.',
    window: 'La postulación suele abrir en octubre',
    url: 'https://www.gub.uy/tramites/solicitud-beca-alojamiento-hogares-estudiantiles',
    verified: true,
  },
  {
    department: 'Cerro Largo',
    where: 'Montevideo y Melo',
    detail:
      'Hogar estudiantil en Montevideo y otro en Melo, con lista de beneficiarios publicada por el gobierno departamental.',
    window: 'Se consulta en la intendencia, hacia fin de año',
    url: 'https://www.cerrolargo.gub.uy/',
    verified: false,
  },
  {
    department: 'Soriano',
    where: 'Mercedes (Ciudad Universitaria) y Montevideo',
    detail: 'Becas estudiantiles y Ciudad Universitaria en Mercedes.',
    window: 'Se consulta en la intendencia',
    url: 'https://www.soriano.gub.uy/',
    verified: false,
  },
  {
    department: 'Tacuarembó',
    where: 'Tacuarembó y Montevideo',
    detail:
      'Dos hogares: uno en la ciudad de Tacuarembó y otro en Montevideo, para carreras que no existen en el departamento.',
    window: 'Se consulta en la intendencia',
    url: 'https://www.tacuarembo.gub.uy/',
    verified: false,
  },
  {
    department: 'Colonia',
    where: 'Residencias estudiantiles con beca de la intendencia',
    detail: 'Becas de alojamiento en residencias estudiantiles.',
    window: 'Se consulta en la intendencia',
    url: 'https://www.colonia.gub.uy/',
    verified: false,
  },
  {
    department: 'Durazno',
    where: 'Durazno y Montevideo',
    detail: 'Becas de alojamiento gestionadas por la Oficina Técnica de la intendencia.',
    window: 'Se consulta en la intendencia',
    url: 'https://www.durazno.gub.uy/',
    verified: false,
  },
  {
    department: 'Flores',
    where: 'Trinidad y Montevideo',
    detail: 'Hogar estudiantil en Trinidad. Contacto: hogarestudiantiltrinidad@flores.gub.uy.',
    window: 'Se consulta en la intendencia',
    url: 'https://www.flores.gub.uy/',
    verified: false,
  },
  {
    department: 'Maldonado',
    where: 'Maldonado y Montevideo',
    detail: 'Becas de apoyo y alojamiento para estudiantes del departamento.',
    window: 'Se consulta en la intendencia',
    url: 'https://www.maldonado.gub.uy/',
    verified: false,
  },
  {
    department: 'Rocha',
    where: 'Rocha y Montevideo',
    detail: 'Becas de alojamiento para estudiantes del departamento.',
    window: 'Se consulta en la intendencia',
    url: 'https://www.rocha.gub.uy/',
    verified: false,
  },
])

// --- Preguntas frecuentes ---------------------------------------------------

export interface StudentHousingFaq {
  q: string
  a: string
}

export const STUDENT_HOUSING_FAQS: readonly StudentHousingFaq[] = Object.freeze([
  {
    q: '¿Cuánto sale una pensión estudiantil en Montevideo?',
    a: 'En el relevamiento de avisos publicados de agosto de 2026, una cama en habitación compartida iba de $ 4.900 a $ 7.500 y una habitación individual de $ 8.500 a $ 15.500, concentrada entre $ 9.000 y $ 12.000. Las residencias estudiantiles con marca no publican precio: hay que pedirlo por teléfono o mail.',
  },
  {
    q: '¿Consigo habitación individual con 8.000 pesos?',
    a: 'Es el límite. El piso observado de una pieza propia fue $ 8.500 en Ciudad Vieja y $ 9.000 en Reducto, en pensión común y no en residencia estudiantil. Por debajo de eso lo que entra es una cama en pieza compartida. Buena parte de la oferta más barata no publica aviso: se consigue caminando Centro, Ciudad Vieja y Cordón y preguntando donde hay cartel de "pensión" o "pieza libre".',
  },
  {
    q: '¿"Camas individuales" es lo mismo que habitación individual?',
    a: 'No, y es la confusión más cara. "Camas individuales" quiere decir camas de una plaza dentro de una habitación compartida. Si querés puerta propia, preguntá textual: "¿la habitación es para mí sola?".',
  },
  {
    q: '¿Piden garantía en una pensión?',
    a: 'Normalmente no, y eso es justamente lo que la abarata frente al alquiler. Suelen pedir una seña o un mes por adelantado. La contracara es que tampoco tenés las protecciones de la ley de arrendamientos: si dejás de pagar, te piden que te vayas sin los plazos del desalojo.',
  },
  {
    q: '¿Hay alojamiento estudiantil gratis en Uruguay?',
    a: 'Sí, dos vías. Ciudad Universitaria del INJU aloja gratis a 180 jóvenes del interior de 18 a 24 años con ingreso del hogar de hasta 4,15 BPC y cupo femenino del 50 %, y casi todas las intendencias del interior sostienen un hogar estudiantil propio, en Montevideo o en la capital departamental. En ambos casos se postula entre octubre y febrero para el año siguiente.',
  },
  {
    q: '¿La Udelar te ayuda a pagar la pensión?',
    a: 'Sí: la beca de alojamiento del SCIBU son 2 BPC por mes de marzo a diciembre —hoy $ 13.728— para quien acredita gasto de alojamiento en una localidad distinta a la de su familia. Alcanza para pagar entera una habitación individual de pensión. La ventana de primera vez cae en octubre del año anterior.',
  },
  {
    q: '¿Cuántos baños tiene que tener por ley una residencia estudiantil?',
    a: 'En Montevideo, uno cada 12 ocupantes (art. D.4107.23.9 del Digesto). También exige 7 m² mínimos por habitación, 2,5 m² por ocupante, un máximo de 12 personas por habitación y sala de estudio de 12 m² hasta 25 ocupantes. Son mínimos muy bajos: que se cumplan no significa que se viva bien, por eso conviene contar los baños y las personas antes de firmar.',
  },
  {
    q: '¿Dónde denuncio una residencia estudiantil que está mal?',
    a: 'Por las condiciones del inmueble, al Servicio de Convivencia Departamental de la Intendencia de Montevideo (denuncias.convivencia@imm.gub.uy o 1950 5000): inspecciona sin avisar y puede multar de 5 a 35 UR o clausurar. Por la plata —un depósito que no devuelven, un cargo no acordado—, al Área de Defensa del Consumidor, porque el hospedaje es una relación de consumo.',
  },
  {
    q: '¿Conviene una pensión o una residencia estudiantil?',
    a: 'La pensión común es más barata y consigue habitación individual antes, pero convivís con gente que trabaja y con horarios distintos. La residencia estudiantil cuesta más y te da ambiente de estudio, limpieza de áreas comunes y gente en tu misma etapa. Quien vivió en las dos suele recomendar ver el lugar en persona y hablar con un residente sin el dueño delante.',
  },
  {
    q: '¿Puedo pedir la beca de alojamiento y la del Fondo de Solidaridad a la vez?',
    a: 'Cuidado con eso: el Fondo de Solidaridad es una beca de apoyo económico general y no se combina con cualquier otra beca económica, mientras que la de alojamiento del SCIBU cubre específicamente el gasto de vivienda. Antes de renunciar a una, preguntá en Bienestar Universitario cuál te conviene en tu caso, porque las condiciones cambian según la combinación.',
  },
])
