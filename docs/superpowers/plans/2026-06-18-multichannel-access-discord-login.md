# Multi-channel access hub + Telegram newsletter + Discord login — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface every access channel on a `/conectar` hub, let Telegram-linked users receive the daily newsletter over Telegram, and add "Sign in with Discord".

**Architecture:** Nuxt 3 app (`app/`). Part A is presentational (a page, a shared component, footer/header links, i18n). Part B extends the uid-keyed `UserModel` with newsletter prefs, adds an authed `/api/me/newsletter` endpoint, and a Telegram send loop in the existing `newsletter:daily` Nitro task reusing `buildDigestData`. Part C is server-side Discord OAuth2 (`/api/auth/discord/{start,callback}`) that mints a Firebase **custom token** via Firebase Admin, consumed client-side by `signInWithCustomToken`.

**Tech Stack:** Nuxt 3 / Nitro, Vue 3 + Vuetify 3, Pinia, `@nuxtjs/i18n`, Firebase Web SDK + Firebase Admin, Mongoose, Vitest. Native `fetch` for Discord (no new deps).

## Global Constraints

- Spanish (`es`) is the default locale; **every** new user-facing string must be added to all three locales: `i18n/locales/es.ts`, `en.ts`, `pt.ts`.
- Server-only secrets live in `runtimeConfig` (never `runtimeConfig.public`). Discord client secret is server-only.
- Reuse existing utils: `requireUser(event) → { uid, email }` (`server/utils/auth.ts`), `adminAuth(): Auth` (`server/utils/firebaseAdmin.ts`), `sendTelegram(chatId, text): Promise<boolean>` (`server/utils/telegram.ts`), `buildDigestData(lang): Promise<DigestData>` (`server/utils/newsletter.ts`), `useAuthFetch()` client composable.
- `DigestData = { date: string; currencies: DigestCurrency[]; news: DigestNews[]; ai: string }`; `DigestCurrency = { code: string; bestSellRate: number; changePct: number; bestBuyHouse: string }`; `DigestNews = { title: string; link: string; source: string }`.
- MCP public endpoint: `https://mcp.cambio-uruguay.com/mcp`. Telegram bot: `https://t.me/cambio_uruguay_bot`. Telegram channel: `https://t.me/cambio_uruguay`.
- No un-gating of alerts/favorites. No Discord bot work (login + optional invite only).
- Commands run from `app/` unless noted. Tests: `npm run test` (vitest), lint: `npm run lint`.

---

## File Structure

**Part A**
- Create `app/components/McpConfigCard.vue` — shared MCP client-config card (npm/GitHub/copyable config).
- Modify `app/pages/acerca.vue` — consume `McpConfigCard` (remove inline duplication).
- Create `app/pages/conectar.vue` — channel hub page.
- Modify `app/components/Footer.vue` — add channel/MCP/Discord icons + nav link.
- Modify header/nav component — add "Conectar" entry (locate in Step).
- Modify `app/i18n/locales/{es,en,pt}.ts` — `conectar.*`, `siguenos.*` keys.
- Modify `app/nuxt.config.ts` — `runtimeConfig.public.discordInviteUrl`, sitemap entry.

**Part B**
- Modify `app/server/models/User.ts` — `newsletter: { email, telegram }`.
- Modify `app/server/utils/newsletter.ts` — add `buildDailyTelegram(data, lang)`.
- Create `app/server/api/me/newsletter.get.ts`, `app/server/api/me/newsletter.put.ts`.
- Modify `app/server/tasks/newsletter/daily.ts` — Telegram send loop.
- Create `app/components/account/NewsletterPanel.vue`; modify `app/pages/cuenta.vue` to mount it.
- Test `app/tests/newsletter-telegram.test.ts`.

**Part C**
- Modify `app/nuxt.config.ts` — `runtimeConfig.discord = { clientId, clientSecret, redirectUri }`.
- Modify `app/server/models/User.ts` — `discordId`.
- Create `app/server/utils/discordAuth.ts` — `signState`/`verifyState`, `resolveDiscordUid`.
- Create `app/server/api/auth/discord/start.get.ts`, `app/server/api/auth/discord/callback.get.ts`.
- Modify `app/components/AuthDialog.vue` — Discord button.
- Create `app/plugins/discordToken.client.ts` — consume `?ct=` → `signInWithCustomToken`.
- Test `app/tests/discord-auth.test.ts`.

---

# PART A — Discoverability hub

### Task A1: Shared `McpConfigCard` component

**Files:**
- Create: `app/components/McpConfigCard.vue`
- Modify: `app/pages/acerca.vue` (replace inline MCP block ~lines 170–216 + script ~295–319)
- Test: `app/tests/mcp-config-card.test.ts`

**Interfaces:**
- Produces: `<McpConfigCard />` (no props). Renders npm link `https://www.npmjs.com/package/cambio-uruguay-mcp`, GitHub link `https://github.com/eduair94/cambio-uruguay/tree/main/mcp`, a readonly textarea containing `{"mcpServers":{"cambio-uruguay":{"url":"https://mcp.cambio-uruguay.com/mcp"}}}`, and a copy button.

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/mcp-config-card.test.ts
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import McpConfigCard from '../components/McpConfigCard.vue'

describe('McpConfigCard', () => {
  it('shows the hosted MCP url and npm link', async () => {
    const el = await mountSuspended(McpConfigCard)
    expect(el.html()).toContain('https://mcp.cambio-uruguay.com/mcp')
    expect(el.html()).toContain('cambio-uruguay-mcp')
  })
})
```

> If `@nuxt/test-utils/runtime` + `mountSuspended` is not already used in this repo's tests, instead assert against the rendered config constant by importing a small pure helper. Check `app/tests/` for the existing component-test pattern first; follow whatever is there. If no component-test harness exists, make this a manual-verification task (skip Steps 1–2, verify in browser at Step 4).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- mcp-config-card`
Expected: FAIL (component not found).

- [ ] **Step 3: Create the component**

