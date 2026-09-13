<template>
  <div class="caj-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-file-document-check-outline</VIcon>
              TRÁMITE
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Certificado de antecedentes judiciales: cuánto sale hoy y cuál de los dos te piden
            </h1>
            <p class="text-body-1 caj-lead">
              La ficha oficial no lo cobra en pesos: son
              <strong>{{ formatUi(comun.ui) }} UI</strong> el común y
              <strong>{{ formatUi(urgente.ui) }} UI</strong> el urgente. Como la Unidad Indexada se
              ajusta todos los días por inflación, acá abajo está la conversión con el valor de hoy.
              Y hay dos certificados con nombres casi iguales: pedir el que no es cuesta otros
              {{ formatUi(ley.ui) }} UI y otros quince días.
            </p>
            <ShareButtons
              class="mt-4"
              :url="canonicalUrl"
              text="Certificado de antecedentes judiciales en Uruguay"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              Aranceles y plazos verificados contra su fuente el {{ verifiedDisplay }}. Los emite el
              {{ organismo }}.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. El precio -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cuánto sale</h2>
            <p class="text-body-1 caj-prose mb-4">
              El precio es el mismo «para todos los destinos»: no cambia según para qué lo pidas,
              aunque el formulario te haga declararlo.
              <template v-if="uiValue">
                Convertido con la UI de hoy ({{ formatPesos(uiValue, 4) }}), queda así.
              </template>
              <template v-else>
                Ahora mismo no tenemos el valor de la UI del día, así que la tabla muestra el precio
                en UI tal como lo publica la ficha, sin convertir.
              </template>
            </p>
            <div class="table-scroll">
              <table class="caj-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Modalidad</th>
                    <th>Precio en UI</th>
                    <th>En pesos hoy</th>
                    <th>Plazo de entrega</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="fee in fees" :key="fee.key">
                    <td data-label="Modalidad">
                      <strong>{{ fee.label }}</strong>
                    </td>
                    <td data-label="Precio en UI">{{ formatUi(fee.ui) }} UI</td>
                    <td data-label="En pesos hoy">
                      <template v-if="pesos(fee.ui) !== null">
                        {{ formatPesos(pesos(fee.ui)!, 0) }}
                      </template>
                      <span v-else class="text-medium-emphasis">—</span>
                    </td>
                    <td data-label="Plazo de entrega">{{ fee.plazo }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-caption text-medium-emphasis caj-note">
              El precio en pesos se calcula con el valor de la UI que publica el BCU para hoy y
              cambia todos los días: es orientativo, lo que se cobra son las UI.
              <NuxtLink :to="localePath('/indicadores/unidad-indexada')">
                Mirá el valor de la UI de hoy
              </NuxtLink>
              o usá el
              <NuxtLink :to="localePath('/herramientas/conversor-unidad-indexada')">
                conversor de Unidad Indexada </NuxtLink
              >.
            </p>
          </section>

          <!-- 2. Caducidad: la trampa práctica -->
          <section class="mb-8">
            <VAlert type="warning" variant="tonal" border="start" class="caj-alert">
              <p class="text-subtitle-1 font-weight-bold caj-alert-title">
                Caduca a los {{ caducidadDias }} días de expedido
              </p>
              <p class="text-body-2 caj-alert-body">
                El plazo corre desde que se emite, no desde que te lo entregan ni desde que lo
                presentás. Un certificado común tarda quince días en salir y después vale noventa:
                sacarlo «para tenerlo pronto» meses antes de una postulación es la forma más común
                de llegar con uno vencido. Si lo pedís hoy en modalidad común, el que salga vencería
                alrededor del {{ ejemploVencimiento }}.
              </p>
            </VAlert>
          </section>

          <!-- 3. Cuál de los dos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cuál de los dos te piden</h2>
            <p class="text-body-1 caj-prose mb-4">
              El certificado de la <strong>Ley N° 19.791</strong> no es una versión «más completa»
              del común: es otro documento, con otro alcance. Certifica únicamente los delitos que
              esa ley lista, y existe porque la ley obliga a pedirlo a las instituciones que
              impliquen trato directo con niñas, niños, adolescentes, personas con discapacidad y
              personas mayores en situación de dependencia. Uno no sustituye al otro.
            </p>
            <div class="table-scroll">
              <table class="caj-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Tu situación</th>
                    <th>Cuál corresponde</th>
                    <th>Por qué</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in cases" :key="item.key">
                    <td data-label="Tu situación">{{ item.situacion }}</td>
                    <td data-label="Cuál corresponde">
                      <strong>{{ item.cual }}</strong>
                    </td>
                    <td data-label="Por qué">{{ item.porque }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-caption text-medium-emphasis caj-note">
              La Ley N° 19.791 está vigente: {{ ley.leyTitulo }}. Reglamentada por el
              {{ ley.reglamentada }}.
            </p>
          </section>

          <!-- 4. Cómo se hace -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cómo se tramita</h2>
            <ul class="caj-list">
              <li>
                <strong>Con Identidad digital avanzada</strong> — se hace enteramente en línea, sin
                ir a ningún lado.
              </li>
              <li>
                <strong>Con Identidad digital básica o intermedia</strong> — hay que completar el
                formulario y agendarse para una audiencia. Los plazos de entrega se cuentan
                <em>desde esa audiencia</em>, no desde que iniciaste el trámite: es la diferencia
                entre los quince días que figuran y el tiempo real que te va a llevar.
              </li>
              <li>
                <strong>Presencial</strong> — en la Dirección Nacional de Policía Científica, en
                Montevideo, o en las jefaturas departamentales.
              </li>
            </ul>
          </section>

          <!-- 5. FAQ -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion">
              <VExpansionPanel v-for="faq in faqs" :key="faq.question" :title="faq.question">
                <template #text>
                  <p class="text-body-2 caj-prose">{{ faq.answer }}</p>
                </template>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 6. Lo que no contestamos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Lo que esta página no contesta</h2>
            <p class="text-body-1 caj-prose mb-4">
              Son preguntas reales que la ficha oficial no responde. Preferimos decir que no las
              sabemos antes que copiar un número de un blog.
            </p>
            <div v-for="item in unpublished" :key="item.question" class="caj-unpublished mb-3">
              <p class="text-subtitle-2 font-weight-bold caj-unpublished-q">{{ item.question }}</p>
              <p class="text-body-2 caj-prose caj-unpublished-a">{{ item.answer }}</p>
            </div>
          </section>

          <!-- 7. Fuentes -->
          <VCard variant="flat" class="caj-sources pa-5 mb-6">
            <p class="text-subtitle-1 font-weight-bold caj-sources-title">Fuentes</p>
            <ul class="caj-sources-list">
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
import { currentIndicatorValue, indicatorFromSlug } from '~/utils/indicators'
import {
  CAJ_CADUCIDAD_DIAS,
  CAJ_CASES,
  CAJ_FAQS,
  CAJ_FEES,
  CAJ_LEY_19791,
  CAJ_ORGANISMO,
  CAJ_PATH,
  CAJ_SOURCES,
  CAJ_UNPUBLISHED,
  CAJ_VERIFIED_AT,
  expiresOn,
  pesosForUi,
} from '~/utils/criminalRecord'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

const fees = CAJ_FEES
const cases = CAJ_CASES
const faqs = CAJ_FAQS
const sources = CAJ_SOURCES
const unpublished = CAJ_UNPUBLISHED
const ley = CAJ_LEY_19791
const organismo = CAJ_ORGANISMO
const caducidadDias = CAJ_CADUCIDAD_DIAS

const comun = fees.find(f => f.key === 'comun')!
const urgente = fees.find(f => f.key === 'urgente')!

// El precio se publica en UI, así que la conversión a pesos necesita el valor del
// día. Se lee del mismo sitio que `/indicadores/unidad-indexada` para que las dos
// páginas no puedan mostrar UIs distintas el mismo día. Si falla, `uiValue` queda
// en null y la tabla muestra sólo las UI: nunca un peso inventado.
const uiIndicator = indicatorFromSlug('unidad-indexada')
const { data: uiValue } = await useAsyncData('caj-ui-value', async () => {
  if (!uiIndicator) return null
  try {
    const result = await getProcessedExchangeData('')
    const rows = (result?.exchangeData ?? []) as ExchangeRate[]
    const value = currentIndicatorValue(rows, uiIndicator)
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
})

const pesos = (ui: number) => pesosForUi(ui, uiValue.value)

const formatPesos = (n: number, decimals: number): string =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

const formatUi = (n: number): string =>
  n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const displayDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedDisplay = computed(() => displayDate(CAJ_VERIFIED_AT))

// Ejemplo de vencimiento anclado a la fecha de verificación, no a `new Date()`:
// una fecha que cambia entre el render del servidor y el del cliente rompe la
// hidratación, y acá el número exacto no aporta nada que justifique el riesgo.
const ejemploVencimiento = computed(() =>
  displayDate(
    expiresOn(new Date(`${CAJ_VERIFIED_AT}T00:00:00Z`))
      .toISOString()
      .slice(0, 10)
  )
)

const canonicalUrl = `https://cambio-uruguay.com${CAJ_PATH}`

// El título se queda con el término completo por el que se busca y suelta la
// explicación: con la marca son 55 de los 60 caracteres del SERP, y los cinco que
// sobran no alcanzan para meter «26,50 UI» sin amputar «judiciales». Las cifras
// van en la descripción, que es donde se miden.
const title = 'Certificado de antecedentes judiciales'
const description =
  'La ficha oficial lo cobra en UI, no en pesos: 26,50 UI el común (15 días) y 53,10 UI el urgente (2 días hábiles), convertidos acá con la UI de hoy. Caduca a los 90 días de expedido, y el de la Ley 19.791 es otro trámite de 26,5 UI.'

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
        'certificado de antecedentes judiciales uruguay, certificado de buena conducta uruguay, cuanto sale el certificado de antecedentes judiciales, antecedentes judiciales uruguay tramite, certificado ley 19791, policia cientifica antecedentes, certificado antecedentes judiciales urgente, caj uruguay',
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
                name: 'Certificado de antecedentes judiciales',
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
            description,
            inLanguage: 'es-UY',
            dateModified: CAJ_VERIFIED_AT,
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
.caj-page {
  max-width: 1180px;
}

.caj-lead {
  margin-top: 0;
  line-height: 1.65;
}

.caj-prose {
  margin-top: 0;
  line-height: 1.7;
}

.caj-note {
  margin-top: 12px;
  line-height: 1.6;
}

.caj-alert-title {
  margin-top: 0;
}

.caj-alert-body {
  margin-top: 6px;
  line-height: 1.65;
}

.table-scroll {
  overflow-x: auto;
}

.caj-table {
  width: 100%;
  border-collapse: collapse;
}

.caj-table th,
.caj-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  vertical-align: top;
}

.caj-table th {
  font-weight: 700;
  white-space: nowrap;
}

.caj-list {
  margin-top: 0;
  padding-left: 1.2rem;
}

.caj-list li {
  margin-top: 8px;
  line-height: 1.65;
}

.caj-unpublished-q {
  margin-top: 0;
}

.caj-unpublished-a {
  margin-top: 4px;
}

.caj-sources-title {
  margin-top: 0;
}

.caj-sources-list {
  margin-top: 10px;
  padding-left: 1.2rem;
}

.caj-sources-list li {
  margin-top: 8px;
  line-height: 1.55;
}

.caj-sources-list a {
  text-decoration: none;
}

.caj-sources-list a:hover {
  text-decoration: underline;
}
</style>
