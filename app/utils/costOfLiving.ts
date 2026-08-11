// app/utils/costOfLiving.ts
// Engine + reference data for the interactive cost-of-living / budget tool
// (/herramientas/costo-de-vida). PURE module (no Vue/Nuxt) so the page and tests
// share one source of truth.
//
// Goal: help a person in Uruguay see, for their net income and living situation
// (alone, as a couple, sharing, with kids; renting or not; Montevideo or interior),
// what a realistic monthly budget looks like — and whether their expectation is
// financially viable. Grounds expectations instead of selling a fantasy.
//
// The peso figures in COST_MODEL are typical 2026 references from public sources
// (INE canasta, rental portals, UTE/OSE/Antel, STM); they are ballparks with real
// spread, not quotes. Informational, not financial advice.
//
// Below COST_SOURCES there is a second, clearly separated block: the INE's own
// published figures (canastas CBA/CBT, household income, average rent by
// department). Those are NOT estimates — they are quoted, dated and regional,
// and the module keeps them apart so nobody mistakes a poverty threshold for a
// budget. The calculator's geography is Montevideo / Interior because that is
// the split for which the INE actually publishes canastas and income; rent is
// the price the INE does open department by department (other agencies publish
// other prices by department — MGAP-DIEA prices farmland per department — so
// "the only price the State publishes by department" would simply be false).

export type City = 'montevideo' | 'interior'
export type Situation = 'solo' | 'compartido' | 'pareja' | 'familia'
export type Housing = 'alquila' | 'propia'
/** Montevideo price zone (ignored for the interior). */
export type MvdZone = 'economico' | 'intermedio' | 'costa'
export type TransportMode =
  | 'a_pie_bici'
  | 'publico_ocasional'
  | 'publico_diario'
  | 'auto'
  | 'auto_publico'
export type Lifestyle = 'austero' | 'moderado' | 'comodo'
export type HealthMode = 'fonasa' | 'particular'

export interface BudgetInputs {
  /** Household net monthly income in UYU (sum of both incomes if a couple). */
  netIncome: number
  situation: Situation
  city: City
  housing: Housing
  /** Number of children (only used when situation = 'familia'). */
  children: number
  /** Montevideo price zone; defaults to 'intermedio'. Ignored for the interior. */
  zone?: MvdZone
  /** How the household gets around; defaults to 'publico_diario'. */
  transport?: TransportMode
  /** Spending style, scales food + discretionary; defaults to 'moderado'. */
  lifestyle?: Lifestyle
  /** Health coverage; defaults to 'fonasa' (covered via payroll). */
  health?: HealthMode
}

export type DwellingType =
  | 'monoambiente'
  | '1_dormitorio'
  | '2_dormitorios'
  | 'habitacion_compartida'

interface CostModel {
  /** Typical monthly rent in UYU, [montevideo, interior] not needed — city factor handles interior. */
  rentMontevideo: Record<DwellingType, number>
  /** Interior rent = Montevideo × this factor. */
  interiorRentFactor: number
  /** Realistic monthly food spend per adult cooking at home (UYU). */
  foodPerAdult: number
  /** Children eat ~this fraction of an adult. */
  childFoodFactor: number
  /** Base monthly utilities for a small dwelling (UTE + OSE + Antel + gastos comunes). */
  utilitiesBase: number
  /** Realistic monthly public-transport spend per commuting adult (Montevideo). */
  transportPerAdult: number
  /** Interior transport factor (shorter distances / more walking). */
  interiorTransportFactor: number
  /** Occasional public-transport spend per adult (few trips a month). */
  publicoOcasionalMonthly: number
  /** Walk/bike monthly cost (bike upkeep, occasional trip). */
  aPieBiciMonthly: number
  /** Monthly cost of running one car (nafta + seguro + patente + mantenimiento). */
  autoMonthly: number
  /** Health co-pagos (tickets/órdenes) buffer per person — FONASA covers the cuota for employees. */
  healthPerPerson: number
  /** Out-of-pocket mutualista cuota per person when NOT on FONASA. */
  mutualistaParticular: number
  /** Personal care, cleaning, basic clothing per person. */
  miscPerPerson: number
  /** Rent multiplier per Montevideo zone (applied to the baseline typical rent). */
  zoneMultiplier: Record<MvdZone, number>
  /** Food spend factor by lifestyle. */
  lifestyleFood: Record<Lifestyle, number>
  /** Discretionary (varios) factor by lifestyle. */
  lifestyleMisc: Record<Lifestyle, number>
  /** Aspirational savings rate applied when income comfortably covers essentials. */
  savingsRate: number
}

// Typical 2026 references, verified against INE / MTSS / UTE / OSE / Antel / STM /
// InfoCasas (see SALARY_REFERENCE + COST_SOURCES). Ballparks with real spread.
export const COST_MODEL: CostModel = {
  rentMontevideo: {
    monoambiente: 22000, // ~$15k Centro/Cordón → ~$28k costa/amoblado
    '1_dormitorio': 28000, // InfoCasas prom. ~USD 720/mes
    '2_dormitorios': 36000, // InfoCasas prom. ~USD 980/mes
    habitacion_compartida: 12000, // habitación en apto compartido
  },
  // CÁLCULO PROPIO sobre los agregados del INE (IAI Alquileres, junio 2026), no
  // un valor publicado: el INE no publica un promedio "interior". Se despeja del
  // boletín —149.789 contratos vigentes a $22.245 de promedio país, de los
  // cuales 106.086 son de Montevideo a $23.442— y da $19.339 en el interior =
  // 0,825 de Montevideo (ver interiorRentWeighted()).
  //
  // Es el promedio PONDERADO por contratos, que es lo que paga la gente. La
  // mediana de los 18 departamentos ($16.363 = 0,70) queda mucho más abajo
  // porque describe departamentos, no inquilinos: la mayoría de los
  // departamentos son chicos y baratos, mientras que Canelones ($22.019) y
  // Maldonado ($22.959) —donde está más de la mitad de los contratos del
  // interior— alquilan casi como Montevideo. Aun así es un promedio regional:
  // la costa de Maldonado lo pasa por arriba (ver MALDONADO_EXCEPTION).
  interiorRentFactor: 0.825,
  // ~2 veces la Canasta Básica Alimentaria per cápita del INE de MONTEVIDEO
  // ($6.628, diciembre 2025). La CBA es la línea de indigencia —el piso
  // alimentario— y no lo que gasta comiendo una persona real. En el interior se
  // multiplica por INTERIOR_FOOD_FACTOR, que es la relación entre las dos CBA
  // que el INE publica ($5.685 / $6.628).
  foodPerAdult: 13000,
  childFoodFactor: 0.6,
  utilitiesBase: 8500, // UTE ~$2.000 + OSE ~$1.100 + internet ~$1.650 + celular ~$600 + parte de gastos comunes
  transportPerAdult: 2600, // ~2 tramos/día, ~22 días, boleto STM $52
  interiorTransportFactor: 0.7,
  publicoOcasionalMonthly: 1300, // pocos viajes al mes
  aPieBiciMonthly: 500, // a pie / bici (mantenimiento ocasional)
  autoMonthly: 14000, // 1 auto: nafta + seguro + patente + mantenimiento (nafta cara en UY)
  healthPerPerson: 900, // copagos/tickets (FONASA cubre la cuota de los trabajadores formales)
  mutualistaParticular: 5500, // cuota de mutualista particular si NO estás en FONASA
  miscPerPerson: 3500,
  zoneMultiplier: { economico: 0.78, intermedio: 1, costa: 1.38 }, // Centro/Cordón vs media vs Pocitos/Carrasco
  lifestyleFood: { austero: 0.75, moderado: 1, comodo: 1.35 },
  lifestyleMisc: { austero: 0.6, moderado: 1, comodo: 1.6 },
  savingsRate: 0.1,
}

