/**
 * Tarifarios IAMC del MSP, julio de 2026. Cinco conceptos de consulta frecuente,
 * con TODAS las columnas de cada régimen del archivo. No identifica el convenio
 * de una persona ni interpreta «PRECIO 1» como precio general o contratado.
 *
 * El máximo autorizado es la columna F del MSP, común a los regímenes. Cada
 * importe se publica SIN IVA ni timbres. Un cero se conserva como cero en esa
 * columna; no prueba que el usuario esté exonerado de todos los cargos.
 *
 * Generador: app/scripts/extract-mutualista-costs.py --source <archivo.xlsx>.
 * El original se descarga desde MUTUALISTA_COST_SOURCE.downloadUrl. Instrucciones
 * de reproducción y actualización en docs/app/MUTUALISTA_COSTS.md.
 * El generador valida los encabezados, encuentra los conceptos por su texto y
 * conserva la referencia de cada celda. No aplica aumentos ni rellena huecos.
 */

export type MutualistaCostAffiliation = 'fonasa' | 'no-fonasa' | 'sanidad-policial'

export const MUTUALISTA_COST_CONCEPTS = [
  {
    id: 'medicamentos',
    label: 'Ticket de medicamentos general',
    sourceLabel: 'TICKET DE MEDICAMENTOS - GENERAL',
  },
  {
    id: 'medicina-general',
    label: 'Medicina general en consultorio',
    sourceLabel: 'CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL',
  },
  {
    id: 'especialistas',
    label: 'Otras especialidades en consultorio',
    sourceLabel: 'CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES',
  },
  {
    id: 'urgencia-centralizada',
    label: 'Consulta de urgencia centralizada',
    sourceLabel: 'CONSULTA URGENCIA CENTRALIZADA',
  },
  {
    id: 'consulta-domicilio',
    label: 'Consulta no urgente a domicilio',
    sourceLabel: 'CONSULTA NO URGENCIA DOMICILIO',
  },
] as const

export type MutualistaCostConceptId = (typeof MUTUALISTA_COST_CONCEPTS)[number]['id']
type ConceptValues = Readonly<Record<MutualistaCostConceptId, number | null>>

export interface MutualistaCostColumn {
  column: string
  affiliation: MutualistaCostAffiliation
  /** Texto literal del encabezado, incluida cualquier condición que exprese. */
  label: string
  /** Sólo la condición textual que el MSP identifica en la fila superior. */
  condition: string | null
  amounts: ConceptValues
}

export interface MutualistaCostInstitution {
  id: string
  /** Nombre del campo INSTITUCIÓN del archivo, no una identidad inferida. */
  name: string
  sheet: string
  effectiveFrom: string
  maxima: ConceptValues
  sourceRows: Readonly<Record<MutualistaCostConceptId, { row: number; label: string }>>
  columns: readonly MutualistaCostColumn[]
}

export interface MutualistaCostRow {
  column: string
  affiliation: MutualistaCostAffiliation
  label: string
  condition: string | null
  amountUyu: number | null
  valueCell: string
  sourceCell: string
  sourceLabel: string
  maximumAuthorizedUyu: number | null
  /** Contradicción del archivo fuente, conservada y visible sin corregir cifras. */
  exceedsPublishedMaximum: boolean
}

/** Importe numérico de XLSX: un dato faltante nunca se transforma en cero. */
export function normalizeMutualistaAmount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

/** Sólo reconoce encabezados expresos. Sanidad Policial no es «No FONASA». */
export function normalizeMutualistaAffiliation(value: unknown): MutualistaCostAffiliation | null {
  if (typeof value !== 'string') return null
  const text = value.trim().replace(/\s+/g, ' ').toUpperCase()
  if (text === 'FONASA') return 'fonasa'
  if (text === 'NO FONASA') return 'no-fonasa'
  if (text === 'SANIDAD POLICIAL') return 'sanidad-policial'
  return null
}

/**
 * Un número suelto en la fila auxiliar (p. ej. 0,4 en CASMU) no identifica un
 * convenio ni autoriza a inferir «40% de descuento». La etiqueta principal del
 * MSP sí puede expresarlo y se conserva completa.
 */
