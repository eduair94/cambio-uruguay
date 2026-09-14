<template>
  <details v-if="references.length" class="provider-reviews" :lang="locale" @toggle="toggle">
    <summary>{{ c.title }} ({{ references.length }})</summary>
    <p class="review-note">{{ c.scope }}</p>
    <p v-if="references.some(reference => reference.live)" class="review-note">{{ c.liveHint }}</p>
    <div v-for="reference in references" :key="reference.key" class="review-source">
      <p class="review-label">
        <strong>{{ platformName(reference.platform) }}</strong> ·
        <span lang="es">{{ reference.label }}</span>
      </p>
      <template v-if="reference.live">
        <p v-if="loading[reference.key]" role="status" class="review-note">{{ c.loading }}</p>
        <template v-else-if="results[reference.key]?.status === 'ok'">
          <p class="review-score">
            <strong>{{ number(results[reference.key]!.rating!, 1) }} / 5</strong>
            <span>{{ c.count.replace('{count}', number(results[reference.key]!.count!)) }}</span>
          </p>
          <p class="review-note">
            {{ c.checked }}:
            <time :datetime="results[reference.key]!.checkedAt!">{{
              checkedDate(results[reference.key]!.checkedAt!)
            }}</time>
          </p>
          <div class="google-attribution" translate="no">
            <img
              class="google-mark-light"
              src="/brand/google-maps-dark-gray.svg"
              width="98"
              height="18"
              alt="Google Maps"
            />
            <img
              class="google-mark-dark"
              src="/brand/google-maps-white.svg"
              width="98"
              height="18"
              alt="Google Maps"
            />
          </div>
          <div v-if="results[reference.key]!.attributions.length" class="review-note">
            <template
              v-for="(attribution, index) in results[reference.key]!.attributions"
              :key="index"
            >
              <a
                v-if="attribution.uri"
                :href="attribution.uri"
                target="_blank"
                rel="noopener noreferrer"
                >{{ attribution.displayName }}</a
              >
              <span v-else>{{ attribution.displayName }}</span>
            </template>
          </div>
        </template>
        <p v-else-if="results[reference.key]" class="review-note" role="status">
          {{ statusText(results[reference.key]!.status) }}
        </p>
      </template>
      <p v-else class="review-note">
        {{ reference.platform === 'google' ? c.sourceOnly : c.referenceOnly }}
      </p>
      <div class="review-links">
        <a
          :href="reference.profileUrl"
          :aria-label="`${c.source}: ${reference.label}`"
          target="_blank"
          rel="noopener noreferrer"
          >{{ c.source }} · {{ platformName(reference.platform) }}</a
        >
        <VBtn
          v-if="reference.live"
          variant="text"
          size="small"
          :disabled="loading[reference.key]"
          @click="load(reference)"
        >
          {{ results[reference.key] ? c.refresh : c.consult }}
        </VBtn>
        <a
          :href="reference.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="review-evidence"
          >{{ c.evidence }}</a
        >
      </div>
    </div>
    <p class="review-note">{{ c.caution }}</p>
  </details>
  <p v-else class="no-reviews" :lang="locale">{{ c.none }}</p>
</template>

<script setup lang="ts">
import { MOVING_REVIEW_REFERENCES, type MovingReviewReference } from '~/utils/movingReviewSources'
import type { MovingReviewsResult, MovingReviewsStatus } from '~/utils/movingReviews'
import { movingReviewsCopy } from '~/utils/movingReviewsCopy'

const props = defineProps<{ providerId: string }>()
const { locale } = useI18n()
const c = computed(() => movingReviewsCopy(locale.value))
const references = computed(() =>
  MOVING_REVIEW_REFERENCES.filter(reference => reference.providerId === props.providerId)
)
const results = ref<Record<string, MovingReviewsResult>>({})
const loading = ref<Record<string, boolean>>({})
let open = false
let generation = 0
const controllers = new Map<string, AbortController>()
function clear() {
  generation++
  for (const controller of controllers.values()) controller.abort()
  controllers.clear()
  results.value = {}
  loading.value = {}
}
onBeforeUnmount(clear)
async function toggle(event: Event) {
  open = (event.currentTarget as HTMLDetailsElement).open
  if (!open) {
    clear()
    return
  }
  // Read only profiles explicitly requested by opening this provider, never the whole directory.
  const version = generation
  for (const reference of references.value.filter(reference => reference.live).slice(0, 3)) {
    if (!open || generation !== version) return
    await load(reference)
  }
}
async function load(reference: MovingReviewReference) {
  if (loading.value[reference.key]) return
  const version = generation
  const controller = new AbortController()
  controllers.set(reference.key, controller)
  loading.value[reference.key] = true
  try {
    const result = await $fetch<MovingReviewsResult>(
      `/api/moving-reviews/${encodeURIComponent(props.providerId)}`,
      {
        query: { profileKey: reference.key },
        signal: controller.signal,
        timeout: 18_000,
        retry: 0,
      }
    )
    if (generation === version && open) results.value[reference.key] = result
  } catch (error) {
    if (controller.signal.aborted || generation !== version) return
    const data = (error as { data?: MovingReviewsResult }).data
    results.value[reference.key] =
      data?.providerId === props.providerId && data.profileKey === reference.key
        ? data
        : {
            providerId: props.providerId,
            profileKey: reference.key,
            platform: 'google',
            status: 'unavailable',
            rating: null,
            count: null,
            profileUrl: reference.profileUrl,
            profileLabel: reference.label,
            checkedAt: null,
            attributions: [],
          }
  } finally {
    controllers.delete(reference.key)
    if (generation === version) loading.value[reference.key] = false
  }
}
function platformName(platform: MovingReviewReference['platform']) {
  return {
    google: 'Google Maps',
    facebook: 'Facebook',
    '1122': '1122',
    homesolution: 'HomeSolution',
  }[platform]
}
function statusText(status: MovingReviewsStatus) {
  if (status === 'no_reviews') return c.value.noReviews
  if (status === 'identity_mismatch') return c.value.mismatch
  if (status === 'rate_limited') return c.value.limited
  if (status === 'busy') return c.value.busy
  if (status === 'not_configured') return c.value.unconfigured
  return c.value.unavailable
}
function number(value: number, decimals = 0) {
  return new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
function checkedDate(value: string) {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Montevideo',
  }).format(new Date(value))
}
</script>

<style scoped>
.provider-reviews {
  margin-top: 16px;
}
.provider-reviews summary {
  padding: 12px 0;
  cursor: pointer;
  font-weight: 600;
}
.provider-reviews summary:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
.review-source {
  padding: 16px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.2);
}
.review-label {
  margin: 0;
  font-size: 0.95rem;
}
.review-note,
.no-reviews {
  margin: 8px 0 0;
  font-size: 0.8rem;
  line-height: 1.6;
  max-width: 75ch;
}
.review-score {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 16px;
  margin: 8px 0 0;
}
.review-score strong {
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}
.review-score span {
  font-size: 0.875rem;
}
.google-attribution {
  margin: 10px 10px 5px;
}
.google-mark-light {
  display: block;
}
.google-mark-dark {
  display: none;
}
html[data-theme='dark'] .google-mark-light {
  display: none;
}
html[data-theme='dark'] .google-mark-dark {
  display: block;
}
.review-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
  margin-top: 8px;
}
.review-links a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  font-size: 0.875rem;
}
.review-links .review-evidence {
  font-size: 0.75rem;
}
a {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
  overflow-wrap: anywhere;
}
</style>
