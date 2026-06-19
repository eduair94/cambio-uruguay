# Telegram Login Widget — One-Click Account Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in user link Telegram in one click via the Telegram Login Widget (verified server-side), keeping the existing code flow as a fallback.

**Architecture:** A pure `verifyTelegramAuth` helper validates the widget's signed payload (HMAC-SHA256 with `secret = SHA256(bot_token)`); a new authed endpoint `POST /api/me/telegram/link-widget` verifies it and writes `telegramChatId`; `TelegramLink.vue` renders the widget client-only and POSTs the payload via `authFetch`. The bot username is exposed as public runtime config.

**Tech Stack:** Nuxt 3, Vue 3 (script setup), Vuetify 3, @nuxtjs/i18n, Firebase auth (server `requireUser`), MongoDB (Mongoose `UserModel`), Vitest (node env), node:crypto.

## Global Constraints

- Reuse the existing `telegramChatId` field and the `TelegramLink` status/unlink endpoints + `tg.*` i18n block — do not duplicate.
- The bot token for HMAC verification comes from `runtimeConfig.telegram.token` (server-only); never expose it to the client.
- HMAC compare must be timing-safe; `auth_date` freshness enforced (default 86400 s).
- i18n key parity across es/en/pt is mandatory.
- Curated Vuetify registry: every component used in a template must be registered in `app/plugins/vuetify.ts` (TelegramLink.vue already uses VCard/VBtn/VChip/VIcon/VProgressCircular — all registered). Widget mounting is client-only (no SSR/hydration of the Telegram script).
- Vitest runs in the **node** environment; server-handler tests use `app/tests/unit/helpers/nitro.ts` `installNitroGlobals()` and `vi.mock` for utils/models (see existing `api-profile.test.ts` / `api-telegram-account.test.ts`).

---

## File Structure

- `app/server/utils/telegramAuth.ts` (modify) — add pure `verifyTelegramAuth`; keep `requireBotSecret`.
- `app/tests/unit/telegram-auth-verify.test.ts` (create) — unit tests for `verifyTelegramAuth`.
- `app/server/api/me/telegram/link-widget.post.ts` (create) — authed endpoint that verifies + links.
- `app/tests/unit/api-telegram-link-widget.test.ts` (create) — endpoint tests.
- `app/nuxt.config.ts` (modify, `runtimeConfig.public` ~line 548) — add `telegramBotUsername`.
- `app/i18n/locales/json/{es,en,pt}.json` (modify) — add `tg` keys.
- `app/components/account/TelegramLink.vue` (modify) — render the widget; collapse the code flow to a fallback.

---

### Task 1: `verifyTelegramAuth` pure helper + tests

**Files:**
- Modify: `app/server/utils/telegramAuth.ts`
- Test: `app/tests/unit/telegram-auth-verify.test.ts`

**Interfaces:**
- Consumes: nothing (pure, `node:crypto`).
- Produces:
  - `interface TelegramAuthData { id: number|string; auth_date: number|string; hash: string; first_name?: string; last_name?: string; username?: string; photo_url?: string; [k: string]: unknown }`
  - `verifyTelegramAuth(data: TelegramAuthData, botToken: string, maxAgeSeconds?: number, now?: number): boolean`

- [ ] **Step 1: Write the failing tests**

