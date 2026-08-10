// app/utils/housingMarket.ts
// Datos de /por-que-no-baja-el-alquiler-uruguay: por qué se levantan torres por todos lados,
// quién vive ahí, y por qué eso no se traduce en alquileres más baratos.
//
// POR QUÉ EXISTE: salió de minar los COMENTARIOS de los subs uruguayos, no los títulos. La
// pregunta se hace así, en medio de un hilo de otra cosa:
//
//   «No puedo entender, levantan edificios en cualquier lugar, ¿quién vive ahí?, este país no
//    crece, así que la gente de un lado va a otro, si la gente se va de Montevideo ¿por qué no
//    baja el alquiler?, ¿ningún inversor se pregunta qué pasará en 10 años cuando se empiece a
//    perder gente? ¿o en una crisis?»
//
// Son cuatro preguntas encadenadas y las cuatro tienen respuesta con dato público. El sitio no
// tenía NADA: grep de «vivienda promovida», «viviendas vacías», «18.795», «censo 2023» y
// «permisos de construcción» sobre app/ daba cero.
//
// LÍMITE QUE ESTE MÓDULO SE AUTOIMPONE: publica el dato y el incentivo, no la causalidad. Decir
// «el alquiler no baja POR la ley» sería una tesis, no un hecho, y no la tenemos sourceada. Lo
// que sí está sourceado es dónde está la vivienda vacía (no donde la gente cree) y qué premia
// exactamente el régimen fiscal, que es lo que permite al lector sacar su conclusión.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-09:
//   - INE, Censo 2023 — Viviendas desocupadas
//     https://www.gub.uy/instituto-nacional-estadistica/comunicacion/noticias/censo-2023-viviendas-desocupadas
//   - INE, Censo 2023 — Caracterización de las viviendas desocupadas
//     https://www.gub.uy/instituto-nacional-estadistica/comunicacion/noticias/censo-2023-caracterizacion-viviendas-desocupadas
//   - Ley 18.795 — Promoción de la vivienda de interés social
//     https://www.impo.com.uy/bases/leyes/18795-2011
//   - ANV — Ley de viviendas promovidas
//     https://www.anv.gub.uy/ley-de-viviendas-promovidas

/** Fecha en que cada cifra se contrastó con las fuentes de arriba. */
export const HOUSING_VERIFIED_AT = '2026-08-09'

/** Todos los datos de vivienda vienen de este censo. */
export const CENSUS_YEAR = 2023

export interface HousingSource {
  label: string
  url: string
}

export const HOUSING_SOURCES: readonly HousingSource[] = Object.freeze([
  {
    label: 'INE — Censo 2023: viviendas desocupadas',
    url: 'https://www.gub.uy/instituto-nacional-estadistica/comunicacion/noticias/censo-2023-viviendas-desocupadas',
  },
  {
    label: 'INE — Censo 2023: caracterización de las viviendas desocupadas',
    url: 'https://www.gub.uy/instituto-nacional-estadistica/comunicacion/noticias/censo-2023-caracterizacion-viviendas-desocupadas',
  },
  {
    label: 'Ley 18.795 — Promoción de la vivienda de interés social',
    url: 'https://www.impo.com.uy/bases/leyes/18795-2011',
  },
  {
    label: 'ANV — Ley de viviendas promovidas',
    url: 'https://www.anv.gub.uy/ley-de-viviendas-promovidas',
  },
])

// ---------------------------------------------------------------------------
// Vivienda vacía: dónde está de verdad
// ---------------------------------------------------------------------------

/** Viviendas relevadas en todo el país por el Censo 2023. */
export const TOTAL_DWELLINGS = 1_659_048

/** Porcentaje del stock nacional que estaba desocupado. */
export const NATIONAL_VACANCY_PCT = 19.5

export interface DepartmentVacancy {
  department: string
  /** Porcentaje del stock del departamento que estaba desocupado. */
  vacancyPct: number
  /** Una línea de por qué está tan alto o tan bajo. */
  note: string
}

