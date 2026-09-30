// app/utils/usefulAppsView.ts
// Lo que dibujan la tarjeta, las pestañas y el kit de /apps-utiles-uruguay, calculado fuera de los
// componentes para testearlo sin montar Vue (la suite del app es de lógica pura). MÓDULO PURO.
import {
  USEFUL_APP_CATEGORIES,
  USEFUL_APP_KIND_LABELS,
  type UsefulApp,
  type UsefulAppsPlatform,
  type UsefulAppsState,
  type UsefulAppsTab,
  usefulAppAppStoreUrl,
  usefulAppIsPublic,
  usefulAppPlayUrl,
  usefulAppsHrefForTab,
} from './usefulApps'
import type { UsefulAppsKitItem } from './usefulAppsContent'
import {
  type UsefulAppsAppFacts,
  usefulAppsCount,
  usefulAppsIconFor,
  usefulAppsIsStale,
  usefulAppsLatestUpdate,
  usefulAppsLongDate,
  usefulAppsMonthYear,
  usefulAppsRating,
} from './usefulAppsStores'

export type UsefulAppStore = 'android' | 'ios' | 'web'

export interface UsefulAppButton {
  store: UsefulAppStore
  label: string
  icon: string
  href: string
  /** El de la tienda del propio celular va relleno. Sólo se sabe después de montar. */
  primary: boolean
  ariaLabel: string
}

const STORE_NAME = { android: 'Google Play', ios: 'App Store' } as const

export function usefulAppStoreButtons(
  app: UsefulApp,
  facts: UsefulAppsAppFacts | null | undefined,
  platform: UsefulAppsPlatform | null | undefined
): { buttons: UsefulAppButton[]; unavailable: string[] } {
  const buttons: UsefulAppButton[] = []
  const unavailable: string[] = []
  for (const store of ['android', 'ios'] as const) {
    const ref = app[store]
    if (!ref) continue
    const read = facts?.[store]
    if (read?.status === 'missing') {
      // Un 404 dice cosas distintas: el App Store /uy/ contesta 404 si la app no está en Uruguay,
      // Google Play sólo si la ficha ya no existe en ningún país (con gl=UY contesta 200 igual).
      const where = store === 'ios' ? 'el App Store de Uruguay' : 'Google Play'
      unavailable.push(`No está en ${where} (revisado el ${usefulAppsLongDate(read.checkedAt)}).`)
      continue
    }
    buttons.push({
      store,
      label: STORE_NAME[store],
      icon: store === 'android' ? 'mdi-google-play' : 'mdi-apple',
      href: store === 'android' ? usefulAppPlayUrl(ref.id) : usefulAppAppStoreUrl(ref.id),
      primary: platform === store,
      ariaLabel: `${app.name} en ${STORE_NAME[store]}`,
    })
  }
  if (platform === 'ios')
    buttons.sort((a, b) => Number(b.store === 'ios') - Number(a.store === 'ios'))
  if (app.web) {
    buttons.push({
      store: 'web',
      label: 'Web',
      icon: 'mdi-open-in-new',
      href: app.web,
      primary: false,
      ariaLabel: `${app.name}: versión web`,
    })
  }
  return { buttons, unavailable }
}

/**
 * El enlace a la tarjeta de una app desde otra parte de la página (el kit, "La oficial es …"). Con
 * la categoría en la query también anda antes de hidratar: si el explorador está en otra pestaña o
 * filtrado, un "#id" suelto no llevaba a ningún lado. Ya hidratada, la página lo intercepta
 * (`data-app-link`) y abre la categoría sin navegar.
 */
export function usefulAppsAppHref(app: Pick<UsefulApp, 'id' | 'category'>): string {
  return `?categoria=${app.category}#${app.id}`
}

export interface UsefulAppCardView {
  iconSrc: string | null
  kindLabel: string
  kindTone: 'publica' | 'privada' | 'comunidad'
  kindIcon: string
  meta: { icon: string; text: string }[]
  storeLine: string | null
  developerLine: string | null
  /** Advertencia visible: no oficial, o sin versiones nuevas hace dos años. */
  warning: string | null
  /** Nota neutra de las oficiales (sólo Android, reemplazó a otra…). */
  note: string | null
  alternative: { id: string; name: string; href: string } | null
  buttons: UsefulAppButton[]
  unavailable: string[]
  guides: { to: string; label: string }[]
}

export interface UsefulAppCardInput {
  facts?: UsefulAppsAppFacts | null
  platform?: UsefulAppsPlatform | null
  /** Día de referencia para "hace cuánto": la captura de las tiendas o la verificación. */
  today: string
  alternative?: UsefulApp | null
  guideLabels: Readonly<Record<string, string>>
}

