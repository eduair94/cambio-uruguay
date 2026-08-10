// app/utils/householdBills.ts
// Motor + datos de referencia de /factura-de-ute-uruguay: por qué la factura de luz sube tanto,
// qué tarifa de UTE conviene según cómo consume el hogar, y qué parte de la factura de OSE es
// agua y qué parte es saneamiento.
//
// POR QUÉ EXISTE ESTA PÁGINA: es el vacío de contenido más grande que encontramos al revisar
// 13.196 hilos de r/uruguay, r/AskUruguayan, r/Burises, r/UruguayFinanzas y r/LegalUruguay
// (293 hilos, ~6.900 comentarios, el cluster de demanda #1). El sitio ya modelaba UTE/OSE como
// un renglón agregado en `costOfLiving.ts` (`utilitiesBase`), pero en ningún lado explicaba
// cómo se forma ese número ni qué palanca tiene el lector para bajarlo.
//
// MÓDULO PURO (sin Vue/Nuxt) para que la página y `app/tests/unit/householdBills.test.ts`
// compartan una única fuente de verdad. Ninguna cifra se inventa: todas salen de las fuentes
// listadas abajo, y `TARIFF_SOURCES` es lo que la página renderiza al pie.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-09:
//   - Decreto 339/025 — tarifas de UTE vigentes desde el 01/01/2026 (ajuste medio 4,0 %)
//     https://www.impo.com.uy/bases/decretos/339-2025
//   - UTE, «Qué encuentro en mi factura» (qué concepto lleva IVA y cuál no)
//     https://portal.ute.com.uy/articulos/que-encuentro-en-mi-factura
//   - UTE, «Opciones tarifarias para hogares» (franjas horarias y requisitos)
//     https://www.ute.com.uy/clientes/soluciones-para-el-hogar/planes-hogar/opciones-tarifarias-para-hogares
//   - UTE, «Plan Inteligente Hogares» (elección de la punta y permanencia de 12 meses)
//     https://www.ute.com.uy/clientes/soluciones-para-el-hogar/planes-hogar/plan-inteligente-hogares
//   - UTE, cambio de potencia contratada
//     https://www.ute.com.uy/clientes/tramites-y-servicios/potencia-contratada
//   - Presidencia, «UTE bonifica 40 % de la tarifa a 17.000 jubilados y 9.000 estudiantes»
//     https://www.gub.uy/presidencia/comunicacion/noticias/ute-bonifica-40-tarifa-17000-jubilados-9000-estudiantes-universitarios
//   - BPS, bonificación de UTE para jubilados con prima por edad
//     https://www.bps.gub.uy/24306/bonificacion-de-ute-para-jubilados-del-bps-beneficiarios-de-la-prima-por-edad.html
//   - Decreto 340/025 y su Anexo — tarifas de OSE vigentes desde el 01/01/2026 (ajuste 8,5 %)
//     https://www.impo.com.uy/bases/decretos-originales/340-2025

/** Fecha en que cada cifra de este módulo se contrastó con las fuentes de arriba. */
export const BILLS_VERIFIED_AT = '2026-08-09'

/** Desde cuándo rigen los precios de UTE y OSE que usa este módulo. */
export const TARIFFS_EFFECTIVE_FROM = '2026-01-01'

/** IVA tasa básica. Se aplica a energía y potencia; NO al cargo fijo residencial. */
export const IVA_RATE = 0.22

export interface TariffSource {
  label: string
  url: string
}

