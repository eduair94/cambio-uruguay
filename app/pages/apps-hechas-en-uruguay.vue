<!--
THESIS: Alguien buscó "apps uruguayas" y quiere ver qué hace la gente de acá. Que en un vistazo vea
cada proyecto con lo que dice SU PROPIA web (no lo que se dijo de él en Reddit), pueda abrirlo, y
sepa cómo mandar el suyo.
FIRST VIEWPORT: Migas, título, la respuesta en un párrafo (cuántos, cuáles, de dónde sale la
lista) y los atajos. Las tarjetas por categoría abajo.
FORM: Lectura. Lista editorial estática (utils/appsHechasEnUruguay.ts): sin job, sin base, todo
se dibuja en el servidor. El único elemento interactivo propio es el buzón de sugerencias que el
sitio ya tiene.
-->
<template>
  <VContainer class="ah-page py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Apps hechas en Uruguay', disabled: true },
      ]"
      class="px-0 pb-2"
    />

    <header class="ah-header">
      <p class="ah-eyebrow">Lista revisada a mano</p>
      <h1 class="ah-title">Apps hechas en Uruguay por desarrolladores independientes</h1>
      <p class="ah-lead">
        {{ HECHAS_EN_UY.length }} apps, webs y herramientas que hacen desarrolladores uruguayos por
        su cuenta, en {{ groups.length }} categorías: entre ellas, un buscador de ropa en más de 400
        tiendas de acá, una app con el dólar y la nafta del día y la caja de un almacén. La lista
        empezó con un
        <a v-bind="threadLink">hilo de {{ HECHAS_EN_UY_THREAD.subreddit }} del {{ threadLabel }}</a>
        donde la gente compartió apps de acá, varias propias; cada tarjeta la escribimos con lo que
        dice la web o la ficha de tienda del propio proyecto, abierta el {{ verifiedLabel }}.
      </p>
      <div class="ah-stats">
        <StatTile
          label="Proyectos"
          :value="String(HECHAS_EN_UY.length)"
          :note="`en ${groups.length} categorías`"
        />
        <StatTile
          label="Con app en tienda"
          :value="String(withStore)"
          note="Google Play o App Store"
        />
        <StatTile label="Revisado" :value="verifiedShort" note="en la web de cada proyecto" />
      </div>
      <ContentTaskLinks label="En esta página" :items="taskLinks" />
    </header>

    <section
      v-for="group in groups"
      :id="group.category.id"
      :key="group.category.id"
      class="ah-block"
      :aria-labelledby="`ah-cat-${group.category.id}`"
    >
      <h2 :id="`ah-cat-${group.category.id}`" class="ah-section-title">
        <VIcon size="26" aria-hidden="true">{{ group.category.icon }}</VIcon>
        {{ group.category.label }}
      </h2>
      <p class="ah-section-intro">{{ group.category.blurb }}</p>
      <ul class="ah-grid">
        <li v-for="item in group.items" :key="item.id">
          <SurfaceCard :id="item.id" stretch class="ah-card">
            <div class="ah-card__head">
              <UsefulAppsIcon :name="item.name" :size="48" />
              <div class="ah-card__title">
                <h3 class="ah-card__name" translate="no">{{ item.name }}</h3>
                <ul class="ah-chips" aria-label="Dónde se usa">
                  <li v-for="platform in item.platforms" :key="platform" class="ah-chip">
                    <VIcon size="14" aria-hidden="true">{{
                      HECHAS_EN_UY_PLATFORM_ICONS[platform]
                    }}</VIcon>
                    {{ HECHAS_EN_UY_PLATFORM_LABELS[platform] }}
                  </li>
                </ul>
              </div>
            </div>

            <p class="ah-card__what">{{ item.what }}</p>
            <p v-if="item.price" class="ah-card__line">
              <VIcon size="16" aria-hidden="true">mdi-tag-outline</VIcon>
              <span>{{ item.price }}</span>
            </p>
            <p v-if="item.publisher" class="ah-card__line">
              <VIcon size="16" aria-hidden="true">mdi-check-decagram-outline</VIcon>
              <span>Lo publica {{ item.publisher }}.</span>
            </p>
            <p class="ah-card__line">
              <VIcon size="16" aria-hidden="true">mdi-map-marker-outline</VIcon>
              <span>{{ hechasEnUyOriginLine(item) }}</span>
            </p>
            <p v-if="item.note" class="ah-card__note">{{ item.note }}</p>
            <p class="ah-card__note">Revisado el {{ usefulAppsLongDate(item.verifiedAt) }}.</p>

            <template #footer>
              <div class="ah-card__actions">
                <VBtn
                  v-for="(link, index) in linksOf(item).site"
                  :key="link.href"
                  :href="link.href"
                  target="_blank"
                  rel="noopener"
                  color="primary"
                  :variant="index === 0 ? 'flat' : 'text'"
                  :prepend-icon="link.icon"
                  :aria-label="link.ariaLabel"
                >
                  {{ link.label }}
                </VBtn>
                <VBtn
                  v-for="link in linksOf(item).stores"
                  :key="link.href"
                  :href="link.href"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  color="primary"
                  :variant="linksOf(item).site.length ? 'tonal' : 'flat'"
                  :prepend-icon="link.icon"
                  :aria-label="link.ariaLabel"
                >
                  {{ link.label }}
                </VBtn>
              </div>
            </template>
          </SurfaceCard>
        </li>
      </ul>
    </section>

    <section id="oficiales" class="ah-block" aria-labelledby="ah-oficiales-title">
      <h2 id="ah-oficiales-title" class="ah-section-title">
        ¿Buscás la app oficial de un trámite o un servicio?
      </h2>
      <p class="ah-section-intro">
        Las del BPS, ASSE, UTE, el ómnibus o la DGI están en
        <NuxtLink :to="localePath('/apps-utiles-uruguay')">apps útiles en Uruguay</NuxtLink>, con el
        desarrollador tal cual figura en cada tienda. Ahí entran las que publica quien presta el
        servicio y, como excepción, alguna no oficial que usa muchísima gente; los proyectos de esta
        página son sólo web o todavía tienen pocas descargas. Las de bancos, billeteras e inversión,
        incluidas las que hace la comunidad, están en
        <NuxtLink :to="localePath('/apps-economia-uruguay')">apps de economía</NuxtLink>.
      </p>
    </section>

    <section id="manda-tu-app" class="ah-block" aria-labelledby="ah-manda-title">
      <h2 id="ah-manda-title" class="ah-section-title">
        <VIcon size="26" aria-hidden="true">mdi-send-outline</VIcon>
        ¿Hiciste una app o una web? Mandala
      </h2>
      <p class="ah-section-intro">
        Escribinos el nombre, el enlace a su web o a su ficha de tienda y qué hace en una frase. La
        revisamos en su propia web y, si encaja, la sumamos con lo que dice ella; no se cobra nada
        por aparecer.
      </p>
      <SurfaceCard class="ah-form">
        <FeedbackForm embedded lock-kind initial-kind="suggestion" anchor-id="enviar-app" />
      </SurfaceCard>
      <p class="ah-section-intro">
        ¿Preferís otro canal? Está el
        <NuxtLink :to="localePath('/contacto') + '#sugerencias'">buzón de contacto</NuxtLink>.
      </p>
    </section>

    <section id="metodo" class="ah-block" aria-labelledby="ah-metodo-title">
      <h2 id="ah-metodo-title" class="ah-section-title">De dónde sale esta lista</h2>
      <ul class="ah-steps">
        <li>
          Empezó con el hilo
          <a v-bind="threadLink">«{{ HECHAS_EN_UY_THREAD.title }}»</a>
          de {{ HECHAS_EN_UY_THREAD.subreddit }}, del {{ threadLabel }}, donde la gente compartió
          apps de acá, muchas hechas por quien las compartía. No nombramos a nadie ni copiamos sus
          comentarios.
        </li>
        <li>
          «Revisado» quiere decir que abrimos la web o la ficha de tienda de cada proyecto ese día,
          y que la tarjeta dice sólo lo que el proyecto dice de sí mismo. Un precio aparece
          únicamente si el proyecto lo publica.
        </li>
        <li>
          La línea con el ícono de ubicación dice de dónde sale lo de «hecho en Uruguay», con lo que
          dice la fuente: si el proyecto dice que lo hacen uruguayos, si sus términos o su ficha de
          tienda lo ubican acá, si su web está hecha para el mercado uruguayo sin decir quién la
          hace, o si su web no dice nada y llegó porque su autor lo compartió en el hilo.
        </li>
        <li>
          Quedó afuera lo que todavía no está publicado y lo que no se pudo identificar con certeza.
        </li>
        <li>
          Nadie paga por aparecer y los enlaces no son de afiliados. Los enlaces a la web de cada
          proyecto son una elección nuestra y llegan como una visita desde este sitio; los botones
          de tienda siguen la misma regla que en apps útiles.
        </li>
      </ul>
      <p class="ah-section-intro">
        Cómo ve la comunidad el trabajo en software en Uruguay, en
        <NuxtLink :to="localePath('/mercado-it-uruguay')"
          >el mercado IT según r/CharruaDevs</NuxtLink
        >.
      </p>
    </section>

    <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" />

    <div class="ah-share">
      <ShareButtons
        text="Apps y webs hechas en Uruguay por desarrolladores independientes"
        variant="tonal"
        color="primary"
      />
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import {
  HECHAS_EN_UY,
  HECHAS_EN_UY_FAQ,
  HECHAS_EN_UY_PLATFORM_ICONS,
  HECHAS_EN_UY_PLATFORM_LABELS,
  HECHAS_EN_UY_THREAD,
  HECHAS_EN_UY_VERIFIED_AT,
  type HechaEnUy,
  hechasEnUyByCategory,
  hechasEnUyLinks,
  hechasEnUyOriginLine,
  hechasEnUyWithStore,
} from '~/utils/appsHechasEnUruguay'
import type { FaqItem } from '~/utils/faqAnswers'
import { usefulAppsLongDate } from '~/utils/usefulAppsStores'

