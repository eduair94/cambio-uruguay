# Repo AI-friendliness: agent docs + scoped reorg

**Date:** 2026-07-20
**Goal:** Cut per-session token waste and tidy loose files, without touching production cron/pm2/deploy paths.

## Problem

- **No agent-instruction file anywhere** (no `CLAUDE.md`, no `AGENTS.md`). Every AI session re-derives the repo layout from scratch — dozens of exploratory `Grep`/`Read`/`Glob` calls per session before any real work. This is the single largest token sink.
- The repo is a **two-package monorepo** (root Express/scrapers API + `app/` Nuxt frontend) with **different Mongo DBs**, different deploy scripts, and non-obvious tripwire tests. None of this is written down where a tool auto-loads it.
- The repo **root is a dumping ground**: ~38 tracked loose `*.ts` entrypoints plus already-gitignored scratch artifacts physically present (`*.html` dumps, `*.png`, `*.mp4`, `*.stackdump`, `.sdd-*`).
- Stray top-level docs (`SEO_AUDIT_2026.md`, `PARAMETER_VALIDATION.md`, `app/SEO_README.md`, `app/AUTH_README.md`, `app/PERFORMANCE_IMPROVEMENTS.md`) sit outside `docs/`.

## Non-goals

- **Not** moving pm2/deploy-referenced entrypoints. `index.ts`, `sync.ts`, and `sync_*.ts` are wired into `ecosystem.config.js` (15 `script: "dist/*.js"` paths), the `scripts/deploy-backend.sh` sanity gate (`dist/index.js`, `dist/sync.js`) and `OTHER_APPS` list, and `package.json`. Moving them = 4-file lockstep rewrite against live prod cron, for **zero token benefit**. Service entrypoints stay where the build expects them.
- **Not** refactoring code, changing behavior, or touching the build/deploy logic.
- **Not** deleting credential/session files (`serviceAccount.json`, `prex_session.txt`, `.env`) — gitignored, live, deleting them risks local runs.

## Design

### 1. Agent docs — `AGENTS.md` canonical, `CLAUDE.md` pointer

`AGENTS.md` is the cross-tool standard (Cursor, Codex, Copilot, Gemini CLI). Root `CLAUDE.md` is a **single line** `@AGENTS.md` so Claude Code picks it up too. One source of truth.

Nested, scoped, short (each ≤ ~120 lines), living next to the code it describes so a tool loads only the relevant one:

| File | Content (all derived from actual code + verified; no invented facts) |
|---|---|
| `AGENTS.md` (root) | Repo map; the two-package split (root API vs `app/` Nuxt, **different Mongo DBs**); build/test/lint/deploy commands for each; deploy model (push→main→CI); "never mutate `app/` mid-build"; the tripwire tests that gate CI; pointers to nested docs. |
| `app/AGENTS.md` | Nuxt 3 + Vuetify 4 frontend: `pages`/`utils`/`components`/`server` layout; `utils/siteNav.ts` is the nav source-of-truth (new page unregistered = failing coverage test); the data-driven page pattern (`utils/<topic>.ts` catalog → page); `npm run typecheck` is broken → use `npm run lint`; theme/critical.css rules; `nuxi prepare` after dev restart. |
| `classes/AGENTS.md` | Backend scrapers/services: the scraper contract; DB-derived scrapers (federal/argentino/romantico) need a Mongo connection or they false-fail; `aduana`/`banks`/`loans` subsystems; `gemini.ts` is the shared AI class; the app-Mongo bridge (`appdb.ts`) and which ledgers live where. |
| `classes/cambios/AGENTS.md` | The ~50 casa scrapers: contract + validation method (Mongo needed for DB-derived; how to run one scraper). |
| `tests/AGENTS.md` | The CI-gating tripwires so agents don't trip them: `no_scheduler_in_api`, `connect_tripwire`, `noGeminiInApp` (app side), `bcu_backfill`. |
| `mcp/AGENTS.md`, `bots/AGENTS.md` | Thin — point at the existing `README.md` + the pm2 build/start notes from `ecosystem.config.js`. |

