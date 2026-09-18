// app/utils/movilidadNormativa.ts
//
// Normativa departamental sobre monopatines/VMP (vehículos de movilidad personal) y bicicletas
// eléctricas, para /monopatines-electricos-uruguay y /bicicletas-electricas-uruguay. Datos puros,
// sin Vue/Nuxt: una fila por departamento, con su fuente y su fecha.
//
// REGLA DEL ARCHIVO: nunca se inventa una regla. Si la norma no dice algo, el campo va `null`; si
// no encontramos norma departamental, `estado` es `sin-norma-encontrada` y `reglas` va toda en
// `null`. No se publica ninguna fecha de entrada en vigencia que la fuente no confirme (San José:
// el decreto está aprobado y promulgado, pero ninguna nota de prensa ni el sitio de la Intendencia
// publican desde cuándo rige). Tampoco se publican veredictos genéricos («es legal»/«es ilegal»,
// «está prohibido usar…»): se describe lo que dice cada norma y, donde no hay norma, que no la hay.
//
// Fuentes leídas y verificadas en vivo el 17/9/2026 (ver `MOVILIDAD_NORMATIVA_REVISADA`). La
// normativa cambia rápido en este tema (Maldonado y Canelones están a estudio; el Congreso de
// Intendentes evalúa una norma común): revisar esta tabla junto con `docs/app/MOVILIDAD.md` cuando
// alguna de las cinco fuentes publique una actualización.

import { sameDepartment } from './departments'

/** Fecha en la que se revisó/contrastó toda la tabla contra las fuentes citadas. */
export const MOVILIDAD_NORMATIVA_REVISADA = '2026-09-17'

/**
 * No hay ley nacional específica sobre monopatines ni bicicletas eléctricas: es una nota de
 * contexto, no una regla, y ningún departamento puede citarse como si tuviera respaldo nacional.
 */
export const MOVILIDAD_NORMATIVA_NOTA_NACIONAL =
  'No existe una ley nacional específica sobre monopatines ni bicicletas eléctricas. El Congreso de Intendentes evalúa una norma común entre departamentos, y UNASEV señaló que la normativa vigente desde 2020 quedó desactualizada frente al crecimiento de estos vehículos.'

/** Estado de la normativa departamental sobre monopatines/VMP y bicicletas eléctricas. */
export type MovilidadNormativaEstado = 'vigente' | 'en-estudio' | 'sin-norma-encontrada'

/** Una fuente citada: título legible, URL y la fecha en que se leyó o se publicó. */
export interface MovilidadNormativaFuente {
  readonly titulo: string
  readonly url: string
  readonly fecha: string
}

/**
 * Reglas puntuales que una norma puede fijar. Cada campo es `null` cuando la norma citada no lo
 * dice — nunca se completa por analogía con otro departamento.
 */
export interface MovilidadNormativaReglas {
  /** Edad mínima para conducir, en años. */
  readonly edadMinima: number | null
  /** Velocidad máxima permitida, en km/h. */
  readonly velocidadMaxKmh: number | null
  /** Exigencia de casco protector. */
  readonly casco: string | null
  /** Exigencia de vestimenta de alta visibilidad o elementos reflectivos. */
  readonly altaVisibilidad: string | null
  /** Seguro exigido (responsabilidad civil contra terceros, por ejemplo). */
  readonly seguro: string | null
  /** Registro o empadronamiento exigido. */
  readonly registro: string | null
  /** Por dónde deben circular. */
  readonly donde: string | null
  /** Por dónde no pueden circular. */
  readonly dondeNo: string | null
}

