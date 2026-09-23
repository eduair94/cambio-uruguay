// El modelo del comparador de transporte diario: qué sale moverse, por mes y por hora.
//
// Este módulo es PURO. No lee la base, no llama a ninguna API y no conoce Vue: entran los insumos
// (precios vivos del snapshot + supuestos curados + el escenario del visitante) y sale el desglose.
// Vive en `app/utils` y no en el backend a propósito: el visitante mueve controles —días por semana,
// financiación, horizonte— y espera que los números cambien en el acto. Mandar cada cambio al
// servidor sería un round-trip por tecla. El job publica INSUMOS; la aritmética corre acá, en el
// navegador y también en SSR, desde la misma función que llevan los tests.
//
// `app/utils/` es un namespace PLANO de auto-imports, así que todo lo exportado lleva prefijo
// `transport`/`TRANSPORT_` salvo los tipos del dominio.
//
// LA DECISIÓN CENTRAL, y la que hace que la página no mienta: el costo de un vehículo NO es una
// cuota mensual. Es plata que se pone adelante, plata que se paga todos los meses, y valor que se
// recupera al venderlo. Por eso todo se calcula como COSTO ACUMULADO mes a mes
// (`transportCumulativeCost`) y el "costo mensual" es ese acumulado dividido por el horizonte, nunca
// una suma de cuotas. Es lo único que permite comparar contra el ómnibus, que no tiene ni inversión
// ni valor de reventa, y es lo que hace que el punto de equilibrio sea un cruce real de dos curvas y
// no una división.

export type TransportMode = 'omnibus' | 'pie' | 'monopatin' | 'bici' | 'moto' | 'auto'

export const TRANSPORT_MODES: readonly TransportMode[] = [
  'omnibus',
  'pie',
  'monopatin',
  'bici',
  'moto',
  'auto',
]

/** Los modos que se compran. El ómnibus y caminar no tienen inversión, seguro ni patente. */
export const TRANSPORT_VEHICLE_MODES: readonly TransportMode[] = [
  'monopatin',
  'bici',
  'moto',
  'auto',
]

/** Una cifra que no sale de un catálogo vivo viaja siempre con su fecha y su fuente. */
export interface TransportFigure<T = number> {
  value: T
  /** ISO date de la vigencia del dato, no de cuándo se leyó. */
  asOf: string
  source: string
  sourceUrl: string
  note?: string
}

export type TransportEnergyKind = 'nafta' | 'gasoil' | 'electrica' | 'ninguna'

