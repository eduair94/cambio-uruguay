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

        <!--
          One card per CATEGORY, not per variant row. The first version was a table with a row per
          category+variant, which repeated the same two-paragraph reason three times for the fridge,
          three for the mattress and three for the pot: the argument that justifies the tier became
          the wall of text you scroll past. Here the reason is said once and the sizes are a compact
          list under it.
        -->
        <div class="cat-grid">
          <article v-for="group in byTier[tier]" :key="group.key" class="cat-card">
            <div class="cat-media" aria-hidden="true">
              <img
                v-if="group.image"
                :src="group.image"
                alt=""
                loading="lazy"
                decoding="async"
                @error="onImageError(group.key)"
              />
              <VIcon v-else :icon="roomIcon(group.room)" size="34" class="cat-media__fallback" />
            </div>

            <div class="cat-body">
              <h4 class="cat-name">
                {{ group.label }}
                <span v-if="group.quantity > 1" class="cat-qty">{{
                  c.quantityLabel.replace('{n}', String(group.quantity))
                }}</span>
              </h4>
              <p class="cat-reason">{{ group.reason }}</p>
              <p v-if="group.usedNote" class="cat-used-note">{{ group.usedNote }}</p>

              <ul class="var-list">
                <li class="var-head" aria-hidden="true">
                  <span />
                  <span>{{ c.colNew }}</span>
                  <span>{{ c.colUsed }}</span>
                </li>
                <li v-for="item in group.items" :key="item.key" class="var-row">
                  <span class="var-name">{{ item.variantLabel }}</span>

                  <span class="var-cell">
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
                    <template v-else>
                      <span class="sr-only">{{ c.colNew }}: </span>
                      <span class="muted">{{ c.noData }}</span>
                    </template>
                  </span>

                  <span class="var-cell">
                    <span v-if="!item.usedOk" class="muted">{{ c.usedNotAdvised }}</span>
                    <template v-else-if="item.usedBand">
                      <span class="price">{{ equiparMoney(item.usedBand.median) }}</span>
                      <span v-if="item.usedSavingPct" class="saving">
                        −{{ item.usedSavingPct }}%
                      </span>
                      <span class="obs">{{
                        c.observations.replace('{n}', String(item.usedBand.n))
                      }}</span>
                    </template>
                    <template v-else>
                      <span class="sr-only">{{ c.colUsed }}: </span>
                      <span class="muted">{{ c.noUsedData }}</span>
                    </template>
                  </span>
                </li>
              </ul>
            </div>
          </article>
        </div>
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

interface CategoryGroup {
  key: string
  label: string
  room: EquiparItemDoc['room']
  reason: string
  usedNote?: string
  quantity: number
  image: string | null
  items: EquiparItemDoc[]
}

/** Images that 404 at run time: drop to the room icon rather than leave a broken frame. */
const brokenImages = ref<string[]>([])
function onImageError(key: string): void {
  if (!brokenImages.value.includes(key)) brokenImages.value.push(key)
}

const ROOM_ICONS: Record<EquiparItemDoc['room'], string> = {
  cocina: 'mdi-silverware-fork-knife',
  dormitorio: 'mdi-bed-outline',
  bano: 'mdi-shower',
  living: 'mdi-sofa-outline',
  limpieza: 'mdi-broom',
}
const roomIcon = (room: EquiparItemDoc['room']): string => ROOM_ICONS[room] || 'mdi-home-outline'

/**
 * One group per CATEGORY inside each tier.
 *
 * The reason a category sits in its tier is the same sentence for every size of it, so grouping is
 * what stops the page repeating two paragraphs three times per fridge. Item order inside the group
 * is whatever the API sent, which is already "priced first, then by size".
 */
