<!--
THESIS: This is a workday diagnosis that opens into evidence, not a generic affiliate chair roundup.
OWN-WORLD: Cambio Uruguay navy surfaces, measured signal strips, semantic tier colors, and compact Vuetify controls.
STORY: Pick the discomfort or constraint that matters, see community-tested tiers reorder, then inspect original comments.
FIRST VIEWPORT: A blunt question and priority controls face a live evidence trace built from the current Mongo snapshot.
FORM: Grounded structure 5, diagnosis-before-doctrine staging, surface seed aa73e570.
-->
<template>
  <main class="chair-page pb-10">
    <section class="chair-hero on-dark" aria-labelledby="chair-title">
      <div class="hero-copy">
        <div class="source-mark">
          <VIcon icon="mdi-reddit" size="18" />
          <span>r/CharruaDevs</span>
          <span class="source-mark__dot" aria-hidden="true" />
          <span>{{ t('chairTiers.realComments') }}</span>
        </div>

        <h1 id="chair-title">{{ t('chairTiers.h1') }}</h1>
        <p class="hero-lead">{{ t('chairTiers.lead') }}</p>

        <div class="diagnosis" role="group" :aria-label="t('chairTiers.priorityAria')">
          <p class="diagnosis__question">{{ t('chairTiers.priorityQuestion') }}</p>
          <div class="diagnosis__options">
            <VBtn
              v-for="priority in priorities"
              :key="priority.id"
              :variant="selectedPriority === priority.id ? 'flat' : 'tonal'"
              :color="selectedPriority === priority.id ? 'primary' : undefined"
              size="small"
              rounded="lg"
              :aria-pressed="selectedPriority === priority.id"
              @click="selectedPriority = priority.id"
            >
              <VIcon start :icon="priority.icon" />
              {{ t(`chairTiers.priority.${priority.id}`) }}
            </VBtn>
          </div>
        </div>
      </div>

      <div class="evidence-rig" :aria-label="t('chairTiers.snapshotAria')">
        <div class="rig-ruler" aria-hidden="true">
          <span v-for="mark in 11" :key="mark" />
        </div>

        <template v-if="pending">
          <VSkeletonLoader type="heading, text, text, image" color="transparent" />
        </template>
        <template v-else-if="topChair">
          <div class="rig-head">
            <span>{{ t('chairTiers.strongestSignal') }}</span>
            <VChip size="small" :color="tierColor(topChair.tier)" variant="flat">
              Tier {{ topChair.tier }}
            </VChip>
          </div>

          <button
            v-if="chairMedia(topChair)"
            type="button"
            class="photo-frame is-hero"
            :aria-label="photoButtonLabel(topChair)"
            @click="openPhotos(topChair)"
          >
            <img
              :src="chairMedia(topChair)!.url"
              :alt="chairMedia(topChair)!.alt"
              width="520"
              height="360"
              fetchpriority="high"
            />
            <span class="photo-frame__source">{{ chairMedia(topChair)!.sourceName }}</span>
            <span class="photo-frame__zoom">
              <VIcon icon="mdi-magnify-plus-outline" size="16" />
              {{ photoCountLabel(topChair) }}
            </span>
          </button>

          <div class="rig-identity">
            <p class="rig-chair">{{ topChair.name }}</p>
            <p class="rig-summary">
              {{ topChair.generalReview?.verdict || topChair.summary }}
            </p>
          </div>

          <div class="sentiment" :aria-label="sentimentAria(topChair)">
            <div class="sentiment__bar">
              <span
                class="sentiment__positive"
                :style="{ width: `${sentimentPercentages(topChair).positive}%` }"
              />
              <span
                class="sentiment__neutral"
                :style="{ width: `${sentimentPercentages(topChair).neutral}%` }"
              />
              <span
                class="sentiment__negative"
                :style="{ width: `${sentimentPercentages(topChair).negative}%` }"
              />
            </div>
            <div class="sentiment__legend">
              <span>{{ sentimentPercentages(topChair).positive }}% +</span>
              <span>{{ sentimentPercentages(topChair).neutral }}% =</span>
              <span>{{ sentimentPercentages(topChair).negative }}% −</span>
            </div>
          </div>

          <dl class="rig-ledger">
            <div>
              <dt>{{ t('chairTiers.comments') }}</dt>
              <dd>{{ snapshot?.corpus.comments.toLocaleString(locale) }}</dd>
            </div>
            <div>
              <dt>{{ t('chairTiers.threads') }}</dt>
              <dd>{{ snapshot?.corpus.threads.toLocaleString(locale) }}</dd>
            </div>
            <div>
              <dt>{{ t('chairTiers.authors') }}</dt>
              <dd>{{ snapshot?.corpus.uniqueAuthors.toLocaleString(locale) }}</dd>
            </div>
          </dl>
          <p class="rig-date">{{ t('chairTiers.updated', { date: asOfLabel }) }}</p>
        </template>
        <div v-else class="rig-empty">
          <VIcon icon="mdi-database-clock-outline" size="38" />
          <p>{{ t('chairTiers.collecting') }}</p>
        </div>
      </div>
    </section>

    <div class="trust-strip">
      <div>
        <VIcon icon="mdi-calculator-variant-outline" />
        <span>{{ t('chairTiers.trust.deterministic') }}</span>
      </div>
      <div>
        <VIcon icon="mdi-account-multiple-check-outline" />
        <span>{{ t('chairTiers.trust.authors') }}</span>
      </div>
      <div>
        <VIcon icon="mdi-open-in-new" />
        <span>{{ t('chairTiers.trust.sources') }}</span>
      </div>
    </div>

    <VAlert v-if="error" type="error" variant="tonal" class="my-8">
      <div class="d-flex flex-wrap align-center justify-space-between ga-3">
        <span>{{ t('chairTiers.error') }}</span>
        <VBtn variant="outlined" size="small" @click="refresh">
          {{ t('chairTiers.retry') }}
        </VBtn>
      </div>
    </VAlert>

    <!-- The directory used to render inline here. It is a shopping tool with its own facets and a
         few hundred rows, and dropping it mid-argument cut this page in half; it lives at
         /sillas-escritorio-uruguay/precios now and this is the doorway to it. -->
    <NuxtLink :to="localePath('/sillas-escritorio-uruguay/precios')" class="directory-bridge">
      <div class="directory-bridge__copy">
        <p class="board-kicker">{{ t('chairTiers.directory.kicker') }}</p>
        <h2>{{ t('chairTiers.directory.title') }}</h2>
        <p class="directory-bridge__text">
          {{
            catalogMeta
              ? t('chairTiers.directory.text', {
                  products: catalogMeta.products,
                  sellers: catalogMeta.sellers,
                })
              : t('chairTiers.directory.textPlain')
          }}
        </p>
      </div>

      <dl v-if="catalogMeta" class="directory-bridge__stats">
        <div>
          <dt>{{ t('chairMarket.statChairs') }}</dt>
          <dd>{{ catalogMeta.products.toLocaleString(locale) }}</dd>
        </div>
        <div>
          <dt>{{ t('chairMarket.statOffers') }}</dt>
          <dd>{{ catalogMeta.offers.toLocaleString(locale) }}</dd>
        </div>
        <div>
          <dt>{{ t('chairMarket.statSellers') }}</dt>
          <dd>{{ catalogMeta.sellers.toLocaleString(locale) }}</dd>
        </div>
      </dl>

      <span class="directory-bridge__cta">
        {{ t('chairTiers.directory.cta') }}
        <VIcon icon="mdi-arrow-right" size="20" />
      </span>
    </NuxtLink>

    <section v-if="snapshot?.tiers.length" class="budget-tool" aria-labelledby="budget-title">
      <header class="budget-tool__intro">
        <div>
          <p class="board-kicker">{{ t('chairTiers.budget.kicker') }}</p>
          <h2 id="budget-title">{{ t('chairTiers.budget.title') }}</h2>
        </div>
        <p>{{ t('chairTiers.budget.lead') }}</p>
      </header>

      <div class="budget-tool__body">
        <div class="budget-controls">
          <VBtnToggle
            v-model="budgetCurrency"
            mandatory
            color="primary"
            density="comfortable"
            rounded="lg"
            :aria-label="t('chairTiers.budget.currencyAria')"
          >
            <VBtn value="UYU">UYU</VBtn>
            <VBtn value="USD">USD</VBtn>
          </VBtnToggle>

          <div class="budget-inputs">
            <VSlider
              v-model="budget"
              :min="budgetConfig.min"
              :max="budgetConfig.max"
              :step="budgetConfig.step"
              color="primary"
              track-color="surface-variant"
              thumb-label
              hide-details
              :aria-label="t('chairTiers.budget.sliderAria')"
            />
            <VTextField
              v-model.number="budget"
              type="number"
              :min="budgetConfig.min"
              :max="budgetConfig.max"
              :step="budgetConfig.step"
              :suffix="budgetCurrency"
              density="compact"
              variant="outlined"
              hide-details
              :label="t('chairTiers.budget.inputLabel')"
              class="budget-number"
              @blur="clampBudget"
            />
          </div>

          <p class="budget-rate">
            <template v-if="usdUyuRate">
              {{ t('chairTiers.budget.rate', { rate: formatPrice(usdUyuRate, 'UYU') }) }}
            </template>
            <template v-else>{{ t('chairTiers.budget.rateUnavailable') }}</template>
          </p>
        </div>

        <div v-if="bestBudgetOption" class="budget-result">
          <button
            v-if="chairMedia(bestBudgetOption.chair)"
            type="button"
            class="photo-frame is-inline"
            :aria-label="photoButtonLabel(bestBudgetOption.chair)"
            @click="openPhotos(bestBudgetOption.chair)"
          >
            <img
              :src="chairMedia(bestBudgetOption.chair)!.url"
              :alt="chairMedia(bestBudgetOption.chair)!.alt"
              width="220"
              height="220"
              loading="lazy"
              decoding="async"
            />
          </button>
          <div>
            <p class="budget-result__eyebrow">{{ t('chairTiers.budget.bestFit') }}</p>
            <h3>{{ bestBudgetOption.chair.name }}</h3>
            <p>
              {{
                t('chairTiers.budget.reason', {
                  tier: bestBudgetOption.chair.tier,
                  score: bestBudgetOption.chair.score,
                  count: affordableOptions.length,
                })
              }}
            </p>
            <div class="budget-result__price">
              <strong>{{ formatPrice(bestBudgetOption.convertedPrice, budgetCurrency) }}</strong>
              <span>
                {{ bestBudgetOption.offer.seller }} ·
                {{ t(`chairTiers.condition.${bestBudgetOption.offer.condition}`) }}
              </span>
            </div>
          </div>
          <VBtn
            :href="bestBudgetOption.offer.url"
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            color="primary"
            variant="flat"
          >
            {{ t('chairTiers.budget.openOffer') }}
            <VIcon end icon="mdi-open-in-new" />
          </VBtn>
        </div>

        <div v-else class="budget-result is-empty">
          <VIcon icon="mdi-cash-search" size="34" color="primary" />
          <div>
            <h3>{{ t('chairTiers.budget.noFitTitle') }}</h3>
            <p>{{ t('chairTiers.budget.noFitText') }}</p>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="pending && !snapshot?.tiers.length"
      class="tier-loading"
      :aria-label="t('chairTiers.loading')"
    >
      <VSkeletonLoader v-for="index in 3" :key="index" type="heading, list-item-three-line" />
    </section>

    <section v-else-if="!snapshot?.tiers.length" class="empty-state">
      <VIcon icon="mdi-chair-rolling" size="52" color="primary" />
      <h2>{{ t('chairTiers.emptyTitle') }}</h2>
      <p>{{ t('chairTiers.emptyText') }}</p>
    </section>

    <section v-if="snapshot?.tiers.length" class="tier-board" aria-labelledby="tier-board-title">
      <header class="board-intro">
        <div>
          <p class="board-kicker">{{ t('chairTiers.boardKicker') }}</p>
          <h2 id="tier-board-title">{{ t('chairTiers.boardTitle') }}</h2>
        </div>
        <p>{{ t('chairTiers.boardLead') }}</p>
      </header>

      <div
        v-for="group in groupedTiers"
        :key="group.tier"
        class="tier-row"
        :style="{ '--tier-color': chairTierMeta[group.tier].color }"
      >
        <header class="tier-marker">
          <div class="tier-letter">{{ group.tier }}</div>
          <div>
            <h3>{{ t(`chairTiers.tier.${group.tier}.label`) }}</h3>
            <p>{{ t(`chairTiers.tier.${group.tier}.description`) }}</p>
            <span>{{ t('chairTiers.chairCount', { count: group.items.length }) }}</span>
          </div>
        </header>

        <TransitionGroup name="chair-move" tag="div" class="chair-stack">
          <article
            v-for="chair in group.items"
            :id="chair.slug"
            :key="chair.slug"
            class="chair-result"
          >
            <div
              v-if="photosFor(chair).length"
              class="photo-strip"
              :class="{ 'is-single': photosFor(chair).length === 1 }"
            >
              <button
                type="button"
                class="photo-frame is-card"
                :aria-label="photoButtonLabel(chair)"
                @click="openPhotos(chair)"
              >
                <img
                  :src="photosFor(chair)[0]!.url"
                  :alt="photosFor(chair)[0]!.alt"
                  width="640"
                  height="420"
                  loading="lazy"
                  decoding="async"
                />
                <span class="photo-frame__source">{{ photosFor(chair)[0]!.sourceName }}</span>
                <span class="photo-frame__zoom">
                  <VIcon icon="mdi-magnify-plus-outline" size="16" />
                  {{ photoCountLabel(chair) }}
                </span>
              </button>

              <button
                v-for="(photo, position) in photosFor(chair).slice(1, 4)"
                :key="photo.url"
                type="button"
                class="photo-frame is-thumb"
                :aria-label="t('chairTiers.photos.goTo', { index: position + 2 })"
                @click="openPhotos(chair, position + 1)"
              >
                <img
                  :src="photo.url"
                  :alt="photo.alt"
                  width="240"
                  height="240"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            </div>

            <div class="chair-result__top">
              <div>
                <div class="chair-title-line">
                  <h4>{{ chair.name }}</h4>
                  <VChip
                    v-if="
                      selectedPriority !== 'overall' &&
                      priorityAffinity(chair, selectedPriority) > 0
                    "
                    size="x-small"
                    color="info"
                    variant="tonal"
                  >
                    <VIcon start icon="mdi-tune-variant" />
                    {{ t('chairTiers.priorityMatch') }}
                  </VChip>
                  <span v-if="fromOffer(chair)" class="chair-from">
                    {{
                      t('chairTiers.fromPrice', {
                        price: formatPrice(fromOffer(chair)!.price, fromOffer(chair)!.currency),
                      })
                    }}
                    <small v-if="approxPrice(fromOffer(chair)!)">
                      {{ approxPrice(fromOffer(chair)!) }}
                    </small>
                  </span>
                </div>
                <p>{{ chair.generalReview?.verdict || chair.summary }}</p>
              </div>
              <div
                class="chair-score"
                role="img"
                :aria-label="t('chairTiers.scoreAria', { score: chair.score })"
              >
                <strong>{{ chair.score }}</strong>
                <span>/100</span>
              </div>
            </div>

            <div class="chair-result__analytics">
              <div class="distribution">
                <div class="distribution__bar" role="img" :aria-label="sentimentAria(chair)">
                  <span
                    class="is-positive"
                    :style="{ width: `${sentimentPercentages(chair).positive}%` }"
                  />
                  <span
                    class="is-neutral"
                    :style="{ width: `${sentimentPercentages(chair).neutral}%` }"
                  />
                  <span
                    class="is-negative"
                    :style="{ width: `${sentimentPercentages(chair).negative}%` }"
                  />
                </div>
                <span>
                  {{
                    t('chairTiers.opinionMix', {
                      positive: chair.positive,
                      neutral: chair.neutral,
                      negative: chair.negative,
                    })
                  }}
                </span>
              </div>

              <div class="sample">
                <VIcon icon="mdi-message-text-outline" size="17" />
                <span>{{
                  t('chairTiers.sample', {
                    sources: chair.sources ?? chair.comments,
                    authors: chair.uniqueAuthors,
                  })
                }}</span>
              </div>

              <VChip
                size="small"
                :color="confidenceColor(chair.confidence)"
                variant="tonal"
                class="confidence-chip"
              >
                {{ t(`chairTiers.confidence.${chair.confidence}`) }}
              </VChip>
            </div>

            <div v-if="chair.themes.length" class="theme-row">
              <VChip
                v-for="theme in chair.themes.slice(0, 5)"
                :key="theme.id"
                size="small"
                variant="outlined"
              >
                {{ t(`chairTiers.theme.${theme.id}`) }} · {{ theme.mentions }}
              </VChip>
            </div>

            <section
              v-if="chair.generalReview?.pros?.length || chair.generalReview?.cons?.length"
              class="review-dossier"
              :class="{
                'is-single':
                  !chair.generalReview?.pros?.length || !chair.generalReview?.cons?.length,
              }"
              :aria-label="t('chairTiers.reviewAria', { chair: chair.name })"
            >
              <div v-if="chair.generalReview?.pros?.length" class="review-column is-pro">
                <div class="review-column__head">
                  <VIcon icon="mdi-plus-circle-outline" size="19" />
                  <h5>{{ t('chairTiers.pros') }}</h5>
                </div>
                <ul v-if="chair.generalReview?.pros?.length">
                  <li v-for="point in chair.generalReview?.pros ?? []" :key="point.text">
                    <span>{{ point.text }}</span>
                    <small>{{
                      t('chairTiers.supportedBy', { count: point.sourceIds.length })
                    }}</small>
                  </li>
                </ul>
              </div>
              <div v-if="chair.generalReview?.cons?.length" class="review-column is-con">
                <div class="review-column__head">
                  <VIcon icon="mdi-minus-circle-outline" size="19" />
                  <h5>{{ t('chairTiers.cons') }}</h5>
                </div>
                <ul v-if="chair.generalReview?.cons?.length">
                  <li v-for="point in chair.generalReview?.cons ?? []" :key="point.text">
                    <span>{{ point.text }}</span>
                    <small>{{
                      t('chairTiers.supportedBy', { count: point.sourceIds.length })
                    }}</small>
                  </li>
                </ul>
              </div>
            </section>

            <section v-if="chair.offers?.length" class="purchase-panel">
              <div class="purchase-panel__head">
                <div>
                  <p class="purchase-panel__kicker">{{ t('chairTiers.buyKicker') }}</p>
                  <h5>{{ t('chairTiers.buyTitle', { chair: chair.name }) }}</h5>
                </div>
                <span>{{ t('chairTiers.priceDisclaimer') }}</span>
              </div>
              <div class="offer-list">
                <a
                  v-for="offer in chair.offers ?? []"
                  :key="offer.id"
                  :href="offer.url"
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  class="offer"
                >
                  <span class="offer__channel">
                    {{ t(`chairTiers.channel.${offer.channel}`) }}
                  </span>
                  <span class="offer__body">
                    <span class="offer__seller">{{ offer.seller }}</span>
                    <span class="offer__title">{{ offer.title }}</span>
                    <small>
                      {{ t(`chairTiers.condition.${offer.condition}`) }} ·
                      {{ t('chairTiers.priceChecked', { date: formatDate(offer.verifiedAt) }) }}
                    </small>
                    <small v-if="offer.note && locale === 'es'" class="offer__note">
                      {{ offer.note }}
                    </small>
                  </span>
                  <strong class="offer__price">
                    {{ formatPrice(offer.price, offer.currency) }}
                    <small v-if="approxPrice(offer)">{{ approxPrice(offer) }}</small>
                  </strong>
                  <VIcon icon="mdi-open-in-new" size="16" />
                </a>
              </div>
            </section>

            <details v-if="chair.evidence.length" class="evidence-details">
              <summary>
                <span>{{ t('chairTiers.openAllEvidence', { count: chair.evidence.length }) }}</span>
                <VIcon icon="mdi-chevron-down" />
              </summary>
              <div class="evidence-counts">
                <VChip size="x-small" variant="tonal">
                  {{ t('chairTiers.sourceCount.posts', { count: chair.posts ?? 0 }) }}
                </VChip>
                <VChip size="x-small" variant="tonal">
                  {{
                    t('chairTiers.sourceCount.comments', {
                      count: Math.max(0, chair.comments - (chair.replies ?? 0)),
                    })
                  }}
                </VChip>
                <VChip size="x-small" variant="tonal">
                  {{ t('chairTiers.sourceCount.replies', { count: chair.replies ?? 0 }) }}
                </VChip>
              </div>
              <div class="quote-list">
                <article
                  v-for="quote in chair.evidence"
                  :id="`${chair.slug}-${quote.commentId.replace(':', '-')}`"
                  :key="quote.commentId"
                  class="source-entry"
                  :class="[
                    `is-${quote.sourceType}`,
                    quote.depth > 0 ? 'is-reply' : '',
                    sentimentClass(quote.sentiment),
                  ]"
                  :style="{ '--source-depth': Math.min(Math.max(quote.depth ?? 0, 0), 3) }"
                >
                  <header>
                    <span>
                      <VIcon
                        :icon="
                          quote.sourceType === 'post' ? 'mdi-post-outline' : 'mdi-reply-outline'
                        "
                        size="15"
                      />
                      {{
                        quote.sourceType === 'post'
                          ? t('chairTiers.sourceType.post')
                          : (quote.depth ?? 0) > 0
                            ? t('chairTiers.sourceType.reply', { depth: quote.depth ?? 0 })
                            : t('chairTiers.sourceType.comment')
                      }}
                    </span>
                    <span class="source-tone">
                      {{ t(`chairTiers.tone.${toneKey(quote.sentiment)}`) }}
                    </span>
                    <span class="source-title">{{ quote.postTitle || '' }}</span>
                  </header>
                  <p>{{ quote.body || quote.excerpt }}</p>
                  <footer>
                    <span>
                      <VIcon icon="mdi-arrow-up-bold-outline" size="14" />
                      {{ quote.score }} · {{ formatDate(quote.date) }}
                    </span>
                    <a :href="quote.permalink" target="_blank" rel="noopener noreferrer">
                      {{ t('chairTiers.openReddit') }}
                      <VIcon icon="mdi-open-in-new" size="14" />
                    </a>
                  </footer>
                </article>
              </div>
            </details>
          </article>
        </TransitionGroup>
      </div>
    </section>

    <section v-if="snapshot?.watchlist.length" class="watchlist">
      <div>
        <p class="board-kicker">{{ t('chairTiers.watchKicker') }}</p>
        <h2>{{ t('chairTiers.watchTitle') }}</h2>
        <p>{{ t('chairTiers.watchText') }}</p>
      </div>
      <div class="watchlist__items">
        <VChip
          v-for="chair in snapshot.watchlist.slice(0, 14)"
          :key="chair.slug"
          variant="tonal"
          size="large"
        >
          {{ chair.name }}
          <span class="ml-2 text-medium-emphasis">· {{ chair.sources ?? chair.comments }}</span>
        </VChip>
      </div>
    </section>

    <section class="method" aria-labelledby="method-title">
      <div class="method__intro">
        <p class="board-kicker">{{ t('chairTiers.methodKicker') }}</p>
        <h2 id="method-title">{{ t('chairTiers.methodTitle') }}</h2>
        <p>{{ t('chairTiers.methodLead') }}</p>
        <VBtn
          href="https://www.reddit.com/r/CharruaDevs/"
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          color="primary"
        >
          <VIcon start icon="mdi-reddit" />
          {{ t('chairTiers.visitSubreddit') }}
        </VBtn>
      </div>

      <VExpansionPanels variant="accordion" class="method__panels">
        <VExpansionPanel
          v-for="step in methodSteps"
          :key="step"
          :title="t(`chairTiers.method.${step}.title`)"
          :text="t(`chairTiers.method.${step}.text`)"
        />
      </VExpansionPanels>
    </section>

    <div class="page-close">
      <div>
        <h2>{{ t('chairTiers.closeTitle') }}</h2>
        <p>{{ t('chairTiers.closeText') }}</p>
      </div>
      <div class="d-flex flex-wrap ga-3">
        <ShareButtons :text="t('chairTiers.shareText')" />
        <VBtn :to="localePath('/temas-de-dinero-reddit')" variant="tonal" color="primary">
          {{ t('chairTiers.moreReddit') }}
          <VIcon end icon="mdi-arrow-right" />
        </VBtn>
      </div>
    </div>

    <ChairPhotoViewer
      v-model="photoViewerOpen"
      :photos="photoViewerPhotos"
      :title="photoViewerTitle"
      :start-index="photoViewerStart"
    />
  </main>
