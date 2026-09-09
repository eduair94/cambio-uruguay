<!--
THESIS: Find a viable home across portals by location, conditions and actual monthly cost.
OWN-WORLD: Extend Cambio Uruguay's navy/paper surfaces, Open Sans and blue actions.
STORY: Narrow the search, compare costs, save candidates, contact the original publisher.
FIRST VIEWPORT: Persistent filters beside the heading and results; location and budget lead.
FORM: Rental catalogue with a left filter sidebar and a personal comparison shortlist.
MOBILE: Results first; persistent filters open a right-side drawer with fixed actions.
-->
<template>
  <VContainer class="rentals pt-1 pt-sm-4" :class="{ 'rentals--mobile': smAndDown }">
    <VBreadcrumbs :items="breadcrumbs" density="compact" class="rentals-breadcrumbs px-0 py-1" />
    <div class="rentals-workspace">
      <header class="rentals-head">
        <h1>{{ t('title') }}</h1>
        <p class="rentals-lead">{{ t('subtitle') }}</p>
        <div
          class="rentals-related-disclosure"
          :class="{ 'rentals-related-disclosure--expanded': relatedSearchesOpen }"
          data-testid="rental-related-searches"
        >
          <VBtn
            type="button"
            class="rentals-related-toggle text-none"
            variant="outlined"
            color="link"
            :append-icon="relatedSearchesOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            :aria-expanded="relatedSearchesOpen"
            aria-controls="rental-related-links"
            @click="relatedSearchesOpen = !relatedSearchesOpen"
          >
            {{ t('relatedSearches') }}
          </VBtn>
          <nav id="rental-related-links" class="rentals-related" :aria-label="t('relatedSearches')">
            <VBtn
              v-for="search in relatedSearches"
              :key="search.path"
              :to="localePath(search.path)"
              variant="outlined"
              color="link"
              class="rentals-related-action text-none"
            >
              <VIcon :icon="search.icon" size="20" aria-hidden="true" />
              <span>{{ search.label }}</span>
            </VBtn>
          </nav>
        </div>
        <div class="rentals-provenance">
          <a href="#rental-coverage" :title="activeSourceLabels">{{ t('coverage') }}</a>
          <time v-if="meta?.generatedAt" :datetime="meta.generatedAt">{{
            t('date', { date: dateLabel(meta.generatedAt) })
          }}</time>
        </div>
        <VAlert v-if="downSources.length" type="warning" variant="tonal" class="mt-3">{{
          t('sourceWarning', {
            sources: downSources.map(source => sourceLabel(source.key)).join(', '),
          })
        }}</VAlert>
      </header>
      <aside class="rentals-sidebar" :aria-label="t('mobileFilters')">
        <SearchFilters
          v-model:open="mobileFiltersOpen"
          :mobile="smAndDown"
          :query="query"
          :departments="data?.facets.departments ?? []"
          :neighborhoods="neighborhoodFacets"
          :pending="pending"
          @search="search"
          @clear="clearFilters"
          @department="loadNeighborhoods"
          @closed="restoreFilterContext"
        />
      </aside>
      <div class="rentals-content">
        <div v-if="smAndDown" class="rentals-mobile-bar" data-testid="rental-mobile-toolbar">
          <VBtn
            color="link"
            variant="tonal"
            prepend-icon="mdi-tune-variant"
            aria-haspopup="dialog"
            aria-controls="rental-mobile-filters-dialog"
            :aria-expanded="mobileFiltersOpen"
            data-testid="rental-mobile-filters-trigger"
            @click="openMobileFilters"
            >{{ t('mobileFilters')
            }}<span v-if="filterChips.length"> ({{ filterChips.length }})</span></VBtn
          >
          <VBtn
            variant="text"
            :icon="view === 'lista' ? 'mdi-map-marker-outline' : 'mdi-view-grid-outline'"
            :aria-label="t(view === 'lista' ? 'map' : 'list')"
            :title="t(view === 'lista' ? 'map' : 'list')"
            @click="changeView(view === 'lista' ? 'mapa' : 'lista')"
          />
          <RentalAlertButton kind="rental-search" :filters="{ ...query }" compact />
          <VMenu>
            <template #activator="{ props: menuProps }">
              <VBtn
                v-bind="menuProps"
                icon="mdi-dots-vertical"
                variant="text"
                :aria-label="t('searchActions')"
                :title="t('searchActions')"
              />
            </template>
            <VList density="comfortable">
              <VListItem
                prepend-icon="mdi-bookmark-plus-outline"
                :title="t('saveSearch')"
                @click="saveSearch"
              />
              <VListItem
                prepend-icon="mdi-heart-outline"
                :title="t('saved') + ' (' + (saved.favorites.length + saved.searches.length) + ')'"
                @click="showSaved = !showSaved"
              />
              <VListItem
                prepend-icon="mdi-share-variant-outline"
                :title="t('share')"
                @click="shareSearch"
              />
            </VList>
          </VMenu>
        </div>
        <div v-if="filterChips.length" class="rentals-chips" :aria-label="t('activeFilters')">
          <VChip
            v-for="chip in filterChips"
            :key="chip.key"
            closable
            variant="tonal"
            color="primary"
            :close-label="t('remove', { name: chip.label })"
            @click:close="removeFilter(chip.keys)"
            >{{ chip.label }}</VChip
          >
          <VBtn variant="text" size="small" @click="clearFilters">{{ t('reset') }}</VBtn>
        </div>
        <div v-if="!smAndDown" class="rentals-tools">
          <RentalAlertButton v-if="!smAndDown" kind="rental-search" :filters="{ ...query }" />
          <VBtn
            variant="text"
            :prepend-icon="smAndDown ? undefined : 'mdi-bookmark-plus-outline'"
            :icon="smAndDown"
            :aria-label="t('saveSearch')"
            :title="t('saveSearch')"
            @click="saveSearch"
          >
            <VIcon v-if="smAndDown" icon="mdi-bookmark-plus-outline" /><template v-else>{{
              t('saveSearch')
            }}</template>
          </VBtn>
          <VBtn
            variant="text"
            :prepend-icon="smAndDown ? undefined : 'mdi-heart-outline'"
            :icon="smAndDown"
            :aria-label="`${t('saved')} (${saved.favorites.length + saved.searches.length})`"
            :title="t('saved')"
            :aria-expanded="showSaved"
            aria-controls="rental-saved"
            @click="showSaved = !showSaved"
            ><VIcon v-if="smAndDown" icon="mdi-heart-outline" /><template v-else
              >{{ t('saved') }} ({{ saved.favorites.length + saved.searches.length }})</template
            ></VBtn
          >
          <VBtn
            variant="text"
            :prepend-icon="smAndDown ? undefined : 'mdi-share-variant-outline'"
            :icon="smAndDown"
            :aria-label="t('share')"
            :title="t('share')"
            @click="shareSearch"
          >
            <VIcon v-if="smAndDown" icon="mdi-share-variant-outline" /><template v-else>{{
              t('share')
            }}</template>
          </VBtn>
        </div>
        <div v-if="showSaved" id="rental-saved" class="mb-6">
          <SavedPanel
            :state="saved"
            :usd-uyu="usdUyu"
            @open-search="openSavedSearch"
            @remove-search="removeSearch"
            @remove-favorite="removeFavorite"
          />
        </div>
        <section
          id="rental-results"
          class="rentals-results"
          :aria-busy="pending"
          tabindex="-1"
          :aria-label="t('searchResults')"
        >
          <div class="rentals-toolbar">
            <div class="rentals-summary" role="status" aria-live="polite">
              <h2>{{ pending ? t('searching') : t('results', { n: numberFormat(total) }) }}</h2>
              <p v-if="medianUyu && !pending">
                {{ t('typical', { price: `$ ${numberFormat(medianUyu)}` }) }}
              </p>
              <p v-if="query.sort === 'total'">{{ t('totalSortHint') }}</p>
              <p v-if="query.sort === 'distancia'">{{ t('distanceSortHint') }}</p>
            </div>
            <VSelect
              :model-value="query.sort"
              :items="sortItems"
              :label="t('sort')"
              variant="outlined"
              density="compact"
              hide-details
              class="rentals-sort"
              @update:model-value="changeSort"
            />
            <VBtnToggle
              v-if="!smAndDown"
              :model-value="viewMode"
              :aria-label="t('viewMode')"
              mandatory
              variant="outlined"
              density="comfortable"
              divided
              class="rentals-view"
              @update:model-value="changeViewMode"
              ><VBtn value="mosaico" prepend-icon="mdi-view-grid-outline">{{ t('tiles') }}</VBtn
              ><VBtn value="lista" prepend-icon="mdi-view-list-outline">{{ t('list') }}</VBtn
              ><VBtn value="mapa" prepend-icon="mdi-map-marker-outline">{{
                t('map')
              }}</VBtn></VBtnToggle
            >
          </div>
          <div v-if="referencePoint" class="rentals-reference" data-testid="rental-reference">
            <p v-if="query.refLabel">
              <strong>{{ query.refLabel }}</strong>
            </p>
            <p>{{ t('distanceHint') }}</p>
            <div class="rentals-reference__actions">
              <VBtn
                variant="text"
                prepend-icon="mdi-map-marker-outline"
                @click="startPointSelection"
              >
                {{ t('changePoint') }}
              </VBtn>
              <VBtn variant="text" @click="removeReference">{{ t('removePoint') }}</VBtn>
            </div>
          </div>
          <VProgressLinear v-if="pending" indeterminate color="primary" class="mb-4" />
          <VAlert v-if="error" type="error" variant="tonal" class="mb-5" role="alert">
            {{ t('error') }}
            <VBtn variant="text" @click="refresh()">{{ t('retry') }}</VBtn>
          </VAlert>
          <section v-if="view === 'mapa'" class="rentals-map mb-6" :aria-label="t('map')">
            <div
              class="rentals-map__point-controls"
              :class="{ 'rentals-map__point-controls--picking': pickingPoint }"
            >
              <template v-if="pickingPoint">
                <ReferenceAddress @select="selectReferenceAddress" @edit="clearDraftReference" />
                <p id="rental-point-instructions">{{ t('pickPointHint') }}</p>
                <p v-if="pointError" role="alert">{{ t('pointOutsideUruguay') }}</p>
                <p v-if="draftPoint" role="status">{{ draftPointLabel || t('pointSelected') }}</p>
                <div class="rentals-reference__actions">
                  <VBtn variant="outlined" :disabled="!mapReady" @click="useMapCenter">
                    {{ t('useMapCenter') }}
                  </VBtn>
                  <VBtn
                    color="primary"
                    :disabled="!draftPoint"
                    data-testid="rental-point-apply"
                    @click="applyReference"
                  >
                    {{ t('sortFromPoint') }}
                  </VBtn>
                  <VBtn variant="text" @click="cancelPointSelection">{{ t('cancelPoint') }}</VBtn>
                </div>
              </template>
              <VBtn
                v-else
                variant="outlined"
                prepend-icon="mdi-map-marker-distance"
                data-testid="rental-point-start"
                @click="startPointSelection"
              >
                {{ t(referencePoint ? 'changePoint' : 'choosePoint') }}
              </VBtn>
            </div>
            <VProgressLinear v-if="mapPending" indeterminate color="primary" class="mb-2" />
            <VAlert v-if="mapError" type="error" variant="tonal" class="mb-3">
              {{ t('error') }}
              <VBtn variant="text" @click="loadMap()">{{ t('retry') }}</VBtn>
            </VAlert>
            <p v-if="mapData" class="rentals-map__coverage">
              {{
                t('mapCoverage', {
                  located: numberFormat(mapData.located),
                  total: numberFormat(mapData.total),
                })
              }}
              <span v-if="mapData.shown < mapData.located">{{
                t('mapLimit', { n: numberFormat(mapData.shown) })
              }}</span>
            </p>
            <ClientOnly>
              <div
                v-if="(mapMarkers.length || pickingPoint || referencePoint) && !mapError"
                ref="mapFrame"
                class="rentals-map__frame"
                tabindex="-1"
                :aria-label="t('map')"
                :aria-describedby="pickingPoint ? 'rental-point-instructions' : undefined"
                :class="{ 'rentals-map__frame--picking': pickingPoint }"
                @keydown.esc="pickingPoint ? cancelPointSelection() : closeMapProperty()"
              >
                <LocationsMap
                  ref="rentalMap"
                  :branches="mapMarkers"
                  :popups="false"
                  :marker-hit-size="44"
                  :highlight-id="selectedMapKey"
                  :user-location="sedeCentro"
                  :reference-point="pickingPoint ? draftPoint : referencePoint"
                  :reference-label="t('referencePoint')"
                  :center="referencePoint ? [referencePoint.lat, referencePoint.lng] : undefined"
                  :zoom="referencePoint ? 14 : 7"
                  :radius-km="sedeCentro ? query.radioKm : 0"
                  :fit-to-markers="!referencePoint && !pickingPoint"
                  height="100%"
                  :directions-label="t('open')"
                  @marker-click="selectMapProperty"
                  @map-click="closeMapProperty(false)"
                  @map-point="selectReferencePoint"
                  @ready="onReferenceMapReady"
                />
                <span v-if="pickingPoint" class="rentals-map__crosshair" aria-hidden="true">+</span>
                <MapPropertyDetail
                  v-if="selectedMapKey"
                  :key="selectedMapKey"
                  :property="mapDetail?.property ?? null"
                  :point="selectedMapPoint"
                  :usd-uyu="mapDetail?.usdUyu ?? usdUyu"
                  :pending="mapDetailPending"
                  :error="mapDetailError"
                  :favorite="isFavorite(selectedMapKey)"
                  :distance-label="
                    referencePoint ? distanceLabel(selectedMapPoint?.distanceKm) : ''
                  "
                  @close="closeMapProperty()"
                  @retry="selectMapProperty({ id: selectedMapKey! })"
                  @favorite="property => toggleFavorite(property, mapDetail?.usdUyu ?? usdUyu)"
                />
              </div>
              <VAlert v-else-if="!mapPending && !mapError" type="info" variant="tonal">
                {{ t('noMap') }}
                <VBtn variant="text" @click="changeView('lista')">{{ t('list') }}</VBtn>
              </VAlert>
            </ClientOnly>
          </section>
          <div v-if="!pending && !error && !items.length && view === 'lista'" class="rentals-empty">
            <VIcon size="40" color="primary">mdi-home-search-outline</VIcon>
            <h3>{{ t('empty') }}</h3>
            <p>{{ t('emptyHint') }}</p>
            <div class="rentals-empty__actions">
              <VBtn v-if="smAndDown" color="primary" variant="tonal" @click="openMobileFilters">{{
                t('editFilters')
              }}</VBtn>
              <VBtn
                v-for="chip in filterChips.slice(0, 3)"
                :key="chip.key"
                variant="outlined"
                @click="removeFilter(chip.keys)"
                >{{ t('remove', { name: chip.label }) }}</VBtn
              >
              <VBtn variant="text" @click="clearFilters">{{ t('reset') }}</VBtn>
            </div>
          </div>
          <div
            v-if="view === 'lista' && !error"
            class="rentals-grid"
            :class="`rentals-grid--${layout}`"
            data-testid="rental-results-grid"
          >
            <article v-for="(property, index) in items" :key="property.key" class="rental-card">
              <div class="rental-card__visual">
                <!-- Con foto la imagen abre la galería sin salir de la búsqueda; sin foto no hay
                     nada que previsualizar y el destino útil sigue siendo la ficha. -->
                <button
                  v-if="hasPhoto(property)"
                  type="button"
                  class="rental-card__media"
                  :aria-label="`${t('viewPhotos')}: ${property.title}`"
                  @click="openPhotoPreview(property)"
                >
                  <img
                    :src="displayOffer(property)?.image || ''"
                    :alt="property.title"
                    :loading="index < 3 ? 'eager' : 'lazy'"
                    decoding="async"
                    width="400"
                    height="260"
                    @error="failedImages.add(property.key)"
                  />
                  <span class="rental-card__zoom" aria-hidden="true">
                    <VIcon size="16">mdi-image-multiple-outline</VIcon>
                    <span class="rental-card__zoom-label">{{ t('viewPhotos') }}</span>
                  </span>
                  <span v-if="property.sources.length > 1" class="rental-card__badge">{{
                    t('portals', { n: property.sources.length })
                  }}</span>
                </button>
                <NuxtLink
                  v-else
                  :to="localePath(rentalPropertyPath(property.key))"
                  class="rental-card__media"
                  :aria-label="`${t('detail')}: ${property.title}`"
                  @pointerdown="rememberRentalSearch(route.fullPath)"
                  @click="rememberRentalSearch(route.fullPath)"
                >
                  <span class="rental-card__noimage">
                    <VIcon size="36">mdi-home-city-outline</VIcon>
                    <span>{{ t('noPhoto') }}</span>
                  </span>
                  <span v-if="property.sources.length > 1" class="rental-card__badge">{{
                    t('portals', { n: property.sources.length })
                  }}</span>
                </NuxtLink>
                <VBtn
                  class="rental-card__save"
                  :icon="isFavorite(property.key) ? 'mdi-heart' : 'mdi-heart-outline'"
                  :color="isFavorite(property.key) ? 'primary' : undefined"
                  :aria-label="`${t(isFavorite(property.key) ? 'unfavorite' : 'favorite')}: ${property.title}`"
                  :aria-pressed="isFavorite(property.key)"
                  variant="flat"
                  size="small"
                  @click="toggleFavorite(property)"
                />
              </div>
              <div class="rental-card__body">
                <div class="rental-card__main">
                  <div class="rental-card__overview">
                    <p class="rental-card__where">
                      {{
                        [property.neighborhood, property.department].filter(Boolean).join(', ') ||
                        t('unknown')
                      }}
                    </p>
                    <p
                      v-if="referencePoint && !pending"
                      class="rental-card__distance"
                      data-testid="rental-card-distance"
                    >
                      {{ distanceLabel(property.distanceKm) }}
                    </p>
                    <div class="rental-card__cost">
                      <p class="rental-card__price" data-testid="rental-card-price">
                        {{
                          monthlyTotal(property) !== null
                            ? '$ ' + numberFormat(monthlyTotal(property)!)
                            : priceLabel(property)
                        }}
                      </p>
                      <p class="rental-card__cost-label">
                        {{ t(monthlyTotal(property) !== null ? 'rentAndExpenses' : 'rent') }}
                      </p>
                      <p v-if="monthlyTotal(property) !== null" class="rental-card__expenses">
                        {{ priceLabel(property) }} {{ t('rent').toLowerCase() }} ·
                        {{ expensesLabel(property) }}
                      </p>
                      <p v-else class="rental-card__expenses">{{ expensesLabel(property) }}</p>
                    </div>

                    <h3>
                      <NuxtLink
                        :to="localePath(rentalPropertyPath(property.key))"
                        @pointerdown="rememberRentalSearch(route.fullPath)"
                        @click="rememberRentalSearch(route.fullPath)"
                        >{{ property.title }}</NuxtLink
                      >
                    </h3>
                    <p class="rental-card__specs">{{ specsLabel(property) }}</p>
                    <p v-if="property.address" class="rental-card__address">
                      {{ property.address }}
                    </p>
                  </div>
                  <div class="rental-card__tags">
                    <VChip
                      v-if="displayOffer(property)?.ownerDirect?.declared"
                      size="small"
                      variant="tonal"
                      color="primary"
                      >{{ t('owner') }}</VChip
                    >
                    <VChip
                      v-if="displayOffer(property)?.petsAllowed"
                      size="small"
                      variant="tonal"
                      >{{ t('pets') }}</VChip
                    ><VChip
                      v-if="(displayOffer(property)?.parkingSpaces ?? 0) > 0"
                      size="small"
                      variant="tonal"
                      >{{ t('parking') }}</VChip
                    ><VChip v-if="displayOffer(property)?.furnished" size="small" variant="tonal">{{
                      t('furnished')
                    }}</VChip
                    ><VChip
                      v-for="guarantee in publishedGuarantees(property)"
                      :key="guarantee"
                      size="small"
                      variant="outlined"
                      >{{ t(guarantee) }}</VChip
                    >
                  </div>
                  <div class="rental-card__footnote">
                    <p class="rental-card__meta">{{ sellerLabel(property) }}</p>
                    <RentalsAvailabilityReport
                      :offers="property.offers"
                      :summary="property.availability"
                      :preferred="displayOffer(property)"
                      :title="property.title"
                    />
                    <p class="rental-card__meta">
                      {{
                        t('seen', {
                          date: dateLabel(displayOffer(property)?.lastSeen || property.lastSeen),
                        })
                      }}
                    </p>
                  </div>
                </div>
                <div class="rental-card__rail">
                  <div class="rental-card__offers">
                    <a
                      v-for="offer in property.offers"
                      :key="offer.listingId"
                      :href="offer.url"
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      class="rental-card__offer"
                      :class="{
                        'rental-card__offer--selected':
                          offer.listingId === displayOffer(property)?.listingId,
                      }"
                      ><span>{{ sourceLabel(offer.source) }}</span
                      ><strong>{{ offerPrice(offer) }}</strong
                      ><VIcon size="16">mdi-open-in-new</VIcon></a
                    >
                  </div>
                  <NuxtLink
                    :to="localePath(rentalPropertyPath(property.key))"
                    class="rental-card__detail"
                    data-testid="rental-card-detail-link"
                    :aria-label="`${t('detail')}: ${property.title}`"
                    @pointerdown="rememberRentalSearch(route.fullPath)"
                    @click="rememberRentalSearch(route.fullPath)"
                  >
                    {{ t('detailsAndServices') }}
                    <VIcon size="20" aria-hidden="true">mdi-arrow-right</VIcon>
                  </NuxtLink>
                </div>
              </div>
            </article>
          </div>
          <PropertyPhotoLightbox
            v-model="previewOpen"
            :title="previewProperty?.title || ''"
            :photos="previewPhotos"
            :source="previewSource"
            :detail-href="
              previewProperty ? localePath(rentalPropertyPath(previewProperty.key)) : ''
            "
          />
          <div v-if="pageCount > 1 && view === 'lista' && !error" class="mt-6">
            <VPagination
              :model-value="query.page"
              :length="pageCount"
              :total-visible="smAndDown ? 1 : 7"
              @update:model-value="onPageChange"
            >
              <template #prev="props">
                <VBtn v-bind="paginationLinkProps(props, query.page - 1)" />
              </template>
              <template #item="{ key, page, props }">
                <VBtn v-bind="paginationLinkProps(props, typeof key === 'number' ? key : null)">
                  {{ page }}
                </VBtn>
              </template>
              <template #next="props">
                <VBtn v-bind="paginationLinkProps(props, query.page + 1)" />
              </template>
            </VPagination>
            <p v-if="smAndDown" class="text-caption text-center mt-1">
              {{ t('pageStatus', { current: query.page, total: pageCount }) }}
            </p>
          </div>
        </section>
      </div>
    </div>
    <section id="rental-coverage" class="rentals-notes">
      <h2>{{ t('methodology') }}</h2>
      <p>{{ t('methodText') }}</p>
      <p>{{ t('scopeText') }} {{ t('freshnessText') }}</p>
      <details>
        <summary>{{ t('coverage') }}</summary>
        <p>{{ t('coverageText') }}</p>
        <template v-if="coverage">
          <p data-testid="rental-coverage-summary">
            <strong>{{
              t('coverageTotal', { n: numberFormat(coverage.properties) }, coverage.properties)
            }}</strong>
          </p>
          <p>{{ t('coverageScope') }}</p>
          <dl class="rentals-coverage-sources">
            <div
              v-for="source in coverage.sources"
              :key="source.key"
              :data-testid="`rental-coverage-source-${source.key}`"
            >
              <dt>{{ sourceLabel(source.key) }}</dt>
              <dd>
                <template v-if="externalSourceKeys.has(source.key)">
                  <VChip size="small" variant="tonal">{{ t('externalOnly') }}</VChip>
                  <small>{{ t('externalOnlyHint') }}</small>
                </template>
                <template v-else>
                  <span>{{
                    t(
                      'coverageProperties',
                      { n: numberFormat(source.properties) },
                      source.properties
                    )
                  }}</span>
                  <small v-if="downSources.some(run => run.key === source.key)">{{
                    t('coverageReadFailed')
                  }}</small>
                </template>
              </dd>
            </div>
          </dl>
          <p>{{ t('coverageCounted', { date: dateLabel(coverage.computedAt) }) }}</p>
        </template>
        <p v-else>{{ t('coverageUnavailable') }}</p>
        <p v-if="usdUyu">{{ t('rate', { rate: usdUyu.toFixed(2) }) }}</p>
        <h3>{{ t('otherPortals') }}</h3>
        <p>{{ t('externalHint') }}</p>
        <div class="rentals-external">
          <a
            v-for="portal in externalPortals"
            :key="portal.name"
            :href="portal.url"
            target="_blank"
            rel="noopener noreferrer"
            >{{ portal.name }} ↗</a
          >
        </div>
      </details>
    </section>
    <nav class="rentals-help" :aria-label="t('help')">
      <h2>{{ t('help') }}</h2>
      <NuxtLink v-for="link in relatedLinks" :key="link.to" :to="localePath(link.to)">
        {{ t(link.label) }}
        <VIcon size="16">mdi-arrow-right</VIcon>
      </NuxtLink>
    </nav>
    <VSnackbar v-model="snackbar" :timeout="4500" role="status">{{ feedback }}</VSnackbar>
    <RentalAlertDialog />
  </VContainer>