export const TARIFF_SOURCES: readonly TariffSource[] = Object.freeze([
  {
    label: 'Decreto 339/025 — tarifas de UTE vigentes desde el 01/01/2026',
    url: 'https://www.impo.com.uy/bases/decretos/339-2025',
  },
  {
    label: 'UTE — Qué encuentro en mi factura (qué lleva IVA y qué no)',
    url: 'https://portal.ute.com.uy/articulos/que-encuentro-en-mi-factura',
  },
  {
    label: 'UTE — Opciones tarifarias para hogares',
    url: 'https://www.ute.com.uy/clientes/soluciones-para-el-hogar/planes-hogar/opciones-tarifarias-para-hogares',
  },
  {
    label: 'UTE — Plan Inteligente Hogares (elección de la punta)',
    url: 'https://www.ute.com.uy/clientes/soluciones-para-el-hogar/planes-hogar/plan-inteligente-hogares',
  },
  {
    label: 'UTE — Cambio de potencia contratada',
    url: 'https://www.ute.com.uy/clientes/tramites-y-servicios/potencia-contratada',
  },
  {
    label: 'Presidencia — bonificación del 40 % para jubilados y estudiantes',
    url: 'https://www.gub.uy/presidencia/comunicacion/noticias/ute-bonifica-40-tarifa-17000-jubilados-9000-estudiantes-universitarios',
  },
  {
    label: 'BPS — bonificación de UTE para jubilados con prima por edad',
    url: 'https://www.bps.gub.uy/24306/bonificacion-de-ute-para-jubilados-del-bps-beneficiarios-de-la-prima-por-edad.html',
  },
  {
    label: 'Decreto 340/025 (Anexo) — tarifas de OSE vigentes desde el 01/01/2026',
    url: 'https://www.impo.com.uy/bases/decretos-originales/340-2025',
  },
])

// ---------------------------------------------------------------------------
// UTE — tarifas residenciales (Decreto 339/025)
// ---------------------------------------------------------------------------

export type UteTariffId = 'simple' | 'doble' | 'triple'

/** Un escalón de la Tarifa Residencial Simple. `upTo` null = sin tope. */
export interface EnergyBracket {
  /** Tope superior del escalón, en kWh/mes. `null` en el último. */
  upTo: number | null
  /** $/kWh, sin IVA. */
  pricePerKwh: number
  label: string
}

export interface UteTariff {
  id: UteTariffId
  name: string
  shortName: string
  /** Para quién suele dar mejor, en una línea. */
  bestFor: string
  /** $/mes. NO lleva IVA (UTE lo factura como importe no gravado). */
  cargoFijo: number
  /** $/kW/mes de potencia contratada. SÍ lleva IVA. */
  potenciaPerKw: number
  /** Rango de potencia contratada admitido, en kW. */
  potenciaRange: { min: number; max: number }
  /** Sólo en la Simple: escalones por consumo mensual. */
  brackets?: readonly EnergyBracket[]
  /** Sólo en Doble/Triple: precio por franja, $/kWh sin IVA. */
  bands?: {
    punta: number
    /** «Fuera de punta» en la Doble; «llano» en la Triple. */
    llano: number
    /** Sólo en la Triple. */
    valle?: number
  }
}

/**
 * Los tres regímenes residenciales, tal como los fija el Decreto 339/025.
 *
 * OJO CON LOS ESCALONES DE LA SIMPLE: son progresivos como el IRPF, no un precio único que
 * salta. Los primeros 100 kWh siempre se pagan a $6,744 aunque consumas 700. Eso es lo que
 * explica la factura de invierno: no es que "cambió la tarifa", es que el excedente cae en un
 * escalón que vale 56 % más caro que el primero.
 */
export const UTE_TARIFFS: readonly UteTariff[] = Object.freeze([
  {
    id: 'simple',
    name: 'Tarifa Residencial Simple',
    shortName: 'Simple',
    bestFor: 'Hogares de consumo bajo o que no pueden correr el consumo fuera de la tarde-noche.',
    cargoFijo: 324.9,
    potenciaPerKw: 83.2,
    potenciaRange: { min: 1.4, max: 40 },
    brackets: [
      { upTo: 100, pricePerKwh: 6.744, label: '1 a 100 kWh' },
      { upTo: 600, pricePerKwh: 8.452, label: '101 a 600 kWh' },
      { upTo: null, pricePerKwh: 10.539, label: 'más de 600 kWh' },
    ],
  },
  {
    id: 'doble',
    name: 'Tarifa Residencial Doble Horario',
    shortName: 'Doble horario',
    bestFor: 'Hogares que pueden sacar lavarropas, calefón y horno de las 4 horas de punta.',
    cargoFijo: 488,
    potenciaPerKw: 83.2,
    potenciaRange: { min: 3.5, max: 40 },
    bands: { punta: 12.034, llano: 4.771 },
  },
  {
    id: 'triple',
    name: 'Tarifa Residencial Triple Horario',
    shortName: 'Triple horario',
    bestFor:
      'Hogares que además pueden mover consumo a la madrugada (termotanque, auto eléctrico, bomba).',
    cargoFijo: 488,
    potenciaPerKw: 83.2,
    potenciaRange: { min: 3.5, max: 40 },
    bands: { punta: 12.034, llano: 5.172, valle: 2.443 },
  },
])

