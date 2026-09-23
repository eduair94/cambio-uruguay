<!--
THESIS: La ficha de un modelo de moto: en qué rango se pide, cómo cambia ese rango año por año y por
cilindrada, cuánto pierde por año de antigüedad (medido sobre el propio catálogo, no supuesto) y con
cuántos avisos está hecha cada cifra. Contesta "¿cuánto vale una Yumbo GS 2018?" sin que nadie tenga
que mirar veinte avisos.
OWN-WORLD: La forma de /autos-usados-uruguay/<key> y /celulares-uruguay/<modelo>: migas, un solo H1,
la cifra arriba, las tablas, y el bloque de "cómo leer esto" al final.
FAMILY: Sólo español; canonical literal y absoluto.
-->
<template>
  <VContainer class="moto-ficha py-6 py-md-10">
    <VBreadcrumbs :items="breadcrumbs" class="px-0 pb-2" />

    <!-- Un solo h1 en la plantilla, con el texto adaptado: dos <h1> en ramas excluyentes pasan
         cualquier grep y son una invitación a que el día de mañana se rendericen los dos. -->
    <h1 class="moto-title">{{ heading }}</h1>

    <template v-if="!model">
      <p class="lead">
        {{
          failureCode === 404
            ? 'No tenemos ese modelo en el catálogo de motos usadas. Puede que todavía no lo hayamos relevado o que no tenga avisos vigentes.'
            : 'No pudimos leer la ficha en este momento. No es que el modelo no exista: es que no lo pudimos leer. Probá de nuevo en unos minutos.'
        }}
      </p>
      <VBtn color="primary" :to="localePath(MOTOS_PATH)">Ir al directorio de motos usadas</VBtn>
    </template>

    <template v-else>
      <p class="lead">
        <template v-if="model.band">
          La mitad central de los avisos pide entre
          <strong>{{ motoUsd(model.band.p25) }}</strong> y
          <strong>{{ motoUsd(model.band.p75) }}</strong
          >, con mediana {{ motoUsd(model.band.median) }}, sobre {{ model.band.n }}
          {{ model.band.n === 1 ? 'aviso' : 'avisos' }} de {{ model.band.sellers }}
          {{ model.band.sellers === 1 ? 'vendedor' : 'vendedores' }}.
        </template>
        <template v-else>
          Todavía no hay avisos suficientes de este modelo para publicar un rango de precios: se
          listan los avisos vigentes y nada más. Preferimos decirlo antes que publicar una mediana
          de dos avisos.
        </template>
        Son precios <strong>pedidos</strong>, no precios de venta cerrados.
        <template v-if="readAt"> Última lectura el {{ readAt }}.</template>
      </p>

      <div class="facts mb-6">
        <span class="fact">{{ model.listings.toLocaleString('es-UY') }} avisos vigentes</span>
        <span v-if="displacementLine" class="fact">{{ displacementLine }}</span>
        <span class="fact">{{
          model.propulsion === 'electrica' ? 'Eléctrica' : 'Combustión'
        }}</span>
        <span v-for="entry in model.types.slice(0, 3)" :key="entry.type" class="fact">
          {{ motoTypeLabel(entry.type) }} ({{ entry.adverts }})
        </span>
      </div>

      <!-- ── Depreciación ─────────────────────────────────────────────────── -->
      <section class="ficha-section">
        <h2>Cuánto pierde por año</h2>
        <VAlert
          v-if="model.annualDrop != null"
          type="info"
          variant="tonal"
          density="comfortable"
          icon="mdi-trending-down"
        >
          Una {{ modelName }} pierde alrededor de
          <strong>{{ (Math.round(model.annualDrop * 10) / 10).toLocaleString('es-UY') }} %</strong>
          por cada año de antigüedad. La recta se ajusta sobre el logaritmo de la mediana por año,
          que es lo que convierte "pierde un porcentaje por año" en una recta: sobre el precio crudo
          la pendiente diría dólares por año y no se podría comparar con otro modelo.
        </VAlert>
        <p v-else class="abstain">
          Todavía no podemos medir la depreciación de este modelo: la curva de precios por año no
          tiene puntos ni tramo suficientes. Preferimos decirlo antes que estimar una pendiente que
          no medimos.
        </p>
      </section>

      <!-- ── Precio por año ───────────────────────────────────────────────── -->
      <section v-if="model.years.length" class="ficha-section">
        <h2>Precio por año</h2>
        <p class="section-note">
          p25 y p75 encierran a la mitad central de los avisos de ese año. En dólares, porque es la
          única escala en la que un aviso en pesos y uno en dólares se pueden comparar.
        </p>
        <div class="table-wrap">
          <VTable class="cu-mobile-cards moto-table" density="compact">
            <thead>
              <tr>
                <th class="text-right">Año</th>
                <th class="text-right">p25</th>
                <th class="text-right">Mediana</th>
                <th class="text-right">p75</th>
                <th class="text-right">Kilómetros</th>
                <th class="text-right">Avisos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="band in model.years" :key="band.year">
                <td data-label="Año" class="text-right">{{ band.year }}</td>
                <td data-label="p25" class="text-right price">{{ motoUsd(band.p25) }}</td>
                <td data-label="Mediana" class="text-right price">{{ motoUsd(band.median) }}</td>
                <td data-label="p75" class="text-right price">{{ motoUsd(band.p75) }}</td>
                <td data-label="Kilómetros" class="text-right">
                  {{ motoKmLabel(band.kmMedian) }}
                </td>
                <td data-label="Avisos" class="text-right">{{ band.n }}</td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </section>

      <!-- ── Precio por cilindrada ────────────────────────────────────────── -->
      <section v-if="model.displacements.length" class="ficha-section">
        <h2>Precio por cilindrada</h2>
        <p class="section-note">
          La dimensión que un directorio de autos no tiene. Un aviso cuyo título no declara la
          cilindrada no entra en ninguna de estas filas: se lee del título y nunca se infiere del
          modelo.
        </p>
        <div class="table-wrap">
          <VTable class="cu-mobile-cards moto-table" density="compact">
            <thead>
              <tr>
                <th class="text-right">Cilindrada</th>
                <th class="text-right">p25</th>
                <th class="text-right">Mediana</th>
                <th class="text-right">p75</th>
                <th class="text-right">Avisos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="band in model.displacements" :key="band.displacement">
                <td data-label="Cilindrada" class="text-right">
                  {{ motoDisplacementLabel(band.displacement) }}
                </td>
                <td data-label="p25" class="text-right price">{{ motoUsd(band.p25) }}</td>
                <td data-label="Mediana" class="text-right price">{{ motoUsd(band.median) }}</td>
                <td data-label="p75" class="text-right price">{{ motoUsd(band.p75) }}</td>
                <td data-label="Avisos" class="text-right">{{ band.n }}</td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </section>

      <!-- ── Avisos ───────────────────────────────────────────────────────── -->
      <section class="ficha-section">
        <h2>Avisos vigentes</h2>
        <p v-if="!listings.length" class="abstain">
          No pudimos traer los avisos de este modelo ahora mismo. Las cifras de arriba son de la
          última corrida y siguen valiendo.
        </p>
        <template v-else>
          <p class="section-note">
            Los {{ listings.length }} más baratos de {{ listingsTotal.toLocaleString('es-UY') }},
            cada uno en la moneda en la que se publicó. El enlace va al aviso original.
          </p>
          <div class="table-wrap">
            <VTable class="cu-mobile-cards moto-table" density="compact">
              <thead>
                <tr>
                  <th>Aviso</th>
                  <th class="text-right">Año</th>
                  <th class="text-right">Kilómetros</th>
                  <th>Dónde</th>
                  <th class="text-right">Precio</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in listings" :key="item.key">
                  <td data-label="Aviso">
                    <a
                      :href="item.permalink"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="moto-link"
                    >
                      {{ item.title }}
                    </a>
                    <span v-for="flag in item.flags" :key="flag" class="tag tag-flag">
                      {{ flag }}
                    </span>
                  </td>
                  <td data-label="Año" class="text-right">{{ item.year }}</td>
                  <td data-label="Kilómetros" class="text-right">{{ motoKmLabel(item.km) }}</td>
                  <td data-label="Dónde">
                    {{ item.department || 'No informado' }}
                    <span v-if="item.sellerType" class="tag">
                      {{ MOTO_SELLER_LABEL[item.sellerType] }}
                    </span>
                  </td>
                  <td data-label="Precio" class="text-right price">
                    {{ motoMoney(item.price, item.currency) }}
                    <span v-if="item.currency === 'UYU'" class="usd-note">
                      ≈ {{ motoUsd(item.priceUsd) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>
        </template>
      </section>

      <!-- ── Otros modelos de la marca ────────────────────────────────────── -->
      <section v-if="siblings.length" class="ficha-section">
        <h2>Otros modelos de {{ model.brand }}</h2>
        <div class="sibling-row">
          <VBtn
            v-for="sibling in siblings"
            :key="sibling.slug"
            size="small"
            variant="outlined"
            class="mr-2 mb-2"
            :to="localePath(`${MOTOS_PATH}/${sibling.slug}`)"
          >
            {{ sibling.brand }} {{ sibling.model }} ({{ sibling.listings }})
          </VBtn>
        </div>
      </section>
    </template>

    <!-- ── Cómo leer esto ─────────────────────────────────────────────────── -->
    <section class="ficha-section">
      <h2>Cómo leer esta ficha</h2>
      <ul class="guide-list">
        <li>
          Son precios <strong>pedidos</strong> en avisos vigentes, no precios de venta cerrados. En
          Uruguay las transferencias de usados no se publican por modelo, así que lo que se mide es
          la oferta.
        </li>
        <li>
          Las bandas están en <strong>dólares</strong> porque es la única escala comparable entre un
          aviso publicado en pesos y uno publicado en dólares. Cada aviso de abajo se muestra en su
          propia moneda; la conversión usa la cotización de la corrida y viaja publicada.
        </li>
        <li>
          <strong>Una línea eléctrica tiene ficha propia</strong> y nunca comparte banda con las de
          nafta del mismo fabricante: si compartieran ficha, la cifra de arriba tendría que
          promediar dos mercados para existir.
        </li>
        <li>
          <strong>Esta ficha no dice si una moto está bien de precio.</strong> No publicamos
          oportunidades ni gangas en motos: la cohorte fija que usa el directorio de autos no tiene
          equivalente medido acá todavía.
        </li>
        <li>
          Lo que aparece marcado en un aviso (deuda, choque, papeles) es lo que declara el propio
          vendedor en su título. Es su afirmación, no una conclusión nuestra, y la ausencia de una
          marca no afirma nada.
        </li>
      </ul>
    </section>

    <section class="ficha-section">
      <h2>Seguí con el detalle</h2>
      <VRow dense>
        <VCol cols="12" md="6">
          <VCard variant="outlined" :to="localePath(MOTOS_PATH)" class="pa-4 h-100">
            <p class="card-title">Todas las motos usadas</p>
            <p class="card-text">
              El directorio completo, con filtros por marca, cilindrada, tipo, año, departamento y
              precio.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="outlined" :to="localePath(MOTOS_COMPARADOR_PATH)" class="pa-4 h-100">
            <p class="card-title">¿Conviene auto, moto u ómnibus?</p>
            <p class="card-text">
              Cuánto sale moverse con cada uno, con este catálogo como fuente del precio de la moto.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" class="mb-8" />
  </VContainer>
</template>

<script setup lang="ts">
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  MOTOS_COMPARADOR_PATH,
  MOTOS_PATH,
  MOTO_SELLER_LABEL,
  motoDepreciacionAnswer,
  motoDisplacementLabel,
  motoKeyValid,
  motoKmLabel,
  motoLongDate,
  motoModelName,
  motoMoney,
  motoTypeLabel,
  motoUsd,
  motoYearRange,
  type MotoDetailResponse,
} from '~/utils/motos'

// Una clave que no tiene forma de clave —o la `key` reservada del informe— 404ea ANTES de entrar a
// setup y antes de que nuxt-og-image vuelva a pedir la página para leer su payload. `validate` sólo
// ve IMPORTS, nunca una constante declarada acá abajo: misma trampa que documenta
// `/autos-usados-uruguay/[key].vue`.
definePageMeta({
  validate: route => motoKeyValid(String(route.params.key ?? '')),
})

const route = useRoute()
const localePath = useLocalePath()
const key = computed(() => String(route.params.key || ''))

const { data, error } = await useAsyncData<MotoDetailResponse>(
  () => `moto-${key.value}`,
  () => $fetch<MotoDetailResponse>(`/api/motos/${encodeURIComponent(key.value)}`)
)

/** 404 sólo cuando la API dijo 404. Cualquier otra cosa es 503: un negativo falso cacheado saca la
 * ficha del índice y no vuelve solo. */
const failureCode = computed(() => {
  const failure = error.value as { statusCode?: number; data?: { statusCode?: number } } | null
  return failure?.statusCode === 404 || failure?.data?.statusCode === 404 ? 404 : 503
})
if (import.meta.server && (error.value || !data.value)) {
  const event = useRequestEvent()
  if (event) {
    setResponseStatus(event, failureCode.value)
    useResponseHeader('cache-control').value = 'no-store, max-age=0'
  }
}

// Todo lo que cuelga de `model` tiene que seguir vivo con `model === null`: una lectura ansiosa
// sobre una ficha que no existe tira dentro de setup y Nitro pisa el 404 con un 500.
const model = computed(() => data.value?.model ?? null)
const listings = computed(() => data.value?.listings ?? [])
const listingsTotal = computed(() => data.value?.listingsTotal ?? 0)
const siblings = computed(() => data.value?.siblings ?? [])
const readAt = computed(() => motoLongDate(data.value?.coverage?.lastReadAt || null))

const modelName = computed(() => (model.value ? motoModelName(model.value) : 'esta moto'))

const heading = computed(() =>
  model.value
    ? `${modelName.value}: precios de segunda mano en Uruguay`
    : failureCode.value === 404
      ? 'No encontramos ese modelo'
      : 'No pudimos cargar la ficha'
)

const displacementLine = computed(() => {
  const list = model.value?.displacements ?? []
  return list.length ? `${list.map(band => band.displacement).join(' · ')} cc` : ''
})

const breadcrumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: DIRECTORIOS_HUB.label, to: localePath(DIRECTORIOS_HUB.path) },
  { title: 'Motos usadas', to: localePath(MOTOS_PATH) },
  { title: model.value ? modelName.value : 'Modelo' },
])