</template>

<script setup lang="ts">
import {
  affordableChairOffers,
  chairGallery,
  chairMedia,
  chairTierMeta,
  cheapestChairOffer,
  convertChairOfferPrice,
  groupChairTiers,
  priorityAffinity,
  sentimentPercentages,
  sortChairsForPriority,
  type ChairConfidence,
  type ChairMedia,
  type ChairPriority,
  type ChairPurchaseOffer,
  type ChairTier,
  type ChairTierItem,
  type ChairTierSnapshot,
} from '~/utils/chairTiers'
import type { ChairCatalogResponse } from '~/utils/chairCatalog'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { bestSell: bestLiveSell } = useExchangeRates()
const selectedPriority = ref<ChairPriority>('overall')
const budgetCurrency = ref<'UYU' | 'USD'>('UYU')
const budget = ref(20000)

const priorities: Array<{ id: ChairPriority; icon: string }> = [
  { id: 'overall', icon: 'mdi-chart-box-outline' },
  { id: 'comfort', icon: 'mdi-seat-recline-normal' },
  { id: 'support', icon: 'mdi-human-handsup' },
  { id: 'adjustability', icon: 'mdi-tune-vertical-variant' },
  { id: 'durability', icon: 'mdi-shield-check-outline' },
  { id: 'value', icon: 'mdi-cash-check' },
  { id: 'heat', icon: 'mdi-weather-windy' },
]
const methodSteps = ['harvest', 'classify', 'score', 'limits'] as const

