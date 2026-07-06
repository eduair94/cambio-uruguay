# SEO analysis — 2026-07-06

Data: Google Search Console (last ~3 months, Apr–Jul 2026, top 1000 queries + pages) + GA4 (full-year 2025 channels). Ranges differ; treat GSC as "current state", GA4 as "annual behavior".

## Headline

**The site's problem is click-through rate, not rankings.** Across the top 1000 queries: **255,786 impressions but only 1,628 clicks — 0.64% CTR**, at an average position of ~8. The site already ranks (page 1 / early page 2) for enormous-volume queries; it just isn't winning the click. Fixing that is worth roughly **2–3× current organic traffic** without earning a single backlink.

GA4 2025 channels: Direct 18,595 sessions (13% engaged — mostly bots/widget/API/return loads), **Organic Search 6,093 (62% engaged, 40s avg — the real, high-quality traffic)**, Organic Social 1,292 (67%). Organic search is the growth lever and it's healthy once people arrive.

## Root cause #1 — double-branded, generic titles

Live example (`/historico/brou`):
`Cotizaciones de BROU - Cambio Uruguay | Cambio Uruguay - Cotización del Dólar`
— 76 chars (Google truncates ~60), **"Cambio Uruguay" twice**, and the useful part ("Cotizaciones de BROU") doesn't match how people search ("cambio brou", "dolar brou", "cotizacion brou"). This pattern repeats across the two biggest page types.

The per-page title ends `- Cambio Uruguay` **and** the global template appends `| Cambio Uruguay - Cotización del Dólar`. Every inner page pays this tax.

## Where the impressions are (page types)

| Type | Clicks | Impressions | CTR |
|------|-------:|------------:|----:|
| /historico (per-casa rate history) | 2,519 | 174,947 | **1.44%** ← engine |
| /sucursales | 633 | 96,398 | 0.66% |
| home | 543 | 130,266 | 0.42% |
| /en | 63 | 37,274 | 0.17% |
| /pt | 97 | 23,748 | 0.41% |
| /convertir | 9 | 14,626 | 0.06% |
| /casa (new) | 21 | 1,616 | 1.30% |

`/historico/*` converts best (pos 3–8, 1.4% CTR) — the site's strength. `/sucursales` + home have huge impressions bleeding clicks.

## Biggest single opportunities (query · impressions · position · CTR)

- **dolar hoy** — 30,285 imp · pos 9.2 · 0.1% (home ranks page-2-ish; SERP owned by answer boxes/BROU)
- **cambio principal** — 12,929 imp · pos 5.3 · 0.1% (ranks page 1, ~no clicks — title/snippet problem)
- **cotizacion brou** — 10,113 · pos 8.8 · 0.03%
- **dolar brou** — 7,709 · pos 8.7 · 0.2%
- **cambio gales** — 7,602 · pos 5.0 · 0.6%
- **cambio fenix** — 6,984 · pos 8.3 · 0.04%
- **brou cotizaciones** — 5,254 · pos 8.0 · 0.1%
- **precio del dolar** — 4,807 · pos 8.1 · 0.2%
- **bcu cotizaciones** / **cotizaciones bcu** — ~8,000 combined · pos ~9 · ~0.1%
- The **casa-brand cluster** ("cambio principal/gales/fenix/matriz/indumex/sir/18/varlix/misiones/maiorano…") = tens of thousands of impressions at **positions 4–8** with near-zero CTR. This is exactly what the new `/casa/[origin]` page is built to win — but it's new and barely indexed yet.

Estimated recoverable clicks from just fixing titles/snippets on the top ~25 leaking queries: **~2,500/month** (vs 1,628 total today).

## Prioritized plan

**P1 — Title/meta overhaul (this change).** Kill double-branding site-wide (dedup `titleTemplate`), rewrite the high-traffic programmatic titles to be query-matched and front-loaded:
- `/historico/[origin]` → `{Casa}: cotización del dólar hoy e histórico`
- `/sucursales/[origin]` → `{Casa}: sucursales, horarios y cotización del dólar`
- `/historico/[origin]/[currency]` → `{Casa} {moneda} hoy: cotización y evolución`
- `/casa/[origin]` → `{Casa}: cotización dólar hoy, sucursales y opiniones`
Directly attacks the 0.64% CTR on 255k impressions.

**P2 — Win the casa-brand cluster.** Strengthen `/casa/[origin]` (the comprehensive page: rate + branches + reputation) so it ranks for "cambio X": internal links from `/historico/[origin]` + `/sucursales/[origin]` + the new `/casas-de-cambio` directory, richer copy, breadcrumbs. Enormous impressions sitting at pos 4–8.

**P3 — Bank/BCU cotización queries.** "cotizacion brou/bcu", "brou cotizaciones" (~30k combined imp). Ensure `/historico/brou`, `/historico/bcu` titles/snippets nail these; consider a concise answer block up top.

**P4 — Low-CTR dead weight.** `/convertir` (14.6k imp, 0.06%) and `/glosario`/`/blog` rank but nobody clicks — audit titles or intent match; possibly reposition.

**P5 — Authority (slow, ongoing).** The head term "dolar hoy" needs domain authority to beat BROU/BCU. Backlinks: the Medium articles, the MCP/dev portal, press outreach, the /casas-de-cambio directory as a linkable asset.

## What GA4 adds
Organic is high-quality (40s, 62% engaged) — so more organic clicks = real engaged users, not bounces. Direct's 18.6k low-engagement sessions are likely the widget/API/bots; not an SEO concern. No conversion events are configured (`Eventos clave` = 0) — worth defining a key event (e.g. outbound click to a casa, or alert signup) so we can measure SEO → value, not just sessions.
