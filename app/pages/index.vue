<template>
  <div class="home-container">
    <!-- Hero Section -->
    <section class="hero-section pt-0 pt-md-5">
      <!-- La Rambla de Montevideo grabada como la viñeta de un billete (public/img/grabados/,
           DESIGN.md → Engraving). Decoration only: a CSS mask painted in the theme's link ink, so it
           follows light and dark, sits behind the copy, and is sized and placed in px from the top
           of the hero so no change in the hero's height ever moves it. -->
      <div class="hero-engraving" aria-hidden="true" />
      <VContainer>
        <VRow justify="center" align="center" class="min-height-hero">
          <VCol cols="12" class="hero-col text-center">
            <div class="hero-content">
              <h1 class="hero-title hero-anim">
                {{ t('simpleTitle') }}
              </h1>
              <p class="hero-subtitle hero-anim">
                {{ t('simpleSubtitle') }}
              </p>

              <!-- Trust signals: BCU source, coverage, freshness, Trustpilot -->
              <TrustBar class="hero-trust hero-anim" />

              <!-- Live USD rate band: momentum chip + sparkline, the hero hook. The server
                   renders the card's skeleton in its place, so the card no longer pops in after
                   hydration and pushes the converter down. The entrance animation sits on this
                   wrapper, which survives hydration: on the swapped node it would run twice. -->
              <div class="hero-live hero-anim mb-6">
                <ClientOnly>
                  <DollarMomentum />
                  <template #fallback>
                    <DollarMomentumSkeleton />
                  </template>
                </ClientOnly>
              </div>

              <!-- Guided tour: loaded and started only from this button (driver.js is
                   imported inside start(), so the button itself renders on the server). -->
              <div class="d-flex justify-center mb-4">
                <SiteTour />
              </div>

              <!-- Currency Converter Card -->
              <VCard class="exchange-card hero-anim pa-3 pa-sm-6 mb-6" elevation="8">
                <h2 class="text-h5 font-weight-bold mb-6 text-center">
                  {{ t('quickExchange') }}
                </h2>

                <!-- Loading State -->
                <div
                  v-if="initialLoading"
                  class="d-flex flex-column align-center justify-center py-12"
                >
                  <VProgressCircular
                    indeterminate
                    color="primary"
                    size="64"
                    width="6"
                    class="mb-4"
                  />
                  <span class="text-body-1 text-grey-lighten-1">{{ t('loading') }}...</span>
                </div>

                <!-- Loaded Content -->
                <template v-else>
                  <!-- Desktop (lg+): form on the left, live result on the right
                       so the converter uses the available width instead of a
                       narrow centred column. Stacks on smaller screens. -->
                  <VRow class="converter-grid" align="start">
                    <VCol cols="12" lg="6" class="converter-col converter-col--form">
                      <!-- Amount Input -->
                      <VRow class="mb-0 mb-md-4">
                        <VCol cols="12" md="6">
                          <VTextField
                            :model-value="amountDisplay"
                            hide-details
                            :label="t('enterAmount')"
                            variant="outlined"
                            density="comfortable"
                            type="text"
                            inputmode="decimal"
                            class="amount-input"
                            data-testid="amount-input"
                            prepend-inner-icon="mdi-cash"
                            @update:model-value="onAmountTyped"
                          />
                          <!-- Quick preset amount chips -->
                          <div class="preset-chips d-flex flex-wrap ga-2 mt-3">
                            <VChip
                              v-for="preset in presetAmounts"
                              :key="`preset-${preset}`"
                              size="small"
                              variant="outlined"
                              color="primary"
                              class="preset-chip"
                              :data-testid="`preset-${preset}`"
                              @click="setPresetAmount(preset)"
                            >
                              {{ formatAmount(preset, 0) }}
                            </VChip>
                          </div>
                        </VCol>
                        <VCol cols="12" md="6">
                          <VAutocomplete
                            v-model="selectedExchangeHouseInput"
                            hide-details
                            :items="exchangeHouseOptions"
                            :label="t('selectExchangeHouse')"
                            variant="outlined"
                            density="comfortable"
                            item-title="title"
                            item-value="value"
                            class="exchange-house-select"
                            prepend-inner-icon="mdi-bank"
                          />
                        </VCol>
                      </VRow>

                      <!-- Currency Selection Row -->
                      <VRow class="currency-row" align="center">
                        <VCol cols="12" md="5">
                          <div class="currency-section">
                            <VAutocomplete
                              v-model="selectedCurrencyInput"
                              hide-details
                              :items="currencyOptions"
                              :label="t('from')"
                              variant="outlined"
                              density="comfortable"
                              item-title="title"
                              item-value="value"
                              class="currency-select"
                              clearable
                            />
                          </div>
                        </VCol>

                        <VCol cols="12" md="2" class="text-center pa-0 pa-md-3">
                          <div class="swap-btn_container">
                            <VBtn
                              icon
                              variant="outlined"
                              :size="mobile ? 'small' : 'large'"
                              color="primary"
                              class="swap-btn"
                              data-testid="swap-btn"
                              :aria-label="t('a11y.swap')"
                              @click="swapCurrencies"
                            >
                              <VIcon>mdi-swap-horizontal</VIcon>
                            </VBtn>
                          </div>
                        </VCol>

                        <VCol cols="12" md="5">
                          <div class="currency-section">
                            <VAutocomplete
                              v-model="selectedTargetCurrencyInput"
                              hide-details
                              :items="currencyOptions"
                              :label="t('to')"
                              variant="outlined"
                              density="comfortable"
                              item-title="title"
                              item-value="value"
                              class="currency-select"
                              clearable
                            />
                          </div>
                        </VCol>
                      </VRow>

                      <!-- Quick currency-pair shortcuts -->
                      <div class="shortcut-chips d-flex flex-wrap justify-center ga-2 my-4">
                        <span class="text-caption text-grey-lighten-1 align-self-center mr-1">
                          {{ t('quickExchangeShortcuts') }}:
                        </span>
                        <VChip
                          v-for="pair in currencyShortcuts"
                          :key="`pair-${pair.from}-${pair.to}`"
                          size="small"
                          :variant="isActiveShortcut(pair) ? 'elevated' : 'outlined'"
                          :color="isActiveShortcut(pair) ? 'success' : 'primary'"
                          class="shortcut-chip"
                          @click="applyCurrencyShortcut(pair)"
                        >
                          {{ pair.from }}
                          <VIcon size="14" class="mx-1">mdi-arrow-right</VIcon>
                          {{ pair.to }}
                        </VChip>
                      </div>

                      <VCardActions class="d-flex justify-end pa-0 pt-md-3 pb-3">
                        <VBtn
                          color="primary"
                          variant="elevated"
                          size="large"
                          :loading="loading"
                          class="w-100 w-md-auto my-5 my-md-0 px-5 convert-btn"
                          data-testid="convert-btn"
                          @click.prevent="updateExchange"
                        >
                          <VIcon start>mdi-calculator</VIcon>
                          {{ t('findBestRate') }}
                        </VBtn>
                      </VCardActions>
                    </VCol>

                    <VCol cols="12" lg="6" class="converter-col converter-col--result">
                      <!-- Conversion Result -->
                      <VCard
                        v-if="hasConversionRate"
                        class="conversion-result pa-4 mb-md-4"
                        color="rgba(76, 175, 80, 0.1)"
                        variant="outlined"
                        data-testid="conversion-result"
                      >
                        <!-- Show selected exchange house name if not 'best' -->
                        <div v-if="selectedExchangeHouse !== 'best'" class="text-center mb-3">
                          <VChip
                            color="primary"
                            variant="outlined"
                            size="small"
                            prepend-icon="mdi-bank"
                          >
                            {{ selectedExchangeHouseName }}
                          </VChip>
                          <StaleRateChip :entry="selectedQuoteFrozen" class="ml-2" />
                        </div>
                        <VRow align="center" justify="center" class="conversion-display-row">
                          <VCol sm="4" class="conversion-side text-center align-self-start">
                            <div class="conversion-display">
                              <span class="amount-text">
                                {{ formatCurrency(isForward ? amount : leftForReverse) }}
                              </span>
                              <span
                                v-if="selectedCurrency"
                                class="currency-name"
                                data-testid="from-currency"
                              >
                                {{ t('codes.' + selectedCurrency) }}
                              </span>
                            </div>
                          </VCol>

                          <!-- `auto` on xs: a 2/12 column squeezed the toggle to 23 px. -->
                          <VCol cols="auto" sm="4" class="text-center">
                            <DirectionToggle
                              :is-forward="isForward"
                              size="32"
                              color="success"
                              @toggle="toggleDirection"
                            />
                          </VCol>

                          <VCol sm="4" class="conversion-side text-center align-self-start">
                            <div class="conversion-display">
                              <span class="amount-text converted" data-testid="result-amount">
                                {{ formatCurrency(desiredRightAmount) }}
                              </span>
                              <span
                                v-if="selectedTargetCurrency"
                                class="currency-name"
                                data-testid="to-currency"
                              >
                                {{ t('codes.' + selectedTargetCurrency) }}
                              </span>
                            </div>
                          </VCol>
                        </VRow>

                        <VDivider class="my-3" />

                        <div class="rate-info text-center">
                          <span v-if="isForward" class="rate-text">
                            1 {{ selectedCurrency }} =
                            {{ formatCurrency(conversionResult.rate) }}
                            {{ selectedTargetCurrency }}
                          </span>
                          <span v-else class="rate-text">
                            1 {{ selectedTargetCurrency }} =
                            {{ formatCurrency(conversionResult.reverseRate) }}
                            {{ selectedCurrency }}
                          </span>
                        </div>
                        <div class="rate-info text-center">
                          <span v-if="isForward" class="rate-text">
                            {{ formatCurrency(conversionResult.invertedRate) }}
                            {{ selectedCurrency }} = 1 {{ selectedTargetCurrency }}
                          </span>
                          <span v-else class="rate-text">
                            {{ formatCurrency(reverseInvertedRate) }}
                            {{ selectedTargetCurrency }} = 1 {{ selectedCurrency }}
                          </span>
                        </div>
                        <VDivider class="my-3" />
                        <!-- Dual conversion summary -->
                        <VRow class="text-center" align="center" justify="center">
                          <VCol cols="12" md="6">
                            <div class="text-subtitle-2 text-grey-lighten-1 mb-1">
                              {{ t('quickExchangeForward') }}
                            </div>
                            <div class="text-h6 font-weight-bold text-white">
                              {{ formatCurrency(dualConversion.forwardToAmount) }}
                              <span class="text-caption">{{ selectedTargetCurrency }}</span>
                            </div>
                          </VCol>
                          <VCol cols="12" md="6">
                            <div class="text-subtitle-2 text-grey-lighten-1 mb-1">
                              {{ t('quickExchangeReverse') }}
                            </div>
                            <div class="text-h6 font-weight-bold text-white">
                              {{ formatCurrency(dualConversion.reverseNeededAmount) }}
                              <span class="text-caption">{{ selectedTargetCurrency }}</span>
                            </div>
                            <div class="text-caption text-grey-lighten-1 mt-1">
                              {{ reverseHintText }}
                            </div>
                          </VCol>
                        </VRow>

                        <!-- Savings vs market average hint -->
                        <div
                          v-if="showSavings"
                          class="savings-hint d-flex align-center justify-center mt-3"
                        >
                          <VChip
                            color="success"
                            variant="tonal"
                            size="small"
                            prepend-icon="mdi-piggy-bank"
                          >
                            {{ savingsText }}
                          </VChip>
                        </div>

                        <!-- Copy result to clipboard -->
                        <div class="d-flex justify-center mt-3">
                          <VBtn
                            variant="tonal"
                            color="success"
                            size="small"
                            class="copy-result-btn"
                            :aria-label="t('quickExchangeCopy')"
                            @click="copyResult"
                          >
                            <VIcon start>mdi-content-copy</VIcon>
                            {{ t('quickExchangeCopy') }}
                          </VBtn>
                        </div>
                      </VCard>
                      <VAlert
                        v-else
                        type="info"
                        variant="tonal"
                        data-testid="conversion-unavailable"
                      >
                        {{ t('whereToChange.noData') }}
                        <!-- The card (and its toggle) is gone: without this the reader who flipped
                             into a missing quote had no way back to the amount they typed. -->
                        <template #append>
                          <DirectionToggle
                            :is-forward="isForward"
                            size="32"
                            color="success"
                            @toggle="toggleDirection"
                          />
                        </template>
                      </VAlert>
                    </VCol>
                  </VRow>

                  <!-- Market view: WHERE you can operate (channel) and WHERE
                       you are (department). Both narrow the same
                       `filteredExchangeData`, which governs the best-rates
                       grid, the top houses list, the house selector and the
                       converter's best rate — a price in a department you
                       cannot reach is noise, not an option. -->
                  <div class="channel-filter d-flex flex-column align-center mt-6 mb-2">
                    <div class="channel-filter__controls d-flex flex-wrap align-center ga-3">
                      <VBtnToggle
                        :model-value="channelFilter"
                        mandatory
                        density="comfortable"
                        color="primary"
                        variant="outlined"
                        rounded="pill"
                        :aria-label="t('channelFilter.label')"
                        data-testid="home-channel"
                        @update:model-value="onChannelChange"
                      >
                        <VBtn value="all" size="small">
                          <VIcon start size="18">mdi-view-grid-outline</VIcon>
                          {{ t('channelFilter.all') }}
                        </VBtn>
                        <VBtn value="online" size="small" data-testid="home-channel-online">
                          <VIcon start size="18">mdi-laptop</VIcon>
                          {{ t('channelFilter.online') }}
                        </VBtn>
                        <VBtn value="presencial" size="small">
                          <VIcon start size="18">mdi-storefront-outline</VIcon>
                          {{ t('channelFilter.presencial') }}
                        </VBtn>
                      </VBtnToggle>
                      <VSelect
                        :model-value="departmentFilter"
                        :items="departmentOptions"
                        :label="t('departmentFilter.label')"
                        density="compact"
                        variant="outlined"
                        rounded="pill"
                        hide-details
                        class="channel-filter__dept"
                        prepend-inner-icon="mdi-map-marker-outline"
                        data-testid="home-department"
                        @update:model-value="onDepartmentChange"
                      />
                    </div>
                    <p class="channel-filter__hint text-caption text-grey-lighten-1 mt-2 mb-0">
                      {{ t('channelFilter.hint') }}
                    </p>
                    <p
                      v-if="hasMarketFilter"
                      class="channel-filter__hint text-caption text-grey-lighten-1 mt-1 mb-0"
                      data-testid="home-filter-notice"
                    >
                      {{ t('marketFilter.notice', { count: filteredExchangeData.length }) }}
                      <a
                        href="#"
                        class="channel-filter__reset"
                        @click.prevent="resetMarketFilters"
                        >{{ t('marketFilter.reset') }}</a
                      >
                    </p>
                  </div>

                  <!-- Best rates, full width below the converter: two columns
                       (sell | buy) only where the multi-column layout applies
                       (lg+); stacks on smaller screens. -->
                  <template v-if="subjectCode">
                    <VAlert
                      v-if="
                        hasMarketFilter &&
                        !primaryRatesForSubject.length &&
                        !secondaryRatesForSubject.length
                      "
                      type="info"
                      variant="tonal"
                      density="comfortable"
                      class="mb-4"
                      data-testid="home-filter-empty"
                    >
                      {{ marketFilterEmptyText }}
                      <template #append>
                        <VBtn
                          size="small"
                          variant="text"
                          color="primary"
                          @click="resetMarketFilters"
                        >
                          {{ t('marketFilter.reset') }}
                        </VBtn>
                      </template>
                    </VAlert>
                    <RateComparisonContext
                      :amount="comparisonSubjectAmount"
                      :currency="subjectCode"
                      :excluded-count="recommendationExcludedCount"
                      :selected-off-market="selectedQuoteOffMarket"
                    />
                    <VRow class="best-rates-grid">
                      <VCol v-if="primaryRatesForSubject.length" cols="12" lg="6">
                        <!-- First card: current intent (sell or buy) -->
                        <VCard
                          class="best-rates-card pa-4 mb-4 h-100"
                          color="rgba(33, 150, 243, 0.1)"
                          variant="outlined"
                        >
                          <h3 class="text-h6 font-weight-bold mb-3 mb-md-6 text-center text-white">
                            {{ primaryTitle }}
                          </h3>
                          <VRow>
                            <VCol
                              v-for="(rate, index) in primaryRatesForSubject"
                              :key="`${rate.origin}-${index}-primary`"
                              class="pa-2 pa-sm-3"
                              cols="6"
                              sm="6"
                              md="3"
                              lg="6"
                            >
                              <nuxt-link
                                class="d-flex w-100 h-100 text-decoration-none"
                                :to="
                                  localePath(
                                    canonicalRoutePath(`/historico/${rate.origin}/${subjectCode}`)
                                  )
                                "
                              >
                                <VCard
                                  class="rate-item pa-3 text-center flex-grow-1"
                                  :class="{ 'rate-item--best': index === 0 }"
                                  variant="flat"
                                >
                                  <div class="rate-position text-h6 font-weight-bold mb-2">
                                    #{{ index + 1 }}
                                  </div>
                                  <div class="rate-name text-body-2 font-weight-medium mb-1">
                                    {{ rate.source }}
                                  </div>
                                  <div class="rate-value text-h6 font-weight-bold mb-1">
                                    ${{ rate.rate.toFixed(2) }}
                                  </div>
                                  <div class="rate-type text-caption">
                                    {{ intentIsSellingSubject ? t('sell') : t('buy') }}
                                    <span class="d-sm-none">{{ subjectCode }}</span>
                                    <span class="d-none d-sm-inline">{{
                                      ' ' + t('codes.' + subjectCode)
                                    }}</span>
                                  </div>
                                  <RateAmountComparison
                                    :amount="comparisonSubjectAmount"
                                    :rate="rate.rate"
                                    :best-rate="primaryRatesForSubject[0]!.rate"
                                    :selling="intentIsSellingSubject"
                                    :first="index === 0"
                                  />
                                  <StaleRateChip
                                    :entry="frozenFor(rate.origin, subjectCode, rate.type)"
                                    dense
                                    class="mt-2"
                                  />
                                </VCard>
                              </nuxt-link>
                            </VCol>
                          </VRow>
                        </VCard>
                      </VCol>

                      <!-- Second card: the other intent -->
                      <VCol v-if="secondaryRatesForSubject.length" cols="12" lg="6">
                        <VCard
                          class="best-rates-card pa-4 mb-4 h-100"
                          color="rgba(33, 150, 243, 0.1)"
                          variant="outlined"
                        >
                          <h3 class="text-h6 font-weight-bold mb-3 mb-md-6 text-center text-white">
                            {{ secondaryTitle }}
                          </h3>
                          <VRow>
                            <VCol
                              v-for="(rate, index) in secondaryRatesForSubject"
                              :key="`${rate.origin}-${index}-secondary`"
                              class="pa-2 pa-sm-3"
                              cols="6"
                              sm="6"
                              md="3"
                              lg="6"
                            >
                              <nuxt-link
                                class="d-flex w-100 h-100 text-decoration-none"
                                :to="
                                  localePath(
                                    canonicalRoutePath(`/historico/${rate.origin}/${subjectCode}`)
                                  )
                                "
                              >
                                <VCard
                                  class="rate-item pa-3 text-center flex-grow-1"
                                  :class="{ 'rate-item--best': index === 0 }"
                                  variant="flat"
                                >
                                  <div class="rate-position text-h6 font-weight-bold mb-2">
                                    #{{ index + 1 }}
                                  </div>
                                  <div class="rate-name text-body-2 font-weight-medium mb-1">
                                    {{ rate.source }}
                                  </div>
                                  <div class="rate-value text-h6 font-weight-bold mb-1">
                                    ${{ rate.rate.toFixed(2) }}
                                  </div>
                                  <div class="rate-type text-caption">
                                    {{ intentIsSellingSubject ? t('buy') : t('sell') }}
                                    <span class="d-sm-none">{{ subjectCode }}</span>
                                    <span class="d-none d-sm-inline">{{
                                      ' ' + t('codes.' + subjectCode)
                                    }}</span>
                                  </div>
                                  <RateAmountComparison
                                    :amount="comparisonSubjectAmount"
                                    :rate="rate.rate"
                                    :best-rate="secondaryRatesForSubject[0]!.rate"
                                    :selling="!intentIsSellingSubject"
                                    :first="index === 0"
                                  />
                                  <StaleRateChip
                                    :entry="frozenFor(rate.origin, subjectCode, rate.type)"
                                    dense
                                    class="mt-2"
                                  />
                                </VCard>
                              </nuxt-link>
                            </VCol>
                          </VRow>
                        </VCard>
                      </VCol>
                    </VRow>
                  </template>
                </template>
              </VCard>

              <!-- Copy confirmation snackbar -->
              <VSnackbar v-model="copySnackbar" color="success" :timeout="2000" location="bottom">
                <VIcon start>mdi-check-circle</VIcon>
                {{ t('quickExchangeCopied') }}
              </VSnackbar>

              <!-- Secondary band: SEO answer + savings tool + share + advanced.
                   De-emphasized below the converter so the hero stays focused. -->
              <div class="hero-secondary">
                <!-- SSR-visible live answer to "¿a cuánto está el dólar hoy?" — plain
                     text (not hidden in the FAQ accordion) so AI Overviews/Gemini can
                     extract and cite the figure. -->
                <p v-if="usdHeadline" class="hero-answer text-body-1">
                  {{ usdHeadline }}
                </p>

                <!-- Server-rendered: it reads only the shared rates the page already awaits, and
                     inside <ClientOnly> it appeared after hydration and pushed everything below. -->
                <SavingsHighlight class="hero-savings" />

                <div class="hero-actions">
                  <ShareButtons />
                  <VBtn
                    :to="localePath('/avanzado')"
                    color="secondary"
                    variant="outlined"
                    size="large"
                    class="advanced-btn"
                  >
                    <VIcon start>mdi-cog</VIcon>
                    {{ t('viewAdvanced') }}
                  </VBtn>
                </div>
              </div>
            </div>
          </VCol>
        </VRow>
      </VContainer>
    </section>

    <!-- Top Exchange Houses Section -->
    <section class="top-exchanges-section py-12">
      <VContainer>
        <VRow>
          <VCol cols="12" class="section-head mb-8">
            <h2 class="section-title">
              {{ t('topExchangeHouses') }}
            </h2>
            <p class="section-subtitle">
              {{ t('subtitle') }}
            </p>
          </VCol>
        </VRow>

        <VRow v-reveal.children>
          <VCol
            v-for="(exchange, i) in topExchanges"
            :key="exchange.origin"
            cols="6"
            sm="6"
            md="4"
            lg="3"
          >
            <nuxt-link
              class="d-flex w-100 h-100 text-decoration-none"
              :to="localePath(canonicalRoutePath(`/historico/${exchange.origin}/${exchange.code}`))"
            >
              <VCard class="house-card pa-4 h-100 w-100">
                <div class="house-card__top">
                  <span class="house-rank" :class="i < 3 ? `house-rank--${i + 1}` : ''">{{
                    i + 1
                  }}</span>
                  <VChip
                    :color="exchange.isRegulated ? 'success' : 'warning'"
                    size="small"
                    variant="flat"
                    class="house-badge"
                  >
                    <VIcon start size="12">
                      {{ exchange.isRegulated ? 'mdi-shield-check' : 'mdi-alert-outline' }}
                    </VIcon>
                    {{ exchange.isRegulated ? 'BCU' : 'No BCU' }}
                  </VChip>
                </div>
                <h3 class="house-name">{{ exchange.name }}</h3>
                <div class="house-rate">{{ formatCurrency(exchange.rate) }}</div>
                <div class="house-meta">1 {{ exchange.code }}</div>
                <div class="house-cta">
                  {{ t('historico') }}
                  <VIcon size="14">mdi-arrow-right</VIcon>
                </div>
              </VCard>
            </nuxt-link>
          </VCol>
        </VRow>
      </VContainer>
    </section>

    <!-- The homepage's single manual promotion follows the main rate lookup. -->
    <VContainer class="py-4">
      <!-- Labelled as advertising, so an ad-free account does not get it (utils/adFree.ts). -->
      <ConLaTuyaBanner v-if="viewerShowsAds(adFreeViewer)" />
      <!-- La fila patrocinada: un bloque APARTE del ranking de arriba, nunca dentro de
           topExchanges (el orden lo determina siempre el precio). Sin `sponsorships.homeRow` en
           runtimeConfig no deja ni un nodo en el DOM. -->
      <SponsoredCasaRow class="mt-4" />
    </VContainer>

    <!-- Nearby Casa Finder Banner - flagship tourist tool, links to the
         dedicated smart nearby-finder page. -->
    <section v-reveal class="nearby-finder-banner py-10">
      <VContainer>
        <VCard class="nearby-finder-card pa-6 pa-md-10" elevation="0">
          <img
            class="nearby-finder-art"
            src="/img/grabados/plano-ciudad-vieja.webp"
            alt=""
            width="720"
            height="480"
            loading="lazy"
            decoding="async"
          />
          <VRow align="center" class="nearby-finder-body">
            <VCol cols="12" md="8">
              <h2 class="nearby-finder-title mb-2">
                {{ t('nearbyCasas.homeBannerTitle') }}
              </h2>
              <p class="text-body-1 mb-0">{{ t('nearbyCasas.homeBannerSubtitle') }}</p>
            </VCol>
            <VCol cols="12" md="4" class="text-center text-md-end">
              <VBtn
                :to="localePath('/casa-de-cambio-cerca-de-mi')"
                color="primary"
                size="large"
                class="px-6"
              >
                <VIcon start>mdi-crosshairs-gps</VIcon>
                {{ t('nearbyCasas.homeBannerCta') }}
              </VBtn>
            </VCol>
          </VRow>
        </VCard>
      </VContainer>
    </section>

    <!-- La única unidad propia de la portada. La densidad de `/` es `light` (utils/ads.ts): una
         unidad. El cierre del layout no se dibuja en la portada (layouts/default.vue), así que ésta
         es esa una, en un corte de sección y no al pie: la portada es la página con más visitas del
         sitio y casi nadie llega hasta el final. Va después de las cotizaciones, el ranking de
         casas y el buscador de casas cercanas —lo que la visita vino a resolver— y nunca entre el
         conversor y su resultado. Reserva su alto y se colapsa si AdSense no tiene qué servir. -->
    <VContainer class="py-0">
      <AdSlot placement="content-end" class="home-ad" />
    </VContainer>

    <!-- Promo video: short branded clip, lazy + autoplay-in-view (muted), the
         visitor can tap to unmute. Sits between the rates and the how-it-works
         steps so it reinforces "compare before you change" organically. -->
    <section v-reveal class="promo-section py-12">
      <VContainer>
        <VRow justify="center">
          <VCol cols="12" md="10" lg="9" class="text-center mb-6">
            <h2 class="section-title">{{ t('promo.heading') }}</h2>
            <p class="section-subtitle">{{ t('promo.subtitle') }}</p>
          </VCol>
        </VRow>
        <PromoVideo :label="t('promo.heading')" />
        <div class="d-flex justify-center flex-wrap ga-3 mt-6">
          <VBtn :to="localePath('/comparar')" color="primary" variant="elevated" size="large">
            <VIcon start>mdi-chart-multiple</VIcon>
            {{ t('promo.cta') }}
          </VBtn>
          <VBtn :to="localePath('/analiticas')" color="primary" variant="outlined" size="large">
            <VIcon start>mdi-chart-timeline-variant-shimmer</VIcon>
            {{ t('rateAnalytics.nav') }}
          </VBtn>
        </div>
      </VContainer>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works-section section-band py-12">
      <VContainer>
        <VRow>
          <VCol cols="12" class="section-head mb-8">
            <h2 class="section-title">
              {{ t('howItWorks') }}
            </h2>
          </VCol>
        </VRow>

        <VRow v-reveal.children class="steps-grid">
          <VCol v-for="(step, index) in steps" :key="index" cols="6" md="3">
            <div class="step-card">
              <div class="step-art">
                <img
                  :src="step.art"
                  alt=""
                  :width="step.artWidth"
                  :height="step.artHeight"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3 class="step-title">
                <span class="step-index">{{ index + 1 }}</span>
                {{ step.title }}
              </h3>
            </div>
          </VCol>
        </VRow>
      </VContainer>
    </section>

    <!-- Social proof: real Trustpilot reviews. Lazily mounted and self-removing
         on failure, so a third-party outage never leaves an empty box here. -->
    <TrustpilotReviews />

    <!-- Nos mencionaron en YouTube: el canal que nos citó y algunos de sus videos, con botón para
         suscribirse (utils/creatorVideos.ts). Reproductores diferidos: nada de YouTube hasta el play. -->
    <HomeCreatorMention />

    <!-- AI Insights Section -->
    <AIInsights />

    <!-- ¿Dónde cambiar? — AI-assisted "where to exchange" recommendation -->
    <WhereToChange />

    <!-- Donation Card Component -->
    <DonationCard />

    <!-- Pillar Content Section: SEO-rich content about dólar en Uruguay -->
    <section class="pillar-content-section section-band py-12">
      <VContainer>
        <VRow>
          <VCol cols="12" md="10" lg="8" class="mx-auto">
            <article class="pillar-article">
              <h2 class="section-title mb-6">
                {{ t('pillar.aboutTitle') }}
              </h2>
              <p class="text-body-1 text-grey-lighten-1 mb-6 pillar-text">
                {{ t('pillar.aboutDescription') }}
              </p>

              <h3 class="text-h5 font-weight-bold mb-4">
                {{ t('pillar.howToCompareTitle') }}
              </h3>
              <p class="text-body-1 text-grey-lighten-1 mb-6 pillar-text">
                {{ t('pillar.howToCompareDescription') }}
              </p>

              <h3 class="text-h5 font-weight-bold mb-4">
                {{ t('pillar.marketOverviewTitle') }}
              </h3>
              <p class="text-body-1 text-grey-lighten-1 mb-6 pillar-text">
                {{ t('pillar.marketOverviewDescription') }}
              </p>

              <h3 class="text-h5 font-weight-bold mb-4">
                {{ t('pillar.tipsTitle') }}
              </h3>
              <ul class="tips-list pa-0 mb-6">
                <li v-for="tipNum in 4" :key="tipNum" class="d-flex align-start mb-3">
                  <VIcon color="success" class="mr-3 mt-1">mdi-check-circle</VIcon>
                  <span class="text-body-1 text-grey-lighten-1">
                    {{ t(`pillar.tip${tipNum}`) }}
                  </span>
                </li>
              </ul>
            </article>
          </VCol>
        </VRow>
      </VContainer>
    </section>

    <!-- FAQ Section - data-grounded FAQ + single FAQPage JSON-LD via FaqBlock -->
    <FaqBlock
      v-if="homeFaqItems.length"
      class="faq-section section-band py-12"
      :items="homeFaqItems"
      :heading="t('faq.title')"
    />

    <!-- Guías más leídas. La portada es la página con más tráfico del sitio y hasta el
         2026-09-30 sólo enlazaba páginas de datos: ni una guía, que es lo que la gente sigue
         leyendo después del dólar. La lista sale del ranking diario de GA4
         (`sitetoppages.guides`, ver docs/analytics/PAGE_RANKING.md), así que se actualiza sola.
         Sólo en español: las guías son páginas en español. En el HTML del servidor, para que los
         enlaces cuenten. -->
    <section v-if="homeGuides.length" class="home-guides-section py-12">
      <VContainer>
        <VRow>
          <VCol cols="12" class="section-head mb-8">
            <h2 class="section-title">Las guías más leídas</h2>
            <p class="section-subtitle">
              Lo que más se consulta en Uruguay además del dólar, según las visitas de esta semana.
            </p>
          </VCol>
        </VRow>
        <VRow v-reveal.children>
          <VCol v-for="guide in homeGuides" :key="guide.path" cols="12" sm="6" md="4">
            <NuxtLink :to="guide.path" class="text-decoration-none">
              <VCard class="internal-link-card pa-5 h-100" elevation="0">
                <h3 class="link-card__title mb-2">{{ prLabel(guide) }}</h3>
                <p class="text-body-2 text-grey-lighten-1 mb-0">
                  {{ topicOf(guide.path, t)?.section }}
                </p>
              </VCard>
            </NuxtLink>
          </VCol>
        </VRow>
        <VRow>
          <VCol cols="12" class="text-center">
            <NuxtLink to="/paginas-mas-visitadas" class="home-guides-more">
              Ver las 100 páginas más visitadas
            </NuxtLink>
          </VCol>
        </VRow>
      </VContainer>
    </section>

    <!-- Internal Linking Section - Topical Cluster Navigation -->
    <section class="internal-links-section py-12">
      <VContainer>
        <VRow>
          <VCol cols="12" class="section-head mb-8">
            <h2 class="section-title">
              {{ t('pillar.relatedTitle') }}
            </h2>
          </VCol>
        </VRow>
        <VRow v-reveal.children>
          <VCol cols="12" sm="6" md="4" lg>
            <NuxtLink :to="localePath('/historico')" class="text-decoration-none">
              <VCard class="internal-link-card pa-5 h-100" elevation="0">
                <h3 class="link-card__title mb-2">
                  <VIcon size="20" class="link-card__icon">mdi-chart-line</VIcon>
                  {{ t('historico') }}
                </h3>
                <p class="text-body-2 text-grey-lighten-1 mb-0">
                  {{ t('pillar.historicalLink') }}
                </p>
              </VCard>
            </NuxtLink>
          </VCol>
          <VCol cols="12" sm="6" md="4" lg>
            <NuxtLink :to="localePath('/sucursales')" class="text-decoration-none">
              <VCard class="internal-link-card pa-5 h-100" elevation="0">
                <h3 class="link-card__title mb-2">
                  <VIcon size="20" class="link-card__icon">mdi-map-marker</VIcon>
                  {{ t('sucursalesMenu') }}
                </h3>
                <p class="text-body-2 text-grey-lighten-1 mb-0">
                  {{ t('pillar.branchesLink') }}
                </p>
              </VCard>
            </NuxtLink>
          </VCol>
          <VCol cols="12" sm="6" md="4" lg>
            <NuxtLink :to="localePath('/avanzado')" class="text-decoration-none">
              <VCard class="internal-link-card pa-5 h-100" elevation="0">
                <h3 class="link-card__title mb-2">
                  <VIcon size="20" class="link-card__icon">mdi-cog</VIcon>
                  {{ t('avanzado') }}
                </h3>
                <p class="text-body-2 text-grey-lighten-1 mb-0">
                  {{ t('pillar.advancedLink') }}
                </p>
              </VCard>
            </NuxtLink>
          </VCol>
          <VCol cols="12" sm="6" md="4" lg>
            <NuxtLink :to="localePath('/cotizacion')" class="text-decoration-none">
              <VCard class="internal-link-card pa-5 h-100" elevation="0">
                <h3 class="link-card__title mb-2">
                  <VIcon size="20" class="link-card__icon">mdi-currency-usd</VIcon>
                  {{ t('moneda') }}
                </h3>
                <p class="text-body-2 text-grey-lighten-1 mb-0">
                  {{ t('pillar.allCurrenciesLink') }}
                </p>
              </VCard>
            </NuxtLink>
          </VCol>
          <VCol cols="12" sm="6" md="4" lg>
            <NuxtLink :to="localePath('/indicadores')" class="text-decoration-none">
              <VCard class="internal-link-card pa-5 h-100" elevation="0">
                <h3 class="link-card__title mb-2">
                  <VIcon size="20" class="link-card__icon">mdi-finance</VIcon>
                  {{ t('pillar.indicatorsTitle') }}
                </h3>
                <p class="text-body-2 text-grey-lighten-1 mb-0">
                  {{ t('pillar.indicatorsLink') }}
                </p>
              </VCard>
            </NuxtLink>
          </VCol>
        </VRow>
      </VContainer>
    </section>

    <!-- Casa hubs. /casa/[origin] is the page built to win the "cambio {casa}"
         brand query — tens of thousands of impressions — and it had almost no
         inbound internal links. Rendered from the SSR rate rows, so these links
         are in the server HTML, and every origin comes from live localData, so
         none of them can 404. -->
    <section v-if="hubCasas.length" v-reveal class="casa-hubs-section py-12">
      <VContainer>
        <VRow>
          <VCol cols="12" class="text-center mb-6">
            <h2 class="text-h5 font-weight-bold">{{ t('home.casaHubsTitle') }}</h2>
            <p class="text-body-2 text-grey-lighten-1">{{ t('home.casaHubsSubtitle') }}</p>
          </VCol>
        </VRow>
        <div class="casa-hubs">
          <NuxtLink
            v-for="casa in hubCasas"
            :key="casa.origin"
            :to="localePath(`/casa/${casa.origin}`)"
            class="casa-hub-link"
          >
            {{ t('home.casaHubAnchor', { casa: casa.name }) }}
          </NuxtLink>
        </div>
      </VContainer>
    </section>

    <!-- Features Section -->
    <section class="features-section section-band py-12">
      <VContainer>
        <VRow>
          <VCol cols="12" class="section-head mb-8">
            <h2 class="section-title">
              {{ t('whyChooseUs') }}
            </h2>
          </VCol>
        </VRow>
        <VRow v-reveal.children>
          <VCol v-for="feature in features" :key="feature.title" cols="12" sm="6" md="4">
            <VCard
              v-if="feature.title === t('feature5Title')"
              class="feature-card pa-5 h-100 cursor-pointer"
              elevation="0"
              href="https://api.cambio-uruguay.com/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              :ripple="true"
            >
              <div>
                <VIcon size="24" class="feature-card__icon mb-3">
                  {{ feature.icon }}
                </VIcon>
                <h3 class="link-card__title mb-2">
                  {{ feature.title }}
                </h3>
                <p class="text-body-2 text-grey-lighten-1 mb-3">
                  {{ feature.description }}
                </p>
                <VBtn color="primary" variant="outlined" size="small">
                  <VIcon start size="small">mdi-open-in-new</VIcon>
                  {{ t('apiDocumentation') }}
                </VBtn>
              </div>
            </VCard>
            <VCard
              v-else-if="feature.title === t('feature6Title')"
              class="feature-card pa-5 h-100 cursor-pointer"
              elevation="0"
              href="https://github.com/eduair94/cambio-uruguay"
              target="_blank"
              rel="noopener noreferrer"
              :ripple="true"
            >
              <div>
                <VIcon size="24" class="feature-card__icon mb-3">
                  {{ feature.icon }}
                </VIcon>
                <h3 class="link-card__title mb-2">
                  {{ feature.title }}
                </h3>
                <p class="text-body-2 text-grey-lighten-1 mb-3">
                  {{ feature.description }}
                </p>
                <VBtn color="primary" variant="outlined" size="small">
                  <VIcon start size="small">mdi-open-in-new</VIcon>
                  {{ t('viewRepository') }}
                </VBtn>
              </div>
            </VCard>
            <VCard v-else class="feature-card pa-5 h-100" elevation="0">
              <div>
                <VIcon size="24" class="feature-card__icon mb-3">
                  {{ feature.icon }}
                </VIcon>
                <h3 class="link-card__title mb-2">
                  {{ feature.title }}
                </h3>
                <p class="text-body-2 text-grey-lighten-1">
                  {{ feature.description }}
                </p>
              </div>
            </VCard>
          </VCol>
        </VRow>
      </VContainer>
    </section>

    <!-- Our own published assets. Not an "as featured in" claim: no third-party
         editorial mention exists yet. -->
    <EcosystemStrip />

    <!-- CTA Section -->
    <section class="cta-section on-dark py-6 py-sm-12">
      <VContainer>
        <VRow justify="center" align="center">
          <VCol cols="12" md="8" class="text-center">
            <h2 class="text-h6 text-sm-h4 font-weight-bold mb-4 text-white">
              {{ t('consultCurrentQuotes') }}
            </h2>
            <VBtn
              :to="localePath('/avanzado')"
              color="white"
              variant="elevated"
              size="x-large"
              class="text-primary font-weight-bold"
            >
              <VIcon start>mdi-chart-line</VIcon>
              {{ t('viewAdvanced') }}
            </VBtn>
          </VCol>
        </VRow>
      </VContainer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { VAutocomplete } from 'vuetify/components'
