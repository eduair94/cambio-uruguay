---
version: 1
slug: "app-pages-sillas-escritorio-uruguay-vue"
primary_target: "app/pages/sillas-escritorio-uruguay/index.vue"
related_targets:
  - "app/components/chair/PhotoViewer.vue"
  - "app/components/chairs/ChairMarketDirectory.vue"
  - "app/pages/sillas-escritorio-uruguay/[slug].vue"
  - "app/utils/chairTiers.ts"
  - "app/utils/chairCatalog.ts"
  - "app/server/api/chair-tiers.get.ts"
  - "app/server/api/chairs/index.get.ts"
  - "app/server/api/chairs/[slug].get.ts"
---

# Sillas de escritorio según r/CharruaDevs

- Scope: tier list, national price directory, and per-chair detail under
  `app/pages/sillas-escritorio-uruguay/`; visitor mode: Read.
- Audience: people in Uruguay who work or study at a desk and want community evidence before
  buying a chair.
- Job: identify which named chairs have credible consensus, compare every currently harvested
  Uruguay offer for the same model, choose a workday priority, and open the original evidence.
- Action: search or filter the national directory, set a UYU or USD budget, inspect a tier or chair
  detail, compare sellers, then follow the original Reddit evidence before deciding.
- Proof: real r/CharruaDevs posts, comments and replies; unique-author counts; vote/recency
  weighting; sentiment distribution; recurring themes; sample confidence; real product photos;
  dated prices; a broad normalized national catalog with per-source health; and direct Reddit and
  retailer links.
- Constraint: a conservative local classifier guarantees explicit supported models and Gemini may
  enrich the language when quota is available. Deterministic code computes score and tier;
  low-sample chairs remain visibly unranked.
- Direction: a workday diagnosis opens into a vertically stacked tier bench. The memorable moment
  is the priority selector physically reordering evidence strips while each chair keeps its sample
  and confidence attached.
- Limit: prices are dated observations rather than live stock guarantees, and commerce data never
  changes the evidence score.
