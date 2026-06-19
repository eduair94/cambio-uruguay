// Product-type catalog for the Uruguay import calculator
// (`pages/herramientas/calculadora-impuestos-importacion.vue`).
//
// Picking a product type clarifies, for each category, whether it pays IVA (and
// at what rate), whether it needs procedures with other agencies (MSP, URSEC,
// MGAP, SMA) and whether it is prohibited — and feeds those tax parameters into
// the pure `importTax` math. PURE data + functions (no Vue/Nuxt runtime) so they
// can be unit-tested in plain Node via vitest.
//
// These are ESTIMATORS / informational aids. The lists are non-exhaustive (Aduanas:
// "de carácter no taxativo") and rules change; the page renders prominent
// disclaimers and links to Aduanas/DGI/MSP/URSEC/MGAP. Verified 2026-06-19.
//
// Sources:
//  - Aduanas — mercadería bajo encomiendas postales internacionales:
//    https://www.aduanas.gub.uy/innovaportal/v/25107/3/innova.front/que-mercaderia-no-puedo-traer-bajo-el-regimen-de-encomiendas-postales-internacionales.html
//  - Aduanas — mercaderías controladas por otros organismos:
//    https://www.aduanas.gub.uy/innovaportal/v/25358/15/innova.front/
//  - VUCE / URSEC (homologación de radiofrecuencia): https://vuce.gub.uy/
//  - Gripper — envíos con restricciones: https://www.gripper.com.uy/restricciones

/** IVA treatment of a product: `exento` 0%, `minima` 10%, `basica` 22%. */
export type IvaTreatment = 'exento' | 'minima' | 'basica'

/** Government agency that controls (authorizes) a category of imports. */
export type Organism = 'MSP' | 'URSEC' | 'MGAP' | 'SMA'

/** A required procedure with a controlling agency before the goods can clear. */
export interface ImportProcedure {
  organism: Organism
  /** Short, human-readable explanation of the procedure. */
  note: string
  /** Where to do the procedure, when published. */
  url?: string
}

/** A selectable product category with its tax + regulatory profile. */
export interface ImportProductType {
  id: string
  /** Display label for the selector. */
  label: string
  /** mdi-* icon name. */
  icon: string
  /** IVA treatment (drives the IVA rate used by the calculation). */
  iva: IvaTreatment
  /** Whether IMESI applies (relevant in the general regime). */
  imesi?: boolean
  /** Procedures required with other agencies before clearing customs. */
  procedures?: ImportProcedure[]
  /** Prohibited outright (both regimes). */
  prohibited?: boolean
  /** Allowed under the formal regime but NOT via courier (IMESI goods, vehicles…). */
  courierProhibited?: boolean
  /** Extra clarification shown next to the category. */
  note?: string
}

const IVA_RATE: Record<IvaTreatment, number> = { exento: 0, minima: 10, basica: 22 }

/** Numeric IVA rate (%) for a treatment. */
export function ivaPctFor(treatment: IvaTreatment): number {
  return IVA_RATE[treatment]
}

const MSP_URL = 'https://www.gub.uy/ministerio-salud-publica/'
const URSEC_URL = 'https://vuce.gub.uy/'
const MGAP_URL = 'https://www.gub.uy/ministerio-ganaderia-agricultura-pesca/'
const SMA_URL = 'https://www.ejercito.mil.uy/'

/**
 * Selectable product categories. `general` is the default and reproduces the
 * calculator's current behaviour (IVA 22%, no procedures, allowed everywhere)
 * so existing results are unchanged until the user picks a more specific type.
 */