import { useLocalePath } from '#imports'
import { prLabel } from '~/utils/pageRanking'
import { viewerShowsAds } from '~/utils/adFree'
import { topicOf, type TopPageRow, type TopPagesSnapshot } from '~/utils/topPages'
import DirectionToggle from '@/components/DirectionToggle.vue'
import { computed, onBeforeUnmount, onMounted, onServerPrefetch, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { HOME_FAQ_IDS, type FaqItem } from '~/utils/faqAnswers'
import { quotesForCurrency, rankUsableQuotes, type CurrencyCode } from '~/utils/currencyPages'
import { useDisplay } from 'vuetify'
import {
  convert as convertAmount,
  formatAmount,
  currencyAmountSavings,
  parseAmount,
  type RateRow,
} from '@/utils/conversion'
import { crownable } from '@/utils/marketOutlier'
import { publicRates } from '@/utils/rateSource'
import {
  matchesChannel,
  normalizeChannelFilter,
  servesDepartment,
  type ExchangeChannelFilter,
} from '@/utils/exchangeChannel'
import { dedupeDepartmentNames, sameDepartment } from '@/utils/departments'
import { replaceQueryInPlace } from '@/utils/historyQuery'
import { formatUyuCurrency, keepCurrency } from '@/utils/homeConverter'

/** Cuántas guías muestra la portada. */
// An ad-free account (/cuenta/sin-publicidad) does not get the promotion labelled as advertising.
const adFreeViewer = useAdFreeViewer()
const HOME_GUIDES = 6

const { mobile } = useDisplay()

// Scroll reveals use the app-wide `v-reveal` directive (plugins/reveal.ts, on Motion). Until
// 2026-11-28 this page registered @vueuse/motion + popmotion (~30 KB) for itself, and its cards
// started hidden at mount, so a card already on screen blinked out and sprang back in.

// Interfaces
interface ExchangeItem {
  origin: string
  code: string
  buy: number
  sell: number
  type?: string
  isInterBank: boolean
  condition: string
  localData: {
    name?: string
    website?: string
    departments: string[]
    bcu?: boolean
  } | null
}

interface Step {
  title: string
  description: string
  /** An engraved vignette (public/img/grabados/), decorative: the title carries the step. */
  art: string
  artWidth: number
  artHeight: number
}

interface Feature {
  title: string
  description: string
  icon: string
  color: string
}

// Composables
const { t, locale } = useI18n()
// Las pizarras que no se mueven, para poder advertirlo en la tarjeta que las publica como #1.
const { frozenFor } = useFrozenQuotes()
const localePath = useLocalePath()
// Shared, deduped exchange-rates fetch (the home trend modules use the same
// `useExchangeRates` cache key) — the calculator reads from it instead of
// issuing its own second identical request for the dataset.
const {
  rows: sharedRows,
  pending: sharedPending,
  realRows: sharedRealRows,
  ready: ratesReady,
} = useExchangeRates()
const route = useRoute()

// The instant of the server render, taken once and carried in the payload, so the server and the
// hydrating browser print the same date. `/` is cached at the edge for an hour: HTML rendered at
// 23:30 hydrates after midnight, and a `new Date()` read on each side wrote two different days
// into the hero answer (a hydration mismatch) and into the WebPage JSON-LD (unhead then appended a
// second block; see tests/unit/headHydrationParity.test.ts, which allows ONE clock-reading
// useState per page — the hero and the JSON-LD share this one).
const renderedAt = useState('home-rendered-at', () => Date.now()).value

// SSR-rendered, self-contained answer to "¿a cuánto está el dólar hoy?" so the
// figure is visible plain text (not only inside the FAQ accordion / schema),
// which AI Overviews and Gemini extract more readily. Built from the same
// SSR-friendly useExchangeRates data, public quotes only (no BCU/interbank).

// The casas we link to from the homepage. Derived from the SSR rate rows, so
// the links exist in the server HTML — `realExchangeData` is filled by a
// watcher, which would leave a crawler with an empty list. Names come from the
// payload's own localData, so an origin can never 404 the /casa validate hook,
// and publicRates has already dropped the BCU reference (it has no /casa page).
const hubCasas = computed(() => {
  const byOrigin = new Map<string, string>()
  for (const row of sharedRealRows.value ?? []) {
    if (row.code !== 'USD' || byOrigin.has(row.origin)) continue
    const name = (row as { localData?: { name?: string } }).localData?.name
    if (name && name.trim()) byOrigin.set(row.origin, name.trim())
  }
  return Array.from(byOrigin, ([origin, name]) => ({ origin, name })).sort((a, b) =>
    a.name.localeCompare(b.name, 'es')
  )
})

// One source of truth for the market's best public USD quotes. The visible
// headline and the ExchangeRateSpecification JSON-LD are both built from it, so
// the schema can never advertise a price the page does not show.
const usdQuotes = computed(() =>
  rankUsableQuotes(quotesForCurrency(sharedRealRows.value ?? [], 'USD'), 'USD')
)
const usdBestSell = computed(() => usdQuotes.value.find(q => q.bestSell)?.sell ?? null)
const usdBestBuy = computed(() => usdQuotes.value.find(q => q.bestBuy)?.buy ?? null)

// La respuesta del hero, en el idioma de la página (`home.heroAnswer`). Estaba escrita acá en
// castellano y /en y /pt la mostraban tal cual, y decía que los datos "se basan en el registro del
// BCU" cuando son las pizarras de cada casa. El separador decimal y la fecha siguen al idioma, igual
// que el título y la descripción del head.
const usdHeadline = computed<string | null>(() => {
  const quotes = usdQuotes.value
  if (usdBestSell.value === null || usdBestBuy.value === null) return null
  const lang = dateLocale(locale.value)
  const fmt = (n: number) =>
    n.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const date = new Date(renderedAt).toLocaleDateString(lang, {
    timeZone: 'America/Montevideo',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return t('home.heroAnswer', {
    date,
    sell: fmt(usdBestSell.value),
    buy: fmt(usdBestBuy.value),
    count: quotes.length,
  })
})

// Branded OG image with the live USD rate (og-rate route is cached 10 min).
const { data: ogRate } = await useFetch<{ buy: number | null; sell: number | null }>(
  '/api/og-rate',
  { default: () => ({ buy: null, sell: null }) }
)
defineOgImageComponent('Cambio', {
  // title/subtitle omitted → the OgImage component supplies localized defaults.
  rateBuy: ogRate.value?.buy ?? null,
  rateSell: ogRate.value?.sell ?? null,
  locale: locale.value as 'es' | 'en' | 'pt',
})

// Data-grounded FAQ embed (USD live answers + evergreen). FaqBlock renders the
// visible accordion and the single home FAQPage JSON-LD from these same items.
// Las guías más leídas (bloque de arriba). `transform` y no `pick`: la ruta devuelve `null` sin
// documento, y `pick` sobre `null` rompe; así el payload lleva sólo la lista.
const { data: topGuides } = await useFetch('/api/site-top-pages', {
  key: 'home-top-guides',
  transform: (doc: TopPagesSnapshot | null): TopPageRow[] => doc?.guides ?? [],
})
const homeGuides = computed(() =>
  locale.value === 'es' ? (topGuides.value || []).slice(0, HOME_GUIDES) : []
)

const { data: faqData } = await useFetch<{ generatedAt: string; items: FaqItem[] }>('/api/faq', {
  query: { lang: locale },
  default: () => ({ generatedAt: '', items: [] as FaqItem[] }),
})
const homeFaqItems = computed(() =>
  (faqData.value?.items ?? []).filter(i => (HOME_FAQ_IDS as readonly string[]).includes(i.id))
)

// localStorage key for form persistence
const STORAGE_KEY = 'cambio-uruguay-home-form'

// Interface for stored form data
interface StoredFormData {
  from: string
  to: string
  amount: number
  exchangeHouse: string
  dir: boolean
}

// Function to get stored form data
const getStoredFormData = (): StoredFormData | null => {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Error reading localStorage:', e)
  }
  return null
}

// Function to save form data to localStorage
const saveFormData = () => {
  if (typeof window === 'undefined') return
  try {
    const data: StoredFormData = {
      from: selectedCurrency.value,
      to: selectedTargetCurrency.value,
      amount: amount.value,
      exchangeHouse: selectedExchangeHouse.value,
      dir: isForward.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Error saving to localStorage:', e)
  }
}

// Initial values come from the query params or the defaults. The form saved in this browser is
// NOT read during setup: the server has no localStorage and its HTML (cached at the edge, shared
// by every visitor) carries the query/default form, so a returning visitor's first client render
// must match it or hydration throws the converter away. The saved form is applied in onMounted
// (`restoreStoredForm`), after hydration, for every field the URL does not set.
const queryString = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined

// The amount the URL asks for, or none.
const queryAmount = (): number | null => {
  const value = Number(route.query.amount)
  return value && value > 0 ? value : null
}

// Use input refs for v-models
const selectedCurrencyInput = ref(queryString(route.query.from) ?? 'USD')
const selectedTargetCurrencyInput = ref(queryString(route.query.to) ?? 'UYU')
// Numeric source of truth for the entered amount (kept as a number so all
// downstream math/toggling stays unchanged).
const amountInput = ref<number>(queryAmount() ?? 100)

// Text-field-facing buffer for the entered amount. Deliberately NOT formatted
// with es-UY thousands separators ("."), and never reformatted while the
// field has focus: any "." inserted into the text is ambiguous downstream,
// since parseAmount treats a lone "." as a decimal point when no "," is
// present (needed so plain JS-number strings like "1234.5" still parse). Two
// different bugs came from adding formatting back in:
//  1. Reformatting on every keystroke ("25000" -> "2.500" once it hit 4
//     digits) meant the next keystroke landed after the inserted dot, so
//     continuing to type got parsed as a decimal ("2.5000" -> 2.5).
//  2. A get/set computed swapped for a ref + `watch(amountDisplay, ...)`
//     still reparsed the text every time the display was reformatted
//     programmatically (blur, presets, direction toggle) - so blurring
//     "25000" produced "25.000", which the watcher immediately reparsed as
//     25 via the same dot-as-decimal ambiguity.
// The fix: never inject grouping into this field at all. Typing only ever
// updates amountInput from the raw, unmodified text (onAmountTyped); this
// import parseAmount handles at most a "," decimal, no grouping to sort out.
// programmatic writes (presets, direction toggle, initial load) set an
// unformatted digit string instead of calling formatAmount, so no "." is ever
// introduced.
const amountDisplay = ref<string>(plainAmountString(amountInput.value))

function plainAmountString(value: number): string {
  return value > 0 ? String(value) : ''
}

// Fired only by the field's own input event (user typing) - never by
// programmatic changes to amountDisplay.value, which don't re-trigger this.
function onAmountTyped(raw: string): void {
  amountDisplay.value = raw
  amountInput.value = parseAmount(raw)
}

// Quick preset amounts the user can tap to fill the field.
const presetAmounts: readonly number[] = [100, 500, 1000, 5000]
const setPresetAmount = (value: number): void => {
  amountInput.value = value
  amountDisplay.value = plainAmountString(value)
  updateExchange()
}

// Quick currency-pair shortcuts (from -> to) as clickable chips.
interface CurrencyPair {
  from: string
  to: string
}
const currencyShortcuts: readonly CurrencyPair[] = [
  { from: 'USD', to: 'UYU' },
  { from: 'UYU', to: 'USD' },
  { from: 'USD', to: 'EUR' },
]
const applyCurrencyShortcut = (pair: CurrencyPair): void => {
  selectedCurrencyInput.value = pair.from
  selectedTargetCurrencyInput.value = pair.to
  updateExchange()
}
const isActiveShortcut = (pair: CurrencyPair): boolean =>
  selectedCurrency.value === pair.from && selectedTargetCurrency.value === pair.to

// Exchange house selector - 'best' means show best rate
const selectedExchangeHouseInput = ref(queryString(route.query.house) ?? 'best')
const selectedExchangeHouse = ref(selectedExchangeHouseInput.value)

// selectedCurrency, selectedTargetCurrency, and amount are refs, set manually on button click
const selectedCurrency = ref(selectedCurrencyInput.value)
const selectedTargetCurrency = ref(selectedTargetCurrencyInput.value)
const amount = ref(amountInput.value)

// The two currency selects can be cleared (their clear icon emits null). An empty currency is not
// a choice: the converter would copy it on the next tap and stop converting. Put the previous
// currency back instead (utils/homeConverter.ts, keepCurrency).
watch(selectedCurrencyInput, (next, previous) => {
  const kept = keepCurrency(next, previous, selectedCurrency.value || 'USD')
  if (kept !== next) selectedCurrencyInput.value = kept
})
watch(selectedTargetCurrencyInput, (next, previous) => {
  const kept = keepCurrency(next, previous, selectedTargetCurrency.value || 'UYU')
  if (kept !== next) selectedTargetCurrencyInput.value = kept
})
// Rounding helper (shared)
const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const round4 = (n: number) => {
  const num = Number(n)
  const rounded = Math.round((num + Number.EPSILON) * 10000) / 10000

  // Check if the number ends with repetitive 999s and round up appropriately
  const str = rounded.toString()
  if (str.includes('.')) {
    const parts = str.split('.')
    const decimal = parts[1]
    // If decimal part ends with 999 or 9999, round up to cleaner number
    if (decimal && /9{3,}$/.test(decimal)) {
      // For numbers ending in 999+ pattern, round up to the next clean number
      const wholePart = parseInt(parts[0] || '0', 10)
      const nineCount = decimal.match(/9+$/)?.[0].length || 0

      if (nineCount >= 3) {
        // Round up to next whole number or to 2 decimal places
        if (decimal.length === 4 && nineCount === 4) {
          // 99.9999 -> 100.00
          return wholePart + 1
        } else if (nineCount >= 3) {
          // 12.3999 -> 12.40, 45.0999 -> 45.10
          const cleanDecimal = decimal.substring(0, decimal.length - nineCount)
          const lastDigit = parseInt(cleanDecimal[cleanDecimal.length - 1] || '0', 10)
          const newDecimal = cleanDecimal.substring(0, cleanDecimal.length - 1) + (lastDigit + 1)
          return parseFloat(`${wholePart}.${newDecimal.padEnd(2, '0')}`)
        }
      }
    }
  }

  return rounded
}

const loading = ref<boolean>(false)
const initialLoading = ref<boolean>(true)
const realExchangeData = ref<any[]>([])
const availableCurrencies = ref<string[]>(['USD', 'ARS', 'BRL', 'EUR', 'UYU'])

// Online / presencial market view. `online` = you must hold an account at the
// institution (eBROU, bank TRANSFERENCIA, Prex, OCA); `presencial` = a counter
// anyone can walk up to, which INCLUDES the branch board of a bank.
// Initialised from the `canal` query param so the choice is shareable.
const channelFilter = ref<ExchangeChannelFilter>(normalizeChannelFilter(route.query.canal))

// Department view. A rate two departments away is noise for someone deciding
// where to walk today, so the whole market view can be narrowed to the houses
// that actually operate where the person is. `TODOS` = the whole country.
const ALL_DEPARTMENTS = 'TODOS'
const departmentFilter = ref<string>(normalizeDepartmentFilter(route.query.dep))

function normalizeDepartmentFilter(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : ALL_DEPARTMENTS
}

// Departments the live payload knows about, collapsed to one entry each: the
// houses spell four of them both with and without accents.
const departmentOptions = computed(() => {
  const raw: string[] = []
  for (const item of realExchangeData.value) {
    const depts = item.localData?.departments
    if (depts?.length) raw.push(...depts)
  }
  return [
    { title: t('departmentFilter.all'), value: ALL_DEPARTMENTS },
    ...dedupeDepartmentNames(raw).map(name => ({ title: titleCaseDepartment(name), value: name })),
  ]
})

// A `?dep=` that names no real department would otherwise pin the page to an
// empty market forever, with an empty state blaming a place that does not
// exist. Resolve it against the live list (slug-based, so `?dep=paysandu` and
// `?dep=PAYSANDÚ` both land), and fall back to the whole country if it is junk.
const reconcileDepartmentFilter = (options: typeof departmentOptions.value) => {
  if (options.length <= 1 || departmentFilter.value === ALL_DEPARTMENTS) return
  const match = options.find(
    o => o.value !== ALL_DEPARTMENTS && sameDepartment(o.value, departmentFilter.value)
  )
  departmentFilter.value = match ? match.value : ALL_DEPARTMENTS
}
watch(departmentOptions, reconcileDepartmentFilter)

/** `SAN JOSÉ` -> `San José`; the API stores departments uppercased. */
function titleCaseDepartment(name: string): string {
  return name
    .toLocaleLowerCase('es')
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase('es'))
}

// Every interactive list on the page (best-rates grid, top houses, house
// selector, converter) reads from this so the whole page reflects the active
// channel AND department consistently. The SSR headline/SEO rows use
// `sharedRealRows` instead and are intentionally left unfiltered — they must
// state the true market best for the country.
//
// Channel is matched per ROW (origin + type), not per origin: BROU quotes both
// a walk-in board (type '') and an account-only eBROU price, and they belong to
// different channels.
const filteredExchangeData = computed(() =>
  realExchangeData.value.filter(
    item =>
      matchesChannel(item.origin, item.type, channelFilter.value) &&
      (departmentFilter.value === ALL_DEPARTMENTS ||
        servesDepartment(
          item.origin,
          item.type,
          item.localData?.departments,
          departmentFilter.value
        ))
  )
)

/** True when the active filters left the selected house with nothing to show. */
const selectedHouseSurvivesFilters = () =>
  selectedExchangeHouse.value === 'best' ||
  filteredExchangeData.value.some(item => item.origin === selectedExchangeHouse.value)

/** Fall back to "best" when a specific house drops out of the active view. */
const dropSelectedHouseIfFilteredOut = () => {
  if (!selectedHouseSurvivesFilters()) {
    selectedExchangeHouse.value = 'best'
    selectedExchangeHouseInput.value = 'best'
  }
}

// Reconcile on data arrival too, not only on a filter click: a shared or
// hand-edited URL can carry an impossible combination (`?canal=presencial
// &house=prex` — a fintech has no counter quote), and the selector would sit
// on a house that contributes no rate to the page.
watch(filteredExchangeData, rows => {
  // An empty list means "not loaded yet", not "filtered to nothing"; dropping
  // the house then would clobber a perfectly good deep link on first paint.
  if (rows.length) dropSelectedHouseIfFilteredOut()
})

const trackChannel = useTrack()
// React to a channel change: drop a specific house that no longer has a quote
// in the active channel (falling back to "best"), re-run the converter against
// the filtered rows and reflect the choice in the URL.
const onChannelChange = (value: ExchangeChannelFilter | null) => {
  // VBtnToggle emits null when the active button is re-clicked; keep the value.
  channelFilter.value = normalizeChannelFilter(value)
  dropSelectedHouseIfFilteredOut()
  trackChannel('channel_filter', { channel: channelFilter.value })
  setConversionRate()
  updateQueryParams()
}

const onDepartmentChange = (value: string | null) => {
  departmentFilter.value = normalizeDepartmentFilter(value)
  dropSelectedHouseIfFilteredOut()
  trackChannel('department_filter', { department: departmentFilter.value })
  setConversionRate()
  updateQueryParams()
}

/** Any narrowing active? Drives the "showing a slice of the market" notice. */
const hasMarketFilter = computed(
  () => channelFilter.value !== 'all' || departmentFilter.value !== ALL_DEPARTMENTS
)

// Empty state: name whichever filter emptied the view, so "no results" is
// actionable instead of looking like the site is broken.
const marketFilterEmptyText = computed(() => {
  const dept = departmentFilter.value !== ALL_DEPARTMENTS
  if (dept && channelFilter.value !== 'all') {
    return t('marketFilter.emptyBoth', {
      department: titleCaseDepartment(departmentFilter.value),
      channel: t(`channelFilter.${channelFilter.value}`),
    })
  }
  if (dept) {
    return t('marketFilter.emptyDepartment', {
      department: titleCaseDepartment(departmentFilter.value),
    })
  }
  return channelFilter.value === 'online'
    ? t('channelFilter.emptyOnline')
    : t('channelFilter.emptyPresencial')
})

const resetMarketFilters = () => {
  channelFilter.value = 'all'
  departmentFilter.value = ALL_DEPARTMENTS
  setConversionRate()
  updateQueryParams()
}

// Popular currencies without flags - for autocomplete
const currencyOptions = computed(() => {
  return availableCurrencies.value.map(code => ({
    title: code ? code + ' - ' + t('codes.' + code) : '',
    value: code,
  }))
})

// Exchange house options for autocomplete
const exchangeHouseOptions = computed(() => {
  // Get unique exchange houses from the data
  const houses = new Map<string, { origin: string; name: string }>()

  filteredExchangeData.value.forEach(item => {
    if (item.localData?.name && !houses.has(item.origin)) {
      houses.set(item.origin, {
        origin: item.origin,
        name: item.localData.name,
      })
    }
  })

  // Create options array with "Best rate" as first option
  const options = [
    {
      title: t('bestRate'),
      value: 'best',
    },
    ...Array.from(houses.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(house => ({
        title: house.name,
        value: house.origin,
      })),
  ]

  return options
})

// Get the name of the selected exchange house
const selectedExchangeHouseName = computed(() => {
  if (selectedExchangeHouse.value === 'best') return t('bestRate')
  const option = exchangeHouseOptions.value.find(opt => opt.value === selectedExchangeHouse.value)
  return option?.title || selectedExchangeHouse.value
})

const topExchanges = computed(() => {
  if (!filteredExchangeData.value.length || !selectedCurrency.value) return []

  const currencyData = filteredExchangeData.value.filter(
    item =>
      (item.code === selectedCurrency.value || item.code === selectedTargetCurrency.value) &&
      item.localData?.name &&
      (item.buy > 0 || item.sell > 0)
  )

  if (currencyData.length === 0) return []

  // Determine if we're converting FROM or TO the selected currency
  const isConvertingFrom =
    selectedCurrency.value !== 'UYU' && selectedTargetCurrency.value === 'UYU'
  const isConvertingTo = selectedCurrency.value === 'UYU' && selectedTargetCurrency.value !== 'UYU'

  // Best first among the prices the site crowns (utils/marketOutlier.ts): sorted raw, "UYU → USD"
  // put the board frozen since July at 39,55 first while the converter above named another casa.
  // `type` is the house's side: what it pays (`buy`, the user sells) or charges (`sell`).
  const best = (code: string, type: 'buy' | 'sell') =>
    crownable(
      currencyData.filter(item => item.code === code),
      marketFor.value(code),
      code,
      type
    ).map(item => ({
      source: item.localData?.name || item.origin,
      rate: item[type],
      type,
      origin: item.origin,
      name: item.localData.name,
      code: item.code,
      isRegulated: item.localData.bcu || false,
    }))

  let rates = []
  if (isConvertingFrom) {
    // User is selling the selected currency (FROM currency TO UYU): highest buy first.
    rates = best(selectedCurrency.value, 'buy')
  } else if (isConvertingTo) {
    // User is buying the selected currency (FROM UYU TO currency): lowest sell first.
    rates = best(selectedTargetCurrency.value, 'sell')
  } else {
    // For other conversions, show mixed rates (4 buy + 4 sell)
    rates = [
      ...best(selectedCurrency.value, 'buy').slice(0, 4),
      ...best(selectedTargetCurrency.value, 'sell').slice(0, 4),
    ]
  }

  // Remove duplicates based on source name and type

  return rates.slice(0, 8)
})

// Steps for how it works
// Each step has its engraving: the coins and notes, the ledger, the board of an exchange
// house, and a casa in the Ciudad Vieja. The intrinsic sizes are the files' own.
const steps = computed<Step[]>(() => [
  {
    title: t('step1'),
    description: t('step1'),
    art: '/img/grabados/paso-monedas.webp',
    artWidth: 375,
    artHeight: 257,
  },
  {
    title: t('step2'),
    description: t('step2'),
    art: '/img/grabados/paso-monto.webp',
    artWidth: 389,
    artHeight: 266,
  },
  {
    title: t('step3'),
    description: t('step3'),
    art: '/img/grabados/paso-pizarra.webp',
    artWidth: 350,
    artHeight: 317,
  },
  {
    title: t('step4'),
    description: t('step4'),
    art: '/img/grabados/paso-casa.webp',
    artWidth: 331,
    artHeight: 400,
  },
])

// Features
const features = computed<Feature[]>(() => [
  {
    title: t('feature1Title'),
    description: t('feature1Description'),
    icon: 'mdi-clock-outline',
    color: 'green',
  },
  {
    title: t('feature2Title'),
    description: t('feature2Description'),
    icon: 'mdi-bank-outline',
    color: 'blue',
  },
  {
    title: t('feature3Title'),
    description: t('feature3Description'),
    icon: 'mdi-currency-usd',
    color: 'orange',
  },
  {
    title: t('feature4Title'),
    description: t('feature4Description'),
    icon: 'mdi-heart-outline',
    color: 'red',
  },
  {
    title: t('feature5Title'),
    description: t('feature5Description'),
    icon: 'mdi-api',
    color: 'indigo',
  },
  {
    title: t('feature6Title'),
    description: t('feature6Description'),
    icon: 'mdi-github',
    color: 'grey',
  },
])

// (removed) legacy helpers replaced by dual sections

// `ExchangeItem` is structurally a superset of `RateRow` (origin/code/buy/sell),
// so the pure conversion module consumes the live data directly.
const rateRows = computed<RateRow[]>(() => filteredExchangeData.value as RateRow[])

const conversionResult = ref({
  rate: 0,
  invertedRate: 0,
  convertedAmount: 0,
  reverseRate: 0,
  reverseReceiveAmount: 0,
})

// Inverted reverse rate helper (1 / reverseRate)
const reverseInvertedRate = computed(() =>
  conversionResult.value.reverseRate > 0 ? 1 / conversionResult.value.reverseRate : 0
)

// Dual conversion: forward (from -> to) and reverse-needed (how much of target to sell to get the entered amount)
const dualConversion = ref({
  forwardToAmount: 0,
  reverseNeededAmount: 0,
})

// UI direction: forward (left->right) vs reverse (right->left)
const isForward = ref(true)
// Initialize from query param dir=f|r (defaults to forward); the saved form, in onMounted
if (typeof route.query.dir === 'string') {
  const lower = route.query.dir.toLowerCase()
  isForward.value = !(lower === 'r' || lower === 'reverse' || lower === '0' || lower === 'false')
}
// We keep the right-hand amount constant across direction toggles
const desiredRightAmount = ref(0)
// High-precision right-hand amount to avoid toggle rounding drift
const desiredRightAmountRaw = ref(0)
// Left-side needed when we are in reverse (buying on left to receive desiredRightAmount on right)
const leftForReverse = ref(0)

// Conversion result computed property
const setConversionRate = (preserveRightAmount = false) => {
  // Core forward/reverse math comes from the pure util (unit-tested).
  // Judged against the whole market: a department or a channel alone is too few boards to tell
  // a frozen one (utils/marketOutlier.ts).
  const core = convertAmount(
    rateRows.value,
    Number(amount.value),
    selectedCurrency.value,
    selectedTargetCurrency.value,
    selectedExchangeHouse.value,
    realExchangeData.value as RateRow[]
  )
  const rate = core.rate
  const reverseRate = core.reverseRate
  const rawConvertedAmount = Number(amount.value) * rate
  conversionResult.value = {
    rate,
    invertedRate: core.invertedRate,
    convertedAmount: core.convertedAmount,
    reverseRate,
    reverseReceiveAmount: round2(Number(amount.value) * reverseRate),
  }
  // Forward amount (entered amount converted to target)
  dualConversion.value.forwardToAmount = conversionResult.value.convertedAmount
  // Market/filter updates recalculate the displayed figure too. Preserve it
  // only when the user flips direction (which adjusts the left amount).
  if (!preserveRightAmount || desiredRightAmountRaw.value <= 0) {
    desiredRightAmountRaw.value = isForward.value
      ? rawConvertedAmount
      : reverseRate > 0
        ? Number(amount.value) / reverseRate
        : 0
    desiredRightAmount.value = round2(desiredRightAmountRaw.value)
  }
  // Reverse summary:
  // - In forward mode: target to sell to get the entered left amount
  // - In reverse mode: show the fixed right-hand amount (avoid double rounding)
  if (reverseRate > 0) {
    const reverseNeeded = isForward.value
      ? Number(amount.value) / reverseRate
      : desiredRightAmountRaw.value > 0
        ? desiredRightAmountRaw.value
        : Number(amount.value) / reverseRate
    dualConversion.value.reverseNeededAmount = round2(reverseNeeded)
  } else {
    dualConversion.value.reverseNeededAmount = 0
  }
  // end setConversionRate

  // - leftForReverse display depends on direction
  if (isForward.value) {
    // Forward: show how much you'd get on the left if you sell the right amount
    leftForReverse.value = reverseRate > 0 ? round2(desiredRightAmountRaw.value * reverseRate) : 0
  } else {
    // Reverse: show exactly the desired left amount the user is targeting
    leftForReverse.value = round2(Number(amount.value))
  }
}

// UI text helpers
const reverseHintText = computed(() =>
  t('quickExchangeReverseHint', {
    // Use left-hand amount for the message; in reverse it's leftForReverse
    amount: formatCurrency(isForward.value ? amount.value : leftForReverse.value),
    from: selectedCurrency.value,
    to: selectedTargetCurrency.value,
  })
)

// (removed) legacy combined list replaced by intent-ordered dual lists

// Subject currency is the non-UYU currency among from/to; user intent flags
const subjectCode = computed(() => {
  if (selectedCurrency.value !== 'UYU' && selectedCurrency.value) return selectedCurrency.value
  if (selectedTargetCurrency.value !== 'UYU' && selectedTargetCurrency.value)
    return selectedTargetCurrency.value
  return 'USD' // default fallback for UI; hidden by v-if if no data
})

// User intent for the subject currency (sell vs buy) that flips with arrow direction
// - If forward and FROM is subject (to UYU): selling subject
// - If forward and TO is subject (from UYU): buying subject
// - Reverse inverts the intent
const intentIsSellingSubject = computed(() => {
  const subj = subjectCode.value
  if (!subj) return false
  const fromIsSubject = selectedCurrency.value === subj
  const toIsSubject = selectedTargetCurrency.value === subj
  if (!fromIsSubject && !toIsSubject) return false
  return isForward.value ? fromIsSubject : !fromIsSubject
})

const hasConversionRate = computed(() =>
  isForward.value ? conversionResult.value.rate > 0 : conversionResult.value.reverseRate > 0
)

// All house comparisons use the same quantity of the foreign currency, whichever side of the
// converter holds the pesos.
const comparisonSubjectAmount = computed(() => {
  if (!hasConversionRate.value) return 0
  if (selectedCurrency.value === subjectCode.value && selectedTargetCurrency.value === 'UYU') {
    return Number(amount.value)
  }
  if (selectedTargetCurrency.value === subjectCode.value && selectedCurrency.value === 'UYU') {
    return desiredRightAmount.value
  }
  return 0
})

/** The side the ranking crowns: selling dollars, the houses' buy price. */
const rankedSide = computed<'buy' | 'sell'>(() => (intentIsSellingSubject.value ? 'buy' : 'sell'))

// How many boards of this currency the ranking leaves out (the site's one crown rule,
// utils/marketOutlier.ts), so the reader is told rather than left to wonder.
const recommendationExcludedCount = computed(() => {
  const code = subjectCode.value
  const side = rankedSide.value
  const items = filteredExchangeData.value.filter(
    row => row.code === code && row.localData?.name && (row[side] ?? 0) > 0
  )
  if (!items.length) return 0
  return items.length - crownable(items, marketFor.value(code), code, side).length
})

const selectedHouseQuote = computed(() => {
  if (selectedExchangeHouse.value === 'best') return null
  const side = rankedSide.value
  return (
    filteredExchangeData.value
      .filter(
        row =>
          row.origin === selectedExchangeHouse.value &&
          row.code === subjectCode.value &&
          (row[side] ?? 0) > 0
      )
      .sort((a, b) => (side === 'buy' ? b.buy - a.buy : a.sell - b.sell))[0] ?? null
  )
})
const selectedQuoteFrozen = computed(() => {
  const row = selectedHouseQuote.value
  return row ? frozenFor(row.origin, row.code, row.type) : null
})
const selectedQuoteOffMarket = computed(() => {
  const row = selectedHouseQuote.value
  if (!row) return false
  return !crownable([row], marketFor.value(row.code), row.code, rankedSide.value).length
})

// Savings of the best rate vs. the market average for the subject currency.
// Only meaningful when one side is UYU and there are >= 2 quotes to average.
const savingsInfo = computed(() =>
  currencyAmountSavings(
    rateRows.value,
    subjectCode.value,
    comparisonSubjectAmount.value,
    intentIsSellingSubject.value ? 'sell' : 'buy',
    realExchangeData.value as RateRow[]
  )
)
const showSavings = computed(
  () =>
    savingsInfo.value.savings > 0 &&
    selectedExchangeHouse.value === 'best' &&
    (selectedCurrency.value === 'UYU' || selectedTargetCurrency.value === 'UYU')
)
const savingsText = computed(() =>
  t('quickExchangeSavings', {
    amount: formatCurrency(savingsInfo.value.savings),
  })
)

// Copy-result-to-clipboard with a confirmation snackbar.
const copySnackbar = ref(false)
// The headline converted figure currently shown on the right side.
const copyResult = async (): Promise<void> => {
  const text = formatCurrency(desiredRightAmount.value)
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    }
    copySnackbar.value = true
  } catch (e) {
    console.error('Clipboard copy failed:', e)
  }
}

// The prices the site refuses to crown (utils/marketOutlier.ts) are judged on the whole market of
// each currency, one board per house, one side at a time: the "best to buy" list put the board
// frozen since July at 39,55 first (2026-11-11), and a department or a channel alone is too few
// boards to tell.
const marketFor = computed(() => {
  const cache = new Map<string, ReturnType<typeof quotesForCurrency>>()
  return (code: string) => {
    if (!cache.has(code)) {
      cache.set(code, quotesForCurrency(realExchangeData.value as any, code as CurrencyCode))
    }
    return cache.get(code)!
  }
})

// Build top 4 lists for subject currency: sell (houses buy) and buy (houses sell)
const top4SellRatesForSubject = computed(() => {
  if (!filteredExchangeData.value.length || !subjectCode.value) return []
  const code = subjectCode.value
  const items = filteredExchangeData.value.filter(
    item => item.code === code && item.localData?.name
  )
  return crownable(items, marketFor.value(code), code, 'buy')
    .slice(0, 4)
    .map(item => ({
      origin: item.origin,
      source: item.localData?.name || item.origin,
      rate: item.buy,
      // La punta importa: una casa puede tener el mostrador quieto y el eBROU moviendose.
      type: item.type || '',
    }))
})

const top4BuyRatesForSubject = computed(() => {
  if (!filteredExchangeData.value.length || !subjectCode.value) return []
  const code = subjectCode.value
  const items = filteredExchangeData.value.filter(
    item => item.code === code && item.localData?.name
  )
  return crownable(items, marketFor.value(code), code, 'sell')
    .slice(0, 4)
    .map(item => ({
      origin: item.origin,
      source: item.localData?.name || item.origin,
      rate: item.sell,
      type: item.type || '',
    }))
})

// Primary/secondary intent-ordered lists and titles
const primaryRatesForSubject = computed(() =>
  intentIsSellingSubject.value ? top4SellRatesForSubject.value : top4BuyRatesForSubject.value
)
const secondaryRatesForSubject = computed(() =>
  intentIsSellingSubject.value ? top4BuyRatesForSubject.value : top4SellRatesForSubject.value
)
const primaryTitle = computed(() =>
  intentIsSellingSubject.value
    ? `${t('bestToSell')} ${subjectCode.value}`
    : `${t('bestToBuy')} ${subjectCode.value}`
)
const secondaryTitle = computed(() =>
  intentIsSellingSubject.value
    ? `${t('bestToBuy')} ${subjectCode.value}`
    : `${t('bestToSell')} ${subjectCode.value}`
)

// Swap currencies function
const swapCurrencies = () => {
  const temp = selectedCurrencyInput.value
  selectedCurrencyInput.value = selectedTargetCurrencyInput.value
  selectedTargetCurrencyInput.value = temp
}

// Methods
// One shared Intl.NumberFormat (utils/homeConverter.ts): the page built a new one on every call,
// ~15 per render, and each converter tap re-renders the whole page.
const formatCurrency = formatUyuCurrency

// Function to update query parameters
const updateQueryParams = () => {
  const query: Record<string, string | undefined> = {
    from: selectedCurrency.value,
    to: selectedTargetCurrency.value,
    amount: amount.value.toString(),
    dir: isForward.value ? undefined : 'r',
    house: selectedExchangeHouse.value === 'best' ? undefined : selectedExchangeHouse.value,
    canal: channelFilter.value === 'all' ? undefined : channelFilter.value,
    dep: departmentFilter.value === ALL_DEPARTMENTS ? undefined : departmentFilter.value,
  }

  // In place, not through the router: a `router.push` per tap recomputed every RouterLink of the
  // page, ran the route hooks and left one history entry per amount tried (utils/historyQuery.ts).
  // Nothing on this page reads `route.query` after setup. It does nothing when the URL already
  // says the same.
  replaceQueryInPlace(query)
}

// Apply the shared exchange dataset to the calculator's local state.
const applyExchangeData = (data: ExchangeItem[]) => {
  // Quote only public-obtainable rates: drop the BCU reference and the
  // interbank/wholesale types (INTERBANCARIO/PROMED.FONDO/CABLE) for every
  // currency — nobody can transact at those.
  realExchangeData.value = publicRates(data)

  // Extract available currencies, always including UYU (the base currency).
  const currencies = new Set<string>()
  data.forEach(item => currencies.add(item.code))
  currencies.add('UYU')
  availableCurrencies.value = Array.from(currencies).sort()

  setConversionRate()
}

// Drive the calculator off the shared `useExchangeRates` fetch: populate when
// the rows arrive, and stop the loading state once the fetch settles (even if
// it returned empty, matching the previous error/finally behavior).
watch(
  [sharedRows, sharedPending] as const,
  ([rows, pending]) => {
    if (rows?.length || !pending) applyExchangeData((rows ?? []) as unknown as ExchangeItem[])
    if (!pending) initialLoading.value = false
  },
  { immediate: true }
)

// On the server that immediate watcher runs exactly once, and it ran before the rates request
// finished whenever that request was the slowest of the render (the three awaited useFetch above
// are other, faster endpoints): the edge-cached HTML then shipped the "Cargando..." spinner, no
// best-rate grid and none of the /historico links, and hydration swapped the whole card. Wait for
// the rows before rendering and apply them the same way the browser will on hydration — the two
// data watchers above (department spelling, a house the filters drop) run in the browser before
// the hydrating render, and a server watcher never re-runs, so they are applied here too.
onServerPrefetch(async () => {
  await ratesReady()
  applyExchangeData((sharedRows.value ?? []) as unknown as ExchangeItem[])
  reconcileDepartmentFilter(departmentOptions.value)
  if (filteredExchangeData.value.length) dropSelectedHouseIfFilteredOut()
  initialLoading.value = false
})

// Add cleanup to prevent memory leaks
onBeforeUnmount(() => {
  // Clear large data arrays to help garbage collection
  if (realExchangeData.value.length > 0) {
    realExchangeData.value = []
  }
  if (availableCurrencies.value.length > 0) {
    availableCurrencies.value = []
  }
})

const trackConvert = useTrack()

// The arithmetic half of a conversion: copy the form into the applied state and recompute. No
// tracking, no URL, no storage — restoring the saved form on mount uses it too, and that is not a
// conversion the visitor asked for.
const applyForm = () => {
  selectedCurrency.value = selectedCurrencyInput.value
  selectedTargetCurrency.value = selectedTargetCurrencyInput.value
  selectedExchangeHouse.value = selectedExchangeHouseInput.value
  amount.value = Number(amountInput.value) || 0
  setConversionRate()
  // Preserve the shown result when inverted; only reset desiredRightAmount in forward mode
  if (isForward.value) {
    // Recompute desiredRight using high precision to avoid future drift
    const r = conversionResult.value.rate
    desiredRightAmountRaw.value = amount.value * r
    desiredRightAmount.value = round2(desiredRightAmountRaw.value)
  } else {
    // Reverse mode: the input amount represents the left-side desired amount (e.g., USD to obtain)
    const rr = conversionResult.value.reverseRate
    if (rr > 0) {
      // Compute the right-side amount needed to obtain the left amount
      desiredRightAmountRaw.value = Number(amount.value) / rr
      desiredRightAmount.value = round2(desiredRightAmountRaw.value)
    } else {
      desiredRightAmountRaw.value = 0
      desiredRightAmount.value = 0
    }
    // Show exactly the entered left amount on the left side
    leftForReverse.value = round2(amount.value)
  }
}

const updateExchange = () => {
  loading.value = true
  applyForm()
  updateQueryParams()
  // GA4: the converter is the core feature — track usage (currencies + whether a
  // specific house was picked) to see what people actually look up. The payload is read now; the
  // gtag call and the localStorage write wait for the next task, out of the tap, so the browser
  // paints the result first (each ran inside the click handler of a 1,072 ms tap at 4x CPU).
  const converted = {
    from: selectedCurrency.value,
    to: selectedTargetCurrency.value,
    house: selectedExchangeHouse.value || 'best',
  }
  setTimeout(() => {
    trackConvert('convert', converted)
    saveFormData()
  }, 0)
  setTimeout(() => {
    loading.value = false
  }, 200)
}

// Toggle display direction and update input to reflect reverse semantics
const toggleDirection = () => {
  isForward.value = !isForward.value
  // Keep the right amount fixed; recompute left based on direction
  if (!isForward.value) {
    // Selling on right to buy on left: left obtained = desiredRightAmount * reverseRate
    const r = conversionResult.value.reverseRate
    if (r > 0) {
      amount.value = round4(desiredRightAmountRaw.value * r)
    } else {
      amount.value = 0
    }
    amountInput.value = amount.value
  } else {
    // Selling on left to buy on right (forward): left is the amount needed to receive desiredRightAmount
    const r = conversionResult.value.rate
    if (r > 0) {
      amount.value = round4(desiredRightAmountRaw.value / r)
    } else {
      amount.value = 0
    }
    amountInput.value = amount.value
  }
  amountDisplay.value = plainAmountString(amountInput.value)
  setConversionRate(true)
  // Reflect current direction in the URL
  updateQueryParams()
  // Save form data to localStorage, out of the tap (a swap is not a conversion: no GA4 event)
  setTimeout(saveFormData, 0)
}

// Apply the form saved in this browser, for every field the URL does not set. Only after mount:
// reading it during setup made a returning visitor's first render differ from the shared server
// HTML. Not a conversion: no `convert` event and no URL write.
const restoreStoredForm = () => {
  const stored = getStoredFormData()
  if (!stored) return
  let changed = false
  if (
    queryString(route.query.from) === undefined &&
    stored.from &&
    stored.from !== selectedCurrencyInput.value
  ) {
    selectedCurrencyInput.value = stored.from
    changed = true
  }
  if (
    queryString(route.query.to) === undefined &&
    stored.to &&
    stored.to !== selectedTargetCurrencyInput.value
  ) {
    selectedTargetCurrencyInput.value = stored.to
    changed = true
  }
  if (queryAmount() === null && stored.amount > 0 && stored.amount !== amountInput.value) {
    amountInput.value = stored.amount
    amountDisplay.value = plainAmountString(stored.amount)
    changed = true
  }
  if (
    queryString(route.query.house) === undefined &&
    stored.exchangeHouse &&
    stored.exchangeHouse !== selectedExchangeHouseInput.value
  ) {
    selectedExchangeHouseInput.value = stored.exchangeHouse
    changed = true
  }
  if (typeof route.query.dir !== 'string' && typeof stored.dir === 'boolean') {
    changed ||= isForward.value !== stored.dir
    isForward.value = stored.dir
  }
  if (!changed) return
  applyForm()
  // A saved house that no longer quotes in the active view falls back to "best", as it did when
  // the saved form was read before the rates arrived.
  if (filteredExchangeData.value.length) dropSelectedHouseIfFilteredOut()
}
onMounted(restoreStoredForm)

// SEO Configuration - Comprehensive JSON-LD Schema Markup
// The day of the server render, from `renderedAt` (payload). `/` is cached at the edge for an
// hour, so HTML rendered at 23:30 UTC hydrates after midnight: with `new Date()` here the WebPage
// block read another day, unhead could not match the server's <script> and appended a second one
// (see pages/cotizacion/[moneda].vue and tests/unit/headHydrationParity.test.ts).
const currentDate = new Date(renderedAt).toISOString().split('T')[0]

// 1. WebApplication Schema
const webApplicationSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: t('seo.homeTitle'),
  description: t('seo.homeDescription'),
  url: 'https://cambio-uruguay.com',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'All',
  browserRequirements: 'HTML5, CSS3, JavaScript',
  softwareVersion: '3.0',
  inLanguage: ['es', 'en', 'pt'],
  // No `offers` block. A free comparison site sells nothing, and an Offer with
  // price 0 + InStock made this the only rich result the site earned: a Product
  // snippet (11,852 impressions, 0.07% CTR) advertising a $0 price on currency
  // queries. It is also a Merchant-listing eligibility trap.
  author: {
    '@type': 'Person',
    name: 'Eduardo Airaudo',
    url: 'https://www.linkedin.com/in/eairaudo/',
    jobTitle: 'Founder & Developer',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Cambio Uruguay',
    url: 'https://cambio-uruguay.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://cambio-uruguay.com/img/logo.png',
    },
    sameAs: [
      'https://twitter.com/cambio_uruguay',
      'https://www.linkedin.com/company/cambio-uruguay/',
      'https://github.com/eduair94/cambio-uruguay',
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Montevideo',
      addressLocality: 'Montevideo',
      addressRegion: 'Montevideo',
      postalCode: '11000',
      addressCountry: 'UY',
    },
  },
  featureList: [
    'Cotización del dólar en Uruguay en tiempo real',
    'Comparación de más de 40 casas de cambio',
    'Cotizaciones de compra y venta actualizadas cada 10 minutos',
    'Histórico de cotizaciones con gráficos',
    'Directorio de sucursales con ubicación en mapa',
    'Análisis de mercado con inteligencia artificial',
    'API REST para desarrolladores',
  ],
  screenshot: 'https://cambio-uruguay.com/img/banner.png',
  // NOTE: a self-declared aggregateRating (4.8 / 150) was removed here. Google's
  // structured-data policy disallows self-serving ratings not backed by verifiable
  // on-page reviews and can trigger a manual action. Re-add only when sourced from a
  // real provider (e.g. live Trustpilot count via widget/API), never hardcoded.
}))

