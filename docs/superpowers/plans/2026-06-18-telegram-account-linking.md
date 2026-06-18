# Telegram Account Linking + Value-Adds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link a user's Telegram chat to their Firebase uid and use it to deliver rate alerts, account commands, a daily personalized summary, and alert creation from chat.

**Architecture:** A deep-link code (app-generated, short-lived) links a Telegram chat to a uid via a secret-authenticated internal API the bot calls. The app owns all user data and sends Telegram messages directly via the Bot API; the `bots/` telegraf bot only formats and calls the internal API.

**Tech Stack:** Nuxt 3 / Nitro, Vue 3, Vuetify 3, mongoose ^8, firebase-admin (existing auth), Vitest; bot side: telegraf (existing `bots/`).

## Global Constraints

- ESM. Use `import`. Reuse existing helpers: `requireUser` (`app/server/utils/auth.ts`), `connectDb` (`app/server/utils/db.ts`), `installNitroGlobals` test helper (`app/tests/unit/helpers/nitro.ts`), models (`app/server/models/*`), `runAlertsCheck` (`app/server/utils/alertRunner.ts`), `fetchCurrentRates`/`bestRateFor` (`app/server/utils/rates.ts`).
- Every `/api/me/*` handler calls `requireUser(event)` and is uid-scoped. Every `/api/telegram/*` handler calls `requireBotSecret(event)` and is keyed by `chatId` (never a Firebase token).
- Mongo via the app's `connectDb`. The same MongoDB instance backs app + bots.
- Currency codes `'USD'|'EUR'|'BRL'|'ARS'`; alert kinds `'bestBuy'|'bestSell'`; ops `'<'|'>'|'<='|'>='`.
- Secrets (server env): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_BOT_SECRET`. Bot env adds `TELEGRAM_BOT_SECRET` (+ reuses `siteBaseUrl`).
- i18n strings to `app/i18n/locales/json/{es,en,pt}.json`. Vuetify components must be registered in `app/plugins/vuetify.ts`.
- Tests: `npm run test` in `app/`. Commit after each task.

---

## File Structure

**App (new):**
- `server/models/TelegramLink.ts` — `{code,uid,createdAt}` + TTL index.
- `server/utils/telegramLink.ts` — `makeLinkCode()`.
- `server/utils/telegramAuth.ts` — `requireBotSecret(event)`.
- `server/utils/telegram.ts` — `sendTelegram(chatId,text)`.
- `server/utils/telegramSummary.ts` — `buildSummary(...)` pure.
- `server/api/me/telegram/link-code.post.ts`, `status.get.ts`, `index.delete.ts`
- `server/api/telegram/link.post.ts`, `unlink.post.ts`, `alerts.get.ts`, `favorites.get.ts`, `alert.post.ts`
- `server/tasks/telegram/summary.ts`
- `components/account/TelegramLink.vue`

**App (modified):**
- `server/models/User.ts` (+`telegramChatId`), `server/models/Alert.ts` (+`channels.telegram`)
- `server/utils/alertRunner.ts` (telegram branch), `server/tasks/alerts/check.ts` (wire telegram + chatId)
- `components/account/AlertsPanel.vue` (telegram checkbox + mount `<TelegramLink/>`)
- `nuxt.config.ts` (runtimeConfig telegram + `telegram:summary` cron), `.env.example`
- `i18n/locales/json/{es,en,pt}.json`

**Bot (modified):** `bots/src/config.ts` (+`accountSecret`), `bots/src/entries/telegram.ts` (`/start <code>`), `bots/src/commands/router.ts` (account commands), `bots/src/store/app_client.ts` (new).

**Tests (new):** `tests/unit/telegram-link.test.ts`, `telegram-auth.test.ts`, `api-telegram-link.test.ts`, `api-me-telegram.test.ts`, `alerts-task.test.ts` (extend), `telegram-summary.test.ts`, `api-telegram-alert.test.ts`.

---

## PHASE 1 — Linking + alerts channel

## Task 1: Models — telegramChatId, Alert.channels.telegram, TelegramLink

**Files:**
- Modify: `app/server/models/User.ts`, `app/server/models/Alert.ts`
- Create: `app/server/models/TelegramLink.ts`
- Test: `app/tests/unit/telegram-model.test.ts`

**Interfaces:**
- Produces: `User.telegramChatId: string|null`; `Alert.channels.telegram: boolean`; `TelegramLinkModel` with `{code,uid,createdAt}` and a TTL index.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/telegram-model.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { TelegramLinkModel } from '../../server/models/TelegramLink'
import { AlertModel } from '../../server/models/Alert'

describe('telegram models', () => {
  it('TelegramLink requires code + uid', () => {
    const err = new TelegramLinkModel({}).validateSync()
    expect(err?.errors.code).toBeTruthy()
    expect(err?.errors.uid).toBeTruthy()
  })

  it('Alert channels include telegram with default false', () => {
    const a = new AlertModel({ uid: 'u', currency: 'USD', kind: 'bestBuy', op: '>=', target: 41 })
    expect(a.channels.telegram).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- tests/unit/telegram-model.test.ts`
Expected: FAIL (TelegramLink not found).

- [ ] **Step 3: Implement**

`app/server/models/TelegramLink.ts`:

```ts
import mongoose, { Schema, type Model } from 'mongoose'

export interface TelegramLinkDoc {
  code: string
  uid: string
  createdAt: Date
}

const TelegramLinkSchema = new Schema<TelegramLinkDoc>({
  code: { type: String, required: true, unique: true },
  uid: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})
// TTL: codes expire 10 minutes after creation.
TelegramLinkSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 })

export const TelegramLinkModel: Model<TelegramLinkDoc> =
  (mongoose.models.TelegramLink as Model<TelegramLinkDoc>) ||
  mongoose.model<TelegramLinkDoc>('TelegramLink', TelegramLinkSchema)
```

In `app/server/models/User.ts` interface add `telegramChatId: string | null` and schema add `telegramChatId: { type: String, default: null }`.