Create `app/tests/unit/telegram-auth-verify.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createHash, createHmac } from 'node:crypto'
import { verifyTelegramAuth, type TelegramAuthData } from '../../server/utils/telegramAuth'

const TOKEN = '123456:TEST_BOT_TOKEN_abcdef'

// Compute a valid Telegram widget hash the same way Telegram does, so the test
// is self-consistent without a live bot.
function sign(data: Record<string, unknown>, token: string): string {
  const dcs = Object.keys(data)
    .filter(k => k !== 'hash' && data[k] != null)
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('\n')
  const secret = createHash('sha256').update(token).digest()
  return createHmac('sha256', secret).update(dcs).digest('hex')
}

function validPayload(now = Math.floor(Date.now() / 1000)): TelegramAuthData {
  const base = {
    id: 4242,
    first_name: 'Ada',
    username: 'ada',
    auth_date: now,
  }
  return { ...base, hash: sign(base, TOKEN) }
}

describe('verifyTelegramAuth', () => {
  it('accepts a correctly signed, fresh payload', () => {
    expect(verifyTelegramAuth(validPayload(), TOKEN)).toBe(true)
  })

  it('rejects a tampered field (id changed after signing)', () => {
    const p = validPayload()
    p.id = 9999
    expect(verifyTelegramAuth(p, TOKEN)).toBe(false)
  })

  it('rejects a wrong/garbage hash', () => {
    const p = validPayload()
    p.hash = 'deadbeef'
    expect(verifyTelegramAuth(p, TOKEN)).toBe(false)
  })

  it('rejects a missing hash', () => {
    const p = validPayload() as any
    delete p.hash
    expect(verifyTelegramAuth(p, TOKEN)).toBe(false)
  })

  it('rejects a stale auth_date beyond maxAgeSeconds', () => {
    const old = Math.floor(Date.now() / 1000) - 100_000
    expect(verifyTelegramAuth(validPayload(old), TOKEN)).toBe(false)
  })

  it('accepts a stale auth_date when within an explicit larger window', () => {
    const old = Math.floor(Date.now() / 1000) - 100_000
    expect(verifyTelegramAuth(validPayload(old), TOKEN, 200_000)).toBe(true)
  })

  it('rejects when the bot token is empty', () => {
    expect(verifyTelegramAuth(validPayload(), '')).toBe(false)
  })

  it('is signed with a DIFFERENT token -> rejected', () => {
    expect(verifyTelegramAuth(validPayload(), 'other:token')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app; npx vitest run tests/unit/telegram-auth-verify.test.ts`
Expected: FAIL — `verifyTelegramAuth` is not exported.

- [ ] **Step 3: Implement `verifyTelegramAuth`**

In `app/server/utils/telegramAuth.ts`, add the import at the top and the new export below the existing `requireBotSecret` (leave `requireBotSecret` unchanged):

```ts
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export interface TelegramAuthData {
  id: number | string
  auth_date: number | string
  hash: string
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  [k: string]: unknown
}

/**
 * Verify a Telegram Login Widget payload.
 * Rebuilds the data-check-string (all fields except `hash`, non-null, sorted,
 * `key=value` joined by '\n'), derives `secret = SHA256(botToken)`, and
 * timing-safe-compares HMAC-SHA256(dcs, secret) to `data.hash`. Also enforces
 * that `auth_date` is no older than `maxAgeSeconds`.
 */
export function verifyTelegramAuth(
  data: TelegramAuthData,
  botToken: string,
  maxAgeSeconds = 86400,
  now: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!botToken || !data || typeof data.hash !== 'string' || data.hash.length === 0) return false

  const authDate = Number(data.auth_date)
  if (!Number.isFinite(authDate) || now - authDate > maxAgeSeconds) return false

  const dcs = Object.keys(data)
    .filter(k => k !== 'hash' && data[k] != null)
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('\n')

  const secret = createHash('sha256').update(botToken).digest()
  const expected = createHmac('sha256', secret).update(dcs).digest('hex')

  const a = Buffer.from(data.hash, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app; npx vitest run tests/unit/telegram-auth-verify.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/telegramAuth.ts app/tests/unit/telegram-auth-verify.test.ts
git commit -m "feat(telegram): verifyTelegramAuth login-widget HMAC check (tested)"
```

---

### Task 2: `link-widget` authed endpoint + tests

**Files:**
- Create: `app/server/api/me/telegram/link-widget.post.ts`
- Test: `app/tests/unit/api-telegram-link-widget.test.ts`

**Interfaces:**
- Consumes from Task 1: `verifyTelegramAuth(data, token)`.
- Consumes existing: `requireUser(event) -> { uid }` (`app/server/utils/auth.ts`), `connectDb()` (`app/server/utils/db.ts`), `UserModel` (`app/server/models/User.ts`).
- Produces: `POST /api/me/telegram/link-widget` returning `{ ok: true, linked: true, username: string|null }`.

- [ ] **Step 1: Write the failing tests**

