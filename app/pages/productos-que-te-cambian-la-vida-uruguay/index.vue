<!--
THESIS: El hilo ordena, el mercado pone el precio. Lo que r/uruguay dijo que le cambió la vida, del
más nombrado al menos, y al lado de cada producto lo que piden por él nuevo en Mercado Libre.
FIRST VIEWPORT: Migas, título, una bajada de dos oraciones, la fecha, los filtros y el producto #1.
Nada propio arriba del primer producto: ni eyebrow, ni cifras sueltas, ni anuncio manual.
FORM: Lectura + filtro. La lista se itera del CATÁLOGO (los 26 se dibujan aunque no haya un precio)
y los filtros son enlaces que el servidor lee (`?hasta=`, `?tipo=`); ya hidratado, el filtro es del
cliente y sólo cambia el atributo `hidden` de cada producto.
-->
<template>
  <VContainer class="vida-page py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: DIRECTORIOS_HUB.label, to: localePath(DIRECTORIOS_HUB.path) },
        { title: 'Productos que te cambian la vida', disabled: true },
      ]"
      class="px-0 pb-2"
    />

    <header class="vida-header">
      <h1 class="vida-title">Productos que te cambian la vida, según r/uruguay</h1>
      <p class="vida-lead">{{ lead }}</p>
      <p class="vida-asof">
        Leímos
        <a :href="PRODUCTOS_VIDA_THREAD.url" target="_blank" rel="nofollow noopener">
          <span>el hilo de r/uruguay</span><span class="d-sr-only">, se abre en otra pestaña</span>
        </a>
        {{ asofTail }}
      </p>
      <p
        v-if="pageNote"
        role="status"
        class="vida-note"
        :class="{ 'vida-note--warn': pageNote.warn }"
      >
        <VIcon size="20" aria-hidden="true">{{ pageNote.icon }}</VIcon>
        <span>{{ pageNote.text }}</span>
      </p>
    </header>

    <ProductosVidaFilters
      class="vida-block-filters"
      :base-path="basePath"
      :state="shown"
      :counts="counts"
      :has-prices="hasPrices"
      :result-line="resultLine"
      :active="filtersActive"
      @select="select"
    />

    <section id="lista" class="vida-list-section" aria-labelledby="vida-lista-title">
      <h2 id="vida-lista-title" class="d-sr-only">La lista</h2>
      <ol class="vida-list" role="list">
        <ProductosVidaProduct
          v-for="(row, index) in rows"
          :key="row.entry.slug"
          :entry="row.entry"
          :product="row.product"
          :rank="row.rank"
          :tied-with="row.tiedWith"
          :visible="row.visible"
          :hasta="shown.hasta"
          :has-prices="hasPrices"
          :domain="domain"
          :read-on="pricesReadOn"
          :eager="index === 0"
        />
      </ol>
      <div v-if="visibleCount === 0" class="vida-empty">
        <p class="vida-empty__title">{{ emptyText }}</p>
        <p class="vida-empty__actions">
          <a
            v-if="nextBudget !== null"
            :href="productosVidaFilterHref(basePath, shown, { hasta: nextBudget })"
            class="vida-empty__link"
            @click="onRecover($event, { hasta: nextBudget })"
            >Ver hasta {{ productosVidaMoney(nextBudget) }}</a
          >
          <a
            v-if="shown.tipo !== null"
            :href="productosVidaFilterHref(basePath, shown, { tipo: null })"
            class="vida-empty__link"
            @click="onRecover($event, { tipo: null })"
            >Ver todos los tipos</a
          >
        </p>
      </div>
    </section>

    <section class="vida-section" aria-labelledby="vida-sin-precio-title">
      <h2 id="vida-sin-precio-title" class="vida-section__title">
        Lo que también nombraron, sin precio
      </h2>
      <p class="vida-section__intro">
        Algunas respuestas no son algo que se compra en Mercado Libre y otras no se pueden medir con
        una banda de precio honesta. Van acá, sin precio.
      </p>
      <ul class="vida-other">
        <li v-for="other in PRODUCTOS_VIDA_NO_PRICE" :key="other.id" class="vida-other__item">
          <p class="vida-other__label">{{ other.label }}</p>
          <p class="vida-other__why">{{ other.why }}</p>
          <NuxtLink v-if="other.related" :to="localePath(other.related.to)" class="vida-link">
            <span>{{ other.related.label }}</span>
            <VIcon size="16" aria-hidden="true">mdi-arrow-right</VIcon>
          </NuxtLink>
        </li>
      </ul>
      <p class="vida-section__intro">{{ PRODUCTOS_VIDA_LEFT_OUT }}</p>
    </section>

    <section class="vida-section" aria-labelledby="vida-metodo-title">
      <h2 id="vida-metodo-title" class="vida-section__title">Cómo armamos la lista</h2>
      <p class="vida-section__intro">
        Leímos el {{ threadReadOn }}
        <a
          class="vida-method__thread"
          :href="PRODUCTOS_VIDA_THREAD.url"
          target="_blank"
          rel="nofollow noopener"
          >el hilo «{{ PRODUCTOS_VIDA_THREAD.title }}» de r/uruguay<span class="d-sr-only"
            >, se abre en otra pestaña</span
          ></a
        >, publicado el {{ threadPostedOn }}, con los
        {{ PRODUCTOS_VIDA_THREAD.comments }} comentarios que tenía ese día.
        {{ PRODUCTOS_VIDA_COUNT_RULE }} No cuentan las preguntas, los deseos ni lo que a alguien no
        le gusta. Las razones van con nuestras palabras: no citamos a nadie ni mostramos usuarios.
      </p>
      <p class="vida-section__intro">
        Los precios son de avisos nuevos de Mercado Libre Uruguay, leídos cuatro veces por día. Cada
        lectura toma las primeras páginas de una o dos búsquedas por producto, no todo Mercado
        Libre, y una variante sólo tiene precio típico con al menos 8 avisos nuevos. El precio
        típico es la mediana; «la mitad sale entre…» deja afuera el cuarto más barato y el cuarto
        más caro. Son precios pedidos: confirmá en el aviso antes de comprar, con el envío.
      </p>
      <p v-if="usdRate" class="vida-section__intro">
        Los avisos en dólares se convierten a {{ usdRate }} por dólar.
      </p>
      <p class="vida-section__intro">
        Todas las barras usan la misma escala: más a la derecha, más caro, y cada marca es diez
        veces la anterior. Los enlaces a Mercado Libre de esta página son directos: no cobramos por
        ellos.
      </p>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" />

    <div class="vida-share">
      <ShareButtons :text="shareText" variant="tonal" color="primary" />
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import {
  PRODUCTOS_VIDA_BASE_PATH,
  PRODUCTOS_VIDA_BUDGETS,
  PRODUCTOS_VIDA_COUNT_RULE,
  PRODUCTOS_VIDA_EMPTY,
  productosVidaDateTime,
  productosVidaFaq,
  productosVidaFilterHref,
  productosVidaFit,
  productosVidaLead,
  productosVidaLongDate,
  productosVidaMoney,
  productosVidaQueryFromState,
  productosVidaRanks,
  productosVidaResultLine,
  productosVidaRulerDomain,
  productosVidaStateFromQuery,
  productosVidaTime,
  productosVidaTypeCounts,
  productosVidaVisible,
  type ProductosVidaResponse,
  type ProductosVidaState,
} from '~/utils/productosVida'
import {
  PRODUCTOS_VIDA_GROUPS,
  PRODUCTOS_VIDA_LEFT_OUT,
  PRODUCTOS_VIDA_NO_PRICE,
  PRODUCTOS_VIDA_PRODUCTS,
  PRODUCTOS_VIDA_THREAD,
} from '~/utils/productosVidaCatalog'

