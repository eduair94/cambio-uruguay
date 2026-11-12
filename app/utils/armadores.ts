// Directorio de armadores de muebles (/armadores-de-muebles-montevideo). Los tipos son espejo de
// classes/armadores/types.ts (el job `currency-armadores` escribe el documento que esta página lee)
// y las zonas, de classes/armadores/zones.ts — tests/unit/armadoresZonesParity compara las dos.
// Todo lo de acá es puro: filtros, URL, orden, grupos por zona y la referencia de precios.

export type ArmadorSource = 'editorial' | 'google' | 'facebook' | 'mercadolibre'
export type MontevideoZone = 'centro' | 'costa-este' | 'este' | 'norte' | 'oeste'
export type ArmadorZone = MontevideoZone | 'metropolitana'
export type ArmadorItem =
  | 'ropero'
  | 'cama'
  | 'cucheta'
  | 'comoda'
  | 'mesa-de-luz'
  | 'escritorio'
  | 'rack'
  | 'biblioteca'
  | 'mesa'
  | 'silla'
  | 'cocina'
  | 'bano'
  | 'zapatera'
  | 'cuna'
  | 'exterior'
  | 'colgado'
  | 'desarmado'
  | 'visita'
  | 'hora'
  | 'otro'
export type ArmadorService =
  'armado' | 'desarmado' | 'traslado' | 'colgado' | 'instalacion' | 'reparacion'

export interface ArmadorPrice {
  item: ArmadorItem | null
  label: string
  amount: number
  amountMax: number | null
  currency: 'UYU' | 'USD'
  kind: 'exact' | 'from' | 'range' | 'ad'
  conditions: string | null
  sourceUrl: string
  observedAt: string
  origin: 'table' | 'ad-card' | 'ad-text'
}

export interface ArmadorEntry {
  id: string
  source: ArmadorSource
  kind: 'empresa' | 'independiente' | 'tienda' | 'plataforma' | 'aviso'
  name: string
  summary: string | null
  url: string
  website: string | null
  image: string | null
  base: {
    barrio: string | null
    zone: ArmadorZone | null
    department: string | null
    basis: 'coordinates' | 'ml-city' | 'text' | 'editorial' | null
  }
  coverage: { allMontevideo: boolean; barrios: string[]; zones: ArmadorZone[]; outside: string[] }
  services: ArmadorService[]
  prices: ArmadorPrice[]
  symbolicPrice: boolean
  rating: { value: number; count: number; observedAt: string } | null
  placeId: string | null
  contacts: Array<{
    type: 'whatsapp' | 'phone' | 'email' | 'instagram' | 'facebook'
    value: string
    sourceUrl: string
  }>
  storeOnly: boolean
  sources: Array<{ url: string; consultedAt: string; label: string }>
  firstSeen: string
  lastSeen: string
}

/** El documento tal como está en `armadorsnapshots`. */
export interface ArmadorSnapshotDoc {
  key: string
  capturedAt: Date | string
  googleAt: string | null
  editorialReviewedAt: string | null
  entries: ArmadorEntry[]
  counts: Record<string, number>
  notes: string[]
}

/** Lo que la ruta manda a la página. */
export interface ArmadoresPayload {
  capturedAt: string
  googleAt: string | null
  editorialReviewedAt: string | null
  entries: ArmadorEntry[]
}

export const ARMADOR_ZONES: ReadonlyArray<{ id: ArmadorZone; label: string; hint: string }> = [
  { id: 'centro', label: 'Centro', hint: 'Ciudad Vieja, Centro, Cordón, Aguada, Tres Cruces' },
  {
    id: 'costa-este',
    label: 'Costa este',
    hint: 'Punta Carretas, Pocitos, Buceo, Malvín, Carrasco',
  },
  { id: 'este', label: 'Este', hint: 'Unión, La Blanqueada, Maroñas, Ituzaingó' },
  { id: 'norte', label: 'Norte', hint: 'Prado, Sayago, Colón, Piedras Blancas, Cerrito' },
  { id: 'oeste', label: 'Oeste', hint: 'Cerro, La Teja, Belvedere, Nuevo París' },
  {
    id: 'metropolitana',
    label: 'Área metropolitana',
    hint: 'Ciudad de la Costa, Las Piedras, La Paz, Pando',
  },
]

