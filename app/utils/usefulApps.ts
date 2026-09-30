// app/utils/usefulApps.ts
// El directorio /apps-utiles-uruguay: tipos, categorías y la lógica pura de pestañas, filtros,
// búsqueda y URL. MÓDULO PURO (sin Vue ni Nuxt): lo usan la página, sus componentes y los tests.
//
// utils/ es un espacio de nombres plano (auto-import de Nuxt) y moneyApps.ts ya exporta
// APP_CATEGORIES, PLATFORM_META, appHaystack…: todo lo de acá lleva el prefijo usefulApp(s).

export type UsefulAppCategoryId =
  | 'tramites'
  | 'salud'
  | 'transporte'
  | 'dinero'
  | 'hogar'
  | 'emergencias'
  | 'ciudad'
  | 'educacion'
  | 'compras'
  | 'ocio'

/** Quién está detrás. La tarjeta muestra la etiqueta exacta; el filtro "Tipo" los agrupa. */
export type UsefulAppKind =
  | 'estado'
  | 'intendencia'
  | 'empresa-publica'
  | 'organismo-publico'
  | 'privada'
  | 'comunidad'

/** Los diecinueve departamentos, en orden alfabético (el orden del selector). */
export const USEFUL_APP_DEPARTMENTS = [
  'Artigas',
  'Canelones',
  'Cerro Largo',
  'Colonia',
  'Durazno',
  'Flores',
  'Florida',
  'Lavalleja',
  'Maldonado',
  'Montevideo',
  'Paysandú',
  'Río Negro',
  'Rivera',
  'Rocha',
  'Salto',
  'San José',
  'Soriano',
  'Tacuarembó',
  'Treinta y Tres',
] as const

export type UsefulAppDepartment = (typeof USEFUL_APP_DEPARTMENTS)[number]

export interface UsefulAppStoreRef {
  /** Paquete de Google Play (`uy.gub.bps.movil.persona`) o id numérico del App Store. */
  id: string
  /** El desarrollador tal cual lo muestra esa tienda: lo que el lector compara antes de instalar. */
  developer: string
}

export interface UsefulApp {
  /** kebab-case, único; también es el ancla `#id` de la tarjeta. */
  id: string
  /** Como figura en la tienda, sin los agregados de posicionamiento ("PedidosYa", no "PedidosYa - Delivery Online"). */
  name: string
  /** Quién está detrás, para humanos: "Banco de Previsión Social (BPS)". */
  organization: string
  kind: UsefulAppKind
  category: UsefulAppCategoryId
  /** Aparece también en estas pestañas (no en el agrupado de "Todas"). */
  also?: readonly UsefulAppCategoryId[]
  /** Para qué sirve: una oración de ≤ 110 caracteres. */
  summary: string
  /** 2–4 cosas concretas, cada una verificada en la ficha de la tienda o en la página oficial. */
  uses: readonly string[]
  needs?: readonly string[]
  /** Departamentos donde sirve. Ausente = todo el país. */
  departments?: readonly UsefulAppDepartment[]
  android?: UsefulAppStoreRef
  ios?: UsefulAppStoreRef
  /** Versión web oficial, si existe. */
  web?: string
  /** Página del organismo (o prensa seria) que respalda la app y lo que hace. */
  source: string
  /** Advertencia de hecho: no oficial, sólo Android, reemplazó a otra… */
  note?: string
  /** Para las no oficiales: el id de la oficial. */
  officialAlternative?: string
  /** Sinónimos del buscador ("omnibus", "luz", "jubilacion"). */
  keywords?: readonly string[]
  /** 0–2 rutas propias que ayudan a usarla (etiquetas en usefulAppsContent.ts). */
  guides?: readonly string[]
}

export interface UsefulAppCategory {
  id: UsefulAppCategoryId
  label: string
  icon: string
  /** Una línea: qué hay en la pestaña. */
  blurb: string
}

