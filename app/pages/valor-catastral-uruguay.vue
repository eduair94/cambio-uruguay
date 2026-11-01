<template>
  <div class="cat-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-home-search-outline</VIcon>
              TRÁMITE
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Valor catastral en Uruguay: cómo consultar el de tu padrón
            </h1>
            <p class="text-body-1 cat-lead">
              El valor de tu padrón se consulta con la <strong>cédula catastral</strong>, el
              documento que según su ficha oficial «certifica el valor catastral base de un
              inmueble». Lo que casi nadie sabe antes de salir a buscar un gestor:
              <strong>no tiene costo</strong> y se emite en línea
              <strong>sin usuario registrado</strong>. Lo único que se paga es la versión informada,
              que agrega los antecedentes del padrón: <strong>{{ tasaLabel }}</strong
              >.
            </p>
            <ShareButtons class="mt-4" :url="canonicalUrl" text="Valor catastral en Uruguay" />
            <p class="text-caption text-medium-emphasis mt-3">
              Datos cotejados contra las fichas oficiales el {{ verifiedDisplay }}. El valor lo fija
              el {{ organismo }}.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. Qué es, y qué no es -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Qué es, y qué no es</h2>
            <p class="text-body-1 cat-prose mb-4">
              Catastro le pone un valor a cada padrón del país. Ese valor es la base de la
              <NuxtLink :to="localePath('/contribucion-inmobiliaria-uruguay')" class="cu-link">
                contribución inmobiliaria </NuxtLink
              >y del
              <NuxtLink :to="localePath('/impuesto-de-primaria-uruguay')" class="cu-link">
                impuesto de primaria </NuxtLink
              >, y en la factura de la contribución aparece con otro nombre: «valor imponible».
            </p>
            <VAlert type="info" variant="tonal" density="comfortable" class="mb-0">
              <p class="text-body-2 cat-alert">
                <strong>No es lo que vale tu casa.</strong> No es el precio de mercado ni lo que
                pagaste por ella, y no sirve para tasar una venta. Es un valor fiscal, y por eso las
                dos cuentas de arriba se mueven cuando Catastro lo actualiza.
              </p>
            </VAlert>
          </section>

          <!-- 2. Los tres trámites -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Los tres trámites, y cuál te toca</h2>
            <p class="text-body-1 cat-prose mb-4">
              El primero resuelve el caso normal y es gratis. Los otros dos existen para los dos
              casos en que la cédula común no alcanza: cuando necesitás el historial del padrón y
              cuando creés que el valor está mal.
            </p>
            <div class="table-scroll">
              <table class="cat-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Trámite</th>
                    <th>Costo</th>
                    <th>¿Pide cuenta en línea?</th>
                    <th>Qué te da</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in serviceRows" :key="row.id">
                    <td data-label="Trámite">
                      <a :href="row.url" target="_blank" rel="noopener noreferrer">
                        <strong>{{ row.label }}</strong>
                      </a>
                    </td>
                    <td data-label="Costo">{{ row.costLabel }}</td>
                    <td data-label="¿Pide cuenta en línea?">
                      {{ row.needsAccount ? 'Sí' : 'No' }}
                    </td>
                    <td data-label="Qué te da">{{ row.gives }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="urKnown" class="text-caption text-medium-emphasis cat-note">
              La tasa catastral está fijada en <strong>{{ TASA_CATASTRAL_UR }} UR</strong>, no en
              pesos: el equivalente de arriba sale de
              <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
                la UR de hoy </NuxtLink
              >. La ficha oficial declara ese valor vigente del {{ vigenciaFrom }} al
              {{ vigenciaTo }}.
            </p>
            <p v-else class="text-caption text-medium-emphasis cat-note">
              No pudimos leer el valor de la UR en este momento, así que la tasa va sólo en UR. La
              ficha oficial la declara vigente del {{ vigenciaFrom }} al {{ vigenciaTo }}; mirá
              <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
                el valor de la UR de hoy </NuxtLink
              >para hacer la cuenta.
            </p>
          </section>

          <!-- 3. Qué datos hay que tener -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Qué datos hay que tener a mano</h2>
            <p class="text-body-1 cat-prose mb-4">
              Depende del régimen del padrón. Si no sabés el número, está en la factura de la
              contribución inmobiliaria.
            </p>
            <div class="table-scroll">
              <table class="cat-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Régimen</th>
                    <th>Datos que pide</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in cedulaDatos" :key="item.regimen">
                    <td data-label="Régimen">
                      <strong>{{ item.regimen }}</strong>
                    </td>
                    <td data-label="Datos que pide">{{ item.datos }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-body-2 cat-note">
              El trámite se inicia en la
              <a :href="sedeUrl" target="_blank" rel="noopener noreferrer">Sede Electrónica</a>
              de la Dirección Nacional de Catastro, y la cédula se imprime al final.
            </p>
          </section>

          <!-- 4. Si el valor está mal -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Si creés que el valor está mal</h2>
            <p class="text-body-1 cat-prose mb-4">
              Hay un trámite de revisión, y la solicitud no se cobra. El gasto está en otro lado, y
              conviene saberlo antes de arrancar:
            </p>
            <ul class="cat-list mb-4">
              <li v-for="item in revisionRequisitos" :key="item">{{ item }}</li>
            </ul>
            <VAlert type="warning" variant="tonal" density="comfortable" class="mb-0">
              <p class="text-body-2 cat-alert">
                La ficha dice que el estudio <strong>«puede cambiar»</strong> el valor catastral
                base. No dice que lo baje: puede quedar igual o quedar más alto, y con él la
                contribución y el impuesto de primaria.
              </p>
            </VAlert>
          </section>

          <!-- 5. Lo que se consulta gratis y sin cuenta -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Lo que se consulta gratis y sin cuenta</h2>
            <p class="text-body-1 cat-prose mb-4">
              La lista de acceso libre de la Sede Electrónica es más larga que la cédula sola. Tres
              de estos servicios contestan preguntas por las que se suele pagar un gestor:
            </p>
            <ul class="cat-list mb-0">
              <li v-for="item in freeAccess" :key="item">{{ item }}</li>
            </ul>
          </section>

          <!-- 6. Presencial -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">En persona</h2>
            <p class="text-body-1 cat-prose mb-2">
              <strong>{{ office.address }}</strong
              >. {{ office.hours }}.
            </p>
            <p class="text-body-2 cat-note">{{ office.note }}</p>
          </section>

          <!-- La unidad intermedia, antes de las preguntas: mismo corte que FaqSection (ver
               docs/seo/adsense-growth-loop.md, 31/10/2026). Sólo dibuja en densidad normal. -->
          <AdSlot placement="in-article" class="mb-6" />
          <!-- 7. FAQ -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion">
              <VExpansionPanel v-for="faq in faqs" :key="faq.question" :title="faq.question">
                <template #text>
                  <p class="text-body-2 cat-prose">{{ faq.answer }}</p>
                </template>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 8. Lo que no contestamos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Lo que esta página no contesta</h2>
            <p class="text-body-1 cat-prose mb-4">
              Son preguntas reales que las fichas oficiales no responden. Preferimos decir que no
              las sabemos antes que copiar un número de un blog.
            </p>
            <div v-for="item in unpublished" :key="item.question" class="cat-unpublished mb-3">
              <p class="text-subtitle-2 font-weight-bold cat-unpublished-q">{{ item.question }}</p>
              <p class="text-body-2 cat-prose cat-unpublished-a">{{ item.answer }}</p>
            </div>
          </section>

          <!-- 9. Seguir por acá -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Seguir por acá</h2>
            <ul class="cat-list">
              <li>
                <NuxtLink :to="localePath('/contribucion-inmobiliaria-uruguay')">
                  Contribución inmobiliaria </NuxtLink
                >— el impuesto que se calcula sobre este valor, con sus diecinueve escalas.
              </li>
              <li>
                <NuxtLink :to="localePath('/impuesto-de-primaria-uruguay')">
                  Impuesto de primaria </NuxtLink
                >— el otro tributo del mismo padrón, con su monto exonerado.
              </li>
              <li>
                <NuxtLink :to="localePath('/indicadores/unidad-reajustable')">
                  Valor de la UR hoy </NuxtLink
                >— la unidad en la que está fijada la tasa catastral.
              </li>
              <li>
                <NuxtLink :to="localePath('/deuda-de-gastos-comunes-uruguay')">
                  Deuda de gastos comunes </NuxtLink
                >— la otra deuda que viaja con el padrón cuando se compra.
              </li>
              <li>
                <NuxtLink :to="localePath('/venta-viviendas-uruguay')">
                  Viviendas en venta </NuxtLink
                >— lo que piden los avisos, que es otra cosa que el valor fiscal.
              </li>
            </ul>
          </section>

          <!-- 10. Fuentes -->
          <VCard variant="flat" class="cat-sources pa-5 mb-6">
            <p class="text-subtitle-1 font-weight-bold cat-sources-title">Fuentes</p>
            <ul class="cat-sources-list">
              <li v-for="source in sources" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{
                  source.label
                }}</a>
              </li>
            </ul>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExchangeRate } from '~/types/api'
