<template>
  <article class="opportunity-card" :aria-labelledby="headingId" data-testid="opportunity-card">
    <div class="opportunity-card__overview">
      <div class="opportunity-card__photo">
        <img
          v-if="subject.image && !imageFailed"
          :src="subject.image"
          :alt="subject.title"
          loading="lazy"
          decoding="async"
          width="420"
          height="315"
          referrerpolicy="no-referrer"
          @error="imageFailed = true"
        />
        <span v-else class="opportunity-card__no-photo">
          <VIcon icon="mdi-home-outline" size="40" />
          {{ t('noImage') }}
        </span>
        <span v-if="subject.image && !imageFailed" class="opportunity-card__credit">{{
          t('photoCredit', { source: sourceName(subject.source) })
        }}</span>
      </div>
      <div class="opportunity-card__body">
        <p class="opportunity-card__zone">
          {{
            [subject.neighborhood, subject.locality, subject.department]
              .filter((value, index, all) => value && all.indexOf(value) === index)
              .join(' · ')
          }}
        </p>
        <h3 :id="headingId">
          <NuxtLink v-if="rentalPath" :to="localePath(rentalPath)">{{ subject.title }}</NuxtLink
          ><a v-else :href="subject.url" target="_blank" rel="noopener noreferrer">{{
            subject.title
          }}</a>
        </h3>
        <p class="opportunity-card__specs">{{ specs(subject) }}</p>
        <div class="opportunity-card__prices">
          <div>
            <span>{{ t(subject.operation === 'rent' ? 'monthly' : 'asking') }}</span
            ><strong>{{ money(subject.comparisonPrice) }}</strong>
          </div>
          <div>
            <span>{{ t('median') }}</span
            ><b>{{ money(analysis.median) }}</b>
          </div>
        </div>
        <p v-if="subject.operation === 'rent' && subject.expenses" class="opportunity-card__meta">
          {{
            t('rentBreakdown', {
              rent: originalMoney(subject.price),
              expenses: originalMoney(subject.expenses),
            })
          }}
        </p>
        <div class="opportunity-card__evidence">
          <span class="opportunity-card__difference">{{
            t('below', { n: number(analysis.gapPct, 1) })
          }}</span
          ><span>{{ t('comparison', { n: number(analysis.distinctN) }) }}</span>
        </div>
        <p class="opportunity-card__meta">
          {{ t('confidence') }}: <strong>{{ t(analysis.confidence) }}</strong>
        </p>
        <p class="opportunity-card__meta">
          {{ sourceName(subject.source) }} · {{ t('sourceRead', { date: date(subject.lastSeen) }) }}
        </p>
        <div class="opportunity-card__actions">
          <VBtn v-if="rentalPath" :to="localePath(rentalPath)" variant="tonal" color="link">{{
            t('detail')
          }}</VBtn
          ><VBtn
            :href="subject.url"
            target="_blank"
            rel="noopener noreferrer"
            variant="text"
            append-icon="mdi-open-in-new"
            >{{ t('original') }}</VBtn
          >
        </div>
      </div>
    </div>
    <details class="opportunity-card__details" data-testid="opportunity-comparables">
      <summary>
        {{ t('showComparables') }}<VIcon icon="mdi-chevron-down" aria-hidden="true" />
      </summary>
      <div class="opportunity-card__expanded">
        <section>
          <h4>{{ t('reasons') }}</h4>
          <p>
            {{
              t('referenceReasons', {
                n: number(analysis.distinctN),
                sellers: number(analysis.sellersN),
                min: number(analysis.areaMin, 1),
                max: number(analysis.areaMax, 1),
              })
            }}
          </p>
          <p>{{ t('lowerQuartile', { n: number(analysis.conservativeGapPct, 1) }) }}</p>
          <dl class="opportunity-card__range">
            <dt>{{ t('range') }}</dt>
            <dd>{{ money(analysis.q25) }} – {{ money(analysis.q75) }}</dd>
          </dl>
          <p class="opportunity-card__meta">{{ t('rangeHint') }}</p>
        </section>
        <section v-if="item.cautions.length">
          <h4>{{ t('limitations') }}</h4>
          <ul>
            <li v-for="caution in item.cautions" :key="caution">{{ t(caution) }}</li>
          </ul>
        </section>
        <section>
          <h4>{{ t('comparableTitle') }}</h4>
          <p class="opportunity-card__meta">{{ t('comparableHint') }}</p>
          <p v-if="item.comparables.length < analysis.distinctN" class="opportunity-card__meta">
            {{
              t('comparableSample', {
                shown: number(item.comparables.length),
                total: number(analysis.distinctN),
              })
            }}
          </p>
          <ol class="opportunity-card__comparables">
            <li v-for="comparable in item.comparables" :key="comparable.id">
              <div>
                <a :href="comparable.url" target="_blank" rel="noopener noreferrer">
                  {{ comparable.title }}
                  <VIcon icon="mdi-open-in-new" size="14" class="ml-1" aria-hidden="true" />
                </a>
                <p>{{ specs(comparable) }}</p>
                <p>{{ sourceName(comparable.source) }} · {{ date(comparable.lastSeen) }}</p>
              </div>
              <strong>{{ money(comparable.comparisonPrice) }}</strong>
            </li>
          </ol>
        </section>
      </div>
    </details>
  </article>
