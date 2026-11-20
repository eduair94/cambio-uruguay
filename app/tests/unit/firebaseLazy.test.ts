import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/firebaseAuthApi', () => ({ marker: 'firebase-auth-api' }))

async function freshModule() {
  vi.resetModules()
  return import('../../services/firebaseLazy')
}

interface FakeDb {
  exists: boolean
  keys?: string[]
  hang?: boolean
  openThrows?: boolean
}

/** Just enough of IndexedDB for hasStoredFirebaseSession: open, upgrade/abort, getAllKeys. */
function fakeIndexedDB(state: FakeDb) {
  const created: string[] = []
  const factory = {
    created,
    open: vi.fn((name: string) => {
      if (state.openThrows) throw new Error('SecurityError')
      const request: any = {}
      setTimeout(() => {
        if (state.hang) return
        if (!state.exists) {
          created.push(name)
          request.transaction = {
            abort: () => {
              created.pop() // aborting the upgrade of a brand-new database deletes it
              request.error = { name: 'AbortError' }
              setTimeout(() => request.onerror?.())
            },
          }
          request.onupgradeneeded?.()
          return
        }
        const db = {
          close: vi.fn(),
          objectStoreNames: { contains: (store: string) => store === 'firebaseLocalStorage' },
          transaction: () => ({
            objectStore: () => ({
              getAllKeys: () => {
                const keys: any = {}
                setTimeout(() => {
                  keys.result = state.keys ?? []
                  keys.onsuccess?.()
                })
                return keys
              },
            }),
          }),
        }
        request.result = db
        request.onsuccess?.()
      })
      return request
    }),
  }
  return factory
}

function fakeStorage(keys: string[] = []): Storage {
  return {
    length: keys.length,
    key: (i: number) => keys[i] ?? null,
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  } as Storage
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('hasStoredFirebaseSession', () => {
  it('is false for a browser that never opened Firebase, and leaves no database behind', async () => {
    const idb = fakeIndexedDB({ exists: false })
    vi.stubGlobal('indexedDB', idb)
    vi.stubGlobal('localStorage', fakeStorage())
    vi.stubGlobal('sessionStorage', fakeStorage())
    const { hasStoredFirebaseSession } = await freshModule()
    await expect(hasStoredFirebaseSession()).resolves.toBe(false)
    expect(idb.created).toEqual([])
  })

  it('is false when the database exists but holds no signed-in user (Firebase opened it before)', async () => {
    vi.stubGlobal('indexedDB', fakeIndexedDB({ exists: true, keys: ['__sak'] }))
    vi.stubGlobal('localStorage', fakeStorage())
    vi.stubGlobal('sessionStorage', fakeStorage())
    const { hasStoredFirebaseSession } = await freshModule()
    await expect(hasStoredFirebaseSession()).resolves.toBe(false)
  })

  it('is true when IndexedDB holds a saved user', async () => {
    vi.stubGlobal(
      'indexedDB',
      fakeIndexedDB({ exists: true, keys: ['firebase:authUser:KEY:[DEFAULT]'] })
    )
    vi.stubGlobal('localStorage', fakeStorage())
    vi.stubGlobal('sessionStorage', fakeStorage())
    const { hasStoredFirebaseSession } = await freshModule()
    await expect(hasStoredFirebaseSession()).resolves.toBe(true)
  })

  it('is true when the user was persisted to web storage instead (IndexedDB unavailable)', async () => {
    const idb = fakeIndexedDB({ exists: false })
    vi.stubGlobal('indexedDB', idb)
    vi.stubGlobal('localStorage', fakeStorage(['cu_theme', 'firebase:authUser:KEY:[DEFAULT]']))
    vi.stubGlobal('sessionStorage', fakeStorage())
    const { hasStoredFirebaseSession } = await freshModule()
    await expect(hasStoredFirebaseSession()).resolves.toBe(true)
    expect(idb.open).not.toHaveBeenCalled()
  })

  it('errs towards loading Firebase when the store cannot be read in time or at all', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    vi.stubGlobal('sessionStorage', fakeStorage())
    vi.stubGlobal('indexedDB', fakeIndexedDB({ exists: true, hang: true }))
    let mod = await freshModule()
    await expect(mod.hasStoredFirebaseSession(20)).resolves.toBe(true)
    vi.stubGlobal('indexedDB', fakeIndexedDB({ exists: true, openThrows: true }))
    mod = await freshModule()
    await expect(mod.hasStoredFirebaseSession()).resolves.toBe(true)
  })
})

describe('loadFirebaseAuth', () => {
  it('loads the SDK once and runs the registered starter once, before resolving', async () => {
    const mod = await freshModule()
    const order: string[] = []
    mod.setFirebaseStarter(api => {
      order.push(`start:${(api as any).marker}`)
    })
    expect(mod.loadedFirebaseAuth()).toBeNull()
    const [a, b] = await Promise.all([mod.loadFirebaseAuth(), mod.loadFirebaseAuth()])
    order.push('resolved')
    expect(a).toBe(b)
    expect(order).toEqual(['start:firebase-auth-api', 'resolved'])
    expect(mod.loadedFirebaseAuth()).toBe(a)
  })

  it('stays retryable when the starter fails', async () => {
    const mod = await freshModule()
    let attempts = 0
    mod.setFirebaseStarter(() => {
      attempts++
      if (attempts === 1) throw new Error('chunk failed')
    })
    await expect(mod.loadFirebaseAuth()).rejects.toThrow('chunk failed')
    expect(mod.loadedFirebaseAuth()).toBeNull()
    await expect(mod.loadFirebaseAuth()).resolves.toBeTruthy()
    expect(attempts).toBe(2)
  })
})

describe('isAuthHandoffUrl', () => {
  it('recognises the email link and the Discord hand-off, and nothing else', async () => {
    const { isAuthHandoffUrl } = await freshModule()
    expect(
      isAuthHandoffUrl('https://cambio-uruguay.com/cuenta?magic=1&mode=signIn&oobCode=abc&apiKey=k')
    ).toBe(true)
    expect(isAuthHandoffUrl('https://cambio-uruguay.com/cuenta?link=https%3A%2F%2Fx')).toBe(true)
    expect(isAuthHandoffUrl('https://cambio-uruguay.com/cuenta?ct=token')).toBe(true)
    expect(isAuthHandoffUrl('https://cambio-uruguay.com/autos-usados-uruguay?marca=fiat')).toBe(
      false
    )
    expect(isAuthHandoffUrl('not a url')).toBe(false)
  })
})