/** National minimum + approximate median net salary (UYU, 2026), for on-page context. */
export const SALARY_REFERENCE = Object.freeze({
  minimoNacional: 25383, // desde 1-jul-2026 (nominal); $24.572 desde ene-2026
  medianaLiquidoAprox: 45000, // aproximado, con incertidumbre (INE publica ingreso, no un "líquido" único)
})

export const COST_SOURCES: ReadonlyArray<{ label: string; url: string }> = Object.freeze([
  {
    label: 'MTSS — Salario Mínimo Nacional 2026',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/comunicacion/noticias/salario-minimo-nacional-24572-desde-1o-enero-2026',
  },
  {
    label:
      'INE — Estimación de la pobreza por el método del ingreso, año 2025 (CBA/CBT per cápita)',
    url: 'https://www5.ine.gub.uy/documents/Demograf%C3%ADayEESS/HTML/ECH/Pobreza/2025/Informe%20pobreza%20Anual-2025.html',
  },
  {
    label: 'INE — Ingresos de los hogares y de las personas, primer trimestre 2026',
    url: 'https://www5.ine.gub.uy/documents/Demograf%C3%ADayEESS/HTML/ECH/Ingresos/2026/Informe_Ingresos_T1_2026.html',
  },
  {
    label: 'INE — Indicadores de Actividad Inmobiliaria: mercado de alquileres, junio 2026',
    url: 'https://www5.ine.gub.uy/documents/Estad%C3%ADsticasecon%C3%B3micas/HTML/IAI/Alquileres/2026/IAI%20Alquileres%20Junio%202026.html',
  },
  {
    label: 'INE — Series históricas IAI Alquileres (promedio por departamento y localidad)',
    url: 'https://www.gub.uy/instituto-nacional-estadistica/datos-y-estadisticas/estadisticas/series-historicas-indicadores-actividad-inmobiliaria-iai-alquileres',
  },
  {
    label: 'InfoCasas — Alquiler de apartamentos en Montevideo',
    url: 'https://www.infocasas.com.uy/alquiler/apartamentos/montevideo',
  },
  {
    label: 'Intendencia de Montevideo — Tarifas del transporte (STM)',
    url: 'https://montevideo.gub.uy/areas-tematicas/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano',
  },
  {
    label: 'UTE — Pliego tarifario 2026',
    url: 'https://www.ute.com.uy/sites/default/files/docs/Pliego%20Tarifario%20Enero%202026.pdf',
  },
  {
    label: 'BPS — Afiliación mutual (FONASA)',
    url: 'https://www.bps.gub.uy/6486/afiliacion-mutual-trabajadores.html',
  },
])

// ─────────────────────────────────────────────────────────────────────────────
// DATOS OFICIALES DEL INE
//
// Nada de lo que sigue es una estimación nuestra: son valores publicados, con
// su fecha y su región. Viven aparte de COST_MODEL a propósito, porque
// responden otra pregunta: COST_MODEL arma un presupuesto realista; las
// canastas del INE son UMBRALES DE POBREZA. Publicarlas como "lo que cuesta
// vivir" sería exactamente el error que el sitio se niega a cometer
// (ver personalFinanceFaq: "costo-vida-no-es-ipc").
// ─────────────────────────────────────────────────────────────────────────────

/** Valores per cápita de las canastas del INE, para una región. */
export interface PerCapitaLines {
  /** Canasta Básica Alimentaria per cápita = línea de INDIGENCIA. */
  cba: number
  /** Canasta Básica No Alimentaria per cápita, hogares inquilinos (incluye el alquiler). */
  cbnaInquilinos: number
  /** CBNA per cápita, hogares NO inquilinos (nunca incluye valor locativo). */
  cbnaNoInquilinos: number
  /** Canasta Básica Total per cápita = línea de POBREZA, inquilinos. */
  cbtInquilinos: number
  /** CBT per cápita = línea de pobreza, no inquilinos. */
  cbtNoInquilinos: number
}

/**
 * Líneas per cápita publicadas por el INE (metodología LP 2017), últimos valores
 * del informe anual: diciembre de 2025. El INE publica DOS regiones —Montevideo
 * e Interior— y cuatro líneas de pobreza, porque la canasta no alimentaria se
 * diferencia según seas inquilino o no.
 */
export const INE_PER_CAPITA_LINES: Readonly<Record<City, PerCapitaLines>> = Object.freeze({
  montevideo: Object.freeze({
    cba: 6628,
    cbnaInquilinos: 18004,
    cbnaNoInquilinos: 8545,
    cbtInquilinos: 24632,
    cbtNoInquilinos: 15173,
  }),
  interior: Object.freeze({
    cba: 5685,
    cbnaInquilinos: 14116,
    cbnaNoInquilinos: 7510,
    cbtInquilinos: 19800,
    cbtNoInquilinos: 13194,
  }),
})