const localePath = useLocalePath()
const route = useRoute()
// Los href de los filtros llevan el idioma de la ruta (como apps-utiles-uruguay); el canonical, no.
const basePath = localePath(PRODUCTOS_VIDA_BASE_PATH)

// Literal y absoluta, nunca armada con localePath: /en/ y /pt/ apuntan a la misma canonical, y
// seoContract sólo comprueba que apunte a sí misma si es un `const` de este archivo.
const canonicalUrl = 'https://cambio-uruguay.com/productos-que-te-cambian-la-vida-uruguay'

// La API ya es la proyección: sin transform. Sin Mongo devuelve la forma vacía con unavailable; si
// el pedido mismo falla (sin red en una navegación, un $fetch que tira en el servidor) también se
// trata como «no pudimos leer», nunca como «todavía no hubo ninguna lectura». `error` viaja en el
// payload, así que el servidor y el cliente dicen lo mismo.
const { data, error } = await useFetch<ProductosVidaResponse>('/api/productos-vida', {
  key: 'productos-vida',
  default: () => PRODUCTOS_VIDA_EMPTY,
})
const response = computed<ProductosVidaResponse>(() =>
  error.value
    ? { ...PRODUCTOS_VIDA_EMPTY, unavailable: true }
    : (data.value ?? PRODUCTOS_VIDA_EMPTY)
)