/** Lo curado por modo: todo lo que no publica ningún catálogo del sitio. */
export interface TransportModeAssumptions {
  mode: TransportMode
  label: string
  /** Casco, candado, chaleco: lo que hay que comprar sí o sí además del vehículo. */
  equipmentUyu: TransportFigure
  /** Empadronamiento, chapa, libreta: trámites de una sola vez. */
  paperworkUyu: TransportFigure
  /** SOA u obligatorio equivalente, por año. `null` donde no existe. */
  insuranceUyu: TransportFigure | null
  /**
   * Patente de rodados, por año, como MÍNIMO en pesos. `null` donde no hay cifra publicable.
   *
   * Para una moto de menos de 500 cc es `null` a propósito y no por falta de trabajo: el Texto
   * Ordenado del SUCIVE 2026 manda ese segmento a "la patente de 2025 ajustada por IPC", fijada por
   * la intendencia del primer empadronamiento. No existe tabla nacional, así que cualquier número
   * que publicáramos ahí sería inventado. La página lo dice y enlaza la consulta por matrícula.
   */
  roadTaxUyu: TransportFigure | null
  /**
   * Porcentaje del valor del vehículo que paga de patente, cuando la norma lo fija así (categoría A
   * del SUCIVE: 4,5 % del valor de mercado para usados). Se cobra el mayor entre esto y el mínimo.
   */
  roadTaxRateOfPrice: TransportFigure | null
  /** Service y mantenimiento que ocurre por tiempo, no por kilómetro (por año). */
  fixedMaintenanceUyu: TransportFigure
  /** Lo que se gasta por kilómetro: cubiertas, pastillas, cadena, aceite. */
  maintenancePerKmUyu: TransportFigure
  energyKind: TransportEnergyKind
  /** L/100 km para nafta y gasoil; kWh/100 km para eléctrico. */
  consumptionPer100Km: TransportFigure
  /** Caída anual del valor de reventa, como fracción. Sólo se usa si no hay una medida viva. */
  annualDepreciation: TransportFigure
  /** Qué fracción de los días de lluvia este modo NO resuelve y termina en ómnibus. */
  rainFallbackShare: TransportFigure
  /** Probabilidad anual de que te lo roben. */
  theftAnnualProbability: TransportFigure
  /** Qué fracción del valor se recupera cuando lo roban (seguro, recupero). */
  theftRecoveryShare: TransportFigure
  /** Minutos por viaje que no son ruta: estacionar, ponerse el casco, poner el candado. */
  accessMinutes: TransportFigure
  /** Velocidad de crucero, para estimar el tiempo cuando no hay ruta medida. */
  cruiseSpeedKmh: TransportFigure
  /** Guardado mensual (garaje, cochera). Cero cuando entra en casa. */
  storageMonthlyUyu: TransportFigure
  /**
   * Qué fracción del valor se pierde EN EL ACTO de vender: publicar el aviso, esperar, regatear, y el
   * hecho de que quien compra usado paga menos que la mediana del catálogo.
   *
   * Existe porque sin esto el modelo dice algo cierto y engañoso a la vez. Medido con los números
   * reales de la primera corrida: un monopatín de $24.000 al contado, contra un boleto de $52 y cinco
   * días por semana, "se paga" en UN mes — porque el primer mes sólo se perdió la depreciación de un
   * mes y el resto del precio sigue siendo un activo. Es verdad si lo vendés esa misma tarde al
   * precio de la mediana, y es falso para cualquier persona real. Con la fricción, y sobre todo con
   * la segunda curva (`cashOutUyu`, la plata que ya pusiste y que nunca baja), la página deja de
   * insinuar que comprar algo es gratis mientras lo tengas.
   *
   * `null` usa {@link TRANSPORT_DEFAULT_RESALE_FRICTION}.
   */
  resaleFriction?: TransportFigure | null
  /**
   * Fallecidos en ese modo en el último informe de UNASEV. Se PUBLICA y NUNCA se convierte a pesos:
   * ponerle precio a la vida del visitante para que cierre la cuenta de la moto es indefendible, y
   * una cifra inventada ahí contamina todo lo demás.
   */
  fatalities: TransportFigure | null
  /**
   * Fallecidos cada 100.000 vehículos de ese tipo. Es un CRUCE nuestro entre UNASEV y el parque del
   * MIEM, no una cifra oficial —ninguna de las dos fuentes lo publica— y por eso viaja aparte del
   * absoluto y con el denominador declarado. `null` donde no hay parque publicado: nadie cuenta
   * cuántas bicicletas ni cuántos monopatines hay en Uruguay, así que para esos modos existe el
   * número de fallecidos y no existe la tasa.
   */
  fatalityPer100kVehicles: TransportFigure | null
}

/** Lo que el job publica y no se curó a mano. */
export interface TransportPrices {
  usdUyu: number
  /** Boleto común de Montevideo con tarjeta, en pesos. */
  busFareUyu: number
  /** Minutos de la ventana de trasbordo del STM. Dentro de la ventana, el segundo ómnibus no se paga. */
  busTransferWindowMin: number
  /** Abono mensual, si lo hay. `null` cuando no se pudo leer. */
  busMonthlyPassUyu: number | null
  naftaSuper95PerLitreUyu: number
  gasoilPerLitreUyu: number
  /** kWh del escalón residencial que corresponde al consumo marginal, con IVA. */
  kwhUyu: number
  /** Precio de compra por modo, en pesos, ya convertido. */
  vehiclePriceUyu: Partial<Record<TransportMode, TransportVehiclePrice>>
  /** TEA anual para financiar, como fracción (0,45 = 45 %). */
  financingTea: number | null
  /** Tope de usura vigente, como fracción. Se usa para avisar, no para calcular. */
  usuryCapTea: number | null
}

export interface TransportVehiclePrice {
  /** Mediana del catálogo, en pesos. */
  referenceUyu: number
  p25Uyu: number | null
  p75Uyu: number | null
  condition: 'nuevo' | 'usado'
  offers: number
  asOf: string | null
  /** Caída anual medida sobre el propio catálogo. Le gana al supuesto curado. */
  measuredAnnualDepreciation: number | null
  source: string
}

export interface TransportTiming {
  /** Minutos de ruta puerta a puerta, sin las penalizaciones del modo. */
  routeMinutes: number
  /** Kilómetros reales de esa ruta (difieren por modo: el auto no toma la ciclovía). */
  routeKm: number
  /** Sólo el ómnibus: caminata + espera + trasbordo. */
  transit?: {
    walkMinutes: number
    waitMinutes: number
    inVehicleMinutes: number
    transfers: number
  }
}

