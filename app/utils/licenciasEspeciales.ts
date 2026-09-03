// Los días de licencia especial que da la ley uruguaya, artículo por artículo.
//
// POR QUÉ ESTA PÁGINA EXISTE. Medido el 2026-09-03 en el SERP uruguayo (gl=uy) para "días por
// fallecimiento uruguay" y "licencia por duelo uruguay": no hay caja de respuesta, no hay preguntas
// relacionadas, y lo que rankea es el texto crudo del artículo en IMPO, una página de BPS, el
// observatorio del Cuesta Duarte, el PIT-CNT y un posteo de Facebook. Nadie tiene la respuesta en
// forma de tabla. Y el autocompletado uruguayo enumera la pregunta por parentesco: "días por
// fallecimiento de padre", "de abuelo", "de un tío", "de hermano", "de suegro".
//
// EL DATO QUE NADIE PUBLICA CLARO es el negativo: la ley nombra ocho parentescos y NO incluye
// abuelos, tíos, suegros, cuñados ni primos. Quien busca "días por fallecimiento de abuelo" está
// buscando exactamente eso, y la respuesta honesta —"la ley no te da ninguno; fijate si tu convenio
// sí"— no está escrita en ningún lado legible.
//
// TODO NÚMERO DE ACÁ SALE DEL TEXTO CONSOLIDADO DE LA LEY, leído en impo.com.uy el 2026-09-03, con
// las modificaciones de la Ley 18.458 ya incorporadas (los artículos 1, 3, 8 y 9 las traen
// anotadas). No hay una sola cifra estimada. Ojo con el atajo que este repo ya documentó: en IMPO,
// `/bases/leyes/<n>` es el texto vigente y `/bases/leyes-originales/<n>` el de la promulgación —
// citar el segundo es publicar una norma derogada.

export interface LicenciaEspecial {
  slug: string
  /** Cómo la nombra la gente, no cómo la nombra la ley. */
  nombre: string
  /** Lo que da, en una línea, con la unidad exacta que usa el artículo. */
  dias: string
  /** Condiciones y letra chica, sin adornos. */
  detalle: string
  /** Artículo de la Ley 18.345 que la establece. */
  articulo: number
  /** Cuando el tema tiene su propia página en el sitio. */
  verTambien?: { label: string; to: string }
}

export const LICENCIAS_ESPECIALES: readonly LicenciaEspecial[] = Object.freeze([
  {
    slug: 'duelo',
    nombre: 'Duelo (fallecimiento de un familiar)',
    dias: '3 días hábiles',
    detalle:
      'Por el fallecimiento de padre, madre, hijos, cónyuge, hijos adoptivos, padres adoptantes, concubinos y hermanos. La ley nombra a esos ocho y a nadie más.',
    articulo: 7,
  },
  {
    slug: 'matrimonio',
    nombre: 'Matrimonio',
    dias: '3 días',
    detalle: 'Uno de los tres tiene que caer necesariamente el día del casamiento.',
    articulo: 6,
  },
  {
    slug: 'paternidad',
    nombre: 'Paternidad (la parte que paga el empleador)',
    dias: 'El día del nacimiento y los dos siguientes',
    detalle:
      'Esto es lo que fija esta ley y lo paga el empleador. El subsidio de paternidad del BPS, que es más largo, sale de otra norma.',
    articulo: 5,
    verTambien: {
      label: 'Licencia por maternidad y paternidad',
      to: '/licencia-por-maternidad-y-paternidad-uruguay',
    },
  },
  {
    slug: 'estudio',
    nombre: 'Estudio',
    dias: '6, 9 o 12 días al año según tu carga horaria',
    detalle:
      'Hasta 36 horas semanales, 6 días; más de 36 y menos de 48, 9 días; 48 horas semanales, 12 días. Se toman fraccionados de hasta 3 días, incluyendo el día del examen, y hay que justificar con certificado del instituto. Pide más de 6 meses de antigüedad en la empresa.',
    articulo: 2,
  },
  {
    slug: 'hijo-con-discapacidad',
    nombre: 'Controles médicos de un hijo con discapacidad',
    dias: 'Hasta 10 días al año',
    detalle:
      'Con goce de sueldo, para llevarlo a controles médicos. Hay que avisarle al empleador con 48 horas de anticipación.',
    articulo: 10,
  },
  {
    slug: 'familiar-a-cargo',
    nombre: 'Familiar con discapacidad o enfermedad terminal a cargo',
    dias: '96 horas al año',
    detalle: 'Se pueden usar seguidas o repartidas. El empleador paga hasta 64 de esas 96 horas.',
    articulo: 11,
  },
])

/** Un parentesco y si la ley le da licencia por duelo. */
export interface ParentescoDuelo {
  parentesco: string
  /** Días hábiles que da la ley. 0 = la ley no da ninguno. */
  dias: number
  nota?: string
}

/**
 * La tabla por parentesco, con las filas negativas incluidas a propósito.
 *
 * Las filas de 0 días son las más buscadas y las que nadie contesta: el autocompletado uruguayo
 * sugiere "días por fallecimiento de abuelo", "de un tío" y "de suegro", y para los tres la
 * respuesta es que la Ley 18.345 no los nombra. Omitirlas dejaría la página sin contestar
 * justamente lo que se pregunta.
 */
