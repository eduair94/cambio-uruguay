<!--
Una cuenta del directorio de emprendimientos de Instagram: primero las fotos (es lo que hace que
alguien se detenga, y es lo que el algoritmo de Instagram no le muestra), después quién es y qué
vende, y al pie las señales con fecha. La tarjeta entera lleva a la ficha (enlace estirado sobre el
nombre); el botón de Instagram va aparte, por encima, para no anidar enlaces.
-->
<template>
  <article class="emp-card" :class="{ 'emp-card--compact': compact }">
    <div
      class="emp-card__photos"
      :class="`emp-card__photos--${photos.length || 0}`"
      aria-hidden="true"
    >
      <img
        v-for="(post, index) in photos"
        :key="post.code"
        :src="post.image"
        :class="{ 'emp-card__photo--main': index === 0 }"
        class="emp-card__photo"
        alt=""
        width="320"
        height="320"
        :loading="eager && index === 0 ? 'eager' : 'lazy'"
        decoding="async"
        referrerpolicy="no-referrer"
      />
      <span v-if="!photos.length" class="emp-card__nophoto">{{ initial }}</span>
    </div>
    <div class="emp-card__body">
      <div class="emp-card__who">
        <img
          v-if="item.profilePic"
          :src="item.profilePic"
          class="emp-card__avatar"
          alt=""
          width="36"
          height="36"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
        />
        <span v-else class="emp-card__avatar emp-card__avatar--initial" aria-hidden="true">{{
          initial
        }}</span>
        <div class="emp-card__names">
          <h3 class="emp-card__name">
            <NuxtLink :to="localePath(fichaPath)" class="emp-card__link">{{ item.name }}</NuxtLink>
          </h3>
          <p class="emp-card__handle notranslate" translate="no">@{{ item.handle }}</p>
        </div>
        <a
          :href="instagramUrl(item.handle)"
          class="emp-card__ig"
          target="_blank"
          rel="nofollow noopener"
          :aria-label="`Abrir @${item.handle} en Instagram (se abre en otra pestaña)`"
        >
          <VIcon size="20" aria-hidden="true">mdi-instagram</VIcon>
        </a>
      </div>
      <p v-if="item.summary" class="emp-card__summary">{{ item.summary }}</p>
      <ul class="emp-card__badges" aria-label="Datos de la cuenta">
        <li v-if="item.raro" class="emp-badge emp-badge--raro">
          <VIcon size="14" aria-hidden="true">mdi-star-four-points-outline</VIcon>
          Poco común
        </li>
        <li v-if="showRubro && rubroLabel" class="emp-badge">{{ rubroLabel }}</li>
        <li v-if="place" class="emp-badge">
          <VIcon size="14" aria-hidden="true">mdi-map-marker-outline</VIcon>
          {{ place }}
        </li>
        <li v-if="envios" class="emp-badge">
          <VIcon size="14" aria-hidden="true">mdi-truck-delivery-outline</VIcon>
          {{ envios }}
        </li>
        <li v-if="item.soloInstagram" class="emp-badge">Sólo Instagram</li>
      </ul>
      <p class="emp-card__meta">
        <span v-if="lastPost">{{ lastPost }}</span>
        <span v-if="lastPost && followers" aria-hidden="true"> · </span>
        <span v-if="followers">{{ followers }}</span>
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  EMPRENDIMIENTOS_PATH,
  emprendimientoRubro,
  enviosLabel,
  followersLabel,
  instagramUrl,
  lastPostLabel,
  placeLabel,
  type EmprendimientoCard,
} from '~/utils/emprendimientos'

const props = withDefaults(
  defineProps<{
    item: EmprendimientoCard
    /** Fecha de referencia para "publicó hace N días" (la del payload: igual en servidor y cliente). */
    now: number
    showRubro?: boolean
    compact?: boolean
    eager?: boolean
  }>(),
  { showRubro: true, compact: false, eager: false }
)

const localePath = useLocalePath()
const fichaPath = computed(() => `${EMPRENDIMIENTOS_PATH}/cuenta/${props.item.handle}`)
const photos = computed(() => props.item.posts.slice(0, props.compact ? 1 : 3))
const initial = computed(() =>
  (props.item.name || props.item.handle).trim().charAt(0).toUpperCase()
)
const rubroLabel = computed(() => emprendimientoRubro(props.item.rubro)?.label ?? null)
const place = computed(() => placeLabel(props.item))
const envios = computed(() => (props.compact ? null : enviosLabel(props.item.envios)))
const lastPost = computed(() => lastPostLabel(props.item.lastPostAt, props.now))
const followers = computed(() => (props.compact ? null : followersLabel(props.item.followers)))
</script>

<style scoped>
.emp-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.emp-card:hover,
.emp-card:focus-within {
  border-color: rgba(var(--v-theme-primary), 0.5);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
@layer vuetify-overrides.cu-reset {
  :where(.emp-card) :where(p, h3, ul) {
    margin: 0;
  }
}

/* Fotos: una grande y dos chicas a la derecha; con una sola, cuadrada. */
.emp-card__photos {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  /* `minmax(0, …)`: sin el cero, una foto vertical estira la fila por su alto intrínseco y la
     proporción de la caja deja de mandar (medido: 387 px de alto en una tarjeta de 218). */
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 2px;
  overflow: hidden;
  aspect-ratio: 3 / 2;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.emp-card__photos--1,
.emp-card__photos--0 {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
}
.emp-card__photos--2 {
  grid-template-rows: minmax(0, 1fr);
}
.emp-card__photo {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  object-fit: cover;
}
.emp-card__photo--main {
  grid-row: 1 / -1;
}
.emp-card__nophoto {
  display: grid;
  place-items: center;
  color: rgba(var(--v-theme-on-surface), 0.35);
  font-size: 2.5rem;
  font-weight: 800;
}
.emp-card--compact .emp-card__photos {
  aspect-ratio: 1 / 1;
}

.emp-card__body {
  display: grid;
  gap: 8px;
  padding: 12px 14px 14px;
}
.emp-card__who {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 36px;
  column-gap: 10px;
  align-items: center;
}
.emp-card__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.emp-card__avatar--initial {
  display: grid;
  place-items: center;
  font-weight: 700;
}
.emp-card__names {
  min-width: 0;
}
.emp-card__name {
  overflow: hidden;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.emp-card__link {
  color: inherit;
  text-decoration: none;
}
/* El enlace estirado: toda la tarjeta lleva a la ficha. */
.emp-card__link::after {
  position: absolute;
  inset: 0;
  content: '';
}
.emp-card__link:focus-visible {
  outline: none;
}
.emp-card:has(.emp-card__link:focus-visible) {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.emp-card__handle {
  overflow: hidden;
  color: rgb(var(--v-theme-link));
  font-size: 0.8rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.emp-card__summary {
  display: -webkit-box;
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.82);
  font-size: 0.875rem;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
.emp-card--compact .emp-card__summary {
  -webkit-line-clamp: 3;
  line-clamp: 3;
}
.emp-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  padding: 0;
  list-style: none;
}
.emp-badge {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.82);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
}
.emp-badge--raro {
  background: rgba(var(--v-theme-secondary), 0.16);
  color: rgba(var(--v-theme-on-surface), 0.9);
}
.emp-card__meta {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
}
/* Por encima del enlace estirado: abre Instagram sin pasar por la ficha. */
.emp-card__ig {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: rgb(var(--v-theme-link));
}
.emp-card__ig:hover,
.emp-card__ig:focus-visible {
  background: rgba(var(--v-theme-primary), 0.1);
}
</style>