export const uteTariff = (id: UteTariffId): UteTariff =>
  UTE_TARIFFS.find(t => t.id === id) as UteTariff

/** Las franjas, en palabras, tal como las define UTE. */
export const UTE_BANDS = Object.freeze({
  punta:
    '4 horas consecutivas elegidas dentro de la ventana 17:00–23:00, sólo días hábiles. Con medidor inteligente se elige entre 17–21, 18–22 o 19–23 y esa elección se mantiene 12 meses.',
  fueraDePunta:
    'El resto de las horas de los días hábiles, más sábados, domingos y feriados las 24 horas.',
  valle: '00:00 a 07:00, todos los días (sólo existe en la Triple Horario).',
})

// ---------------------------------------------------------------------------
// Cálculo de la factura
// ---------------------------------------------------------------------------

export interface UteBillInput {
  /** Consumo del mes, en kWh. */
  kwh: number
  /** Potencia contratada, en kW. */
  potenciaKw: number
  /**
   * Qué porcentaje del consumo cae en la punta (0–100). Sólo afecta Doble y Triple.
   * Referencia útil: la punta son 4 h × ~22 días hábiles ≈ 12 % de las horas del mes, así que
   * un hogar que no hace nada especial suele caer entre 15 % y 25 %.
   */
  puntaPct: number
  /** Qué porcentaje del consumo cae en el valle (00–07). Sólo afecta la Triple. */
  vallePct: number
}

export interface UteBillLine {
  label: string
  /** Importe sin IVA. */
  amount: number
  /** `false` sólo para el cargo fijo residencial. */
  taxed: boolean
  /** Detalle opcional (por ejemplo, el escalón y su precio). */
  detail?: string
}

export interface UteBillResult {
  tariff: UteTariff
  lines: UteBillLine[]
  /** Suma de las líneas no gravadas. */
  untaxed: number
  /** Suma de las líneas gravadas, sin IVA. */
  taxedBase: number
  iva: number
  /** Lo que sale la factura del mes. */
  total: number
  /** Costo medio del kWh ya con IVA e incluyendo cargos fijos. Sirve para comparar de verdad. */
  effectiveKwhCost: number
  /** `null` cuando la potencia contratada del hogar no habilita esta tarifa. */
  ineligibleReason: string | null
}

const round2 = (n: number): number => Math.round(n * 100) / 100

/**
 * Costo de la energía en la Simple, aplicando los escalones de forma progresiva.
 * Devuelve también el desglose para que la página pueda mostrar dónde se fue la plata.
 */
export function simpleEnergyCost(kwh: number): { total: number; parts: UteBillLine[] } {
  const brackets = uteTariff('simple').brackets as readonly EnergyBracket[]
  const parts: UteBillLine[] = []
  let remaining = Math.max(0, kwh)
  let floor = 0
  let total = 0
  for (const b of brackets) {
    if (remaining <= 0) break
    const span = b.upTo === null ? Infinity : b.upTo - floor
    const take = Math.min(remaining, span)
    const amount = take * b.pricePerKwh
    total += amount
    parts.push({
      label: `Energía — ${b.label}`,
      amount: round2(amount),
      taxed: true,
      detail: `${round2(take)} kWh × $ ${b.pricePerKwh}`,
    })
    remaining -= take
    floor = b.upTo ?? floor
  }
  return { total: round2(total), parts }
}

