<!--
THESIS: Make the handover of a first rented home understandable, starting with the CGN house case.
OWN-WORLD: Inherit Cambio Uruguay's Open Sans, navy/paper surfaces and semantic blue links.
STORY: Identify bills, collect the handover documents, change utility holders, reserve money.
FIRST VIEWPORT: Plain title, four immediately reachable section links, then the direct answer.
FORM: Handover checklist with a recurring-bill ledger and an optional budget; grounded structure 6,
surface seed 98df6264. Read mode, phone at a viewing or signing; respect the user's saved theme.
-->
<template>
  <VContainer class="first-rental py-6 py-md-10">
    <header class="rental-header">
      <p class="eyebrow">{{ c.eyebrow }}</p>
      <h1>{{ c.title }}</h1>
      <p class="lead">{{ c.intro }}</p>
    </header>

    <nav class="section-nav" :aria-label="c.navLabel">
      <a v-for="item in c.nav" :key="item.id" :href="`#${item.id}`">{{ item.label }}</a>
    </nav>

    <section class="quick-answer" aria-labelledby="quick-title">
      <h2 id="quick-title">{{ c.quickTitle }}</h2>
      <p>{{ c.quickAnswer }}</p>
      <div class="source-links">
        <a
          v-for="key in quickSources"
          :key="key"
          :href="sources[key].url"
          target="_blank"
          rel="noopener noreferrer"
          :title="c.sourceNewTab"
        >
          {{ c.sourceLabels[key] }}
        </a>
      </div>
      <p class="scope-note">{{ c.scope }}</p>
    </section>

    <section id="llaves" class="guide-section" aria-labelledby="keys-title">
      <div class="section-top">
        <div>
          <h2 id="keys-title">{{ c.checklistTitle }}</h2>
          <p class="section-intro">{{ c.checklistIntro }}</p>
        </div>
        <span class="check-count" role="status">{{ checklistStatus }}</span>
      </div>
      <ul class="handover-list">
        <li
          v-for="item in c.checklist"
          :key="item.id"
          :class="{ resolved: checked.includes(item.id) }"
        >
          <label :for="`check-${item.id}`">
            <input :id="`check-${item.id}`" v-model="checked" type="checkbox" :value="item.id" />
            <span>
              <strong>{{ item.title }}</strong>
              <span class="check-detail">{{ item.text }}</span>
            </span>
          </label>
        </li>
      </ul>
      <div class="check-footer">
        <div class="source-links">
          <a
            :href="sources.landlord.url"
            target="_blank"
            rel="noopener noreferrer"
            :title="c.sourceNewTab"
            >{{ c.sourceLabels.landlord }}</a
          >
          <a
            :href="sources.cgnRights.url"
            target="_blank"
            rel="noopener noreferrer"
            :title="c.sourceNewTab"
            >{{ c.sourceLabels.cgnRights }}</a
          >
        </div>
        <VBtn variant="text" :disabled="checked.length === 0" @click="checked = []">
          {{ c.reset }}
        </VBtn>
      </div>
    </section>

    <section id="cuentas" class="guide-section" aria-labelledby="bills-title">
      <h2 id="bills-title">{{ c.billsTitle }}</h2>
      <p class="section-intro">{{ c.billsIntro }}</p>
      <div class="bill-ledger">
        <article v-for="bill in c.bills" :key="bill.id" class="bill-row">
          <h3>{{ bill.title }}</h3>
          <div>
            <p>{{ bill.text }}</p>
            <div class="source-links">
              <a
                v-for="key in bill.sources"
                :key="key"
                :href="sources[key].url"
                target="_blank"
                rel="noopener noreferrer"
                :title="c.sourceNewTab"
              >
                {{ c.sourceLabels[key] }}
              </a>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section id="territorio" class="guide-section" aria-labelledby="territory-title">
      <h2 id="territory-title">{{ c.territoryTitle }}</h2>
      <div class="territory-grid">
        <article v-for="area in c.territory" :key="area.id">
          <h3>{{ area.title }}</h3>
          <p>{{ area.text }}</p>
          <div class="source-links">
            <a
              v-for="key in area.sources"
              :key="key"
              :href="sources[key].url"
              target="_blank"
              rel="noopener noreferrer"
              :title="c.sourceNewTab"
            >
              {{ c.sourceLabels[key] }}
            </a>
          </div>
        </article>
      </div>
    </section>

    <section id="tramites" class="guide-section" aria-labelledby="procedures-title">
      <h2 id="procedures-title">{{ c.proceduresTitle }}</h2>
      <article v-for="step in c.procedures" :key="step.id" class="procedure">
        <h3>{{ step.title }}</h3>
        <p>{{ step.text }}</p>
        <div class="source-links">
          <a
            v-for="key in step.sources"
            :key="key"
            :href="sources[key].url"
            target="_blank"
            rel="noopener noreferrer"
            :title="c.sourceNewTab"
          >
            {{ c.sourceLabels[key] }}
          </a>
        </div>
      </article>
    </section>

    <section
      id="responsabilidades"
      class="guide-section reading-block"
      aria-labelledby="owner-title"
    >
      <h2 id="owner-title">{{ c.ownerTitle }}</h2>
      <p>{{ c.ownerText }}</p>
      <div class="source-links">
        <a
          :href="sources.propertyTax.url"
          target="_blank"
          rel="noopener noreferrer"
          :title="c.sourceNewTab"
          >{{ c.sourceLabels.propertyTax }}</a
        >
        <a
          :href="sources.primaryTax.url"
          target="_blank"
          rel="noopener noreferrer"
          :title="c.sourceNewTab"
          >{{ c.sourceLabels.primaryTax }}</a
        >
      </div>
      <p>{{ c.repairsText }}</p>
      <div class="source-links">
        <a
          :href="sources.cgnRights.url"
          target="_blank"
          rel="noopener noreferrer"
          :title="c.sourceNewTab"
          >{{ c.sourceLabels.cgnRights }}</a
        >
      </div>
    </section>

    <section id="entrada" class="guide-section reading-block" aria-labelledby="entry-title">
      <h2 id="entry-title">{{ c.entryTitle }}</h2>
      <p>{{ c.entryText }}</p>
      <div class="source-links">
        <a
          :href="sources.cgnFee.url"
          target="_blank"
          rel="noopener noreferrer"
          :title="c.sourceNewTab"
          >{{ c.sourceLabels.cgnFee }}</a
        >
      </div>
    </section>

    <section id="presupuesto" class="guide-section budget-section" aria-labelledby="budget-title">
      <h2 id="budget-title">{{ c.budgetTitle }}</h2>
      <p class="section-intro">{{ c.budgetIntro }}</p>
      <div class="budget-grid">
        <div class="budget-fields">
          <div v-for="key in BUDGET_FIELDS" :key="key" class="budget-field">
            <label :for="`budget-${key}`">{{ c.fields[key].label }} <span>(UYU)</span></label>
            <input
              :id="`budget-${key}`"
              v-model="budget[key]"
              type="number"
              inputmode="decimal"
              min="0"
              max="1000000000"
              step="0.01"
              :aria-describedby="`hint-${key}${result.invalid.includes(key) ? ` error-${key}` : ''}`"
              :aria-invalid="result.invalid.includes(key)"
            />
            <p :id="`hint-${key}`" class="field-hint">{{ c.fields[key].hint }}</p>
            <p v-if="result.invalid.includes(key)" :id="`error-${key}`" class="field-error">
              {{ c.invalid }}
            </p>
          </div>
          <label class="cgn-toggle" for="budget-cgn">
            <input
              id="budget-cgn"
              v-model="budget.cgn"
              type="checkbox"
              aria-describedby="cgn-hint"
            />
            <span>{{ c.cgnLabel }}</span>
          </label>
          <p id="cgn-hint" class="field-hint">{{ c.cgnHint }}</p>
        </div>
        <div class="budget-result" aria-live="polite" aria-atomic="true">
          <template v-if="result.invalid.length === 0 && result.monthly !== null">
            <p v-if="result.missing.length" class="partial-note">{{ c.missing }}</p>
            <dl>
              <div v-if="budget.cgn">
                <dt>{{ c.feeResult }}</dt>
                <dd>{{ money(result.fee) }}</dd>
              </div>
              <div class="result-main">
                <dt>{{ c.monthlyResult }}</dt>
                <dd data-testid="rental-monthly">{{ money(result.monthly) }}</dd>
              </div>
              <div v-if="result.entryReserve !== null">
                <dt>{{ c.entryResult }}</dt>
                <dd data-testid="rental-entry">{{ money(result.entryReserve) }}</dd>
              </div>
            </dl>
          </template>
          <p v-else>{{ result.invalid.length ? c.invalid : c.budgetEmpty }}</p>
          <p class="budget-note">{{ c.budgetNote }}</p>
        </div>
      </div>
    </section>

    <section id="preguntas" class="guide-section" aria-labelledby="faq-title">
      <h2 id="faq-title">{{ c.faqTitle }}</h2>
      <details v-for="faq in c.faq" :key="faq.q" class="rental-faq">
        <summary>{{ faq.q }}</summary>
        <p>{{ faq.a }}</p>
      </details>
    </section>

    <section class="guide-section" aria-labelledby="related-title">
      <h2 id="related-title">{{ c.relatedTitle }}</h2>
      <ul class="related-links">
        <li v-for="link in c.related" :key="link.path">
          <NuxtLink :to="localePath(link.path)">{{ link.label }}</NuxtLink>
        </li>
      </ul>
    </section>

    <footer id="fuentes" class="guide-section sources-section">
      <h2>{{ c.sourcesTitle }}</h2>
      <p class="section-intro">{{ c.reviewed }}</p>
      <ul class="source-index">
        <li v-for="(source, key) in sources" :key="key">
          <a :href="source.url" target="_blank" rel="noopener noreferrer" :title="c.sourceNewTab">{{
            c.sourceLabels[key]
          }}</a>
        </li>
      </ul>
    </footer>
  </VContainer>