</template>

<script setup lang="ts">
import { rentalAvailabilityCopy } from '~/utils/rentalAvailabilityMessages'
import { useDisplay } from 'vuetify'
import SearchFilters from '~/components/rentals/SearchFilters.vue'
import ReferenceAddress from '~/components/rentals/ReferenceAddress.vue'
import SavedPanel from '~/components/rentals/SavedPanel.vue'
import MapPropertyDetail from '~/components/rentals/MapPropertyDetail.vue'
import RentalAlertButton from '~/components/rentals/RentalAlertButton.vue'
import RentalAlertDialog from '~/components/rentals/RentalAlertDialog.vue'
import { rentalMessages } from '~/utils/rentalMessages'
import {
  rentalPhotoRefs,
  rentalPropertyPath,
  rememberRentalSearch,
} from '~/utils/rentalPresentation'
import {
  rentalCatalogAlternateLinks,
  rentalCatalogCanonical,
  rentalCatalogIndexPage,
  rentalCatalogItemList,
  rentalCatalogMetadata,
} from '~/utils/rentalCatalogSeo'
import {
  RENTAL_GUARANTEE_PUBLISHED,
  RENTAL_SOURCE_LABEL,
  RENTAL_SORTS,
  normalizeRentalQuery,
  rentalQueryToParams,
  rentalPriceLabel,
  totalMonthlyUyu,
  type RentalQuery,
  type RentalProperty,
  type RentalPublicProperty,
  type RentalPropertyDetailResponse,
  type RentalMapResponse,
  type RentalFacetValue,
  type RentalsResponse,
} from '~/utils/rentals'
import { MUTUALISTA_SEDES } from '~/utils/mutualistaSedes'
import {
  RENTAL_SAVED_STORAGE_ID,
  RENTAL_SAVED_FAVORITE_LIMIT,
  emptyRentalSaved,
  readRentalSaved,
  writeRentalSaved,
  saveRentalSearch,
  removeRentalSearch,
  toggleRentalFavorite,
  removeRentalFavorite,
} from '~/utils/rentalSaved'
import {
  DEFAULT_RENTAL_LAYOUT,
  RENTAL_LAYOUT_STORAGE_KEY,
  normalizeRentalLayout,
  readRentalLayout,
  writeRentalLayout,
  type RentalLayout,
} from '~/utils/rentalLayout'