/** Normativa de un departamento, con su estado, sus reglas (si las hay) y sus fuentes. */
export interface MovilidadNormativaDepartamento {
  readonly departamento: string
  readonly estado: MovilidadNormativaEstado
  /**
   * Matiz del estado, para mostrar PEGADO al badge y no sólo en la nota de abajo: un decreto
   * promulgado cuya fecha de entrada en vigencia no confirma ninguna fuente oficial sigue siendo
   * `vigente` (existe, está promulgado), pero un lector que sólo barre los badges leería "Vigente"
   * como "rige hoy", que es justo lo que el dato no prueba. `undefined` = el badge se basta solo.
   */
  readonly estadoDetalle?: string
  /** Identificación de la norma (decreto y artículos), o `null` si no hay norma que citar. */
  readonly norma: string | null
  readonly reglas: MovilidadNormativaReglas
  /** Vacío sólo quiere decir "no hay una norma que citar", no que falte revisar la fila. */
  readonly fuentes: readonly MovilidadNormativaFuente[]
  readonly nota: string | null
}

/** Resumen de cuántos departamentos están en cada estado, para un titular o un badge. */
export interface MovilidadNormativaResumen {
  readonly total: number
  readonly vigente: number
  readonly enEstudio: number
  readonly sinNormaEncontrada: number
  readonly revisado: string
}

/** Todas las reglas en `null`: la fila de un departamento sin norma departamental. */
const SIN_REGLAS: MovilidadNormativaReglas = Object.freeze({
  edadMinima: null,
  velocidadMaxKmh: null,
  casco: null,
  altaVisibilidad: null,
  seguro: null,
  registro: null,
  donde: null,
  dondeNo: null,
})

/** Nota estándar para un departamento donde no encontramos norma al día de revisión. */
const NOTA_SIN_NORMA =
  'No encontramos una norma departamental específica sobre monopatines o bicicletas eléctricas al 17/9/2026.'

/**
 * Los 19 departamentos, cada uno con su estado normativo verificado en la fuente. El orden es
 * alfabético, igual que en `INE_RENT_BY_DEPARTMENT` (`costOfLiving.ts`) y `RENTAL_ZONE_DEPARTMENTS`
 * (`movingServices.ts` / `rentalZones.ts`): la app ya usa esa lista y esa ortografía en varios
 * lugares — Río Negro, Paysandú, San José y Tacuarembó llevan tilde, que es la grafía que algunas
 * casas de cambio no usan (ver la memoria `department-accent-split`); acá se compara por slug con
 * `sameDepartment`, nunca por igualdad de cadena.
 */