const localePath = useLocalePath()
const BASE_PATH = '/apps-hechas-en-uruguay'
// Literal y absoluta, nunca armada con localePath: las copias /en/ y /pt/ apuntan a la española.
const canonicalUrl = 'https://cambio-uruguay.com/apps-hechas-en-uruguay'

const groups = hechasEnUyByCategory()
const withStore = hechasEnUyWithStore()
const verifiedLabel = usefulAppsLongDate(HECHAS_EN_UY_VERIFIED_AT)
const verifiedShort = verifiedLabel.replace(/ de \d{4}$/, '')
const threadLabel = usefulAppsLongDate(HECHAS_EN_UY_THREAD.date)
const linksById = new Map(HECHAS_EN_UY.map(item => [item.id, hechasEnUyLinks(item)]))
const faqItems = HECHAS_EN_UY_FAQ as FaqItem[]
// El hilo se cita como fuente: sin nofollow, igual que los proyectos (sólo noopener).
const threadLink = { href: HECHAS_EN_UY_THREAD.url, target: '_blank', rel: 'noopener' }

function linksOf(item: HechaEnUy) {
  return linksById.get(item.id) ?? hechasEnUyLinks(item)
}

const taskLinks = [
  { label: 'Para el día a día', to: localePath(BASE_PATH) + '#dia-a-dia' },
  { label: 'Para tu negocio', to: localePath(BASE_PATH) + '#negocios' },
  { label: 'Mandá la tuya', to: localePath(BASE_PATH) + '#manda-tu-app' },
  { label: 'Las apps oficiales', to: localePath('/apps-utiles-uruguay') },
]