// El estado sale de la URL también en el servidor: un enlace compartido o un filtro tocado antes de
// hidratar llega ya filtrado. Después se escribe con history.replaceState.
const state = reactive<ProductosVidaState>(
  productosVidaStateFromQuery(route.query as Record<string, unknown>)
)
usePreciosQuerySync(() => productosVidaQueryFromState(state))

// Todo lo que decide qué se ve sale del payload (que es el mismo en el servidor y en el cliente),
// nunca del reloj: sin ningún precio, el presupuesto se ignora.
const hasPrices = computed(() => response.value.products.length > 0)
const shown = computed<ProductosVidaState>(() => ({
  hasta: hasPrices.value ? state.hasta : null,
  tipo: state.tipo,
}))
const bySlug = computed(() => new Map(response.value.products.map(p => [p.slug, p])))
const ranks = new Map(productosVidaRanks(PRODUCTOS_VIDA_PRODUCTS).map(r => [r.slug, r]))
const domain = computed(() => productosVidaRulerDomain(response.value.products))

const rows = computed(() =>
  PRODUCTOS_VIDA_PRODUCTS.map(entry => {
    const product = bySlug.value.get(entry.slug)
    const rank = ranks.get(entry.slug)!
    return {
      entry,
      product,
      rank: rank.rank,
      tiedWith: rank.tiedWith,
      visible: productosVidaVisible(entry, product, shown.value, hasPrices.value),
    }
  })
)
const visibleCount = computed(() => rows.value.filter(row => row.visible).length)
const sinBandaVisible = computed(
  () =>
    rows.value.filter(
      row => row.visible && productosVidaFit(row.product, shown.value.hasta).kind === 'sin-banda'
    ).length
)
const counts = computed(() =>
  productosVidaTypeCounts(PRODUCTOS_VIDA_PRODUCTS, bySlug.value, shown.value.hasta)
)
const resultLine = computed(() =>
  productosVidaResultLine(
    visibleCount.value,
    shown.value.hasta === null ? 0 : sinBandaVisible.value,
    shown.value
  )
)
const filtersActive = computed(() => shown.value.hasta !== null || shown.value.tipo !== null)

const nextBudget = computed(() => {
  const hasta = shown.value.hasta
  if (hasta === null) return null
  return PRODUCTOS_VIDA_BUDGETS.find(budget => budget > hasta) ?? null
})
const emptyText = computed(() => {
  const group = PRODUCTOS_VIDA_GROUPS.find(g => g.id === shown.value.tipo)
  const de = group ? ` de ${group.label.toLowerCase()}` : ''
  return shown.value.hasta === null
    ? `Ningún producto${de} en la lista.`
    : `Con ${productosVidaMoney(shown.value.hasta)} o menos no entra ningún producto${de}.`
})

