<template>
  <article class="eq-card" :data-listing-id="producto.listingId">
    <a
      :href="producto.url"
      target="_blank"
      rel="nofollow noopener"
      class="eq-card__photo"
      :aria-label="`${producto.title} (abre el aviso en ${sourceLabel})`"
    >
      <img
        v-if="producto.image && !failed"
        :src="producto.image"
        :alt="producto.title"
        loading="lazy"
        width="320"
        height="240"
        referrerpolicy="no-referrer"
        @error="failed = true"
      />
      <span v-else class="eq-card__nophoto"><VIcon :icon="roomIcon" size="36" /></span>
    </a>
    <div class="eq-card__body">
      <div class="eq-card__badges">
        <span
          class="eq-badge"
          :class="producto.condition === 'used' ? 'eq-badge--used' : 'eq-badge--new'"
        >
          {{ producto.condition === 'used' ? 'Usado' : 'Nuevo' }}
        </span>
        <span v-if="!hideCategory" class="eq-badge eq-badge--cat">{{
          producto.categoryLabel
        }}</span>
      </div>
      <h3 class="eq-card__title">
        <a :href="producto.url" target="_blank" rel="nofollow noopener">{{ producto.title }}</a>
      </h3>
      <p class="eq-card__price">
        {{ equiparProductoPrecio(producto) }}
        <span v-if="producto.currency === 'USD'" class="eq-card__approx">
          (≈ {{ equiparMoneyNbsp(producto.priceUyu) }})
        </span>
      </p>
      <!-- La variación del PROPIO aviso: este vendedor contra su propio precio de hace unos días, no
           contra la banda de la categoría (que se mueve cuando entra o sale un vendedor). -->
      <p v-if="priceMove" class="eq-card__move" :class="priceMove.down ? 'is-down' : 'is-up'">
        {{ priceMove.text }}
      </p>
      <p class="eq-card__facts">{{ facts }}</p>
      <p class="eq-card__source">
        {{ producto.sellerName
        }}<template v-if="producto.source !== 'store'"> · {{ sourceLabel }}</template>
        <span class="eq-card__seen"> · visto el {{ seen }}</span>
      </p>
      <VBtn
        :color="inList ? undefined : 'primary'"
        :variant="inList ? 'outlined' : 'tonal'"
        size="small"
        class="eq-card__add"
        :prepend-icon="inList ? 'mdi-check' : 'mdi-playlist-plus'"
        :aria-pressed="inList"
        data-testid="equipar-toggle-lista"
        @click="emit('toggle', producto)"
      >
        {{ inList ? 'En mi lista' : 'Agregar a mi lista' }}
      </VBtn>
    </div>
  </article>
</template>

<script setup lang="ts">
import { priceChangeLabel } from '~/utils/priceHistory'
import {
  EQUIPAR_SOURCE_LABELS,
  equiparMoneyNbsp,
  equiparProductoPrecio,
  type EquiparProductoPublic,
} from '~/utils/equiparProductos'

const props = defineProps<{
  producto: EquiparProductoPublic
  inList: boolean
  /** On a per-category page every card is that category: the badge would only repeat the H1. */
  hideCategory?: boolean
}>()
const emit = defineEmits<{ toggle: [producto: EquiparProductoPublic] }>()

const failed = ref(false)
const sourceLabel = computed(() => EQUIPAR_SOURCE_LABELS[props.producto.source])
const facts = computed(() =>
  [props.producto.variantLabel, props.producto.brand, props.producto.location]
    .filter(Boolean)
    .join(' · ')
)
/** `YYYY-MM-DD` read as midday UTC so midnight never rolls it back a day in Montevideo. */
/**
 * "bajó 12 % desde el 17/9": la variación del aviso contra su PRIMERA lectura nuestra, con la fecha
 * a la vista. Sin dos lecturas no se dice nada — una sola no es una variación.
 */
const priceMove = computed(() => {
  const series = props.producto.priceHistory
  const label = priceChangeLabel(series?.changePct ?? null)
  if (!series || !label || series.points.length < 2) return null
  const [year, month, day] = (series.points[0]?.d ?? '').split('-')
  const since = year && month && day ? `${Number(day)}/${Number(month)}` : series.firstSeen
  return { text: `${label} desde el ${since}`, down: (series.changePct ?? 0) < 0 }
})

const seen = computed(() => {
  const time = Date.parse(`${props.producto.lastSeen}T12:00:00Z`)
  if (Number.isNaN(time)) return props.producto.lastSeen
  return new Date(time).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'numeric',
    timeZone: 'America/Montevideo',
  })
})
const roomIcon = computed(() => {
  const category = props.producto.category
  if (
    /heladera|cocina|microondas|olla|sarten|cuchillo|cubiertos|vajilla|vasos|tabla|escurridor|pava|mixer|tostadora|cafetera|horno/.test(
      category
    )
  )
    return 'mdi-silverware-fork-knife'
  if (/colchon|sabanas|almohada|acolchado|ropero/.test(category)) return 'mdi-bed-outline'
  if (/calefon|toallas|cortina/.test(category)) return 'mdi-shower'
  if (/lavarropas|secarropas|limpieza|tacho|plancha|aspiradora/.test(category))
    return 'mdi-washing-machine'
  return 'mdi-sofa-outline'
})
</script>

<style scoped>
/*
 * Same two shapes as the car card: a row on phones (photo left, facts right, five per screen),
 * a photo-on-top card from 600 px up where the grid has several columns. Reading order never
 * changes between the two, so there is no `order`.
 */
.eq-card {
  position: relative;
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  padding: 12px;
}
.eq-card__photo {
  display: block;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.eq-card__photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.eq-card__nophoto {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.eq-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.eq-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.eq-badge {
  /* Rol Label de DESIGN.md. */
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.02em;
  padding: 1px 8px;
  border-radius: 999px;
}
.eq-badge--new {
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
}
.eq-badge--used {
  /* amber-signal de DESIGN.md como tinte de fondo; el texto es el de la superficie, en los dos temas. */
  background: rgba(255, 143, 0, 0.22);
  color: rgb(var(--v-theme-on-surface));
}
.eq-badge--cat {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.85);
}
.eq-card__title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.eq-card__title a {
  color: inherit;
  text-decoration: none;
}
.eq-card__title a:hover,
.eq-card__title a:focus-visible {
  text-decoration: underline;
}
.eq-card__price {
  /* Rol Title de DESIGN.md, con el peso del Headline: es la cifra por la que se lee la tarjeta. */
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}
.eq-card__approx,
.eq-card__facts,
.eq-card__source {
  font-size: 0.8rem;
  line-height: 1.35;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.eq-card__approx {
  font-weight: 400;
}
.eq-card__seen {
  white-space: nowrap;
}
.eq-card__move {
  font-size: 0.8rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.35;
}
.eq-card__move.is-down {
  color: rgb(var(--v-theme-success));
}
.eq-card__move.is-up {
  color: rgb(var(--v-theme-error));
}
.eq-card__add {
  align-self: flex-start;
  margin-top: 4px;
  text-transform: none;
  letter-spacing: 0;
}
@media (min-width: 600px) {
  .eq-card {
    grid-template-columns: minmax(0, 1fr);
    padding: 0;
  }
  .eq-card__photo {
    aspect-ratio: 4 / 3;
    border-radius: 0;
  }
  .eq-card__body {
    padding: 10px 12px 12px;
  }
}
</style>