// Las respuestas salen de los MISMOS datos que imprimen las tablas, así el texto visible y el
// schema.org no pueden divergir.
const faq = computed<FaqItem[]>(() => {
  const items: FaqItem[] = [
    {
      id: 'moto-ficha-depreciacion',
      question: `¿Cuánto pierde de valor una ${modelName.value} por año?`,
      answer: motoDepreciacionAnswer(model.value),
    },
    {
      id: 'moto-ficha-precio-pedido',
      question: '¿Estos precios son de venta o de aviso?',
      answer:
        'Son precios pedidos en avisos vigentes, no precios de venta cerrados. Lo que se puede medir en Uruguay es la oferta publicada, no la transferencia.',
    },
    {
      id: 'moto-ficha-cilindrada',
      question: '¿Por qué algunos avisos no figuran en el precio por cilindrada?',
      answer:
        'Porque su título no la dice. La cilindrada se lee del título con una expresión explícita y nunca se infiere del modelo: un aviso sin ella no entra en ninguna cohorte de cilindrada, ni acá ni en el directorio.',
    },
  ]
  const range = model.value ? motoYearRange(model.value) : null
  if (model.value?.band && range) {
    items.unshift({
      id: 'moto-ficha-precio',
      question: `¿Cuánto sale una ${modelName.value} usada?`,
      answer: `La mediana de lo que se pide es ${motoUsd(model.value.band.median)}, y la mitad central de los avisos va de ${motoUsd(model.value.band.p25)} a ${motoUsd(model.value.band.p75)}. Por año, el más barato relevado es ${range.cheapest.year} (mediana ${motoUsd(range.cheapest.median)}) y el más caro ${range.dearest.year} (mediana ${motoUsd(range.dearest.median)}). Son precios pedidos, no precios de venta cerrados.`,
    })
  }
  return items
})

