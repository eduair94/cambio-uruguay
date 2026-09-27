<template>
  <section class="api-keys-panel">
    <h2 class="text-h6 font-weight-bold mb-1">Claves de la API</h2>
    <p class="text-body-2 text-medium-emphasis mb-4 api-keys-panel__intro">
      Con una clave, la API te identifica, mide tu uso y aplica tu plan. Sin clave también funciona,
      con el techo anónimo. Planes y condiciones en
      <NuxtLink :to="localePath('/empresas')">Datos para empresas</NuxtLink>.
    </p>

    <VAlert v-if="loadError" type="error" variant="tonal" class="mb-4">{{ loadError }}</VAlert>

    <VAlert v-if="created" type="success" variant="tonal" class="mb-4">
      <div class="font-weight-bold mb-1">Tu clave nueva</div>
      <p class="text-body-2 mb-2">
        Copiala ahora: por seguridad guardamos sólo una huella y no se vuelve a mostrar.
      </p>
      <div class="d-flex flex-wrap align-center ga-2 mb-2">
        <code class="api-keys-panel__secret">{{ created }}</code>
        <VBtn
          size="small"
          variant="tonal"
          :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
          @click="copy(created)"
        >
          {{ copied ? 'Copiada' : 'Copiar' }}
        </VBtn>
      </div>
      <pre class="api-keys-panel__code"><code>{{ curlExample(created) }}</code></pre>
    </VAlert>

    <VCard variant="outlined" class="pa-4 mb-6">
      <h3 class="text-subtitle-1 font-weight-bold mb-3">Crear una clave</h3>
      <form @submit.prevent="create">
        <VRow dense>
          <VCol cols="12" md="6">
            <VTextField
              v-model="form.label"
              label="Nombre de la clave"
              hint="Para reconocerla, por ejemplo «pantalla del local»"
              :maxlength="FIELD_LIMITS.label.max"
              density="comfortable"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="form.company"
              label="Empresa o proyecto"
              :maxlength="FIELD_LIMITS.company.max"
              density="comfortable"
            />
          </VCol>
          <VCol cols="12">
            <VTextarea
              v-model="form.useCase"
              label="¿Para qué la vas a usar?"
              hint="Por ejemplo: mostrar la pizarra en una pantalla, una planilla de costos, monitorear precios"
              :maxlength="FIELD_LIMITS.useCase.max"
              rows="2"
              auto-grow
              density="comfortable"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="form.website"
              label="Sitio web (opcional)"
              placeholder="https://"
              :maxlength="FIELD_LIMITS.website.max"
              density="comfortable"
            />
          </VCol>
          <VCol cols="12">
            <VCheckbox v-model="form.acceptTerms" density="compact" hide-details>
              <template #label>
                <span>
                  Acepto las
                  <NuxtLink :to="`${localePath('/empresas')}#condiciones`" target="_blank" @click.stop>
                    condiciones de uso de la API
                  </NuxtLink>
                </span>
              </template>
            </VCheckbox>
          </VCol>
        </VRow>
        <VAlert v-if="createError" type="error" variant="tonal" density="compact" class="my-3">
          {{ createError }}
        </VAlert>
        <div class="d-flex flex-wrap align-center ga-3 mt-3">
          <VBtn
            type="submit"
            color="primary"
            variant="flat"
            :loading="creating"
            :disabled="!canCreate"
            prepend-icon="mdi-key-plus"
          >
            Crear clave
          </VBtn>
          <span v-if="activeCount >= MAX_KEYS_PER_ACCOUNT" class="text-caption">
            Llegaste al tope de {{ MAX_KEYS_PER_ACCOUNT }} claves activas: revocá una para crear otra.
          </span>
        </div>
      </form>
    </VCard>

    <h3 class="text-subtitle-1 font-weight-bold mb-2">Tus claves</h3>
    <VProgressLinear v-if="loading" indeterminate class="mb-3" />
    <VAlert v-else-if="!keys.length && !loadError" type="info" variant="tonal">
      Todavía no creaste ninguna clave.
    </VAlert>
    <VRow v-else>
      <VCol v-for="k in keys" :key="k.id" cols="12" md="6">
        <VCard
          variant="outlined"
          class="pa-4 h-100"
          :class="{ 'api-keys-panel__revoked': k.status === 'revoked' }"
        >
          <div class="d-flex justify-space-between align-start ga-2">
            <div>
              <div class="text-subtitle-1 font-weight-bold">{{ k.label }}</div>
              <div class="text-caption">
                <code>{{ k.prefix }}…</code> · plan {{ API_PLAN_LABELS[k.plan] }} ·
                {{ k.status === 'active' ? 'activa' : 'revocada' }}
              </div>
            </div>
            <VBtn
              v-if="k.status === 'active'"
              size="small"
              variant="text"
              color="error"
              prepend-icon="mdi-key-remove"
              @click="askRevoke(k)"
            >
              Revocar
            </VBtn>
          </div>
          <VDivider class="my-3" />
          <dl class="api-keys-panel__facts text-body-2">
            <div>
              <dt>Creada</dt>
              <dd>{{ formatDay(k.createdAt) }}</dd>
            </div>
            <div>
              <dt>Último uso</dt>
              <dd>{{ k.lastUsedAt ? formatDay(k.lastUsedAt) : 'todavía no' }}</dd>
            </div>
            <div>
              <dt>Pedidos en 7 días</dt>
              <dd>{{ formatCount(keyUsage(usage, k.id)?.last7 ?? 0) }}</dd>
            </div>
            <div>
              <dt>Pedidos en 30 días</dt>
              <dd>{{ formatCount(keyUsage(usage, k.id)?.total ?? 0) }}</dd>
            </div>
          </dl>
        </VCard>
      </VCol>
    </VRow>

    <VDialog v-model="revokeOpen" max-width="440">
      <VCard class="pa-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">¿Revocar «{{ revoking?.label }}»?</h3>
        <p class="text-body-2 mb-4">
          Deja de funcionar en menos de un minuto y no se puede reactivar desde acá.
        </p>
        <div class="d-flex justify-end ga-2">
          <VBtn variant="text" @click="revokeOpen = false">Cancelar</VBtn>
          <VBtn color="error" variant="flat" :loading="revokingBusy" @click="revoke">Revocar</VBtn>
        </div>
      </VCard>
    </VDialog>
  </section>
