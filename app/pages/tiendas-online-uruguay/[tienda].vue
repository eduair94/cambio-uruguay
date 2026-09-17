<!--
THESIS: Someone is about to type their card number into a site they never bought from. Answer what's actually verifiable about it, dated and sourced, and never pretend to a verdict this page cannot back up.
OWN-WORLD: Same surfaces, type and link blue as the /tiendas-online-uruguay hub this page hangs from.
FIRST VIEWPORT: Breadcrumbs, the H1 question, and the one-paragraph factual summary before any block.
FAMILY: Spanish only, like the hub and equipar-casa-uruguay: the canonical carries no locale prefix.
-->
<template>
  <VContainer class="tienda-ficha py-6 py-md-10">
    <VBreadcrumbs class="px-0 pb-2" :items="crumbs" />

    <header class="tienda-header">
      <h1>{{ headingText }}</h1>
      <p class="lead">{{ summary }}</p>
    </header>

    <!-- ── Identidad ──────────────────────────────────────────────────────── -->
    <section v-if="showIdentity" class="tienda-section" aria-labelledby="identidad-title">
      <h2 id="identidad-title">Identidad</h2>

      <dl v-if="entry.domain || ageFresh" class="fact-list">
        <div v-if="entry.domain">
          <dt>Dominio</dt>
          <dd>{{ entry.domain }}</dd>
        </div>
        <div v-if="ageFresh">
          <dt>En línea desde</dt>
          <dd>{{ storeFormatDate(profile.age!.since) }}</dd>
        </div>
      </dl>
      <p v-if="ageFresh" class="source-note">
        Fuente:
        {{ profile.age!.source === 'crt.sh' ? 'certificado del dominio' : 'Wayback Machine' }} ·
        revisado el {{ storeFormatDate(profile.age!.checkedAt) }}
      </p>

      <template v-if="siteFresh">
        <dl class="fact-list">
          <div v-if="profile.site!.platform">
            <dt>Plataforma</dt>
            <dd>{{ profile.site!.platform }}</dd>
          </div>
          <div>
            <dt>Publica contacto</dt>
            <dd>{{ contactSummary }}</dd>
          </div>
          <div v-if="profile.site!.rut">
            <dt>RUT</dt>
            <dd>{{ profile.site!.rut }}</dd>
          </div>
        </dl>
        <ul v-if="policyLinks.length" class="policy-links">
          <li v-for="link in policyLinks" :key="link.label">
            <a :href="link.url" target="_blank" rel="nofollow noopener" class="tienda-link">{{
              link.label
            }}</a>
          </li>
        </ul>
        <p class="source-note">
          Fuente: sitio de {{ entry.name }} · revisado el
          {{ storeFormatDate(profile.site!.checkedAt) }}
        </p>
      </template>

      <!-- La dirección tiene su propia frescura (Google o el sitio, cada uno con su checkedAt),
           así que se muestra y se fecha aparte del resto del bloque del sitio: puede estar fresca
           cuando el resto del escaneo del sitio no lo está, o al revés. -->
      <template v-if="address">
        <p class="identity-address">Dirección: {{ address.address }}</p>
        <p class="source-note">
          Fuente: {{ address.source === 'google' ? 'Google Maps' : 'sitio de la tienda' }} ·
          revisado el {{ storeFormatDate(address.checkedAt) }}
        </p>
      </template>
    </section>

    <!-- ── Reseñas ────────────────────────────────────────────────────────── -->
    <section
      v-if="trustpilotFresh || googleFresh"
      class="tienda-section"
      aria-labelledby="resenas-title"
    >
      <h2 id="resenas-title">Reseñas</h2>
      <div class="review-grid">
        <article v-if="trustpilotFresh">
          <h3>Trustpilot</h3>
          <p>
            {{ storeEsDecimal(profile.trustpilot!.score) }} sobre 5 en
            {{ storeEsCount(profile.trustpilot!.reviews) }} reseñas ({{
              storeEsCount(profile.trustpilot!.reviewsLast12m)
            }}
            en los últimos 12 meses).
          </p>
          <a
            :href="profile.trustpilot!.url"
            target="_blank"
            rel="nofollow noopener"
            class="tienda-link"
          >
            Ver en Trustpilot
          </a>
          <p class="source-note">
            Fuente: Trustpilot · revisado el {{ storeFormatDate(profile.trustpilot!.checkedAt) }}
          </p>
        </article>
        <article v-if="googleFresh">
          <h3>Google</h3>
          <p>
            {{ storeEsDecimal(profile.google!.rating) }} sobre 5 en
            {{ storeEsCount(profile.google!.reviews) }} reseñas.
          </p>
          <a
            :href="profile.google!.url"
            target="_blank"
            rel="nofollow noopener"
            class="tienda-link"
          >
            Ver en Google Maps
          </a>
          <p class="source-note">
            Fuente: Google Maps · revisado el {{ storeFormatDate(profile.google!.checkedAt) }}
          </p>
        </article>
      </div>
    </section>

    <!-- ── Reddit ─────────────────────────────────────────────────────────── -->
    <section v-if="redditFresh" class="tienda-section" aria-labelledby="reddit-title">
      <h2 id="reddit-title">Reddit</h2>
      <p>
        {{ storeEsCount(profile.reddit!.mentions) }} menciones encontradas en r/uruguay y
        r/montevideo.
      </p>
      <ul v-if="redditYears.length" class="reddit-years">
        <li v-for="row in redditYears" :key="row.year">
          {{ row.year }}: {{ storeEsCount(row.count) }}
        </li>
      </ul>
      <p v-if="profile.reddit!.tone" class="reddit-tone">
        De las menciones clasificadas: {{ storeEsCount(profile.reddit!.tone!.complaints) }} con
        reclamos, {{ storeEsCount(profile.reddit!.tone!.recommendations) }} con recomendaciones y
        {{ storeEsCount(profile.reddit!.tone!.neutral) }} neutras (clasificación automática de
        {{ storeEsCount(profile.reddit!.tone!.classified) }} menciones).
      </p>
      <ul v-if="redditThreads.length" class="reddit-threads">
        <li v-for="thread in redditThreads" :key="thread.url">
          <a :href="thread.url" target="_blank" rel="nofollow noopener" class="tienda-link">{{
            thread.title
          }}</a>
          <span class="thread-meta"
            >{{ storeFormatDate(thread.date) }} · {{ thread.score }} puntos</span
          >
        </li>
      </ul>
      <p class="source-note">
        Fuente: Reddit · revisado el {{ storeFormatDate(profile.reddit!.checkedAt) }}
      </p>
    </section>

    <!-- ── En nuestros relevamientos ──────────────────────────────────────── -->
    <section v-if="catalogFresh" class="tienda-section" aria-labelledby="relevamientos-title">
      <h2 id="relevamientos-title">En nuestros relevamientos</h2>
      <p>
        {{ storeEsCount(profile.catalog!.offers) }} ofertas encontradas en nuestros propios
        catálogos de precios.
      </p>
      <ul class="catalog-verticals">
        <li v-for="vertical in profile.catalog!.verticals" :key="vertical.key">
          <NuxtLink :to="localePath(vertical.url)" class="tienda-link">{{
            vertical.label
          }}</NuxtLink>
          ({{ storeEsCount(vertical.offers) }} {{ vertical.offers === 1 ? 'oferta' : 'ofertas' }})
        </li>
      </ul>
      <p class="source-note">
        Fuente: catálogos propios · revisado el {{ storeFormatDate(profile.catalog!.checkedAt) }}
      </p>
    </section>

    <!-- ── Descuentos con tarjeta ─────────────────────────────────────────── -->
    <section v-if="bankosBrandSlug" class="tienda-section" aria-labelledby="descuentos-title">
      <h2 id="descuentos-title">Descuentos con tarjeta</h2>
      <p>
        <NuxtLink
          :to="localePath(`/descuentos-con-tarjeta-uruguay/marca/${bankosBrandSlug}`)"
          class="tienda-link"
        >
          Ver los descuentos con tarjeta publicados para {{ entry.name }}
        </NuxtLink>
      </p>
    </section>

    <!-- ── Cómo comprar con menos riesgo ──────────────────────────────────── -->
    <section class="tienda-section" aria-labelledby="riesgo-title">
      <h2 id="riesgo-title">{{ buyingAdvice.title }}</h2>
      <ul class="advice-list">
        <li v-for="(item, index) in buyingAdvice.items" :key="index">
          <NuxtLink v-if="item.to" :to="localePath(item.to)" class="tienda-link">{{
            item.text
          }}</NuxtLink>
          <template v-else>{{ item.text }}</template>
        </li>
      </ul>
    </section>

    <!-- ── Si tenés un problema ───────────────────────────────────────────── -->
    <section class="tienda-section" aria-labelledby="problema-title">
      <h2 id="problema-title">Si tenés un problema</h2>
      <p>
        Reclamale primero directo a {{ entry.name }}, por escrito y con fecha (mail, WhatsApp o el
        canal que publique en su sitio). Si no responde o no resuelve, el reclamo es gratis ante el
        Área de Defensa del Consumidor del Ministerio de Economía y Finanzas.
      </p>
      <p>
        <NuxtLink :to="localePath('/defensa-al-consumidor-uruguay')" class="tienda-link">
          Cómo hacer el reclamo paso a paso
        </NuxtLink>
        ·
        <NuxtLink :to="localePath('/a-quien-le-reclamo-uruguay')" class="tienda-link">
          A quién le reclamo, según el rubro
        </NuxtLink>
      </p>
    </section>

    <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" />

    <!-- ── Corregir un dato ───────────────────────────────────────────────── -->
    <section class="tienda-section tienda-correction" aria-labelledby="corregir-title">
      <h2 id="corregir-title">¿Sos de {{ entry.name }}?</h2>
      <p>
        Si un dato de esta ficha está desactualizado o es incorrecto, escribinos desde la
        <NuxtLink :to="localePath('/contacto')" class="tienda-link">página de contacto</NuxtLink>
        con el dato a corregir y una fuente que lo respalde.
      </p>
    </section>

    <!-- ── Otras tiendas del mismo rubro ──────────────────────────────────── -->
    <section v-if="siblingLinks.length" class="tienda-section" aria-labelledby="otras-title">
      <h2 id="otras-title">Otras tiendas de {{ primaryRubroLabel }}</h2>
      <ul class="sibling-list">
        <li v-for="sibling in siblingLinks" :key="sibling.key">
          <NuxtLink :to="localePath(`/tiendas-online-uruguay/${sibling.key}`)" class="tienda-link">
            {{ sibling.name }}
          </NuxtLink>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import type { StoreDetailResponse } from '~/server/api/stores/[slug].get'
