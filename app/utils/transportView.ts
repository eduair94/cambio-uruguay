// Cómo se MUESTRA la comparación de transporte: etiquetas, orden de las filas, el desglose que
// tiene que sumar, las series del gráfico y las dos ramas del veredicto.
//
// Está separado de `transportModel.ts` a propósito. El modelo decide; esto sólo decide cómo se lee.
// La frontera vale la pena por una razón concreta: el desglose que se imprime en pantalla es el
// único lugar donde una página de calculadora puede mentir sin que falle nada — basta con que las
// filas visibles no sumen el total que está arriba. Por eso el desglose se arma acá, con una función
// pura, y su test exige que la suma dé el mismo número que publica el modelo.
//
// `app/utils/` es un namespace PLANO de auto-imports, así que todo lo exportado va con prefijo
// `transportView`/`TRANSPORT_VIEW_`.
import { formatNumber, formatUYU } from './format'
import type {
  TransportAssumptions,
  TransportCompareResult,
  TransportFigure,
  TransportGlobalAssumptions,
  TransportMode,
  TransportModeAssumptions,
  TransportModeResult,
  TransportScenario,
} from './transportModel'

/** El orden en que se leen los modos: del que no hay que comprar al que más cuesta comprar. */
export const TRANSPORT_VIEW_MODE_ORDER: readonly TransportMode[] = [
  'omnibus',
  'pie',
  'monopatin',
  'bici',
  'moto',
  'auto',
]

export const TRANSPORT_VIEW_MODE_ICONS: Record<TransportMode, string> = {
  omnibus: 'mdi-bus',
  pie: 'mdi-walk',
  monopatin: 'mdi-scooter-electric',
  bici: 'mdi-bicycle-electric',
  moto: 'mdi-motorbike',
  auto: 'mdi-car-hatchback',
}

/**
 * Un color por modo, fijo en los dos temas.
 *
 * No salen de los tokens de Vuetify porque un canvas no hereda el tema: si el color se tomara de
 * `--v-theme-primary`, el gráfico quedaría con el color del tema con el que se montó y no cambiaría
 * al alternar claro/oscuro. Son seis tonos elegidos para distinguirse entre sí y contra los dos
 * fondos, y el gráfico nunca codifica estado sólo por tono: cada serie lleva su etiqueta.
 */
export const TRANSPORT_VIEW_MODE_COLORS: Record<TransportMode, string> = {
  omnibus: '#1565c0',
  pie: '#6a1b9a',
  monopatin: '#00897b',
  bici: '#2e7d32',
  moto: '#ef6c00',
  auto: '#c62828',
}

export function transportViewMoney(value: number | null | undefined, decimals = 0): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'sin datos'
  return formatUYU(value, decimals)
}

