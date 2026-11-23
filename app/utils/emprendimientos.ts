// /emprendimientos-de-instagram-uruguay: los emprendimientos uruguayos que venden por Instagram.
// El job `currency-emprendimientos` (classes/emprendimientos/) descubre, lee y clasifica las cuentas
// y deja una ficha por cuenta en `emprendimientolistings`; esto es lo que el app necesita para
// mostrarlas: la taxonomía (espejo de classes/emprendimientos/taxonomy.ts, paridad en
// tests/unit/emprendimientosTaxonomyParity.test.ts), los filtros de la URL, el orden "descubrir"
// del día y los textos.

export const EMPRENDIMIENTOS_PATH = '/emprendimientos-de-instagram-uruguay'
export const EMPRENDIMIENTOS_PER_PAGE = 24
/** Con menos fichas que esto, la página de un rubro no se indexa ni va al sitemap. */
export const EMPRENDIMIENTOS_RUBRO_MIN_INDEX = 5

export interface EmprendimientoRubro {
  slug: string
  label: string
  /** Para el título de la página del rubro: "Tortas y dulces por Instagram en Uruguay". */
  title: string
  icon: string
}

export const EMPRENDIMIENTO_RUBROS: readonly EmprendimientoRubro[] = Object.freeze([
  { slug: 'comida', label: 'Comida y dulces', title: 'Comida y dulces', icon: 'mdi-cupcake' },
  {
    slug: 'mate-y-bebidas',
    label: 'Mate y bebidas',
    title: 'Mates y bebidas',
    icon: 'mdi-cup-outline',
  },
  { slug: 'ropa', label: 'Ropa y moda', title: 'Ropa y moda', icon: 'mdi-tshirt-crew-outline' },
  {
    slug: 'accesorios',
    label: 'Accesorios y bijouterie',
    title: 'Accesorios y bijouterie',
    icon: 'mdi-bag-personal-outline',
  },
  {
    slug: 'belleza',
    label: 'Belleza y cuidado personal',
    title: 'Belleza y cuidado personal',
    icon: 'mdi-lipstick',
  },
  { slug: 'hogar-y-deco', label: 'Hogar y deco', title: 'Hogar y deco', icon: 'mdi-sofa-outline' },
  {
    slug: 'regalos-y-papeleria',
    label: 'Regalos y papelería',
    title: 'Regalos y papelería',
    icon: 'mdi-gift-outline',
  },
  {
    slug: 'arte-y-artesanias',
    label: 'Arte y artesanías',
    title: 'Arte y artesanías',
    icon: 'mdi-palette-outline',
  },
  {
    slug: 'impresion-3d-y-laser',
    label: 'Impresión 3D y láser',
    title: 'Impresión 3D y corte láser',
    icon: 'mdi-printer-3d',
  },
  {
    slug: 'ninos',
    label: 'Niños y bebés',
    title: 'Cosas para niños y bebés',
    icon: 'mdi-baby-face-outline',
  },
  { slug: 'mascotas', label: 'Mascotas', title: 'Cosas para mascotas', icon: 'mdi-paw' },
  {
    slug: 'plantas',
    label: 'Plantas y jardín',
    title: 'Plantas y jardín',
    icon: 'mdi-sprout-outline',
  },
  {
    slug: 'tecnologia',
    label: 'Tecnología y gaming',
    title: 'Tecnología y gaming',
    icon: 'mdi-gamepad-variant-outline',
  },
  {
    slug: 'deporte',
    label: 'Deporte y aire libre',
    title: 'Deporte y aire libre',
    icon: 'mdi-run',
  },
  {
    slug: 'autos-y-motos',
    label: 'Autos y motos',
    title: 'Accesorios y detailing para autos y motos',
    icon: 'mdi-car-outline',
  },
  {
    slug: 'servicios',
    label: 'Servicios y eventos',
    title: 'Servicios y eventos',
    icon: 'mdi-party-popper',
  },
  {
    slug: 'otros',
    label: 'Otros',
    title: 'Otros emprendimientos',
    icon: 'mdi-dots-horizontal-circle-outline',
  },
])

export const EMPRENDIMIENTO_DEPARTAMENTOS: readonly { slug: string; label: string }[] =
  Object.freeze([
    { slug: 'artigas', label: 'Artigas' },
    { slug: 'canelones', label: 'Canelones' },
    { slug: 'cerro-largo', label: 'Cerro Largo' },
    { slug: 'colonia', label: 'Colonia' },
    { slug: 'durazno', label: 'Durazno' },
    { slug: 'flores', label: 'Flores' },
    { slug: 'florida', label: 'Florida' },
    { slug: 'lavalleja', label: 'Lavalleja' },
    { slug: 'maldonado', label: 'Maldonado' },
    { slug: 'montevideo', label: 'Montevideo' },
    { slug: 'paysandu', label: 'Paysandú' },
    { slug: 'rio-negro', label: 'Río Negro' },
    { slug: 'rivera', label: 'Rivera' },
    { slug: 'rocha', label: 'Rocha' },
    { slug: 'salto', label: 'Salto' },
    { slug: 'san-jose', label: 'San José' },
    { slug: 'soriano', label: 'Soriano' },
    { slug: 'tacuarembo', label: 'Tacuarembó' },
    { slug: 'treinta-y-tres', label: 'Treinta y Tres' },
  ])