const byTier = computed<Record<EquiparTier, CategoryGroup[]>>(() => {
  const grouped = { S: [], A: [], B: [], C: [] } as Record<EquiparTier, CategoryGroup[]>
  const seen = new Map<string, CategoryGroup>()
  for (const item of items.value) {
    let group = seen.get(item.category)
    if (!group) {
      group = {
        key: item.category,
        label: item.categoryLabel,
        room: item.room,
        reason: item.reason,
        usedNote: item.usedNote,
        quantity: item.quantity,
        image: item.image,
        items: [],
      }
      seen.set(item.category, group)
      grouped[item.tier]?.push(group)
    }
    // The first variant with a photo speaks for the category; a size without one still shows.
    if (!group.image && item.image) group.image = item.image
    group.items.push(item)
  }
  for (const group of seen.values()) {
    if (brokenImages.value.includes(group.key)) group.image = null
  }
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
/*
 * NOT `--v-theme-primary`. That token is #1976d2, which measures 4.29:1 on the paper canvas and
 * 4.18:1 on the midnight one — both under AA for text this size, and axe flagged six nodes of it
 * here while the sibling guide pages had none. The two DESIGN.md blues that do clear it are
 * ink-blue on light (5.4:1) and link-sky on dark (8.7:1), so each theme gets its own.
 */
.eyebrow {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1565c0;
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
  /* 44px of vertical hit area for a 14px link: WCAG 2.5.8 asks for 24, and a thumb asks for more. */
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 0.875rem;
  text-decoration: none;
  color: #1565c0;
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
/*
 * The four tier chips come from the DESIGN.md palette, and each one carries the text colour that
 * actually clears 4.5:1 on it — amber takes ink, the two deep ones take white. The quiet tier is
 * the only unsaturated chip on purpose: "can wait months" should not shout in the same register as
 * "the house does not work without it".
 */
.tier-letter {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 1.075rem;
  color: rgb(var(--v-theme-on-surface));
  background: rgba(var(--v-theme-on-surface), 0.12);
}
.tier-s .tier-letter {
  color: #ffffff;
  background: #bf360c;
}
.tier-a .tier-letter {
  color: #000000;
  background: #ff8f00;
}
.tier-b .tier-letter {
  color: #ffffff;
  background: #1565c0;
}
/* Tarjeta por categoría */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.cat-card {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}
.cat-media {
  display: grid;
  place-items: center;
  /* Reserved from the first paint: a photo that arrives late must not push the prices down. */
  aspect-ratio: 16 / 9;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.cat-media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 12px;
}
.cat-media__fallback {
  opacity: 0.3;
}
.cat-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
}
.cat-name {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  font-size: 1.075rem;
  line-height: 1.3;
}
.cat-qty {
  font-size: 0.75rem;
  font-weight: 400;
  opacity: 0.7;
}
.cat-reason {
  margin: 0 !important;
  font-size: 0.875rem;
  line-height: 1.5;
  opacity: 0.9;
  text-wrap: pretty;
}
.cat-used-note {
  margin: 0 !important;
  font-size: 0.8rem;
  font-style: italic;
  opacity: 0.85;
  text-wrap: pretty;
}
.var-list {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}
.var-head,
.var-row {
  display: grid;
  grid-template-columns: minmax(90px, 1.1fr) 1fr 1fr;
  gap: 4px 10px;
  align-items: baseline;
  padding: 8px 0;
}
.var-head {
  padding-bottom: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  /* 0.7 is the floor that still clears 4.5:1 on the paper canvas — see .muted. */
  opacity: 0.7;
}
.var-row + .var-row,
.var-head + .var-row {
  border-top: 1px solid rgba(var(--v-border-color), 0.18);
}
.var-name {
  font-size: 0.8rem;
  font-weight: 600;
}
.var-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.8rem;
}
.obs {
  font-size: 0.75rem;
  opacity: 0.7;
}
.price {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.saving {
  font-weight: 700;
  color: rgb(var(--v-theme-success));
}
/*
 * This is the text that says we do NOT have a price. The first production build had it at
 * opacity 0.55, which measured 3.64:1 on the paper canvas — the page's own disclosure was the
 * least readable thing on it, and axe counted 53 of them. 0.66 is where the same composite
 * clears 4.5:1; dark mode was already passing and only gets clearer.
 */
.muted {
  opacity: 0.66;
  font-size: 0.8rem;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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
  min-height: 44px;
  font-size: 0.875rem;
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
/*
 * The label IS the target. A bare checkbox renders at 13x13 here, and there are thirty-four of
 * them: WCAG 2.5.8 asks for 24x24, and a list of tick boxes you mis-tap is worse than no list.
 * Making the whole row clickable costs nothing and gives every one of them 32px.
 */
.owned-list label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 2px 0;
  cursor: pointer;
  font-size: 0.875rem;
}
.owned-list input,
.calc-toggle input {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  cursor: pointer;
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