import { indicatorFromSlug, liveIndicatorReading } from '~/utils/indicators'
import {
  CADASTRAL_FAQ,
  CADASTRAL_FREE_ACCESS,
  CADASTRAL_OFFICE,
  CADASTRAL_ORGANISMO,
  CADASTRAL_PATH,
  CADASTRAL_SEDE_URL,
  CADASTRAL_SERVICES,
  CADASTRAL_SOURCES,
  CADASTRAL_UNPUBLISHED,
  CADASTRAL_VERIFIED_AT,
  CEDULA_DATOS,
  REVISION_REQUISITOS,
  TASA_CATASTRAL_UR,
  TASA_CATASTRAL_VIGENCIA,
  pesosForCost,
  pesosForUr,
  type CadastralCost,
} from '~/utils/cadastralValue'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

const faqs = CADASTRAL_FAQ
const sources = CADASTRAL_SOURCES
const unpublished = CADASTRAL_UNPUBLISHED
const freeAccess = CADASTRAL_FREE_ACCESS
const cedulaDatos = CEDULA_DATOS
const revisionRequisitos = REVISION_REQUISITOS
const office = CADASTRAL_OFFICE
const organismo = CADASTRAL_ORGANISMO
const sedeUrl = CADASTRAL_SEDE_URL

