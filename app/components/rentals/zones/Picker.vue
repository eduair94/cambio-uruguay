<template>
  <div class="zone-picker" data-testid="rental-zones-picker">
    <VBtn variant="text" prepend-icon="mdi-map-search-outline" @click="open = true">
      <span>{{ t('choose') }}</span>
    </VBtn>
    <p v-if="count" class="selection-summary">
      {{ t(modelValue.mode === 'only' ? 'only' : 'prefer') }} · {{ t('selected', { n: count }) }}
    </p>
    <p v-if="mismatched" class="selection-summary" role="alert">{{ t('mismatch') }}</p>
    <details v-if="count" class="selection-list">
      <summary>{{ t('included') }} / {{ t('excluded') }}</summary>
      <ul>
        <li v-for="zone in modelValue.include" :key="`in:${zone.department}:${zone.neighborhood}`">
          {{ zone.neighborhood }} · {{ zone.department }}
        </li>
        <li v-for="zone in modelValue.exclude" :key="`out:${zone.department}:${zone.neighborhood}`">
          {{ t('excludedTag') }}: {{ zone.neighborhood }} · {{ zone.department }}
        </li>
      </ul>
    </details>
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
.zone-picker > .v-btn {
  min-height: 44px;
  white-space: normal;
  height: auto;
  text-align: left;
}
.selection-summary {
  margin: 8px 0 0;
  font-size: 0.8rem;
  line-height: 1.5;
}
.selection-list {
  margin-top: 4px;
  font-size: 0.8rem;
}
.selection-list summary {
  display: flex;
  align-items: center;
  min-height: 44px;
  cursor: pointer;
}
.selection-list summary::before {
  content: '▸';
  margin-right: 8px;
}
.selection-list[open] summary::before {
  content: '▾';
}
.selection-list ul {
  margin: 0;
  padding-left: 20px;
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
