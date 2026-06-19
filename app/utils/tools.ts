// Catalogue of interactive calculators / tools under `pages/herramientas/*`.
//
// PURE data + helpers (no Vue/Nuxt runtime) so the hub page, the per-tool pages,
// the sitemap route and tests can all share one source of truth for slugs,
// titles, descriptions and metadata without duplicating it.

/** A grouping shown on the tools hub. */
export type ToolCategory = 'divisas' | 'impuestos' | 'finanzas' | 'viajes'

/** A single tool/calculator, addressable at `/herramientas/{slug}`. */
export interface Tool {
  /** URL-safe identifier, unique across {@link tools} (matches the page filename). */
  slug: string
  /** Card + H1 title. */
  title: string
  /** Short meta-description / card subtitle. */
  description: string
  /** MDI icon name (e.g. `mdi-calculator`). */
  icon: string
  /** Category for grouping on the hub. */
  category: ToolCategory
  /** Comma-free keyword list used for the page `keywords` meta tag. */
  keywords: string[]
}

/** Human label per category, in display order. */
export const TOOL_CATEGORIES: Readonly<Record<ToolCategory, string>> = Object.freeze({
  divisas: 'Divisas y cambio',
  impuestos: 'Impuestos',
  finanzas: 'Finanzas personales',
  viajes: 'Viajes',
})

