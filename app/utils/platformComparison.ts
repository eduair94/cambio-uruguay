export const PLATFORM_KEYS = [
  'cambioUruguay',
  'dolarAhora',
  'dolarUruguay',
  'cotizacionUy',
] as const

export type PlatformKey = (typeof PLATFORM_KEYS)[number]
export type ComparisonStatus = 'leader' | 'available' | 'limited' | 'notDocumented'
export type ComparisonCategory = 'market' | 'analysis' | 'access' | 'ecosystem'

export interface ComparisonSource {
  id: string
  platform: PlatformKey
  title: string
  url: string
}

export interface ComparisonCriterion {
  id: string
  category: ComparisonCategory
  statuses: Record<PlatformKey, ComparisonStatus>
  sourceIds: string[]
}

export const COMPARISON_REVIEWED_AT = '2026-07-24'

export const COMPARISON_SOURCES: readonly ComparisonSource[] = Object.freeze([
  {
    id: 'cu-about',
    platform: 'cambioUruguay',
    title: 'Metodología y fuentes de Cambio Uruguay',
    url: 'https://cambio-uruguay.com/acerca',
  },
  {
    id: 'cu-directory',
    platform: 'cambioUruguay',
    title: 'Directorio de casas, bancos y fintech',
    url: 'https://cambio-uruguay.com/casas-de-cambio',
  },
  {
    id: 'cu-analytics',
    platform: 'cambioUruguay',
    title: 'Analíticas de cotizaciones',
    url: 'https://cambio-uruguay.com/analiticas',
  },
  {
    id: 'cu-changes',
    platform: 'cambioUruguay',
    title: 'Últimos cambios de cotización',
    url: 'https://cambio-uruguay.com/ultimos-cambios',
  },
  {
    id: 'cu-tools',
    platform: 'cambioUruguay',
    title: 'Herramientas financieras',
    url: 'https://cambio-uruguay.com/herramientas',
  },
  {
    id: 'cu-api',
    platform: 'cambioUruguay',
    title: 'API REST pública',
    url: 'https://api.cambio-uruguay.com/api-docs',
  },
  {
    id: 'cu-account',
    platform: 'cambioUruguay',
    title: 'Alertas de Cambio Uruguay',
    url: 'https://cambio-uruguay.com/cuenta',
  },
  {
    id: 'da-home',
    platform: 'dolarAhora',
    title: 'Cotizaciones y analíticas de DólarAhora.uy',
    url: 'https://dolarahora.uy/',
  },
  {
    id: 'da-about',
    platform: 'dolarAhora',
    title: 'Acerca de DólarAhora.uy',
    url: 'https://dolarahora.uy/about',
  },
  {
    id: 'da-faq',
    platform: 'dolarAhora',
    title: 'Preguntas frecuentes de DólarAhora.uy',
    url: 'https://dolarahora.uy/faq',
  },
  {
    id: 'da-alerts',
    platform: 'dolarAhora',
    title: 'Configuración de alertas de DólarAhora.uy',
    url: 'https://dolarahora.uy/alerts/setup',
  },
  {
    id: 'da-install',
    platform: 'dolarAhora',
    title: 'Instalación como aplicación',
    url: 'https://dolarahora.uy/install/ios',
  },
  {
    id: 'du-home',
    platform: 'dolarUruguay',
    title: 'Portada de Dólar Uruguay',
    url: 'https://dolaruruguay.uy/',
  },
  {
    id: 'du-about',
    platform: 'dolarUruguay',
    title: 'Fuentes y funcionamiento de Dólar Uruguay',
    url: 'https://dolaruruguay.uy/sobre',
  },
  {
    id: 'du-compare',
    platform: 'dolarUruguay',
    title: 'Comparador de bancos de Dólar Uruguay',
    url: 'https://dolaruruguay.uy/comparar',
  },
  {
    id: 'du-changes',
    platform: 'dolarUruguay',
    title: 'Registro de cambios de Dólar Uruguay',
    url: 'https://dolaruruguay.uy/cambios',
  },
  {
    id: 'cu-home',
    platform: 'cambioUruguay',
    title: 'Portada de Cambio Uruguay',
    url: 'https://cambio-uruguay.com/',
  },
  {
    id: 'cot-home',
    platform: 'cotizacionUy',
    title: 'Portada de cotizacion.uy',
    url: 'https://cotizacion.uy/',
  },
])

const statuses = (
  cambioUruguay: ComparisonStatus,
  dolarAhora: ComparisonStatus,
  dolarUruguay: ComparisonStatus,
  cotizacionUy: ComparisonStatus
): Record<PlatformKey, ComparisonStatus> => ({
  cambioUruguay,
  dolarAhora,
  dolarUruguay,
  cotizacionUy,
})

