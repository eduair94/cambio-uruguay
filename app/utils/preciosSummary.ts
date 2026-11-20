// El resumen fechado de la página de precios de supermercado: qué cadena, qué
// departamento y qué local tienen el nivel de precios más bajo en la lectura del
// día, en frases enteras. Las tablas de la página ya lo decían, fila por fila;
// esto lo dice en una oración que un buscador o un asistente pueden citar.
//
// Todo sale del payload de `/api/precios` (la canasta que guarda
// `classes/precios/refresh.ts`). Ninguna frase compara contra otro día: la
// canasta se mueve también cuando cambia cuántos locales declaran un artículo,
// y una "variación" mediría eso.
//
// Módulo puro, sin `Date` ni `toLocaleString`: el texto del servidor y el del
// navegador son el mismo carácter por carácter. Prefijo `precios` porque
// `app/utils/` es un namespace plano de auto-imports.

/** El primer día que este archivo guardó; también el de la canasta fijada. */
export const PRECIOS_ARCHIVE_SINCE = '2026-09-07'

/** Copias de `MIN_COVERAGE` y `MIN_QUALIFIED_STORES` del backend (test de paridad). */
export const PRECIOS_MIN_COVERAGE = 0.7
export const PRECIOS_MIN_STORES_PER_SCOPE = 5

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const collapse = (text: unknown): string =>
  String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()

const fold = (text: unknown): string =>
  collapse(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toUpperCase()

/** '2026-11-19' → '19/11/2026'; vacío si no es una fecha ISO. */
export function preciosDayLabel(day: unknown): string {
  const match = typeof day === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(day) : null
  return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}

/** Un decimal con coma: 16.666 → '16,7'. */
export function preciosDecimal(value: number, digits = 1): string {
  return finite(value) ? value.toFixed(digits).replace('.', ',') : ''
}

/** Pesos enteros con punto de miles: 9535.6 → '$ 9.536'. */
export function preciosPesos(value: unknown): string {
  if (!finite(value)) return ''
  const digits = String(Math.round(Math.abs(value))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `$ ${value < 0 ? '-' : ''}${digits}`
}

/** El nivel de precios en palabras: 0.9136 → '8,6 % bajo la mediana'. */
export function preciosLevelText(ratio: unknown): string {
  if (!finite(ratio)) return ''
  const pct = (ratio - 1) * 100
  if (Math.abs(pct) < 1) return 'como la mediana'
  return `${preciosDecimal(Math.abs(pct))} % ${pct < 0 ? 'bajo' : 'sobre'} la mediana`
}

const titleCase = (text: string): string =>
  text
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_, space: string, letter: string) => space + letter.toUpperCase())

/**
 * El nombre legible de una cadena. El ámbito viene en mayúsculas y sin tildes
 * ("TA - TA"); el nombre bien escrito lo trae cualquier local de esa cadena que
 * esté entre los publicados. Cuatro de las diez cadenas calificadas del
 * 2026-11-19 (Devoto, Devoto Express, Tienda Inglesa, Super Tico) no tenían
 * ninguno dentro del tope por departamento, y para ésas queda el tipo título.
 */
export function preciosChainLabel(
  key: string,
  rankedStores: Array<{ chain?: string }> | null | undefined
): string {
  const target = fold(key)
  const match = (rankedStores ?? []).find(store => store?.chain && fold(store.chain) === target)
  return match ? collapse(match.chain) : titleCase(collapse(key))
}

/**
 * El local sin la repetición del origen: "La Pañalera- Suc. La Pañalera" es
 * "La Pañalera"; una sucursal con nombre propio va al lado.
 */
