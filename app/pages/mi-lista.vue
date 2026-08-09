<template>
  <div class="mi-lista pb-8">
    <header class="wl-head">
      <p class="wl-eyebrow">Tu lista</p>
      <h1 class="wl-title">Mi lista de seguimiento</h1>
      <p class="wl-lead">
        Armá una sola vez tu zona, las casas que usás y las tarjetas que tenés en la billetera. Cada
        vez que vuelvas vas a ver <strong>solo eso</strong>: los precios que te sirven, a qué
        distancia están y cuánto se movieron desde tu última visita. Sin cuenta, sin registro: queda
        guardado en este navegador.
      </p>
    </header>

    <VAlert
      v-if="pending"
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-5"
      text="Cargando el mercado de hoy…"
    />

    <!-- Shared list arriving through ?l= -->
    <VAlert v-if="sharedPending" type="info" variant="tonal" class="mb-5">
      <p class="mb-2">Alguien te compartió una lista armada. ¿La querés usar?</p>
      <div class="d-flex ga-2 flex-wrap">
        <VBtn size="small" color="primary" variant="flat" @click="acceptShared">
          Usar esta lista
        </VBtn>
        <VBtn size="small" variant="text" @click="sharedPending = null">Seguir con la mía</VBtn>
      </div>
    </VAlert>

    <!-- Configured: the board leads -->
    <template v-if="store.configured">
      <section class="wl-summary" aria-label="Tu configuración" data-testid="wl-summary">
        <div class="wl-summary-chips">
          <VChip size="small" variant="tonal" color="primary" label>
            <VIcon start size="14">{{ zoneIcon }}</VIcon
            >{{ zoneLabel }}
          </VChip>
          <VChip size="small" variant="tonal" label>
            <VIcon start size="14">mdi-store-outline</VIcon>
            {{ store.list.origins.length || 'Todas' }}
            {{ store.list.origins.length === 1 ? 'casa' : 'casas' }}
          </VChip>
          <VChip size="small" variant="tonal" label>
            <VIcon start size="14">mdi-credit-card-outline</VIcon>
            {{ store.list.cards.length }}
            {{ store.list.cards.length === 1 ? 'tarjeta' : 'tarjetas' }}
          </VChip>
          <VChip size="small" variant="tonal" label>
            <VIcon start size="14">mdi-swap-horizontal</VIcon>
            {{ store.list.direction === 'sell' ? 'Voy a comprar' : 'Voy a vender' }}
          </VChip>
        </div>
        <VBtn
          size="small"
          variant="text"
          :prepend-icon="editing ? 'mdi-check' : 'mdi-pencil-outline'"
          @click="editing = !editing"
        >
          {{ editing ? 'Listo' : 'Editar mi lista' }}
        </VBtn>
      </section>

      <section v-if="!editing" class="wl-section">
        <h2 class="wl-section-title">Tu tablero de hoy</h2>
        <p v-if="lastSeenLabel" class="wl-section-note">{{ lastSeenLabel }}</p>

        <WatchlistBoard
          v-if="boardRows.length"
          :rows="boardRows"
          :direction="store.list.direction"
          :names="originNames"
          @alert="openAlert"
        />
        <VAlert v-else type="warning" variant="tonal" density="comfortable">
          Con esta zona y estas casas no hay cotizaciones hoy. Probá con un radio más grande, con
          todo el departamento, o sacando el filtro de casas.
        </VAlert>
      </section>

      <section v-if="!editing" class="wl-section">
        <h2 class="wl-section-title">Tus tarjetas para comprar en dólares</h2>
        <WatchlistCards
          v-if="cardCosts.length"
          :ranked="cardCosts"
          :amount-usd="store.list.amountUsd"
          :fx-venta="fxVenta ?? 0"
          :fx-mid="null"
        />
        <VAlert v-else type="info" variant="tonal" density="comfortable">
          <template v-if="!store.list.cards.length">
            Todavía no marcaste ninguna tarjeta. Agregá las tuyas en "Editar mi lista" y te
            calculamos cuánto te sale una compra en dólares con cada una.
          </template>
          <template v-else>
            Necesitamos un precio de dólar de hoy para pasar la compra a pesos y ahora no lo
            tenemos. Volvé a intentar en un rato.
          </template>
        </VAlert>
      </section>

      <section v-if="!editing" class="wl-section wl-share">
        <h2 class="wl-section-title">Llevate tu lista</h2>
        <p class="wl-section-note">
          El link guarda tu configuración: sirve para abrirla en el celular o pasársela a alguien de
          tu ciudad.
        </p>
        <div class="d-flex ga-2 flex-wrap align-center">
          <VBtn
            variant="tonal"
            color="primary"
            :prepend-icon="copied ? 'mdi-check' : 'mdi-link-variant'"
            @click="copyLink"
          >
            {{ copied ? 'Link copiado' : 'Copiar el link de mi lista' }}
          </VBtn>
          <ShareButtons
            :url="shareUrl"
            text="Armé mi lista de cambios y tarjetas en cambio-uruguay.com"
            variant="text"
            color="primary"
          />
        </div>
        <p v-if="!auth.isLoggedIn" class="wl-section-note mt-3">
          Tu lista vive en este navegador.
          <a href="#" class="wl-link" @click.prevent="auth.openDialog()">Entrá a tu cuenta</a>
          si querés tenerla también en el celular.
        </p>
        <p v-else class="wl-section-note mt-3">
          <VIcon size="14" class="mr-1">mdi-cloud-check-outline</VIcon>
          Guardada en tu cuenta: la vas a encontrar igual en cualquier dispositivo.
        </p>
      </section>

      <section v-if="editing" class="wl-section">
        <WatchlistSetup
          :branches="branches"
          :origin-options="originOptions"
          :available-currencies="availableCurrencies"
        />
        <div class="mt-6 d-flex ga-2 flex-wrap">
          <VBtn color="primary" variant="flat" @click="editing = false">Ver mi tablero</VBtn>
          <VBtn variant="text" color="error" @click="resetAll">Borrar mi lista</VBtn>
        </div>
      </section>
    </template>

    <!-- First run: the wizard leads -->
    <template v-else>
      <section class="wl-section">
        <WatchlistSetup
          :branches="branches"
          :origin-options="originOptions"
          :available-currencies="availableCurrencies"
        />
      </section>
    </template>

    <!-- Alert dialog -->
    <VDialog v-model="alertOpen" max-width="460">
      <VCard>
        <VCardTitle class="text-h6">Avisame cuando cambie</VCardTitle>
        <VCardText>
          <p class="wl-dialog-note">
            La alerta mira el <strong>mejor precio del mercado</strong> para {{ alertRow?.code }},
            no una casa en particular. Hoy el mejor de tu tablero es
            {{ alertRow ? formatRate(alertRow.price) : '' }}.
          </p>
          <VTextField
            v-model.number="alertTarget"
            type="number"
            step="0.01"
            :label="alertLabel"
            density="comfortable"
            variant="outlined"
            hide-details
            class="mt-4"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="alertOpen = false">Cancelar</VBtn>
          <VBtn color="primary" variant="flat" :loading="alertSaving" @click="createAlert">
            Crear alerta
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar v-model="snackOpen" :timeout="4000">{{ snackText }}</VSnackbar>
  </div>
