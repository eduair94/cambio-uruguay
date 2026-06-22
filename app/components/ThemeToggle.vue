<template>
  <!-- Native title (no VTooltip) keeps the accessible name simple and avoids an
       empty role="tooltip" node that Lighthouse flags. -->
  <VBtn
    :icon="icon"
    variant="text"
    :aria-label="ariaLabel"
    :title="tooltip"
    data-testid="theme-toggle"
    @click="cycle"
  >
    <VIcon>{{ icon }}</VIcon>
  </VBtn>
</template>

<script setup lang="ts">
const { mode, cycle, init } = useThemeMode()
const { t } = useI18n()

const icon = computed(() => {
  if (mode.value === 'light') return 'mdi-weather-sunny'
  if (mode.value === 'dark') return 'mdi-weather-night'
  return 'mdi-theme-light-dark'
})

const modeLabel = computed(() => t(`theme.${mode.value}`))
const ariaLabel = computed(() => t('a11y.toggleTheme'))
const tooltip = computed(() => `${t('theme.label')}: ${modeLabel.value}`)

onMounted(init)
</script>