/** Espejo de classes/armadores/zones.ts (`ZONE_BARRIOS`). */
export const ARMADOR_ZONE_BARRIOS: Readonly<Record<MontevideoZone, readonly string[]>> =
  Object.freeze({
    centro: [
      'Ciudad Vieja',
      'Centro',
      'Barrio Sur',
      'Cordón',
      'Palermo',
      'Parque Rodó',
      'Aguada',
      'Tres Cruces',
      'La Comercial',
      'Villa Muñoz',
      'Retiro',
      'La Figurita',
      'Jacinto Vera',
      'Goes',
    ],
    'costa-este': [
      'Punta Carretas',
      'Pocitos',
      'Buceo',
      'Parque Batlle',
      'Villa Dolores',
      'Malvín',
      'Malvín Norte',
      'Punta Gorda',
      'Carrasco',
      'Carrasco Norte',
      'Pocitos Nuevo',
      'Puerto Buceo',
      'Villa Biarritz',
    ],
    este: [
      'Bañados de Carrasco',
      'Maroñas',
      'Parque Guaraní',
      'Flor de Maroñas',
      'Las Canteras',
      'Punta de Rieles',
      'Bella Italia',
      'Jardines del Hipódromo',
      'Ituzaingó',
      'Unión',
      'Villa Española',
      'Mercado Modelo',
      'Bolívar',
      'Castro',
      'Pérez Castellanos',
      'Larrañaga',
      'La Blanqueada',
      'Cruz de Carrasco',
      'Curva de Maroñas',
    ],
    norte: [
      'Cerrito',
      'Las Acacias',
      'Aires Puros',
      'Casavalle',
      'Piedras Blancas',
      'Manga',
      'Toledo Chico',
      'Paso de las Duranas',
      'Peñarol',
      'Lavalleja',
      'Prado',
      'Nueva Savona',
      'Reducto',
      'Atahualpa',
      'Brazo Oriental',
      'Sayago',
      'Conciliación',
      'Colón Sureste',
      'Abayubá',
      'Colón Centro y Noroeste',
      'Lezica',
      'Melilla',
      'Villa García',
      'Manga Rural',
      'Colón',
      'Cerrito de la Victoria',
    ],
    oeste: [
      'Cerro',
      'Casabó',
      'Pajas Blancas',
      'La Paloma',
      'Tomkinson',
      'La Teja',
      'Capurro',
      'Bella Vista',
      'Belvedere',
      'Nuevo París',
      'Tres Ombúes',
      'Pueblo Victoria',
      'Paso de la Arena',
      'Paso Molino',
      'Santa Catalina',
      'Cerro Norte',
      'Villa del Cerro',
    ],
  })

/** Espejo de classes/armadores/zones.ts (`METRO_LOCALITIES`). */
export const ARMADOR_METRO_LOCALITIES: readonly string[] = [
  'Ciudad de la Costa',
  'Solymar',
  'Lomas de Solymar',
  'Médanos de Solymar',
  'Lagomar',
  'El Pinar',
  'Shangrilá',
  'Parque Miramar',
  'Barra de Carrasco',
  'San José de Carrasco',
  'Parque de Carrasco',
  'Parque Carrasco',
  'Colinas de Carrasco',
  'Paso Carrasco',
  'Paso de Carrasco',
  'Colonia Nicolich',
  'Las Piedras',
  'La Paz',
  'Progreso',
  'Pando',
  'Barros Blancos',
  'Joaquín Suárez',
  'Toledo',
  'Ciudad del Plata',
  'Delta del Tigre',
]

/** Los muebles que se pueden elegir para comparar precios, en el orden del selector. */
export const ARMADOR_ITEMS: ReadonlyArray<{ id: ArmadorItem; label: string; one: string }> = [
  { id: 'ropero', label: 'Roperos y placares', one: 'un ropero' },
  { id: 'cama', label: 'Camas y sommiers', one: 'una cama' },
  { id: 'cucheta', label: 'Cuchetas', one: 'una cucheta' },
  { id: 'comoda', label: 'Cómodas', one: 'una cómoda' },
  { id: 'mesa-de-luz', label: 'Mesas de luz', one: 'una mesa de luz' },
  { id: 'escritorio', label: 'Escritorios', one: 'un escritorio' },
  { id: 'rack', label: 'Racks y muebles de TV', one: 'un rack' },
  { id: 'biblioteca', label: 'Bibliotecas y estantes', one: 'una biblioteca' },
  { id: 'cocina', label: 'Muebles de cocina', one: 'un mueble de cocina' },
  { id: 'mesa', label: 'Mesas', one: 'una mesa' },
  { id: 'bano', label: 'Muebles de baño', one: 'un mueble de baño' },
  { id: 'colgado', label: 'Colgar TV y estantes', one: 'colgar una TV' },
]