const LocationsMap = defineAsyncComponent(() => import('~/components/map/LocationsMap.vue'))
const { t, locale } = useI18n({ useScope: 'local', messages: rentalMessages })
const { t: globalT } = useI18n({ useScope: 'global' })
const availability = useRentalAvailability()
const availabilityCopy = computed(() => rentalAvailabilityCopy(locale.value))
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const { smAndDown } = useDisplay()
const mobileFiltersOpen = ref(false)
const relatedSearchesOpen = ref(false)
const relatedSearches = computed(() => [
  { path: '/analisis-alquileres-uruguay', icon: 'mdi-chart-line', label: t('analysisShort') },
  {
    path: '/barrios-alquileres-uruguay',
    icon: 'mdi-map-search-outline',
    label: globalT('nav.rentalZones'),
  },
  {
    path: '/oportunidades-inmobiliarias-uruguay',
    icon: 'mdi-tag-outline',
    label: t('opportunitiesShort'),
  },
  { path: '/venta-viviendas-uruguay', icon: 'mdi-home-outline', label: t('salesShort') },
  {
    path: '/inmobiliarias-uruguay',
    icon: 'mdi-office-building-outline',
    label: t('agenciesShort'),
  },
  {
    path: '/alquiler-ideal-uruguay',
    icon: 'mdi-home-search-outline',
    label: globalT('nav.rentalFit'),
  },
])
let filterActivator: HTMLElement | null = null
let filterReturnScroll = 0
let filtersApplied = false
function openMobileFilters(event: MouseEvent) {
  filterActivator = event.currentTarget as HTMLElement
  filterReturnScroll = window.scrollY
  filtersApplied = false
  mobileFiltersOpen.value = true
}
async function restoreFilterContext() {
  neighborhoodOverride.value = null
  await nextTick()
  if (filtersApplied) {
    focusSearchResults()
  } else if (filterActivator?.isConnected) {
    filterActivator.focus({ preventScroll: true })
    window.scrollTo({ top: filterReturnScroll, behavior: 'instant' })
  }
}
watch(smAndDown, mobile => {
  if (!mobile) mobileFiltersOpen.value = false
})
const query = computed(() => normalizeRentalQuery(route.query))
const agencyName = useAgencySelection(() => query.value.agency)
const requestParams = computed(() => rentalQueryToParams(query.value))
const requestKey = computed(() => JSON.stringify(requestParams.value))
const view = computed(() => (route.query.view === 'mapa' ? 'mapa' : 'lista'))
// El mosaico o las filas son gusto del visitante, no otra dirección: viven en
// localStorage y no en la URL, así la misma búsqueda sigue siendo una sola
// página indexable. El servidor pinta siempre el mosaico y lo guardado entra al
// montar; por eso no hay desajuste de hidratación.
const layout = ref<RentalLayout>(DEFAULT_RENTAL_LAYOUT)
const viewMode = computed(() => (view.value === 'mapa' ? 'mapa' : layout.value))
const { data, pending, error, refresh } = await useAsyncData<RentalsResponse>(
  'rental-directory',
  () => $fetch('/api/rentals', { query: availability.withRevision(requestParams.value) }),
  { watch: [requestKey] }
)
const items = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const meta = computed(() => data.value?.meta ?? null)
const coverage = computed(() => data.value?.coverage ?? null)
const medianUyu = computed(() => data.value?.medianUyu ?? 0)
const usdUyu = computed(() => meta.value?.usdUyu ?? 0)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / (data.value?.perPage || 24))))
const externalSourceKeys = computed(
  () =>
    new Set(
      (meta.value?.sources ?? [])
        .filter(source => source.access === 'external_only')
        .map(source => source.key)
    )
)
const downSources = computed(() =>
  (meta.value?.sources ?? []).filter(source => !source.ok && source.access !== 'external_only')
)
const activeSourceLabels = computed(() =>
  (coverage.value?.sources ?? [])
    .filter(source => source.properties > 0 && !externalSourceKeys.value.has(source.key))
    .map(source => sourceLabel(source.key))
    .join(' · ')
)
const sortItems = computed(() =>
  RENTAL_SORTS.map(option => ({ title: t(option.value), value: option.value }))
)
const failedImages = reactive(new Set<string>())