// 37 + 17 de « | Cambio Uruguay» = 54: la consulta de cabeza y el ángulo que la separa de apps útiles.
const title = 'Apps uruguayas de devs independientes'
// Abre con tres proyectos concretos (cada dato sale de su propia web) y no con Carpincho, que hace
// lo mismo que este sitio. «cinco más» = HECHAS_EN_UY.length − 3: lo ata el test de la página.
const description =
  'Luce (ropa de más de 400 tiendas uruguayas), Subtitio (subtítulos con IA), Kiosko.uy (caja para almacenes) y cinco más, hechos por desarrolladores de acá.'

defineOgImageComponent('Cambio', {
  title: 'Apps hechas en Uruguay',
  subtitle: 'Lo que construyen desarrolladores de acá, revisado en la web de cada proyecto',
  tag: 'LISTA',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

// El FAQPage lo emite FaqSection: no se repite acá. Sin nodos SoftwareApplication: no hay precio ni
// calificación propia que ponerles, y copiarlos de una tienda no corresponde.
useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
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
                name: 'Apps hechas en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Apps hechas en Uruguay',
            numberOfItems: HECHAS_EN_UY.length,
            itemListElement: HECHAS_EN_UY.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.name,
              url: `${canonicalUrl}#${item.id}`,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Reset en :where() (especificidad 0), como en apps-utiles-uruguay.vue. */
:where(.ah-page) :where(p, h1, h2, h3, ul, ol) {
  margin-top: 0;
}
.ah-eyebrow {
  margin-bottom: 8px;
  color: rgb(var(--v-theme-link));
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.ah-title {
  margin-bottom: 16px;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.ah-lead {
  max-width: 72ch;
  margin-bottom: 24px;
  font-size: 1.075rem;
  line-height: 1.65;
}
.ah-lead a,
.ah-section-intro a,
.ah-steps a {
  color: rgb(var(--v-theme-link));
}
.ah-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 16px;
  max-width: 720px;
  margin-bottom: 24px;
}
.ah-block {
  margin-top: 40px;
  /* Las anclas de los atajos: que el encabezado fijo no tape el título. */
  scroll-margin-top: 84px;
}
.ah-section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
}
.ah-section-title .v-icon {
  flex-shrink: 0;
}
.ah-section-intro {
  max-width: 72ch;
  margin-top: 12px;
  line-height: 1.6;
}
.ah-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.ah-grid > li {
  min-width: 0;
}
.ah-grid > :deep(.google-auto-placed) {
  grid-column: 1 / -1;
}
@media (min-width: 600px) {
  .ah-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }
}
.ah-card {
  scroll-margin-top: 84px;
}
.ah-card__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.ah-card__title {
  min-width: 0;
}
.ah-card__name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.ah-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
}
.ah-chip {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 0 8px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.6;
}
.ah-card__what {
  margin-top: 12px;
  font-size: 0.95rem;
  line-height: 1.5;
}
.ah-card__line {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 8px;
  font-size: 0.875rem;
  line-height: 1.45;
}
.ah-card__line .v-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ah-card__note {
  margin-top: 8px;
  font-size: 0.8rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ah-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.ah-card__actions .v-btn {
  min-height: 44px;
}
.ah-form {
  max-width: 720px;
  margin-top: 16px;
}
.ah-steps {
  max-width: 72ch;
  margin-top: 12px;
  padding-left: 22px;
  line-height: 1.55;
}
.ah-steps li + li {
  margin-top: 8px;
}
.ah-share {
  margin-top: 32px;
}
</style>