/** Reparte el consumo entre las franjas de una tarifa horaria, normalizando porcentajes locos. */
export function splitBands(
  input: UteBillInput,
  hasValle: boolean
): { punta: number; llano: number; valle: number } {
  const kwh = Math.max(0, input.kwh)
  // Clamp primero: un usuario puede tipear 200 en un campo de porcentaje.
  let punta = Math.min(100, Math.max(0, input.puntaPct)) / 100
  let valle = hasValle ? Math.min(100, Math.max(0, input.vallePct)) / 100 : 0
  // Si entre las dos se pasan de 100 %, se escalan proporcionalmente en vez de romper el total:
  // el llano nunca puede ser negativo.
  const sum = punta + valle
  if (sum > 1) {
    punta /= sum
    valle /= sum
  }
  return {
    punta: round2(kwh * punta),
    valle: round2(kwh * valle),
    llano: round2(kwh * (1 - punta - valle)),
  }
}

/** Calcula la factura mensual de una tarifa concreta. */
export function estimateUteBill(tariffId: UteTariffId, input: UteBillInput): UteBillResult {
  const tariff = uteTariff(tariffId)
  const lines: UteBillLine[] = [
    { label: 'Cargo fijo', amount: round2(tariff.cargoFijo), taxed: false },
    {
      label: 'Potencia contratada',
      amount: round2(Math.max(0, input.potenciaKw) * tariff.potenciaPerKw),
      taxed: true,
      detail: `${input.potenciaKw} kW × $ ${tariff.potenciaPerKw}`,
    },
  ]

  if (tariff.brackets) {
    lines.push(...simpleEnergyCost(input.kwh).parts)
  } else if (tariff.bands) {
    const split = splitBands(input, tariff.bands.valle !== undefined)
    lines.push({
      label: 'Energía — punta',
      amount: round2(split.punta * tariff.bands.punta),
      taxed: true,
      detail: `${split.punta} kWh × $ ${tariff.bands.punta}`,
    })
    lines.push({
      label: tariff.bands.valle === undefined ? 'Energía — fuera de punta' : 'Energía — llano',
      amount: round2(split.llano * tariff.bands.llano),
      taxed: true,
      detail: `${split.llano} kWh × $ ${tariff.bands.llano}`,
    })
    if (tariff.bands.valle !== undefined) {
      lines.push({
        label: 'Energía — valle (00 a 07)',
        amount: round2(split.valle * tariff.bands.valle),
        taxed: true,
        detail: `${split.valle} kWh × $ ${tariff.bands.valle}`,
      })
    }
  }

  const untaxed = round2(lines.filter(l => !l.taxed).reduce((n, l) => n + l.amount, 0))
  const taxedBase = round2(lines.filter(l => l.taxed).reduce((n, l) => n + l.amount, 0))
  const iva = round2(taxedBase * IVA_RATE)
  const total = round2(untaxed + taxedBase + iva)

  return {
    tariff,
    lines,
    untaxed,
    taxedBase,
    iva,
    total,
    effectiveKwhCost: input.kwh > 0 ? round2(total / input.kwh) : 0,
    ineligibleReason:
      input.potenciaKw < tariff.potenciaRange.min
        ? `Requiere potencia contratada de al menos ${tariff.potenciaRange.min} kW.`
        : input.potenciaKw > tariff.potenciaRange.max
          ? `Es para potencias de hasta ${tariff.potenciaRange.max} kW.`
          : null,
  }
}

export interface UteComparison {
  results: UteBillResult[]
  /** La más barata entre las elegibles. */
  best: UteBillResult
  /** Cuánto se ahorra por año contra la Simple, si conviene cambiarse. 0 si la Simple gana. */
  annualSavingVsSimple: number
  /** Cuánto cuesta el mismo consumo en la Simple (referencia de comparación). */
  simple: UteBillResult
}

/**
 * Compara los tres regímenes con el mismo consumo. La Simple es siempre el punto de comparación
 * porque es la tarifa por defecto: nadie está en Doble ni Triple sin haberlo pedido.
 */
