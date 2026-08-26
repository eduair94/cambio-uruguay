<template>
  <div class="pz" data-testid="pizarra">
    <div class="pz-wrap">
      <header class="pz-head">
        <NuxtLink :to="localePath('/')" class="pz-brand">cambio-uruguay.com</NuxtLink>
        <span class="pz-date" data-testid="pizarra-date">{{ boardDate }}</span>
      </header>

      <h1 class="pz-title">{{ t('pizarra.h1') }}</h1>

      <!-- The board. One screen, four currencies, nothing to click through. -->
      <section class="pz-board" :aria-label="t('pizarra.boardLabel')">
        <div class="pz-board-head" aria-hidden="true">
          <span />
          <span>{{ t('pizarra.buy') }}</span>
          <span>{{ t('pizarra.sell') }}</span>
        </div>
        <div
          v-for="entry in scaledBoard"
          :key="entry.code"
          class="pz-row"
          :data-testid="`pizarra-row-${entry.code}`"
        >
          <div class="pz-cur">
            <span class="pz-code">{{ entry.code }}</span>
            <span class="pz-cur-name">{{ t(`codes.${entry.code}`) }}</span>
          </div>
          <div class="pz-cell">
            <span class="pz-num" :data-testid="`pizarra-buy-${entry.code}`">{{
              money(entry.buy.value)
            }}</span>
            <NuxtLink
              v-if="entry.buy.origin"
              :to="localePath(`/casa/${entry.buy.origin}`)"
              class="pz-who"
              >{{ entry.buy.name }}</NuxtLink
            >
            <span v-else class="pz-who pz-who--none">—</span>
          </div>
          <div class="pz-cell">
            <span class="pz-num" :data-testid="`pizarra-sell-${entry.code}`">{{
              money(entry.sell.value)
            }}</span>
            <NuxtLink
              v-if="entry.sell.origin"
              :to="localePath(`/casa/${entry.sell.origin}`)"
              class="pz-who"
              >{{ entry.sell.name }}</NuxtLink
            >
            <span v-else class="pz-who pz-who--none">—</span>
          </div>
        </div>
      </section>

      <p class="pz-legend">{{ t('pizarra.boardHint') }}</p>

      <!-- Calculator. A real GET form, so it works with JavaScript disabled:
           submitting reloads with ?c=<amount> and the server renders the
           multiplied board. With JS on, the input updates it as you type. -->
      <form class="pz-calc" method="get" action="" @submit.prevent="applyAmount">
        <label class="pz-calc-label" for="pz-amount">{{ t('pizarra.amountLabel') }}</label>
        <input
          id="pz-amount"
          v-model="amountInput"
          class="pz-input"
          type="text"
          inputmode="decimal"
          name="c"
          autocomplete="off"
          :aria-label="t('pizarra.amountLabel')"
          data-testid="pizarra-amount"
        />
        <button class="pz-btn" type="submit" data-testid="pizarra-calc">
          {{ t('pizarra.calc') }}
        </button>
        <button
          v-if="amount !== 1"
          class="pz-btn pz-btn--ghost"
          type="button"
          data-testid="pizarra-reset"
          @click="resetAmount"
        >
          {{ t('pizarra.reset') }}
        </button>
      </form>

      <!-- What dolar.uy does not have: the whole market, nothing filtered. -->
      <section class="pz-full">
        <h2 class="pz-h2">{{ t('pizarra.allTitle') }}</h2>
        <p class="pz-legend">{{ t('pizarra.allHint') }}</p>

        <div v-if="!groups.length" class="pz-empty" data-testid="pizarra-empty">
          {{ t('pizarra.unavailable') }}
        </div>

        <div v-for="group in groups" :key="group.code" class="pz-group">
          <h3 class="pz-h3">
            {{ group.code }} <span class="pz-cur-name">{{ safeCurrencyName(group.code) }}</span>
            <span class="pz-count">{{ group.rows.length }}</span>
          </h3>
          <div class="pz-table-wrap">
            <table class="pz-table" :data-testid="`pizarra-table-${group.code}`">
              <thead>
                <tr>
                  <th scope="col">{{ t('pizarra.house') }}</th>
                  <th scope="col" class="pz-r">{{ t('pizarra.buy') }}</th>
                  <th scope="col" class="pz-r">{{ t('pizarra.sell') }}</th>
                  <th scope="col">{{ t('pizarra.kind') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in group.rows"
                  :key="`${r.origin}-${r.type}`"
                  data-testid="pizarra-quote"
                >
                  <td>
                    <NuxtLink :to="localePath(`/casa/${r.origin}`)" class="pz-link">{{
                      r.name
                    }}</NuxtLink>
                  </td>
                  <td class="pz-r" :class="{ 'pz-best': r.bestBuy }">{{ money(scale(r.buy)) }}</td>
                  <td class="pz-r" :class="{ 'pz-best': r.bestSell }">
                    {{ money(scale(r.sell)) }}
                  </td>
                  <td>
                    <span class="pz-tag" :class="`pz-tag--${r.kind}`">{{ kindLabel(r.kind) }}</span>
                    <span v-if="r.type" class="pz-type">{{ r.type }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer class="pz-foot">
        <p class="pz-legend">{{ t('pizarra.disclaimer') }}</p>
        <nav class="pz-links" :aria-label="t('pizarra.moreLabel')">
          <NuxtLink :to="localePath('/')" class="pz-link">{{ t('pizarra.linkHome') }}</NuxtLink>
          <NuxtLink :to="localePath('/casas-de-cambio')" class="pz-link">{{
            t('pizarra.linkCasas')
          }}</NuxtLink>
          <NuxtLink :to="localePath('/historico')" class="pz-link">{{
            t('pizarra.linkHistory')
          }}</NuxtLink>
          <NuxtLink :to="localePath('/desarrolladores')" class="pz-link">{{
            t('pizarra.linkApi')
          }}</NuxtLink>
        </nav>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  buildBoard,
  buildComparison,
  parseAmount,
  scaleBoard,
  type PizarraRow,
  type QuoteKind,
} from '~/utils/pizarra'

// The zero-friction board: no site nav, no footer, no cookie banner, no
// third-party script, and no JavaScript required to read a price or run the
// calculator. `bare` routes are also skipped by the chat/analytics plugins.
//
// Everything is server-rendered, including the multiplied amounts, so the page
// is useful the instant the HTML lands — which is the entire appeal of the
// sites people currently use for this.
definePageMeta({ layout: 'widget' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()

// The full, unfiltered payload — `rows`, not `realRows`: this page shows the
// BCU reference and the interbank quotes too, each labelled for what it is.
const { rows } = useExchangeRates()

const allRows = computed<PizarraRow[]>(() => (rows.value ?? []) as PizarraRow[])
const board = computed(() => buildBoard(allRows.value))
const groups = computed(() => buildComparison(allRows.value))

/** Calculator amount, from `?c=` so a scaled board is shareable and no-JS. */
const amount = computed(() => parseAmount(route.query.c))
const amountInput = ref(String(route.query.c ?? '1'))
watch(
  () => route.query.c,
  v => {
    amountInput.value = String(v ?? '1')
  }
)

const scaledBoard = computed(() => scaleBoard(board.value, amount.value))
const scale = (v: number | null): number | null => (v === null ? null : v * amount.value)

const applyAmount = () => {
  const next = parseAmount(amountInput.value)
  router.replace({ query: next === 1 ? {} : { c: String(next) } })
}
const resetAmount = () => {
  amountInput.value = '1'
  router.replace({ query: {} })
}

/**
 * More decimals as the amount grows: at 1 unit the market quotes centésimos,
 * but ARS at 0,02 scaled by 1 would read "0,02" while by 1000 it is "20,00".
 * Two decimals is right for money; keep it simple and consistent.
 */
const money = (v: number | null): string =>
  v === null
    ? '—'
    : v.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const KIND_KEYS: Record<QuoteKind, string> = {
  cash: 'pizarra.kindCash',
  conditional: 'pizarra.kindConditional',
  wholesale: 'pizarra.kindWholesale',
  official: 'pizarra.kindOfficial',
}
const kindLabel = (k: QuoteKind): string => t(KIND_KEYS[k])

// `codes.<CODE>` covers the currencies the site tracks; the payload can carry
// an exotic one (XAU, UI) that has no key, and a missing key would render the
// raw path. Fall back to the code itself.
const safeCurrencyName = (code: string): string => {
  const key = `codes.${code}`
  const name = t(key)
  return name === key ? '' : name
}

/** Newest quote date in the payload — the board's "as of". */
const boardDate = computed(() => {
  const dates = (rows.value ?? [])
    .map(r => (r as { date?: string }).date)
    .filter((d): d is string => typeof d === 'string' && d.length >= 10)
  if (!dates.length) return ''
  const newest = dates.reduce((a, b) => (a > b ? a : b))
  return new Date(newest).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Montevideo',
  })
})

// --- SEO ---------------------------------------------------------------------
const canonicalUrl = computed(() => `https://cambio-uruguay.com${localePath('/pizarra')}`)

useSeoMeta({
  title: () => t('pizarra.metaTitle'),
  description: () => t('pizarra.metaDescription'),
  ogTitle: () => t('pizarra.h1'),
  ogDescription: () => t('pizarra.metaDescription'),
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  meta: [{ name: 'keywords', content: t('pizarra.keywords') }],
  script: [
    {
      type: 'application/ld+json',
      // La pizarra corre con `layout: 'widget'`: no hay cabecera ni miga de pan en pantalla, así
      // que sin este JSON-LD el rastreador no tiene NINGUNA señal de dónde cuelga la página. La
      // miga estructurada es la única que existe acá, y por eso importa más que en una página con
      // navegación visible.
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            '@id': canonicalUrl.value,
            name: t('pizarra.h1'),
            description: t('pizarra.metaDescription'),
            url: canonicalUrl.value,
            inLanguage: locale.value === 'es' ? 'es-UY' : locale.value,
            isPartOf: {
              '@type': 'WebSite',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: t('pizarra.h1'),
                item: canonicalUrl.value,
              },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* No Vuetify components and no third-party CSS, so the page paints as soon as
   the HTML arrives — but every value comes from the design system: the Vuetify
   theme tokens (which are already AA-paired for both themes) plus the DESIGN.md
   type ramp, radius and 4/8/16/24/40 spacing scale. Nothing is hand-picked. */
.pz {
  --pz-line: rgba(var(--v-theme-on-surface), 0.12);
  --pz-soft: rgba(var(--v-theme-on-surface), 0.62);
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-surface));
  padding: 16px 16px 40px;
}

.pz-wrap {
  max-width: 940px;
  margin: 0 auto;
}

.pz-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.75rem;
}

.pz-brand {
  color: rgb(var(--v-theme-link));
  font-weight: 700;
  text-decoration: none;
}

.pz-date {
  color: var(--pz-soft);
  font-variant-numeric: tabular-nums;
}

/* Headline step from the DESIGN.md ramp. */
.pz-title {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  margin: 8px 0 16px;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.pz-board {
  background: rgb(var(--v-theme-surface));
  border: 1px solid var(--pz-line);
  border-radius: 16px;
  overflow: hidden;
}

.pz-board-head,
.pz-row {
  display: grid;
  grid-template-columns: minmax(88px, 1fr) 1.35fr 1.35fr;
  gap: 8px;
  align-items: center;
  padding: 8px 16px;
}

/* Eyebrow step: 0.75rem / 700 / 0.18em uppercase. */
.pz-board-head {
  padding-bottom: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--pz-soft);
}

.pz-board-head span:nth-child(2),
.pz-board-head span:nth-child(3) {
  text-align: right;
}

.pz-row + .pz-row {
  border-top: 1px solid var(--pz-line);
}

.pz-cur {
  display: flex;
  flex-direction: column;
}

.pz-code {
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.02em;
}

.pz-cur-name {
  font-size: 0.75rem;
  color: var(--pz-soft);
  font-weight: 400;
}

.pz-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 0;
}

/* The whole point: the number is the biggest thing on the screen. Display step
   from the ramp — the compra/venta column headers carry the meaning, so the
   figures stay in the ink colour rather than each taking a signal colour they
   have not earned. */
.pz-num {
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.pz-who {
  font-size: 0.75rem;
  color: var(--pz-soft);
  text-decoration: none;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pz-who:hover {
  text-decoration: underline;
}

.pz-legend {
  font-size: 0.75rem;
  color: var(--pz-soft);
  line-height: 1.5;
  margin: 8px 0 0;
}

.pz-calc {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 16px 0 8px;
}

.pz-calc-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--pz-soft);
}

.pz-input {
  flex: 0 1 152px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid var(--pz-line);
  border-radius: 8px;
  color: rgb(var(--v-theme-on-surface));
  padding: 8px 16px;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  min-height: 44px;
}

.pz-input:focus-visible,
.pz-btn:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}

.pz-btn {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  border: 0;
  border-radius: 8px;
  font-weight: 700;
  padding: 8px 16px;
  min-height: 44px;
  cursor: pointer;
  font-size: 1rem;
}

.pz-btn--ghost {
  background: transparent;
  color: var(--pz-soft);
  border: 1px solid var(--pz-line);
}

.pz-full {
  margin-top: 24px;
}

.pz-h2 {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.6;
  margin: 0;
}

.pz-h3 {
  font-size: 1rem;
  font-weight: 700;
  margin: 16px 0 8px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.pz-count {
  font-size: 0.75rem;
  color: var(--pz-soft);
  font-weight: 400;
}

.pz-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--pz-line);
  border-radius: 12px;
}