</template>

<script setup lang="ts">
import type {
  OpportunityItem,
  OpportunityMoney,
  OpportunityPublicListing,
  OpportunitySource,
} from '~/utils/propertyOpportunities'
import { propertyOpportunityMessages } from '~/utils/propertyOpportunityMessages'
import {
  opportunityAreaKey,
  opportunityDate,
  opportunityMoney,
  opportunityNumber,
  opportunityRentalPath,
  opportunitySourceLabels,
} from '~/utils/propertyOpportunityPresentation'

const props = defineProps<{ item: OpportunityItem }>()
const { t, locale } = useI18n({ useScope: 'local', messages: propertyOpportunityMessages })
const localePath = useLocalePath()
const subject = computed(() => props.item.subject)
const analysis = computed(() => props.item.analysis)
const imageFailed = ref(false)
const headingId = computed(() => `opportunity-${subject.value.id.replace(/[^\w-]/g, '-')}`)
const rentalPath = computed(() => opportunityRentalPath(subject.value))
const number = (value: number, digits = 0) => opportunityNumber(value, locale.value, digits)
const originalMoney = (value: OpportunityMoney) => opportunityMoney(value, locale.value)
const money = (value: number) => originalMoney({ amount: value, currency: analysis.value.currency })
const date = (value: string) => opportunityDate(value, locale.value) || t('unknownDate')
const sourceName = (source: OpportunitySource) => opportunitySourceLabels[source]
function specs(listing: OpportunityPublicListing) {
  return [
    t(listing.propertyType === 'casa' ? 'house' : 'apartment'),
    listing.bedrooms === 0 ? t('studio') : t('beds', { n: listing.bedrooms }),
    listing.bathrooms === 1 ? t('oneBath') : t('baths', { n: listing.bathrooms }),
    `${number(listing.area.value, 1)} ${t(opportunityAreaKey(listing.area))}`,
  ].join(' · ')
}
</script>