/** Minutos legibles: 42 min, 1 h 22 min. Un "82 min" obliga a hacer la cuenta en la cabeza. */
export function transportViewMinutes(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'sin datos'
  const total = Math.round(value)
  if (total < 60) return `${total} min`
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`
}

/**
 * Las horas al año contra el ómnibus, con el signo en palabras.
 *
 * El signo del modelo ya dice qué pasó (`hoursPerYearVsBus` positivo es tiempo GANADO), pero un
 * "−38 h" en pantalla se lee mal en las dos direcciones. Acá se escribe qué significa.
 */
export function transportViewHoursPerYear(hours: number | null | undefined): string {
  if (typeof hours !== 'number' || !Number.isFinite(hours) || Math.abs(hours) < 0.5) {
    return 'mismo tiempo que el ómnibus'
  }
  const absolute = formatNumber(Math.abs(hours), 0)
  return hours > 0 ? `${absolute} h al año que ganás` : `${absolute} h al año que perdés`
}

/** "UNASEV — Informe Anual 2025 · 31 de diciembre de 2025" */
export function transportViewFigureCaption(figure: TransportFigure | null | undefined): string {
  if (!figure) return 'sin fuente declarada'
  return `${figure.source} · ${transportViewDate(figure.asOf)}`
}

/**
 * Una fecha ISO en palabras uruguayas, en UTC.
 *
 * `es-UY` y no `es`: ICU escribe "setiembre" con el primero y "septiembre" con el segundo, y en
 * Uruguay se escribe el primero. El `timeZone: 'UTC'` es obligatorio para un `YYYY-MM-DD`, que es un
 * día del calendario: sin él el servidor imprime un día y el navegador imprime el anterior, lo que
 * además rompe la hidratación.
 */
export function transportViewDate(iso: string | null | undefined): string {
  if (!iso) return 'sin fecha'
  const at = new Date(iso.length <= 10 ? `${iso}T00:00:00.000Z` : iso)
  if (Number.isNaN(at.getTime())) return 'sin fecha'
  return at.toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// ---------------------------------------------------------------------------------------------
// El desglose que tiene que sumar
// ---------------------------------------------------------------------------------------------

export interface TransportViewRow {
  id: string
  label: string
  /** Pesos por mes. Negativo es plata que vuelve (el valor de reventa). */
  value: number
  /** De dónde sale, en una línea. Va en el tooltip. */
  hint: string
  kind: 'recurrente' | 'inversion' | 'total'
}

/** Las filas recurrentes, en el orden en que la gente las piensa. */
const RECURRING: {
  id: keyof TransportModeResult['breakdown']['monthly']
  label: string
  hint: string
}[] = [
  { id: 'fare', label: 'Boleto', hint: 'Viajes del mes por el boleto del STM con tarjeta.' },
  {
    id: 'insurance',
    label: 'Seguro obligatorio (SOA)',
    hint: 'El promedio de mercado que publica el BCU, dividido por doce. NO es una tarifa: la ley lo usa para calcular la multa por circular sin seguro, y lo que vas a pagar sale de cotizar.',
  },
  {
    id: 'roadTax',
    label: 'Patente',
    hint: 'El mayor entre el mínimo en pesos de la intendencia y el 4,5 % del valor, que es lo que manda el Texto Ordenado del SUCIVE para la categoría A. El porcentaje va sobre el aforo oficial, que no es el precio del aviso.',
  },
  {
    id: 'fixedMaintenance',
    label: 'Mantenimiento por año',
    hint: 'Service y puesta a punto, dividido por doce.',
  },
  {
    id: 'kmMaintenance',
    label: 'Mantenimiento por kilómetro',
    hint: 'Cubiertas, frenos y transmisión, por los kilómetros del mes.',
  },
  {
    id: 'energy',
    label: 'Energía',
    hint: 'Nafta al precio vigente de ANCAP, o kWh al escalón 101-600 de UTE con IVA.',
  },
  {
    id: 'parking',
    label: 'Estacionamiento tarifado',
    hint: 'Sólo si marcaste que el destino cae en zona tarifada de la Intendencia.',
  },
  {
    id: 'rainFallbackFare',
    label: 'Boleto los días de lluvia',
    hint: 'Los días con precipitación son el promedio NACIONAL de INUMET, no el de Montevideo: INUMET no publica hoy la serie por estación.',
  },
  {
    id: 'theftRisk',
    label: 'Costo esperado de robo',
    hint: 'Probabilidad anual por el valor que no se recupera. Sale del cruce entre los hurtos del Ministerio del Interior y el parque del MIEM. Se puede apagar.',
  },
  { id: 'storage', label: 'Guardado', hint: 'Cochera o garaje, si pagás.' },
]

/**
 * El desglose del COSTO MENSUAL PROMEDIO, que es el número que la página pone arriba.
 *
 * Y acá está la decisión que hace que la página no mienta: el costo mensual de un vehículo no es la
 * suma de sus gastos recurrentes. Es eso MÁS la plata puesta adelante repartida en el horizonte,
 * MENOS lo que el vehículo todavía vale al final. Un desglose que mostrara sólo los recurrentes
 * daría un total más chico que el titular y nadie podría auditarlo — que es exactamente la forma en
 * que una calculadora se equivoca sin que falle nada.
 *
 * Las cuatro filas de inversión se prorratean sobre el horizonte, igual que el modelo, para que la
 * suma de lo visible sea el número de arriba. `transportView.test.ts` lo exige.
 */
export function transportViewMonthlyRows(
  result: TransportModeResult,
  scenario: TransportScenario
): TransportViewRow[] {
  if (!result.available) return []
  const horizon = Math.max(1, Math.round(scenario.horizonMonths))
  const { breakdown } = result
  const rows: TransportViewRow[] = []

  for (const row of RECURRING) {
    const value = breakdown.monthly[row.id]
    if (!value) continue
    rows.push({ id: row.id, label: row.label, value, hint: row.hint, kind: 'recurrente' })
  }

  const cashUpfront = breakdown.upfrontUyu - breakdown.financedUyu
  if (cashUpfront > 0) {
    rows.push({
      id: 'contado',
      label: `Lo que pagaste al contado, repartido en ${horizon} meses`,
      value: cashUpfront / horizon,
      hint: `${transportViewMoney(cashUpfront)} de entrada: vehículo, equipo obligatorio y trámites.`,
      kind: 'inversion',
    })
  }

  if (breakdown.financedUyu > 0 && breakdown.monthlyInstalmentUyu > 0) {
    const paidMonths = Math.min(horizon, Math.max(0, Math.round(scenario.financingMonths)))
    rows.push({
      id: 'cuota',
      label: 'Cuota del préstamo',
      value: (breakdown.monthlyInstalmentUyu * paidMonths) / horizon,
      hint: `${transportViewMoney(breakdown.monthlyInstalmentUyu)} por mes durante ${scenario.financingMonths} cuotas. De eso, ${transportViewMoney(breakdown.financeCostUyu)} son intereses.`,
      kind: 'inversion',
    })
  }

  if (result.residualUyu > 0) {
    rows.push({
      id: 'residual',
      label: 'Menos lo que todavía vale al final',
      value: -result.residualUyu / horizon,
      hint: `A los ${horizon} meses lo podés vender por unos ${transportViewMoney(result.residualUyu)}. Se descuenta: no lo gastaste.`,
      kind: 'inversion',
    })
  }

  rows.push({
    id: 'total',
    label: 'Costo por mes',
    value: result.monthlyAverageUyu,
    hint: 'La suma de todo lo de arriba, promediada sobre el horizonte que elegiste.',
    kind: 'total',
  })
  return rows
}

// ---------------------------------------------------------------------------------------------
// El veredicto, en sus dos ramas
// ---------------------------------------------------------------------------------------------

export type TransportViewTone = 'success' | 'warning' | 'error' | 'info'

export interface TransportViewVerdict {
  tone: TransportViewTone
  headline: string
  detail: string
  /** El número que la página pone en grande, ya formateado; `null` cuando no hay ninguno. */
  figure: string | null
}

/**
 * Las dos ramas del veredicto, más las dos que no son veredicto.
 *
 * RAMA 1 — el modo sale menos por mes que el ómnibus: hay punto de equilibrio y se publica en meses.
 * RAMA 2 — el modo sale más (el caso del auto, casi siempre): no hay equilibrio NUNCA, y la respuesta
 *          honesta no es "no conviene" sino **cuánto sale la hora que ganás**. El visitante compara
 *          esa cifra contra su propio sueldo por hora; es la única forma de comparar un modo más caro
 *          y más rápido contra uno más barato y más lento sin decidir por él.
 *
 * Y si un modo es más caro Y más lento, no se calcula ninguna de las dos: se dice sin vueltas.
 */
export function transportViewVerdict(
  result: TransportModeResult,
  scenario: TransportScenario,
  /**
   * Costo mensual del modo de referencia (el ómnibus).
   *
   * Hace falta para no repetir el error que esta función tuvo en producción el 23/9/2026: caminar
   * salía `$ 0` por mes y el veredicto decía «Más caro y más lento», porque sin la referencia lo
   * único que se miraba era el tiempo. Un modo puede ser más lento y más BARATO —caminar lo es
   * siempre— y eso es una respuesta distinta, no la misma con otro tono.
   */
  referenceMonthlyUyu?: number
): TransportViewVerdict {
  if (!result.available) {
    return {
      tone: 'info',
      headline: 'Sin datos',
      detail: result.unavailableReason ?? 'No hay datos relevados para este modo.',
      figure: null,
    }
  }
  if (result.mode === 'omnibus') {
    return {
      tone: 'info',
      headline: 'Es la referencia',
      detail:
        'Todo lo demás se mide contra el ómnibus: es el único modo que ya tenés disponible sin poner un peso adelante.',
      figure: transportViewMoney(result.monthlyAverageUyu),
    }
  }

  const horizon = Math.max(1, Math.round(scenario.horizonMonths))

  if (result.breakevenMonths != null) {
    const dentro = result.breakevenMonths <= horizon
    return {
      tone: dentro ? 'success' : 'warning',
      headline: dentro
        ? `Se paga en ${result.breakevenMonths} ${result.breakevenMonths === 1 ? 'mes' : 'meses'}`
        : `Se paga recién a los ${result.breakevenMonths} meses`,
      detail: dentro
        ? `Desde ese mes ya gastaste menos que tomando el ómnibus, contando lo que todavía vale el vehículo. Tu horizonte son ${horizon} meses.`
        : `Es más que el horizonte de ${horizon} meses que elegiste: antes de esa fecha seguís gastando más que en ómnibus.`,
      figure: `${result.breakevenMonths} ${result.breakevenMonths === 1 ? 'mes' : 'meses'}`,
    }
  }

  if (result.hoursPerYearVsBus <= 0) {
    const horasPerdidas = Math.abs(result.hoursPerYearVsBus)
    const masBarato =
      typeof referenceMonthlyUyu === 'number' && result.monthlyAverageUyu < referenceMonthlyUyu
    if (masBarato) {
      return {
        tone: 'info',
        headline: 'Más barato, pero más lento',
        detail: `Sale menos por mes que el ómnibus y tarda más puerta a puerta: son ${transportViewHoursPerYear(-horasPerdidas)} de tu tiempo. No hay punto de equilibrio que calcular —ya es más barato desde el primer día— y el precio de la hora tampoco, porque acá no estás comprando tiempo: lo estás vendiendo.`,
        figure: null,
      }
    }
    return {
      tone: 'error',
      headline: 'Más caro y más lento',
      detail:
        'Contra el ómnibus este modo sale más plata y además tarda más puerta a puerta. No hay nada que compensar, así que no se publica ni punto de equilibrio ni precio de la hora.',
      figure: null,
    }
  }

  if (result.pricePerHourSavedUyu == null) {
    return {
      tone: 'info',
      headline: 'Sin veredicto',
      detail:
        'Con estos datos no se puede afirmar ni que se pague ni cuánto sale la hora ganada. Falta un insumo: mirá qué dice la tabla de abajo.',
      figure: null,
    }
  }

  return {
    tone: 'warning',
    headline: 'No se paga nunca, pero te ahorra tiempo',
    detail: `Este modo no cruza por debajo del ómnibus en ningún mes. Lo que compra es tiempo: ${transportViewHoursPerYear(result.hoursPerYearVsBus)}, a ${transportViewMoney(result.pricePerHourSavedUyu)} la hora. Comparalo contra lo que ganás vos por hora.`,
    figure: `${transportViewMoney(result.pricePerHourSavedUyu)} la hora`,
  }
}

/**
 * El orden de las filas de la comparativa: la referencia primero, después de más barato a más caro,
 * y los modos sin datos al final.
 *
 * Los que no tienen datos van últimos y NO se ordenan entre sí por precio: no tienen precio. Meterlos
 * en la escala con un cero los haría ganar por comparación contra nada.
 */
export function transportViewSortModes(result: TransportCompareResult): TransportModeResult[] {
  const order = new Map(TRANSPORT_VIEW_MODE_ORDER.map((mode, index) => [mode, index]))
  return [...result.modes].sort((a, b) => {
    if (a.mode === result.reference) return -1
    if (b.mode === result.reference) return 1
    if (a.available !== b.available) return a.available ? -1 : 1
    if (!a.available) return (order.get(a.mode) ?? 99) - (order.get(b.mode) ?? 99)
    return a.monthlyAverageUyu - b.monthlyAverageUyu
  })
}

// ---------------------------------------------------------------------------------------------
// El gráfico: costo acumulado mes a mes, donde se ve el cruce
// ---------------------------------------------------------------------------------------------

export interface TransportViewChart {
  labels: string[]
  datasets: {
    label: string
    data: (number | null)[]
    borderColor: string
    backgroundColor: string
    tension: number
    pointRadius: number
    borderWidth: number
  }[]
}

/**
 * El costo ACUMULADO de cada modo, mes a mes. El cruce con la curva del ómnibus es el punto de
 * equilibrio, y verlo es el motivo del gráfico: un número suelto ("se paga en 14 meses") no muestra
 * cuánto se está arriesgando antes de esa fecha ni qué tan al filo pasa.
 *
 * Las etiquetas se preformatean acá y NUNCA en un `ticks.callback`: en una escala de categoría el
 * callback recibe el índice del bucket y no el valor, y eso ya produjo en este repo un eje que decía
 * "$0 … $21" sobre un rango real de decenas de miles.
 */
export function transportViewChart(
  result: TransportCompareResult,
  horizonMonths: number
): TransportViewChart | null {
  const available = result.modes.filter(mode => mode.available && mode.cumulativeUyu.length)
  if (available.length < 2) return null

  const months = Math.max(
    1,
    Math.min(Math.round(horizonMonths), ...available.map(mode => mode.cumulativeUyu.length))
  )
  // Más de ~48 puntos en un ancho de teléfono es una línea gruesa sin información: se muestrea.
  const step = Math.max(1, Math.ceil(months / 48))
  const indexes: number[] = []
  for (let index = step - 1; index < months; index += step) indexes.push(index)
  if (indexes[indexes.length - 1] !== months - 1) indexes.push(months - 1)

  return {
    labels: indexes.map(index => String(index + 1)),
    datasets: available.map(mode => ({
      label: mode.label,
      data: indexes.map(index => mode.cumulativeUyu[index] ?? null),
      borderColor: TRANSPORT_VIEW_MODE_COLORS[mode.mode],
      backgroundColor: TRANSPORT_VIEW_MODE_COLORS[mode.mode],
      tension: 0.15,
      pointRadius: 0,
      borderWidth: mode.mode === result.reference ? 3 : 2,
    })),
  }
}

// ---------------------------------------------------------------------------------------------
// Lo que la página está obligada a decir
// ---------------------------------------------------------------------------------------------

/**
 * Las advertencias que no se pueden omitir sin que la página pase a afirmar algo que no midió.
 *
 * No son un descargo legal: cada una tapa un agujero concreto por el que la comparación se volvería
 * falsa. Van en el cuerpo de la página, al lado del número que afectan, y este arreglo existe para
 * que un test pueda exigir que sigan estando.
 */
export const TRANSPORT_VIEW_CAVEATS = [
  {
    id: 'moto-ruteada-como-auto',
    label: 'La moto se rutea como un auto',
    text: 'Ningún ruteador público modela lo que de verdad hace más rápida a una moto en ciudad —pasar entre filas, usar el hueco del semáforo—. Publicamos el tiempo del auto y lo decimos; descontarle minutos por suposición sería decidir el resultado de la comparación con un número inventado.',
  },
  {
    id: 'lluvia-nacional',
    label: 'Los días de lluvia son de todo el país',
    text: 'INUMET sirve vacía hoy su sección de estadísticas por estación, así que el único dato publicable es el promedio NACIONAL de su Boletín Anual. Escribir "en Montevideo llueve 80 días" a partir de eso sería falso.',
  },
  {
    id: 'soa-promedio',
    label: 'El SOA es un promedio de mercado, no una tarifa',
    text: 'El BSE no publica tarifario del Plan SOA: hay que cotizar. Lo único oficial es el importe promedio que publica la Superintendencia de Servicios Financieros del BCU, cuya función legal es calcular la multa por circular sin seguro.',
  },
  {
    id: 'patente-moto',
    label: 'No hay tabla nacional de patente para una moto de menos de 500 cc',
    text: 'El Texto Ordenado del SUCIVE manda ese segmento a "la patente de 2025 ajustada por IPC", que fija la intendencia del primer empadronamiento. Cualquier número que publicáramos ahí sería inventado, así que la moto va sin patente en la cuenta y el importe se consulta por matrícula.',
  },
  {
    id: 'siniestralidad-no-se-monetiza',
    label: 'La siniestralidad no se convierte a pesos',
    text: 'Publicamos los fallecidos de UNASEV por modo y, donde hay parque publicado, la tasa por cada 100.000 vehículos como cruce propio. No se traduce a plata: ponerle precio a la vida del visitante para que cierre la cuenta de la moto es indefendible, y una cifra inventada ahí contaminaría todo lo demás.',
  },
  {
    id: 'barrio-es-un-centroide',
    label: 'Un barrio es un punto, no una dirección',
    text: 'Cuando elegís barrios, la ruta va de centro a centro. Alcanza para decidir si comprar un vehículo y no alcanza para planificar un viaje: para eso escribí las dos direcciones exactas.',
  },
] as const

/** La tasa de siniestralidad por modo, ordenada, con el denominador declarado en la propia fila. */
export interface TransportViewSafetyRow {
  mode: TransportMode
  label: string
  fatalities: number | null
  per100k: number | null
  note: string
}

/**
 * Toma los SUPUESTOS y no el resultado de la comparación, a propósito.
 *
 * La siniestralidad es un eje propio: cuántos motociclistas murieron en 2025 no depende de que hoy
 * hayamos podido leer el precio de una moto. Si esta tabla saliera del resultado, un catálogo caído
 * borraría de la pantalla justo la fila que más importa — y el visitante leería esa ausencia como
 * "andar en moto no tiene un número", que es lo contrario de lo que pasa.
 */
export function transportViewSafetyRows(
  assumptions: TransportAssumptions
): TransportViewSafetyRow[] {
  const order = new Map(TRANSPORT_VIEW_MODE_ORDER.map((mode, index) => [mode, index]))
  return Object.values(assumptions.byMode)
    .filter(mode => mode.fatalities != null || mode.fatalityPer100kVehicles != null)
    .sort(
      (a, b) =>
        (b.fatalityPer100kVehicles?.value ?? -1) - (a.fatalityPer100kVehicles?.value ?? -1) ||
        (order.get(a.mode) ?? 99) - (order.get(b.mode) ?? 99)
    )
    .map(mode => ({
      mode: mode.mode,
      label: mode.label,
      fatalities: mode.fatalities?.value ?? null,
      per100k: mode.fatalityPer100kVehicles?.value ?? null,
      // La ausencia se declara. Nadie cuenta cuántas bicicletas ni cuántos monopatines hay en
      // Uruguay, así que para esos modos existe el número de fallecidos y NO existe la tasa.
      note:
        mode.fatalityPer100kVehicles == null
          ? 'Sin parque vehicular publicado: no hay tasa, sólo el número de fallecidos.'
          : 'Cruce propio entre UNASEV y el parque activo del MIEM. Ninguna de las dos fuentes publica el cociente.',
    }))
}

// ---------------------------------------------------------------------------------------------
// Los supuestos, editables
// ---------------------------------------------------------------------------------------------

/** Con qué se reemplaza la fuente de una cifra que tocó el visitante: deja de ser nuestra. */
export const TRANSPORT_VIEW_EDITED_SOURCE = 'Valor que pusiste vos'

/**
 * Qué campos de un modo se pueden cambiar en pantalla, con su unidad.
 *
 * El catálogo vive acá y no en el `.vue` para que el formulario exista en UN solo lugar: un campo
 * que el modelo usa y el formulario no ofrece es un supuesto que el visitante no puede discutir, y
 * eso no se nota mirando la página — se nota contando la lista.
 */
export const TRANSPORT_VIEW_EDITABLE_FIELDS: readonly {
  field: keyof TransportModeAssumptions
  label: string
  unit: string
  step: number
}[] = [
  { field: 'equipmentUyu', label: 'Equipo obligatorio (casco, candado)', unit: '$', step: 100 },
  { field: 'paperworkUyu', label: 'Trámites de una sola vez', unit: '$', step: 100 },
  { field: 'insuranceUyu', label: 'Seguro obligatorio, por año', unit: '$', step: 100 },
  { field: 'roadTaxUyu', label: 'Patente: mínimo por año', unit: '$', step: 100 },
  { field: 'roadTaxRateOfPrice', label: 'Patente: fracción del valor', unit: '', step: 0.005 },
  { field: 'fixedMaintenanceUyu', label: 'Mantenimiento por año', unit: '$', step: 500 },
  { field: 'maintenancePerKmUyu', label: 'Mantenimiento por kilómetro', unit: '$', step: 0.1 },
  {
    field: 'consumptionPer100Km',
    label: 'Consumo cada 100 km (litros o kWh)',
    unit: '',
    step: 0.1,
  },
  {
    field: 'annualDepreciation',
    label: 'Pérdida de valor por año (fracción)',
    unit: '',
    step: 0.01,
  },
  {
    field: 'rainFallbackShare',
    label: 'Días de lluvia que terminan en ómnibus (fracción)',
    unit: '',
    step: 0.05,
  },
  {
    field: 'theftAnnualProbability',
    label: 'Probabilidad anual de robo (fracción)',
    unit: '',
    step: 0.001,
  },
  {
    field: 'theftRecoveryShare',
    label: 'Parte del valor que se recupera si te lo roban',
    unit: '',
    step: 0.05,
  },
  { field: 'accessMinutes', label: 'Minutos por viaje que no son ruta', unit: 'min', step: 1 },
  { field: 'cruiseSpeedKmh', label: 'Velocidad de crucero', unit: 'km/h', step: 1 },
  { field: 'storageMonthlyUyu', label: 'Guardado por mes', unit: '$', step: 100 },
]

export const TRANSPORT_VIEW_EDITABLE_GLOBAL: readonly {
  field: keyof TransportGlobalAssumptions
  label: string
  unit: string
  step: number
}[] = [
  { field: 'rainDaysPerYear', label: 'Días con lluvia al año', unit: 'días', step: 1 },
  { field: 'parkingPerHourUyu', label: 'Estacionamiento tarifado, por hora', unit: '$', step: 1 },
  {
    field: 'parkingSearchMinutes',
    label: 'Minutos buscando dónde estacionar',
    unit: 'min',
    step: 1,
  },
]

/** Las claves son `"<modo>.<campo>"` o `"global.<campo>"`. */
export type TransportViewOverrides = Record<string, number>

/**
 * Los supuestos con lo que el visitante cambió encima.
 *
 * UNA REGLA QUE NO ES UN DETALLE: un campo que el sitio declara `null` NO se puede completar desde
 * acá. La patente de una moto de menos de 500 cc es `null` porque no existe tabla nacional, y dejar
 * que un override la convierta en número haría que la página empezara a publicar una patente de
 * moto: con la forma de un dato nuestro y sin serlo. Lo editable es lo que YA tiene cifra publicada.
 *
 * Y lo que el visitante toca cambia de fuente: deja de decir "BCU" y pasa a decir que lo puso él.
 */
export function transportViewApplyOverrides(
  base: TransportAssumptions,
  overrides: TransportViewOverrides
): TransportAssumptions {
  const usable = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0

  const global = { ...base.global }
  for (const { field } of TRANSPORT_VIEW_EDITABLE_GLOBAL) {
    const value = overrides[`global.${field}`]
    if (!usable(value)) continue
    global[field] = { ...global[field], value, source: TRANSPORT_VIEW_EDITED_SOURCE }
  }

  const byMode = {} as TransportAssumptions['byMode']
  for (const mode of TRANSPORT_VIEW_MODE_ORDER) {
    const next: TransportModeAssumptions = { ...base.byMode[mode] }
    // El índice es dinámico y los campos del tipo no comparten forma (`mode` y `label` no son
    // cifras), así que la escritura pasa por una vista indexada; la lista de campos editables ya
    // garantiza que sólo se tocan los que SON `TransportFigure`.
    const writable = next as unknown as Record<string, TransportFigure | null>
    for (const { field } of TRANSPORT_VIEW_EDITABLE_FIELDS) {
      const value = overrides[`${mode}.${field}`]
      const figure = writable[field]
      if (!figure || typeof figure !== 'object' || !usable(value)) continue
      writable[field] = { ...figure, value, source: TRANSPORT_VIEW_EDITED_SOURCE }
    }
    byMode[mode] = next
  }
  return { global, byMode }
}