// ── SEO ────────────────────────────────────────────────────────────────────
// El canonical se arma con la clave de la ficha, que es la `key` del documento publicado: es la
// misma que emite el directorio, así que no hay dos URLs para la misma ficha.
const canonical = computed(() => `https://cambio-uruguay.com${MOTOS_PATH}/${key.value}`)
const title = computed(() =>
  model.value ? `${modelName.value} usada: precios en Uruguay` : 'Motos usadas en Uruguay'
)
const description = computed(() =>
  model.value
    ? `Cuánto se pide por una ${modelName.value} usada en Uruguay: rango de precios, desglose por año y por cilindrada, cuánto pierde por año de antigüedad y los avisos vigentes.`
    : 'Precios de motos usadas en Uruguay por modelo, año y cilindrada.'
)

defineOgImageComponent('Cambio', {
  title: () => (model.value ? modelName.value : 'Motos usadas'),
  subtitle: 'Precios de segunda mano en Uruguay',
  tag: 'MOTOS · PRECIOS',
})

useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: () => title.value,
  ogDescription: () => description.value,
  ogType: 'website',
  ogUrl: () => canonical.value,
  twitterCard: 'summary_large_image',
  // Una ficha que no pudimos servir no se indexa: la página existe, el dato no.
  robots: () => (model.value ? 'index, follow' : 'noindex, follow'),
})