// 2. BreadcrumbList Schema. Single entry: the home page has no parent to
// list, and a 2-item list pointing both entries at the same URL is an
// invalid/duplicate breadcrumb per Google's structured-data guidance.
const breadcrumbSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Inicio',
      item: 'https://cambio-uruguay.com',
    },
  ],
}))

// 4. CurrencyConversionService Schema (FinancialProduct subtype)
const currencyServiceSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Cotización del Dólar en Uruguay Hoy',
  description: t('seo.homeDescription'),
  url: 'https://cambio-uruguay.com',
  dateModified: currentDate,
  datePublished: '2023-01-01',
  inLanguage: 'es',
  isPartOf: {
    '@type': 'WebSite',
    name: 'Cambio Uruguay',
    url: 'https://cambio-uruguay.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://cambio-uruguay.com/buscar?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  },
  mainEntity: {
    '@type': 'FinancialProduct',
    name: 'Servicio de Comparación de Cotizaciones de Cambio',
    description:
      'Comparador de cotizaciones del dólar y divisas en Uruguay. Más de 40 casas de cambio comparadas en tiempo real.',
    provider: {
      '@type': 'Organization',
      name: 'Cambio Uruguay',
      url: 'https://cambio-uruguay.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://cambio-uruguay.com/img/logo.png',
      },
      sameAs: [
        'https://twitter.com/cambio_uruguay',
        'https://www.linkedin.com/company/cambio-uruguay/',
        'https://github.com/eduair94/cambio-uruguay',
      ],
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Montevideo',
        addressLocality: 'Montevideo',
        addressRegion: 'Montevideo',
        postalCode: '11000',
        addressCountry: 'UY',
      },
    },
    areaServed: {
      '@type': 'Country',
      name: 'Uruguay',
      sameAs: 'https://es.wikipedia.org/wiki/Uruguay',
    },
    serviceType: 'Currency Exchange Rate Comparison',
    category: 'Currency Exchange',
  },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: [
      '.hero-title',
      '.hero-subtitle',
      '.hero-description',
      '.hero-answer',
      '.faq-section',
    ],
  },
}))