</template>

<script setup lang="ts">
import { useWatchlistStore } from '~/stores/watchlist'
import { useAuthStore } from '~/stores/auth'
import { decodeWatchlist, encodeWatchlist, type Watchlist } from '~/utils/watchlist'
import {
  applyDrift,
  buildWatchlistBoard,
  rankCardCosts,
  type BoardRow,
  type OriginOption,
  type WatchBranch,
  type WatchRateRow,
} from '~/utils/watchlistBoard'

const store = useWatchlistStore()
const auth = useAuthStore()
const route = useRoute()
const localePath = useLocalePath()
const { locale } = useI18n()
const { authFetch } = useAuthFetch()
const { getAllLocations, getProcessedExchangeData } = useApiService()
const track = useTrack()

const editing = ref(false)
const copied = ref(false)
const sharedPending = ref<Watchlist | null>(null)
const snackOpen = ref(false)
const snackText = ref('')

const { data, pending } = useLazyAsyncData('mi-lista-data', async () => {
  const [locs, processed] = await Promise.all([getAllLocations(), getProcessedExchangeData('')])
  return { locs, processed }
})

const branches = computed<WatchBranch[]>(() => (data.value?.locs ?? []) as WatchBranch[])
const rates = computed<WatchRateRow[]>(
  () => (data.value?.processed?.exchangeData ?? []) as WatchRateRow[]
)
const localData = computed<Record<string, any>>(() => data.value?.processed?.localData ?? {})

