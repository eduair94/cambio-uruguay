// Espejo de las formas PÚBLICAS de `classes/computadoras/types.ts` (lo que el job
// `sync_computadoras.ts` escribe en la APP DB). Escrito a mano y no re-exportado: `app/` es otro
// `package.json`, otro build y otro deploy, y no puede importar de la raíz (AGENTS.md de la raíz).
//
// Tres colecciones:
//   * `computercatalog` → una fila por AVISO vigente (`ComputerPublicListing`): una computadora o
//                         una pieza suelta, con lo que se leyó de ella y lo que cuesta armarla.
//   * `computerparts`   → una fila por IDENTIDAD de pieza (`ComputerPublicPart`, `slug` como
//                         `cpu:i5-12400f`), con su precio nuevo y usado de hoy en Uruguay.
//   * `computermetas`   → `{ key, generatedAt, meta }`; `key: "uy-computadoras"` lleva
//                         `ComputerPublicMeta` adentro de `meta`.
//
// `app/utils` es un namespace PLANO de auto-imports: todo lo exportado lleva prefijo
// `computer`/`COMPUTER_`.

export type ComputerPublicSource = 'facebook' | 'mercadolibre'

/** Una computadora entera… */
export type ComputerPublicMachineKind = 'notebook' | 'desktop' | 'all-in-one' | 'mini-pc'
/** …o una pieza suelta. `combo` = mother + procesador (y a veces RAM) vendidos juntos. */
export type ComputerPublicPartKind =
  'gpu' | 'cpu' | 'ram' | 'storage' | 'motherboard' | 'psu' | 'combo'
export type ComputerPublicKind = ComputerPublicMachineKind | ComputerPublicPartKind

/** El rol de una pieza dentro de una computadora (y la tabla de precios). */
export type ComputerPublicPartRole =
  'cpu' | 'gpu' | 'ram' | 'storage' | 'motherboard' | 'psu' | 'case'

/** El estado que declara el vendedor: el selector de Facebook o la condición de ML. */
export type ComputerPublicCondition = 'new' | 'like-new' | 'good' | 'fair'

/** Lo que el propio texto del aviso dice que falla. Nunca una conclusión nuestra. */
export type ComputerPublicFault =
  | 'no-enciende'
  | 'no-da-video'
  | 'para-repuesto'
  | 'pantalla'
  | 'teclado'
  | 'bateria'
  | 'bloqueada'
  | 'sin-disco'
  | 'sin-cargador'
  | 'falla'

export type ComputerPublicVerdict = 'muy-por-debajo' | 'por-debajo' | 'parejo' | 'por-encima'

/** De dónde sale cada dato leído: el título, la descripción de la ficha o el selector de Facebook. */
export type ComputerPublicBasis = 'title' | 'description' | 'facebook' | 'mercadolibre'

export interface ComputerPublicCpu {
  brand: 'intel' | 'amd' | 'apple'
  /** `core-i5`, `core-ultra-7`, `ryzen-5`, `apple-m`, `celeron`, `xeon`, `fx`… */
  family: string
  /** El modelo exacto («12400F», «5700G», «M2 Pro»); null cuando el aviso sólo dice «i7». */
  model: string | null
  /** La identidad que se valúa (`cpu:i5-12400f`); null sin modelo exacto. */
  slug: string | null
  label: string
  generation: number | null
  socket: string | null
  ramType: 'ddr3' | 'ddr4' | 'ddr5' | null
  /** Procesador de notebook (U/H/HS/HX/P…). */
  mobile: boolean
  /** Año aproximado de lanzamiento de la SERIE (no del modelo exacto). */
  year: number | null
  basis: ComputerPublicBasis
}

export interface ComputerPublicGpu {
  brand: 'nvidia' | 'amd' | 'intel' | 'apple'
  /** El modelo («RTX 3060 Ti», «RX 580»); null en una integrada sin nombre. */
  model: string | null
  slug: string | null
  label: string
  vramGb: number | null
  integrated: boolean
  year: number | null
  basis: ComputerPublicBasis
}

export interface ComputerPublicDrive {
  /** `unknown`: el aviso dice la capacidad pero no si es SSD o disco rígido («1tb»). Con sólo
   * discos `unknown`, `hasSsd` queda null: la ausencia no es un veredicto. */
  type: 'nvme' | 'ssd' | 'hdd' | 'emmc' | 'unknown'
  gb: number
}

/** Una pieza de la valuación, con su precio nuevo y usado de hoy. */
export interface ComputerPublicValuedPart {
  role: ComputerPublicPartRole
  label: string
  /** Identidad en `computerparts`; null = pieza sin identidad exacta (queda sin precio). */
  slug: string | null
  /** La pieza no la declara el aviso: se supone (mother por socket, fuente por placa, gabinete). */
  estimated: boolean
  newUsd: number | null
  usedUsd: number | null
  newN: number
  usedN: number
  /**
   * Una pieza SUPUESTA (`estimated`) sin precio usado entra al total usado al precio de la nueva
   * más barata (cuartil bajo): `usedUsd` es entonces ese precio nuevo, y la página lo dice.
   * Opcional: las filas escritas antes del 23/11/2026 no lo traen.
   */
  usedFromNew?: boolean
}

