<!--
THESIS: Someone got the keys to an empty flat. Say what to buy, in what order, and what it costs today.
OWN-WORLD: Inherit Cambio Uruguay's Open Sans, navy/paper surfaces and semantic blue links.
STORY: Three totals up front, then the necessity ranking, then "with what I have", then the advice a price cannot give.
FIRST VIEWPORT: Plain title, section links, and the three basket totals as readable text — no JS needed.
FORM: Read mode with an optional planner. Totals are server-rendered so search can quote them; the
planner is client state only and never persists.
-->
<template>
  <VContainer class="equipar py-6 py-md-10">
    <header class="equipar-header">
      <p class="eyebrow">{{ c.eyebrow }}</p>
      <h1>{{ c.title }}</h1>
      <p class="lead">{{ c.intro }}</p>
      <p v-if="asOf" class="as-of">{{ c.updated.replace('{date}', asOf) }}</p>
    </header>

    <nav class="section-nav" :aria-label="c.navLabel">
      <a v-for="link in c.nav" :key="link.id" :href="`#${link.id}`">{{ link.label }}</a>
    </nav>

    <!-- ── Cuánto sale ───────────────────────────────────────────────────── -->
    <section id="canastas" class="equipar-section" aria-labelledby="canastas-title">
      <h2 id="canastas-title">{{ c.quickTitle }}</h2>
      <p class="section-intro">{{ c.quickIntro }}</p>

      <p v-if="!baskets.length" class="empty-note">{{ c.noPrices }}</p>

      <div v-else class="basket-grid">
        <article v-for="basket in baskets" :key="basket.key" class="basket-card">
          <h3>{{ basket.label }}</h3>
          <p class="basket-blurb">{{ c.basketBlurbs[basket.key] }}</p>
          <p class="basket-total">
            <span class="amount">{{ equiparMoney(basket.totalUyu) }}</span>
            <span v-if="basket.totalUsd" class="usd">
              USD {{ basket.totalUsd.toLocaleString('es-UY') }}
            </span>
          </p>
          <p class="basket-count">
            {{ c.basketItems.replace('{n}', String(basket.lines.length)) }} ·
            {{ c.perMonth.replace('{amount}', equiparMoney(basket.totalUyu / 12)) }}
          </p>
          <!--
            The guard, on screen. A total that quietly skipped the fridge is LOWER than the truth
            and reads as a better deal, so what could not be priced travels with the number.
          -->
          <p v-if="!basket.complete" class="basket-missing">
            <strong>{{ c.basketPartial }}.</strong>
            {{
              c.basketMissing.replace('{items}', basket.missing.map(row => row.label).join(', '))
            }}
          </p>
          <p v-else class="basket-ok">{{ c.basketComplete }}</p>
        </article>
      </div>
    </section>

    <!-- ── Qué comprar primero ───────────────────────────────────────────── -->
    <section id="ranking" class="equipar-section" aria-labelledby="ranking-title">
      <h2 id="ranking-title">{{ c.tierTitle }}</h2>
      <p class="section-intro">{{ c.tierIntro }}</p>

      <div v-for="tier in EQUIPAR_TIERS" :key="tier" class="tier-block">
        <div class="tier-head" :class="`tier-${tier.toLowerCase()}`">
          <span class="tier-letter" aria-hidden="true">{{ tier }}</span>
          <div>
            <h3>{{ c.tierNames[tier].name }}</h3>
            <p>{{ c.tierNames[tier].blurb }}</p>
          </div>
        </div>

        <p v-if="!byTier[tier]?.length" class="empty-note">{{ c.noData }}</p>

        <table v-else class="tier-table cu-mobile-cards">
          <thead>
            <tr>
              <th scope="col">{{ c.colItem }}</th>
              <th scope="col">{{ c.colNew }}</th>
              <th scope="col">{{ c.colUsed }}</th>
              <th scope="col">{{ c.colSaving }}</th>
              <th scope="col">{{ c.colWhy }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in byTier[tier]" :key="item.key">
              <th scope="row" :data-label="c.colItem">
                <span class="item-name">{{ item.categoryLabel }}</span>
                <span class="item-variant">{{ item.variantLabel }}</span>
                <span v-if="item.quantity > 1" class="item-qty">{{
                  c.quantityLabel.replace('{n}', String(item.quantity))
                }}</span>
              </th>
              <td :data-label="c.colNew">
                <template v-if="item.newBand">
                  <span class="price"
                    >{{ equiparMoney(item.newBand.p25) }}–{{
                      equiparMoney(item.newBand.median)
                    }}</span
                  >
                  <span class="obs">{{
                    c.observations.replace('{n}', String(item.newBand.n))
                  }}</span>
                </template>
                <span v-else class="muted">{{ c.noData }}</span>
              </td>
              <td :data-label="c.colUsed">
                <span v-if="!item.usedOk" class="muted">{{ c.usedNotAdvised }}</span>
                <template v-else-if="item.usedBand">
                  <span class="price">{{ equiparMoney(item.usedBand.median) }}</span>
                  <span class="obs">{{
                    c.observations.replace('{n}', String(item.usedBand.n))
                  }}</span>
                </template>
                <span v-else class="muted">{{ c.noUsedData }}</span>
              </td>
              <td :data-label="c.colSaving">
                <span v-if="item.usedSavingPct" class="saving">−{{ item.usedSavingPct }}%</span>
                <span v-else class="muted">—</span>
              </td>
              <td class="why" :data-label="c.colWhy">
                {{ item.reason }}
                <em v-if="item.usedNote" class="used-note">{{ item.usedNote }}</em>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ── Con lo que tengo ──────────────────────────────────────────────── -->
    <section id="calculadora" class="equipar-section" aria-labelledby="calc-title">
      <h2 id="calc-title">{{ c.calcTitle }}</h2>
      <p class="section-intro">{{ c.calcIntro }}</p>

      <div class="calc-controls">
        <label class="calc-budget">
          <span>{{ c.calcBudget }}</span>
          <input v-model="budgetInput" type="number" inputmode="numeric" min="0" step="1000" />
        </label>
        <label class="calc-toggle">
          <input v-model="acceptUsed" type="checkbox" />
          <span>{{ c.calcAcceptUsed }}</span>
        </label>
        <VBtn variant="text" :disabled="!budgetInput && !owned.length" @click="resetPlan">
          {{ c.reset }}
        </VBtn>
      </div>

      <details v-if="items.length" class="owned">
        <summary>{{ c.calcOwnedTitle }}</summary>
        <p class="owned-hint">{{ c.calcOwnedHint }}</p>
        <ul class="owned-list">
          <li v-for="category in categories" :key="category.key">
            <label>
              <input v-model="owned" type="checkbox" :value="category.key" />
              <span>{{ category.label }}</span>
            </label>
          </li>
        </ul>
      </details>

      <p v-if="!budget" class="empty-note">{{ c.calcEmpty }}</p>

      <div v-else class="plan">
        <p class="plan-headline">
          {{ c.calcReach.replace('{budget}', equiparMoney(budget)) }} —
          {{
            c.calcCovered
              .replace('{n}', String(affordedCount))
              .replace('{total}', String(plan.lines.length))
          }}
        </p>
        <ol class="plan-list">
          <li
            v-for="line in plan.lines"
            :key="line.item.key"
            :class="{ 'not-afforded': !line.afforded }"
          >
            <span class="plan-name">
              {{ line.item.categoryLabel }}
              <span class="plan-variant">{{ line.item.variantLabel }}</span>
              <span v-if="line.condition === 'used'" class="plan-used">{{
                c.colUsed.toLowerCase()
              }}</span>
            </span>
            <span class="plan-price">{{ equiparMoney(line.totalUyu) }}</span>
          </li>
        </ol>
        <p v-if="plan.cutAt" class="plan-cut">
          {{ c.calcCut.replace('{item}', plan.cutAt.item.categoryLabel) }}
        </p>
        <p class="plan-footer">
          <span v-if="plan.leftoverUyu > 0">{{
            c.calcLeftover.replace('{amount}', equiparMoney(plan.leftoverUyu))
          }}</span>
          <span v-if="plan.missingUyu > 0">{{
            c.calcMissing.replace('{amount}', equiparMoney(plan.missingUyu))
          }}</span>
        </p>
      </div>
    </section>

    <!-- ── Lo que ningún precio dice ─────────────────────────────────────── -->
    <section id="consejos" class="equipar-section" aria-labelledby="notes-title">
      <h2 id="notes-title">{{ c.notesTitle }}</h2>
      <p class="section-intro">{{ c.notesIntro }}</p>
      <div class="notes-grid">
        <article v-for="note in c.notes" :key="note.title" class="note-card">
          <h3>{{ note.title }}</h3>
          <p>{{ note.text }}</p>
        </article>
      </div>
      <p class="thread-credit">
        <a :href="EQUIPAR_THREAD" target="_blank" rel="noopener noreferrer">{{ c.threadCredit }}</a>
      </p>
    </section>

    <!-- ── De dónde salen los precios ────────────────────────────────────── -->
    <section id="metodo" class="equipar-section" aria-labelledby="method-title">
      <h2 id="method-title">{{ c.methodTitle }}</h2>
      <p v-for="(paragraph, index) in c.method" :key="index" class="method-p">{{ paragraph }}</p>

      <details v-if="runs.length" class="sources">
        <summary>{{ c.sourcesLabel }}</summary>
        <ul class="source-list">
          <li v-for="run in runs" :key="run.key" :class="{ failed: !run.ok }">
            <strong>{{ run.label }}</strong>
            <span>{{ run.listings }} · {{ run.note }}</span>
          </li>
        </ul>
      </details>
    </section>

    <FaqSection :items="faqItems" :heading="c.faqTitle" :expanded="true" />

    <section class="equipar-section related" aria-labelledby="related-title">
      <h2 id="related-title">{{ c.relatedTitle }}</h2>
      <ul class="related-list">
        <li v-for="link in c.related" :key="link.to">
          <NuxtLink :to="localePath(link.to)">{{ link.label }}</NuxtLink>
          <span>{{ link.hint }}</span>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { EQUIPAR_PATH, EQUIPAR_THREAD } from '~/utils/equiparCopy'
import { equiparEs } from '~/utils/equiparEs'
import { equiparEn } from '~/utils/equiparEn'
import { equiparPt } from '~/utils/equiparPt'
import {
  EQUIPAR_TIERS,
  EQUIPAR_TIER_ORDER,
  equiparMoney,
  equiparPlan,
  type EquiparItemDoc,
  type EquiparResponse,
  type EquiparTier,
} from '~/utils/equipar'

const { locale } = useI18n()
const localePath = useLocalePath()
const c = computed(() =>
  locale.value === 'en' ? equiparEn : locale.value === 'pt' ? equiparPt : equiparEs
)

// Server-rendered: the three totals have to exist in the HTML. They are the numbers a search engine
// can quote and the answer most visitors came for, and a client-only fetch would hide both.
const { data } = await useFetch<EquiparResponse>('/api/equipar', { key: 'equipar-casa' })

const items = computed<EquiparItemDoc[]>(() => data.value?.items ?? [])
const baskets = computed(() => data.value?.meta?.baskets ?? [])
const runs = computed(() => data.value?.meta?.runs ?? [])
const asOf = computed(() => data.value?.meta?.generatedAt?.slice(0, 10) ?? '')

const byTier = computed<Record<EquiparTier, EquiparItemDoc[]>>(() => {
  const grouped = { S: [], A: [], B: [], C: [] } as Record<EquiparTier, EquiparItemDoc[]>
  for (const item of items.value) grouped[item.tier]?.push(item)
  return grouped
})

/** One entry per category for the "I already have this" list; the table shows every variant. */
const categories = computed(() => {
  const seen = new Map<string, { key: string; label: string; tier: EquiparTier }>()
  for (const item of items.value) {
    if (!seen.has(item.category)) {
      seen.set(item.category, { key: item.category, label: item.categoryLabel, tier: item.tier })
    }
  }
  return [...seen.values()].sort((a, b) => EQUIPAR_TIER_ORDER[a.tier] - EQUIPAR_TIER_ORDER[b.tier])
})

// Planner state is deliberately not persisted: it is one session's arithmetic, like the budget on
// /primer-alquiler-uruguay.
const budgetInput = ref('')
const acceptUsed = ref(true)
const owned = ref<string[]>([])

const budget = computed(() => {
  const value = Number(budgetInput.value)
  return Number.isFinite(value) && value > 0 ? value : 0
})

const plan = computed(() =>
  equiparPlan({
    items: items.value,
    budgetUyu: budget.value,
    acceptUsed: acceptUsed.value,
    owned: new Set(owned.value),
  })
)
const affordedCount = computed(() => plan.value.lines.filter(line => line.afforded).length)

function resetPlan(): void {
  budgetInput.value = ''
  owned.value = []
}

const faqItems = computed(() =>
  c.value.faq.map((entry, index) => ({
    id: `equipar-${index}`,
    question: entry.q,
    answer: entry.a,
  }))
)

const canonical = computed(() => `https://cambio-uruguay.com${localePath(EQUIPAR_PATH)}`)

defineOgImageComponent('Cambio', {
  title: () => c.value.shortTitle,
  subtitle: () =>
    baskets.value[0] ? `Mínima ${equiparMoney(baskets.value[0].totalUyu)}` : c.value.quickTitle,
  tag: 'VIVIENDA',
})

useSeoMeta({
  title: () => `${c.value.title} | Cambio Uruguay`,
  description: () => c.value.description,
  ogTitle: () => c.value.title,
  ogDescription: () => c.value.description,
  ogType: 'article',
  ogUrl: () => canonical.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => c.value.title,
  twitterDescription: () => c.value.description,
})

// FAQPage schema is emitted by FaqSection, so it is deliberately not repeated here.
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: c.value.title,
            description: c.value.description,
            dateModified: asOf.value || undefined,
            inLanguage: locale.value,
            mainEntityOfPage: canonical.value,
            author: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com/acerca',
            },
          },
          {
            '@type': 'ItemList',
            name: c.value.tierTitle,
            itemListOrder: 'https://schema.org/ItemListOrderDescending',
            numberOfItems: items.value.length,
            itemListElement: items.value.slice(0, 40).map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: `${item.categoryLabel} — ${item.variantLabel}`,
            })),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: `https://cambio-uruguay.com${localePath('/')}`,
              },
              { '@type': 'ListItem', position: 2, name: c.value.title, item: canonical.value },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.equipar {
  max-width: 1120px;
}
.equipar p {
  margin: 12px 0 0;
}
.eyebrow {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}
.equipar-header h1 {
  margin: 6px 0 0;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  line-height: 1.2;
}
.lead {
  max-width: 62ch;
  font-size: 1.075rem;
}
.as-of {
  font-size: 0.875rem;
  opacity: 0.7;
}
.section-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin: 20px 0 0;
  padding: 12px 0;
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.2);
}
.section-nav a {
  font-size: 0.875rem;
  text-decoration: none;
  color: rgb(var(--v-theme-primary));
}
.section-nav a:hover {
  text-decoration: underline;
}
.equipar-section {
  margin-top: 40px;
}
.equipar-section h2 {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  margin: 0;
}
.section-intro {
  max-width: 68ch;
  opacity: 0.85;
}
.empty-note {
  padding: 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.95rem;
}