In `app/server/models/Alert.ts`, in the `channels` interface add `telegram: boolean` and in the schema `channels` add `telegram: { type: Boolean, default: false }`.

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- tests/unit/telegram-model.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add app/server/models/TelegramLink.ts app/server/models/User.ts app/server/models/Alert.ts app/tests/unit/telegram-model.test.ts
git commit -m "feat(telegram): models — telegramChatId, Alert.channels.telegram, TelegramLink TTL"
```

---

## Task 2: makeLinkCode + requireBotSecret utils

**Files:**
- Create: `app/server/utils/telegramLink.ts`, `app/server/utils/telegramAuth.ts`
- Test: `app/tests/unit/telegram-link.test.ts`, `app/tests/unit/telegram-auth.test.ts`

**Interfaces:**
- Produces: `makeLinkCode(): string` (8-char base32, uppercase); `requireBotSecret(event): void` (throws `createError 401` unless `x-telegram-secret` header equals `useRuntimeConfig().telegram.secret`).

- [ ] **Step 1: Write the failing tests**

`app/tests/unit/telegram-link.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { makeLinkCode } from '../../server/utils/telegramLink'

describe('makeLinkCode', () => {
  it('returns an 8-char uppercase base32 code', () => {
    const c = makeLinkCode()
    expect(c).toMatch(/^[A-Z2-7]{8}$/)
  })
  it('is (practically) unique across calls', () => {
    const set = new Set(Array.from({ length: 200 }, () => makeLinkCode()))
    expect(set.size).toBe(200)
  })
})
```

`app/tests/unit/telegram-auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

vi.stubGlobal('useRuntimeConfig', () => ({ telegram: { secret: 's3cret' } }))
installNitroGlobals()
const { requireBotSecret } = await import('../../server/utils/telegramAuth')

function ev(secret?: string) {
  return { node: { req: { headers: secret ? { 'x-telegram-secret': secret } : {} } } } as any
}

describe('requireBotSecret', () => {
  it('rejects a missing/wrong secret', () => {
    expect(() => requireBotSecret(ev())).toThrow()
    expect(() => requireBotSecret(ev('nope'))).toThrow()
  })
  it('passes with the right secret', () => {
    expect(() => requireBotSecret(ev('s3cret'))).not.toThrow()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- tests/unit/telegram-link.test.ts tests/unit/telegram-auth.test.ts`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`app/server/utils/telegramLink.ts`:

```ts
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567' // base32 (Crockford-ish, no 0/1/8/9)

/** Short, URL/Telegram-safe single-use link code. */
export function makeLinkCode(len = 8): string {
  let out = ''
  const bytes =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(len))
      : Array.from({ length: len }, () => Math.floor(Math.random() * 256))
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i]! % ALPHABET.length]
  return out
}
```

`app/server/utils/telegramAuth.ts`:

```ts
import { createError, getHeader, type H3Event } from 'h3'

/** Guards the bot-only internal API: requires the shared `x-telegram-secret`. */
export function requireBotSecret(event: H3Event): void {
  const expected = useRuntimeConfig().telegram?.secret
  const got = getHeader(event, 'x-telegram-secret')
  if (!expected || got !== expected) {
    throw createError({ statusCode: 401, statusMessage: 'bad telegram secret' })
  }
}
```

Note: the test stubs `getHeader` indirectly via `installNitroGlobals`? It does NOT — add `getHeader` to the test's globals. Update `app/tests/unit/helpers/nitro.ts` to also stub `getHeader`:

```ts
  const getHeader = vi.fn((event: any, name: string) => event?.node?.req?.headers?.[name])
  vi.stubGlobal('getHeader', getHeader)
```

and return it: add `getHeader` to the returned object. (Because `telegramAuth.ts` imports `getHeader` from `'h3'`, the import resolves to the real h3 in tests — so no stub needed; keep the import. The test's `ev()` shape matches `event.node.req.headers`. If the real `getHeader` cannot read the fake event, replace its use in `requireBotSecret` with `event.node.req.headers['x-telegram-secret']` directly.)

**Decision (avoid h3 coupling in tests):** implement `requireBotSecret` reading the header directly:

```ts
import { createError, type H3Event } from 'h3'

export function requireBotSecret(event: H3Event): void {
  const expected = useRuntimeConfig().telegram?.secret
  const got = event.node.req.headers['x-telegram-secret']
  if (!expected || got !== expected) {
    throw createError({ statusCode: 401, statusMessage: 'bad telegram secret' })
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- tests/unit/telegram-link.test.ts tests/unit/telegram-auth.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/telegramLink.ts app/server/utils/telegramAuth.ts app/tests/unit/telegram-link.test.ts app/tests/unit/telegram-auth.test.ts
git commit -m "feat(telegram): link-code generator + bot-secret guard"
```

---

## Task 3: sendTelegram util + runtimeConfig

**Files:**
- Create: `app/server/utils/telegram.ts`
- Modify: `app/nuxt.config.ts` (runtimeConfig.telegram), `app/.env.example`
- Test: `app/tests/unit/telegram-send.test.ts`

**Interfaces:**
- Produces: `sendTelegram(chatId: string, text: string, fetchImpl?: typeof fetch): Promise<boolean>` — POSTs `sendMessage`; returns `true` on `ok`, `false` when token missing or request fails.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/telegram-send.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const cfg = { telegram: { token: 'T', secret: 's', username: 'b' } }
vi.stubGlobal('useRuntimeConfig', () => cfg)
const { sendTelegram } = await import('../../server/utils/telegram')

beforeEach(() => {
  cfg.telegram.token = 'T'
})

describe('sendTelegram', () => {
  it('returns false when the token is missing', async () => {
    cfg.telegram.token = ''
    const ok = await sendTelegram('123', 'hi', vi.fn())
    expect(ok).toBe(false)
  })

  it('posts to sendMessage and returns true on ok', async () => {
    const f = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: true }) })
    const ok = await sendTelegram('123', 'hi', f as any)
    expect(ok).toBe(true)
    expect(f).toHaveBeenCalledWith(
      expect.stringContaining('/botT/sendMessage'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('returns false when Telegram responds not-ok', async () => {
    const f = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: false }) })
    expect(await sendTelegram('1', 'x', f as any)).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- tests/unit/telegram-send.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`app/server/utils/telegram.ts`:

```ts
/** Send a Telegram message via the Bot API. Returns false if unconfigured or failed. */
export async function sendTelegram(
  chatId: string,
  text: string,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  const token = useRuntimeConfig().telegram?.token
  if (!token || !chatId) return false
  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
      }),
    })
    const data: any = await res.json().catch(() => ({}))
    return Boolean(data?.ok)
  } catch {
    return false
  }
}
```

In `app/nuxt.config.ts` `runtimeConfig` (server section) add:

```ts
    telegram: {
      token: process.env.TELEGRAM_BOT_TOKEN || '',
      username: process.env.TELEGRAM_BOT_USERNAME || '',
      secret: process.env.TELEGRAM_BOT_SECRET || '',
    },
