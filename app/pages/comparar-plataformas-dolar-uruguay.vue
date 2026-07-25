<!--
THESIS: A verification dossier proves breadth with evidence and refuses the category's unsupported
“we are best” landing page.
OWN-WORLD: Cambio Uruguay's dark market surfaces, blue primary ink, restrained semantic green,
hairline dividers, and compact audit labels.
STORY: The visitor sees the verdict, tests every criterion, recognizes honest competitor strengths,
checks sources, and opens live rates or analytics.
FIRST VIEWPORT: A concise claim and actions sit beside an audit ledger; the four-platform score rail
starts before the fold.
FORM: Grounded structure 3, an audit dossier with filtered evidence rows and source drawers; seed
eea14b93, staged as a verdict followed by a public record.
-->
<template>
  <main class="comparison-page">
    <VContainer class="comparison-shell py-5 py-md-8">
      <section class="comparison-hero mb-7" aria-labelledby="comparison-title">
        <div class="comparison-hero__content">
          <div class="comparison-kicker">
            <VIcon size="16">mdi-shield-check-outline</VIcon>
            {{ t('platformComparison.eyebrow') }}
          </div>
          <h1 id="comparison-title">{{ t('platformComparison.title') }}</h1>
          <p class="comparison-hero__subtitle">{{ t('platformComparison.subtitle') }}</p>

          <div class="comparison-actions">
            <VBtn :to="localePath('/')" color="primary" size="large">
              {{ t('platformComparison.primaryCta') }}
              <VIcon end>mdi-arrow-right</VIcon>
            </VBtn>
            <VBtn :to="localePath('/analiticas')" variant="outlined" size="large">
              {{ t('platformComparison.secondaryCta') }}
            </VBtn>
            <ShareButtons
              label
              variant="text"
              color="primary"
              :text="t('platformComparison.metaDescription')"
              :url="canonicalUrl"
            />
          </div>

          <div class="comparison-disclosure">
            <VIcon size="16">mdi-information-outline</VIcon>
            <span>{{ t('platformComparison.disclosure') }}</span>
          </div>
        </div>

        <aside class="audit-ledger" :aria-label="t('platformComparison.verdictKicker')">
          <div class="audit-ledger__stamp">
            <span>{{ t('platformComparison.verdictKicker') }}</span>
            <strong>
              {{ t('platformComparison.wins', { count: ownLeadCount, total: totalCriteria }) }}
            </strong>
          </div>
          <h2>{{ t('platformComparison.verdictTitle') }}</h2>
          <p>{{ t('platformComparison.verdictBody') }}</p>
          <dl>
            <div>
              <dt>01</dt>
              <dd>{{ t('platformComparison.proofInstitutions') }}</dd>
            </div>
            <div>
              <dt>02</dt>
              <dd>{{ t('platformComparison.proofCurrencies') }}</dd>
            </div>
            <div>
              <dt>03</dt>
              <dd>{{ t('platformComparison.proofFreshness') }}</dd>
            </div>
          </dl>
          <div class="audit-ledger__date">
            <VIcon size="16">mdi-calendar-check-outline</VIcon>
            {{ t('platformComparison.reviewed', { date: reviewedDate }) }}
          </div>
        </aside>
      </section>

      <section class="score-section mb-10" aria-labelledby="score-title">
        <div class="section-heading">
          <h2 id="score-title">{{ t('platformComparison.scoreTitle') }}</h2>
        </div>
        <div class="score-rail">
          <article
            v-for="platform in PLATFORM_KEYS"
            :key="platform"
            class="platform-score"
            :class="{ 'platform-score--own': platform === 'cambioUruguay' }"
          >
            <div class="platform-score__top">
              <span class="platform-score__name">
                {{ t(`platformComparison.platforms.${platform}.name`) }}
              </span>
              <VIcon v-if="platform === 'cambioUruguay'" color="primary" size="19">
                mdi-shield-check
              </VIcon>
            </div>
            <strong>{{ scores[platform] }}/{{ totalCriteria }}</strong>
            <span>{{ t('platformComparison.scoreLabel') }}</span>
            <p>{{ t(`platformComparison.platforms.${platform}.summary`) }}</p>
          </article>
        </div>
      </section>

      <section class="matrix-section mb-12" aria-labelledby="matrix-title">
        <div class="matrix-heading">
          <div class="section-heading">
            <h2 id="matrix-title">{{ t('platformComparison.matrixTitle') }}</h2>
            <p>{{ t('platformComparison.matrixIntro') }}</p>
          </div>
          <div class="matrix-filter">
            <span>{{ t('platformComparison.filterLabel') }}</span>
            <div class="matrix-filter__scroll">
              <VBtnToggle
                v-model="selectedCategory"
                mandatory
                color="primary"
                variant="outlined"
                density="comfortable"
              >
                <VBtn v-for="category in categories" :key="category" :value="category" size="small">
                  {{ t(`platformComparison.filters.${category}`) }}
                </VBtn>
              </VBtnToggle>
            </div>
          </div>
        </div>

        <div class="comparison-grid" role="table" :aria-label="t('platformComparison.matrixTitle')">
          <div class="comparison-grid__header" role="row">
            <div role="columnheader">{{ t('platformComparison.criterion') }}</div>
            <div v-for="platform in PLATFORM_KEYS" :key="platform" role="columnheader">
              {{ t(`platformComparison.platforms.${platform}.name`) }}
            </div>
          </div>

          <article
            v-for="criterion in visibleCriteria"
            :key="criterion.id"
            class="comparison-row"
            role="row"
          >
            <div class="criterion-evidence" role="cell">
              <h3>{{ t(`platformComparison.criteria.${criterion.id}.title`) }}</h3>
              <p>{{ t(`platformComparison.criteria.${criterion.id}.note`) }}</p>
              <details>
                <summary>
                  <VIcon size="15">mdi-link-variant</VIcon>
                  {{
                    t('platformComparison.sources', {
                      count: sourcesForCriterion(criterion).length,
                    })
                  }}
                </summary>
                <div class="criterion-sources">
                  <a
                    v-for="source in sourcesForCriterion(criterion)"
                    :key="source.id"
                    :href="source.url"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>{{ source.title }}</span>
                    <VIcon size="14">mdi-open-in-new</VIcon>
                  </a>
                </div>
              </details>
            </div>

            <div
              v-for="platform in PLATFORM_KEYS"
              :key="platform"
              class="status-cell"
              :class="`status-cell--${criterion.statuses[platform]}`"
              role="cell"
            >
              <span class="status-cell__platform">
                {{ t(`platformComparison.platforms.${platform}.name`) }}
              </span>
              <VIcon size="20">{{ statusIcon(criterion.statuses[platform]) }}</VIcon>
              <strong>
                {{ t(`platformComparison.statuses.${criterion.statuses[platform]}`) }}
              </strong>
            </div>
          </article>
        </div>
      </section>

      <section class="profiles-section mb-12" aria-labelledby="profiles-title">
        <div class="section-heading mb-5">
          <h2 id="profiles-title">{{ t('platformComparison.profilesTitle') }}</h2>
          <p>{{ t('platformComparison.profilesIntro') }}</p>
        </div>
        <div class="profile-ledger">
          <article
            v-for="(platform, index) in PLATFORM_KEYS"
            :key="platform"
            class="platform-profile"
          >
            <span class="platform-profile__index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div>
              <h3>{{ t(`platformComparison.platforms.${platform}.name`) }}</h3>
              <strong>{{ t(`platformComparison.profiles.${platform}.bestFor`) }}</strong>
              <p>{{ t(`platformComparison.profiles.${platform}.strength`) }}</p>
              <div class="platform-profile__tradeoff">
                <VIcon size="17">mdi-scale-balance</VIcon>
                <span>{{ t(`platformComparison.profiles.${platform}.tradeoff`) }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="honest-gap mb-12" aria-labelledby="honest-title">
        <div class="honest-gap__mark">
          <VIcon size="28">mdi-bell-cog-outline</VIcon>
        </div>
        <div>
          <h2 id="honest-title">{{ t('platformComparison.honestTitle') }}</h2>
          <p>{{ t('platformComparison.honestBody') }}</p>
        </div>
        <VBtn :to="localePath('/cuenta')" variant="outlined" color="warning">
          {{ t('platformComparison.alertsCta') }}
        </VBtn>
      </section>

      <section class="method-section mb-12" aria-labelledby="method-title">
        <div class="method-copy">
          <div class="section-heading">
            <h2 id="method-title">{{ t('platformComparison.methodTitle') }}</h2>
            <p>{{ t('platformComparison.methodBody') }}</p>
          </div>
          <ol>
            <li v-for="point in methodPoints" :key="point">{{ point }}</li>
          </ol>
        </div>
        <div class="source-register">
          <h3>{{ t('platformComparison.sourcesTitle') }}</h3>
          <p>{{ t('platformComparison.sourcesIntro') }}</p>
          <div class="source-register__groups">
            <div v-for="platform in PLATFORM_KEYS" :key="platform">
              <strong>{{ t(`platformComparison.platforms.${platform}.name`) }}</strong>
              <a
                v-for="source in sourcesByPlatform[platform]"
                :key="source.id"
                :href="source.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ source.title }}
                <VIcon size="13">mdi-open-in-new</VIcon>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section class="faq-section mb-12" aria-labelledby="faq-title">
        <div class="section-heading mb-4">
          <h2 id="faq-title">{{ t('platformComparison.faqTitle') }}</h2>
        </div>
        <VExpansionPanels variant="accordion">
          <VExpansionPanel v-for="item in faqItems" :key="item.question">
            <VExpansionPanelTitle>{{ item.question }}</VExpansionPanelTitle>
            <VExpansionPanelText>{{ item.answer }}</VExpansionPanelText>
          </VExpansionPanel>
        </VExpansionPanels>
      </section>

      <section class="comparison-close on-dark">
        <div>
          <h2>{{ t('platformComparison.ctaTitle') }}</h2>
          <p>{{ t('platformComparison.ctaText') }}</p>
        </div>
        <div class="comparison-close__actions">
          <VBtn :to="localePath('/')" color="white" variant="flat">
            {{ t('platformComparison.ctaPrimary') }}
          </VBtn>
          <VBtn :to="localePath('/analiticas')" color="white" variant="outlined">
            {{ t('platformComparison.ctaSecondary') }}
          </VBtn>
        </div>
      </section>
    </VContainer>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  COMPARISON_CRITERIA,
  COMPARISON_REVIEWED_AT,
  COMPARISON_SOURCES,
  PLATFORM_KEYS,
  filterCriteria,
  leaderCounts,
  sourcesForCriterion,
  type ComparisonCategory,
  type ComparisonStatus,
  type PlatformKey,
} from '~/utils/platformComparison'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const canonicalUrl = computed(
  () => `https://cambio-uruguay.com${localePath('/comparar-plataformas-dolar-uruguay')}`
)

