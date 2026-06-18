# Firebase Auth + Logged-In Value (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Firebase authentication (Google + email/password + magic link) to the cambio-uruguay Nuxt app and ship two value features for logged-in users: a favorites/watchlist and saved tool results that show rate drift since the day they were saved.

**Architecture:** Firebase Web SDK on the client issues an ID token; the Nitro server verifies it with Firebase Admin (`requireUser`) and scopes all MongoDB (Mongoose) reads/writes to the verified uid. UI uses Vuetify + Pinia + i18n following existing patterns. Drift is computed on the client by comparing a stored rate snapshot to today's live best rate from the existing `useExchangeRates` composable, so the server stays pure CRUD.

**Tech Stack:** Nuxt 3 / Nitro, Vue 3, Vuetify 3, Pinia, `@nuxtjs/i18n`, `firebase` ^11 (Web SDK), `firebase-admin` ^10, `mongoose` ^8, Vitest, Playwright.

## Global Constraints

- Node/Nuxt server runtime; ESM (`"type": "module"`). Use `import`, never `require`.
- Firebase **web** config (apiKey, authDomain, projectId, appId, messagingSenderId) is public → `runtimeConfig.public.firebase`. Never put the service account here.
- Firebase **service account** JSON is secret → `runtimeConfig.firebase.serviceAccount` from env `FIREBASE_SERVICE_ACCOUNT` (base64-encoded JSON). `MONGO_URI` from env, server-only.
- Every `/api/me/*` handler MUST call `requireUser(event)` and scope all Mongo queries by the returned `uid`. Never accept a uid from the request body/query.
- i18n: add every user-facing string to all three locale files: `i18n/locales/json/es.json`, `en.json`, `pt.json`. Spanish is `defaultLocale`.
- Components are auto-imported by Nuxt (no manual import needed in templates). Composables in `composables/` and stores in `stores/` are auto-imported.
- Vuetify components referenced as `<VBtn>`, `<VDialog>`, etc. (existing convention).
- Tests run with `npm run test` (Vitest, `vitest.config.ts`). E2E with `npm run test:e2e`.
- Currency codes are `'USD' | 'EUR' | 'BRL' | 'ARS'` (`CurrencyCode` from `~/utils/currencyPages`).
- All work happens under `app/`. Commit after each task with the shown message.

---

## File Structure

**Server (new):**
- `server/utils/db.ts` — Mongoose singleton connection.
- `server/utils/firebaseAdmin.ts` — Firebase Admin lazy init + `adminAuth()`.
- `server/utils/auth.ts` — `requireUser(event)`.
- `server/models/User.ts`, `server/models/Favorite.ts`, `server/models/SavedItem.ts`.
- `server/api/me/profile.get.ts`
- `server/api/me/favorites/index.get.ts`, `index.post.ts`, `[key].delete.ts`
- `server/api/me/saved/index.get.ts`, `index.post.ts`, `[id].delete.ts`

**Client (new):**
- `plugins/firebase.client.ts` — init Firebase, wire `onAuthStateChanged`.
- `stores/auth.ts` — Pinia auth store.
- `composables/useAuthFetch.ts` — authenticated `$fetch`.
- `composables/useSavedDrift.ts` — pure drift computation + live recompute.
- `components/AuthDialog.vue`, `components/AccountMenu.vue`, `components/FavoriteStar.vue`, `components/SaveResultButton.vue`.
- `middleware/auth.ts` — route guard.
- `pages/cuenta/index.vue` — dashboard.

**Client (modified):**
- `layouts/default.vue` — add `<AccountMenu/>` + mount `<AuthDialog/>`.
- `pages/herramientas/conversor-de-monedas.vue` — add `<SaveResultButton/>`.
- `pages/convertir/[slug].vue` — add `<SaveResultButton/>`.
- `nuxt.config.ts` — add runtimeConfig (public.firebase + server firebase/mongo) + Vitest server-dir test glob if needed.
- `i18n/locales/json/{es,en,pt}.json` — new keys.
- `.env.example` (create) — document new env vars.

**Tests (new):** colocated under `tests/unit/` and `tests/e2e/` following existing layout.

---

## Task 1: Server foundation — Mongo connection, Firebase Admin, requireUser

**Files:**
- Create: `app/server/utils/db.ts`
- Create: `app/server/utils/firebaseAdmin.ts`
- Create: `app/server/utils/auth.ts`
- Modify: `app/nuxt.config.ts` (runtimeConfig)
- Create: `app/.env.example`
- Test: `app/tests/unit/server-auth.test.ts`

**Interfaces:**
- Produces:
  - `connectDb(): Promise<typeof mongoose>` — idempotent singleton.
  - `adminAuth(): Auth` (firebase-admin Auth instance).
  - `requireUser(event: H3Event): Promise<{ uid: string; email: string | null }>` — throws `createError({statusCode:401})` on missing/invalid bearer token.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/server-auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebaseAdmin so requireUser doesn't need real credentials.
const verifyIdToken = vi.fn()
vi.mock('../../server/utils/firebaseAdmin', () => ({
  adminAuth: () => ({ verifyIdToken }),
}))

import { requireUser } from '../../server/utils/auth'

function fakeEvent(authHeader?: string) {
  return {
    node: { req: { headers: authHeader ? { authorization: authHeader } : {} } },
  } as any
}