const {
  data: snapshot,
  pending,
  error,
  refresh,
} = await useAsyncData<ChairTierSnapshot | null>('chair-tier-snapshot', () =>
  $fetch('/api/chair-tiers')
)

// Only the headline counts, for the doorway to /sillas-escritorio-uruguay/precios. The catalogue
// itself lives on that page; this page used to download all of it to render three numbers.
// Separate from the Reddit tier snapshot on purpose: the tier list is weekly evidence, the market
// is a daily price harvest, and a failure in one must not blank the other.
const { data: catalogSummary } = await useAsyncData<ChairCatalogResponse | null>(
  'chair-catalog-summary',
  () => $fetch('/api/chairs', { query: { summary: '1' } })
)

const catalogMeta = computed(() => catalogSummary.value?.meta ?? null)

const groupedTiers = computed(() =>
  groupChairTiers(snapshot.value?.tiers ?? []).map(group => ({
    ...group,
    items: sortChairsForPriority(group.items, selectedPriority.value),
  }))
)

const topChair = computed(() => {
  const confidenceRank: Record<ChairConfidence, number> = { low: 1, medium: 2, high: 3 }
  return (
    [...(snapshot.value?.tiers ?? [])].sort((a, b) => {
      if (selectedPriority.value !== 'overall') {
        const affinity =
          priorityAffinity(b, selectedPriority.value) - priorityAffinity(a, selectedPriority.value)
        if (affinity) return affinity
      }
      return (
        confidenceRank[b.confidence] - confidenceRank[a.confidence] ||
        (b.sources ?? b.comments) - (a.sources ?? a.comments) ||
        b.score - a.score
      )
    })[0] ?? null
  )
})