export const COMPARISON_CRITERIA: readonly ComparisonCriterion[] = Object.freeze([
  {
    id: 'coverage',
    category: 'market',
    statuses: statuses('leader', 'limited', 'limited', 'limited'),
    sourceIds: ['cu-directory', 'da-about', 'du-home', 'cot-home'],
  },
  {
    id: 'freshness',
    category: 'market',
    statuses: statuses('leader', 'available', 'available', 'notDocumented'),
    sourceIds: ['cu-about', 'da-about', 'du-about', 'cot-home'],
  },
  {
    id: 'currencies',
    category: 'market',
    statuses: statuses('leader', 'limited', 'available', 'available'),
    sourceIds: ['cu-home', 'da-about', 'du-home', 'cot-home'],
  },
  {
    id: 'institutionTypes',
    category: 'market',
    statuses: statuses('leader', 'limited', 'limited', 'limited'),
    sourceIds: ['cu-directory', 'da-about', 'du-about', 'cot-home'],
  },
  {
    id: 'locations',
    category: 'market',
    statuses: statuses('leader', 'notDocumented', 'limited', 'limited'),
    sourceIds: ['cu-directory', 'du-about', 'cot-home'],
  },
  {
    id: 'preferentialRates',
    category: 'market',
    statuses: statuses('leader', 'notDocumented', 'notDocumented', 'notDocumented'),
    sourceIds: ['cu-home', 'da-home', 'du-home', 'cot-home'],
  },
  {
    id: 'analytics',
    category: 'analysis',
    statuses: statuses('leader', 'leader', 'available', 'notDocumented'),
    sourceIds: ['cu-analytics', 'da-home', 'du-home', 'cot-home'],
  },
  {
    id: 'changeLog',
    category: 'analysis',
    statuses: statuses('leader', 'limited', 'available', 'notDocumented'),
    sourceIds: ['cu-changes', 'da-home', 'du-changes', 'cot-home'],
  },
  {
    id: 'alerts',
    category: 'analysis',
    statuses: statuses('available', 'leader', 'limited', 'notDocumented'),
    sourceIds: ['cu-account', 'da-alerts', 'du-home', 'cot-home'],
  },
  {
    id: 'news',
    category: 'analysis',
    statuses: statuses('leader', 'leader', 'leader', 'notDocumented'),
    sourceIds: ['cu-home', 'da-home', 'du-home', 'cot-home'],
  },
  {
    id: 'freeCore',
    category: 'access',
    statuses: statuses('leader', 'leader', 'leader', 'leader'),
    sourceIds: ['cu-about', 'da-faq', 'du-about', 'cot-home'],
  },
  {
    id: 'languages',
    category: 'access',
    statuses: statuses('leader', 'available', 'limited', 'limited'),
    sourceIds: ['cu-home', 'da-home', 'du-home', 'cot-home'],
  },
  {
    id: 'installable',
    category: 'access',
    statuses: statuses('leader', 'leader', 'notDocumented', 'notDocumented'),
    sourceIds: ['cu-home', 'da-install', 'du-home', 'cot-home'],
  },
  {
    id: 'tools',
    category: 'ecosystem',
    statuses: statuses('leader', 'limited', 'available', 'limited'),
    sourceIds: ['cu-tools', 'da-home', 'du-compare', 'cot-home'],
  },
  {
    id: 'developerAccess',
    category: 'ecosystem',
    statuses: statuses('leader', 'limited', 'notDocumented', 'notDocumented'),
    sourceIds: ['cu-api', 'da-alerts', 'du-about', 'cot-home'],
  },
])

export function leaderCounts(
  criteria: readonly ComparisonCriterion[] = COMPARISON_CRITERIA
): Record<PlatformKey, number> {
  return PLATFORM_KEYS.reduce(
    (counts, platform) => {
      counts[platform] = criteria.filter(row => row.statuses[platform] === 'leader').length
      return counts
    },
    {} as Record<PlatformKey, number>
  )
}

export function sourcesForCriterion(
  criterion: ComparisonCriterion,
  sources: readonly ComparisonSource[] = COMPARISON_SOURCES
): ComparisonSource[] {
  const wanted = new Set(criterion.sourceIds)
  return sources.filter(source => wanted.has(source.id))
}

export function filterCriteria(
  category: ComparisonCategory | 'all',
  criteria: readonly ComparisonCriterion[] = COMPARISON_CRITERIA
): ComparisonCriterion[] {
  return category === 'all' ? [...criteria] : criteria.filter(row => row.category === category)
}
