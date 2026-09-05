<template>
  <nav class="content-task-links" :aria-label="label">
    <NuxtLink v-for="item in items" :key="item.to" :to="item.to" @click="trackNavigation(item.to)">
      {{ item.label }}
      <VIcon size="16" aria-hidden="true">
        {{ item.to.startsWith('#') ? 'mdi-arrow-down' : 'mdi-arrow-right' }}
      </VIcon>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    items: { label: string; to: string }[]
    placement?: string
  }>(),
  { placement: 'page_entry' }
)
const route = useRoute()
const track = useTrack()

function trackNavigation(destination: string) {
  track('content_navigation', {
    content_path: route.path,
    destination_path: destination.startsWith('#') ? `${route.path}${destination}` : destination,
    placement: props.placement,
  })
}
</script>

<style scoped>
.content-task-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.5rem;
}

.content-task-links a {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding-block: 0.5rem;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  line-height: 1.5;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.content-task-links a:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
}

.content-task-links .v-icon {
  flex-shrink: 0;
}
</style>