.pz-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1rem;
}

.pz-table th,
.pz-table td {
  padding: 8px 16px;
  border-bottom: 1px solid var(--pz-line);
  white-space: nowrap;
  text-align: left;
}

.pz-table th {
  font-size: 0.75rem;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  color: var(--pz-soft);
  font-weight: 700;
}

.pz-table tr:last-child td {
  border-bottom: 0;
}

.pz-r {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* "Best in market" is a status, which is what a signal colour is for. The
   theme's success token is already AA-paired for both themes. */
.pz-best {
  color: rgb(var(--v-theme-success));
  font-weight: 700;
}

.pz-link {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}

.pz-link:hover {
  text-decoration: underline;
}

/* Label step, and the tag borders are tinted from the theme's own signal
   tokens rather than hand-picked greens/oranges, so both themes stay AA. */
.pz-tag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid var(--pz-line);
  color: var(--pz-soft);
}

.pz-tag--cash {
  border-color: rgba(var(--v-theme-success), 0.45);
  color: rgb(var(--v-theme-success));
}

.pz-tag--conditional {
  border-color: rgba(var(--v-theme-warning), 0.45);
  color: rgb(var(--v-theme-warning));
}

.pz-type {
  font-size: 0.75rem;
  color: var(--pz-soft);
  margin-left: 8px;
}

.pz-empty {
  border: 1px dashed var(--pz-line);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  color: var(--pz-soft);
  margin-top: 16px;
}

.pz-foot {
  margin-top: 24px;
  border-top: 1px solid var(--pz-line);
  padding-top: 16px;
}

.pz-links {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
  font-size: 1rem;
}

@media (max-width: 480px) {
  .pz-board-head,
  .pz-row {
    grid-template-columns: minmax(62px, 0.8fr) 1.3fr 1.3fr;
    padding: 8px 8px;
  }
}
</style>