/**
 * El dato que da vuelta la intuición: el 19,5 % nacional NO es stock ocioso repartido parejo.
 * Lo empujan los departamentos de veraneo, donde la vivienda vacía es casa de temporada y no
 * hay ningún mercado de alquiler permanente que pudiera abaratar.
 */
export const VACANCY_EXTREMES: readonly DepartmentVacancy[] = Object.freeze([
  {
    department: 'Maldonado',
    vacancyPct: 45.2,
    note: 'El más alto del país. El 72,5 % de esas viviendas se destina a uso temporal: es casa de veraneo, no stock disponible.',
  },
  {
    department: 'Rocha',
    vacancyPct: 42.1,
    note: 'Misma lógica de balneario que Maldonado.',
  },
  {
    department: 'Lavalleja',
    vacancyPct: 28.4,
    note: 'Tercero del ranking por porcentaje, todavía bastante por encima del promedio del país.',
  },
  {
    department: 'Paysandú',
    vacancyPct: 16.2,
    note: 'Ya por debajo del promedio nacional: es un mercado de vivienda permanente, no de veraneo.',
  },
  {
    department: 'Salto',
    vacancyPct: 13.9,
    note: 'De los más bajos del interior, y otra señal de que el 19,5 % nacional no se reparte parejo.',
  },
  {
    department: 'Montevideo',
    vacancyPct: 9.6,
    note: 'El MÁS BAJO del país: 90,4 % de las viviendas están ocupadas. Donde la gente cree que sobran viviendas es justamente donde menos sobran.',
  },
])

export interface VacancyReason {
  label: string
  /** Porcentaje de las viviendas desocupadas de ese departamento. */
  montevideoPct: number
  maldonadoPct: number
  detail: string
}

/**
 * Por qué está vacía. Es la respuesta directa a «¿quién vive ahí?»: en Montevideo la vivienda
 * vacía está mayormente EN EL MERCADO —se está ofreciendo—, no guardada.
 */
export const VACANCY_REASONS: readonly VacancyReason[] = Object.freeze([
  {
    label: 'En venta o alquiler',
    montevideoPct: 34,
    maldonadoPct: 11.9,
    detail:
      'Está ofrecida en el mercado. En Montevideo es la categoría más grande: refleja un mercado inmobiliario activo, no unidades escondidas.',
  },
  {
    label: 'Uso temporal',
    montevideoPct: 13.6,
    maldonadoPct: 72.5,
    detail:
      'Casa de temporada. Es lo que explica casi todo el porcentaje de Maldonado y casi nada del de Montevideo.',
  },
  {
    label: 'En construcción o reparación',
    montevideoPct: 7.4,
    maldonadoPct: 4.3,
    detail:
      'Todavía no puede habitarse: es obra en curso o unidad en refacción, así que no es stock disponible hoy.',
  },
])

// ---------------------------------------------------------------------------
// Qué premia el régimen: Ley 18.795
// ---------------------------------------------------------------------------

export interface TaxBenefit {
  tax: string
  benefit: string
  duration: string
  detail: string
}

/**
 * Las exoneraciones de la vivienda promovida. Acá está la respuesta a «¿ningún inversor se
 * pregunta qué pasará en 10 años?»: el horizonte de 10 años no es una casualidad, es
 * exactamente el plazo del beneficio sobre la renta del alquiler.
 */
export const PROMOTED_HOUSING_BENEFITS: readonly TaxBenefit[] = Object.freeze([
  {
    tax: 'IRPF / IRAE / IRNR sobre el alquiler',
    benefit: 'Exoneración de hasta el 100 %',
    duration: '10 años desde terminada la obra',
    detail:
      'La renta del alquiler puede quedar exonerada por completo. El alcance depende de la zona: llega al 100 % en determinadas zonas de Montevideo y en el interior.',
  },
  {
    tax: 'Impuesto al Patrimonio',
    benefit: 'Exoneración',
    duration: '10 años',
    detail: 'El propietario no paga patrimonio por esa unidad durante el plazo.',
  },
  {
    tax: 'ITP (Impuesto a las Trasmisiones Patrimoniales)',
    benefit: 'Exoneración en la compra',
    duration: 'En el acto',
    detail: 'Se ahorra en el momento de escriturar.',
  },
])