// El FAQPage lo emite FaqSection: no se repite acá.
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: model.value
    ? [
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
                    name: 'Inicio',
                    item: 'https://cambio-uruguay.com/',
                  },
                  directoriosHubListItem(2),
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: 'Motos usadas',
                    item: `https://cambio-uruguay.com${MOTOS_PATH}`,
                  },
                  {
                    '@type': 'ListItem',
                    position: 4,
                    name: modelName.value,
                    item: canonical.value,
                  },
                ],
              },
              {
                '@type': 'Product',
                name: `${modelName.value} usada`,
                category: 'Motocicleta usada',
                url: canonical.value,
                brand: { '@type': 'Brand', name: model.value.brand },
                // `AggregateOffer` y no `Offer`: lo que se publica es una banda sobre varios avisos
                // de terceros, no una venta nuestra. Sin `aggregateRating`: este sitio no mide
                // reseñas de motos y no va a declarar una que no existe.
                ...(model.value.band
                  ? {
                      offers: {
                        '@type': 'AggregateOffer',
                        lowPrice: Math.round(model.value.band.p25),
                        highPrice: Math.round(model.value.band.p75),
                        priceCurrency: 'USD',
                        offerCount: model.value.band.n,
                        url: canonical.value,
                      },
                    }
                  : {}),
              },
            ],
          }),
        },
      ]
    : [],
}))
</script>

