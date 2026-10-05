// Llevar el auto propio a Brasil, Argentina o Paraguay: qué papeles pide la norma.
//
// El sitio ya contestaba cada costo de andar en auto —la nafta, la patente, las multas, los
// peajes, el boleto— y cada parte de cruzar la frontera con plata encima —la franquicia del
// viajero, declarar efectivo, llevar dólares o reales—, pero nada sobre el auto cruzando esa
// misma frontera. La pregunta que llega antes de cada feriado largo ("¿me alcanza el SOA?",
// "¿qué es la carta verde?", "¿puede manejar mi pareja?") no la contestaba ninguna página.
//
// TRES REGLAS DE ESTE ARCHIVO, porque es un catálogo de normas y no de precios:
//
//  1. CADA FILA CITA SU FUENTE POR ID. `sourcesMissingFromCatalog()` y
//     `rowsWithUnknownSource()` son los dos sentidos de la misma verificación, y el test los
//     corre: una fila que cita un id inexistente es una afirmación legal sin respaldo, que es
//     exactamente lo que este sitio no publica.
//  2. NINGÚN PRECIO. La carta verde la venden aseguradoras privadas y su prima cambia por
//     compañía, vehículo y plazo; no hay un arancel oficial que se pueda citar, así que acá no
//     hay ninguno. Lo único con cifra es el tope del SOA, que lo fija la ley en UI
//     ({@link SOA_COVERAGE_UI}) y la página convierte a pesos con la UI del día.
//  3. LO QUE DICEN DOS FUENTES OFICIALES DISTINTO SE PUBLICA COMO DISCREPANCIA, no se resuelve
//     eligiendo una. Ver {@link CAR_ABROAD_STAY_DISCREPANCY}.

/** El día en que se leyó cada fuente de este archivo, una por una. */
export const CAR_ABROAD_VERIFIED_AT = '2026-10-05'

/**
 * El tope del seguro obligatorio uruguayo, en unidades indexadas.
 *
 * Ley 18.412, art. 8: arranca en 150.000 UI el primer año de vigencia, 200.000 UI el segundo y
 * 250.000 UI "a partir del tercer año". La ley se publicó en 2008, así que el escalón vigente es
 * el tercero. Va en UI y no en pesos a propósito: la ley lo escribió en UI justamente para que no
 * envejezca, y copiarlo en pesos sería congelar hoy una cifra que se mueve todos los días.
 */
export const SOA_COVERAGE_UI = 250_000

export interface CarAbroadSource {
  id: string
  label: string
  /** Nombre corto, el que se imprime al lado de cada fila. */
  short: string
  url: string
  /** Fecha que la propia fuente se pone, ISO. `null` cuando no publica ninguna. */
  dated: string | null
}

/**
 * Las cinco fuentes, todas oficiales uruguayas.
 *
 * No hay ninguna de Brasil ni de Argentina, y eso es deliberado: la norma de la carta verde es
 * común a los Estados Parte (Resolución GMC 120/94, que Uruguay puso en vigencia por el Decreto
 * 8/997), pero el control y las sanciones las aplica cada país con su propia ley. Afirmar acá
 * qué multa te pone la policía de Rio Grande do Sul exigiría una fuente brasileña que no se leyó.
 */
export const CAR_ABROAD_SOURCES: readonly CarAbroadSource[] = Object.freeze([
  {
    id: 'decreto-8-997',
    short: 'Decreto 8/997',
    label: 'Decreto 8/997 — MERCOSUR. Seguro de responsabilidad civil por accidentes de tránsito',
    url: 'https://www.impo.com.uy/bases/decretos/8-1997',
    dated: '1997-01-20',
  },
  {
    id: 'ley-18412',
    short: 'Ley 18.412',
    label: 'Ley 18.412 — Seguro Obligatorio de Automotores (SOA)',
    url: 'https://www.impo.com.uy/bases/leyes/18412-2008',
    dated: '2008-11-24',
  },
  {
    id: 'protocolo-dav-133',
    short: 'Protocolo DAV 133/2024',
    label:
      'Protocolo del tráfico vehicular en jurisdicción departamental y/o nacional (Circular DAV 133/2024, Cancillería)',
    url: 'https://www.gub.uy/ministerio-relaciones-exteriores/sites/ministerio-relaciones-exteriores/files/documentos/noticias/Dav%20133-2024.%20Protocolo%20trafico%20vehicular%20MERCOSUR%20(1).pdf',
    dated: '2024-01-01',
  },
  {
    id: 'tramite-dna',
    short: 'Trámite de la DNA',
    label: 'Introducción de vehículos de turistas del MERCOSUR (Dirección Nacional de Aduanas)',
    url: 'https://www.gub.uy/tramites/introduccion-vehiculos-turistas-mercosur',
    dated: null,
  },
  {
    id: 'aduanas-regimen',
    short: 'Aduanas',
    label: 'Aduanas — ¿Cuál es el régimen para vehículos del MERCOSUR?',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/2443/8/innova.front/cual-es-el-regimen-para-vehiculos-del-mercosur.html',
    dated: '2011-01-19',
  },
])