export const ARMADOR_ITEM_LABEL: Readonly<Record<ArmadorItem, string>> = Object.freeze({
  ropero: 'Ropero',
  cama: 'Cama',
  cucheta: 'Cucheta',
  comoda: 'Cómoda',
  'mesa-de-luz': 'Mesa de luz',
  escritorio: 'Escritorio',
  rack: 'Rack',
  biblioteca: 'Biblioteca',
  mesa: 'Mesa',
  silla: 'Silla',
  cocina: 'Cocina',
  bano: 'Baño',
  zapatera: 'Zapatera',
  cuna: 'Cuna',
  exterior: 'Exterior',
  colgado: 'Colgado',
  desarmado: 'Desarmado',
  visita: 'Visita',
  hora: 'Por hora',
  otro: 'Otro',
})

export const ARMADOR_SOURCES: ReadonlyArray<{ id: ArmadorSource; label: string; claim: string }> = [
  {
    id: 'editorial',
    label: 'Relevamiento propio',
    claim:
      'Empresas, armadores y tiendas con su sitio, su tarifa por mueble cuando la publican y los contactos que ellos mismos difunden, cada dato con fuente y fecha.',
  },
  {
    id: 'google',
    label: 'Google Maps',
    claim: 'Negocios de armado con ficha en Google Maps; la puntuación es la de la última lectura.',
  },
  {
    id: 'facebook',
    label: 'Marketplace',
    claim: 'Avisos de armadores en Facebook Marketplace; el precio es el que puso el anunciante.',
  },
  {
    id: 'mercadolibre',
    label: 'Mercado Libre',
    claim: 'Avisos en Mercado Libre Servicios; el barrio es el que eligió el anunciante.',
  },
]

export type ArmadoresSort = 'zona' | 'precio-asc' | 'resenas'

export interface ArmadoresState {
  zona: ArmadorZone | null
  barrio: string | null
  mueble: ArmadorItem | null
  fuente: ArmadorSource | null
  precio: boolean
  q: string
  orden: ArmadoresSort
}

export const ARMADORES_DEFAULT_STATE: Readonly<ArmadoresState> = Object.freeze({
  zona: null,
  barrio: null,
  mueble: null,
  fuente: null,
  precio: false,
  q: '',
  orden: 'zona',
})