<style scoped>
.moto-ficha {
  max-width: 1000px;
}
/* Rol Display de DESIGN.md (el idiom .hero-title). */
.moto-title {
  margin: 0 0 8px;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
/* El reset de Vuetify 4 no cero-ea el margen de bloque del texto: todo párrafo cuyo espaciado
   importa declara el suyo (app/AGENTS.md). */
.lead {
  max-width: 68ch;
  margin: 0 0 16px;
}
.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.fact {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ficha-section {
  margin-top: 40px;
}
.ficha-section h2 {
  margin: 0 0 12px;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  line-height: 1.2;
  font-weight: 700;
}
.section-note,
.abstain {
  margin: 12px 0;
  max-width: 72ch;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.guide-list {
  margin: 0;
  padding-left: 20px;
  max-width: 76ch;
}
.guide-list li {
  margin-top: 8px;
}
.table-wrap {
  overflow-x: auto;
}
.moto-table .price {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.moto-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.moto-link:hover {
  text-decoration: underline;
}
.usd-note {
  display: block;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
/* Lo que declara el VENDEDOR se marca sin color de sentimiento: no es un veredicto nuestro sobre el
   aviso, es la palabra que él escribió. */
.tag-flag {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.sibling-row {
  display: flex;
  flex-wrap: wrap;
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