export interface CarAbroadRow {
  id: string
  /** Lo que hay que llevar o la regla, en una línea. */
  label: string
  /** Por qué, o el borde que no se ve. */
  detail: string
  /** Id de {@link CAR_ABROAD_SOURCES}. */
  sourceId: string
}

/**
 * Los seis documentos del protocolo, en su orden.
 *
 * El protocolo los lista para "circular en un Estado Parte diferente al del registro o matrícula
 * del vehículo", o sea que es la misma lista en los dos sentidos: lo que Uruguay le pide a un
 * auto argentino es lo que Argentina le pide al tuyo.
 */
export const CAR_ABROAD_DOCUMENTS: readonly CarAbroadRow[] = Object.freeze([
  {
    id: 'identidad',
    label: 'Documento de identidad válido para circular en el MERCOSUR',
    detail:
      'La cédula uruguaya sirve: es documento de viaje en el bloque. El protocolo acepta la versión digital cuando la expidió un Estado Parte, y los inspectores pueden fotografiarla para cotejarla.',
    sourceId: 'protocolo-dav-133',
  },
  {
    id: 'licencia',
    label: 'Licencia para conducir',
    detail:
      'La libreta uruguaya vigente. El trámite oficial la nombra como Permiso Único Nacional de Conducir.',
    sourceId: 'tramite-dna',
  },
  {
    id: 'turista',
    label: 'El documento que te califica como turista, emitido por la autoridad migratoria',
    detail:
      'Es el papel o el registro del cruce. De él cuelga el plazo del auto: el vehículo queda sujeto al mismo que te dieron a vos.',
    sourceId: 'protocolo-dav-133',
  },
  {
    id: 'propiedad',
    label: 'Título u otro documento oficial que acredite la propiedad o posesión del vehículo',
    detail:
      'La libreta de propiedad. Tiene que coincidir con la matrícula y, dice el protocolo, con el número de VIN.',
    sourceId: 'protocolo-dav-133',
  },
  {
    id: 'autorizacion',
    label: 'Autorización para conducirlo, si el auto no está a tu nombre',
    detail:
      'Estar anotado en la documentación del vehículo, o un poder. El protocolo pide instrumento público —oficio de oficina pública habilitada o poder notarial—; la página de Aduanas lo escribe como carta poder certificada por escribano público.',
    sourceId: 'protocolo-dav-133',
  },
  {
    id: 'seguro',
    label: 'Comprobante de seguro vigente',
    detail:
      'Acá es donde el SOA no alcanza: el trámite oficial lo escribe como "comprobante de seguro Mercosur vigente" y la página de Aduanas lo nombra por su apodo, Tarjeta Verde.',
    sourceId: 'tramite-dna',
  },
])

/**
 * El seguro, que es el punto de toda la página.
 *
 * Son dos seguros distintos y la confusión entre ellos es lo que hace que alguien cruce sin el
 * que le piden: el SOA es el que exige Uruguay para circular acá, y la carta verde es el que
 * exige el país al que entrás. Tener uno no te da el otro.
 */
