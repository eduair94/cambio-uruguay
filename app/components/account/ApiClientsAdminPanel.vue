<template>
  <section v-if="ready && !forbidden" class="api-admin-panel mt-10">
    <h2 class="text-h6 font-weight-bold mb-1">Clientes de la API</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Panel de administración (cuentas de NUXT_ADMIN_EMAILS). Uso de los últimos 30 días; el de hoy,
      en vivo.
    </p>
    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</VAlert>
    <VProgressLinear v-if="loading" indeterminate class="mb-3" />
    <template v-else-if="data">
      <h3 class="text-subtitle-1 font-weight-bold mb-2">Claves ({{ data.keys.length }})</h3>
      <VTable density="compact" class="mb-8">
        <thead>
          <tr>
            <th>Clave</th>
            <th>Empresa y uso</th>
            <th>Plan</th>
            <th class="text-end">7 días</th>
            <th class="text-end">30 días</th>
            <th>Por día</th>
            <th>Rutas</th>
            <th>Notas</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="k in data.keys" :key="k.id">
            <td>
              <div class="font-weight-bold">{{ k.label }}</div>
              <code>{{ k.prefix }}…</code>
              <div class="text-caption">
                {{ k.ownerEmail || k.ownerUid }} ·
                {{ k.status === 'active' ? 'activa' : 'revocada' }}
              </div>
            </td>
            <td class="api-admin-panel__use">
              <div>{{ k.company }}</div>
              <div class="text-caption">{{ k.useCase }}</div>
              <a
                v-if="k.website"
                :href="k.website"
                target="_blank"
                rel="noopener noreferrer nofollow"
                class="text-caption"
              >
                {{ k.website }}
              </a>
            </td>
            <td>
              <VSelect
                v-if="edits[k.id]"
                v-model="edits[k.id].plan"
                :items="planItems"
                density="compact"
                variant="outlined"
                hide-details
                class="api-admin-panel__plan"
              />
            </td>
            <td class="text-end">{{ formatCount(keyUsage(data.usage, k.id)?.last7 ?? 0) }}</td>
            <td class="text-end">{{ formatCount(keyUsage(data.usage, k.id)?.total ?? 0) }}</td>
            <td class="text-caption api-admin-panel__daily">
              {{ dailyText(keyUsage(data.usage, k.id), data.usage.to) }}
            </td>
            <td class="text-caption">{{ routesText(keyUsage(data.usage, k.id)?.routes) }}</td>
            <td>
              <VTextField
                v-if="edits[k.id]"
                v-model="edits[k.id].notes"
                density="compact"
                variant="outlined"
                hide-details
              />
            </td>
            <td>
              <VBtn
                size="small"
                variant="tonal"
                :loading="saving === k.id"
                :disabled="!dirty(k)"
                @click="save(k)"
              >
                Guardar
              </VBtn>
            </td>
          </tr>
        </tbody>
      </VTable>

      <h3 class="text-subtitle-1 font-weight-bold mb-1">Sin clave: quién usa la API</h3>
      <p class="text-body-2 text-medium-emphasis mb-2">
        Por User-Agent (el programa que se identifica; nunca la IP). Los que piden todos los días
        son los candidatos a un plan. Lectores del sitio en 30 días:
        {{ formatCount(data.usage.site?.total ?? 0) }} pedidos.
      </p>
      <VTable density="compact">
        <thead>
          <tr>
            <th>User-Agent</th>
            <th class="text-end">7 días</th>
            <th class="text-end">30 días</th>
            <th>Rutas</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lead in data.usage.anonymous ?? []" :key="lead.userAgent">
            <td class="api-admin-panel__ua">{{ lead.userAgent }}</td>
            <td class="text-end">{{ formatCount(lead.last7) }}</td>
            <td class="text-end">{{ formatCount(lead.total) }}</td>
            <td class="text-caption">{{ routesText(lead.routes) }}</td>
          </tr>
          <tr v-if="!(data.usage.anonymous ?? []).length">
            <td colspan="4" class="text-caption">Todavía no hay uso anónimo medido.</td>
          </tr>
        </tbody>
      </VTable>
      <h3 class="text-subtitle-1 font-weight-bold mt-8 mb-2">
        Monitores de competencia ({{ monitors.length }})
      </h3>
      <VTable density="compact">
        <thead>
          <tr>
            <th>Cuenta</th>
            <th>Casa y grupo</th>
            <th>Monedas</th>
            <th>Acceso</th>
            <th>Último aviso</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in monitors" :key="m.uid">
            <td>
              <div>{{ m.email || m.uid }}</div>
              <div class="text-caption">{{ m.active ? 'activo' : 'pausado' }}</div>
            </td>
            <td class="text-caption">{{ m.ownOrigin || '—' }} · {{ m.competitors.join(', ') }}</td>
            <td class="text-caption">{{ m.currencies.join(', ') }}</td>
            <td class="text-caption">{{ accessText(m.access) }}</td>
            <td class="text-caption">{{ m.lastSentAt ? formatDateTime(m.lastSentAt) : '—' }}</td>
          </tr>
          <tr v-if="!monitors.length">
            <td colspan="5" class="text-caption">Todavía nadie armó un monitor.</td>
          </tr>
        </tbody>
      </VTable>
    </template>
  </section>
