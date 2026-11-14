<template>
  <VDialog
    :model-value="!!destination"
    max-width="500"
    aria-labelledby="external-exit-title"
    aria-describedby="external-exit-description external-exit-timing"
    @update:model-value="value => !value && cancel()"
  >
    <VCard v-if="destination" class="external-exit" rounded="lg">
      <div class="external-exit__header">
        <h2 id="external-exit-title">{{ t('externalNavigation.title') }}</h2>
        <VBtn
          icon="mdi-close"
          variant="text"
          :aria-label="t('externalNavigation.close')"
          @click="cancel()"
        />
      </div>
      <p id="external-exit-description">{{ t('externalNavigation.description') }}</p>

      <div class="external-exit__destination">
        <span>{{ t('externalNavigation.destination') }}</span>
        <strong dir="ltr">{{ destination.host }}</strong>
        <span v-if="destination.sponsored">{{ t('ads.label') }}</span>
      </div>

      <p>
        {{
          t(
            destination.target === '_blank'
              ? 'externalNavigation.newTab'
              : 'externalNavigation.sameTab'
          )
        }}
      </p>
      <p v-if="blocked || paused" id="external-exit-timing" role="status">
        {{ t(blocked ? 'externalNavigation.blocked' : 'externalNavigation.paused') }}
      </p>
      <template v-else>
        <p class="external-exit__countdown" aria-hidden="true">
          {{ t('externalNavigation.countdown', { seconds }) }}
        </p>
        <span id="external-exit-timing" class="external-exit__sr-only">
          {{ t('externalNavigation.accessibleCountdown') }}
        </span>
      </template>

      <VCheckbox
        v-model="skipSession"
        :label="t('externalNavigation.skipSession')"
        density="comfortable"
        hide-details
        class="external-exit__preference"
      />

      <div class="external-exit__actions">
        <VBtn variant="outlined" color="primary" @click="cancel()">
          {{ t('externalNavigation.cancel') }}
        </VBtn>
        <VBtn
          :href="destination.href"
          :target="destination.target"
          :rel="destination.rel"
          :referrerpolicy="destination.referrerPolicy || undefined"
          data-external-exit="skip"
          data-external-exit-tracked
          color="primary"
          variant="flat"
          append-icon="mdi-open-in-new"
          @click="complete('now')"
        >
          {{ t('externalNavigation.goNow') }}
        </VBtn>
      </div>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
import {
  EXTERNAL_EXIT_PREFERENCE,
  EXTERNAL_EXIT_SECONDS,
  externalDestination,
  externalExitTracking,
  isPlainExternalClick,
  remainingExitSeconds,
  type ExternalDestination,
} from '~/utils/externalNavigation'

const { t } = useI18n()
const route = useRoute()
const track = useTrack()
const destination = shallowRef<ExternalDestination | null>(null)
const seconds = ref(EXTERNAL_EXIT_SECONDS)
const skipSession = ref(false)
const blocked = ref(false)
const paused = ref(false)
let trigger: HTMLAnchorElement | null = null
let timer: ReturnType<typeof setInterval> | undefined

function stopCountdown() {
  clearInterval(timer)
  timer = undefined
}

function savePreference() {
  try {
    if (skipSession.value) sessionStorage.setItem(EXTERNAL_EXIT_PREFERENCE, '1')
    else sessionStorage.removeItem(EXTERNAL_EXIT_PREFERENCE)
  } catch {
    // The setting still applies to this page when browser storage is unavailable.
  }
}

function complete(action: 'now' | 'countdown' | 'cancel') {
  stopCountdown()
  savePreference()
  if (destination.value) {
    if (action !== 'cancel') track('outbound_click', externalExitTracking(destination.value))
    track('external_exit', { action, link_domain: destination.value.host })
  }
  destination.value = null
}

function cancel() {
  complete('cancel')
  // This dialog has a delegated trigger rather than a Vuetify activator.
  void nextTick(() => trigger?.isConnected && trigger.focus({ preventScroll: true }))
}

function destinationAnchor(doc: Document, link: ExternalDestination): HTMLAnchorElement {
  const anchor = doc.createElement('a')
  anchor.href = link.href
  anchor.rel = link.rel
  anchor.referrerPolicy = link.referrerPolicy
  anchor.dataset.externalExit = 'skip'
  anchor.dataset.externalExitTracked = ''
  return anchor
}