```

In `app/.env.example` add:

```bash
# --- Telegram account linking ---
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_BOT_SECRET=
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- tests/unit/telegram-send.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/telegram.ts app/nuxt.config.ts app/.env.example app/tests/unit/telegram-send.test.ts
git commit -m "feat(telegram): sendTelegram Bot API util + runtimeConfig"
```

---

## Task 4: User-facing link API (link-code, status, unlink)

**Files:**
- Create: `app/server/api/me/telegram/link-code.post.ts`, `status.get.ts`, `index.delete.ts`
- Test: `app/tests/unit/api-me-telegram.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `connectDb`, `UserModel`, `TelegramLinkModel`, `makeLinkCode`, `useRuntimeConfig().telegram.username`.
- Produces:
  - `POST /api/me/telegram/link-code` → `{ code, botUsername, deepLink }`.
  - `GET /api/me/telegram/status` → `{ linked: boolean }`.
  - `DELETE /api/me/telegram` → `{ ok: true }`.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/api-me-telegram.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const linkCreate = vi.fn()
const userFindById = vi.fn()
const userUpdateOne = vi.fn()
vi.stubGlobal('useRuntimeConfig', () => ({ telegram: { username: 'CambioBot' } }))
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/TelegramLink', () => ({ TelegramLinkModel: { create: linkCreate } }))
vi.mock('../../server/models/User', () => ({
  UserModel: { findById: userFindById, updateOne: userUpdateOne },
}))

installNitroGlobals()
const codeH = (await import('../../server/api/me/telegram/link-code.post')).default
const statusH = (await import('../../server/api/me/telegram/status.get')).default
const delH = (await import('../../server/api/me/telegram/index.delete')).default

beforeEach(() => {
  ;[requireUser, linkCreate, userFindById, userUpdateOne].forEach(m => m.mockReset())
  requireUser.mockResolvedValue({ uid: 'u1', email: null })
})

describe('me/telegram API', () => {
  it('issues a link code + deep link', async () => {
    linkCreate.mockResolvedValueOnce({})
    const res = await codeH({} as any)
    expect(res.botUsername).toBe('CambioBot')
    expect(res.deepLink).toBe(`https://t.me/CambioBot?start=${res.code}`)
    expect(linkCreate).toHaveBeenCalledWith(expect.objectContaining({ uid: 'u1', code: res.code }))
  })

  it('reports linked status', async () => {
    userFindById.mockReturnValueOnce({ lean: () => ({ exec: () => Promise.resolve({ telegramChatId: '55' }) }) })
    expect(await statusH({} as any)).toEqual({ linked: true })
  })

  it('unlinks the caller', async () => {
    userUpdateOne.mockResolvedValueOnce({})
    expect(await delH({} as any)).toEqual({ ok: true })
    expect(userUpdateOne).toHaveBeenCalledWith({ _id: 'u1' }, { $set: { telegramChatId: null } })
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- tests/unit/api-me-telegram.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`app/server/api/me/telegram/link-code.post.ts`:

```ts
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { TelegramLinkModel } from '../../../models/TelegramLink'
import { makeLinkCode } from '../../../utils/telegramLink'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const botUsername = useRuntimeConfig().telegram?.username || ''
  await connectDb()
  const code = makeLinkCode()
  await TelegramLinkModel.create({ uid, code })
  return { code, botUsername, deepLink: `https://t.me/${botUsername}?start=${code}` }
})
```

`app/server/api/me/telegram/status.get.ts`:

```ts
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { UserModel } from '../../../models/User'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  await connectDb()
  const u = await UserModel.findById(uid).lean().exec()
  return { linked: Boolean((u as any)?.telegramChatId) }
})
```

`app/server/api/me/telegram/index.delete.ts`:

```ts
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { UserModel } from '../../../models/User'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  await connectDb()
  await UserModel.updateOne({ _id: uid }, { $set: { telegramChatId: null } })
  return { ok: true }
})
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- tests/unit/api-me-telegram.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add app/server/api/me/telegram app/tests/unit/api-me-telegram.test.ts
git commit -m "feat(telegram): user link-code/status/unlink API"
```

---

## Task 5: Internal link/unlink API (bot, secret-auth)

**Files:**
- Create: `app/server/api/telegram/link.post.ts`, `app/server/api/telegram/unlink.post.ts`
- Test: `app/tests/unit/api-telegram-link.test.ts`

**Interfaces:**
- Consumes: `requireBotSecret`, `connectDb`, `TelegramLinkModel`, `UserModel`.
- Produces:
  - `POST /api/telegram/link` `{ code, chatId }` → `{ ok:true, linked:true }` or `{ ok:false, reason:'expired' }`.
  - `POST /api/telegram/unlink` `{ chatId }` → `{ ok:true }`.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/api-telegram-link.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireBotSecret = vi.fn()
const linkFindOneAndDelete = vi.fn()
const userUpdateOne = vi.fn()
vi.mock('../../server/utils/telegramAuth', () => ({ requireBotSecret }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/TelegramLink', () => ({
  TelegramLinkModel: { findOneAndDelete: linkFindOneAndDelete },
}))
vi.mock('../../server/models/User', () => ({ UserModel: { updateOne: userUpdateOne } }))

const { readBody } = installNitroGlobals()
const linkH = (await import('../../server/api/telegram/link.post')).default
const unlinkH = (await import('../../server/api/telegram/unlink.post')).default

beforeEach(() => {
  ;[requireBotSecret, linkFindOneAndDelete, userUpdateOne, readBody].forEach(m => m.mockReset())
})

describe('internal telegram link API', () => {
  it('links a valid code to the chat and consumes it', async () => {
    readBody.mockResolvedValueOnce({ code: 'ABC', chatId: '99' })
    linkFindOneAndDelete.mockReturnValueOnce({ exec: () => Promise.resolve({ uid: 'u1' }) })
    userUpdateOne.mockResolvedValueOnce({})
    const res = await linkH({} as any)
    expect(res).toEqual({ ok: true, linked: true })
    expect(userUpdateOne).toHaveBeenCalledWith({ _id: 'u1' }, { $set: { telegramChatId: '99' } })
  })

  it('reports expired when the code is gone', async () => {
    readBody.mockResolvedValueOnce({ code: 'GONE', chatId: '99' })
    linkFindOneAndDelete.mockReturnValueOnce({ exec: () => Promise.resolve(null) })
    expect(await linkH({} as any)).toEqual({ ok: false, reason: 'expired' })
  })

  it('unlink clears the user with that chat', async () => {
    readBody.mockResolvedValueOnce({ chatId: '99' })
    userUpdateOne.mockResolvedValueOnce({})
    expect(await unlinkH({} as any)).toEqual({ ok: true })
    expect(userUpdateOne).toHaveBeenCalledWith(
      { telegramChatId: '99' },
      { $set: { telegramChatId: null } }
    )
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- tests/unit/api-telegram-link.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`app/server/api/telegram/link.post.ts`:

```ts
import { requireBotSecret } from '../../utils/telegramAuth'
import { connectDb } from '../../utils/db'
import { TelegramLinkModel } from '../../models/TelegramLink'
import { UserModel } from '../../models/User'