// Confirmed URL filters alone fetch results. Back/Forward restores the complete draft form.
function navigate(params: Record<string, string>) {
  return router.push({ query: { ...params, ...(view.value === 'mapa' ? { view: 'mapa' } : {}) } })
}
function focusSearchResults() {
  const results = document.getElementById('rental-results')
  results?.focus({ preventScroll: true })
  results?.scrollIntoView({ block: 'start', behavior: 'instant' })
}
async function search(next: RentalQuery) {
  const closingMobileFilters = mobileFiltersOpen.value
  if (closingMobileFilters) {
    filtersApplied = true
    mobileFiltersOpen.value = false
  }
  await navigate(rentalQueryToParams({ ...next, page: 1 }))
  // The dialog restores focus after its closing animation; the sidebar stays on screen.
  if (!closingMobileFilters) {
    await nextTick()
    focusSearchResults()
  }
}
async function clearFilters() {
  await navigate({})
  await nextTick()
  focusSearchResults()
}
function removeFilter(keys: string[]) {
  const type = keys.find(key => key.startsWith('type:'))?.slice(5)
  if (type) {
    void navigate(
      rentalQueryToParams({
        ...query.value,
        types: query.value.types.filter(value => value !== type),
        type: '',
        page: 1,
      })
    )
    return
  }
  const params = Object.fromEntries(
    Object.entries(requestParams.value).filter(([key]) => ![...keys, 'page'].includes(key))
  )
  void navigate(params)
}
function changeSort(sort: RentalQuery['sort']) {
  if (sort === 'distancia' && !referencePoint.value) {
    void startPointSelection()
    return
  }
  search({ ...query.value, sort })
}
function changeView(next: string) {
  void router.push({
    query: { ...requestParams.value, ...(next === 'mapa' ? { view: 'mapa' } : {}) },
  })
}
function changeViewMode(next: string) {
  if (next === 'mapa') {
    changeView('mapa')
    return
  }
  layout.value = normalizeRentalLayout(next)
  writeRentalLayout(layout.value)
  if (view.value === 'mapa') changeView('lista')
}
async function onPageChange(page: number) {
  await navigate(rentalQueryToParams({ ...query.value, page }))
  document.getElementById('rental-results')?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  })
}
function paginationLinkProps(props: Record<string, unknown>, page: number | null) {
  const enabled = page !== null && page >= 1 && page <= pageCount.value && !props.disabled
  return {
    ...props,
    variant: 'text' as const,
    href: enabled
      ? router.resolve({ query: rentalQueryToParams({ ...query.value, page }) }).href
      : undefined,
    // Keep native link behavior for new tabs and crawlers; ordinary clicks retain scroll context.
    onClick: (event: MouseEvent) => {
      if (
        !enabled ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      event.preventDefault()
      void onPageChange(page)
    },
  }
}
const neighborhoodOverride = ref<RentalFacetValue[] | null>(null)
const neighborhoodFacets = computed(
  () => neighborhoodOverride.value ?? data.value?.facets.neighborhoods ?? []
)
let neighborhoodRequest = 0
watch(requestKey, () => {
  neighborhoodRequest++
  neighborhoodOverride.value = null
})
async function loadNeighborhoods(department: string) {
  const request = ++neighborhoodRequest
  if (department === query.value.department) {
    neighborhoodOverride.value = null
    return
  }
  neighborhoodOverride.value = []
  try {
    const result = await $fetch<RentalsResponse>('/api/rentals', {
      query: { department, perPage: 6 },
    })
    if (request === neighborhoodRequest) neighborhoodOverride.value = result.facets.neighborhoods
  } catch {
    if (request === neighborhoodRequest) notify(t('error'))
  }
}
const filterChips = computed(() => {
  const q = query.value
  const chips: Array<{ key: string; keys: string[]; label: string }> = []
  const add = (key: string, label: string, keys = [key]) => chips.push({ key, keys, label })
  if (q.department) add('department', q.department, ['department', 'neighborhood', 'neighborhoods'])
  if (q.neighborhoods.length)
    add('neighborhoods', q.neighborhoods.join(', '), ['neighborhood', 'neighborhoods'])
  for (const type of q.types) add(`type:${type}`, typeLabel(type))
  if (q.q) add('q', q.q)
  if (q.agency) add('agency', agencyName.value || t('selectedAgency'))
  if (q.bedrooms !== null)
    add(
      'bedrooms',
      q.bedrooms === 0
        ? t('studio')
        : `${q.bedrooms}${q.bedroomsExact ? '' : '+'} ${t('bedrooms')}`,
      ['bedrooms', 'bedroomsExact']
    )
  for (const [key, value] of Object.entries({
    bathrooms: q.bathrooms,
    areaMin: q.areaMin,
    areaMax: q.areaMax,
    priceMin: q.priceMin,
    priceMax: q.priceMax,
    monthlyMax: q.monthlyMax,
    expensesMax: q.expensesMax,
  })) {
    if (value !== null) add(key, `${t(key)}: ${numberFormat(value)}`)
  }
  for (const [key, active, label] of [
    ['pets', q.pets, 'pets'],
    ['parking', q.parking, 'parking'],
    ['furnished', q.furnished, 'furnished'],
    ['dueno', q.owner, 'owner'],
    ['gc', q.withExpenses, 'expensesKnown'],
    ['multi', q.multi, 'multi'],
  ] as const) {
    if (active) add(key, t(label))
  }
  if (q.currency) add('currency', q.currency)
  if (q.availability !== 'all')
    add(
      'availability',
      availabilityCopy.value[q.availability === 'hide_multiple' ? 'chipMultiple' : 'chipAny']
    )
  if (q.source) add('source', sourceLabel(q.source))
  if (q.guarantees.length) add('garantia', q.guarantees.map(g => t(g)).join(', '))
  if (q.sedes.length) add('sedes', `${t('nearby')} · ${q.radioKm} km`, ['sedes', 'radio'])
  return chips
})

// The map never requests thousands of points while the user is browsing the list.
const mapParams = computed(() => {
  const params = { ...requestParams.value }
  delete params.page
  delete params.perPage
  return params
})
const mapKey = computed(() => JSON.stringify(mapParams.value))
const {
  data: mapData,
  pending: mapPending,
  error: mapError,
  execute: loadMap,
} = await useAsyncData<RentalMapResponse>(
  'rental-directory-map',
  () => $fetch('/api/rentals/mapa', { query: availability.withRevision(mapParams.value) }),
  { server: false, immediate: false }
)
watch([view, mapKey], () => {
  void closeMapProperty(false)
  if (view.value === 'mapa') void loadMap()
})
const sedeCentro = computed(() => {
  if (query.value.sedes.length !== 1) return null
  const sede = MUTUALISTA_SEDES.find(s => s.osmId === query.value.sedes[0])
  return sede ? { lat: sede.lat, lng: sede.lng } : null
})
const mapMarkers = computed(() =>
  (mapData.value?.points ?? []).map(point => ({
    origin: 'alquiler',
    id: point.key,
    name: point.neighborhood || t('rent'),
    dept: point.neighborhood || '',
    locality: '',
    address: point.neighborhood || '',
    phone: '',
    hours: '',
    lat: point.lat,
    lng: point.lng,
    mapUrl: point.url,
    source: 'alquileres',
  }))
)
const rentalMap = ref<{
  getCenter: () => { lat: number; lng: number } | null
  focusPoint: (point: { lat: number; lng: number }) => void
  focusMarker: (id: string) => boolean
  revealMarker: (
    id: string,
    padding: { top: number; right: number; bottom: number; left: number }
  ) => void
} | null>(null)
const referencePoint = computed(() =>
  query.value.refLat !== null && query.value.refLng !== null
    ? { lat: query.value.refLat, lng: query.value.refLng }
    : null
)
const pickingPoint = ref(false)
const draftPoint = ref<{ lat: number; lng: number } | null>(null)
const draftPointLabel = ref('')
const pointError = ref(false)
const mapReady = ref(false)
function onReferenceMapReady() {
  mapReady.value = true
  // Address suggestions can arrive before the lazy map has finished initializing.
  if (pickingPoint.value && draftPoint.value) rentalMap.value?.focusPoint(draftPoint.value)
}
watch(rentalMap, () => {
  mapReady.value = false
})
watch(view, () => {
  pickingPoint.value = false
})
async function startPointSelection() {
  await closeMapProperty(false)
  await router.push({ query: { ...requestParams.value, view: 'mapa' } })
  draftPoint.value = referencePoint.value
  draftPointLabel.value = query.value.refLabel
  pointError.value = false
  pickingPoint.value = true
  await nextTick()
  document
    .querySelector('.rentals-map__point-controls')
    ?.scrollIntoView({ block: 'start', behavior: 'instant' })
}
function selectReferencePoint(point: { lat: number; lng: number }) {
  if (!pickingPoint.value) return
  const next = normalizeRentalQuery({ refLat: point.lat, refLng: point.lng })
  pointError.value = next.refLat === null || next.refLng === null
  draftPoint.value = pointError.value ? null : { lat: next.refLat!, lng: next.refLng! }
  draftPointLabel.value = ''
}
function selectReferenceAddress(point: { lat: number; lng: number; label: string }) {
  selectReferencePoint(point)
  if (!draftPoint.value) return
  draftPointLabel.value = point.label
  rentalMap.value?.focusPoint(draftPoint.value)
}
function clearDraftReference() {
  draftPoint.value = null
  draftPointLabel.value = ''
  pointError.value = false
}
function useMapCenter() {
  const point = rentalMap.value?.getCenter()
  if (point) selectReferencePoint(point)
}
function cancelPointSelection() {
  pickingPoint.value = false
  draftPoint.value = null
  draftPointLabel.value = ''
  pointError.value = false
}
async function applyReference() {
  if (!draftPoint.value) return
  const next = {
    ...query.value,
    refLat: draftPoint.value.lat,
    refLng: draftPoint.value.lng,
    refLabel: draftPointLabel.value,
    sort: 'distancia' as const,
    page: 1,
  }
  cancelPointSelection()
  await router.push({ query: rentalQueryToParams(next) })
  await nextTick()
  focusSearchResults()
}
function removeReference() {
  cancelPointSelection()
  void search({
    ...query.value,
    refLat: null,
    refLng: null,
    refLabel: '',
    sort: query.value.sort === 'distancia' ? 'recientes' : query.value.sort,
    page: 1,
  })
}
function distanceLabel(distance: number | null | undefined) {
  if (typeof distance !== 'number' || !Number.isFinite(distance)) return t('distanceUnknown')
  const km = new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(distance)
  return distance < 0.1 ? t('distanceVeryNear') : t('distanceFromPoint', { km })
}
const mapFrame = ref<HTMLElement | null>(null)
const selectedMapKey = ref<string | null>(null)
const selectedMapPoint = computed(
  () => mapData.value?.points.find(point => point.key === selectedMapKey.value) ?? null
)
const mapDetail = shallowRef<RentalPropertyDetailResponse | null>(null)
const mapDetailPending = ref(false)
const mapDetailError = ref<'unavailable' | 'failed' | null>(null)
let mapDetailRequest: AbortController | null = null
// One full property is fetched on selection; the other map points remain lightweight.
async function selectMapProperty(marker: { id: string }) {
  if (pickingPoint.value) {
    const point = mapData.value?.points.find(point => point.key === marker.id)
    if (point) selectReferencePoint({ lat: point.lat, lng: point.lng })
    return
  }
  if (mapPending.value || !mapData.value?.points.some(point => point.key === marker.id)) return
  if (selectedMapKey.value === marker.id && (mapDetailPending.value || mapDetail.value)) return
  // Keep map context visible above the mobile sheet, and desktop actions inside the viewport.
  mapFrame.value?.scrollIntoView({
    block: smAndDown.value ? 'start' : 'nearest',
    behavior: 'instant',
  })
  mapDetailRequest?.abort()
  const request = new AbortController()
  mapDetailRequest = request
  selectedMapKey.value = marker.id
  mapDetail.value = null
  mapDetailError.value = null
  mapDetailPending.value = true
  try {
    const detail = await $fetch<RentalPropertyDetailResponse>(
      `/api/rentals/propiedad/${encodeURIComponent(marker.id)}`,
      { query: availability.withRevision(mapParams.value), signal: request.signal, retry: 0 }
    )
    if (mapDetailRequest === request) mapDetail.value = detail
  } catch (error) {
    if (mapDetailRequest === request && !request.signal.aborted) {
      mapDetailError.value =
        (error as { statusCode?: number }).statusCode === 404 ? 'unavailable' : 'failed'
    }
  } finally {
    if (mapDetailRequest === request) {
      mapDetailPending.value = false
      await nextTick()
      if (mapDetailRequest === request) revealSelectedMapProperty()
    }
  }
}
function revealSelectedMapProperty() {
  const frame = mapFrame.value?.getBoundingClientRect()
  const panel = mapFrame.value?.querySelector('.rental-map-detail')?.getBoundingClientRect()
  if (!frame || !panel || !selectedMapKey.value) return
  // Reserve room for the whole 44px target, not only the centre of its dot.
  if (smAndDown.value) {
    if (panel.top - frame.top < 80) return
    rentalMap.value?.revealMarker(selectedMapKey.value, {
      top: 28,
      right: 28,
      bottom: Math.max(28, frame.bottom - panel.top + 28),
      left: 66,
    })
  } else {
    rentalMap.value?.revealMarker(selectedMapKey.value, {
      top: 28,
      right: Math.max(28, frame.right - panel.left + 28),
      bottom: 28,
      left: 66,
    })
  }
}
async function closeMapProperty(restoreFocus = true) {
  const key = selectedMapKey.value
  mapDetailRequest?.abort()
  mapDetailRequest = null
  selectedMapKey.value = null
  mapDetail.value = null
  mapDetailError.value = null
  mapDetailPending.value = false
  if (restoreFocus && key) {
    await nextTick()
    if (!rentalMap.value?.focusMarker(key)) mapFrame.value?.focus({ preventScroll: true })
  }
}
let mapVisibility: IntersectionObserver | null = null
watch(mapFrame, frame => {
  mapVisibility?.disconnect()
  if (!frame) return
  mapVisibility = new IntersectionObserver(([entry]) => {
    // A mobile sheet should not follow the user into coverage, saved items or the footer.
    if (!entry?.isIntersecting) void closeMapProperty(false)
  })
  mapVisibility.observe(frame)
})
watch(mapError, error => {
  if (error) void closeMapProperty(false)
})
const numberFormat = (value: number) =>
  new Intl.NumberFormat(
    locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY',
    { maximumFractionDigits: 0 }
  ).format(value)
const dateLabel = (value: string) => {
  const date = new Date(value)
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  return Number.isFinite(date.getTime())
    ? date.toLocaleString(
        locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY',
        {
          day: '2-digit',
          month: '2-digit',
          ...(dateOnly ? {} : { hour: '2-digit' as const, minute: '2-digit' as const }),
          timeZone: dateOnly ? 'UTC' : 'America/Montevideo',
        }
      )
    : t('unknown')
}
const sourceLabel = (source: string) =>
  RENTAL_SOURCE_LABEL[source as keyof typeof RENTAL_SOURCE_LABEL] ?? source
const typeLabel = (type: string) =>
  t(
    (
      {
        vivienda: 'homes',
        garaje: 'garage',
        apartamento: 'apartment',
        casa: 'house',
        habitacion: 'room',
        local: 'commercial',
        oficina: 'office',
        terreno: 'land',
        otro: 'other',
      } as Record<string, string>
    )[type] || 'other'
  )
const displayOffer = (property: RentalProperty) => property.matchingOffer ?? property.offers[0]
/** Sólo se previsualiza lo que la tarjeta ya pudo mostrar: sin portada no hay galería que abrir. */
const hasPhoto = (property: RentalProperty) =>
  Boolean(displayOffer(property)?.image) && !failedImages.has(property.key)
// Ver las fotos no debería costar una navegación: la búsqueda, el scroll y los filtros siguen ahí
// cuando se cierra el visor. La ficha completa sigue a un clic desde el título y desde el pie.
const previewProperty = shallowRef<RentalProperty | null>(null)
const previewOpen = ref(false)
const previewParams = computed(() => availability.withRevision(mapParams.value))
const previewPhotos = computed(() =>
  previewProperty.value ? rentalPhotoRefs(previewProperty.value) : []
)
const previewSource = computed(() =>
  previewProperty.value
    ? {
        kind: 'rental' as const,
        key: previewProperty.value.key,
        params: previewParams.value,
      }
    : null
)
function openPhotoPreview(property: RentalProperty) {
  previewProperty.value = property
  previewOpen.value = true
}
const offerPrice = (offer: { price: number; currency: string }) =>
  `${offer.currency === 'USD' ? 'U$S' : '$'} ${numberFormat(offer.price)}`
const priceLabel = (property: RentalProperty) => {
  const offer = displayOffer(property)
  return offer
    ? offerPrice(offer)
    : rentalPriceLabel(property.price, property.currency, usdUyu.value)
}
const specsLabel = (property: RentalProperty) =>
  [
    typeLabel(property.propertyType),
    property.bedrooms !== null
      ? property.bedrooms === 0
        ? t('studio')
        : `${property.bedrooms} ${t('bedrooms').toLowerCase()}`
      : '',
    property.bathrooms !== null ? `${property.bathrooms} ${t('bathrooms').toLowerCase()}` : '',
    property.area ? `${property.area} m²` : '',
  ]
    .filter(Boolean)
    .join(' · ')
const monthlyTotal = (property: RentalProperty) => {
  const offer = displayOffer(property)
  return offer ? totalMonthlyUyu(offer, usdUyu.value) : null
}
const expensesLabel = (property: RentalProperty) => {
  const offer = displayOffer(property)
  if (offer?.commonExpenses === 0) return t('noExpenses')
  if (!offer || offer.commonExpenses === null || !offer.commonExpensesCurrency)
    return t('expensesUnknown')
  return `${t('expenses')}: ${offerPrice({ price: offer.commonExpenses, currency: offer.commonExpensesCurrency })}`
}
const publishedGuarantees = (property: RentalProperty) =>
  (displayOffer(property)?.guarantees ?? []).filter(g => RENTAL_GUARANTEE_PUBLISHED.includes(g))
const sellerLabel = (property: RentalProperty) => {
  const offer = displayOffer(property)
  const type = t(
    offer?.ownerDirect?.declared
      ? 'owner'
      : offer?.sellerType === 'particular'
        ? 'individual'
        : offer?.sellerType === 'inmobiliaria'
          ? 'agency'
          : 'unknown'
  )
  return offer?.sellerName && !/^(?:particular|mercado libre)$/i.test(offer.sellerName)
    ? `${type} · ${offer.sellerName}`
    : type
}

const saved = ref(emptyRentalSaved())
const showSaved = ref(false)
const snackbar = ref(false)
const feedback = ref('')
function notify(message: string) {
  feedback.value = message
  snackbar.value = true
}
function persist() {
  if (!writeRentalSaved(saved.value)) notify(t('storageError'))
}
function saveSearch() {
  const label = filterChips.value.map(chip => chip.label).join(' · ') || t('country')
  const next = saveRentalSearch(saved.value, label, query.value)
  if (
    saved.value.searches.some(
      search => !next.searches.some(candidate => candidate.id === search.id)
    )
  ) {
    notify(t('searchLimit'))
    showSaved.value = true
    return
  }
  saved.value = next
  persist()
  showSaved.value = true
}
function removeSearch(id: string) {
  saved.value = removeRentalSearch(saved.value, id)
  persist()
}
function removeFavorite(key: string) {
  saved.value = removeRentalFavorite(saved.value, key)
  persist()
}
function toggleFavorite(property: RentalPublicProperty, rate = usdUyu.value) {
  if (!isFavorite(property.key) && saved.value.favorites.length >= RENTAL_SAVED_FAVORITE_LIMIT) {
    notify(t('favoriteLimit'))
    showSaved.value = true
    return
  }
  saved.value = toggleRentalFavorite(saved.value, property, rate)
  persist()
}
const isFavorite = (key: string) => saved.value.favorites.some(item => item.key === key)
function openSavedSearch(params: Record<string, string>) {
  void navigate(rentalQueryToParams(normalizeRentalQuery(params)))
}
async function shareSearch() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    notify(t('copied'))
  } catch {
    notify(t('copyError'))
  }
}
const onStorage = (event: StorageEvent) => {
  if (event.key === RENTAL_SAVED_STORAGE_ID || event.key === null) saved.value = readRentalSaved()
  if (event.key === RENTAL_LAYOUT_STORAGE_KEY || event.key === null)
    layout.value = readRentalLayout()
}
availability.watchChanges(async () => {
  await refresh()
  if (view.value === 'mapa') {
    const selected = selectedMapKey.value
    await loadMap()
    if (selected && mapData.value?.points.some(point => point.key === selected)) {
      mapDetail.value = null
      await selectMapProperty({ id: selected })
    } else if (selected) {
      await closeMapProperty(false)
      focusSearchResults()
    }
  } else if (query.value.availability !== 'all') focusSearchResults()
})
onMounted(() => {
  saved.value = readRentalSaved()
  layout.value = readRentalLayout()
  window.addEventListener('storage', onStorage)
  if (view.value === 'mapa') void loadMap()
})
onBeforeUnmount(() => {
  window.removeEventListener('storage', onStorage)
  mapDetailRequest?.abort()
  mapVisibility?.disconnect()
})
const breadcrumbs = computed(() => [
  { title: t('country'), to: localePath('/') },
  { title: t('search'), disabled: true },
])
const externalPortals = [
  { name: 'Gallito', url: 'https://www.gallito.com.uy/inmuebles/alquiler' },
  { name: 'BuscandoCasa', url: 'https://www.buscandocasa.com/' },
  { name: 'Casasweb', url: 'https://casasweb.com/' },
  { name: 'Inmuebles El País', url: 'https://inmuebles.elpais.com.uy/' },
]
const relatedLinks = [
  { to: '/alquilar-en-uruguay', label: 'guide' },
  { to: '/alquilar-sin-recibo-de-sueldo', label: 'independent' },
  { to: '/alquilar-estando-en-clearing', label: 'clearing' },
]
const catalogBaseUrl = computed(
  () => `https://cambio-uruguay.com${localePath('/alquileres-uruguay')}`
)
const indexPage = computed(() => rentalCatalogIndexPage(route.query, pageCount.value))
const canonicalUrl = computed(() => rentalCatalogCanonical(catalogBaseUrl.value, indexPage.value))
const seoMetadata = computed(() => rentalCatalogMetadata(locale.value, indexPage.value ?? 1))
const catalogIndexable = computed(
  () => indexPage.value !== null && !error.value && items.value.length > 0
)
const catalogList = computed(() =>
  catalogIndexable.value && !pending.value && view.value === 'lista'
    ? rentalCatalogItemList(
        items.value.map(property => ({
          name: property.title,
          url: `https://cambio-uruguay.com${localePath(rentalPropertyPath(property.key))}`,
          image: failedImages.has(property.key) ? null : displayOffer(property)?.image,
        })),
        canonicalUrl.value,
        query.value.page,
        data.value?.perPage || query.value.perPage
      )
    : undefined
)
const catalogLocaleHead = useLocaleHead({ key: 'id' })
defineOgImageComponent('Cambio', {
  title: () => t('title'),
  subtitle: () => t('subtitle'),
  tag: 'ALQUILERES',
})
useSeoMeta({
  title: () => seoMetadata.value.title,
  description: () => seoMetadata.value.description,
  ogTitle: () => seoMetadata.value.title,
  ogDescription: () => seoMetadata.value.description,
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})
useHead(() => ({
  // The schema module otherwise derives its node IDs from route.path, dropping ?page=N.
  templateParams: {
    schemaOrg: { path: canonicalUrl.value.replace('https://cambio-uruguay.com', '') },
  },
  link: [
    { id: 'i18n-can', rel: 'canonical', href: canonicalUrl.value },
    ...rentalCatalogAlternateLinks(catalogLocaleHead.value.link ?? [], indexPage.value),
  ],
  meta: [
    { id: 'i18n-og-url', property: 'og:url', content: canonicalUrl.value },
    {
      name: 'robots',
      content: catalogIndexable.value
        ? 'index, follow, max-image-preview:large'
        : 'noindex, follow',
    },
  ],
}))
// Extend the module's existing WebPage node instead of publishing a second competing graph.
useSchemaOrg([
  defineWebPage({
    '@type': () => (indexPage.value !== null ? 'CollectionPage' : 'SearchResultsPage'),
    name: () => seoMetadata.value.title,
    description: () => seoMetadata.value.description,
    url: () => canonicalUrl.value,
    inLanguage: () => seoMetadata.value.language,
    mainEntity: () => catalogList.value,
  }),
  defineBreadcrumb({
    itemListElement: () => [
      { name: t('country'), item: `https://cambio-uruguay.com${localePath('/')}` },
      { name: t('search'), item: canonicalUrl.value },
    ],
  }),
])
</script>

