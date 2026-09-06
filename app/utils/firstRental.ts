// CGN-SGA tenant fee, checked against the official FAQ on 2026-09-06.
// This is not a generic fee for ANDA, insurers or other guarantees.
export const FIRST_RENTAL_REVIEWED = '2026-09-06'
export const CGN_TENANT_RATE = 0.03
export const FIRST_RENTAL_PATH = '/primer-alquiler-uruguay'

export type RentalAmount = number | string | null
export interface FirstRentalBudgetInput {
  rent: RentalAmount
  monthly: RentalAmount
  bimonthly: RentalAmount
  entry: RentalAmount
  cgn: boolean
}

export const BUDGET_FIELDS = ['rent', 'monthly', 'bimonthly', 'entry'] as const
export type BudgetField = (typeof BUDGET_FIELDS)[number]

export function rentalAmount(value: RentalAmount): number | null {
  if (value === null || (typeof value === 'string' && !value.trim())) return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000_000 ? amount : null
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export function firstRentalBudget(input: FirstRentalBudgetInput) {
  const amounts = {
    rent: rentalAmount(input.rent),
    monthly: rentalAmount(input.monthly),
    bimonthly: rentalAmount(input.bimonthly),
    entry: rentalAmount(input.entry),
  }
  const missing = BUDGET_FIELDS.filter(key => amounts[key] === null)
  const invalid = BUDGET_FIELDS.filter(
    key => input[key] !== null && String(input[key]).trim() !== '' && amounts[key] === null
  )
  const fee =
    amounts.rent === null ? null : roundMoney(input.cgn ? amounts.rent * CGN_TENANT_RATE : 0)
  // A missing rent cannot produce an apparently complete housing budget.
  const monthly =
    amounts.rent === null
      ? null
      : roundMoney(
          amounts.rent + (fee ?? 0) + (amounts.monthly ?? 0) + (amounts.bimonthly ?? 0) / 2
        )
  return {
    fee,
    monthly,
    // This is a reserve including one average month, NOT a prediction of the first bill.
    entryReserve:
      monthly === null || amounts.entry === null ? null : roundMoney(monthly + amounts.entry),
    missing,
    invalid,
  }
}

export const FIRST_RENTAL_SOURCES = {
  cgnFee: {
    label: 'CGN · Comisión mensual',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/publicaciones/preguntas-frecuentes-sobre-garantia-alquileres/preguntas-frecuentes-3',
  },
  cgnBills: {
    label: 'CGN · Servicios accesorios',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/publicaciones/preguntas-frecuentes-sobre-garantia-alquileres/preguntas-frecuentes-2',
  },
  cgnRights: {
    label: 'CGN · Derechos y obligaciones',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/garantia-de-alquileres/derechos-obligaciones-del-inquilino',
  },
  homeTax: {
    label: 'IM · Tributos domiciliarios',
    url: 'https://normativa.montevideo.gub.uy/content/a535',
  },
  propertyTax: {
    label: 'IM · Contribución inmobiliaria',
    url: 'https://normativa.montevideo.gub.uy/content/a441',
  },
  primaryTax: {
    label: 'DGI · Impuesto de Primaria',
    url: 'https://www.gub.uy/direccion-general-impositiva/politicas-y-gestion/programas/que-es-el-impuesto-primaria-y-quienes-deben-pagar',
  },
  ose: {
    label: 'OSE · Cambio de nombre',
    url: 'https://www.ose.com.uy/tramite/solicitud-de-cambio-de-nombre-del-servicio',
  },
  ute: {
    label: 'UTE · Cambio de nombre',
    url: 'https://www.ute.com.uy/solicitudes/cambio-de-nombre-del-servicio',
  },
  sanitation: {
    label: 'IM · Tarifa de saneamiento',
    url: 'https://montevideo.gub.uy/tipo/area-tematica/ambiente/agua-y-saneamiento/tarifa-de-saneamiento',
  },
  oseCoverage: {
    label: 'OSE · Agua y saneamiento',
    url: 'https://media.ose.com.uy/empresa/la-empresa',
  },
  landlord: {
    label: 'CGN · Obligaciones del arrendador',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/garantia-de-alquileres/propietarios/derechos-obligaciones-del-arrendador',
  },
} as const
export type FirstRentalSource = keyof typeof FIRST_RENTAL_SOURCES

export interface RentalGuideBlock {
  id: string
  title: string
  text: string
  sources: FirstRentalSource[]
}

export interface FirstRentalCopy {
  title: string
  description: string
  eyebrow: string
  intro: string
  quickTitle: string
  quickAnswer: string
  scope: string
  navLabel: string
  nav: { id: string; label: string }[]
  checklistTitle: string
  checklistIntro: string
  checklist: { id: string; title: string; text: string }[]
  checked: string
  reset: string
  billsTitle: string
  billsIntro: string
  bills: RentalGuideBlock[]
  territoryTitle: string
  territory: RentalGuideBlock[]
  proceduresTitle: string
  procedures: RentalGuideBlock[]
  ownerTitle: string
  ownerText: string
  repairsText: string
  entryTitle: string
  entryText: string
  budgetTitle: string
  budgetIntro: string
  fields: Record<BudgetField, { label: string; hint: string }>
  cgnLabel: string
  cgnHint: string
  monthlyResult: string
  entryResult: string
  feeResult: string
  missing: string
  budgetEmpty: string
  invalid: string
  budgetNote: string
  faqTitle: string
  faq: { q: string; a: string }[]
  relatedTitle: string
  related: { path: string; label: string }[]
  sourcesTitle: string
  sourceNewTab: string
  reviewed: string
  sourceLabels: Record<FirstRentalSource, string>
}
