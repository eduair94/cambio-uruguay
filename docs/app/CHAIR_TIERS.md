# r/CharruaDevs desktop-chair tier list

The public page at `/sillas-escritorio-uruguay` is a materialized evidence view. Nuxt never calls
Reddit or Gemini during a request.

## Data flow

1. `sync_chair_tiers.ts` loads root `.env` and `app/.env`, then explicitly maps the app's
   `MONGO_URI` to `APP_MONGO_URI`.
2. `classes/chairs/harvest.ts` searches `r/CharruaDevs` with Reddit OAuth and stores each matching
   post plus the complete comment tree. The shared Reddit client expands `morechildren`, so
   top-level comments and nested replies are included.
3. A conservative local classifier always identifies supported exact chair models, sentiment, and
   themes in post bodies, comments, and replies. Gemini enriches that result when quota is
   available. Parent text and the post title are supplied for reply context; generic brands and
   ungrounded models are rejected.
4. Scores, confidence, tiers, author counts, theme counts, and the fallback pros/cons summary are
   deterministic. Gemini can perform a second grounded writing pass; every point must retain at
   least one valid source ID.
5. The snapshot is stored in the app database. The Nuxt API only reads this last good snapshot.
6. A separate daily `sync_chairs.ts` job collects Mercado Libre, Facebook Marketplace, and public
   Uruguay storefront listings. It normalizes duplicate listings into one product, converts USD
   only for comparison, merges Reddit evidence by exact model, and preserves the last healthy
   catalog when a source fails.

## Collections in the app database

- `chairredditposts`: raw Reddit posts, search-query provenance, refresh state, tree schema version.
- `chairredditcomments`: every stored comment or reply, including `parentId` and `depth`.
- `chaircommentanalyses`: fingerprinted per-source Gemini results, including empty results, so a
  rate limit or interrupted run resumes missing work instead of reanalyzing the whole corpus.
- `chairtiersnapshots`: the public materialized tier list, full matched evidence, grounded reviews,
  and timestamped Uruguay purchase offers.
- `chaircatalogproducts`: the daily one-row-per-chair directory, every observed seller link,
  normalized UYU price, original currency, images, ratings, evidence, and price history.
- `chaircatalogmetas`: catalog timestamp, reference exchange rate, totals, and per-source health.

## Run and schedule

```powershell
npm.cmd run sync_chair_tiers -- --force
```

PM2 runs `currency-chair-tiers` every Sunday at 12:31 UTC. The job is also listed in
`scripts/deploy-backend.sh`, so backend deploys start or reload it.

PM2 runs `currency-chairs` daily at 11:41 UTC. Run it manually with:

```powershell
npm.cmd run sync_chairs
```

Required credentials are documented in `.env.sample`. `GEMINI_MIN_INTERVAL_MS=10000` is applied to
the PM2 job to keep the batch analysis below provider rate limits. Set
`CHAIR_ANALYSIS_LOCAL_ONLY=1` for an immediate quota-independent refresh.

## Public contract

- Page: `/sillas-escritorio-uruguay`
- API: `/api/chair-tiers`
- Market API: `/api/chairs`
- Chair detail: `/sillas-escritorio-uruguay/:slug`
- Chair detail API: `/api/chairs/:slug`
- Source transparency: every matched post/comment/reply includes its complete stored text,
  hierarchy label, Reddit votes/date, and original permalink.
- Commerce separation: purchase offers never affect sentiment, score, confidence, or tier.
- Price honesty: each offer carries a fixed `verifiedAt`; the page asks the user to confirm current
  stock, size, warranty, and final price.
- Catalog coverage: the current materialized view exposes 375 normalized chairs, 450 offers, and
  127 sellers; these counts are runtime data and change on each healthy daily refresh.

## Known limits

This is community evidence, not a clinical ergonomics test. Reddit participation is self-selecting.
The directory is broad but still limited to the Uruguay-facing listings reachable by its configured
sources during the recorded refresh; it is not a guarantee that no other seller exists.
