# Email Newsletter (Spec 2)

**Date:** 2026-06-18
**Status:** Approved design, pre-implementation
**Scope:** Daily email newsletter for cambio-uruguay.com — standalone email signup, double opt-in, SMTP delivery. Lives entirely in the Nuxt app. Part 2 of the social-broadcast work (Spec 1 = Telegram/Discord/Twitter bots, shipped).

## Decisions

- **Frequency:** daily.
- **Opt-in:** double opt-in (confirmation email before any sending).
- **Audience:** standalone email (no account required). Logged-in account toggle is out of scope.
- **Delivery:** SMTP via nodemailer using user-provided credentials (see [[newsletter-smtp]]), not a third-party email API.

## Why the Nuxt app (not bots/ or the Express backend)

The Nuxt app already has the infra this needs, added during firebase-auth work:

- `app/server/utils/db.ts` — `connectDb()` Mongo connection.
- `app/server/models/*` — mongoose model pattern (User/Favorite/SavedItem).
- `app/server/utils/news.ts` — Google News RSS fetch/parse.
- `app/server/utils/ai.ts` — AI insight helper.
- `app/server/tasks/blog/daily.ts` — an existing nitro scheduled task to mirror.
- i18n (es/en/pt) for the signup UI and emails.

Putting the newsletter here keeps web (signup/confirm/unsubscribe), storage, content, and sending in one cohesive place and reuses all of the above. The market data reuses the app's existing `news.ts`/`ai.ts` plus a small rates fetch — no new cross-package dependency.

## Non-goals (later)

Weekly cadence; logged-in account subscribe toggle; open/click tracking; multiple lists/segments; an admin dashboard.

## Components

### Model — `app/server/models/NewsletterSubscriber.ts`

```
{
  email: string         // unique, lowercased, trimmed
  language: 'es'|'en'|'pt'
  status: 'pending' | 'confirmed' | 'unsubscribed'
  confirmToken: string  // random, used by /confirm
  unsubToken: string    // random, stable, used by /unsubscribe (one-click)
  createdAt: Date
  confirmedAt?: Date
}
```
Unique index on `email`.

### Pure helpers — `app/server/utils/newsletter.ts`

- `normalizeEmail(raw): string` and `isValidEmail(email): boolean`.
- `newToken(): string` (crypto random hex).
- `buildDailyEmail(data, lang, unsubUrl): { subject, html, text }` — localized daily digest: USD/EUR/ARS/BRL deltas, AI market summary, top news, footer with unsubscribe link. Pure (data in, strings out) → unit-tested.
- `buildDigestData(): Promise<DigestData>` — fetch rates (public API) + day-over-day deltas, AI summary (`ai.ts`), top news (`news.ts`). (The deltas reuse the same approach as Spec 1's report data.)

### Mailer — `app/server/utils/mailer.ts`

- Reads SMTP env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- `isMailerConfigured(): boolean`; `sendMail({ to, subject, html, text, listUnsubscribeUrl })` via nodemailer; adds a `List-Unsubscribe` header (and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`).
- Not configured → `isMailerConfigured()` false; subscribe endpoint returns 503, send task no-ops.

### Endpoints — `app/server/api/newsletter/`

- `subscribe.post.ts` — body `{ email, locale?, website? (honeypot) }`. Validate + normalize; reject honeypot + apply a light per-IP rate limit. Upsert a `pending` subscriber with a fresh `confirmToken`; email a confirmation link `${site}/{locale}/newsletter/confirm?token=…`. Always returns `{ ok: true }` (no address enumeration). If already `confirmed`, silently resend nothing (still `ok`).
- `confirm.get.ts` — `?token=`; set `confirmed` + `confirmedAt`; 302 redirect to a localized thank-you route.
- `unsubscribe.get.ts` — `?token=`; set `unsubscribed`; 302 redirect to a localized goodbye route; also handles `POST` for one-click `List-Unsubscribe-Post`.

### Send task — `app/server/tasks/newsletter/daily.ts`

Nitro scheduled task (registered in `nuxt.config.ts` `nitro.scheduledTasks`, mirroring blog). Steps: guard (mailer configured + not already sent today); `connectDb()`; `buildDigestData()` once; for each `confirmed` subscriber, render `buildDailyEmail(data, sub.language, unsubUrl(sub))` and `sendMail` in throttled batches (configurable concurrency/delay); record the daily run for dedup. `DRY_RUN=1` logs the rendered email instead of sending.

### Signup UI

- A localized `NewsletterSignup.vue` component (email field + submit + consent line), placed in the footer and a `/newsletter` section. Posts to `/api/newsletter/subscribe`; shows a "check your inbox" confirmation state.
- Localized thank-you (`/newsletter/confirmed`) and goodbye (`/newsletter/unsubscribed`) routes (or a single `/newsletter` page with query-driven states).

## Configuration (env)

| Var | Purpose |
| --- | --- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | transport |
| `SMTP_USER`, `SMTP_PASS` | auth |
| `SMTP_FROM` | From header (e.g. `Cambio Uruguay <news@cambio-uruguay.com>`) |
| `NEWSLETTER_SEND_BATCH`, `NEWSLETTER_SEND_DELAY_MS` | throttle (defaults 25 / 1000) |
| `DRY_RUN` | render+log instead of send |

Reuses existing `MONGO_URI` (via `connectDb()`) and the public API base already configured in the app.

## Compliance & safety

- Double opt-in — only `confirmed` addresses are ever emailed.
- One-click unsubscribe link in every email + `List-Unsubscribe` / `List-Unsubscribe-Post` headers.
- Generic subscribe responses (no enumeration); honeypot field + light per-IP rate limit.
- Feature-gated by SMTP env; daily dedup guard; `DRY_RUN` preview.

## Testing

- **Unit (vitest):** `normalizeEmail`/`isValidEmail`, `newToken` (length/uniqueness), `buildDailyEmail` (subject + contains each currency delta + the unsubscribe URL + AI summary), state transitions (pending→confirmed→unsubscribed) on a mocked model.
- **Integration (light):** subscribe endpoint with a mocked mailer + in-memory model (returns ok, creates pending, calls mailer once; honeypot rejected); confirm/unsubscribe flip status by token.
- **Manual:** `DRY_RUN=1` run of the daily task previewing a rendered email per language.

## Reuse from Spec 1

Day-over-day delta logic mirrors `bots/src/report/data.ts`; news/AI reuse the app's own `server/utils/news.ts` + `server/utils/ai.ts`. No dependency added to the Nuxt app.
