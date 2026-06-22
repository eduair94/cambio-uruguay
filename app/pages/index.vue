<template>
  <div class="home-container">
    <!-- Hero Section -->
    <section class="hero-section pt-0 pt-md-5">
      <VContainer>
        <VRow justify="center" align="center" class="min-height-hero">
          <VCol cols="12" class="hero-col text-center">
            <div class="hero-content">
              <!-- Eyebrow: live-data badge for instant credibility -->
              <div class="hero-eyebrow hero-anim">
                <span class="live-dot" aria-hidden="true" />
                {{ t('trust.updated') }}
              </div>

              <h1 class="hero-title hero-anim">
                {{ t('simpleTitle') }}
              </h1>
              <p class="hero-subtitle hero-anim">
                {{ t('simpleSubtitle') }}
              </p>

              <!-- Trust signals: BCU source, coverage, freshness, Trustpilot -->
              <TrustBar class="hero-trust hero-anim" />

              <!-- Live USD rate band: momentum chip + sparkline, the hero hook -->
              <ClientOnly>
                <DollarMomentum class="hero-live hero-anim mb-6" />
              </ClientOnly>

              <!-- Guided tour entry point (lazy driver.js; auto-runs once on a
                   first visit, replayable from here). Client-only. -->
              <ClientOnly>
                <div class="d-flex justify-center mb-4">
                  <SiteTour />
                </div>
              </ClientOnly>

              <!-- Currency Converter Card -->
              <VCard class="exchange-card hero-anim pa-6 mb-6" elevation="8">
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
                        v-model="amountDisplay"
                        hide-details
                        :label="t('enterAmount')"
                        variant="outlined"
                        density="comfortable"
                        type="text"
                        inputmode="decimal"
                        class="amount-input"
                        data-testid="amount-input"
                        prepend-inner-icon="mdi-cash"
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
                    </div>
                    <VRow align="center" justify="center" class="conversion-display-row">
                      <VCol cols="5" sm="4" class="text-center align-self-start">
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

                      <VCol cols="2" sm="4" class="text-center">
                        <DirectionToggle
                          :is-forward="isForward"
                          size="32"
                          color="success"
                          @toggle="toggleDirection"
                        />
                      </VCol>

                      <VCol cols="5" sm="4" class="text-center align-self-start">
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
                    </VCol>
                  </VRow>

                  <!-- Best rates, full width below the converter: two columns
                       (sell | buy) only where the multi-column layout applies
                       (lg+); stacks on smaller screens. -->
                  <template v-if="subjectCode">
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
                            :to="localePath(`/historico/${rate.origin}/${subjectCode}`)"
                          >
                            <VCard
                              class="rate-item pa-3 text-center flex-grow-1"
                              :color="getRateCardColor(index)"
                              variant="tonal"
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
                                {{ t('codes.' + subjectCode) }}
                              </div>
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
                            :to="localePath(`/historico/${rate.origin}/${subjectCode}`)"
                          >
                            <VCard
                              class="rate-item pa-3 text-center flex-grow-1"
                              :color="getRateCardColor(index)"
                              variant="tonal"
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
                                {{ t('codes.' + subjectCode) }}
                              </div>
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

                <ClientOnly>
                  <SavingsHighlight class="hero-savings" />
                </ClientOnly>

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
          <VCol cols="12" class="text-center mb-8">
            <h2 class="section-title">
              {{ t('topExchangeHouses') }}
            </h2>
            <p class="section-subtitle">
              {{ t('subtitle') }}
            </p>
          </VCol>
        </VRow>

        <VRow>
          <VCol
            v-for="(exchange, i) in topExchanges"
            :key="exchange.origin"
            v-motion
            cols="6"
            sm="6"
            md="4"
            lg="3"
            :initial="revealInitial"
            :visible-once="revealVisible(i)"
          >
            <nuxt-link
              class="d-flex w-100 h-100 text-decoration-none"
              :to="localePath(`/historico/${exchange.origin}/${exchange.code}`)"
            >
              <VCard
                class="house-card pa-4 h-100 w-100"
                :style="{
                  '--rank-accent': ['#ffd54a', '#cfd8e3', '#e8a06a'][i] || 'rgba(120,160,255,0.5)',
                }"
              >
                <div class="house-card__top">
                  <span class="house-rank">{{ i + 1 }}</span>
                  <VChip
                    :color="exchange.isRegulated ? 'success' : 'warning'"
                    size="x-small"
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
        <div class="d-flex justify-center mt-6">
          <VBtn :to="localePath('/comparar')" color="primary" variant="elevated" size="large">
            <VIcon start>mdi-chart-multiple</VIcon>
            {{ t('promo.cta') }}
          </VBtn>
        </div>
      </VContainer>
    </section>

    <!-- How It Works Section -->
    <section v-reveal class="how-it-works-section section-band py-12">
      <VContainer>
        <VRow>
          <VCol cols="12" class="text-center mb-8">
            <h2 class="section-title">
              {{ t('howItWorks') }}
            </h2>
          </VCol>
        </VRow>

        <VRow class="steps-grid" justify="center">
          <VCol
            v-for="(step, index) in steps"
            :key="index"
            v-motion
            cols="12"
            sm="6"
            md="3"
            :initial="revealInitial"
            :visible-once="revealVisible(index, 110)"
          >
            <div class="step-card text-center">
              <div class="step-node">
                <span class="step-index">{{ index + 1 }}</span>
              </div>
              <h3 class="step-title">
                {{ step.title }}
              </h3>
            </div>
          </VCol>
        </VRow>
      </VContainer>
    </section>

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

    <!-- Internal Linking Section - Topical Cluster Navigation -->
    <section v-reveal class="internal-links-section py-12">
      <VContainer>
        <VRow>
          <VCol cols="12" class="text-center mb-8">
            <h2 class="section-title">
              {{ t('pillar.relatedTitle') }}
            </h2>
          </VCol>
        </VRow>
        <VRow justify="center">
          <VCol
            v-motion
            cols="12"
            sm="6"
            md="3"
            :initial="revealInitial"
            :visible-once="revealVisible(0)"
          >
            <NuxtLink :to="localePath('/historico')" class="text-decoration-none">
              <VCard class="internal-link-card pa-6 h-100 text-center" elevation="3" hover>
                <VIcon color="blue" size="48" class="mb-3">mdi-chart-line</VIcon>
                <h3 class="text-h6 font-weight-bold mb-2">{{ t('historico') }}</h3>
                <p class="text-body-2 text-grey-lighten-1">
                  {{ t('pillar.historicalLink') }}
                </p>
              </VCard>
            </NuxtLink>
          </VCol>
          <VCol
            v-motion
            cols="12"
            sm="6"
            md="3"
            :initial="revealInitial"
            :visible-once="revealVisible(1)"
          >
            <NuxtLink :to="localePath('/sucursales')" class="text-decoration-none">
              <VCard class="internal-link-card pa-6 h-100 text-center" elevation="3" hover>
                <VIcon color="green" size="48" class="mb-3">mdi-map-marker</VIcon>
                <h3 class="text-h6 font-weight-bold mb-2">{{ t('sucursalesMenu') }}</h3>
                <p class="text-body-2 text-grey-lighten-1">
                  {{ t('pillar.branchesLink') }}
                </p>
              </VCard>
            </NuxtLink>
          </VCol>
          <VCol
            v-motion
            cols="12"
            sm="6"
            md="3"
            :initial="revealInitial"
            :visible-once="revealVisible(2)"
          >
            <NuxtLink :to="localePath('/avanzado')" class="text-decoration-none">
              <VCard class="internal-link-card pa-6 h-100 text-center" elevation="3" hover>
                <VIcon color="orange" size="48" class="mb-3">mdi-cog</VIcon>
                <h3 class="text-h6 font-weight-bold mb-2">{{ t('avanzado') }}</h3>
                <p class="text-body-2 text-grey-lighten-1">
                  {{ t('pillar.advancedLink') }}
                </p>
              </VCard>
            </NuxtLink>
          </VCol>
          <VCol
            v-motion
            cols="12"
            sm="6"
            md="3"
            :initial="revealInitial"
            :visible-once="revealVisible(3)"
          >
            <NuxtLink :to="localePath('/cotizacion')" class="text-decoration-none">
              <VCard class="internal-link-card pa-6 h-100 text-center" elevation="3" hover>
                <VIcon color="purple" size="48" class="mb-3">mdi-currency-usd</VIcon>
                <h3 class="text-h6 font-weight-bold mb-2">{{ t('moneda') }}</h3>
                <p class="text-body-2 text-grey-lighten-1">
                  {{ t('pillar.allCurrenciesLink') }}
                </p>
              </VCard>
            </NuxtLink>
          </VCol>
          <VCol
            v-motion
            cols="12"
            sm="6"
            md="3"
            :initial="revealInitial"
            :visible-once="revealVisible(4)"
          >
            <NuxtLink :to="localePath('/indicadores')" class="text-decoration-none">
              <VCard class="internal-link-card pa-6 h-100 text-center" elevation="3" hover>
                <VIcon color="deep-purple" size="48" class="mb-3">mdi-finance</VIcon>
                <h3 class="text-h6 font-weight-bold mb-2">{{ t('pillar.indicatorsTitle') }}</h3>
                <p class="text-body-2 text-grey-lighten-1">
                  {{ t('pillar.indicatorsLink') }}
                </p>
              </VCard>
            </NuxtLink>
          </VCol>
        </VRow>
      </VContainer>
    </section>

    <!-- Features Section -->
    <section v-reveal class="features-section section-band py-12">
      <VContainer>
        <VRow>
          <VCol cols="12" class="text-center mb-8">
            <h2 class="section-title">
              {{ t('whyChooseUs') }}
            </h2>
          </VCol>
        </VRow>

        <VRow>
          <VCol
            v-for="(feature, fi) in features"
            :key="feature.title"
            v-motion
            cols="12"
            sm="6"
            md="4"
            lg="3"
            :initial="revealInitial"
            :visible-once="revealVisible(fi, 60)"
          >
            <VCard
              v-if="feature.title === t('feature5Title')"
              class="feature-card pa-6 h-100 cursor-pointer"
              elevation="2"
              href="https://api.cambio-uruguay.com/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              :ripple="true"
            >
              <div class="text-center">
                <VIcon :color="feature.color" size="48" class="mb-4">
                  {{ feature.icon }}
                </VIcon>
                <h3 class="text-h6 font-weight-bold mb-3">
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
              class="feature-card pa-6 h-100 cursor-pointer"
              elevation="2"
              href="https://github.com/eduair94/cambio-uruguay"
              target="_blank"
              rel="noopener noreferrer"
              :ripple="true"
            >
              <div class="text-center">
                <VIcon :color="feature.color" size="48" class="mb-4">
                  {{ feature.icon }}
                </VIcon>
                <h3 class="text-h6 font-weight-bold mb-3">
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
            <VCard v-else class="feature-card pa-6 h-100" elevation="2">
              <div class="text-center">
                <VIcon :color="feature.color" size="48" class="mb-4">
                  {{ feature.icon }}
                </VIcon>
                <h3 class="text-h6 font-weight-bold mb-3">
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

    <!-- CTA Section -->
    <section class="cta-section py-6 py-sm-12 bg-primary">
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
import { useLocalePath } from '#imports'
import DirectionToggle from '@/components/DirectionToggle.vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { HOME_FAQ_IDS, type FaqItem } from '~/utils/faqAnswers'
import { quotesForCurrency } from '~/utils/currencyPages'
import { useDisplay } from 'vuetify'
import {
  convert as convertAmount,
  formatAmount,
  marketAverageSavings,
  parseAmount,
  type RateRow,
} from '@/utils/conversion'
import { publicRates } from '@/utils/rateSource'