function select(patch: Partial<ProductosVidaState>) {
  Object.assign(state, patch)
}
function onRecover(event: MouseEvent, patch: Partial<ProductosVidaState>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  select(patch)
}

const lead = computed(() => productosVidaLead(PRODUCTOS_VIDA_PRODUCTS, hasPrices.value))
const threadReadOn = productosVidaLongDate(PRODUCTOS_VIDA_THREAD.readOn)
const threadPostedOn = PRODUCTOS_VIDA_THREAD.postedOn.split('-').reverse().join('/')
const asofTail = computed(() => {
  const read = `el ${threadReadOn}, con sus ${PRODUCTOS_VIDA_THREAD.comments} comentarios.`
  const prices = productosVidaDateTime(response.value.generatedAt)
  return prices ? `${read} Precios de Mercado Libre del ${prices}.` : read
})
const pricesReadOn = computed(() => productosVidaLongDate(response.value.generatedAt))
const usdRate = computed(() =>
  response.value.usdUyu === null
    ? ''
    : `$\u00A0${response.value.usdUyu.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
)

// Un solo aviso de página, en este orden: sin Mongo, sin ninguna lectura todavía, sin lecturas
// recientes, o precios viejos.
const pageNote = computed<{ text: string; icon: string; warn: boolean } | null>(() => {
  const res = response.value
  if (res.unavailable) {
    return {
      text: 'No pudimos leer los precios en este momento. La lista de lo que nombró r/uruguay está completa abajo.',
      icon: 'mdi-information-outline',
      warn: false,
    }
  }
  if (res.generatedAt === null) {
    return {
      text: 'Todavía no hay precios de Mercado Libre para mostrar. La lista de lo que nombró r/uruguay está completa abajo; los precios se completan con la próxima lectura, que se hace cuatro veces por día.',
      icon: 'mdi-information-outline',
      warn: false,
    }
  }
  if (!res.products.length) {
    return {
      text: 'No pudimos leer los precios recientes. La lista de lo que dijo r/uruguay sigue abajo; los precios vuelven con la próxima lectura.',
      icon: 'mdi-information-outline',
      warn: false,
    }
  }
  if (res.stale) {
    return {
      text: `Los precios son del ${productosVidaLongDate(res.generatedAt)} a las ${productosVidaTime(res.generatedAt)}: la lectura más reciente falló. Pueden haber cambiado.`,
      icon: 'mdi-clock-alert-outline',
      warn: true,
    }
  }
  return null
})

const faq = computed(() => productosVidaFaq(response.value))
const shareText = computed(() =>
  shown.value.hasta === null
    ? 'Lo que a r/uruguay le cambió la vida, con lo que piden por cada uno en Mercado Libre'
    : `Lo que a r/uruguay le cambió la vida por ${productosVidaMoney(shown.value.hasta)} o menos, con lo que piden hoy en Mercado Libre`
)

// 58 caracteres con la marca.
const TITLE = 'Productos que te cambian la vida: precios'
// Nombra a los tres empatados arriba (cuatro personas cada uno) y a nadie más.
const DESCRIPTION =
  'Calientacama, lavavajillas y secarropas encabezan lo que nombró r/uruguay el 19/11/2026; al lado, lo que piden por cada uno en Mercado Libre.'
const OG_TITLE = 'Lo que le cambió la vida a r/uruguay, y lo que piden por cada uno'

defineOgImageComponent('Cambio', {
  title: 'Productos que te cambian la vida',
  subtitle: 'Lo que nombró r/uruguay, con lo que piden hoy en Mercado Libre',
  tag: 'DIRECTORIO',
})

useSeoMeta({
  title: () => `${TITLE} | Cambio Uruguay`,
  description: DESCRIPTION,
  ogTitle: OG_TITLE,
  ogDescription: DESCRIPTION,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: OG_TITLE,
  twitterDescription: DESCRIPTION,
})

// Sin nodo WebPage acá: @nuxtjs/seo ya emite uno con @id <canonical>#webpage, y un segundo con el
// mismo IRI es una identidad duplicada. Se extiende el del módulo (abajo). El FAQPage lo emite
// FaqSection.
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      key: 'productos-vida-ld',
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
              directoriosHubListItem(2),
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Productos que te cambian la vida',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Productos que r/uruguay nombró como los que le cambiaron la vida',
            numberOfItems: PRODUCTOS_VIDA_PRODUCTS.length,
            itemListElement: PRODUCTOS_VIDA_PRODUCTS.map((entry, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: entry.name,
              url: `${canonicalUrl}#${entry.slug}`,
            })),
          },
        ],
      }),
    },
  ],
})