/** Mes al que corresponden los valores de INE_PER_CAPITA_LINES. */
export const INE_LINES_PERIOD = 'diciembre de 2025'

/**
 * Cuánto más barato come el interior, según el propio INE: es la relación entre
 * las dos Canastas Básicas Alimentarias per cápita que publica (interior /
 * Montevideo). Se deriva de INE_PER_CAPITA_LINES en vez de escribirse a mano
 * para que no pueda desfasarse de los valores publicados.
 *
 * Vive fuera de COST_MODEL a propósito: no es una estimación nuestra que Gemini
 * pueda refrescar, es una relación de precios publicada. La CBA es la línea de
 * indigencia y no lo que gasta una persona real, pero la RELACIÓN entre regiones
 * es exactamente lo que el INE mide al costear la misma canasta en las dos.
 */
export const INTERIOR_FOOD_FACTOR =
  INE_PER_CAPITA_LINES.interior.cba / INE_PER_CAPITA_LINES.montevideo.cba

/**
 * Línea de pobreza DEL HOGAR según cantidad de integrantes (INE, valores
 * actualizados a enero de 2025). Está acá porque es la confusión más común:
 * la línea del hogar NO es la per cápita multiplicada por la cantidad de
 * personas — hay economías de escala. Índice 0 = 1 persona.
 */
export const INE_HOUSEHOLD_LINES: Readonly<
  Record<City, { inquilinos: readonly number[]; noInquilinos: readonly number[] }>
> = Object.freeze({
  montevideo: Object.freeze({
    inquilinos: Object.freeze([23446, 39192, 54217]),
    noInquilinos: Object.freeze([14584, 28059, 41169]),
  }),
  interior: Object.freeze({
    inquilinos: Object.freeze([18951, 31086, 42053]),
    noInquilinos: Object.freeze([12703, 23520, 33799]),
  }),
})

/** Mes al que corresponden los valores de INE_HOUSEHOLD_LINES. */
export const INE_HOUSEHOLD_LINES_PERIOD = 'enero de 2025'

/**
 * Incidencia de la pobreza y de la indigencia por región (INE, año 2025).
 * Ojo con la asimetría: el INE mide la incidencia en cuatro aperturas, pero
 * publica canastas para dos regiones.
 */
export const INE_POVERTY_2025 = Object.freeze({
  year: 2025,
  /** % de personas bajo la línea de pobreza. */
  personas: Object.freeze({
    pais: 16.6,
    montevideo: 18.7,
    interior: 15.3,
    interiorLocalidadesGrandes: 14.9,
    interiorPequenasYRural: 16.6,
  }),
  /** % de hogares bajo la línea de pobreza. */
  hogares: Object.freeze({
    pais: 13.2,
    montevideo: 14.1,
    interior: 12.5,
    interiorLocalidadesGrandes: 12.3,
    interiorPequenasYRural: 13.2,
  }),
  /** % de personas bajo la línea de indigencia. */
  indigenciaPersonas: Object.freeze({
    pais: 1.7,
    montevideo: 2.3,
    interior: 1.3,
    interiorLocalidadesGrandes: 1.4,
    interiorPequenasYRural: 0.9,
  }),
  /** Departamentos con mayor incidencia de pobreza en los hogares. */
  departamentosMasAltos: Object.freeze(['Cerro Largo', 'Rivera', 'Artigas']),
  /** Departamentos con menor incidencia. Maldonado está acá: pobreza baja no es "barato". */
  departamentosMasBajos: Object.freeze(['San José', 'Maldonado', 'Colonia', 'Flores']),
})

/**
 * Ingreso de los hogares por región (INE, ingreso disponible ajustado, a valores
 * corrientes, sin aguinaldo y sin valor locativo). Sirve para dimensionar: un
 * mismo sueldo pesa distinto en Montevideo que en el interior.
 */
export const INE_HOUSEHOLD_INCOME = Object.freeze({
  period: 'primer trimestre de 2026',
  medioHogar: Object.freeze({ pais: 97541, montevideo: 117551, interior: 84076 }),
  medianaHogar: Object.freeze({ pais: 73000, montevideo: 84179, interior: 66000 }),
  medioPerCapita: Object.freeze({ pais: 34606, montevideo: 43515, interior: 29017 }),
  medianaPerCapita: Object.freeze({ pais: 29000, montevideo: 36540, interior: 25400 }),
})

export interface DepartmentRent {
  departamento: string
  /** Promedio de los contratos VIGENTES (muchos arrancaron hace años). */
  vigentes: number
  /** Promedio de los contratos NUEVOS del mes: es lo que se está firmando hoy. */
  nuevos: number
}

/**
 * Alquiler promedio por departamento (INE — Indicadores de Actividad
 * Inmobiliaria, mercado de alquileres, junio 2026; media recortada al 95%).
 *
 * De los precios que hacen al costo de vivir, es el que el INE sí abre
 * departamento por departamento: las canastas (CBA/CBT) y el ingreso de los
 * hogares los publica por región (Montevideo / Interior), no por los 19
 * departamentos. Por eso la calculadora es regional y esta tabla es referencia,
 * no un modelo. (No es "el único precio que publica el Estado por
 * departamento": el MGAP-DIEA, por ejemplo, publica el precio de la tierra en
 * USD/ha por departamento.)
 */
