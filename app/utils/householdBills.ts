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
//
// FUENTES PRIMARIAS AGREGADAS EL 2026-08-10, para el bloque de FAQ sobre saneamiento, facturación
// estimada, daños eléctricos, mora y carga de vehículos eléctricos:
//   - UTE, Pliego Tarifario vigente desde el 01/01/2026 (tasas, reconexión, multa por mora, UBT)
//     https://www.ute.com.uy/sites/default/files/docs/Pliego%20Tarifario%20Enero%202026.pdf
//   - URSEA, Reglamento de Calidad del Servicio de Distribución (Res. 29/2003 y modificativas)
//     https://www.impo.com.uy/bases/resoluciones-ursea-reglamento/29-2003
//   - URSEA, Texto Ordenado de Resoluciones de Energía Eléctrica (enero 2019)
//     https://www.gub.uy/unidad-reguladora-servicios-energia-agua/sites/unidad-reguladora-servicios-energia-agua/files/2019-07/Revisado_TOR2_Energia_Electrica_2019_01_0.pdf
//
//     OJO CON LA NUMERACIÓN DEL REGLAMENTO DE CALIDAD: hay tres numeraciones distintas dando
//     vueltas y citar la equivocada manda al lector a una tabla que no es. El texto que sirve
//     IMPO es la Res. 29/2003 con modificativas hasta 2006: ahí el art. 45 remite a las Tablas 3
//     y 4 (transitorio y permanente), y la «Tabla 2» es la de metas de continuidad, otra cosa.
//     La Res. URSEA 297/018 (25/09/2018) reescribió ese capítulo y lo dejó en una sola tabla: el
//     texto ordenado de URSEA numera art. 45 el indicador, art. 46 la Tabla 2 («Niveles de
//     tensión: desviaciones admitidas») y art. 47 las compensaciones. Los artículos de
//     facturación estimada y reclamos (74, 76, 86, 88) NO se movieron: valen en las dos.
//     Este módulo cita la numeración del texto ordenado, que es la última publicada.
//   - Ley 17.250, art. 34 — responde el proveedor por el daño del vicio de la prestación
//     https://www.impo.com.uy/bases/leyes/17250-2000/34
//   - Ley 17.250, art. 3 — «proveedor» incluye a las personas jurídicas públicas estatales
//     https://www.impo.com.uy/bases/leyes/17250-2000/3
//   - Ley 17.250, art. 42 lit. F — qué puede el Área de Defensa del Consumidor (verificado
//     2026-08-10): «citar a los proveedores […] a una audiencia administrativa que tendrá por
//     finalidad tentar el acuerdo entre las partes» y «la incomparecencia del citado a una
//     audiencia administrativa se tendrá como presunción simple en su contra». NO hay en todo el
//     artículo una facultad de ordenar devoluciones ni de resolver indemnizaciones: decir que el
//     Área «resuelve si corresponde» es falso y contradice /defensa-al-consumidor-uruguay.
//     https://www.impo.com.uy/bases/leyes/17250-2000/42
//   - Ley 17.250, art. 47 — sanciones (multa de 20 a 4.000 UR, decomiso, clausura hasta 90 días,
//     suspensión hasta un año en los registros de proveedores del Estado). Es un castigo al
//     proveedor, no una reparación al consumidor.
//     https://www.impo.com.uy/bases/leyes/17250-2000/47
//   - Reglamento de Distribución de Energía Eléctrica (Decreto 277/002), art. 22 — corte por impago
//     https://www.impo.com.uy/bases/decretos-reglamento/277-2002/22
//   - UTE, «Qué encuentro en mi factura» — tipo de lectura, estimada o real
//     https://www.ute.com.uy/articulos/que-encuentro-en-mi-factura-0
//   - UTE, aporte de lectura del medidor (hasta cinco días antes de la toma de consumo)
//     https://www.gub.uy/tramites/aporte-lectura-medidor-ute
//   - UTE, reclamo por daños eléctricos (20 días hábiles para el presupuesto)
//     https://www.ute.com.uy/reclamos/reclamo-por-danos-electricos
//   - UTE, financiación de facturas impagas
//     https://www.gub.uy/tramites/financiaciones-ute
//   - Ley 11.907, art. 2 lit. B — OSE presta alcantarillado salvo en el Departamento de Montevideo
//     https://www.impo.com.uy/bases/leyes/11907-1952
//   - Intendencia de Montevideo, tarifa de saneamiento
//     https://montevideo.gub.uy/tipo/area-tematica/ambiente/agua-y-saneamiento/tarifa-de-saneamiento
//   - Normativa departamental A.310.1 (Decreto JDM 29.434, arts. 89 a 95)
//     https://normativa.montevideo.gub.uy/content/a3101
//   - OSE, convenio de pago y reconexión por impago
//     https://www.gub.uy/tramites/solicitud-convenio-pago-financiacion-ose
//     https://www.gub.uy/tramites/solicitud-reconexion-servicio-agua-yo-saneamiento-corte-voluntario-impago-ose
//   - Ley 18.331, art. 22 — cuánto tiempo puede figurar una deuda en una base de datos
//     https://www.impo.com.uy/bases/leyes/18331-2008/22
//   - INE, series históricas de la Unidad Reajustable (los cargos de OSE se fijan en UR).
//     Es donde están los valores; la página temática del INE sólo dice que la UR «se ajusta
//     periódicamente en función del Índice Medio de Salarios» y no habla de periodicidad, así
//     que este módulo no le atribuye una.
//     https://www.gub.uy/instituto-nacional-estadistica/datos-y-estadisticas/estadisticas/series-historicas-ur-ura-coeficiente-alquileres