```vue
<!-- app/components/McpConfigCard.vue -->
<template>
  <VCard variant="outlined" class="pa-4">
    <div class="d-flex align-center ga-2 mb-2">
      <VIcon color="primary">mdi-robot-happy</VIcon>
      <span class="text-subtitle-1 font-weight-bold">{{ t('acerca.mcpTitle') }}</span>
    </div>
    <p class="text-body-2 mb-3">{{ t('acerca.mcpText') }}</p>
    <div class="d-flex flex-wrap ga-2 mb-3">
      <VBtn href="https://www.npmjs.com/package/cambio-uruguay-mcp" target="_blank"
        rel="noopener noreferrer" size="small" variant="tonal" prepend-icon="mdi-npm">
        {{ t('acerca.mcpNpm') }}
      </VBtn>
      <VBtn href="https://github.com/eduair94/cambio-uruguay/tree/main/mcp" target="_blank"
        rel="noopener noreferrer" size="small" variant="tonal" prepend-icon="mdi-github">
        {{ t('acerca.mcpSource') }}
      </VBtn>
    </div>
    <VTextarea :model-value="mcpConfig" readonly rows="4" variant="outlined"
      hide-details class="mb-2 text-mono" :aria-label="t('acerca.mcpTitle')" />
    <VBtn size="small" variant="text" :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'" @click="copy">
      {{ copied ? t('acerca.embedCopied') : t('acerca.embedCopy') }}
    </VBtn>
  </VCard>
</template>

<script setup lang="ts">
const { t } = useI18n()
const mcpConfig = JSON.stringify(
  { mcpServers: { 'cambio-uruguay': { url: 'https://mcp.cambio-uruguay.com/mcp' } } },
  null, 2,
)
const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
const copy = async () => {
  try {
    await navigator.clipboard.writeText(mcpConfig)
    copied.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (copied.value = false), 2000)
  } catch {}
}
onBeforeUnmount(() => timer && clearTimeout(timer))
</script>
```

- [ ] **Step 4: Refactor `acerca.vue` to use the component**

In `app/pages/acerca.vue`, replace the inline MCP `<VCard>`/block (the section under `<!-- MCP server / AI assistants -->`) with `<McpConfigCard />`, and delete the now-unused `mcpConfig`, `copiedMcp`, `copiedMcpTimer`, `copyMcp` from `<script setup>`. Keep the surrounding `<section>`/heading if it carries other copy.

- [ ] **Step 5: Run test + lint**

Run: `npm run test -- mcp-config-card && npm run lint`
Expected: PASS; lint clean.

- [ ] **Step 6: Commit**

```bash
git add app/components/McpConfigCard.vue app/pages/acerca.vue app/tests/mcp-config-card.test.ts
git commit -m "refactor(mcp): extract McpConfigCard shared component from acerca"
```

---

### Task A2: i18n keys for hub + social links

**Files:**
- Modify: `app/i18n/locales/es.ts`, `app/i18n/locales/en.ts`, `app/i18n/locales/pt.ts`

**Interfaces:**
- Produces: i18n keys consumed by A3/A4: `conectar.nav`, `conectar.title`, `conectar.subtitle`, `conectar.web`, `conectar.webText`, `conectar.api`, `conectar.apiText`, `conectar.mcp`, `conectar.mcpText`, `conectar.botTitle`, `conectar.botText`, `conectar.channelTitle`, `conectar.channelText`, `conectar.discord`, `conectar.discordText`, `conectar.discordLogin`, `conectar.discordJoin`, `conectar.newsletter`, `conectar.newsletterText`, `conectar.blog`, `conectar.blogText`, `conectar.open`; `siguenos.channel`, `siguenos.discord`, `siguenos.mcp`.

- [ ] **Step 1: Add keys to `es.ts`**

Locate the existing top-level object. Add (Spanish):

```ts
conectar: {
  nav: 'Conectar',
  title: 'Conectá con Cambio Uruguay',
  subtitle: 'Todas las formas de usar nuestras cotizaciones: web, API, asistentes IA, Telegram, Discord y newsletter.',
  web: 'Sitio web', webText: 'Cotizaciones en vivo y herramientas en el navegador.',
  api: 'API pública', apiText: 'Integrá las cotizaciones en tu app. Documentación OpenAPI.',
  mcp: 'Asistentes IA (MCP)', mcpText: 'Usá las cotizaciones desde Claude, Cursor y otros vía MCP.',
  botTitle: 'Bot de Telegram', botText: 'Consultá el dólar, alertas y resumen desde Telegram.',
  channelTitle: 'Canal de Telegram', channelText: 'Recibí el resumen diario del mercado en el canal.',
  discord: 'Discord', discordText: 'Iniciá sesión con Discord y sumate a la comunidad.',
  discordLogin: 'Iniciar sesión con Discord', discordJoin: 'Unirse al servidor',
  newsletter: 'Newsletter', newsletterText: 'El resumen del dólar en tu correo o Telegram.',
  blog: 'Blog y RSS', blogText: 'Análisis diario del mercado generado con IA.',
  open: 'Abrir',
},
```

And inside the existing `siguenos` object add: `channel: 'Canal de Telegram', discord: 'Discord', mcp: 'Asistentes IA (MCP)'`.

- [ ] **Step 2: Add the same keys to `en.ts`** (English translations) and **`pt.ts`** (Portuguese). Mirror the structure exactly; translate values. No key may be missing in any locale.

- [ ] **Step 3: Typecheck/lint**

Run: `npm run lint`
Expected: clean (locale files are typed objects; missing-key mismatches surface here or in build).

- [ ] **Step 4: Commit**

```bash
git add app/i18n/locales/es.ts app/i18n/locales/en.ts app/i18n/locales/pt.ts
git commit -m "i18n(conectar): add hub + social link strings (es/en/pt)"
```

---

### Task A3: `/conectar` hub page

**Files:**
- Create: `app/pages/conectar.vue`