const usdUyuRate = computed(() => bestLiveSell('USD'))
const budgetConfig = computed(() =>
  budgetCurrency.value === 'UYU'
    ? { min: 5000, max: 150000, step: 1000 }
    : { min: 100, max: 4000, step: 50 }
)

const clampBudget = () => {
  const value = Number(budget.value) || budgetConfig.value.min
  budget.value = Math.min(budgetConfig.value.max, Math.max(budgetConfig.value.min, value))
}

watch(budgetCurrency, (next, previous) => {
  const rate = usdUyuRate.value
  if (rate) {
    budget.value =
      next === 'UYU' && previous === 'USD'
        ? Math.round((budget.value * rate) / 1000) * 1000
        : Math.round(budget.value / rate / 50) * 50
  }
  clampBudget()
})

const affordableOptions = computed(() =>
  affordableChairOffers(
    snapshot.value?.tiers ?? [],
    Number(budget.value),
    budgetCurrency.value,
    usdUyuRate.value
  )
)

const bestBudgetOption = computed(() => affordableOptions.value[0] ?? null)

const asOfLabel = computed(() => {
  if (!snapshot.value?.asOf) return ''
  return new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(snapshot.value.asOf))
})

const formatDate = (date: string) =>
  new Intl.DateTimeFormat(locale.value, {
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))

const formatPrice = (price: number, currency: 'UYU' | 'USD') =>
  new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'UYU' ? 0 : 2,
  }).format(price)

const photoViewerOpen = ref(false)
const photoViewerPhotos = ref<ChairMedia[]>([])
const photoViewerTitle = ref('')
const photoViewerStart = ref(0)

const photosFor = (chair: ChairTierItem) => chairGallery(chair)