// La tasa catastral se publica en UR, así que la conversión necesita el valor del
// día. Se lee con `liveIndicatorReading` y NO con `currentIndicatorValue`: el
// segundo cae al valor de referencia del catálogo cuando la API falla, y esta
// página IMPRIME el número como el de hoy. Sin lectura viva, `urValue` queda en
// null y la página muestra «0,5 UR» sin convertir: nunca un peso inventado.
const urIndicator = indicatorFromSlug('unidad-reajustable')
const { data: urValue } = await useAsyncData('valor-catastral-ur', async () => {
  if (!urIndicator) return null
  try {
    const result = await getProcessedExchangeData('')
    const rows = (result?.exchangeData ?? []) as ExchangeRate[]
    return liveIndicatorReading(rows, urIndicator)?.value ?? null
  } catch {
    return null
  }
})

const urKnown = computed(() => urValue.value != null)

const formatPesos = (n: number): string =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

/** El costo de un trámite en texto: nunca un cero donde falta un dato. */
const costLabelFor = (cost: CadastralCost): string => {
  switch (cost.kind) {
    case 'free':
      return 'Sin costo'
    case 'tasa': {
      const ur = cost.tasas * TASA_CATASTRAL_UR
      const pesos = pesosForCost(cost, urValue.value)
      const urText = ur.toLocaleString('es-UY', { maximumFractionDigits: 1 })
      return pesos === null ? `${urText} UR` : `${urText} UR (${formatPesos(pesos)} hoy)`
    }
    case 'timbres':
      return `${cost.timbres} timbres profesionales`
  }
}

