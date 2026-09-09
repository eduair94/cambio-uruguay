<template>
  <div class="zone-picker" data-testid="rental-zones-picker">
    <VBtn
      variant="text"
      prepend-icon="mdi-map-search-outline"
      append-icon="mdi-chevron-right"
      :aria-label="t('choose')"
      class="picker-trigger"
      @click="open = true"
    >
      <span class="trigger-copy">
        <span class="trigger-label">{{ t('zonesShort') }}</span>
        <span class="trigger-summary">{{ selectionSummary }}</span>
      </span>
    </VBtn>
    <p v-if="mismatched" class="selection-summary" role="alert">{{ t('mismatch') }}</p>
    <VDialog v-model="open" :fullscreen="xs" max-width="1160" class="zone-picker-dialog">
      <VCard class="picker-card" data-clarity-mask="true">
        <header class="picker-header">
          <h2>{{ t('choose') }}</h2>
          <VBtn icon="mdi-close" variant="text" :aria-label="t('cancel')" @click="open = false" />
        </header>
        <ZoneExplorer
          v-if="open"
          :initial="modelValue"
          :locked-department="department"
          :directory="directory"
          @apply="apply"
          @cancel="open = false"
        />
      </VCard>
    </VDialog>
  </div>
</template>

<script setup lang="ts">
import type { RentalZonePreferences } from '~/utils/rentalZoneTypes'
import { useDisplay } from 'vuetify'
import { rentalZoneMessages } from '~/utils/rentalZoneMessages'
import ZoneExplorer from './Explorer.vue'
const props = withDefaults(
  defineProps<{ modelValue?: RentalZonePreferences; department?: string; directory?: boolean }>(),
  {
    modelValue: () => ({ mode: 'prefer', include: [], exclude: [] }),
    department: '',
    directory: false,
  }
)
const emit = defineEmits<{
  'update:modelValue': [value: RentalZonePreferences]
  validity: [valid: boolean]
}>()
const { t } = useI18n({ useScope: 'local', messages: rentalZoneMessages })
const { xs } = useDisplay()
const open = ref(false)
const count = computed(() => props.modelValue.include.length + props.modelValue.exclude.length)
const selectionSummary = computed(() => {
  if (!count.value) return t('anyZones')
  const summarize = (kind: 'include' | 'exclude') => {
    const zones = props.modelValue[kind]
    if (!zones.length) return ''
    const names = `${zones[0]!.neighborhood}${zones.length > 1 ? ` +${zones.length - 1}` : ''}`
    return `${t(kind === 'exclude' ? 'excludeShort' : props.modelValue.mode === 'only' ? 'onlyShort' : 'preferShort')}: ${names}`
  }
  return [summarize('include'), summarize('exclude')].filter(Boolean).join(' · ')
})
const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .trim()
    .toLowerCase()
const mismatched = computed(() =>
  Boolean(
    props.department &&
      [...props.modelValue.include, ...props.modelValue.exclude].some(
        zone => fold(zone.department) !== fold(props.department)
      )
  )
)
watch(mismatched, value => emit('validity', !value), { immediate: true })
function apply(value: RentalZonePreferences) {
  emit('update:modelValue', value)
  open.value = false
}
</script>

<style scoped>
.zone-picker {
  min-width: 0;
}
.picker-trigger {
  width: 100%;
  min-height: 44px;
  white-space: normal;
  height: auto;
  text-align: left;
  text-transform: none;
  letter-spacing: normal;
  /* Vuetify's default inline padding: both icons sit in negative margins
     (height / -9), so at 8px the map glyph was 4px from the edge. */
  padding: 8px 16px;
  justify-content: flex-start;
}
.picker-trigger :deep(.v-btn__content) {
  flex: 1;
  justify-content: flex-start;
  min-width: 0;
}
.trigger-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.trigger-label {
  font-size: 0.875rem;
  font-weight: 600;
}
.trigger-summary {
  font-size: 0.8rem;
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.selection-summary {
  margin: 8px 0 0;
  font-size: 0.8rem;
  line-height: 1.5;
}
.picker-card {
  display: flex;
  flex-direction: column;
  height: min(92dvh, 980px);
  min-height: 0;
}
.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.picker-header h2 {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.3;
}
.picker-card > .zone-explorer {
  flex: 1;
}
@media (max-width: 599px) {
  .picker-card {
    height: 100dvh;
  }
  .picker-header {
    padding: max(8px, env(safe-area-inset-top)) 12px 8px 16px;
  }
}
</style>