const photoCountLabel = (chair: ChairTierItem) => {
  const count = photosFor(chair).length
  return count > 1 ? t('chairTiers.photos.count', { count }) : t('chairTiers.photos.enlarge')
}

const photoButtonLabel = (chair: ChairTierItem) =>
  t('chairTiers.photos.openAria', { chair: chair.name, count: photosFor(chair).length })

const openPhotos = (chair: ChairTierItem, startIndex = 0) => {
  const photos = photosFor(chair)
  if (!photos.length) return
  photoViewerPhotos.value = photos
  photoViewerTitle.value = chair.name
  photoViewerStart.value = startIndex
  photoViewerOpen.value = true
}

/** Cheapest offer for the chair, read in the currency the budget tool is currently set to. */
const fromOffer = (chair: ChairTierItem) =>
  cheapestChairOffer(chair, budgetCurrency.value, usdUyuRate.value)

/** The same price in the other currency, so a USD tag never forces mental math. */
const approxPrice = (offer: ChairPurchaseOffer) => {
  const target = offer.currency === 'USD' ? 'UYU' : 'USD'
  const converted = convertChairOfferPrice(offer, target, usdUyuRate.value)
  if (converted === null) return ''
  return t('chairTiers.approx', { price: formatPrice(converted, target) })
}

const toneKey = (sentiment: number) => {
  if (sentiment >= 0.2) return 'positive'
  if (sentiment <= -0.2) return 'negative'
  return 'neutral'
}

const sentimentClass = (sentiment: number) => `is-${toneKey(sentiment)}-source`

const tierColor = (tier: ChairTier | null) => (tier ? chairTierMeta[tier].color : 'grey')
const confidenceColor = (confidence: ChairConfidence) =>
  ({ low: 'warning', medium: 'info', high: 'success' })[confidence]

const sentimentAria = (chair: ChairTierItem) => {
  const mix = sentimentPercentages(chair)
  return t('chairTiers.sentimentAria', mix)
}

const canonicalUrl = computed(
  () => `https://cambio-uruguay.com${localePath('/sillas-escritorio-uruguay')}`
)

defineOgImageComponent('Cambio', {
  title: () => t('chairTiers.ogTitle'),
  subtitle: () => t('chairTiers.ogSubtitle'),
  tag: 'REDDIT · DATOS',
})

useSeoMeta({
  title: () => t('chairTiers.metaTitle'),
  description: () => t('chairTiers.metaDescription'),
  ogTitle: () => t('chairTiers.metaTitle'),
  ogDescription: () => t('chairTiers.metaDescription'),
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  script: snapshot.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Dataset',
                name: t('chairTiers.metaTitle'),
                description: t('chairTiers.metaDescription'),
                url: canonicalUrl.value,
                dateModified: snapshot.value.asOf,
                creator: {
                  '@type': 'Organization',
                  name: 'Cambio Uruguay',
                  url: 'https://cambio-uruguay.com',
                },
                isBasedOn: 'https://www.reddit.com/r/CharruaDevs/',
                measurementTechnique:
                  'Reddit post and comment-tree harvest, conservative local source classification with optional Gemini enrichment, deterministic weighted aggregation',
                variableMeasured: [
                  'comment sentiment',
                  'unique authors',
                  'Reddit score',
                  'comment recency',
                  'chair review themes',
                ],
              },
              {
                '@type': 'ItemList',
                name: t('chairTiers.boardTitle'),
                itemListElement: snapshot.value.tiers.map((chair, index) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  name: `${chair.name} — Tier ${chair.tier}`,
                  url: `${canonicalUrl.value}#${chair.slug}`,
                  item: {
                    '@type': 'Product',
                    name: chair.name,
                    brand: chair.brand
                      ? {
                          '@type': 'Brand',
                          name: chair.brand,
                        }
                      : undefined,
                    image: chairMedia(chair)?.url,
                    description: chair.generalReview?.verdict || chair.summary,
                    url: `${canonicalUrl.value}#${chair.slug}`,
                    offers: (chair.offers ?? []).map(offer => ({
                      '@type': 'Offer',
                      name: offer.title,
                      seller: {
                        '@type': 'Organization',
                        name: offer.seller,
                      },
                      price: offer.price,
                      priceCurrency: offer.currency,
                      url: offer.url,
                      itemCondition:
                        offer.condition === 'new'
                          ? 'https://schema.org/NewCondition'
                          : offer.condition === 'refurbished'
                            ? 'https://schema.org/RefurbishedCondition'
                            : offer.condition === 'used'
                              ? 'https://schema.org/UsedCondition'
                              : undefined,
                    })),
                  },
                })),
              },
            ],
          }),
        },
      ]
    : [],
}))
</script>

<style scoped>
.chair-page {
  --positive: #35d07f;
  --neutral: #7d8aa3;
  --negative: #ff655d;
  max-width: 1240px;
  margin: 0 auto;
}

.chair-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(340px, 0.88fr);
  gap: clamp(32px, 5vw, 76px);
  min-height: min(760px, calc(100vh - 100px));
  padding: clamp(28px, 6vw, 76px);
  overflow: hidden;
  border-radius: 16px;
  background: #0a0e1a;
  color: #ffffff;
  isolation: isolate;
}

.chair-hero::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(rgba(100, 181, 246, 0.045) 1px, transparent 1px) 0 0 / 100% 48px,
    #0a0e1a;
  content: '';
  mask-image: linear-gradient(90deg, transparent, #000 45%, #000);
}

.hero-copy {
  align-self: center;
  min-width: 0;
}

.source-mark {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 24px;
  color: #64b5f6;
  font-size: 0.8rem;
  font-weight: 700;
}

.source-mark__dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #ff8f00;
}

/* Display scale follows DESIGN.md (display tops out at 3.75rem) so this page reads as a sibling of
   /mejores-bancos-uruguay and /temas-de-dinero-reddit instead of a poster. */
h1 {
  max-width: 26ch;
  margin: 0;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 300;
  line-height: 1.06;
  letter-spacing: -0.03em;
  text-wrap: balance;
}

.hero-lead {
  max-width: 65ch;
  margin: 24px 0 0;
  color: #b3bdcc;
  font-size: clamp(0.98rem, 1.4vw, 1.08rem);
  line-height: 1.68;
}

.diagnosis {
  margin-top: clamp(36px, 6vw, 62px);
}

.diagnosis__question {
  margin-bottom: 14px;
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 700;
}

.diagnosis__options {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.evidence-rig {
  position: relative;
  align-self: center;
  min-width: 0;
  min-height: 440px;
  padding: clamp(24px, 4vw, 42px);
  border: 1px solid rgba(144, 202, 249, 0.2);
  border-radius: 16px;
  background: #121a2e;
  box-shadow: 16px 24px 48px rgba(0, 0, 0, 0.28);
}

.rig-ruler {
  position: absolute;
  inset: 14px 16px auto;
  display: flex;
  justify-content: space-between;
}

.rig-ruler span {
  width: 1px;
  height: 7px;
  background: rgba(144, 202, 249, 0.28);
}

.rig-ruler span:nth-child(6) {
  height: 13px;
  background: #ff8f00;
}

.rig-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  color: #64b5f6;
  font-size: 0.8rem;
  font-weight: 700;
}

.rig-chair {
  margin: 0 0 10px;
  font-size: clamp(1.7rem, 3.2vw, 2.5rem);
  font-weight: 300;
  line-height: 1.08;
  letter-spacing: -0.025em;
}

.rig-identity {
  margin-top: 22px;
}

.rig-summary {
  margin: 0;
  color: #b5bdc9;
  font-size: 0.95rem;
  line-height: 1.55;
}

