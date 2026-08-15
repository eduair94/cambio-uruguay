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
// disclaimers and links to Aduanas/DGI/MSP/URSEC/MGAP.
//
// Re-verified against primary sources on 2026-08-15. What that pass changed, and why:
//  - `libros`: the import is exonerated of EVERY national tax, not just IVA (Título 10 art. 41;
//    Ley 15.913 art. 8 lit. C), and it does not consume the franchise quota (Decreto 50/026 art. 4;
//    RG DNA 11/2026 num. 26). The calculator used to charge them the 60%.
//  - `cosmeticos`: split off `perfumeria`. Most toiletries are EXCLUDED from IMESI by Decreto
//    96/990 art. 27, so blocking them from the postal regime was wrong.
//  - `agro`: promoted from "needs a procedure" to courier-prohibited — Resolución MGAP 1.720/021
//    bans seeds, plants, fertilizers and pesticides by post outright, and no VUCE procedure exists
//    for an individual.
//  - `radiofrecuencia`: URSEC does NOT intervene for Wi-Fi/Bluetooth-only devices (Res. URSEC
//    275/021 y 297/021).
//
// Sources (2026 pass):
//  - Título 10 T.O. 2023 arts. 13, 34, 36, 38 y 41: https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10
//  - Ley 15.913 (Ley del Libro), art. 8: https://www.impo.com.uy/bases/leyes/15913-1987/8
//  - Decreto 50/026 arts. 4 y 7: https://www.impo.com.uy/bases/decretos/50-2026
//  - Ley 20.446 art. 633 (IMESI fuera del régimen): https://www.impo.com.uy/bases/leyes/20446-2025/633
//  - Decreto 96/990 arts. 25 y 27 (IMESI de cosmética): https://www.impo.com.uy/bases/decretos/96-1990
//  - RG DNA 11/2026: https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf
//  - DNA — mercaderías con exoneraciones especiales: https://www.aduanas.gub.uy/innovaportal/v/28228/1/innova.front/
//
// Sources (pass anterior):
//  - Aduanas — mercadería bajo encomiendas postales internacionales:
//    https://www.aduanas.gub.uy/innovaportal/v/25107/3/innova.front/que-mercaderia-no-puedo-traer-bajo-el-regimen-de-encomiendas-postales-internacionales.html
//  - Aduanas — mercaderías controladas por otros organismos:
//    https://www.aduanas.gub.uy/innovaportal/v/25358/15/innova.front/
//  - VUCE / URSEC (homologación de radiofrecuencia): https://vuce.gub.uy/
//  - Gripper — envíos con restricciones: https://www.gripper.com.uy/restricciones

/** IVA treatment of a product: `exento` 0%, `minima` 10%, `basica` 22%. */
export type IvaTreatment = 'exento' | 'minima' | 'basica'

/**
 * How far the exoneration reaches when the goods are IMPORTED. This is the distinction the
 * calculator was missing, and the reason it charged 60% on a book:
 *
 *  - `none`          nothing special: pays what the regime says.
 *  - `iva`           the IMPORT is exonerated of IVA — Título 10 del T.O. 2023, art. 38 num. 3
 *                    lit. B) exonerates "las importaciones de bienes cuya enajenación se exonera
 *                    por este artículo". Aranceles still apply (the franquicia already waives them).
 *  - `todo-tributo`  the IMPORT is exonerated of EVERY national tax, customs duty and consular
 *                    fee — Título 10 art. 41 (obras literarias, artísticas, científicas, docentes
 *                    y material educativo) and Ley 15.913 art. 8 lit. C) (Ley del Libro). There is
 *                    no tax left for any regime to charge.
 *
 * `todo-tributo` beats the regime, not the other way round: the prestación única is something the
 * taxpayer "podrá optar por pagar" (Ley 20.446 art. 627), never something owed by default.
 */
