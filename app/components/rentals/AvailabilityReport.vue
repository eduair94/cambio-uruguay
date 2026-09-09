<template>
  <div class="availability-report" data-testid="rental-availability-report">
    <div v-if="shownSummary && shownSummary.count > 0" class="availability-report__summary">
      <VIcon icon="mdi-information-outline" size="18" aria-hidden="true" />
      <p>
        <strong>{{ t('possible') }}</strong>
        <span>{{ t('users', { n: number(shownSummary.count) }, shownSummary.count) }}</span>
        <small v-if="date(shownSummary.lastReportedAt)">{{
          t('lastReport', { date: date(shownSummary.lastReportedAt) })
        }}</small>
      </p>
    </div>
    <VBtn
      v-if="validOffers.length"
      variant="text"
      size="small"
      prepend-icon="mdi-flag-outline"
      class="availability-report__trigger"
      :aria-label="`${t(shownSummary?.count ? 'review' : 'report')}: ${title || selected?.title || sourceLabel(selected)}`"
      @click="show"
      >{{ t(shownSummary?.count ? 'review' : 'report') }}</VBtn
    >
    <VDialog
      v-if="open"
      :model-value="open"
      max-width="480"
      scrollable
      :persistent="saving"
      :aria-labelledby="headingId"
      @update:model-value="
        value => {
          if (!value) close()
        }
      "
      @after-enter="heading?.focus({ preventScroll: true })"
      @after-leave="restoreFocus"
    >
      <section class="availability-dialog">
        <header>
          <h2 :id="headingId" ref="heading" tabindex="-1">{{ t('title') }}</h2>
          <VBtn
            icon="mdi-close"
            variant="text"
            :aria-label="t('close')"
            :disabled="saving"
            @click="close"
          />
        </header>
        <div class="availability-dialog__body" :aria-busy="loading || saving">
          <VSelect
            v-if="validOffers.length > 1"
            v-model="selectedKey"
            :items="offerChoices"
            :label="t('advert')"
            :disabled="saving"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <p class="availability-dialog__source">
            {{ t('source', { source: sourceLabel(selected) }) }}
          </p>
          <p v-if="selected?.title" class="availability-dialog__title">{{ selected.title }}</p>
          <a
            v-if="selectedUrl"
            :href="selectedUrl"
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            <span>{{ t('original') }}</span>
            <VIcon icon="mdi-open-in-new" size="16" aria-hidden="true" />
          </a>
          <p class="availability-dialog__hint">{{ t('explanation') }}</p>
          <ul v-if="validOffers.length > 1" class="availability-dialog__sources">
            <li v-for="entry in validOffers" :key="availability.key(entry)">
              <strong>{{ sourceLabel(entry) }}</strong
              >:
              {{
                t(
                  'reportCount',
                  { n: number(summaryFor(entry)?.count || 0) },
                  summaryFor(entry)?.count || 0
                )
              }}
            </li>
          </ul>
          <p v-if="validOffers.length > 1" class="availability-dialog__hint">
            {{ t('groupHint') }}
          </p>
          <div v-if="selectedSummary?.count" class="availability-report__summary">
            <VIcon icon="mdi-information-outline" size="18" aria-hidden="true" />
            <p>
              <strong>{{ t('possible') }}</strong
              ><span>{{
                t('users', { n: number(selectedSummary.count) }, selectedSummary.count)
              }}</span>
            </p>
          </div>
          <p v-if="loading" role="status">{{ t('review') }}…</p>
          <p v-else-if="feedback" class="availability-dialog__notice" role="status">
            {{ t(feedback) }}
          </p>
          <div v-if="error" role="alert" class="availability-dialog__error">
            <p>{{ t(errorMessage) }}</p>
            <VBtn v-if="error !== 'report_changed'" variant="text" @click="load">{{
              t('retry')
            }}</VBtn>
          </div>
          <template v-if="!loading && !feedback">
            <p v-if="availability.currentKeys.value[selectedKey] === null && !ownState?.reported">
              {{ t('unavailable') }}
            </p>
            <div v-else-if="needsAccount">
              <p>{{ t('account') }}</p>
              <p class="availability-dialog__hint">{{ t('loginHint') }}</p>
            </div>
            <p v-else-if="ownState && !ownState.canReport && !ownState.reported">
              {{ t('unavailable') }}
            </p>
            <template v-else-if="ownState">
              <p>{{ t(ownState.reported ? 'own' : 'question') }}</p>
              <p
                v-if="ownState.reported && date(ownState.expiresAt)"
                class="availability-dialog__hint"
              >
                {{ t('expires', { date: date(ownState.expiresAt) }) }}
              </p>
            </template>
          </template>
        </div>
        <footer>
          <VBtn variant="text" :disabled="saving" @click="close">{{ t('close') }}</VBtn>
          <VBtn
            v-if="!needsAccount && (ownState?.canReport || ownState?.reported) && !feedback"
            :disabled="loading || Boolean(error && error !== 'report_changed')"
            :loading="saving"
            variant="flat"
            color="primary"
            @click="submit"
            >{{ t(ownState.reported ? 'withdraw' : 'confirm') }}</VBtn
          >
          <VBtn
            v-else-if="
              needsAccount &&
              !loading &&
              !feedback &&
              availability.currentKeys.value[selectedKey] !== null
            "
            variant="flat"
            color="primary"
            @click="signIn"
            >{{ t('login') }}</VBtn
          >
        </footer>
      </section>
    </VDialog>
  </div>