import type { StoreCard, StoresIndexResponse } from '~/server/api/stores/index.get'
import {
  isStoreDirectoryKey,
  storeDirectoryEntry,
  STORE_RUBRO_LABELS,
  type StoreRubro,
} from '~/utils/storeDirectory'
import {
  storeAddress,
  storeBuyingAdvice,
  storeEsCount,
  storeEsDecimal,
  storeFaq,
  storeFormatDate,
  storeSignalFresh,
  storeSignalSummary,
  type StorePublicProfile,
} from '~/utils/storeProfiles'

// Un slug fuera del registro curado es 404 de verdad. `validate` se extrae en build, así que solo
// puede usar una función importada, nunca una closure sobre estado del componente.
definePageMeta({
  validate: route => isStoreDirectoryKey(String(route.params.tienda ?? '')),
})

const route = useRoute()
const localePath = useLocalePath()

const key = computed(() => String(route.params.tienda ?? ''))
const initialEntry = storeDirectoryEntry(key.value)
if (!initialEntry) {
  // Red de seguridad antes de cualquier await: `validate` ya filtró los slugs que no existen.
  throw createError({ statusCode: 404, statusMessage: 'Tienda no encontrada', fatal: true })
}
const entry = computed(() => storeDirectoryEntry(key.value) ?? initialEntry)