export function compareUteTariffs(input: UteBillInput): UteComparison {
  const results = UTE_TARIFFS.map(t => estimateUteBill(t.id, input))
  const simple = results.find(r => r.tariff.id === 'simple') as UteBillResult
  const eligible = results.filter(r => r.ineligibleReason === null)
  const best = eligible.reduce((a, b) => (b.total < a.total ? b : a), eligible[0] ?? simple)
  const monthlySaving = simple.total - best.total
  return {
    results,
    best,
    simple,
    annualSavingVsSimple: best.tariff.id === 'simple' ? 0 : round2(Math.max(0, monthlySaving) * 12),
  }
}

// ---------------------------------------------------------------------------
// Bonificaciones y palancas
// ---------------------------------------------------------------------------

export interface BillLever {
  title: string
  /** Qué hay que hacer, en imperativo. */
  action: string
  /** Qué gana el lector, con la cifra o la regla exacta cuando existe. */
  effect: string
  icon: string
  /** Cuándo NO sirve. Se muestra siempre: una palanca sin su contraindicación es una trampa. */
  caveat?: string
}

/**
 * Lo que un hogar puede hacer de verdad. Ordenado por relación (plata que ahorra) / (esfuerzo),
 * no por lo espectacular que suene.
 */
export const UTE_LEVERS: readonly BillLever[] = Object.freeze([
  {
    title: 'Revisá la potencia contratada',
    action:
      'Fijate en la factura cuántos kW tenés contratados y pedí bajarla al 0800 1930 si nunca saltás la llave.',
    effect:
      'Se paga $ 83,2 + IVA por cada kW contratado, todos los meses, uses o no esa potencia. Bajar de 5,7 kW a 3,5 kW son unos $ 223 por mes de menos.',
    caveat:
      'Si te quedás corto, salta la térmica cuando coinciden estufa, horno y calefón. Entre 1,4 y 9 kW monofásico el cambio no tiene costo, así que se puede probar y volver.',
    icon: 'mdi-flash-outline',
  },
  {
    title: 'Mové el consumo grande fuera de la punta',
    action:
      'Lavarropas, lavavajillas, termotanque y horno, fuera de las 4 horas de punta que elegiste (dentro de 17:00–23:00 en días hábiles).',
    effect:
      'En Doble Horario el kWh de punta sale $ 12,034 y el de fuera de punta $ 4,771: la misma carga cuesta 2,5 veces menos.',
    caveat:
      'Sólo aplica si estás en Doble o Triple Horario. En la Simple el precio no depende de la hora.',
    icon: 'mdi-clock-outline',
  },
  {
    title: 'Elegí bien tu ventana de punta',
    action: 'Con medidor inteligente podés elegir entre 17–21, 18–22 o 19–23.',
    effect: 'Corrés las 4 horas caras al momento en que tu casa está más vacía.',
    caveat: 'La elección se mantiene 12 meses: no es algo que se cambie mes a mes.',
    icon: 'mdi-tune',
  },
  {
    title: 'El termotanque es el que hace la factura',
    action:
      'Bajá el termostato y, si tenés Doble o Triple Horario, ponelo con temporizador fuera de la punta.',
    effect:
      'Es la carga que más pesa en el invierno uruguayo y la más fácil de correr de horario, porque el agua queda caliente igual.',
    icon: 'mdi-water-boiler',
  },
  {
    title: 'Mirá si te corresponde la bonificación del 40 %',
    action:
      'Jubilados del BPS con prima por edad: es automática si el servicio está a tu nombre. Estudiantes con beca del Fondo de Solidaridad: hay que llenar el formulario.',
    effect: '40 % de descuento sobre la tarifa residencial.',
    caveat:
      'Pide consumir menos de 230 kWh por mes y potencia contratada de hasta 3,5 kW. Se puede pasar el tope hasta dos veces en doce meses; a la tercera se pierde. No se acumula con el Bono Social ni con el beneficio de electrodependiente.',
    icon: 'mdi-account-cash-outline',
  },
])

/** La bonificación del 40 %, como regla evaluable y no como párrafo. */
export interface DiscountEligibility {
  eligible: boolean
  reasons: string[]
}

export const UTE_DISCOUNT_KWH_CAP = 230
export const UTE_DISCOUNT_POTENCIA_CAP = 3.5
export const UTE_DISCOUNT_RATE = 0.4