export const INE_RENT_BY_DEPARTMENT: ReadonlyArray<DepartmentRent> = Object.freeze([
  Object.freeze({ departamento: 'Artigas', vigentes: 15893, nuevos: 14611 }),
  Object.freeze({ departamento: 'Canelones', vigentes: 22019, nuevos: 22497 }),
  Object.freeze({ departamento: 'Cerro Largo', vigentes: 14572, nuevos: 15313 }),
  Object.freeze({ departamento: 'Colonia', vigentes: 15031, nuevos: 14724 }),
  Object.freeze({ departamento: 'Durazno', vigentes: 19158, nuevos: 17505 }),
  Object.freeze({ departamento: 'Flores', vigentes: 16468, nuevos: 15188 }),
  Object.freeze({ departamento: 'Florida', vigentes: 16929, nuevos: 15260 }),
  Object.freeze({ departamento: 'Lavalleja', vigentes: 14735, nuevos: 15311 }),
  Object.freeze({ departamento: 'Maldonado', vigentes: 22959, nuevos: 26790 }),
  Object.freeze({ departamento: 'Montevideo', vigentes: 23442, nuevos: 23814 }),
  Object.freeze({ departamento: 'Paysandú', vigentes: 16713, nuevos: 16259 }),
  Object.freeze({ departamento: 'Río Negro', vigentes: 17345, nuevos: 18399 }),
  Object.freeze({ departamento: 'Rivera', vigentes: 14365, nuevos: 14984 }),
  Object.freeze({ departamento: 'Rocha', vigentes: 14914, nuevos: 16560 }),
  Object.freeze({ departamento: 'Salto', vigentes: 16286, nuevos: 15881 }),
  Object.freeze({ departamento: 'San José', vigentes: 15507, nuevos: 15787 }),
  Object.freeze({ departamento: 'Soriano', vigentes: 16689, nuevos: 17189 }),
  Object.freeze({ departamento: 'Tacuarembó', vigentes: 16439, nuevos: 18683 }),
  Object.freeze({ departamento: 'Treinta y Tres', vigentes: 15100, nuevos: 15783 }),
])

/** Mes de los datos de alquiler del INE. */
export const INE_RENT_PERIOD = 'junio de 2026'

/** Totales país del mismo boletín, con la letra chica de qué mide el indicador. */
export const INE_RENT_COUNTRY = Object.freeze({
  vigentes: 22245,
  nuevos: 22418,
  contratosVigentes: 149789,
  /** De esos contratos, los de Montevideo: el boletín los publica aparte. */
  contratosVigentesMontevideo: 106086,
  /** Cobertura del mercado de alquileres alcanzada por los registros usados (1er sem. 2025). */
  coberturaMercado: 0.554,
  fuentes: 'garantías de SGA (Contaduría General de la Nación), ANDA, Mapfre, Porto y Sancor',
  /**
   * Lo que el INE dice, textual, sobre el desfasaje de los contratos vigentes.
   * Está acá para que la UI no pueda "mejorarlo": el boletín no dice para qué
   * lado está desfasado el precio, y de hecho los contratos nuevos del mes
   * quedaron apenas por encima de los vigentes.
   */
  advertenciaDesfasaje:
    'los contratos vigentes pueden tener varios años desde que fueron iniciados, por lo cual el precio que pagan podría estar desfasado respecto de los precios que se tranzan actualmente en el mercado de arrendamientos',
})

/**
 * Reparto de los contratos vigentes por departamento, tal como lo publica el
 * boletín (junio 2026, sobre 149.789 contratos). Es lo que separa "el
 * departamento típico" del "inquilino típico": el interior tiene 18
 * departamentos, pero más de la mitad de sus contratos están en los dos más
 * caros. Sólo están los que el boletín enumera.
 */
export const INE_RENT_CONTRACT_SHARE: Readonly<Record<string, number>> = Object.freeze({
  Montevideo: 0.7082,
  Canelones: 0.1164,
  Maldonado: 0.042,
  Colonia: 0.027,
  Paysandú: 0.0196,
  'San José': 0.0189,
})

/**
 * Promedio de contratos vigentes por localidad en Maldonado (mismo boletín del
 * INE, serie LocalidadPromedio). Es lo que convierte la excepción de Punta del
 * Este de un comentario en el código a un dato: dentro de un mismo departamento
 * hay el doble de brecha que entre Montevideo y el promedio del interior.
 *
 * Están LAS TRECE filas que el INE publica para Maldonado, incluida la de
 * "Resto de localidades": una selección de las cinco más conocidas dejaba
 * afuera Bella Vista ($27.619), que es la tercera más cara del departamento, y
 * elegir cuáles se muestran es elegir la conclusión.
 */
export const INE_RENT_MALDONADO_LOCALITIES: ReadonlyArray<{
  localidad: string
  vigentes: number
}> = Object.freeze([
  Object.freeze({ localidad: 'Punta Ballena', vigentes: 34859 }),
  Object.freeze({ localidad: 'Punta del Este', vigentes: 31607 }),
  Object.freeze({ localidad: 'Bella Vista', vigentes: 27619 }),
  Object.freeze({ localidad: 'Piriápolis', vigentes: 25086 }),
  Object.freeze({ localidad: 'Resto de localidades', vigentes: 24168 }),
  Object.freeze({ localidad: 'Playa Grande', vigentes: 23558 }),
  Object.freeze({ localidad: 'Balneario Buenos Aires', vigentes: 22645 }),
  Object.freeze({ localidad: 'Playa Hermosa', vigentes: 22303 }),
  Object.freeze({ localidad: 'Ciudad de Maldonado', vigentes: 21941 }),
  Object.freeze({ localidad: 'Villa Delia', vigentes: 20873 }),
  Object.freeze({ localidad: 'Barrio Hipódromo', vigentes: 18590 }),
  Object.freeze({ localidad: 'San Carlos', vigentes: 17587 }),
  Object.freeze({ localidad: 'Pan de Azúcar', vigentes: 16459 }),
])

