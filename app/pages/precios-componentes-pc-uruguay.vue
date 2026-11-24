<!--
THESIS: «¿Cuánto sale una RTX 3060 en Uruguay?» y «¿cuánto sale armar una PC gamer?» se contestan
con el mismo dato: la mediana de hoy de cada pieza nueva en Mercado Libre Uruguay y en tiendas de
informática uruguayas, y la de las
mismas piezas vendidas sueltas y usadas. Es la tabla contra la que el directorio de computadoras
usadas compara cada aviso, publicada sola para quien está armando o actualizando una PC.
OWN-WORLD: Superficies y tipografía de /celulares-uruguay y /precios-de-supermercado-uruguay: migas,
H1, cuándo se leyó, bloques por rol y tablas con scroll propio en el celular.
FAMILY: Sólo español, como el directorio de computadoras: el canonical es literal.
-->
<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Computadoras usadas', to: localePath(COMPUTADORAS_PATH) },
        { title: 'Precios de componentes' },
      ]"
      class="px-0 pb-2"
    />

    <header class="mb-6">
      <h1 class="pc-title">Precios de componentes de PC en Uruguay, nuevos y usados</h1>
      <p class="lead">
        Lo que sale hoy cada procesador, placa de video, memoria, disco, mother, fuente y gabinete:
        la <strong>mediana de las ofertas nuevas</strong> de Mercado Libre Uruguay y de tiendas de
        informática uruguayas que nombran exactamente esa pieza, con la más barata enlazada, y la
        mediana de la misma pieza vendida <strong>suelta y usada</strong> en Facebook Marketplace y
        Mercado Libre.
        <template v-if="readAt">Precios leídos el {{ readAt }}.</template>
      </p>
    </header>

    <VAlert
      v-if="payload.status === 'preparing'"
      type="info"
      variant="tonal"
      density="comfortable"
      icon="mdi-progress-clock"
      class="mb-6"
    >
      <strong>El relevamiento está arrancando.</strong> Todavía no publicamos precios de
      componentes: la tabla se arma con el primer barrido diario.
    </VAlert>
    <VAlert
      v-else-if="payload.status === 'unavailable'"
      type="warning"
      variant="tonal"
      density="comfortable"
      icon="mdi-database-off-outline"
      class="mb-6"
    >
      No pudimos leer los precios en este momento. No es que no haya: es que no los pudimos leer.
      Probá de nuevo en unos minutos.
    </VAlert>

    <!-- ── Cuánto sale armar una PC tipo ─────────────────────────────────── -->
    <section v-if="payload.presets.length" class="pc-section" aria-labelledby="pc-armar">
      <h2 id="pc-armar">Cuánto sale armar hoy una PC</h2>
      <p class="section-note">
        Con las medianas de hoy de cada pieza nueva. Un total sólo se publica si todas sus piezas
        tienen precio: si a una le falta, decimos cuál, porque sumar las otras daría un número más
        bajo que el real.
      </p>
      <div class="pc-presets">
        <article
          v-for="preset in payload.presets"
          :key="preset.id"
          class="pc-preset"
          data-testid="pc-preset"
        >
          <h3>{{ preset.label }}</h3>
          <p class="pc-preset__description">{{ preset.description }}</p>
          <ul class="pc-preset__parts">
            <li v-for="part in preset.parts" :key="`${preset.id}-${part.role}-${part.slug}`">
              <span class="pc-preset__role">{{ COMPUTER_ROLE_LABEL[part.role] ?? part.role }}</span>
              <NuxtLink :to="`#${computerPartAnchor(part.slug)}`">{{ part.label }}</NuxtLink>
              <span class="pc-preset__price">
                {{ part.newUsd != null ? computerUsd(part.newUsd) : 'sin precio' }}
              </span>
            </li>
          </ul>
          <p v-if="preset.totalUsd != null" class="pc-preset__total">
            Total con piezas nuevas: <strong>{{ computerUsd(preset.totalUsd) }}</strong>
          </p>
          <p v-else class="pc-preset__missing">
            Sin total: falta precio de {{ preset.missing.join(', ') || 'alguna pieza' }}.
          </p>
        </article>
      </div>
    </section>

    <!-- ── Las tablas por rol ─────────────────────────────────────────────── -->
    <nav v-if="payload.roles.length" class="pc-jump" aria-label="Tablas de componentes">
      <a v-for="table in payload.roles" :key="table.id" :href="`#${table.id}`">
        {{ table.title }} ({{ table.parts.length }})
      </a>
    </nav>

    <section
      v-for="table in payload.roles"
      :key="table.id"
      class="pc-section"
      :aria-labelledby="table.id"
    >
      <h2 :id="table.id" class="pc-anchor">{{ table.title }}</h2>
      <div class="pc-scroll">
        <table class="pc-table">
          <thead>
            <tr>
              <th scope="col">Pieza</th>
              <th scope="col" class="num">Nueva hoy</th>
              <th scope="col">La más barata nueva</th>
              <th scope="col" class="num">Usada hoy</th>
              <th scope="col" class="num">En el directorio</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="part in table.parts"
              :id="computerPartAnchor(part.slug)"
              :key="part.slug"
              class="pc-anchor"
            >
              <th scope="row">
                {{ part.label }}
                <span v-if="computerPartFacts(part)" class="pc-table__detail">
                  {{ computerPartFacts(part) }}
                </span>
              </th>
              <td class="num">
                <template v-if="part.new">
                  <strong>{{ computerUsd(part.new.medianUsd) }}</strong>
                  <span class="pc-table__detail">
                    {{ part.new.n }} ofertas · {{ part.new.sellers }}
                    {{ part.new.sellers === 1 ? 'vendedor' : 'vendedores' }}
                  </span>
                </template>
                <span v-else class="pc-none">sin precio</span>
              </td>
              <td class="pc-cheapest">
                <a
                  v-if="part.new?.cheapest && computerSafeOfferUrl(part.new.cheapest.url)"
                  :href="computerSafeOfferUrl(part.new.cheapest.url)"
                  target="_blank"
                  rel="nofollow noopener"
                >
                  {{ computerUsd(part.new.cheapest.priceUsd) }}
                  <span class="pc-table__detail">
                    {{ part.new.cheapest.title }}
                    <template v-if="computerOfferHost(part.new.cheapest.url)">
                      · {{ computerOfferHost(part.new.cheapest.url) }}
                    </template>
                  </span>
                </a>
                <span v-else class="pc-none">—</span>
              </td>
              <td class="num">
                <template v-if="part.used">
                  <strong>{{ computerUsd(part.used.medianUsd) }}</strong>
                  <span class="pc-table__detail">{{ part.used.n }} avisos</span>
                </template>
                <span v-else class="pc-none">sin precio</span>
              </td>
              <td class="num">
                <NuxtLink
                  v-if="part.inCatalog > 0 && computerDirectoryLinkForPart(part)"
                  :to="localePath(computerDirectoryLinkForPart(part)!)"
                >
                  {{ part.inCatalog.toLocaleString('es-UY') }}
                  {{ part.inCatalog === 1 ? 'aviso' : 'avisos' }}
                </NuxtLink>
                <template v-else-if="part.inCatalog > 0">
                  {{ part.inCatalog.toLocaleString('es-UY') }}
                  {{ part.inCatalog === 1 ? 'aviso' : 'avisos' }}
                </template>
                <span v-else class="pc-none">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ── Cómo leemos los precios ────────────────────────────────────────── -->
    <section class="pc-section">
      <h2>Cómo leemos los precios</h2>
      <ul class="guide-list">
        <li>
          <strong>Nueva</strong> es la mediana de las ofertas nuevas de Mercado Libre Uruguay y de
          tiendas de informática uruguayas cuyo título nombra exactamente esa pieza y nada más: sin
          «kit», sin «combo», sin PC armada. Se publica con 3 ofertas o más de al menos 2 vendedores
          distintos.
        </li>
        <li>
          <strong>Usada</strong> es la mediana de la misma pieza vendida suelta en Facebook
          Marketplace y Mercado Libre, con 3 avisos o más. Si no hay, dice «sin precio»: no se
          deduce del precio nuevo.
        </li>
        <li>
          La identidad tiene que ser exacta: un «i7» sin modelo no es ningún i7, y una RTX 3060 de 8
          GB no es la de 12. Una oferta que se aleja más de tres veces de la mediana de su propia
          pieza se descarta (suele ser otra cosa, o un error de tipeo).
        </li>
        <li>
          Casi todo se publica en dólares; lo que está en pesos se convierte con la cotización de la
          corrida{{
            payload.usdUyu ? ` (US$ 1 = $ ${payload.usdUyu.toLocaleString('es-UY')})` : ''
          }}.
        </li>
        <li>
          Son precios pedidos en avisos y publicaciones, no precios de venta cerrados. El precio de
          una tienda puede cambiar el mismo día: tocá la oferta más barata para ver el de ahora.
        </li>
      </ul>
    </section>

    <section class="pc-section">
      <h2>Seguí con el detalle</h2>
      <VRow dense>
        <VCol cols="12" md="6">
          <VCard variant="outlined" :to="localePath(COMPUTADORAS_PATH)" class="pa-4 h-100">
            <p class="card-title">Computadoras usadas en Uruguay</p>
            <p class="card-text">
              Los avisos de notebooks, PCs y piezas usadas, cada PC comparada contra lo que salen
              hoy sus piezas.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard
            variant="outlined"
            :to="localePath('/herramientas/calculadora-impuestos-importacion')"
            class="pa-4 h-100"
          >
            <p class="card-title">¿Y si la traés de afuera?</p>
            <p class="card-text">
              Cuánto pagás de impuestos por una placa de video o una notebook comprada en el
              exterior.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" class="mb-8" />

    <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance">
      Es una comparación de precios publicados, con su fecha. No es una recomendación de compra: la
      misma pieza puede tener garantías y estados muy distintos.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import type { FaqItem } from '~/utils/faqAnswers'
