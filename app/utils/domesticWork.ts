// El trabajo doméstico en Uruguay: lo que cuesta y lo que la ley fija.
//
// POR QUÉ EXISTE ESTE CATÁLOGO. `/cuanto-me-tienen-que-pagar-uruguay` explica el salario mínimo
// nacional y los laudos por Consejo de Salarios, y en su propio cuerpo dice que hay ámbitos con
// negociación propia —«rural, doméstico, sector público»— y ahí deja al lector. Medido el
// 2026-11-08 con grep sobre `pages/` y `utils/`: el sitio no tenía ni el laudo del Grupo 21, ni el
// cuadro de aportes del BPS, ni los descansos que la Ley 18.065 escribió en horas. Son 73.397
// puestos cotizantes a diciembre de 2025 según el BPS, o sea uno de los sectores formales más
// grandes del país, y la persona que contrata es un hogar y no una empresa con contador.
//
// LAS CIFRAS NO SE INVENTAN Y NO SE PROMEDIAN. Los mínimos salen del comunicado R 14/2026 del
// propio BPS, que es el organismo que emite la factura, y no de la página del MTSS: esa última
// publica los valores «de referencia» al 30/6/2026 ($ 32.875 cocina y $ 33.935 cuidados), que son
// los del acuerdo y no los que rigen hoy. Cuando dos fuentes oficiales dicen distinto, acá va la
// que liquida, con la fecha de su propio documento al lado.
//
// Verificado el 2026-11-08 contra:
//  - BPS, Comunicado R 14/2026 (julio 2026): los tres mínimos del período 1/7/2026 al 31/12/2026.
//  - BPS, Guía de afiliación y aportación de trabajo doméstico (junio 2026): el cuadro de tasas,
//    los plazos de alta y baja, la multa de 1 UR y el mínimo para la cobertura de salud.
//  - MTSS, gub.uy: las tareas de cada categoría, las licencias especiales y el aguinaldo.
//  - IMPO, Ley 18.065 (texto actualizado): jornada, descansos, edad mínima e indemnización.
//
// LO QUE NO SE PUBLICA, a propósito: ningún importe de Fonasa en pesos (su tasa personal depende
// de la situación familiar y su complemento de cuota mutual del valor de la cuota, que no
// publicamos), ningún total «lo que sale por mes» (la suma depende de la cobertura de salud, de la
// prima por antigüedad y del IRPF que pueda corresponder) y ningún valor de la BPC ni de la UR
// congelado en un literal: el umbral de salud se dice en BPC y el lector lo convierte con
// `/indicadores/bpc`.

/** El día en que se leyeron todas las fuentes de este archivo. */
export const DOMESTIC_WORK_REVIEWED = '2026-11-08'

/** El período de vigencia de los mínimos, tal como lo escribe el comunicado del BPS. */
export const DOMESTIC_WORK_WAGE_PERIOD = {
  from: '2026-07-01',
  to: '2026-12-31',
  label: 'del 1/7/2026 al 31/12/2026',
} as const

/** Una de las tres categorías laborales que rigen desde el 1/7/2026. */
export interface DomesticWorkCategory {
  /** Identificador estable, en minúsculas. */
  slug: 'general' | 'cocina' | 'cuidados'
  /** Nombre de la categoría como la nombran el BPS y el MTSS. */
  name: string
  /** Salario mínimo mensual por 44 horas semanales, en pesos. */
  monthlyUyu: number
  /** Salario mínimo por hora para jornaleros, en pesos. */
  hourlyUyu: number
  /** Qué tareas comprende, resumido de la redacción del MTSS. */
  tasks: string
}

/**
 * Los tres mínimos del Grupo 21, en el orden en que los publica el BPS.
 *
 * El mensual y el por hora los publica el BPS por separado y NO se derivan uno del otro: el
 * cociente da ~189,7 horas donde 44 h semanales por 52/12 darían 190,67. Por eso los dos valores
 * se guardan tal como el comunicado los imprime, y el test sólo verifica que el cociente caiga en
 * la banda que esa relación admite, que es lo que atrapa un dígito transpuesto.
 */