/**
 * ¿Califica este hogar para la bonificación del 40 %? Sólo evalúa las dos condiciones
 * medibles (consumo y potencia); la condición de ser jubilado con prima por edad o estudiante
 * del Fondo de Solidaridad la sabe el lector, no nosotros.
 */
export function checkUteDiscount(input: { kwh: number; potenciaKw: number }): DiscountEligibility {
  const blockers: string[] = []
  if (input.kwh >= UTE_DISCOUNT_KWH_CAP) {
    blockers.push(
      `El consumo tiene que ser menor a ${UTE_DISCOUNT_KWH_CAP} kWh/mes y estás en ${input.kwh}.`
    )
  }
  if (input.potenciaKw > UTE_DISCOUNT_POTENCIA_CAP) {
    blockers.push(
      `La potencia contratada tiene que ser de hasta ${UTE_DISCOUNT_POTENCIA_CAP} kW y tenés ${input.potenciaKw} kW.`
    )
  }
  if (blockers.length) return { eligible: false, reasons: blockers }
  return {
    eligible: true,
    reasons: [
      'Cumplís las dos condiciones medibles. Falta la condición personal: ser jubilado del BPS con prima por edad, o becario del Fondo de Solidaridad.',
    ],
  }
}

// ---------------------------------------------------------------------------
// OSE — agua y saneamiento (Decreto 340/025, Anexo)
// ---------------------------------------------------------------------------

/**
 * El dato que casi nadie tiene presente: el cargo variable de saneamiento es el 100 % del cargo
 * variable de agua. Es decir, en una casa con saneamiento conectado, cada metro cúbico se paga
 * dos veces. Textual del decreto: «El cargo variable del servicio de saneamiento convencional
 * […] será el 100 % del importe facturado por cargo variable de agua».
 */
export const SANEAMIENTO_MULTIPLIER = 1

export interface OseFixedCharge {
  /** Diámetro de la conexión. */
  connection: string
  /** $/mes. */
  amount: number
}

export const OSE_FIXED_CHARGES: readonly OseFixedCharge[] = Object.freeze([
  { connection: '12,5 mm y 13 mm', amount: 327.5 },
  { connection: '19 mm', amount: 483.36 },
  { connection: '25 mm', amount: 778.53 },
  { connection: 'más de 25 mm', amount: 3297.81 },
])

/** Cargo fijo mensual del saneamiento convencional, por unidad. */
export const OSE_SANEAMIENTO_FIXED = 137.05

/** Cargo fijo adicional cuando el consumo anualizado supera los 15 m³. */
export const OSE_EXTRA_FIXED_OVER_15M3 = 101.45

export interface OseBlock {
  label: string
  /** `perM3` = el precio es por metro cúbico. `block` = es un importe del tramo. */
  kind: 'block' | 'perM3'
  amount: number
}

/**
 * Los tramos de consumo residencial. Los dos primeros se facturan como importe del tramo y no
 * por metro cúbico: por eso una casa que consume 3 m³ y una que consume 5 m³ pagan lo mismo.
 */
export const OSE_BLOCKS: readonly OseBlock[] = Object.freeze([
  { label: 'hasta 5 m³', kind: 'block', amount: 184.43 },
  { label: 'de 5 a 10 m³', kind: 'block', amount: 368.91 },
  { label: 'de 10 a 15 m³', kind: 'perM3', amount: 36.91 },
  { label: 'de 15 a 20 m³', kind: 'perM3', amount: 105.17 },
  { label: 'de 20 a 25 m³', kind: 'perM3', amount: 139.63 },
  { label: 'de 25 a 30 m³', kind: 'perM3', amount: 164.85 },
  { label: 'de 30 a 50 m³', kind: 'perM3', amount: 186.53 },
  { label: 'más de 50 m³', kind: 'perM3', amount: 207.48 },
])

// ---------------------------------------------------------------------------
// Preguntas que el corpus de Reddit repite y que la página responde
// ---------------------------------------------------------------------------

export interface BillFaq {
  question: string
  /** Respuesta corta, la que se lee en el destacado. */
  short: string
  /** Desarrollo con la regla y la fuente. */
  answer: string
}

