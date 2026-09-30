<template>
  <section id="monitor" ref="root" class="monitor-panel mt-10">
    <h2 class="text-h6 font-weight-bold mb-1">Monitor de competencia</h2>
    <p class="text-body-2 text-medium-emphasis mb-4 monitor-panel__intro">
      Te avisamos por Telegram o por correo cuando otra casa mueve su pizarra, cuando cambia tu
      lugar en el grupo o cuando la tuya quedó quieta mientras las demás se movieron, y te mandamos
      un resumen al cierre del día. {{ TRIAL_DAYS }} días de prueba gratis; después sigue con el
      plan Empresa.
    </p>

    <VProgressLinear v-if="loading" indeterminate class="mb-3" />
    <VAlert v-else-if="loadError" type="error" variant="tonal" class="mb-4">{{ loadError }}</VAlert>
    <template v-else-if="data">
      <VAlert v-if="!data.canCreate" type="info" variant="tonal" class="mb-4">
        Para usar el monitor necesitás una cuenta con correo verificado: entrá con Google, o abrí el
        enlace de verificación que te mandamos al registrarte con correo y contraseña.
      </VAlert>
      <template v-else>
        <VAlert
          v-if="data.access"
          :type="accessType"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          <template v-if="data.access.status === 'trial'">
            Prueba gratis: te quedan {{ data.access.daysLeft }}
            {{ data.access.daysLeft === 1 ? 'día' : 'días' }}.
          </template>
          <template v-else-if="data.access.status === 'business'"
            >Activo con el plan Empresa.</template
          >
          <template v-else-if="data.access.status === 'unknown'">
            No pudimos confirmar tu plan en este momento. Probá de nuevo en un rato.
          </template>
          <template v-else>
            Terminó la prueba. Para que siga avisándote, escribinos a {{ API_CONTACT_EMAIL }} por el
            plan Empresa. Tu configuración queda guardada.
          </template>
          <span v-if="data.lastSentAt"> Último aviso: {{ formatDateTime(data.lastSentAt) }}.</span>
        </VAlert>

        <VCard variant="outlined" class="pa-4">
          <form @submit.prevent="save">
            <VRow dense>
              <VCol cols="12" md="6">
                <VAutocomplete
                  v-model="form.ownOrigin"
                  :items="houseItems"
                  label="Tu casa (opcional)"
                  hint="Sin casa propia, el monitor sólo avisa movimientos y el resumen"
                  persistent-hint
                  clearable
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VAutocomplete
                  v-model="form.competitors"
                  :items="competitorItems"
                  :label="`Competidores (hasta ${MAX_COMPETITORS})`"
                  multiple
                  chips
                  closable-chips
                  density="comfortable"
                />
                <p
                  v-if="form.competitors.length > MAX_COMPETITORS"
                  class="text-caption text-error mb-0"
                >
                  Elegiste {{ form.competitors.length }}: el máximo es {{ MAX_COMPETITORS }}. Sacá
                  {{ form.competitors.length - MAX_COMPETITORS }} para poder guardar.
                </p>
                <p
                  v-else-if="!form.competitors.length"
                  class="text-caption text-medium-emphasis mb-0"
                >
                  Elegí al menos un competidor.
                </p>
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.currencies"
                  :items="[...MONITOR_CURRENCIES]"
                  label="Monedas"
                  multiple
                  chips
                  density="comfortable"
                />
              </VCol>
            </VRow>

            <h3 class="text-subtitle-2 font-weight-bold mt-2 mb-1">Avisos</h3>
            <VRow dense>
              <VCol cols="12" sm="6">
                <VCheckbox
                  v-model="form.alerts.moves"
                  label="Un competidor movió su pizarra"
                  density="compact"
                  hide-details
                />
                <VCheckbox
                  v-model="form.alerts.position"
                  label="Cambió tu lugar en el grupo"
                  :disabled="!form.ownOrigin"
                  density="compact"
                  hide-details
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VCheckbox
                  v-model="form.alerts.quiet"
                  label="Tu pizarra quedó quieta y las demás se movieron"
                  :disabled="!form.ownOrigin"
                  density="compact"
                  hide-details
                />
                <VCheckbox
                  v-model="form.alerts.daily"
                  label="Resumen al cierre del día (18:30)"
                  density="compact"
                  hide-details
                />
              </VCol>
            </VRow>

            <h3 class="text-subtitle-2 font-weight-bold mt-4 mb-1">Por dónde</h3>
            <VRow dense align="center">
              <VCol cols="12" sm="6">
                <VSwitch
                  v-model="form.channels.telegram"
                  label="Telegram, al momento"
                  color="primary"
                  density="compact"
                  hide-details
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="form.channels.email"
                  :items="emailItems"
                  label="Correo"
                  density="comfortable"
                  hide-details
                />
              </VCol>
            </VRow>
            <div v-if="form.channels.telegram && !data.telegramLinked" class="mt-3">
              <p class="text-body-2 mb-2">
                Vinculá tu Telegram para recibir los avisos al momento:
              </p>
              <AccountTelegramLink />
            </div>

            <VAlert v-if="saveError" type="error" variant="tonal" density="compact" class="mt-4">{{
              saveError
            }}</VAlert>
            <VAlert v-if="saved" type="success" variant="tonal" density="compact" class="mt-4">
              Guardado. El monitor revisa las pizarras cada cinco minutos.
            </VAlert>
            <div class="d-flex flex-wrap align-center ga-3 mt-4">
              <VBtn
                type="submit"
                color="primary"
                variant="flat"
                :loading="saving"
                :disabled="!canSave"
                prepend-icon="mdi-radar"
              >
                {{ data.monitor ? 'Guardar cambios' : 'Empezar la prueba' }}
              </VBtn>
              <VSwitch
                v-if="data.monitor"
                v-model="form.active"
                label="Monitor activo"
                color="primary"
                density="compact"
                hide-details
              />
            </div>
          </form>
        </VCard>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { API_CONTACT_EMAIL, formatDateTime } from '~/utils/apiKeys'
