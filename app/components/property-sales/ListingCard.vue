<template>
  <article class="sale-card" :data-sale-key="property.key">
    <div class="sale-card__visual">
      <!-- Con foto, la imagen abre el visor sin salir del listado; sin foto no hay nada que
           previsualizar y el destino util sigue siendo la ficha. -->
      <button
        v-if="property.image && !failed"
        type="button"
        class="sale-card__photo"
        :aria-label="`${t('viewPhotos')}: ${property.title}`"
        @click="requestPreview"
      >
        <img
          :src="property.image"
          :alt="property.title"
          loading="lazy"
          width="480"
          height="300"
          referrerpolicy="no-referrer"
          @error="failed = true"
        />
        <span class="sale-card__zoom" aria-hidden="true">
          <VIcon icon="mdi-image-multiple-outline" size="15" />
          {{ t('viewPhotos') }}
        </span>
      </button>
      <NuxtLink
        v-else
        :to="localePath(propertySalePath(property.key))"
        :aria-label="`${t('detail')}: ${property.title}`"
        class="sale-card__photo"
      >
        <span>
          <VIcon icon="mdi-home-outline" size="40" />
          <span>{{ t('noPhoto') }}</span>
        </span>
      </NuxtLink>
      <VBtn
        class="sale-card__save"
        :icon="favorites.has(property.key) ? 'mdi-heart' : 'mdi-heart-outline'"
        :aria-label="t(favorites.has(property.key) ? 'unsave' : 'save')"
        :aria-pressed="favorites.has(property.key)"
        variant="text"
        @click="favorites.toggle(property.key)"
      />
    </div>
    <div class="sale-card__body">
      <p class="sale-card__location">
        {{
          [property.neighborhood, property.locality || property.department]
            .filter((value, index, all) => value && all.indexOf(value) === index)
            .join(' · ')
        }}
      </p>
      <h3>
        <NuxtLink :to="localePath(propertySalePath(property.key))">{{ property.title }}</NuxtLink>
      </h3>
      <PropertySalesFacts :property="property" :area-basis="areaBasis" compact />
      <div v-if="property.conditions.length" class="sale-card__conditions">
        <span v-for="condition in property.conditions" :key="condition">{{ t(condition) }}</span>
      </div>
      <div class="sale-card__attribution">
        <span>
          {{ propertySaleSourceName(property.source) }}
          <template v-if="property.sellerName">· {{ property.sellerName }}</template>
          <template v-if="property.ownerDirect?.declared"> · {{ t('owner') }}</template>
        </span>
        <time :datetime="property.lastSeen">{{ t('read') }}: {{ readDate }}</time>
      </div>
      <VCheckbox
        v-if="compareable"
        :model-value="compared"
        :label="t('selectCompare')"
        hide-details
        density="compact"
        @update:model-value="$emit('compare', property.key)"
      />
      <div class="sale-card__links">
        <NuxtLink :to="localePath(propertySalePath(property.key))">
          {{ t('detail') }}
          <VIcon icon="mdi-arrow-right" size="18" aria-hidden="true" />
        </NuxtLink>
        <a
          class="sale-card__source-link"
          :href="property.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('original') }}
          <VIcon icon="mdi-open-in-new" size="16" aria-hidden="true" />
        </a>
      </div>
    </div>
    <VSnackbar v-model="favorites.limited.value" timeout="4000">{{ t('savedLimit') }}</VSnackbar>
    <VSnackbar v-model="favorites.storageFailed.value" timeout="6000">{{
      t('savedTemporary')
    }}</VSnackbar>
  </article>
</template>
<script setup lang="ts">
import {
  propertySalePath,
  type PropertySaleAreaBasis,
  type PropertySaleSummary,
} from '~/utils/propertySales'
import { propertySaleSourceName, propertySalesMessages } from '~/utils/propertySalesMessages'
import { propertySalePhotoRefs } from '~/utils/propertySalesPhotos'
import type { PropertyPreviewRequest } from '~/utils/photoViewer'
const props = withDefaults(
  defineProps<{
    property: PropertySaleSummary
    areaBasis?: PropertySaleAreaBasis
    compareable?: boolean
    compared?: boolean
  }>(),
  { areaBasis: 'built', compareable: false, compared: false }
)
const emit = defineEmits<{ compare: [key: string]; preview: [PropertyPreviewRequest] }>()
function requestPreview() {
  if (!props.property.image || failed.value) return
  emit('preview', {
    title: props.property.title,
    photos: propertySalePhotoRefs(props.property),
    source: { kind: 'sale', key: props.property.key },
    detailHref: localePath(propertySalePath(props.property.key)),
  })
}
const { t, locale } = useI18n({ useScope: 'local', messages: propertySalesMessages })
const localePath = useLocalePath()
const favorites = usePropertySaleFavorites()
const failed = ref(false)
const readDate = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeZone: 'America/Montevideo',
  }).format(new Date(props.property.lastSeen))
)
</script>
<style scoped>
.sale-card {
  min-width: 0;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}
:where(.sale-card) :where(p, h3) {
  margin: 0;
}
.sale-card__visual {
  position: relative;
}
.sale-card__photo {
  display: flex;
  width: 100%;
  aspect-ratio: 16/10;
  max-height: 200px;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.045);
  color: rgba(var(--v-theme-on-surface), 0.65);
  text-decoration: none;
}
button.sale-card__photo {
  padding: 0;
  border: 0;
  cursor: zoom-in;
}
/* La foto hace algo distinto que el resto de la tarjeta: sin cartel, abrir un visor sorprende. */
.sale-card__photo > .sale-card__zoom {
  position: absolute;
  top: 10px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 0;
  transition: opacity 160ms ease;
}
.sale-card__photo:hover > .sale-card__zoom,
.sale-card__photo:focus-visible > .sale-card__zoom {
  opacity: 1;
}
@media (hover: none) {
  .sale-card__photo > .sale-card__zoom {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sale-card__photo > .sale-card__zoom {
    transition: none;
  }
}
.sale-card__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sale-card__photo > span {
  display: grid;
  justify-items: center;
  gap: 8px;
  font-size: 0.85rem;
}
.sale-card__save {
  position: absolute;
  right: 10px;
  top: 10px;
  min-width: 44px;
  min-height: 44px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}
.sale-card__save[aria-pressed='true'] {
  color: rgb(var(--v-theme-link));
}
.sale-card__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sale-card__location {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.sale-card h3 {
  font-size: 1rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sale-card h3:focus-within {
  display: block;
}
.sale-card h3 a {
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
}
.sale-card h3 a:hover {
  text-decoration: underline;
}
.sale-card__conditions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sale-card__conditions span {
  font-size: 0.72rem;
  border-left: 2px solid rgb(var(--v-theme-warning));
  padding: 2px 6px;
  background: rgba(var(--v-theme-warning), 0.06);
}
.sale-card__attribution {
  display: grid;
  gap: 4px;
  font-size: 0.73rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  overflow-wrap: anywhere;
}
.sale-card__links {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  padding-top: 4px;
}
.sale-card__links a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.sale-card a:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
@media (max-width: 599px) {
  .sale-card__photo {
    max-height: 176px;
  }
}
</style>