const RUBRO_BY_SLUG = new Map(EMPRENDIMIENTO_RUBROS.map(r => [r.slug, r]))
const DEPTO_BY_SLUG = new Map(EMPRENDIMIENTO_DEPARTAMENTOS.map(d => [d.slug, d]))
export const emprendimientoRubro = (slug: string | null | undefined): EmprendimientoRubro | null =>
  (slug && RUBRO_BY_SLUG.get(slug)) || null
export const isEmprendimientoRubro = (slug: unknown): slug is string =>
  typeof slug === 'string' && RUBRO_BY_SLUG.has(slug)
export const emprendimientoDepartamentoLabel = (slug: string | null | undefined): string | null =>
  (slug && DEPTO_BY_SLUG.get(slug)?.label) || null

export const EMPRENDIMIENTO_ORDENES = [
  { id: 'descubrir', label: 'Para descubrir' },
  { id: 'nuevos', label: 'Recién llegados al directorio' },
  { id: 'activos', label: 'Publicaron hace poco' },
  { id: 'chicos', label: 'Los más chicos primero' },
] as const
export type EmprendimientoOrden = (typeof EMPRENDIMIENTO_ORDENES)[number]['id']
const ORDEN_IDS = new Set<string>(EMPRENDIMIENTO_ORDENES.map(o => o.id))

// ---------------------------------------------------------------------------------------------
// Lo que viaja de la API a la página.

export interface EmprendimientoPostCard {
  code: string
  reel: boolean
  date: string | null
  image: string
}

export interface EmprendimientoCard {
  handle: string
  name: string
  summary: string
  rubro: string
  tags: string[]
  departamento: string | null
  barrio: string | null
  envios: 'todo-el-pais' | 'local' | 'no-dice'
  raro: boolean
  soloInstagram: boolean
  whatsapp: boolean
  followers: number | null
  profilePic: string | null
  posts: EmprendimientoPostCard[]
  lastPostAt: string | null
  postsLast90: number
  listedAt: string
}

export interface EmprendimientoSourcePublic {
  kind: string
  label: string
  url: string | null
}

export interface EmprendimientoDetail extends EmprendimientoCard {
  website: string | null
  ofrece: 'productos' | 'servicios' | 'ambos'
  sources: EmprendimientoSourcePublic[]
  readAt: string
}

export interface EmprendimientoFacets {
  rubros: Record<string, number>
  departamentos: Record<string, number>
  soloInstagram: number
  raros: number
}

export interface EmprendimientosResponse {
  generatedAt: string | null
  total: number
  matched: number
  page: number
  pages: number
  items: EmprendimientoCard[]
  facets: EmprendimientoFacets
  destacados: {
    raros: EmprendimientoCard[]
    joyitas: EmprendimientoCard[]
    nuevos: EmprendimientoCard[]
  } | null
  unavailable?: boolean
}

export const EMPRENDIMIENTOS_EMPTY: EmprendimientosResponse = Object.freeze({
  generatedAt: null,
  total: 0,
  matched: 0,
  page: 1,
  pages: 1,
  items: [],
  facets: { rubros: {}, departamentos: {}, soloInstagram: 0, raros: 0 },
  destacados: null,
}) as EmprendimientosResponse

export interface EmprendimientoCuentaResponse {
  listing: EmprendimientoDetail | null
  similares: EmprendimientoCard[]
}

// ---------------------------------------------------------------------------------------------
// Los filtros: viven en la URL, así un enlace compartido llega ya filtrado.

export interface EmprendimientosState {
  rubro: string | null
  depto: string | null
  q: string
  orden: EmprendimientoOrden
  solo: boolean
  raros: boolean
  pagina: number
}

export const EMPRENDIMIENTOS_DEFAULT_STATE: EmprendimientosState = Object.freeze({
  rubro: null,
  depto: null,
  q: '',
  orden: 'descubrir',
  solo: false,
  raros: false,
  pagina: 1,
}) as EmprendimientosState

const first = (value: unknown): string =>
  Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')

