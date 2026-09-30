<template>
  <SurfaceCard :id="app.id" stretch class="ua-card">
    <div class="ua-card__head">
      <UsefulAppsIcon :name="app.name" :src="view.iconSrc" :size="48" />
      <div class="ua-card__title">
        <component :is="headingLevel" class="ua-card__name">{{ app.name }}</component>
        <div class="ua-card__org">
          <span class="ua-card__org-name">{{ app.organization }}</span>
          <span class="ua-kind" :class="`ua-kind--${view.kindTone}`">
            <VIcon size="14" aria-hidden="true">{{ view.kindIcon }}</VIcon>
            {{ view.kindLabel }}
          </span>
        </div>
      </div>
    </div>

    <p class="ua-card__summary">{{ app.summary }}</p>
    <ul class="ua-card__uses">
      <li v-for="use in app.uses" :key="use">{{ use }}</li>
    </ul>

    <div v-if="view.meta.length" class="ua-card__meta">
      <span v-for="item in view.meta" :key="item.text" class="ua-meta">
        <VIcon size="14" aria-hidden="true">{{ item.icon }}</VIcon>
        {{ item.text }}
      </span>
    </div>

    <p v-if="view.warning" class="ua-card__warning">
      <VIcon size="16" aria-hidden="true">mdi-alert-outline</VIcon>
      <span>
        {{ view.warning }}
        <template v-if="view.alternative">
          La oficial es <a :href="`#${view.alternative.id}`">{{ view.alternative.name }}</a
          >.
        </template>
      </span>
    </p>
    <p v-if="view.note" class="ua-card__note">{{ view.note }}</p>
    <p v-for="line in view.unavailable" :key="line" class="ua-card__note">{{ line }}</p>

    <p v-if="view.storeLine" class="ua-card__store">{{ view.storeLine }}</p>
    <p v-if="view.developerLine" class="ua-card__dev">{{ view.developerLine }}</p>

    <template #footer>
      <div class="ua-card__actions">
        <VBtn
          v-for="button in view.buttons"
          :key="button.store"
          :href="button.href"
          target="_blank"
          rel="noopener noreferrer nofollow"
          color="primary"
          :variant="button.primary ? 'flat' : button.store === 'web' ? 'text' : 'tonal'"
          :prepend-icon="button.icon"
          :aria-label="button.ariaLabel"
        >
          {{ button.label }}
        </VBtn>
      </div>
      <p v-if="view.guides.length" class="ua-card__guides">
        <span>Te sirve:</span>
        <NuxtLink v-for="guide in view.guides" :key="guide.to" :to="localePath(guide.to)">
          {{ guide.label }}
        </NuxtLink>
      </p>
    </template>
  </SurfaceCard>
</template>

<script setup lang="ts">
import type { UsefulApp, UsefulAppsPlatform } from '~/utils/usefulApps'
import { USEFUL_APPS_GUIDE_LABELS } from '~/utils/usefulAppsContent'
import type { UsefulAppsAppFacts } from '~/utils/usefulAppsStores'
import { usefulAppCardView } from '~/utils/usefulAppsView'

const props = withDefaults(
  defineProps<{
    app: UsefulApp
    facts?: UsefulAppsAppFacts | null
    platform?: UsefulAppsPlatform | null
    today: string
    alternative?: UsefulApp | null
    headingLevel?: 'h3' | 'h4'
  }>(),
  { facts: null, platform: null, alternative: null, headingLevel: 'h3' }
)

const localePath = useLocalePath()

const view = computed(() =>
  usefulAppCardView(props.app, {
    facts: props.facts,
    platform: props.platform,
    today: props.today,
    alternative: props.alternative,
    guideLabels: USEFUL_APPS_GUIDE_LABELS,
  })
)
</script>

<style scoped>
.ua-card {
  scroll-margin-top: 84px;
  min-width: 0;
}
.ua-card__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.ua-card__title {
  min-width: 0;
}
.ua-card__name {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.3;
}
.ua-card__org {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: center;
  margin-top: 4px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ua-card__org-name {
  min-width: 0;
}
.ua-kind {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 0 8px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 999px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.6;
}
.ua-kind--publica {
  background: rgba(var(--v-theme-info), 0.12);
}
.ua-kind--publica .v-icon {
  color: rgb(var(--v-theme-info));
}
.ua-kind--comunidad {
  background: rgba(var(--v-theme-warning), 0.16);
}
.ua-kind--comunidad .v-icon {
  color: rgb(var(--v-theme-warning));
}
.ua-kind--privada {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.ua-card__summary {
  margin-top: 12px;
  font-size: 0.95rem;
  line-height: 1.5;
}
.ua-card__uses {
  margin-top: 8px;
  padding-left: 20px;
  font-size: 0.875rem;
  line-height: 1.5;
}
.ua-card__uses li + li {
  margin-top: 4px;
}
.ua-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.ua-meta {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ua-card__warning {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-warning), 0.14);
  font-size: 0.875rem;
  line-height: 1.45;
}
.ua-card__warning a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.ua-card__note,
.ua-card__store,
.ua-card__dev {
  margin-top: 8px;
  font-size: 0.8rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ua-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.ua-card__actions .v-btn {
  min-height: 44px;
}
.ua-card__guides {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 12px;
  font-size: 0.8rem;
}
.ua-card__guides a {
  color: rgb(var(--v-theme-link));
}
</style>