const serviceRows = computed(() =>
  CADASTRAL_SERVICES.map(service => ({
    id: service.id,
    label: service.label,
    gives: service.gives,
    needsAccount: service.needsAccount,
    url: service.url,
    costLabel: costLabelFor(service.cost),
  }))
)

/** La tasa para el párrafo de entrada, con su equivalente si hay UR viva. */
const tasaLabel = computed(() => {
  const pesos = pesosForUr(TASA_CATASTRAL_UR, urValue.value)
  const urText = TASA_CATASTRAL_UR.toLocaleString('es-UY', { maximumFractionDigits: 1 })
  return pesos === null ? `${urText} UR` : `${urText} UR, hoy ${formatPesos(pesos)}`
})

const displayDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedDisplay = computed(() => displayDate(CADASTRAL_VERIFIED_AT))
const vigenciaFrom = computed(() => displayDate(TASA_CATASTRAL_VIGENCIA.from))
const vigenciaTo = computed(() => displayDate(TASA_CATASTRAL_VIGENCIA.to))

const canonicalUrl = `https://cambio-uruguay.com${CADASTRAL_PATH}`

// 38 caracteres, 55 con la marca puesta: entra en los 60 que publica Google
// (`seoTitleBudget`). Se queda con el término por el que se busca («valor
// catastral») más el dato que diferencia a esta página de las dos de impuestos que
// ya lo nombran: que mirarlo es gratis.
const title = 'Valor catastral Uruguay: cédula gratis'
// El número del día en el snippet, que es lo que se mide: una descripción con la
// cifra corre a ~1,4 % de CTR y una genérica a 0,03–0,2 % desde la misma posición.
// Sin UR viva cae a «0,5 UR», que sigue siendo un dato concreto. ≤ 155 caracteres.
const description = computed(() => {
  const pesos = pesosForUr(TASA_CATASTRAL_UR, urValue.value)
  const tasa = pesos === null ? '0,5 UR' : `0,5 UR (hoy ${formatPesos(pesos)})`
  return `La cédula que certifica el valor de tu padrón es gratis y sin usuario; la informada sale ${tasa}. Cómo consultarla y pedir revisión.`
})

defineOgImageComponent('Cambio', {
  title: 'Valor catastral en Uruguay',
  subtitle: 'La cédula catastral no tiene costo · tasa de 0,5 UR',
  tag: 'Trámites',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
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
        'valor catastral uruguay, cedula catastral uruguay, consultar valor real catastro, valor imponible catastro, numero de padron uruguay, sede electronica catastro, revision de valor catastral, direccion nacional de catastro, tasa catastral uruguay',
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
                name: 'Valor catastral en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(faq => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          },
          {
            '@type': 'Article',
            headline: title,
            description: description.value,
            inLanguage: 'es-UY',
            dateModified: CADASTRAL_VERIFIED_AT,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: sources.map(source => ({
              '@type': 'CreativeWork',
              name: source.label,
              url: source.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.cat-page {
  max-width: 1180px;
}

.cat-lead {
  margin-top: 0;
  line-height: 1.65;
}

.cat-prose {
  margin-top: 0;
  line-height: 1.7;
}

.cat-alert {
  margin-top: 0;
  line-height: 1.6;
}

.cat-note {
  margin-top: 12px;
  line-height: 1.6;
}

.cat-list {
  margin-top: 0;
  padding-left: 1.25rem;
  line-height: 1.7;
}

.cat-list li + li {
  margin-top: 8px;
}

.table-scroll {
  overflow-x: auto;
}

.cat-table {
  width: 100%;
  border-collapse: collapse;
}

.cat-table th,
.cat-table td {
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.18);
}

.cat-table th {
  font-weight: 700;
  white-space: nowrap;
}

.cat-unpublished-q {
  margin-top: 0;
}

.cat-unpublished-a {
  margin-top: 4px;
}

.cat-sources {
  background: rgba(var(--v-theme-primary), 0.05);
}

.cat-sources-title {
  margin-top: 0;
}

.cat-sources-list {
  margin-top: 8px;
  padding-left: 1.25rem;
  line-height: 1.6;
}

.cat-sources-list li + li {
  margin-top: 8px;
}
</style>