import {
  COMPUTADORAS_PATH,
  COMPUTER_COMPONENTS_PATH,
  COMPUTER_ROLE_LABEL,
  computerDirectoryLinkForPart,
  computerEmptyComponents,
  computerLongDate,
  computerOfferHost,
  computerPartAnchor,
  computerPartFacts,
  computerPresetsAnswer,
  computerSafeOfferUrl,
  computerUsd,
  type ComputerComponentsResponse,
} from '~/utils/computadoras'

const localePath = useLocalePath()

// Server-rendered: los precios tienen que estar en el HTML que lee el buscador.
const { data } = await useAsyncData('computadoras-componentes', () =>
  $fetch<ComputerComponentsResponse>('/api/computadoras/componentes')
)
/** Con la forma vacía como piso: la página tiene que dibujarse aunque el job nunca haya corrido. */
const payload = computed<ComputerComponentsResponse>(
  () => data.value ?? computerEmptyComponents('unavailable')
)
const readAt = computed(() => computerLongDate(payload.value.generatedAt || null))

/** La pieza más pedida de un rol, para que la respuesta cite una cifra que está en la tabla. */
function topPart(role: 'gpu' | 'cpu') {
  return payload.value.roles.find(table => table.role === role)?.parts.find(part => part.new)
}

const faq = computed<FaqItem[]>(() => {
  const gpu = topPart('gpu')
  const cpu = topPart('cpu')
  return [
    {
      id: 'componentes-armar',
      question: '¿Cuánto sale armar una PC en Uruguay hoy?',
      answer: computerPresetsAnswer(payload.value.presets),
    },
    {
      id: 'componentes-placa',
      question: '¿Cuánto sale una placa de video en Uruguay?',
      answer: gpu?.new
        ? `Depende del modelo: la ${gpu.label}, la más publicada en el directorio, sale hoy ${computerUsd(gpu.new.medianUsd)} nueva (mediana de ${gpu.new.n} ofertas nuevas en Uruguay)${gpu.used ? ` y ${computerUsd(gpu.used.medianUsd)} usada` : ''}. La tabla de placas de video tiene cada modelo con su oferta más barata.`
        : 'Todavía no tenemos ofertas suficientes de placas de video para publicar una mediana.',
    },
    {
      id: 'componentes-procesador',
      question: '¿Cuánto sale un procesador en Uruguay?',
      answer: cpu?.new
        ? `El ${cpu.label}, el más publicado en el directorio, sale hoy ${computerUsd(cpu.new.medianUsd)} nuevo (mediana de ${cpu.new.n} ofertas)${cpu.used ? ` y ${computerUsd(cpu.used.medianUsd)} usado` : ''}. Cada procesador de la tabla dice su socket y el tipo de memoria que usa.`
        : 'Todavía no tenemos ofertas suficientes de procesadores para publicar una mediana.',
    },
    {
      id: 'componentes-usado',
      question: '¿Por qué una pieza no tiene precio usado?',
      answer:
        'Porque no hubo al menos tres avisos de esa misma pieza vendida suelta. No lo deducimos del precio nuevo: una pieza usada vale lo que se pide por ella, y sin avisos no hay con qué medirlo.',
    },
  ]
})