<style scoped>
.rentals-related {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.rentals-related .rentals-related-action {
  display: flex;
  justify-content: flex-start;
  min-width: 0;
  min-height: 44px;
  height: auto;
  padding: 8px 12px;
  font-size: 0.875rem;
  line-height: 1.4;
  letter-spacing: 0;
  text-align: left;
  white-space: normal;
}
.rentals-related-action :deep(.v-btn__content) {
  min-width: 0;
  justify-content: flex-start;
  gap: 8px;
  white-space: normal;
}
.rentals-related-action .v-icon {
  flex-shrink: 0;
}
.rentals-related-action span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.rentals-related-action:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.rental-card__overview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.rental-card__cost-label {
  font-size: 0.8rem;
}
.rentals-empty__actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}
.rentals-empty__actions :deep(.v-btn) {
  height: auto;
  min-height: 44px;
  max-width: 100%;
  padding-block: 10px;
}
.rentals-empty__actions :deep(.v-btn__content) {
  white-space: normal;
}

.rentals {
  /* El directorio es sidebar + grilla: con 1280 fijos un monitor de 2560
     mostraba 2 tarjetas y media pantalla vacía. Medido a 2560: 2200 da 5
     columnas de 348px (legibles) y sigue centrando; el tope va acá porque el
     layout ya liberó el cap global para esta ruta. */
  max-width: 2200px;
  padding-bottom: 48px;
}
.rentals--mobile {
  padding-bottom: 32px;
}
.rentals-content,
.rentals-sidebar {
  min-width: 0;
}
.rentals-sidebar {
  display: none;
}
.rentals-mobile-bar {
  position: sticky;
  top: 64px;
  z-index: 8;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 0;
  background: rgb(var(--v-theme-background));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rentals-mobile-bar :deep(.v-btn) {
  min-width: 44px;
  min-height: 44px;
  height: 44px;
  padding-inline: 10px;
}
.rentals-mobile-bar > .v-btn:first-child {
  margin-right: auto;
  /* Vuetify's default inline padding, not the bar's 10px: the prepend icon sits
     in a negative margin (height / -9) and at 10px it was 6px from the edge. */
  padding-inline: 16px;
  font-size: 0.8rem;
  letter-spacing: 0;
}
.rentals-mobile-bar :deep(.rental-alert-trigger) {
  width: 44px;
  flex: 0 0 44px;
}
.rentals-head {
  min-width: 0;
  margin: 12px 0 24px;
}
.rentals-head h1 {
  margin: 0 0 8px;
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
}
.rentals-lead {
  margin: 0;
  max-width: 75ch;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.rentals-provenance {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-top: 12px;
  align-items: center;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.rentals-provenance a,
.rentals-external a,
.rentals-help a {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.rentals-chips,
.rentals-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}
.rentals-tools {
  margin: 8px 0 12px;
}
@media (max-width: 959px) {
  .rentals-chips {
    margin-top: 8px;
    gap: 4px;
  }
  .rentals-chips :deep(.v-chip) {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
    height: auto;
    min-height: 44px;
    padding-inline: 8px 0;
    font-size: 0.8125rem;
    font-weight: 500;
  }
  .rentals-chips :deep(.v-chip__content) {
    min-width: 0;
    padding-block: 4px;
    white-space: normal;
    overflow-wrap: anywhere;
    line-height: 1.35;
  }
  .rentals-chips :deep(.v-chip__close) {
    flex: 0 0 44px;
    justify-content: center;
    width: 44px;
    min-width: 44px;
    height: 44px;
    min-height: 44px;
    margin-inline: 0;
  }
  .rentals-chips > .v-btn {
    flex: none;
    min-height: 44px;
  }
}
.rentals--mobile .rentals-toolbar {
  margin: 8px 0 12px;
  gap: 10px;
}
.rentals--mobile .rentals-summary h2 {
  font-size: 1.05rem;
}
.rentals--mobile .rentals-results {
  scroll-margin-top: 126px;
}
.rentals-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin: 20px 0;
}
.rentals-summary {
  margin-right: auto;
}
.rentals-summary h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}
.rentals-summary p {
  margin: 4px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.76);
  font-size: 0.8rem;
}
.rentals-sort {
  flex: 0 1 210px;
  min-width: 175px;
}
.rentals-results {
  scroll-margin-top: 90px;
}
.rentals-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.rental-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  display: flex;
  flex-direction: column;
  /* La ficha se lee en columna, como en Mercado Libre e InfoCasas: todo arranca
     en el mismo borde izquierdo. Va declarado y no heredado porque centrado se
     reportó dos veces desde builds viejos en el navegador, y un contenedor que
     centre texto —un estado vacío, un ancestro nuevo— lo volvería a romper sin
     que ninguna prueba lo note. Las excepciones (el cartel de "sin foto" y la
     chapa de portales) fijan su propio centrado más abajo. */
  text-align: start;
}
.rental-card__visual {
  position: relative;
}
.rental-card__media {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  aspect-ratio: 3 / 2;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
button.rental-card__media {
  cursor: zoom-in;
}
.rental-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* La foto ahora hace algo distinto que el resto de la tarjeta: sin este cartel, abrir un visor en
   vez de navegar sorprende. Aparece al pasar el mouse y queda fijo donde no hay hover (táctil). */
.rental-card__zoom {
  position: absolute;
  top: 10px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.76rem;
  font-weight: 700;
  opacity: 0;
  transition: opacity 160ms ease;
}
.rental-card__media:hover .rental-card__zoom,
.rental-card__media:focus-visible .rental-card__zoom {
  opacity: 1;
}
@media (hover: none) {
  .rental-card__zoom {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .rental-card__zoom {
    transition: none;
  }
}
.rental-card__noimage {
  display: flex;
  gap: 8px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.8rem;
}
.rental-card__badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.78rem;
  font-weight: 700;
}
.rental-card__save {
  position: absolute;
  top: 10px;
  right: 10px;
}
.rental-card__body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 8px;
  min-width: 0;
}
/* Zonas de la tarjeta: __main es la ficha y __rail las acciones (portales y
   detalle). Abajo de 1264 no son cajas — se disuelven para que sus hijos sigan
   siendo hijos directos de la columna, que es el layout vertical de siempre. */