export default defineEventHandler(async event => {
  requireBotSecret(event)
  const body = await readBody(event)
  const code = String(body?.code ?? '').trim().toUpperCase()
  const chatId = String(body?.chatId ?? '').trim()
  if (!code || !chatId) throw createError({ statusCode: 400, statusMessage: 'code and chatId required' })
  await connectDb()
  const link = await TelegramLinkModel.findOneAndDelete({ code }).exec()
  if (!link) return { ok: false, reason: 'expired' }
  await UserModel.updateOne({ _id: link.uid }, { $set: { telegramChatId: chatId } })
  return { ok: true, linked: true }
})
```

`app/server/api/telegram/unlink.post.ts`:

```ts
import { requireBotSecret } from '../../utils/telegramAuth'
import { connectDb } from '../../utils/db'
import { UserModel } from '../../models/User'

export default defineEventHandler(async event => {
  requireBotSecret(event)
  const chatId = String((await readBody(event))?.chatId ?? '').trim()
  if (!chatId) throw createError({ statusCode: 400, statusMessage: 'chatId required' })
  await connectDb()
  await UserModel.updateOne({ telegramChatId: chatId }, { $set: { telegramChatId: null } })
  return { ok: true }
})
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- tests/unit/api-telegram-link.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add app/server/api/telegram/link.post.ts app/server/api/telegram/unlink.post.ts app/tests/unit/api-telegram-link.test.ts
git commit -m "feat(telegram): internal link/unlink API (secret-auth)"
```

---

## Task 6: Alert runner — Telegram channel

**Files:**
- Modify: `app/server/utils/alertRunner.ts`, `app/server/tasks/alerts/check.ts`
- Test: `app/tests/unit/alerts-task.test.ts` (extend)

**Interfaces:**
- Consumes: existing `RunnerDeps`.
- Produces: `RunnerDeps` gains `telegram(chatId, text): Promise<boolean>`; `getUserContacts` return adds `telegramChatId: string | null`. The runner, on fire, sends Telegram when `a.channels?.telegram && contacts.telegramChatId`.

- [ ] **Step 1: Add the failing test (append to `alerts-task.test.ts`)**

```ts
  it('fires a Telegram message when channels.telegram + telegramChatId', async () => {
    const alert = {
      _id: 'a4', uid: 'u1', currency: 'USD', kind: 'bestBuy', op: '>=', target: 41,
      origin: 'any', armed: true, lastFiredAt: null, channels: { push: false, email: false, telegram: true },
    }
    const telegram = vi.fn().mockResolvedValue(true)
    const deps = makeDeps({
      loadActiveAlerts: vi.fn().mockResolvedValue([alert]),
      getUserContacts: vi.fn().mockResolvedValue({ email: null, fcmTokens: [], telegramChatId: '77' }),
      telegram,
    })
    await runAlertsCheck(deps as any)
    expect(telegram).toHaveBeenCalledWith('77', expect.any(String))
  })
```

Also extend `makeDeps` in that file to include `telegram: vi.fn().mockResolvedValue(true)` and `getUserContacts` default to return `telegramChatId: null`.

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- tests/unit/alerts-task.test.ts`
Expected: FAIL (telegram not called).

- [ ] **Step 3: Implement**

In `app/server/utils/alertRunner.ts` add to `RunnerDeps`:

```ts
  telegram: (chatId: string, text: string) => Promise<boolean>
```

and change `getUserContacts` return type to `{ email: string | null; fcmTokens: string[]; telegramChatId: string | null }`. After the email block in the fire path add:

```ts
    if (a.channels?.telegram && contacts.telegramChatId) {
      await deps.telegram(contacts.telegramChatId, `${title}\n${body}`)
    }
```

In `app/server/tasks/alerts/check.ts`: import `sendTelegram`, extend `getUserContacts` to return `telegramChatId: u?.telegramChatId ?? null`, and add `telegram: sendTelegram` to the deps object.

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- tests/unit/alerts-task.test.ts`
Expected: PASS (all, incl. new).

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/alertRunner.ts app/server/tasks/alerts/check.ts app/tests/unit/alerts-task.test.ts
git commit -m "feat(telegram): alerts:check delivers a Telegram channel"
```

---

## Task 7: Bot — /start linking + app client + config

**Files:**
- Create: `bots/src/store/app_client.ts`
- Modify: `bots/src/config.ts`, `bots/src/entries/telegram.ts`
- Test: `bots/test/app_client.test.ts`

**Interfaces:**
- Consumes: `BotConfig` (gains `accountSecret?: string`, `appBaseUrl: string`).
- Produces: `AppClient` with `link(code, chatId)`, `unlink(chatId)`, `alerts(chatId)`, `favorites(chatId)`, `createAlert(chatId, spec)` — each `fetch` to `${appBaseUrl}/api/telegram/...` with `x-telegram-secret`.

- [ ] **Step 1: Write the failing test**