/** The full catalogue. Order here drives the hub listing within each category. */
export const tools: readonly Tool[] = [
  {
    slug: 'calculadora-impuestos-importacion',
    title: 'Calculadora de impuestos de importación en Uruguay',
    description:
      'Estimá cuánto vas a pagar de impuestos al importar o comprar online del exterior: régimen courier (franquicia anual de USD 800) y régimen general con IVA, arancel y tasa consular.',
    icon: 'mdi-package-variant-closed',
    category: 'impuestos',
    keywords: [
      'impuestos importación uruguay',
      'comprar en el exterior uruguay impuestos',
      'franquicia 800 dólares',
      'régimen courier uruguay',
      'impuesto compras online uruguay',
    ],
  },
  {
    slug: 'conversor-de-monedas',
    title: 'Conversor de monedas en Uruguay (en vivo)',
    description:
      'Convertí dólares, euros, reales y pesos argentinos a pesos uruguayos con la mejor cotización en vivo de más de 40 casas de cambio.',
    icon: 'mdi-cash-sync',
    category: 'divisas',
    keywords: [
      'conversor de monedas uruguay',
      'convertir dólares a pesos uruguayos',
      'cuánto es un dólar en uruguay',
      'conversor dólar peso uruguayo',
    ],
  },
  {
    slug: 'widget-dolar',
    title: 'Widget del dólar para tu web (gratis)',
    description:
      'Agregá gratis la cotización del dólar en Uruguay a tu sitio web o blog. Elegí el tema, copiá el código y listo: se actualiza solo cada 10 minutos.',
    icon: 'mdi-code-tags',
    category: 'divisas',
    keywords: [
      'widget dólar uruguay',
      'cotización dólar para mi web',
      'embeber cotización dólar',
      'iframe dólar uruguay',
      'widget cambio uruguay',
    ],
  },
  {
    slug: 'calculadora-spread',
    title: 'Calculadora de spread cambiario',
    description:
      'Calculá la brecha (spread) entre el precio de compra y de venta del dólar y entendé cuánto se queda la casa de cambio en cada operación.',
    icon: 'mdi-arrow-expand-horizontal',
    category: 'divisas',
    keywords: [
      'spread cambiario',
      'brecha compra venta dólar',
      'spread dólar uruguay',
      'diferencia compra venta',
    ],
  },
  {
    slug: 'calculadora-iva',
    title: 'Calculadora de IVA en Uruguay (22% y 10%)',
    description:
      'Sumá o descontá el IVA uruguayo (tasa básica 22% o mínima 10%) de cualquier importe. Ideal para presupuestos, facturas y precios con y sin impuesto.',
    icon: 'mdi-receipt-text-outline',
    category: 'impuestos',
    keywords: [
      'calculadora iva uruguay',
      'iva 22 uruguay',
      'sacar iva',
      'agregar iva',
      'iva 10 por ciento',
    ],
  },
  {
    slug: 'calculadora-irpf',
    title: 'Calculadora de IRPF en Uruguay (rentas del trabajo)',
    description:
      'Estimá el IRPF mensual sobre tu sueldo nominal en Uruguay según las franjas en BPC. Resultado de referencia con desglose por franja.',
    icon: 'mdi-account-cash-outline',
    category: 'impuestos',
    keywords: [
      'calculadora irpf uruguay',
      'irpf sueldo uruguay',
      'franjas irpf',
      'cuánto irpf pago',
    ],
  },
  {
    slug: 'calculadora-aguinaldo',
    title: 'Calculadora de aguinaldo en Uruguay',
    description:
      'Calculá tu aguinaldo (sueldo anual complementario) dividiendo entre 12 lo que ganaste en el semestre. Estimación rápida y clara.',
    icon: 'mdi-gift-outline',
    category: 'finanzas',
    keywords: ['calculadora aguinaldo uruguay', 'aguinaldo sac', 'cómo se calcula el aguinaldo'],
  },
  {
    slug: 'calculadora-plazo-fijo',
    title: 'Calculadora de plazo fijo (interés compuesto)',
    description:
      'Simulá cuánto rinde un plazo fijo o ahorro en pesos o dólares con interés compuesto. Ingresá capital, tasa anual y plazo.',
    icon: 'mdi-piggy-bank-outline',
    category: 'finanzas',
    keywords: [
      'calculadora plazo fijo uruguay',
      'interés compuesto',
      'rendimiento plazo fijo',
      'simulador ahorro',
    ],
  },
  {
    slug: 'calculadora-prestamo',
    title: 'Calculadora de préstamos y cuotas',
    description:
      'Calculá la cuota mensual de un préstamo por el sistema francés: ingresá monto, tasa anual y cantidad de cuotas y mirá el total a pagar.',
    icon: 'mdi-bank-outline',
    category: 'finanzas',
    keywords: [
      'calculadora préstamo uruguay',
      'cuota mensual préstamo',
      'sistema francés',
      'simulador de cuotas',
    ],
  },
  {
    slug: 'conversor-unidad-indexada',
    title: 'Conversor de Unidades Indexadas (UI) a pesos',
    description:
      'Convertí Unidades Indexadas (UI) a pesos uruguayos y viceversa. Útil para alquileres, créditos y contratos ajustados por inflación.',
    icon: 'mdi-swap-horizontal-bold',
    category: 'finanzas',
    keywords: [
      'unidad indexada uruguay',
      'convertir ui a pesos',
      'valor ui hoy',
      'ui a pesos uruguayos',
    ],
  },
  {
    slug: 'calculadora-inflacion',
    title: 'Calculadora de inflación y poder de compra',
    description:
      'Mirá cómo la inflación afecta tu dinero en el tiempo: cuánto valdrá un monto en el futuro y cuánto poder de compra pierde.',
    icon: 'mdi-trending-up',
    category: 'finanzas',
    keywords: [
      'calculadora inflación uruguay',
      'poder de compra',
      'inflación pesos uruguayos',
      'valor del dinero en el tiempo',
    ],
  },
  {
    slug: 'calculadora-presupuesto-viaje',
    title: 'Calculadora de presupuesto de viaje en dólares',
    description:
      'Planificá cuántos dólares llevar de viaje: sumá días, gasto diario y extras, y convertilo a pesos uruguayos con la cotización en vivo.',
    icon: 'mdi-airplane',
    category: 'viajes',
    keywords: [
      'presupuesto de viaje',
      'cuántos dólares llevar de viaje',
      'calculadora viaje uruguay',
      'gasto diario viaje',
    ],
  },
  {
    slug: 'calculadora-propinas',
    title: 'Calculadora de propinas y división de cuenta',
    description:
      'Calculá la propina y dividí la cuenta entre varias personas en segundos. Elegí el porcentaje y cuántos son.',
    icon: 'mdi-silverware-fork-knife',
    category: 'viajes',
    keywords: ['calculadora de propinas', 'dividir la cuenta', 'cuánto de propina', 'split bill'],
  },
] as const

/** Look up a tool by slug. */
export function getTool(slug: string): Tool | undefined {
  return tools.find(tool => tool.slug === slug)
}

/** Every tool slug, in catalogue order. Used by the sitemap route. */
export function toolSlugs(): string[] {
  return tools.map(tool => tool.slug)
}

/** Tools grouped by category, in {@link TOOL_CATEGORIES} order. */
export function toolsByCategory(): Array<{ category: ToolCategory; label: string; items: Tool[] }> {
  return (Object.keys(TOOL_CATEGORIES) as ToolCategory[]).map(category => ({
    category,
    label: TOOL_CATEGORIES[category],
    items: tools.filter(tool => tool.category === category),
  }))
}
