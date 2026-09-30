<template>
  <section id="kit" class="ua-kit" aria-labelledby="ua-kit-title">
    <h2 id="ua-kit-title" class="ua-section-title">Las apps del Estado que todos deberían tener</h2>
    <p class="ua-kit__intro">
      Seis para casi cualquier persona que vive en Uruguay y otras que dependen de tu caso. Marcá
      las que ya tenés: queda guardado en este navegador, no en nuestros servidores.
    </p>

    <div class="ua-kit__progress">
      <VProgressLinear
        :model-value="percent"
        color="primary"
        height="8"
        rounded
        aria-hidden="true"
      />
      <p aria-live="polite">{{ progressText }}</p>
    </div>

    <h3 class="ua-kit__group">Para todos</h3>
    <ul class="ua-kit__list">
      <li
        v-for="row in view.todos"
        :key="row.item.id"
        class="ua-kit__row"
        :class="{ 'ua-kit__row--done': row.checked }"
      >
        <label class="ua-kit__check">
          <input
            type="checkbox"
            :checked="row.checked"
            :disabled="!kit.ready.value"
            @change="kit.toggle(row.item.id)"
          />
          <span class="ua-sr-only">Ya la tengo: {{ row.item.title }}</span>
        </label>
        <div class="ua-kit__body">
          <p class="ua-kit__title">{{ row.item.title }}</p>
          <p class="ua-kit__why">{{ row.item.why }}</p>
          <div v-for="app in row.apps" :key="app.id" class="ua-kit__app">
            <UsefulAppsIcon :name="app.name" :src="iconOf(app)" :size="32" />
            <a class="ua-kit__app-name" :href="`#${app.id}`">{{ app.name }}</a>
            <VBtn
              v-for="button in buttonsOf(app)"
              :key="button.store"
              :href="button.href"
              target="_blank"
              rel="noopener noreferrer nofollow"
              size="small"
              color="primary"
              :variant="button.primary ? 'flat' : 'tonal'"
              :prepend-icon="button.icon"
              :aria-label="button.ariaLabel"
            >
              {{ button.label }}
            </VBtn>
          </div>
          <a
            v-if="row.item.tab"
            class="ua-kit__more"
            :href="`?categoria=${row.item.tab}#explorar`"
            @click="onTab($event, row.item.tab)"
          >
            Ver las apps de las mutualistas
          </a>
        </div>
      </li>
    </ul>

    <h3 class="ua-kit__group">Según tu caso</h3>
    <ul class="ua-kit__list ua-kit__list--case">
      <li v-for="row in view.caso" :key="row.item.id" class="ua-kit__row">
        <div class="ua-kit__body">
          <p class="ua-kit__when">{{ row.item.when }}</p>
          <p class="ua-kit__title">{{ row.item.title }}</p>
          <p class="ua-kit__why">{{ row.item.why }}</p>
          <div v-for="app in row.apps" :key="app.id" class="ua-kit__app">
            <UsefulAppsIcon :name="app.name" :src="iconOf(app)" :size="32" />
            <a class="ua-kit__app-name" :href="`#${app.id}`">{{ app.name }}</a>
            <VBtn
              v-for="button in buttonsOf(app)"
              :key="button.store"
              :href="button.href"
              target="_blank"
              rel="noopener noreferrer nofollow"
              size="small"
              color="primary"
              :variant="button.primary ? 'flat' : 'tonal'"
              :prepend-icon="button.icon"
              :aria-label="button.ariaLabel"
            >
              {{ button.label }}
            </VBtn>
          </div>
        </div>
      </li>
    </ul>
    <p v-if="kit.storageFailed.value" class="ua-kit__warn">
      Este navegador no deja guardar datos (¿modo privado?): las marcas se van a perder al cerrar.
    </p>
  </section>
</template>

<script setup lang="ts">
import type { UsefulApp, UsefulAppCategoryId, UsefulAppsPlatform } from '~/utils/usefulApps'
import { USEFUL_APPS_KIT } from '~/utils/usefulAppsContent'
import { type UsefulAppsAppFacts, usefulAppsIconFor } from '~/utils/usefulAppsStores'
import { usefulAppStoreButtons, usefulAppsKitView } from '~/utils/usefulAppsView'

const props = defineProps<{
  apps: readonly UsefulApp[]
  facts: Readonly<Record<string, UsefulAppsAppFacts>>
  platform: UsefulAppsPlatform | null
}>()
const emit = defineEmits<{ tab: [tab: UsefulAppCategoryId] }>()

const kit = useUsefulAppsKit()
const appsById = computed(() => new Map(props.apps.map(app => [app.id, app])))
const view = computed(() => usefulAppsKitView(USEFUL_APPS_KIT, appsById.value, kit.checked.value))
const percent = computed(() =>
  view.value.total ? Math.round((view.value.done / view.value.total) * 100) : 0
)
const progressText = computed(() =>
  kit.ready.value
    ? `Tenés ${view.value.done} de ${view.value.total}.`
    : `Para todos: ${view.value.total} apps.`
)

const iconOf = (app: UsefulApp) => usefulAppsIconFor(props.facts[app.id])
const buttonsOf = (app: UsefulApp) =>
  usefulAppStoreButtons(app, props.facts[app.id], props.platform).buttons.filter(
    button => button.store !== 'web'
  )

function onTab(event: MouseEvent, tab: UsefulAppCategoryId) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  emit('tab', tab)
}
</script>

<style scoped>
.ua-kit__intro {
  max-width: 68ch;
  margin-top: 8px;
}
.ua-kit__progress {
  display: grid;
  gap: 8px;
  max-width: 420px;
  margin-top: 16px;
}
.ua-kit__progress p {
  margin: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.ua-kit__group {
  margin-top: 24px;
  font-size: 1.125rem;
  font-weight: 700;
}
.ua-kit__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 12px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.ua-kit__row {
  display: flex;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.ua-kit__row--done {
  border-color: rgba(var(--v-theme-success), 0.6);
}
.ua-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.ua-kit__check {
  position: relative;
  display: inline-flex;
  flex: 0 0 44px;
  align-items: flex-start;
  justify-content: center;
  min-height: 44px;
  cursor: pointer;
}
.ua-kit__check input {
  width: 24px;
  height: 24px;
  margin-top: 2px;
  accent-color: rgb(var(--v-theme-primary));
  cursor: pointer;
}
.ua-kit__body {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.ua-kit__body p {
  margin: 0;
}
.ua-kit__when {
  color: rgb(var(--v-theme-link));
  font-size: 0.8rem;
  font-weight: 700;
}
.ua-kit__title {
  font-weight: 700;
}
.ua-kit__why {
  font-size: 0.875rem;
  line-height: 1.45;
}
.ua-kit__app {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.ua-kit__app-name {
  min-width: 0;
  margin-right: 4px;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.ua-kit__app .v-btn {
  min-height: 44px;
}
.ua-kit__more {
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
}
.ua-kit__warn {
  margin-top: 12px;
  font-size: 0.875rem;
}
</style>