// ── SEO ────────────────────────────────────────────────────────────────────
// Absoluto y literal, nunca con localePath: esta página es sólo en español.
const CANONICAL = `https://cambio-uruguay.com${COMPUTER_COMPONENTS_PATH}`
const TITLE = 'Precios de componentes de PC en Uruguay'
const DESCRIPTION =
  'Procesadores, placas de video, RAM, discos y fuentes: precio nuevo y usado de hoy en Uruguay, la oferta más barata y cuánto sale armar una PC.'

defineOgImageComponent('Cambio', {
  title: TITLE,
  subtitle: 'Nuevos y usados, con la oferta más barata',
  tag: 'COMPONENTES · PRECIOS',
})

useSeoMeta({
  title: `${TITLE} | Cambio Uruguay`,
  description: DESCRIPTION,
  ogTitle: TITLE,
  ogDescription: DESCRIPTION,
  ogType: 'website',
  ogUrl: CANONICAL,
  twitterCard: 'summary_large_image',
})

// El FAQPage lo emite FaqSection: no se repite acá.
useHead(() => ({
  link: [{ rel: 'canonical', href: CANONICAL }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebPage', name: TITLE, description: DESCRIPTION, url: CANONICAL },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Computadoras usadas',
                item: `https://cambio-uruguay.com${COMPUTADORAS_PATH}`,
              },
              { '@type': 'ListItem', position: 3, name: 'Precios de componentes', item: CANONICAL },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Rol Display de DESIGN.md (el idiom .hero-title). */
.pc-title {
  margin: 0 0 8px;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
/* El reset de Vuetify 4 no cero-ea el margen de bloque del texto (app/AGENTS.md). */
.lead {
  max-width: 70ch;
  margin: 0 0 8px;
}
.pc-section {
  margin-top: 40px;
}
.pc-section h2 {
  margin: 0 0 12px;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  line-height: 1.2;
  font-weight: 700;
}
.section-note {
  margin: 0 0 16px;
  max-width: 72ch;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-presets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 16px;
}
.pc-preset {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 16px;
  background: rgb(var(--v-theme-surface));
}
.pc-preset h3 {
  margin: 0 0 4px;
  font-size: 1.1rem;
  font-weight: 700;
}
.pc-preset__description {
  margin: 0 0 12px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-preset__parts {
  list-style: none;
  margin: 0;
  padding: 0;
}
.pc-preset__parts li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 12px;
  padding: 6px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 0.875rem;
}
.pc-preset__role {
  grid-column: 1 / -1;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-preset__price {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.pc-preset__total,
.pc-preset__missing {
  margin: 12px 0 0;
  padding-top: 8px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.pc-preset__total {
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}
.pc-preset__missing {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-jump {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 32px;
}
.pc-jump a {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 4px 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  font-size: 0.875rem;
  color: inherit;
  text-decoration: none;
}
.pc-jump a:hover {
  text-decoration: underline;
}
.pc-scroll {
  overflow-x: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}
.pc-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.pc-table th,
.pc-table td {
  padding: 8px 12px;
  text-align: left;
  vertical-align: top;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.pc-table thead th {
  border-top: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-table tbody th {
  font-weight: 600;
  min-width: 180px;
}
.pc-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.pc-table tbody tr:target {
  background: rgba(var(--v-theme-primary), 0.08);
}
.pc-table__detail {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-cheapest {
  max-width: 260px;
}
.pc-cheapest .pc-table__detail {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pc-none {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-anchor {
  /* La barra del sitio es fixed (65 px): sin este margen el ancla queda tapada. */
  scroll-margin-top: 84px;
}
.guide-list {
  margin: 0;
  padding-left: 20px;
  max-width: 76ch;
}
.guide-list li {
  margin-top: 8px;
}
.card-title {
  margin: 0;
  font-weight: 700;
}
.card-text {
  margin: 6px 0 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