export interface TransportScenario {
  /** Kilómetros de ida. Cuando hay ruta medida por modo, la ruta manda y esto es el respaldo. */
  distanceKm: number
  daysPerWeek: number
  /** Viajes por día: 2 es ida y vuelta; 4 si vuelve a almorzar. */
  tripsPerDay: number
  horizonMonths: number
  financing: 'contado' | 'cuotas'
  financingMonths: number
  /** Si ya tiene el vehículo, la inversión es hundida y la comparación pasa a ser marginal. */
  alreadyOwned: boolean
  /** El destino cae en zona tarifada. */
  parkingPaid: boolean
  /** Tarifa horaria del estacionamiento y horas por viaje. */
  parkingHoursPerTrip: number
  condition: 'nuevo' | 'usado'
  /** Para traducir horas a plata. `null` = apagado, que es el default. */
  wageHourlyUyu: number | null
  includeDepreciation: boolean
  includeTheftRisk: boolean
  includeRain: boolean
}

export const TRANSPORT_DEFAULT_SCENARIO: TransportScenario = {
  distanceKm: 7,
  daysPerWeek: 5,
  tripsPerDay: 2,
  horizonMonths: 36,
  financing: 'cuotas',
  financingMonths: 24,
  alreadyOwned: false,
  parkingPaid: false,
  parkingHoursPerTrip: 4,
  condition: 'usado',
  wageHourlyUyu: null,
  includeDepreciation: true,
  includeTheftRisk: true,
  includeRain: true,
}

/** Supuestos que no dependen del modo. */
export interface TransportGlobalAssumptions {
  /** Días con precipitación al año. */
  rainDaysPerYear: TransportFigure
  /** Tarifa horaria del estacionamiento tarifado. */
  parkingPerHourUyu: TransportFigure
  /** Minutos que se tarda en encontrar lugar donde estacionar un auto en zona céntrica. */
  parkingSearchMinutes: TransportFigure
}

export interface TransportAssumptions {
  global: TransportGlobalAssumptions
  byMode: Record<TransportMode, TransportModeAssumptions>
}

export interface TransportCostBreakdown {
  /** Lo que sale de entrada: vehículo + equipo + trámites. Cero si ya lo tiene. */
  upfrontUyu: number
  /** Lo que se financia y lo que cuesta financiarlo. */
  financedUyu: number
  monthlyInstalmentUyu: number
  financeCostUyu: number
  /** Recurrentes mensuales, desglosados. */
  monthly: {
    insurance: number
    roadTax: number
    fixedMaintenance: number
    storage: number
    energy: number
    kmMaintenance: number
    parking: number
    rainFallbackFare: number
    theftRisk: number
    fare: number
  }
  monthlyRecurringUyu: number
}

export interface TransportModeResult {
  mode: TransportMode
  label: string
  available: boolean
  /** Por qué no se puede comparar este modo, cuando `available` es false. */
  unavailableReason: string | null
  price: TransportVehiclePrice | null
  breakdown: TransportCostBreakdown
  /** Costo acumulado al final de cada mes, ya neto del valor de reventa. */
  cumulativeUyu: number[]
  /** La plata efectivamente puesta al final de cada mes, sin descontar reventa. Nunca baja. */
  cashOutUyu: number[]
  /** El acumulado al horizonte dividido por el horizonte. */
  monthlyAverageUyu: number
  totalHorizonUyu: number
  /** Valor de reventa al final del horizonte. */
  residualUyu: number
  perTripUyu: number
  perKmUyu: number
  doorToDoorMinutes: number
  minutesVsBus: number
  hoursPerYearVsBus: number
  /** Meses hasta que el acumulado de este modo cruza por debajo del del ómnibus. `null` si nunca. */
  breakevenMonths: number | null
  /**
   * Lo mismo pero con la plata puesta, sin acreditar la reventa: cuántos meses hasta que lo gastado
   * en este modo sea menos que lo gastado en boletos. Es el número que le sirve a quien no piensa
   * vender, y siempre es más tardío que `breakevenMonths`.
   */
  cashBreakevenMonths: number | null
  /** Cuando no hay equilibrio: cuánto cuesta cada hora que este modo te ahorra. */
  pricePerHourSavedUyu: number | null
  /** Con `wageHourlyUyu`: el valor del tiempo ahorrado, por mes. */
  timeValueMonthlyUyu: number | null
  /** Costo mensual neto del valor del tiempo. Sólo con sueldo declarado. */
  netOfTimeMonthlyUyu: number | null
  /** Fallecidos del modo en el último informe de UNASEV; `null` donde no se desagrega. */
  fatalities: number | null
  /** Fallecidos cada 100.000 vehículos (cruce propio); `null` sin parque publicado. */
  fatalityPer100kVehicles: number | null
  warnings: string[]
}