export const DUELO_POR_PARENTESCO: readonly ParentescoDuelo[] = Object.freeze([
  { parentesco: 'Padre o madre', dias: 3 },
  { parentesco: 'Hijo o hija', dias: 3 },
  { parentesco: 'Cónyuge', dias: 3 },
  { parentesco: 'Concubino o concubina', dias: 3, nota: 'La ley los nombra igual que al cónyuge.' },
  { parentesco: 'Hermano o hermana', dias: 3 },
  { parentesco: 'Hijo adoptivo', dias: 3 },
  { parentesco: 'Padre o madre adoptante', dias: 3 },
  {
    parentesco: 'Abuelo o abuela',
    dias: 0,
    nota: 'La ley no lo incluye. Puede darlo el convenio colectivo de tu rama.',
  },
  {
    parentesco: 'Tío o tía',
    dias: 0,
    nota: 'La ley no lo incluye.',
  },
  {
    parentesco: 'Suegro o suegra',
    dias: 0,
    nota: 'La ley no lo incluye.',
  },
  {
    parentesco: 'Cuñado o cuñada',
    dias: 0,
    nota: 'La ley no lo incluye.',
  },
  {
    parentesco: 'Primo, sobrino u otro pariente',
    dias: 0,
    nota: 'La ley no lo incluye.',
  },
])

/** Las reglas que valen para TODAS las licencias especiales, y que casi nadie sabe. */
export const REGLAS_COMUNES: ReadonlyArray<{ regla: string; articulo: number }> = Object.freeze([
  {
    regla:
      'Son con goce de sueldo y no se descuentan de la licencia anual: van aparte de los 20 días.',
    articulo: 1,
  },
  {
    regla:
      'Son irrenunciables y hay que tomarlas: no se pueden cambiar por plata ni por una compensación.',
    articulo: 8,
  },
  {
    regla: 'Ninguna de estas licencias genera salario vacacional. La licencia anual sí; estas no.',
    articulo: 9,
  },
  {
    regla:
      'Son un mínimo. Un convenio colectivo o el Consejo de Salarios de tu rama puede darte más, nunca menos.',
    articulo: 9,
  },
  {
    regla:
      'Valen para todos los trabajadores de la actividad privada. El sector público se rige por su propio régimen.',
    articulo: 1,
  },
])

export interface LicenciaFuente {
  label: string
  url: string
}

export const LICENCIAS_SOURCES: readonly LicenciaFuente[] = Object.freeze([
  {
    label: 'Ley N.º 18.345 — Licencias especiales (texto vigente, IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/18345-2008',
  },
  {
    label: 'Artículo 7 — Licencia por duelo',
    url: 'https://www.impo.com.uy/bases/leyes/18345-2008/7',
  },
  {
    label: 'BPS — Ley 18.345, licencias especiales',
    url: 'https://www.bps.gub.uy/12395/ley18345-otorgamiento-de-licencias-especiales.html',
  },
])

/** Cuándo se leyó la norma. Se actualiza a mano y sólo después de volver a leerla. */
export const LICENCIAS_VERIFIED_AT = '2026-09-03'

export interface FaqEntry {
  question: string
  answer: string
}

/**
 * Las preguntas salen del autocompletado uruguayo del 2026-09-03, no de la imaginación: son las
 * que Google sugiere al tipear "me corresponde", "días por fallecimiento" y "licencia por duelo".
 */
export const LICENCIAS_FAQ: readonly FaqEntry[] = Object.freeze([
  {
    question: '¿Cuántos días de licencia me corresponden por fallecimiento?',
    answer:
      'Tres días hábiles, y sólo por el fallecimiento de padre, madre, hijos, cónyuge, concubino, hermanos, hijos adoptivos o padres adoptantes. Son días hábiles: los fines de semana y feriados no cuentan.',
  },
  {
    question: '¿Me dan licencia por el fallecimiento de un abuelo?',
    answer:
      'La Ley 18.345 no incluye a los abuelos, así que por ley no corresponde. Vale la pena mirar el convenio colectivo de tu rama: la propia ley permite que un convenio dé más días que el mínimo legal.',
  },
  {
    question: '¿Y por un tío, un suegro o un cuñado?',
    answer:
      'Tampoco: la ley nombra ocho parentescos y ninguno de esos tres está. Lo mismo que con los abuelos, puede darlo un convenio colectivo.',
  },
  {
    question: '¿Se descuentan de mi licencia anual?',
    answer:
      'No. Las licencias especiales son un derecho aparte y no se descuentan del régimen general: los 20 días de licencia anual quedan intactos.',
  },
  {
    question: '¿Puedo cobrarlas en vez de tomármelas?',
    answer:
      'No. La ley las declara irrenunciables y obliga a gozarlas efectivamente: no se pueden sustituir por salario ni por ninguna compensación.',
  },
  {
    question: '¿Estas licencias generan salario vacacional?',
    answer:
      'No. La ley lo dice expresamente: ninguna de las licencias especiales genera derecho a salario vacacional. La licencia anual sí lo genera.',
  },
  {
    question: '¿Cuántos días de licencia por matrimonio hay?',
    answer: 'Tres días, y uno de ellos tiene que ser necesariamente el día del casamiento.',
  },
  {
    question: '¿Cuántos días de licencia por estudio tengo?',
    answer:
      'Depende de tu carga horaria: 6 días al año hasta 36 horas semanales, 9 entre 36 y 48, y 12 con 48 horas semanales. Se toman de a un máximo de 3 días por vez, incluyendo el día del examen, y hay que tener más de 6 meses de antigüedad.',
  },
])