export function normalizeMutualistaCondition(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

type CostVector = readonly [
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
]
type SourceRowVector = readonly [
  readonly [number, string],
  readonly [number, string],
  readonly [number, string],
  readonly [number, string],
  readonly [number, string],
]
type RawColumn = readonly [string, MutualistaCostAffiliation, string, string | null, CostVector]
type RawInstitution = readonly [
  string,
  string,
  string,
  string,
  CostVector,
  SourceRowVector,
  readonly RawColumn[],
]

// BEGIN GENERATED MSP DATA
export const MUTUALISTA_COST_SOURCE = {
  pageUrl:
    'https://www.gub.uy/ministerio-salud-publica/datos-y-estadisticas/datos/precios-tickets-ordenes-instituciones-asistencia-medica-colectiva-iamc-julio-2026',
  downloadUrl:
    'https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/2026-09/Precios%20Tasas%20Moderadoras%20-%20Julio%202026.xlsx',
  publishedAt: '2026-09-03',
  effectiveFrom: '2026-07-01',
  verifiedAt: '2026-09-14',
  sha256: '1c189260422ff5a131bbb2e87d862b1c0226974378d2d402eea5337a868df821',
  ivaRate: 0.1,
  medicineStampUyu: 44,
  diagnosticStampUyu: 170,
} as const

// Compact source tuples: preserve column order and unrounded numeric values.
// prettier-ignore
const RAW_INSTITUTIONS: readonly RawInstitution[] = [
  [
    "a-espanola", "ASOCIACION ESPAÑOLA", "A.Española", "2026-07-01",
    [371.5985219968195, 172.66469098326567, 435.06667107842185, 880, 781.7846287842036],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [371.59852199681904, 172.66469098326567, 435.06667107842185, 880, 781.7846287842036]],
      ["H", "no-fonasa", "PRECIO 2", null, [241.25728021335613, 0, 217.53333553921092, 560.6239670754228, 355.92454502968695]],
      ["I", "no-fonasa", "PRECIO 3", null, [167.51661371616612, null, 0, 0, 0]],
      ["J", "no-fonasa", "PRECIO 4", null, [0, null, null, null, null]],
      ["K", "no-fonasa", "PRECIO 5", null, [136.58103675993092, null, null, null, null]],
      ["L", "no-fonasa", "PRECIO 6", "ANCAP", [129.07460275672716, 82.14085989509563, 110.82410495214617, 183.82609617047024, 147.32510056130818]],
      ["M", "no-fonasa", "PRECIO 7", "BHU", [177.63590866884184, 34.2707575378933, 220.07853089535354, null, 84.78309614441558]],
      ["N", "no-fonasa", "PRECIO 8", "ANCAP BONIF", [32.592120333106266, 20.865494504938894, 27.37574670687154, 45.639864285933605, 36.50099560916205]],
      ["O", "no-fonasa", "PRECIO 9", "EXGREMCA COMUN", [289.7754463578954, 161.0622602471198, 435.06544568166396, 442.26087559279824, 639.9985760620708]],
      ["P", "no-fonasa", "PRECIO 10", "EX GR METZEN", [157.60116737847295, null, null, null, null]],
      ["Q", "no-fonasa", "PRECIO 11", "EX GR COFFE", [93.84419348234631, null, null, null, null]],
      ["R", "no-fonasa", "PRECIO 12", "EX GR FUNC", [61.75318328796263, null, null, null, null]],
      ["S", "no-fonasa", "PRECIO 13", "TRANSP 30%", [260.1132732643165, null, null, null, 423.7258124672814]],
      ["T", "no-fonasa", "PRECIO 14", "TRANSP CRON", [111.48362292694138, null, null, null, null]],
      ["U", "no-fonasa", "PRECIO 15", "IMM", [148.6448305692552, null, null, null, null]],
      ["V", "no-fonasa", "PRECIO 16", null, [49.630707735495065, null, null, null, null]],
      ["W", "fonasa", "PRECIO 1", null, [371.59852199681904, 172.66469098326567, 435.06667107842185, 880, 781.7846287842036]],
      ["X", "fonasa", "PRECIO 2", null, [314.1679704222107, 135.99071061842005, 287.1875095788663, 560.6239670754228, 574.8096658290152]],
      ["Y", "fonasa", "PRECIO 3", null, [185.79926099840952, null, null, 394.7520024168265, 172.96238009656935]],
      ["Z", "fonasa", "PRECIO 4", null, [0, null, null, 0, 0]],
      ["AA", "fonasa", "PRECIO 5", null, [136.58103675993092, null, null, null, null]],
      ["AB", "fonasa", "PRECIO 6", "ANCAP", [129.07460275672716, 82.14085989509563, 110.82410495214617, 183.82609617047024, 147.32510056130818]],
      ["AC", "fonasa", "PRECIO 7", "BHU", [177.63590866884184, 34.2707575378933, 220.07853089535354, null, 84.78309614441558]],
      ["AD", "fonasa", "PRECIO 8", "ANCAP BONIF", [32.592120333106266, 20.865494504938894, 27.37574670687154, 45.639864285933605, 36.50099560916205]],
      ["AE", "fonasa", "PRECIO 9", "EXGREMCA COMUN", [289.7754463578954, 161.0622602471198, 435.06544568166396, 442.26087559279824, 639.9985760620708]],
      ["AF", "fonasa", "PRECIO 10", "EX GR METZEN", [157.60116737847295, null, null, null, null]],
      ["AG", "fonasa", "PRECIO 11", "EX GR COFFE", [93.84419348234631, null, null, null, null]],
      ["AH", "fonasa", "PRECIO 12", "EX GR FUNC", [61.75318328796263, null, null, null, null]],
      ["AI", "fonasa", "PRECIO 13", "TRANSP 30%", [260.1132732643165, null, null, null, 423.7258124672814]],
      ["AJ", "fonasa", "PRECIO 14", "TRANSP CRON", [111.48362292694138, null, null, null, null]],
      ["AK", "fonasa", "PRECIO 15", "IMM", [148.6448305692552, null, null, null, null]],
      ["AL", "fonasa", "PRECIO 16", null, [49.630707735495065, null, null, null, null]],
    ],
  ],
  [
    "h-evangelico", "MUTUALISTA HOSPITAL EVANGELICO", "H.Evangelico", "2026-07-01",
    [317.2406858913728, 174.05995850139658, 392.9036407062349, 509.0886112208526, 702.1358038468322],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [317.2406858913728, 174.05995850139658, 392.9036407062349, 509.0886112208526, 702.1358038468322]],
      ["H", "no-fonasa", "PRECIO 2", null, [0, 0, 0, 0, 0]],
      ["I", "no-fonasa", "PRECIO 3", null, [null, null, null, null, null]],
      ["J", "fonasa", "PRECIO 1", null, [317.2406858913728, 174.05995850139658, 392.9036407062349, 509.0886112208526, 702.1358038468322]],
      ["K", "fonasa", "PRECIO 2", null, [0, 0, 0, 0, 0]],
      ["L", "fonasa", "PRECIO 3", null, [null, null, null, null, null]],
    ],
  ],
  [
    "casmu", "CASMU", "CASMU", "2026-07-01",
    [382.31031083086015, 174.437734785841, 455.765215676681, 721.7640446950976, 721.7640446950976],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1 = 0% descuento", null, [382.31031083086015, 174.437734785841, 455.765215676681, 721.7640446950976, 721.7640446950976]],
      ["H", "no-fonasa", "PRECIO 2 = 100% descuento", null, [0, 0, 0, 0, 0]],
      ["I", "no-fonasa", "PRECIO 3 = 50% descuento", null, [191.15515541543007, 87.2188673929205, 227.8826078383405, 360.8820223475488, 360.8820223475488]],
      ["J", "no-fonasa", "PRECIO 4 = 40% desceunto", null, [229.38618649851608, 104.66264087150459, 273.4591294060086, 433.05842681705855, 433.05842681705855]],
      ["K", "no-fonasa", "PRECIO 5 = 5% descuento", null, [363.19479528931714, 165.71584804654896, 432.97695489284695, 685.6758424603427, 685.6758424603427]],
      ["L", "no-fonasa", "PRECIO 6 = 25% descuento", null, [286.7327331231451, 130.82830108938074, 341.82391175751076, 541.3230335213232, 541.3230335213232]],
      ["M", "no-fonasa", "PRECIO 7 = 20% descuento", null, [305.84824866468813, 139.5501878286728, 364.6121725413448, 577.4112357560781, 577.4112357560781]],
      ["N", "fonasa", "PRECIO 1 = 0% descuento", null, [382.31031083086015, 174.437734785841, 455.765215676681, 721.7640446950976, 721.7640446950976]],
      ["O", "fonasa", "PRECIO 2 = 100% descuento", null, [0, 0, 0, 0, 0]],
      ["P", "fonasa", "PRECIO 3 = 50% descuento", null, [191.15515541543007, 87.2188673929205, 227.8826078383405, 360.8820223475488, 360.8820223475488]],
      ["Q", "fonasa", "PRECIO 4 = 40% desceunto", null, [229.38618649851608, 104.66264087150459, 273.4591294060086, 433.05842681705855, 433.05842681705855]],
      ["R", "fonasa", "PRECIO 5 = 5% descuento", null, [363.19479528931714, 165.71584804654896, 432.97695489284695, 685.6758424603427, 685.6758424603427]],
      ["S", "fonasa", "PRECIO 6 = 25% descuento", null, [286.7327331231451, 130.82830108938074, 341.82391175751076, 541.3230335213232, 541.3230335213232]],
      ["T", "fonasa", "PRECIO 7 = 20% descuento", null, [305.84824866468813, 139.5501878286728, 364.6121725413448, 577.4112357560781, 577.4112357560781]],
    ],
  ],
  [
    "ccou", "CCOU", "CCOU", "2026-07-01",
    [307.1118256056581, 174.80234789741732, 515.8783670573704, 638.0027739330737, 710.1494983077868],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [307.1118256056581, 174.80234789741732, 515.8783670573704, 638.0027739330737, 710.1494983077868]],
      ["H", "fonasa", "PRECIO 1", null, [198.12377042592968, 0, 0, 638.0027739330737, 710.1494983077868]],
    ],
  ],
  [
    "cudam", "CUDAM", "CUDAM", "2026-07-01",
    [258.84866848823685, 154.21592181874306, 305.6147361334766, 0, 445.86940458676105],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [258.84866848823685, 154.21592181874306, 305.6147361334766, 0, 445.86940458676105]],
      ["H", "no-fonasa", "PRECIO 2", null, [193.9345906419825, null, 152.80736806673846, null, 222.93470229338052]],
      ["I", "no-fonasa", "PRECIO 3", null, [135.25942747215367, 0, 0, 0, 0]],
      ["J", "no-fonasa", "PRECIO 4", null, [32.59133719607361, null, null, null, null]],
      ["K", "no-fonasa", "PRECIO 5", null, [177.6389220439457, null, null, null, null]],
      ["L", "no-fonasa", "PRECIO 6", null, [0, null, null, null, null]],
      ["M", "fonasa", "PRECIO 1", null, [239.5588773108535, 0, 0, 0, 0]],
      ["N", "fonasa", "PRECIO 2", null, [135.25942747215367, null, null, null, null]],
      ["O", "fonasa", "PRECIO 3", null, [128.7339892216747, null, null, null, null]],
      ["P", "fonasa", "PRECIO 4", null, [0, null, null, null, null]],
      ["Q", "fonasa", "PRECIO 5", null, [258.84381401198686, null, null, null, null]],
      ["R", "fonasa", "PRECIO 6", null, [193.92856389177467, null, null, null, null]],
      ["S", "fonasa", "PRECIO 7", null, [177.63590866884184, null, null, null, null]],
    ],
  ],
  [
    "cosem", "COSEM", "COSEM", "2026-07-01",
    [367.09396460332636, 173.85281824374886, 525.9498281933788, 315.8325987378056, 594.9275339900762],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [367.09396460332636, 173.85281824374886, 525.9498281933788, 315.8325987378056, 594.9275339900762]],
      ["H", "no-fonasa", "PRECIO 2", null, [256.95748961202247, 0, 420.7432913340912, null, null]],
      ["I", "no-fonasa", "PRECIO 3", null, [220.25223595684292, null, 368.15037991732976, null, null]],
      ["J", "no-fonasa", "PRECIO 4", null, [183.54698230166318, null, 315.5574685005685, null, null]],
      ["K", "no-fonasa", "PRECIO 5", null, [0, null, 0, null, null]],
      ["L", "no-fonasa", "PRECIO 6", null, [null, null, null, null, null]],
      ["M", "fonasa", "PRECIO 1", null, [367.09396460332636, 173.85281824374886, 525.9498281933788, 315.8325987378056, 594.9275339900762]],
      ["N", "fonasa", "PRECIO 2", null, [256.95748961202247, 0, 420.7432913340912, null, null]],
      ["O", "fonasa", "PRECIO 3", null, [220.25223595684292, null, 368.15037991732976, null, null]],
      ["P", "fonasa", "PRECIO 4", null, [183.54698230166318, null, 315.5574685005685, null, null]],
      ["Q", "fonasa", "PRECIO 5", null, [0, null, 0, null, null]],
      ["R", "fonasa", "PRECIO 6", null, [null, null, null, null, null]],
    ],
  ],
  [
    "gremca", "GREMCA", "GREMCA", "2026-07-01",
    [289.7724831888524, 161.05642099533844, 442.2563303315587, 442.2563303315587, 639.9999415373189],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [289.7724831888524, 161.05642099533844, 442.2563303315587, 442.2563303315587, 639.9999415373189]],
      ["H", "no-fonasa", "PRECIO 2", null, [157.59650456033174, 0, 0, 0, 0]],
      ["I", "no-fonasa", "PRECIO 3", null, [145.4419794674066, null, null, null, null]],
      ["J", "no-fonasa", "PRECIO 4", null, [127.19226479985821, null, null, null, null]],
      ["K", "no-fonasa", "PRECIO 5", null, [61.75861201346181, null, null, null, null]],
      ["L", "fonasa", "PRECIO 1", null, [93.84419348234631, 161.05642099533844, 442.2563303315587, 442.2563303315587, 639.9999415373189]],
      ["M", "fonasa", "PRECIO 2", null, [61.75318328796263, 0, 0, 0, 0]],
      ["N", "fonasa", "PRECIO 3", null, [0, null, null, null, null]],
      ["O", "fonasa", "PRECIO 4", null, [null, null, null, null, null]],
      ["P", "fonasa", "PRECIO 5", null, [null, null, null, null, null]],
    ],
  ],
  [
    "mucam", "MUCAM", "MUCAM", "2026-07-01",
    [354.72066014122385, 175.23594167980244, 535.6037759702701, 706.2393297845159, 752.006595525646],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [354.72066014122385, 175.23594167980244, 535.6037759702701, 706.2393297845159, 752.006595525646]],
      ["H", "no-fonasa", "PRECIO 2", null, [177.42379770601784, 0, 0, 0, 0]],
      ["I", "fonasa", "PRECIO 1", null, [354.72066014122385, 0, 0, 0, 0]],
      ["J", "fonasa", "PRECIO 2", null, [177.42379770601784, null, null, null, null]],
      ["K", "fonasa", "PRECIO 3", null, [177.42379770601784, null, null, null, null]],
    ],
  ],
  [
    "smi", "SMI", "SMI", "2026-07-01",
    [353.72333410959084, 187.56550330002932, 397.29501416836695, 594.1913483849615, 543.4038214116858],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [353.72333410959084, 187.56550330002932, 397.29501416836695, 594.1913483849615, 543.4038214116858]],
      ["H", "no-fonasa", "PRECIO 2", null, [256.31535481331446, 0, 328.07941314608223, 392.1720524352946, 0]],
      ["I", "no-fonasa", "PRECIO 3", null, [174.30449480606356, null, 0, 0, null]],
      ["J", "no-fonasa", "PRECIO 4", null, [0, null, null, null, null]],
      ["K", "fonasa", "PRECIO 1", null, [353.72333410959084, 187.56550330002932, 397.29501416836695, 594.1913483849615, 543.4038214116858]],
      ["L", "fonasa", "PRECIO 2", null, [256.31535481331446, 0, 328.07941314608223, 392.1720524352946, 0]],
      ["M", "fonasa", "PRECIO 3", null, [174.30449480606356, null, 0, 0, null]],
      ["N", "fonasa", "PRECIO 4", null, [0, null, null, null, null]],
    ],
  ],
  [
    "universal", "UNIVERSAL", "UNIVERSAL", "2026-07-01",
    [292.92764014512795, 174.04369314947004, 240.88340561855787, 431.09124617930814, 589.8213586191322],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [292.92764014512795, 174.04369314947004, 240.88340561855787, 431.09124617930814, 589.8213586191322]],
      ["H", "no-fonasa", "PRECIO 2", null, [146.4626082726923, 87.03035893378564, 120.45205982216127, 215.55015210823913, 294.9055848130887]],
      ["I", "no-fonasa", "PRECIO 3", null, [0, 0, 0, 0, 0]],
      ["J", "fonasa", "PRECIO 1", null, [146.4626082726923, 0, 0, 0, 294.9055848130887]],
      ["K", "fonasa", "PRECIO 2", null, [0, 0, 0, 0, 0]],
    ],
  ],
  [
    "gremeda", "GREMEDA", "GREMEDA", "2026-07-01",
    [284.0100072608166, 164.47804268517723, 207.10359878949205, 377.00177375222245, 547.5263602866854],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [284.0100072608166, 164.47804268517723, 207.10359878949205, 377.00177375222245, 547.5263602866854]],
      ["H", "no-fonasa", "PRECIO 2", null, [255.71464806613628, 140.54466481399217, 178.1820496285866, 200.13891693924765, 501.15513935294393]],
      ["I", "no-fonasa", "PRECIO 3", null, [218.13940532883458, 70.73839798670352, 82.8768170848612, 158.42086904899367, 178.6999002727052]],
      ["J", "no-fonasa", "PRECIO 4", null, [169.06787829208548, 55.92786956489003, 70.4276876002319, 107.75436202835469, 161.61082901676772]],
      ["K", "no-fonasa", "PRECIO 5", null, [136.73328407327318, 54.91288230241621, 57.398565394189035, 75.41976780954259, 76.6626093554289]],
      ["L", "no-fonasa", "PRECIO 6", null, [122.29560811522613, 6.8770565539050015, 8.617034718146032, 32.62459057951916, 32.85244486293175]],
      ["M", "no-fonasa", "PRECIO 7", null, [100.67016521680209, 0, 0, 7.684903558731176, 7.767759661790284]],
      ["N", "no-fonasa", "PRECIO 8", null, [82.06897008003493, null, null, 0, 0]],
      ["O", "no-fonasa", "PRECIO 9", null, [75.52333793836631, null, null, null, null]],
      ["P", "no-fonasa", "PRECIO 10", null, [0, null, null, null, null]],
      ["Q", "sanidad-policial", "SUBALTERNO   PRECIO 15", null, [72.73, 72.73, 72.73, 72.73, 72.73]],
      ["R", "sanidad-policial", "SUPERIOR   PRECIO 16", null, [145.45, 145.45, 145.45, 145.45, 145.45]],
      ["S", "fonasa", "PRECIO 1", null, [284.0100072608166, 164.47804268517723, 207.10359878949205, 377.00177375222245, 547.5263602866854]],
      ["T", "fonasa", "PRECIO 2", null, [255.69393404037243, 77.82259479825628, 70.4276876002319, 107.75436202835469, 178.6999002727052]],
      ["U", "fonasa", "PRECIO 3", null, [158.27587086863963, 6.856342528140235, 8.617034718146032, 0, 0]],
      ["V", "fonasa", "PRECIO 4", null, [143.0924899830599, 0, 0, null, null]],
      ["W", "fonasa", "PRECIO 5", null, [82.06897008003493, null, null, null, null]],
      ["X", "fonasa", "PRECIO 6", null, [75.52333793836631, null, null, null, null]],
      ["Y", "fonasa", "PRECIO 7", null, [0, null, null, null, null]],
    ],
  ],
  [
    "caamepa", "CAAMEPA", "CAAMEPA", "2026-07-01",
    [237.66845943018396, 172.70804220544457, 487.85356939905296, 488.81248259857296, 655.1268467674297],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [237.66845943018396, 172.70804220544457, 487.85356939905296, 488.81248259857296, 655.1268467674297]],
      ["H", "no-fonasa", "PRECIO 2", null, [190.2017289534451, 168.45772424000447, 243.95270127248642, 326.05640440976856, 591.2088623635358]],
      ["I", "no-fonasa", "PRECIO 3", null, [156.8211829809642, null, 176.75102758720465, 245.3003630664065, 328.5962285598487]],
      ["J", "no-fonasa", "PRECIO 4", null, [142.61890099888376, null, null, 244.26370014800642, null]],
      ["K", "no-fonasa", "PRECIO 5", null, [122.61130667376331, null, null, null, null]],
      ["L", "no-fonasa", "PRECIO 6", null, [118.80157044864316, null, null, null, null]],
      ["M", "no-fonasa", "PRECIO 7", null, [103.53670897520279, null, null, null, null]],
      ["N", "no-fonasa", "PRECIO 8", null, [51.72947962816138, null, null, null, null]],
      ["O", "no-fonasa", "PRECIO 9", null, [0, 0, 0, 0, 0]],
      ["P", "sanidad-policial", "SUBALTERNO   PRECIO 15", null, [72.73, 72.73, 72.73, 72.73, 72.73]],
      ["Q", "sanidad-policial", "SUPERIOR    PRECIO 16", null, [145.45, 145.45, 145.45, 145.45, 145.45]],
      ["R", "fonasa", "PRECIO 1", null, [237.66845943018396, 172.70804220544457, 487.85356939905296, 488.81248259857296, 655.1268467674297]],
      ["S", "fonasa", "PRECIO 2", null, [190.2017289534451, 168.45772424000447, 243.95270127248642, 326.05640440976856, 591.2088623635358]],
      ["T", "fonasa", "PRECIO 3", null, [156.8211829809642, null, null, null, null]],
      ["U", "fonasa", "PRECIO 4", null, [142.61890099888376, null, null, null, null]],
      ["V", "fonasa", "PRECIO 5", null, [122.61130667376331, null, null, null, null]],
      ["W", "fonasa", "PRECIO 6", null, [118.80157044864316, null, null, null, null]],
      ["X", "fonasa", "PRECIO 7", null, [103.53670897520279, null, null, null, null]],
      ["Y", "fonasa", "PRECIO 8", null, [51.72947962816138, null, null, null, null]],
      ["Z", "fonasa", "PRECIO 9", null, [0, 0, 0, 0, 0]],
    ],
  ],
  [
    "crami", "CRAMI", "CRAMI", "2026-07-01",
    [275.86682773139, 168.97922248499643, 381.61372302851413, 598.9343833636246, 774.2904817078754],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [275.86682773139, 168.97922248499643, 381.61372302851413, 598.9343833636246, 774.2904817078754]],
      ["H", "no-fonasa", "PRECIO 2", null, [137.933413865695, 84.48961124249821, 190.80686151425706, 299.4671916818123, 419.6579413365758]],
      ["I", "no-fonasa", "PRECIO 3", null, [null, null, null, null, null]],
      ["J", "no-fonasa", "PRECIO 4", null, [0, 0, 0, 0, 0]],
      ["K", "sanidad-policial", "SUBALTERNO    PRECIO 15", null, [80, 80, 80, 80, 80]],
      ["L", "sanidad-policial", "SUPERIOR    PRECIO 16", null, [160, 160, 160, 160, 160]],
      ["M", "fonasa", "PRECIO 1", null, [275.86682773139, 168.97922248499643, 381.61372302851413, 598.9343833636246, 774.2904817078754]],
      ["N", "fonasa", "PRECIO 2", null, [0, 0, 0, 0, 0]],
      ["O", "fonasa", "PRECIO 3", null, [137.933413865695, null, null, null, null]],
    ],
  ],
  [
    "comeca", "COMECA", "COMECA", "2026-07-01",
    [267.44378139613144, 173.3185082572279, 289.1450372032299, 495.09582710356403, 597.0228143759775],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [267.44378139613144, 173.31, 289.1450372032299, 495.09582710356403, 597.0051919905102]],
      ["H", "no-fonasa", "PRECIO 2", null, [240.69707238863097, 138.65167627984033, 240.97213397881362, 303.7936660995711, 576.3303938295926]],
      ["I", "no-fonasa", "PRECIO 3", null, [199.4, 125.02145825285056, 171.6800742437865, 247.5265152986071, 0]],
      ["J", "no-fonasa", "PRECIO 4", null, [187.21, 95.88302613778215, 125.0394078176353, 156.15893038260978, null]],
      ["K", "no-fonasa", "PRECIO 5", null, [136.13433896148734, 0, 0, 0, null]],
      ["L", "no-fonasa", "PRECIO 6", null, [102.05705044822741, null, null, null, null]],
      ["M", "no-fonasa", "PRECIO 7", null, [0, null, null, null, null]],
      ["N", "sanidad-policial", "SUBALTERNO   PRECIO 15", null, [72.73, 72.73, 72.73, 72.73, 72.73]],
      ["O", "sanidad-policial", "SUPERIOR    PRECIO 16", null, [145.45, 145.45, 145.45, 145.45, 145.45]],
      ["P", "fonasa", "PRECIO 1", null, [267.44378139613144, 173.31, 289.1450372032299, 495.09582710356403, 597.0051919905102]],
      ["Q", "fonasa", "PRECIO 2", null, [199.4, 125.04102142057948, 240.97213397881362, 303.7936660995711, 511.5788839186241]],
      ["R", "fonasa", "PRECIO 3", null, [187.21, 95.88302613778215, 125.0394078176353, 247.5498239774807, 0]],
      ["S", "fonasa", "PRECIO 4", null, [136.13433896148734, 86.60239464508528, 86.60239464508528, 0, null]],
      ["T", "fonasa", "PRECIO 5", null, [102.05705044822741, 0, 0, null, null]],
      ["U", "fonasa", "PRECIO 6", null, [0, null, null, null, null]],
    ],
  ],
  [
    "camcel", "CAMCEL", "CAMCEL", "2026-07-01",
    [257.4171886632273, 171.6114591088182, 542.2688458837081, 495.2420690781981, 531.9955232373366],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [257.4171886632273, 171.6114591088182, 542.2688458837081, 495.2420690781981, 531.9955232373366]],
      ["H", "no-fonasa", "PRECIO 2", null, [244.40910572855216, 158.09276432866702, 272.80849186740323, 424.9579663625905, null]],
      ["I", "no-fonasa", "PRECIO 3", null, [null, null, null, null, 266.7592854772873]],
      ["J", "no-fonasa", "PRECIO 4", null, [168.9400050928237, null, null, null, null]],
      ["K", "no-fonasa", "PRECIO 5", null, [122.20455286427608, null, 325.8749883990486, null, null]],
      ["L", "no-fonasa", "PRECIO 6", null, [null, null, null, null, null]],
      ["M", "no-fonasa", "PRECIO 7", null, [58.62125859778307, null, null, 212.4212850921242, null]],
      ["N", "no-fonasa", "PRECIO 8", null, [0, 0, 0, 0, 0]],
      ["O", "sanidad-policial", "SUBALTERNO    PRECIO 15", null, [72.73, 72.73, 72.73, 72.73, 72.73]],
      ["P", "sanidad-policial", "SUPERIOR    PRECIO 16", null, [145.45, 145.45, 145.45, 145.45, 145.45]],
      ["Q", "fonasa", "PRECIO 1", null, [257.4171886632273, 171.6114591088182, 542.2688458837081, 495.2420690781981, 531.9955232373366]],
      ["R", "fonasa", "PRECIO 2", null, [244.40910572855216, 158.09276432866702, 172.83762507024466, 424.9579663625905, 172.83762507024466]],
      ["S", "fonasa", "PRECIO 3", null, [168.9400050928237, null, 443.58806278337175, 212.4212850921242, 266.7592854772873]],
      ["T", "fonasa", "PRECIO 4", null, [122.20455286427608, null, 325.8749883990486, null, null]],
      ["U", "fonasa", "PRECIO 5", null, [null, null, 274.63792365712726, null, null]],
      ["V", "fonasa", "PRECIO 6", null, [58.62125859778307, null, 227.98809232912612, null, null]],
      ["W", "fonasa", "PRECIO 7", null, [null, null, null, null, null]],
      ["X", "fonasa", "PRECIO 8", null, [0, 0, 0, 0, 0]],
    ],
  ],
  [
    "camec", "CAMEC", "CAMEC", "2026-07-01",
    [269.6344733800635, 171.2842790489175, 395.5136079525967, 510.5385930243873, 622.0007656646355],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [269.6344733800635, 171.2842790489175, 395.5136079525967, 510.5385930243873, 622.0007656646355]],
      ["H", "no-fonasa", "PRECIO 2", null, [258.82175193085277, 85.65249653734077, 276.8636683719702, 357.37908651964744, 435.38810754978635]],
      ["I", "no-fonasa", "PRECIO 3", null, [190.56903703592087, 0, 197.7568039762975, 255.2589394993103, 310.97966880655275]],
      ["J", "no-fonasa", "PRECIO 4", null, [186.48837396026082, null, 0, 0, 0]],
      ["K", "no-fonasa", "PRECIO 5", null, [134.8068796771497, null, null, null, null]],
      ["L", "no-fonasa", "PRECIO 6", null, [74.63263483048105, null, null, null, null]],
      ["M", "no-fonasa", "PRECIO 7", null, [0, null, null, null, null]],
      ["N", "sanidad-policial", "SUBALTERNO      PRECIO 15", null, [72.73, 72.73, 72.73, 72.73, 72.73]],
      ["O", "sanidad-policial", "SUPERIOR     PRECIO 16", null, [145.45, 145.45, 145.45, 145.45, 145.45]],
      ["P", "fonasa", "PRECIO 1", null, [269.6344733800635, 171.2842790489175, 395.5136079525967, 510.5385930243873, 622.0007656646355]],
      ["Q", "fonasa", "PRECIO 2", null, [258.82175193085277, 85.65249653734077, 276.8636683719702, 357.37908651964744, 435.38810754978635]],
      ["R", "fonasa", "PRECIO 3", null, [197.7153759247691, 0, 197.7568039762975, 255.2589394993103, 310.97966880655275]],
      ["S", "fonasa", "PRECIO 4", null, [190.56903703592087, null, 0, 0, 0]],
      ["T", "fonasa", "PRECIO 5", null, [186.48837396026082, null, null, null, null]],
      ["U", "fonasa", "PRECIO 6", null, [134.8068796771497, null, null, null, null]],
      ["V", "fonasa", "PRECIO 7", null, [74.63263483048105, null, null, null, null]],
      ["W", "fonasa", "PRECIO 8", null, [0, null, null, null, null]],
      ["X", "fonasa", "PRECIO 9", null, [67.41291048689604, null, null, null, null]],
    ],
  ],
  [
    "camoc", "CAMOC", "CAMOC", "2026-07-01",
    [279.70414648366545, 174.4949530424569, 325.0652063265998, 431.47315668024424, 456.59926993291543],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [279.70414648366545, 174.4949530424569, 325.0652063265998, 431.47315668024424, 456.59926993291543]],
      ["H", "no-fonasa", "PRECIO 2", null, [187.05720509253223, 169.58667821846595, 169.58667821846595, 169.58667821846595, 169.58667821846595]],
      ["I", "no-fonasa", "PRECIO 3", null, [161.03272835292736, 85.35059321005778, 85.35059321005778, 85.35059321005778, 85.35059321005778]],
      ["J", "no-fonasa", "PRECIO 4", null, [150.2771756550001, null, null, null, null]],
      ["K", "no-fonasa", "PRECIO 5", null, [104.45274541042608, null, null, null, null]],
      ["L", "no-fonasa", "PRECIO 6", null, [77.02818763001872, null, null, null, null]],
      ["M", "no-fonasa", "PRECIO 7", null, [0, 0, 0, 0, 0]],
      ["N", "no-fonasa", "PRECIO 8", null, [139.85207324183273, null, null, null, null]],
      ["O", "sanidad-policial", "SUBALTERNO   PRECIO 15", null, [72.73, 72.73, 72.73, 72.73, 72.73]],
      ["P", "sanidad-policial", "SUPERIOR    PRECIO 16", null, [145.46, 145.46, 145.46, 145.46, 145.46]],
      ["Q", "fonasa", "PRECIO 1", null, [279.70414648366545, 174.4949530424569, 325.0652063265998, 431.47315668024424, 456.59926993291543]],
      ["R", "fonasa", "PRECIO 2", null, [187.05720509253223, 169.58667821846595, 169.58667821846595, 169.58667821846595, 169.58667821846595]],
      ["S", "fonasa", "PRECIO 3", null, [161.03272835292736, 85.35059321005778, 85.35059321005778, 85.35059321005778, 85.35059321005778]],
      ["T", "fonasa", "PRECIO 4", null, [150.2771756550001, null, null, null, null]],
      ["U", "fonasa", "PRECIO 5", null, [104.45274541042608, null, null, null, null]],
      ["V", "fonasa", "PRECIO 6", null, [83.9982218384587, null, null, null, null]],
      ["W", "fonasa", "PRECIO 7", null, [0, 0, 0, 0, 0]],
      ["X", "fonasa", "PRECIO 8", null, [139.85207324183273, null, null, null, null]],
    ],
  ],
  [
    "camedur", "CAMEDUR", "CAMEDUR", "2026-07-01",
    [239.10199940278724, 150.77739354179056, 272.7115428215738, 308.83999507571383, 370.6079940908567],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [239.09434166138337, 150.77739354179056, 272.7115428215738, 308.83999507571383, 370.6079940908567]],
      ["H", "no-fonasa", "PRECIO 2", null, [167.3693281793745, 71.77409927494217, 101.64372442774645, 108.47935293012189, 159.08371787346496]],
      ["I", "no-fonasa", "PRECIO 3", null, [155.43804933886474, 35.897406650353474, 37.67881286612406, 45.2187182445018, 153.69807117462378]],
      ["J", "no-fonasa", "PRECIO 4", null, [136.62971394444983, 0, 0, 0, 45.2187182445018]],
      ["K", "no-fonasa", "PRECIO 5", null, [75.33691170648332, 0, null, null, 0]],
      ["L", "no-fonasa", "PRECIO 6", null, [37.67881286612406, 0, null, null, null]],
      ["M", "sanidad-policial", "SUBALTERNO    PRECIO 15", null, [80, 80, 80, 80, 80]],
      ["N", "sanidad-policial", "SUPERIOR     PRECIO 16", null, [160, 160, 160, 160, 160]],
      ["O", "fonasa", "PRECIO 1", null, [239.10199940278724, 150.77739354179056, 272.7115428215738, 308.83999507571383, 370.6079940908567]],
      ["P", "fonasa", "PRECIO 2", null, [167.3693281793745, 0, 0, 0, 0]],
      ["Q", "fonasa", "PRECIO 3", null, [147.06958292989597, null, null, null, null]],
      ["R", "fonasa", "PRECIO 4", null, [136.62971394444983, null, null, null, null]],
      ["S", "fonasa", "PRECIO 5", null, [119.58207074004078, null, null, null, null]],
      ["T", "fonasa", "PRECIO 6", null, [75.33691170648332, null, null, null, null]],
      ["U", "fonasa", "PRECIO 7", null, [74.46692262436282, null, null, null, null]],
      ["V", "fonasa", "PRECIO 8", null, [37.67881286612406, null, null, null, null]],
    ],
  ],
  [
    "comeflo", "comeflo", "COMEFLO", "2026-07-01",
    [233.02756881738324, 171.2787836293886, 215.73594400737994, 383.42776747135804, 423.05252155654387],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [233.0275688173833, 171.2787836293886, 215.73594400737994, 383.42776747135804, 423.05252155654387]],
      ["H", "no-fonasa", "PRECIO 2", null, [62.534768133903924, 0, 0, null, null]],
      ["I", "sanidad-policial", "SUBALTERNO    PRECIO 15", null, [72.73, 72.73, 72.73, 72.73, 72.73]],
      ["J", "sanidad-policial", "SUPERIOR     PRECIO 16", null, [145.45, 145.45, 145.45, 145.45, 145.45]],
      ["K", "fonasa", "PRECIO 1", null, [233.02756881738324, 171.2787836293886, 215.73594400737994, 383.42776747135804, 423.05252155654387]],
    ],
  ],
  [
    "comef", "COMEF", "COMEF", "2026-07-01",
    [232.43208310652946, 164.46936457230598, 207.1006249570969, 427.80677411987944, 405.51848239698194],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [232.4320831065306, 164.46936457230598, 207.1006249570969, 427.80677411987944, 405.51848239698194]],
      ["H", "no-fonasa", "PRECIO 2", null, [170.22786373491232, 0, 0, 260.10602152826823, 364.19400099625744]],
      ["I", "no-fonasa", "PRECIO 3", null, [0, null, null, 0, 0]],
      ["J", "sanidad-policial", "SUBALTERNO    PRECIO 15", null, [72.73, 72.73, 72.73, 72.73, 72.73]],
      ["K", "sanidad-policial", "SUPERIOR     PRECIO 16", null, [145.45, 145.45, 145.45, 145.45, 145.45]],
      ["L", "fonasa", "PRECIO 1", null, [232.43208310652946, 164.46936457230598, 207.1006249570969, 427.80677411987944, 405.51848239698194]],
      ["M", "fonasa", "PRECIO 2", null, [170.22786373491232, 0, 0, 260.10602152826823, 364.19400099625744]],
      ["N", "fonasa", "PRECIO 3", null, [0, null, null, 0, 0]],
    ],
  ],
  [
    "camdel", "CAMDEL", "CAMDEL", "2026-07-01",
    [257.43575389359046, 171.61570346115334, 264.5535052158002, 305.1799904277473, 472.40407159143774],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [257.43575389359046, 171.61570346115334, 264.5535052158002, 305.1799904277473, 472.40407159143774]],
      ["H", "no-fonasa", "PRECIO 2", null, [205.93055854307792, 0, 0, 0, 0]],
      ["I", "no-fonasa", "PRECIO 3", null, [128.70659908942378, null, null, null, null]],
      ["J", "no-fonasa", "PRECIO 4", null, [0, null, null, null, null]],
      ["K", "sanidad-policial", "SUBALTERNO     PRECIO 15", null, [72.73, 72.73, 72.73, 72.73, 72.73]],
      ["L", "sanidad-policial", "SUPERIOR     PRECIO 16", null, [145.45, 145.45, 145.45, 145.45, 145.45]],
      ["M", "fonasa", "PRECIO 1", null, [257.43270381990357, 171.61570346115334, 264.5535052158002, 305.1799904277473, 472.4086490714741]],
      ["N", "fonasa", "PRECIO 2", null, [205.93055854307792, 75.6588064382545, 75.6588064382545, 75.6588064382545, 75.6588064382545]],
      ["O", "fonasa", "PRECIO 3", null, [128.70659908942378, 0, 0, 0, 0]],
      ["P", "fonasa", "PRECIO 4", null, [75.65415294440407, null, null, null, null]],
      ["Q", "fonasa", "PRECIO 5", null, [0, null, null, null, null]],
    ],
  ],
  [
    "amdm", "AMECOM", "AMDM", "2026-07-01",
    [291.739480484992, 172.6479923218356, 462.4499794334871, 713.4306773724967, 723.7985550706768],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [291.7394804849916, 172.6479923218356, 462.4499794334871, 713.4306773724967, 723.7985550706768]],
      ["H", "no-fonasa", "PRECIO 2", null, [66.36, 0, 0, 66.36, 66.36]],
      ["I", "no-fonasa", "PRECIO 3", null, [245.4662683111395, null, null, 0, 0]],
      ["J", "no-fonasa", "PRECIO 4", null, [135.55992113602645, null, null, null, null]],
      ["K", "sanidad-policial", "SUBALTERNO     PRECIO 15", null, [72.73, 0, 0, 0, 0]],
      ["L", "sanidad-policial", "SUPERIOR    PRECIO 16", null, [72.73, 0, 0, 0, 0]],
      ["M", "fonasa", "PRECIO 1", null, [291.739480484992, 172.6479923218356, 462.4499794334871, 713.4306773724967, 723.7985550706768]],
    ],
  ],
  [
    "crame-semmautone", "CRAME", "CRAME - Semmautone", "2026-07-01",
    [280.8695804273473, 177.1491721216549, 360.9004708996587, 544.6131654074402, 544.6131654074402],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [280.8695804273473, 177.1465257932282, 360.9041472607042, 544.6167393744274, 544.6167393744274]],
      ["H", "no-fonasa", "PRECIO 2", null, [213.4151493070753, 124.0130196676709, 252.6451980769303, 381.2152353371998, 381.2152353371998]],
      ["I", "no-fonasa", "PRECIO 3", null, [196.5753601820639, 0, 0, 75.04383633751726, 75.04383633751726]],
      ["J", "no-fonasa", "PRECIO 4", null, [144.9126973643132, 54.029875543699, 54.029875543699, 0, 0]],
      ["K", "no-fonasa", "PRECIO 5", null, [86.29358715786708, 0, 0, 54.02987554369899, 54.02987554369899]],
      ["L", "no-fonasa", "PRECIO 6", null, [0, null, null, null, null]],
      ["M", "no-fonasa", "PRECIO 7", null, [62.08203436580786, null, null, null, 280.9515346013675]],
      ["N", "no-fonasa", "PRECIO 8", null, [null, null, null, null, null]],
      ["O", "no-fonasa", "PRECIO 9", null, [null, null, null, null, null]],
      ["P", "no-fonasa", "PRECIO 10", null, [null, null, null, null, null]],
      ["Q", "no-fonasa", "PRECIO 11", null, [null, null, null, null, null]],
      ["R", "no-fonasa", "PRECIO 12", null, [null, null, null, null, null]],
      ["S", "no-fonasa", "PRECIO 13", null, [null, null, null, null, null]],
      ["T", "no-fonasa", "PRECIO 14", null, [null, null, null, null, null]],
      ["U", "sanidad-policial", "SUBALTERNO    PRECIO 15", null, [72.73, 72.73, 72.73, 72.73, 72.73]],
      ["V", "sanidad-policial", "SUPERIOR     PRECIO 16", null, [145.45, 145.45, 145.45, 145.45, 145.45]],
      ["W", "fonasa", "PRECIO 1", null, [280.8695804273473, 177.1465257932282, 360.9041472607042, 544.6167393744274, 544.6167393744274]],
      ["X", "fonasa", "PRECIO 2", null, [213.4151493070753, 124.0130196676709, 252.6451980769303, 381.2152353371998, 381.2152353371998]],
      ["Y", "fonasa", "PRECIO 3", null, [196.5753601820639, 0, 0, 75.04383633751726, 75.04383633751726]],
      ["Z", "fonasa", "PRECIO 4", null, [144.9126973643132, null, null, 0, 0]],
      ["AA", "fonasa", "PRECIO 5", null, [86.29273585534922, null, null, null, null]],
      ["AB", "fonasa", "PRECIO 6", null, [0, null, null, null, 280.9515346013675]],
      ["AC", "fonasa", "PRECIO 7", null, [140.4294130293779, null, null, null, null]],
    ],
  ],
  [
    "comepa", "COMEPA", "COMEPA", "2026-07-01",
    [280.0501318079476, 166.29219883960636, 305.9896827165878, 383.42776747135804, 502.400081476597],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [280.0501318079479, 166.29219883960636, 305.9896827165878, 383.42776747135804, 502.400081476597]],
      ["H", "no-fonasa", "PRECIO 2", null, [213.54173602349113, 0, 195.76411055492176, 191.71388373567902, 251.2000407382985]],
      ["I", "no-fonasa", "PRECIO 3", null, [170.80275155394006, null, 0, 0, 0]],
      ["J", "no-fonasa", "PRECIO 4", null, [84.00841783304342, null, null, null, null]],
      ["K", "no-fonasa", "PRECIO 5", null, [75.23830827904442, null, null, null, null]],
      ["L", "no-fonasa", "PRECIO 6", null, [0, null, null, null, null]],
      ["M", "sanidad-policial", "SUBALTERNO        PRECIO 15", null, [72.73, 72.73, 72.73, 72.73, 72.73]],
      ["N", "sanidad-policial", "SUPERIOR         PRECIO 16", null, [145.46, 145.46, 145.46, 145.46, 145.46]],
      ["O", "fonasa", "PRECIO 1", null, [280.0501318079476, 166.29219883960636, 305.9896827165878, 383.42776747135804, 502.400081476597]],
      ["P", "fonasa", "PRECIO 2", null, [213.54173602349113, 0, 195.76411055492176, 191.71388373567902, 251.2000407382985]],
      ["Q", "fonasa", "PRECIO 3", null, [170.80275155394006, null, 0, 0, 0]],
      ["R", "fonasa", "PRECIO 4", null, [84.00841783304342, null, null, null, null]],
      ["S", "fonasa", "PRECIO 5", null, [75.23830827904442, null, null, null, null]],
      ["T", "fonasa", "PRECIO 6", null, [0, null, null, null, null]],
      ["U", "fonasa", "PRECIO 7", null, [140.02573644211355, null, null, null, null]],
      ["V", "fonasa", "PRECIO 8", null, [106.76302712327795, null, null, null, null]],
      ["W", "fonasa", "PRECIO 9", null, [85.38189450366626, null, null, null, null]],
      ["X", "fonasa", "PRECIO 10", null, [42.00629457288627, null, null, null, null]],
      ["Y", "fonasa", "PRECIO 11", null, [37.62737014712188, null, null, null, null]],
    ],
  ],
  [
    "amedrin", "AMEDRIN", "AMEDRIN", "2026-07-01",
    [271.79729730925385, 166.690666267633, 450.11296276103667, 263.2372696614156, 448.3615504545737],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [271.79729730925385, 166.690666267633, 450.11296276103667, 263.2372696614156, 448.3615504545737]],
      ["H", "no-fonasa", "PRECIO 2", null, [217.43783784740364, 83.3453331338165, 225.05648138051833, 131.6186348307078, 224.18077522728686]],
      ["I", "no-fonasa", "PRECIO 3", null, [135.89864865462724, 100.01439976057982, 270.06777765662207, 157.94236179684938, 269.01693027274416]],
      ["J", "no-fonasa", "PRECIO 4", null, [163.07837838555264, 0, 0, 0, 0]],
      ["K", "no-fonasa", "PRECIO 5", null, [0, null, null, null, null]],
      ["L", "sanidad-policial", "SUBALTERNO   PRECIO 15", null, [80, 80, 80, 80, 80]],
      ["M", "sanidad-policial", "SUPERIOR   PRECIO 16", null, [160, 160, 160, 160, 160]],
      ["N", "fonasa", "PRECIO 1", null, [271.7972973092545, 166.690666267633, 450.11296276103667, 263.2372696614156, 448.3615504545737]],
      ["O", "fonasa", "PRECIO 2", null, [217.43783784740364, 83.3453331338165, 225.05648138051833, 131.6186348307078, 224.18077522728686]],
      ["P", "fonasa", "PRECIO 3", null, [135.89864865462724, 0, 0, 0, 0]],
      ["Q", "fonasa", "PRECIO 4", null, [163.07837838555264, null, null, null, null]],
      ["R", "fonasa", "PRECIO 5", null, [0, null, null, null, null]],
    ],
  ],
  [
    "camy", "CAMY", "CAMY", "2026-07-01",
    [208.87740681609236, 174.95873094256993, 280.39067417504606, 341.8972823682478, 481.8791193065943],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [208.87740681609296, 174.95873094256993, 280.39067417504606, 341.8972823682478, 481.8791193065943]],
      ["H", "no-fonasa", "PRECIO 2", null, [null, null, null, null, null]],
      ["I", "sanidad-policial", "SUBALTERNO    PRECIO 15", null, [147.29820000000004, 58.795500000000004, 58.795500000000004, 58.795500000000004, 58.795500000000004]],
      ["J", "sanidad-policial", "SUPERIOR    PRECIO 16", null, [147.29820000000004, 58.795500000000004, 58.795500000000004, 58.795500000000004, 58.795500000000004]],
      ["K", "fonasa", "PRECIO 1", null, [208.87740681609236, 174.95873094256993, 280.39067417504606, 341.8972823682478, 481.8791193065943]],
      ["L", "fonasa", "PRECIO 2", null, [null, null, null, null, null]],
    ],
  ],
  [
    "casmer", "CASMER", "CASMER", "2026-07-01",
    [299.5353215040426, 174.74066712694068, 334.07030706516673, 517.0805617808819, 601.1849732635349],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [299.5353215040426, 174.74066712694068, 334.07030706516565, 517.0805617808819, 601.1849732635349]],
      ["H", "no-fonasa", "PRECIO 2", null, [0, 0, 0, 0, 0]],
      ["I", "no-fonasa", "PRECIO 3", null, [null, null, null, null, null]],
      ["J", "sanidad-policial", "SUBALTERNO     PRECIO 15", null, [80, 80, 80, 80, 80]],
      ["K", "sanidad-policial", "SUPERIOR    PRECIO 16", null, [160, 160, 160, 160, 160]],
      ["L", "fonasa", "PRECIO 1", null, [299.5353215040426, 0, 0, 0, 601.1849732635349]],
      ["M", "fonasa", "PRECIO 2", null, [149.7687331220209, 174.74150903034882, 334.0646496168433, 517.0813622686735, null]],
      ["N", "fonasa", "PRECIO 3", null, [null, null, null, null, null]],
    ],
  ],
  [
    "comeri", "COMERI", "COMERI", "2026-07-01",
    [230.36231186443663, 162.12867966088666, 875.6796941505133, 432.38457381389424, 481.9946655205282],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [230.36231186443663, 162.12867966088666, 875.6796941505133, 432.38457381389424, 481.9946655205282]],
      ["H", "no-fonasa", "PRECIO 2", null, [155.9144719314545, 157.50945191534214, 654.5839281926259, 216.65664433461805, 0]],
      ["I", "no-fonasa", "PRECIO 3", null, [77.98830700437443, 78.79615400920062, 257.9627626789857, 157.51986812861628, null]],
      ["J", "no-fonasa", "PRECIO 4", null, [0, 0, 157.51986812861628, 78.79615400920062, null]],
      ["K", "no-fonasa", "PRECIO 5", null, [null, null, 78.79615400920062, 0, null]],
      ["L", "no-fonasa", "PRECIO 6", null, [null, null, 0, null, null]],
      ["M", "no-fonasa", "PRECIO 15", null, [72.73, 72.73, 72.73, 72.73, null]],
      ["N", "no-fonasa", "PRECIO 16", null, [145.45, 145.45, 145.45, 145.45, null]],
      ["O", "fonasa", "PRECIO 1", null, [230.3606805300533, 0, 0, 0, 0]],
      ["P", "fonasa", "PRECIO 2", null, [123.869874073349, null, null, null, null]],
      ["Q", "fonasa", "PRECIO 3", null, [60.236386923963025, null, null, null, null]],
      ["R", "fonasa", "PRECIO 4", null, [0, null, null, null, null]],
      ["S", "fonasa", "PRECIO 5", null, [null, null, null, null, null]],
    ],
  ],
  [
    "comero", "COMERO", "COMERO", "2026-07-01",
    [257.4171886632273, 171.61145910881814, 302.65396928431187, 495.2420690781981, 597.1220719691332],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [257.4171886632273, 171.61145910881814, 302.65396928431187, 495.2420690781981, 597.1220719691332]],
      ["H", "no-fonasa", "PRECIO 2", null, [180.43054262446051, 0, 0, 141.92431036693984, 141.92431036693984]],
      ["I", "no-fonasa", "PRECIO 3", null, [23.403909739954706, null, null, 70.91525356074452, 70.91525356074453]],
      ["J", "no-fonasa", "PRECIO 4", null, [130.08165062878632, null, null, 0, 0]],
      ["K", "no-fonasa", "PRECIO 5", null, [70.91525356074452, null, null, null, null]],
      ["L", "no-fonasa", "PRECIO 6", null, [0, null, null, null, null]],
      ["M", "no-fonasa", "PRECIO 7", null, [null, null, null, null, null]],
      ["N", "no-fonasa", "PRECIO 8", null, [74.62048175604797, null, null, null, null]],
      ["O", "no-fonasa", "PRECIO 9", null, [149.24096351209593, null, null, null, null]],
      ["P", "sanidad-policial", "SUBALTERNO     PRECIO 15", null, [68.18, null, null, null, null]],
      ["Q", "sanidad-policial", "SUPERIOR    PRECIO 16", null, [146.36, null, null, null, null]],
      ["R", "fonasa", "PRECIO 1", null, [257.4171886632273, 171.61145910881814, 302.65396928431187, 495.2420690781981, 597.122071969133]],
      ["S", "fonasa", "PRECIO 2", null, [180.43054262446051, 0, 0, 0, 141.92431036693984]],
      ["T", "fonasa", "PRECIO 3", null, [141.92431036693984, null, null, null, 70.91525356074452]],
      ["U", "fonasa", "PRECIO 4", null, [130.08165062878632, null, null, null, 0]],
      ["V", "fonasa", "PRECIO 5", null, [70.91525356074452, null, null, null, null]],
      ["W", "fonasa", "PRECIO 6", null, [23.403909739954706, null, null, null, null]],
      ["X", "fonasa", "PRECIO 7", null, [0, null, null, null, null]],
    ],
  ],
  [
    "smqsalto", "smqs", "SMQSALTO", "2026-07-01",
    [240.42769705173285, 175.7377945883434, 382.4430576950239, 383.42776747135804, 536.9696899002384],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [240.42769705173285, 175.7377945883434, 382.4430576950239, 383.42776747135804, 536.9696899002384]],
      ["H", "no-fonasa", "PRECIO 2", null, [0, 0, 0, 0, 0]],
      ["I", "sanidad-policial", "SUBALTERNO     PRECIO 15", null, [42, 42, 42, 42, 42]],
      ["J", "sanidad-policial", "SUPERIOR    PRECIO 16", null, [83, 83, 83, 83, 83]],
      ["K", "fonasa", "PRECIO 1", null, [240.42769705173285, 175.7377945883434, 171.4499912550351, 383.42776747135804, 536.9696899002384]],
      ["L", "fonasa", "PRECIO 2", null, [0, 0, 0, 0, 0]],
    ],
  ],
  [
    "amsanjose", "AM SAN JOSÉ", "AMSanJosé", "2026-07-01",
    [248.17474268775823, 178.1613356028219, 272.7115428215738, 419.6579413365758, 565.6379848444138],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [248.17474268775823, 178.1613356028219, 272.7115428215738, 419.6579413365758, 565.6338652739946]],
      ["H", "no-fonasa", "PRECIO 2", null, [100.62132887138888, 0, 0, 219.29939077166324, 291.3978241861393]],
      ["I", "no-fonasa", "PRECIO 3", null, [18.884977091581078, null, null, 0, 178.16074802347953]],
      ["J", "no-fonasa", "PRECIO 4", null, [0, null, null, null, 0]],
      ["K", "sanidad-policial", "SUBALTERNO    PRECIO 15", null, [72.73, 72.73, 72.73, 72.73, 72.73]],
      ["L", "sanidad-policial", "SUPERIOR    PRECIO 16", null, [145.45, 145.45, 145.45, 145.45, 145.45]],
      ["M", "fonasa", "PRECIO 1", null, [136.6504279702146, 178.1613356028219, 272.7115428215738, 419.6579413365758, 565.6338652739946]],
      ["N", "fonasa", "PRECIO 2", null, [100.62132887138888, 147.4217213678972, 147.4217213678972, 147.4217213678972, 291.3978241861393]],
      ["O", "fonasa", "PRECIO 3", null, [0, 0, 0, 0, 178.16074802347953]],
      ["P", "fonasa", "PRECIO 4", null, [null, null, null, null, 147.42875035539004]],
      ["Q", "fonasa", "PRECIO 5", null, [null, null, null, null, 0]],
    ],
  ],
  [
    "cams", "CAMS", "CAMS", "2026-07-01",
    [258.8848880055237, 125.86686591764945, 236.58309056743363, 343.1905087012857, 423.05252155654387],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [258.8848880055237, 125.86686591764945, 236.58309056743363, 343.1905087012857, 423.05252155654387]],
      ["H", "no-fonasa", "PRECIO 2", null, [204.93777081068453, 75.36767153770275, 0, 133.05568557664364, 0]],
      ["I", "no-fonasa", "PRECIO 3", null, [158.19041085623553, 0, null, 77.92077694209642, null]],
      ["J", "no-fonasa", "PRECIO 4", null, [133.05568557664364, null, null, 0, null]],
      ["K", "no-fonasa", "PRECIO 5", null, [102.45611987832018, null, null, null, null]],
      ["L", "no-fonasa", "PRECIO 6", null, [82.69508404831272, null, null, null, null]],
      ["M", "no-fonasa", "PRECIO 7", null, [0, null, null, null, null]],
      ["N", "sanidad-policial", "SUBALTERNO    PRECIO 15", null, [60.9, 60.9, 60.9, 60.9, 60.9]],
      ["O", "sanidad-policial", "SUPERIOR    PRECIO 16", null, [121.8, 121.8, 121.8, 121.8, 121.8]],
      ["P", "fonasa", "PRECIO 1", null, [204.93777081068453, 125.86686591764945, 236.58309056743363, 343.1905087012857, 423.05252155654387]],
      ["Q", "fonasa", "PRECIO 2", null, [158.19041085623553, 0, 0, 0, 0]],
      ["R", "fonasa", "PRECIO 3", null, [133.06785367700084, null, null, null, null]],
      ["S", "fonasa", "PRECIO 4", null, [102.45611987832018, null, null, null, null]],
      ["T", "fonasa", "PRECIO 5", null, [82.69508404831272, null, null, null, null]],
      ["U", "fonasa", "PRECIO 6", null, [0, null, null, null, null]],
    ],
  ],
  [
    "comta", "COMTA", "COMTA", "2026-07-01",
    [246.48583903804902, 169.81163244797688, 319.3679557967668, 454.40334979134536, 601.8324032347414],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [246.48583903804902, 169.81163244797688, 319.3679557967665, 454.40334979134536, 601.8324032347414]],
      ["H", "no-fonasa", "PRECIO 2", null, [123.24845330040577, 0, 0, 0, 0]],
      ["I", "no-fonasa", "PRECIO 3", null, [80.12185165814617, null, null, 318.08005512500006, null]],
      ["J", "no-fonasa", "PRECIO 4", null, [0, null, null, 227.2045258, null]],
      ["K", "sanidad-policial", "SUBALTERNO    PRECIO 15", null, [72.73, 72.73, 72.73, 72.73, 0]],
      ["L", "sanidad-policial", "SUPERIOR     PRECIO 16", null, [145.45, 145.45, 145.45, 145.45, 0]],
      ["M", "fonasa", "PRECIO 1", null, [246.48583903804902, 169.81163244797688, 319.3679557967668, 454.40334979134536, 601.8324032347414]],
      ["N", "fonasa", "PRECIO 2", null, [123.24845330040577, 0, 0, 0, 0]],
      ["O", "fonasa", "PRECIO 3", null, [83.31181162592135, null, null, 318.080055125, null]],
      ["P", "fonasa", "PRECIO 4", null, [80.12185165814617, null, null, null, null]],
      ["Q", "fonasa", "PRECIO 5", null, [0, null, null, null, null]],
    ],
  ],
  [
    "iac", "IAC", "IAC", "2026-07-01",
    [305.53188003041777, 174.30852681057394, 382.4430576950239, 542.79033114014, 597.1232207211425],
    [[13, "TICKET DE MEDICAMENTOS - GENERAL"], [25, "CONSULTA NO URGENTE CONSULTORIO: MEDICINA GENERAL"], [29, "CONSULTA NO URGENTE CONSULTORIO: OTRAS ESPECIALIDADES"], [30, "CONSULTA URGENCIA CENTRALIZADA"], [31, "CONSULTA NO URGENCIA DOMICILIO"]],
    [
      ["G", "no-fonasa", "PRECIO 1", null, [305.53188003041754, 174.30852681057394, 382.4430576950239, 542.79033114014, 597.1232207211425]],
      ["H", "no-fonasa", "PRECIO 2", null, [253.8296717215417, 139.67467573187167, 139.67467573187167, 139.67467573187167, 139.67467573187167]],
      ["I", "no-fonasa", "PRECIO 3", null, [null, null, null, null, null]],
      ["J", "sanidad-policial", "SUBALTERNO     PRECIO 15", null, [80, 80, 80, 80, 80]],
      ["K", "sanidad-policial", "SUPERIOR    PRECIO 16", null, [160, 160, 160, 160, 160]],
      ["L", "fonasa", "PRECIO 1", null, [305.53188003041777, 174.30852681057394, 382.4430576950239, 542.79033114014, 597.1232207211425]],
      ["M", "fonasa", "PRECIO 2", null, [179.9427418185925, 0, 0, 0, 0]],
      ["N", "fonasa", "PRECIO 3", null, [118.74863453618897, null, null, null, null]],
      ["O", "fonasa", "PRECIO 4", null, [90.20880570442377, null, null, null, null]],
    ],
  ],
]
// END GENERATED MSP DATA