const { mobile } = useDisplay()

// Scroll-reveal animations (@vueuse/motion) are applied only AFTER client mount.
// During SSR and first hydration `revealInitial` is empty, so no motion styles
// are server-rendered — this avoids a hydration mismatch and never leaves cards
// stuck hidden if JS is slow/absent. Once mounted, the from-state kicks in and
// `visibleOnce` springs each card up as it scrolls into view.
const motionReady = ref(false)
onMounted(() => {
  motionReady.value = true
})
const revealInitial = computed(() => (motionReady.value ? { opacity: 0, y: 40, scale: 0.96 } : {}))
const revealVisible = (index: number, gap = 70) => ({
  opacity: 1,
  y: 0,
  scale: 1,
  transition: { delay: index * gap, type: 'spring', stiffness: 120, damping: 18 },
})

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
}

interface Feature {
  title: string
  description: string
  icon: string
  color: string
}

// Composables
const { t, locale } = useI18n()
const localePath = useLocalePath()
// Shared, deduped exchange-rates fetch (the home trend modules use the same
// `useExchangeRates` cache key) — the calculator reads from it instead of
// issuing its own second identical request for the dataset.
const { rows: sharedRows, pending: sharedPending, realRows: sharedRealRows } = useExchangeRates()
const route = useRoute()
const router = useRouter()