`bots/test/app_client.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { AppClient } from '../src/store/app_client.js'

describe('AppClient', () => {
  it('links with the secret header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: true, linked: true }) })
    const c = new AppClient('https://app', 'sec', fetchImpl as any)
    const res = await c.link('ABC', '42')
    expect(res).toEqual({ ok: true, linked: true })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://app/api/telegram/link',
      expect.objectContaining({ headers: expect.objectContaining({ 'x-telegram-secret': 'sec' }) })
    )
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run (in `bots/`): `npm run test -- test/app_client.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`bots/src/store/app_client.ts`:

```ts
export interface AlertSpec {
  currency: string
  kind: 'bestBuy' | 'bestSell'
  op: '<' | '>' | '<=' | '>='
  target: number
}

/** Thin client over the app's secret-authenticated internal Telegram API. */
export class AppClient {
  constructor(
    private readonly baseUrl: string,
    private readonly secret: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private async post(path: string, body: unknown): Promise<any> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-telegram-secret': this.secret },
      body: JSON.stringify(body),
    })
    return res.json().catch(() => ({}))
  }

  private async get(path: string): Promise<any> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: { 'x-telegram-secret': this.secret },
    })
    return res.json().catch(() => ({}))
  }

  link(code: string, chatId: string) {
    return this.post('/api/telegram/link', { code, chatId })
  }
  unlink(chatId: string) {
    return this.post('/api/telegram/unlink', { chatId })
  }
  alerts(chatId: string) {
    return this.get(`/api/telegram/alerts?chatId=${encodeURIComponent(chatId)}`)
  }
  favorites(chatId: string) {
    return this.get(`/api/telegram/favorites?chatId=${encodeURIComponent(chatId)}`)
  }
  createAlert(chatId: string, spec: AlertSpec) {
    return this.post('/api/telegram/alert', { chatId, ...spec })
  }
}
```

In `bots/src/config.ts`: add `appBaseUrl: string` and `accountSecret?: string` to `BotConfig`, and in `loadConfig` return `appBaseUrl: env.APP_BASE_URL || env.SITE_BASE_URL || 'https://cambio-uruguay.com'` and `accountSecret: env.TELEGRAM_BOT_SECRET || undefined`.

In `bots/src/entries/telegram.ts`, before the generic `bot.on('text')`, add a `/start` handler:

```ts
  const app = cfg.accountSecret
    ? new AppClient(cfg.appBaseUrl, cfg.accountSecret)
    : null

  bot.start(async ctx => {
    const code = (ctx.startPayload || '').trim()
    if (!code || !app) {
      await ctx.reply('Vinculá tu cuenta desde cambio-uruguay.com/cuenta → Telegram.')
      return
    }
    const res = await app.link(code, String(ctx.chat.id)).catch(() => ({ ok: false }))
    await ctx.reply(
      res?.ok
        ? '✅ Cuenta vinculada. Vas a recibir acá tus alertas. Probá /misalertas o /favoritos.'
        : 'El código venció o no es válido. Generá uno nuevo en cambio-uruguay.com/cuenta.'
    )
  })
```

(Import `AppClient` at the top.)

- [ ] **Step 4: Run — expect PASS**

Run (in `bots/`): `npm run test -- test/app_client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add bots/src/store/app_client.ts bots/src/config.ts bots/src/entries/telegram.ts bots/test/app_client.test.ts
git commit -m "feat(telegram-bot): /start account linking via app client"
```

---

## Task 8: UI — link button + alert Telegram checkbox + i18n

**Files:**
- Create: `app/components/account/TelegramLink.vue`
- Modify: `app/components/account/AlertsPanel.vue`, `app/i18n/locales/json/{es,en,pt}.json`
- (No unit test — covered by typecheck + e2e smoke.)

**Interfaces:**
- Consumes: `useAuthFetch`, `tg.*` i18n keys, `usePushNotifications` already imported in AlertsPanel.
- Produces: `<AccountTelegramLink/>` (auto-import) — shows link button → deep link → polls status; and a `telegram` field added to the alert `form` + channel checkbox.

- [ ] **Step 1: Add i18n keys (`tg`) to es/en/pt**

Add under the `alerts` object close (sibling key `tg`) in each `app/i18n/locales/json/*.json`:

es:
```json
  "tg": {
    "title": "Telegram",
    "link": "Vincular Telegram",
    "linked": "Telegram vinculado",
    "unlink": "Desvincular",
    "open": "Abrir Telegram",
    "waiting": "Esperando confirmación en Telegram…",
    "hint": "Vinculá Telegram para recibir alertas en el chat",
    "telegram": "Telegram"
  }
```
en:
```json
  "tg": {
    "title": "Telegram",
    "link": "Link Telegram",
    "linked": "Telegram linked",
    "unlink": "Unlink",
    "open": "Open Telegram",
    "waiting": "Waiting for confirmation in Telegram…",
    "hint": "Link Telegram to receive alerts in chat",
    "telegram": "Telegram"
  }
```
pt:
```json
  "tg": {
    "title": "Telegram",
    "link": "Vincular Telegram",
    "linked": "Telegram vinculado",
    "unlink": "Desvincular",
    "open": "Abrir Telegram",
    "waiting": "Aguardando confirmação no Telegram…",
    "hint": "Vincule o Telegram para receber alertas no chat",
    "telegram": "Telegram"
  }
```

Validate: `node -e "['es','en','pt'].forEach(l=>JSON.parse(require('fs').readFileSync('./app/i18n/locales/json/'+l+'.json','utf8')))"`.

- [ ] **Step 2: Implement `TelegramLink.vue`**

`app/components/account/TelegramLink.vue`:

