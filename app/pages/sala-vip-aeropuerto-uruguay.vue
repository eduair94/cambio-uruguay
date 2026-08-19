<template>
  <div class="vip-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn
        :to="localePath('/tarjetas-de-credito-uruguay')"
        variant="text"
        size="small"
        class="px-1"
      >
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Tarjetas de crédito
      </VBtn>
    </div>

    <!-- Hero -->
    <VCard class="overflow-hidden mb-5 hero-card on-dark" elevation="8">
      <div class="hero pa-6 pa-md-8">
        <p class="hero-eyebrow">Salas VIP de aeropuerto · Agosto 2026</p>
        <h1 class="hero-title">
          Sala VIP en el aeropuerto de Uruguay
          <span class="hero-title-accent">
            Hay una sola sala en Carrasco. Entrar cuesta entre US$ 10 y US$ 90 según con qué entres.
          </span>
        </h1>
        <p class="hero-lead">
          Tu tarjeta te promete “1.300 salas en el mundo”. En Montevideo eso significa
          <strong>una</strong>: todas las redes —Priority Pass, LoungeKey, Visa Airport Companion,
          Mastercard Airport Experiences, DragonPass, Diners— terminan en la misma puerta. Entonces
          lo único que importa es cuántos accesos te da tu tarjeta por año y
          <strong>cuánto cuesta el siguiente</strong>. Acá están todos los caminos publicados, con
          la fuente al lado.
        </p>
        <div class="hero-meta">
          <span class="hero-spoiler">
            <VIcon size="16" class="mr-2">mdi-airplane-check</VIcon>
            <span>
              {{ ACCESS_ROUTES.length }} vías de acceso verificadas, {{ LOUNGES.length }} salas. Lo
              que ningún emisor publica está listado como tal.
            </span>
          </span>
        </div>
        <div class="d-flex justify-start justify-md-end mt-4">
          <ShareButtons
            text="Cómo entrar a la Sala VIP del aeropuerto de Carrasco (y cuánto cuesta de verdad)"
          />
        </div>
      </div>
    </VCard>

    <!-- Answer up front -->
    <VCard variant="flat" class="answer-card pa-4 pa-sm-5 mb-5">
      <div class="d-flex align-center ga-2 mb-3">
        <VIcon size="20" color="primary">mdi-lightbulb-on-outline</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">La respuesta corta</h2>
      </div>
      <ul class="answer-list">
        <li>
          <strong>La vía barata es Itaú, y por lejos.</strong> Visa Platinum, Visa Infinite y
          Mastercard Black traen una bolsa de <strong>diez accesos a US$ 10 cada uno</strong> por la
          app (Visa Airport Companion o Mastercard Airport Experiences). Ningún otro emisor uruguayo
          publica una tarifa preferencial: el resto da N gratis y después silencio.
        </li>
        <li>
          <strong>La vía sin tarjeta es pagar la entrada: US$ {{ WALK_IN_USD }}</strong> por persona
          en la tienda del aeropuerto, exenta de IVA, para cualquier pasajero sin importar aerolínea
          ni clase. Con carné de socio del Club El País o de Medicina Personalizada baja
          <strong>20 %</strong> (US$ {{ Math.round(WALK_IN_USD * 0.8) }}), con reserva 48 h antes.
        </li>
        <li>
          <strong>Los menores de {{ CHILD_FREE_UNDER }} entran gratis</strong> con un adulto con
          pasaje válido. Dos adultos y dos chicos pagan US$ {{ WALK_IN_USD * 2 }}, no US$
          {{ WALK_IN_USD * 4 }}. Es lo que hace que la membresía casi nunca cierre para una familia.
        </li>
        <li>
          <strong>Más accesos gratis: Scotiabank Amex Platinum</strong> (10 al año para el titular y
          5 para el adicional, vía Priority Pass), después
          <strong>BROU Mastercard Black</strong> (6, y el banco aclara que valen para titular
          <em>y</em> adicional) y <strong>Santander Mastercard Black</strong> (5, pero en bolsa
          compartida entre titular y adicionales).
        </li>
        <li>
          <strong>La sala de Arribos es otra cosa.</strong> No está en Priority Pass: en Carrasco la
          red lista una sola sala, la de Partidas. A llegadas se entra pagando, canjeando millas
          Volar o con los 5 ingresos sin costo de la Cuenta Itaú Personal Bank.
        </li>
        <li>
          <strong>Ojo con la obra.</strong> Desde el 9 de febrero de 2026 funciona una sala
          provisoria frente a las puertas 7 y 8, sin duchas, sin área de silencio y sin espacio
          infantil. Entrás igual con cualquier programa, pero no es la sala de las fotos.
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mb-0 mt-3">
        Datos verificados al {{ fmtDate(LOUNGE_LAST_REVIEWED) }} contra las páginas de cada emisor y
        del operador de las salas. Es información, no asesoramiento financiero.
      </p>
    </VCard>

    <AdSlot v-if="adsOn" class="mb-5" />

    <!-- ── Calculator ── -->
    <VCard id="calculadora" variant="flat" class="calc-card pa-4 pa-sm-5 mb-5">
      <div class="d-flex align-center ga-2 mb-1">
        <VIcon size="20" color="primary">mdi-calculator-variant-outline</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">¿Qué te conviene según cuánto viajás?</h2>
      </div>
      <p class="text-caption text-medium-emphasis mb-4">
        Contá solo las veces por año que <em>realmente</em> usarías la sala, y cuántos adultos
        entran con vos cada vez (los menores de {{ CHILD_FREE_UNDER }} no cuentan: no pagan). El
        ranking compara únicamente las vías con precio publicado; las que dan N gratis y no dicen
        qué cuesta el siguiente no se pueden calcular, y están más abajo.
      </p>

      <VRow dense>
        <VCol cols="12" sm="6" md="4">
          <VSelect
            v-model="visits"
            :items="visitItems"
            label="Ingresos por año"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6" md="4">
          <VSelect
            v-model="guests"
            :items="guestItems"
            label="Acompañantes adultos (cada vez)"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
      </VRow>

      <VAlert
        v-if="best"
        type="success"
        variant="tonal"
        density="comfortable"
        class="mt-4 mb-0 text-body-2"
      >
        Con <strong>{{ visits }}</strong> ingreso{{ visits === 1 ? '' : 's' }} al año
        <span v-if="guests > 0">
          y {{ guests }} acompañante{{ guests === 1 ? '' : 's' }} cada vez</span
        >, lo más barato es <strong>{{ best.route.provider }} — {{ best.route.product }}</strong
        >: <strong>US$ {{ fmtUsd(best.cost.total || 0) }}</strong> al año
        <span v-if="visits > 0">
          (US$ {{ fmtUsd(costPerVisit(best.cost, visits) || 0) }} por ingreso tuyo)</span
        >.
        <span v-if="best.route.kind === 'tarjeta'">
          Es un beneficio de tarjeta: no incluye el cargo anual del plástico, que se paga igual uses
          o no la sala.
        </span>
      </VAlert>

      <VTable class="cu-mobile-cards cu-roomy rank-table mt-4" density="comfortable">
        <thead>
          <tr>
            <th>Vía</th>
            <th>Cómo se compone</th>
            <th class="text-right">Costo del año</th>
            <th class="text-right">Por ingreso</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in ranking" :key="row.route.id" :class="{ 'best-row': i === 0 }">
            <td data-label="Vía">
              <div class="font-weight-bold">{{ row.route.provider }}</div>
              <div class="text-caption text-medium-emphasis">{{ row.route.product }}</div>
              <VChip size="x-small" variant="tonal" class="mt-1">
                {{ KIND_LABEL[row.route.kind] }}
              </VChip>
            </td>
            <td data-label="Cómo se compone">
              <span class="text-caption">{{ row.cost.steps.join(' + ') || 'Sin costo' }}</span>
            </td>
            <td data-label="Costo del año" class="text-right">
              <strong v-if="row.cost.total !== null">US$ {{ fmtUsd(row.cost.total) }}</strong>
              <span v-else class="text-medium-emphasis">no publicado</span>
            </td>
            <td data-label="Por ingreso" class="text-right">
              <span v-if="costPerVisit(row.cost, visits) !== null">
                US$ {{ fmtUsd(costPerVisit(row.cost, visits) as number) }}
              </span>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Los beneficios de tarjeta no incluyen el cargo anual del plástico ni el ingreso mínimo que
        exige cada emisor: entran acá como costo marginal de usar la sala, que es la comparación
        útil si ya tenés la tarjeta o estás por elegirla.
      </p>
    </VCard>

    <!-- ── Cards by issuer ── -->
    <section id="tarjetas" class="mb-6">
      <h2 class="section-title">Qué da cada tarjeta uruguaya</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Ordenadas por accesos sin costo. “Compartido” significa que titular y adicionales sacan de
        la misma bolsa; “cada uno” que la cuenta se repite por tarjetahabiente. Esa distinción vale
        plata si viajan dos.
      </p>

      <VTable class="cu-mobile-cards cu-roomy cards-table" density="comfortable">
        <thead>
          <tr>
            <th>Tarjeta</th>
            <th>Programa</th>
            <th class="text-right">Gratis / año</th>
            <th class="text-right">Acceso extra</th>
            <th>Fuente</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="route in cardRoutes" :key="route.id">
            <td data-label="Tarjeta">
              <div class="font-weight-bold">{{ route.provider }}</div>
              <div class="text-caption">{{ route.product }}</div>
            </td>
            <td data-label="Programa">
              <VChip size="x-small" variant="tonal">{{ PROGRAM_LABEL[route.program] }}</VChip>
            </td>
            <td data-label="Gratis / año" class="text-right">
              <strong v-if="route.freeAccesses !== null">{{ route.freeAccesses }}</strong>
              <span v-else class="text-medium-emphasis">según emisor</span>
              <div v-if="route.freeAccesses" class="text-caption text-medium-emphasis">
                {{ SCOPE_LABEL[route.freeScope] }}
              </div>
            </td>
            <td data-label="Acceso extra" class="text-right">
              <span v-if="route.extraUsd !== null">
                <strong>US$ {{ route.extraUsd }}</strong>
                <span v-if="route.extraPool" class="text-caption text-medium-emphasis">
                  ×{{ route.extraPool }}</span
                >
                <div v-if="route.overflowUsd" class="text-caption text-medium-emphasis">
                  después US$ {{ route.overflowUsd }}
                </div>
              </span>
              <span v-else class="text-medium-emphasis">no publicado</span>
            </td>
            <td data-label="Fuente">
              <a
                v-if="route.sources[0]"
                :href="route.sources[0].url"
                target="_blank"
                rel="noopener nofollow"
                class="text-caption"
              >
                {{ shortHost(route.sources[0].url) }}
                <VIcon size="12">mdi-open-in-new</VIcon>
              </a>
            </td>
          </tr>
        </tbody>
      </VTable>

      <VExpansionPanels variant="accordion" class="mt-4">
        <VExpansionPanel v-for="route in cardRoutes" :key="route.id" :value="route.id">
          <VExpansionPanelTitle>
            <div>
              <span class="font-weight-bold">{{ route.provider }}</span>
              <span class="text-medium-emphasis"> · {{ route.product }}</span>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-body-2 mb-2">{{ route.detail }}</p>
            <p class="text-caption text-medium-emphasis mb-2">
              <VIcon size="14" class="mr-1">mdi-account-check-outline</VIcon>
              {{ route.requirement }}
            </p>
            <p class="text-caption text-medium-emphasis mb-2">
              <VIcon size="14" class="mr-1">mdi-door-open</VIcon>
              Sirve en: {{ route.lounges.map(loungeName).join(' · ') }}
            </p>
            <div class="d-flex flex-wrap ga-2">
              <a
                v-for="src in route.sources"
                :key="src.url"
                :href="src.url"
                target="_blank"
                rel="noopener nofollow"
                class="text-caption"
              >
                {{ src.label }} <VIcon size="12">mdi-open-in-new</VIcon>
              </a>
            </div>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <AdSlot v-if="adsOn" class="mb-6" />

    <!-- ── Without a card ── -->
    <section id="sin-tarjeta" class="mb-6">
      <h2 class="section-title">Sin tarjeta premium: comprar, asociarse o canjear</h2>
      <VRow dense>
        <VCol v-for="route in nonCardRoutes" :key="route.id" cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="d-flex align-start justify-space-between ga-2 mb-1">
              <div>
                <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ route.product }}</h3>
                <div class="text-caption text-medium-emphasis">{{ route.provider }}</div>
              </div>
              <div class="text-right">
                <div v-if="route.annualUsd" class="price-tag">US$ {{ route.annualUsd }}</div>
                <div v-else-if="route.extraUsd" class="price-tag">US$ {{ route.extraUsd }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ route.annualUsd ? 'por año' : route.extraUsd ? 'por ingreso' : '' }}
                </div>
              </div>
            </div>
            <p class="text-body-2 mb-2">{{ route.detail }}</p>
            <p class="text-caption text-medium-emphasis mb-2">
              <VIcon size="14" class="mr-1">mdi-account-check-outline</VIcon>
              {{ route.requirement }}
            </p>
            <div class="d-flex flex-wrap ga-2">
              <a
                v-for="src in route.sources"
                :key="src.url"
                :href="src.url"
                target="_blank"
                rel="noopener nofollow"
                class="text-caption"
              >
                {{ src.label }} <VIcon size="12">mdi-open-in-new</VIcon>
              </a>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- ── The lounges ── -->
    <section id="salas" class="mb-6">
      <h2 class="section-title">Las tres salas</h2>
      <VRow dense>
        <VCol v-for="lounge in LOUNGES" :key="lounge.id" cols="12" md="4">
          <VCard variant="outlined" class="pa-4 h-100">
            <VChip size="x-small" variant="tonal" class="mb-2">
              {{ lounge.iata }} · {{ lounge.area === 'partidas' ? 'Partidas' : 'Arribos' }}
            </VChip>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ lounge.name }}</h3>
            <div class="text-caption text-medium-emphasis mb-2">{{ lounge.airport }}</div>
            <p class="text-body-2 mb-2">{{ lounge.location }}</p>
            <ul class="plain-list text-body-2">
              <li>{{ lounge.hours }}</li>
              <li>Estadía máxima: {{ lounge.maxStayHours }} horas.</li>
              <li v-if="lounge.walkInUsd">
                Ingreso suelto: US$ {{ lounge.walkInUsd }} por persona.
              </li>
              <li>Menores de {{ CHILD_FREE_UNDER }}: sin cargo con un adulto.</li>
            </ul>
            <VAlert
              v-if="lounge.status"
              type="warning"
              variant="tonal"
              density="compact"
              class="my-3 text-caption"
            >
              {{ lounge.status }}
            </VAlert>
            <div class="text-caption text-medium-emphasis mb-1 font-weight-bold">Entran</div>
            <div class="d-flex flex-wrap ga-1 mb-3">
              <VChip v-for="n in lounge.networks" :key="n" size="x-small" variant="outlined">
                {{ n }}
              </VChip>
            </div>
            <div class="d-flex flex-wrap ga-2">
              <a
                v-for="src in lounge.sources"
                :key="src.url"
                :href="src.url"
                target="_blank"
                rel="noopener nofollow"
                class="text-caption"
              >
                {{ src.label }} <VIcon size="12">mdi-open-in-new</VIcon>
              </a>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- ── What doesn't work ── -->
    <VRow dense class="mb-6">
      <VCol cols="12" md="6">
        <VCard variant="outlined" class="pa-4 h-100">
          <h3 class="text-subtitle-1 font-weight-bold mb-2">
            <VIcon size="20" color="error" class="mr-1">mdi-close-circle-outline</VIcon>
            Lo que no te va a dejar entrar
          </h3>
          <ul class="plain-list">
            <li v-for="(item, i) in NO_ACCESS" :key="i">{{ item }}</li>
          </ul>
        </VCard>
      </VCol>
      <VCol cols="12" md="6">
        <VCard variant="outlined" class="pa-4 h-100">
          <h3 class="text-subtitle-1 font-weight-bold mb-2">
            <VIcon size="20" color="warning" class="mr-1">mdi-help-circle-outline</VIcon>
            Lo que nadie publica
          </h3>
          <ul class="plain-list">
            <li v-for="(item, i) in GAPS" :key="i">{{ item }}</li>
          </ul>
        </VCard>
      </VCol>
    </VRow>

    <!-- ── FAQ ── -->
    <section id="faq" class="mb-6">
      <h2 class="section-title">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="(faq, i) in FAQS" :key="i" :value="`faq-${i}`">
          <VExpansionPanelTitle>
            <span class="font-weight-medium">{{ faq.q }}</span>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-body-2 mb-0" v-html="faq.a" />
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- ── Sources ── -->
    <VCard variant="flat" class="sources-card pa-4 pa-sm-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">
        <VIcon size="20" class="mr-1">mdi-link-variant</VIcon>
        Fuentes
      </h2>
      <ul class="sources-list">
        <li v-for="src in LOUNGE_SOURCES" :key="src.url">
          <a :href="src.url" target="_blank" rel="noopener nofollow">{{ src.label }}</a>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mb-0 mt-3">
        Revisado el {{ fmtDate(LOUNGE_LAST_REVIEWED) }}. Los emisores cambian estos beneficios sin
        aviso: si la diferencia te importa, confirmá con el banco antes de contar con el acceso.
      </p>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import {
  ACCESS_ROUTES,
  CHILD_FREE_UNDER,
  FAQS,
  GAPS,
  LOUNGES,
  LOUNGE_LAST_REVIEWED,
  LOUNGE_SOURCES,
  NO_ACCESS,
  PROGRAM_LABEL,
  WALK_IN_USD,
  costPerVisit,
  getLounge,
  rankByCost,
  type AccessKind,
  type FreeScope,
  type LoungeId,
} from '~/utils/airportLounge'
import { adDensityForPath } from '~/utils/ads'