export const BILLS_FAQ: readonly BillFaq[] = Object.freeze([
  {
    question: '¿Por qué en invierno la factura sube más que el consumo?',
    short: 'Porque los escalones de la Simple son progresivos y el excedente cae en el tramo caro.',
    answer:
      'En la Tarifa Residencial Simple los primeros 100 kWh se pagan a $ 6,744, de 101 a 600 kWh a $ 8,452 y de 601 en adelante a $ 10,539. Los escalones se aplican de forma progresiva: no cambia el precio de todo el consumo, sólo el del excedente. Pero como el kWh del último tramo vale 56 % más que el del primero, duplicar el consumo aumenta la factura bastante más del doble. A eso se le suma que el cargo fijo y la potencia se pagan igual todos los meses.',
  },
  {
    question: '¿El cargo fijo lleva IVA?',
    short: 'No. La energía y la potencia contratada sí, al 22 %.',
    answer:
      'UTE factura el cargo fijo de las tarifas residenciales como importe no gravado, y el consumo eléctrico y el cargo por potencia contratada como importe gravado al 22 %. Es la razón por la que el total de la factura no es el subtotal por 1,22.',
    // Fuente: UTE, «Qué encuentro en mi factura».
  },
  {
    question: '¿Me conviene pasarme a doble horario?',
    short: 'Depende de qué porcentaje de tu consumo cae en las 4 horas de punta.',
    answer:
      'El doble horario cambia un cargo fijo más caro ($ 488 contra $ 324,9) y un kWh de punta carísimo ($ 12,034) por un kWh mucho más barato el resto del tiempo ($ 4,771 contra $ 8,452 del tramo medio de la Simple). Conviene cuando podés mantener el consumo de punta bajo. Con el comparador de esta página podés poner tu consumo real y ver el corte exacto para tu caso.',
  },
  {
    question: '¿Cuál es exactamente el horario de punta?',
    short: '4 horas consecutivas que elegís vos, dentro de 17:00 a 23:00, sólo días hábiles.',
    answer:
      'Fuera de punta es el resto de las horas de los días hábiles más sábados, domingos y feriados las 24 horas. En la Triple Horario existe además el valle, de 00:00 a 07:00 todos los días. Con medidor inteligente elegís la ventana entre 17–21, 18–22 y 19–23, y esa elección se mantiene 12 meses.',
  },
  {
    question: '¿Cambiar la potencia contratada tiene costo?',
    short: 'Entre 1,4 y 9 kW monofásico, no.',
    answer:
      'Los aumentos o reducciones de potencia entre servicios monofásicos de 1,4 kW a 9 kW, y entre monofásicos de 9,5 a 11,5 kW, no tienen costo. Se pide por el 0800 1930 o en una oficina comercial. Como se paga $ 83,2 + IVA por kW contratado todos los meses, bajar potencia que no usás es de las pocas rebajas que no exigen cambiar ningún hábito.',
  },
  {
    question: '¿Por qué la factura del agua tiene dos partes parecidas?',
    short: 'Porque el saneamiento cobra otra vez el mismo consumo de agua.',
    answer:
      'El cargo variable del saneamiento convencional es el 100 % del importe facturado por cargo variable de agua. En una casa conectada a la red, cada metro cúbico se paga dos veces: una como agua y otra como saneamiento. Además hay dos cargos fijos: el de agua, que depende del diámetro de la conexión, y el de saneamiento, de $ 137,05 por unidad y por mes.',
  },
  {
    question: '¿Quién tiene el 40 % de descuento de UTE?',
    short: 'Jubilados del BPS con prima por edad y becarios del Fondo de Solidaridad.',
    answer:
      'Requiere consumir menos de 230 kWh por mes y tener potencia contratada de hasta 3,5 kW. Se puede pasar el tope hasta dos veces en doce meses; a la tercera se pierde el beneficio. Para los jubilados es automático si el servicio está a su nombre; los estudiantes tienen que presentar el formulario. No se acumula con el Bono Social ni con la bonificación por electrodependencia de ASSE o BPS.',
  },
])