.rental-card__main,
.rental-card__rail,
.rental-card__footnote {
  display: contents;
}
.rental-card__body p {
  margin: 0;
}
.rental-card__where {
  color: rgb(var(--v-theme-link));
  font-size: 0.8rem;
  font-weight: 600;
}
.rental-card h3 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.rental-card h3 a {
  color: inherit;
  text-decoration: none;
}
.rental-card h3 a:hover {
  text-decoration: underline;
}
.rental-card__specs,
.rental-card__address {
  font-size: 0.8rem;
}
.rental-card__address,
.rental-card__meta,
.rental-card__expenses {
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.rental-card__cost {
  margin: 8px 0;
  padding: 12px 0;
  border-block: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-card__price {
  font-size: 1.35rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.rental-card__price span {
  font-size: 0.75rem;
  font-weight: 400;
  margin-left: 4px;
}
.rental-card__expenses {
  font-size: 0.8rem;
  margin-top: 4px !important;
}
.rental-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.rental-card__offers {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: auto 0 4px;
  padding-top: 16px;
}
.rental-card__offer {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  text-decoration: none;
  color: inherit;
  background: rgba(var(--v-theme-on-surface), 0.05);
}
.rental-card__offer strong {
  margin-left: auto;
  white-space: nowrap;
}
.rental-card__offer--selected,
.rental-card__offer:hover {
  background: rgba(var(--v-theme-primary), 0.12);
}
.rental-card__meta {
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}
.rental-card__detail {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  margin-top: 8px;
  color: rgb(var(--v-theme-link));
  font-weight: 700;
  text-decoration: none;
}
.rental-card__detail:hover {
  text-decoration: underline;
}
.rentals-map {
  border-radius: 12px;
}
.rentals-reference {
  margin: 0 0 16px;
}
.rentals-reference p,
.rentals-map__point-controls p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}
.rentals-reference__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-top: 8px;
}
.rentals-reference__actions .v-btn,
.rentals-map__point-controls > .v-btn {
  min-height: 44px;
  text-transform: none;
  letter-spacing: normal;
}
.rentals-map__point-controls {
  padding: 8px 0 12px;
  scroll-margin-top: 132px;
  background: rgb(var(--v-theme-background));
}
.rentals-map__point-controls--picking {
  position: sticky;
  top: 120px;
  z-index: 3;
}
.rentals-map .rentals-map__frame--picking {
  height: clamp(240px, 45dvh, 440px);
}
.rentals-map__frame--picking :deep(.leaflet-container) {
  cursor: crosshair;
}
.rentals-map__crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1;
  color: #1565c0;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  font-size: 28px;
  line-height: 1;
}
.rental-card__distance {
  margin: 0;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
}
.rentals-map__coverage {
  margin: 0 0 16px;
  font-size: 0.875rem;
}
.rentals-map__frame {
  position: relative;
  height: max(400px, 68vh);
  height: max(400px, 68dvh);
  scroll-margin-top: 100px;
  scroll-margin-bottom: 16px;
}
@media (min-width: 960px) {
  .rentals-map__frame {
    height: min(max(400px, 68dvh), calc(100dvh - 128px));
  }
}
.rentals-empty {
  padding: 40px 20px;
  text-align: center;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}