// SSR-rendered, self-contained answer to "¿a cuánto está el dólar hoy?" so the
// figure is visible plain text (not only inside the FAQ accordion / schema),
// which AI Overviews and Gemini extract more readily. Built from the same
// SSR-friendly useExchangeRates data, public quotes only (no BCU/interbank).
const usdHeadline = computed<string | null>(() => {
  const quotes = quotesForCurrency(sharedRealRows.value ?? [], 'USD')
  const sells = quotes.map(q => q.sell).filter((n): n is number => typeof n === 'number' && n > 0)
  const buys = quotes.map(q => q.buy).filter((n): n is number => typeof n === 'number' && n > 0)
  if (!sells.length || !buys.length) return null
  const fmt = (n: number) =>
    n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const minSell = fmt(Math.min(...sells))
  const maxBuy = fmt(Math.max(...buys))
  const today = new Date().toLocaleDateString('es-UY', {
    timeZone: 'America/Montevideo',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return (
    `Hoy ${today}, el dólar estadounidense se vende desde $${minSell} y se compra hasta ` +
    `$${maxBuy} comparando ${quotes.length} casas de cambio de Uruguay. Para comprar conviene ` +
    `el precio de venta más bajo; para vender, el de compra más alto. Los datos se basan en el ` +
    `registro del Banco Central del Uruguay (BCU) y se actualizan automáticamente cada ~10 minutos.`
  )
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

// Get initial values from query params, localStorage, or defaults
function getInitialString(
  queryValue: string | undefined,
  storedValue: string | undefined,
  defaultValue: string
): string {
  if (queryValue !== undefined && queryValue !== null && queryValue !== '') return queryValue
  if (storedValue !== undefined && storedValue !== null) return storedValue
  return defaultValue
}

const storedData = getStoredFormData()

// Use input refs for v-models
const selectedCurrencyInput = ref(
  getInitialString(route.query.from as string, storedData?.from, 'USD')
)
const selectedTargetCurrencyInput = ref(
  getInitialString(route.query.to as string, storedData?.to, 'UYU')
)
// Numeric source of truth for the entered amount (kept as a number so all
// downstream math/toggling stays unchanged).
const amountInput = ref<number>(
  (() => {
    const queryAmount = Number(route.query.amount)
    if (queryAmount && queryAmount > 0) return queryAmount
    if (storedData?.amount && storedData.amount > 0) return storedData.amount
    return 100
  })()
)

// es-UY thousands-formatted view of `amountInput` for the text field. Reading
// formats the current number; writing parses the user's input back to a number
// so numeric behavior is preserved (see utils/conversion.ts).
const amountDisplay = computed<string>({
  get: () => (amountInput.value > 0 ? formatAmount(amountInput.value) : ''),
  set: (raw: string) => {
    amountInput.value = parseAmount(raw)
  },
})

// Quick preset amounts the user can tap to fill the field.
const presetAmounts: readonly number[] = [100, 500, 1000, 5000]
const setPresetAmount = (value: number): void => {
  amountInput.value = value
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
const selectedExchangeHouseInput = ref(
  getInitialString(route.query.house as string, storedData?.exchangeHouse, 'best')
)
const selectedExchangeHouse = ref(selectedExchangeHouseInput.value)

// selectedCurrency, selectedTargetCurrency, and amount are refs, set manually on button click
const selectedCurrency = ref(selectedCurrencyInput.value)
const selectedTargetCurrency = ref(selectedTargetCurrencyInput.value)
const amount = ref(amountInput.value)
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

  realExchangeData.value.forEach(item => {
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
  if (!realExchangeData.value.length || !selectedCurrency.value) return []

  const currencyData = realExchangeData.value.filter(
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

  let rates = []

  if (isConvertingFrom) {
    // User is selling the selected currency (FROM currency TO UYU)
    // Show top 4 selling rates (highest buy rates = best for user selling)
    rates = currencyData
      .map(item => ({
        source: item.localData?.name || item.origin,
        rate: item.buy,
        type: 'buy' as const, // This is what the exchange house pays (buys from user)
        origin: item.origin,
        name: item.localData.name,
        code: item.code,
        isRegulated: item.localData.bcu || false,
      }))
      .sort((a, b) => b.rate - a.rate) // Highest buy rate first
  } else if (isConvertingTo) {
    // User is buying the selected currency (FROM UYU TO currency)
    // Show top 4 buying rates (lowest sell rates = best for user buying)
    rates = currencyData
      .map(item => ({
        source: item.localData?.name || item.origin,
        rate: item.sell,
        type: 'sell' as const, // This is what the exchange house sells (user buys)
        origin: item.origin,
        code: item.code,
        name: item.localData.name,
        isRegulated: item.localData.bcu || false,
      }))
      .sort((a, b) => a.rate - b.rate) // Lowest sell rate first
  } else {
    // For other conversions, show mixed rates (2 buy + 2 sell)
    const buyRates = currencyData
      .filter(item => item.code === selectedCurrency.value)
      .map(item => ({
        source: item.localData?.name || item.origin,
        rate: item.buy,
        type: 'buy' as const,
        origin: item.origin,
        code: item.code,
        name: item.localData.name,
        isRegulated: item.localData.bcu || false,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 4)

    const sellRates = currencyData
      .filter(item => item.code === selectedTargetCurrency.value)
      .map(item => ({
        source: item.localData?.name || item.origin,
        rate: item.sell,
        type: 'sell' as const,
        code: item.code,
        origin: item.origin,
        name: item.localData.name,
        isRegulated: item.localData.bcu || false,
      }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 4)

    rates = [...buyRates, ...sellRates]
  }

  // Remove duplicates based on source name and type

  return rates.slice(0, 8)
})

// Steps for how it works
const steps = computed<Step[]>(() => [
  {
    title: t('step1'),
    description: t('step1'),
  },
  {
    title: t('step2'),
    description: t('step2'),
  },
  {
    title: t('step3'),
    description: t('step3'),
  },
  {
    title: t('step4'),
    description: t('step4'),
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
const rateRows = computed<RateRow[]>(() => realExchangeData.value as RateRow[])

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
// Initialize from query param dir=f|r, then localStorage (defaults to forward)
if (typeof route.query.dir === 'string') {
  const lower = route.query.dir.toLowerCase()
  isForward.value = !(lower === 'r' || lower === 'reverse' || lower === '0' || lower === 'false')
} else if (storedData?.dir !== undefined) {
  isForward.value = storedData.dir
}
// We keep the right-hand amount constant across direction toggles
const desiredRightAmount = ref(0)
// High-precision right-hand amount to avoid toggle rounding drift
const desiredRightAmountRaw = ref(0)
// Left-side needed when we are in reverse (buying on left to receive desiredRightAmount on right)
const leftForReverse = ref(0)

// Conversion result computed property
const setConversionRate = () => {
  // Core forward/reverse math comes from the pure util (unit-tested).
  const core = convertAmount(
    rateRows.value,
    Number(amount.value),
    selectedCurrency.value,
    selectedTargetCurrency.value,
    selectedExchangeHouse.value
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

  // Maintain invariants for UI:
  // - desiredRightAmount remains the target shown on the right
  if (desiredRightAmountRaw.value <= 0) {
    if (isForward.value) {
      // Forward: initialize from forward conversion
      desiredRightAmountRaw.value = rawConvertedAmount
    } else {
      // Reverse: initialize from reverse math (right needed to obtain left)
      desiredRightAmountRaw.value = reverseRate > 0 ? Number(amount.value) / reverseRate : 0
    }
    desiredRightAmount.value = round2(desiredRightAmountRaw.value)
  }
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

// Savings of the best rate vs. the market average for the subject currency.
// Only meaningful when one side is UYU and there are >= 2 quotes to average.
const savingsInfo = computed(() =>
  marketAverageSavings(
    rateRows.value,
    subjectCode.value,
    Number(amount.value),
    intentIsSellingSubject.value ? 'sell' : 'buy'
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

// Build top 4 lists for subject currency: sell (houses buy) and buy (houses sell)
const top4SellRatesForSubject = computed(() => {
  if (!realExchangeData.value.length || !subjectCode.value) return []
  const items = realExchangeData.value
    .filter(item => item.code === subjectCode.value && item.buy > 0 && item.localData?.name)
    .map(item => ({
      origin: item.origin,
      source: item.localData?.name || item.origin,
      rate: item.buy,
    }))
    .sort((a, b) => b.rate - a.rate)
  return items.slice(0, 4)
})

const top4BuyRatesForSubject = computed(() => {
  if (!realExchangeData.value.length || !subjectCode.value) return []
  const items = realExchangeData.value
    .filter(item => item.code === subjectCode.value && item.sell > 0 && item.localData?.name)
    .map(item => ({
      origin: item.origin,
      source: item.localData?.name || item.origin,
      rate: item.sell,
    }))
    .sort((a, b) => a.rate - b.rate)
  return items.slice(0, 4)
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

// Get color for rate card based on position
const getRateCardColor = (index: number): string => {
  const colors = ['gold', 'silver', 'orange', 'blue']
  return colors[index] || 'grey'
}

// Methods
const formatCurrency = (value: number): string => {
  // Use a more robust approach to ensure $ symbol is always shown
  try {
    let formatted = new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)

    // Handle different mobile formats that might show UYU instead of $
    if (formatted.includes('UYU')) {
      // Replace UYU with $
      formatted = formatted.replace(/UYU/g, '$')

      // If $ is at the end, move it to the front
      if (formatted.endsWith('$')) {
        formatted = '$ ' + formatted.replace(/\$$/, '').trim()
      }

      // Ensure there's always a space after $
      if (formatted.startsWith('$') && !formatted.startsWith('$ ')) {
        formatted = formatted.replace(/^\$/, '$ ')
      }

      // Clean up extra spaces
      formatted = formatted.replace(/\s+/g, ' ').trim()
    }

    return formatted
  } catch {
    // Fallback in case of any issues with Intl.NumberFormat
    return `$ ${value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

// Function to update query parameters
const updateQueryParams = () => {
  const query: Record<string, string | undefined> = {
    from: selectedCurrency.value,
    to: selectedTargetCurrency.value,
    amount: amount.value.toString(),
    dir: isForward.value ? undefined : 'r',
    house: selectedExchangeHouse.value === 'best' ? undefined : selectedExchangeHouse.value,
  }

  // Only update if parameters have actually changed
  if (
    route.query.from !== query.from ||
    route.query.to !== query.to ||
    route.query.amount !== query.amount ||
    route.query.dir !== query.dir ||
    route.query.house !== query.house
  ) {
    try {
      router.push({ query })
    } catch {
      // Ignore navigation errors (e.g., duplicate navigation)
    }
  }
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
    if (rows && rows.length) applyExchangeData(rows as unknown as ExchangeItem[])
    if (!pending) initialLoading.value = false
  },
  { immediate: true }
)

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
const updateExchange = () => {
  loading.value = true
  selectedCurrency.value = selectedCurrencyInput.value
  selectedTargetCurrency.value = selectedTargetCurrencyInput.value
  selectedExchangeHouse.value = selectedExchangeHouseInput.value
  amount.value = Number(amountInput.value) || 0
  // GA4: the converter is the core feature — track usage (currencies + whether a
  // specific house was picked) to see what people actually look up.
  trackConvert('convert', {
    from: selectedCurrency.value,
    to: selectedTargetCurrency.value,
    house: selectedExchangeHouse.value || 'best',
  })
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
  updateQueryParams()
  // Save form data to localStorage
  saveFormData()
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
  setConversionRate()
  // Reflect current direction in the URL
  updateQueryParams()
  // Save form data to localStorage
  saveFormData()
}

// SEO Configuration - Comprehensive JSON-LD Schema Markup
const currentDate = new Date().toISOString().split('T')[0]

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
  offers: {
    '@type': 'Offer',
    description: t('seo.homeDescription'),
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
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

// 2. BreadcrumbList Schema
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
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Cotización del Dólar en Uruguay',
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
        urlTemplate: 'https://cambio-uruguay.com/avanzado?search={search_term_string}',
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

// 5. ExchangeRateSpecification for live rates (dynamic)
const exchangeRateSchema = computed(() => {
  if (!realExchangeData.value.length) return null

  const usdData = realExchangeData.value.find(
    item => item.code === 'USD' && item.buy > 0 && item.sell > 0
  )
  if (!usdData) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'ExchangeRateSpecification',
    name: 'Cotización del Dólar en Uruguay',
    currency: 'USD',
    currentExchangeRate: {
      '@type': 'UnitPriceSpecification',
      price: usdData.buy,
      priceCurrency: 'UYU',
      unitText: 'Compra',
    },
    exchangeRateSpread: usdData.sell - usdData.buy,
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
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(currencyServiceSchema.value)),
    },
    ...(exchangeRateSchema.value
      ? [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify(exchangeRateSchema.value),
          },
        ]
      : []),
  ],
  link: [
    {
      rel: 'canonical',
      href: 'https://cambio-uruguay.com',
    },
  ],
})

useSeoMeta({
  title: () => t('seo.homeTitle'),
  description: () => t('seo.homeDescription'),
  keywords: () => t('seo.homeKeywords'),
  ogTitle: () => t('seo.homeTitle'),
  ogDescription: () => t('seo.homeDescription'),
  ogType: 'website',
  ogUrl: 'https://cambio-uruguay.com',
  ogLocale: 'es_UY',
  ogLocaleAlternate: ['en_US', 'pt_BR'],
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('seo.homeTitle'),
  twitterDescription: () => t('seo.homeDescription'),
})
</script>

<style scoped>
/* ============================================================
   Cambio Uruguay — Home: refined 2026 fintech design system.
   Cohesive deep-navy canvas + aurora glow, glassmorphism,
   consistent spacing rhythm. Converter-internal rules (inputs,
   chips, result, best-rates) are preserved further down.
   ============================================================ */
.home-container {
  position: relative;
  min-height: 100vh;
  /* Design tokens */
  --ink: #f2f5fb;
  --ink-soft: #aab4c8;
  --ink-muted: #828da0;
  --hairline: rgba(255, 255, 255, 0.08);
  --glass: rgba(255, 255, 255, 0.045);
  --glass-strong: rgba(255, 255, 255, 0.07);
  --good: #2bd47d;
  --radius-lg: 24px;
  --radius-md: 16px;
  --section-pad: clamp(56px, 8vw, 104px);

  /* Cohesive page canvas: a solid deep-navy base (guarantees no white bleed in
     any theme) with soft aurora glows layered on top, viewport-anchored. The
     home is a dark-first premium landing regardless of the light/dark toggle. */
  background-color: #0a0e1a;
  background-image:
    radial-gradient(900px 620px at 12% 0%, rgba(59, 130, 246, 0.22), transparent 60%),
    radial-gradient(820px 600px at 100% 4%, rgba(99, 102, 241, 0.18), transparent 55%),
    radial-gradient(900px 700px at 50% 100%, rgba(16, 185, 129, 0.08), transparent 60%);
  background-attachment: fixed;
  background-repeat: no-repeat;
}

/* ---- Hero ---- */
.hero-section {
  position: relative;
  overflow: hidden;
  padding-top: clamp(20px, 4vw, 48px);
}

/* Soft top spotlight just behind the hero content. */
.hero-section::before {
  content: '';
  position: absolute;
  inset: -25% -10% auto -10%;
  height: 80%;
  background: radial-gradient(58% 100% at 50% 0%, rgba(99, 102, 241, 0.2), transparent 70%);
  pointer-events: none;
}

.min-height-hero {
  min-height: auto;
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 760px;
  margin: 0 auto;
}

/* Staggered hero entrance — pure CSS so it runs on first paint (SSR-safe, no
   hydration mismatch, never leaves content stuck hidden). Reduced-motion is
   handled globally in critical.css. */
.hero-anim {
  animation: fadeInUp 0.6s ease-out both;
}

.hero-eyebrow.hero-anim {
  animation-delay: 0.05s;
}
.hero-title.hero-anim {
  animation-delay: 0.12s;
}
.hero-subtitle.hero-anim {
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

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.9rem;
  margin-bottom: 1.25rem;
  border-radius: 999px;
  background: var(--glass-strong);
  border: 1px solid var(--hairline);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ink-soft);
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--good);
  box-shadow: 0 0 0 0 rgba(43, 212, 125, 0.55);
  animation: livePulse 2.2s infinite;
}

@keyframes livePulse {
  0% {
    box-shadow: 0 0 0 0 rgba(43, 212, 125, 0.5);
  }
  70% {
    box-shadow: 0 0 0 9px rgba(43, 212, 125, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(43, 212, 125, 0);
  }
}

.hero-title {
  font-size: clamp(2rem, 5.2vw, 3.35rem);
  /* line-height + padding-bottom give descenders (g, y in "Uruguay") room:
     background-clip:text otherwise clips them against a tight line box. */
  line-height: 1.18;
  padding-bottom: 0.12em;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 auto 1rem;
  background: linear-gradient(180deg, #ffffff 0%, #c7d3ee 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
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

.hero-answer {
  color: var(--ink-soft);
  font-size: 0.92rem;
  line-height: 1.7;
  text-align: left;
  background: var(--glass);
  border: 1px solid var(--hairline);
  border-left: 3px solid rgba(120, 160, 255, 0.55);
  border-radius: 12px;
  padding: 1rem 1.15rem;
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

/* ---- Exchange (converter) card: glass centerpiece ---- */
.exchange-card {
  position: relative;
  max-width: 720px;
  margin: 0 auto 1.5rem;
  text-align: left;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.03));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-lg) !important;
  box-shadow:
    0 30px 80px -34px rgba(0, 0, 0, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
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
  .conversion-result {
    .conversion-display-row {
      .v-col {
        margin-bottom: 8px;
      }
    }

    .conversion-display {
      .amount-text {
        font-size: 1.2em;
      }

      .currency-name {
        font-size: 0.8em;
      }
    }
  }
}

/* Best Rates Card */
.best-rates-card {
  border-radius: 12px;

  .rate-item {
    transition: all 0.3s ease;
    border-radius: 8px;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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

/* Alternating sections get a faint elevated band with hairline edges so the
   page reads as layered depth instead of jarring black/white blocks. */
.section-band {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.022), rgba(255, 255, 255, 0.012));
  border-top: 1px solid var(--hairline);
  border-bottom: 1px solid var(--hairline);
}

/* Shared section headings */
.section-title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin-bottom: 0.75rem;
}

.section-subtitle {
  color: var(--ink-soft);
  font-size: 1.02rem;
  line-height: 1.6;
  max-width: 60ch;
  margin: 0 auto;
}

/* ---- Top Exchange Houses: rate-forward ranked cards ---- */
.house-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.025));
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md) !important;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.house-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--rank-accent);
}

.house-card:hover {
  transform: translateY(-6px);
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow: 0 24px 46px -24px rgba(0, 0, 0, 0.75);
}

.house-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
}

.house-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  font-weight: 800;
  font-size: 0.95rem;
  color: #0a0e1a;
  background: var(--rank-accent);
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
  color: #ffffff;
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
  color: #7fb0ff;
  font-size: 0.78rem;
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

/* ---- How It Works: glowing numbered nodes ---- */
.step-card {
  position: relative;
  z-index: 1;
  padding: 8px 12px;
  transition: transform 0.25s ease;
}

.step-card:hover {
  transform: translateY(-4px);
}

.step-node {
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.28), rgba(99, 102, 241, 0.18));
  border: 1px solid rgba(120, 160, 255, 0.35);
  box-shadow: 0 14px 32px -14px rgba(59, 130, 246, 0.7);
}

.step-index {
  font-size: 1.6rem;
  font-weight: 800;
  color: #d6e3ff;
}

.step-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.4;
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

/* ---- Internal-link + feature tiles ---- */
.internal-link-card,
.feature-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md) !important;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.internal-link-card:hover,
.feature-card:hover,
.feature-card.cursor-pointer:hover {
  transform: translateY(-6px);
  box-shadow: 0 24px 46px -24px rgba(0, 0, 0, 0.7);
  border-color: rgba(120, 160, 255, 0.38);
}

.cursor-pointer {
  cursor: pointer;
}

/* ---- CTA: bold gradient slab ---- */
.cta-section {
  overflow: hidden;
  text-align: center;
  background:
    radial-gradient(120% 140% at 0% 0%, rgba(255, 255, 255, 0.18), transparent 50%),
    linear-gradient(120deg, #1d3a8a 0%, #2563eb 52%, #6366f1 100%) !important;
  border-radius: 28px;
  margin: 0 16px var(--section-pad);
  box-shadow: 0 30px 70px -30px rgba(37, 99, 235, 0.6);
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
      background: linear-gradient(135deg, #1d3a8a 0%, #4f46e5 100%);
      border-color: transparent;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);

      i {
        color: white;
      }
    }
  }
}

@media (max-width: 600px) {
  .exchange-card {
    padding: 18px !important;
  }

  .house-rate {
    font-size: 1.35rem;
  }

  /* No hover on touch: keep the "ver histórico" hint visible. */
  .house-cta {
    opacity: 1;
    transform: none;
  }

  .cta-section {
    margin-inline: 8px;
    border-radius: 20px;
  }

  .best-rates-card {
    .rate-item {
      margin-bottom: 8px;
    }
  }
}

/* ============================================================
   LIGHT THEME
   The home was authored dark-first with hardcoded white-alpha
   "glass" surfaces and light text. These overrides re-skin it
   for the light toggle: airy canvas, solid white cards, dark
   ink and AA-contrast text. Scoped to `.v-theme--light` so the
   tuned dark design is left completely untouched.
   ============================================================ */
.v-theme--light .home-container {
  --ink: #16233b;
  --ink-soft: #45556e;
  --ink-muted: #5f6c82;
  --hairline: rgba(15, 23, 42, 0.1);
  --glass: rgba(255, 255, 255, 0.72);
  --glass-strong: #ffffff;

  background-color: #eef2f8;
  background-image:
    radial-gradient(900px 620px at 12% 0%, rgba(59, 130, 246, 0.1), transparent 60%),
    radial-gradient(820px 600px at 100% 4%, rgba(99, 102, 241, 0.08), transparent 55%),
    radial-gradient(900px 700px at 50% 100%, rgba(16, 185, 129, 0.05), transparent 60%);
}

/* Hero headline: dark gradient instead of white→pale-blue. */
.v-theme--light .home-container .hero-title {
  background: linear-gradient(180deg, #16233b 0%, #2456b8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* Glass surfaces → solid white cards with hairline border + soft shadow. */
.v-theme--light .home-container .exchange-card {
  background: #ffffff;
  border-color: rgba(15, 23, 42, 0.1);
  box-shadow:
    0 24px 60px -34px rgba(15, 23, 42, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.v-theme--light .home-container .house-card,
.v-theme--light .home-container .internal-link-card,
.v-theme--light .home-container .feature-card {
  background: #ffffff;
  border-color: rgba(15, 23, 42, 0.1);
}

.v-theme--light .home-container .house-card:hover,
.v-theme--light .home-container .internal-link-card:hover,
.v-theme--light .home-container .feature-card:hover {
  border-color: rgba(37, 99, 235, 0.4);
  box-shadow: 0 24px 46px -26px rgba(15, 23, 42, 0.3);
}

.v-theme--light .home-container .section-band {
  background: rgba(15, 23, 42, 0.025);
}

/* Text/icons hardcoded light for the dark canvas. */
.v-theme--light .home-container .house-rate {
  color: var(--ink);
}

.v-theme--light .home-container .house-cta {
  color: #1565c0;
}

/* Converter result + best-rates cards keep their faint tint, but the text was
   white/pale-green for the dark glass — flip it to readable ink on the light
   card. The CTA slab (.cta-section) keeps white text on its colored gradient. */
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
