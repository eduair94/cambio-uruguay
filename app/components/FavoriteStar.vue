<template>
  <VBtn
    icon
    variant="text"
    size="small"
    :color="active ? 'amber' : undefined"
    :aria-label="$t('account.favorites')"
    @click.stop.prevent="toggle"
  >
    <VIcon size="small">{{ active ? 'mdi-star' : 'mdi-star-outline' }}</VIcon>
  </VBtn>
</template>

<script setup lang="ts">
const props = defineProps<{
  type: 'casa' | 'currency' | 'pair'
  itemKey: string
  label?: string
}>()

const store = useAuthStore()
const { authFetch } = useAuthFetch()
const favorites = useFavoritesState()

const id = computed(() => `${props.type}:${props.itemKey}`)
const active = computed(() => favorites.has(id.value))

async function toggle() {
  if (!store.isLoggedIn) {
    store.openDialog()
    return
  }
  if (active.value) {
    favorites.delete(id.value)
    await authFetch(`/api/me/favorites/${encodeURIComponent(props.itemKey)}?type=${props.type}`, {
      method: 'DELETE',
    }).catch(() => favorites.add(id.value)) // rollback on failure
  } else {
    favorites.add(id.value)
    await authFetch('/api/me/favorites', {
      method: 'POST',
      body: { type: props.type, key: props.itemKey, label: props.label ?? '' },
    }).catch(() => favorites.delete(id.value))
  }
}
</script>
