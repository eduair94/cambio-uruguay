// Lo que la ruta `/api/precios` le manda al hub de precios de supermercado.
//
// Existe como función pura por la misma razón que `basketProjection.ts`: una
// proyección inline pierde campos en silencio. Y existe en vez de reenviar la
// canasta entera porque desde el 2026-09-19 el backend guarda `rankedStores`,
// TODOS los locales calificados (356 el día que se agregó): mandarlos enteros en
// el HTML de cada visita sería el payload inflado de siempre. La página sólo
// necesita los más baratos de cada departamento para su filtro.

export const PRECIOS_HUB_STORES_PER_DEPT = 15

export interface PreciosHubRankedStore {
  storeId: number
  storeName: string
  department: string
  chain: string
  address: string
  ratio: number
  coverage: number
}

const round4 = (value: number): number => Math.round(value * 10000) / 10000

const str = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * Los primeros `perDept` de cada departamento, en el orden en que vienen (el
 * backend ya los ordena por ratio). Una fila sin ratio medible no entra: no hay
 * nivel de precios que mostrar.
 */
export function preciosCapRankedStores(
  rows: unknown,
  perDept = PRECIOS_HUB_STORES_PER_DEPT
): PreciosHubRankedStore[] {
  if (!Array.isArray(rows)) return []
  const taken = new Map<string, number>()
  const out: PreciosHubRankedStore[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const ratio = (row as any).ratio
    const coverage = (row as any).coverage
    if (typeof ratio !== 'number' || !Number.isFinite(ratio)) continue
    const department = str((row as any).department)
    const count = taken.get(department) ?? 0
    if (count >= perDept) continue
    taken.set(department, count + 1)
    out.push({
      storeId: Number((row as any).storeId),
      storeName: str((row as any).storeName),
      department,
      chain: str((row as any).chain),
      address: str((row as any).address),
      ratio: round4(ratio),
      coverage: typeof coverage === 'number' && Number.isFinite(coverage) ? round4(coverage) : 0,
    })
  }
  return out
}

export function preciosHubPayload(catalogue: any, basket: any) {
  const hasBasket = Boolean(basket?.day)
  return {
    day: catalogue?.day ?? null,
    count: catalogue?.count ?? 0,
    articles: catalogue?.articles ?? [],
    basketMeta: catalogue?.basket ?? null,
    basket: hasBasket
      ? {
          ...basket,
          // Un documento anterior al campo no lo trae: la página cae a
          // `cheapestStores` y lo dice, en vez de mostrar una tabla vacía.
          rankedStores: preciosCapRankedStores(basket.rankedStores),
        }
      : null,
  }
}
