<template>
  <VBtn
    variant="text"
    size="small"
    class="tour-trigger text-none"
    prepend-icon="mdi-help-circle-outline"
    @click="start('button')"
  >
    {{ t('tour.start') }}
  </VBtn>
</template>

<script setup lang="ts">
// The visitor starts this tour explicitly. Loading the page, deciding about
// cookies, scrolling or waiting must never open it or download driver.js.
const { t } = useI18n()
const track = useTrack()

async function start(trigger: 'button') {
  if (!import.meta.client) return

  const [{ driver }] = await Promise.all([import('driver.js'), import('driver.js/dist/driver.css')])

  const candidate = [
    {
      popover: { title: t('tour.welcome.title'), description: t('tour.welcome.desc') },
    },
    {
      element: '.exchange-card',
      popover: { title: t('tour.converter.title'), description: t('tour.converter.desc') },
    },
    {
      element: '[data-testid="where-to-change"]',
      popover: { title: t('tour.recommend.title'), description: t('tour.recommend.desc') },
    },
    {
      element: '.promo-section',
      popover: { title: t('tour.promo.title'), description: t('tour.promo.desc') },
    },
    {
      element: '[data-testid="theme-toggle"]',
      popover: { title: t('tour.theme.title'), description: t('tour.theme.desc') },
    },
    {
      popover: { title: t('tour.done.title'), description: t('tour.done.desc') },
    },
  ]
  // Drop steps whose target isn't on screen (e.g. theme toggle on mobile).
  const steps = candidate.filter(s => !s.element || document.querySelector(s.element))

  const d = driver({
    showProgress: true,
    allowClose: true,
    overlayOpacity: 0.6,
    stagePadding: 6,
    popoverClass: 'cu-tour',
    nextBtnText: t('tour.next'),
    prevBtnText: t('tour.prev'),
    doneBtnText: t('tour.done_btn'),
    progressText: '{{current}}/{{total}}',
    steps,
    // Fires on both finishing the last step and closing early; pair with
    // tour_start in GA4 to read the completion rate.
    onDestroyed: () => track('tour_end', { tour_trigger: trigger }),
  })

  d.drive()
  track('tour_start', { tour_trigger: trigger, steps: steps.length })
}

defineExpose({ start })
</script>

<style scoped>
.tour-trigger {
  opacity: 0.85;
}
.tour-trigger:hover {
  opacity: 1;
}
</style>

<!-- driver.js popover theming (popover is appended to <body>, outside the Vuetify
     theme container, so key on the <html data-theme> the theme composable sets). -->
<style>
.driver-popover.cu-tour {
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.driver-popover.cu-tour .driver-popover-title {
  font-size: 1.05rem;
  font-weight: 700;
}
.driver-popover.cu-tour .driver-popover-next-btn,
.driver-popover.cu-tour .driver-popover-done-btn {
  background: rgb(var(--v-theme-primary, 25 118 210));
  color: #fff;
  text-shadow: none;
  border: none;
  border-radius: 8px;
}
html[data-theme='dark'] .driver-popover.cu-tour {
  background: #1a2233;
  color: #e7ecf5;
}
html[data-theme='dark'] .driver-popover.cu-tour .driver-popover-title {
  color: #fff;
}
html[data-theme='dark'] .driver-popover.cu-tour .driver-popover-description {
  color: #aeb9cc;
}
html[data-theme='dark']
  .driver-popover.cu-tour
  .driver-popover-arrow-side-top.driver-popover-arrow {
  border-top-color: #1a2233;
}
html[data-theme='dark']
  .driver-popover.cu-tour
  .driver-popover-arrow-side-bottom.driver-popover-arrow {
  border-bottom-color: #1a2233;
}
html[data-theme='dark']
  .driver-popover.cu-tour
  .driver-popover-arrow-side-left.driver-popover-arrow {
  border-left-color: #1a2233;
}
html[data-theme='dark']
  .driver-popover.cu-tour
  .driver-popover-arrow-side-right.driver-popover-arrow {
  border-right-color: #1a2233;
}
</style>
