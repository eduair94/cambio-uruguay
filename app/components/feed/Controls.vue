<template>
  <!--
    El pie de un directorio paginado: la paginación de siempre (slot) o, con "Cargar más al bajar"
    prendido, el estado de la carga. El interruptor está en los dos modos, justo donde termina la
    primera página: es el momento en que alguien quiere seguir mirando sin tocar "2".
  -->
  <div class="feed-controls">
    <slot v-if="!feed.active" name="pagination" />
    <div
      v-else
      class="feed-controls__status"
      role="status"
      aria-live="polite"
      data-testid="feed-status"
      :data-feed-status="feed.status"
    >
      <template v-if="feed.status === 'loading'">
        <VProgressCircular indeterminate size="20" width="2" color="primary" />
        <span>{{ t('loading') }}</span>
      </template>
      <template v-else-if="feed.status === 'paused'">
        <span>{{ t('paused', { n: pagesLoaded }) }}</span>
        <VBtn color="primary" variant="tonal" data-testid="feed-more" @click="feed.resume()">
          {{ t('more') }}
        </VBtn>
      </template>
      <template v-else-if="feed.status === 'error'">
        <span>{{ t('error') }}</span>
        <VBtn variant="text" color="primary" @click="feed.retry()">{{ t('retry') }}</VBtn>
      </template>
      <span v-else-if="feed.status === 'done'">{{ t('end') }}</span>
      <span v-else>{{ t('page', { current: feed.visiblePage, total: feed.pageCount }) }}</span>
    </div>
    <div v-if="feed.enabled && (feed.pageCount > 1 || feed.active)" class="feed-controls__mode">
      <VSwitch
        :model-value="feed.active"
        :label="t('toggle')"
        color="primary"
        density="compact"
        hide-details
        inset
        class="feed-controls__switch"
        data-testid="feed-toggle"
        @update:model-value="value => feed.setMode(value ? 'scroll' : 'paginas')"
      />
      <VBtn
        v-if="feed.active && feed.visiblePage > feed.first"
        variant="text"
        prepend-icon="mdi-arrow-up"
        data-testid="feed-top"
        @click="feed.backToTop()"
      >
        {{ t('top') }}
      </VBtn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { InfiniteFeed } from '~/composables/useInfiniteFeed'
import { infiniteFeedMessages } from '~/utils/infiniteFeedMessages'

const props = defineProps<{ feed: InfiniteFeed }>()

const { t } = useI18n({ useScope: 'local', messages: infiniteFeedMessages })

const pagesLoaded = computed(() => props.feed.last - props.feed.first + 1)
</script>

<style scoped>
.feed-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.feed-controls > :first-child {
  margin-top: 24px;
}
.feed-controls__status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 12px;
  min-height: 40px;
  text-align: center;
}
.feed-controls__mode {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px 16px;
}
.feed-controls__switch {
  flex: 0 0 auto;
}
</style>