export function preciosStoreLabel(storeName: unknown): string {
  const name = collapse(storeName)
  // El primer "- Suc" separa: en "Ta - Ta - Suc. San Jose" el guion de "Ta - Ta" no cuenta.
  const cut = name.search(/-\s?Suc\b/i)
  if (cut <= 0) return name
  const chain = name.slice(0, cut).trim()
  const branch = name
    .slice(cut)
    .replace(/^-\s?Suc\b\.?/i, '')
    .trim()
  if (!chain) return name
  if (!branch || fold(branch) === fold(chain)) return chain
  return branch.includes('(') ? `${chain}, ${branch}` : `${chain} (${branch})`
}

/** El local con su dirección, sin paréntesis adentro de paréntesis. */
export function preciosStoreWithAddress(store: { storeName?: string; address?: string }): string {
  const label = preciosStoreLabel(store?.storeName)
  const address = collapse(store?.address)
  if (!address) return label
  return label.includes('(') ? `${label}, ${address}` : `${label} (${address})`
}

export interface PreciosScopeGroup {
  names: string[]
  ratio: number
  stores: number[]
}

export interface PreciosScopeExtremes {
  /** Ámbitos con muestra suficiente. */
  ranked: number
  /** Todos los ámbitos de ese tipo, con o sin muestra. */
  total: number
  lowest: PreciosScopeGroup
  highest: PreciosScopeGroup
}

/** Décimas de punto: lo que la página muestra. Dos ámbitos iguales a esa precisión empatan. */
const shown = (ratio: number): number => Math.round((ratio - 1) * 1000)

/**
 * El ámbito (departamento o cadena) de nivel más bajo y el de nivel más alto,
 * SÓLO entre los que tienen muestra suficiente: el 2026-11-19 la mediana más
 * alta de todas era la de Paysandú, con 4 locales comparables, y nombrarla
 * habría sido publicar lo que la tabla de la página se niega a rankear.
 */
export function preciosScopeExtremes(
  scopes: unknown,
  prefix: 'dept:' | 'chain:'
): PreciosScopeExtremes | null {
  const rows = (Array.isArray(scopes) ? scopes : []).filter(
    (scope: any) => typeof scope?.scope === 'string' && scope.scope.startsWith(prefix)
  )
  const qualified = rows
    .filter((scope: any) => scope.qualified === true && finite(scope.median) && scope.median > 0)
    .map((scope: any) => ({
      name: scope.scope.slice(prefix.length),
      ratio: scope.median as number,
      stores: finite(scope.stores) ? scope.stores : 0,
    }))
  if (!qualified.length) return null
  qualified.sort((a, b) => a.ratio - b.ratio || a.name.localeCompare(b.name, 'es'))

  const groupAt = (ratio: number): PreciosScopeGroup => {
    const members = qualified.filter(scope => shown(scope.ratio) === shown(ratio))
    return {
      names: members.map(scope => scope.name),
      ratio: members[0]!.ratio,
      stores: members.map(scope => scope.stores),
    }
  }
  return {
    ranked: qualified.length,
    total: rows.length,
    lowest: groupAt(qualified[0]!.ratio),
    highest: groupAt(qualified[qualified.length - 1]!.ratio),
  }
}

export interface PreciosHubSummary {
  dayLabel: string
  chains: PreciosScopeExtremes | null
  depts: PreciosScopeExtremes | null
  montevideo: {
    stores: number
    ratio: number
    cheapest: { label: string; ratio: number } | null
  } | null
  cheapestStore: {
    label: string
    department: string
    ratio: number
    coverage: number
    coveragePct: number
    /** Lo que cobra ese local por los artículos que declara. */
    cost: number
    /** Lo que costarían esos mismos artículos a la mediana del país. */
    referenceCost: number
    itemsDeclared: number
    items: number
  } | null
  basketCost: {
    food: number
    nonFood: number
    total: number
    itemsPriced: number
    items: number
    foodItems?: number
    nonFoodItems?: number
  } | null
  nationalRatio: number | null
}

