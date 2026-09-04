// Las pizarras que no cambian de precio, para que la UI pueda advertirlo donde duele.
//
// El backend lo calcula al final de cada corrida del sync y lo sirve desde archivo (ver
// `classes/rate_staleness.ts` y `GET /frozen-quotes`). Acá sólo se proxea y se cachea, por dos
// razones: la home lo consulta en cada render, y si el backend se cae la página tiene que seguir
// entera — una advertencia que falta es mucho menos grave que una portada rota.
//
// Se devuelve un mapa `origin|code|type -> días`, no el array crudo: quien lo consume busca por fila
// y un `find()` por cada una de las 200 filas de /avanzado es trabajo al pedo.

interface FrozenQuote {
  origin: string
  code: string
  type: string
  buy: number | null
  sell: number | null
  daysFrozen: number
  capped: boolean
  extreme: 'min-sell' | 'max-sell' | 'min-buy' | 'max-buy' | null
  groupMedianDays: number
}

interface FrozenReport {
  generatedAt?: string | null
  quotes?: FrozenQuote[]
}

export interface FrozenEntry {
  days: number
  /** La ventana entera está quieta: `days` es un piso, no el número exacto. */
  capped: boolean
  /** Si esta cotización encabeza hoy su grupo. Es el caso que llega a la portada. */
  extreme: FrozenQuote['extreme']
}

export interface FrozenMap {
  generatedAt: string | null
  /** Clave: `origin|code|type`. `type` vacío = mostrador. */
  entries: Record<string, FrozenEntry>
}

export const frozenKey = (origin: string, code: string, type?: string | null) =>
  `${origin}|${code}|${type || ''}`

export default defineCachedEventHandler(
  async (): Promise<FrozenMap> => {
    const config = useRuntimeConfig()
    const apiBase = config.public.apiBase as string

    const report = await $fetch<FrozenReport>('/frozen-quotes', {
      baseURL: apiBase,
      timeout: 10000,
    }).catch(() => ({ quotes: [] }) as FrozenReport)

    const entries: Record<string, FrozenEntry> = {}
    for (const q of report?.quotes || []) {
      if (!q?.origin || !q?.code || typeof q.daysFrozen !== 'number') continue
      entries[frozenKey(q.origin, q.code, q.type)] = {
        days: q.daysFrozen,
        capped: Boolean(q.capped),
        extreme: q.extreme ?? null,
      }
    }

    return { generatedAt: report?.generatedAt ?? null, entries }
  },
  {
    // El informe se regenera con el sync, cada cinco minutos. Pedirlo más seguido no trae nada nuevo.
    maxAge: 60 * 5,
    staleMaxAge: 60 * 60,
    name: 'frozen-quotes',
    getKey: () => 'frozen-quotes',
  }
)