const categories: Array<ComparisonCategory | 'all'> = [
  'all',
  'market',
  'analysis',
  'access',
  'ecosystem',
]
const selectedCategory = ref<ComparisonCategory | 'all'>('all')
const visibleCriteria = computed(() => filterCriteria(selectedCategory.value))
const scores = leaderCounts()
const totalCriteria = COMPARISON_CRITERIA.length
const ownLeadCount = scores.cambioUruguay

const reviewedDate = computed(() =>
  new Date(`${COMPARISON_REVIEWED_AT}T12:00:00Z`).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
)

const methodPoints = computed(() => [
  t('platformComparison.methodPoints.p1'),
  t('platformComparison.methodPoints.p2'),
  t('platformComparison.methodPoints.p3'),
  t('platformComparison.methodPoints.p4'),
])

const faqItems = computed(() =>
  [1, 2, 3, 4].map(index => ({
    question: t(`platformComparison.faq.q${index}`),
    answer: t(`platformComparison.faq.a${index}`),
  }))
)

const sourcesByPlatform = PLATFORM_KEYS.reduce(
  (groups, platform) => {
    groups[platform] = COMPARISON_SOURCES.filter(source => source.platform === platform)
    return groups
  },
  {} as Record<PlatformKey, (typeof COMPARISON_SOURCES)[number][]>
)

