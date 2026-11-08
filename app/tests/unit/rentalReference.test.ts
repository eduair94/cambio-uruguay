// @vitest-environment jsdom
//
// The directory's reference point left the address bar on 2026-11-08: the page URL is read by
// GA4, the Google tag and every AdSense ad request, and one load of a directory URL with a point
// put it in 4 requests to Google. These tests hold the two halves of that: what may still become a
// URL (nothing of the point), and how the point survives without one (history state + the tab).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, effectScope, nextTick, ref, watch, type Ref } from 'vue'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import { normalizeRentalQuery, rentalQueryToParams } from '../../utils/rentals'
import { emptyRentalSaved, saveRentalSearch } from '../../utils/rentalSaved'
import {
  RENTAL_REFERENCE_HISTORY_KEY,
  RENTAL_REFERENCE_STORAGE_KEY,
  hasRentalReferenceQuery,
  readStoredRentalReference,
  rentalReferenceFromHistoryState,
  rentalReferenceFromQuery,
  rentalReferenceFromValue,
  rentalReferenceHistoryState,
  rentalReferenceQuery,
  sameRentalReference,
  splitRentalReference,
  withoutRentalReferenceQuery,
  writeStoredRentalReference,
  type RentalReference,
} from '../../utils/rentalReference'
import { useRentalReference } from '../../composables/useRentalReference'

const REF_KEYS = ['refLat', 'refLng', 'refLabel']
const plaza: RentalReference = { lat: -34.90608, lng: -56.19934, label: 'Plaza Independencia' }
const corner: RentalReference = { lat: -34.88974, lng: -56.17683, label: '' }

/** A search with a point, as the page holds it after "Ordenar desde este punto". */
const withPoint = () =>
  normalizeRentalQuery({
    department: 'Montevideo',
    type: 'vivienda',
    pets: '1',
    priceMax: '30000',
    refLat: '-34.906081234',
    refLng: '-56.19934',
    refLabel: 'Plaza Independencia',
    sort: 'distancia',
    page: '3',
  })

describe('what may become a URL', () => {
  it('drops the point and keeps the distance sort, the page and every filter', () => {
    const params = rentalQueryToParams(withPoint(), { includeReference: false })
    for (const key of REF_KEYS) expect(params).not.toHaveProperty(key)
    expect(params).toEqual({
      department: 'Montevideo',
      type: 'vivienda',
      pets: '1',
      priceMax: '30000',
      sort: 'distancia',
      page: '3',
    })
  })

  it('still sends the point to the API by default, rounded to 5 decimals', () => {
    expect(rentalQueryToParams(withPoint())).toMatchObject({
      refLat: '-34.90608',
      refLng: '-56.19934',
      refLabel: 'Plaza Independencia',
      sort: 'distancia',
      page: '3',
    })
    expect(rentalQueryToParams(withPoint(), { includeReference: true })).toEqual(
      rentalQueryToParams(withPoint())
    )
  })

  it('a shared link without the point lists the same homes, just not by distance', () => {
    const shared = normalizeRentalQuery(
      rentalQueryToParams(withPoint(), { includeReference: false })
    )
    expect(shared).toMatchObject({ refLat: null, refLng: null, refLabel: '', sort: 'recientes' })
    expect({ ...shared, sort: 'distancia' }).toEqual({
      ...withPoint(),
      refLat: null,
      refLng: null,
      refLabel: '',
    })
  })

  it('the URL plus the session point reads back as exactly the original query', () => {
    const query = withPoint()
    const { params, reference } = splitRentalReference(rentalQueryToParams(query))
    expect(params).toEqual(rentalQueryToParams(query, { includeReference: false }))
    expect(reference).toEqual(plaza)
    expect(normalizeRentalQuery({ ...params, ...rentalReferenceQuery(reference) })).toEqual(query)
    // A point picked on the map has no label, and an empty label must not let a stale one through.
    const merged = normalizeRentalQuery({
      ...params,
      refLabel: 'Una dirección de antes',
      ...rentalReferenceQuery(corner),
    })
    expect(merged).toMatchObject({ refLat: corner.lat, refLng: corner.lng, refLabel: '' })
    expect(rentalReferenceQuery(null)).toEqual({})
  })
})