export const DOMESTIC_WORK_CATEGORIES: readonly DomesticWorkCategory[] = [
  {
    slug: 'general',
    name: 'General',
    monthlyUyu: 32051,
    hourlyUyu: 169,
    tasks:
      'Limpieza habitual, mantenimiento del hogar, lavado y planchado, mandados, espacios comunes o exteriores y cuidado de mascotas. Cocina o cuidados entran acá si son secundarios, o sea hasta el 50 % del tiempo trabajado.',
  },
  {
    slug: 'cocina',
    name: 'Cocina',
    monthlyUyu: 33796,
    hourlyUyu: 178,
    tasks:
      'Preparación de alimentos para el hogar de forma principal y habitual: elaboración de comidas a partir de ingredientes crudos, manipulación de alimentos y planificación de menús. Servir comidas ya preparadas o lavar la vajilla no alcanza.',
  },
  {
    slug: 'cuidados',
    name: 'Cuidados',
    monthlyUyu: 34885,
    hourlyUyu: 184,
    tasks:
      'Cuidado directo y habitual de niñas, niños, adolescentes, personas mayores o personas con distintos grados de dependencia, como tarea principal de la jornada.',
  },
]

/** `32051` → `'32.051'`. Punto de miles, que es como se escriben los pesos acá. */
export const formatDomesticWorkUyu = (value: number) => value.toLocaleString('es-UY')

/** La categoría por su identificador, o `undefined` si no existe. */
export function domesticWorkCategory(slug: string): DomesticWorkCategory | undefined {
  return DOMESTIC_WORK_CATEGORIES.find(category => category.slug === slug)
}

/** El mínimo mensual más bajo de las tres categorías: el que contesta «cuánto, como mínimo». */
export const DOMESTIC_WORK_FLOOR_MONTHLY = Math.min(
  ...DOMESTIC_WORK_CATEGORIES.map(category => category.monthlyUyu)
)

/** Una fila del cuadro de aportes del BPS. */
export interface DomesticWorkContribution {
  /** El concepto, como lo nombra la guía del BPS. */
  concept: string
  /** Lo que se le descuenta a la persona trabajadora. */
  personal: string
  /** Lo que paga el hogar empleador. */
  employer: string
  /** Por qué no es un número cerrado, cuando no lo es. */
  note?: string
}

/**
 * El cuadro de tasas de la guía del BPS de junio de 2026, fila por fila.
 *
 * Fonasa es el único concepto que no se puede cerrar en un número: su tasa personal va del 3 % al
 * 8 % según cónyuge e hijos a cargo y la remuneración, y la patronal lleva además el complemento
 * de cuota mutual. Se publica así, variable y con el motivo, en vez de elegir un caso y
 * presentarlo como el general.
 */
export const DOMESTIC_WORK_CONTRIBUTIONS: readonly DomesticWorkContribution[] = [
  { concept: 'Aporte jubilatorio', personal: '15 %', employer: '7,5 %' },
  {
    concept: 'Fonasa',
    personal: '3 % a 8 %',
    employer: '5 % + complemento de cuota mutual',
    note: 'La tasa personal depende de cónyuge o concubino, hijos a cargo y si la remuneración pasa de 2,5 BPC.',
  },
  { concept: 'FRL', personal: '0,10 %', employer: '0,10 %' },
  {
    concept: 'Seguro de accidentes (BSE)',
    personal: '—',
    employer: '1,87 %',
    note: 'Viene en la misma factura del BPS desde julio de 2025; no hay póliza aparte que contratar.',
  },
  {
    concept: 'Fondo social',
    personal: '0,03 %',
    employer: '0,03 %',
    note: 'Opcional para cada parte por separado.',
  },
  {
    concept: 'Fondo de garantía de créditos laborales',
    personal: '—',
    employer: '0,025 %',
    note: 'Ley 19.690: cubre al trabajador si el empleador cae en insolvencia.',
  },
]

/**
 * El mínimo de actividad que da derecho a la cobertura de salud, en las tres formas en que el BPS
 * lo escribe. Se cumple con cualquiera de las tres, y se puede llegar sumando empleadores.
 */
export const DOMESTIC_WORK_HEALTH_MINIMUM = {
  jornales: 13,
  monthlyHours: 104,
  bpc: 1.25,
} as const

/** Un límite o un descanso que fija la Ley 18.065, con el artículo que lo dice. */
export interface DomesticWorkLegalLimit {
  /** Qué fija. */
  label: string
  /** El valor, en la unidad en que la ley lo escribió. */
  value: string
  /** El artículo de la Ley 18.065. */
  article: string
}