export function usefulAppCardView(app: UsefulApp, input: UsefulAppCardInput): UsefulAppCardView {
  const facts = input.facts ?? null
  const kindTone =
    app.kind === 'comunidad' ? 'comunidad' : usefulAppIsPublic(app) ? 'publica' : 'privada'
  const kindIcon =
    kindTone === 'publica'
      ? 'mdi-check-decagram-outline'
      : kindTone === 'comunidad'
        ? 'mdi-account-alert-outline'
        : 'mdi-domain'

  const meta: { icon: string; text: string }[] = []
  if (app.departments?.length) {
    meta.push({
      icon: 'mdi-map-marker-outline',
      text:
        app.departments.length === 1 ? `Sólo ${app.departments[0]}` : app.departments.join(', '),
    })
  }
  for (const need of app.needs ?? []) meta.push({ icon: 'mdi-account-check-outline', text: need })

  const latest = usefulAppsLatestUpdate(facts)
  const preferred: UsefulAppsPlatform = input.platform ?? (app.android ? 'android' : 'ios')
  const order: UsefulAppsPlatform[] =
    preferred === 'android' ? ['android', 'ios'] : ['ios', 'android']
  const rated = order
    .map(store => ({ store, read: facts?.[store] }))
    .find(({ read }) => read?.status === 'ok' && read.rating !== null && Boolean(read.ratingCount))
  const parts: string[] = []
  if (latest) parts.push(`Última versión: ${usefulAppsMonthYear(latest)}`)
  if (rated?.read && rated.read.rating !== null && rated.read.ratingCount) {
    const n = rated.read.ratingCount
    parts.push(
      `${usefulAppsRating(rated.read.rating)} ★ en ${STORE_NAME[rated.store]} (${usefulAppsCount(n)} ${n === 1 ? 'opinión' : 'opiniones'})`
    )
  }

  const android = app.android?.developer
  const ios = app.ios?.developer
  const developerLine =
    android && ios && android !== ios
      ? `En la tienda figura como «${android}» (Google Play) y «${ios}» (App Store).`
      : android || ios
        ? `En la tienda figura como «${android ?? ios}».`
        : null

  const stale = usefulAppsIsStale(latest, input.today)
  const warning =
    kindTone === 'comunidad'
      ? (app.note ?? null)
      : stale && latest
        ? `Sin versiones nuevas desde ${usefulAppsMonthYear(latest)}: puede no andar bien en celulares nuevos.`
        : null

  const { buttons, unavailable } = usefulAppStoreButtons(app, facts, input.platform)

  return {
    iconSrc: usefulAppsIconFor(facts),
    kindLabel: USEFUL_APP_KIND_LABELS[app.kind],
    kindTone,
    kindIcon,
    meta,
    storeLine: parts.length ? parts.join(' · ') : null,
    developerLine,
    warning,
    note: kindTone === 'comunidad' ? null : (app.note ?? null),
    alternative: input.alternative
      ? {
          id: input.alternative.id,
          name: input.alternative.name,
          href: usefulAppsAppHref(input.alternative),
        }
      : null,
    buttons,
    unavailable,
    guides: (app.guides ?? [])
      .filter(to => Boolean(input.guideLabels[to]))
      .map(to => ({ to, label: input.guideLabels[to]! })),
  }
}

export interface UsefulAppsTabLink {
  id: UsefulAppsTab
  label: string
  icon: string
  count: number
  href: string
}

export function usefulAppsTabLinks(
  basePath: string,
  state: UsefulAppsState,
  counts: Record<UsefulAppsTab, number>
): UsefulAppsTabLink[] {
  const tabs: { id: UsefulAppsTab; label: string; icon: string }[] = [
    { id: 'todas', label: 'Todas', icon: 'mdi-view-grid-outline' },
    { id: 'imprescindibles', label: 'Imprescindibles', icon: 'mdi-star-outline' },
    ...USEFUL_APP_CATEGORIES.map(c => ({ id: c.id, label: c.label, icon: c.icon })),
  ]
  return tabs.map(tab => ({
    ...tab,
    count: counts[tab.id] ?? 0,
    href: usefulAppsHrefForTab(basePath, state, tab.id),
  }))
}

export interface UsefulAppsKitRow {
  item: UsefulAppsKitItem
  apps: UsefulApp[]
  /** Sólo los ítems "para todos" llevan casilla. */
  checked: boolean
}

export interface UsefulAppsKitView {
  todos: UsefulAppsKitRow[]
  caso: UsefulAppsKitRow[]
  done: number
  total: number
}

export function usefulAppsKitView(
  items: readonly UsefulAppsKitItem[],
  appsById: ReadonlyMap<string, UsefulApp>,
  checked: readonly string[]
): UsefulAppsKitView {
  const rows = items
    .map(item => ({
      item,
      apps: item.appIds.map(id => appsById.get(id)).filter((app): app is UsefulApp => Boolean(app)),
      checked: item.group === 'todos' && checked.includes(item.id),
    }))
    .filter(row => row.apps.length > 0)
  const todos = rows.filter(row => row.item.group === 'todos')
  return {
    todos,
    caso: rows.filter(row => row.item.group === 'caso'),
    done: todos.filter(row => row.checked).length,
    total: todos.length,
  }
}
