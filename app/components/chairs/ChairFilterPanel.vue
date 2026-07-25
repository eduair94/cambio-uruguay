<!--
The facet panel, rendered twice: sticky in the desktop rail and inside the mobile filter sheet.
Same component both times so the two can never drift apart.
-->
<template>
  <div class="facet-panel">
    <VTextField
      :model-value="filters.query"
      :label="t('chairMarket.searchLabel')"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="comfortable"
      hide-details
      clearable
      rounded="lg"
      @update:model-value="patch('query', $event ?? '')"
    />

    <fieldset class="facet">
      <legend>{{ t('chairMarket.categoryLabel') }}</legend>
      <div class="facet-chips">
        <VChip
          v-for="option in categoryItems"
          :key="option.value"
          :variant="filters.category === option.value ? 'flat' : 'tonal'"
          :color="filters.category === option.value ? 'primary' : undefined"
          size="small"
          :aria-pressed="filters.category === option.value"
          role="button"
          @click="patch('category', option.value)"
          @keydown.space.prevent="patch('category', option.value)"
        >
          {{ option.title }}
        </VChip>
      </div>
    </fieldset>

    <fieldset class="facet">
      <legend :id="budgetLabelId">{{ t('chairMarket.budgetLabel') }}</legend>
      <output class="facet-value" :for="budgetLabelId">{{ budgetLabel }}</output>
      <VSlider
        :model-value="budgetValue"
        :min="0"
        :max="budgetCeiling"
        :step="1000"
        color="primary"
        hide-details
        density="compact"
        :aria-labelledby="budgetLabelId"
        :aria-valuetext="budgetLabel"
        @update:model-value="onBudget"
      />
    </fieldset>

    <fieldset class="facet">
      <legend>{{ t('chairMarket.conditionLabel') }}</legend>
      <div class="facet-chips">
        <VChip
          v-for="option in conditionItems"
          :key="option.value"
          :variant="filters.condition === option.value ? 'flat' : 'tonal'"
          :color="filters.condition === option.value ? 'primary' : undefined"
          size="small"
          :aria-pressed="filters.condition === option.value"
          role="button"
          @click="patch('condition', option.value)"
          @keydown.space.prevent="patch('condition', option.value)"
        >
          {{ option.title }}
        </VChip>
      </div>
    </fieldset>

    <fieldset class="facet">
      <legend>{{ t('chairMarket.ratingLabel') }}</legend>
      <div class="facet-chips">
        <VChip
          v-for="option in ratingItems"
          :key="option.value"
          :variant="filters.minStars === option.value ? 'flat' : 'tonal'"
          :color="filters.minStars === option.value ? 'primary' : undefined"
          size="small"
          :aria-pressed="filters.minStars === option.value"
          role="button"
          @click="patch('minStars', option.value)"
          @keydown.space.prevent="patch('minStars', option.value)"
        >
          {{ option.title }}
        </VChip>
      </div>
    </fieldset>

    <VSelect
      :model-value="filters.brand"
      :items="brandItems"
      :label="t('chairMarket.brandLabel')"
      variant="outlined"
      density="comfortable"
      hide-details
      rounded="lg"
      @update:model-value="patch('brand', $event)"
    />

    <VBtn variant="text" size="small" rounded="lg" class="align-self-start" @click="emit('clear')">
      {{ t('chairMarket.clearAll') }}
    </VBtn>
  </div>
</template>

<script setup lang="ts">
import {
  formatChairPrice,
  type ChairCategory,
  type ChairDirectoryFilters,
} from '~/utils/chairCatalog'

const props = defineProps<{
  filters: ChairDirectoryFilters
  brands: Array<{ value: string; count: number }>
  budgetCeiling: number
  categoryItems: Array<{ value: ChairCategory | 'all'; title: string }>
  conditionItems: Array<{ value: 'all' | 'new' | 'used'; title: string }>
  ratingItems: Array<{ value: number; title: string }>
  brandItems: Array<{ value: string; title: string }>
}>()

const emit = defineEmits<{
  'update:filters': [ChairDirectoryFilters]
  clear: []
}>()

const { t } = useI18n()
const budgetLabelId = useId()

function patch<K extends keyof ChairDirectoryFilters>(
  key: K,
  value: ChairDirectoryFilters[K]
): void {
  emit('update:filters', { ...props.filters, [key]: value })
}

/** The slider is a plain number; `maxPrice: null` means "no budget set". */
const budgetValue = computed(() => props.filters.maxPrice ?? props.budgetCeiling)
const budgetLabel = computed(() =>
  props.filters.maxPrice === null
    ? t('chairMarket.budgetAny')
    : formatChairPrice(props.filters.maxPrice)
)

const onBudget = (value: number): void => {
  patch('maxPrice', value >= props.budgetCeiling ? null : value)
}
</script>

<style scoped>
.facet-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.facet {
  border: 0;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.facet legend {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  opacity: 0.75;
  padding: 0;
}

.facet-value {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.facet-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.facet-chips .v-chip {
  cursor: pointer;
  /* Comfortable tap target: the chips are how the catalogue is filtered on a phone. */
  min-height: 40px;
  padding-inline: 14px;
}

/* Touch and stylus get the full 44px; a mouse does not need it and the rail stays compact. */
@media (pointer: coarse) {
  .facet-chips {
    gap: 10px;
  }

  .facet-chips .v-chip {
    min-height: 44px;
    padding-inline: 16px;
  }
}
</style>
