# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are people in Uruguay who want to buy or sell foreign currency and need to
understand where they can get a better rate without checking institutions one by one.

Secondary users include travelers, savers, businesses, exchange institutions, publishers, and
developers who need historical data, location context, embeddable rates, APIs, or AI-accessible
market information.

## Product Purpose

Cambio Uruguay makes Uruguay's fragmented exchange market understandable and actionable. It
collects and normalizes public rates, preserves real changes over time, and connects prices with
institution type, location, history, and practical decision tools.

Success means a person can quickly identify the relevant rate for their operation, understand the
trade-offs, and verify the source before acting.

## Positioning

Cambio Uruguay combines broad institution and currency coverage with historical analytics,
geographic discovery, practical financial tools, alerts, and open developer access. Its comparison
experience is designed around the user's operation and location rather than a single reference
rate or a short list of banks.

## Operating Context

People commonly check rates on mobile shortly before buying, selling, traveling, or transferring
money. They may need a fast answer first, then inspect history, spreads, branches, institution
reputation, or preferential conditions before deciding.

Developers and publishers consume the same public market information through the REST API,
embeddable widget, and MCP server.

## Capabilities and Constraints

- Nuxt web application with installable PWA behavior and responsive mobile layouts.
- Spanish, English, and Portuguese interfaces.
- Public rates for more than 40 exchange houses, banks, and fintechs, with multiple currencies.
- Historical comparison, hourly and period analytics, purchasing-power context, and a real-change
  feed.
- Department, branch, map, reputation, and institution-type context where data is available.
- Threshold alerts through push, email, and Telegram for signed-in users.
- Public REST API, embeddable widget, and open-source MCP integration.
- Rates are informational, may differ from executable or negotiated prices, and must retain visible
  source and freshness context.
- Comparisons must distinguish verified absence from information that was simply not publicly
  documented.

## Brand Commitments

Cambio Uruguay is independent, practical, transparent, and distinctly Uruguayan. Copy should be
direct and useful, avoid financial hype, and explain buy versus sell from the user's perspective.
Competitor comparisons must be fair, dated, source-backed, and willing to acknowledge a
competitor's genuine advantage.

## Evidence on Hand

- Live rate and history data exposed through the application's existing API integrations.
- Public methodology and independence disclosure at `app/pages/acerca.vue`.
- Institution, reputation, and geographic catalogues under `app/utils/`.
- Alert implementation under `app/components/account/` and `app/server/models/Alert.ts`.
- Public API reference, widget, PWA manifest, and MCP integration in the current repository.
- No customer testimonials or audited savings benchmark is currently available; future work must
  not invent either.

## Product Principles

- Help the user act, not merely observe a number.
- Show breadth without hiding freshness or source limitations.
- Preserve every real market change while avoiding duplicate storage.
- Prefer verifiable comparisons over promotional superlatives.
- Keep core market discovery accessible; use integrations to extend the same data to other tools.

## Accessibility & Inclusion

Core comparison tasks must remain keyboard accessible, understandable without relying on color
alone, readable in light and dark themes, and usable on narrow mobile screens.
