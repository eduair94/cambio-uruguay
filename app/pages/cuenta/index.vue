<template>
  <div class="cuenta-page py-6">
    <h1 class="text-h4 mb-6">{{ $t('account.title') }}</h1>

    <VTabs v-model="tab" class="mb-4">
      <VTab value="saved">{{ $t('auth.saved') }}</VTab>
      <VTab value="favorites">{{ $t('auth.favorites') }}</VTab>
    </VTabs>

    <VTabsWindow v-model="tab">
      <!-- Saved results with drift -->
      <VTabsWindowItem value="saved">
        <VAlert v-if="!saved.length" type="info" variant="tonal">
          {{ $t('account.savedEmpty') }}
        </VAlert>
        <VRow v-else>
          <VCol v-for="item in saved" :key="item._id" cols="12" md="6">
            <VCard variant="outlined" class="pa-4">
              <div class="d-flex justify-space-between align-start">
                <div>
                  <div class="text-subtitle-1 font-weight-bold">{{ item.title }}</div>
                  <div class="text-caption text-grey">
                    {{ $t('account.savedAt') }} {{ formatDate(item.createdAt) }}
                  </div>
                </div>
                <VBtn icon variant="text" size="small" @click="remove(item._id)">
                  <VIcon>mdi-delete-outline</VIcon>
                </VBtn>
              </div>
              <VDivider class="my-3" />
              <div
                v-for="d in driftForItem(item.snapshot?.rates ?? [])"
                :key="d.rate.label"
                class="d-flex justify-space-between text-body-2 py-1"
              >
                <span>{{ d.rate.currency }} · {{ d.rate.label }}</span>
                <span>
                  {{ $t('account.then') }}: {{ d.rate.value.toFixed(2) }} ·
                  <template v-if="d.value != null">
                    {{ $t('account.now') }}: {{ d.value.toFixed(2) }}
                    <span :class="(d.pct ?? 0) >= 0 ? 'text-success' : 'text-error'">
                      <template v-if="d.pct != null">
                        ({{ d.pct >= 0 ? '+' : '' }}{{ d.pct.toFixed(2) }}%)
                      </template>
                    </span>
                  </template>
                  <span v-else class="text-grey">{{ $t('account.rateUnavailable') }}</span>
                </span>
              </div>
            </VCard>
          </VCol>
        </VRow>
      </VTabsWindowItem>

      <!-- Favorites -->
      <VTabsWindowItem value="favorites">
        <VAlert v-if="!favoriteIds.length" type="info" variant="tonal">
          {{ $t('account.favoritesEmpty') }}
        </VAlert>
        <VList v-else>
          <VListItem v-for="id in favoriteIds" :key="id">
            <template #prepend><VIcon color="amber">mdi-star</VIcon></template>
            <VListItemTitle>{{ id.split(':')[1] }}</VListItemTitle>
            <template #append>
              <VBtn icon variant="text" size="small" @click="removeFavorite(id)">
                <VIcon>mdi-delete-outline</VIcon>
              </VBtn>
            </template>
          </VListItem>
        </VList>
      </VTabsWindowItem>
    </VTabsWindow>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { authFetch } = useAuthFetch()
const { driftForItem } = useSavedDrift()
const favorites = useFavoritesState()

const tab = ref('saved')
const saved = ref<any[]>([])

const favoriteIds = computed(() => Array.from(favorites))

function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}

async function load() {
  saved.value = await authFetch<any[]>('/api/me/saved').catch(() => [])
}

async function remove(id: string) {
  await authFetch(`/api/me/saved/${id}`, { method: 'DELETE' }).catch(() => {})
  saved.value = saved.value.filter(s => s._id !== id)
}

async function removeFavorite(id: string) {
  const [type = '', key = ''] = id.split(':')
  favorites.delete(id)
  await authFetch(`/api/me/favorites/${encodeURIComponent(key)}?type=${type}`, {
    method: 'DELETE',
  }).catch(() => {})
}

onMounted(load)
</script>
