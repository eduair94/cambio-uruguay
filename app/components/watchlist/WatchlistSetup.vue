<template>
  <div class="wl-setup">
    <!-- 1 · Zona -->
    <section class="wl-step">
      <div class="wl-step-head">
        <span class="wl-step-num">1</span>
        <div class="wl-step-titles">
          <h2 class="wl-step-title">Tu zona</h2>
          <p class="wl-step-help">
            De acá sale el "cerca". Si estás en el interior, elegí tu departamento o tu ciudad: las
            cotizaciones que se toman por app o transferencia igual te aparecen, porque funcionan
            desde cualquier lado.
          </p>
        </div>
      </div>

      <div class="wl-step-body">
        <div class="wl-zone-actions">
          <VBtn
            color="primary"
            :loading="locating"
            variant="flat"
            prepend-icon="mdi-crosshairs-gps"
            @click="locate"
          >
            Usar mi ubicación
          </VBtn>
          <VSelect
            v-if="isPointZone"
            :model-value="radiusKm"
            :items="RADIUS_ITEMS"
            label="Radio"
            density="comfortable"
            variant="outlined"
            hide-details
            class="wl-radius"
            @update:model-value="setRadius"
          />
        </div>

        <p v-if="geoError" class="wl-error">
          <VIcon size="16" class="mr-1">mdi-alert-circle-outline</VIcon>{{ geoError }}
        </p>

        <div class="wl-or">o elegí en el mapa administrativo</div>

        <div class="wl-zone-selects">
          <VSelect
            v-model="dept"
            :items="departmentItems"
            label="Departamento"
            density="comfortable"
            variant="outlined"
            hide-details
            clearable
            data-testid="wl-dept-select"
          />
          <VSelect
            v-model="locality"
            :items="localityItems"
            :disabled="!dept"
            label="Ciudad o localidad"
            density="comfortable"
            variant="outlined"
            hide-details
            clearable
          />
          <VBtn
            :disabled="!dept"
            variant="tonal"
            color="primary"
            data-testid="wl-apply-zone"
            @click="applyAdminZone"
          >
            Usar esta zona
          </VBtn>
        </div>

        <p v-if="dept && !localityItems.length" class="wl-note">
          No tenemos sucursales mapeadas en {{ dept }}. Podés seguir todo el departamento igual: te
          mostramos lo que opera ahí más lo que funciona a nivel nacional.
        </p>

        <div v-if="store.list.zone" class="wl-current">
          <VChip color="primary" variant="flat" size="small" label>
            <VIcon start size="14">{{
              store.list.zone.mode === 'point' ? 'mdi-map-marker' : 'mdi-map'
            }}</VIcon>
            {{ zoneLabel }}
          </VChip>
          <VBtn size="small" variant="text" @click="store.setZone(null)">Quitar zona</VBtn>
        </div>
      </div>
    </section>

    <!-- 2 · Casas -->
    <section class="wl-step">
      <div class="wl-step-head">
        <span class="wl-step-num">2</span>
        <div class="wl-step-titles">
          <h2 class="wl-step-title">Las casas que usás</h2>
          <p class="wl-step-help">
            Marcá las que realmente pisarías o tenés cuenta. Si no marcás ninguna, te mostramos
            todas las que llegan a tu zona.
          </p>
        </div>
      </div>

      <div class="wl-step-body">
        <div v-if="!originOptions.length" class="wl-note">
          Todavía no hay cotizaciones para mostrar acá. Probá con un radio más grande o con todo el
          departamento.
        </div>
        <ul v-else class="wl-origins">
          <li v-for="o in originOptions" :key="o.origin" class="wl-origin">
            <VCheckbox
              :model-value="store.list.origins.includes(o.origin)"
              :label="o.name"
              density="compact"
              hide-details
              color="primary"
              @update:model-value="store.toggleOrigin(o.origin)"
            />
            <span class="wl-origin-meta">
              <VChip v-if="o.national" size="x-small" variant="tonal" color="info" label>
                <VIcon start size="12">mdi-cellphone</VIcon>Nacional
              </VChip>
              <span v-else-if="o.distanceKm != null" class="wl-dist">
                a {{ formatKm(o.distanceKm) }}
              </span>
            </span>
          </li>
        </ul>
        <div v-if="store.list.origins.length" class="mt-2">
          <VBtn size="small" variant="text" @click="store.setOrigins([])">
            Ver todas otra vez
          </VBtn>
        </div>
      </div>
    </section>

    <!-- 3 · Tarjetas -->
    <section class="wl-step">
      <div class="wl-step-head">
        <span class="wl-step-num">3</span>
        <div class="wl-step-titles">
          <h2 class="wl-step-title">Las tarjetas que tenés</h2>
          <p class="wl-step-help">
            Con eso calculamos cuánto te sale de verdad una compra en dólares con cada una:
            comisión, cargo fijo, IVA y el margen de cambio.
          </p>
        </div>
      </div>

      <div class="wl-step-body">
        <div v-for="group in cardGroups" :key="group.kind" class="wl-card-group">
          <p class="wl-group-label">{{ group.label }}</p>
          <div class="wl-chips">
            <VChip
              v-for="card in group.cards"
              :key="card.id"
              :color="store.list.cards.includes(card.id) ? 'primary' : undefined"
              :variant="store.list.cards.includes(card.id) ? 'flat' : 'outlined'"
              size="small"
              :aria-pressed="store.list.cards.includes(card.id)"
              data-testid="wl-card-chip"
              @click="store.toggleCard(card.id)"
            >
              <VIcon v-if="store.list.cards.includes(card.id)" start size="14">mdi-check</VIcon>
              {{ card.name }}
            </VChip>
          </div>
        </div>
      </div>
    </section>

    <!-- Preferencias -->
    <section class="wl-step">
      <div class="wl-step-head">
        <span class="wl-step-num"><VIcon size="16">mdi-tune-variant</VIcon></span>
        <div class="wl-step-titles">
          <h2 class="wl-step-title">Qué querés hacer</h2>
        </div>
      </div>

      <div class="wl-step-body wl-prefs">
        <VBtnToggle
          :model-value="store.list.direction"
          mandatory
          density="comfortable"
          variant="outlined"
          divided
          @update:model-value="store.setDirection($event)"
        >
          <VBtn value="sell">Comprar moneda</VBtn>
          <VBtn value="buy">Vender moneda</VBtn>
        </VBtnToggle>

        <VSelect
          :model-value="store.list.currencies"
          :items="currencyItems"
          label="Monedas"
          multiple
          chips
          closable-chips
          density="comfortable"
          variant="outlined"
          hide-details
          class="wl-currencies"
          @update:model-value="store.setCurrencies($event)"
        />

        <VTextField
          :model-value="store.list.amountUsd"
          type="number"
          min="1"
          step="0.01"
          prefix="US$"
          label="Compra de referencia"
          density="comfortable"
          variant="outlined"
          hide-details
          class="wl-amount"
          @update:model-value="store.setAmount(Number($event))"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { DEBIT_CARDS, KIND_LABELS, type CardKind } from '~/utils/debitCards'