export const USEFUL_APP_CATEGORIES: readonly UsefulAppCategory[] = Object.freeze([
  {
    id: 'tramites',
    label: 'Trámites e identidad',
    icon: 'mdi-card-account-details-outline',
    blurb: 'Tu usuario del Estado, la identidad digital, el BPS y la DGI.',
  },
  {
    id: 'salud',
    label: 'Salud',
    icon: 'mdi-medical-bag',
    blurb: 'ASSE, las mutualistas, las emergencias móviles y las farmacias.',
  },
  {
    id: 'transporte',
    label: 'Transporte y auto',
    icon: 'mdi-bus',
    blurb: 'El ómnibus, los pasajes, los peajes, la patente, el estacionamiento y los taxis.',
  },
  {
    id: 'dinero',
    label: 'Bancos, tarjetas y pagos',
    icon: 'mdi-credit-card-outline',
    blurb: 'Los bancos, las tarjetas, las billeteras y dónde pagar las cuentas.',
  },
  {
    id: 'hogar',
    label: 'Luz, teléfono y servicios',
    icon: 'mdi-home-lightning-bolt-outline',
    blurb: 'La luz, el celular, internet, el cable y el supergás.',
  },
  {
    id: 'emergencias',
    label: 'Emergencias y clima',
    icon: 'mdi-alarm-light-outline',
    blurb: 'El 9-1-1, los desfibriladores y el pronóstico oficial.',
  },
  {
    id: 'ciudad',
    label: 'Tu intendencia',
    icon: 'mdi-city-variant-outline',
    blurb: 'Reclamos, playas y turismo de cada departamento.',
  },
  {
    id: 'educacion',
    label: 'Educación y trabajo',
    icon: 'mdi-school-outline',
    blurb: 'La escuela, el liceo, la facultad, Ceibal y la búsqueda de empleo.',
  },
  {
    id: 'compras',
    label: 'Compras y delivery',
    icon: 'mdi-cart-outline',
    blurb: 'Delivery, supermercados, compras en el exterior y precios.',
  },
  {
    id: 'ocio',
    label: 'Cultura y entretenimiento',
    icon: 'mdi-ticket-outline',
    blurb: 'Entradas, fútbol, cine y la televisión pública.',
  },
])

export const USEFUL_APP_KIND_LABELS: Readonly<Record<UsefulAppKind, string>> = Object.freeze({
  estado: 'Estado',
  intendencia: 'Intendencia',
  'empresa-publica': 'Empresa pública',
  'organismo-publico': 'Organismo público',
  privada: 'Empresa privada',
  comunidad: 'No oficial',
})

const PUBLIC_KINDS: ReadonlySet<UsefulAppKind> = new Set<UsefulAppKind>([
  'estado',
  'intendencia',
  'empresa-publica',
  'organismo-publico',
])

export function usefulAppIsPublic(app: Pick<UsefulApp, 'kind'>): boolean {
  return PUBLIC_KINDS.has(app.kind)
}

export type UsefulAppsKindFilter = 'todas' | 'publicas' | 'privadas' | 'no-oficiales'

export const USEFUL_APPS_KIND_FILTERS: readonly { id: UsefulAppsKindFilter; label: string }[] =
  Object.freeze([
    { id: 'todas', label: 'Todas' },
    { id: 'publicas', label: 'Del Estado' },
    { id: 'privadas', label: 'Privadas' },
    { id: 'no-oficiales', label: 'No oficiales' },
  ])

export function usefulAppKindMatches(
  app: Pick<UsefulApp, 'kind'>,
  filter: UsefulAppsKindFilter
): boolean {
  if (filter === 'todas') return true
  if (filter === 'publicas') return usefulAppIsPublic(app)
  if (filter === 'privadas') return app.kind === 'privada'
  return app.kind === 'comunidad'
}

export function usefulAppPlayUrl(pkg: string): string {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}`
}

export function usefulAppAppStoreUrl(id: string): string {
  return `https://apps.apple.com/uy/app/id${encodeURIComponent(id)}`
}

/** Sin tildes, en minúsculas y con los espacios colapsados: "Cómo IR" = "como ir". */
export function usefulAppNormalize(text: unknown): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Palabras que la gente escribe y no dicen nada de la app ("la app de la luz"). Sin esto, una
// búsqueda natural exigiría "app" en cada tarjeta y no devolvería nada.
const STOPWORDS: ReadonlySet<string> = new Set([
  'a',
  'al',
  'app',
  'apps',
  'aplicacion',
  'aplicaciones',
  'con',
  'de',
  'del',
  'el',
  'en',
  'la',
  'las',
  'lo',
  'los',
  'mi',
  'o',
  'para',
  'por',
  'que',
  'un',
  'una',
  'uruguay',
  'y',
])

const CATEGORY_LABEL: Readonly<Record<string, string>> = Object.fromEntries(
  USEFUL_APP_CATEGORIES.map(category => [category.id, category.label])
)

const haystacks = new WeakMap<UsefulApp, string>()