</template>

<script setup lang="ts">
import {
  BUDGET_FIELDS,
  FIRST_RENTAL_PATH,
  FIRST_RENTAL_REVIEWED,
  FIRST_RENTAL_SOURCES as sources,
  firstRentalBudget,
  type FirstRentalBudgetInput,
  type FirstRentalSource,
} from '~/utils/firstRental'
import { firstRentalEs } from '~/utils/firstRentalEs'
import { firstRentalEn } from '~/utils/firstRentalEn'
import { firstRentalPt } from '~/utils/firstRentalPt'

const { locale } = useI18n()
const localePath = useLocalePath()
const c = computed(() =>
  locale.value === 'en' ? firstRentalEn : locale.value === 'pt' ? firstRentalPt : firstRentalEs
)
const quickSources: FirstRentalSource[] = ['cgnFee', 'cgnBills']
const checked = ref<string[]>([])
const checklistStatus = computed(() =>
  c.value.checked
    .replace('{done}', String(checked.value.length))
    .replace('{total}', String(c.value.checklist.length))
)
const budget = reactive<FirstRentalBudgetInput>({
  rent: '',
  monthly: '',
  bimonthly: '',
  entry: '',
  cgn: true,
})
const result = computed(() => firstRentalBudget(budget))
const money = (value: number | null) =>
  new Intl.NumberFormat(
    locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY',
    { style: 'currency', currency: 'UYU', maximumFractionDigits: 2 }
  ).format(value ?? 0)