Create `app/tests/unit/api-telegram-link-widget.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const verifyTelegramAuth = vi.fn()
const updateOne = vi.fn()

vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/telegramAuth', () => ({ verifyTelegramAuth }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/models/User', () => ({ UserModel: { updateOne } }))

const { readBody } = installNitroGlobals()
vi.stubGlobal('useRuntimeConfig', () => ({ telegram: { token: 'tok' } }))

const handler = (await import('../../server/api/me/telegram/link-widget.post')).default

beforeEach(() => {
  ;[requireUser, verifyTelegramAuth, updateOne, readBody].forEach(m => m.mockReset())
  updateOne.mockResolvedValue({ acknowledged: true })
})

describe('POST /api/me/telegram/link-widget', () => {
  it('propagates a 401 from requireUser', async () => {
    requireUser.mockRejectedValueOnce(Object.assign(new Error('no'), { statusCode: 401 }))
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects an invalid signature with 400', async () => {
    requireUser.mockResolvedValueOnce({ uid: 'u1' })
    readBody.mockResolvedValueOnce({ id: 5, auth_date: 1, hash: 'bad' })
    verifyTelegramAuth.mockReturnValueOnce(false)
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 400 })
    expect(updateOne).not.toHaveBeenCalled()
  })

  it('links telegramChatId on a valid payload', async () => {
    requireUser.mockResolvedValueOnce({ uid: 'u1' })
    readBody.mockResolvedValueOnce({ id: 4242, username: 'ada', auth_date: 1, hash: 'ok' })
    verifyTelegramAuth.mockReturnValueOnce(true)
    const res = await handler({} as any)
    expect(verifyTelegramAuth).toHaveBeenCalledWith(
      expect.objectContaining({ id: 4242 }),
      'tok'
    )
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'u1' },
      { $set: { telegramChatId: '4242' } }
    )
    expect(res).toEqual({ ok: true, linked: true, username: 'ada' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app; npx vitest run tests/unit/api-telegram-link-widget.test.ts`
Expected: FAIL — handler module does not exist.

- [ ] **Step 3: Implement the endpoint**

Create `app/server/api/me/telegram/link-widget.post.ts`:

```ts
import { requireUser } from '../../../utils/auth'
import { verifyTelegramAuth, type TelegramAuthData } from '../../../utils/telegramAuth'
import { connectDb } from '../../../utils/db'
import { UserModel } from '../../../models/User'

// Link the logged-in user's Telegram account from a verified Login Widget
// payload. The widget's `id` is the user's private chat id, so it maps onto the
// same `telegramChatId` field the code flow writes.
export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)

  const token = useRuntimeConfig().telegram?.token
  if (!token) {
    throw createError({ statusCode: 503, statusMessage: 'Telegram not configured' })
  }

  const body = (await readBody(event)) as TelegramAuthData
  if (!verifyTelegramAuth(body, token)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid telegram signature' })
  }

  await connectDb()
  await UserModel.updateOne({ _id: uid }, { $set: { telegramChatId: String(body.id) } })

  return { ok: true, linked: true, username: (body.username as string) ?? null }
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app; npx vitest run tests/unit/api-telegram-link-widget.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `cd app; npx vitest run`
Expected: PASS — prior total + 11 new (8 from Task 1 + 3 here).

- [ ] **Step 6: Commit**

```bash
git add app/server/api/me/telegram/link-widget.post.ts app/tests/unit/api-telegram-link-widget.test.ts
git commit -m "feat(telegram): authed link-widget endpoint (verify + set telegramChatId)"
```

---

### Task 3: Public bot-username config + i18n keys

**Files:**
- Modify: `app/nuxt.config.ts` (`runtimeConfig.public`, ~line 548)
- Modify: `app/i18n/locales/json/{es,en,pt}.json` (existing `tg` block)

**Interfaces:**
- Produces: `useRuntimeConfig().public.telegramBotUsername` (string); i18n keys `tg.widgetHint`, `tg.useCode`.

- [ ] **Step 1: Add the public config key**

In `app/nuxt.config.ts`, inside `runtimeConfig.public` (the object starting ~line 548 with `siteUrl`), add after `apiBase`:

```ts
      // Telegram bot username (public) for the Login Widget on /cuenta.
      telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || '',