function usefulAppHaystack(app: UsefulApp): string {
  const cached = haystacks.get(app)
  if (cached !== undefined) return cached
  const text = usefulAppNormalize(
    [
      app.name,
      app.organization,
      app.summary,
      ...app.uses,
      ...(app.keywords ?? []),
      CATEGORY_LABEL[app.category],
      USEFUL_APP_KIND_LABELS[app.kind],
      app.android?.developer,
      app.ios?.developer,
      ...(app.departments ?? []),
    ]
      .filter(Boolean)
      .join(' ')
  )
  haystacks.set(app, text)
  return text
}

/** Cada palabra con contenido tiene que aparecer, en cualquier orden. */
export function usefulAppMatches(app: UsefulApp, query: string): boolean {
  const tokens = usefulAppNormalize(query)
    .split(' ')
    .filter(token => token && !STOPWORDS.has(token))
  if (!tokens.length) return true
  const hay = usefulAppHaystack(app)
  return tokens.every(token => hay.includes(token))
}

/** Dos letras para el monograma cuando no hay ícono: "Cómo ir" → "CI", "Prex" → "PR". */
export function usefulAppInitials(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/[\s.\-:+/]+/)
    .filter(Boolean)
  const letters =
    words.length >= 2 ? `${words[0]!.charAt(0)}${words[1]!.charAt(0)}` : name.slice(0, 2)
  return letters.toUpperCase()
}

// ---------------------------------------------------------------------------
// Estado ↔ URL
// ---------------------------------------------------------------------------

export type UsefulAppsTab = 'todas' | 'imprescindibles' | UsefulAppCategoryId
export type UsefulAppsPlatform = 'android' | 'ios'
export type UsefulAppsSort = 'utiles' | 'az' | 'recientes'

export interface UsefulAppsState {
  tab: UsefulAppsTab
  q: string
  tipo: UsefulAppsKindFilter
  plataforma: UsefulAppsPlatform | 'todas'
  depto: UsefulAppDepartment | ''
  orden: UsefulAppsSort
}

export const USEFUL_APPS_DEFAULT_STATE: Readonly<UsefulAppsState> = Object.freeze({
  tab: 'todas',
  q: '',
  tipo: 'todas',
  plataforma: 'todas',
  depto: '',
  orden: 'utiles',
})

export const USEFUL_APPS_SORTS: readonly { id: UsefulAppsSort; label: string }[] = Object.freeze([
  { id: 'utiles', label: 'Más útiles primero' },
  { id: 'az', label: 'Nombre (A–Z)' },
  { id: 'recientes', label: 'Actualizadas hace poco' },
])

export const USEFUL_APPS_MAX_QUERY = 60

const TABS: readonly string[] = [
  'todas',
  'imprescindibles',
  ...USEFUL_APP_CATEGORIES.map(category => category.id),
]

const firstString = (value: unknown): string => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : ''
}

/**
 * Lee la URL con lista blanca, campo por campo: un valor que no se reconoce vuelve a su default en
 * lugar de producir una lista vacía que nadie sabe por qué está vacía. Corre también en el
 * servidor, así un enlace compartido llega ya filtrado.
 */
export function usefulAppsStateFromQuery(query: Record<string, unknown>): UsefulAppsState {
  const tab = firstString(query.categoria)
  const tipo = firstString(query.tipo)
  const plataforma = firstString(query.plataforma)
  const depto = firstString(query.depto)
  const orden = firstString(query.orden)
  return {
    tab: TABS.includes(tab) ? (tab as UsefulAppsTab) : 'todas',
    q: firstString(query.q).slice(0, USEFUL_APPS_MAX_QUERY),
    tipo: USEFUL_APPS_KIND_FILTERS.some(f => f.id === tipo)
      ? (tipo as UsefulAppsKindFilter)
      : 'todas',
    plataforma: plataforma === 'android' || plataforma === 'ios' ? plataforma : 'todas',
    depto: (USEFUL_APP_DEPARTMENTS as readonly string[]).includes(depto)
      ? (depto as UsefulAppDepartment)
      : '',
    orden: USEFUL_APPS_SORTS.some(s => s.id === orden) ? (orden as UsefulAppsSort) : 'utiles',
  }
}

/** Sólo lo que difiere del default, así la URL limpia sigue siendo la canónica. */
export function usefulAppsQueryFromState(state: UsefulAppsState): Record<string, string> {
  const out: Record<string, string> = {}
  if (state.tab !== 'todas') out.categoria = state.tab
  const q = state.q.trim()
  if (q) out.q = q.slice(0, USEFUL_APPS_MAX_QUERY)
  if (state.tipo !== 'todas') out.tipo = state.tipo
  if (state.plataforma !== 'todas') out.plataforma = state.plataforma
  if (state.depto) out.depto = state.depto
  if (state.orden !== 'utiles') out.orden = state.orden
  return out
}