</template>

<script setup lang="ts">
import {
  API_PLAN_LABELS,
  FIELD_LIMITS,
  MAX_KEYS_PER_ACCOUNT,
  curlExample,
  formatCount,
  formatDay,
  keyUsage,
  type ApiKeyRecord,
  type ApiUsageResponse,
} from '~/utils/apiKeys'

const localePath = useLocalePath()
const { authFetch } = useAuthFetch()

const keys = ref<ApiKeyRecord[]>([])
const usage = ref<ApiUsageResponse | null>(null)
const loading = ref(true)
const loadError = ref('')
const form = reactive({ label: '', company: '', useCase: '', website: '', acceptTerms: false })
const creating = ref(false)
const createError = ref('')
const created = ref('')
const copied = ref(false)
const revokeOpen = ref(false)
const revoking = ref<ApiKeyRecord | null>(null)
const revokingBusy = ref(false)

const activeCount = computed(() => keys.value.filter(k => k.status === 'active').length)
const canCreate = computed(
  () =>
    !creating.value &&
    form.acceptTerms &&
    activeCount.value < MAX_KEYS_PER_ACCOUNT &&
    form.label.trim().length >= FIELD_LIMITS.label.min &&
    form.company.trim().length >= FIELD_LIMITS.company.min &&
    form.useCase.trim().length >= FIELD_LIMITS.useCase.min
)

function errorMessage(e: any, fallback: string): string {
  return e?.data?.statusMessage || e?.data?.message || e?.statusMessage || fallback
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await authFetch<{ keys: ApiKeyRecord[]; usage: ApiUsageResponse | null }>('/api/me/api-keys')
    keys.value = res.keys
    usage.value = res.usage
  } catch (e) {
    loadError.value = errorMessage(e, 'No pudimos leer tus claves. Probá de nuevo en un rato.')
  } finally {
    loading.value = false
  }
}

async function create() {
  if (!canCreate.value) return
  creating.value = true
  createError.value = ''
  created.value = ''
  try {
    const res = await authFetch<{ key: string; apiKey: ApiKeyRecord }>('/api/me/api-keys', {
      method: 'POST',
      body: { ...form },
    })
    created.value = res.key
    form.label = ''
    form.useCase = ''
    form.acceptTerms = false
    await load()
  } catch (e) {
    createError.value = errorMessage(e, 'No se pudo crear la clave.')
  } finally {
    creating.value = false
  }
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}

function askRevoke(k: ApiKeyRecord) {
  revoking.value = k
  revokeOpen.value = true
}

async function revoke() {
  if (!revoking.value) return
  revokingBusy.value = true
  try {
    await authFetch(`/api/me/api-keys/${revoking.value.id}`, { method: 'DELETE' })
    revokeOpen.value = false
    await load()
  } catch (e) {
    loadError.value = errorMessage(e, 'No se pudo revocar la clave.')
  } finally {
    revokingBusy.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.api-keys-panel__intro {
  max-width: 760px;
}
.api-keys-panel__secret {
  font-size: 0.95rem;
  word-break: break-all;
}
.api-keys-panel__code {
  margin: 0;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-size: 0.8rem;
  overflow-x: auto;
}
.api-keys-panel__revoked {
  opacity: 0.6;
}
.api-keys-panel__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  margin: 0;
}
.api-keys-panel__facts dt {
  font-size: 0.75rem;
  opacity: 0.7;
}
.api-keys-panel__facts dd {
  margin: 0;
  font-weight: 600;
}
</style>