```

- [ ] **Step 2: Add i18n keys to all three locales (identical keys)**

In `app/i18n/locales/json/es.json`, inside the existing `"tg"` block, add:

```json
    "widgetHint": "Vinculá tu cuenta con un clic usando Telegram",
    "useCode": "o vincular con un código"
```

In `app/i18n/locales/json/en.json`, inside `"tg"`:

```json
    "widgetHint": "Link your account in one click with Telegram",
    "useCode": "or link with a code"
```

In `app/i18n/locales/json/pt.json`, inside `"tg"`:

```json
    "widgetHint": "Vincule sua conta com um clique usando o Telegram",
    "useCode": "ou vincular com um código"
```

(Place each block after an existing `tg` key; mind trailing commas so the JSON stays valid.)

- [ ] **Step 3: Verify config + i18n parity**

Run: `cd app; npx vitest run`
Expected: PASS, including the i18n-parity test (the three new keys exist in es/en/pt).

- [ ] **Step 4: Commit**

```bash
git add app/nuxt.config.ts app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(telegram): public bot-username config + widget i18n keys"
```

---

### Task 4: Render the Login Widget in `TelegramLink.vue`

**Files:**
- Modify: `app/components/account/TelegramLink.vue`

**Interfaces:**
- Consumes from Task 2: `POST /api/me/telegram/link-widget` (body = widget user payload).
- Consumes from Task 3: `useRuntimeConfig().public.telegramBotUsername`, i18n `tg.widgetHint`/`tg.useCode`/`tg.linkedOk`.
- Consumes existing: `useAuthFetch().authFetch`, the component's existing `linked`/`busy`/`deepLink`/`refresh()`/`startLink()`/`unlink()`.

- [ ] **Step 1: Read the current component**

Read `app/components/account/TelegramLink.vue` fully to anchor edits. It already exposes `linked`, `busy`, `deepLink`, `refresh()`, `startLink()` (code flow), `unlink()`, and a poll. Keep all of that.

- [ ] **Step 2: Add the widget container + a collapsible code fallback to the template**

In the `<template>`, for the **unlinked** state, replace the single "link" button area so the Telegram widget is primary and the existing code flow is behind a toggle. Add a container ref `tgWidget` and a `showCode` toggle. Concretely, replace the existing `<VBtn v-else color="info" ... @click="startLink">{{ $t('tg.link') }}</VBtn>` and the `deepLink` block with:

```html
      <div v-else class="d-flex flex-column ga-2" style="min-width: 220px">
        <div class="text-caption text-grey">{{ $t('tg.widgetHint') }}</div>
        <ClientOnly>
          <div ref="tgWidget" class="tg-widget"></div>
        </ClientOnly>
        <VBtn
          variant="text"
          size="small"
          color="info"
          class="align-self-start px-1"
          @click="toggleCode"
        >
          {{ $t('tg.useCode') }}
        </VBtn>
        <div v-if="showCode">
          <VBtn
            color="info"
            variant="tonal"
            size="small"
            :loading="busy"
            @click="startLink"
          >
            {{ $t('tg.link') }}
          </VBtn>
          <div v-if="deepLink" class="mt-3">
            <VBtn
              :href="deepLink"
              target="_blank"
              color="info"
              variant="flat"
              size="small"
              prepend-icon="mdi-open-in-new"
            >
              {{ $t('tg.open') }}
            </VBtn>
            <div class="text-caption text-grey mt-2 d-flex align-center">
              <VProgressCircular indeterminate size="14" width="2" class="me-2" />
              {{ $t('tg.waiting') }}
            </div>
          </div>
        </div>
      </div>
```

(Remove the now-duplicated standalone `deepLink` block that lived outside this branch, so the code flow only renders under `showCode`.)

- [ ] **Step 3: Add the widget mount + auth callback to `<script setup>`**

Add near the other refs:

```ts
const config = useRuntimeConfig().public as { telegramBotUsername?: string }
const tgWidget = ref<HTMLElement | null>(null)
const showCode = ref(false)
function toggleCode() {
  showCode.value = !showCode.value
}