import { dedupeDepartmentNames } from '~/utils/departments'
import {
  localitiesForDepartment,
  localityCenter,
  type OriginOption,
  type WatchBranch,
} from '~/utils/watchlistBoard'
import { useWatchlistStore } from '~/stores/watchlist'

const props = defineProps<{
  branches: WatchBranch[]
  originOptions: OriginOption[]
  availableCurrencies: string[]
}>()

const store = useWatchlistStore()

const RADIUS_ITEMS = [
  { title: '1 km — mi barrio', value: 1 },
  { title: '2 km', value: 2 },
  { title: '5 km — mi ciudad', value: 5 },
  { title: '10 km', value: 10 },
  { title: '25 km', value: 25 },
  { title: '50 km — y alrededores', value: 50 },
]

const locating = ref(false)
const geoError = ref('')
const dept = ref<string | null>(null)
const locality = ref<string | null>(null)

const isPointZone = computed(() => store.list.zone?.mode === 'point')
const radiusKm = computed(() => store.list.zone?.radiusKm ?? 5)
const zoneLabel = computed(() => {
  const zone = store.list.zone
  if (!zone) return ''
  return zone.mode === 'point'
    ? `${zone.label || 'Mi ubicación'} · ${zone.radiusKm} km`
    : `${zone.label || zone.department} · todo el departamento`
})