export const CAR_ABROAD_INSURANCE: readonly CarAbroadRow[] = Object.freeze([
  {
    id: 'soa-es-otro',
    label: 'El SOA es el seguro que exige Uruguay, y cubre hasta 250.000 UI por accidente',
    detail:
      'La Ley 18.412 crea el seguro obligatorio que cubre a terceros y prohíbe la circulación de los vehículos que no lo tengan. Su tope arranca en 150.000 UI el primer año de vigencia y llega a 250.000 UI "a partir del tercer año"; la ley es de 2008, así que el escalón vigente es el tercero.',
    sourceId: 'ley-18412',
  },
  {
    id: 'carta-verde',
    label: 'La carta verde es otro seguro, obligatorio para el auto que entra a otro país',
    detail:
      'El Decreto 8/997 puso en vigencia "con carácter general y obligatorio" la Resolución 120/94 del Grupo Mercado Común: un seguro de responsabilidad civil del propietario o conductor de vehículos terrestres "no matriculados en el país de ingreso en viaje internacional", para los daños a terceros no transportados. Es el mismo instrumento en los dos sentidos del cruce.',
    sourceId: 'decreto-8-997',
  },
  {
    id: 'representacion',
    label: 'Y sólo vale en el país donde tu aseguradora tenga representante',
    detail:
      'Es el borde que no se ve y está en el artículo 4 del decreto: las pólizas emitidas acá "únicamente tendrán validez en el país o países donde transiten sus asegurados, si previamente aquellas hubieran celebrado acuerdos de representación con compañías aseguradoras de dichos países". Esos acuerdos se comunican a la Superintendencia de Seguros del BCU. Antes de salir, preguntá por el país concreto al que vas, no por "el Mercosur".',
    sourceId: 'decreto-8-997',
  },
  {
    id: 'control',
    label: 'Quien controla que lo tengas es la Aduana',
    detail:
      'El decreto comete el control del cumplimiento a la Dirección Nacional de Aduanas, y el trámite oficial del régimen de vehículos de turistas también lo lleva la DNA, dentro del Ministerio de Economía y Finanzas.',
    sourceId: 'decreto-8-997',
  },
])

/**
 * Quién puede manejarlo del otro lado.
 *
 * Es la pregunta que más se hace y la que tiene la respuesta menos intuitiva: el cónyuge y los
 * familiares no necesitan poder, pero el conductor sí tiene que ser residente en el país donde
 * está matriculado el auto.
 */
export const CAR_ABROAD_DRIVERS: readonly CarAbroadRow[] = Object.freeze([
  {
    id: 'titular',
    label: 'El titular, o quien tenga un poder oficializado en el país de origen',
    detail:
      'El protocolo pide que el poder habilite expresamente la conducción del vehículo, no un poder genérico.',
    sourceId: 'protocolo-dav-133',
  },
  {
    id: 'familia',
    label: 'El cónyuge y los familiares del titular, sin autorización expresa',
    detail:
      'Con dos condiciones: que también sean turistas y que el vínculo se acredite con documentación. Aduanas lo acota a familiares hasta el segundo grado de consanguinidad o afinidad.',
    sourceId: 'protocolo-dav-133',
  },
  {
    id: 'residencia',
    label: 'Y en todos los casos: el conductor tiene que residir donde está matriculado el auto',
    detail:
      'Se prueba con el documento de identidad del MERCOSUR o, si es extranjero sin ese documento, con un certificado de residencia. Un uruguayo que vive afuera tiene que acreditar su residencia habitual en el país de la matrícula.',
    sourceId: 'protocolo-dav-133',
  },
])

/** Los casos en que el régimen no te ampara, y el auto pasa a estar en situación irregular. */
export const CAR_ABROAD_EXCLUSIONS: readonly CarAbroadRow[] = Object.freeze([
  {
    id: 'no-turista',
    label: 'Cuando el conductor no acredita su condición de turista',
    detail: 'Según la ley migratoria del país al que entrás, no la de origen.',
    sourceId: 'protocolo-dav-133',
  },
  {
    id: 'tercer-pais',
    label: 'Cuando el auto está matriculado en un tercer país',
    detail:
      'Aunque lo maneje un turista comunitario: lo que define al vehículo comunitario es su matrícula, no su conductor.',
    sourceId: 'protocolo-dav-133',
  },
  {
    id: 'comercial',
    label:
      'Cuando se usa para trasladar personas, gratis o no, o para cualquier actividad comercial',
    detail:
      'El protocolo incluye expresamente los fines turísticos, y exceptúa a los vehículos de alquiler que la propia norma contempla.',
    sourceId: 'protocolo-dav-133',
  },
])

/**
 * Lo que dicen dos fuentes oficiales sobre cuánto puede quedarse el auto, que no es lo mismo.
 *
 * No se elige una: la página publica las dos con su fecha. La de Aduanas lleva fecha de 2011 y
 * dice tres meses fijos; el protocolo es de 2024 y lo ata al plazo migratorio, que puede ser otro.
 * Resolverlo por nuestra cuenta sería inventar la regla que la administración no unificó.
 */