**Interfaces:**
- Consumes: `McpConfigCard` (A1), `conectar.*` i18n (A2), `runtimeConfig.public.discordInviteUrl` (set in A4 — read defensively, default `''`).

- [ ] **Step 1: Create the page**

```vue
<!-- app/pages/conectar.vue -->
<template>
  <VContainer class="py-8">
    <h1 class="text-h4 font-weight-bold mb-1">{{ t('conectar.title') }}</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">{{ t('conectar.subtitle') }}</p>

    <VRow>
      <VCol v-for="c in cards" :key="c.key" cols="12" sm="6" md="4">
        <VCard variant="outlined" class="pa-4 h-100 d-flex flex-column">
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon :color="c.color">{{ c.icon }}</VIcon>
            <span class="text-subtitle-1 font-weight-bold">{{ c.title }}</span>
          </div>
          <p class="text-body-2 mb-4 flex-grow-1">{{ c.text }}</p>
          <div class="d-flex flex-wrap ga-2">
            <VBtn v-for="(a, i) in c.actions" :key="i" :href="a.href" :to="a.to"
              :target="a.href ? '_blank' : undefined" rel="noopener noreferrer"
              size="small" :variant="i === 0 ? 'flat' : 'tonal'" :color="i === 0 ? c.color : undefined"
              :prepend-icon="a.icon">
              {{ a.label }}
            </VBtn>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <div class="mt-8" style="max-width: 640px">
      <McpConfigCard />
    </div>
  </VContainer>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const invite = (useRuntimeConfig().public as { discordInviteUrl?: string }).discordInviteUrl || ''

const cards = computed(() => [
  { key: 'web', icon: 'mdi-web', color: 'primary', title: t('conectar.web'), text: t('conectar.webText'),
    actions: [{ to: localePath('/'), label: t('conectar.open'), icon: 'mdi-open-in-new' }] },
  { key: 'api', icon: 'mdi-api', color: 'indigo', title: t('conectar.api'), text: t('conectar.apiText'),
    actions: [{ href: 'https://api.cambio-uruguay.com/api-docs', label: t('conectar.open'), icon: 'mdi-open-in-new' }] },
  { key: 'mcp', icon: 'mdi-robot-happy', color: 'deep-purple', title: t('conectar.mcp'), text: t('conectar.mcpText'),
    actions: [{ to: localePath('/acerca'), label: t('conectar.open'), icon: 'mdi-information' }] },
  { key: 'bot', icon: 'mdi-telegram', color: 'info', title: t('conectar.botTitle'), text: t('conectar.botText'),
    actions: [{ href: 'https://t.me/cambio_uruguay_bot', label: t('conectar.open'), icon: 'mdi-open-in-new' }] },
  { key: 'channel', icon: 'mdi-bullhorn', color: 'info', title: t('conectar.channelTitle'), text: t('conectar.channelText'),
    actions: [{ href: 'https://t.me/cambio_uruguay', label: t('conectar.open'), icon: 'mdi-open-in-new' }] },
  { key: 'discord', icon: 'mdi-discord', color: '#5865F2', title: t('conectar.discord'), text: t('conectar.discordText'),
    actions: [
      { href: '/api/auth/discord/start', label: t('conectar.discordLogin'), icon: 'mdi-login' },
      ...(invite ? [{ href: invite, label: t('conectar.discordJoin'), icon: 'mdi-open-in-new' }] : []),
    ] },
  { key: 'newsletter', icon: 'mdi-email-newsletter', color: 'teal', title: t('conectar.newsletter'), text: t('conectar.newsletterText'),
    actions: [{ to: localePath('/newsletter'), label: t('conectar.open'), icon: 'mdi-open-in-new' }] },
  { key: 'blog', icon: 'mdi-rss', color: 'orange', title: t('conectar.blog'), text: t('conectar.blogText'),
    actions: [{ to: localePath('/blog'), label: t('conectar.open'), icon: 'mdi-open-in-new' }] },
])

useSeoMeta({ title: () => t('conectar.title'), description: () => t('conectar.subtitle') })
</script>
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`, open `/conectar` (and `/en/conectar`, `/pt/conectar`). Confirm 8 cards render, Discord card shows only the login button when no invite is configured, MCP config card copy works.

- [ ] **Step 3: Commit**

```bash
git add app/pages/conectar.vue
git commit -m "feat(conectar): channel discoverability hub page"
```

---

### Task A4: Footer + header links, runtimeConfig, sitemap

**Files:**
- Modify: `app/components/Footer.vue`
- Modify: header/primary-nav component (locate — see Step 1)
- Modify: `app/nuxt.config.ts`

- [ ] **Step 1: Locate the header nav**

Run: `grep -rln "localePath('/acerca')\|localePath('/blog')\|NuxtLink" app/components app/layouts | head`
Open the primary navigation component (the one rendering top-level links / app bar). Note its link pattern.

- [ ] **Step 2: Footer — add channel/MCP/Discord icons + nav link**

In `app/components/Footer.vue`, inside the social-icons `<div class="d-flex align-center ga-2">`, after the existing Telegram (bot) button, add:

```vue
<VBtn href="https://t.me/cambio_uruguay" target="_blank" rel="noopener noreferrer"
  :aria-label="$t('siguenos.channel')" :title="$t('siguenos.channel')"
  icon size="small" variant="text" color="white">
  <VIcon>mdi-bullhorn</VIcon>
</VBtn>
<VBtn :href="localePath('/conectar')" :aria-label="$t('siguenos.mcp')" :title="$t('siguenos.mcp')"
  icon size="small" variant="text" color="white">
  <VIcon>mdi-robot-happy</VIcon>
</VBtn>
<VBtn :href="localePath('/conectar')" aria-label="Discord" title="Discord"
  icon size="small" variant="text" color="white">
  <VIcon>mdi-discord</VIcon>
</VBtn>
```

In the footer `<nav>` links, add before `/acerca`:

```vue
<NuxtLink :to="localePath('/conectar')" class="footer-link text-caption">
  {{ $t('conectar.nav') }}
</NuxtLink>
```