const statusIcon = (status: ComparisonStatus): string =>
  ({
    leader: 'mdi-check-decagram',
    available: 'mdi-check-circle-outline',
    limited: 'mdi-circle-half-full',
    notDocumented: 'mdi-help-circle-outline',
  })[status]

defineOgImageComponent('Cambio', {
  title: () => t('platformComparison.title'),
  subtitle: () => t('platformComparison.verdictTitle'),
  tag: 'COMPARATIVA',
  locale: locale.value as 'es' | 'en' | 'pt',
})

useSeoMeta({
  title: () => t('platformComparison.metaTitle'),
  description: () => t('platformComparison.metaDescription'),
  ogTitle: () => t('platformComparison.metaTitle'),
  ogDescription: () => t('platformComparison.metaDescription'),
  ogType: 'article',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('platformComparison.metaTitle'),
  twitterDescription: () => t('platformComparison.metaDescription'),
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  meta: [
    {
      name: 'keywords',
      content:
        'Cambio Uruguay vs DólarAhora, Dólar Uruguay comparación, comparador dólar Uruguay, mejores cotizaciones Uruguay',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: t('platformComparison.metaTitle'),
            description: t('platformComparison.metaDescription'),
            datePublished: COMPARISON_REVIEWED_AT,
            dateModified: COMPARISON_REVIEWED_AT,
            url: canonicalUrl.value,
            inLanguage: locale.value,
            author: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            disclosure: t('platformComparison.disclosure'),
          },
          {
            '@type': 'ItemList',
            name: t('platformComparison.scoreTitle'),
            numberOfItems: PLATFORM_KEYS.length,
            itemListElement: PLATFORM_KEYS.map((platform, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: t(`platformComparison.platforms.${platform}.name`),
              description: t(`platformComparison.platforms.${platform}.summary`),
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqItems.value.map(item => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.comparison-page {
  --comparison-line: rgba(var(--v-theme-on-surface), 0.12);
  --comparison-muted: rgba(var(--v-theme-on-surface), 0.68);
  --comparison-soft: rgba(var(--v-theme-on-surface), 0.045);
  background:
    linear-gradient(
      180deg,
      rgba(var(--v-theme-primary), 0.07) 0,
      rgba(var(--v-theme-primary), 0) 420px
    ),
    rgb(var(--v-theme-background));
}

.comparison-shell {
  max-width: 1240px;
}

.comparison-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
  gap: clamp(28px, 5vw, 72px);
  align-items: center;
  min-height: 560px;
}

.comparison-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.comparison-hero h1 {
  max-width: 780px;
  margin: 0;
  font-size: clamp(2.45rem, 5vw, 4.8rem);
  font-weight: 800;
  line-height: 0.98;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.comparison-hero__subtitle {
  max-width: 68ch;
  margin: 24px 0 0;
  color: var(--comparison-muted);
  font-size: clamp(1rem, 1.8vw, 1.22rem);
  line-height: 1.65;
}

.comparison-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 30px;
}

.comparison-disclosure {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  max-width: 70ch;
  margin-top: 22px;
  color: var(--comparison-muted);
  font-size: 0.82rem;
  line-height: 1.55;
}

.audit-ledger {
  padding: clamp(24px, 4vw, 38px);
  border: 1px solid var(--comparison-line);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.16);
}

.audit-ledger__stamp {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--comparison-line);
  color: rgb(var(--v-theme-primary));
}

.audit-ledger__stamp span {
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.audit-ledger__stamp strong {
  color: rgb(var(--v-theme-on-surface));
  font-size: 1rem;
}

.audit-ledger h2 {
  margin: 24px 0 10px;
  font-size: clamp(1.55rem, 3vw, 2.15rem);
  line-height: 1.15;
  letter-spacing: -0.025em;
}

.audit-ledger > p {
  margin: 0;
  color: var(--comparison-muted);
  line-height: 1.6;
}

.audit-ledger dl {
  margin: 26px 0 22px;
}

.audit-ledger dl > div {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 12px;
  padding: 11px 0;
  border-top: 1px solid var(--comparison-line);
}

.audit-ledger dt {
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 800;
}

.audit-ledger dd {
  margin: 0;
  font-weight: 700;
}

.audit-ledger__date {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--comparison-muted);
  font-size: 0.78rem;
}

.section-heading h2 {
  margin: 0;
  font-size: clamp(1.7rem, 3vw, 2.5rem);
  line-height: 1.15;
  letter-spacing: -0.025em;
}

.section-heading p {
  max-width: 72ch;
  margin: 10px 0 0;
  color: var(--comparison-muted);
  line-height: 1.6;
}

.score-rail {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 20px;
  overflow: hidden;
  border: 1px solid var(--comparison-line);
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
}

.platform-score {
  min-width: 0;
  padding: 22px;
  border-right: 1px solid var(--comparison-line);
}

.platform-score:last-child {
  border-right: 0;
}

.platform-score--own {
  background: rgba(var(--v-theme-primary), 0.09);
}

.platform-score__top {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
}

.platform-score__name {
  font-weight: 800;
}

.platform-score > strong {
  display: block;
  margin-top: 14px;
  font-size: clamp(2rem, 4vw, 3.25rem);
  line-height: 1;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.platform-score > span {
  color: var(--comparison-muted);
  font-size: 0.74rem;
}

.platform-score p {
  min-height: 42px;
  margin: 16px 0 0;
  color: var(--comparison-muted);
  font-size: 0.83rem;
  line-height: 1.5;
}

.matrix-heading {
  display: flex;
  gap: 28px;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
}

.matrix-filter {
  flex: 0 0 auto;
}

.matrix-filter > span {
  display: block;
  margin-bottom: 8px;
  color: var(--comparison-muted);
  font-size: 0.76rem;
  font-weight: 700;
}

.comparison-grid {
  overflow: hidden;
  border: 1px solid var(--comparison-line);
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
}

.comparison-grid__header,
.comparison-row {
  display: grid;
  grid-template-columns: minmax(310px, 2.15fr) repeat(4, minmax(130px, 1fr));
}

.comparison-grid__header {
  background: rgba(var(--v-theme-primary), 0.1);
}

.comparison-grid__header > div {
  padding: 15px 14px;
  border-right: 1px solid var(--comparison-line);
  font-size: 0.77rem;
  font-weight: 800;
}

.comparison-grid__header > div:last-child {
  border-right: 0;
}

.comparison-row {
  border-top: 1px solid var(--comparison-line);
}

.criterion-evidence {
  padding: 18px;
  border-right: 1px solid var(--comparison-line);
}

.criterion-evidence h3 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.35;
}

.criterion-evidence p {
  margin: 7px 0 0;
  color: var(--comparison-muted);
  font-size: 0.81rem;
  line-height: 1.55;
}

.criterion-evidence details {
  margin-top: 10px;
}

.criterion-evidence summary {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font-size: 0.76rem;
  font-weight: 700;
}

.criterion-sources {
  display: grid;
  gap: 5px;
  margin-top: 9px;
}

.criterion-sources a {
  display: flex;
  gap: 6px;
  align-items: center;
  color: var(--comparison-muted);
  font-size: 0.74rem;
  text-decoration: none;
}

.criterion-sources a:hover {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}

.status-cell {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  justify-content: center;
  min-height: 118px;
  padding: 14px 10px;
  border-right: 1px solid var(--comparison-line);
  text-align: center;
}

.status-cell:last-child {
  border-right: 0;
}

.status-cell strong {
  font-size: 0.78rem;
}

.status-cell__platform {
  display: none;
}

.status-cell--leader {
  color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.06);
}

.status-cell--available {
  color: rgb(var(--v-theme-primary));
}

.status-cell--limited {
  color: rgb(var(--v-theme-warning));
}

.status-cell--notDocumented {
  color: var(--comparison-muted);
}

.profile-ledger {
  border-top: 1px solid var(--comparison-line);
}

.platform-profile {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 18px;
  padding: 26px 0;
  border-bottom: 1px solid var(--comparison-line);
}

.platform-profile__index {
  color: rgb(var(--v-theme-primary));
  font-size: 0.78rem;
  font-weight: 800;
}

.platform-profile h3 {
  margin: 0 0 4px;
  font-size: 1.3rem;
}

.platform-profile strong {
  display: block;
  margin-bottom: 8px;
  color: rgb(var(--v-theme-primary));
}

.platform-profile p {
  max-width: 74ch;
  margin: 0;
  color: var(--comparison-muted);
  line-height: 1.6;
}

.platform-profile__tradeoff {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  max-width: 74ch;
  margin-top: 12px;
  font-size: 0.84rem;
  line-height: 1.55;
}

.honest-gap {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;
  padding: clamp(22px, 4vw, 34px);
  border: 1px solid rgba(var(--v-theme-warning), 0.38);
  border-radius: 14px;
  background: rgba(var(--v-theme-warning), 0.07);
}

.honest-gap__mark {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 50%;
  background: rgba(var(--v-theme-warning), 0.14);
  color: rgb(var(--v-theme-warning));
}

.honest-gap h2 {
  margin: 0 0 7px;
  font-size: 1.35rem;
}

.honest-gap p {
  max-width: 76ch;
  margin: 0;
  color: var(--comparison-muted);
  line-height: 1.6;
}

.method-section {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(400px, 1.1fr);
  gap: clamp(30px, 6vw, 72px);
}

.method-copy ol {
  display: grid;
  gap: 12px;
  margin: 24px 0 0;
  padding-left: 22px;
  color: var(--comparison-muted);
  line-height: 1.55;
}

.method-copy li::marker {
  color: rgb(var(--v-theme-primary));
  font-weight: 800;
}

.source-register {
  padding: 26px;
  border-radius: 14px;
  background: var(--comparison-soft);
}

.source-register h3 {
  margin: 0;
  font-size: 1.2rem;
}

.source-register > p {
  margin: 8px 0 20px;
  color: var(--comparison-muted);
  font-size: 0.84rem;
  line-height: 1.55;
}

.source-register__groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.source-register__groups > div {
  display: grid;
  align-content: start;
  gap: 7px;
}

.source-register__groups strong {
  margin-bottom: 3px;
  font-size: 0.86rem;
}

.source-register__groups a {
  color: var(--comparison-muted);
  font-size: 0.75rem;
  line-height: 1.4;
  text-decoration: none;
}

.source-register__groups a:hover {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}

.faq-section {
  max-width: 900px;
  margin-inline: auto;
}

.comparison-close {
  display: flex;
  gap: 28px;
  align-items: center;
  justify-content: space-between;
  padding: clamp(28px, 5vw, 46px);
  border-radius: 16px;
  background: #0f57ad;
  box-shadow: 0 18px 42px rgba(0, 47, 104, 0.26);
}

.comparison-close h2 {
  margin: 0;
  color: white;
  font-size: clamp(1.65rem, 3vw, 2.45rem);
  letter-spacing: -0.025em;
}

.comparison-close p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.82);
}

.comparison-close__actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 1040px) {
  .comparison-hero {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .audit-ledger {
    max-width: 760px;
  }

  .score-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .platform-score:nth-child(2) {
    border-right: 0;
  }

  .platform-score:nth-child(-n + 2) {
    border-bottom: 1px solid var(--comparison-line);
  }

  .method-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .matrix-heading {
    display: block;
  }

  .matrix-filter {
    margin-top: 20px;
  }

  .matrix-filter__scroll {
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .comparison-grid__header {
    display: none;
  }

  .comparison-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0 14px 14px;
  }

  .criterion-evidence {
    grid-column: 1 / -1;
    padding-inline: 4px;
    border-right: 0;
  }

  .status-cell {
    align-items: flex-start;
    min-height: 88px;
    border-top: 1px solid var(--comparison-line);
    border-right: 1px solid var(--comparison-line);
    text-align: left;
  }

  .status-cell:nth-of-type(odd) {
    border-right: 0;
  }

  .status-cell__platform {
    display: block;
    color: var(--comparison-muted);
    font-size: 0.68rem;
    font-weight: 700;
  }
}

@media (max-width: 700px) {
  .comparison-page {
    background: rgb(var(--v-theme-background));
  }

  .comparison-shell {
    padding-inline: 14px !important;
  }

  .comparison-hero h1 {
    font-size: clamp(2.25rem, 12vw, 3.4rem);
  }

  .comparison-actions > * {
    width: 100%;
  }

  .score-rail {
    grid-template-columns: 1fr;
  }

  .platform-score {
    border-right: 0;
    border-bottom: 1px solid var(--comparison-line);
  }

  .platform-score:last-child {
    border-bottom: 0;
  }

  .platform-score p {
    min-height: 0;
  }

  .comparison-row {
    grid-template-columns: 1fr;
  }

  .status-cell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 8px;
    min-height: 58px;
    border-right: 0;
  }

  .status-cell__platform {
    font-size: 0.75rem;
  }

  .platform-profile {
    grid-template-columns: 36px minmax(0, 1fr);
  }

  .honest-gap {
    grid-template-columns: 1fr;
  }

  .honest-gap__mark {
    width: 44px;
    height: 44px;
  }

  .source-register {
    padding: 20px;
  }

  .source-register__groups {
    grid-template-columns: 1fr;
  }

  .comparison-close {
    align-items: flex-start;
    flex-direction: column;
  }

  .comparison-close__actions,
  .comparison-close__actions > * {
    width: 100%;
  }
}
</style>