const canonical = computed(() => `https://cambio-uruguay.com${localePath(FIRST_RENTAL_PATH)}`)
defineOgImageComponent('Cambio', {
  title: () => c.value.title,
  subtitle: () => c.value.quickTitle,
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
            dateModified: FIRST_RENTAL_REVIEWED,
            inLanguage: locale.value,
            mainEntityOfPage: canonical.value,
            author: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com/acerca',
            },
          },
          {
            '@type': 'FAQPage',
            mainEntity: c.value.faq.map(faq => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.a },
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
.first-rental {
  max-width: 1080px;
}
.first-rental p {
  margin: 12px 0 0;
  line-height: 1.65;
}
.first-rental h1,
.first-rental h2,
.first-rental h3 {
  margin: 0;
  text-wrap: balance;
}
.first-rental h1 {
  max-width: 29ch;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.14;
  letter-spacing: -0.02em;
}
.first-rental h2 {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.25;
}
.first-rental h3 {
  font-size: 1.075rem;
  font-weight: 700;
  line-height: 1.45;
}
.first-rental a {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.first-rental a:hover {
  text-decoration-thickness: 2px;
}
.first-rental :is(a, input, summary):focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
}
.rental-header {
  margin-bottom: 24px;
}
.first-rental .eyebrow {
  margin: 0 0 12px;
  color: rgb(var(--v-theme-link));
  font-size: 0.8rem;
  font-weight: 700;
}
.lead {
  max-width: 72ch;
  font-size: 1.075rem;
}
.quick-answer {
  padding: 24px;
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
}
.quick-answer > p {
  max-width: 80ch;
}
.first-rental .scope-note {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  font-size: 0.875rem;
}
.source-links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 12px;
  font-size: 0.8rem;
}
.source-links a {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
}
.section-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  padding: 16px 0;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}
.section-nav a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 0.95rem;
  font-weight: 700;
}
.guide-section {
  margin-top: 48px;
  scroll-margin-top: 88px;
}
.section-intro {
  max-width: 75ch;
  font-size: 0.95rem;
}
.section-top {
  display: flex;
  gap: 16px;
  align-items: start;
  justify-content: space-between;
}
.section-top > div {
  min-width: 0;
}
.check-count {
  flex-shrink: 0;
  padding-top: 4px;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(var(--v-theme-link));
}
.handover-list {
  list-style: none;
  padding: 0;
  margin: 24px 0 0;
}
.handover-list li {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}
.handover-list label {
  display: flex;
  align-items: start;
  gap: 16px;
  padding: 20px 8px;
  cursor: pointer;
}
.handover-list label:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.first-rental input[type='checkbox'] {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  margin-top: 2px;
  accent-color: rgb(var(--v-theme-primary));
  cursor: pointer;
}
.handover-list strong {
  display: block;
  font-weight: 700;
}
.check-detail {
  display: block;
  margin-top: 8px;
  max-width: 80ch;
  font-size: 0.95rem;
  line-height: 1.65;
}
.resolved strong {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}
.check-footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
}
.check-footer .source-links {
  margin: 0;
}
.bill-ledger {
  margin-top: 24px;
}
.bill-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 24px;
  padding: 24px 0;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}