/* Canastas */
.basket-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 20px;
}
.basket-card {
  padding: 24px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 1);
}
.basket-card h3 {
  margin: 0;
  font-size: 1.075rem;
}
.basket-blurb {
  font-size: 0.875rem;
  opacity: 0.8;
}
.basket-total {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px !important;
}
.basket-total .amount {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.1;
}
.basket-total .usd {
  font-size: 0.875rem;
  opacity: 0.7;
}
.basket-count {
  font-size: 0.8rem;
  opacity: 0.7;
}
.basket-missing {
  margin-top: 12px !important;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-warning), 0.12);
  font-size: 0.8rem;
}
.basket-ok {
  font-size: 0.8rem;
  opacity: 0.65;
}

/* Tier list */
.tier-block {
  margin-top: 28px;
}
.tier-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.05);
}
.tier-head h3 {
  margin: 0;
  font-size: 1rem;
}
.tier-head p {
  margin: 2px 0 0 !important;
  font-size: 0.8rem;
  opacity: 0.75;
}
.tier-letter {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 1.075rem;
  color: #fff;
  background: #64748b;
}
.tier-s .tier-letter {
  background: #b91c1c;
}
.tier-a .tier-letter {
  background: #c2410c;
}
.tier-b .tier-letter {
  background: #0369a1;
}
.tier-c .tier-letter {
  background: #475569;
}
.tier-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 0.875rem;
}
.tier-table th,
.tier-table td {
  padding: 12px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.18);
}
.tier-table thead th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
}
.item-name {
  display: block;
  font-weight: 600;
}
.item-variant,
.item-qty,
.obs {
  display: block;
  font-size: 0.75rem;
  opacity: 0.7;
  font-weight: 400;
}
.price {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.saving {
  font-weight: 700;
  color: rgb(var(--v-theme-success));
}
.muted {
  opacity: 0.55;
  font-size: 0.875rem;
}
.why {
  max-width: 40ch;
  font-size: 0.875rem;
  opacity: 0.9;
}
.used-note {
  display: block;
  margin-top: 6px;
  font-size: 0.8rem;
  opacity: 0.85;
}

/* Planner */
.calc-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
  margin-top: 18px;
}
.calc-budget {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.875rem;
}
.calc-budget input {
  width: 190px;
  padding: 8px 12px;
  border: 1px solid rgba(var(--v-border-color), 0.4);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font-size: 1rem;
}
.calc-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  padding-bottom: 9px;
}
.owned {
  margin-top: 18px;
}
.owned summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
}
.owned-hint {
  font-size: 0.875rem;
  opacity: 0.75;
}
.owned-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 6px 16px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.owned-list label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.875rem;
}
.plan {
  margin-top: 20px;
}
.plan-headline {
  font-weight: 600;
}
.plan-list {
  margin: 12px 0 0;
  padding-left: 22px;
}
.plan-list li {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
}
.plan-list li.not-afforded {
  opacity: 0.45;
  text-decoration: line-through;
}
.plan-variant {
  opacity: 0.7;
  font-size: 0.8rem;
}
.plan-used {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  background: rgba(var(--v-theme-on-surface), 0.1);
}
.plan-price {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.plan-cut {
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-warning), 0.14);
  font-size: 0.875rem;
}
.plan-footer {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  font-size: 0.875rem;
  opacity: 0.85;
}

/* Notes */
.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 18px;
}
.note-card {
  padding: 16px;
  border-left: 3px solid rgb(var(--v-theme-primary));
  border-radius: 0 12px 12px 0;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.note-card h3 {
  margin: 0;
  font-size: 1rem;
}
.note-card p {
  font-size: 0.875rem;
  opacity: 0.9;
}
.thread-credit {
  font-size: 0.875rem;
}
.method-p {
  max-width: 74ch;
  font-size: 0.95rem;
}
.sources {
  margin-top: 18px;
}
.sources summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
}
.source-list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
}
.source-list li {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 5px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
}
.source-list li.failed {
  color: rgb(var(--v-theme-error));
}
.related-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px 20px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.related-list li {
  display: flex;
  flex-direction: column;
}
.related-list span {
  font-size: 0.8rem;
  opacity: 0.72;
}

@media (max-width: 700px) {
  .why {
    max-width: none;
  }
}
</style>