// Server-rendered: el resumen y las señales tienen que estar en el HTML que recibe el buscador.
// Un slug del registro sin ficha escrita todavía es un 404 DE VERDAD, no una plantilla vacía en
// 200 — el mismo motivo que /descuentos-con-tarjeta-uruguay/marca/[marca].vue.
const { data, error } = await useFetch<StoreDetailResponse>(() => `/api/stores/${key.value}`, {
  key: `store-${key.value}`,
})

if (error.value || !data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Todavía no hay ficha para esta tienda',
    fatal: true,
  })
}

const profile = computed<StorePublicProfile>(() => data.value!.profile)
const bankosBrandSlug = computed(() => data.value!.bankosBrandSlug)

// Para "Otras tiendas de <rubro>": el hub ya sabe qué tiendas tienen ficha propia
// (`hasProfile`), y enlazar una sin ficha sería enlazar a un 404.
const { data: indexData } = await useFetch<StoresIndexResponse>('/api/stores', {
  key: 'tiendas-online-index',
})
const siblingStores = computed<StoreCard[]>(() => indexData.value?.stores ?? [])

const now = new Date()

const ageFresh = computed(() =>
  Boolean(profile.value.age && storeSignalFresh(profile.value.age.checkedAt, now))
)
const siteFresh = computed(() =>
  Boolean(
    profile.value.site &&
      profile.value.site.status === 'ok' &&
      storeSignalFresh(profile.value.site.checkedAt, now)
  )
)
// `storeAddress` already gates Google/site on their OWN freshness (fix round 1, item 2), so a
// truthy `address` here is itself a reason to show the "Identidad" section even when neither
// `ageFresh` nor `siteFresh` is — e.g. a fresh Google listing on an otherwise stale site scan.
const address = computed(() => storeAddress(profile.value, now))
const showIdentity = computed(() => ageFresh.value || siteFresh.value || Boolean(address.value))