/** origin -> display name, so the board never shows a raw scraper key. */
const originNames = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {}
  for (const [origin, entry] of Object.entries(localData.value)) {
    if (entry?.name) out[origin] = entry.name
  }
  return out
})

const departmentsByOrigin = computed<Record<string, string[]>>(() => {
  const out: Record<string, string[]> = {}
  for (const [origin, entry] of Object.entries(localData.value)) {
    if (Array.isArray(entry?.departments)) out[origin] = entry.departments
  }
  return out
})

const availableCurrencies = computed(() => {
  const codes = new Set<string>()
  for (const r of rates.value) if (r.code) codes.add(r.code)
  return [...codes].sort((a, b) => (a === 'USD' ? -1 : b === 'USD' ? 1 : a.localeCompare(b)))
})

/** The board as configured — what the user came for. */
const boardRows = computed<BoardRow[]>(() =>
  applyDrift(
    buildWatchlistBoard({
      branches: branches.value,
      rates: rates.value,
      watchlist: store.list,
      departmentsByOrigin: departmentsByOrigin.value,
    }),
    store.baseline
  )
)

/**
 * Everything reachable from the zone, ignoring the followed-houses filter — the
 * picker has to offer houses the user has not chosen yet.
 */
const originOptions = computed<OriginOption[]>(() => {
  const rows = buildWatchlistBoard({
    branches: branches.value,
    rates: rates.value,
    watchlist: { ...store.list, origins: [] },
    departmentsByOrigin: departmentsByOrigin.value,
  })
  const byOrigin = new Map<string, OriginOption>()
  for (const row of rows) {
    const prev = byOrigin.get(row.origin)
    const option: OriginOption = {
      origin: row.origin,
      name: originNames.value[row.origin] || row.origin,
      national: row.channel === 'online',
      distanceKm: row.distanceKm,
    }
    // A house can quote both ways (BROU counter + eBROU): keep the nearest
    // physical reading, and only call it nationwide when nothing local exists.
    if (!prev) byOrigin.set(row.origin, option)
    else if (prev.distanceKm == null && option.distanceKm != null) byOrigin.set(row.origin, option)
  }
  return [...byOrigin.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
})

/**
 * Peso price of one dollar today, taken from the user's own board. It is the
 * conversion the card table quotes against; the issuer's own FX is not public,
 * so the table reports the commission and says the spread rides on top.
 */
const fxVenta = computed<number | null>(() => {
  const usdSells = boardRows.value.filter(r => r.code === 'USD' && r.sell != null).map(r => r.sell!)
  if (usdSells.length) return Math.min(...usdSells)
  const marketSells = rates.value
    .filter(r => r.code === 'USD' && typeof r.sell === 'number' && r.sell > 0)
    .map(r => r.sell as number)
  return marketSells.length ? Math.min(...marketSells) : null
})

const cardCosts = computed(() =>
  rankCardCosts(store.list.cards, store.list.amountUsd, fxVenta.value ?? 0)
)

const zoneIcon = computed(() => (store.list.zone?.mode === 'point' ? 'mdi-map-marker' : 'mdi-map'))
const zoneLabel = computed(() => {
  const zone = store.list.zone
  if (!zone) return 'Sin zona'
  return zone.mode === 'point'
    ? `${zone.label || 'Mi ubicación'} · ${zone.radiusKm} km`
    : `${zone.label || zone.department}`
})

const lastSeenLabel = computed(() =>
  Object.keys(store.baseline).length
    ? 'Los porcentajes comparan contra los precios que viste la última vez.'
    : 'Guardamos los precios de hoy: la próxima vez vas a ver cuánto se movió cada uno.'
)

const shareUrl = computed(() => {
  const path = localePath('/mi-lista')
  const token = encodeWatchlist(store.list)
  if (!import.meta.client) return path
  return `${window.location.origin}${path}?l=${token}`
})

function formatRate(n: number): string {
  return new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2500)
    track('watchlist_share_copy')
  } catch {
    snackText.value = 'No pudimos copiar el link. Copiá la dirección de la barra del navegador.'
    snackOpen.value = true
  }
}