const fold = (text: string): string =>
  String(text || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const ZONE_IDS = new Set<string>(ARMADOR_ZONES.map(zone => zone.id))
const ITEM_IDS = new Set<string>(ARMADOR_ITEMS.map(item => item.id))
const SOURCE_IDS = new Set<string>(ARMADOR_SOURCES.map(source => source.id))
const SORTS = new Set<string>(['zona', 'precio-asc', 'resenas'])

let barrioIndex: Map<string, { name: string; zone: ArmadorZone }> | null = null
function barrios(): Map<string, { name: string; zone: ArmadorZone }> {
  if (barrioIndex) return barrioIndex
  barrioIndex = new Map()
  for (const zone of Object.keys(ARMADOR_ZONE_BARRIOS) as MontevideoZone[])
    for (const name of ARMADOR_ZONE_BARRIOS[zone]) barrioIndex.set(fold(name), { name, zone })
  for (const name of ARMADOR_METRO_LOCALITIES)
    if (!barrioIndex.has(fold(name))) barrioIndex.set(fold(name), { name, zone: 'metropolitana' })
  return barrioIndex
}

/** La zona de un barrio (o localidad metropolitana); null si no es del directorio. */
export function armadorZoneOf(name: string | null | undefined): ArmadorZone | null {
  return name
    ? (barrios().get(fold(name))?.zone ??
        barrios().get(fold(name.split(',')[0] ?? ''))?.zone ??
        null)
    : null
}

/** Los barrios para el selector, agrupados por zona, en orden alfabético. */
export function armadorBarrioOptions(): Array<{
  zone: ArmadorZone
  label: string
  barrios: string[]
}> {
  return ARMADOR_ZONES.map(zone => ({
    zone: zone.id,
    label: zone.label,
    barrios: [
      ...(zone.id === 'metropolitana' ? ARMADOR_METRO_LOCALITIES : ARMADOR_ZONE_BARRIOS[zone.id]),
    ]
      .filter((name, index, list) => list.indexOf(name) === index)
      .sort((a, b) => a.localeCompare(b, 'es')),
  }))
}

const first = (value: unknown): string =>
  Array.isArray(value) ? String(value[0] ?? '') : typeof value === 'string' ? value : ''

export function armadoresStateFromQuery(query: Record<string, unknown>): ArmadoresState {
  const state: ArmadoresState = { ...ARMADORES_DEFAULT_STATE }
  const zona = first(query.zona)
  if (ZONE_IDS.has(zona)) state.zona = zona as ArmadorZone
  const barrio = barrios().get(fold(first(query.barrio)))
  if (barrio) {
    state.barrio = barrio.name
    state.zona = barrio.zone
  }
  const mueble = first(query.mueble)
  if (ITEM_IDS.has(mueble)) state.mueble = mueble as ArmadorItem
  const fuente = first(query.fuente)
  if (SOURCE_IDS.has(fuente)) state.fuente = fuente as ArmadorSource
  state.precio = first(query.precio) === '1'
  state.q = first(query.q).replace(/\s+/g, ' ').trim().slice(0, 80)
  const orden = first(query.orden)
  if (SORTS.has(orden)) state.orden = orden as ArmadoresSort
  return state
}

export function armadoresQueryFromState(state: ArmadoresState): Record<string, string> {
  const query: Record<string, string> = {}
  if (state.barrio) query.barrio = state.barrio
  else if (state.zona) query.zona = state.zona
  if (state.mueble) query.mueble = state.mueble
  if (state.fuente) query.fuente = state.fuente
  if (state.precio) query.precio = '1'
  if (state.q.trim()) query.q = state.q.trim()
  if (state.orden !== 'zona') query.orden = state.orden
  return query
}

const NOT_A_JOB = new Set<ArmadorItem>(['visita', 'hora', 'otro'])

/**
 * El precio que se destaca y que ordena: con un mueble elegido, el más bajo publicado PARA ese
 * mueble; sin mueble, el más bajo publicado de cualquier mueble (o el de la tarjeta del aviso).
 * Sólo pesos: un precio en dólares no se ordena contra uno en pesos.
 */
export function armadorFromPrice(
  entry: ArmadorEntry,
  mueble: ArmadorItem | null
): ArmadorPrice | null {
  const candidates = entry.prices.filter(
    price =>
      price.currency === 'UYU' &&
      (mueble ? price.item === mueble : price.item === null || !NOT_A_JOB.has(price.item))
  )
  return candidates.reduce<ArmadorPrice | null>(
    (best, price) => (!best || price.amount < best.amount ? price : best),
    null
  )
}

/** Qué tan cerca está de lo elegido: 0 base en el lugar, 1 dice cubrirlo, 2 misma zona (barrio), 3 toda la ciudad. */
function placeRank(entry: ArmadorEntry, state: ArmadoresState): number | null {
  if (!state.zona) return 0
  const barrio = state.barrio ? fold(state.barrio) : null
  const baseBarrio = entry.base.barrio ? fold(entry.base.barrio.split(',')[0] ?? '') : null
  if (barrio) {
    if (baseBarrio === barrio) return 0
    if (entry.coverage.barrios.some(name => fold(name) === barrio)) return 1
    if (entry.base.zone === state.zona || entry.coverage.zones.includes(state.zona)) return 2
  } else {
    if (entry.base.zone === state.zona) return 0
    if (entry.coverage.zones.includes(state.zona)) return 1
  }
  if (entry.coverage.allMontevideo && state.zona !== 'metropolitana') return 3
  return null
}

function matchesFilters(entry: ArmadorEntry, state: ArmadoresState): boolean {
  if (state.fuente && entry.source !== state.fuente) return false
  if (state.precio && !armadorFromPrice(entry, state.mueble)) return false
  if (state.q) {
    const needle = fold(state.q)
    const hay = fold(
      [
        entry.name,
        entry.summary ?? '',
        entry.base.barrio ?? '',
        ...entry.coverage.barrios,
        ...entry.prices.map(p => p.label),
      ].join(' ')
    )
    if (!needle.split(' ').every(word => hay.includes(word))) return false
  }
  return true
}

export function armadoresSort(
  entries: readonly ArmadorEntry[],
  orden: ArmadoresSort,
  mueble: ArmadorItem | null,
  rank?: (entry: ArmadorEntry) => number
): ArmadorEntry[] {
  const priceOf = (entry: ArmadorEntry): number =>
    armadorFromPrice(entry, mueble)?.amount ?? Number.POSITIVE_INFINITY
  const reviews = (entry: ArmadorEntry): number => entry.rating?.count ?? 0
  // Lo relevado primero, después Google, después los avisos: cuánto afirma cada fuente.
  const SOURCE_ORDER: Record<ArmadorSource, number> = {
    editorial: 0,
    google: 1,
    mercadolibre: 2,
    facebook: 3,
  }
  return [...entries].sort((a, b) => {
    if (orden === 'precio-asc') return priceOf(a) - priceOf(b) || a.name.localeCompare(b.name, 'es')
    if (orden === 'resenas') return reviews(b) - reviews(a) || a.name.localeCompare(b.name, 'es')
    return (
      (rank ? rank(a) - rank(b) : 0) ||
      Number(Boolean(armadorFromPrice(b, mueble))) - Number(Boolean(armadorFromPrice(a, mueble))) ||
      SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source] ||
      reviews(b) - reviews(a) ||
      a.name.localeCompare(b.name, 'es') ||
      a.id.localeCompare(b.id)
    )
  })
}