export const MOVILIDAD_NORMATIVA: ReadonlyArray<MovilidadNormativaDepartamento> = Object.freeze([
  Object.freeze({
    departamento: 'Artigas',
    estado: 'sin-norma-encontrada',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([]),
    nota: NOTA_SIN_NORMA,
  }),
  Object.freeze({
    departamento: 'Canelones',
    estado: 'en-estudio',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([
      Object.freeze({
        titulo:
          'Canelones Ciudad — Canelones también analiza regular monopatines y bicicletas eléctricas',
        url: 'https://canelonesciudad.com.uy/canelones-tambien-analiza-regular-monopatines-y-bicicletas-electricas/',
        fecha: '2026-05-04',
      }),
    ]),
    nota: 'La discusión está en la Comisión de Tránsito, Transporte y Obras de la Junta Departamental, donde un edil propuso una regulación mínima (asimilarlos a la bicicleta, sin registro ni seguro obligatorio bajo los 30 km/h). Al 17/9/2026 no hay un decreto aprobado ni un texto único para citar.',
  }),
  Object.freeze({
    departamento: 'Cerro Largo',
    estado: 'sin-norma-encontrada',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([]),
    nota: NOTA_SIN_NORMA,
  }),
  Object.freeze({
    departamento: 'Colonia',
    estado: 'sin-norma-encontrada',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([]),
    nota: NOTA_SIN_NORMA,
  }),
  Object.freeze({
    departamento: 'Durazno',
    estado: 'en-estudio',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([
      Object.freeze({
        titulo:
          'El Acontecer — San José regula monopatines eléctricos; Durazno los sigue estudiando',
        url: 'https://elacontecer.com.uy/politica/san-jose-regula-monopatines-electricos-durazno/',
        fecha: '2026-09-16',
      }),
    ]),
    nota: 'Un técnico municipal evalúa exigencias de visibilidad, edad mínima y calles habilitadas según la potencia del vehículo, pero al 17/9/2026 no hay un proyecto de decreto aprobado ni un texto para citar.',
  }),
  Object.freeze({
    departamento: 'Flores',
    estado: 'sin-norma-encontrada',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([]),
    nota: NOTA_SIN_NORMA,
  }),
  Object.freeze({
    departamento: 'Florida',
    estado: 'sin-norma-encontrada',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([]),
    nota: NOTA_SIN_NORMA,
  }),
  Object.freeze({
    departamento: 'Lavalleja',
    estado: 'sin-norma-encontrada',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([]),
    nota: NOTA_SIN_NORMA,
  }),
  Object.freeze({
    departamento: 'Maldonado',
    estado: 'en-estudio',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([
      Object.freeze({
        titulo:
          'la diaria Maldonado — Junta de Maldonado analiza un proyecto para regular uso y alquiler de monopatines eléctricos',
        url: 'https://ladiaria.com.uy/maldonado/articulo/2026/4/junta-de-maldonado-analiza-un-proyecto-para-regular-uso-y-alquiler-de-monopatines-electricos/',
        fecha: '2026-04-01',
      }),
    ]),
    nota: 'El proyecto, a estudio de la Comisión de Tránsito, propone un máximo de 15 km/h en ciclovías y sendas, medidas de seguridad y sanciones; al 17/9/2026 sigue en comisión, sin pasar a la Junta en pleno.',
  }),
  Object.freeze({
    departamento: 'Montevideo',
    estado: 'vigente',
    norma:
      'Decreto de la Junta Departamental de Montevideo 37.330 (24/12/2019), arts. D.709.4 a D.709.12',
    reglas: Object.freeze({
      edadMinima: 16,
      velocidadMaxKmh: 25,
      casco: 'Obligatorio y abrochado (Decreto 265/09) — art. D.709.5.',
      altaVisibilidad:
        'Vestimenta de alta visibilidad obligatoria (Decreto 81/014) — art. D.709.5.',
      seguro: null,
      registro: 'No se empadronan: sólo se empadronan las categorías L1 a L7 — art. D.709.10.',
      donde:
        'Por la calzada, salvo donde exista infraestructura para bicicletas: ahí es obligatorio usarla — art. D.709.7.',
      dondeNo: null,
    }),
    fuentes: Object.freeze([
      Object.freeze({
        titulo: 'Junta Departamental de Montevideo — Decreto 37.330, texto articulado',
        url: 'https://normativa.montevideo.gub.uy/articulos/90070',
        fecha: '2026-09-17',
      }),
      Object.freeze({
        titulo:
          'Junta Departamental de Montevideo — D.709 (definiciones de vehículos de movilidad personal)',
        url: 'https://normativa.montevideo.gub.uy/content/d7094',
        fecha: '2026-09-17',
      }),
    ]),
    nota: 'Los 25 km/h rigen para monopatines con y sin impulso propio y para plataformas tipo segway; la categoría L6 (con matrícula) puede llegar a 45 km/h, pero monopatines y bicicletas eléctricas no se empadronan (art. D.709.10) y por eso no acceden a esa categoría. El mínimo de 16 años (art. D.709.12) es el que fija el decreto para los vehículos que no se empadronan, que es el caso de monopatines y bicicletas eléctricas.',
  }),
  Object.freeze({
    departamento: 'Paysandú',
    estado: 'sin-norma-encontrada',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([]),
    nota: NOTA_SIN_NORMA,
  }),
  Object.freeze({
    departamento: 'Río Negro',
    estado: 'sin-norma-encontrada',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([]),
    nota: NOTA_SIN_NORMA,
  }),
  Object.freeze({
    departamento: 'Rivera',
    estado: 'sin-norma-encontrada',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([]),
    nota: NOTA_SIN_NORMA,
  }),
  Object.freeze({
    departamento: 'Rocha',
    estado: 'sin-norma-encontrada',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([]),
    nota: NOTA_SIN_NORMA,
  }),
  Object.freeze({
    departamento: 'Salto',
    estado: 'sin-norma-encontrada',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([]),
    nota: NOTA_SIN_NORMA,
  }),
  Object.freeze({
    departamento: 'San José',
    estado: 'vigente',
    estadoDetalle: 'fecha de inicio sin confirmar',
    norma:
      'Decreto de la Junta Departamental de San José Nº 3279 (vehículos de movilidad personal), aprobado por unanimidad en junio de 2026 y promulgado por la Intendencia',
    reglas: Object.freeze({
      edadMinima: 14,
      velocidadMaxKmh: 25,
      casco: 'Obligatorio.',
      altaVisibilidad: 'Elementos reflectivos obligatorios.',
      seguro: 'Seguro de responsabilidad civil contra terceros obligatorio.',
      registro:
        'Registro Departamental de Vehículos de Movilidad Personal, obligatorio y gratuito (exento de patente).',
      donde: null,
      dondeNo:
        'Prohibida la circulación por veredas, espacios peatonales y rutas nacionales del departamento.',
    }),
    fuentes: Object.freeze([
      Object.freeze({
        titulo:
          'El Observador — Un departamento de Uruguay reguló monopatines y otros vehículos eléctricos: casco obligatorio, límite de 25 km/h y seguro contra terceros',
        url: 'https://www.elobservador.com.uy/nacional/un-departamento-uruguay-regulo-monopatines-y-otros-vehiculos-electricos-casco-obligatorio-limite-25-kmh-y-seguro-contra-terceros-n6057437',
        fecha: '2026-09-16',
      }),
      Object.freeze({
        titulo:
          'Primera Hora — Monopatines eléctricos tendrán regulación en San José tras aprobación unánime de la Junta',
        url: 'https://primerahora.com.uy/politica/monopatines-electricos-tendran-regulacion-en-san-jose-tras-aprobacion-unanime-de-la-junta',
        fecha: '2026-06-04',
      }),
    ]),
    nota: 'El decreto también exige luces delanteras y traseras, frenos en ambas ruedas o un sistema equivalente, base de apoyo para los pies y dispositivo sonoro, y admite una sola persona por vehículo. La fecha de entrada en vigencia no está confirmada por ninguna fuente oficial: ninguna de las dos notas de prensa la publica, y el decreto no figura en el listado de decretos de sanjose.gub.uy (que llega hasta 2021).',
  }),
  Object.freeze({
    departamento: 'Soriano',
    estado: 'sin-norma-encontrada',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([]),
    nota: NOTA_SIN_NORMA,
  }),
  Object.freeze({
    departamento: 'Tacuarembó',
    estado: 'sin-norma-encontrada',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([]),
    nota: NOTA_SIN_NORMA,
  }),
  Object.freeze({
    departamento: 'Treinta y Tres',
    estado: 'sin-norma-encontrada',
    norma: null,
    reglas: SIN_REGLAS,
    fuentes: Object.freeze([]),
    nota: NOTA_SIN_NORMA,
  }),
])