const localePath = useLocalePath()
const route = useRoute()
const adsOn = computed(() => adDensityForPath(route.path) !== 'none')

const KIND_LABEL: Record<AccessKind, string> = {
  tarjeta: 'Tarjeta',
  cuenta: 'Cuenta / paquete',
  membresia: 'Membresía',
  compra: 'Pago por ingreso',
  canje: 'Canje de puntos',
  aerolinea: 'Pasaje',
}

const SCOPE_LABEL: Record<FreeScope, string> = {
  compartido: 'bolsa compartida',
  'cada-uno': 'por tarjetahabiente',
  titular: 'solo titular',
  na: '',
}

// ── Calculator state ──
const visits = ref(2)
const guests = ref(0)

const visitItems = Array.from({ length: 12 }, (_, i) => i + 1)
const guestItems = [0, 1, 2]

const ranking = computed(() => rankByCost(visits.value, guests.value))
const best = computed(() => ranking.value.find(r => r.cost.total !== null) ?? null)

// ── Tables ──
const cardRoutes = computed(() =>
  ACCESS_ROUTES.filter(r => r.kind === 'tarjeta')
    .slice()
    .sort((a, b) => {
      const av = a.freeAccesses ?? -1
      const bv = b.freeAccesses ?? -1
      return bv - av
    })
)