const departmentItems = computed(() =>
  dedupeDepartmentNames(props.branches.map(b => b.dept ?? '').filter(Boolean))
)

const localityItems = computed(() =>
  dept.value
    ? localitiesForDepartment(props.branches, dept.value).map(l => ({
        title: `${l.locality} (${l.count})`,
        value: l.locality,
      }))
    : []
)

const currencyItems = computed(() =>
  props.availableCurrencies.length ? props.availableCurrencies : ['USD']
)

const cardGroups = computed(() =>
  (['fintech', 'prepaga', 'banco'] as CardKind[])
    .map(kind => ({
      kind,
      label: KIND_LABELS[kind],
      cards: DEBIT_CARDS.filter(c => c.kind === kind),
    }))
    .filter(g => g.cards.length)
)

// Clearing the department must clear the locality too, or "Usar esta zona"
// would apply a locality that belongs to a department nobody selected.
watch(dept, () => {
  locality.value = null
})

function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`
}

function setRadius(value: number) {
  const zone = store.list.zone
  if (zone?.mode === 'point') store.setZone({ ...zone, radiusKm: value })
}

function locate() {
  if (!import.meta.client || !navigator.geolocation) {
    geoError.value = 'Tu navegador no permite compartir la ubicación. Elegí tu zona más abajo.'
    return
  }
  locating.value = true
  geoError.value = ''
  navigator.geolocation.getCurrentPosition(
    pos => {
      store.setZone({
        mode: 'point',
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        radiusKm: store.list.zone?.radiusKm ?? 5,
        label: 'Mi ubicación',
      })
      locating.value = false
    },
    () => {
      geoError.value = 'No pudimos acceder a tu ubicación. Elegí tu departamento o tu ciudad.'
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

/**
 * Apply the department/locality selection. A locality becomes a point zone
 * centred on its real branches; a bare department stays a department zone, so
 * someone in the interior keeps seeing every house that operates there.
 */
function applyAdminZone() {
  if (!dept.value) return
  if (locality.value) {
    const center = localityCenter(props.branches, dept.value, locality.value)
    if (center) {
      store.setZone({
        mode: 'point',
        lat: center.lat,
        lng: center.lng,
        radiusKm: store.list.zone?.radiusKm ?? 5,
        label: locality.value,
      })
      return
    }
  }
  store.setZone({ mode: 'department', department: dept.value, label: dept.value })
}
</script>

<style scoped>
.wl-step + .wl-step {
  margin-top: 40px;
}

.wl-step-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.wl-step-num {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1;
}

.wl-step-titles {
  min-width: 0;
}

.wl-step-title {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.4;
  margin: 0;
}

.wl-step-help {
  margin: 4px 0 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.72);
  max-width: 68ch;
}

.wl-step-body {
  padding-left: 40px;
}

@media (max-width: 599px) {
  .wl-step-body {
    padding-left: 0;
  }
}

.wl-zone-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.wl-radius {
  max-width: 220px;
  min-width: 180px;
}

.wl-or {
  margin: 24px 0 8px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.wl-zone-selects {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

@media (max-width: 767px) {
  .wl-zone-selects {
    grid-template-columns: minmax(0, 1fr);
  }
}

.wl-current {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  flex-wrap: wrap;
}

.wl-error {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: rgb(var(--v-theme-error));
}

.wl-note {
  margin: 8px 0 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.72);
  max-width: 68ch;
}

.wl-origins {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0 24px;
}

.wl-origin {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.wl-origin-meta {
  flex: 0 0 auto;
}

.wl-dist {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-variant-numeric: tabular-nums;
}

.wl-card-group + .wl-card-group {
  margin-top: 24px;
}

.wl-group-label {
  margin: 0 0 8px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.wl-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wl-prefs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.wl-currencies {
  min-width: 240px;
  max-width: 340px;
}

.wl-amount {
  max-width: 200px;
}
</style>