export const CAR_ABROAD_STAY_DISCREPANCY = Object.freeze({
  question: '¿Cuánto tiempo puede quedarse el auto?',
  readings: Object.freeze([
    Object.freeze({
      label: 'El plazo que te dio migración',
      detail:
        'El protocolo de 2024 dice que el plazo del vehículo es "el otorgado por la autoridad migratoria al titular del vehículo o a la persona por él autorizada a conducirlo".',
      sourceId: 'protocolo-dav-133',
    }),
    Object.freeze({
      label: 'Tres meses desde el ingreso',
      detail:
        'La página de Aduanas, fechada en 2011, dice que los vehículos comunitarios "podrán permanecer amparados en el régimen por el término de tres meses desde su ingreso", y que vencido ese plazo hay que formalizar la permanencia ante la autoridad aduanera, que puede autorizar hasta un año.',
      sourceId: 'aduanas-regimen',
    }),
  ]),
})

/** Lo que las dos fuentes sí dicen igual sobre los plazos, y los dos casos de borde. */
export const CAR_ABROAD_STAY_RULES: readonly CarAbroadRow[] = Object.freeze([
  {
    id: 'auto-sin-dueno',
    label: 'Si vos te volvés y el auto se queda: 90 días, una sola vez, improrrogables',
    detail:
      'Hay que comunicarlo antes en la Aduana de la jurisdicción donde está el auto, y en esos 90 días el vehículo queda sin derecho a uso.',
    sourceId: 'protocolo-dav-133',
  },
  {
    id: 'inmueble',
    label: 'Si tenés o alquilás un inmueble allá y vivís afuera: un año, prorrogable a 24 meses',
    detail:
      'Sin prestación de garantías, según el Decreto 26/003. En Uruguay esa prórroga se tramita en el Ministerio de Economía y Finanzas.',
    sourceId: 'protocolo-dav-133',
  },
  {
    id: 'imprevisto',
    label: 'Si hay accidente, hurto o robo y el auto no puede volver',
    detail:
      'Se comunica a la autoridad aduanera del lugar donde pasó, con la documentación probatoria, y resuelve sin trámite previo.',
    sourceId: 'protocolo-dav-133',
  },
])

/** Toda fila del archivo, para verificar las citas de una sola pasada. */
export function allRows(): readonly CarAbroadRow[] {
  return [
    ...CAR_ABROAD_DOCUMENTS,
    ...CAR_ABROAD_INSURANCE,
    ...CAR_ABROAD_DRIVERS,
    ...CAR_ABROAD_EXCLUSIONS,
    ...CAR_ABROAD_STAY_RULES,
    ...CAR_ABROAD_STAY_DISCREPANCY.readings.map(reading => ({
      id: reading.label,
      label: reading.label,
      detail: reading.detail,
      sourceId: reading.sourceId,
    })),
  ]
}

/** Las filas que citan un id que no existe en {@link CAR_ABROAD_SOURCES}. */
export function rowsWithUnknownSource(): string[] {
  const ids = new Set(CAR_ABROAD_SOURCES.map(source => source.id))
  return allRows()
    .filter(row => !ids.has(row.sourceId))
    .map(row => row.id)
}

/**
 * Las fuentes que el catálogo declara y ninguna fila usa.
 *
 * El otro sentido de la verificación, y no es simetría decorativa: una lista de fuentes al pie
 * más larga que lo que las filas citan es la forma más cómoda de aparentar respaldo.
 */
export function sourcesMissingFromCatalog(): string[] {
  const used = new Set(allRows().map(row => row.sourceId))
  return CAR_ABROAD_SOURCES.filter(source => !used.has(source.id)).map(source => source.id)
}

export function sourceById(id: string): CarAbroadSource | null {
  return CAR_ABROAD_SOURCES.find(source => source.id === id) ?? null
}

/**
 * El tope del SOA en pesos, al valor de la UI que se le pase.
 *
 * Lo ÚNICO calculado de la página, y una multiplicación: 250.000 × la UI del día. Devuelve `null`
 * cuando no hay lectura viva de la UI, porque el fallback del catálogo de indicadores tiene meses
 * y publicarlo como "al valor de hoy" sería estampar una cifra vieja con fecha de hoy.
 */
export function soaCoverageInPesos(uiValue: number | null | undefined): number | null {
  if (typeof uiValue !== 'number' || !Number.isFinite(uiValue) || uiValue <= 0) return null
  return SOA_COVERAGE_UI * uiValue
}