.bill-row > div {
  min-width: 0;
}
.bill-row p {
  margin: 0;
  font-size: 0.95rem;
}
.territory-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32px;
  margin-top: 24px;
}
.territory-grid p {
  font-size: 0.95rem;
}
.procedure {
  margin-top: 24px;
  max-width: 80ch;
}
.reading-block {
  max-width: 80ch;
}
.budget-section {
  padding: 24px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.budget-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 32px;
  margin-top: 24px;
  align-items: start;
}
.budget-fields,
.budget-result {
  min-width: 0;
}
.budget-field + .budget-field {
  margin-top: 24px;
}
.budget-field label {
  display: block;
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 8px;
}
.budget-field label span {
  font-weight: 400;
}
.budget-field input {
  display: block;
  width: 100%;
  min-height: 48px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.5);
  border-radius: 4px;
  padding: 10px 12px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-background));
  font: inherit;
  font-variant-numeric: tabular-nums;
}
.first-rental .field-hint {
  margin-top: 8px;
  font-size: 0.875rem;
  line-height: 1.5;
}
.first-rental .field-error {
  color: rgb(var(--v-theme-error));
  font-size: 0.875rem;
}
.cgn-toggle {
  display: flex;
  gap: 12px;
  align-items: start;
  padding-top: 24px;
  min-height: 44px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 700;
}
.budget-result {
  padding: 24px;
  background: rgba(var(--v-theme-primary), 0.07);
  border-radius: 12px;
}
.budget-result dl {
  margin: 0;
}
.budget-result dl > div + div {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}
.budget-result dt {
  font-size: 0.95rem;
  line-height: 1.5;
}
.budget-result dd {
  margin: 8px 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.budget-result .partial-note {
  margin: 0 0 24px;
  font-size: 0.875rem;
  font-weight: 700;
}
.first-rental .budget-note {
  margin-top: 24px;
  font-size: 0.875rem;
}
.rental-faq {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}
.rental-faq:first-of-type {
  margin-top: 16px;
}
.rental-faq summary {
  padding: 20px 8px;
  cursor: pointer;
  font-weight: 700;
  line-height: 1.5;
}
.rental-faq p {
  margin: 0 8px 24px;
  max-width: 75ch;
}
.related-links,
.source-index {
  padding: 0;
  margin: 16px 0 0;
  list-style: none;
}
.related-links a,
.source-index a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
}
.source-index {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 24px;
  font-size: 0.875rem;
}
.sources-section {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  padding-top: 24px;
}
@media (max-width: 599px) {
  .quick-answer,
  .budget-section {
    padding: 20px 16px;
  }
  .section-top {
    display: block;
  }
  .check-count {
    display: block;
    margin-top: 12px;
  }
  .bill-row,
  .territory-grid,
  .budget-grid,
  .source-index {
    grid-template-columns: minmax(0, 1fr);
  }
  .bill-row {
    gap: 12px;
  }
  .budget-result {
    padding: 20px 16px;
  }
  .guide-section {
    margin-top: 40px;
  }
  .source-links a {
    min-height: 44px;
  }
  .section-nav {
    gap: 4px 20px;
  }
}
</style>