export interface ComputerPublicValuation {
  parts: ComputerPublicValuedPart[]
  /** Suma de precios NUEVOS, sólo si todas las piezas tienen uno. */
  newTotalUsd: number | null
  /** Suma de medianas USADAS, sólo si todas las piezas tienen una. */
  usedTotalUsd: number | null
  /** Lo que suman las piezas que sí tienen precio (para el parcial; nunca se presenta como total). */
  newPartialUsd: number
  usedPartialUsd: number
  /** Las etiquetas de las piezas sin precio nuevo / usado. */
  missingNew: string[]
  missingUsed: string[]
  /** precio del aviso / referencia. */
  ratio: number | null
  /**
   * Contra qué se midió `ratio`: `used` = la suma de sus piezas usadas de hoy; `new` = la suma de sus
   * piezas nuevas (sólo cuando falta el total usado); `comparables` = la mediana de las máquinas
   * iguales del directorio (`listing.comparables`). Las notebooks, all-in-one y mini PC usan siempre
   * `comparables`: no se arman.
   */
  reference: 'used' | 'new' | 'comparables' | null
  verdict: ComputerPublicVerdict | null
  /** Notebooks, Mac, all-in-one y piezas: la misma cosa nueva hoy (mediana de ML). */
  sameNew: { label: string; medianUsd: number; n: number } | null
}

export interface ComputerPublicComparables {
  label: string
  medianUsd: number
  n: number
  basis: 'cpu+gpu' | 'cpu' | 'model' | 'part'
}

export interface ComputerPublicListing {
  /** `fb-<id>` o `ml-<MLU…>`: la ruta de la ficha. */
  slug: string
  source: ComputerPublicSource
  url: string
  title: string
  image: string | null
  kind: ComputerPublicKind
  kindGroup: 'computer' | 'part'
  price: number
  currency: 'UYU' | 'USD'
  priceUsd: number
  priceUyu: number
  /** Facebook dice «UYU» por defecto; un precio que sólo cierra en dólares se lee en dólares. */
  currencyInferred: boolean
  department: string | null
  city: string | null
  condition: ComputerPublicCondition | null
  /** Tienda oficial de ML; null cuando el origen no lo dice (Facebook). */
  sellerType: 'tienda' | 'particular' | null
  /** La marca del equipo (Dell, HP, Lenovo, Apple, Asus…), cuando se lee. */
  brand: string | null
  cpu: ComputerPublicCpu | null
  cpuBrand: 'intel' | 'amd' | 'apple' | null
  cpuFamily: string | null
  gpu: ComputerPublicGpu | null
  /** Sólo dedicada: la faceta de placa de video. */
  gpuSlug: string | null
  gpuDedicated: boolean | null
  ramGb: number | null
  ramType: 'ddr3' | 'ddr4' | 'ddr5' | null
  storage: ComputerPublicDrive[]
  storageGb: number | null
  hasSsd: boolean | null
  screenInches: number | null
  psuWatts: number | null
  chipset: string | null
  includes: { monitor: boolean; monitorInches: number | null; peripherals: boolean }
  faults: ComputerPublicFault[]
  /** Se leyó la ficha (descripción) además del título. */
  detailRead: boolean
  /** Cuántos datos de los de arriba se leyeron: ordena «los más completos». */
  specCount: number
  valuation: ComputerPublicValuation | null
  comparables: ComputerPublicComparables | null
  firstSeen: string
  lastSeen: string
  /** Fecha de publicación del aviso cuando el origen la da (Facebook), si no la primera vista. */
  publishedAt: string
}

export interface ComputerPublicPriceStat {
  medianUsd: number
  p25Usd: number
  minUsd: number
  n: number
}

export interface ComputerPublicPart {
  slug: string
  role: ComputerPublicPartRole
  label: string
  facts: {
    year?: number | null
    socket?: string | null
    ramType?: string | null
    vramGb?: number | null
    gb?: number | null
    driveType?: string | null
    watts?: number | null
    chipset?: string | null
    brand?: string | null
  }
  new:
    | (ComputerPublicPriceStat & {
        sellers: number
        cheapest: { title: string; url: string; priceUsd: number; image: string | null } | null
      })
    | null
  used: ComputerPublicPriceStat | null
  /** Avisos del directorio que usan (o son) esta pieza. */
  inCatalog: number
  history: Array<{ day: string; newUsd: number | null; usedUsd: number | null }>
  updatedAt: string
}

export interface ComputerPublicPreset {
  id: string
  label: string
  description: string
  parts: Array<{ role: ComputerPublicPartRole; label: string; slug: string; newUsd: number | null }>
  totalUsd: number | null
  missing: string[]
}

export interface ComputerPublicSourceRun {
  id: string
  label: string
  ok: boolean
  note: string
  lastOkAt: string | null
}

export interface ComputerPublicMeta {
  generatedAt: string
  freshDays: number
  usdUyu: number
  counts: {
    total: number
    computers: number
    parts: number
    facebook: number
    mercadolibre: number
    withValuation: number
    withNewTotal: number
    withUsedTotal: number
    detailRead: number
  }
  sources: ComputerPublicSourceRun[]
  partsPriced: number
  presets: ComputerPublicPreset[]
}

export interface ComputerPublicMetaDoc {
  key: string
  generatedAt: string
  meta: ComputerPublicMeta
}
