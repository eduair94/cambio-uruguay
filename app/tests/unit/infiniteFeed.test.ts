import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LIST_MODE,
  FEED_SNAPSHOT_TTL_MS,
  FeedPageCache,
  feedAppendDecision,
  feedDesiredWindow,
  feedOffsets,
  feedPageAt,
  feedPagesOnScreen,
  feedPausePages,
  feedSpacerHeight,
  feedWindowPages,
  normalizeListMode,
  saveFeedSnapshot,
  takeFeedSnapshot,
  type FeedSnapshot,
} from '../../utils/infiniteFeed'

const heightsOf = (entries: Array<[number, number]>) => new Map(entries)

describe('normalizeListMode', () => {
  it('acepta sólo los dos modos y cae al defecto', () => {
    expect(normalizeListMode('scroll')).toBe('scroll')
    expect(normalizeListMode('paginas')).toBe('paginas')
    expect(normalizeListMode('infinite')).toBe(DEFAULT_LIST_MODE)
    expect(normalizeListMode(null)).toBe(DEFAULT_LIST_MODE)
  })

  it('el defecto sigue siendo la paginación numerada', () => {
    expect(DEFAULT_LIST_MODE).toBe('paginas')
  })
})

describe('techos por cantidad de avisos', () => {
  it('la ventana guarda unos 96 avisos y nunca menos de tres páginas', () => {
    expect(feedWindowPages(24)).toBe(4)
    expect(feedWindowPages(30)).toBe(4)
    expect(feedWindowPages(48)).toBe(3)
    expect(feedWindowPages(100)).toBe(3)
    expect(feedWindowPages(0)).toBe(96)
  })

  it('la carga sola pausa después de unos 120 avisos nuevos', () => {
    expect(feedPausePages(24)).toBe(5)
    expect(feedPausePages(60)).toBe(3)
  })
})

describe('feedSpacerHeight', () => {
  it('descuenta el gap que la grilla le agrega al propio espaciador', () => {
    expect(feedSpacerHeight([1000, 1200], 16)).toBe(2184)
  })

  it('sin páginas no hay espaciador', () => {
    expect(feedSpacerHeight([], 16)).toBe(0)
  })

  it('nunca da negativo', () => {
    expect(feedSpacerHeight([4], 16)).toBe(0)
  })
})

describe('feedOffsets / feedPageAt', () => {
  const heights = heightsOf([
    [3, 1000],
    [4, 2000],
    [5, 1000],
  ])

  it('apila las páginas desde la primera conocida', () => {
    const offsets = feedOffsets(3, 5, heights)
    expect(offsets.get(3)).toEqual({ top: 0, bottom: 1000 })
    expect(offsets.get(4)).toEqual({ top: 1000, bottom: 3000 })
    expect(offsets.get(5)).toEqual({ top: 3000, bottom: 4000 })
  })

  it('estima con el promedio la página que todavía no se midió', () => {
    const offsets = feedOffsets(3, 6, heights)
    expect(offsets.get(6)!.bottom - offsets.get(6)!.top).toBeCloseTo(4000 / 3)
  })

  it('encuentra la página de una posición', () => {
    expect(feedPageAt(3, 5, heights, 0)).toBe(3)
    expect(feedPageAt(3, 5, heights, 2999)).toBe(4)
    expect(feedPageAt(3, 5, heights, 3000)).toBe(5)
    expect(feedPageAt(3, 5, heights, 99999)).toBe(5)
  })
})

describe('feedDesiredWindow', () => {
  // Diez páginas de 1000 px.
  const ten = heightsOf(Array.from({ length: 10 }, (_, i) => [i + 1, 1000] as [number, number]))
  const base = { first: 1, last: 10, heights: ten, margin: 500, maxPages: 3 }

  it('toma las páginas que tocan el viewport más el margen', () => {
    expect(feedDesiredWindow({ ...base, viewTop: 4200, viewBottom: 5000 })).toEqual({
      start: 4,
      end: 6,
    })
  })

  it('recorta al techo alrededor de la página del centro', () => {
    const window = feedDesiredWindow({
      ...base,
      margin: 2500,
      viewTop: 4200,
      viewBottom: 5000,
    })
    expect(window.end - window.start + 1).toBe(3)
    expect(window.start).toBeLessThanOrEqual(5)
    expect(window.end).toBeGreaterThanOrEqual(5)
  })

  it('al principio de la lista no inventa páginas anteriores', () => {
    expect(feedDesiredWindow({ ...base, viewTop: 0, viewBottom: 800 })).toEqual({
      start: 1,
      end: 2,
    })
  })

  it('lejos más allá de lo conocido, sólo la última (no vuelve a meter páginas viejas arriba)', () => {
    // Medido en alquileres a 390 px: esperando la página 4, la ventana [3] saltaba a [1-3].
    expect(feedDesiredWindow({ ...base, viewTop: 12000, viewBottom: 12800 })).toEqual({
      start: 10,
      end: 10,
    })
  })

  it('lejos por encima de lo conocido (arrancó en ?page=N), sólo la primera', () => {
    expect(feedDesiredWindow({ ...base, first: 5, viewTop: -4000, viewBottom: -3000 })).toEqual({
      start: 5,
      end: 5,
    })
  })
})