/** Las piezas del resumen; cada una es null cuando su dato no vino. Nunca tira. */
export function preciosHubSummary(payload: any): PreciosHubSummary {
  const basket = payload && typeof payload === 'object' ? payload.basket : null
  const day = typeof basket?.day === 'string' ? basket.day : payload?.day
  const empty: PreciosHubSummary = {
    dayLabel: preciosDayLabel(day),
    chains: null,
    depts: null,
    montevideo: null,
    cheapestStore: null,
    basketCost: null,
    nationalRatio: null,
  }
  if (!basket || typeof basket !== 'object') return empty

  const ranked: any[] = Array.isArray(basket.rankedStores) ? basket.rankedStores : []
  const scopes: any[] = Array.isArray(basket.scopes) ? basket.scopes : []

  const chainsRaw = preciosScopeExtremes(scopes, 'chain:')
  const label = (group: PreciosScopeGroup): PreciosScopeGroup => ({
    ...group,
    names: group.names.map(name => preciosChainLabel(name, ranked)),
  })
  const chains = chainsRaw
    ? { ...chainsRaw, lowest: label(chainsRaw.lowest), highest: label(chainsRaw.highest) }
    : null

  const mvScope = scopes.find(
    scope => scope?.scope === 'dept:Montevideo' && scope.qualified === true && finite(scope.median)
  )
  const mvCheapest = ranked
    .filter(store => store?.department === 'Montevideo' && finite(store.ratio) && store.ratio > 0)
    .sort((a, b) => a.ratio - b.ratio)[0]
  const montevideo = mvScope
    ? {
        stores: finite(mvScope.stores) ? mvScope.stores : 0,
        ratio: mvScope.median as number,
        cheapest: mvCheapest
          ? { label: preciosStoreWithAddress(mvCheapest), ratio: mvCheapest.ratio as number }
          : null,
      }
    : null

  const first = Array.isArray(basket.cheapestStores) ? basket.cheapestStores[0] : null
  const items = finite(basket.basketItems) && basket.basketItems > 0 ? basket.basketItems : 0
  const cheapestStore =
    first &&
    finite(first.ratio) &&
    first.ratio > 0 &&
    finite(first.cost) &&
    first.cost > 0 &&
    finite(first.coverage) &&
    items
      ? {
          label: preciosStoreLabel(first.storeName),
          department: collapse(first.department),
          ratio: first.ratio,
          coverage: first.coverage,
          coveragePct: Math.round(first.coverage * 100),
          cost: first.cost,
          referenceCost: first.cost / first.ratio,
          itemsDeclared: Math.round(first.coverage * items),
          items,
        }
      : null

  const cost = basket.nationalCost
  const basketCost =
    cost &&
    finite(cost.total) &&
    cost.total > 0 &&
    finite(cost.food) &&
    finite(cost.nonFood) &&
    finite(cost.itemsPriced) &&
    finite(cost.items) &&
    cost.items > 0
      ? {
          food: cost.food,
          nonFood: cost.nonFood,
          total: cost.total,
          itemsPriced: cost.itemsPriced,
          items: cost.items,
          foodItems: finite(cost.foodItems) ? cost.foodItems : undefined,
          nonFoodItems: finite(cost.nonFoodItems) ? cost.nonFoodItems : undefined,
        }
      : null

  return {
    ...empty,
    chains,
    depts: preciosScopeExtremes(scopes, 'dept:'),
    montevideo,
    cheapestStore,
    basketCost,
    nationalRatio:
      finite(basket.nationalRatio) && basket.nationalRatio > 0 ? basket.nationalRatio : null,
  }
}