/** El plazo que se repite en los dos beneficios grandes. */
export const BENEFIT_YEARS = 10

// ---------------------------------------------------------------------------
// Las cuatro preguntas del hilo, respondidas
// ---------------------------------------------------------------------------

export interface HousingAnswer {
  question: string
  /** La respuesta en una línea, la que se lee primero. */
  short: string
  answer: string
}

export const HOUSING_ANSWERS: readonly HousingAnswer[] = Object.freeze([
  {
    question: 'Levantan edificios en todos lados: ¿quién vive ahí?',
    short: 'En Montevideo, gente: es el departamento con MENOS vivienda vacía del país.',
    answer:
      'El Censo 2023 relevó 1.659.048 viviendas en el país y encontró un 19,5 % desocupadas, pero ese promedio engaña. Montevideo tiene la vacancia más baja de todo el país: 9,6 %, con el 90,4 % de las viviendas ocupadas. Y de las que están vacías en Montevideo, el 34 % está ofrecida en venta o alquiler —o sea, está en el mercado— y sólo el 13,6 % es de uso temporal. La imagen de torres vacías no aparece en los datos de Montevideo.',
  },
  {
    question: 'Entonces, ¿de dónde sale el 19,5 % de viviendas vacías?',
    short: 'De los departamentos de veraneo, donde es casa de temporada.',
    answer:
      'Maldonado encabeza con 45,2 % de su stock desocupado y Rocha le sigue con 42,1 %. En Maldonado, el 72,5 % de esas viviendas desocupadas se destina a uso temporal: son casas de temporada cerradas nueve meses al año, no unidades que podrían estar bajando el alquiler en Montevideo. Es la razón por la que el promedio nacional no dice nada sobre el mercado de alquiler de la capital.',
  },
  {
    question: 'Si el país no crece en población, ¿por qué no baja el alquiler?',
    short:
      'Porque en Montevideo no hay stock ocioso, y el régimen fiscal no premia bajar el precio.',
    answer:
      'Dos cosas a la vez. Primero: con 9,6 % de vacancia, Montevideo no tiene el excedente que haría caer los precios. Segundo: el régimen de vivienda promovida de la Ley 18.795 exonera hasta el 100 % del IRPF, IRAE o IRNR sobre la renta del alquiler durante 10 años, más el Impuesto al Patrimonio por 10 años y el ITP en la compra. Un incentivo que actúa sobre el impuesto a la renta mejora el rendimiento neto del propietario sin necesidad de que el alquiler baje. Qué tanto de la evolución del precio se explica por eso es discutible, y no lo afirmamos: lo que sí es un hecho es qué premia el régimen y qué no.',
  },
  {
    question: '¿Ningún inversor piensa en 10 años, o en una crisis?',
    short: 'Diez años es literalmente el plazo del beneficio fiscal.',
    answer:
      'La exoneración sobre la renta del alquiler y la del Impuesto al Patrimonio duran 10 años contados desde que termina la obra. No es un horizonte arbitrario: es el horizonte que fija la norma. Al año 11 la misma unidad empieza a tributar como cualquier otra, y ahí el rendimiento neto del alquiler cae aunque el precio no se mueva. Es un dato que conviene tener antes de comprar para alquilar, porque cambia la cuenta del último tramo del proyecto.',
  },
  {
    question: '¿Qué es una vivienda promovida?',
    short: 'Una unidad construida bajo la Ley 18.795, con exoneraciones a cambio de requisitos.',
    answer:
      'La Ley 18.795 promueve la inversión privada en construcción, refacción o ampliación de viviendas destinadas a venta o alquiler, con un paquete de exoneraciones tributarias. Los proyectos se presentan y los aprueba la Agencia Nacional de Vivienda. El objetivo declarado es facilitar el acceso a la vivienda de los sectores de ingresos medios.',
  },
])