useSchemaOrg([
  defineWebPage({
    isBasedOn: PRODUCTOS_VIDA_THREAD.url,
    dateModified: () => response.value.generatedAt ?? undefined,
  }),
])
</script>

<style scoped>
/* Reset en :where() (especificidad 0): con :is() le ganaba a los márgenes del propio autor. */
:where(.vida-page) :where(p, h1, h2, h3, h4, ul, ol) {
  margin-top: 0;
}
.vida-page {
  max-width: 1120px;
}
.vida-title {
  max-width: 24ch;
  margin-bottom: 12px;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.vida-lead {
  max-width: 68ch;
  margin-bottom: 8px;
  font-size: 1.075rem;
  line-height: 1.65;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.v-theme--dark .vida-lead {
  color: rgba(var(--v-theme-on-surface), 0.82);
}
.vida-asof {
  max-width: 72ch;
  margin-bottom: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8rem;
  line-height: 1.35;
}
.vida-asof a,
.vida-section__intro a {
  color: rgb(var(--v-theme-link));
}
/* Un aviso por página. El texto va en tinta sobre el tinte, nunca en ámbar. */
.vida-note {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  max-width: 72ch;
  margin-top: 12px;
  margin-bottom: 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-info), 0.1);
  font-size: 0.875rem;
  line-height: 1.45;
}
.vida-note--warn {
  background: rgba(var(--v-theme-warning), 0.14);
}
.vida-block-filters {
  margin-top: 24px;
}
.vida-list-section {
  margin-top: 16px;
  scroll-margin-top: 84px;
}
.vida-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
/* El repo no tiene un `[hidden] { display: none !important }` global, y el `[hidden]` del navegador
   pierde contra cualquier `display` de autor. */
.vida-item[hidden] {
  display: none !important;
}
.vida-list > :deep(.google-auto-placed) {
  margin-block: 16px;
}
.vida-empty {
  padding: 24px 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  text-align: center;
}
.vida-empty__title {
  margin-bottom: 8px;
  font-weight: 700;
}
.vida-empty__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  justify-content: center;
  margin-bottom: 0;
}
.vida-empty__link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: rgb(var(--v-theme-link));
  font-size: 0.95rem;
  font-weight: 600;
}
.vida-section {
  margin-top: 40px;
}
.vida-section__title {
  margin-bottom: 8px;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
}
.vida-section__intro {
  max-width: 70ch;
  margin-top: 12px;
  margin-bottom: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}
.vida-other {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px 24px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.vida-other__item {
  min-width: 0;
  padding-block: 8px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.vida-other__label {
  margin-bottom: 0;
  font-weight: 600;
}
.vida-other__why {
  margin-top: 4px;
  margin-bottom: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}
.vida-link {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-height: 44px;
  color: rgb(var(--v-theme-link));
  font-size: 0.95rem;
  font-weight: 600;
  text-underline-offset: 2px;
}
.vida-share {
  margin-top: 32px;
}
@media (min-width: 600px) {
  .vida-other {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
}
</style>
