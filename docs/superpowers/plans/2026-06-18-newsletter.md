# Email Newsletter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Steps use `- [ ]`.

**Goal:** Daily, double-opt-in email newsletter for cambio-uruguay.com, entirely in the Nuxt app, sent via SMTP (nodemailer).

**Architecture:** Mongo `NewsletterSubscriber` + Nuxt server endpoints (subscribe/confirm/unsubscribe) + a nitro scheduled task that builds one localized daily digest and SMTP-sends it to confirmed subscribers. Pure helpers (email validation, tokens, HTML builder) are unit-tested.

**Tech Stack:** Nuxt 3 server (nitro), mongoose (via `connectDb()`), `nodemailer`, vitest. Reuses `server/utils/news.ts`, `server/utils/ai.ts`, public API `/ai/insights`.

## Global Constraints

- Feature-gated by SMTP env: not configured → subscribe returns 503, task no-ops.
- Double opt-in: only `confirmed` addresses are emailed.
- Every email: one-click unsubscribe link + `List-Unsubscribe`/`List-Unsubscribe-Post` headers.
- Languages es/en/pt; subscriber stores its language.
- `DRY_RUN=1` renders+logs instead of sending. Daily dedup guard.
- Follow existing patterns: model (`mongoose.models.X || model`), `connectDb()`, task `defineTask`, registration in `nuxt.config.ts nitro.scheduledTasks`.

---

### Task 1: Subscriber model

**Files:** Create `app/server/models/NewsletterSubscriber.ts`

**Produces:** `NewsletterSubscriberModel` with `{ email (unique), language, status, confirmToken, unsubToken, createdAt, confirmedAt }`.

- [ ] Mirror `User.ts` pattern; `email` unique+lowercase; `status` enum `pending|confirmed|unsubscribed` default `pending`; timestamps. Commit.

### Task 2: Pure helpers (TDD)

**Files:** Create `app/server/utils/newsletter.ts`; Test `app/tests/unit/newsletter.test.ts`

**Produces:** `normalizeEmail`, `isValidEmail`, `newToken`.

- [ ] **Test:** `normalizeEmail(' A@B.COM ')==='a@b.com'`; `isValidEmail('a@b.com')` true, `isValidEmail('x')` false; `newToken()` is 32+ hex chars and two calls differ.
- [ ] Run → fail. Implement (`crypto.randomBytes`, a pragmatic email regex). Run → pass. Commit.

### Task 3: Digest builder (TDD for the pure part)

**Files:** Extend `app/server/utils/newsletter.ts`; extend the test.

**Produces:**
- `interface DigestData { date; currencies: {code, bestSellRate, changePct, bestBuyHouse}[]; news: {title,link,source}[]; ai: string }`
- `buildDigestData(): Promise<DigestData>` — fetch rates from `useRuntimeConfig().public.apiBase` (`/` + `/evolution/<bestSell origin>/<code>` for day-over-day, reusing the Spec 1 delta approach), AI via `$fetch('/ai/insights',{market_summary,lang})`, news via existing `fetchNews()`.
- `buildDailyEmail(data, lang, unsubUrl): { subject, html, text }` — pure, localized HTML (deltas table + AI summary + news list + footer with `unsubUrl`).

- [ ] **Test (pure builder only):** `buildDailyEmail(sampleData,'es',unsub)` → `subject` non-empty; `html` contains 'USD', a `%`, the `unsubUrl`, and the AI text; `text` is non-empty plain fallback.
- [ ] Run → fail. Implement builder (and `buildDigestData` using fetch; not unit-tested). Run → pass. Commit.

### Task 4: Mailer

**Files:** Create `app/server/utils/mailer.ts`

**Produces:** `isMailerConfigured()`, `sendMail({to,subject,html,text,listUnsubscribeUrl})` using nodemailer transport from `SMTP_*` runtimeConfig; sets `List-Unsubscribe` + `List-Unsubscribe-Post` headers.

- [ ] Add `nodemailer` dep + `@types/nodemailer`. Implement (transport built lazily from env). Commit.

### Task 5: Endpoints

**Files:** Create `app/server/api/newsletter/subscribe.post.ts`, `confirm.get.ts`, `unsubscribe.get.ts`

**Consumes:** Tasks 1,2,3,4.

- [ ] `subscribe.post.ts` — read `{email,locale,website}`; honeypot (`website` non-empty → return ok, do nothing); `isValidEmail` else 400; `connectDb()`; upsert `pending` with new `confirmToken`+`unsubToken`; if mailer configured send confirmation (link `${site}/{locale-prefix}/newsletter?confirm=<token>`), else 503; return `{ok:true}`. Light per-IP rate-limit (in-memory map).
- [ ] `confirm.get.ts` — `?token`; set `confirmed`+`confirmedAt`; `sendRedirect` to `/newsletter?state=confirmed`.
- [ ] `unsubscribe.get.ts` — `?token`; set `unsubscribed`; redirect `/newsletter?state=unsubscribed`; also accept POST (one-click). Commit.

### Task 6: Send task + registration

**Files:** Create `app/server/tasks/newsletter/daily.ts`; Modify `app/nuxt.config.ts` (`scheduledTasks`).

- [ ] `defineTask({meta:{name:'newsletter:daily'},run})`: guard `isMailerConfigured()` + not-sent-today; `connectDb()`; `buildDigestData()`; for each `confirmed` subscriber render `buildDailyEmail(data, sub.language, unsubUrl(sub))` + `sendMail`, throttled (`NEWSLETTER_SEND_BATCH`/`_DELAY_MS`); `DRY_RUN` logs. Register `'0 12 * * *': ['newsletter:daily']`. Commit.

### Task 7: Signup UI + pages + i18n

**Files:** Create `app/components/NewsletterSignup.vue`, `app/pages/newsletter.vue`; Modify `app/components/Footer.vue` (embed signup); add i18n keys to `app/i18n/locales/{es,en,pt}.ts`.

- [ ] `NewsletterSignup.vue` — localized email form posting to `/api/newsletter/subscribe` with `locale`; states idle→submitting→sent("check your inbox")/error; honeypot field.
- [ ] `pages/newsletter.vue` — hero + `<NewsletterSignup/>`; reads `?state=confirmed|unsubscribed|?confirm=<token>` (on `confirm` token, GET the confirm endpoint) and shows localized messages.
- [ ] Footer: embed `<NewsletterSignup compact/>`. Add i18n keys (`newsletter.*`). `useSeoMeta` + `defineOgImageComponent('Cambio',{... locale})`. Commit.

### Task 8: Env + docs

**Files:** Modify `app/nuxt.config.ts` runtimeConfig (SMTP_* keys), `app/.env.example` (or create), README note.

- [ ] Add `smtp: {host,port,secure,user,pass,from}` + `newsletter:{batch,delayMs}` to runtimeConfig; document env. Commit.

## Self-Review

- Spec coverage: model(T1), validation/tokens(T2), digest+HTML(T3), SMTP+headers(T4), subscribe/confirm/unsubscribe + double-opt-in + honeypot/rate-limit(T5), daily send+dedup+DRY_RUN+throttle(T6), signup UI+pages+i18n+compliance footer(T7), env/gating(T8). ✓
- Placeholders: none. Types: `DigestData`/`buildDailyEmail` defined T3, consumed T6.

## Out of scope

Weekly cadence, logged-in toggle, open/click tracking, segments, admin UI.