- [ ] **Step 3: Header — add Conectar entry**

In the nav component from Step 1, add a link to `localePath('/conectar')` with label `$t('conectar.nav')`, following the existing pattern (same component/prop shape as the neighboring `/acerca` or `/blog` link).

- [ ] **Step 4: runtimeConfig + sitemap in `nuxt.config.ts`**

In `runtimeConfig.public`, add: `discordInviteUrl: process.env.DISCORD_INVITE_URL || '',`.
Add `/conectar` to the sitemap config (follow how existing static routes like `/acerca` are listed; if sitemap auto-discovers pages, no change needed — verify by running build and checking `/sitemap.xml`).

- [ ] **Step 5: Verify + commit**

Run: `npm run lint`; `npm run dev` → confirm footer + header show Conectar and new icons, links resolve.

```bash
git add app/components/Footer.vue app/nuxt.config.ts app/components/<nav-file>.vue
git commit -m "feat(conectar): footer + header links, Telegram channel + Discord + MCP, sitemap"
```

---

# PART B — Newsletter channel choice

### Task B1: `UserModel.newsletter` + `buildDailyTelegram` formatter

**Files:**
- Modify: `app/server/models/User.ts`
- Modify: `app/server/utils/newsletter.ts`
- Test: `app/tests/newsletter-telegram.test.ts`

**Interfaces:**
- Produces: `UserDoc.newsletter: { email: boolean; telegram: boolean }`; `buildDailyTelegram(data: DigestData, lang: NewsletterLang): string` (Markdown for Telegram).

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/newsletter-telegram.test.ts
import { describe, it, expect } from 'vitest'
import { buildDailyTelegram } from '../server/utils/newsletter'
import type { DigestData } from '../server/utils/newsletter'

const data: DigestData = {
  date: '2026-06-18',
  currencies: [
    { code: 'USD', bestSellRate: 40.3, changePct: -0.37, bestBuyHouse: 'Itaú' },
    { code: 'EUR', bestSellRate: 48.47, changePct: 0.12, bestBuyHouse: 'BROU' },
  ],
  news: [{ title: 'Dólar hoy', link: 'https://x', source: 'Infobae' }],
  ai: 'Resumen del mercado.',
}

