# SEO data drop + analysis

Working folder for the SEO/traffic analysis. Goal: rank better in Google and grow traffic, driven by real Search Console + Analytics data (not guesses).

**Baseline audit (2026-07-06):** technical + on-page SEO is already solid — correct titles, meta descriptions, canonical, full hreflang (es/en/pt + x-default), JSON-LD, sitemap, robots, live buy/sell numbers rendered in text, FAQ blocks. The site is well-indexed. The gap is **search authority for competitive head terms** (e.g. "cotización dólar uruguay hoy" is owned by BROU/BCU/datosuruguay.com/dolaruruguay.uy) and **capturing the long tail** (37 casa pages, historico, /dolar/[departamento], tools). Those wins need the data below to target precisely.

---

## Phase 1 — CSV export (do this now)

Put every exported file in **`docs/seo/data/`** (this dir is git-ignored, so private data stays local). Keep the filenames below so the analysis picks them up automatically.

### A. Google Search Console — the priority (queries you rank for)

1. Open <https://search.google.com/search-console> → select the **cambio-uruguay.com** property.
2. Left menu → **Performance → Search results**.
3. Date range → **Last 12 months**. Search type = **Web**. Make sure all 4 metrics are toggled on: Clicks, Impressions, CTR, Position.
4. Top-right **Export → Download CSV** (Excel/Sheets also fine; CSV is easiest for me).
5. The download is a zip / multi-tab file with these tabs — save each as its own CSV in `docs/seo/data/`:
   - **Queries** → `gsc-queries.csv`
   - **Pages** → `gsc-pages.csv`
   - **Dates** → `gsc-dates.csv`
   - **Countries** → `gsc-countries.csv` (optional but useful)
   - **Devices** → `gsc-devices.csv` (optional)
6. **Bonus (high value):** also grab a filtered view of **queries where position is 5–20** (the "almost ranking" quick wins). In Performance, add filter **Position → Greater than 5**, then export again as `gsc-queries-pos5plus.csv`. Optional — the full queries export already contains position, so skip if it's a hassle.

> If the property is the *domain* property (`cambio-uruguay.com`) it already covers www + http + all subpaths — good. If you only have a URL-prefix property, export whichever covers `https://cambio-uruguay.com/`.

### B. Google Analytics 4 — behavior + conversions (property G-F97PNVRMRF)

1. Open <https://analytics.google.com> → the cambio-uruguay property.
2. Reports → **Acquisition → Traffic acquisition** → set date range to last 12 months → top-right **Share/Export → Download file (CSV)** → save as `ga4-traffic-acquisition.csv`.
3. Reports → **Engagement → Pages and screens** → last 12 months → export → `ga4-pages.csv`.
4. Reports → **Acquisition → User acquisition** → export → `ga4-user-acquisition.csv` (optional).
5. If you use Explorations and can add a **Landing page** dimension report, export it as `ga4-landing-pages.csv` (optional but valuable — landing pages ≈ SEO entry points).

> GA4's built-in CSV export caps rows (usually top ~ few hundred). That's fine for a first pass. If a report says "sampled", note it. The API in Phase 2 removes these limits.

### When done
Tell me "CSV dropped" (or list what you exported). I'll read `docs/seo/data/*.csv` and produce: top opportunities (quick-win queries, high-impression/low-CTR pages, content gaps, internal-linking targets), plus a prioritized action list I'll start implementing.

---

## Phase 2 — API service account (later, for live + recurring analysis)

Enables me to pull GSC + GA4 data on demand and set up monitoring, without manual exports. ~15–20 min once.

1. Go to <https://console.cloud.google.com> → create (or reuse) a project.
2. **APIs & Services → Enable APIs**: enable **Google Search Console API** and **Google Analytics Data API**.
3. **IAM & Admin → Service Accounts → Create service account** (e.g. `seo-readonly`). No roles needed at project level.
4. On the new service account → **Keys → Add key → JSON** → download the key file.
5. Grant it read access to the data:
   - **Search Console:** search.google.com/search-console → Settings → **Users and permissions → Add user** → paste the service account email (`seo-readonly@<project>.iam.gserviceaccount.com`) → permission **Full** (or Restricted is enough for read).
   - **GA4:** analytics.google.com → Admin → **Property Access Management → Add** → same service-account email → role **Viewer**. Also note the **GA4 numeric property ID** (Admin → Property Settings) — I need it for the Data API.
6. Put the JSON key at **`docs/seo/data/gsc-ga-service-account.json`** (git-ignored) — or anywhere outside the repo and tell me the path. **Never commit this file.** Tell me the GA4 numeric property ID.

Then I can run the `claude-seo` Google tooling against live data whenever you want a refresh.

---

## Files in this folder
- `README.md` — this guide (tracked).
- `data/` — your exports + service-account key (git-ignored, private).
- Analysis outputs I generate will land here as dated markdown.