const uyu = (n: number) => '$' + Math.round(n).toLocaleString('es-UY')
/** Porcentaje con coma decimal, como se escribe en Uruguay: 18,7%. */
export const pct = (n: number) =>
  n.toLocaleString('es-UY', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'

/**
 * Cómo nombrar la región DENTRO de una oración. CITY_LABELS son etiquetas de
 * botón ("Interior"); esto es prosa ("el interior").
 */
export const CITY_PROSE: Readonly<Record<City, string>> = Object.freeze({
  montevideo: 'Montevideo',
  interior: 'el interior',
})

/** La línea oficial que le corresponde a un caso concreto (región + tenencia). */
export function officialLinesFor(
  city: City,
  housing: Housing
): {
  region: City
  tenencia: 'inquilinos' | 'no inquilinos'
  /** CBA per cápita = línea de indigencia. */
  cba: number
  /** CBT per cápita = línea de pobreza. */
  cbt: number
  /** Parte no alimentaria de esa CBT. */
  cbna: number
  period: string
} {
  const lines = INE_PER_CAPITA_LINES[city]
  const alquila = housing === 'alquila'
  return {
    region: city,
    tenencia: alquila ? 'inquilinos' : 'no inquilinos',
    cba: lines.cba,
    cbt: alquila ? lines.cbtInquilinos : lines.cbtNoInquilinos,
    cbna: alquila ? lines.cbnaInquilinos : lines.cbnaNoInquilinos,
    period: INE_LINES_PERIOD,
  }
}

/**
 * Resumen del alquiler por departamento: extremos, mediana del interior y brecha.
 *
 * OJO con `medianaInterior` / `ratio`: son CÁLCULO PROPIO sobre la serie del INE
 * (mediana no ponderada de los 18 promedios departamentales) y describen a los
 * departamentos, no a los inquilinos. El descuento que aplica la calculadora NO
 * sale de acá — sale de interiorRentWeighted(), que pondera por cantidad de
 * contratos.
 */
export function interiorRentSpread(): {
  montevideo: DepartmentRent
  masBarato: DepartmentRent
  masCaro: DepartmentRent
  /** Mediana (no ponderada) de los 18 departamentos del interior, contratos vigentes. */
  medianaInterior: number
  /** medianaInterior / Montevideo. No es el factor del modelo. */
  ratio: number
  ordenados: DepartmentRent[]
} {
  const montevideo = INE_RENT_BY_DEPARTMENT.find(d => d.departamento === 'Montevideo')!
  const interior = INE_RENT_BY_DEPARTMENT.filter(d => d.departamento !== 'Montevideo')
  const ordenados = [...interior].sort((a, b) => a.vigentes - b.vigentes)
  const mid = ordenados.length / 2
  const medianaInterior =
    ordenados.length % 2 === 0
      ? (ordenados[mid - 1]!.vigentes + ordenados[mid]!.vigentes) / 2
      : ordenados[Math.floor(mid)]!.vigentes
  return {
    montevideo,
    masBarato: ordenados[0]!,
    masCaro: ordenados[ordenados.length - 1]!,
    medianaInterior,
    ratio: medianaInterior / montevideo.vigentes,
    ordenados,
  }
}

/**
 * El alquiler promedio del interior PONDERADO por cantidad de contratos, que es
 * lo que la calculadora usa como descuento regional.
 *
 * CÁLCULO PROPIO, no un dato publicado: el INE no publica un promedio
 * "interior". Se despeja de dos cosas que sí publica en el mismo boletín —el
 * promedio y la cantidad de contratos del total país, y los de Montevideo—:
 *   interior = (país × contratos país − Montevideo × contratos MVD) / resto
 *
 * Da $19.339 sobre 43.703 contratos = 0,825 del promedio de Montevideo. La
 * mediana de los 18 departamentos (interiorRentSpread().ratio ≈ 0,70) es mucho
 * más baja porque cuenta departamentos en vez de contratos.
 */
export function interiorRentWeighted(): {
  /** Promedio implícito del interior, contratos vigentes (UYU). */
  promedio: number
  /** Cantidad de contratos vigentes fuera de Montevideo. */
  contratos: number
  /** promedio / Montevideo: el factor que usa el modelo. */
  ratio: number
  /** Qué parte de los contratos del interior son Canelones + Maldonado. */
  concentracionCanelonesMaldonado: number
} {
  const mvd = INE_RENT_BY_DEPARTMENT.find(d => d.departamento === 'Montevideo')!
  const contratos =
    INE_RENT_COUNTRY.contratosVigentes - INE_RENT_COUNTRY.contratosVigentesMontevideo
  const promedio =
    (INE_RENT_COUNTRY.vigentes * INE_RENT_COUNTRY.contratosVigentes -
      mvd.vigentes * INE_RENT_COUNTRY.contratosVigentesMontevideo) /
    contratos
  const shareInterior = 1 - INE_RENT_CONTRACT_SHARE.Montevideo!
  return {
    promedio,
    contratos,
    ratio: promedio / mvd.vigentes,
    concentracionCanelonesMaldonado:
      (INE_RENT_CONTRACT_SHARE.Canelones! + INE_RENT_CONTRACT_SHARE.Maldonado!) / shareInterior,
  }
}

/**
 * La excepción que hasta ahora vivía en un comentario del código. Se construye
 * con los valores del INE para que el texto no pueda desfasarse de los datos.
 */
export const MALDONADO_EXCEPTION = Object.freeze({
  title: 'Maldonado y Punta del Este son la excepción',
  paragraphs: Object.freeze(
    (() => {
      const dept = (n: string) => INE_RENT_BY_DEPARTMENT.find(d => d.departamento === n)!
      const loc = (n: string) => INE_RENT_MALDONADO_LOCALITIES.find(l => l.localidad === n)!
      const mal = dept('Maldonado')
      const mvd = dept('Montevideo')
      const masBarata = [...INE_RENT_MALDONADO_LOCALITIES]
        .filter(l => l.localidad !== 'Resto de localidades')
        .sort((a, b) => a.vigentes - b.vigentes)[0]!
      return [
        `"El interior es más barato" deja de valer en la costa de Maldonado. En ${INE_RENT_PERIOD} el promedio del departamento (${uyu(mal.vigentes)}) quedó prácticamente al nivel de Montevideo (${uyu(mvd.vigentes)}), y en los contratos nuevos —lo que se está firmando hoy— lo pasó: ${uyu(mal.nuevos)} contra ${uyu(mvd.nuevos)}.`,
        `Adentro del departamento la brecha es todavía mayor: Punta del Este promedia ${uyu(loc('Punta del Este').vigentes)} y Punta Ballena ${uyu(loc('Punta Ballena').vigentes)}, mientras ${masBarata.localidad} está en ${uyu(masBarata.vigentes)}. Elegir la localidad pesa más que elegir el departamento.`,
        'Un dato legal que conviene saber, no una explicación de estos precios: el alquiler de temporada tiene régimen aparte. El Decreto-Ley 14.219 (art. 28, lit. A, con la redacción de la Ley 20.352) considera "contrato por temporada" el arrendamiento en zonas turísticas cuyo plazo no supere los 120 días, y le saca las protecciones del régimen general de arrendamientos. Ojo: esos contratos ni siquiera entran en estos promedios, que se arman con registros de garantías de arrendamientos comunes. Por qué la costa está tan cara, este dato no lo dice.',
      ]
    })()
  ),
  sourceUrl: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974/28',
})

/**
 * Notas cualitativas de la región elegida. Cualitativas a propósito: el INE
 * publica canastas para dos regiones, así que un multiplicador por
 * departamento sería inventado.
 */
export function regionalNotes(city: City): string[] {
  const spread = interiorRentSpread()
  const weighted = interiorRentWeighted()
  if (city === 'interior') {
    // Se redondea el DESCUENTO, no el factor: con 0,825 justo, redondear el
    // factor daría 83% y un descuento del 17%, que no cierra con el 82% que
    // muestra la misma nota.
    const descuento = Math.round((1 - COST_MODEL.interiorRentFactor) * 100)
    const canelones = INE_RENT_BY_DEPARTMENT.find(d => d.departamento === 'Canelones')!
    const maldonado = INE_RENT_BY_DEPARTMENT.find(d => d.departamento === 'Maldonado')!
    return [
      `"Interior" acá es la región que usa el INE, no tu departamento. La calculadora aplica un alquiler ${descuento}% menor que el de Montevideo. Ese número es cálculo propio sobre los agregados del INE de ${INE_RENT_PERIOD} —el INE no publica un promedio del interior—: despejando sus ${weighted.contratos.toLocaleString('es-UY')} contratos vigentes fuera de Montevideo da ${uyu(weighted.promedio)} contra ${uyu(spread.montevideo.vigentes)}.`,
      `La mediana de los 18 departamentos es más baja (${uyu(spread.medianaInterior)}, el ${Math.round(spread.ratio * 100)}% de Montevideo), pero describe departamentos, no inquilinos: Canelones (${uyu(canelones.vigentes)}) y Maldonado (${uyu(maldonado.vigentes)}) concentran el ${Math.round(weighted.concentracionCanelonesMaldonado * 100)}% de los contratos del interior y alquilan casi como Montevideo. Por eso el descuento que usamos es el promedio ponderado y no la mediana.`,
      `El rango real es enorme: de ${uyu(spread.masBarato.vigentes)} en ${spread.masBarato.departamento} a ${uyu(spread.masCaro.vigentes)} en ${spread.masCaro.departamento}. Mirá la tabla y corregí a ojo si tu departamento está lejos del promedio.`,
      `La comida sí baja: el INE cuesta la misma canasta alimentaria en las dos regiones y en el interior sale ${Math.round((1 - INTERIOR_FOOD_FACTOR) * 100)}% menos (CBA per cápita ${uyu(INE_PER_CAPITA_LINES.interior.cba)} contra ${uyu(INE_PER_CAPITA_LINES.montevideo.cba)}, ${INE_LINES_PERIOD}), así que la calculadora aplica esa relación al gasto en alimentación.`,
      `Servicios, salud y varios quedan iguales en las dos regiones: las tarifas de UTE, OSE y Antel son las mismas en todo el país, y de salud el INE no publica una apertura regional de precios. Más fino que Montevideo / Interior no hay: las canastas y el ingreso de los hogares se publican para esas dos regiones y nada más.`,
      `Que un departamento tenga poca pobreza no lo hace barato: en ${INE_POVERTY_2025.year} los de menor incidencia fueron ${INE_POVERTY_2025.departamentosMasBajos.slice(0, -1).join(', ')} y ${INE_POVERTY_2025.departamentosMasBajos.at(-1)}, y Maldonado —que está en esa lista— es de los más caros para alquilar.`,
    ]
  }
  return [
    `Montevideo tiene su propia canasta oficial: la línea de pobreza per cápita de un hogar inquilino es ${uyu(INE_PER_CAPITA_LINES.montevideo.cbtInquilinos)} contra ${uyu(INE_PER_CAPITA_LINES.interior.cbtInquilinos)} en el interior (INE, ${INE_LINES_PERIOD}).`,
    `También es la región donde más pesa el alquiler: el promedio de los contratos vigentes es ${uyu(spread.montevideo.vigentes)}, el más alto del país (INE, ${INE_RENT_PERIOD}).`,
    `Y donde la pobreza pega más fuerte: ${pct(INE_POVERTY_2025.personas.montevideo)} de las personas contra ${pct(INE_POVERTY_2025.personas.interior)} en el interior (INE, año ${INE_POVERTY_2025.year}).`,
  ]
}

/**
 * Explicación de las canastas oficiales, armada con los valores de la región
 * elegida. Responde "¿cuánto es la canasta básica?" sin convertirla en "lo que
 * cuesta vivir": son cosas distintas y el texto lo dice.
 */
export function basketExplainer(city: City): {
  intro: string
  items: Array<{ label: string; value: string; detail: string }>
  caveats: string[]
} {
  const l = INE_PER_CAPITA_LINES[city]
  const region = CITY_PROSE[city]
  const hh = INE_HOUSEHOLD_LINES[city]
  return {
    intro: `Valores del INE para ${region}, ${INE_LINES_PERIOD}, per cápita y por mes. Son umbrales de medición de la pobreza, no un presupuesto: nadie vive con la CBA.`,
    items: [
      {
        label: 'CBA — Canasta Básica Alimentaria',
        value: uyu(l.cba),
        detail:
          'Sólo comida, y en el mínimo. Es la línea de INDIGENCIA: por debajo de eso un hogar no cubre ni las calorías básicas.',
      },
      {
        label: 'CBT — Canasta Básica Total, inquilinos',
        value: uyu(l.cbtInquilinos),
        detail: `CBA + canasta no alimentaria de inquilinos (${uyu(l.cbnaInquilinos)}), que sí incluye el alquiler. Es la línea de POBREZA si alquilás.`,
      },
      {
        label: 'CBT — Canasta Básica Total, no inquilinos',
        value: uyu(l.cbtNoInquilinos),
        detail: `CBA + canasta no alimentaria de no inquilinos (${uyu(l.cbnaNoInquilinos)}), que nunca incluye valor locativo. Es la línea de POBREZA si no pagás alquiler.`,
      },
    ],
    caveats: [
      `Per cápita no se multiplica por la cantidad de gente. La línea de un hogar de 3 personas en ${region} es ${uyu(hh.inquilinos[2]!)} si es inquilino, no tres veces la per cápita: hay economías de escala (INE, valores a ${INE_HOUSEHOLD_LINES_PERIOD}; 1 persona ${uyu(hh.inquilinos[0]!)}, 2 personas ${uyu(hh.inquilinos[1]!)}).`,
      'Estar por encima de la línea de pobreza no quiere decir que te alcance. La CBT es el piso para no ser contado como pobre en una estadística, no un estándar de vida.',
      `La canasta también depende de si alquilás: en ${region} la línea del inquilino es ${Math.round((l.cbtInquilinos / l.cbtNoInquilinos - 1) * 100)}% más alta que la del no inquilino. El INE publica cuatro líneas por eso.`,
    ],
  }
}

/** Household composition derived from the situation. */
export function household(inputs: BudgetInputs): { adults: number; children: number } {
  const kids = inputs.situation === 'familia' ? Math.max(0, Math.floor(inputs.children || 0)) : 0
  const adults = inputs.situation === 'pareja' || inputs.situation === 'familia' ? 2 : 1
  return { adults, children: kids }
}

/** Standard dwelling assumed for each situation. */
export function dwellingFor(situation: Situation): DwellingType {
  if (situation === 'compartido') return 'habitacion_compartida'
  if (situation === 'pareja') return '1_dormitorio'
  if (situation === 'familia') return '2_dormitorios'
  return 'monoambiente'
}

export type VerdictTier = 'noAlcanza' | 'ajustado' | 'justo' | 'comodo' | 'holgado'

export interface EssentialLine {
  key: string
  label: string
  amount: number
}

export interface BudgetResult {
  adults: number
  children: number
  dwelling: DwellingType
  essentialLines: EssentialLine[]
  /** Sum of essential lines. */
  essentials: number
  income: number
  /** Suggested monthly savings (0 when money is too tight). */
  savingsSuggested: number
  /** The most you could put aside per month (income − essentials, if you spent nothing on wants). */
  savingsMax: number
  /** Income − essentials − savings; can be negative (a real deficit). */
  discretionary: number
  /** income / essentials. */
  ratio: number
  verdict: VerdictTier
  /** Positive when essentials exceed income (how much is missing per month). */
  deficit: number
}

/** Round to the nearest 100 pesos for tidy display. */
const r100 = (n: number) => Math.round(n / 100) * 100

/**
 * Build a grounded monthly budget for the given situation. Essentials are computed
 * bottom-up from the reference costs (not as a % of income), so the verdict reflects
 * whether the income actually covers a realistic life in that scenario.
 */
export function estimateBudget(inputs: BudgetInputs, model: CostModel = COST_MODEL): BudgetResult {
  const income = Math.max(0, inputs.netIncome || 0)
  const { adults, children } = household(inputs)
  const people = adults + children
  const dwelling = dwellingFor(inputs.situation)
  const zone: MvdZone = inputs.zone ?? 'intermedio'
  const transportMode: TransportMode = inputs.transport ?? 'publico_diario'
  const lifestyle: Lifestyle = inputs.lifestyle ?? 'moderado'
  const healthMode: HealthMode = inputs.health ?? 'fonasa'
  const transitFactor = inputs.city === 'interior' ? model.interiorTransportFactor : 1

  // Rent: interior uses a flat discount; Montevideo uses the chosen zone multiplier.
  let rent = 0
  if (inputs.housing === 'alquila') {
    const geoFactor =
      inputs.city === 'interior' ? model.interiorRentFactor : model.zoneMultiplier[zone]
    rent = model.rentMontevideo[dwelling] * geoFactor
  }

  // Food scales with everyone in the household, the spending style and the
  // region: the INE prices the same food basket in both, and the interior's is
  // cheaper (INTERIOR_FOOD_FACTOR). Services and health stay national.
  const foodPeople = adults + children * model.childFoodFactor
  const foodRegionFactor = inputs.city === 'interior' ? INTERIOR_FOOD_FACTOR : 1
  const food = model.foodPerAdult * foodPeople * model.lifestyleFood[lifestyle] * foodRegionFactor

  // Utilities: base for the dwelling, more people → a bit more; sharing → your share only
  let utilities: number
  if (inputs.situation === 'compartido') {
    utilities = model.utilitiesBase * 0.45
  } else {
    utilities = model.utilitiesBase * (1 + 0.15 * (adults - 1) + 0.1 * children)
  }

  // Transport depends on how the household actually gets around.
  let transport: number
  switch (transportMode) {
    case 'a_pie_bici':
      transport = model.aPieBiciMonthly
      break
    case 'publico_ocasional':
      transport = model.publicoOcasionalMonthly * adults * transitFactor
      break
    case 'auto':
      transport = model.autoMonthly
      break
    case 'auto_publico':
      transport =
        model.autoMonthly + model.publicoOcasionalMonthly * Math.max(0, adults - 1) * transitFactor
      break
    case 'publico_diario':
    default:
      transport = model.transportPerAdult * adults * transitFactor
      break
  }

  // Health: FONASA covers the cuota (only co-pagos); otherwise pay the mutualista cuota.
  const health =
    healthMode === 'particular'
      ? model.mutualistaParticular * people
      : model.healthPerPerson * people
  const misc = model.miscPerPerson * people * model.lifestyleMisc[lifestyle]

  const essentialLines: EssentialLine[] = [
    {
      key: 'vivienda',
      label: inputs.housing === 'alquila' ? 'Alquiler' : 'Vivienda (sin alquiler)',
      amount: r100(rent),
    },
    { key: 'alimentacion', label: 'Alimentación', amount: r100(food) },
    { key: 'servicios', label: 'Servicios (luz, agua, internet)', amount: r100(utilities) },
    { key: 'transporte', label: 'Transporte', amount: r100(transport) },
    { key: 'salud', label: 'Salud (copagos)', amount: r100(health) },
    { key: 'varios', label: 'Higiene, limpieza y varios', amount: r100(misc) },
  ]
  const essentials = essentialLines.reduce((s, l) => s + l.amount, 0)

  const ratio = essentials > 0 ? income / essentials : income > 0 ? Infinity : 0
  const verdict: VerdictTier =
    income < essentials
      ? 'noAlcanza'
      : ratio < 1.15
        ? 'ajustado'
        : ratio < 1.4
          ? 'justo'
          : ratio < 1.8
            ? 'comodo'
            : 'holgado'

  const deficit = Math.max(0, essentials - income)
  // Suggest savings only from the surplus, up to the aspirational rate.
  const surplus = Math.max(0, income - essentials)
  const savingsSuggested = r100(Math.min(surplus, income * model.savingsRate))
  const savingsMax = r100(surplus)
  const discretionary = income - essentials - savingsSuggested

  return {
    adults,
    children,
    dwelling,
    essentialLines,
    essentials,
    income,
    savingsSuggested,
    savingsMax,
    discretionary,
    ratio,
    verdict,
    deficit,
  }
}

export const VERDICT_META: Readonly<
  Record<VerdictTier, { label: string; color: string; emoji: string; message: string }>
> = Object.freeze({
  noAlcanza: {
    label: 'No alcanza',
    color: 'error',
    emoji: '🚫',
    message:
      'Con este ingreso, este escenario no es viable: los gastos esenciales superan lo que entra. No es un fracaso personal, es matemática. Mirá las alternativas de abajo antes de decidir.',
  },
  ajustado: {
    label: 'Muy ajustado',
    color: 'warning',
    emoji: '⚠️',
    message:
      'Alcanza justo para lo esencial, pero casi no queda margen para ahorrar ni para imprevistos. Un gasto inesperado (una muela, el termofón) te complica el mes.',
  },
  justo: {
    label: 'Justo',
    color: 'amber',
    emoji: '➗',
    message:
      'Cubrís lo esencial y te queda algo para ahorro y gustos, pero sin lujos. Cuidar los "gastos hormiga" hace la diferencia.',
  },
  comodo: {
    label: 'Cómodo',
    color: 'info',
    emoji: '👍',
    message:
      'Buen equilibrio: cubrís lo esencial, podés ahorrar de forma sostenida y darte gustos. Buen momento para automatizar el ahorro e invertir una parte.',
  },
  holgado: {
    label: 'Holgado',
    color: 'success',
    emoji: '🎉',
    message:
      'Tenés margen de sobra. Enfocate en ahorrar e invertir en serio (contra la inflación) y en objetivos de largo plazo; el consumo puede crecer sin descontrolar el ahorro.',
  },
})

/** Situation-specific, verdict-aware reality-check tips. */
export function realityChecks(result: BudgetResult, inputs: BudgetInputs): string[] {
  const tips: string[] = []
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-UY')

  if (result.verdict === 'noAlcanza') {
    tips.push(`Faltan ${fmt(result.deficit)} por mes para cubrir lo esencial en este escenario.`)
    if (inputs.situation === 'solo' && inputs.housing === 'alquila') {
      tips.push(
        'Vivir solo alquilando es lo más caro. Compartir apartamento baja el gasto de vivienda a menos de la mitad.'
      )
    }
    if (inputs.city === 'montevideo') {
      const spread = interiorRentSpread()
      tips.push(
        `Un barrio más alejado del centro, o directamente el interior, baja bastante el alquiler: el promedio de Montevideo es ${fmt(spread.montevideo.vigentes)} y el más barato del país es ${spread.masBarato.departamento} con ${fmt(spread.masBarato.vigentes)} (INE, ${INE_RENT_PERIOD}).`
      )
    } else {
      tips.push(
        `Dentro del interior el rango es enorme (de ${fmt(interiorRentSpread().masBarato.vigentes)} a ${fmt(interiorRentSpread().masCaro.vigentes)} de promedio según el departamento): si estás mirando Maldonado o Punta del Este, esta estimación te queda corta.`
      )
    }
    tips.push(
      'Sumar ingresos extra o postergar la mudanza hasta tener un colchón suele ser más sano que empezar endeudado.'
    )
  } else if (result.verdict === 'ajustado') {
    tips.push(
      'Armá un fondo de emergencia aunque sea de a poco: es lo que te salva de la deuda cuando aparece un imprevisto.'
    )
    tips.push(
      'Antes de comprometerte a un alquiler, sumá la garantía y el depósito (suelen ser 1-2 meses cada uno).'
    )
  } else {
    if (result.savingsSuggested > 0) {
      tips.push(
        `Con tu ingreso, apuntar a ahorrar ~${fmt(result.savingsSuggested)}/mes es realista. Automatizalo apenas cobrás.`
      )
    }
    tips.push(
      'Protegé el ahorro de la inflación: una parte en UI o dólares mantiene el poder de compra.'
    )
  }
  if (inputs.housing === 'alquila') {
    tips.push(
      'Como regla, que el alquiler no supere ~30% de tu ingreso; por encima de eso, el resto del presupuesto sufre.'
    )
  }
  return tips
}

export const SITUATION_LABELS: Readonly<Record<Situation, string>> = Object.freeze({
  solo: 'Vivir solo/a',
  compartido: 'Compartir (con roommates)',
  pareja: 'En pareja',
  familia: 'En familia (con hijos)',
})

export const CITY_LABELS: Readonly<Record<City, string>> = Object.freeze({
  montevideo: 'Montevideo',
  interior: 'Interior',
})

export const ZONE_LABELS: Readonly<Record<MvdZone, string>> = Object.freeze({
  economico: 'Económica (Centro, Cordón, La Blanqueada, Cerro…)',
  intermedio: 'Intermedia (media de la ciudad)',
  costa: 'Costa/premium (Pocitos, Punta Carretas, Carrasco…)',
})

export const TRANSPORT_LABELS: Readonly<Record<TransportMode, string>> = Object.freeze({
  a_pie_bici: 'A pie / bici',
  publico_ocasional: 'Bondi ocasional',
  publico_diario: 'Bondi diario (a trabajar)',
  auto: 'Auto propio',
  auto_publico: 'Auto + bondi',
})

export const LIFESTYLE_LABELS: Readonly<Record<Lifestyle, string>> = Object.freeze({
  austero: 'Austero',
  moderado: 'Moderado',
  comodo: 'Cómodo',
})

export const HEALTH_LABELS: Readonly<Record<HealthMode, string>> = Object.freeze({
  fonasa: 'FONASA (por el trabajo)',
  particular: 'Mutualista particular',
})