export interface ArmadoresGroups {
  /** Base o cobertura declarada en el lugar elegido (o todo, sin lugar). */
  local: ArmadorEntry[]
  /** Dicen cubrir todo Montevideo, sin nombrar el lugar. */
  citywide: ArmadorEntry[]
  /** Filas sin ninguna zona informada que un filtro de zona deja afuera. */
  hiddenWithoutZone: number
}

export function armadoresGroups(
  entries: readonly ArmadorEntry[],
  state: ArmadoresState
): ArmadoresGroups {
  const filtered = entries.filter(entry => matchesFilters(entry, state))
  if (!state.zona)
    return {
      local: armadoresSort(filtered, state.orden, state.mueble),
      citywide: [],
      hiddenWithoutZone: 0,
    }
  const ranks = new Map<string, number>()
  let hiddenWithoutZone = 0
  for (const entry of filtered) {
    const rank = placeRank(entry, state)
    if (rank !== null) ranks.set(entry.id, rank)
    else if (!entry.base.zone && !entry.coverage.zones.length && !entry.coverage.allMontevideo)
      hiddenWithoutZone++
  }
  const rankOf = (entry: ArmadorEntry): number => ranks.get(entry.id) ?? 9
  const local = filtered.filter(entry => ranks.has(entry.id) && rankOf(entry) < 3)
  const citywide = filtered.filter(entry => rankOf(entry) === 3)
  return {
    local: armadoresSort(local, state.orden, state.mueble, rankOf),
    citywide: armadoresSort(citywide, state.orden, state.mueble),
    hiddenWithoutZone,
  }
}

/** Cuántos prestadores tienen base o cobertura NOMBRADA en cada zona (sin sumar "toda la ciudad"). */
export function armadorZoneCounts(entries: readonly ArmadorEntry[]): Record<ArmadorZone, number> {
  const counts = Object.fromEntries(ARMADOR_ZONES.map(zone => [zone.id, 0])) as Record<
    ArmadorZone,
    number
  >
  for (const entry of entries) {
    const zones = new Set<ArmadorZone>([
      ...(entry.base.zone ? [entry.base.zone] : []),
      ...entry.coverage.zones,
    ])
    for (const zone of zones) counts[zone]++
  }
  return counts
}

/**
 * Para el mapa: cuántos prestadores tienen la base en cada barrio INE o lo NOMBRAN como zona de
 * trabajo. Una etiqueta compuesta ("Parque Batlle, Villa Dolores") cuenta cualquiera de sus partes;
 * cada prestador suma una sola vez por barrio. "Todo Montevideo" no suma: pintaría la ciudad
 * entera del mismo color y no diría nada (va como nota al pie de la leyenda).
 */
export function armadorBarrioCounts(
  entries: readonly ArmadorEntry[],
  labels: readonly string[]
): Record<string, number> {
  const counts: Record<string, number> = {}
  const parts = labels.map(label => ({
    label,
    keys: new Set([fold(label), ...label.split(', ').map(fold)]),
  }))
  for (const { label } of parts) counts[label] = 0
  for (const entry of entries) {
    const names = new Set(
      [entry.base.barrio ?? '', ...entry.coverage.barrios]
        .filter(Boolean)
        .flatMap(name => [fold(name), ...name.split(', ').map(fold)])
    )
    for (const { label, keys } of parts) if ([...keys].some(key => names.has(key))) counts[label]!++
  }
  return counts
}