// Telegram Login Widget: inject the script with our bot + an onauth callback.
function mountWidget() {
  if (!import.meta.client) return
  const username = config.telegramBotUsername
  if (!username || !tgWidget.value || tgWidget.value.childElementCount > 0) return

  ;(window as any).onTelegramAuth = async (user: Record<string, unknown>) => {
    try {
      await authFetch('/api/me/telegram/link-widget', { method: 'POST', body: user })
      await refresh()
    } catch {
      /* keep the card unlinked; the user can retry or use the code flow */
    }
  }

  const s = document.createElement('script')
  s.async = true
  s.src = 'https://telegram.org/js/telegram-widget.js?22'
  s.setAttribute('data-telegram-login', username)
  s.setAttribute('data-size', 'large')
  s.setAttribute('data-radius', '8')
  s.setAttribute('data-request-access', 'write')
  s.setAttribute('data-onauth', 'onTelegramAuth(user)')
  tgWidget.value.appendChild(s)
}
```

Then ensure it mounts after the unlinked state is known. The component already has an `onMounted` that calls `refresh()`; after that initial `refresh()` resolves, call `mountWidget()`. Add a watcher so it also mounts if `linked` flips to false and the container appears:

```ts
watch([linked, tgWidget], () => {
  if (!linked.value) mountWidget()
})
```

(If the component's existing `onMounted` is `onMounted(refresh)`, change it to `onMounted(async () => { await refresh(); mountWidget() })`. Keep the existing poll/unlink logic intact.)

- [ ] **Step 4: Scoped style (optional, keep minimal)**

In the component `<style scoped>` (add one if absent):

```css
.tg-widget {
  min-height: 40px;
}
```

- [ ] **Step 5: Verify build + the existing test suite**

Run: `cd app; npx vitest run`
Expected: PASS (no unit test covers this Vue component directly; this confirms no import/typing breakage elsewhere).
Run: `cd app; npx nuxt build 2>&1 | Select-String -Pattern "error" -SimpleMatch | Select-Object -First 5`
Expected: no build errors (the page compiles; the widget is client-only).

- [ ] **Step 6: Commit**

```bash
git add app/components/account/TelegramLink.vue
git commit -m "feat(telegram): one-click Login Widget on the account link card (code flow as fallback)"
```

---

## Plan Verification (after all tasks)

1. `cd app; npx vitest run` — full suite green (Task 1 +8, Task 2 +3, i18n parity covers Task 3).
2. `cd app; npx nuxt build` — clean build.
3. Manual (prod, bot domain already set via @BotFather `/setdomain`):
   - Log in on `/cuenta`; the "Log in with Telegram" widget renders. Click it → authorize (grant write access) → the card flips to "linked" without a code.
   - Trigger a test alert/summary and confirm the bot DMs the user.
   - Verify the "or link with a code" fallback still works (generate code → `/start <code>`), and unlink still works.

---

## Self-Review

**Spec coverage:**
- Unit 1 `verifyTelegramAuth` (pure, tested) → Task 1. ✅
- Unit 2 `link-widget` authed endpoint → Task 2. ✅
- Unit 3 client widget + code fallback → Task 4. ✅
- Unit 4 public bot-username config → Task 3. ✅
- Unit 5 i18n keys → Task 3. ✅
- Testing (unit verify + endpoint) → Tasks 1-2; manual → Plan Verification. ✅
- Constraints (reuse telegramChatId/status/unlink, server-only token, timing-safe, parity, client-only widget) → enforced in tasks + Global Constraints. ✅

**Placeholder scan:** none — every code step is complete.

**Type consistency:** `verifyTelegramAuth(data, botToken, maxAgeSeconds?, now?)` and `TelegramAuthData` are identical across Tasks 1, 2, and the tests. `telegramBotUsername` (config) and `tg.widgetHint`/`tg.useCode` (i18n) are identical across Tasks 3 and 4. The endpoint writes `telegramChatId` (string) — the same field `link.post.ts` already uses, so status/unlink are untouched. `onTelegramAuth(user)` global name matches the `data-onauth` attribute value.