describe('requireUser', () => {
  beforeEach(() => verifyIdToken.mockReset())

  it('rejects when no Authorization header', async () => {
    await expect(requireUser(fakeEvent())).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects a malformed header', async () => {
    await expect(requireUser(fakeEvent('Token abc'))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects when verifyIdToken throws', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('bad token'))
    await expect(requireUser(fakeEvent('Bearer xyz'))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns uid + email on a valid token', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.com' })
    await expect(requireUser(fakeEvent('Bearer good'))).resolves.toEqual({
      uid: 'u1',
      email: 'a@b.com',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/server-auth.test.ts`
Expected: FAIL — cannot resolve `../../server/utils/auth`.

- [ ] **Step 3: Implement firebaseAdmin + auth utils + db**

`app/server/utils/firebaseAdmin.ts`:

```ts
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'

let app: App | null = null

function init(): App {
  if (app) return app
  if (getApps().length) {
    app = getApps()[0]!
    return app
  }
  const raw = useRuntimeConfig().firebase?.serviceAccount
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured')
  const json = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
  app = initializeApp({ credential: cert(json) })
  return app
}

export function adminAuth(): Auth {
  return getAuth(init())
}
```

`app/server/utils/auth.ts`:

```ts
import type { H3Event } from 'h3'
import { adminAuth } from './firebaseAdmin'

export interface AuthedUser {
  uid: string
  email: string | null
}

export async function requireUser(event: H3Event): Promise<AuthedUser> {
  const header = event.node.req.headers['authorization']
  if (!header || !header.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Missing bearer token' })
  }
  const token = header.slice('Bearer '.length).trim()
  try {
    const decoded = await adminAuth().verifyIdToken(token)
    return { uid: decoded.uid, email: decoded.email ?? null }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }
}
```

`app/server/utils/db.ts`:

```ts
import mongoose from 'mongoose'

let promise: Promise<typeof mongoose> | null = null

export function connectDb(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose)
  if (!promise) {
    const uri = useRuntimeConfig().mongoUri
    if (!uri) throw new Error('MONGO_URI is not configured')
    promise = mongoose.connect(uri, { maxPoolSize: 5 }).then(m => {
      return m
    })
    promise.catch(() => {
      promise = null // allow retry on next call after a failed connect
    })
  }
  return promise
}
```

Note: `createError` and `useRuntimeConfig` are Nitro auto-imports (available in `server/`). The Vitest unit test mocks `firebaseAdmin`, so `useRuntimeConfig` is not exercised there.

- [ ] **Step 4: Add runtimeConfig + env docs**

In `app/nuxt.config.ts`, inside `runtimeConfig` (after the `ai` block, before `public`), add:

```ts
    // User data store + Firebase Admin (server-only secrets)
    mongoUri: process.env.MONGO_URI || '',
    firebase: {
      // base64-encoded service account JSON
      serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || '',
    },
```

Inside `runtimeConfig.public`, add:

```ts
      // Firebase Web SDK config (public by design)
      firebase: {
        apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || '',
        messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      },
```

Create `app/.env.example`:

```bash
# --- Firebase Web SDK (public) ---
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NUXT_PUBLIC_FIREBASE_APP_ID=
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=

# --- Server secrets ---
# base64 of the service account JSON: `base64 -w0 service-account.json`
FIREBASE_SERVICE_ACCOUNT=
MONGO_URI=mongodb://localhost:27017/cambio-uruguay
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- tests/unit/server-auth.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add app/server/utils/db.ts app/server/utils/firebaseAdmin.ts app/server/utils/auth.ts app/nuxt.config.ts app/.env.example app/tests/unit/server-auth.test.ts
git commit -m "feat(auth): server foundation — mongo, firebase admin, requireUser"
```

---

## Task 2: Mongoose models

**Files:**
- Create: `app/server/models/User.ts`
- Create: `app/server/models/Favorite.ts`
- Create: `app/server/models/SavedItem.ts`
- Test: `app/tests/unit/server-models.test.ts`

**Interfaces:**
- Consumes: `connectDb` (not required at definition time; models register on import).
- Produces:
  - `UserModel`, `FavoriteModel`, `SavedItemModel` (mongoose models).
  - Types: `Favorite` `{ uid, type: 'casa'|'currency'|'pair', key, label }`.
  - `SavedRateRef = { label: string; currency: CurrencyCode; rateKind: 'bestBuy'|'bestSell'; value: number }`.
  - `SavedItem` `{ uid, kind: 'conversion'|'tool', toolSlug, title, inputs, result, snapshot: { capturedAt: Date; rates: SavedRateRef[] } }`.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/server-models.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { FavoriteModel } from '../../server/models/Favorite'
import { SavedItemModel } from '../../server/models/SavedItem'

describe('models', () => {
  it('Favorite requires uid, type, key', () => {
    const doc = new FavoriteModel({})
    const err = doc.validateSync()
    expect(err?.errors.uid).toBeTruthy()
    expect(err?.errors.type).toBeTruthy()
    expect(err?.errors.key).toBeTruthy()
  })

  it('Favorite rejects an unknown type', () => {
    const doc = new FavoriteModel({ uid: 'u', type: 'nope', key: 'k' })
    expect(doc.validateSync()?.errors.type).toBeTruthy()
  })

  it('SavedItem requires uid, kind, toolSlug, title', () => {
    const doc = new SavedItemModel({})
    const err = doc.validateSync()
    expect(err?.errors.uid).toBeTruthy()
    expect(err?.errors.kind).toBeTruthy()
    expect(err?.errors.toolSlug).toBeTruthy()
    expect(err?.errors.title).toBeTruthy()
  })

  it('SavedItem accepts a valid snapshot with rate refs', () => {
    const doc = new SavedItemModel({
      uid: 'u',
      kind: 'conversion',
      toolSlug: 'conversor-de-monedas',
      title: '100 USD',
      inputs: { amount: 100, code: 'USD' },
      result: { buyResult: 4130 },
      snapshot: {
        capturedAt: new Date(),
        rates: [{ label: 'sell', currency: 'USD', rateKind: 'bestBuy', value: 41.3 }],
      },
    })
    expect(doc.validateSync()).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/server-models.test.ts`
Expected: FAIL — cannot resolve model modules.

- [ ] **Step 3: Implement the models**

`app/server/models/User.ts`:

```ts
import mongoose, { Schema } from 'mongoose'

const UserSchema = new Schema(
  {
    _id: { type: String }, // firebase uid
    email: { type: String, default: null },
    name: { type: String, default: null },
    photo: { type: String, default: null },
    settings: {
      locale: { type: String, default: 'es' },
      defaultDirection: { type: String, default: null },
    },
  },
  { timestamps: true, _id: false }
)

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema)
```

`app/server/models/Favorite.ts`:

```ts
import mongoose, { Schema } from 'mongoose'

const FavoriteSchema = new Schema(
  {
    uid: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['casa', 'currency', 'pair'] },
    key: { type: String, required: true },
    label: { type: String, default: '' },
  },
  { timestamps: true }
)

FavoriteSchema.index({ uid: 1, type: 1, key: 1 }, { unique: true })

export const FavoriteModel = mongoose.models.Favorite || mongoose.model('Favorite', FavoriteSchema)
```

`app/server/models/SavedItem.ts`:

```ts
import mongoose, { Schema } from 'mongoose'

const RateRefSchema = new Schema(
  {
    label: { type: String, required: true },
    currency: { type: String, required: true, enum: ['USD', 'EUR', 'BRL', 'ARS'] },
    rateKind: { type: String, required: true, enum: ['bestBuy', 'bestSell'] },
    value: { type: Number, required: true },
  },
  { _id: false }
)

const SavedItemSchema = new Schema(
  {
    uid: { type: String, required: true, index: true },
    kind: { type: String, required: true, enum: ['conversion', 'tool'] },
    toolSlug: { type: String, required: true },
    title: { type: String, required: true },
    inputs: { type: Schema.Types.Mixed, default: {} },
    result: { type: Schema.Types.Mixed, default: {} },
    snapshot: {
      capturedAt: { type: Date, default: Date.now },
      rates: { type: [RateRefSchema], default: [] },
    },
  },
  { timestamps: true }
)

export const SavedItemModel =
  mongoose.models.SavedItem || mongoose.model('SavedItem', SavedItemSchema)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/server-models.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/server/models app/tests/unit/server-models.test.ts
git commit -m "feat(auth): mongoose models — User, Favorite, SavedItem"
```

---

## Task 3: Profile API (upsert User on first call)

**Files:**
- Create: `app/server/api/me/profile.get.ts`
- Test: `app/tests/unit/api-profile.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `connectDb`, `UserModel`.
- Produces: `GET /api/me/profile` → `{ uid, email, name, settings }` (upserts the user doc).

- [ ] **Step 1: Write the failing test**

`app/tests/unit/api-profile.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireUser = vi.fn()
const findByIdAndUpdate = vi.fn()
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/User', () => ({ UserModel: { findByIdAndUpdate } }))

const handler = (await import('../../server/api/me/profile.get')).default

describe('GET /api/me/profile', () => {
  beforeEach(() => {
    requireUser.mockReset()
    findByIdAndUpdate.mockReset()
  })

  it('upserts and returns the user for a valid token', async () => {
    requireUser.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.com' })
    findByIdAndUpdate.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@b.com',
      name: null,
      settings: { locale: 'es' },
    })
    const res = await handler({} as any)
    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ $setOnInsert: expect.any(Object) }),
      expect.objectContaining({ upsert: true, new: true })
    )
    expect(res).toMatchObject({ uid: 'u1', email: 'a@b.com' })
  })

  it('propagates a 401 from requireUser', async () => {
    requireUser.mockRejectedValueOnce(Object.assign(new Error('no'), { statusCode: 401 }))
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 401 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/api-profile.test.ts`
Expected: FAIL — cannot resolve handler module.

- [ ] **Step 3: Implement the handler**

`app/server/api/me/profile.get.ts`:

```ts
import { requireUser } from '../../utils/auth'
import { connectDb } from '../../utils/db'
import { UserModel } from '../../models/User'

export default defineEventHandler(async event => {
  const { uid, email } = await requireUser(event)
  await connectDb()
  const user = await UserModel.findByIdAndUpdate(
    uid,
    { $setOnInsert: { _id: uid, email }, $set: { email } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  return {
    uid: user._id,
    email: user.email,
    name: user.name,
    settings: user.settings,
  }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/api-profile.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/server/api/me/profile.get.ts app/tests/unit/api-profile.test.ts
git commit -m "feat(auth): profile endpoint upserts user on sign-in"
```

---

## Task 4: Favorites API (list / add / remove)

**Files:**
- Create: `app/server/api/me/favorites/index.get.ts`
- Create: `app/server/api/me/favorites/index.post.ts`
- Create: `app/server/api/me/favorites/[key].delete.ts`
- Test: `app/tests/unit/api-favorites.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `connectDb`, `FavoriteModel`.
- Produces:
  - `GET /api/me/favorites` → `Favorite[]` (uid-scoped).
  - `POST /api/me/favorites` body `{ type, key, label? }` → created/existing favorite (idempotent via unique index).
  - `DELETE /api/me/favorites/:key?type=` → `{ ok: true }`.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/api-favorites.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireUser = vi.fn()
const find = vi.fn()
const updateOne = vi.fn()
const findOne = vi.fn()
const deleteOne = vi.fn()
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/Favorite', () => ({
  FavoriteModel: { find, updateOne, findOne, deleteOne },
}))

// h3 helpers used by handlers
vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('getRouterParam', vi.fn())
vi.stubGlobal('getQuery', vi.fn())

const listHandler = (await import('../../server/api/me/favorites/index.get')).default
const addHandler = (await import('../../server/api/me/favorites/index.post')).default
const delHandler = (await import('../../server/api/me/favorites/[key].delete')).default

beforeEach(() => {
  ;[requireUser, find, updateOne, findOne, deleteOne].forEach(m => m.mockReset())
  requireUser.mockResolvedValue({ uid: 'u1', email: null })
})

describe('favorites API', () => {
  it('lists only the caller’s favorites', async () => {
    find.mockReturnValueOnce({ lean: () => ({ exec: () => Promise.resolve([{ key: 'brou' }]) }) })
    const res = await listHandler({} as any)
    expect(find).toHaveBeenCalledWith({ uid: 'u1' })
    expect(res).toEqual([{ key: 'brou' }])
  })

  it('add is idempotent (upsert by uid+type+key)', async () => {
    ;(globalThis as any).readBody.mockResolvedValueOnce({ type: 'casa', key: 'brou', label: 'BROU' })
    updateOne.mockResolvedValueOnce({})
    findOne.mockReturnValueOnce({ lean: () => ({ exec: () => Promise.resolve({ key: 'brou' }) }) })
    const res = await addHandler({} as any)
    expect(updateOne).toHaveBeenCalledWith(
      { uid: 'u1', type: 'casa', key: 'brou' },
      { $set: { label: 'BROU' } },
      { upsert: true }
    )
    expect(res).toEqual({ key: 'brou' })
  })

  it('rejects add with an invalid type', async () => {
    ;(globalThis as any).readBody.mockResolvedValueOnce({ type: 'bogus', key: 'x' })
    await expect(addHandler({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('delete removes only within the caller’s scope', async () => {
    ;(globalThis as any).getRouterParam.mockReturnValueOnce('brou')
    ;(globalThis as any).getQuery.mockReturnValueOnce({ type: 'casa' })
    deleteOne.mockResolvedValueOnce({ deletedCount: 1 })
    const res = await delHandler({} as any)
    expect(deleteOne).toHaveBeenCalledWith({ uid: 'u1', type: 'casa', key: 'brou' })
    expect(res).toEqual({ ok: true })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/api-favorites.test.ts`
Expected: FAIL — handlers not found.

- [ ] **Step 3: Implement the handlers**

`app/server/api/me/favorites/index.get.ts`:

```ts
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { FavoriteModel } from '../../../models/Favorite'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  await connectDb()
  return FavoriteModel.find({ uid }).lean().exec()
})
```

`app/server/api/me/favorites/index.post.ts`:

```ts
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { FavoriteModel } from '../../../models/Favorite'

const TYPES = ['casa', 'currency', 'pair']

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const body = await readBody(event)
  const type = String(body?.type ?? '')
  const key = String(body?.key ?? '').trim()
  if (!TYPES.includes(type) || !key) {
    throw createError({ statusCode: 400, statusMessage: 'type and key are required' })
  }
  await connectDb()
  await FavoriteModel.updateOne(
    { uid, type, key },
    { $set: { label: String(body?.label ?? '') } },
    { upsert: true }
  )
  return FavoriteModel.findOne({ uid, type, key }).lean().exec()
})
```

`app/server/api/me/favorites/[key].delete.ts`:

```ts
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { FavoriteModel } from '../../../models/Favorite'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const key = getRouterParam(event, 'key')
  const { type } = getQuery(event)
  if (!key || !type) {
    throw createError({ statusCode: 400, statusMessage: 'type and key are required' })
  }
  await connectDb()
  await FavoriteModel.deleteOne({ uid, type: String(type), key: String(key) })
  return { ok: true }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/api-favorites.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/server/api/me/favorites app/tests/unit/api-favorites.test.ts
git commit -m "feat(auth): favorites API — uid-scoped list/add/remove"
```

---

## Task 5: Saved-items API (list / add / remove)

**Files:**
- Create: `app/server/api/me/saved/index.get.ts`
- Create: `app/server/api/me/saved/index.post.ts`
- Create: `app/server/api/me/saved/[id].delete.ts`
- Test: `app/tests/unit/api-saved.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `connectDb`, `SavedItemModel`.
- Produces:
  - `GET /api/me/saved` → `SavedItem[]` newest first.
  - `POST /api/me/saved` body `{ kind, toolSlug, title, inputs, result, snapshot }` → created doc.
  - `DELETE /api/me/saved/:id` → `{ ok: true }` (uid-scoped).

- [ ] **Step 1: Write the failing test**

`app/tests/unit/api-saved.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireUser = vi.fn()
const find = vi.fn()
const create = vi.fn()
const deleteOne = vi.fn()
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/SavedItem', () => ({ SavedItemModel: { find, create, deleteOne } }))
vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('getRouterParam', vi.fn())

const listHandler = (await import('../../server/api/me/saved/index.get')).default
const addHandler = (await import('../../server/api/me/saved/index.post')).default
const delHandler = (await import('../../server/api/me/saved/[id].delete')).default

beforeEach(() => {
  ;[requireUser, find, create, deleteOne].forEach(m => m.mockReset())
  requireUser.mockResolvedValue({ uid: 'u1', email: null })
})

describe('saved API', () => {
  it('lists caller items newest first', async () => {
    const exec = () => Promise.resolve([{ title: 'x' }])
    find.mockReturnValueOnce({ sort: () => ({ lean: () => ({ exec }) }) })
    const res = await listHandler({} as any)
    expect(find).toHaveBeenCalledWith({ uid: 'u1' })
    expect(res).toEqual([{ title: 'x' }])
  })

  it('rejects add without required fields', async () => {
    ;(globalThis as any).readBody.mockResolvedValueOnce({ kind: 'conversion' })
    await expect(addHandler({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('creates a saved item bound to the caller uid', async () => {
    ;(globalThis as any).readBody.mockResolvedValueOnce({
      kind: 'conversion',
      toolSlug: 'conversor-de-monedas',
      title: '100 USD',
      inputs: {},
      result: {},
      snapshot: { capturedAt: new Date().toISOString(), rates: [] },
    })
    create.mockResolvedValueOnce({ _id: 's1', title: '100 USD' })
    const res = await addHandler({} as any)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ uid: 'u1', title: '100 USD' }))
    expect(res).toMatchObject({ _id: 's1' })
  })

  it('delete is uid-scoped', async () => {
    ;(globalThis as any).getRouterParam.mockReturnValueOnce('s1')
    deleteOne.mockResolvedValueOnce({ deletedCount: 1 })
    const res = await delHandler({} as any)
    expect(deleteOne).toHaveBeenCalledWith({ _id: 's1', uid: 'u1' })
    expect(res).toEqual({ ok: true })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/api-saved.test.ts`
Expected: FAIL — handlers not found.

- [ ] **Step 3: Implement the handlers**

`app/server/api/me/saved/index.get.ts`:

```ts
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { SavedItemModel } from '../../../models/SavedItem'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  await connectDb()
  return SavedItemModel.find({ uid }).sort({ createdAt: -1 }).lean().exec()
})
```

`app/server/api/me/saved/index.post.ts`:

```ts
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { SavedItemModel } from '../../../models/SavedItem'

const KINDS = ['conversion', 'tool']

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const body = await readBody(event)
  const kind = String(body?.kind ?? '')
  const toolSlug = String(body?.toolSlug ?? '').trim()
  const title = String(body?.title ?? '').trim()
  if (!KINDS.includes(kind) || !toolSlug || !title) {
    throw createError({ statusCode: 400, statusMessage: 'kind, toolSlug and title are required' })
  }
  await connectDb()
  return SavedItemModel.create({
    uid,
    kind,
    toolSlug,
    title,
    inputs: body?.inputs ?? {},
    result: body?.result ?? {},
    snapshot: body?.snapshot ?? { capturedAt: new Date(), rates: [] },
  })
})
```

`app/server/api/me/saved/[id].delete.ts`:

```ts
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { SavedItemModel } from '../../../models/SavedItem'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })
  await connectDb()
  await SavedItemModel.deleteOne({ _id: id, uid })
  return { ok: true }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/api-saved.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/server/api/me/saved app/tests/unit/api-saved.test.ts
git commit -m "feat(auth): saved-items API — uid-scoped list/add/remove"
```

---

## Task 6: Firebase client plugin + auth store

**Files:**
- Create: `app/plugins/firebase.client.ts`
- Create: `app/stores/auth.ts`
- Test: `app/tests/unit/auth-store.test.ts`

**Interfaces:**
- Consumes: `runtimeConfig.public.firebase`.
- Produces: Pinia store `useAuthStore` with:
  - state: `user: { uid, email, name, photo, emailVerified } | null`, `ready: boolean`, `dialogOpen: boolean`, `error: string | null`.
  - getters: `isLoggedIn`.
  - actions: `setUser(fbUser)`, `getToken(): Promise<string|null>`, `signInWithGoogle()`, `signInWithEmail(email,pw)`, `register(email,pw)`, `sendMagicLink(email)`, `completeMagicLink()`, `resetPassword(email)`, `logout()`, `openDialog()`, `closeDialog()`.
- The plugin exposes the live `firebase/auth` `Auth` instance via `nuxtApp.$firebaseAuth` and calls `onAuthStateChanged`.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/auth-store.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock the auth-helpers module the store delegates to.
const signInWithPopup = vi.fn()
const signInWithEmailAndPassword = vi.fn()
const createUserWithEmailAndPassword = vi.fn()
const sendSignInLinkToEmail = vi.fn()
const sendPasswordResetEmail = vi.fn()
const signOut = vi.fn()
const sendEmailVerification = vi.fn()

vi.mock('../../stores/firebaseAuthApi', () => ({
  fbAuth: () => ({ currentUser: null }),
  signInWithPopup,
  GoogleAuthProvider: class {},
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  sendPasswordResetEmail,
  signOut,
  sendEmailVerification,
}))

import { useAuthStore } from '../../stores/auth'

beforeEach(() => {
  setActivePinia(createPinia())
  ;[
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendSignInLinkToEmail,
    sendPasswordResetEmail,
    signOut,
  ].forEach(m => m.mockReset())
})

describe('auth store', () => {
  it('starts logged out', () => {
    const s = useAuthStore()
    expect(s.isLoggedIn).toBe(false)
  })

  it('setUser maps a firebase user', () => {
    const s = useAuthStore()
    s.setUser({ uid: 'u1', email: 'a@b.com', displayName: 'A', photoURL: 'p', emailVerified: true })
    expect(s.isLoggedIn).toBe(true)
    expect(s.user).toMatchObject({ uid: 'u1', email: 'a@b.com', name: 'A', emailVerified: true })
  })

  it('signInWithEmail records an error message on failure', async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'auth/wrong-password' })
    )
    const s = useAuthStore()
    await s.signInWithEmail('a@b.com', 'bad')
    expect(s.error).toBe('auth/wrong-password')
  })

  it('logout clears the user', async () => {
    signOut.mockResolvedValueOnce(undefined)
    const s = useAuthStore()
    s.setUser({ uid: 'u1', email: null, displayName: null, photoURL: null, emailVerified: false })
    await s.logout()
    expect(s.user).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/auth-store.test.ts`
Expected: FAIL — `../../stores/auth` and `../../stores/firebaseAuthApi` not found.

- [ ] **Step 3: Implement a thin firebase/auth re-export, the store, and the plugin**

`app/stores/firebaseAuthApi.ts` (isolates the SDK so the store is unit-testable):

```ts
// Thin re-export layer over firebase/auth so the store can be mocked in tests
// and the rest of the app imports auth primitives from one place.
import { getAuth, type Auth } from 'firebase/auth'

export {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'

export function fbAuth(): Auth {
  return getAuth()
}
```

`app/stores/auth.ts`:

```ts
import { defineStore } from 'pinia'
import {
  fbAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from './firebaseAuthApi'

interface AuthUser {
  uid: string
  email: string | null
  name: string | null
  photo: string | null
  emailVerified: boolean
}

const MAGIC_LINK_EMAIL_KEY = 'cu_magic_email'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    ready: false,
    dialogOpen: false,
    error: null as string | null,
    notice: null as string | null,
  }),

  getters: {
    isLoggedIn: state => !!state.user,
  },

  actions: {
    setUser(fb: any | null) {
      this.ready = true
      this.user = fb
        ? {
            uid: fb.uid,
            email: fb.email ?? null,
            name: fb.displayName ?? null,
            photo: fb.photoURL ?? null,
            emailVerified: !!fb.emailVerified,
          }
        : null
    },

    async getToken(): Promise<string | null> {
      const current = fbAuth().currentUser
      return current ? current.getIdToken() : null
    },

    openDialog() {
      this.error = null
      this.notice = null
      this.dialogOpen = true
    },
    closeDialog() {
      this.dialogOpen = false
    },

    async signInWithGoogle() {
      this.error = null
      try {
        await signInWithPopup(fbAuth(), new GoogleAuthProvider())
        this.closeDialog()
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async signInWithEmail(email: string, password: string) {
      this.error = null
      try {
        await signInWithEmailAndPassword(fbAuth(), email, password)
        this.closeDialog()
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async register(email: string, password: string) {
      this.error = null
      try {
        const cred = await createUserWithEmailAndPassword(fbAuth(), email, password)
        await sendEmailVerification(cred.user)
        this.notice = 'auth.verifySent'
        this.closeDialog()
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async sendMagicLink(email: string) {
      this.error = null
      try {
        const url = `${window.location.origin}/cuenta?magic=1`
        await sendSignInLinkToEmail(fbAuth(), email, { url, handleCodeInApp: true })
        window.localStorage.setItem(MAGIC_LINK_EMAIL_KEY, email)
        this.notice = 'auth.magicSent'
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async resetPassword(email: string) {
      this.error = null
      try {
        await sendPasswordResetEmail(fbAuth(), email)
        this.notice = 'auth.resetSent'
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async logout() {
      await signOut(fbAuth())
      this.user = null
    },
  },
})
```

`app/plugins/firebase.client.ts`:

```ts
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(() => {
  const cfg = useRuntimeConfig().public.firebase
  if (!cfg?.apiKey) return // not configured -> auth simply stays disabled

  if (!getApps().length) {
    initializeApp({
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
      appId: cfg.appId,
      messagingSenderId: cfg.messagingSenderId,
    })
  }

  const auth = getAuth()
  const store = useAuthStore()
  onAuthStateChanged(auth, fbUser => store.setUser(fbUser))

  return { provide: { firebaseAuth: auth } }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/auth-store.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/plugins/firebase.client.ts app/stores/auth.ts app/stores/firebaseAuthApi.ts app/tests/unit/auth-store.test.ts
git commit -m "feat(auth): firebase client plugin + pinia auth store"
```

---

## Task 7: useAuthFetch composable + useSavedDrift composable

**Files:**
- Create: `app/composables/useAuthFetch.ts`
- Create: `app/composables/useSavedDrift.ts`
- Test: `app/tests/unit/saved-drift.test.ts`

**Interfaces:**
- Consumes: `useAuthStore` (getToken), `useExchangeRates` (bestBuy/bestSell), `SavedRateRef` shape.
- Produces:
  - `useAuthFetch()` → `authFetch<T>(url, opts?)` that adds `Authorization: Bearer <token>`.
  - `computeDrift(rate: SavedRateRef, current: number | null)` → `{ value: number|null; pct: number|null }` (pure).
  - `useSavedDrift()` → `driftForItem(item)` mapping each snapshot rate to current best rate + pct.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/saved-drift.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeDrift } from '../../composables/useSavedDrift'

describe('computeDrift', () => {
  it('returns null pct when current is null', () => {
    expect(computeDrift({ value: 40 } as any, null)).toEqual({ value: null, pct: null })
  })

  it('returns null pct when snapshot value is zero', () => {
    expect(computeDrift({ value: 0 } as any, 41)).toEqual({ value: 41, pct: null })
  })

  it('computes a positive percentage drift', () => {
    const r = computeDrift({ value: 40 } as any, 42)
    expect(r.value).toBe(42)
    expect(r.pct).toBeCloseTo(5, 5)
  })

  it('computes a negative percentage drift', () => {
    const r = computeDrift({ value: 40 } as any, 38)
    expect(r.pct).toBeCloseTo(-5, 5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/saved-drift.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the composables**

`app/composables/useSavedDrift.ts`:

```ts
import type { CurrencyCode } from '~/utils/currencyPages'

export interface SavedRateRef {
  label: string
  currency: CurrencyCode
  rateKind: 'bestBuy' | 'bestSell'
  value: number
}

export interface DriftResult {
  value: number | null // current rate
  pct: number | null // percentage change vs snapshot
}

/** Pure: percentage drift of `current` vs the snapshot `rate.value`. */
export function computeDrift(rate: SavedRateRef, current: number | null): DriftResult {
  if (current == null) return { value: null, pct: null }
  if (!rate.value) return { value: current, pct: null }
  return { value: current, pct: ((current - rate.value) / rate.value) * 100 }
}

/** Live drift using today's best rates from useExchangeRates. */
export function useSavedDrift() {
  const { bestBuy, bestSell } = useExchangeRates()
  const currentRate = (rate: SavedRateRef): number | null =>
    rate.rateKind === 'bestBuy' ? bestBuy(rate.currency) : bestSell(rate.currency)

  const driftForItem = (rates: SavedRateRef[]) =>
    rates.map(rate => ({ rate, ...computeDrift(rate, currentRate(rate)) }))

  return { driftForItem, currentRate }
}
```

`app/composables/useAuthFetch.ts`:

```ts
/** $fetch wrapper that attaches the Firebase ID token as a bearer credential. */
export function useAuthFetch() {
  const store = useAuthStore()

  async function authFetch<T>(url: string, opts: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    const token = await store.getToken()
    return $fetch<T>(url, {
      ...opts,
      headers: {
        ...(opts.headers as Record<string, string>),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  }

  return { authFetch }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/saved-drift.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/composables/useAuthFetch.ts app/composables/useSavedDrift.ts app/tests/unit/saved-drift.test.ts
git commit -m "feat(auth): authFetch + saved-drift composables"
```

---

## Task 8: i18n strings (es/en/pt)

**Files:**
- Modify: `app/i18n/locales/json/es.json`
- Modify: `app/i18n/locales/json/en.json`
- Modify: `app/i18n/locales/json/pt.json`

**Interfaces:**
- Produces: `auth.*` and `account.*` i18n keys used by Tasks 9–13. Nuxt i18n JSON is a flat object; nested objects are accessed as `auth.login` etc.

- [ ] **Step 1: Add the keys to `es.json`**

Insert this block before the final closing `}` of `app/i18n/locales/json/es.json` (add a comma after the previous last entry):

```json
  "auth": {
    "login": "Iniciar sesión",
    "logout": "Cerrar sesión",
    "account": "Mi cuenta",
    "favorites": "Favoritos",
    "saved": "Guardados",
    "email": "Correo electrónico",
    "password": "Contraseña",
    "continueGoogle": "Continuar con Google",
    "signIn": "Entrar",
    "register": "Crear cuenta",
    "magicLink": "Enlace mágico",
    "sendMagicLink": "Enviarme un enlace",
    "forgotPassword": "¿Olvidaste tu contraseña?",
    "resetSent": "Te enviamos un correo para restablecer la contraseña.",
    "magicSent": "Te enviamos un enlace de acceso. Revisá tu correo.",
    "verifySent": "Cuenta creada. Verificá tu correo para completar el registro.",
    "tabPassword": "Correo y contraseña",
    "tabMagic": "Enlace por correo",
    "error": "No se pudo completar. Verificá los datos e intentá de nuevo."
  },
  "account": {
    "title": "Mi cuenta",
    "favoritesEmpty": "Todavía no marcaste casas o monedas como favoritas.",
    "savedEmpty": "Todavía no guardaste ningún resultado.",
    "savedAt": "Guardado el",
    "then": "Entonces",
    "now": "Ahora",
    "drift": "Variación",
    "save": "Guardar resultado",
    "saved": "Guardado",
    "remove": "Quitar",
    "rateUnavailable": "Cotización no disponible"
  }
```

- [ ] **Step 2: Add the same keys to `en.json`**

```json
  "auth": {
    "login": "Log in",
    "logout": "Log out",
    "account": "My account",
    "favorites": "Favorites",
    "saved": "Saved",
    "email": "Email",
    "password": "Password",
    "continueGoogle": "Continue with Google",
    "signIn": "Sign in",
    "register": "Create account",
    "magicLink": "Magic link",
    "sendMagicLink": "Send me a link",
    "forgotPassword": "Forgot your password?",
    "resetSent": "We sent you a password reset email.",
    "magicSent": "We sent you a sign-in link. Check your email.",
    "verifySent": "Account created. Verify your email to finish signing up.",
    "tabPassword": "Email & password",
    "tabMagic": "Email link",
    "error": "Could not complete. Check your details and try again."
  },
  "account": {
    "title": "My account",
    "favoritesEmpty": "You haven't marked any exchange houses or currencies as favorites yet.",
    "savedEmpty": "You haven't saved any results yet.",
    "savedAt": "Saved on",
    "then": "Then",
    "now": "Now",
    "drift": "Change",
    "save": "Save result",
    "saved": "Saved",
    "remove": "Remove",
    "rateUnavailable": "Rate unavailable"
  }
```

- [ ] **Step 3: Add the same keys to `pt.json`**

```json
  "auth": {
    "login": "Entrar",
    "logout": "Sair",
    "account": "Minha conta",
    "favorites": "Favoritos",
    "saved": "Salvos",
    "email": "E-mail",
    "password": "Senha",
    "continueGoogle": "Continuar com Google",
    "signIn": "Entrar",
    "register": "Criar conta",
    "magicLink": "Link mágico",
    "sendMagicLink": "Enviar um link",
    "forgotPassword": "Esqueceu a senha?",
    "resetSent": "Enviamos um e-mail para redefinir a senha.",
    "magicSent": "Enviamos um link de acesso. Verifique seu e-mail.",
    "verifySent": "Conta criada. Verifique seu e-mail para concluir o cadastro.",
    "tabPassword": "E-mail e senha",
    "tabMagic": "Link por e-mail",
    "error": "Não foi possível concluir. Verifique os dados e tente novamente."
  },
  "account": {
    "title": "Minha conta",
    "favoritesEmpty": "Você ainda não marcou casas de câmbio ou moedas como favoritas.",
    "savedEmpty": "Você ainda não salvou nenhum resultado.",
    "savedAt": "Salvo em",
    "then": "Antes",
    "now": "Agora",
    "drift": "Variação",
    "save": "Salvar resultado",
    "saved": "Salvo",
    "remove": "Remover",
    "rateUnavailable": "Cotação indisponível"
  }
```

- [ ] **Step 4: Verify JSON is valid**

Run: `node -e "['es','en','pt'].forEach(l=>require('./app/i18n/locales/json/'+l+'.json'))"`
Expected: no output, exit 0 (all three parse).

- [ ] **Step 5: Commit**

```bash
git add app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(auth): i18n strings for auth + account (es/en/pt)"
```

---

## Task 9: AuthDialog component

**Files:**
- Create: `app/components/AuthDialog.vue`
- Test: `app/tests/unit/auth-dialog.test.ts`

**Interfaces:**
- Consumes: `useAuthStore` (dialogOpen, error, notice, signInWithGoogle, signInWithEmail, register, sendMagicLink, resetPassword, closeDialog).
- Produces: A globally-mounted dialog component driven by `authStore.dialogOpen`.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/auth-dialog.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import { createTestingPinia } from '@pinia/testing'
import AuthDialog from '../../components/AuthDialog.vue'

const vuetify = createVuetify({ components })

function factory() {
  return mount(AuthDialog, {
    global: {
      plugins: [vuetify, createTestingPinia({ createSpy: vi.fn, stubActions: false })],
      mocks: { $t: (k: string) => k },
      stubs: { transition: false },
    },
  })
}

describe('AuthDialog', () => {
  it('mounts without throwing', () => {
    const wrapper = factory()
    expect(wrapper.exists()).toBe(true)
  })
})
```

Note: if `@vue/test-utils`, `@pinia/testing`, or `@testing-library` are not installed, install dev deps first:
`npm i -D @vue/test-utils @pinia/testing` then re-run. (`vitest`, `vuetify`, `pinia` already present.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/auth-dialog.test.ts`
Expected: FAIL — `../../components/AuthDialog.vue` not found.

- [ ] **Step 3: Implement the component**

`app/components/AuthDialog.vue`:

```vue
<template>
  <VDialog v-model="open" max-width="440" :persistent="false">
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>{{ $t('auth.login') }}</span>
        <VBtn icon variant="text" size="small" @click="store.closeDialog()">
          <VIcon>mdi-close</VIcon>
        </VBtn>
      </VCardTitle>

      <VCardText>
        <VBtn block color="primary" class="mb-4" prepend-icon="mdi-google" @click="store.signInWithGoogle()">
          {{ $t('auth.continueGoogle') }}
        </VBtn>

        <VTabs v-model="tab" grow class="mb-2">
          <VTab value="password">{{ $t('auth.tabPassword') }}</VTab>
          <VTab value="magic">{{ $t('auth.tabMagic') }}</VTab>
        </VTabs>

        <VWindow v-model="tab">
          <VWindowItem value="password">
            <VTextField v-model="email" :label="$t('auth.email')" type="email" variant="outlined" density="comfortable" class="mt-3" />
            <VTextField v-model="password" :label="$t('auth.password')" type="password" variant="outlined" density="comfortable" />
            <div class="d-flex ga-2">
              <VBtn color="primary" variant="flat" @click="store.signInWithEmail(email, password)">{{ $t('auth.signIn') }}</VBtn>
              <VBtn color="primary" variant="tonal" @click="store.register(email, password)">{{ $t('auth.register') }}</VBtn>
            </div>
            <VBtn variant="text" size="small" class="mt-2 px-0" @click="store.resetPassword(email)">
              {{ $t('auth.forgotPassword') }}
            </VBtn>
          </VWindowItem>

          <VWindowItem value="magic">
            <VTextField v-model="email" :label="$t('auth.email')" type="email" variant="outlined" density="comfortable" class="mt-3" />
            <VBtn color="primary" variant="flat" @click="store.sendMagicLink(email)">{{ $t('auth.sendMagicLink') }}</VBtn>
          </VWindowItem>
        </VWindow>

        <VAlert v-if="store.notice" type="success" variant="tonal" density="comfortable" class="mt-4">
          {{ $t(store.notice) }}
        </VAlert>
        <VAlert v-if="store.error" type="error" variant="tonal" density="comfortable" class="mt-4">
          {{ $t('auth.error') }} ({{ store.error }})
        </VAlert>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
const store = useAuthStore()
const tab = ref('password')
const email = ref('')
const password = ref('')

const open = computed({
  get: () => store.dialogOpen,
  set: v => (v ? store.openDialog() : store.closeDialog()),
})
</script>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/auth-dialog.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add app/components/AuthDialog.vue app/tests/unit/auth-dialog.test.ts package.json package-lock.json
git commit -m "feat(auth): AuthDialog with Google, email/password, magic link"
```

---

## Task 10: AccountMenu + wire into layout (+ magic-link completion)

**Files:**
- Create: `app/components/AccountMenu.vue`
- Modify: `app/layouts/default.vue` (add `<AccountMenu/>` next to `<LanguageMenu/>` at line ~333; mount `<AuthDialog/>` near other global overlays such as `<JoinTwitter/>` at line ~347)

**Interfaces:**
- Consumes: `useAuthStore`, `useLocalePath`.
- Produces: header entry point — login button (logged out) or avatar menu (logged in) with links to `/cuenta` and logout. Completes a magic-link sign-in if the URL is one.

- [ ] **Step 1: Implement AccountMenu**

`app/components/AccountMenu.vue`:

```vue
<template>
  <ClientOnly>
    <VBtn v-if="!store.isLoggedIn" color="primary" variant="text" class="text-capitalize" @click="store.openDialog()">
      <VIcon start>mdi-account-circle</VIcon>
      {{ $t('auth.login') }}
    </VBtn>

    <VMenu v-else location="bottom end">
      <template #activator="{ props }">
        <VBtn icon v-bind="props">
          <VAvatar size="32" color="primary">
            <VImg v-if="store.user?.photo" :src="store.user.photo" />
            <span v-else>{{ initials }}</span>
          </VAvatar>
        </VBtn>
      </template>
      <VList>
        <VListItem :to="localePath('/cuenta')">
          <template #prepend><VIcon>mdi-view-dashboard</VIcon></template>
          <VListItemTitle>{{ $t('auth.account') }}</VListItemTitle>
        </VListItem>
        <VDivider />
        <VListItem @click="store.logout()">
          <template #prepend><VIcon>mdi-logout</VIcon></template>
          <VListItemTitle>{{ $t('auth.logout') }}</VListItemTitle>
        </VListItem>
      </VList>
    </VMenu>
  </ClientOnly>
</template>

<script setup lang="ts">
import {
  fbAuth,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from '~/stores/firebaseAuthApi'

const store = useAuthStore()
const localePath = useLocalePath()

const initials = computed(() => {
  const n = store.user?.name || store.user?.email || '?'
  return n.slice(0, 1).toUpperCase()
})

// Complete a magic-link sign-in when the user lands on the emailed URL.
onMounted(async () => {
  try {
    const href = window.location.href
    if (isSignInWithEmailLink(fbAuth(), href)) {
      let email = window.localStorage.getItem('cu_magic_email')
      if (!email) email = window.prompt(store.$t ? '' : '') || ''
      if (email) {
        await signInWithEmailLink(fbAuth(), email, href)
        window.localStorage.removeItem('cu_magic_email')
      }
    }
  } catch {
    /* ignore – surfaced via normal sign-in flow */
  }
})
</script>
```

- [ ] **Step 2: Wire into layout**

In `app/layouts/default.vue`, replace the `<LanguageMenu />` line (~333):

```vue
      <VSpacer />
      <AccountMenu />
      <LanguageMenu />
```

And after `<JoinTwitter />` (~347) add the globally-mounted dialog:

```vue
    <Footer />
    <JoinTwitter />
    <ClientOnly><AuthDialog /></ClientOnly>
```

- [ ] **Step 3: Verify build/typecheck**

Run: `npm run typecheck`
Expected: no new type errors from these files. (Pre-existing unrelated warnings, if any, are acceptable — do not introduce new errors in `AccountMenu.vue` / `default.vue`.)

- [ ] **Step 4: Commit**

```bash
git add app/components/AccountMenu.vue app/layouts/default.vue
git commit -m "feat(auth): header account menu + global AuthDialog + magic-link completion"
```

---

## Task 11: FavoriteStar component + wire into the rate table

**Files:**
- Create: `app/components/FavoriteStar.vue`
- Modify: `app/components/ExchangeDataTable.vue` (add a star in the casa/origin cell — see step 2)
- Test: `app/tests/unit/favorite-star.test.ts`

**Interfaces:**
- Consumes: `useAuthStore`, `useAuthFetch`.
- Produces: `<FavoriteStar :type="'casa'" :item-key="origin" :label="name" />` — toggles a favorite; prompts login if logged out; reflects current state.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/favorite-star.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import { createTestingPinia } from '@pinia/testing'
import FavoriteStar from '../../components/FavoriteStar.vue'

const vuetify = createVuetify({ components })
const openDialog = vi.fn()

vi.mock('../../composables/useAuthFetch', () => ({
  useAuthFetch: () => ({ authFetch: vi.fn().mockResolvedValue({}) }),
}))

function factory(loggedIn = false) {
  return mount(FavoriteStar, {
    props: { type: 'casa', itemKey: 'brou', label: 'BROU' },
    global: {
      plugins: [
        vuetify,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: { auth: { user: loggedIn ? { uid: 'u1' } : null } },
        }),
      ],
      mocks: { $t: (k: string) => k },
    },
  })
}

describe('FavoriteStar', () => {
  it('renders an outline star by default', () => {
    const wrapper = factory(false)
    expect(wrapper.html()).toContain('mdi-star-outline')
  })

  it('opens the auth dialog when toggled while logged out', async () => {
    const wrapper = factory(false)
    const store: any = wrapper.vm
    // toggle is exposed; simulate click
    await wrapper.find('button').trigger('click')
    // logged-out path must not crash and must not mark active
    expect(wrapper.html()).toContain('mdi-star-outline')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/favorite-star.test.ts`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement the component**

`app/components/FavoriteStar.vue`:

```vue
<template>
  <VBtn
    icon
    variant="text"
    size="small"
    :color="active ? 'amber' : undefined"
    :aria-label="$t('account.favorites')"
    @click.stop.prevent="toggle"
  >
    <VIcon>{{ active ? 'mdi-star' : 'mdi-star-outline' }}</VIcon>
  </VBtn>
</template>

<script setup lang="ts">
const props = defineProps<{
  type: 'casa' | 'currency' | 'pair'
  itemKey: string
  label?: string
}>()

const store = useAuthStore()
const { authFetch } = useAuthFetch()
const favorites = useFavoritesState() // shared reactive set, see below

const active = computed(() => favorites.has(`${props.type}:${props.itemKey}`))

async function toggle() {
  if (!store.isLoggedIn) {
    store.openDialog()
    return
  }
  const id = `${props.type}:${props.itemKey}`
  if (active.value) {
    favorites.delete(id)
    await authFetch(`/api/me/favorites/${encodeURIComponent(props.itemKey)}?type=${props.type}`, {
      method: 'DELETE',
    }).catch(() => favorites.add(id)) // rollback on failure
  } else {
    favorites.add(id)
    await authFetch('/api/me/favorites', {
      method: 'POST',
      body: { type: props.type, key: props.itemKey, label: props.label ?? '' },
    }).catch(() => favorites.delete(id))
  }
}
</script>
```

Add a tiny shared state composable so all stars + the dashboard stay in sync. `app/composables/useFavoritesState.ts`:

```ts
// App-wide reactive set of "type:key" favorite ids, hydrated once after login.
const _set = reactive(new Set<string>())
let _hydrated = false

export function useFavoritesState() {
  return _set
}

export async function hydrateFavorites(authFetch: <T>(u: string, o?: any) => Promise<T>) {
  if (_hydrated) return
  _hydrated = true
  try {
    const list = await authFetch<Array<{ type: string; key: string }>>('/api/me/favorites')
    list.forEach(f => _set.add(`${f.type}:${f.key}`))
  } catch {
    _hydrated = false
  }
}

export function resetFavoritesState() {
  _set.clear()
  _hydrated = false
}
```

Hydrate on login: in `app/plugins/firebase.client.ts`, extend the `onAuthStateChanged` callback:

```ts
  const { authFetch } = useAuthFetch()
  onAuthStateChanged(auth, async fbUser => {
    store.setUser(fbUser)
    if (fbUser) {
      await authFetch('/api/me/profile').catch(() => {})
      await hydrateFavorites(authFetch)
    } else {
      resetFavoritesState()
    }
  })
```

Add the imports at the top of the plugin:

```ts
import { useAuthFetch } from '~/composables/useAuthFetch'
import { hydrateFavorites, resetFavoritesState } from '~/composables/useFavoritesState'
```

- [ ] **Step 4: Wire a star into the exchange table**

Open `app/components/ExchangeDataTable.vue`, find the cell that renders the casa name / `localData.name` (the origin column). Add the star next to the name, e.g.:

```vue
<FavoriteStar type="casa" :item-key="item.origin" :label="item.localData?.name || item.origin" />
```

Place it inline with the existing name markup (do not restructure the cell). If the table renders rows via a `#item.<col>` slot, add the component inside that slot; otherwise add it adjacent to the name text node.

- [ ] **Step 5: Run test + typecheck**

Run: `npm run test -- tests/unit/favorite-star.test.ts`
Expected: PASS (2 tests).
Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add app/components/FavoriteStar.vue app/composables/useFavoritesState.ts app/plugins/firebase.client.ts app/components/ExchangeDataTable.vue app/tests/unit/favorite-star.test.ts
git commit -m "feat(favorites): FavoriteStar + shared state + table integration"
```

---

## Task 12: SaveResultButton + wire into currency tools

**Files:**
- Create: `app/components/SaveResultButton.vue`
- Modify: `app/pages/herramientas/conversor-de-monedas.vue`
- Modify: `app/pages/convertir/[slug].vue`
- Test: `app/tests/unit/save-result-button.test.ts`

**Interfaces:**
- Consumes: `useAuthStore`, `useAuthFetch`, `SavedRateRef`.
- Produces: `<SaveResultButton :kind="'conversion'" tool-slug="conversor-de-monedas" :title="..." :inputs="..." :result="..." :rates="SavedRateRef[]" />`. Shows only when logged in; POSTs to `/api/me/saved`; shows a saved confirmation.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/save-result-button.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import { createTestingPinia } from '@pinia/testing'
import SaveResultButton from '../../components/SaveResultButton.vue'

const vuetify = createVuetify({ components })
const authFetch = vi.fn().mockResolvedValue({ _id: 's1' })
vi.mock('../../composables/useAuthFetch', () => ({ useAuthFetch: () => ({ authFetch }) }))

function factory(loggedIn = true) {
  return mount(SaveResultButton, {
    props: {
      kind: 'conversion',
      toolSlug: 'conversor-de-monedas',
      title: '100 USD',
      inputs: { amount: 100, code: 'USD' },
      result: { buyResult: 4130 },
      rates: [{ label: 'sell', currency: 'USD', rateKind: 'bestBuy', value: 41.3 }],
    },
    global: {
      plugins: [
        vuetify,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: { auth: { user: loggedIn ? { uid: 'u1' } : null } },
        }),
      ],
      mocks: { $t: (k: string) => k },
    },
  })
}

describe('SaveResultButton', () => {
  it('is hidden when logged out', () => {
    expect(factory(false).find('button').exists()).toBe(false)
  })

  it('posts the saved payload when clicked', async () => {
    const wrapper = factory(true)
    await wrapper.find('button').trigger('click')
    expect(authFetch).toHaveBeenCalledWith(
      '/api/me/saved',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ toolSlug: 'conversor-de-monedas', title: '100 USD' }),
      })
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/save-result-button.test.ts`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement the component**

`app/components/SaveResultButton.vue`:

```vue
<template>
  <VBtn
    v-if="store.isLoggedIn"
    :color="done ? 'success' : 'primary'"
    variant="tonal"
    size="small"
    :prepend-icon="done ? 'mdi-check' : 'mdi-content-save-outline'"
    :loading="busy"
    @click="save"
  >
    {{ done ? $t('account.saved') : $t('account.save') }}
  </VBtn>
</template>

<script setup lang="ts">
import type { SavedRateRef } from '~/composables/useSavedDrift'

const props = defineProps<{
  kind: 'conversion' | 'tool'
  toolSlug: string
  title: string
  inputs: Record<string, any>
  result: Record<string, any>
  rates: SavedRateRef[]
}>()

const store = useAuthStore()
const { authFetch } = useAuthFetch()
const busy = ref(false)
const done = ref(false)

async function save() {
  busy.value = true
  try {
    await authFetch('/api/me/saved', {
      method: 'POST',
      body: {
        kind: props.kind,
        toolSlug: props.toolSlug,
        title: props.title,
        inputs: props.inputs,
        result: props.result,
        snapshot: { capturedAt: new Date().toISOString(), rates: props.rates },
      },
    })
    done.value = true
    setTimeout(() => (done.value = false), 2500)
  } finally {
    busy.value = false
  }
}
</script>
```

- [ ] **Step 4: Wire into the currency converter**

In `app/pages/herramientas/conversor-de-monedas.vue`, inside the `<template v-else>` result block (after the `result-grid` div, before the closing `</template>`), add:

```vue
        <div class="mt-4">
          <SaveResultButton
            kind="conversion"
            tool-slug="conversor-de-monedas"
            :title="`${amount} ${code}`"
            :inputs="{ amount, code }"
            :result="{ buyResult, sellResult }"
            :rates="saveRates"
          />
        </div>
```

And in its `<script setup>` (after the `sellResult` computed), add the rate refs:

```ts
import type { SavedRateRef } from '~/composables/useSavedDrift'

const saveRates = computed<SavedRateRef[]>(() => {
  const out: SavedRateRef[] = []
  if (buyRate.value) out.push({ label: 'sell', currency: code.value, rateKind: 'bestBuy', value: buyRate.value })
  if (sellRate.value) out.push({ label: 'buy', currency: code.value, rateKind: 'bestSell', value: sellRate.value })
  return out
})
```

- [ ] **Step 5: Wire into the /convertir page**

`app/pages/convertir/[slug].vue` already exposes everything needed: `foreign` (the `ConvertCode`), `buyRate = bestBuy(foreign)`, `sellRate = bestSell(foreign)`, `title`, and `entry.value.amount` / `entry.value.from`. Mirror the converter pattern.

In the `<template>`, inside the detail `VCard` (after the closing `</VTable>` at line ~73, before the card's closing `</VCard>`), add:

```vue
            <div v-if="!pending" class="mt-4">
              <SaveResultButton
                kind="conversion"
                tool-slug="convertir"
                :title="title"
                :inputs="{ slug, amount: entry!.amount, from: entry!.from, to: entry!.to }"
                :result="{ receiveSelling, payBuying, buyForeign, sellForeign }"
                :rates="saveRates"
              />
            </div>
```

In the `<script setup>` (after the `sellForeign` computed at line ~180), add:

```ts
import type { SavedRateRef } from '~/composables/useSavedDrift'

const saveRates = computed<SavedRateRef[]>(() => {
  const out: SavedRateRef[] = []
  const cur = foreign.value as CurrencyCode
  if (buyRate.value) out.push({ label: 'compra', currency: cur, rateKind: 'bestBuy', value: buyRate.value })
  if (sellRate.value) out.push({ label: 'venta', currency: cur, rateKind: 'bestSell', value: sellRate.value })
  return out
})
```

(`CurrencyCode` is already imported in this file at line ~143; only `SavedRateRef` is new.)

- [ ] **Step 6: Run test + typecheck**

Run: `npm run test -- tests/unit/save-result-button.test.ts`
Expected: PASS (2 tests).
Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add app/components/SaveResultButton.vue app/pages/herramientas/conversor-de-monedas.vue app/pages/convertir/[slug].vue app/tests/unit/save-result-button.test.ts
git commit -m "feat(saved): SaveResultButton + currency tool integration"
```

---

## Task 13: Account dashboard page + route guard

**Files:**
- Create: `app/middleware/auth.ts`
- Create: `app/pages/cuenta/index.vue`
- Test: `app/tests/e2e/account.spec.ts`

**Interfaces:**
- Consumes: `useAuthStore`, `useAuthFetch`, `useSavedDrift`, `useFavoritesState`, `useExchangeRates`.
- Produces: protected `/cuenta` dashboard with Favoritos + Guardados sections; `auth` middleware redirects logged-out users home and opens the dialog.

- [ ] **Step 1: Implement the middleware**

`app/middleware/auth.ts`:

```ts
export default defineNuxtRouteMiddleware(to => {
  // client-only guard: auth state lives in the browser
  if (import.meta.server) return
  const store = useAuthStore()
  const localePath = useLocalePath()
  if (store.ready && !store.isLoggedIn) {
    store.openDialog()
    return navigateTo(localePath('/'))
  }
})
```

- [ ] **Step 2: Implement the dashboard page**

`app/pages/cuenta/index.vue`:

```vue
<template>
  <div class="cuenta-page py-6">
    <h1 class="text-h4 mb-6">{{ $t('account.title') }}</h1>

    <VTabs v-model="tab" class="mb-4">
      <VTab value="saved">{{ $t('auth.saved') }}</VTab>
      <VTab value="favorites">{{ $t('auth.favorites') }}</VTab>
    </VTabs>

    <VWindow v-model="tab">
      <!-- Saved results with drift -->
      <VWindowItem value="saved">
        <VAlert v-if="!saved.length" type="info" variant="tonal">{{ $t('account.savedEmpty') }}</VAlert>
        <VRow v-else>
          <VCol v-for="item in saved" :key="item._id" cols="12" md="6">
            <VCard variant="outlined" class="pa-4">
              <div class="d-flex justify-space-between align-start">
                <div>
                  <div class="text-subtitle-1 font-weight-bold">{{ item.title }}</div>
                  <div class="text-caption text-grey">{{ $t('account.savedAt') }} {{ formatDate(item.createdAt) }}</div>
                </div>
                <VBtn icon variant="text" size="small" @click="remove(item._id)"><VIcon>mdi-delete-outline</VIcon></VBtn>
              </div>
              <VDivider class="my-3" />
              <div v-for="d in driftForItem(item.snapshot.rates)" :key="d.rate.label" class="d-flex justify-space-between text-body-2 py-1">
                <span>{{ d.rate.currency }} · {{ d.rate.label }}</span>
                <span>
                  {{ $t('account.then') }}: {{ d.rate.value.toFixed(2) }} ·
                  <template v-if="d.value != null">
                    {{ $t('account.now') }}: {{ d.value.toFixed(2) }}
                    <span v-if="d.pct != null" :class="d.pct >= 0 ? 'text-success' : 'text-error'">
                      ({{ d.pct >= 0 ? '+' : '' }}{{ d.pct.toFixed(2) }}%)
                    </span>
                  </template>
                  <span v-else class="text-grey">{{ $t('account.rateUnavailable') }}</span>
                </span>
              </div>
            </VCard>
          </VCol>
        </VRow>
      </VWindowItem>

      <!-- Favorites -->
      <VWindowItem value="favorites">
        <VAlert v-if="!favoriteIds.length" type="info" variant="tonal">{{ $t('account.favoritesEmpty') }}</VAlert>
        <VList v-else>
          <VListItem v-for="id in favoriteIds" :key="id">
            <template #prepend><VIcon color="amber">mdi-star</VIcon></template>
            <VListItemTitle>{{ id.split(':')[1] }}</VListItemTitle>
            <template #append>
              <VBtn icon variant="text" size="small" @click="removeFavorite(id)"><VIcon>mdi-delete-outline</VIcon></VBtn>
            </template>
          </VListItem>
        </VList>
      </VWindowItem>
    </VWindow>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { authFetch } = useAuthFetch()
const { driftForItem } = useSavedDrift()
const favorites = useFavoritesState()

const tab = ref('saved')
const saved = ref<any[]>([])

const favoriteIds = computed(() => Array.from(favorites))

function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}

async function load() {
  saved.value = await authFetch<any[]>('/api/me/saved').catch(() => [])
}

async function remove(id: string) {
  await authFetch(`/api/me/saved/${id}`, { method: 'DELETE' }).catch(() => {})
  saved.value = saved.value.filter(s => s._id !== id)
}

async function removeFavorite(id: string) {
  const [type, key] = id.split(':')
  favorites.delete(id)
  await authFetch(`/api/me/favorites/${encodeURIComponent(key)}?type=${type}`, { method: 'DELETE' }).catch(() => {})
}

onMounted(load)
</script>
```

- [ ] **Step 3: Write an e2e smoke test**

`app/tests/e2e/account.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('logged-out visitor is redirected away from /cuenta', async ({ page }) => {
  await page.goto('/cuenta')
  // middleware redirects home; the account dashboard heading must not be visible
  await expect(page).not.toHaveURL(/\/cuenta\/?$/)
})

test('login entry point is visible in the header', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Iniciar sesión|Log in|Entrar/ })).toBeVisible()
})
```

- [ ] **Step 4: Run the unit suite + typecheck (full)**

Run: `npm run test`
Expected: all unit tests PASS.
Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 5: Run e2e smoke (if the dev server is available)**

Run: `npm run test:e2e -- account.spec.ts`
Expected: PASS. If the e2e harness needs Firebase env to render the header, the second assertion still passes because the login button renders without Firebase (it only calls `openDialog`). If the suite cannot start the server in this environment, note it and rely on the unit suite.

- [ ] **Step 6: Commit**

```bash
git add app/middleware/auth.ts app/pages/cuenta/index.vue app/tests/e2e/account.spec.ts
git commit -m "feat(account): dashboard with saved drift + favorites, auth-guarded"
```

---

## Task 14: Final verification + docs

**Files:**
- Modify: `app/README.md` or create `app/AUTH_README.md` (setup notes)

**Interfaces:** none (documentation + verification).

- [ ] **Step 1: Document setup**

Create `app/AUTH_README.md`:

```markdown
# Auth & Logged-In Features (Phase 1)

## Required environment variables
See `.env.example`. Public Firebase web config (`NUXT_PUBLIC_FIREBASE_*`),
plus server secrets `FIREBASE_SERVICE_ACCOUNT` (base64 of the service-account
JSON) and `MONGO_URI`.

## Firebase console setup
1. Create a Firebase project; add a Web app → copy the web config into the
   `NUXT_PUBLIC_FIREBASE_*` vars.
2. Authentication → Sign-in method → enable **Google**, **Email/Password**,
   and **Email link (passwordless)**.
3. Authentication → Settings → Authorized domains → add `cambio-uruguay.com`
   and `localhost`.
4. Project settings → Service accounts → Generate new private key →
   `base64 -w0 key.json` → `FIREBASE_SERVICE_ACCOUNT`.

## Features
- Login (Google / email+password / magic link) via the header account menu.
- Favorites: star casas in the rate table; view them under `/cuenta`.
- Saved results: save a currency conversion; `/cuenta` shows the rate drift
  since the day it was saved.

## Phase 2 (not yet implemented)
Rate alerts with web push (FCM) + email (Nodemailer/SMTP) and the
`alerts:check` scheduled task. See the design spec.
```

- [ ] **Step 2: Full verification pass**

Run: `npm run test`
Expected: all PASS.
Run: `npm run lint`
Expected: no new lint errors in added files (fix any that appear).
Run: `npm run typecheck`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add app/AUTH_README.md
git commit -m "docs(auth): phase 1 setup + feature notes"
```

---

## Self-Review

**Spec coverage:**
- Auth (Google + email/pwd + magic link, verify, reset) → Tasks 6, 9, 10. ✓
- Firebase Admin verify + requireUser + Mongo + User model + profile → Tasks 1, 2, 3. ✓
- Favorites (model/API/star/dashboard) → Tasks 2, 4, 11, 13. ✓
- Saved-history + drift (model/API/button/dashboard) → Tasks 2, 5, 7, 12, 13. ✓
- Account page + middleware + header menu → Tasks 10, 13. ✓
- i18n es/en/pt → Task 8. ✓
- Tests (drift unit, auth store, server uid-scoping, dialog/middleware smoke) → Tasks 1–13. ✓
- Security (token verified server-side, uid-scoped queries, public/secret split) → Tasks 1, 3, 4, 5 + Global Constraints. ✓
- Config/secrets → Task 1 (runtimeConfig + .env.example), Task 14 (setup docs). ✓
- Phase 2 explicitly out of scope → noted in Task 14 + spec. ✓

**Type consistency:** `SavedRateRef` defined in Task 7 (`useSavedDrift.ts`) and consumed identically in Tasks 11–13. `requireUser` return `{uid,email}` consistent across Tasks 1, 3, 4, 5. `useFavoritesState` set keys `"type:key"` consistent across Tasks 11, 13. Auth store action names consistent between Tasks 6, 9, 10.

**Placeholder scan:** All steps contain complete code with exact paths and line anchors, including Task 12 step 5 (`/convertir`), whose real variables (`foreign`, `buyRate`, `sellRate`, `entry`) were read and pasted verbatim. The only narrative step is Task 11 step 4 (placing the star in the existing rate-table name cell), which gives the exact `<FavoriteStar>` tag and is bounded to "do not restructure the cell" — a one-line insertion.
