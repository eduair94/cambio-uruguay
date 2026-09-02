// El bug que dejaba el mapa de descuentos vacío para todo el que volvía.
//
// La página usa el store durante el SSR, así que pinia serializa `cards: []` en el payload. Al
// hidratar, el cliente le asigna ese `[]` al ref, el watcher dispara y `persistLocal` escribía
// "[]" en el localStorage — antes de que `loadLocal()` (que corre en onMounted) alcanzara a leer
// lo que el visitante había elegido la vez anterior. Medido en producción con un hook sobre
// Storage.setItem: la escritura del "[]" ocurría a los 1.379 ms de la carga.
//
// Y no era un detalle cosmético: sin tarjetas seleccionadas la página no dibuja el mapa ni llama a
// /api/bankos/*, así que el efecto real era que cada visitante que volvía encontraba el producto
// vacío.
//
// Estos tests reproducen esa secuencia exacta. Sin la condición `localLoaded` en `persistLocal`,
// el primero falla.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'
import { useBankosCardsStore } from '../../stores/bankosCards'
import { useBankosFavoritesStore } from '../../stores/bankosFavorites'
import { BANKOS_CARDS_STORAGE_KEY, BANKOS_FAVORITES_STORAGE_KEY } from '../../utils/bankos'

/** localStorage de mentira, con registro de escrituras para poder afirmar que NO hubo ninguna. */
function fakeStorage() {
  const data = new Map<string, string>()
  const writes: Array<[string, string]> = []
  return {
    writes,
    api: {
      getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
      setItem: (k: string, v: string) => {
        writes.push([k, v])
        data.set(k, v)
      },
      removeItem: (k: string) => void data.delete(k),
    },
  }
}

let storage: ReturnType<typeof fakeStorage>

beforeEach(() => {
  // Los stores usan los auto-imports de Nuxt (`ref`, `watch`, `computed`), que fuera del runtime
  // de Nuxt no existen. Se inyectan acá, ANTES del primer useStore(): el cuerpo del setup de pinia
  // corre recién en esa llamada, así que llegan a tiempo.
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('computed', computed)
  setActivePinia(createPinia())
  storage = fakeStorage()
  vi.stubGlobal('window', { localStorage: storage.api })
  vi.stubGlobal('localStorage', storage.api)
})

describe('la selección de tarjetas sobrevive a la hidratación', () => {
  it('NO pisa lo guardado cuando la hidratación asigna un array vacío', async () => {
    storage.api.setItem(BANKOS_CARDS_STORAGE_KEY, JSON.stringify(['itau_debit', 'brou_credit']))
    storage.writes.length = 0

    const store = useBankosCardsStore()
    // Esto es exactamente lo que hace pinia al hidratar el payload del SSR.
    store.cards = []
    await nextTick()

    expect(storage.writes).toEqual([])
    expect(JSON.parse(storage.api.getItem(BANKOS_CARDS_STORAGE_KEY)!)).toEqual([
      'itau_debit',
      'brou_credit',
    ])
  })

  it('después de hidratar, loadLocal recupera la selección', async () => {
    storage.api.setItem(BANKOS_CARDS_STORAGE_KEY, JSON.stringify(['itau_debit']))
    const store = useBankosCardsStore()
    store.cards = []
    await nextTick()

    // onMounted en la página.
    store.loadLocal()
    expect(store.cards).toEqual(['itau_debit'])
  })

  it('una elección real del usuario sí se guarda', async () => {
    const store = useBankosCardsStore()
    store.loadLocal()
    store.toggle('itau_debit')
    await nextTick()

    expect(JSON.parse(storage.api.getItem(BANKOS_CARDS_STORAGE_KEY)!)).toEqual(['itau_debit'])
  })

  it('y vaciar a propósito también se guarda', async () => {
    storage.api.setItem(BANKOS_CARDS_STORAGE_KEY, JSON.stringify(['itau_debit']))
    const store = useBankosCardsStore()
    store.loadLocal()
    store.clear()
    await nextTick()

    expect(JSON.parse(storage.api.getItem(BANKOS_CARDS_STORAGE_KEY)!)).toEqual([])
  })
})

describe('los favoritos sobreviven a la hidratación', () => {
  it('NO pisa lo guardado cuando la hidratación asigna un array vacío', async () => {
    storage.api.setItem(BANKOS_FAVORITES_STORAGE_KEY, JSON.stringify(['1921-001']))
    storage.writes.length = 0

    const store = useBankosFavoritesStore()
    store.favorites = []
    await nextTick()

    expect(storage.writes).toEqual([])
    expect(JSON.parse(storage.api.getItem(BANKOS_FAVORITES_STORAGE_KEY)!)).toEqual(['1921-001'])
  })

  it('un favorito real del usuario sí se guarda', async () => {
    const store = useBankosFavoritesStore()
    store.loadLocal()
    store.toggle('1921-001')
    await nextTick()

    expect(JSON.parse(storage.api.getItem(BANKOS_FAVORITES_STORAGE_KEY)!)).toEqual(['1921-001'])
  })
})