/** Fecha en que cada cifra de este módulo se contrastó con las fuentes de arriba. */
export const BILLS_VERIFIED_AT = '2026-08-09'

/**
 * Fecha del contraste del bloque de FAQ y del alcance del saneamiento contra sus normas.
 *
 * Va aparte de `BILLS_VERIFIED_AT` a propósito: ese día se revisaron el pliego de UTE, el
 * reglamento de URSEA, el Reglamento de Distribución, las dos leyes y las páginas de trámites,
 * pero NO se volvieron a contrastar los tramos ni los cargos fijos de OSE. Fusionar las dos
 * constantes diría que se verificó algo que no se verificó.
 */
export const BILLS_FAQ_VERIFIED_AT = '2026-08-10'

/** Desde cuándo rigen los precios de UTE y OSE que usa este módulo. */
export const TARIFFS_EFFECTIVE_FROM = '2026-01-01'

/** IVA tasa básica. Se aplica a energía y potencia; NO al cargo fijo residencial. */
export const UTE_IVA_RATE = 0.22

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
  {
    label: 'UTE — Pliego Tarifario vigente desde el 01/01/2026 (tasas, reconexión, mora)',
    url: 'https://www.ute.com.uy/sites/default/files/docs/Pliego%20Tarifario%20Enero%202026.pdf',
  },
  {
    label:
      'URSEA — Reglamento de Calidad del Servicio de Distribución (Res. 29/2003, texto de IMPO: llega hasta las modificativas de 2006)',
    url: 'https://www.impo.com.uy/bases/resoluciones-ursea-reglamento/29-2003',
  },
  {
    label:
      'URSEA — Texto Ordenado de Energía Eléctrica (enero 2019): art. 46 y Tabla 2 (niveles de tensión) y art. 47 (compensaciones)',
    url: 'https://www.gub.uy/unidad-reguladora-servicios-energia-agua/sites/unidad-reguladora-servicios-energia-agua/files/2019-07/Revisado_TOR2_Energia_Electrica_2019_01_0.pdf',
  },
  {
    label: 'Ley 17.250, art. 34 — por el daño del vicio de la prestación responde el proveedor',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/34',
  },
  {
    label:
      'Ley 17.250, art. 3 — «proveedor» incluye a las personas jurídicas públicas, estatales o no',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/3',
  },
  {
    label:
      'Ley 17.250, art. 42 lit. F — la audiencia del Área de Defensa del Consumidor es para «tentar el acuerdo», no para condenar',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/42',
  },
  {
    label: 'Ley 17.250, art. 47 — sanciones: apercibimiento, multa de 20 a 4.000 UR, clausura',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/47',
  },
  {
    label: 'Reglamento de Distribución (Decreto 277/002), art. 22 — corte por impago',
    url: 'https://www.impo.com.uy/bases/decretos-reglamento/277-2002/22',
  },
  {
    label: 'UTE — Qué encuentro en mi factura (tipo de lectura: estimada o real)',
    url: 'https://www.ute.com.uy/articulos/que-encuentro-en-mi-factura-0',
  },
  {
    label: 'UTE — Aporte de lectura del medidor (hasta cinco días antes de la toma)',
    url: 'https://www.gub.uy/tramites/aporte-lectura-medidor-ute',
  },
  {
    label: 'UTE — Reclamo por daños eléctricos (20 días hábiles para el presupuesto)',
    url: 'https://www.ute.com.uy/reclamos/reclamo-por-danos-electricos',
  },
  {
    label: 'UTE — Financiación de facturas impagas',
    url: 'https://www.gub.uy/tramites/financiaciones-ute',
  },
  {
    label: 'Ley 11.907, art. 2 — OSE presta alcantarillado salvo en el Departamento de Montevideo',
    url: 'https://www.impo.com.uy/bases/leyes/11907-1952',
  },
  {
    label: 'Intendencia de Montevideo — Tarifa de saneamiento',
    url: 'https://montevideo.gub.uy/tipo/area-tematica/ambiente/agua-y-saneamiento/tarifa-de-saneamiento',
  },
  {
    label: 'Normativa departamental A.310.1 — Decreto JDM 29.434, arts. 89 a 95',
    url: 'https://normativa.montevideo.gub.uy/content/a3101',
  },
  {
    label: 'OSE — Convenio de pago (hasta 6 cuotas en tarifa residencial)',
    url: 'https://www.gub.uy/tramites/solicitud-convenio-pago-financiacion-ose',
  },
  {
    label: 'OSE — Reconexión del servicio de agua y/o saneamiento por impago',
    url: 'https://www.gub.uy/tramites/solicitud-reconexion-servicio-agua-yo-saneamiento-corte-voluntario-impago-ose',
  },
  {
    label: 'Ley 18.331, art. 22 — cuánto tiempo puede figurar una deuda registrada',
    url: 'https://www.impo.com.uy/bases/leyes/18331-2008/22',
  },
  {
    label:
      'INE — Series históricas de la Unidad Reajustable (los cargos de corte y reconexión de OSE se fijan en UR)',
    url: 'https://www.gub.uy/instituto-nacional-estadistica/datos-y-estadisticas/estadisticas/series-historicas-ur-ura-coeficiente-alquileres',
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
  const iva = round2(taxedBase * UTE_IVA_RATE)
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

// EL 100 % DEL SANEAMIENTO NO SE PUBLICA COMO ESCALAR. Textual del Decreto 340/025: «El cargo
// variable del servicio de saneamiento convencional […] será el 100 % del importe facturado por
// cargo variable de agua». Pero eso sale del decreto que fija las tarifas de OSE, así que sólo
// vale donde OSE presta el saneamiento — y no lo presta en Montevideo. Un `SANEAMIENTO_MULTIPLIER
// = 1` suelto se lee como regla nacional y le cobra al montevideano un renglón que su factura de
// OSE no tiene; existió acá, no lo consumía nadie, y se borró. El dato vive con su alcance pegado
// en `SANEAMIENTO_AUTHORITIES`, que la página sí renderiza fila por fila.

export interface SaneamientoAuthority {
  /** Dónde vale lo de abajo. */
  scope: string
  /** Quién factura el saneamiento ahí. */
  operator: string
  /** En qué factura aparece y cada cuánto. */
  billing: string
  /** Cómo se forma el cargo variable. */
  variableCharge: string
  /** La norma que lo dice, para que no haya que creernos. */
  rule: string
}

/**
 * Quién cobra el saneamiento y con qué regla. Existe porque el corpus de Reddit repite la misma
 * escena: alguien de Montevideo busca el renglón de saneamiento en la factura de OSE, no lo
 * encuentra y concluye que no paga saneamiento. Lo paga: le llega de la Intendencia, aparte, cada
 * dos meses, y con una fórmula distinta a la del decreto de OSE.
 */
export const SANEAMIENTO_AUTHORITIES: readonly SaneamientoAuthority[] = Object.freeze([
  {
    scope: 'Los 18 departamentos que no son Montevideo',
    operator: 'OSE',
    billing: 'En la misma factura de OSE, junto al agua.',
    variableCharge: 'El 100 % del cargo variable de agua del mismo período.',
    rule: 'Ley 11.907, art. 2 lit. B, y Decreto 340/025 (Anexo).',
  },
  {
    scope: 'Montevideo',
    operator: 'Intendencia de Montevideo',
    billing: 'En una factura propia de la Intendencia, cada dos meses.',
    variableCharge:
      'Un cargo fijo por unidad ocupacional más un cargo variable por metro cúbico de agua consumida, sobre el consumo que OSE le pasa por convenio y suponiendo que se vuelca a la red el 85 % del agua que entra.',
    rule: 'Ley 11.907, art. 2 lit. B (excluye a Montevideo de OSE), y Decreto JDM 29.434, arts. 89 a 95.',
  },
])

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

/**
 * Cargo fijo mensual del saneamiento convencional DE OSE, por unidad.
 *
 * Sale del Decreto 340/025, así que vale donde OSE presta el saneamiento. En Montevideo no lo
 * presta (Ley 11.907, art. 2 lit. B): allí el cargo fijo es el de la Intendencia y es otro
 * número. Renderizar esta cifra sin decir de quién es le inventa un renglón a un montevideano.
 */
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
    short:
      'Porque el saneamiento cobra otra vez el mismo consumo. Ojo: eso es la factura de OSE, y en Montevideo el saneamiento no lo cobra OSE.',
    answer:
      'En los 18 departamentos donde OSE presta el saneamiento —todos menos Montevideo— el cargo variable del saneamiento convencional es el 100 % del importe facturado por cargo variable de agua. Ahí cada metro cúbico se paga dos veces en la misma factura: una como agua y otra como saneamiento. Y hay dos cargos fijos: el de agua, que depende del diámetro de la conexión, y el del saneamiento de OSE, de $ 137,05 por unidad y por mes. En Montevideo esa factura tiene una sola de las dos partes: el saneamiento lo cobra la Intendencia, aparte y con otra fórmula (ver la pregunta sobre a quién le pagás el saneamiento).',
  },
  {
    question: '¿Quién tiene el 40 % de descuento de UTE?',
    short: 'Jubilados del BPS con prima por edad y becarios del Fondo de Solidaridad.',
    answer:
      'Requiere consumir menos de 230 kWh por mes y tener potencia contratada de hasta 3,5 kW. Se puede pasar el tope hasta dos veces en doce meses; a la tercera se pierde el beneficio. Para los jubilados es automático si el servicio está a su nombre; los estudiantes tienen que presentar el formulario. No se acumula con el Bono Social ni con la bonificación por electrodependencia de ASSE o BPS.',
  },
  {
    question:
      '¿A quién le pago el saneamiento y por qué en Montevideo no viene en la factura de OSE?',
    short:
      'Porque OSE no presta saneamiento en Montevideo: ahí lo cobra la Intendencia, en una factura aparte.',
    answer:
      'La Ley 11.907 le encarga a OSE «la prestación del servicio de alcantarillado en todo el territorio de la República, excepto en el Departamento de Montevideo» (art. 2, lit. B). Por eso en los otros 18 departamentos el saneamiento viene en la misma factura de OSE y sigue la regla del Decreto 340/025: el cargo variable es el 100 % del de agua. En Montevideo lo cobra la Intendencia, con una tarifa propia creada por los artículos 89 a 95 del Decreto 29.434 de la Junta Departamental, que se factura cada dos meses y se forma con un cargo fijo por unidad ocupacional más un cargo variable por metro cúbico de agua consumida; el consumo se lo pasa OSE por convenio y la tarifa está calculada suponiendo que se vuelca a la red el 85 % del agua que entra. Los importes los publica la Intendencia por período: los últimos que figuraban en su portal el 10 de agosto de 2026 seguían siendo los de junio a setiembre de 2025 ($ 80,76 de cargo fijo por unidad ocupacional y por mes, y $ 45,30 por metro cúbico). En los dos casos se paga por usar la red: la norma departamental alcanza a «los ocupantes de inmuebles a cualquier título en el Departamento de Montevideo que hagan uso de las redes de saneamiento».',
    // Fuentes: Ley 11.907 art. 2; Decreto 340/025; Intendencia de Montevideo; normativa A.310.1.
  },
  {
    question: '¿Me facturaron un consumo que no hice: cuándo estima UTE y cómo se corrige?',
    short:
      'Estimada quiere decir que no se accedió al medidor. Aportá vos la lectura y, si ya salió mal, reclamá el importe.',
    answer:
      'La propia factura lo dice: después de la lectura anterior y la actual figura «el tipo de lectura, si fue estimada (no se accedió al medidor) o real (si se accedió)». No es una excepción, es el diseño del sistema. El reglamento de calidad de URSEA arranca por ahí: «El Distribuidor realizará las lecturas de consumos con periodicidad bimestral, aunque la facturación será mensual, por lo que el consumo correspondiente a cada mes intermedio sin lectura será estimado» (art. 74). Lo que el reglamento acota son los límites: el plazo máximo sin lectura no puede pasar de 4 meses en el período de control semestral, y «los consumos informados por los Consumidores no se computarán como estimados» (art. 76). Ahí está la palanca real: aportar la lectura corta la cadena de estimaciones. Se hace por la app de UTE, por Servicios en Línea, por WhatsApp al 098 1930 00, por SMS al 1930 o por Telegestiones (0800 1930 desde fijo, *1930 desde celular), hasta cinco días antes de la fecha habitual en que pasan a tomar el consumo. Si la factura ya salió mal, reclamá el importe: mientras UTE responde y eventualmente refactura, el vencimiento de esa factura se prorroga al día hábil inmediato siguiente al de la respuesta (art. 86); y si ya la habías pagado, la devolución va con la factura del mes siguiente (art. 88).',
    // Fuentes: UTE «Qué encuentro en mi factura»; trámite de aporte de lectura; URSEA Res. 29/2003.
  },
  {
    question: '¿Se me quemó un electrodoméstico por una variación de tensión: UTE lo paga?',
    short:
      'Hay un trámite con plazo de 20 días hábiles. El reglamento de URSEA no prevé resarcimiento por el artefacto; la vía por el daño es la Ley 17.250.',
    answer:
      'El trámite existe y se llama reclamo por daños eléctricos: cubre «daños causados por descargas eléctricas sobre electrodomésticos, animales u otros objetos» y se inicia por Telegestiones (0800 1930 desde fijo, *1930 desde celular), por correo a comercial@ute.com.uy o en una oficina comercial con agenda previa. Desde la fecha de inicio corren 20 días hábiles para presentar la descripción del elemento afectado y un presupuesto en papel membretado a nombre de la empresa que evaluó el daño, con el importe de reparación cuando corresponda. Hasta ahí llega lo escrito, y conviene saber dónde deja de haber norma: el reglamento de calidad del servicio de distribución de URSEA no tiene un solo artículo de daños, resarcimiento ni indemnización. Lo que sí regula es el nivel de tensión (en baja tensión, 230 V y 400 V, la desviación admitida va de -10 % a +6 %, y de -12 % a +6 % en las zonas ADT 4 y 5: Tabla 2, «Niveles de tensión: desviaciones admitidas», art. 46 del texto ordenado de URSEA) y, cuando más del 3 % de las mediciones del período quedan fuera de rango, obliga a compensar a los usuarios afectados con un monto calculado sobre su factura promedio (art. 47). Por esa vía vuelve plata de la factura, no la heladera. Que el reglamento no lo prevea no quiere decir que no exista ninguna vía por el artefacto: la Ley 17.250 dice que «si el vicio o riesgo de la cosa o de la prestación del servicio resulta un daño al consumidor, será responsable el proveedor de conformidad con el régimen dispuesto en el Código Civil» (art. 34), y su art. 3 define proveedor incluyendo a las personas jurídicas públicas, «estatal o no estatal». Esa vía empieza con el reclamo ante el Área de Defensa del Consumidor y sigue, si no hay acuerdo, en sede judicial; y no es automática: hay que probar el daño y que lo causó la prestación del servicio. Ojo con hasta dónde llega el organismo, porque es el malentendido más caro: la ley le da citar al proveedor a «una audiencia administrativa que tendrá por finalidad tentar el acuerdo entre las partes», donde «la incomparecencia del citado a una audiencia administrativa se tendrá como presunción simple en su contra» (art. 42, lit. F), y sancionarlo con multa de 20 a 4.000 UR (art. 47 de esa misma ley, que no es el art. 47 de URSEA de más arriba), que es un castigo del Estado al proveedor y no una reparación para vos. Ordenar que te paguen el artefacto sólo lo puede hacer un juez. Anotá la fecha y la hora del corte o la variación, sacale fotos al artefacto y pedí el presupuesto el mismo día: el plazo corre desde que iniciás el trámite, no desde que conseguís el presupuesto.',
    // Fuentes: UTE, reclamo por daños eléctricos; URSEA, texto ordenado (arts. 45 a 47);
    // Ley 17.250, arts. 3, 34, 42 lit. F y 47. Lo que puede y lo que no puede el Área está
    // desarrollado en /defensa-al-consumidor-uruguay (DEFENSE_POWERS): las dos páginas tienen
    // que decir lo mismo sobre el mismo organismo.
  },
  {
    question: '¿Me atrasé con UTE o con OSE: qué pasa y cómo salgo?',
    short:
      'Multa por mora, corte a los 30 días del vencimiento y convenio para volver. Lo del Clearing no lo dice ninguna norma de UTE.',
    answer:
      'UTE: el pliego tarifario cobra una multa por mora del 5 % del importe facturado si pagás dentro de los 5 días hábiles siguientes al vencimiento, y del 10 % si pagás después. El Reglamento de Distribución habilita el corte «cuando hubiere transcurrido un plazo de 30 (treinta) días corridos desde la configuración del vencimiento de una factura» (Decreto 277/002, art. 22, lit. a), con notificación escrita 10 días hábiles antes salvo que haya limitador instalado. La deuda se financia: el trámite de financiación de facturas impagas no tiene costo, aunque se le aplican intereses de financiación. Antes de asustarte con la reconexión, mirá qué dice el pliego, que separa dos cosas: la reconexión del servicio (numeral 1.4) sale $ 2.375 y sólo figura «en servicios de medida indirecta»; la rehabilitación va aparte (numeral 1.5) y son $ 2.220 «en servicios de medida directa que no requieran DAR, habiendo transcurrido más de 30 días desde la baja del servicio» y $ 3.128 «en servicios de medida indirecta». O sea que la rehabilitación no es un asunto exclusivo de la medida directa, y la de $ 2.220 pide esa condición: que no requiera DAR. OSE: el Decreto 340/025 cobra UR 1 por el primer corte de agua por impago y UR 1 por el de saneamiento, más UR 1 por reconectar cada uno (el valor de la UR lo publica el INE); el convenio de pago no tiene cargo y admite hasta 6 cuotas en tarifa residencial y hasta 4 en el resto. Sobre el Clearing: ni el pliego, ni el Reglamento de Distribución, ni las páginas de trámites de UTE y OSE dicen que la deuda se informe a un buró de crédito. Lo único escrito es cuánto puede durar el registro si llega a informarse: cinco años desde su incorporación, renovables por otros cinco por única vez y sólo si el acreedor lo pide dentro de los treinta días previos al vencimiento (Ley 18.331, art. 22).',
    // Fuentes: Pliego Tarifario 01/01/2026; Decreto 277/002 art. 22; Decreto 340/025; Ley 18.331.
  },
  {
    question:
      '¿Cargar el auto eléctrico en casa exige otra tarifa, otro medidor o me pasan a comercial?',
    short:
      'En el pliego no existe ninguna tarifa de movilidad: cargás con tu tarifa residencial. Lo que se mueve es la potencia.',
    answer:
      'El pliego tarifario vigente desde el 01/01/2026 no tiene ninguna tarifa de movilidad eléctrica ni una sola mención a vehículos o cargadores. Las tres residenciales se definen «para los servicios conectados en los niveles de tensión 230 V y 400 V con modalidad de consumo Residencial»: por tensión y potencia contratada, no por el uso que le des a la energía. La General Simple, en cambio, es la de «modalidad de consumo no Residencial ni Alumbrado Público». Tampoco figura en el pliego ningún requisito de medidor aparte para cargar en casa. Lo que sí se mueve es la potencia: el cargador suma kW simultáneos y cada kW contratado cuesta $ 83,2 más IVA todos los meses, lo uses o no. Antes de subirla, leé la letra chica del propio pliego: con instalación monofásica y potencia contratada de hasta 11,5 kW no se puede renunciar parcialmente a la potencia contratada antes de los 12 meses contados desde la última contratación. Y si vas a cargar de madrugada, la Triple Horario es donde eso paga: el valle de 00:00 a 07:00 está a $ 2,443 el kWh contra $ 8,452 del tramo medio de la Simple.',
    // Fuente: Pliego Tarifario vigente desde el 01/01/2026 (tarifas residenciales y tasas).
  },
])