export function emprendimientosStateFromQuery(
  query: Record<string, unknown>,
  rubro: string | null = null
): EmprendimientosState {
  const r = first(query.rubro)
  const d = first(query.depto)
  const o = first(query.orden)
  const page = Number.parseInt(first(query.pagina), 10)
  return {
    rubro: rubro ?? (isEmprendimientoRubro(r) ? r : null),
    depto: DEPTO_BY_SLUG.has(d) ? d : null,
    q: first(query.q).replace(/\s+/g, ' ').trim().slice(0, 60),
    orden: ORDEN_IDS.has(o) ? (o as EmprendimientoOrden) : 'descubrir',
    solo: first(query.solo) === '1',
    raros: first(query.raros) === '1',
    pagina: Number.isFinite(page) && page > 1 ? Math.min(page, 200) : 1,
  }
}

/** La query de la URL para un estado (sin lo que vale por defecto). `rubro` va en la ruta si hay una. */
export function emprendimientosQuery(
  state: EmprendimientosState,
  rubroInPath = false
): Record<string, string> {
  const out: Record<string, string> = {}
  if (state.rubro && !rubroInPath) out.rubro = state.rubro
  if (state.depto) out.depto = state.depto
  if (state.q) out.q = state.q
  if (state.orden !== 'descubrir') out.orden = state.orden
  if (state.solo) out.solo = '1'
  if (state.raros) out.raros = '1'
  if (state.pagina > 1) out.pagina = String(state.pagina)
  return out
}

export const emprendimientosFiltered = (
  state: EmprendimientosState,
  rubroInPath = false
): boolean =>
  Object.keys(emprendimientosQuery({ ...state, orden: 'descubrir', pagina: 1 }, rubroInPath))
    .length > 0

// ---------------------------------------------------------------------------------------------
// Orden "descubrir": un barajado con semilla del día, igual para todos ese día (el SSR, la caché
// de borde y el cliente coinciden), con las cuentas activas adelante. No premia seguidores: el
// sentido del directorio es mostrar lo que el algoritmo de Instagram no muestra.