</template>

<script setup lang="ts">
import { RENTAL_SOURCE_LABEL } from '~/utils/rentals'
import { rentalDate, rentalMoney } from '~/utils/rentalPresentation'
import { rentalSavedSafeUrl } from '~/utils/rentalSaved'
import type {
  RentalAvailabilityAdvert,
  RentalAvailabilitySummary,
} from '~/utils/rentalAvailability'
import { rentalAvailabilityMessages } from '~/utils/rentalAvailabilityMessages'

interface DisplayAdvert extends RentalAvailabilityAdvert {
  title?: string
  url?: string
  sellerName?: string
  price?: number | { amount: number; currency: 'UYU' | 'USD' }
  currency?: 'UYU' | 'USD'
  availability?: RentalAvailabilitySummary
}
const props = defineProps<{
  offers: DisplayAdvert[]
  summary?: RentalAvailabilitySummary
  title?: string
  preferred?: RentalAvailabilityAdvert
}>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalAvailabilityMessages })
const availability = useRentalAvailability()
const id = useId()
const headingId = `availability-heading-${id}`
const heading = ref<HTMLElement | null>(null)
const selectedKey = ref('')
const loading = ref(false)
const feedback = ref('')
const error = ref('')
const needsAccount = computed(
  () => !availability.auth.user?.uid || ['auth_required', 'account_required'].includes(error.value)
)
let request = 0
let activator: HTMLElement | null = null
const open = computed(() => availability.activeDialog.value === id)
const validOffers = computed(() => props.offers.filter(offer => availability.key(offer)))
watch(
  () => props.offers,
  offers => availability.syncSummaries(offers),
  { immediate: true, deep: true }
)
const selected = computed(
  () =>
    validOffers.value.find(offer => availability.key(offer) === selectedKey.value) ||
    validOffers.value[0]
)
const ownState = computed(() => availability.own.value[selectedKey.value])
const saving = computed(() => !!availability.busy.value[selectedKey.value])
const selectedSummary = computed(
  () => availability.summaries.value[selectedKey.value] || selected.value?.availability
)
const summaryFor = (offer: DisplayAdvert) =>
  availability.summaries.value[availability.key(offer)] || offer.availability
const shownSummary = computed(() =>
  validOffers.value.length === 1
    ? availability.summaries.value[availability.key(validOffers.value[0]!)] ||
      props.summary ||
      validOffers.value[0]?.availability
    : props.summary
)
const selectedUrl = computed(() => rentalSavedSafeUrl(selected.value?.url))
const number = (value: number) => new Intl.NumberFormat(locale.value).format(value)
const date = (value: string | null | undefined) => rentalDate(value, locale.value)
const sourceLabel = (offer: DisplayAdvert | undefined) =>
  offer ? RENTAL_SOURCE_LABEL[offer.source] : ''
const offerChoices = computed(() =>
  validOffers.value.map(offer => {
    const amount = typeof offer.price === 'number' ? offer.price : offer.price?.amount
    const currency =
      typeof offer.price === 'object' ? offer.price.currency : offer.currency || 'UYU'
    return {
      value: availability.key(offer),
      title: [
        sourceLabel(offer),
        offer.sellerName,
        amount ? rentalMoney(amount, currency, locale.value) : '',
      ]
        .filter(Boolean)
        .join(' · '),
    }
  })
)
const errorMessage = computed(
  () =>
    ({
      auth_required: 'account',
      account_required: 'account',
      report_changed: 'changed',
      too_many_requests: 'rateLimit',
      rate_limited: 'rateLimit',
      advert_unavailable: 'unavailable',
      not_found: 'unavailable',
    })[error.value] || 'failed'
)