function acceptShared() {
  if (!sharedPending.value) return
  store.replace(sharedPending.value)
  sharedPending.value = null
  editing.value = false
}

function resetAll() {
  store.reset()
  editing.value = false
}

// --- alerts ----------------------------------------------------------------
const alertOpen = ref(false)
const alertSaving = ref(false)
const alertRow = ref<BoardRow | null>(null)
const alertTarget = ref(0)

const alertLabel = computed(() =>
  store.list.direction === 'sell' ? 'Avisame si baja de' : 'Avisame si sube de'
)

function openAlert(row: BoardRow) {
  if (!auth.isLoggedIn) {
    auth.openDialog()
    return
  }
  alertRow.value = row
  // Seed a threshold on the useful side of today's price so the alert is not
  // already true the moment it is created.
  alertTarget.value = Number(
    (store.list.direction === 'sell' ? row.price * 0.99 : row.price * 1.01).toFixed(2)
  )
  alertOpen.value = true
}

async function createAlert() {
  if (!alertRow.value) return
  alertSaving.value = true
  const kind = store.list.direction === 'sell' ? 'bestSell' : 'bestBuy'
  const op = store.list.direction === 'sell' ? '<' : '>'
  try {
    await authFetch('/api/me/alerts', {
      method: 'POST',
      body: {
        currency: alertRow.value.code,
        kind,
        op,
        target: alertTarget.value,
        channels: { push: true, email: true },
      },
    })
    track('alert_created', { currency: alertRow.value.code, kind, from: 'mi_lista' })
    snackText.value = 'Alerta creada. La vas a poder editar en tu cuenta.'
  } catch {
    snackText.value = 'No pudimos crear la alerta. Probá de nuevo en un rato.'
  }
  alertSaving.value = false
  alertOpen.value = false
  snackOpen.value = true
}

// --- lifecycle -------------------------------------------------------------
onMounted(() => {
  store.loadLocal()
  const token = route.query.l
  if (typeof token === 'string' && token) {
    const shared = decodeWatchlist(token)
    // Never clobber a list the user already built — offer, do not impose.
    if (shared) {
      if (store.configured) sharedPending.value = shared
      else store.replace(shared)
    }
  }
  if (!store.configured) editing.value = false
})

// Freeze today's prices once the board has real rows, so the next visit has a
// baseline. The store decides whether the stored one is old enough to replace.
watch(boardRows, rows => {
  if (rows.length) store.commitSnapshot(rows)
})

useSeoMeta({
  title: 'Mi lista de seguimiento — cambios y tarjetas cerca tuyo | Cambio Uruguay',
  description:
    'Armá tu lista personal: tu zona (tu barrio, tu ciudad o todo tu departamento), las casas de cambio que usás y las tarjetas que tenés. Mirá solo tus precios, cuánto se movieron y cuál de tus tarjetas te conviene. Sin registro.',
  ogTitle: 'Mi lista de seguimiento — Cambio Uruguay',
  ogDescription:
    'Tu zona, tus casas de cambio y tus tarjetas en un solo tablero. Funciona en todo el país y sin crear cuenta.',
  twitterCard: 'summary_large_image',
})
defineOgImageComponent('Cambio', {
  title: 'Mi lista de seguimiento',
  description: 'Tus cambios cerca y tus tarjetas, en un solo tablero',
})
</script>

<style scoped>
.wl-head {
  margin-bottom: 40px;
}

.wl-eyebrow {
  margin: 0 0 8px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-link));
}

.wl-title {
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
  margin: 0 0 16px;
}

.wl-lead {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  max-width: 68ch;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.wl-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 1);
  margin-bottom: 40px;
}

.wl-summary-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.wl-section + .wl-section {
  margin-top: 40px;
}

.wl-section-title {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin: 0 0 8px;
}

.wl-section-note {
  margin: 0 0 16px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.72);
  max-width: 68ch;
}

.wl-dialog-note {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.wl-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
</style>