// 5. ExchangeRateSpecification for live rates (dynamic).
//
// Derived from `sharedRealRows` (a computed over the blocking useAsyncData) and
// NOT from `realExchangeData`, which a watcher fills — a watcher has not run by
// the time the server renders the head, so this schema silently never shipped.
// `dateModified` is the scrape timestamp the API returns, never `new Date()`:
// claiming freshness the data does not have is worse than claiming none.
const exchangeRateSchema = computed(() => {
  const sell = usdBestSell.value
  const buy = usdBestBuy.value
  if (sell === null || buy === null) return null

  // Latest scrape timestamp the API reported. Never `new Date()`: claiming a
  // freshness the data does not have is worse than claiming none.
  const dates = sharedRealRows.value
    .filter(r => r.code === 'USD' && r.date)
    .map(r => new Date(r.date as string).getTime())
    .filter(Number.isFinite)

  return {
    '@context': 'https://schema.org',
    '@type': 'ExchangeRateSpecification',
    name: 'Cotización del Dólar en Uruguay',
    url: 'https://cambio-uruguay.com',
    currency: 'USD',
    // The best price to BUY a dollar — the lowest sell across the casas, which
    // is the number the headline above renders as "se vende desde $X".
    currentExchangeRate: {
      '@type': 'UnitPriceSpecification',
      price: sell,
      priceCurrency: 'UYU',
      unitText: 'Venta',
    },
    // No `exchangeRateSpread`. It means one broker's own bid-ask gap; across an
    // aggregate of 40 houses the cheapest seller and the highest buyer are
    // different casas, so best-sell minus best-buy is cross-house arbitrage and
    // routinely goes negative (today: 39,55 − 40,20 = −0,65).
    ...(dates.length ? { dateModified: new Date(Math.max(...dates)).toISOString() } : {}),
  }
})