```vue
<template>
  <VCard variant="outlined" class="pa-4 mb-4">
    <div class="d-flex align-center justify-space-between flex-wrap ga-2">
      <div class="d-flex align-center ga-2">
        <VIcon color="info">mdi-send-circle</VIcon>
        <span class="text-subtitle-2 font-weight-bold">{{ $t('tg.title') }}</span>
      </div>
      <template v-if="linked">
        <VChip color="success" size="small" variant="tonal" prepend-icon="mdi-check">
          {{ $t('tg.linked') }}
        </VChip>
        <VBtn size="small" variant="text" color="error" @click="unlink">{{ $t('tg.unlink') }}</VBtn>
      </template>
      <VBtn v-else color="info" variant="tonal" size="small" :loading="busy" @click="startLink">
        {{ $t('tg.link') }}
      </VBtn>
    </div>

    <div v-if="deepLink && !linked" class="mt-3">
      <VBtn :href="deepLink" target="_blank" color="info" variant="flat" size="small" prepend-icon="mdi-open-in-new">
        {{ $t('tg.open') }}
      </VBtn>
      <div class="text-caption text-grey mt-2">
        <VProgressCircular indeterminate size="14" width="2" class="me-1" />
        {{ $t('tg.waiting') }}
      </div>
    </div>
  </VCard>
</template>

<script setup lang="ts">
const { authFetch } = useAuthFetch()
const linked = ref(false)
const busy = ref(false)
const deepLink = ref('')
let poll: ReturnType<typeof setInterval> | null = null

async function refresh() {
  const r = await authFetch<{ linked: boolean }>('/api/me/telegram/status').catch(() => ({ linked: false }))
  linked.value = r.linked
  if (linked.value && poll) {
    clearInterval(poll)
    poll = null
    deepLink.value = ''
  }
}

async function startLink() {
  busy.value = true
  try {
    const r = await authFetch<{ deepLink: string }>('/api/me/telegram/link-code', { method: 'POST' })
    deepLink.value = r.deepLink
    if (!poll) poll = setInterval(refresh, 3000)
  } finally {
    busy.value = false
  }
}

async function unlink() {
  await authFetch('/api/me/telegram', { method: 'DELETE' }).catch(() => {})
  linked.value = false
}

onMounted(refresh)
onBeforeUnmount(() => poll && clearInterval(poll))

defineExpose({ linked })
</script>
```

- [ ] **Step 3: Wire into AlertsPanel**

In `app/components/account/AlertsPanel.vue` template, mount the card at the top of the panel (before the create form):

```vue
    <AccountTelegramLink />
```

Add a Telegram channel checkbox next to push/email in the create form:

```vue
        <VCheckbox v-model="form.telegram" :label="$t('tg.telegram')" density="compact" hide-details />
```

In the script, add `telegram: false` to the `form` reactive and include it in the create body:

```ts
        channels: { push: form.push, email: form.email, telegram: form.telegram },
```

- [ ] **Step 4: Typecheck + commit**

Run: `npm run typecheck`
Expected: no new errors.

```bash
git add app/components/account/TelegramLink.vue app/components/account/AlertsPanel.vue app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(telegram): account link UI + alert Telegram channel checkbox"
```

---

## PHASE 2 — Account commands + create-from-Telegram

## Task 9: Internal read/create API (alerts, favorites, alert)

**Files:**
- Create: `app/server/api/telegram/alerts.get.ts`, `favorites.get.ts`, `alert.post.ts`
- Create: `app/server/utils/telegramUser.ts` (`userByChat`)
- Test: `app/tests/unit/api-telegram-account.test.ts`

**Interfaces:**
- Consumes: `requireBotSecret`, `connectDb`, `UserModel`, `AlertModel`, `FavoriteModel`, `fetchCurrentRates`, `bestRateFor`.
- Produces:
  - `userByChat(chatId): Promise<{uid}|null>` from `UserModel.findOne({telegramChatId})`.
  - `GET /api/telegram/alerts?chatId=` → `{ linked, alerts }`.
  - `GET /api/telegram/favorites?chatId=` → `{ linked, favorites: [{key,label,currency?}] }` (rate enrichment optional).
  - `POST /api/telegram/alert` `{chatId,currency,kind,op,target}` → `{ ok, alert }` or `{ linked:false }` / 400.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/api-telegram-account.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireBotSecret = vi.fn()