function followCountdown() {
  stopCountdown()
  const link = destination.value
  if (!link) return
  if (link.target === '_blank') {
    // A delayed new tab can be blocked. Never replace the current page as a fallback,
    // and never pre-open an empty tab before the visitor has made a choice.
    let popup: Window | null = null
    try {
      popup = window.open('about:blank', '_blank')
      if (!popup) {
        blocked.value = true
        return
      }
      popup.opener = null
      const anchor = destinationAnchor(popup.document, link)
      popup.document.body.append(anchor)
      anchor.click()
      complete('countdown')
    } catch {
      popup?.close()
      blocked.value = true
    }
    return
  }
  const anchor = destinationAnchor(document, link)
  anchor.target = '_self'
  document.body.append(anchor)
  anchor.click()
  complete('countdown')
  anchor.remove()
}

function intercept(event: MouseEvent) {
  if (skipSession.value || !isPlainExternalClick(event)) return
  const element = event.target instanceof Element ? event.target : null
  const anchor = element?.closest<HTMLAnchorElement>('a[href]')
  if (!anchor) return
  const skip = !!anchor.closest(
    '[data-external-exit="skip"], [contenteditable="true"], [aria-disabled="true"], [inert], .adsbygoogle, .google-auto-placed, .leaflet-control-attribution'
  )
  const link = externalDestination(
    {
      href: anchor.href,
      target: anchor.target || document.querySelector('base')?.target,
      rel: anchor.rel,
      referrerPolicy: anchor.referrerPolicy,
      download: anchor.hasAttribute('download'),
      skip,
    },
    window.location.href
  )
  if (!link) return
  event.preventDefault()
  stopCountdown()
  trigger = anchor
  destination.value = link
  blocked.value = false
  paused.value = false
  seconds.value = EXTERNAL_EXIT_SECONDS
  const deadline = Date.now() + EXTERNAL_EXIT_SECONDS * 1000
  timer = setInterval(() => {
    seconds.value = remainingExitSeconds(deadline, Date.now())
    if (seconds.value === 0) followCountdown()
  }, 200)
  track('external_exit', { action: 'shown', link_domain: link.host })
}

function pauseWhenHidden() {
  if (document.hidden && destination.value && timer) {
    stopCountdown()
    paused.value = true
  }
}

watch(
  () => route.fullPath,
  () => complete('cancel')
)
onMounted(() => {
  // Embeddable widgets must preserve their host's navigation and frame behaviour.
  if (window.self !== window.top) return
  try {
    skipSession.value = sessionStorage.getItem(EXTERNAL_EXIT_PREFERENCE) === '1'
  } catch {
    // Private browsing may deny storage.
  }
  // Bubble phase respects .prevent handlers and explicit app actions before intercepting.
  document.addEventListener('click', intercept)
  document.addEventListener('visibilitychange', pauseWhenHidden)
})
onBeforeUnmount(() => {
  stopCountdown()
  document.removeEventListener('click', intercept)
  document.removeEventListener('visibilitychange', pauseWhenHidden)
})
</script>

<style scoped>
.external-exit {
  padding: 24px;
}

.external-exit__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.external-exit__header h2 {
  flex: 1;
  margin: 4px 0 0;
  font-size: 1.25rem;
  line-height: 1.4;
  font-weight: 600;
}

.external-exit p {
  margin: 12px 0 0;
  line-height: 1.6;
}

.external-exit__destination {
  display: grid;
  gap: 4px;
  margin-top: 20px;
  padding-block: 16px;
  border-block: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.external-exit__destination span {
  font-size: 0.875rem;
}

.external-exit__destination strong {
  font-size: 1.125rem;
  overflow-wrap: anywhere;
  text-align: start;
}

.external-exit__countdown {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.external-exit__preference {
  margin-top: 12px;
}

.external-exit__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.external-exit__actions .v-btn {
  min-height: 44px;
}

.external-exit__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 400px) {
  .external-exit {
    padding: 20px;
  }

  .external-exit__actions .v-btn {
    flex: 1 1 100%;
  }
}
</style>