// Dataset schema — positions the site as a structured data source (rich results
// + AI/GEO citations). Static so it is always present in SSR HTML.
const datasetSchema = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Cotizaciones de casas de cambio en Uruguay',
  description:
    'Cotizaciones de compra y venta del dólar, euro, real y peso argentino en más de 40 casas de cambio y bancos de Uruguay, actualizadas cada 10 minutos. Datos basados en el registro oficial del Banco Central del Uruguay (BCU).',
  url: 'https://cambio-uruguay.com',
  keywords: [
    'cotización dólar Uruguay',
    'casas de cambio Uruguay',
    'tipo de cambio Uruguay',
    'dólar BROU',
    'precio del dólar',
  ],
  isAccessibleForFree: true,
  creator: {
    '@type': 'Organization',
    name: 'Cambio Uruguay',
    url: 'https://cambio-uruguay.com',
  },
  spatialCoverage: { '@type': 'Place', name: 'Uruguay' },
  distribution: [
    {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: 'https://api.cambio-uruguay.com/',
    },
  ],
}

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(webApplicationSchema.value)),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(datasetSchema),
    },
    {
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(breadcrumbSchema.value)),
    },
    {
      key: 'home-webpage-jsonld',
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(currencyServiceSchema.value)),
    },
    // Reactive, like its siblings above. A `...(schema.value ? [...] : [])`
    // spread is evaluated once, during synchronous setup — before useAsyncData
    // resolves — so on the server it always collapsed to [] and this schema
    // never reached Googlebot. Empty string only when the API returned nothing.
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        exchangeRateSchema.value ? JSON.stringify(exchangeRateSchema.value) : ''
      ),
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: 'https://cambio-uruguay.com',
    },
  ],
})