export type ImportExemption = 'none' | 'iva' | 'todo-tributo'

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
  /**
   * How far the import exoneration reaches (see {@link ImportExemption}). Defaults to `'none'`;
   * `iva` is implied by `iva: 'exento'` unless stated otherwise.
   */
  exemption?: ImportExemption
  /**
   * The goods do NOT count against the USD 800 annual franchise cap — Decreto 50/026 art. 4,
   * inciso final: "Exceptúase del límite establecido en el literal c) de US$ 800 … a los libros y
   * medicamentos de uso personal, estos últimos, con la debida autorización del Ministerio de
   * Salud Pública."
   *
   * It reaches the 3-shipments-a-year count too — not by the decree's wording (which names only
   * the USD 800 amount) but by the resolution that implements it: **RG DNA 11/2026 num. 26**
   * excepts books and MSP-authorised medicines from num. 25 lit. b) V, the single requirement that
   * carries BOTH limits, and from lit. b) VI (documenting the value). The DNA's own page says
   * books enter "sin restricción de frecuencia en el año civil siempre y cuando el valor de
   * factura no supere los USD 1.000".
   */
  franchiseCapExempt?: boolean
  /** Slug of the `/importar/<slug>` fact sheet for this category, when one exists. */
  categorySlug?: string
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
    categorySlug: 'otros-productos',
    label: 'General / otros',
    icon: 'mdi-package-variant-closed',
    iva: 'basica',
  },
  {
    id: 'electronica',
    categorySlug: 'electronica',
    label: 'Electrónica (sin radio): laptops, tablets, consolas',
    icon: 'mdi-laptop',
    iva: 'basica',
  },
  {
    id: 'radiofrecuencia',
    categorySlug: 'celulares-y-radiofrecuencia',
    label: 'Celulares y equipos con radiofrecuencia, drones, GPS, routers',
    icon: 'mdi-cellphone-wireless',
    iva: 'basica',
    procedures: [
      {
        organism: 'URSEC',
        // La excepción importa tanto como la regla: las Resoluciones URSEC 275/021 y 297/021
        // sacan del trámite a todo lo que funcione ÚNICAMENTE en 2,4/5,8 GHz con Wi-Fi
        // (802.11) o Bluetooth (802.15) — auriculares, mouse, smartwatch, cámaras. Un celular
        // transmite en espectro licenciado, así que no entra en la excepción.
        note: 'Certificado previo de URSEC ($239, hasta 2 días hábiles) que se pide en la VUCE como persona física. No hace falta si el equipo funciona sólo con Wi-Fi o Bluetooth en 2,4/5,8 GHz.',
        url: URSEC_URL,
      },
    ],
    note: 'Sin el certificado, el envío queda fuera del régimen postal (Decreto 50/026 art. 7) y hay que retirarlo en persona.',
  },
  {
    id: 'ropa',
    categorySlug: 'ropa-y-calzado',
    label: 'Ropa, calzado y accesorios',
    icon: 'mdi-tshirt-crew',
    iva: 'basica',
  },
  {
    id: 'libros',
    label: 'Libros y material impreso (diarios, revistas)',
    icon: 'mdi-book-open-variant',
    iva: 'exento',
    // No es sólo IVA: la IMPORTACIÓN de obras literarias, artísticas, científicas, docentes y
    // material educativo está exonerada de todo tributo nacional, gravámenes aduaneros y tasas
    // consulares (Título 10 T.O. 2023 art. 41; Ley 15.913 art. 8 lit. C). Por eso un libro no
    // paga el 60% ni el IVA: no queda tributo que cobrar.
    exemption: 'todo-tributo',
    franchiseCapExempt: true,
    categorySlug: 'libros',
    note: 'Exentos de IVA y exonerados de todo tributo a la importación. No consumen el cupo de US$ 800.',
  },
  {
    id: 'juguetes',
    categorySlug: 'juguetes',
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
    // Decreto 50/026 art. 4 inciso final los exceptúa del tope de US$ 800, pero SÓLO "con la
    // debida autorización del Ministerio de Salud Pública" — sin ella, el art. 7 los deja fuera
    // del régimen entero, no sólo de la franquicia.
    franchiseCapExempt: true,
    categorySlug: 'medicamentos',
    note: 'IVA mínima (10%). Sólo para uso personal y con autorización del MSP.',
  },
  {
    id: 'suplementos',
    categorySlug: 'suplementos-y-vitaminas',
    label: 'Suplementos y vitaminas',
    icon: 'mdi-nutrition',
    iva: 'basica',
    procedures: [
      {
        organism: 'MSP',
        note: 'Suplementos, vitaminas y similares son controlados por el MSP.',
        url: MSP_URL,
      },
    ],
  },
  {
    // OJO con la tentación de marcar TODA la cosmética como IMESI: el Decreto 96/990 art. 27
    // (redacción del Decreto 396/012) EXCLUYE expresamente del IMESI a los jabones de tocador,
    // jabones/cremas/brochas de afeitar, pastas dentífricas, cepillos de dientes, aguas colonias,
    // desodorantes y antisudorales, talco, polvo para el cuerpo, champúes y los protectores
    // solares registrados ante el MSP; y pone a tasa 0% acondicionadores, tintes, decolorantes,
    // fijadores y lociones para después de afeitar. Marcarlos IMESI los echaba del régimen postal
    // (Decreto 50/026 art. 7) sin que ninguna norma lo mande.
    id: 'cosmeticos',
    categorySlug: 'cosmeticos-y-perfumeria',
    label: 'Cosméticos y tocador (champú, jabón, dentífrico, protector solar)',
    icon: 'mdi-lipstick',
    iva: 'basica',
    procedures: [
      {
        organism: 'MSP',
        note: 'Cosméticos y productos de higiene son controlados por el MSP, que no autoriza el ingreso de productos de salud por particulares.',
        url: MSP_URL,
      },
    ],
    note: 'Sin IMESI: el Decreto 96/990 art. 27 excluye jabones, dentífricos, desodorantes, champúes y protectores solares registrados.',
  },
  {
    id: 'perfumeria',
    categorySlug: 'cosmeticos-y-perfumeria',
    label: 'Perfumería (perfumes y extractos)',
    icon: 'mdi-spray',
    iva: 'basica',
    imesi: true,
    courierProhibited: true,
    procedures: [
      {
        organism: 'MSP',
        note: 'La perfumería es un producto de salud controlado por el MSP.',
        url: MSP_URL,
      },
    ],
    note: 'Gravada por IMESI (10% fijado por el Decreto 96/990 art. 25) y, por eso, fuera del régimen postal (Ley 20.446 art. 633).',
  },
  {
    id: 'medicos',
    categorySlug: 'productos-medicos-y-opticos',
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
    categorySlug: 'alimentos',
    label: 'Alimentos y comestibles',
    icon: 'mdi-food-apple',
    iva: 'basica',
    procedures: [
      {
        organism: 'MGAP',
        note: 'Productos de origen animal o vegetal: control sanitario del MGAP.',
        url: MGAP_URL,
      },
      { organism: 'MSP', note: 'Alimentos elaborados: control bromatológico / MSP.', url: MSP_URL },
    ],
    note: 'Los de origen animal y los vegetales frescos están prohibidos por correo (Resolución MGAP 1.720/021). Café, té, yerba, arroz, azúcar, aceite y pastas pagan IVA 10%, no 22%.',
  },
  {
    id: 'agro',
    categorySlug: 'plantas-semillas-y-fertilizantes',
    label: 'Plantas, semillas y fertilizantes',
    icon: 'mdi-sprout',
    iva: 'basica',
    // No es "necesita un trámite": la Resolución MGAP 1.720/021 los prohíbe DERECHO por encomienda
    // o correo, sin franja de uso personal, y no existe trámite en VUCE para que una persona
    // física los traiga. Decirle al lector que gestione un permiso que no existe era el peor de
    // los consejos posibles.
    courierProhibited: true,
    procedures: [
      {
        organism: 'MGAP',
        note: 'Semillas, plantas, fertilizantes y plaguicidas están prohibidos de ingresar por encomienda o correo (Resolución MGAP 1.720/021).',
        url: MGAP_URL,
      },
    ],
    note: 'Los fertilizantes registrados ante el MGAP están exonerados de IVA, pero igual no entran por correo.',
  },
  {
    id: 'alcohol_tabaco',
    categorySlug: 'bebidas-alcoholicas-y-tabaco',
    label: 'Bebidas alcohólicas y tabaco',
    icon: 'mdi-glass-wine',
    iva: 'basica',
    imesi: true,
    courierProhibited: true,
    note: 'Pagan IMESI y no ingresan como envío personal por courier.',
  },
  {
    id: 'vehiculos',
    categorySlug: 'vehiculos-y-repuestos',
    label: 'Vehículos, motos y repuestos',
    icon: 'mdi-car',
    iva: 'basica',
    imesi: true,
    courierProhibited: true,
    note: 'Los vehículos pagan IMESI. Los repuestos de moto usados están prohibidos.',
  },
  {
    id: 'armas',
    categorySlug: 'armas-y-replicas',
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
    categorySlug: 'productos-prohibidos',
    label:
      'Prohibidos: vaper/cigarrillo electrónico, pirotecnia, inflamables, baterías sueltas, drogas',
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
      reason:
        'No ingresa por courier / encomiendas postales. Requiere importación formal (régimen general).',
    }
  }
  return { blocked: false }
}

/**
 * How far this category's import exoneration reaches.
 *
 * `iva: 'exento'` implies at least an IVA exoneration on the import (Título 10 art. 38 num. 3
 * lit. B: "las importaciones de bienes cuya enajenación se exonera por este artículo"), so a
 * category never has to repeat itself; `exemption` is only spelled out when it reaches further.
 */
export function exemptionFor(type: ImportProductType): ImportExemption {
  if (type.exemption) return type.exemption
  return type.iva === 'exento' ? 'iva' : 'none'
}

/** Resolve the tax parameters a category contributes to the calculation. */
export function resolveProductTax(type: ImportProductType): {
  ivaPct: number
  imesiApplies: boolean
  exemption: ImportExemption
  franchiseCapExempt: boolean
} {
  return {
    ivaPct: ivaPctFor(type.iva),
    imesiApplies: type.imesi ?? false,
    exemption: exemptionFor(type),
    franchiseCapExempt: type.franchiseCapExempt ?? false,
  }
}