function show(event: MouseEvent) {
  activator = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  selectedKey.value = props.preferred ? availability.key(props.preferred) : selectedKey.value
  if (!validOffers.value.some(offer => availability.key(offer) === selectedKey.value))
    selectedKey.value = validOffers.value[0] ? availability.key(validOffers.value[0]) : ''
  feedback.value = ''
  error.value = ''
  availability.activeDialog.value = id
}
async function load() {
  if (!open.value || !selected.value) return
  const current = ++request
  loading.value = true
  error.value = ''
  try {
    await availability.inspect(selected.value)
  } catch (failure) {
    if (current === request) error.value = rentalAvailabilityErrorCode(failure)
  } finally {
    if (current === request) loading.value = false
  }
}
async function submit() {
  if (!selected.value || !ownState.value || saving.value) return
  error.value = ''
  try {
    const result = await availability.submit(selected.value, ownState.value.reported)
    if (result) feedback.value = result.reported ? 'sent' : 'removed'
  } catch (failure) {
    error.value = rentalAvailabilityErrorCode(failure)
  }
}
function close() {
  if (saving.value) return
  request++
  availability.activeDialog.value = null
  nextTick(restoreFocus)
}
function restoreFocus() {
  if (activator?.isConnected) activator.focus({ preventScroll: true })
}
function signIn() {
  close()
  availability.auth.openDialog()
}
watch([open, selectedKey, () => availability.auth.user?.uid], () => {
  feedback.value = ''
  if (open.value) void load()
})
onBeforeUnmount(() => {
  request++
  if (open.value) availability.activeDialog.value = null
})
</script>

<style scoped>
.availability-report {
  min-width: 0;
}
.availability-report__summary {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 8px;
}
.availability-report__summary > .v-icon {
  margin-top: 3px;
}
.availability-report__summary p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
}
.availability-report__summary strong,
.availability-report__summary span,
.availability-report__summary small {
  display: block;
}
.availability-report__summary small {
  font-size: 0.75rem;
  margin-top: 2px;
}
/* Keeps Vuetify's small-size padding (12px): the hover/focus box is the button's
   own border box, and zeroing the padding left the label — and the flag icon,
   which sits in a negative margin — on the box's edge. The 44px floor is the
   touch target; `size="small"` only sets the type step and the padding. */
.availability-report__trigger {
  min-height: 44px;
  max-width: 100%;
  margin-top: 4px;
  letter-spacing: 0;
}
.availability-report__trigger :deep(.v-btn__content) {
  white-space: normal;
  text-align: start;
}
.availability-dialog {
  display: flex;
  flex-direction: column;
  max-height: 100%;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
  overflow: hidden;
}
.availability-dialog header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
}
.availability-dialog h2 {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.3;
}
.availability-dialog__body {
  min-height: 0;
  overflow-y: auto;
  padding: 4px 20px 20px;
}
.availability-dialog__body p {
  margin: 12px 0 0;
}
.availability-dialog__body p:first-child {
  margin-top: 0;
}
.availability-dialog__source {
  font-size: 0.875rem;
  font-weight: 700;
}
.availability-dialog__sources {
  margin: 12px 0 0;
  padding-left: 20px;
  font-size: 0.875rem;
}
.availability-dialog__title {
  overflow-wrap: anywhere;
}
.availability-dialog__body a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  color: rgb(var(--v-theme-link));
}
.availability-dialog__hint {
  font-size: 0.875rem;
  line-height: 1.5;
}
.availability-dialog__notice {
  font-weight: 700;
}
.availability-dialog__error p {
  color: rgb(var(--v-theme-error));
}
.availability-dialog footer {
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.14);
}
.availability-dialog .v-btn {
  min-height: 44px;
}
.availability-dialog footer .v-btn {
  flex-shrink: 1;
  min-width: 0;
}
.availability-dialog footer :deep(.v-btn__content) {
  white-space: normal;
  text-align: center;
}
.availability-dialog :deep(input) {
  font-size: 16px;
}
@media (max-width: 599px) {
  .availability-dialog header {
    padding: 8px 12px;
  }
  .availability-dialog__body {
    padding: 4px 16px 16px;
  }
  .availability-dialog footer {
    padding: 8px 12px max(8px, env(safe-area-inset-bottom));
  }
}
</style>