// Un solo formato para las dos cifras del head. Lo comparten el título y la
// descripción a propósito: son la misma pregunta contestada dos veces en el mismo
// snippet, y si cada una redondeara por su cuenta el resultado se contradiría solo.
//
// El separador SÍ sigue al idioma. La descripción en castellano escribe "$40,65", igual que la
// pizarra y la imagen OG; pero servir esa misma coma en /en da "$40,65", que un lector anglo lee
// como cuarenta mil seiscientos cincuenta. Portugués comparte la coma con el castellano.
const fmtRate = (value: number) =>
  value.toLocaleString(dateLocale(locale.value), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

/**
 * Meta description carrying today's two numbers.
 *
 * The home is the site's biggest surface in Search Console — 127.897
 * impressions at position 8,8 — and converts 0,41% of them. Every page here
 * whose description states the actual buy/sell runs 3–4× that CTR from the same
 * positions, and the home was the last big one still shipping a static sentence.
 *
 * Falls back to the translated copy whenever the market payload is missing, so
 * an upstream outage degrades to the old description rather than to a stub.
 *
 * La plantilla vive en i18n (`seo.homeDescriptionLive`), como el título. Estuvo escrita acá en
 * castellano y /en y /pt la servían tal cual —"se vende desde $40.63" en la página inglesa, con
 * un "$" pelado que un lector anglo toma por dólares—, y decía "Datos del BCU" cuando las cifras
 * son las pizarras de las casas: el BCU no publica la cotización de ninguna. Cada idioma pone su
 * símbolo y entra en 160 con cifras de tres dígitos (`homeDescriptionLive.test.ts`).
 */
const homeDescription = computed(() => {
  if (usdBestSell.value === null || usdBestBuy.value === null) return t('seo.homeDescription')
  return t('seo.homeDescriptionLive', {
    sell: fmtRate(usdBestSell.value),
    buy: fmtRate(usdBestBuy.value),
    count: usdQuotes.value.length,
  })
})

/**
 * El título también lleva las cifras de hoy, no sólo la descripción.
 *
 * La home junta 126.314 impresiones a 0,18% de CTR en posición 9,55 y Search Console la marca
 * en BAJA (−88 clics). Google la puso en "dolar hoy" —de 2.652 a 31.786 impresiones en dos
 * meses— y contestaba con un genérico de 35 caracteres sin una sola cifra, teniendo los números
 * renderizados en el servidor y publicados en la descripción de acá arriba desde siempre. Es la
 * misma lección que 65f2aa5 dejó en /indicadores: el valor es lo que gana el clic.
 *
 * VA UNA SOLA CIFRA, y es la de venta. Con las dos —"venta $40,65 y compra $40,00"— el título se
 * lee como la pizarra de UNA casa, y no lo es: son el mínimo de venta y el máximo de compra de ~40
 * casas distintas, que es justo lo que dice la descripción con "desde" y "hasta". Poner esos dos
 * calificadores en el título son 66 caracteres y no entran, y sin ellos el par puede además salir
 * cruzado (el que vende más barato no tiene por qué ser el que compra más caro) y quedar absurdo.
 * El que busca "dolar hoy" quiere a cuánto lo consigue: una cifra bien encuadrada gana más clics
 * que dos ambiguas. La comparación entre casas la cuenta la descripción, que Google muestra debajo.
 *
 * Entra en 52 con el " | Cambio Uruguay" que agrega el titleTemplate de app.vue, muy por debajo del
 * corte del SERP; la marca NO va en el mensaje (el "|" de un mensaje de i18n es el separador de
 * plurales y t() se come todo lo que venga después — es el bug que este título tuvo desde febrero).
 *
 * LA GUARDA: la cifra sale de `usdBestSell`, la MISMA que arma la descripción, así que las dos
 * mitades del snippet no pueden discrepar; y cuando la lectura no vino (SSR sin payload, API caída)
 * vuelve al título traducido en vez de estampar un "$ NaN", que es peor que el genérico.
 */
const homeTitle = computed(() => {
  if (usdBestSell.value === null) return t('seo.homeTitle')
  // El símbolo vive en el mensaje, como en `seo.historicalDetailDescriptionLive`: acá va la cifra
  // sola para que cada idioma ponga el suyo — "$" en castellano, "$U" en /en y /pt, donde un "$"
  // pelado se lee como dólar y el número es en pesos uruguayos.
  return t('seo.homeTitleLive', { sell: fmtRate(usdBestSell.value) })
})

useSeoMeta({
  title: () => homeTitle.value,
  description: () => homeDescription.value,
  keywords: () => t('seo.homeKeywords'),
  ogTitle: () => homeTitle.value,
  ogDescription: () => homeDescription.value,
  ogType: 'website',
  ogUrl: 'https://cambio-uruguay.com',
  ogLocale: 'es_UY',
  ogLocaleAlternate: ['en_US', 'pt_BR'],
  twitterCard: 'summary_large_image',
  twitterTitle: () => homeTitle.value,
  // La misma descripción viva que `description`/`ogDescription`, no la estática. Estaba escrita a
  // mano con `t('seo.homeDescription')` mientras sus dos hermanas ya usaban `homeDescription`, así
  // que la tarjeta de X/Twitter era la única superficie del sitio que seguía anunciando la home sin
  // el precio del día — justo la cifra por la que se hizo el cambio. El fallback lo trae
  // `homeDescription`, que vuelve al texto traducido si no llegó la lectura del mercado.
  twitterDescription: () => homeDescription.value,
})
</script>

<style scoped>
/* ============================================================
   Cambio Uruguay — Home. "La Mesa de Mercado" (DESIGN.md): one calm
   canvas, the figures in front, and the only ornament an engraving
   in the manner of a banknote vignette (public/img/grabados/), drawn
   in the theme's own link ink. No aurora, no glass, no gradient text:
   the design system bans all three, and the home had all three.
   Converter-internal rules (inputs, chips, result, best-rates) are
   preserved further down.
   ============================================================ */
.home-container {
  position: relative;
  min-height: 100vh;
  /* Design tokens (dark values; the light theme block at the end redefines them) */
  --ink: #f2f5fb;
  --ink-soft: #b3bdcc;
  --ink-muted: #818da0;
  --hairline: rgba(255, 255, 255, 0.1);
  --surface: #121a2e;
  --tint: rgba(255, 255, 255, 0.03);
  --engraving-ink: rgb(100, 181, 246);
  --good: #2bd47d;
  --radius-lg: 16px;
  --radius-md: 12px;
  --section-pad: clamp(56px, 8vw, 104px);

  background-color: rgb(var(--v-theme-background));
}

/* ---- Hero ---- */
/* The hero used to paint an indigo spotlight here (and before that a `::before` sized in percent
   of the hero, CLS 0.78 on a phone). The only ornament now is `.hero-engraving`, an element of its
   own whose box is set in px from the hero's top, so a taller or shorter hero never moves it. */
.hero-section {
  position: relative;
  overflow: hidden;
  padding-top: clamp(20px, 4vw, 48px);
}

/* La Rambla, engraved. The file is ink-only alpha (navy lines, transparent paper), used as a MASK
   over the theme's link ink, so one asset serves both themes. On a phone it is a band behind the
   "Dólar hoy" row, under the trust line; from 600 px it moves right so the Palacio Salvo stands at
   about 80 % of the width, below the title, and a second, linear mask clears the middle third where
   the figures sit. Every coordinate is px from the hero's top. */
.hero-engraving {
  position: absolute;
  z-index: 0;
  left: 0;
  right: 0;
  top: 420px;
  height: 220px;
  pointer-events: none;
  background-color: var(--engraving-ink);
  opacity: 0.14;
  -webkit-mask-image: url('/img/grabados/rambla-800.webp');
  mask-image: url('/img/grabados/rambla-800.webp');
  -webkit-mask-size: auto 100%;
  mask-size: auto 100%;
  -webkit-mask-position: calc(50% + 40px) bottom;
  mask-position: calc(50% + 40px) bottom;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

@media (min-width: 600px) {
  .hero-engraving {
    top: 300px;
    height: 320px;
    opacity: 0.2;
    -webkit-mask-image:
      url('/img/grabados/rambla.webp'),
      linear-gradient(90deg, #000 0 16%, transparent 32% 66%, #000 76% 100%);
    mask-image:
      url('/img/grabados/rambla.webp'),
      linear-gradient(90deg, #000 0 16%, transparent 32% 66%, #000 76% 100%);
    -webkit-mask-size:
      auto 100%,
      100% 100%;
    mask-size:
      auto 100%,
      100% 100%;
    -webkit-mask-position:
      calc(50% + 240px) bottom,
      0 0;
    mask-position:
      calc(50% + 240px) bottom,
      0 0;
    -webkit-mask-composite: source-in;
    mask-composite: intersect;
  }
}

@media (min-width: 960px) {
  .hero-engraving {
    top: 280px;
    height: 360px;
  }
}

.min-height-hero {
  min-height: auto;
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: 0 auto;
}

/* Staggered hero entrance — pure CSS so it runs on first paint (SSR-safe, no
   hydration mismatch, never leaves content stuck hidden). Reduced-motion is
   handled globally in critical.css. */
.hero-anim {
  animation: fadeInUp 0.6s ease-out both;
}

/* The H1 and the subtitle are the LCP candidates: they rise but never start transparent, so the
   largest paint is the first paint (it waited for the fade: 1,388 ms against a load of 810). */
.hero-title.hero-anim {
  animation-name: heroRise;
  animation-delay: 0.12s;
}
.hero-subtitle.hero-anim {
  animation-name: heroRise;
  animation-delay: 0.2s;
}
.hero-trust.hero-anim {
  animation-delay: 0.28s;
}
.hero-live.hero-anim {
  animation-delay: 0.36s;
}
.exchange-card.hero-anim {
  animation-delay: 0.44s;
}

.hero-title {
  font-size: clamp(2rem, 5.2vw, 3.35rem);
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: -0.025em;
  text-wrap: balance;
  margin: 0 auto 1rem;
  color: var(--ink);
}

.hero-subtitle {
  font-size: clamp(1rem, 1.6vw, 1.18rem);
  line-height: 1.6;
  font-weight: 400;
  color: var(--ink-soft);
  max-width: 56ch;
  margin: 0 auto 1.5rem;
}

.hero-trust {
  margin-bottom: 1.5rem;
}

.hero-live {
  max-width: 560px;
  margin-left: auto;
  margin-right: auto;
}

/* Secondary hero band: SEO answer + savings + share, de-emphasized. */
.hero-secondary {
  max-width: 720px;
  margin: 2.25rem auto 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.channel-filter__hint {
  max-width: 560px;
  text-align: center;
  line-height: 1.5;
}

.channel-filter__controls {
  justify-content: center;
}

/* Wide enough for "TREINTA Y TRES" without truncating, capped so the pair
   stays on one row from sm up and wraps cleanly below it. */
.channel-filter__dept {
  min-width: 208px;
  max-width: 260px;
}

.channel-filter__reset {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: underline;
}

.hero-answer {
  color: var(--ink-soft);
  font-size: 0.92rem;
  line-height: 1.7;
  text-align: left;
  background: var(--tint);
  border: 1px solid var(--hairline);
  border-radius: 12px;
  padding: 16px 20px;
  margin: 0;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.advanced-btn {
  text-transform: none;
  font-weight: 700;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes heroRise {
  from {
    transform: translateY(24px);
  }

  to {
    transform: translateY(0);
  }
}

/* ---- Exchange (converter) card: the desk itself ---- */
/* A solid surface over the engraving, Overlay Depth shadow (DESIGN.md → Elevation). */
.exchange-card {
  position: relative;
  max-width: 720px;
  margin: 0 auto 1.5rem;
  text-align: left;
  background: var(--surface) !important;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-lg) !important;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32) !important;
}

.amount-input {
  .v-field__input {
    font-size: 1.2em;
    font-weight: 500;
  }
}

/* Quick preset + shortcut chips */
.preset-chip,
.shortcut-chip {
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-chip:hover,
.shortcut-chip:hover {
  transform: translateY(-1px);
}

/* The most tapped targets of the page were 26 px (chips) and 28 px ("Copiar resultado") tall.
   Each gets a 44 px tall hit area from an out-of-flow, transparent `::before`, so the chip, the
   button and the rows keep their size.
   - `::before`, never `::after`: VBtn 4.2 draws its :focus-visible ring on `.v-btn::after`
     (`pointer-events: none`, a 2 px border at the button's own box). VChip and VBtn ship no
     `::before`, so nothing of theirs is touched. `pointer-events: auto` is explicit so the area
     takes the tap even if a library rule ever reaches it.
   - VChip and VBtn ship `overflow: hidden`, which would clip the pseudo-element for hit-testing
     too, so it is lifted. That clip was also what rounded their hover/focus overlay and tonal
     underlay (absolute, 100 % box, NO inherited radius); `border-radius: inherit` below keeps
     those highlights inside the pill. The ripple container already inherits the radius.
   - The chip rows wrap with an 8 px row gap (`ga-2`). A centred 44 px area would reach 9 px into
     that gap and cover the bottom pixel of the chip above, so the chips' area is asymmetric:
     8 px up (exactly the gap) and the rest down. Downward it only overlaps the lower row's chip,
     which comes later in the DOM and so stays on top of it for hit-testing. */
.preset-chip,
.shortcut-chip,
.copy-result-btn {
  overflow: visible;
}

.preset-chip :deep(.v-chip__overlay),
.preset-chip :deep(.v-chip__underlay),
.shortcut-chip :deep(.v-chip__overlay),
.shortcut-chip :deep(.v-chip__underlay),
.copy-result-btn :deep(.v-btn__overlay),
.copy-result-btn :deep(.v-btn__underlay) {
  border-radius: inherit;
}

.preset-chip::before,
.shortcut-chip::before,
.copy-result-btn::before {
  content: '';
  position: absolute;
  left: 50%;
  width: max(100%, 44px);
  height: max(100%, 44px);
  pointer-events: auto;
  background: transparent;
}

.preset-chip::before,
.shortcut-chip::before {
  top: -8px;
  transform: translateX(-50%);
}

.copy-result-btn::before {
  top: 50%;
  transform: translate(-50%, -50%);
}

.shortcut-chips {
  row-gap: 0.5rem;
  /* Breathing room above/below the quick-pair shortcuts ("Atajos:"). */
  margin-block: 14px;
}

/* ---- Desktop converter: two columns (form | live result) ----
   Below lg the two .converter-col stack (cols=12), so this only reshapes wide
   screens — filling the width instead of a narrow centred column. */
@media (min-width: 1280px) {
  .hero-content {
    max-width: 1180px;
  }
  .exchange-card {
    max-width: 1180px;
  }
  .converter-col--result {
    border-left: 1px solid var(--hairline);
  }
}

.copy-result-btn {
  text-transform: none;
}

/* Currency Selection Row */
.currency-row {
  position: relative;

  .currency-section {
    position: relative;
  }

  .swap-btn {
    transition: all 0.3s ease;

    &:hover {
      transform: rotate(180deg);
    }
  }
}

/* Conversion Result */
.conversion-result {
  border-radius: 12px;

  .conversion-display-row {
    min-height: 60px;
    align-items: center;
  }

  .conversion-display {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;

    .amount-text {
      font-size: 1.4em;
      font-weight: 600;
      color: white;

      &.converted {
        color: #4caf50;
      }
    }

    .currency-name {
      font-size: 0.9em;
      color: #b0bec5;
      margin-top: 4px;
    }
  }

  .rate-info {
    .rate-text {
      font-size: 0.9em;
      color: #81c784;
      font-weight: 500;
    }
  }
}

/* Mobile responsiveness for conversion result */
@media (max-width: 600px) {
  /* One line on phones: amount, toggle (48 px, `auto` column), amount. The side columns are
     grow columns, whose Vuetify min-width is their min-content ("estadounidenses", an amount
     glued by a NBSP), and the row wraps: that dropped the answer onto a second line at 320
     and 360. `nowrap` + `min-width: 0` keep the three on one line, an 8 px gap leaves the
     sides as wide as the old 5/12 columns, and the text wraps inside its column instead of
     running under the toggle. */
  .conversion-result .conversion-display-row {
    flex-wrap: nowrap;
    --v-col-gap-x: 8px;
  }

  .conversion-result .conversion-display-row .v-col {
    margin-bottom: 8px;
  }

  .conversion-result .conversion-side,
  .conversion-result .conversion-display {
    min-width: 0;
    max-width: 100%;
  }

  .conversion-result .conversion-display .amount-text {
    font-size: 1.2em;
    overflow-wrap: anywhere;
  }

  .conversion-result .conversion-display .currency-name {
    font-size: 0.8em;
    overflow-wrap: anywhere;
    hyphens: auto;
  }
}

/* At 320-399 px a side column is ~83-100 px: "$ 4.050,00" at 1.2em is ~89 px. */
@media (max-width: 399.98px) {
  .conversion-result .conversion-display .amount-text {
    font-size: 1.05em;
  }
}

/* Best Rates Card */
.best-rates-card {
  border-radius: 12px;

  /* One quiet record per casa. The first is the answer, so it alone carries the action tint;
     the rest were a gold/silver/orange/blue tonal palette that read as four unrelated colors. */
  .rate-item {
    border-radius: 8px;
    background: var(--tint) !important;
    border: 1px solid var(--hairline);
    transition:
      transform 0.2s cubic-bezier(0.2, 0, 0, 1),
      box-shadow 0.2s cubic-bezier(0.2, 0, 0, 1),
      border-color 0.2s cubic-bezier(0.2, 0, 0, 1);

    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
    }

    &.rate-item--best {
      background: rgba(var(--v-theme-primary), 0.1) !important;
      border-color: rgba(var(--v-theme-primary), 0.45);
    }

    .rate-position {
      color: #ffc107;
    }

    .rate-name {
      color: #e0e0e0;
      font-size: 0.8em;
    }

    .rate-value {
      color: #4caf50;
    }

    .rate-type {
      color: #b0bec5;
    }
  }
}

/* Action Button */
.convert-btn {
  min-width: 180px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.5px;
}

/* ---- Section rhythm: one canvas, optional translucent bands ---- */
.top-exchanges-section,
.how-it-works-section,
.features-section,
.internal-links-section,
.pillar-content-section,
.cta-section {
  position: relative;
  padding-block: var(--section-pad);
  background: transparent;
}

/* Alternating sections get a flat tonal band between hairlines. */
.section-band {
  background: var(--tint);
  border-top: 1px solid var(--hairline);
  border-bottom: 1px solid var(--hairline);
}

/* Shared section headings. Left-aligned on the column's edge, like the rest of the site: only the
   hero is centred, so the page stops reading as a stack of centred posters. */
.section-head {
  text-align: left;
}

.section-title {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.015em;
  text-wrap: balance;
  color: var(--ink);
  margin: 0 0 8px;
}

.section-subtitle {
  color: var(--ink-soft);
  font-size: 1rem;
  line-height: 1.6;
  max-width: 60ch;
  margin: 0;
}

.text-center > .section-subtitle {
  margin-inline: auto;
}

/* ---- Top Exchange Houses: rate-forward ranked cards ---- */
.house-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--surface) !important;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md) !important;
  box-shadow: none !important;
  transition:
    transform 0.2s cubic-bezier(0.2, 0, 0, 1),
    box-shadow 0.2s cubic-bezier(0.2, 0, 0, 1),
    border-color 0.2s cubic-bezier(0.2, 0, 0, 1);
}

/* Quiet Lift: interactive cards rise 3 px (DESIGN.md → Elevation). */
.house-card:hover {
  transform: translateY(-3px);
  border-color: rgba(var(--v-theme-primary), 0.45);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35) !important;
}

.house-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
}