export interface TransportCompareInput {
  scenario: TransportScenario
  prices: TransportPrices
  assumptions: TransportAssumptions
  /** Ruta y tiempo medidos por modo. Lo que falte cae a la velocidad de crucero. */
  timing: Partial<Record<TransportMode, TransportTiming>>
}

export interface TransportCompareResult {
  modes: TransportModeResult[]
  /** El modo de referencia contra el que se mide todo. */
  reference: TransportMode
  tripsPerMonth: number
  kmPerMonth: number
  /** Advertencias del escenario entero, no de un modo. */
  warnings: string[]
}

/**
 * Cuánto se pierde al vender, cuando el modo no declara lo suyo. Un 12 % es lo que separa a la
 * mediana de lo que se PIDE (que es lo que publica el catálogo) de lo que efectivamente se cobra
 * después de esperar y regatear. Es un supuesto del sitio y la página lo deja cambiar.
 */
export const TRANSPORT_DEFAULT_RESALE_FRICTION = 0.12

const WEEKS_PER_MONTH = 52 / 12
const MONTHS_TO_PROJECT = 120

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Viajes de UN SENTIDO por mes. `tripsPerDay: 2` ya son ida y vuelta. */
export function transportTripsPerMonth(scenario: TransportScenario): number {
  const days = clamp(scenario.daysPerWeek, 0, 7)
  const trips = clamp(scenario.tripsPerDay, 0, 8)
  return days * trips * WEEKS_PER_MONTH
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * Cuota de un préstamo francés a partir de la TEA. La tasa mensual es la equivalente
 * —`(1+TEA)^(1/12) - 1`—, no la TEA dividida por doce: dividir sobreestima la cuota en tasas altas,
 * que son justo las uruguayas.
 */
export function transportInstalment(principal: number, tea: number | null, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  if (!tea || tea <= 0) return principal / months
  const monthlyRate = (1 + tea) ** (1 / 12) - 1
  if (monthlyRate <= 0) return principal / months
  return (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months)
}

/** Kilómetros de la ruta de un modo, con la distancia declarada como respaldo. */
function kmForMode(mode: TransportMode, input: TransportCompareInput): number {
  const measured = input.timing[mode]?.routeKm
  if (typeof measured === 'number' && measured > 0) return measured
  return Math.max(0, input.scenario.distanceKm)
}

/** Minutos puerta a puerta de un viaje: ruta (medida o estimada) más lo que no es ruta. */
export function transportDoorToDoorMinutes(
  mode: TransportMode,
  input: TransportCompareInput
): number {
  const mode_ = input.assumptions.byMode[mode]
  const measured = input.timing[mode]
  let minutes: number
  if (measured && measured.routeMinutes > 0) {
    minutes = measured.routeMinutes
  } else {
    const speed = mode_.cruiseSpeedKmh.value
    minutes = speed > 0 ? (kmForMode(mode, input) / speed) * 60 : 0
  }
  minutes += mode_.accessMinutes.value
  if (mode === 'auto' && input.scenario.parkingPaid) {
    minutes += input.assumptions.global.parkingSearchMinutes.value
  }
  return round(minutes, 1)
}

/**
 * Qué fracción de los viajes este modo no resuelve por lluvia y termina resolviendo en ómnibus.
 * Los días de lluvia no se reparten parejo en la semana, pero tampoco se concentran en los días
 * hábiles: usar la proporción anual es el supuesto más simple que no inventa estacionalidad.
 */
export function transportRainDisplacedShare(
  mode: TransportMode,
  input: TransportCompareInput
): number {
  if (!input.scenario.includeRain) return 0
  const rainDays = input.assumptions.global.rainDaysPerYear.value
  const share = input.assumptions.byMode[mode].rainFallbackShare.value
  if (rainDays <= 0 || share <= 0) return 0
  return clamp((rainDays / 365) * share, 0, 1)
}

/**
 * Patente anual: el mayor entre el mínimo en pesos y el porcentaje del valor del vehículo.
 *
 * Los dos caminos son norma, no invento. Categoría A del SUCIVE: 4,5 % del valor de mercado para un
 * usado, y "ningún vehículo modelo 1992 o posterior tributará menos que el valor vigente para la
 * banda 1986/1991". El porcentaje se aplica sobre el AFORO oficial, que no es el precio del aviso —
 * la página lo dice al lado del número en vez de hacer pasar la estimación por la cifra exacta, que
 * sólo se sabe consultando la matrícula.
 */
export function roadTaxYearly(assumptions: TransportModeAssumptions, priceUyu: number): number {
  const floor = assumptions.roadTaxUyu?.value ?? 0
  const rate = assumptions.roadTaxRateOfPrice?.value ?? 0
  const fromRate = rate > 0 && priceUyu > 0 ? priceUyu * rate : 0
  return Math.max(floor, fromRate)
}

/** Energía de un mes, en pesos, para los km que efectivamente se hacen en ese modo. */
function monthlyEnergy(mode: TransportMode, km: number, input: TransportCompareInput): number {
  const a = input.assumptions.byMode[mode]
  const per100 = a.consumptionPer100Km.value
  if (per100 <= 0) return 0
  const units = (km / 100) * per100
  switch (a.energyKind) {
    case 'nafta':
      return units * input.prices.naftaSuper95PerLitreUyu
    case 'gasoil':
      return units * input.prices.gasoilPerLitreUyu
    case 'electrica':
      return units * input.prices.kwhUyu
    default:
      return 0
  }
}

/**
 * Caída anual del valor: la medida sobre el propio catálogo le gana siempre al supuesto curado.
 * Que un modo tenga una medida y otro no es lo normal —autos y motos tienen años y avisos de sobra,
 * un monopatín no— y por eso el resultado dice cuál se usó.
 */
export function transportAnnualDepreciation(
  mode: TransportMode,
  input: TransportCompareInput
): { value: number; measured: boolean } {
  const measured = input.prices.vehiclePriceUyu[mode]?.measuredAnnualDepreciation
  if (typeof measured === 'number' && measured > 0 && measured < 0.5) {
    return { value: measured, measured: true }
  }
  return { value: input.assumptions.byMode[mode].annualDepreciation.value, measured: false }
}

function buildBreakdown(
  mode: TransportMode,
  input: TransportCompareInput
): { breakdown: TransportCostBreakdown; warnings: string[] } {
  const { scenario, prices, assumptions } = input
  const a = assumptions.byMode[mode]
  const warnings: string[] = []
  const tripsPerMonth = transportTripsPerMonth(scenario)
  const isVehicle = TRANSPORT_VEHICLE_MODES.includes(mode)

  const displaced = isVehicle ? transportRainDisplacedShare(mode, input) : 0
  const vehicleTrips = tripsPerMonth * (1 - displaced)
  const rainTrips = tripsPerMonth * displaced
  const km = kmForMode(mode, input) * vehicleTrips

  const price = prices.vehiclePriceUyu[mode] ?? null
  const vehicleCost = isVehicle && price ? price.referenceUyu : 0

  const upfrontGross = isVehicle ? vehicleCost + a.equipmentUyu.value + a.paperworkUyu.value : 0
  const upfront = scenario.alreadyOwned ? 0 : upfrontGross

  let financed = 0
  let instalment = 0
  let financeCost = 0
  if (upfront > 0 && scenario.financing === 'cuotas' && scenario.financingMonths > 0) {
    financed = upfront
    instalment = transportInstalment(financed, prices.financingTea, scenario.financingMonths)
    financeCost = instalment * scenario.financingMonths - financed
    if (prices.usuryCapTea && prices.financingTea && prices.financingTea > prices.usuryCapTea) {
      warnings.push('La tasa usada para las cuotas está por encima del tope de usura vigente.')
    }
  }

  // Si ya lo tiene, la comparación es MARGINAL: seguro, patente y depreciación ocurren igual use o
  // no use el vehículo ese día, así que no son parte de la decisión "lo uso o tomo el ómnibus".
  const marginalOnly = scenario.alreadyOwned
  const monthly = {
    insurance: !isVehicle || marginalOnly ? 0 : (a.insuranceUyu?.value ?? 0) / 12,
    roadTax: !isVehicle || marginalOnly ? 0 : roadTaxYearly(a, price?.referenceUyu ?? 0) / 12,
    fixedMaintenance: !isVehicle ? 0 : a.fixedMaintenanceUyu.value / 12,
    storage: !isVehicle || marginalOnly ? 0 : a.storageMonthlyUyu.value,
    energy: monthlyEnergy(mode, km, input),
    kmMaintenance: isVehicle ? km * a.maintenancePerKmUyu.value : 0,
    parking:
      mode === 'auto' && scenario.parkingPaid
        ? vehicleTrips * scenario.parkingHoursPerTrip * assumptions.global.parkingPerHourUyu.value
        : 0,
    rainFallbackFare: rainTrips * prices.busFareUyu,
    theftRisk:
      isVehicle && scenario.includeTheftRisk && price
        ? (price.referenceUyu * a.theftAnnualProbability.value * (1 - a.theftRecoveryShare.value)) /
          12
        : 0,
    fare: mode === 'omnibus' ? tripsPerMonth * prices.busFareUyu : 0,
  }

  if (mode === 'omnibus' && prices.busMonthlyPassUyu && monthly.fare > prices.busMonthlyPassUyu) {
    monthly.fare = prices.busMonthlyPassUyu
    warnings.push(
      'Con esta cantidad de viajes el abono mensual sale menos que pagar boleto por boleto.'
    )
  }

  const monthlyRecurring = Object.values(monthly).reduce((sum, value) => sum + value, 0)

  return {
    breakdown: {
      upfrontUyu: round(upfront),
      financedUyu: round(financed),
      monthlyInstalmentUyu: round(instalment),
      financeCostUyu: round(financeCost),
      monthly: {
        insurance: round(monthly.insurance),
        roadTax: round(monthly.roadTax),
        fixedMaintenance: round(monthly.fixedMaintenance),
        storage: round(monthly.storage),
        energy: round(monthly.energy),
        kmMaintenance: round(monthly.kmMaintenance),
        parking: round(monthly.parking),
        rainFallbackFare: round(monthly.rainFallbackFare),
        theftRisk: round(monthly.theftRisk),
        fare: round(monthly.fare),
      },
      monthlyRecurringUyu: round(monthlyRecurring),
    },
    warnings,
  }
}

/**
 * Costo acumulado al final de cada mes, NETO del valor de reventa.
 *
 * Por qué neto: un auto de US$ 10.000 que a los tres años vale US$ 7.000 no costó US$ 10.000, costó
 * US$ 3.000 más lo que se gastó en usarlo. Restar el valor que todavía tiene es la única manera de
 * que la curva del vehículo pueda cruzar la del ómnibus en algún momento — y de que no la cruce
 * cuando de verdad no la cruza.
 */
export function transportCumulativeCost(
  mode: TransportMode,
  input: TransportCompareInput,
  breakdown: TransportCostBreakdown,
  months: number
): number[] {
  const { scenario } = input
  const series: number[] = []

  // Lo que se pone al contado el mes cero: si se financia, sólo el resto (cero, en la práctica).
  const cashUpfront = breakdown.upfrontUyu - breakdown.financedUyu
  const instalmentMonths = breakdown.financedUyu > 0 ? scenario.financingMonths : 0

  for (let month = 1; month <= months; month += 1) {
    const paid =
      cashUpfront +
      breakdown.monthlyInstalmentUyu * Math.min(month, instalmentMonths) +
      breakdown.monthlyRecurringUyu * month
    // LA DEUDA QUE TODAVÍA SE DEBE ES PARTE DEL COSTO, y olvidarla fue un error real de la primera
    // versión: sin ella, un auto financiado daba costo NEGATIVO el primer mes (se acreditaba el valor
    // entero del auto contra una sola cuota pagada) y la página decía que se pagaba en un mes. Se
    // descuenta el vehículo porque es tuyo desde el día uno, y por eso mismo hay que sumar lo que
    // falta pagar de él.
    const owed = outstandingPrincipal(
      breakdown.financedUyu,
      input.prices.financingTea,
      instalmentMonths,
      month
    )
    series.push(round(paid + owed - transportResidual(mode, input, month)))
  }
  return series
}

/**
 * Saldo deudor de un préstamo francés después de `paid` cuotas, con la fórmula exacta y no una
 * proporción: en una tasa uruguaya, las primeras cuotas son casi todas interés y prorratear el
 * capital sobreestima lo amortizado justo donde la página compara.
 */
export function outstandingPrincipal(
  principal: number,
  tea: number | null,
  months: number,
  paid: number
): number {
  if (principal <= 0 || months <= 0) return 0
  if (paid >= months) return 0
  if (!tea || tea <= 0) return principal * (1 - paid / months)
  const rate = (1 + tea) ** (1 / 12) - 1
  if (rate <= 0) return principal * (1 - paid / months)
  return (principal * ((1 + rate) ** months - (1 + rate) ** paid)) / ((1 + rate) ** months - 1)
}

/** Valor de reventa al mes `month`. */
export function transportResidual(
  mode: TransportMode,
  input: TransportCompareInput,
  month: number
): number {
  if (!TRANSPORT_VEHICLE_MODES.includes(mode)) return 0
  if (!input.scenario.includeDepreciation || input.scenario.alreadyOwned) return 0
  const price = input.prices.vehiclePriceUyu[mode]?.referenceUyu ?? 0
  if (price <= 0) return 0
  const { value: annualDrop } = transportAnnualDepreciation(mode, input)
  const friction =
    input.assumptions.byMode[mode]?.resaleFriction?.value ?? TRANSPORT_DEFAULT_RESALE_FRICTION
  return round(price * (1 - annualDrop) ** (month / 12) * (1 - clamp(friction, 0, 1)))
}

/**
 * La plata que ya saliste a poner, mes a mes. NO descuenta el valor de reventa y por eso nunca baja.
 *
 * Es la otra mitad de la verdad, y la página muestra las dos: `transportCumulativeCost` contesta
 * "cuánto me costó" suponiendo que lo vendo, y esta contesta "cuánta plata puse", que es la pregunta
 * de quien lo va a usar y no lo va a vender.
 */
export function transportCashOut(
  mode: TransportMode,
  input: TransportCompareInput,
  breakdown: TransportCostBreakdown,
  months: number
): number[] {
  const { scenario } = input
  const cashUpfront = breakdown.upfrontUyu - breakdown.financedUyu
  const instalmentMonths = breakdown.financedUyu > 0 ? scenario.financingMonths : 0
  const series: number[] = []
  for (let month = 1; month <= months; month += 1) {
    series.push(
      round(
        cashUpfront +
          breakdown.monthlyInstalmentUyu * Math.min(month, instalmentMonths) +
          breakdown.monthlyRecurringUyu * month
      )
    )
  }
  return series
}

/** Primer mes en que la curva de `mode` queda por debajo de la de referencia. */
export function transportBreakevenMonth(
  modeSeries: readonly number[],
  referenceSeries: readonly number[]
): number | null {
  const length = Math.min(modeSeries.length, referenceSeries.length)
  for (let index = 0; index < length; index += 1) {
    if (modeSeries[index] <= referenceSeries[index]) return index + 1
  }
  return null
}

function emptyBreakdown(): TransportCostBreakdown {
  return {
    upfrontUyu: 0,
    financedUyu: 0,
    monthlyInstalmentUyu: 0,
    financeCostUyu: 0,
    monthly: {
      insurance: 0,
      roadTax: 0,
      fixedMaintenance: 0,
      storage: 0,
      energy: 0,
      kmMaintenance: 0,
      parking: 0,
      rainFallbackFare: 0,
      theftRisk: 0,
      fare: 0,
    },
    monthlyRecurringUyu: 0,
  }
}

function unavailable(mode: TransportMode, label: string, reason: string): TransportModeResult {
  return {
    mode,
    label,
    available: false,
    unavailableReason: reason,
    price: null,
    breakdown: emptyBreakdown(),
    cumulativeUyu: [],
    cashOutUyu: [],
    monthlyAverageUyu: 0,
    totalHorizonUyu: 0,
    residualUyu: 0,
    perTripUyu: 0,
    perKmUyu: 0,
    doorToDoorMinutes: 0,
    minutesVsBus: 0,
    hoursPerYearVsBus: 0,
    breakevenMonths: null,
    cashBreakevenMonths: null,
    pricePerHourSavedUyu: null,
    timeValueMonthlyUyu: null,
    netOfTimeMonthlyUyu: null,
    fatalities: null,
    fatalityPer100kVehicles: null,
    warnings: [],
  }
}

/**
 * La comparación completa.
 *
 * El ómnibus es la referencia, y no por comodidad: es el único modo que todos tienen disponible hoy
 * sin poner un peso adelante, así que es contra lo que se mide cualquier compra. Si el snapshot no
 * trae el boleto, no hay contra qué comparar y la función lo dice en vez de elegir otra referencia
 * en silencio.
 */
export function transportCompare(input: TransportCompareInput): TransportCompareResult {
  const { scenario, prices, assumptions } = input
  const warnings: string[] = []
  const horizon = Math.max(1, Math.round(scenario.horizonMonths))
  const projection = Math.max(horizon, MONTHS_TO_PROJECT)
  const tripsPerMonth = transportTripsPerMonth(scenario)

  if (!prices.busFareUyu || prices.busFareUyu <= 0) {
    warnings.push(
      'Sin el precio del boleto no hay contra qué comparar: se publican los costos de cada modo, no el veredicto.'
    )
  }

  const results: TransportModeResult[] = []
  const seriesByMode = new Map<TransportMode, number[]>()
  const cashByMode = new Map<TransportMode, number[]>()
  const minutesByMode = new Map<TransportMode, number>()

  for (const mode of TRANSPORT_MODES) {
    const modeAssumptions = assumptions.byMode[mode]
    const label = modeAssumptions?.label ?? mode
    if (!modeAssumptions) {
      results.push(unavailable(mode, label, 'No hay supuestos declarados para este modo.'))
      continue
    }
    const isVehicle = TRANSPORT_VEHICLE_MODES.includes(mode)
    const price = prices.vehiclePriceUyu[mode] ?? null
    if (isVehicle && !price && !scenario.alreadyOwned) {
      results.push(
        unavailable(
          mode,
          label,
          'Todavía no relevamos precios de este modo, así que no se publica una cuenta inventada.'
        )
      )
      continue
    }

    const { breakdown, warnings: modeWarnings } = buildBreakdown(mode, input)
    const series = transportCumulativeCost(mode, input, breakdown, projection)
    const cashSeries = transportCashOut(mode, input, breakdown, projection)
    const minutes = transportDoorToDoorMinutes(mode, input)
    seriesByMode.set(mode, series)
    cashByMode.set(mode, cashSeries)
    minutesByMode.set(mode, minutes)

    const totalHorizon = series[horizon - 1] ?? 0
    const kmPerMonthForMode = kmForMode(mode, input) * tripsPerMonth
    results.push({
      mode,
      label,
      available: true,
      unavailableReason: null,
      price,
      breakdown,
      cumulativeUyu: series.slice(0, Math.max(horizon, 60)),
      cashOutUyu: cashSeries.slice(0, Math.max(horizon, 60)),
      monthlyAverageUyu: round(totalHorizon / horizon),
      totalHorizonUyu: round(totalHorizon),
      residualUyu: transportResidual(mode, input, horizon),
      perTripUyu: tripsPerMonth > 0 ? round(totalHorizon / horizon / tripsPerMonth, 1) : 0,
      perKmUyu: kmPerMonthForMode > 0 ? round(totalHorizon / horizon / kmPerMonthForMode, 2) : 0,
      doorToDoorMinutes: minutes,
      minutesVsBus: 0,
      hoursPerYearVsBus: 0,
      breakevenMonths: null,
      cashBreakevenMonths: null,
      pricePerHourSavedUyu: null,
      timeValueMonthlyUyu: null,
      netOfTimeMonthlyUyu: null,
      fatalities: modeAssumptions.fatalities?.value ?? null,
      fatalityPer100kVehicles: modeAssumptions.fatalityPer100kVehicles?.value ?? null,
      warnings: modeWarnings,
    })
  }

  const busSeries = seriesByMode.get('omnibus')
  const busMinutes = minutesByMode.get('omnibus')

  for (const result of results) {
    if (!result.available || result.mode === 'omnibus') continue
    const series = seriesByMode.get(result.mode)
    const minutes = minutesByMode.get(result.mode)
    if (!series || minutes == null) continue

    if (busMinutes != null) {
      result.minutesVsBus = round(minutes - busMinutes, 1)
      // El signo lo dice todo: negativo es tiempo GANADO contra el ómnibus.
      result.hoursPerYearVsBus = round((-result.minutesVsBus * tripsPerMonth * 12) / 60, 1)
    }

    const busCash = cashByMode.get('omnibus')
    const cash = cashByMode.get(result.mode)
    if (busCash && cash && result.breakdown.upfrontUyu > 0) {
      result.cashBreakevenMonths = transportBreakevenMonth(cash, busCash)
    }

    // Un modo sin inversión (caminar) no tiene nada que amortizar: decir "se paga en 1 mes" ahí es
    // ruido, no una respuesta. Es más barato desde el primer día y eso ya lo dice el costo mensual.
    const hasUpfront = result.breakdown.upfrontUyu > 0
    if (busSeries && hasUpfront) {
      result.breakevenMonths = transportBreakevenMonth(series, busSeries)
      const busMonthly = (busSeries[horizon - 1] ?? 0) / horizon
      const extraPerYear = (result.monthlyAverageUyu - busMonthly) * 12
      if (extraPerYear > 0 && result.hoursPerYearVsBus > 0 && result.breakevenMonths == null) {
        // No hay equilibrio: la pregunta deja de ser "cuándo se paga" y pasa a ser "cuánto te sale
        // la hora que ganás". Es la única comparación honesta entre un modo más caro y más rápido y
        // uno más barato y más lento.
        result.pricePerHourSavedUyu = round(extraPerYear / result.hoursPerYearVsBus)
      }
      if (result.breakevenMonths == null && result.hoursPerYearVsBus <= 0) {
        result.warnings.push(
          'Contra el ómnibus este modo sale más y además tarda más: no hay nada que compensar.'
        )
      }
    }

    if (scenario.wageHourlyUyu && scenario.wageHourlyUyu > 0) {
      const monthlyHours = result.hoursPerYearVsBus / 12
      result.timeValueMonthlyUyu = round(monthlyHours * scenario.wageHourlyUyu)
      result.netOfTimeMonthlyUyu = round(result.monthlyAverageUyu - result.timeValueMonthlyUyu)
    }
  }

  return {
    modes: results,
    reference: 'omnibus',
    tripsPerMonth: round(tripsPerMonth, 1),
    kmPerMonth: round(Math.max(0, scenario.distanceKm) * tripsPerMonth, 1),
    warnings,
  }
}