/* One photo treatment for the whole page: a white plate the chair sits on, a source credit, and a
   zoom affordance that names how many photos are behind it. */
.photo-frame {
  position: relative;
  display: block;
  width: 100%;
  overflow: hidden;
  padding: 0;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: #ffffff;
  cursor: zoom-in;
}

.photo-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

.photo-frame:hover img,
.photo-frame:focus-visible img {
  transform: scale(1.03);
}

.photo-frame.is-hero {
  margin-top: 22px;
  border-color: rgba(144, 202, 249, 0.22);
}

.photo-frame.is-hero img {
  height: clamp(200px, 24vw, 268px);
  padding: 10px;
}

/* The lead photo runs large and the rest of the verified set fills the row beside it, so a wide card
   never turns into one small chair marooned in white space — and the extra angles advertise the
   viewer instead of hiding behind a counter. */
.photo-strip {
  display: grid;
  min-width: 0;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  grid-template-columns: minmax(0, 1.7fr);
  gap: 10px;
  margin-bottom: 22px;
}

.photo-strip.is-single {
  grid-template-columns: minmax(0, 420px);
}

.photo-frame.is-card img {
  height: clamp(200px, 24vw, 260px);
  padding: 12px;
}

.photo-frame.is-thumb img {
  height: clamp(200px, 24vw, 260px);
  padding: 8px;
}

.photo-frame.is-inline img {
  height: 132px;
  padding: 6px;
}

.photo-frame__source,
.photo-frame__zoom {
  position: absolute;
  bottom: 8px;
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(10, 14, 26, 0.82);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.2;
}

.photo-frame__source {
  left: 8px;
}

.photo-frame__zoom {
  right: 8px;
  background: rgba(10, 14, 26, 0.62);
  font-weight: 600;
}

.sentiment {
  margin: 42px 0 38px;
}

.sentiment__bar,
.distribution__bar {
  display: flex;
  width: 100%;
  overflow: hidden;
  border-radius: 999px;
  background: #202c49;
}