function conceptValues(values: CostVector): ConceptValues {
  return Object.fromEntries(
    MUTUALISTA_COST_CONCEPTS.map((concept, index) => [
      concept.id,
      normalizeMutualistaAmount(values[index]),
    ])
  ) as ConceptValues
}

export const MUTUALISTA_COSTS: readonly MutualistaCostInstitution[] = RAW_INSTITUTIONS.map(
  ([id, name, sheet, effectiveFrom, maxima, sourceRows, columns]) => ({
    id,
    name,
    sheet,
    effectiveFrom,
    maxima: conceptValues(maxima),
    sourceRows: Object.fromEntries(
      MUTUALISTA_COST_CONCEPTS.map((concept, index) => [
        concept.id,
        { row: sourceRows[index][0], label: sourceRows[index][1] },
      ])
    ) as MutualistaCostInstitution['sourceRows'],
    columns: columns.map(([column, affiliation, label, condition, amounts]) => ({
      column,
      affiliation,
      label,
      condition,
      amounts: conceptValues(amounts),
    })),
  })
)

/** Conserva orden y huecos del tarifario, sin elegir un precio por el usuario. */
export function getMutualistaCostRows(
  institutionId: string,
  conceptId: MutualistaCostConceptId,
  affiliation?: MutualistaCostAffiliation
): MutualistaCostRow[] {
  const institution = MUTUALISTA_COSTS.find(item => item.id === institutionId)
  const source = institution?.sourceRows[conceptId]
  if (!institution || !source) return []
  return institution.columns
    .filter(column => !affiliation || column.affiliation === affiliation)
    .map(column => {
      const valueCell = `${column.column}${source.row}`
      const amount = column.amounts[conceptId]
      const maximum = institution.maxima[conceptId]
      return {
        column: column.column,
        affiliation: column.affiliation,
        label: column.label,
        condition: column.condition,
        amountUyu: amount,
        valueCell,
        sourceCell: `${institution.sheet}!${valueCell}`,
        sourceLabel: source.label,
        maximumAuthorizedUyu: maximum,
        exceedsPublishedMaximum: amount !== null && maximum !== null && amount > maximum + 0.005,
      }
    })
}

/** Formato del importe base; no agrega IVA ni timbres. */
export function formatMutualistaBaseAmount(value: number | null): string {
  const amount = normalizeMutualistaAmount(value)
  return amount === null
    ? 'Sin dato'
    : `$ ${new Intl.NumberFormat('es-UY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)}`
}
