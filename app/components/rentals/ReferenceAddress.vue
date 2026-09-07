<template>
  <form class="rental-reference-address" @submit.prevent="search">
    <div class="rental-reference-address__input">
      <VTextField
        v-model="address"
        :label="t('referenceAddress')"
        :placeholder="t('referenceAddressExample')"
        variant="outlined"
        density="comfortable"
        hide-details
        maxlength="160"
        autocomplete="off"
        data-testid="rental-reference-address"
      />
      <VBtn
        type="submit"
        color="primary"
        variant="tonal"
        :loading="pending"
        :disabled="address.trim().length < 4"
      >
        {{ t('findAddress') }}
      </VBtn>
    </div>
    <p v-if="error" role="alert">{{ t(error) }}</p>
    <p v-else-if="searched && !pending && !items.length" role="status">
      {{ t('addressNotFound') }}
    </p>
    <ul v-if="items.length" :aria-label="t('addressResults')">
      <li v-for="item in items" :key="`${item.lat}:${item.lng}`">
        <button type="button" @click="select(item)">{{ item.label }}</button>
      </li>
    </ul>
    <p class="rental-reference-address__source">
      <a
        href="https://www.gub.uy/infraestructura-datos-espaciales/tramites-y-servicios/servicios/servicio-direcciones-geograficas"
        target="_blank"
        rel="noopener"
        >{{ t('addressSource') }}</a
      >
    </p>
  </form>
</template>

<script setup lang="ts">
import { rentalMessages } from '~/utils/rentalMessages'

interface AddressPoint {
  label: string
  lat: number
  lng: number
}
const props = defineProps<{ department: string }>()
const emit = defineEmits<{ select: [point: AddressPoint]; edit: [] }>()
const { t } = useI18n({ useScope: 'local', messages: rentalMessages })
const address = ref('')
const items = ref<AddressPoint[]>([])
const pending = ref(false)
const searched = ref(false)
const error = ref('')
let request: AbortController | null = null
function cancelSearch() {
  request?.abort()
  request = null
  pending.value = false
  items.value = []
  searched.value = false
  error.value = ''
}
watch([address, () => props.department], () => {
  cancelSearch()
  emit('edit')
})
onBeforeUnmount(cancelSearch)
async function search() {
  if (address.value.trim().length < 4) return
  cancelSearch()
  const current = new AbortController()
  request = current
  pending.value = true
  try {
    const result = await $fetch<{ items: AddressPoint[] }>('/api/rentals/geocode', {
      query: {
        q: address.value.trim(),
        ...(props.department ? { department: props.department } : {}),
      },
      signal: current.signal,
      retry: 0,
    })
    if (request === current) {
      items.value = result.items
      searched.value = true
    }
  } catch (cause: unknown) {
    if (request === current && !current.signal.aborted) {
      const status = (cause as { statusCode?: number }).statusCode
      error.value = status === 429 ? 'addressBusy' : 'addressError'
    }
  } finally {
    if (request === current) pending.value = false
  }
}
function select(item: AddressPoint) {
  emit('select', item)
  items.value = []
  searched.value = false
}
</script>

<style scoped>
.rental-reference-address {
  margin: 0 0 12px;
}
.rental-reference-address__input {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rental-reference-address__input .v-text-field {
  min-width: 0;
}
.rental-reference-address__input .v-btn {
  min-height: 48px;
  text-transform: none;
  letter-spacing: normal;
}
.rental-reference-address p {
  margin: 8px 0 0;
  font-size: 0.8rem;
  line-height: 1.45;
}
.rental-reference-address ul {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}
.rental-reference-address li + li {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-reference-address li button {
  width: 100%;
  min-height: 44px;
  padding: 10px 8px;
  text-align: left;
  color: rgb(var(--v-theme-link));
}
.rental-reference-address li button:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}
.rental-reference-address li button:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: -2px;
}
.rental-reference-address :deep(input) {
  font-size: 16px;
}
@media (max-width: 359px) {
  .rental-reference-address__input {
    flex-wrap: wrap;
  }
  .rental-reference-address__input .v-text-field {
    flex-basis: 100%;
  }
}
</style>