/** Filtros activos sin contar la pestaña (la pestaña se ve siempre). */
export function usefulAppsActiveFilterCount(state: UsefulAppsState): number {
  return Object.keys(usefulAppsQueryFromState(state)).filter(name => name !== 'categoria').length
}

/** El `href` de una pestaña: funciona antes de hidratar y el servidor lo lee con la misma lista blanca. */
export function usefulAppsHrefForTab(
  basePath: string,
  state: UsefulAppsState,
  tab: UsefulAppsTab
): string {
  const params = new URLSearchParams(usefulAppsQueryFromState({ ...state, tab })).toString()
  return params ? `${basePath}?${params}` : basePath
}

// ---------------------------------------------------------------------------
// Filtro, orden y grupos
// ---------------------------------------------------------------------------

export interface UsefulAppsFilterContext {
  /** Ids del kit, en su orden: es la pestaña "Imprescindibles". */
  essentialIds: readonly string[]
}

export function usefulAppInTab(
  app: UsefulApp,
  tab: UsefulAppsTab,
  ctx: UsefulAppsFilterContext
): boolean {
  if (tab === 'todas') return true
  if (tab === 'imprescindibles') return ctx.essentialIds.includes(app.id)
  return app.category === tab || (app.also ?? []).includes(tab)
}

export function usefulAppsFilter(
  apps: readonly UsefulApp[],
  state: UsefulAppsState,
  ctx: UsefulAppsFilterContext
): UsefulApp[] {
  const list = apps.filter(
    app =>
      usefulAppInTab(app, state.tab, ctx) &&
      usefulAppKindMatches(app, state.tipo) &&
      (state.plataforma === 'todas' ||
        (state.plataforma === 'android' ? Boolean(app.android) : Boolean(app.ios))) &&
      (!state.depto || !app.departments?.length || app.departments.includes(state.depto)) &&
      usefulAppMatches(app, state.q)
  )
  if (state.tab === 'imprescindibles') {
    list.sort((a, b) => ctx.essentialIds.indexOf(a.id) - ctx.essentialIds.indexOf(b.id))
  }
  return list
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * "utiles" respeta el orden del catálogo (curado: lo más útil primero dentro de cada categoría).
 * Las comparaciones son de texto plano sobre nombres normalizados, sin `localeCompare`, para que el
 * servidor y el navegador ordenen igual.
 */
export function usefulAppsSort(
  apps: readonly UsefulApp[],
  orden: UsefulAppsSort,
  updatedOf: (app: UsefulApp) => string | null = () => null
): UsefulApp[] {
  const list = [...apps]
  if (orden === 'az') {
    return list.sort((a, b) => compareText(usefulAppNormalize(a.name), usefulAppNormalize(b.name)))
  }
  if (orden === 'recientes') {
    return list.sort((a, b) => compareText(updatedOf(b) ?? '', updatedOf(a) ?? ''))
  }
  return list
}

export function usefulAppsGroup(
  apps: readonly UsefulApp[]
): { category: UsefulAppCategory; apps: UsefulApp[] }[] {
  return USEFUL_APP_CATEGORIES.map(category => ({
    category,
    apps: apps.filter(app => app.category === category.id),
  })).filter(group => group.apps.length > 0)
}

export function usefulAppsTabCounts(
  apps: readonly UsefulApp[],
  ctx: UsefulAppsFilterContext
): Record<UsefulAppsTab, number> {
  const counts = {} as Record<UsefulAppsTab, number>
  for (const tab of TABS as UsefulAppsTab[]) {
    counts[tab] = apps.filter(app => usefulAppInTab(app, tab, ctx)).length
  }
  return counts
}

export function usefulAppsDepartmentsIn(apps: readonly UsefulApp[]): UsefulAppDepartment[] {
  const present = new Set(apps.flatMap(app => app.departments ?? []))
  return USEFUL_APP_DEPARTMENTS.filter(department => present.has(department))
}

/** Sólo en el cliente (onMounted): el HTML del servidor es el mismo para todos. */
export function usefulAppsDetectPlatform(
  userAgent: string,
  platform = '',
  maxTouchPoints = 0
): UsefulAppsPlatform | null {
  if (/android/i.test(userAgent)) return 'android'
  if (/iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)) {
    return 'ios'
  }
  return null
}

export function usefulAppsCountLabel(count: number): string {
  return count === 1 ? '1 app' : `${count} apps`
}