/** FNV-1a de 32 bits: suficiente para barajar, determinista en el servidor y en el navegador. */
export function hash32(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const DAY_MS = 86_400_000

/** 0 = publicó en los últimos 30 días, 1 = en los últimos 180, 2 = más viejo o sin fecha. */
export function activityTier(lastPostAt: string | null, now: number): number {
  if (!lastPostAt) return 2
  const age = now - Date.parse(`${lastPostAt}T12:00:00Z`)
  return age <= 30 * DAY_MS ? 0 : age <= 180 * DAY_MS ? 1 : 2
}

export interface SortableListing {
  handle: string
  listedAt: string
  lastPostAt: string | null
  followers: number | null
}

export function sortEmprendimientos<T extends SortableListing>(
  rows: readonly T[],
  orden: EmprendimientoOrden,
  day: string,
  now: number
): T[] {
  const copy = [...rows]
  switch (orden) {
    case 'nuevos':
      return copy.sort(
        (a, b) => b.listedAt.localeCompare(a.listedAt) || a.handle.localeCompare(b.handle)
      )
    case 'activos':
      return copy.sort(
        (a, b) =>
          (b.lastPostAt ?? '').localeCompare(a.lastPostAt ?? '') || a.handle.localeCompare(b.handle)
      )
    case 'chicos':
      return copy.sort(
        (a, b) =>
          (a.followers ?? Infinity) - (b.followers ?? Infinity) || a.handle.localeCompare(b.handle)
      )
    case 'descubrir':
    default:
      return copy.sort(
        (a, b) =>
          activityTier(a.lastPostAt, now) - activityTier(b.lastPostAt, now) ||
          hash32(`${day}:${a.handle}`) - hash32(`${day}:${b.handle}`)
      )
  }
}

/** "Joyita": chica (menos de 3.000 seguidores) y activa (publicó en los últimos 30 días). */
export const isJoyita = (
  row: { followers: number | null; lastPostAt: string | null },
  now: number
): boolean =>
  row.followers !== null && row.followers < 3_000 && activityTier(row.lastPostAt, now) === 0

/** El día de Montevideo de un instante (UTC−3). */
export const montevideoDay = (ms: number): string =>
  new Date(ms - 3 * 3_600_000).toISOString().slice(0, 10)

// ---------------------------------------------------------------------------------------------
// Textos.

/** 1313 → "1.313 seguidores"; 15721 → "15,7 mil seguidores". */
export function followersLabel(n: number | null): string | null {
  if (n === null || !Number.isFinite(n)) return null
  if (n < 10_000) return `${n.toLocaleString('es-UY')} seguidores`
  const k = n / 1000
  return `${k.toLocaleString('es-UY', { maximumFractionDigits: k < 100 ? 1 : 0 })} mil seguidores`
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** "2026-11-21" → "hace 2 días" / "el 21 de noviembre" / "en enero de 2025". */
export function lastPostLabel(date: string | null, now: number): string | null {
  if (!date) return null
  const ms = Date.parse(`${date}T12:00:00Z`)
  if (!Number.isFinite(ms)) return null
  const days = Math.max(0, Math.round((now - ms) / DAY_MS))
  if (days === 0) return 'publicó hoy'
  if (days === 1) return 'publicó ayer'
  if (days < 14) return `publicó hace ${days} días`
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  if (days < 300) return `publicó por última vez el ${d} de ${MONTHS[m - 1]}`
  return `publicó por última vez en ${MONTHS[m - 1]} de ${y}`
}

export const enviosLabel = (envios: EmprendimientoCard['envios']): string | null =>
  envios === 'todo-el-pais'
    ? 'Envíos a todo el país'
    : envios === 'local'
      ? 'Retiro o envío en la zona'
      : null

export function placeLabel(row: {
  barrio: string | null
  departamento: string | null
}): string | null {
  const depto = emprendimientoDepartamentoLabel(row.departamento)
  if (row.barrio && depto && row.barrio !== depto) return `${row.barrio}, ${depto}`
  return row.barrio ?? depto
}

export const instagramUrl = (handle: string): string => `https://www.instagram.com/${handle}/`
export const instagramPostUrl = (post: { code: string; reel: boolean }): string =>
  `https://www.instagram.com/${post.reel ? 'reel' : 'p'}/${post.code}/`

// ---------------------------------------------------------------------------------------------
// El handle que escribe una persona ("@tortas.de.ana", "instagram.com/tortas.de.ana/?igsh=…").
// Espejo de normalizeHandle/handleFromInstagramUrl de classes/emprendimientos/handles.ts.

const RESERVED = new Set([
  'p',
  'reel',
  'reels',
  'tv',
  'stories',
  'explore',
  'accounts',
  'about',
  'legal',
  'developer',
  'direct',
  'web',
  'challenge',
  'privacy',
  'emails',
  'session',
  'ar',
  'lite',
  'download',
  'directory',
  'topics',
  'invites',
  'share',
  's',
  'tags',
  'locations',
  'help',
  'api',
  'oauth',
  'graphql',
  'static',
  'embed',
  'instagram',
])

export function handleFromInput(raw: string | null | undefined): string | null {
  let text = String(raw ?? '').trim()
  const url = /instagram\.com\/([\w.]{1,30})/i.exec(text)
  if (url) text = url[1]!
  const handle = text.replace(/^@+/, '').replace(/\/+$/, '').toLowerCase()
  if (!/^[a-z0-9._]{1,30}$/.test(handle)) return null
  if (handle.startsWith('.') || handle.endsWith('.') || handle.includes('..')) return null
  if (RESERVED.has(handle) || !/[a-z]/.test(handle)) return null
  if (handle.startsWith('www.')) return null
  return handle
}

// ---------------------------------------------------------------------------------------------
// Preguntas frecuentes (FaqSection también emite el FAQPage).

export function emprendimientosFaq(total: number): { question: string; answer: string }[] {
  return [
    {
      question: '¿Qué es este directorio?',
      answer: `Una lista de emprendimientos uruguayos que venden por Instagram${total ? ` (hoy ${total.toLocaleString('es-UY')})` : ''}, ordenada por rubro y por departamento. Instagram no tiene un buscador por rubro y ciudad, y su algoritmo te muestra lo que ya seguís: acá podés recorrer lo que no te aparece.`,
    },
    {
      question: '¿Cómo llega una cuenta al directorio?',
      answer:
        'La conocemos por Uruguay Emprendedor, por hilos de Reddit donde la gente comparte emprendimientos, porque publicó en conjunto con otra cuenta del directorio o porque alguien la sugirió en esta página. Después leemos su perfil público y entra sólo si es un emprendimiento, si algo de su perfil dice que es de Uruguay y si publicó en los últimos dos años.',
    },
    {
      question: '¿Ustedes recomiendan estas cuentas?',
      answer:
        'No. Las listamos para que se puedan encontrar, no las evaluamos ni les compramos. Cada ficha dice cuándo publicó por última vez y de dónde la conocimos. Antes de pagar por adelantado, pedí el nombre y la cédula o el RUT del vendedor, preferí pagar contra entrega o en un punto de retiro, y desconfiá de un precio muy por debajo del resto.',
    },
    {
      question: 'Tengo un emprendimiento, ¿cómo lo sumo?',
      answer:
        'Escribí tu cuenta en «Sumá un emprendimiento», al final de la página. La leemos en las horas siguientes y, si cumple las condiciones, aparece con su rubro y una descripción armada con lo que dice tu perfil. No cobramos nada.',
    },
    {
      question: 'Es mi cuenta y no quiero aparecer, ¿qué hago?',
      answer:
        'En la ficha de tu cuenta está el botón «Pedir la baja». La sacamos en el momento y no la volvemos a sumar.',
    },
  ]
}