import {
  MAX_COMPETITORS,
  MONITOR_CURRENCIES,
  TRIAL_DAYS,
  emptyMonitorInput,
  type MonitorAccess,
  type MonitorInput,
} from '~/utils/competitorMonitor'

interface MonitorResponse {
  monitor: MonitorInput | null
  access: MonitorAccess | null
  lastSentAt: string | null
  telegramLinked: boolean
  canCreate: boolean
  houses: { id: string; name: string }[]
}

const { authFetch } = useAuthFetch()
const route = useRoute()
const root = ref<HTMLElement | null>(null)
const data = ref<MonitorResponse | null>(null)
const loading = ref(true)
const loadError = ref('')
const form = reactive<MonitorInput>(emptyMonitorInput())
const saving = ref(false)
const saveError = ref('')
const saved = ref(false)

const emailItems = [
  { title: 'Sólo el resumen del día', value: 'daily' },
  { title: 'Todos los avisos', value: 'all' },
  { title: 'Nada por correo', value: 'none' },
]
const houseItems = computed(() =>
  (data.value?.houses ?? []).map(h => ({ title: h.name, value: h.id }))
)
const competitorItems = computed(() => houseItems.value.filter(h => h.value !== form.ownOrigin))
const accessType = computed(() =>
  data.value?.access?.status === 'expired' || data.value?.access?.status === 'unknown'
    ? 'warning'
    : data.value?.access?.status === 'business'
      ? 'success'
      : 'info'
)
const canSave = computed(
  () =>
    !saving.value &&
    form.competitors.length >= 1 &&
    form.competitors.length <= MAX_COMPETITORS &&
    form.currencies.length >= 1
)

watch(
  () => form.ownOrigin,
  own => {
    if (own) form.competitors = form.competitors.filter(id => id !== own)
  }
)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await authFetch<MonitorResponse>('/api/me/monitor')
    data.value = res
    Object.assign(form, res.monitor ?? emptyMonitorInput())
  } catch (e: any) {
    loadError.value =
      e?.data?.statusMessage || 'No pudimos leer tu monitor. Probá de nuevo en un rato.'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  saveError.value = ''
  saved.value = false
  try {
    await authFetch('/api/me/monitor', { method: 'PUT', body: { ...form } })
    saved.value = true
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'No se pudo guardar el monitor.'
  } finally {
    saving.value = false
  }
}

// Desde el botón de /empresas (`#monitor`): el panel de claves de arriba carga y empuja a este,
// así que el salto del router cae en otro lado. Se repite cuando ya está dibujado.
onMounted(async () => {
  await load()
  if (route.hash === '#monitor') {
    await nextTick()
    root.value?.scrollIntoView({ block: 'start' })
  }
})
</script>

<style scoped>
.monitor-panel__intro {
  max-width: 760px;
}
</style>
