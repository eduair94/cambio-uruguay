<template>
  <div class="casas-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3 d-flex align-center flex-wrap ga-1">
      <VBtn :to="localePath('/')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Cambio Uruguay
      </VBtn>
      <template v-if="lockedCategory">
        <VIcon size="small" color="grey">mdi-chevron-right</VIcon>
        <VBtn :to="localePath(CASAS_PATH)" variant="text" size="small" class="px-1">
          {{ c.backToAll }}
        </VBtn>
      </template>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-casas pa-6 on-dark">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">{{ headerIcon }}</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">{{ pageTitle }}</h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 casas-intro">{{ pageIntro }}</p>
            <p class="text-caption text-grey-lighten-2 mb-0 mt-1">{{ withDate(c.updated) }}</p>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end mt-3">
          <ShareButtons :text="pageTitle" />
        </div>
      </div>
    </VCard>

    <!-- Type navigation: the directory sliced by institution kind. Real links,
         so each slice is its own indexable page rather than a client-only
         toggle state. -->
    <nav class="casas-typenav d-flex flex-wrap align-center ga-2 mb-4" :aria-label="c.typeNavTitle">
      <span class="text-caption text-uppercase pick-label me-1">{{ c.typeNavTitle }}:</span>
      <VChip
        :to="localePath(CASAS_PATH)"
        :variant="lockedCategory ? 'outlined' : 'flat'"
        :color="lockedCategory ? undefined : 'primary'"
        size="small"
        link
        data-testid="casas-type-all"
      >
        {{ c.typeAllLabel }} ({{ rows.length }})
      </VChip>
      <VChip
        v-for="nav in typeNav"
        :key="nav.slug"
        :to="localePath(`${CASAS_PATH}/${nav.slug}`)"
        :variant="lockedCategory === nav.category ? 'flat' : 'outlined'"
        :color="lockedCategory === nav.category ? 'primary' : undefined"
        size="small"
        link
        :data-testid="`casas-type-${nav.slug}`"
      >
        <VIcon start size="small">{{ nav.icon }}</VIcon>
        {{ nav.label }} ({{ nav.count }})
      </VChip>
    </nav>

    <!-- Best-for picks. Computed over whatever slice is on screen, so after
         filtering by department the picks answer "best here", not "best in the
         country". Off-market quotes are never crowned. -->
    <h2 class="text-h6 font-weight-bold mb-2">{{ c.bestForTitle }}</h2>
    <VRow dense class="mb-2">
      <VCol v-for="pick in bestPicks" :key="pick.label" cols="12" sm="6" md="3">
        <VCard class="casas-pick pa-4 h-100" variant="flat" :data-testid="`casas-pick-${pick.id}`">
          <div class="d-flex align-center ga-2 mb-1">
            <VIcon :icon="pick.icon" size="20" color="primary" />
            <span class="text-caption text-uppercase pick-label">{{ pick.label }}</span>
          </div>
          <NuxtLink
            v-if="pick.code"
            :to="localePath(`/casa/${pick.code}`)"
            class="casas-link text-subtitle-1 font-weight-bold"
          >
            {{ pick.name }}
          </NuxtLink>
          <span v-else class="text-subtitle-1 font-weight-bold">—</span>
          <div class="text-caption pick-detail">{{ pick.detail }}</div>
        </VCard>
      </VCol>
    </VRow>

    <!-- Methodology -->
    <VAlert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
      icon="mdi-scale-balance"
      data-testid="casas-methodology"
    >
      <strong>{{ c.methodologyTitle }}</strong>
      <ul class="casas-methodology mt-1">
        <li v-for="(m, i) in c.methodology" :key="i">{{ withDate(m) }}</li>
      </ul>
    </VAlert>

    <!-- Filters -->
    <VCard class="casas-card pa-4 pa-sm-6">
      <VRow dense align="center" class="mb-2">
        <VCol cols="12" sm="4" md="3">
          <VSelect
            :model-value="sortBy"
            :items="sortOptions"
            :label="c.sortLabel"
            density="compact"
            variant="outlined"
            hide-details
            data-testid="casas-sort"
            @update:model-value="onSortChange"
          />
        </VCol>
        <VCol cols="12" sm="4" md="3">
          <VSelect
            :model-value="selectedDept"
            :items="deptOptions"
            :label="c.deptFilterLabel"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            data-testid="casas-dept"
            @update:model-value="onDeptChange"
          />
        </VCol>
        <VCol v-if="!lockedCategory" cols="12" sm="4" md="6">
          <!-- `mandatory` is load-bearing: without it, re-clicking the active
               button emits undefined and every row filters out, leaving a
               blank table with no explanation. -->
          <VBtnToggle
            :model-value="category"
            mandatory
            density="compact"
            color="primary"
            variant="outlined"
            divided
            class="casas-cat-toggle"
            :aria-label="c.colCasa"
            @update:model-value="onCategoryChange"
          >
            <VBtn value="all" size="small">{{ c.categoryAll }}</VBtn>
            <VBtn value="casa" size="small">{{ c.categoryCasa }}</VBtn>
            <VBtn value="banco" size="small" data-testid="casas-cat-banco">{{
              c.categoryBanco
            }}</VBtn>
            <VBtn value="fintech" size="small">{{ c.categoryFintech }}</VBtn>
          </VBtnToggle>
        </VCol>
      </VRow>
      <div class="d-flex flex-wrap align-center ga-2 mb-3">
        <span class="text-caption text-grey-lighten-1">
          {{ withDate(c.reviewsCaption) }} · {{ c.ratesDisclaimer }}
        </span>
      </div>
      <div class="d-flex flex-wrap align-center ga-3 mb-3">
        <span class="text-caption font-weight-medium" data-testid="casas-count">
          {{ visibleRows.length === 1 ? c.resultCountOne : fmtCount(visibleRows.length) }}
        </span>
        <NuxtLink
          v-if="selectedDeptPath"
          :to="selectedDeptPath"
          class="casas-link text-caption"
          data-testid="casas-dept-link"
        >
          {{ c.deptPageLink.replace('{department}', titleCase(selectedDept!)) }}
        </NuxtLink>
        <VBtn
          v-if="hasFilters"
          size="x-small"
          variant="text"
          color="primary"
          data-testid="casas-clear"
          @click="clearFilters"
        >
          {{ c.clearFilters }}
        </VBtn>
      </div>

      <!-- Empty state: filters can legitimately match nothing (a department
           with no bank branch), and a bare table reads as a broken page. -->
      <div
        v-if="!visibleRows.length"
        class="casas-empty text-center pa-8"
        data-testid="casas-empty"
      >
        <VIcon size="56" color="grey-lighten-1" class="mb-3">mdi-store-search-outline</VIcon>
        <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ c.emptyTitle }}</h3>
        <p class="text-body-2 text-grey mb-3">{{ c.emptyText }}</p>
        <VBtn size="small" color="primary" variant="tonal" @click="clearFilters">
          {{ c.clearFilters }}
        </VBtn>
      </div>

      <!-- Desktop table -->
      <div v-else class="d-none d-md-block table-wrap">
        <VTable density="comfortable" class="casas-table cu-mobile-cards">
          <thead>
            <tr>
              <th>{{ c.colCasa }}</th>
              <th>{{ c.colRating }}</th>
              <th class="text-right">{{ c.colBuy }}</th>
              <th class="text-right">{{ c.colSell }}</th>
              <th class="text-right">{{ c.colSpread }}</th>
              <th>{{ c.colOperation }}</th>
              <th>{{ c.colCoverage }}</th>
              <th>{{ c.colLinks }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in visibleRows" :key="r.code" data-testid="casas-row">
              <td data-label="">
                <NuxtLink
                  :to="localePath(`/casa/${r.code}`)"
                  class="casas-link font-weight-medium"
                  >{{ r.name }}</NuxtLink
                >
                <VChip
                  size="x-small"
                  variant="tonal"
                  class="ms-2"
                  :color="categoryColor(r.category)"
                >
                  {{ categoryLabel(r.category) }}
                </VChip>
              </td>
              <td :data-label="c.colRating">
                <template v-if="r.googleRating != null">
                  <span
                    class="casas-stars"
                    role="img"
                    :aria-label="`${r.googleRating} / 5 (${r.googleReviewCount})`"
                  >
                    <!-- eslint-disable vue/max-attributes-per-line -->
                    <VIcon
                      v-for="n in starParts(r.googleRating).full"
                      :key="`f${n}`"
                      size="14"
                      color="amber"
                      >mdi-star</VIcon
                    >
                    <VIcon v-if="starParts(r.googleRating).half" size="14" color="amber"
                      >mdi-star-half-full</VIcon
                    >
                    <VIcon
                      v-for="n in starParts(r.googleRating).empty"
                      :key="`e${n}`"
                      size="14"
                      color="grey"
                      >mdi-star-outline</VIcon
                    >
                    <!-- eslint-enable vue/max-attributes-per-line -->
                  </span>
                  <span class="text-caption ms-1"
                    >{{ r.googleRating.toFixed(1) }} ({{ r.googleReviewCount }})</span
                  >
                  <VChip
                    v-if="isLowSample(r)"
                    size="x-small"
                    variant="tonal"
                    color="warning"
                    class="ms-1"
                  >
                    {{ c.lowSample }}
                  </VChip>
                </template>
                <span v-else class="text-caption text-grey">{{ c.noData }}</span>
              </td>
              <td class="text-right" :class="{ 'best-cell': isBestBuy(r) }" :data-label="c.colBuy">
                {{ rateLabel(r.usd?.buy) }}
              </td>
              <td
                class="text-right"
                :class="{ 'best-cell': isBestSell(r) }"
                :data-label="c.colSell"
              >
                {{ rateLabel(r.usd?.sell) }}
              </td>
              <td class="text-right" :data-label="c.colSpread">
                {{ r.usd ? `${fmt(r.usd.spreadPct)}%` : '—' }}
              </td>
              <td :data-label="c.colOperation">
                <template v-if="r.usd">
                  <span class="text-caption">{{ operationLabel(r.usd.operation) }}</span>
                  <VChip
                    v-if="r.usd.requiresAccount"
                    size="x-small"
                    variant="tonal"
                    color="info"
                    class="ms-1"
                    :title="c.requiresAccountHint"
                  >
                    {{ c.requiresAccount }}
                  </VChip>
                  <VChip
                    v-if="r.usd.offMarket"
                    size="x-small"
                    variant="tonal"
                    color="warning"
                    class="ms-1"
                    :title="c.offMarketHint"
                    data-testid="casas-offmarket"
                  >
                    {{ c.offMarket }}
                  </VChip>
                </template>
                <span v-else class="text-caption text-grey">—</span>
              </td>
              <td :data-label="c.colCoverage">
                {{ r.deptCount ? coverageLabel(r.deptCount) : '—' }}
              </td>
              <td class="casas-actions" :data-label="c.colLinks">
                <a
                  v-if="r.website"
                  :href="r.website"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="casas-link text-caption"
                  >{{ c.websiteLink }}</a
                >
                <NuxtLink :to="localePath(`/sucursales/${r.code}`)" class="casas-link text-caption">
                  {{ c.branchesLink }}
                </NuxtLink>
                <NuxtLink :to="localePath(`/historico/${r.code}`)" class="casas-link text-caption">
                  {{ c.historyLink }}
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>

      <!-- Mobile cards -->
      <div v-if="visibleRows.length" class="d-md-none">
        <div v-for="r in visibleRows" :key="r.code" class="casa-mcard" data-testid="casas-row">
          <div class="d-flex align-center justify-space-between ga-2 mb-1">
            <NuxtLink
              :to="localePath(`/casa/${r.code}`)"
              class="casas-link text-subtitle-1 font-weight-bold"
              >{{ r.name }}</NuxtLink
            >
            <VChip size="x-small" variant="tonal" :color="categoryColor(r.category)">
              {{ categoryLabel(r.category) }}
            </VChip>
          </div>
          <div v-if="r.googleRating != null" class="mb-1">
            <span
              class="casas-stars"
              role="img"
              :aria-label="`${r.googleRating} / 5 (${r.googleReviewCount})`"
            >
              <!-- eslint-disable vue/max-attributes-per-line -->
              <VIcon
                v-for="n in starParts(r.googleRating).full"
                :key="`f${n}`"
                size="14"
                color="amber"
                >mdi-star</VIcon
              >
              <VIcon v-if="starParts(r.googleRating).half" size="14" color="amber"
                >mdi-star-half-full</VIcon
              >
              <VIcon
                v-for="n in starParts(r.googleRating).empty"
                :key="`e${n}`"
                size="14"
                color="grey"
                >mdi-star-outline</VIcon
              >
              <!-- eslint-enable vue/max-attributes-per-line -->
            </span>
            <span class="text-caption ms-1"
              >{{ r.googleRating.toFixed(1) }} ({{ r.googleReviewCount }})</span
            >
            <VChip
              v-if="isLowSample(r)"
              size="x-small"
              variant="tonal"
              color="warning"
              class="ms-1"
            >
              {{ c.lowSample }}
            </VChip>
          </div>
          <div v-else class="text-caption text-grey mb-1">{{ c.colRating }}: {{ c.noData }}</div>
          <dl class="casa-specs">
            <div>
              <dt>{{ c.colBuy }}</dt>
              <dd :class="{ 'best-cell': isBestBuy(r) }">
                {{ rateLabel(r.usd?.buy) }}
              </dd>
            </div>
            <div>
              <dt>{{ c.colSell }}</dt>
              <dd :class="{ 'best-cell': isBestSell(r) }">
                {{ rateLabel(r.usd?.sell) }}
              </dd>
            </div>
            <div>
              <dt>{{ c.colSpread }}</dt>
              <dd>{{ r.usd ? `${fmt(r.usd.spreadPct)}%` : '—' }}</dd>
            </div>
            <div>
              <dt>{{ c.colCoverage }}</dt>
              <dd>{{ r.deptCount ? coverageLabel(r.deptCount) : '—' }}</dd>
            </div>
          </dl>
          <div v-if="r.usd" class="d-flex flex-wrap ga-1 mb-2">
            <VChip size="x-small" variant="tonal">{{ operationLabel(r.usd.operation) }}</VChip>
            <VChip v-if="r.usd.requiresAccount" size="x-small" variant="tonal" color="info">
              {{ c.requiresAccount }}
            </VChip>
            <VChip
              v-if="r.usd.offMarket"
              size="x-small"
              variant="tonal"
              color="warning"
              data-testid="casas-offmarket"
            >
              {{ c.offMarket }}
            </VChip>
          </div>
          <div class="d-flex flex-wrap ga-3">
            <a
              v-if="r.website"
              :href="r.website"
              target="_blank"
              rel="noopener noreferrer"
              class="casas-link text-caption"
              >{{ c.websiteLink }}</a
            >
            <NuxtLink :to="localePath(`/sucursales/${r.code}`)" class="casas-link text-caption">
              {{ c.branchesLink }}
            </NuxtLink>
            <NuxtLink :to="localePath(`/historico/${r.code}`)" class="casas-link text-caption">
              {{ c.historyLink }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </VCard>

    <!-- Per-casa details -->
    <VCard v-if="detailRows.length" variant="flat" class="casas-section mt-6 pa-5">
      <h2 class="text-h6 font-weight-bold mb-3">{{ c.detailsTitle }}</h2>
      <VExpansionPanels variant="accordion" multiple>
        <VExpansionPanel
          v-for="r in detailRows"
          :key="r.code"
          :data-testid="`casas-detail-${r.code}`"
        >
          <VExpansionPanelTitle>
            <div class="d-flex align-center ga-2 flex-wrap">
              <span class="font-weight-medium">{{ r.name }}</span>
              <span v-if="r.googleRating != null" class="text-caption text-grey">
                {{ r.googleRating.toFixed(1) }}★ ({{ r.googleReviewCount }})
              </span>
              <VChip v-if="r.founded" size="x-small" variant="tonal" color="secondary">
                {{ c.foundedLabel }} {{ r.founded }}
              </VChip>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <VRow dense>
              <VCol v-if="r.strengths.length" cols="12" md="6">
                <h3 class="text-subtitle-2 font-weight-bold mb-1">
                  <VIcon size="small" color="success" class="me-1">mdi-thumb-up-outline</VIcon>
                  {{ c.strengthsLabel }}
                </h3>
                <ul class="casas-list">
                  <li v-for="(s, i) in r.strengths" :key="i">{{ s }}</li>
                </ul>
              </VCol>
              <VCol v-if="r.weaknesses.length" cols="12" md="6">
                <h3 class="text-subtitle-2 font-weight-bold mb-1">
                  <VIcon size="small" color="warning" class="me-1">mdi-thumb-down-outline</VIcon>
                  {{ c.weaknessesLabel }}
                </h3>
                <ul class="casas-list">
                  <li v-for="(w, i) in r.weaknesses" :key="i">{{ w }}</li>
                </ul>
              </VCol>
            </VRow>
            <p v-if="r.branchNote" class="text-caption text-grey-lighten-1 mb-2 mt-1">
              {{ r.branchNote }}
            </p>
            <div v-if="r.services.length" class="mb-2">
              <span class="text-caption font-weight-bold me-2">{{ c.servicesLabel }}:</span>
              <VChip
                v-for="s in r.services"
                :key="s"
                size="x-small"
                variant="tonal"
                color="primary"
                class="me-1 mb-1"
                >{{ s }}</VChip
              >
            </div>
            <div v-if="r.press.length" class="mb-2">
              <span class="text-caption font-weight-bold me-2">{{ c.pressLabel }}:</span>
              <ul class="casas-list">
                <li v-for="(p, i) in r.press" :key="i">
                  <a :href="p.url" target="_blank" rel="noopener noreferrer" class="casas-link">{{
                    p.label
                  }}</a>
                </li>
              </ul>
            </div>
            <div class="d-flex flex-wrap ga-2 mt-2">
              <VChip
                v-if="r.trustpilot"
                :href="r.trustpilot.url"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="tonal"
                color="info"
                link
              >
                <VIcon start size="small">mdi-star-check</VIcon>
                Trustpilot {{ r.trustpilot.score.toFixed(1) }}★ ({{ r.trustpilot.count }})
              </VChip>
              <VChip
                v-if="r.bcu"
                :href="r.bcu"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="tonal"
                color="success"
                link
              >
                <VIcon start size="small">mdi-shield-check</VIcon>
                {{ c.bcuBadge }}
              </VChip>
              <VBtn
                :to="localePath(`/casa/${r.code}`)"
                size="small"
                color="primary"
                variant="tonal"
              >
                {{ c.colLinks }}
                <VIcon end size="small">mdi-arrow-right</VIcon>
              </VBtn>
            </div>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCard>

    <!-- Context: casa vs banco vs fintech -->
    <VCard variant="flat" class="casas-section mt-6 pa-5">
      <h2 class="text-h6 font-weight-bold mb-2">{{ c.contextTitle }}</h2>
      <p v-for="(p, i) in c.context" :key="i" class="casas-prose">{{ p }}</p>
    </VCard>

    <!-- Context: border / interior -->
    <VCard variant="flat" class="casas-section mt-4 pa-5">
      <h2 class="text-h6 font-weight-bold mb-2">{{ c.borderTitle }}</h2>
      <p v-for="(p, i) in c.border" :key="i" class="casas-prose">{{ p }}</p>
    </VCard>

    <!-- Safety / regulation -->
    <VCard variant="flat" class="casas-section mt-4 pa-5">
      <h2 class="text-h6 font-weight-bold mb-2">{{ c.safetyTitle }}</h2>
      <p v-for="(p, i) in c.safety" :key="i" class="casas-prose">{{ p }}</p>
    </VCard>

    <!-- Department index: one link per department, so every /dolar/<dept> page
         is reachable from here instead of only from the sitemap. -->
    <VCard v-if="departmentLinks.length" variant="flat" class="casas-section mt-4 pa-5">
      <h2 class="text-h6 font-weight-bold mb-2">{{ c.deptFilterLabel }}</h2>
      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="d in departmentLinks"
          :key="d.slug"
          :to="localePath(`/dolar/${d.slug}`)"
          size="small"
          variant="outlined"
          link
        >
          {{ titleCase(d.name) }}
        </VChip>
      </div>
    </VCard>

    <!-- FAQ -->
    <VCard variant="flat" class="casas-section mt-4 pa-5" data-testid="casas-faq">
      <h2 class="text-h6 font-weight-bold mb-3">{{ c.faqTitle }}</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="(item, i) in c.faq" :key="i">
          <VExpansionPanelTitle class="text-subtitle-2 font-weight-medium">
            {{ item.q }}
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="casas-prose mb-0">{{ withDate(item.a) }}</p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCard>

    <!-- Disclaimer -->
    <VAlert
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mt-4"
      icon="mdi-alert-outline"
    >
      {{ withDate(c.disclaimer) }}
    </VAlert>

    <!-- Sources -->
    <VCard v-if="allSources.length" variant="flat" class="casas-section mt-4 pa-5">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        {{ c.sourcesTitle }}
      </h2>
      <ul class="casas-sources">
        <li v-for="(src, i) in allSources" :key="i">
          <a :href="src.url" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
        </li>
      </ul>
    </VCard>

    <!-- CTA -->
    <VCard class="cta-casas mt-6 pa-6 text-center" variant="flat">
      <h2 class="text-h6 font-weight-bold mb-2 text-white">{{ c.ctaTitle }}</h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">{{ c.ctaBody }}</p>
      <div class="d-flex justify-center flex-wrap ga-2">
        <VBtn :to="localePath(ratesCtaPath)" color="primary" variant="elevated" class="cta-btn">
          <VIcon start>mdi-cash-multiple</VIcon>
          {{ c.ctaRates }}
        </VBtn>
        <VBtn :to="localePath('/mapa')" color="secondary" variant="tonal" class="cta-btn">
          <VIcon start>mdi-map-marker-radius</VIcon>
          {{ c.ctaMap }}
        </VBtn>
        <VBtn :to="localePath('/sucursales')" color="secondary" variant="tonal" class="cta-btn">
          <VIcon start>mdi-store-outline</VIcon>
          {{ c.ctaBranches }}
        </VBtn>
      </div>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import {
  buildUsdComparison,
  CASAS_PATH,
  CASAS_REPUTATION,
  digitalScore,
  getCasasContent,
  CASAS_LAST_RESEARCHED,
  resolveReviewDate,
  typeSlugForCategory,
  type CasaCategory,
  type CasaReputation,
  type UsdComparisonEntry,
} from '~/utils/casasDirectory'
import type { StoredTrustpilot } from '~/utils/casasReviews'
import { dedupeDepartmentNames, slugifyDepartment } from '~/utils/departments'
import { servesDepartment } from '~/utils/exchangeChannel'
import { starParts } from '~/utils/reviews'

/**
 * The comparison table, shared by `/casas-de-cambio` and its per-type slices.
 * `lockedCategory` pins the page to one institution kind: the category toggle
 * disappears and every count, pick and JSON-LD entry is scoped to that slice.
 */
const props = defineProps<{ lockedCategory?: CasaCategory | null }>()

const { locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const { getProcessedExchangeData } = useApiService()

// Localized content tree (falls back to es).
const c = computed(() => getCasasContent(locale.value))

// Review-snapshot date: the newer of the weekly refresh store and the shipped
// research snapshot. See `resolveReviewDate` for why it is not just the store.
const effectiveReviewDate = computed(() => resolveReviewDate(refreshed.value?.updatedAt))
const fmtResearchDate = computed(() =>
  new Date(`${effectiveReviewDate.value}T00:00:00Z`).toLocaleDateString(c.value.lang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
)
const withDate = (s: string): string => s.replace('{date}', fmtResearchDate.value)

// --- Live data (rates + branch metadata). Failure-tolerant: the reputation
// snapshot still renders with "—" in the live columns if the API is down.
interface LocalDataEntry {
  name?: string
  website?: string
  bcu?: string
  departments?: string[]
}
const { data: live } = await useAsyncData('casas-directory', async () => {
  const result = await getProcessedExchangeData('')
  return {
    exchangeData: (result?.exchangeData ?? []) as Array<{
      origin: string
      code: string
      type?: string | null
      buy: number
      sell: number
      isInterBank?: boolean
    }>,
    localData: (result?.localData ?? {}) as Record<string, LocalDataEntry>,
  }
})

// Weekly-refreshed Google/Trustpilot snapshots (server/tasks/casas/refreshReviews.ts).
// Fails soft: default keeps the researched dataset authoritative.
const { data: refreshed } = await useFetch('/api/casas-reviews', {
  default: () => ({ reviews: {}, trustpilot: {}, updatedAt: null as string | null }),
})

const usdByOrigin = computed<Map<string, UsdComparisonEntry>>(() => {
  const entries = buildUsdComparison(live.value?.exchangeData ?? [])
  return new Map(entries.map(e => [e.origin, e]))
})

// --- Merged rows: reputation snapshot × live localData × live USD quotes -----
interface CasaRow extends CasaReputation {
  trustpilot: StoredTrustpilot | null
  website: string | null
  bcu: string | null
  departments: string[]
  deptCount: number
  usd: UsdComparisonEntry | null
}

const allRows = computed<CasaRow[]>(() => {
  const localData = live.value?.localData ?? {}
  return CASAS_REPUTATION.map(rep => {
    const ld = localData[rep.code]
    const departments = ld?.departments ?? []
    const stored = refreshed.value?.reviews?.[rep.code] ?? null
    return {
      ...rep,
      name: ld?.name || rep.name,
      googleRating: stored?.rating ?? rep.googleRating,
      googleReviewCount: stored?.count ?? rep.googleReviewCount,
      ratingSource: stored?.url ?? rep.ratingSource,
      trustpilot: refreshed.value?.trustpilot?.[rep.code] ?? null,
      website: ld?.website ?? null,
      bcu: ld?.bcu ?? null,
      departments,
      deptCount: departments.length,
      usd: usdByOrigin.value.get(rep.code) ?? null,
    }
  })
})

/** The slice this page is about: everything, or one institution kind. */
const rows = computed<CasaRow[]>(() =>
  props.lockedCategory
    ? allRows.value.filter(r => r.category === props.lockedCategory)
    : allRows.value
)

// --- Filters + sorting, synced to the URL so a filtered view is shareable ----
type SortKey = 'reviews' | 'rating' | 'bestSell' | 'bestBuy' | 'spread' | 'name'
const SORT_KEYS: SortKey[] = ['reviews', 'rating', 'bestSell', 'bestBuy', 'spread', 'name']
const CATEGORY_KEYS: Array<'all' | CasaCategory> = ['all', 'casa', 'banco', 'fintech']

const queryString = (key: string): string => {
  const v = route.query[key]
  return typeof v === 'string' ? v : ''
}

const sortBy = ref<SortKey>(
  (SORT_KEYS as string[]).includes(queryString('orden'))
    ? (queryString('orden') as SortKey)
    : 'reviews'
)
const category = ref<'all' | CasaCategory>(
  (CATEGORY_KEYS as string[]).includes(queryString('tipo'))
    ? (queryString('tipo') as 'all' | CasaCategory)
    : 'all'
)
// Resolved against the real department list so `?dep=paysandu` works whichever
// way the houses spell it.
const selectedDept = ref<string | null>(null)

const sortOptions = computed(() => [
  { title: c.value.sortReviews, value: 'reviews' },
  { title: c.value.sortRating, value: 'rating' },
  { title: c.value.sortBestSell, value: 'bestSell' },
  { title: c.value.sortBestBuy, value: 'bestBuy' },
  { title: c.value.sortSpread, value: 'spread' },
  { title: c.value.sortName, value: 'name' },
])

// One option per department. Without the dedupe the list shows 23 entries for
// 19 departments and each duplicate returns only half the houses.
// One option per department. Two things matter here:
// - the dedupe: without it the list shows 23 entries for Uruguay's 19
//   departments, and each duplicate returns only the houses that happened to
//   pick that spelling;
// - the source is EVERY house, not the current slice: departments are a
//   property of the country, not of the slice. Building it from the slice
//   would silently ignore `?dep=artigas` on /fintech (no fintech has a branch
//   there) instead of honouring it and saying so.
const deptOptions = computed(() => dedupeDepartmentNames(allRows.value.flatMap(r => r.departments)))

// Resolve `?dep=` once the live department list exists (it arrives with the
// API payload, after setup on a client-side navigation).
watchEffect(() => {
  const wanted = queryString('dep')
  if (!wanted) {
    selectedDept.value = null
    return
  }
  const match = deptOptions.value.find(d => slugifyDepartment(d) === slugifyDepartment(wanted))
  selectedDept.value = match ?? null
})

const hasFilters = computed(
  () => sortBy.value !== 'reviews' || category.value !== 'all' || selectedDept.value !== null
)

/** Push the current filter state into the URL (replace: filters aren't history). */
const syncQuery = () => {
  const next: Record<string, unknown> = {
    ...route.query,
    orden: sortBy.value === 'reviews' ? undefined : sortBy.value,
    // On a per-type page the slice is already in the path; a `tipo` param on
    // top of it would be a second, conflicting source of truth.
    tipo: props.lockedCategory || category.value === 'all' ? undefined : category.value,
    dep: selectedDept.value ? slugifyDepartment(selectedDept.value) : undefined,
  }
  // Defaults leave the URL clean instead of trailing `?orden=reviews&tipo=all`.
  const query = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined))
  router.replace({ query })
}

const onSortChange = (value: SortKey) => {
  sortBy.value = value
  syncQuery()
}
const onCategoryChange = (value: 'all' | CasaCategory | null) => {
  // VBtnToggle is `mandatory`, so null should never arrive; coerce anyway
  // rather than let an undefined category empty the whole table.
  category.value = value ?? 'all'
  syncQuery()
}
const onDeptChange = (value: string | null) => {
  selectedDept.value = value || null
  syncQuery()
}
const clearFilters = () => {
  sortBy.value = 'reviews'
  category.value = 'all'
  selectedDept.value = null
  syncQuery()
}

// Nulls always sink to the bottom, whatever the direction of the sort.
const byNullable = (
  a: number | null | undefined,
  b: number | null | undefined,
  dir: 1 | -1
): number => {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return (a - b) * dir
}

/** Rows surviving the active filters, before sorting. */
const filteredRows = computed<CasaRow[]>(() => {
  let list = rows.value
  if (!props.lockedCategory && category.value !== 'all') {
    list = list.filter(r => r.category === category.value)
  }
  if (selectedDept.value) {
    const dept = selectedDept.value
    // Reach follows the channel: an account-based provider (eBROU, a bank
    // transfer, the Prex app) works from any department, so filtering purely
    // on the branch list would hide options that are genuinely available.
    list = list.filter(r => servesDepartment(r.code, r.usd?.type, r.departments, dept))
  }
  return list
})

const visibleRows = computed<CasaRow[]>(() => {
  const sorted = [...filteredRows.value]
  switch (sortBy.value) {
    case 'reviews':
      sorted.sort(
        (a, b) =>
          byNullable(a.googleReviewCount, b.googleReviewCount, -1) ||
          byNullable(a.googleRating, b.googleRating, -1) ||
          a.name.localeCompare(b.name)
      )
      break
    case 'rating':
      sorted.sort(
        (a, b) =>
          byNullable(a.googleRating, b.googleRating, -1) ||
          byNullable(a.googleReviewCount, b.googleReviewCount, -1) ||
          a.name.localeCompare(b.name)
      )
      break
    case 'bestSell':
      sorted.sort((a, b) => byNullable(a.usd?.sell, b.usd?.sell, 1) || a.name.localeCompare(b.name))
      break
    case 'bestBuy':
      sorted.sort((a, b) => byNullable(a.usd?.buy, b.usd?.buy, -1) || a.name.localeCompare(b.name))
      break
    case 'spread':
      sorted.sort(
        (a, b) => byNullable(a.usd?.spreadPct, b.usd?.spreadPct, 1) || a.name.localeCompare(b.name)
      )
      break
    default:
      sorted.sort((a, b) => a.name.localeCompare(b.name))
  }
  return sorted
})

// Rows worth an expandable detail panel (some researched substance to show).
const detailRows = computed<CasaRow[]>(() =>
  filteredRows.value
    .filter(r => r.strengths.length || r.weaknesses.length || r.press.length)
    .sort(
      (a, b) =>
        byNullable(a.googleReviewCount, b.googleReviewCount, -1) || a.name.localeCompare(b.name)
    )
)

// --- Type navigation -----------------------------------------------------------
const typeNav = computed(() =>
  (
    [
      { category: 'casa' as const, icon: 'mdi-store-outline', label: c.value.categoryCasa },
      { category: 'banco' as const, icon: 'mdi-bank-outline', label: c.value.categoryBanco },
      { category: 'fintech' as const, icon: 'mdi-cellphone', label: c.value.categoryFintech },
    ] as const
  ).map(entry => ({
    ...entry,
    slug: typeSlugForCategory(entry.category),
    count: allRows.value.filter(r => r.category === entry.category).length,
  }))
)

// --- "Best for" picks (objective, data-driven) --------------------------------
const LOW_SAMPLE = 30
const isLowSample = (r: CasaRow): boolean =>
  r.googleReviewCount != null && r.googleReviewCount < LOW_SAMPLE

// Picks describe the slice on screen, so filtering by department answers "best
// here". Quotes flagged as off-market are excluded: an unverified board must
// not be crowned the best price in the country.
const bestPicks = computed(() => {
  const list = filteredRows.value
  const withUsd = list.filter(r => r.usd && !r.usd.offMarket)
  const bestRate = withUsd.length
    ? withUsd.reduce((min, r) => (r.usd!.sell < min.usd!.sell ? r : min))
    : null
  const ratedPool = list.filter(
    r => r.googleRating != null && (r.googleReviewCount ?? 0) >= LOW_SAMPLE
  )
  const bestRated = ratedPool.length
    ? ratedPool.reduce((max, r) =>
        r.googleRating! > max.googleRating! ||
        (r.googleRating === max.googleRating &&
          (r.googleReviewCount ?? 0) > (max.googleReviewCount ?? 0))
          ? r
          : max
      )
    : null
  const bestCoverage = list.length
    ? list.reduce((max, r) => (r.deptCount > max.deptCount ? r : max))
    : null
  const digitalPool = list.filter(r => digitalScore(r.services) >= 2)
  const bestDigital = digitalPool.length
    ? digitalPool.reduce((max, r) =>
        digitalScore(r.services) > digitalScore(max.services) ? r : max
      )
    : null
  return [
    {
      id: 'rate',
      icon: 'mdi-currency-usd',
      label: c.value.bestForRate,
      code: bestRate?.code ?? null,
      name: bestRate?.name ?? '',
      // Say so when the winning price is account-only: the cheapest number on
      // the page is not an option for someone who isn't already a client.
      detail: bestRate?.usd
        ? `${c.value.colSell}: ${rateLabel(bestRate.usd.sell)}` +
          (bestRate.usd.requiresAccount ? ` · ${c.value.requiresAccount}` : '')
        : '—',
    },
    {
      id: 'rated',
      icon: 'mdi-star',
      label: c.value.bestForRated,
      code: bestRated?.code ?? null,
      name: bestRated?.name ?? '',
      detail: bestRated
        ? `${bestRated.googleRating!.toFixed(1)}★ (${bestRated.googleReviewCount})`
        : '—',
    },
    {
      id: 'coverage',
      icon: 'mdi-map-marker-multiple',
      label: c.value.bestForCoverage,
      code: bestCoverage?.code ?? null,
      name: bestCoverage?.name ?? '',
      detail: bestCoverage ? coverageLabel(bestCoverage.deptCount) : '—',
    },
    {
      id: 'digital',
      icon: 'mdi-cellphone',
      label: c.value.bestForDigital,
      code: bestDigital?.code ?? null,
      name: bestDigital?.name ?? '',
      detail: bestDigital ? bestDigital.services.slice(0, 3).join(' · ') : '—',
    },
  ]
})

// Highlight the best price WITHIN the slice on screen, not against houses the
// reader has filtered out — a green cell has to mean "best of what you see".
const bestVisibleSell = computed(() => {
  const values = visibleRows.value.filter(r => r.usd && !r.usd.offMarket).map(r => r.usd!.sell)
  return values.length ? Math.min(...values) : null
})
const bestVisibleBuy = computed(() => {
  const values = visibleRows.value.filter(r => r.usd && !r.usd.offMarket).map(r => r.usd!.buy)
  return values.length ? Math.max(...values) : null
})
const isBestSell = (r: CasaRow): boolean =>
  !!r.usd && !r.usd.offMarket && r.usd.sell === bestVisibleSell.value
const isBestBuy = (r: CasaRow): boolean =>
  !!r.usd && !r.usd.offMarket && r.usd.buy === bestVisibleBuy.value

// --- Department cross-links ----------------------------------------------------
const departmentLinks = computed(() =>
  deptOptions.value.map(name => ({ name, slug: slugifyDepartment(name) }))
)
const selectedDeptPath = computed(() =>
  selectedDept.value ? localePath(`/dolar/${slugifyDepartment(selectedDept.value)}`) : null
)

// --- Sources: dedup of every cited ref across the visible slice ----------------
const allSources = computed(() => {
  const seen = new Set<string>()
  const out: Array<{ label: string; url: string }> = []
  for (const r of rows.value) {
    for (const ref of [...r.sources, ...r.press]) {
      if (!seen.has(ref.url)) {
        seen.add(ref.url)
        out.push(ref)
      }
    }
  }
  return out
})

// --- Formatting helpers ---------------------------------------------------------
function fmt(n: number): string {
  return n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function rateLabel(n: number | null | undefined): string {
  return n == null ? '—' : `$ ${fmt(n)}`
}
function coverageLabel(n: number): string {
  return `${n} ${n === 1 ? c.value.departmentsSuffixOne : c.value.departmentsSuffix}`
}
function fmtCount(n: number): string {
  return c.value.resultCount.replace('{count}', String(n))
}
/** `SAN JOSÉ` -> `San José`; departments are stored uppercase. */
function titleCase(name: string): string {
  return name
    .toLocaleLowerCase('es')
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase('es'))
}
const categoryLabel = (cat: CasaCategory): string =>
  cat === 'banco'
    ? c.value.categoryBanco
    : cat === 'fintech'
      ? c.value.categoryFintech
      : c.value.categoryCasa
const categoryColor = (cat: CasaCategory): string =>
  cat === 'banco' ? 'secondary' : cat === 'fintech' ? 'purple' : 'primary'
const operationLabel = (op: UsdComparisonEntry['operation']): string =>
  op === 'transfer' ? c.value.opTransfer : op === 'app' ? c.value.opApp : c.value.opCash

// --- Per-slice copy ------------------------------------------------------------
const slicePath = computed(() =>
  props.lockedCategory ? `${CASAS_PATH}/${typeSlugForCategory(props.lockedCategory)}` : CASAS_PATH
)
const pageTitle = computed(() => {
  switch (props.lockedCategory) {
    case 'casa':
      return c.value.typeCasaTitle
    case 'banco':
      return c.value.typeBancoTitle
    case 'fintech':
      return c.value.typeFintechTitle
    default:
      return c.value.title
  }
})
const pageMetaTitle = computed(() => {
  switch (props.lockedCategory) {
    case 'casa':
      return c.value.typeCasaMetaTitle
    case 'banco':
      return c.value.typeBancoMetaTitle
    case 'fintech':
      return c.value.typeFintechMetaTitle
    default:
      return c.value.metaTitle
  }
})
const pageDescription = computed(() => {
  switch (props.lockedCategory) {
    case 'casa':
      return c.value.typeCasaDescription
    case 'banco':
      return c.value.typeBancoDescription
    case 'fintech':
      return c.value.typeFintechDescription
    default:
      return c.value.description
  }
})
const pageIntro = computed(() => {
  switch (props.lockedCategory) {
    case 'casa':
      return c.value.typeCasaIntro
    case 'banco':
      return c.value.typeBancoIntro
    case 'fintech':
      return c.value.typeFintechIntro
    default:
      return c.value.intro
  }
})
const headerIcon = computed(() =>
  props.lockedCategory === 'fintech'
    ? 'mdi-cellphone'
    : props.lockedCategory === 'casa'
      ? 'mdi-store-outline'
      : 'mdi-bank'
)
const ratesCtaPath = computed(() => {
  // Send the reader back to the home comparator already narrowed to the
  // channel this slice is about, instead of the unfiltered market.
  if (props.lockedCategory === 'fintech') return '/?canal=online'
  if (props.lockedCategory === 'casa') return '/?canal=presencial'
  return '/'
})

// --- SEO -----------------------------------------------------------------------
const canonicalUrl = computed(() => `https://cambio-uruguay.com${localePath(slicePath.value)}`)
const ogImageUrl = computed(
  () => `https://cambio-uruguay.com/__og-image__/image${localePath(slicePath.value)}/og.png`
)
const ogTag = computed(
  () => ({ es: 'COMPARATIVA', en: 'COMPARISON', pt: 'COMPARATIVO' })[locale.value] ?? 'COMPARATIVA'
)

defineOgImageComponent('Cambio', {
  title: () => pageTitle.value,
  subtitle: () => pageDescription.value,
  tag: () => ogTag.value,
})

useSeoMeta({
  // Global titleTemplate appends "| Cambio Uruguay - Cotización del Dólar".
  title: () => pageMetaTitle.value,
  description: () => pageDescription.value,
  ogTitle: () => pageTitle.value,
  ogDescription: () => pageDescription.value,
  ogType: 'article',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => pageTitle.value,
  twitterDescription: () => pageDescription.value,
})

// Canonical + keywords + structured data. No aggregateRating on purpose:
// third-party (Google) review averages may not be marked up as our own.
useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  meta: [{ name: 'keywords', content: c.value.keywords }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: pageTitle.value,
            description: pageDescription.value,
            image: ogImageUrl.value,
            datePublished: CASAS_LAST_RESEARCHED,
            // Follows the weekly review refresh, not the original research run.
            dateModified: effectiveReviewDate.value,
            inLanguage: c.value.lang,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl.value },
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: ['.casas-intro', '.casas-prose'],
            },
            author: {
              '@type': 'Person',
              name: 'Eduardo Airaudo',
              url: 'https://www.linkedin.com/in/eduardo-airaudo/',
            },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              logo: { '@type': 'ImageObject', url: 'https://cambio-uruguay.com/img/logo.png' },
            },
          },
          {
            '@type': 'ItemList',
            name: pageTitle.value,
            numberOfItems: rows.value.length,
            itemListElement: [...rows.value]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((r, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                  '@type': 'FinancialService',
                  name: r.name,
                  url: `https://cambio-uruguay.com/casa/${r.code}`,
                  ...(r.website ? { sameAs: r.website } : {}),
                },
              })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: c.value.faq.map(item => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: withDate(item.a) },
            })),
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
              ...(props.lockedCategory
                ? [
                    {
                      '@type': 'ListItem',
                      position: 2,
                      name: c.value.title,
                      item: `https://cambio-uruguay.com${localePath(CASAS_PATH)}`,
                    },
                    {
                      '@type': 'ListItem',
                      position: 3,
                      name: pageTitle.value,
                      item: canonicalUrl.value,
                    },
                  ]
                : [
                    {
                      '@type': 'ListItem',
                      position: 2,
                      name: pageTitle.value,
                      item: canonicalUrl.value,
                    },
                  ]),
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.bg-gradient-casas {
  background: linear-gradient(135deg, #1565c0 0%, #16c784 100%);
}

/* Guard against any child forcing horizontal scroll on the page body. */
.casas-page {
  overflow-x: hidden;
}

.casas-intro {
  max-width: 760px;
  line-height: 1.6;
}

.casas-card,
.casas-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.casas-pick {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.pick-label {
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.6);
}

.pick-detail {
  color: rgba(255, 255, 255, 0.7);
}

.table-wrap {
  overflow-x: auto;
}

.casas-table :deep(td),
.casas-table :deep(th) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  white-space: nowrap;
}