.sentiment__bar {
  height: 12px;
  animation: trace-in 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.sentiment__bar span,
.distribution__bar span {
  display: block;
  min-width: 1px;
}

.sentiment__positive,
.is-positive {
  background: var(--positive);
}

.sentiment__neutral,
.is-neutral {
  background: var(--neutral);
}

.sentiment__negative,
.is-negative {
  background: var(--negative);
}

.sentiment__legend {
  display: flex;
  justify-content: space-between;
  margin-top: 9px;
  color: #818da0;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.rig-ledger {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 0;
  border-block: 1px solid rgba(255, 255, 255, 0.08);
}

.rig-ledger div {
  padding: 24px 10px;
}

.rig-ledger div + div {
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.rig-ledger dt {
  color: #818da0;
  font-size: 0.75rem;
}

.rig-ledger dd {
  margin: 5px 0 0;
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.rig-date {
  margin: 24px 0 2px;
  color: #818da0;
  font-size: 0.75rem;
}

.rig-empty {
  display: grid;
  min-height: 360px;
  place-content: center;
  gap: 16px;
  color: #b5bdc9;
  text-align: center;
}

.trust-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 0 clamp(12px, 4vw, 46px);
  border-radius: 0 0 16px 16px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
}

.trust-strip div {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 58px;
  padding: 12px 18px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
}

.trust-strip div + div {
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* The doorway to the price directory. One surface, one destination — the whole slab is the link,
   so the counts and the verb cannot be tapped apart from each other. */
.directory-bridge {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 28px clamp(28px, 5vw, 64px);
  align-items: center;
  margin-top: clamp(56px, 8vw, 96px);
  padding: clamp(26px, 4vw, 44px);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1), transparent 52%),
    rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
  transition:
    box-shadow 200ms ease,
    border-color 200ms ease,
    background-color 200ms ease;
}

.directory-bridge:hover,
.directory-bridge:focus-visible {
  border-color: rgba(var(--v-theme-primary), 0.5);
  box-shadow: 0 10px 24px rgba(5, 10, 22, 0.18);
}

.directory-bridge h2 {
  margin: 5px 0 0;
  max-width: 26ch;
  font-size: clamp(1.5rem, 3vw, 2.125rem);
  font-weight: 300;
  line-height: 1.14;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.directory-bridge__text {
  max-width: 62ch;
  margin: 14px 0 0;
  line-height: 1.65;
  opacity: 0.76;
}

.directory-bridge__stats {
  display: grid;
  grid-auto-flow: column;
  gap: clamp(20px, 3vw, 40px);
  margin: 0;
  padding-left: clamp(20px, 3vw, 40px);
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.directory-bridge__stats dt {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  opacity: 0.7;
}

.directory-bridge__stats dd {
  margin: 4px 0 0;
  /* Headline, not Display: these are the card's second voice, under its heading. */
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.directory-bridge__cta {
  display: inline-flex;
  grid-column: 1 / -1;
  gap: 8px;
  align-items: center;
  color: rgb(var(--v-theme-link));
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
}

.directory-bridge .v-icon {
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.directory-bridge:hover .v-icon,
.directory-bridge:focus-visible .v-icon {
  transform: translateX(5px);
}

.budget-tool {
  margin-top: clamp(72px, 9vw, 112px);
  padding: clamp(26px, 5vw, 52px);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(var(--v-theme-primary), 0.09), transparent 48%),
    rgb(var(--v-theme-surface));
}

.budget-tool__intro {
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(320px, 1.2fr);
  gap: 40px;
  align-items: end;
}

.budget-tool__intro h2 {
  margin: 5px 0 0;
  max-width: 26ch;
  font-size: clamp(1.5rem, 3vw, 2.125rem);
  font-weight: 300;
  line-height: 1.14;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.budget-tool__intro > p {
  max-width: 64ch;
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.65;
  opacity: 0.72;
}

.budget-tool__body {
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(360px, 1.15fr);
  gap: clamp(26px, 5vw, 58px);
  margin-top: 36px;
}

.budget-controls {
  align-self: center;
}

.budget-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px;
  gap: 18px;
  align-items: center;
  margin-top: 26px;
}

.budget-number {
  font-variant-numeric: tabular-nums;
}

.budget-rate {
  margin: 10px 0 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  opacity: 0.62;
}

.budget-result {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr) auto;
  gap: 22px;
  align-items: center;
  padding: 22px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background: rgb(var(--v-theme-background));
}

.budget-result__eyebrow {
  margin: 0 0 4px;
  color: rgb(var(--v-theme-link));
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.budget-result h3 {
  margin: 0;
  font-size: 1.4rem;
}

.budget-result > div > p:not(.budget-result__eyebrow) {
  margin: 7px 0 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.875rem;
  line-height: 1.5;
  opacity: 0.7;
}

.budget-result__price {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 10px;
  align-items: baseline;
  margin-top: 14px;
}

.budget-result__price strong {
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}

.budget-result__price span {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  opacity: 0.64;
}

.budget-result.is-empty {
  grid-template-columns: auto minmax(0, 1fr);
}

.tier-board {
  margin-top: clamp(78px, 10vw, 130px);
}

.board-intro {
  display: grid;
  grid-template-columns: minmax(280px, 0.8fr) minmax(320px, 1.2fr);
  gap: 40px;
  align-items: end;
  margin-bottom: 46px;
}

.board-intro h2,
.watchlist h2,
.method h2,
.page-close h2 {
  margin: 5px 0 0;
  max-width: 26ch;
  font-size: clamp(1.5rem, 3vw, 2.125rem);
  font-weight: 300;
  line-height: 1.14;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.board-intro > p,
.watchlist > div > p:not(.board-kicker),
.method__intro > p,
.page-close p {
  max-width: 68ch;
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.7;
  opacity: 0.76;
}

.board-kicker {
  margin: 0;
  color: rgb(var(--v-theme-link));
  font-size: 0.8rem;
  font-weight: 800;
}

.tier-row {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  gap: clamp(22px, 4vw, 54px);
  padding: 38px 0 54px;
  border-top: 1px solid color-mix(in srgb, var(--tier-color) 45%, transparent);
}

.tier-marker {
  position: sticky;
  top: 88px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  align-self: start;
}

.tier-letter {
  display: grid;
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  place-items: center;
  border-radius: 16px;
  background: var(--tier-color);
  color: #080b14;
  font-size: 1.9rem;
  font-weight: 800;
  box-shadow: 7px 9px 0 color-mix(in srgb, var(--tier-color) 18%, transparent);
}

.tier-marker h3 {
  margin: 3px 0 5px;
  font-size: 1.05rem;
}

.tier-marker p {
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.8rem;
  line-height: 1.45;
  opacity: 0.68;
}

.tier-marker span {
  display: block;
  margin-top: 8px;
  color: color-mix(in srgb, var(--tier-color) 52%, rgb(var(--v-theme-on-surface)));
  font-size: 0.75rem;
  font-weight: 700;
}

.chair-stack {
  display: grid;
  /* Grid items default to a min-content floor; without this the widest photo in a card can push
     the whole tier row past the viewport on a phone. */
  min-width: 0;
  gap: 16px;
}

.chair-result {
  min-width: 0;
  scroll-margin-top: 96px;
  padding: clamp(20px, 3vw, 30px);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  transition:
    box-shadow 200ms ease,
    border-color 200ms ease;
}

.chair-result:hover {
  border-color: rgba(var(--v-theme-primary), 0.42);
  box-shadow: 0 10px 24px rgba(5, 10, 22, 0.18);
}

.chair-result__top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: start;
}

.chair-title-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: baseline;
}

.chair-result h4 {
  margin: 0;
  font-size: clamp(1.15rem, 2vw, 1.5rem);
  font-weight: 600;
}

.chair-from {
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.chair-from small {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  font-weight: 500;
  opacity: 0.6;
}

.chair-result__top p {
  max-width: 68ch;
  margin: 8px 0 0;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.55;
  opacity: 0.74;
}

.chair-score {
  display: flex;
  align-items: baseline;
  color: color-mix(in srgb, var(--tier-color) 52%, rgb(var(--v-theme-on-surface)));
  font-variant-numeric: tabular-nums;
}

.chair-score strong {
  font-size: clamp(1.75rem, 3vw, 2.4rem);
  line-height: 1;
}

.chair-score span {
  font-size: 0.8rem;
  opacity: 0.8;
}

.chair-result__analytics {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto auto;
  gap: 18px;
  align-items: center;
  margin-top: 24px;
  padding-top: 19px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.distribution__bar {
  height: 7px;
}

.distribution > span {
  display: block;
  margin-top: 7px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  opacity: 0.66;
}

.sample {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.8rem;
  white-space: nowrap;
}

.theme-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 18px;
}

.review-dossier {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  margin-top: 22px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
}

.review-dossier.is-single {
  grid-template-columns: 1fr;
}

.review-column {
  padding: 20px;
  background: rgb(var(--v-theme-surface));
}

.review-column__head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: color-mix(in srgb, var(--positive) 45%, rgb(var(--v-theme-on-surface)));
}

.review-column.is-con .review-column__head {
  color: color-mix(in srgb, var(--negative) 45%, rgb(var(--v-theme-on-surface)));
}

.review-column h5,
.purchase-panel h5 {
  margin: 0;
  font-size: 0.95rem;
}

.review-column ul {
  display: grid;
  gap: 12px;
  margin: 15px 0 0;
  padding: 0;
  list-style: none;
}

.review-column li {
  display: grid;
  gap: 4px;
  padding-left: 15px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.875rem;
  line-height: 1.5;
}

.review-column li::before {
  position: absolute;
  margin-left: -15px;
  color: currentColor;
  content: '—';
  opacity: 0.45;
}

.review-column small {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  opacity: 0.62;
}

.purchase-panel {
  margin-top: 22px;
  padding: 20px;
  border-radius: 12px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 7%, transparent);
}

.purchase-panel__head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
}

.purchase-panel__head > span {
  max-width: 40ch;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  line-height: 1.45;
  opacity: 0.64;
  text-align: right;
}

.purchase-panel__kicker {
  margin: 0 0 4px;
  color: rgb(var(--v-theme-link));
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.offer-list {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.offer {
  display: flex;
  gap: 6px 16px;
  align-items: center;
  padding: 13px 14px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
  transition:
    border-color 160ms ease,
    transform 160ms ease;
}

.offer:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: translateX(3px);
}

.offer__channel {
  flex: 0 0 auto;
  width: 96px;
  color: rgb(var(--v-theme-link));
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.offer__body {
  display: grid;
  flex: 1 1 auto;
  gap: 2px;
  min-width: 0;
}

.offer__seller {
  font-size: 0.8rem;
  font-weight: 700;
}

.offer__title {
  overflow: hidden;
  font-size: 0.8rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.offer__price {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.offer__price small {
  font-weight: 400;
  white-space: nowrap;
}

.offer small {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  opacity: 0.62;
}

.offer__note {
  opacity: 0.5;
}

.evidence-details {
  margin-top: 20px;
}

.evidence-details summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 0 4px;
  color: rgb(var(--v-theme-link));
  font-weight: 700;
  cursor: pointer;
  list-style: none;
}

.evidence-details summary::-webkit-details-marker {
  display: none;
}

.evidence-details[open] summary .v-icon {
  transform: rotate(180deg);
}

.evidence-details summary .v-icon {
  transition: transform 180ms ease;
}

.quote-list {
  display: grid;
  min-width: 0;
  gap: 10px;
  padding-top: 8px;
}

.evidence-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding: 3px 4px 10px;
}

/* Sentiment is carried by the labelled tag in the header, not by a colored edge: the tone has to
   survive a screenshot, a grayscale print, and a reader who cannot separate the three hues. */
.source-entry {
  --tone: var(--neutral);
  min-width: 0;
  margin-left: calc(var(--source-depth) * 14px);
  padding: 16px 18px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.07);
  animation: evidence-open 380ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.source-entry.is-positive-source {
  --tone: var(--positive);
}

.source-entry.is-negative-source {
  --tone: var(--negative);
}

.source-tone {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 5px;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid color-mix(in srgb, var(--tone) 55%, transparent);
  border-radius: 999px;
  /* 45% keeps the hue readable while the on-surface half carries the contrast in both themes;
     at 78% the green label fell to ~3:1 on the light evidence card. */
  color: color-mix(in srgb, var(--tone) 45%, rgb(var(--v-theme-on-surface)));
  font-weight: 700;
  opacity: 1;
}

.source-tone::before {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tone);
  content: '';
}

.source-entry.is-post {
  margin-left: 0;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 13%, transparent);
}

.source-entry header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 10px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  opacity: 0.7;
}

.source-entry header span:first-child {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  color: rgb(var(--v-theme-primary));
  font-weight: 800;
  opacity: 1;
  text-transform: uppercase;
}

/* Long thread titles truncate instead of stretching the row; `min-width: 0` is what lets a flex
   item shrink below its text width at all. */
