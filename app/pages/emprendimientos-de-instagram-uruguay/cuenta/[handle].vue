<!--
THESIS: La ficha de una cuenta del directorio: qué vende, sus 12 fotos más recientes, señales con
fecha (cuándo publicó, desde cuándo está acá, de dónde la conocimos) y parecidas para seguir
descubriendo. Nunca un veredicto: «confiable» o «estafa» no lo decimos de nadie.
FIRST VIEWPORT: Migas, foto de perfil, nombre, @cuenta, el botón a Instagram, la descripción y las
primeras fotos.
FORM: `noindex, follow` siempre: la búsqueda por el nombre la gana el propio Instagram, y miles de
fichas finas no suman. Se comparte y se navega; el directorio y los rubros son lo que se indexa.
-->
<template>
  <VContainer class="emp-page py-6 py-md-10">
    <VBreadcrumbs :items="crumbs" class="emp-crumbs px-0 pb-2" />

    <header class="emp-profile">
      <img
        v-if="listing.profilePic"
        :src="listing.profilePic"
        class="emp-profile__pic"
        alt=""
        width="88"
        height="88"
        referrerpolicy="no-referrer"
      />
      <span v-else class="emp-profile__pic emp-profile__pic--initial" aria-hidden="true">{{
        initial
      }}</span>
      <div class="emp-profile__text">
        <h1 class="emp-profile__name">{{ listing.name }}</h1>
        <p class="emp-profile__handle notranslate" translate="no">@{{ listing.handle }}</p>
        <p class="emp-profile__meta">
          <span v-if="rubroInfo">{{ rubroInfo.label }}</span>
          <span v-if="place"> · {{ place }}</span>
          <span v-if="followers"> · {{ followers }}</span>
        </p>
      </div>
    </header>

    <div class="emp-actions">
      <VBtn
        :href="instagramUrl(listing.handle)"
        target="_blank"
        rel="nofollow noopener"
        color="primary"
        size="large"
        prepend-icon="mdi-instagram"
      >
        Ver en Instagram
      </VBtn>
      <VBtn
        v-if="listing.website"
        :href="`https://${listing.website}`"
        target="_blank"
        rel="nofollow noopener"
        variant="outlined"
        size="large"
        append-icon="mdi-open-in-new"
      >
        {{ listing.website }}
      </VBtn>
    </div>

    <section class="emp-about" aria-label="Qué vende">
      <p v-if="listing.summary" class="emp-lead">{{ listing.summary }}</p>
      <ul v-if="listing.tags.length || listing.raro" class="emp-tags" aria-label="Productos">
        <li v-if="listing.raro" class="emp-tag emp-tag--raro">
          <VIcon size="14" aria-hidden="true">mdi-star-four-points-outline</VIcon>
          Poco común
        </li>
        <li v-for="tag in listing.tags" :key="tag" class="emp-tag">{{ tag }}</li>
      </ul>
    </section>

    <section v-if="listing.posts.length" aria-labelledby="emp-fotos">
      <h2 id="emp-fotos" class="d-sr-only">Sus publicaciones más recientes</h2>
      <ul class="emp-photos">
        <li v-for="(post, index) in listing.posts" :key="post.code">
          <a
            :href="instagramPostUrl(post)"
            target="_blank"
            rel="nofollow noopener"
            class="emp-photo"
          >
            <img
              :src="post.image"
              :alt="`Publicación de @${listing.handle}${post.date ? ` del ${shortDate(post.date)}` : ''}`"
              width="320"
              height="320"
              :loading="index < 4 ? 'eager' : 'lazy'"
              decoding="async"
              referrerpolicy="no-referrer"
            />
            <VIcon v-if="post.reel" class="emp-photo__reel" size="20" aria-hidden="true">
              mdi-play
            </VIcon>
          </a>
        </li>
      </ul>
    </section>

    <section class="emp-section" aria-labelledby="emp-datos">
      <h2 id="emp-datos" class="emp-section__title">Lo que sabemos de la cuenta</h2>
      <dl class="emp-facts">
        <template v-if="lastPost">
          <dt>Última publicación</dt>
          <dd>{{ lastPost }}</dd>
        </template>
        <dt>Actividad</dt>
        <dd>{{ activity }}</dd>
        <template v-if="envios">
          <dt>Envíos</dt>
          <dd>{{ envios }}</dd>
        </template>
        <dt>Cómo vende</dt>
        <dd>{{ channel }}</dd>
        <dt>En el directorio</dt>
        <dd>
          desde el {{ longDate(listing.listedAt) }}; leída por última vez el
          {{ longDate(listing.readAt) }}
        </dd>
      </dl>
      <template v-if="listing.sources.length">
        <h3 class="emp-sub">De dónde la conocimos</h3>
        <ul class="emp-sources">
          <li v-for="source in listing.sources" :key="source.label">
            <a v-if="source.url" :href="source.url" target="_blank" rel="nofollow noopener">{{
              source.label
            }}</a>
            <span v-else>{{ source.label }}</span>
          </li>
        </ul>
      </template>
      <p class="emp-note">
        <VIcon size="18" aria-hidden="true">mdi-shield-alert-outline</VIcon>
        <span>
          Estar en el directorio no es una recomendación: no le compramos ni la evaluamos. Antes de
          transferir, pedí nombre y cédula o RUT y preferí pagar al retirar.
          <NuxtLink :to="localePath('/estafas-uruguay')">Si algo sale mal</NuxtLink>.
        </span>
      </p>
    </section>

    <section v-if="similares.length" class="emp-section" aria-labelledby="emp-parecidas">
      <h2 id="emp-parecidas" class="emp-section__title">Parecidas</h2>
      <div class="emp-grid">
        <EmprendimientosCard
          v-for="item in similares"
          :key="item.handle"
          :item="item"
          :now="now"
          :show-rubro="false"
        />
      </div>
      <NuxtLink
        v-if="rubroInfo"
        :to="localePath(`${EMPRENDIMIENTOS_PATH}/${rubroInfo.slug}`)"
        class="emp-more"
      >
        Ver todo {{ rubroInfo.label.toLowerCase() }}
        <VIcon size="18" aria-hidden="true">mdi-arrow-right</VIcon>
      </NuxtLink>
    </section>

    <section class="emp-section">
      <EmprendimientosForm mode="baja" :fixed-handle="listing.handle" />
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  EMPRENDIMIENTOS_PATH,
  emprendimientoRubro,
  enviosLabel,
  followersLabel,
  handleFromInput,
  instagramPostUrl,
  instagramUrl,
  lastPostLabel,
  placeLabel,
  type EmprendimientoCuentaResponse,
} from '~/utils/emprendimientos'