/* The rank is a figure, not a badge: tabular, on a quiet tile. Only the podium carries color,
   and the color is the tier (gold, silver, bronze), never decoration. */
.house-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
  background: var(--tint);
  border: 1px solid var(--hairline);
}

.house-rank--1,
.house-rank--2,
.house-rank--3 {
  color: #0a0e1a;
  border-color: transparent;
}

.house-rank--1 {
  background: #ffd54a;
}

.house-rank--2 {
  background: #cfd8e3;
}

.house-rank--3 {
  background: #e8a06a;
}

.house-badge {
  font-weight: 700;
  letter-spacing: 0.02em;
}

.house-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.25;
  margin-bottom: 0.55rem;
  min-height: 2.4em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.house-rate {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}

.house-meta {
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: var(--ink-muted);
}

.house-cta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: auto;
  padding-top: 0.9rem;
  color: rgb(var(--v-theme-link));
  font-size: 0.75rem;
  font-weight: 700;
  opacity: 0;
  transform: translateX(-4px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.house-card:hover .house-cta {
  opacity: 1;
  transform: none;
}

/* ---- How It Works: four engraved vignettes ---- */
/* The art is navy ink on transparency: as an <img> it reads directly on the light canvas; on the
   dark one it is turned to light ink (brightness(0) invert(1)) and dimmed. Lazy, decorative. */
.step-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.step-art {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  height: clamp(112px, 16vw, 168px);
  margin-bottom: 16px;
}

.step-art img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  filter: brightness(0) invert(1);
  opacity: 0.55;
}