<style scoped>
.opportunity-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.opportunity-card__overview {
  display: grid;
  grid-template-columns: minmax(180px, 31%) minmax(0, 1fr);
}
.opportunity-card__photo {
  position: relative;
  min-height: 250px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.opportunity-card__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  inset: 0;
}
.opportunity-card__no-photo {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 230px;
  padding: 20px;
}
.opportunity-card__credit {
  position: absolute;
  bottom: 0;
  inset-inline: 0;
  background: #121a2e;
  color: #fff !important;
  font-size: 0.68rem;
  padding: 6px 10px;
}
.opportunity-card__body {
  min-width: 0;
  padding: 20px;
}
.opportunity-card p {
  margin: 0;
}
.opportunity-card__zone {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgb(var(--v-theme-link));
}
.opportunity-card h3 {
  margin: 7px 0 10px;
  font-size: 1.12rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.opportunity-card h3 a {
  color: inherit;
  text-decoration: none;
}
.opportunity-card h3 a:hover {
  text-decoration: underline;
}
.opportunity-card__specs {
  font-size: 0.83rem;
  line-height: 1.6;
}
.opportunity-card__prices {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0 5px;
}
.opportunity-card__prices div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.opportunity-card__prices span {
  font-size: 0.76rem;
}
.opportunity-card__prices strong {
  font-size: 1.3rem;
  line-height: 1.4;
}
.opportunity-card__prices b {
  font-size: 1rem;
  line-height: 1.8;
  font-weight: 600;
}
.opportunity-card__prices strong,
.opportunity-card__prices b,
.opportunity-card__range dd {
  font-variant-numeric: tabular-nums;
}
.opportunity-card__evidence {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  margin: 14px 0 8px;
  font-size: 0.8rem;
}
.opportunity-card__difference {
  color: rgb(var(--v-theme-link));
  font-weight: 800;
}
.opportunity-card__meta {
  margin-top: 5px !important;
  font-size: 0.78rem;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.opportunity-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-top: 14px;
}
.opportunity-card__actions :deep(.v-btn) {
  min-height: 44px;
  padding-inline: 10px;
  font-size: 0.78rem;
}
.opportunity-card__details {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.opportunity-card__details summary {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding: 12px 20px;
  font-size: 0.88rem;
  font-weight: 700;
  color: rgb(var(--v-theme-link));
  list-style: none;
}
.opportunity-card__details summary::-webkit-details-marker {
  display: none;
}
.opportunity-card__details[open] summary :deep(.v-icon) {
  transform: rotate(180deg);
}
.opportunity-card__expanded {
  padding: 0 20px 20px;
}
.opportunity-card__expanded section + section {
  margin-top: 24px;
}
.opportunity-card h4 {
  font-size: 0.95rem;
  margin: 12px 0 10px;
}
.opportunity-card__expanded p,
.opportunity-card__expanded li {
  font-size: 0.84rem;
  line-height: 1.65;
}
.opportunity-card__expanded ul {
  padding-left: 20px;
  margin: 0;
}
.opportunity-card__range {
  margin: 14px 0 0;
}
.opportunity-card__range dt {
  font-size: 0.78rem;
}
.opportunity-card__range dd {
  margin: 2px 0 0;
  font-weight: 700;
}
.opportunity-card__comparables {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
}
.opportunity-card__comparables li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 12px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.opportunity-card__comparables a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  overflow-wrap: anywhere;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.opportunity-card__comparables p {
  font-size: 0.76rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.opportunity-card__comparables strong {
  font-size: 0.85rem;
  padding-top: 10px;
  white-space: nowrap;
}
.opportunity-card :is(a, summary):focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
@media (max-width: 700px) {
  .opportunity-card__overview {
    grid-template-columns: minmax(0, 1fr);
  }
  .opportunity-card__photo {
    height: 144px;
    min-height: 0;
  }
  .opportunity-card__no-photo {
    min-height: 144px;
  }
  .opportunity-card__body {
    order: -1;
    display: flex;
    flex-direction: column;
    padding: 16px;
  }
  .opportunity-card__body h3 {
    order: 1;
  }
  .opportunity-card__prices {
    order: 2;
    margin: 6px 0;
  }
  .opportunity-card__evidence {
    order: 3;
    margin: 6px 0 10px;
  }
  .opportunity-card__specs {
    order: 4;
  }
  .opportunity-card__meta {
    order: 5;
  }
  .opportunity-card__actions {
    order: 6;
  }
  .opportunity-card__expanded {
    padding-inline: 16px;
  }
  .opportunity-card__details summary {
    padding-inline: 16px;
  }
  .opportunity-card__comparables li {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
  .opportunity-card__comparables strong {
    padding-top: 4px;
  }
}
@media (max-width: 360px) {
  .opportunity-card__prices {
    gap: 6px;
  }
  .opportunity-card__prices strong {
    font-size: 1.12rem;
  }
  .opportunity-card__prices b {
    font-size: 0.91rem;
  }
}
</style>