.rentals-empty h3 {
  margin: 16px 0 8px;
}
.rentals-empty p {
  margin: 0 auto 20px;
  max-width: 65ch;
}
.rentals-notes {
  margin-top: 56px;
  max-width: 78ch;
}
.rentals-notes h2,
.rentals-help h2 {
  margin: 0 0 16px;
  font-size: 1.25rem;
}
.rentals-notes p {
  margin: 12px 0;
  color: rgba(var(--v-theme-on-surface), 0.8);
  line-height: 1.65;
}
.rentals-notes details {
  margin-top: 24px;
}
.rentals-notes summary {
  cursor: pointer;
  font-weight: 700;
  min-height: 44px;
  display: list-item;
}
.rentals-notes h3 {
  margin: 24px 0 8px;
  font-size: 1rem;
}
.rentals-coverage-sources {
  margin: 20px 0;
}
.rentals-coverage-sources > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px 20px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rentals-coverage-sources dt {
  font-weight: 600;
}
.rentals-coverage-sources dd {
  margin: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.rentals-coverage-sources small {
  display: block;
  margin-top: 4px;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
@media (max-width: 599px) {
  .rentals-coverage-sources > div {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
  .rentals-coverage-sources dd {
    text-align: left;
  }
}
.rentals-external {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.rentals-help {
  margin-top: 40px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
}
.rentals-help h2 {
  width: 100%;
  margin-bottom: 0;
}
.rentals :deep(a:focus-visible),
.rentals summary:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
}
@media (min-width: 960px) {
  .rentals-workspace {
    display: grid;
    grid-template-columns: 304px minmax(0, 1fr);
    grid-template-areas:
      'filters heading'
      'filters results';
    column-gap: 24px;
    align-items: start;
  }
  .rentals-head {
    grid-area: heading;
    margin: 0 0 12px;
  }
  .rentals-sidebar {
    display: block;
    grid-area: filters;
    position: sticky;
    top: 90px;
  }
  .rentals-content {
    grid-area: results;
  }
}
/* Más columnas a medida que hay ancho, con saltos medidos y no auto-fill: la
   grilla vive al lado de un sidebar de 304px, así que el ancho de columna no
   se deduce del viewport. Cada salto entra cuando la tarjeta queda >= 320px
   (a 2560 son 5 de 349px; a 1920, 4 de 362px; a 1440, 3 de 325px). */
@media (min-width: 1400px) {
  .rentals-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 1750px) {
  .rentals-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (min-width: 2100px) {
  .rentals-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
@media (max-width: 959px) {
  .rentals-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .rentals-summary {
    flex-basis: 100%;
  }
}
@media (max-width: 599px) {
  .rentals-head h1 {
    font-size: clamp(1.35rem, 6.4vw, 1.55rem);
  }
  .rentals-grid {
    grid-template-columns: 1fr;
  }
  .rentals-sort {
    flex: 1;
    min-width: 150px;
  }
  .rentals-toolbar {
    gap: 12px;
  }
  .rentals-tools {
    gap: 0;
  }
}

.rentals-related-toggle {
  display: none;
}
.rentals-related-toggle:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
@media (max-width: 959px) {
  .rentals-head {
    margin: 8px 0 24px;
  }
  .rentals-related-disclosure {
    margin-top: 16px;
  }
  .rentals-related-toggle {
    display: inline-flex;
    justify-content: space-between;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    min-height: 48px;
    height: auto;
    padding: 12px 16px;
    border-color: rgba(var(--v-border-color), var(--v-border-opacity));
    font-size: 0.875rem;
    line-height: 1.5;
    letter-spacing: 0;
    text-align: left;
  }
  .rentals-related-toggle :deep(.v-btn__content) {
    flex: 1;
    justify-content: flex-start;
    white-space: normal;
  }
  /* CSS closes the mobile links in the first HTML, before viewport hydration. */
  .rentals-related-disclosure:not(.rentals-related-disclosure--expanded) .rentals-related {
    display: none;
  }
  .rentals-breadcrumbs {
    display: none;
  }
  .rentals-related {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: 1fr;
    margin-top: 8px;
  }
  .rentals-related .rentals-related-action {
    min-height: 56px;
  }
  .rentals-provenance {
    margin-top: 8px;
  }
  .rentals-provenance > a {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
  .rentals-mobile-bar > .v-btn {
    flex: 0 0 44px;
    padding-inline: 0;
  }
  .rentals-mobile-bar > .v-btn:first-child {
    flex: 1 1 auto;
    min-width: 0;
    justify-content: flex-start;
  }
  .rentals-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .rental-card {
    display: grid;
    grid-template-columns: clamp(80px, 24vw, 144px) minmax(0, 1fr);
    gap: 12px;
    padding: 12px;
    align-items: start;
  }
  .rental-card__body {
    display: contents;
  }
  .rental-card__visual {
    grid-column: 1;
    grid-row: 1;
  }
  .rental-card__overview {
    grid-column: 2;
    grid-row: 1;
    gap: 6px;
  }
  .rental-card__main > :not(.rental-card__overview),
  .rental-card__rail > *,
  .rental-card__footnote > * {
    grid-column: 1 / -1;
    margin: 0;
  }
  .rental-card__media {
    height: 168px;
    aspect-ratio: auto;
    border-radius: 8px;
    overflow: hidden;
  }
  .rental-card__noimage {
    text-align: center;
    font-size: 0.7rem;
    padding: 4px;
  }
  .rental-card__save {
    top: 4px;
    right: 4px;
    width: 44px;
    height: 44px;
  }
  /* Sobre la miniatura de 80-144 px la chapa con etiqueta y el corazon se pisan
     (medido a 390 px: la chapa llegaba a 107 y el corazon arrancaba en 59). En
     compacto queda el icono solo, que es lo que cabe al lado del corazon. */
  .rental-card__zoom {
    top: 4px;
    left: 4px;
    padding: 4px;
    gap: 0;
  }
  .rental-card__zoom-label {
    display: none;
  }
  .rental-card__badge {
    bottom: 4px;
    left: 4px;
    right: 4px;
    padding: 4px;
    text-align: center;
    font-size: 0.65rem;
  }
  .rental-card__cost {
    border: 0;
    padding: 0;
    margin: 0;
  }
  .rental-card__price {
    font-size: 1.4rem;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
  .rental-card__expenses {
    font-size: 0.75rem;
    line-height: 1.45;
  }
  .rental-card h3 {
    font-size: 0.9rem;
    line-height: 1.4;
  }
  .rental-card h3 a {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .rental-card__address {
    display: none;
  }
  .rental-card__offers {
    padding-top: 0;
  }
  .rental-card__specs {
    font-size: 0.75rem;
    line-height: 1.5;
  }
  .rental-card__detail {
    font-size: 0.875rem;
  }
}
@media (max-width: 599px) {
  .rentals-provenance {
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
  }
}
@media (max-width: 359px) {
  /* Give full words room in two columns on the narrowest phones. */
  .rentals-related .rentals-related-action {
    padding-inline: 10px;
  }
  .rentals-related-action .v-icon {
    display: none;
  }
}
/* Fila horizontal en pantallas anchas, como InfoCasas y la vista lista de
   Mercado Libre. Con dos columnas de tarjetas la ficha crecía hasta ~700 px de
   ancho para cinco líneas de texto: el ojo cruzaba media pantalla vacía entre
   la foto y el precio. Acá el ancho se reparte en tres zonas de trabajo —foto,
   ficha, acciones— y nada queda suelto en el medio. El corte es 1264 porque
   abajo de eso la barra de filtros (304) deja menos de 900 px de resultados y
   la fila se comprime. */
/* Vista "lista": filas horizontales, como InfoCasas y la vista lista de Mercado
   Libre. Convive con el mosaico, que es lo que se sirve por defecto; la elección
   la guarda el visitante en localStorage (utils/rentalLayout.ts).

   Con tarjetas en columnas la ficha crecia hasta ~700 px de ancho para cinco
   lineas de texto y el ojo cruzaba media pantalla vacia entre la foto y el
   precio. Acá el ancho se reparte en zonas de trabajo y nada queda suelto en el
   medio. Abajo de 960 no hay conmutador y manda la tarjeta compacta de siempre. */
@media (min-width: 960px) {
  .rentals-grid.rentals-grid--lista {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .rentals-grid--lista .rental-card {
    display: grid;
    grid-template-columns: clamp(200px, 26%, 280px) minmax(0, 1fr);
    align-items: stretch;
    transition:
      border-color 0.15s ease-out,
      box-shadow 0.15s ease-out;
  }
  .rentals-grid--lista .rental-card:hover {
    border-color: rgba(var(--v-theme-primary), 0.45);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }
  .rentals-grid--lista .rental-card__body {
    display: contents;
  }
  /* La foto llena la columna en lugar de fijar la altura de la fila: una foto
     vertical la estiraba a 630 px y dejaba el precio arriba, el enlace abajo y
     medio metro de vacio en el medio. */
  .rentals-grid--lista .rental-card__visual {
    grid-column: 1;
    grid-row: 1 / -1;
    min-height: 208px;
  }
  .rentals-grid--lista .rental-card__media {
    position: absolute;
    inset: 0;
    height: 100%;
    aspect-ratio: auto;
  }
  .rentals-grid--lista .rental-card__main {
    grid-column: 2;
    grid-row: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
    padding: 16px 20px;
  }
  /* Hasta 1280 el riel no entra como tercera columna sin comerle el ancho al
     titulo: los portales y el enlace van en un renglon al pie de la ficha. */
  .rentals-grid--lista .rental-card__rail {
    grid-column: 2;
    grid-row: 2;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 0 20px 16px;
  }
  .rentals-grid--lista .rental-card__offers {
    flex: 1 1 240px;
    flex-direction: row;
    flex-wrap: wrap;
    margin: 0;
    padding-top: 0;
  }
  .rentals-grid--lista .rental-card__offer {
    flex: 1 1 200px;
  }
  /* Zona y distancia comparten renglon: son la misma respuesta ("donde queda"). */
  .rentals-grid--lista .rental-card__overview {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: baseline;
    gap: 4px 10px;
  }
  .rentals-grid--lista .rental-card__where {
    grid-column: 1;
  }
  .rentals-grid--lista .rental-card__distance {
    grid-column: 2;
    justify-self: start;
    font-size: 0.8rem;
  }
  .rentals-grid--lista
    .rental-card__overview
    > :not(.rental-card__where):not(.rental-card__distance) {
    grid-column: 1 / -1;
  }
  .rentals-grid--lista .rental-card__cost {
    margin: 0;
    padding: 0;
    border: 0;
  }
  .rentals-grid--lista .rental-card__price {
    font-size: 1.5rem;
  }
  .rentals-grid--lista .rental-card h3 {
    font-size: 1.075rem;
    font-weight: 700;
  }
  .rentals-grid--lista .rental-card h3 a {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .rentals-grid--lista .rental-card__specs,
  .rentals-grid--lista .rental-card__address {
    font-size: 0.875rem;
  }
  .rentals-grid--lista .rental-card__tags {
    margin-top: 2px;
  }
  /* Anunciante, aviso de ocupado y ultima lectura son una sola linea de pie:
     apilados dejaban tres renglones cortos contra 800 px de vacio a su derecha. */
  .rentals-grid--lista .rental-card__footnote {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 16px;
    margin-top: auto;
    padding-top: 4px;
  }
  .rentals-grid--lista .rental-card__footnote :deep(.availability-report) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
  }
  /* En el pie en renglon el boton no arranca ninguna columna: sin el retroceso
     de cu-btn-flush se comeria el espacio que lo separa del anunciante. */
  .rentals-grid--lista .rental-card__footnote :deep(.cu-btn-flush) {
    margin-inline-start: 0;
  }
  .rentals-grid--lista .rental-card__detail {
    justify-content: flex-start;
    gap: 8px;
    margin: 0;
  }
}
/* Desde 1280 la fila entra en tres zonas: foto, ficha y acciones. Foto y riel
   ceden ancho a la ficha cuando la fila se angosta; con 288 y 264 fijos, a 1280
   el titulo quedaba en dos lineas y el pie en otras dos. */
@media (min-width: 1280px) {
  .rentals-grid--lista .rental-card {
    grid-template-columns:
      clamp(208px, 19%, 288px)
      minmax(0, 1fr)
      clamp(240px, 17%, 268px);
  }
  .rentals-grid--lista .rental-card__visual {
    min-height: 232px;
  }
  .rentals-grid--lista .rental-card__rail {
    grid-column: 3;
    grid-row: 1;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: stretch;
    gap: 12px;
    padding: 16px 20px;
    border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
  .rentals-grid--lista .rental-card__offers {
    flex: 0 0 auto;
    flex-direction: column;
  }
  .rentals-grid--lista .rental-card__offer {
    flex: 0 0 auto;
  }
}
</style>