/** Tramos fijos del mapa: 0 · 1 · 2 · 3–4 · 5 o más (índice en la rampa de cinco tonos). */
export function armadorMapBin(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

export const ARMADOR_MAP_BIN_LABELS = ['0', '1', '2', '3–4', '5 o más'] as const

export interface PriceStat {
  n: number
  min: number
  median: number
  max: number
}

const stat = (values: number[]): PriceStat | null => {
  if (values.length < 3) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
  return { n: sorted.length, min: sorted[0]!, median, max: sorted[sorted.length - 1]! }
}

export interface ArmadorPriceReference {
  items: Array<PriceStat & { item: ArmadorItem; label: string }>
  /** La tarjeta de los avisos de Marketplace y ML: lo que piden "desde", sin decir por qué mueble. */
  adCard: PriceStat | null
}

/**
 * Cuánto se cobra por mueble: el precio más bajo que cada prestador publica para ese mueble (uno
 * por prestador, sólo pesos, de tablas y listas de precios), con al menos tres prestadores. La
 * tarjeta de los avisos va aparte: no dice de qué mueble es, y mezclarla bajaría todo.
 */
export function armadorPriceReference(entries: readonly ArmadorEntry[]): ArmadorPriceReference {
  // Dos tiendas que publican la MISMA tarifa de referencia (Divino y El Emporio, la del armador que
  // recomiendan) son un solo precio, no dos: se cuenta la primera.
  const seenTables = new Set<string>()
  const distinct = entries.filter(entry => {
    const table = entry.prices
      .filter(p => p.origin === 'table')
      .map(p => `${p.item}:${p.amount}:${p.currency}`)
      .sort()
      .join('|')
    if (!table) return true
    if (seenTables.has(table)) return false
    seenTables.add(table)
    return true
  })
  const items: ArmadorPriceReference['items'] = []
  for (const { id, label } of ARMADOR_ITEMS) {
    const values: number[] = []
    for (const entry of distinct) {
      const own = entry.prices.filter(
        price => price.item === id && price.currency === 'UYU' && price.origin !== 'ad-card'
      )
      if (own.length) values.push(Math.min(...own.map(price => price.amount)))
    }
    const result = stat(values)
    if (result) items.push({ ...result, item: id, label })
  }
  const cards: number[] = []
  for (const entry of entries) {
    if (entry.symbolicPrice) continue
    const card = entry.prices.find(price => price.origin === 'ad-card' && price.currency === 'UYU')
    if (card) cards.push(card.amount)
  }
  return { items, adCard: stat(cards) }
}

/** La proyección pública del documento: sin las notas operativas del job ni los conteos internos. */
export function armadoresCompact(
  doc: ArmadorSnapshotDoc | null | undefined
): ArmadoresPayload | null {
  if (!doc || !Array.isArray(doc.entries)) return null
  const capturedAt =
    doc.capturedAt instanceof Date ? doc.capturedAt.toISOString() : String(doc.capturedAt)
  return {
    capturedAt,
    googleAt: doc.googleAt ?? null,
    editorialReviewedAt: doc.editorialReviewedAt ?? null,
    entries: doc.entries.map(entry => ({
      ...entry,
      sources: (entry.sources ?? []).map(source => ({
        url: source.url,
        consultedAt: source.consultedAt,
        label: source.label,
      })),
    })),
  }
}

const UYU = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 })

/** "$ 1.200", "desde $ 900", "$ 800 a $ 1.500", "US$ 40" (espacio duro entre signo y número). */
export function armadorPriceText(price: ArmadorPrice): string {
  const money = (amount: number) =>
    `${price.currency === 'USD' ? 'US$' : '$'}\u00A0${UYU.format(amount)}`
  if (price.kind === 'range' && price.amountMax)
    return `${money(price.amount)} a ${money(price.amountMax)}`
  return `${price.kind === 'from' ? 'desde ' : ''}${money(price.amount)}`
}

/** Con espacio duro: "$" y el número nunca quedan en líneas distintas. */
export const armadorMoney = (amount: number): string => `$\u00A0${UYU.format(amount)}`