const userFindOne = vi.fn()
const alertFind = vi.fn()
const alertCreate = vi.fn()
vi.mock('../../server/utils/telegramAuth', () => ({ requireBotSecret }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/User', () => ({ UserModel: { findOne: userFindOne } }))
vi.mock('../../server/models/Alert', () => ({ AlertModel: { find: alertFind, create: alertCreate } }))

const { getQuery, readBody } = installNitroGlobals()
const alertsH = (await import('../../server/api/telegram/alerts.get')).default
const alertCreateH = (await import('../../server/api/telegram/alert.post')).default

beforeEach(() => {
  ;[requireBotSecret, userFindOne, alertFind, alertCreate, getQuery, readBody].forEach(m => m.mockReset())
})

function linkUser(uid: string | null) {
  userFindOne.mockReturnValueOnce({
    lean: () => ({ exec: () => Promise.resolve(uid ? { _id: uid } : null) }),
  })
}

describe('internal telegram account API', () => {
  it('returns linked:false for an unknown chat', async () => {
    getQuery.mockReturnValueOnce({ chatId: '5' })
    linkUser(null)
    expect(await alertsH({} as any)).toEqual({ linked: false })
  })

  it('lists the user alerts', async () => {
    getQuery.mockReturnValueOnce({ chatId: '5' })
    linkUser('u1')
    alertFind.mockReturnValueOnce({ lean: () => ({ exec: () => Promise.resolve([{ target: 41 }]) }) })
    expect(await alertsH({} as any)).toEqual({ linked: true, alerts: [{ target: 41 }] })
  })

  it('creates an alert from chat', async () => {
    readBody.mockResolvedValueOnce({ chatId: '5', currency: 'USD', kind: 'bestBuy', op: '>=', target: 41 })
    linkUser('u1')
    alertCreate.mockResolvedValueOnce({ _id: 'a1' })
    const res = await alertCreateH({} as any)
    expect(res).toMatchObject({ ok: true })
    expect(alertCreate).toHaveBeenCalledWith(expect.objectContaining({ uid: 'u1', currency: 'USD' }))
  })

  it('rejects a bad currency on create', async () => {
    readBody.mockResolvedValueOnce({ chatId: '5', currency: 'XXX', kind: 'bestBuy', op: '>=', target: 41 })
    linkUser('u1')
    await expect(alertCreateH({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- tests/unit/api-telegram-account.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`app/server/utils/telegramUser.ts`:

```ts
import { UserModel } from '../models/User'

export async function userByChat(chatId: string): Promise<{ uid: string } | null> {
  const u = await UserModel.findOne({ telegramChatId: chatId }).lean().exec()
  return u ? { uid: String((u as any)._id) } : null
}
```

`app/server/api/telegram/alerts.get.ts`:

```ts
import { requireBotSecret } from '../../utils/telegramAuth'
import { connectDb } from '../../utils/db'
import { userByChat } from '../../utils/telegramUser'
import { AlertModel } from '../../models/Alert'

export default defineEventHandler(async event => {
  requireBotSecret(event)
  const chatId = String(getQuery(event).chatId ?? '')
  await connectDb()
  const user = await userByChat(chatId)
  if (!user) return { linked: false }
  const alerts = await AlertModel.find({ uid: user.uid }).lean().exec()
  return { linked: true, alerts }
})
```

`app/server/api/telegram/favorites.get.ts`:

```ts
import { requireBotSecret } from '../../utils/telegramAuth'
import { connectDb } from '../../utils/db'
import { userByChat } from '../../utils/telegramUser'
import { FavoriteModel } from '../../models/Favorite'

export default defineEventHandler(async event => {
  requireBotSecret(event)
  const chatId = String(getQuery(event).chatId ?? '')
  await connectDb()
  const user = await userByChat(chatId)
  if (!user) return { linked: false }
  const favorites = await FavoriteModel.find({ uid: user.uid }).lean().exec()
  return { linked: true, favorites }
})
```

`app/server/api/telegram/alert.post.ts`:

```ts
import { requireBotSecret } from '../../utils/telegramAuth'
import { connectDb } from '../../utils/db'
import { userByChat } from '../../utils/telegramUser'
import { AlertModel } from '../../models/Alert'

const CURRENCIES = ['USD', 'EUR', 'BRL', 'ARS']
const KINDS = ['bestBuy', 'bestSell']
const OPS = ['<', '>', '<=', '>=']

export default defineEventHandler(async event => {
  requireBotSecret(event)
  const b = await readBody(event)
  const chatId = String(b?.chatId ?? '')
  const currency = String(b?.currency ?? '')
  const kind = String(b?.kind ?? '')
  const op = String(b?.op ?? '')
  const target = Number(b?.target)
  if (!CURRENCIES.includes(currency) || !KINDS.includes(kind) || !OPS.includes(op) || !Number.isFinite(target)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid alert' })
  }
  await connectDb()
  const user = await userByChat(chatId)
  if (!user) return { linked: false }
  const alert = await AlertModel.create({
    uid: user.uid,
    currency,
    kind,
    op,
    target,
    origin: 'any',
    channels: { push: false, email: false, telegram: true },
  })
  return { ok: true, alert }
})
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- tests/unit/api-telegram-account.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add app/server/api/telegram/alerts.get.ts app/server/api/telegram/favorites.get.ts app/server/api/telegram/alert.post.ts app/server/utils/telegramUser.ts app/tests/unit/api-telegram-account.test.ts
git commit -m "feat(telegram): internal account API — alerts, favorites, create alert"
```

---

## Task 10: Bot — account commands

**Files:**
- Modify: `bots/src/commands/router.ts`, `bots/src/entries/telegram.ts`
- Test: `bots/test/account_commands.test.ts`

**Interfaces:**
- Consumes: `AppClient`.
- Produces: command handlers for `misalertas`, `favoritos`, `alerta`, `desvincular` that call `AppClient` and return a formatted text reply. Pure formatters `formatAlerts(list)`, `formatFavorites(list)` (testable).

- [ ] **Step 1: Write the failing test**

`bots/test/account_commands.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatAlerts, parseAlertCommand } from '../src/commands/account.js'

describe('account command helpers', () => {
  it('formats an alert list', () => {
    const txt = formatAlerts([{ currency: 'USD', kind: 'bestBuy', op: '>=', target: 41, active: true }])
    expect(txt).toContain('USD')
    expect(txt).toContain('41')
  })

  it('parses "/alerta USD compra 41"', () => {
    expect(parseAlertCommand(['USD', 'compra', '41'])).toEqual({
      currency: 'USD', kind: 'bestBuy', op: '>=', target: 41,
    })
  })

  it('returns null for a malformed command', () => {
    expect(parseAlertCommand(['nope'])).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run (in `bots/`): `npm run test -- test/account_commands.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`bots/src/commands/account.ts`:

```ts
import type { AlertSpec } from '../store/app_client.js'

export function formatAlerts(alerts: Array<any>): string {
  if (!alerts.length) return 'No tenés alertas. Creá una con /alerta USD compra 41'
  return alerts
    .map(a => `• ${a.currency} ${a.kind === 'bestBuy' ? 'compra' : 'venta'} ${a.op} ${a.target} ${a.active ? '🟢' : '⚪️'}`)
    .join('\n')
}

export function formatFavorites(favs: Array<any>): string {
  if (!favs.length) return 'No tenés favoritos guardados.'
  return favs.map(f => `⭐ ${f.label || f.key}`).join('\n')
}

/** Parse `/alerta USD compra 41` → AlertSpec, or null. */
export function parseAlertCommand(args: string[]): AlertSpec | null {
  if (args.length < 3) return null
  const currency = args[0]!.toUpperCase()
  const side = args[1]!.toLowerCase()
  const target = Number(args[2])
  if (!['USD', 'EUR', 'BRL', 'ARS'].includes(currency)) return null
  if (!Number.isFinite(target)) return null
  if (side.startsWith('compra')) return { currency, kind: 'bestBuy', op: '>=', target }
  if (side.startsWith('venta')) return { currency, kind: 'bestSell', op: '<=', target }
  return null
}
```

In `bots/src/entries/telegram.ts`, in the `bot.on('text')` handler, before the generic `handleCommand`, intercept account commands when `app` is configured:

```ts
    if (app && ['misalertas', 'favoritos', 'alerta', 'desvincular'].includes(cmd)) {
      const id = String(ctx.chat.id)
      let text = 'Vinculá tu cuenta en cambio-uruguay.com/cuenta'
      if (cmd === 'misalertas') {
        const r = await app.alerts(id)
        text = r.linked ? formatAlerts(r.alerts) : text
      } else if (cmd === 'favoritos') {
        const r = await app.favorites(id)
        text = r.linked ? formatFavorites(r.favorites) : text
      } else if (cmd === 'desvincular') {
        await app.unlink(id)
        text = 'Cuenta desvinculada.'
      } else if (cmd === 'alerta') {
        const spec = parseAlertCommand(args)
        if (!spec) text = 'Formato: /alerta USD compra 41'
        else {
          const r = await app.createAlert(id, spec)
          text = r.ok ? `✅ Alerta creada: ${spec.currency} ${spec.op} ${spec.target}` : (r.linked === false ? text : 'No se pudo crear.')
        }
      }
      await ctx.reply(text)
      return
    }
```

(Import `formatAlerts, formatFavorites, parseAlertCommand` from `../commands/account.js`. Add the four commands to the `COMMANDS` list with descriptions.)

- [ ] **Step 4: Run — expect PASS**

Run (in `bots/`): `npm run test -- test/account_commands.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add bots/src/commands/account.ts bots/src/entries/telegram.ts bots/test/account_commands.test.ts
git commit -m "feat(telegram-bot): account commands — /misalertas /favoritos /alerta /desvincular"
```

---

## PHASE 3 — Daily personalized summary

## Task 11: buildSummary + telegram:summary task

**Files:**
- Create: `app/server/utils/telegramSummary.ts`, `app/server/tasks/telegram/summary.ts`
- Modify: `app/nuxt.config.ts` (scheduledTasks)
- Test: `app/tests/unit/telegram-summary.test.ts`

**Interfaces:**
- Consumes: `connectDb`, `UserModel`, `FavoriteModel`, `fetchCurrentRates`, `bestRateFor`, `sendTelegram`.
- Produces: `buildSummary(favorites: Array<{type,key,label}>, rates: any[]): string` (pure); a task `telegram:summary` iterating linked users.

- [ ] **Step 1: Write the failing test**

`app/tests/unit/telegram-summary.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildSummary } from '../../server/utils/telegramSummary'

describe('buildSummary', () => {
  it('greets and lists favorite casas', () => {
    const txt = buildSummary([{ type: 'casa', key: 'brou', label: 'BROU' }], [])
    expect(txt).toContain('BROU')
  })

  it('handles no favorites gracefully', () => {
    expect(buildSummary([], [])).toContain('favoritos')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- tests/unit/telegram-summary.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`app/server/utils/telegramSummary.ts`:

```ts
export function buildSummary(
  favorites: Array<{ type: string; key: string; label?: string }>,
  _rates: any[]
): string {
  if (!favorites.length) {
    return 'Buen día 👋 Todavía no marcaste favoritos. Guardá tus casas en cambio-uruguay.com/cuenta.'
  }
  const lines = favorites.map(f => `⭐ ${f.label || f.key}`).join('\n')
  return `Buen día 👋 Tus favoritos:\n${lines}\n\nVer cotizaciones: cambio-uruguay.com`
}
```

`app/server/tasks/telegram/summary.ts`:

```ts
import { connectDb } from '../../utils/db'
import { UserModel } from '../../models/User'
import { FavoriteModel } from '../../models/Favorite'
import { fetchCurrentRates } from '../../utils/rates'
import { sendTelegram } from '../../utils/telegram'
import { buildSummary } from '../../utils/telegramSummary'

export default defineTask({
  meta: { name: 'telegram:summary', description: 'Daily personalized Telegram summary for linked users' },
  async run() {
    await connectDb()
    const users = await UserModel.find({ telegramChatId: { $ne: null } }).lean().exec()
    if (!users.length) return { result: { sent: 0 } }
    const rates = await fetchCurrentRates().catch(() => [])
    let sent = 0
    for (const u of users as any[]) {
      const favs = await FavoriteModel.find({ uid: u._id }).lean().exec()
      const ok = await sendTelegram(u.telegramChatId, buildSummary(favs as any, rates))
      if (ok) sent++
    }
    return { result: { sent } }
  },
})
```

In `app/nuxt.config.ts` `scheduledTasks` add:

```ts
      // 11:00 UTC = 08:00 Uruguay: personalized Telegram summary for linked users.
      '0 11 * * *': ['telegram:summary'],
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- tests/unit/telegram-summary.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/telegramSummary.ts app/server/tasks/telegram/summary.ts app/nuxt.config.ts app/tests/unit/telegram-summary.test.ts
git commit -m "feat(telegram): daily personalized summary task"
```

---

## Task 12: Final verification + docs

- [ ] **Step 1: Full suite + typecheck**

Run: `npm run test` (app) → all pass.
Run: `npm run typecheck` (app) → no new errors.
Run (bots): `npm run test` → pass.

- [ ] **Step 2: Document env in `app/AUTH_README.md`**

Append a "Telegram linking" section listing `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_BOT_SECRET` (app) and `TELEGRAM_BOT_SECRET` + `APP_BASE_URL` (bot), the bot username deep-link format, and the internal-API secret model.

- [ ] **Step 3: Commit**

```bash
git add app/AUTH_README.md
git commit -m "docs(telegram): account-linking setup notes"
```

---

## Self-Review

**Spec coverage:**
- Linking flow (code → deep link → bot → set chatId) → Tasks 1,2,4,5,7. ✓
- Data (`telegramChatId`, `channels.telegram`, `TelegramLink` TTL) → Task 1. ✓
- `sendTelegram` + `requireBotSecret` + `makeLinkCode` → Tasks 2,3. ✓
- User API (link-code/status/unlink) → Task 4. ✓
- Internal API (link/unlink/alerts/favorites/alert, secret) → Tasks 5,9. ✓
- Alerts Telegram channel → Task 6. ✓
- UI (link button, alert checkbox) → Task 8. ✓
- Bot `/start` + account commands + create → Tasks 7,10. ✓
- Daily summary → Task 11. ✓
- Config/env + docs → Tasks 3,7,12. ✓
- Security (secret gate, single-use TTL codes) → Tasks 2,5,9 + Global Constraints. ✓

**Placeholder scan:** All steps contain complete code. Task 8 UI is validated by typecheck + manual (consistent with the repo's Nuxt-free unit boundary).

**Type consistency:** `telegramChatId` (string|null), `channels.telegram` (boolean), `AppClient` method names, `AlertSpec`, `requireBotSecret`, `sendTelegram(chatId,text)`, `userByChat(chatId)→{uid}` consistent across tasks. The `x-telegram-secret` header + `runtimeConfig.telegram.secret` match between Task 2 (guard) and Task 7 (client). Cron `telegram:summary` name matches between Task 11 task + config.