const nonCardRoutes = computed(() => ACCESS_ROUTES.filter(r => r.kind !== 'tarjeta'))

function loungeName(id: LoungeId): string {
  const lounge = getLounge(id)
  if (!lounge) return id
  return `${lounge.iata} ${lounge.area === 'partidas' ? 'Partidas' : 'Arribos'}`
}

function shortHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function fmtUsd(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(0)
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ── SEO ──
const canonicalUrl = 'https://cambio-uruguay.com/sala-vip-aeropuerto-uruguay'
const title =
  'Sala VIP del aeropuerto en Uruguay (2026): todas las formas de entrar y cuánto cuesta cada una'
const description =
  'Cómo entrar a la Sala VIP del Aeropuerto de Carrasco y de Punta del Este: qué tarjeta uruguaya da accesos gratis, la tarifa de US$ 10 de Itaú, el ingreso suelto de US$ 90, las membresías de Priority Pass y del operador, canje de millas y descuentos. Con fuente oficial de cada cifra.'

defineOgImageComponent('Cambio', {
  title: 'Sala VIP del aeropuerto',
  subtitle: 'Una sola sala en Carrasco. De US$ 10 a US$ 90 según con qué entres.',
  tag: 'TARJETAS + COSTOS',
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

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'sala vip aeropuerto carrasco, sala vip uruguay, como entrar a la sala vip, priority pass uruguay, visa airport companion uruguay, mastercard airport experiences uruguay, loungekey carrasco, sala vip punta del este, tarjeta con sala vip uruguay, aeropuertos vip club, sala vip arribos carrasco, precio sala vip carrasco',
    },
  ],
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
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Sala VIP del aeropuerto en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: FAQS.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.vip-page {
  overflow-x: hidden;
}

/* Hero */
.hero-card {
  border-radius: 16px;
}
.hero {
  position: relative;
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(14, 165, 233, 0.32), transparent 55%),
    radial-gradient(120% 160% at 0% 100%, rgba(99, 102, 241, 0.28), transparent 55%),
    linear-gradient(135deg, #06182b 0%, #101a35 55%, #12111f 100%);
}
.hero-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-weight: 700;
  color: #9ad7ff;
  margin-bottom: 0.5rem;
}
.hero-title {
  color: #fff;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-size: clamp(1.6rem, 4.2vw, 2.6rem);
  margin-bottom: 0.75rem;
}
.hero-title-accent {
  display: block;
  font-size: clamp(0.95rem, 2vw, 1.15rem);
  font-weight: 600;
  color: #bfe6ff;
  margin-top: 0.5rem;
  letter-spacing: 0;
}
.hero-lead {
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.98rem;
  line-height: 1.6;
  max-width: 62ch;
  margin-bottom: 0.75rem;
}
.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.hero-spoiler {
  display: inline-flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-size: 0.82rem;
}

/* Cards */
.answer-card,
.calc-card,
.sources-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
}
.answer-list,
.plain-list,
.sources-list {
  margin: 0;
  padding-left: 1.1rem;
}
.answer-list li,
.plain-list li {
  margin-bottom: 0.6rem;
  line-height: 1.55;
}
.sources-list li {
  margin-bottom: 0.35rem;
  font-size: 0.85rem;
}
.section-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}
.price-tag {
  font-weight: 800;
  font-size: 1.05rem;
  white-space: nowrap;
}
.best-row {
  background: rgba(var(--v-theme-success), 0.08);
}
.rank-table :deep(td),
.cards-table :deep(td) {
  vertical-align: top;
}
</style>