/**
 * La fila de normativa de un departamento, o `null` si el nombre no matchea ninguno de los 19
 * (incluye variantes con/sin tilde: "San Jose", "SAN JOSÉ" y "San José" resuelven a la misma fila —
 * comparadas por slug con `sameDepartment`, la misma utilidad que usa el resto de la app para este
 * problema, ver `department-accent-split`).
 */
export function movilidadNormativaDe(departamento: string): MovilidadNormativaDepartamento | null {
  return MOVILIDAD_NORMATIVA.find(fila => sameDepartment(fila.departamento, departamento)) ?? null
}

/** Cuántos de los 19 departamentos están en cada estado, y cuándo se revisó la tabla. */
export function movilidadResumenNormativa(): MovilidadNormativaResumen {
  let vigente = 0
  let enEstudio = 0
  let sinNormaEncontrada = 0
  for (const fila of MOVILIDAD_NORMATIVA) {
    if (fila.estado === 'vigente') vigente++
    else if (fila.estado === 'en-estudio') enEstudio++
    else sinNormaEncontrada++
  }
  return {
    total: MOVILIDAD_NORMATIVA.length,
    vigente,
    enEstudio,
    sinNormaEncontrada,
    revisado: MOVILIDAD_NORMATIVA_REVISADA,
  }
}