Content is sourced from the code, the existing `README.md` files, and the auto-memory index — then fact-checked against the tree. Nothing invented.

### 2. Safe cleanup + doc consolidation

- **Delete** pure scratch artifacts physically present but gitignored: root `*.html` dumps (`bing1.html`, `g.html`, `indumex_*.html`, `kp.html`, `latino.html`, `out.html`, `serp*.html`, `widget.html`, `wr.html`, etc.), root `*.png`, `*.mp4`, `bash.exe.stackdump`, `grep.exe.stackdump`, `.sdd-*`, `indumex_*.json`, `rev.json`, `rev2.json`, `regul-snapshot.yml`, `proxy_scrape.json`. All already gitignored → deletion is git-invisible, zero risk.
- **Keep** `serviceAccount.json`, `prex_session.txt`, `.env` (live, gitignored).
- **Move** stray docs into `docs/`, leaving a stub or updating links:
  - `SEO_AUDIT_2026.md` → `docs/seo/`
  - `PARAMETER_VALIDATION.md` → `docs/api/`
  - `app/SEO_README.md`, `app/AUTH_README.md`, `app/PERFORMANCE_IMPROVEMENTS.md` → `docs/app/` (these are referenced by nothing in code — verify with grep before moving).
- Root `README.md` and `app/README.md` **stay** (conventional entry points); `AGENTS.md` cross-links them.

### 3. Scoped code moves — Bucket B one-offs only

Move dev/one-off scripts (referenced **only** by `package.json` npm scripts, imported by nothing) into `scripts/oneoff/`:

```
add_cambilex, add_itau, add_new, autocomplete_sheet, cambilex_sucs,
fix_depto_cambilex, get_locations, import_loan_history, remove_bcu,
remove_date, update_coordinates, validate_cambios, prex, bcu_backfill,
get_bcu_details, sync_bcu_single, sync_favicon, sync_locations_sheet,
sentry_test, swagger-test, test_ai_insights, test_ai_service
```

Per moved file:
1. `git mv <file>.ts scripts/oneoff/<file>.ts`
2. Fix relative imports (`./classes/…` → `../../classes/…`, `./sentry` → `../../sentry`, `./config` → `../../config`, etc.).
3. Update its `package.json` script path (`ts-node <file>.ts` → `ts-node scripts/oneoff/<file>.ts`).
4. Add `scripts/oneoff` to `tsconfig.json` `exclude` so the production build ignores them (they are dev-only ts-node scripts, never needed in `dist/`).

**Stay at root (Bucket A):** `index.ts`, `sync.ts`, `sync_aduana.ts`, `sync_aduana_daily.ts`, `sync_banks_news.ts`, `sync_costs.ts`, `sync_debt_relief.ts`, `sync_explain.ts`, `sync_figures.ts`, `sync_loans.ts`, `sync_predictions.ts`, `sync_sheet.ts`, `sync_temas_analysis.ts`, `sentry.ts`, `config.ts`, `global.ts`.

## Verification

- `npm run build` (root `tsc -p tsconfig.production.json`) still succeeds and `dist/index.js` + `dist/sync.js` exist (the deploy sanity gate).
- `dist/` tree for Bucket A entrypoints is byte-path unchanged (`dist/sync_*.js` still present) — the moves touched nothing pm2 reads.
- Each moved one-off runs: `npm run <script>` resolves via ts-node from the new path (spot-check 2–3, e.g. `prex`, `validate_cambios`).
- `npm run test` (root vitest) and `app` lint stay green.
- `git status` shows only intended renames/deletes; no tracked file lost.

## Risk

Low. Prod surfaces (`ecosystem.config.js`, `scripts/deploy-backend.sh`, `dist/` layout) are untouched. Bucket B files are imported by nothing (verified) and only referenced in `package.json`, which is dev-only. The one build-affecting change (`tsconfig` exclude) is verified by the build check above.