.source-title {
  flex: 1 1 12ch;
  min-width: 0;
  overflow: hidden;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quote-list p {
  max-width: 74ch;
  margin: 0;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.quote-list footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  font-size: 0.75rem;
}

.quote-list footer span {
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.62;
}

.quote-list a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgb(var(--v-theme-link));
  font-weight: 700;
  text-decoration: none;
}

.chair-move-move {
  transition: transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
}

.watchlist,
.method,
.page-close {
  margin-top: clamp(76px, 10vw, 128px);
}

.watchlist {
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(320px, 1.2fr);
  gap: 46px;
  padding: clamp(26px, 5vw, 54px);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}

.watchlist__items {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-content: start;
}

.method {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(340px, 1.1fr);
  gap: clamp(36px, 7vw, 90px);
  align-items: start;
}

.method__intro > p {
  margin: 22px 0 28px;
}

.method__panels {
  border-radius: 16px;
  overflow: hidden;
}

.page-close {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 36px;
  padding: clamp(28px, 5vw, 56px) 0 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.page-close h2 {
  max-width: 24ch;
}

.page-close p {
  margin-top: 12px;
}

.tier-loading {
  display: grid;
  gap: 18px;
  margin-top: 80px;
}

.empty-state {
  display: grid;
  max-width: 620px;
  margin: 90px auto;
  place-items: center;
  text-align: center;
}

.empty-state h2 {
  margin: 20px 0 8px;
}

.empty-state p {
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
}

@keyframes trace-in {
  from {
    clip-path: inset(0 100% 0 0);
    filter: blur(4px);
  }
  to {
    clip-path: inset(0);
    filter: blur(0);
  }
}

@keyframes evidence-open {
  from {
    clip-path: inset(0 0 100%);
    transform: translateY(-6px);
  }
  to {
    clip-path: inset(0);
    transform: translateY(0);
  }
}

@media (max-width: 959px) {
  .chair-hero {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  h1 {
    max-width: 20ch;
  }

  .evidence-rig {
    min-height: 0;
  }

  .budget-result {
    grid-template-columns: 132px minmax(0, 1fr);
  }

  .budget-result > .v-btn {
    grid-column: 1 / -1;
    justify-self: start;
  }

  .board-intro,
  .budget-tool__intro,
  .budget-tool__body,
  .watchlist,
  .method {
    grid-template-columns: 1fr;
  }

  .directory-bridge {
    grid-template-columns: minmax(0, 1fr);
  }

  .directory-bridge__stats {
    justify-content: start;
    padding-left: 0;
    padding-top: 22px;
    border-left: 0;
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .tier-row {
    grid-template-columns: 130px minmax(0, 1fr);
  }

  .tier-marker {
    position: static;
    display: block;
  }

  .tier-marker > div:last-child {
    margin-top: 14px;
  }

  .chair-result__analytics {
    grid-template-columns: 1fr auto;
  }

  .distribution {
    grid-column: 1 / -1;
  }

  .page-close {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 599px) {
  .chair-page {
    margin-inline: -12px;
  }

  .chair-hero {
    gap: 34px;
    padding: 26px 18px 22px;
    border-radius: 0 0 16px 16px;
  }

  /* No font-size here: the Display clamp already bottoms out at 1.55rem, which is what keeps the
     thesis to three lines on a phone instead of the four that 9.4vw produced. */
  h1 {
    max-width: none;
    line-height: 1.08;
  }

  .hero-lead {
    line-height: 1.58;
  }

  .diagnosis__options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .diagnosis__options .v-btn {
    width: 100%;
    height: auto;
    min-height: 44px;
    padding: 8px 10px;
    font-size: 0.75rem;
    letter-spacing: 0;
    line-height: 1.2;
    white-space: normal;
  }

  .diagnosis__options :deep(.v-btn__content) {
    justify-content: flex-start;
    white-space: normal;
  }

  .evidence-rig {
    min-height: 0;
    padding: 26px 18px 30px;
  }

  .rig-chair {
    font-size: 1.55rem;
  }

  .photo-frame.is-hero img,
  .photo-frame.is-card img {
    height: clamp(180px, 52vw, 240px);
  }

  .photo-strip {
    grid-auto-flow: row;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .photo-strip .photo-frame.is-card {
    grid-column: 1 / -1;
  }

  .photo-frame.is-thumb img {
    height: 76px;
    padding: 5px;
  }

  .rig-ledger div {
    padding: 22px 6px;
  }

  .rig-ledger dt {
    font-size: 0.75rem;
  }

  .rig-ledger dd {
    font-size: 1.15rem;
  }

  .rig-date {
    margin-top: 24px;
  }

  .trust-strip {
    grid-template-columns: 1fr;
    margin: 0 12px;
  }

  .trust-strip div {
    justify-content: flex-start;
    min-height: 50px;
  }

  .trust-strip div + div {
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-left: 0;
  }

  .tier-board,
  .budget-tool,
  .directory-bridge,
  .watchlist,
  .method,
  .page-close,
  .tier-loading,
  .empty-state {
    margin-inline: 18px;
  }

  .directory-bridge {
    padding: 24px 18px;
    gap: 22px;
  }

  .directory-bridge__stats {
    /* Three counters do not fit a phone row without shrinking the numbers below the headline
       weight they are there to carry. */
    grid-auto-flow: row;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    padding-top: 18px;
  }

  .board-intro {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .budget-tool {
    padding: 25px 18px;
  }

  .budget-tool__intro,
  .budget-tool__body {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .budget-inputs {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .budget-number {
    max-width: none;
  }

  .budget-result {
    grid-template-columns: 92px minmax(0, 1fr);
    gap: 15px;
    padding: 16px;
  }

  .photo-frame.is-inline img {
    height: 92px;
  }

  .budget-result > .v-btn {
    grid-column: 1 / -1;
    width: 100%;
  }

  .tier-row {
    grid-template-columns: minmax(0, 1fr);
    margin-inline: 18px;
  }

  .tier-marker {
    display: flex;
  }

  .tier-marker > div:last-child {
    margin-top: 0;
  }

  .chair-result {
    padding: 19px 16px;
  }

  .chair-result__top {
    gap: 14px;
  }

  .chair-result__analytics {
    grid-template-columns: 1fr;
  }

  .distribution {
    grid-column: auto;
  }

  .sample {
    white-space: normal;
  }

  .confidence-chip {
    justify-self: start;
  }

  .review-dossier {
    grid-template-columns: 1fr;
  }

  .purchase-panel {
    padding: 17px 14px;
  }

  .purchase-panel__head {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .purchase-panel__head > span {
    text-align: left;
  }

  .offer {
    flex-wrap: wrap;
  }

  .offer__channel {
    width: auto;
  }

  .offer__body {
    flex: 1 1 100%;
    order: 3;
  }

  .offer__price {
    flex: 1 1 auto;
    align-items: flex-start;
  }

  .quote-list footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .watchlist {
    gap: 28px;
    padding: 26px 18px;
  }

  .method {
    gap: 30px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sentiment__bar,
  .source-entry {
    animation: none;
  }

  .chair-result,
  .chair-move-move,
  .evidence-details summary .v-icon {
    transition: none;
  }

  /* `.chair-photo` never existed — the class is `.photo-frame`, so the photo zoom was the one
     motion this block failed to reach. */
  .photo-frame img,
  .photo-frame:hover img,
  .photo-frame:focus-visible img {
    transform: none;
    transition: none;
  }
}
</style>