.casas-table :deep(td:first-child) {
  white-space: normal;
}

.casas-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  border-bottom: none !important;
}

.casas-methodology {
  margin: 0;
  padding-left: 1.1rem;
}

.casas-methodology li {
  margin-top: 0.3rem;
  line-height: 1.55;
}

.casas-list,
.casas-sources {
  margin: 0;
  padding-left: 1.1rem;
}

.casas-list li,
.casas-sources li {
  margin-bottom: 0.35rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.55;
}

.casas-prose {
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.7;
  font-size: 0.95rem;
}

.casas-link,
.casas-sources a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}

.casas-link:hover,
.casas-sources a:hover {
  text-decoration: underline;
}

.casas-stars {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}

.best-cell {
  color: #16c784;
  font-weight: 700;
}

/* Bright brand green fails AA on light surfaces; darken like the couriers page. */
.v-theme--light .best-cell {
  color: #0b7a4a;
}

.cta-casas {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}

.cta-btn {
  height: auto;
  min-height: 44px;
  max-width: 100%;
  white-space: normal;
}

.cta-btn :deep(.v-btn__content) {
  white-space: normal;
  padding-block: 8px;
}

/* Mobile stacked card for each house (replaces the table < md). */
.casa-mcard {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
}

.casa-mcard + .casa-mcard {
  margin-top: 12px;
}

.casa-specs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0 0 8px;
}

.casa-specs dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.5);
}

.casa-specs dd {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.casas-cat-toggle {
  flex-wrap: wrap;
}

/* Dashed rather than solid so an empty result reads as a placeholder, not as
   another card. Same 0.1 border alpha as .casas-pick — no new step. */
.casas-empty {
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

/* Light-mode text-contrast overrides (dark-first whites → black at same alpha). */
.v-theme--light .pick-label {
  color: rgba(0, 0, 0, 0.6);
}

.v-theme--light .pick-detail {
  color: rgba(0, 0, 0, 0.7);
}

.v-theme--light .casas-list li,
.v-theme--light .casas-sources li {
  color: rgba(0, 0, 0, 0.78);
}

.v-theme--light .casas-prose {
  color: rgba(0, 0, 0, 0.82);
}

.v-theme--light .casa-specs dt {
  color: rgba(0, 0, 0, 0.5);
}

.v-theme--light .casa-specs dd {
  color: rgba(0, 0, 0, 0.85);
}
</style>