describe('buildDailyTelegram', () => {
  it('includes date, each currency code, rate and a news item (es)', () => {
    const msg = buildDailyTelegram(data, 'es')
    expect(msg).toContain('2026-06-18')
    expect(msg).toContain('USD')
    expect(msg).toContain('EUR')
    expect(msg).toContain('40,30')
    expect(msg).toContain('Dólar hoy')
  })
  it('renders a down arrow for negative change and up for positive', () => {
    const msg = buildDailyTelegram(data, 'es')
    expect(msg).toContain('🔻')
    expect(msg).toContain('🔺')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- newsletter-telegram`
Expected: FAIL (`buildDailyTelegram` not exported).

- [ ] **Step 3: Implement `buildDailyTelegram`**

Add to `app/server/utils/newsletter.ts` (reuse `NewsletterLang`/`DigestData` already defined there):

```ts
const TG_HEAD: Record<NewsletterLang, string> = {
  es: '📊 *Resumen del dólar* — ', en: '📊 *Daily dollar digest* — ', pt: '📊 *Resumo do dólar* — ',
}
const TG_NEWS: Record<NewsletterLang, string> = { es: '📰 *Noticias*', en: '📰 *News*', pt: '📰 *Notícias*' }

function fmtRate(n: number): string {
  return n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function buildDailyTelegram(data: DigestData, lang: NewsletterLang): string {
  const lines: string[] = [TG_HEAD[lang] + data.date, '']
  for (const c of data.currencies) {
    const arrow = c.changePct > 0 ? '🔺' : c.changePct < 0 ? '🔻' : '▪️'
    const pct = `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}%`
    lines.push(`${arrow} *${c.code}* $ ${fmtRate(c.bestSellRate)} (${pct}) · ${c.bestBuyHouse}`)
  }
  if (data.ai) lines.push('', data.ai)
  if (data.news?.length) {
    lines.push('', TG_NEWS[lang])
    for (const n of data.news.slice(0, 3)) lines.push(`• [${n.title}](${n.link}) — _${n.source}_`)
  }
  lines.push('', 'https://cambio-uruguay.com/newsletter')
  return lines.join('\n')
}
```

- [ ] **Step 4: Add the model field**

In `app/server/models/User.ts`, add to `UserDoc`:
```ts
newsletter: { email: boolean; telegram: boolean }
```
and to the schema (before `telegramChatId`):
```ts
newsletter: {
  email: { type: Boolean, default: false },
  telegram: { type: Boolean, default: false },
},
```

- [ ] **Step 5: Run tests + lint**

Run: `npm run test -- newsletter-telegram && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/server/utils/newsletter.ts app/server/models/User.ts app/tests/newsletter-telegram.test.ts
git commit -m "feat(newsletter): buildDailyTelegram formatter + User.newsletter prefs"
```

---

### Task B2: `/api/me/newsletter` GET + PUT

**Files:**
- Create: `app/server/api/me/newsletter.get.ts`
- Create: `app/server/api/me/newsletter.put.ts`

**Interfaces:**
- Consumes: `requireUser`, `UserModel`, `NewsletterSubscriberModel`, `newToken`/`normalizeEmail` from `newsletter.ts`.
- Produces: `GET → { email: boolean; telegram: boolean; telegramLinked: boolean }`; `PUT { email?: boolean; telegram?: boolean } → { email, telegram, telegramLinked }`.

- [ ] **Step 1: Create GET handler**

```ts
// app/server/api/me/newsletter.get.ts
import { requireUser } from '../../utils/auth'
import { connectDb } from '../../utils/db'
import { UserModel } from '../../models/User'

export default defineEventHandler(async (event) => {
  const { uid } = await requireUser(event)
  await connectDb()
  const u = await UserModel.findById(uid).lean().exec() as any
  return {
    email: Boolean(u?.newsletter?.email),
    telegram: Boolean(u?.newsletter?.telegram),
    telegramLinked: Boolean(u?.telegramChatId),
  }
})
```

- [ ] **Step 2: Create PUT handler**

```ts
// app/server/api/me/newsletter.put.ts
import { requireUser } from '../../utils/auth'
import { connectDb } from '../../utils/db'
import { UserModel } from '../../models/User'
import { NewsletterSubscriberModel } from '../../models/NewsletterSubscriber'
import { normalizeEmail, newToken, normalizeNewsletterLang } from '../../utils/newsletter'

export default defineEventHandler(async (event) => {
  const { uid, email } = await requireUser(event)
  const body = await readBody<{ email?: boolean; telegram?: boolean }>(event)
  await connectDb()
  const u = await UserModel.findById(uid).exec()
  if (!u) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  if (typeof body?.telegram === 'boolean') {
    if (body.telegram && !u.telegramChatId) {
      throw createError({ statusCode: 409, statusMessage: 'telegram-not-linked' })
    }
    u.set('newsletter.telegram', body.telegram)
  }

  if (typeof body?.email === 'boolean') {
    const addr = normalizeEmail(email || u.email || '')
    if (body.email && !addr) {
      throw createError({ statusCode: 422, statusMessage: 'no-email' })
    }
    u.set('newsletter.email', body.email)
    if (addr) {
      if (body.email) {
        await NewsletterSubscriberModel.updateOne(
          { email: addr },
          { $set: { status: 'confirmed', language: normalizeNewsletterLang(u.settings?.locale) },
            $setOnInsert: { email: addr, unsubToken: newToken() } },
          { upsert: true },
        )
      } else {
        await NewsletterSubscriberModel.updateOne({ email: addr }, { $set: { status: 'unsubscribed' } })
      }
    }
  }

  await u.save()
  return {
    email: Boolean(u.get('newsletter.email')),
    telegram: Boolean(u.get('newsletter.telegram')),
    telegramLinked: Boolean(u.telegramChatId),
  }
})
```

> Verify the `NewsletterSubscriber` status enum allows `'confirmed'` and `'unsubscribed'` (open `app/server/models/NewsletterSubscriber.ts`); if the unsubscribed state uses a different value, match it.

- [ ] **Step 3: Manual smoke test**

With dev server running and a logged-in session token, `PUT /api/me/newsletter {"telegram":true}` without a linked Telegram → expect 409; link Telegram then retry → 200 with `telegram:true`. `PUT {"email":true}` → 200 and a confirmed `NewsletterSubscriber` row appears.

- [ ] **Step 4: Commit**

```bash
git add app/server/api/me/newsletter.get.ts app/server/api/me/newsletter.put.ts
git commit -m "feat(newsletter): authed /api/me/newsletter channel prefs endpoint"
```

---

### Task B3: Telegram send loop in `newsletter:daily`

**Files:**
- Modify: `app/server/tasks/newsletter/daily.ts`

**Interfaces:**
- Consumes: `buildDailyTelegram` (B1), `UserModel` (B1), `sendTelegram`, the per-language `digestByLang` map already built in the task.

- [ ] **Step 1: Add imports**

At the top of `daily.ts`, add:
```ts
import { UserModel } from '../../models/User'
import { sendTelegram } from '../../utils/telegram'
import { buildDailyTelegram } from '../../utils/newsletter'
```

- [ ] **Step 2: Add the Telegram loop after the email send loop**

After the existing email loop (and before the function returns), insert:

```ts
// Telegram delivery for linked users who opted in. Reuses the per-language digest.
let telegramSent = 0
const tgUsers = await UserModel.find({ 'newsletter.telegram': true, telegramChatId: { $ne: null } })
  .lean().exec() as any[]
for (const tu of tgUsers) {
  const lang = normalizeNewsletterLang(tu.settings?.locale)
  let digest = digestByLang.get(lang)
  if (!digest) { digest = await buildDigestData(lang); digestByLang.set(lang, digest) }
  const msg = buildDailyTelegram(digest, lang)
  if (dryRun) { console.log(`[DRY_RUN newsletter tg] -> ${tu.telegramChatId}: ${msg.slice(0, 60)}…`); telegramSent++; continue }
  const ok = await sendTelegram(tu.telegramChatId, msg)
  if (ok) telegramSent++
  await sleep(delayMs)
}
```

Then change the success `return` to include the count, e.g. `return { result: { emailsSent: sent, telegramSent } }` (match the variable the task already uses for the email count; if it returns a string, return an object instead).

- [ ] **Step 3: Verify the early-returns still gate Telegram correctly**

The task early-returns `'mailer-not-configured'` when SMTP is absent and `'no-subscribers'` when there are zero email subs. **Telegram delivery should not be blocked by zero email subscribers.** Move the Telegram loop so it runs even when `subs.length === 0`: replace the `if (subs.length === 0) return ...` early return with a guard that skips only the email loop (`if (subs.length > 0) { …email loop… }`), keeping the Telegram loop unconditional. Keep the `isMailerConfigured()` early return as-is (newsletter feature is SMTP-gated overall) **unless** you want Telegram to work without SMTP — for this plan, keep SMTP as the master gate (document: Telegram newsletter requires SMTP configured too). 

> Decision (locked): SMTP remains the master gate for `newsletter:daily`. Telegram loop runs whenever SMTP is configured, regardless of email-subscriber count.

- [ ] **Step 4: DRY-run verify**

Run: `DRY_RUN=1 npx nuxi task run newsletter:daily` (or trigger via the dev task runner the repo uses; check how `blog:daily` is invoked in dev). Confirm log shows `[DRY_RUN newsletter tg]` lines for any opted-in test user and the email path still logs.

- [ ] **Step 5: Commit**

```bash
git add app/server/tasks/newsletter/daily.ts
git commit -m "feat(newsletter): deliver daily digest to opted-in Telegram users"
```

---

### Task B4: Account `NewsletterPanel` UI

**Files:**
- Create: `app/components/account/NewsletterPanel.vue`
- Modify: `app/pages/cuenta.vue` (mount the panel near `TelegramLink`/`AlertsPanel`)

**Interfaces:**
- Consumes: `useAuthFetch`, `/api/me/newsletter` (B2), `tg.*`/new `newsletterPanel.*` i18n.

- [ ] **Step 1: Add i18n keys (es/en/pt)**

Add `newsletterPanel: { title, email, telegram, telegramHint, saved }` to all three locales. Spanish:
```ts
newsletterPanel: {
  title: 'Newsletter diario', email: 'Recibir por correo', telegram: 'Recibir por Telegram',
  telegramHint: 'Vinculá tu Telegram primero', saved: 'Preferencias guardadas',
},
```

- [ ] **Step 2: Create the component**

```vue
<!-- app/components/account/NewsletterPanel.vue -->
<template>
  <VCard variant="outlined" class="pa-4 mb-4">
    <div class="d-flex align-center ga-2 mb-2">
      <VIcon color="teal">mdi-email-newsletter</VIcon>
      <span class="text-subtitle-2 font-weight-bold">{{ $t('newsletterPanel.title') }}</span>
    </div>
    <VSwitch v-model="email" :label="$t('newsletterPanel.email')" color="teal" hide-details
      :loading="busy" @update:model-value="save('email', $event)" />
    <VSwitch v-model="telegram" :label="$t('newsletterPanel.telegram')" color="info" hide-details
      :disabled="!telegramLinked" :messages="telegramLinked ? '' : $t('newsletterPanel.telegramHint')"
      :loading="busy" @update:model-value="save('telegram', $event)" />
  </VCard>
</template>

<script setup lang="ts">
const { authFetch } = useAuthFetch()
const email = ref(false)
const telegram = ref(false)
const telegramLinked = ref(false)
const busy = ref(false)

async function refresh() {
  const r = await authFetch<{ email: boolean; telegram: boolean; telegramLinked: boolean }>(
    '/api/me/newsletter',
  ).catch(() => ({ email: false, telegram: false, telegramLinked: false }))
  email.value = r.email; telegram.value = r.telegram; telegramLinked.value = r.telegramLinked
}

async function save(field: 'email' | 'telegram', value: boolean | null) {
  busy.value = true
  try {
    const r = await authFetch<{ email: boolean; telegram: boolean; telegramLinked: boolean }>(
      '/api/me/newsletter', { method: 'PUT', body: { [field]: Boolean(value) } },
    )
    email.value = r.email; telegram.value = r.telegram; telegramLinked.value = r.telegramLinked
  } catch {
    await refresh() // revert optimistic toggle on error (e.g. 409 telegram-not-linked)
  } finally {
    busy.value = false
  }
}

onMounted(refresh)
</script>
```

- [ ] **Step 3: Mount in `cuenta.vue`**

In `app/pages/cuenta.vue`, import is auto (Nuxt components). Place `<NewsletterPanel />` adjacent to `<TelegramLink />` / `<AlertsPanel />` in the authed section.

- [ ] **Step 4: Verify in browser**

Logged in: toggle Email → persists across reload; Telegram switch disabled with hint until Telegram linked; after linking, toggling Telegram persists.

- [ ] **Step 5: Commit**

```bash
git add app/components/account/NewsletterPanel.vue app/pages/cuenta.vue app/i18n/locales/es.ts app/i18n/locales/en.ts app/i18n/locales/pt.ts
git commit -m "feat(newsletter): account panel to choose email/Telegram delivery"
```

---

# PART C — Discord login

### Task C1: runtimeConfig + `discordId` model field

**Files:**
- Modify: `app/nuxt.config.ts`
- Modify: `app/server/models/User.ts`
- Modify: `app/.env.sample` (document new vars)

- [ ] **Step 1: Add runtimeConfig**

In `nuxt.config.ts` `runtimeConfig` (server section, next to `telegram`):
```ts
discord: {
  clientId: process.env.DISCORD_CLIENT_ID || '',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  redirectUri: process.env.DISCORD_REDIRECT_URI || 'https://cambio-uruguay.com/api/auth/discord/callback',
},
```
(`discordInviteUrl` in `public` was added in A4.)

- [ ] **Step 2: Add `discordId` to the model**

In `app/server/models/User.ts`, add to `UserDoc`: `discordId: string | null`, and schema: `discordId: { type: String, default: null, index: true, sparse: true },`.

- [ ] **Step 3: Document env**

Append to `app/.env.sample`:
```
# Discord OAuth2 login (server-side -> Firebase custom token)
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=https://cambio-uruguay.com/api/auth/discord/callback
# Optional community invite shown on /conectar
DISCORD_INVITE_URL=
```

- [ ] **Step 4: Commit**

```bash
git add app/nuxt.config.ts app/server/models/User.ts app/.env.sample
git commit -m "chore(discord): runtimeConfig, User.discordId, env sample"
```

---

### Task C2: `discordAuth` util — state sign/verify + uid resolution

**Files:**
- Create: `app/server/utils/discordAuth.ts`
- Test: `app/tests/discord-auth.test.ts`

**Interfaces:**
- Produces: `signState(secret: string): string` (returns `nonce.hmac`), `verifyState(value: string, cookie: string, secret: string): boolean`; `resolveDiscordUid(profile, deps): Promise<string>` where `profile = { id, email, verified }` and `deps = { getUserByEmail, createUser, getUser }` (injectable for tests).

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/discord-auth.test.ts
import { describe, it, expect } from 'vitest'
import { signState, verifyState, resolveDiscordUid } from '../server/utils/discordAuth'

describe('discord state', () => {
  it('verifies a freshly signed state against the same secret', () => {
    const s = signState('secret1')
    expect(verifyState(s, s, 'secret1')).toBe(true)
  })
  it('rejects when cookie mismatches or secret differs', () => {
    const s = signState('secret1')
    expect(verifyState(s, signState('secret1'), 'secret1')).toBe(false) // different nonce
    expect(verifyState(s, s, 'secret2')).toBe(false) // wrong secret
    expect(verifyState('garbage', 'garbage', 'secret1')).toBe(false)
  })
})

describe('resolveDiscordUid', () => {
  const base = {
    getUserByEmail: async () => { throw { code: 'auth/user-not-found' } },
    createUser: async (p: any) => ({ uid: p.uid || 'new-uid' }),
    getUser: async (uid: string) => ({ uid }),
  }
  it('links to existing Firebase user when verified email matches', async () => {
    const uid = await resolveDiscordUid(
      { id: '111', email: 'a@b.com', verified: true },
      { ...base, getUserByEmail: async () => ({ uid: 'existing-uid' }) },
    )
    expect(uid).toBe('existing-uid')
  })
  it('creates an email user when verified email has no account', async () => {
    const uid = await resolveDiscordUid({ id: '111', email: 'a@b.com', verified: true }, base)
    expect(uid).toBe('new-uid')
  })
  it('uses discord:<id> uid when email is missing/unverified', async () => {
    const uid = await resolveDiscordUid({ id: '222', email: null, verified: false }, base)
    expect(uid).toBe('discord:222')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- discord-auth`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the util**

```ts
// app/server/utils/discordAuth.ts
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export function signState(secret: string): string {
  const nonce = randomBytes(16).toString('hex')
  const mac = createHmac('sha256', secret).update(nonce).digest('hex')
  return `${nonce}.${mac}`
}

export function verifyState(value: string, cookie: string, secret: string): boolean {
  if (!value || !cookie || value !== cookie) return false
  const [nonce, mac] = value.split('.')
  if (!nonce || !mac) return false
  const expected = createHmac('sha256', secret).update(nonce).digest('hex')
  const a = Buffer.from(mac); const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export interface DiscordProfile { id: string; email: string | null; verified: boolean }
export interface UidDeps {
  getUserByEmail: (email: string) => Promise<{ uid: string }>
  createUser: (props: { uid?: string; email?: string; displayName?: string; photoURL?: string }) => Promise<{ uid: string }>
  getUser: (uid: string) => Promise<{ uid: string }>
}

export async function resolveDiscordUid(p: DiscordProfile, deps: UidDeps): Promise<string> {
  if (p.email && p.verified) {
    try {
      const u = await deps.getUserByEmail(p.email)
      return u.uid
    } catch (e: any) {
      if (e?.code !== 'auth/user-not-found') throw e
      const created = await deps.createUser({ email: p.email })
      return created.uid
    }
  }
  const uid = `discord:${p.id}`
  try { await deps.getUser(uid) } catch { await deps.createUser({ uid }) }
  return uid
}
```

- [ ] **Step 4: Run tests + lint**

Run: `npm run test -- discord-auth && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/discordAuth.ts app/tests/discord-auth.test.ts
git commit -m "feat(discord): state sign/verify + uid resolution util (tested)"
```

---

### Task C3: `/api/auth/discord/start`

**Files:**
- Create: `app/server/api/auth/discord/start.get.ts`

**Interfaces:**
- Consumes: `signState`, `runtimeConfig.discord`.

- [ ] **Step 1: Create the route**

```ts
// app/server/api/auth/discord/start.get.ts
import { signState } from '../../../utils/discordAuth'

export default defineEventHandler((event) => {
  const cfg = useRuntimeConfig().discord as { clientId: string; clientSecret: string; redirectUri: string }
  if (!cfg.clientId || !cfg.clientSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Discord login not configured' })
  }
  const state = signState(cfg.clientSecret)
  setCookie(event, 'dc_state', state, {
    httpOnly: true, sameSite: 'lax', secure: true, maxAge: 600, path: '/',
  })
  const url = new URL('https://discord.com/oauth2/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', cfg.clientId)
  url.searchParams.set('scope', 'identify email')
  url.searchParams.set('redirect_uri', cfg.redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('prompt', 'consent')
  return sendRedirect(event, url.toString(), 302)
})
```

- [ ] **Step 2: Manual verify**

With `DISCORD_CLIENT_ID/SECRET` set in dev, hit `/api/auth/discord/start` → 302 to `discord.com/oauth2/authorize` with `state`; `dc_state` cookie set. Without creds → 503.

- [ ] **Step 3: Commit**

```bash
git add app/server/api/auth/discord/start.get.ts
git commit -m "feat(discord): OAuth2 start route with signed state cookie"
```

---

### Task C4: `/api/auth/discord/callback`

**Files:**
- Create: `app/server/api/auth/discord/callback.get.ts`

**Interfaces:**
- Consumes: `verifyState`, `resolveDiscordUid`, `adminAuth()`, `UserModel`, `runtimeConfig.discord`.

- [ ] **Step 1: Create the route**

```ts
// app/server/api/auth/discord/callback.get.ts
import { verifyState, resolveDiscordUid } from '../../../utils/discordAuth'
import { adminAuth } from '../../../utils/firebaseAdmin'
import { connectDb } from '../../../utils/db'
import { UserModel } from '../../../models/User'

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig().discord as { clientId: string; clientSecret: string; redirectUri: string }
  const q = getQuery(event)
  const code = String(q.code || '')
  const state = String(q.state || '')
  const cookie = getCookie(event, 'dc_state') || ''
  deleteCookie(event, 'dc_state', { path: '/' })

  try {
    if (!code || !verifyState(state, cookie, cfg.clientSecret)) {
      throw new Error('bad-state')
    }
    // 1. Exchange code for an access token.
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.clientId, client_secret: cfg.clientSecret,
        grant_type: 'authorization_code', code, redirect_uri: cfg.redirectUri,
      }),
    })
    const token: any = await tokenRes.json()
    if (!token?.access_token) throw new Error('token-exchange-failed')

    // 2. Fetch the Discord identity.
    const meRes = await fetch('https://discord.com/api/users/@me', {
      headers: { authorization: `Bearer ${token.access_token}` },
    })
    const me: any = await meRes.json()
    if (!me?.id) throw new Error('userinfo-failed')

    const displayName = me.global_name || me.username || null
    const photoURL = me.avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png`
      : undefined

    // 3. Resolve / create the Firebase user.
    const auth = adminAuth()
    const uid = await resolveDiscordUid(
      { id: String(me.id), email: me.email ?? null, verified: Boolean(me.verified) },
      {
        getUserByEmail: (e) => auth.getUserByEmail(e),
        createUser: (p) => auth.createUser({
          ...(p.uid ? { uid: p.uid } : {}),
          ...(p.email ? { email: p.email } : {}),
          ...(displayName ? { displayName } : {}),
          ...(photoURL ? { photoURL } : {}),
        }),
        getUser: (u) => auth.getUser(u),
      },
    )

    // 4. Persist mapping + fill profile gaps.
    await connectDb()
    await UserModel.updateOne(
      { _id: uid },
      {
        $set: { discordId: String(me.id) },
        $setOnInsert: { email: me.email ?? null, name: displayName, photo: photoURL ?? null },
      },
      { upsert: true },
    )

    // 5. Mint a custom token for the client.
    const customToken = await auth.createCustomToken(uid)
    return sendRedirect(event, `/cuenta?ct=${encodeURIComponent(customToken)}`, 302)
  } catch {
    return sendRedirect(event, '/cuenta?authError=discord', 302)
  }
})
```

- [ ] **Step 2: Manual verify (end-to-end, after owner provides creds)**

Click "Continuar con Discord" → authorize on Discord → redirected to `/cuenta?ct=…` → logged in (Step C5 consumes the token). DB `User` doc has `discordId`. Bad/expired state → `/cuenta?authError=discord`.

- [ ] **Step 3: Commit**

```bash
git add app/server/api/auth/discord/callback.get.ts
git commit -m "feat(discord): OAuth2 callback -> Firebase custom token"
```

---

### Task C5: Client — Discord button + token consumer plugin

**Files:**
- Modify: `app/components/AuthDialog.vue`
- Create: `app/plugins/discordToken.client.ts`
- Modify: `app/i18n/locales/{es,en,pt}.ts` (`auth.discord`, `auth.discordError`)

**Interfaces:**
- Consumes: `?ct=` query (from C4), `fbAuth()` + `signInWithCustomToken` from `stores/firebaseAuthApi`, auth store `notice`/`error`.

- [ ] **Step 1: Export `signInWithCustomToken` from the firebase wrapper**

In `app/stores/firebaseAuthApi.ts`, ensure `signInWithCustomToken` is re-exported from `firebase/auth` (add it to the existing export list if absent).

- [ ] **Step 2: Create the plugin**

```ts
// app/plugins/discordToken.client.ts
import { fbAuth, signInWithCustomToken } from '~/stores/firebaseAuthApi'

export default defineNuxtPlugin(() => {
  if (import.meta.server) return
  const url = new URL(window.location.href)
  const ct = url.searchParams.get('ct')
  const authError = url.searchParams.get('authError')
  const auth = useAuthStore()
  if (authError === 'discord') {
    auth.error = 'auth.discordError'
    url.searchParams.delete('authError')
    window.history.replaceState({}, '', url.toString())
  }
  if (ct) {
    signInWithCustomToken(fbAuth(), ct)
      .catch(() => { auth.error = 'auth.discordError' })
      .finally(() => {
        url.searchParams.delete('ct')
        window.history.replaceState({}, '', url.toString())
      })
  }
})
```

- [ ] **Step 3: Add the Discord button to `AuthDialog.vue`**

Add an i18n key `auth.discord: 'Continuar con Discord'` (es) / translated (en/pt) and `auth.discordError: 'No se pudo iniciar sesión con Discord'`. In the dialog's provider button group (next to the Google button), add:

```vue
<VBtn block variant="outlined" class="mb-2" prepend-icon="mdi-discord"
  :style="{ color: '#5865F2' }" @click="goDiscord">
  {{ $t('auth.discord') }}
</VBtn>
```

and in `<script setup>`:
```ts
const goDiscord = () => { window.location.href = '/api/auth/discord/start' }
```

- [ ] **Step 4: Verify**

`npm run dev`: open auth dialog → Discord button present. Full OAuth round-trip (with creds) logs the user in; `ct`/`authError` get stripped from the URL after handling.

- [ ] **Step 5: Commit**

```bash
git add app/components/AuthDialog.vue app/plugins/discordToken.client.ts app/stores/firebaseAuthApi.ts app/i18n/locales/es.ts app/i18n/locales/en.ts app/i18n/locales/pt.ts
git commit -m "feat(discord): sign-in button + custom-token consumer plugin"
```

---

## Self-Review

**Spec coverage:**
- A (hub page, MCP card, footer/header links, TG channel, Discord links) → A1–A4. ✅
- B (channel choice, model, API, task, UI) → B1–B4. ✅
- C (Discord OAuth2 → custom token, button, plugin, security) → C1–C5. ✅
- Non-goals respected: no un-gating, no Discord bot. ✅

**Placeholder scan:** Two intentional "locate the file" steps (header nav A4; sitemap auto-discovery A4) carry a concrete grep + decision rule, not a TODO. No code placeholders.

**Type consistency:** `buildDailyTelegram(data, lang)`, `DigestData`/`DigestCurrency` fields, `resolveDiscordUid(profile, deps)`, `signState`/`verifyState`, `/api/me/newsletter` `{ email, telegram, telegramLinked }` are consistent across the tasks that define and consume them. `UserModel.newsletter` (B1) and `UserModel.discordId` (C1) both modify `User.ts` — apply additively.

**Deploy note:** A + B ship with no new secrets. C requires `DISCORD_CLIENT_ID/SECRET` (+ optional `DISCORD_INVITE_URL`) on the server before the Discord button works; until then `/api/auth/discord/start` returns 503 and the button is harmless. Deploy per `memory/deploy.md` (build `app/`, `pm2 reload cambio-uruguay`).