</template>

<script setup lang="ts">
import {
  API_PLAN_LABELS,
  ASSIGNABLE_PLANS,
  dailyText,
  formatCount,
  formatDateTime,
  keyUsage,
  type ApiKeyRecord,
  type ApiPlanId,
  type ApiUsageResponse,
} from '~/utils/apiKeys'
import type { MonitorAccess } from '~/utils/competitorMonitor'

interface AdminMonitor {
  uid: string
  email: string | null
  ownOrigin: string | null
  competitors: string[]
  currencies: string[]
  active: boolean
  access: MonitorAccess
  lastSentAt: string | null
}
const monitors = ref<AdminMonitor[]>([])

function accessText(access: MonitorAccess): string {
  if (access.status === 'trial') return `prueba, ${access.daysLeft} d`
  if (access.status === 'business') return 'Empresa'
  if (access.status === 'unknown') return 'sin confirmar'
  return 'vencido'
}

const { authFetch } = useAuthFetch()

const data = ref<{ keys: ApiKeyRecord[]; usage: ApiUsageResponse } | null>(null)
const loading = ref(true)
const error = ref('')
const forbidden = ref(false)
// No se dibuja nada hasta saber si la cuenta es administradora: antes, a cualquier usuario le
// aparecía un instante el título del panel mientras volvía el 403.
const ready = ref(false)
const saving = ref('')
const edits = reactive<Record<string, { plan: ApiPlanId; notes: string }>>({})
const planItems = ASSIGNABLE_PLANS.map(plan => ({ title: API_PLAN_LABELS[plan], value: plan }))

function resetEdits(keys: ApiKeyRecord[]) {
  for (const k of keys) edits[k.id] = { plan: k.plan, notes: k.notes ?? '' }
}

function dirty(k: ApiKeyRecord): boolean {
  const e = edits[k.id]
  return !!e && (e.plan !== k.plan || e.notes.trim() !== (k.notes ?? ''))
}

function routesText(routes?: { route: string; count: number }[]): string {
  return (
    (routes ?? [])
      .slice(0, 3)
      .map(r => `${r.route} (${formatCount(r.count)})`)
      .join(', ') || '—'
  )
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await authFetch<{ keys: ApiKeyRecord[]; usage: ApiUsageResponse }>(
      '/api/admin/api-clients'
    )
    resetEdits(res.keys)
    data.value = res
    monitors.value = (
      await authFetch<{ monitors: AdminMonitor[] }>('/api/admin/monitors').catch(() => ({
        monitors: [],
      }))
    ).monitors
  } catch (e: any) {
    const status = Number(e?.statusCode ?? e?.response?.status ?? 0)
    if (status === 403 || status === 401) forbidden.value = true
    else error.value = e?.data?.statusMessage || `La ruta respondió ${status || 'sin respuesta'}.`
  } finally {
    loading.value = false
    ready.value = true
  }
}

async function save(k: ApiKeyRecord) {
  const e = edits[k.id]
  if (!e) return
  saving.value = k.id
  try {
    const res = await authFetch<{ apiKey: ApiKeyRecord }>(`/api/admin/api-clients/${k.id}`, {
      method: 'PATCH',
      body: { plan: e.plan, notes: e.notes.trim() || null },
    })
    if (data.value) data.value.keys = data.value.keys.map(x => (x.id === k.id ? res.apiKey : x))
    resetEdits([res.apiKey])
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'No se pudo guardar.'
  } finally {
    saving.value = ''
  }
}

onMounted(load)
</script>

<style scoped>
.api-admin-panel__plan {
  min-width: 130px;
}
.api-admin-panel__use {
  max-width: 280px;
}
.api-admin-panel__daily {
  min-width: 220px;
}
.api-admin-panel__ua {
  max-width: 420px;
  word-break: break-all;
  font-size: 0.8rem;
}
</style>