const trustpilotFresh = computed(() =>
  Boolean(profile.value.trustpilot && storeSignalFresh(profile.value.trustpilot.checkedAt, now))
)
const googleFresh = computed(() =>
  Boolean(profile.value.google && storeSignalFresh(profile.value.google.checkedAt, now))
)
const redditFresh = computed(() =>
  Boolean(
    profile.value.reddit &&
      profile.value.reddit.mentions > 0 &&
      storeSignalFresh(profile.value.reddit.checkedAt, now)
  )
)
const catalogFresh = computed(() =>
  Boolean(
    profile.value.catalog &&
      profile.value.catalog.offers > 0 &&
      storeSignalFresh(profile.value.catalog.checkedAt, now)
  )
)

const contactSummary = computed(() => {
  const site = profile.value.site
  if (!site) return ''
  const parts: string[] = []
  if (site.phone) parts.push('teléfono')
  if (site.whatsapp) parts.push('WhatsApp')
  if (site.email) parts.push('correo')
  return parts.length ? parts.join(', ') : 'No publica teléfono, WhatsApp ni correo directo.'
})

const policyLinks = computed(() => {
  if (!siteFresh.value || !profile.value.site) return []
  const { policies } = profile.value.site
  const candidates: Array<{ label: string; url: string | null }> = [
    { label: 'Política de cambios y devoluciones', url: policies.returns },
    { label: 'Términos y condiciones', url: policies.terms },
    { label: 'Política de privacidad', url: policies.privacy },
  ]
  return candidates.filter((candidate): candidate is { label: string; url: string } =>
    Boolean(candidate.url)
  )
})

const redditYears = computed(() => {
  if (!profile.value.reddit) return []
  return Object.entries(profile.value.reddit.byYear)
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year.localeCompare(b.year))
})
const redditThreads = computed(() => profile.value.reddit?.threads.slice(0, 5) ?? [])

const buyingAdvice = computed(() => storeBuyingAdvice(entry.value.kind))

const faqItems = computed(() =>
  storeFaq(profile.value, bankosBrandSlug.value).map((item, index) => ({
    id: `tienda-${key.value}-${index}`,
    question: item.question,
    answer: item.answer,
  }))
)

const primaryRubro = computed<StoreRubro | undefined>(() => entry.value.rubros[0])
const primaryRubroLabel = computed(() =>
  primaryRubro.value ? STORE_RUBRO_LABELS[primaryRubro.value].toLowerCase() : ''
)

const SIBLING_LIMIT = 6
const siblingLinks = computed(() => {
  const rubro = primaryRubro.value
  if (!rubro) return []
  const withProfile = new Set(
    siblingStores.value.filter(store => store.hasProfile).map(store => store.key)
  )
  return siblingStores.value
    .filter(
      store => store.key !== key.value && store.rubros.includes(rubro) && withProfile.has(store.key)
    )
    .slice(0, SIBLING_LIMIT)
})

const headingText = computed(
  () => `¿${entry.value.name} es confiable? Opiniones, reclamos y datos verificables`
)
const summary = computed(() => storeSignalSummary(profile.value, now))

const crumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Tiendas online', to: localePath('/tiendas-online-uruguay') },
  { title: entry.value.name, disabled: true },
])

// ── SEO ────────────────────────────────────────────────────────────────────
const canonical = computed(() => `https://cambio-uruguay.com/tiendas-online-uruguay/${key.value}`)

const seoTitle = computed(() => {
  const long = `¿${entry.value.name} es confiable? Opiniones y datos | Cambio Uruguay`
  return long.length <= 65 ? long : `${entry.value.name}: opiniones y datos | Cambio Uruguay`
})

const seoDescription = computed(() => {
  const facts: string[] = []
  if (trustpilotFresh.value)
    facts.push(`Trustpilot ${storeEsDecimal(profile.value.trustpilot!.score)}/5`)
  if (googleFresh.value) facts.push(`Google ${storeEsDecimal(profile.value.google!.rating)}/5`)
  if (ageFresh.value) facts.push(`en línea desde ${storeFormatDate(profile.value.age!.since)}`)
  if (redditFresh.value)
    facts.push(`${storeEsCount(profile.value.reddit!.mentions)} menciones en Reddit`)
  const chosen = facts.slice(0, 2).join(' y ')
  return chosen
    ? `${entry.value.name}: ${chosen}. Datos verificados, con fuente y fecha, no un ranking de confianza.`
    : `${entry.value.name}: antigüedad del dominio, reseñas, menciones en Reddit y reclamos, ` +
        'cada dato con su fuente y su fecha. No es un ranking de confianza.'
})

defineOgImageComponent('Cambio', {
  title: () => entry.value.name,
  subtitle: 'Tiendas online',
  tag: 'TIENDAS',
})

useSeoMeta({
  title: () => `${seoTitle.value}`,
  description: () => seoDescription.value,
  ogTitle: () => `¿${entry.value.name} es confiable?`,
  ogDescription: () => seoDescription.value,
  ogType: 'article',
  ogUrl: () => canonical.value,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
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
                name: 'Tiendas online',
                item: 'https://cambio-uruguay.com/tiendas-online-uruguay',
              },
              { '@type': 'ListItem', position: 3, name: entry.value.name, item: canonical.value },
            ],
          },
          {
            // Never a rating: this is identity, not a score this site invented.
            '@type': 'Organization',
            name: entry.value.name,
            ...(entry.value.domain ? { url: `https://${entry.value.domain}` } : {}),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.tienda-ficha {
  max-width: 1120px;
}
.tienda-ficha p {
  margin: 12px 0 0;
}
.tienda-header h1 {
  margin: 0;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  line-height: 1.2;
  text-wrap: balance;
}
.lead {
  max-width: 68ch;
  font-size: 1.075rem;
}
.tienda-section {
  margin-top: 40px;
}
.tienda-section h2 {
  margin: 0;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
}
.tienda-section h3 {
  margin: 0;
  font-size: 1.05rem;
}
.tienda-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.fact-list {
  margin: 12px 0 0;
}
.fact-list div {
  display: grid;
  grid-template-columns: minmax(140px, 220px) 1fr;
  gap: 4px 16px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
}
@media (max-width: 599.98px) {
  .fact-list div {
    grid-template-columns: 1fr;
  }
}
.fact-list dt {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.65;
}
.fact-list dd {
  margin: 0;
  font-size: 0.95rem;
}
.identity-address {
  font-size: 0.95rem;
}
.source-note {
  margin-top: 8px !important;
  font-size: 0.8rem;
  opacity: 0.65;
}
.policy-links {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}
.review-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.review-grid article {
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.reddit-years {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  font-size: 0.875rem;
  opacity: 0.85;
}
.reddit-threads {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}
.reddit-threads li {
  display: flex;
  flex-direction: column;
  padding: 6px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}
.thread-meta {
  font-size: 0.75rem;
  opacity: 0.7;
}
.catalog-verticals {
  margin: 8px 0 0;
  padding-left: 22px;
}
.advice-list {
  margin: 12px 0 0;
  padding-left: 22px;
  max-width: 70ch;
}
.advice-list li {
  padding: 4px 0;
}
.tienda-correction {
  padding: 20px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.sibling-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 4px 20px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.sibling-list li {
  display: flex;
  align-items: center;
  min-height: 44px;
  font-size: 0.95rem;
}
</style>