/** Lo que la ley fija en horas y en años, y no el Consejo de Salarios. */
export const DOMESTIC_WORK_LEGAL_LIMITS: readonly DomesticWorkLegalLimit[] = [
  { label: 'Jornada máxima', value: '8 horas diarias y 44 semanales', article: 'art. 2' },
  {
    label: 'Descanso intermedio, con retiro',
    value: '30 minutos pagados como trabajo efectivo',
    article: 'art. 3',
  },
  {
    label: 'Descanso intermedio, sin retiro',
    value: 'mínimo de 2 horas, no remuneradas',
    article: 'art. 3',
  },
  {
    label: 'Descanso semanal',
    value: '36 horas ininterrumpidas, con todo el domingo',
    article: 'art. 4',
  },
  {
    label: 'Descanso nocturno, sin retiro',
    value: 'mínimo de 9 horas continuas',
    article: 'art. 5',
  },
  {
    label: 'Indemnización por despido',
    value: 'desde los 90 días corridos de iniciada la relación',
    article: 'art. 7',
  },
  { label: 'Edad mínima', value: '18 años, o 15 con autorización del INAU', article: 'art. 11' },
]

/** Las fuentes oficiales de todo lo de arriba, para que el lector verifique sin creernos. */
export const DOMESTIC_WORK_SOURCES = [
  {
    label:
      'BPS, Comunicado R 14/2026 «Trabajo doméstico: aumento salarial julio 2026»: los tres mínimos del período 1/7/2026 al 31/12/2026 ($ 32.051, $ 33.796 y $ 34.885 mensuales por 44 horas semanales; $ 169, $ 178 y $ 184 por hora) y los porcentajes de aumento por franja',
    url: 'https://www.bps.gub.uy/bps/file/24374/2/2026---comunicado-r-14---trabajo-domestico-aumento-salarial-julio-2026.pdf',
    publisher: 'BPS',
  },
  {
    label:
      'BPS, categorías laborales y salarios mínimos del trabajo doméstico: la misma tabla publicada en la web del organismo, con la descripción de cada categoría',
    url: 'https://www.bps.gub.uy/24279/categorias-laborales-y-salarios-minimos.html',
    publisher: 'BPS',
  },
  {
    label:
      'BPS, Guía de afiliación y aportación de trabajo doméstico (junio 2026): el cuadro de tasas (jubilatorio 15 % y 7,5 %, FRL 0,10 % cada parte, BSE 1,87 % patronal, fondo social 0,03 % opcional, fondo de garantía 0,025 % patronal), los plazos de alta y baja, la multa de 1 UR y el mínimo de «13 jornales o 104 horas mensuales, o 1,25 BPC» para la cobertura de salud',
    url: 'https://www.bps.gub.uy/bps/file/10290/15/guia-trabajo-domestico.pdf',
    publisher: 'BPS',
  },
  {
    label:
      'BPS, «Trabajo doméstico: derechos que siguen construyendo igualdad»: los 73.397 puestos cotizantes a diciembre de 2025, la compensación por nocturnidad del 15 % y del 20 %, el 19 de agosto como feriado pago y la indemnización especial de 6 sueldos por embarazo',
    url: 'https://www.bps.gub.uy/bps/file/24455/1/trabajo-domestico-derechos-que-siguen-construyendo-igualdad.pdf',
    publisher: 'BPS',
  },
  {
    label:
      'MTSS, trabajo doméstico: las tareas de cada categoría, las licencias especiales, la licencia anual de 20 días, el salario vacacional complementario del 15 %, el aguinaldo en dos fracciones y la prima por presentismo. Publica los mínimos «de referencia» al 30/6/2026 ($ 32.875 cocina y $ 33.935 cuidados), que son los del acuerdo y no los que rigen hoy',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/trabajo-domestico',
    publisher: 'MTSS',
  },
  {
    label:
      'Ley 18.065 (texto actualizado en IMPO): jornada de «ocho horas diarias, y de cuarenta y cuatro horas semanales» (art. 2), descanso intermedio (art. 3), descanso semanal de 36 horas con todo el domingo (art. 4), descanso nocturno de 9 horas (art. 5), indemnización por despido desde los 90 días (art. 7) y edad mínima de 18 años (art. 11)',
    url: 'https://www.impo.com.uy/bases/leyes/18065-2006',
    publisher: 'IMPO',
  },
] as const