const joinNames = (names: string[]): string =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`

const locales = (count: number): string => `${count} ${count === 1 ? 'local' : 'locales'}`

const sameGroup = (extremes: PreciosScopeExtremes): boolean =>
  shown(extremes.lowest.ratio) === shown(extremes.highest.ratio)

/** "entre las 10 cadenas con 5 o más locales comparables, el nivel va de … a …". */
export function preciosChainsSentence(chains: PreciosScopeExtremes | null): string {
  if (!chains) return ''
  const group = (g: PreciosScopeGroup): string =>
    g.names.map((name, i) => `${name}, ${locales(g.stores[i] ?? 0)}`).join('; ')
  const min = PRECIOS_MIN_STORES_PER_SCOPE
  if (chains.ranked === 1) {
    return `una sola cadena tiene ${min} o más locales comparables: ${group(chains.lowest)}, ${preciosLevelText(chains.lowest.ratio)}.`
  }
  if (sameGroup(chains)) {
    return `las ${chains.ranked} cadenas con ${min} o más locales comparables quedan ${preciosLevelText(chains.lowest.ratio)}.`
  }
  return `entre las ${chains.ranked} cadenas con ${min} o más locales comparables, el nivel va de ${preciosLevelText(chains.lowest.ratio)} (${group(chains.lowest)}) a ${preciosLevelText(chains.highest.ratio)} (${group(chains.highest)}).`
}

/** "de los 13 con muestra, los más baratos son … y el más caro …". */
export function preciosDeptsSentence(depts: PreciosScopeExtremes | null): string {
  if (!depts) return ''
  if (depts.ranked === 1) {
    return `sólo uno tiene muestra: ${depts.lowest.names[0]}, ${preciosLevelText(depts.lowest.ratio)}.`
  }
  if (sameGroup(depts)) {
    return `los ${depts.ranked} con muestra quedan ${preciosLevelText(depts.lowest.ratio)}.`
  }
  const low = depts.lowest
  const high = depts.highest
  const lowPhrase =
    low.names.length === 1
      ? `el más barato es ${low.names[0]}`
      : `los más baratos son ${joinNames(low.names)}`
  const highPhrase =
    high.names.length === 1
      ? `el más caro ${high.names[0]}`
      : `los más caros ${joinNames(high.names)}`
  return `de los ${depts.ranked} con muestra, ${lowPhrase} (${preciosLevelText(low.ratio)}) y ${highPhrase} (${preciosLevelText(high.ratio)}).`
}

export function preciosMontevideoSentence(montevideo: PreciosHubSummary['montevideo']): string {
  if (!montevideo) return ''
  const head = `${locales(montevideo.stores)} comparables, ${preciosLevelText(montevideo.ratio)}.`
  const cheapest = montevideo.cheapest
  return cheapest
    ? `${head} El de nivel más bajo es ${cheapest.label}, ${preciosLevelText(cheapest.ratio)}.`
    : head
}

export function preciosCheapestSentence(store: PreciosHubSummary['cheapestStore']): string {
  if (!store) return ''
  const where = store.department ? `${store.label}, en ${store.department}` : store.label
  return `${where}, ${preciosLevelText(store.ratio)}, con precio vigente para el ${store.coveragePct} % de la canasta.`
}

export function preciosBasketCostSentence(cost: PreciosHubSummary['basketCost']): string {
  if (!cost) return ''
  if (cost.itemsPriced < cost.items) {
    return `${cost.itemsPriced} de sus ${cost.items} artículos tienen precio en esta lectura y suman ${preciosPesos(cost.total)} a precio mediano del país (total parcial).`
  }
  return `sus ${cost.items} artículos cuestan ${preciosPesos(cost.total)} a precio mediano del país.`
}

/** Cómo se llega al nivel de un local, con los números del más barato del día. */
export function preciosWorkedExample(store: PreciosHubSummary['cheapestStore']): string {
  if (!store) return ''
  return `${store.label} tiene precio vigente para ${store.itemsDeclared} de los ${store.items} artículos. Por esos ${store.itemsDeclared}, en las cantidades de la canasta, cobra ${preciosPesos(store.cost)}; a la mediana del país costarían ${preciosPesos(store.referenceCost)}. Su nivel: ${preciosLevelText(store.ratio)}.`
}