describe('feedPagesOnScreen', () => {
  const heights = heightsOf([
    [1, 1000],
    [2, 1000],
    [3, 1000],
  ])

  it('devuelve las páginas que tocan el viewport', () => {
    expect(
      feedPagesOnScreen({ first: 1, last: 3, heights, viewTop: 900, viewBottom: 1800 })
    ).toEqual({ start: 1, end: 2 })
  })

  it('leyendo lo que va después de la lista no hay ninguna en pantalla', () => {
    // Con "todas" como respuesta la ventana nunca soltaba páginas (medido en autos: 144 tarjetas).
    expect(
      feedPagesOnScreen({ first: 1, last: 3, heights, viewTop: 5000, viewBottom: 5900 })
    ).toBeNull()
  })
})

describe('feedAppendDecision', () => {
  const base = {
    viewBottom: 9000,
    margin: 1600,
    knownHeight: 10000,
    last: 4,
    pageCount: 20,
    autoLoaded: 0,
    pausePages: 5,
  }

  it('pide la siguiente al acercarse al final', () => {
    expect(feedAppendDecision(base)).toBe('load')
  })

  it('espera si el final todavía está lejos', () => {
    expect(feedAppendDecision({ ...base, viewBottom: 2000 })).toBe('wait')
  })

  it('pausa después de las páginas automáticas, para que el pie sea alcanzable', () => {
    expect(feedAppendDecision({ ...base, autoLoaded: 5 })).toBe('pause')
  })

  it('termina en la última página', () => {
    expect(feedAppendDecision({ ...base, last: 20 })).toBe('done')
  })
})

describe('FeedPageCache', () => {
  it('suelta la página usada hace más tiempo al pasar el techo', () => {
    const cache = new FeedPageCache<number>(2)
    cache.set(1, [1])
    cache.set(2, [2])
    cache.get(1)
    cache.set(3, [3])
    expect(cache.get(2)).toBeUndefined()
    expect(cache.get(1)).toEqual([1])
    expect(cache.get(3)).toEqual([3])
    expect(cache.size).toBe(2)
  })
})

describe('recuerdo para volver desde una ficha', () => {
  const snapshot = (over: Partial<FeedSnapshot> = {}): FeedSnapshot => ({
    resetKey: 'precio<30000',
    startPage: 1,
    first: 1,
    last: 6,
    windowStart: 3,
    windowEnd: 6,
    pages: [[3, ['a']]],
    heights: [[1, 1000]],
    gap: 16,
    autoLoaded: 5,
    savedAt: 1000,
    ...over,
  })

  it('devuelve la ventana de la misma búsqueda y la consume', () => {
    saveFeedSnapshot('alquileres', snapshot())
    expect(takeFeedSnapshot('alquileres', 'precio<30000', 1, 2000)?.windowStart).toBe(3)
    expect(takeFeedSnapshot('alquileres', 'precio<30000', 1, 2000)).toBeNull()
  })

  it('no mezcla otra búsqueda ni otra página de arranque', () => {
    saveFeedSnapshot('alquileres', snapshot())
    expect(takeFeedSnapshot('alquileres', 'otra', 1, 2000)).toBeNull()
    saveFeedSnapshot('alquileres', snapshot())
    expect(takeFeedSnapshot('alquileres', 'precio<30000', 2, 2000)).toBeNull()
  })

  it('vence', () => {
    saveFeedSnapshot('autos', snapshot())
    expect(takeFeedSnapshot('autos', 'precio<30000', 1, 1000 + FEED_SNAPSHOT_TTL_MS + 1)).toBeNull()
  })
})