// A tripwire: one `router.push({ query: requestParams })` in the page puts the point back into the
// address bar, with no visible change and no other failing test.
describe('the directory page keeps the point out of URLs and recordings', () => {
  const page = readFileSync(resolve(__dirname, '../../pages/alquileres-uruguay.vue'), 'utf8')
  const script = page.slice(
    page.indexOf('<script setup'),
    page.indexOf('</script>', page.indexOf('<script setup'))
  )
  const template = page.slice(page.indexOf('<template>'), page.indexOf('<script setup'))

  // Out of the URL, the label is still on screen. Session-recording tools (Microsoft Clarity,
  // behind consent) keep visible text, and recordings used to be skipped by the ?refLabel= query.
  it('masks the committed and the draft label like the address input they come from', () => {
    expect(template).toMatch(
      /<p v-if="query\.refLabel"[^>]*\bdata-clarity-mask="true"[^>]*>\s*<strong>\{\{ query\.refLabel \}\}/
    )
    expect(template).toMatch(
      /<p v-if="draftPoint"[^>]*\bdata-clarity-mask="true"[^>]*>\s*\{\{ draftPointLabel/
    )
    expect(template.match(/\{\{[^}]*(?:refLabel|draftPointLabel)[^}]*\}\}/g)).toHaveLength(2)
  })

  it('navigates only through navigate(), which splits the point off the query', () => {
    expect(script).not.toMatch(/router\.(?:push|replace)\(/)
    expect(script).not.toMatch(/navigateTo\(/)
    expect(script).toMatch(/splitRentalReference\(params\)/)
    expect(script).toMatch(/rentalReference\.navigate\(/)
  })

  it('builds every link of its own without the point', () => {
    const links = [...script.matchAll(/router\.resolve\(([\s\S]*?)\)\.href/g)]
    expect(links.length).toBeGreaterThan(0)
    for (const [, location] of links) expect(location).toContain('includeReference: false')
  })

  it('saves a search like a shared link: the filters, never the point', () => {
    expect(script).toMatch(
      /saveRentalSearch\(saved\.value, label, \{\s*\.\.\.query\.value,\s*refLat: null,\s*refLng: null,\s*refLabel: '',?\s*\}\)/
    )
    const saved = saveRentalSearch(
      emptyRentalSaved(),
      'Montevideo · Viviendas',
      { ...withPoint(), refLat: null, refLng: null, refLabel: '' },
      '2026-11-08T00:00:00Z'
    )
    const params = saved.searches[0]!.params
    for (const key of REF_KEYS) expect(params).not.toHaveProperty(key)
    expect(params).toEqual({
      department: 'Montevideo',
      pets: '1',
      priceMax: '30000',
      type: 'vivienda',
    })
    expect(JSON.stringify(saved)).not.toContain('Plaza Independencia')
  })

  it('reads the point from session state, merged into the one query the page uses', () => {
    expect(script).toMatch(
      /normalizeRentalQuery\(\{\s*\.\.\.route\.query,\s*\.\.\.rentalReferenceQuery\(rentalReference\.reference\.value\)/
    )
    expect(script).not.toMatch(/normalizeRentalQuery\(route\.query\)/)
  })
})

describe('old links that still carry the point', () => {
  it('are recognised by any of the three keys, even empty or alone', () => {
    expect(hasRentalReferenceQuery({ refLat: '-34.9', refLng: '-56.17' })).toBe(true)
    expect(hasRentalReferenceQuery({ refLabel: 'Hocquart y Democracia' })).toBe(true)
    expect(hasRentalReferenceQuery({ refLng: null })).toBe(true)
    expect(hasRentalReferenceQuery({ type: 'vivienda', sort: 'distancia' })).toBe(false)
    expect(hasRentalReferenceQuery({})).toBe(false)
  })

  it('lose exactly those keys, nothing else', () => {
    const legacy = {
      refLat: '-34.9',
      refLng: '-56.17',
      refLabel: 'Hocquart y Democracia',
      type: 'vivienda',
      neighborhoods: ['Cordón', 'Centro'],
      view: 'mapa',
      empty: null,
    }
    expect(withoutRentalReferenceQuery(legacy)).toEqual({
      type: 'vivienda',
      neighborhoods: ['Cordón', 'Centro'],
      view: 'mapa',
      empty: null,
    })
    expect(legacy).toHaveProperty('refLat')
  })

  it('give their point once, validated like the API reads it', () => {
    expect(
      rentalReferenceFromQuery({
        refLat: '-34.906081234',
        refLng: '-56.19934',
        refLabel: '<b>Plaza</b> Independencia',
      })
    ).toEqual({ lat: -34.90608, lng: -56.19934, label: 'Plaza Independencia' })
    expect(rentalReferenceFromQuery({ refLabel: 'Sólo una etiqueta' })).toBeNull()
    expect(rentalReferenceFromQuery({ refLat: '-40', refLng: '-56.17' })).toBeNull()
    expect(rentalReferenceFromQuery({ refLat: ['-34.9', '-34.8'], refLng: '-56.17' })).toBeNull()
    expect(
      rentalReferenceFromQuery({ refLat: '-34.9', refLng: '-56.17', refLabel: ['a'] })
    ).toEqual({ lat: -34.9, lng: -56.17, label: '' })
    expect(rentalReferenceFromQuery(null)).toBeNull()
  })
})

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('the tab remembers the point (sessionStorage)', () => {
  it('round-trips the point and forgets it on null', () => {
    const storage = memoryStorage()
    expect(writeStoredRentalReference(storage, plaza)).toBe(true)
    expect(JSON.parse(storage.data.get(RENTAL_REFERENCE_STORAGE_KEY)!)).toEqual(plaza)
    expect(readStoredRentalReference(storage)).toEqual(plaza)
    expect(writeStoredRentalReference(storage, null)).toBe(true)
    expect(storage.data.has(RENTAL_REFERENCE_STORAGE_KEY)).toBe(false)
    expect(readStoredRentalReference(storage)).toBeNull()
  })

  it('reads an edited or broken value as no point', () => {
    const storage = memoryStorage()
    for (const raw of [
      '{',
      '"Plaza"',
      '[1,2]',
      JSON.stringify({ lat: '-34.9', lng: '-56.17', label: '' }),
      JSON.stringify({ lat: -40, lng: -56.17, label: '' }),
      JSON.stringify({ lat: -34.9 }),
    ]) {
      storage.data.set(RENTAL_REFERENCE_STORAGE_KEY, raw)
      expect(readStoredRentalReference(storage)).toBeNull()
    }
    storage.data.set(
      RENTAL_REFERENCE_STORAGE_KEY,
      JSON.stringify({ lat: -34.9, lng: -56.17, label: '<i>x</i>\u0000y' })
    )
    expect(readStoredRentalReference(storage)).toEqual({ lat: -34.9, lng: -56.17, label: 'x y' })
  })

  it('survives blocked or missing storage', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {
        throw new Error('SecurityError')
      },
    }
    expect(readStoredRentalReference(blocked)).toBeNull()
    expect(writeStoredRentalReference(blocked, plaza)).toBe(false)
    expect(readStoredRentalReference(null)).toBeNull()
    expect(writeStoredRentalReference(undefined, plaza)).toBe(false)
  })
})

describe('each history entry carries its own point', () => {
  it('writes a plain copy under one key, or an explicit null', () => {
    const state = rentalReferenceHistoryState(plaza)
    expect(state).toEqual({ [RENTAL_REFERENCE_HISTORY_KEY]: plaza })
    expect(state[RENTAL_REFERENCE_HISTORY_KEY]).not.toBe(plaza)
    expect(rentalReferenceHistoryState(null)).toEqual({ [RENTAL_REFERENCE_HISTORY_KEY]: null })
  })

  it('tells "this entry has a point", "has none on purpose" and "says nothing" apart', () => {
    expect(
      rentalReferenceFromHistoryState({ back: '/', ...rentalReferenceHistoryState(plaza) })
    ).toEqual(plaza)
    expect(rentalReferenceFromHistoryState(rentalReferenceHistoryState(null))).toBeNull()
    for (const state of [null, undefined, 'state', { back: '/', current: '/x' }])
      expect(rentalReferenceFromHistoryState(state)).toBeUndefined()
    // A value that is not a point says nothing: the tab's point applies, not "no point".
    expect(
      rentalReferenceFromHistoryState({ [RENTAL_REFERENCE_HISTORY_KEY]: { lat: 0, lng: 0 } })
    ).toBeUndefined()
    expect(rentalReferenceFromValue([plaza.lat, plaza.lng])).toBeNull()
  })

  it('compares points by value', () => {
    expect(sameRentalReference(plaza, { ...plaza })).toBe(true)
    expect(sameRentalReference(plaza, { ...plaza, label: '' })).toBe(false)
    expect(sameRentalReference(null, undefined)).toBe(true)
    expect(sameRentalReference(plaza, null)).toBe(false)
  })
})

// The composable against a real vue-router web history (jsdom): pushes, Back/Forward, a reload and
// an old link's replace are the browser's own, only Nuxt's helpers are stand-ins.
describe('useRentalReference', () => {
  const DIRECTORY = '/alquileres-uruguay'
  let router: Router
  let states: Map<string, Ref<unknown>>
  let mounted: Array<() => void>
  let scope: ReturnType<typeof effectScope>

  async function start(path: string) {
    // A fresh entry, as when the visitor arrives: jsdom keeps one window for the whole file, and
    // the router's first navigation is a replace that would inherit the last test's state.
    window.history.pushState(null, '', path)
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: DIRECTORY, component: { render: () => null } },
        { path: '/alquileres/:key', component: { render: () => null } },
      ],
    })
    await router.push(path)
    await router.isReady()
  }

  /** One page instance: `hydrating` for a server-rendered load, false for a client navigation. */
  function mountPage(hydrating: boolean) {
    mounted = []
    const route = new Proxy({} as Record<string, unknown>, {
      get: (_, key) =>
        (router.currentRoute.value as unknown as Record<string, unknown>)[key as string],
    })
    vi.stubGlobal('useRoute', () => route)
    vi.stubGlobal('useRouter', () => router)
    vi.stubGlobal('useNuxtApp', () => ({ isHydrating: hydrating }))
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!states.has(key)) states.set(key, ref(init()))
      return states.get(key)
    })
    vi.stubGlobal('onMounted', (hook: () => void) => mounted.push(hook))
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('watch', watch)
    scope?.stop()
    scope = effectScope()
    return scope.run(() => useRentalReference())!
  }
  const runMounted = () => mounted.splice(0).forEach(hook => hook())
  const settle = async () => {
    for (let i = 0; i < 3; i++) await nextTick()
  }
  /** A fresh page load: new app state (useState), same tab (history entry and sessionStorage). */
  const reload = () => {
    states = new Map()
    return mountPage(true)
  }
  const urlHas = (key: string) => new URL(window.location.href).searchParams.has(key)

  beforeEach(() => {
    states = new Map()
    window.sessionStorage.clear()
  })
  afterEach(() => {
    scope?.stop()
    router?.options.history.destroy()
    vi.unstubAllGlobals()
  })

  it('renders without a point while hydrating, then takes the tab’s point', async () => {
    await start(`${DIRECTORY}?type=vivienda&sort=distancia`)
    writeStoredRentalReference(window.sessionStorage, plaza)
    const page = reload()
    // What the server rendered: it never knows the point.
    expect(page.reference.value).toBeNull()
    runMounted()
    await settle()
    expect(page.reference.value).toEqual(plaza)
  })

  it('applies a point through history state, never through the address bar', async () => {
    await start(`${DIRECTORY}?type=vivienda`)
    const page = mountPage(false)
    runMounted()
    const before = window.history.length
    await page.navigate({ query: { type: 'vivienda', sort: 'distancia' } }, plaza)
    await settle()
    expect(window.history.length).toBe(before + 1)
    for (const key of REF_KEYS) expect(urlHas(key)).toBe(false)
    expect(router.currentRoute.value.query).toEqual({ type: 'vivienda', sort: 'distancia' })
    expect(window.history.state[RENTAL_REFERENCE_HISTORY_KEY]).toEqual(plaza)
    expect(page.reference.value).toEqual(plaza)
    expect(readStoredRentalReference(window.sessionStorage)).toEqual(plaza)
  })

  it('a reload in the same tab keeps the point, from the entry alone', async () => {
    await start(`${DIRECTORY}?type=vivienda`)
    const page = mountPage(false)
    runMounted()
    await page.navigate({ query: { type: 'vivienda', sort: 'distancia' } }, plaza)
    await settle()
    window.sessionStorage.clear()
    const reloaded = reload()
    expect(reloaded.reference.value).toBeNull()
    runMounted()
    await settle()
    expect(reloaded.reference.value).toEqual(plaza)
    for (const key of REF_KEYS) expect(urlHas(key)).toBe(false)
  })

  it('removing the point is its own entry even when the address does not change, and Back undoes it', async () => {
    await start(`${DIRECTORY}?type=vivienda`)
    const page = mountPage(false)
    runMounted()
    await page.navigate({ query: { type: 'vivienda', sort: 'precio' } }, plaza)
    await settle()
    const sortedByPrice = window.location.href
    const before = window.history.length
    // "Quitar punto" while sorted by price: same URL, different point.
    await page.navigate({ query: { type: 'vivienda', sort: 'precio' } }, null)
    await settle()
    expect(window.location.href).toBe(sortedByPrice)
    expect(window.history.length).toBe(before + 1)
    expect(page.reference.value).toBeNull()
    expect(readStoredRentalReference(window.sessionStorage)).toBeNull()

    router.back()
    await vi.waitFor(() => expect(page.reference.value).toEqual(plaza))
    expect(readStoredRentalReference(window.sessionStorage)).toEqual(plaza)
    router.forward()
    await vi.waitFor(() => expect(page.reference.value).toBeNull())
  })

  it('Back and Forward replay each entry’s own point', async () => {
    await start(`${DIRECTORY}?type=vivienda`)
    const page = mountPage(false)
    runMounted()
    await page.navigate({ query: { type: 'vivienda', sort: 'distancia' } }, plaza)
    await page.navigate({ query: { type: 'vivienda', sort: 'distancia', view: 'mapa' } }, plaza)
    await page.navigate({ query: { type: 'vivienda', sort: 'distancia' } }, corner)
    await settle()
    expect(page.reference.value).toEqual(corner)
    router.back()
    await vi.waitFor(() => expect(router.currentRoute.value.query.view).toBe('mapa'))
    expect(page.reference.value).toEqual(plaza)
    router.forward()
    await vi.waitFor(() => expect(page.reference.value).toEqual(corner))
  })

  it('the same address with the same point is not a new entry', async () => {
    await start(`${DIRECTORY}?type=vivienda`)
    const page = mountPage(false)
    runMounted()
    await page.navigate({ query: { type: 'vivienda', sort: 'distancia' } }, plaza)
    const before = window.history.length
    await page.navigate({ query: { type: 'vivienda', sort: 'distancia' } }, { ...plaza })
    await settle()
    expect(window.history.length).toBe(before)
    expect(page.reference.value).toEqual(plaza)
  })

  it('entries the directory did not create (a menu link, the way back from a listing) keep the tab’s point', async () => {
    await start(`${DIRECTORY}?type=vivienda`)
    const page = mountPage(false)
    runMounted()
    await page.navigate({ query: { type: 'vivienda', sort: 'distancia' } }, plaza)
    await router.push('/alquileres/montevideo-cordon-abc')
    await router.push(`${DIRECTORY}?type=vivienda`)
    // The page is created again by this client navigation: the first request already has the point.
    const again = mountPage(false)
    expect(again.reference.value).toEqual(plaza)
    runMounted()
    await settle()
    expect(again.reference.value).toEqual(plaza)
  })

  it('an old link is honoured once and replaced by the same address without the point', async () => {
    await start(
      `${DIRECTORY}?refLat=-34.906081234&refLng=-56.19934&refLabel=Plaza%20Independencia&type=vivienda&sort=distancia#rental-results`
    )
    // A point remembered from earlier in the tab must not win over the one in the link.
    writeStoredRentalReference(window.sessionStorage, corner)
    const page = reload()
    // From the first render on, the link's point: it is what the server rendered with.
    expect(page.reference.value).toEqual(plaza)
    runMounted()
    expect(page.reference.value).toEqual(plaza)
    await vi.waitFor(() => expect(urlHas('refLat')).toBe(false))
    for (const key of REF_KEYS) expect(urlHas(key)).toBe(false)
    expect(router.currentRoute.value.query).toEqual({ type: 'vivienda', sort: 'distancia' })
    expect(window.location.hash).toBe('#rental-results')
    await settle()
    expect(page.reference.value).toEqual(plaza)
    expect(window.history.state[RENTAL_REFERENCE_HISTORY_KEY]).toEqual(plaza)
    expect(readStoredRentalReference(window.sessionStorage)).toEqual(plaza)
  })

  it('a client navigation to an old link starts from the link’s point, not the tab’s', async () => {
    await start(`${DIRECTORY}?type=vivienda`)
    const first = mountPage(false)
    runMounted()
    await first.navigate({ query: { type: 'vivienda', sort: 'distancia' } }, corner)
    await router.push(
      `${DIRECTORY}?refLat=-34.906081234&refLng=-56.19934&refLabel=Plaza%20Independencia&type=vivienda`
    )
    // The page's first request already uses the link's point; no detour through the tab's one.
    const page = mountPage(false)
    expect(page.reference.value).toEqual(plaza)
    runMounted()
    await vi.waitFor(() => expect(urlHas('refLat')).toBe(false))
    await settle()
    expect(page.reference.value).toEqual(plaza)
    expect(readStoredRentalReference(window.sessionStorage)).toEqual(plaza)
  })

  it('an old link with only a label loses it and keeps the tab’s point', async () => {
    await start(`${DIRECTORY}?refLabel=Mi%20casa&type=vivienda`)
    writeStoredRentalReference(window.sessionStorage, corner)
    const page = reload()
    runMounted()
    await vi.waitFor(() => expect(urlHas('refLabel')).toBe(false))
    await settle()
    expect(router.currentRoute.value.query).toEqual({ type: 'vivienda' })
    expect(page.reference.value).toEqual(corner)
  })
})