.step-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.4;
  margin: 0;
}

.step-index {
  flex: none;
  font-size: 0.875rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-link));
}

/* ---- Pillar prose ---- */
.pillar-article {
  line-height: 1.85;
  color: var(--ink-soft);
}

.pillar-article :deep(h3) {
  color: var(--ink);
  margin-bottom: 0.9rem;
}

.pillar-text {
  font-size: 1.05rem;
  line-height: 1.85;
  color: var(--ink-soft);
}

.tips-list {
  list-style: none;
}

/* ---- Internal-link + feature cards ---- */
/* Left-aligned records with the icon at text size in the link ink. They were centred tiles with
   a 48 px icon in five unrelated colors: the icon-tile grid DESIGN.md names as a substitute for
   information. Tonal at rest; only the ones that are links lift. */
.internal-link-card,
.feature-card {
  background: var(--surface) !important;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md) !important;
  transition:
    transform 0.2s cubic-bezier(0.2, 0, 0, 1),
    box-shadow 0.2s cubic-bezier(0.2, 0, 0, 1),
    border-color 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.internal-link-card:hover,
.feature-card.cursor-pointer:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  border-color: rgba(var(--v-theme-primary), 0.45);
}

.link-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--ink);
}

.link-card__icon,
.feature-card__icon {
  flex: none;
  color: rgb(var(--v-theme-link));
}

.cursor-pointer {
  cursor: pointer;
}

/* Casa hub links: a wrapped list of text links, not cards. They exist to pass
   link equity to /casa/[origin] and to be readable, so they stay light. */
.casa-hubs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  justify-content: center;
}

.casa-hub-link {
  border: 1px solid var(--hairline);
  border-radius: 8px;
  color: inherit;
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.casa-hub-link:hover,
.casa-hub-link:focus-visible {
  background: rgba(var(--v-theme-primary), 0.08);
  border-color: rgba(var(--v-theme-primary), 0.45);
}

/* ---- CTA: the closing slab ---- */
/* Navy Surface in both themes (`.on-dark` keeps its text light), with the Rambla engraved again
   along its foot in Link Sky: the page closes on the same view it opened with. */
.cta-section {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  text-align: center;
  background: #121a2e;
  border-radius: 16px;
  margin: 0 16px var(--section-pad);
  box-shadow: 16px 24px 48px rgba(0, 0, 0, 0.28);
}

.cta-section::before {
  content: '';
  position: absolute;
  z-index: -1;
  left: 0;
  right: 0;
  bottom: -8px;
  height: 200px;
  background-color: #64b5f6;
  opacity: 0.22;
  -webkit-mask: url('/img/grabados/rambla.webp') center bottom / auto 100% no-repeat;
  mask: url('/img/grabados/rambla.webp') center bottom / auto 100% no-repeat;
  pointer-events: none;
}

/* ---- Accessibility ---- */
.exchange-card:focus-within,
.house-card:focus-within {
  outline: 2px solid #42a5f5;
  outline-offset: 2px;
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
  .swap-btn_container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;

    .swap-btn {
      background: rgb(var(--v-theme-primary));
      border-color: transparent;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);

      i {
        color: white;
      }
    }
  }
}

@media (max-width: 600px) {
  /* The converter card pads with `pa-3 pa-sm-6` (12 px on a phone). An 18px !important here
     outranked the utility and, with three more nested paddings, left the rate cards narrower
     than "estadounidenses". */

  .house-rate {
    font-size: 1.25rem;
  }

  /* No hover on touch: keep the "ver histórico" hint visible. */
  .house-cta {
    opacity: 1;
    transform: none;
  }

  .cta-section {
    margin-inline: 8px;
    border-radius: 16px;
  }

  .best-rates-card {
    .rate-item {
      margin-bottom: 8px;
    }
  }
}

/* The nearby finder carries the engraved plan of the Ciudad Vieja at its right edge, under the
   button: an <img> so it loads lazily, faded out toward the text by a mask. */
.nearby-finder-card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background: var(--surface) !important;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-lg) !important;
}

.nearby-finder-art {
  position: absolute;
  z-index: -1;
  right: -48px;
  top: 50%;
  width: min(560px, 90%);
  height: auto;
  transform: translateY(-50%);
  filter: brightness(0) invert(1);
  opacity: 0.22;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 45%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 45%);
  pointer-events: none;
}

.nearby-finder-title {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
  text-wrap: balance;
  max-width: 24ch;
  color: var(--ink);
}

/* Below md the card stacks: the plan sits under the button row only, fading in from above so
   it never reaches the copy. */
@media (max-width: 959.98px) {
  .nearby-finder-art {
    top: auto;
    bottom: -16px;
    transform: none;
    width: 280px;
    opacity: 0.18;
    -webkit-mask-image: linear-gradient(180deg, transparent 0%, transparent 35%, #000 75%);
    mask-image: linear-gradient(180deg, transparent 0%, transparent 35%, #000 75%);
  }
}

/* ============================================================
   LIGHT THEME (the default on a first visit, DESIGN.md)
   The tokens at the top are the dark values; this block swaps
   them for paper, navy ink and AA-contrast text, and prints the
   engravings in navy instead of light ink.
   ============================================================ */
.v-theme--light .home-container {
  --ink: #16233b;
  --ink-soft: #45556e;
  --ink-muted: #5f6c82;
  --hairline: rgba(15, 23, 42, 0.1);
  --surface: #ffffff;
  --tint: rgba(15, 23, 42, 0.025);
  --engraving-ink: rgb(21, 101, 192);
}

/* Light ground: the engravings print in navy directly. */
.v-theme--light .home-container .hero-engraving {
  opacity: 0.12;
}

@media (min-width: 600px) {
  .v-theme--light .home-container .hero-engraving {
    opacity: 0.2;
  }
}

.v-theme--light .home-container .step-art img {
  filter: none;
  opacity: 0.85;
}

.v-theme--light .home-container .nearby-finder-art {
  filter: none;
  opacity: 0.28;
}

@media (max-width: 959.98px) {
  .v-theme--light .home-container .nearby-finder-art {
    opacity: 0.16;
  }
}

/* Overlay Depth and Quiet Lift, light variants (DESIGN.md → Elevation). */
.v-theme--light .home-container .exchange-card {
  box-shadow: 0 16px 40px rgba(20, 25, 40, 0.14) !important;
}

.v-theme--light .home-container .house-card:hover,
.v-theme--light .home-container .internal-link-card:hover,
.v-theme--light .home-container .feature-card.cursor-pointer:hover,
.v-theme--light .home-container .best-rates-card .rate-item:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15) !important;
}

/* Text/icons hardcoded light for the dark canvas. */
.v-theme--light .home-container .house-rate {
  color: var(--ink);
}

/* Converter result + best-rates cards: the text was authored white/pale-green for the dark
   canvas — flip it to readable ink on the light card. The CTA slab (.cta-section) is `.on-dark`
   and keeps its white text. */
.v-theme--light .home-container .conversion-result .text-white,
.v-theme--light .home-container .best-rates-card .text-white,
.v-theme--light .home-container .conversion-result .amount-text {
  color: var(--ink) !important;
}

.v-theme--light .home-container .conversion-result .amount-text.converted,
.v-theme--light .home-container .conversion-result .rate-text,
.v-theme--light .home-container .best-rates-card .rate-value {
  color: #2e7d32 !important;
}

.v-theme--light .home-container .conversion-result .currency-name,
.v-theme--light .home-container .best-rates-card .rate-type {
  color: var(--ink-muted) !important;
}

.v-theme--light .home-container .best-rates-card .rate-name {
  color: var(--ink-soft) !important;
}

.v-theme--light .home-container .best-rates-card .rate-position {
  color: #b45309 !important;
}
</style>