const localePath = useLocalePath()
const route = useRoute()
const handle = handleFromInput(String(route.params.handle ?? ''))
if (!handle)
  throw createError({ statusCode: 404, statusMessage: 'Cuenta no encontrada', fatal: true })

const now = useState('emprendimientos-now', () => Date.now())
const { data, error } = await useFetch<EmprendimientoCuentaResponse>(
  `/api/emprendimientos/cuenta/${handle}`
)
if (error.value)
  throw createError({ statusCode: 503, statusMessage: 'Directorio no disponible', fatal: true })
if (!data.value?.listing) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Esta cuenta no está en el directorio',
    fatal: true,
  })
}
const listing = computed(() => data.value!.listing!)
const similares = computed(() => data.value?.similares ?? [])

const rubroInfo = computed(() => emprendimientoRubro(listing.value.rubro))
const initial = computed(() => (listing.value.name || listing.value.handle).charAt(0).toUpperCase())
const place = computed(() => placeLabel(listing.value))
const followers = computed(() => followersLabel(listing.value.followers))
const envios = computed(() => enviosLabel(listing.value.envios))
const lastPost = computed(() => {
  const label = lastPostLabel(listing.value.lastPostAt, now.value)
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : null
})
const activity = computed(() => {
  const n = listing.value.postsLast90
  return n >= 12
    ? 'Sus 12 publicaciones más recientes son de los últimos tres meses.'
    : n === 0
      ? 'Ninguna publicación en los últimos tres meses.'
      : `${n} de sus 12 publicaciones más recientes son de los últimos tres meses.`
})
const channel = computed(() => {
  const parts = [
    listing.value.soloInstagram
      ? 'Por Instagram, sin sitio propio'
      : `Por Instagram y en ${listing.value.website}`,
  ]
  if (listing.value.whatsapp) parts.push('pedidos por WhatsApp')
  return parts.join('; ') + '.'
})

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
function longDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 3_600_000)
  return `${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`
}
function shortDate(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  return `${d} de ${MONTHS[m - 1]} de ${y}`
}

const crumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Emprendimientos de Instagram', to: localePath(EMPRENDIMIENTOS_PATH) },
  ...(rubroInfo.value
    ? [
        {
          title: rubroInfo.value.label,
          to: localePath(`${EMPRENDIMIENTOS_PATH}/${rubroInfo.value.slug}`),
        },
      ]
    : []),
  { title: listing.value.name, disabled: true },
])

const canonicalUrl = `https://cambio-uruguay.com/emprendimientos-de-instagram-uruguay/cuenta/${handle}`
const title = computed(() => `${listing.value.name} (@${listing.value.handle}) en Instagram`)
const description = computed(
  () =>
    listing.value.summary ||
    `Emprendimiento uruguayo que vende por Instagram: @${listing.value.handle}.`
)

useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: () => title.value,
  ogDescription: () => description.value,
  ogType: 'website',
  ogUrl: canonicalUrl,
  robots: 'noindex, follow',
})
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      key: 'emprendimiento-cuenta-ld',
      type: 'application/ld+json',
      innerHTML: () =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Cambio Uruguay',
              item: 'https://cambio-uruguay.com/',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Emprendimientos de Instagram',
              item: 'https://cambio-uruguay.com/emprendimientos-de-instagram-uruguay',
            },
            ...(rubroInfo.value
              ? [
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: rubroInfo.value.label,
                    item: `https://cambio-uruguay.com/emprendimientos-de-instagram-uruguay/${rubroInfo.value.slug}`,
                  },
                ]
              : []),
            {
              '@type': 'ListItem',
              position: rubroInfo.value ? 4 : 3,
              name: listing.value.name,
              item: canonicalUrl,
            },
          ],
        }),
    },
  ],
})
</script>

<style scoped>
.emp-page {
  display: grid;
  gap: 24px;
}
:where(.emp-page) :where(h1, h2, h3, p, ul, dl, dd) {
  margin: 0;
}
.emp-profile {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  column-gap: 16px;
  align-items: center;
}
.emp-profile__pic {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  object-fit: cover;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.emp-profile__pic--initial {
  display: grid;
  place-items: center;
  font-size: 2rem;
  font-weight: 800;
}
.emp-profile__text {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.emp-profile__name {
  font-size: clamp(1.5rem, 3vw, 2.125rem);
  font-weight: 300;
  letter-spacing: -0.02em;
  line-height: 1.14;
  overflow-wrap: anywhere;
  text-wrap: balance;
}
.emp-profile__handle {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.emp-profile__meta {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.875rem;
}
.emp-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
}
.emp-about {
  display: grid;
  gap: 10px;
}
.emp-lead {
  max-width: 72ch;
  color: rgba(var(--v-theme-on-surface), 0.82);
  font-size: 1.075rem;
  line-height: 1.65;
}
.emp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0;
  list-style: none;
}
.emp-tag {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-size: 0.8rem;
  font-weight: 600;
}
.emp-tag--raro {
  background: rgba(var(--v-theme-secondary), 0.16);
}
.emp-photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(31%, 200px), 1fr));
  gap: 4px;
  padding: 0;
  list-style: none;
}
.emp-photo {
  position: relative;
  display: block;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.emp-photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}
.emp-photo:hover img {
  transform: scale(1.03);
}
.emp-photo__reel {
  position: absolute;
  top: 6px;
  right: 6px;
  color: #fff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
}
.emp-section {
  display: grid;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.emp-section__title {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
}
.emp-sub {
  font-size: 1rem;
  font-weight: 700;
}
.emp-facts {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 6px 16px;
  max-width: 72ch;
}
.emp-facts dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.875rem;
  font-weight: 600;
}
.emp-facts dd {
  font-size: 0.95rem;
}
@media (max-width: 599px) {
  .emp-facts {
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
  }
  .emp-facts dd {
    margin-bottom: 8px;
  }
}
.emp-sources {
  display: grid;
  gap: 4px;
  padding-left: 1.2em;
}
.emp-sources a,
.emp-more {
  color: rgb(var(--v-theme-link));
}
.emp-note {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  max-width: 72ch;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.875rem;
  line-height: 1.5;
}
.emp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
  gap: 16px;
}
.emp-more {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-weight: 600;
}
</style>