export const IMPORT_PRODUCT_TYPES: ImportProductType[] = [
  {
    id: 'general',
    label: 'General / otros',
    icon: 'mdi-package-variant-closed',
    iva: 'basica',
  },
  {
    id: 'electronica',
    label: 'Electrónica (sin radio): laptops, tablets, consolas',
    icon: 'mdi-laptop',
    iva: 'basica',
  },
  {
    id: 'radiofrecuencia',
    label: 'Celulares y equipos con radiofrecuencia, drones, GPS, routers',
    icon: 'mdi-cellphone-wireless',
    iva: 'basica',
    procedures: [
      {
        organism: 'URSEC',
        note: 'Homologación de equipos que emiten radiofrecuencia. Se gestiona en la VUCE a nombre del consignatario; varios couriers tramitan con el comprobante.',
        url: URSEC_URL,
      },
    ],
  },
  {
    id: 'ropa',
    label: 'Ropa, calzado y accesorios',
    icon: 'mdi-tshirt-crew',
    iva: 'basica',
  },
  {
    id: 'libros',
    label: 'Libros y material impreso (diarios, revistas)',
    icon: 'mdi-book-open-variant',
    iva: 'exento',
    note: 'Libros, diarios y revistas están exentos de IVA en Uruguay.',
  },
  {
    id: 'juguetes',
    label: 'Juguetes y hobby',
    icon: 'mdi-toy-brick',
    iva: 'basica',
  },
  {
    id: 'medicamentos',
    label: 'Medicamentos',
    icon: 'mdi-pill',
    iva: 'minima',
    procedures: [
      {
        organism: 'MSP',
        note: 'Requieren autorización del Ministerio de Salud Pública (receta / registro). Ingreso muy restringido por courier.',
        url: MSP_URL,
      },
    ],
    note: 'IVA mínima (10%). Sólo para uso personal y con autorización.',
  },
  {
    id: 'suplementos',
    label: 'Suplementos y vitaminas',
    icon: 'mdi-nutrition',
    iva: 'basica',
    procedures: [
      { organism: 'MSP', note: 'Suplementos, vitaminas y similares son controlados por el MSP.', url: MSP_URL },
    ],
  },
  {
    id: 'cosmeticos',
    label: 'Cosméticos y perfumería',
    icon: 'mdi-lipstick',
    iva: 'basica',
    imesi: true,
    courierProhibited: true,
    procedures: [
      { organism: 'MSP', note: 'Cosméticos y productos de higiene son controlados por el MSP (sobre todo en cantidad).', url: MSP_URL },
    ],
    note: 'La perfumería paga IMESI y no ingresa como envío personal por courier.',
  },
  {
    id: 'medicos',
    label: 'Productos médicos y ópticos (lentes, tensiómetro)',
    icon: 'mdi-medical-bag',
    iva: 'basica',
    procedures: [
      {
        organism: 'MSP',
        note: 'Lentes, lentes de contacto, tensiómetros y dispositivos médicos requieren trámite ante el MSP.',
        url: MSP_URL,
      },
    ],
  },
  {
    id: 'alimentos',
    label: 'Alimentos y comestibles',
    icon: 'mdi-food-apple',
    iva: 'basica',
    procedures: [
      { organism: 'MGAP', note: 'Productos de origen animal o vegetal: control sanitario del MGAP.', url: MGAP_URL },
      { organism: 'MSP', note: 'Alimentos elaborados: control bromatológico / MSP.', url: MSP_URL },
    ],
    note: 'Ingreso limitado por courier (sólo snacks sellados, de marca, en cantidad acotada).',
  },
  {
    id: 'agro',
    label: 'Plantas, semillas y fertilizantes',
    icon: 'mdi-sprout',
    iva: 'basica',
    procedures: [
      { organism: 'MGAP', note: 'Semillas, plantas y fertilizantes requieren autorización fitosanitaria del MGAP.', url: MGAP_URL },
    ],
  },
  {
    id: 'alcohol_tabaco',
    label: 'Bebidas alcohólicas y tabaco',
    icon: 'mdi-glass-wine',
    iva: 'basica',
    imesi: true,
    courierProhibited: true,
    note: 'Pagan IMESI y no ingresan como envío personal por courier.',
  },
  {
    id: 'vehiculos',
    label: 'Vehículos, motos y repuestos',
    icon: 'mdi-car',
    iva: 'basica',
    imesi: true,
    courierProhibited: true,
    note: 'Los vehículos pagan IMESI. Los repuestos de moto usados están prohibidos.',
  },
  {
    id: 'armas',
    label: 'Armas, réplicas y airsoft',
    icon: 'mdi-pistol',
    iva: 'basica',
    courierProhibited: true,
    procedures: [
      {
        organism: 'SMA',
        note: 'Armas y réplicas (airsoft con punta naranja) requieren trámite ante el Servicio de Material y Armamento del Ejército.',
        url: SMA_URL,
      },
    ],
  },
  {
    id: 'prohibidos',
    label: 'Prohibidos: vaper/cigarrillo electrónico, pirotecnia, inflamables, baterías sueltas, drogas',
    icon: 'mdi-cancel',
    iva: 'basica',
    prohibited: true,
    note: 'No pueden importarse por encomiendas postales / courier.',
  },
]

/** Look up a category by id; falls back to the `general` default for unknown ids. */
export function productTypeById(id: string): ImportProductType {
  return IMPORT_PRODUCT_TYPES.find(t => t.id === id) ?? IMPORT_PRODUCT_TYPES[0]!
}

/** Import regime the calculator operates in. */
export type ImportRegime = 'courier' | 'general'

/** Whether a category can be imported under a regime, with the blocking reason. */
export function productRegimeStatus(
  type: ImportProductType,
  regime: ImportRegime
): { blocked: boolean; reason?: string } {
  if (type.prohibited) {
    return { blocked: true, reason: 'Producto prohibido: no puede importarse.' }
  }
  if (regime === 'courier' && type.courierProhibited) {
    return {
      blocked: true,
      reason: 'No ingresa por courier / encomiendas postales. Requiere importación formal (régimen general).',
    }
  }
  return { blocked: false }
}

/** Resolve the tax parameters a category contributes to the calculation. */
export function resolveProductTax(type: ImportProductType): {
  ivaPct: number
  imesiApplies: boolean
} {
  return { ivaPct: ivaPctFor(type.iva), imesiApplies: type.imesi ?? false }
}
