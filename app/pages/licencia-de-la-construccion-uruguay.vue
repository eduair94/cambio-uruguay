<template>
  <div class="constr-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-hard-hat</VIcon>
              TRABAJO
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Licencia, salario vacacional y aguinaldo de la construcción
            </h1>
            <p class="text-body-1 constr-lead">
              Si trabajás en obra, estas tres partidas
              <strong>no te las paga la empresa: te las paga el BPS</strong>. El dinero sale igual
              del bolsillo del empleador, pero viaja dentro del Aporte Unificado de la Construcción
              —su cuota parte de cargas salariales es del
              <strong>{{ AUC_WAGE_CHARGES_RATE }} %</strong> de las remuneraciones gravadas— y el
              Banco de Previsión Social las liquida y las deposita. Por eso tienen un calendario
              propio, con <strong>tres pagos al año</strong> y un tope de
              {{ DECEMBER_LICENCIA_CAP_DAYS }} días de licencia en diciembre.
            </p>
            <ShareButtons
              class="mt-4"
              :url="canonicalUrl"
              text="Licencia de la construcción: la paga el BPS, no la empresa"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              Cifras cotejadas contra las fichas oficiales del BPS y las normas publicadas en IMPO
              el {{ verifiedDisplay }}.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. Los tres pagos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Los tres pagos del año</h2>
            <p class="text-body-1 constr-prose mb-4">
              El BPS liquida estas partidas sobre las nóminas de la obra que ya están pagas, y las
              reparte en tres momentos. El de Semana de Turismo no le toca a todo el mundo: es el
              que cierra los días de licencia que no entraron en diciembre.
            </p>
            <div class="table-scroll">
              <table class="constr-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Cuándo</th>
                    <th>Qué trae</th>
                    <th>Qué período cubre</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="payout in payouts" :key="payout.id">
                    <td data-label="Cuándo">
                      <strong>{{ payout.when }}</strong>
                    </td>
                    <td data-label="Qué trae">
                      <ul class="constr-items">
                        <li v-for="item in payout.items" :key="item">{{ item }}</li>
                      </ul>
                    </td>
                    <td data-label="Qué período cubre">{{ payout.covers }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-caption text-medium-emphasis constr-note">
              La fecha exacta de cada pago la anuncia el BPS por edición y no está en ninguna norma,
              así que acá va el mes. El
              <NuxtLink :to="localePath('/cuando-se-cobra-el-aguinaldo-uruguay')" class="cu-link">
                aguinaldo del resto del sector privado </NuxtLink
              >tiene otro calendario, fijado por ley y por un decreto cada año.
            </p>
          </section>

          <!-- 2. El mes trabajado y su pago -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              ¿Trabajé en <span class="text-primary">este mes</span>: cuándo cobro ese aguinaldo?
            </h2>
            <p class="text-body-1 constr-prose mb-4">
              Acá la construcción se separa del resto del sector privado, y por un mes de diferencia
              que confunde a todos: los tramos del régimen general son diciembre-mayo y
              junio-noviembre, y los de la construcción están corridos.
              <strong>Noviembre a abril</strong> se paga en junio y <strong>mayo a octubre</strong>
              en diciembre. O sea que lo trabajado en noviembre y diciembre no se cobra en el
              diciembre siguiente: se cobra en junio.
            </p>
            <VRow dense class="mb-3">
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="selectedMonth"
                  :items="monthOptions"
                  item-title="label"
                  item-value="value"
                  label="Mes que trabajaste"
                  density="comfortable"
                  variant="outlined"
                  hide-details="auto"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="selectedYear"
                  :items="yearOptions"
                  label="Año"
                  density="comfortable"
                  variant="outlined"
                  hide-details="auto"
                />
              </VCol>
            </VRow>
            <VAlert v-if="tranche" type="info" variant="tonal" density="comfortable">
              <p class="text-body-2 constr-alert">
                El aguinaldo de <strong>{{ selectedMonthLabel }} de {{ selectedYear }}</strong> lo
                paga el BPS en
                <strong>{{ tranche.when.toLowerCase() }} de {{ tranche.year }}</strong
                >.
                <template v-if="tranchePayout && tranchePayout.items.length > 1">
                  Es el pago que trae además {{ trancheOtherItems }}.
                </template>
                <template v-else> Es el único concepto de ese pago. </template>
              </p>
            </VAlert>
          </section>

          <!-- 3. El reparto de los días de licencia -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              La licencia se cobra en dos veces, y el corte está en los
              {{ DECEMBER_LICENCIA_CAP_DAYS }} días
            </h2>
            <p class="text-body-1 constr-prose mb-4">
              El pago de diciembre trae el primer período de licencia con un máximo de
              {{ DECEMBER_LICENCIA_CAP_DAYS }} días. Los días que pasen de ahí van al pago de Semana
              de Turismo, junto con la licencia por antigüedad. Con
              {{ DECEMBER_LICENCIA_CAP_DAYS }} días justos no hay segundo pago: se cobran enteros en
              diciembre.
            </p>
            <VRow dense class="mb-2">
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="daysInput"
                  label="Días de licencia generados en el año"
                  type="number"
                  min="0"
                  density="comfortable"
                  variant="outlined"
                  hide-details="auto"
                />
              </VCol>
            </VRow>
            <VCard v-if="split" variant="tonal" class="pa-4 mb-2">
              <p class="text-body-2 constr-result mb-2">
                <strong>En diciembre:</strong> {{ split.december }}
                {{ split.december === 1 ? 'día' : 'días' }} de licencia, con su salario vacacional.
              </p>
              <p class="text-body-2 constr-result">
                <strong>En Semana de Turismo:</strong>
                <template v-if="split.turismo > 0">
                  {{ split.turismo }} {{ split.turismo === 1 ? 'día' : 'días' }}, más la licencia
                  por antigüedad y su salario vacacional.
                </template>
                <template v-else>
                  nada de este año, porque no pasaste los {{ DECEMBER_LICENCIA_CAP_DAYS }} días.
                </template>
              </p>
            </VCard>
            <p class="text-caption text-medium-emphasis constr-note">
              Los días que te corresponden salen de tu antigüedad y los tiene el BPS: acá se reparte
              la cantidad que pongas, no se calcula cuántos te tocan. Cómo funciona el
              <NuxtLink :to="localePath('/salario-vacacional-uruguay')" class="cu-link">
                salario vacacional </NuxtLink
              >y los
              <NuxtLink :to="localePath('/licencias-especiales-uruguay')" class="cu-link">
                días de licencia por ley </NuxtLink
              >es lo mismo que para cualquier trabajador; lo distinto acá es quién paga y cuándo.
            </p>
          </section>

          <!-- 4. Postergar la licencia -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              Postergar la licencia se pide en el MTSS, no en el BPS
            </h2>
            <p class="text-body-1 constr-prose mb-4">
              Es el dato operativo que falta en todas partes: la solicitud de postergación se
              presenta en el <strong>Ministerio de Trabajo y Seguridad Social</strong>, y la fecha
              en que la presentás es la que decide en cuál de los tres pagos cobrás.
            </p>
            <div class="table-scroll">
              <table class="constr-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Cuándo presentás la solicitud</th>
                    <th>Cuándo cobrás</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="rule in postponements" :key="rule.id">
                    <td data-label="Cuándo presentás la solicitud">
                      <strong>{{ rule.deadline }}</strong>
                    </td>
                    <td data-label="Cuándo cobrás">{{ rule.paidAt }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <VAlert type="warning" variant="tonal" density="comfortable" class="mt-4">
              <p class="text-body-2 constr-alert">{{ POSTPONEMENT_NO_SPLIT_NOTE }}</p>
            </VAlert>
          </section>

          <!-- 5. Por qué paga el BPS: el aporte unificado -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              Por qué paga el BPS: el {{ AUC_TOTAL_RATE }} % que aporta la obra
            </h2>
            <p class="text-body-1 constr-prose mb-4">
              El régimen lo creó el Decreto-Ley 14.411, de 1975, y su decreto reglamentario dice que
              las aportaciones de la obra comprenden también las que corresponden «para el pago de
              la licencia anual, del sueldo anual complementario y de las sumas para el mejor goce
              de la licencia» (Decreto 951/975, art. 1). Todo eso se paga junto, en un solo aporte,
              y de ahí sale tu partida.
            </p>
            <div class="table-scroll">
              <table class="constr-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Componente</th>
                    <th>Tasa</th>
                    <th>Qué financia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="component in aucComponents" :key="component.id">
                    <td data-label="Componente">
                      <strong>{{ component.label }}</strong>
                    </td>
                    <td data-label="Tasa">{{ formatRate(component.rate) }} %</td>
                    <td data-label="Qué financia">{{ component.detail }}</td>
                  </tr>
                  <tr class="constr-total">
                    <td data-label="Componente"><strong>Total</strong></td>
                    <td data-label="Tasa">
                      <strong>{{ formatRate(AUC_TOTAL_RATE) }} %</strong>
                    </td>
                    <td data-label="Qué financia">De las remuneraciones gravadas de la obra.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-caption text-medium-emphasis constr-note">
              Aparte del {{ formatRate(AUC_TOTAL_RATE) }} %, y sin integrarlo, se paga el tributo a
              la Caja de Profesionales Universitarios: {{ CAJA_PROFESIONALES_RATES.arquitectura }} %
              en obras de arquitectura y {{ CAJA_PROFESIONALES_RATES.ingenieria }} % en obras de
              ingeniería.
            </p>
            <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
              <p class="text-body-2 constr-alert">
                <strong>Si abrís la ley, no vas a encontrar al BPS.</strong> El artículo 5.º del
                Decreto-Ley 14.411 dice que «el Consejo Central de Asignaciones Familiares deberá
                abonar estos beneficios a los trabajadores», porque ése era el organismo de 1975;
                sus funciones las absorbió el Banco de Previsión Social. La norma no está
                desactualizada en el fondo, sólo en el nombre del pagador.
              </p>
            </VAlert>
          </section>

          <!-- 6. Condiciones y consecuencias -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              Las cinco cosas que no se cuentan y después aparecen
            </h2>
            <VExpansionPanels variant="accordion" class="constr-panels">
              <VExpansionPanel v-for="condition in conditions" :key="condition.id">
                <VExpansionPanelTitle>
                  <span class="font-weight-medium">{{ condition.title }}</span>
                </VExpansionPanelTitle>
                <VExpansionPanelText>
                  <p class="text-body-2 constr-prose">{{ condition.body }}</p>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
            <p class="text-body-2 constr-prose mt-4">
              Sobre la declaración de IRPF que esto te obliga a hacer, el sitio tiene la
              <NuxtLink :to="localePath('/declaracion-de-irpf-uruguay')" class="cu-link">
                guía de quién tiene que declarar </NuxtLink
              >y en qué fechas.
            </p>
          </section>

          <!-- 7. Cómo y dónde se cobra -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Dónde se cobra y cómo ver el recibo</h2>
            <ul class="constr-list">
              <li v-for="channel in channels" :key="channel">{{ channel }}</li>
            </ul>
            <VAlert type="success" variant="tonal" density="comfortable" class="mt-4">
              <p class="text-body-2 constr-alert">{{ CONSTRUCTION_RECEIPT_NOTE }}</p>
            </VAlert>
          </section>

          <!-- 8. Lo que no se publica -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Lo que esta página no te va a decir</h2>
            <p class="text-body-1 constr-prose mb-4">
              Cuatro cifras que se buscaron y no se publican, con el motivo, porque un número sin
              una fuente vigente que lo sostenga no entra:
            </p>
            <div v-for="item in unpublished" :key="item.id" class="constr-unpublished">
              <p class="text-subtitle-2 font-weight-bold constr-unpublished-q">
                {{ item.question }}
              </p>
              <p class="text-body-2 constr-prose">{{ item.why }}</p>
            </div>
          </section>

          <!-- 9. FAQ -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion" class="constr-panels">
              <VExpansionPanel v-for="faq in faqs" :key="faq.question">
                <VExpansionPanelTitle>
                  <span class="font-weight-medium">{{ faq.question }}</span>
                </VExpansionPanelTitle>
                <VExpansionPanelText>
                  <p class="text-body-2 constr-prose">{{ faq.answer }}</p>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 10. Fuentes -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Fuentes</h2>
            <ul class="constr-list">
              <li v-for="source in sources" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer" class="cu-link">
                  {{ source.label }}
                </a>
              </li>
            </ul>
          </section>

          <VDivider class="mb-6" />

          <!-- 11. Relacionadas -->
          <section>
            <h2 class="text-h6 font-weight-bold mb-3">Seguir por acá</h2>
            <ul class="constr-list">
              <li v-for="link in relatedLinks" :key="link.to">
                <NuxtLink :to="localePath(link.to)" class="cu-link">{{ link.label }}</NuxtLink>
                — {{ link.detail }}
              </li>
            </ul>
          </section>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AUC_COMPONENTS,
  AUC_TOTAL_RATE,
  AUC_WAGE_CHARGES_RATE,
  CAJA_PROFESIONALES_RATES,
  CONSTRUCTION_CONDITIONS,
  CONSTRUCTION_FAQ,
  CONSTRUCTION_PATH,
  CONSTRUCTION_PAYMENT_CHANNELS,
  CONSTRUCTION_PAYOUTS,
  CONSTRUCTION_RECEIPT_NOTE,
  CONSTRUCTION_SOURCES,
  CONSTRUCTION_UNPUBLISHED,
  CONSTRUCTION_VERIFIED_AT,
  DECEMBER_LICENCIA_CAP_DAYS,
  POSTPONEMENT_NO_SPLIT_NOTE,
  POSTPONEMENT_RULES,
  aguinaldoTrancheFor,
  licenciaSplit,
} from '~/utils/constructionWages'

const localePath = useLocalePath()

const payouts = CONSTRUCTION_PAYOUTS
const postponements = POSTPONEMENT_RULES
const aucComponents = AUC_COMPONENTS
const conditions = CONSTRUCTION_CONDITIONS
const channels = CONSTRUCTION_PAYMENT_CHANNELS
const unpublished = CONSTRUCTION_UNPUBLISHED
const faqs = CONSTRUCTION_FAQ
const sources = CONSTRUCTION_SOURCES

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

const monthOptions = MONTHS.map((label, index) => ({
  label: label.charAt(0).toUpperCase() + label.slice(1),
  value: index + 1,
}))

// El año de la verificación y los dos siguientes. Sale de la constante y no de `new Date()` a
// propósito: un valor que cambia entre el render del servidor y el del cliente rompe la
// hidratación, y acá sólo hace falta un rango razonable para elegir.
const BASE_YEAR = Number(CONSTRUCTION_VERIFIED_AT.slice(0, 4))
const yearOptions = [BASE_YEAR - 1, BASE_YEAR, BASE_YEAR + 1]

const selectedMonth = ref(9)
const selectedYear = ref(BASE_YEAR)

const selectedMonthLabel = computed(() => MONTHS[selectedMonth.value - 1] ?? '')

const tranche = computed(() => aguinaldoTrancheFor(selectedMonth.value, selectedYear.value))

const tranchePayout = computed(
  () => CONSTRUCTION_PAYOUTS.find(payout => payout.id === tranche.value?.payoutId) ?? null
)

/**
 * Las OTRAS partidas del pago que trae ese aguinaldo, en minúscula y unidas con «y».
 *
 * Se saca la primera porque es el propio aguinaldo: el lector ya la está leyendo en la frase, y
 * repetirla haría que el pago de diciembre se anunciara a sí mismo.
 */
const trancheOtherItems = computed(() => {
  const items = (tranchePayout.value?.items ?? []).slice(1).map(item => item.toLowerCase())
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
})

const daysInput = ref('20')

/** El número de un campo de texto, o `null`: un campo vacío no es un cero. */
const numberFrom = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

const split = computed(() => licenciaSplit(numberFrom(daysInput.value)))

const formatRate = (n: number): string => n.toLocaleString('es-UY', { maximumFractionDigits: 1 })

const verifiedDisplay = computed(() =>
  new Date(`${CONSTRUCTION_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
)

const relatedLinks = [
  {
    to: '/cuando-se-cobra-el-aguinaldo-uruguay',
    label: 'Cuándo se cobra el aguinaldo',
    detail: 'el calendario del resto del sector privado, de los públicos y de la construcción.',
  },
  {
    to: '/salario-vacacional-uruguay',
    label: 'Salario vacacional',
    detail: 'cuánto es por día y qué aportes lleva, con simulador.',
  },
  {
    to: '/licencias-especiales-uruguay',
    label: 'Licencias especiales',
    detail: 'los días que la Ley 18.345 da aparte de la licencia anual.',
  },
  {
    to: '/accidente-de-trabajo-uruguay',
    label: 'Accidente de trabajo',
    detail: 'qué cubre el BSE, que en la obra se paga dentro del mismo aporte unificado.',
  },
  {
    to: '/declaracion-de-irpf-uruguay',
    label: 'Declaración de IRPF',
    detail: 'la que te queda obligatoria por cobrar estas partidas del BPS.',
  },
]

const canonicalUrl = `https://cambio-uruguay.com${CONSTRUCTION_PATH}`

// 40 caracteres, 57 con la marca que pega el titleTemplate: entra en los 60 que publica Google
// (`seoTitleBudget`, contrato en 0).
//
// El título apunta a la LICENCIA y no al aguinaldo, a propósito.
// `/cuando-se-cobra-el-aguinaldo-uruguay` ya tiene a la construcción en su tabla de tres regímenes,
// con las dos partes y sus meses, así que un título sobre el aguinaldo de la obra le saca las
// impresiones a una página propia sin agregar nada. Lo que no estaba en ninguna página es esto: que
// la licencia y el salario vacacional los paga el BPS, en dos pagos partidos por los 16 días.
const title = 'Licencia de la construcción: paga el BPS'
// 149 caracteres, con la respuesta adelante y las dos cifras que diferencian a esta página: los 16
// días y el reparto diciembre / Semana de Turismo. Una descripción con el dato al frente corre a
// ~1,4 % de CTR en este sitio y una genérica a 0,03-0,2 % desde la misma posición.
const description =
  'En obra la licencia, el salario vacacional y el aguinaldo los paga el BPS, no la empresa: en diciembre hasta 16 días y el resto en Semana de Turismo.'

defineOgImageComponent('Cambio', {
  title: 'Licencia de la construcción',
  subtitle: 'La paga el BPS, no la empresa',
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
        'licencia de la construccion uruguay, aguinaldo construccion uruguay, salario vacacional construccion, cuando paga el bps la licencia de la construccion, partidas salariales construccion bps, aporte unificado de la construccion, licencia por antiguedad construccion, ley 14411',
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
                name: 'Licencia de la construcción',
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
            dateModified: CONSTRUCTION_VERIFIED_AT,
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
.constr-page {
  max-width: 1180px;
}

.constr-lead {
  margin-top: 0;
  line-height: 1.65;
}

.constr-prose {
  margin-top: 0;
  line-height: 1.7;
}

.constr-alert {
  margin-top: 0;
  line-height: 1.6;
}

.constr-result {
  margin-top: 0;
  line-height: 1.6;
}

.constr-note {
  margin-top: 12px;
  line-height: 1.6;
}

.constr-list {
  margin-top: 12px;
  padding-left: 1.25rem;
  line-height: 1.7;
}

.constr-list li + li {
  margin-top: 8px;
}

.constr-items {
  margin-top: 0;
  padding-left: 1.1rem;
  line-height: 1.6;
}

.constr-panels {
  margin-top: 12px;
}

.constr-unpublished {
  margin-top: 16px;
}

.constr-unpublished-q {
  margin-top: 0;
  margin-bottom: 4px;
}

.table-scroll {
  overflow-x: auto;
}

.constr-table {
  width: 100%;
  border-collapse: collapse;
}

.constr-table th,
.constr-table td {
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.22);
}

.constr-table th {
  font-weight: 700;
  white-space: nowrap;
}

.constr-total td {
  border-bottom: none;
}
</style>
