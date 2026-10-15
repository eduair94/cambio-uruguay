<template>
  <div class="itp-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-home-city-outline</VIcon>
              IMPUESTOS
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Impuesto a las Trasmisiones Patrimoniales (ITP) en Uruguay
            </h1>
            <p class="text-body-1 itp-lead">
              Al escriturar una vivienda pagan las dos partes:
              <strong>{{ ITP_SELLER_RATE }} % el que vende</strong> y
              <strong>{{ ITP_BUYER_RATE }} % el que compra</strong>. Lo que casi siempre se calcula
              mal es la base: <strong>no es el precio</strong>. El artículo 5.º del Título 19 la
              fija en el valor real que fija Catastro, actualizado por IPC, y el precio entra sólo
              como techo. Si la casa se vende por encima de su valor catastral —el caso habitual—,
              el {{ ITP_SELLER_RATE }} % se calcula sobre el valor catastral.
            </p>
            <ShareButtons
              class="mt-4"
              :url="canonicalUrl"
              text="ITP en Uruguay: 2 % cada parte, y el IRPF del que vende"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              Cifras cotejadas contra el Texto Ordenado de la DGI y sus fichas oficiales el
              {{ verifiedDisplay }}. La DGI escribe el nombre de las dos formas, «Trasmisiones» en
              el Texto Ordenado y «Transmisiones» en su propia ficha.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. Las cuatro tasas -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              Las cuatro tasas, y a quién le toca cada una
            </h2>
            <p class="text-body-1 itp-prose mb-4">
              Las fija el artículo 7.º del Título 19. En una compraventa hay
              <strong>dos contribuyentes</strong>, no uno: el artículo 3.º hace contribuyentes a los
              otorgantes, así que cada parte paga su {{ ITP_SELLER_RATE }} % y el escribano retiene
              los dos juntos.
            </p>
            <div class="table-scroll">
              <table class="itp-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Quién paga</th>
                    <th>Tasa</th>
                    <th>Cuándo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in rates" :key="row.id">
                    <td data-label="Quién paga">
                      <strong>{{ row.who }}</strong>
                    </td>
                    <td data-label="Tasa">{{ row.rate }} %</td>
                    <td data-label="Cuándo">{{ row.when }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-caption text-medium-emphasis itp-note">
              El escribano interviniente es <strong>agente de retención y percepción</strong>, y los
              Registros no inscriben el documento si no se presenta con el comprobante de pago.
            </p>
          </section>

          <!-- 2. La base -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">La base no es el precio</h2>
            <p class="text-body-1 itp-prose mb-4">
              El monto imponible es el
              <NuxtLink :to="localePath('/valor-catastral-uruguay')" class="cu-link">
                valor real que fija Catastro </NuxtLink
              >para el padrón, vigente al momento de la operación y actualizado por la variación del
              IPC entre el mes en que se fijó y el anterior al de la escritura. El precio aparece
              una sola vez en el artículo, y es para ponerle un techo: «Si esa actualización
              determinare un valor mayor que el precio establecido […] el monto imponible, en tales
              casos, será dicho precio».
            </p>
            <VAlert type="info" variant="tonal" density="comfortable" class="mb-4">
              <p class="text-body-2 itp-alert">
                O sea que se paga sobre <strong>el menor de los dos</strong>. Como el valor
                catastral suele quedar bastante por debajo de lo que se pide, en una venta normal la
                base es el valor catastral y no el precio: quien hace la cuenta sobre el precio se
                asusta de más.
              </p>
            </VAlert>

            <h3 class="text-subtitle-1 font-weight-bold itp-subhead">
              La cuenta, con los dos números de tu operación
            </h3>
            <p class="text-body-2 itp-prose mb-3">
              Los dos montos van <strong>en pesos</strong>, porque el valor real de Catastro está en
              pesos y el artículo compara dos cifras de la misma unidad. Si el precio está en
              dólares, pasalo a pesos primero con
              <NuxtLink :to="localePath('/convertir')" class="cu-link">el conversor </NuxtLink>y
              recién después compará.
            </p>
            <VRow dense class="mb-2">
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="cadastralInput"
                  label="Valor catastral actualizado ($)"
                  type="number"
                  min="0"
                  density="comfortable"
                  variant="outlined"
                  hide-details="auto"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="priceInput"
                  label="Precio de la operación ($)"
                  type="number"
                  min="0"
                  density="comfortable"
                  variant="outlined"
                  hide-details="auto"
                />
              </VCol>
            </VRow>
            <p class="text-caption text-medium-emphasis itp-note mb-4">
              Vienen con un ejemplo cargado, sólo para que se vea la cuenta: cambialos por los de tu
              padrón.
            </p>

            <VCard v-if="breakdown.total > 0" variant="tonal" class="pa-4 mb-0">
              <p class="text-body-2 itp-result">
                Monto imponible: <strong>{{ formatPesos(breakdown.base) }}</strong
                >, que es
                {{
                  breakdown.priceCapped
                    ? 'el precio, porque el valor catastral actualizado quedó por encima de él'
                    : 'el valor catastral actualizado, porque quedó por debajo del precio'
                }}.
              </p>
              <ul class="itp-list">
                <li>
                  Paga el que vende ({{ ITP_SELLER_RATE }} %):
                  <strong>{{ formatPesos(breakdown.seller) }}</strong>
                </li>
                <li>
                  Paga el que compra ({{ ITP_BUYER_RATE }} %):
                  <strong>{{ formatPesos(breakdown.buyer) }}</strong>
                </li>
                <li>
                  Total de ITP en la escritura:
                  <strong>{{ formatPesos(breakdown.total) }}</strong>
                </li>
              </ul>
              <p class="text-caption text-medium-emphasis itp-note">
                Es sólo el ITP. El que vende tiene además el IRPF de la sección siguiente, y los
                honorarios del escribano no están en ninguna de las dos cuentas: el total de gastos
                del comprador está en
                <NuxtLink
                  :to="localePath('/guias/costos-de-escrituracion-uruguay')"
                  class="cu-link"
                >
                  la guía de costos de escrituración </NuxtLink
                >.
              </p>
            </VCard>
            <VAlert v-else type="warning" variant="tonal" density="comfortable" class="mb-0">
              <p class="text-body-2 itp-alert">
                Escribí el valor catastral actualizado para ver la cuenta. Sin ese número no hay
                base imponible, y no la suplimos con el precio.
              </p>
            </VAlert>
          </section>

          <!-- 3. El vendedor paga dos impuestos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">El que vende paga dos impuestos, no uno</h2>
            <p class="text-body-1 itp-prose mb-4">
              El ITP del {{ ITP_SELLER_RATE }} % es uno. El otro es el
              <strong>IRPF por incremento patrimonial</strong>, de la Categoría I: la tasa es
              {{ IRPF_CAPITAL_RATE }} % sobre la renta computable, y la renta computable se arma de
              dos maneras distintas según cuándo se compró el inmueble. El ITP que pagó el vendedor
              <strong>se deduce</strong> en el criterio real, así que los dos impuestos no son
              independientes.
            </p>
            <div class="table-scroll">
              <table class="itp-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Criterio</th>
                    <th>Quién puede usarlo</th>
                    <th>Renta computable</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="criterion in criteria" :key="criterion.id">
                    <td data-label="Criterio">
                      <strong>{{ criterion.label }}</strong>
                    </td>
                    <td data-label="Quién puede usarlo">{{ criterion.eligibility }}</td>
                    <td data-label="Renta computable">{{ criterion.computable }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-body-2 itp-prose itp-note">
              Llevado a una sola cifra, el ficto termina siendo
              <strong>{{ fictoEffectiveLabel }} %</strong> del mayor entre el precio y el valor real
              ({{ IRPF_FICTO_SHARE }} % de renta computable × {{ IRPF_CAPITAL_RATE }} % de tasa). El
              criterio real no se puede resumir así: depende del costo fiscal actualizado por
              <NuxtLink :to="localePath('/indicadores/unidad-indexada')" class="cu-link">
                Unidad Indexada </NuxtLink
              >y de las mejoras documentadas, que son datos de cada operación.
            </p>
          </section>

          <!-- 4. La exoneración que se busca -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              No hay exoneración de ITP por ser tu primera vivienda
            </h2>
            <p class="text-body-1 itp-prose mb-4">
              Es la pregunta que más trae a esta página, y la respuesta del régimen general es que
              no existe: el artículo 8.º no exonera por primera vivienda ni por vivienda única. Las
              exoneraciones que sí están son otras, y ninguna depende de cuántas casas tengas.
            </p>
            <ul class="itp-list mb-4">
              <li v-for="item in exemptions" :key="item.id">
                <strong>{{ item.label }}.</strong> {{ item.detail }}
              </li>
            </ul>
            <p class="text-body-1 itp-prose mb-4">
              Aparte de esa lista, el régimen de <strong>vivienda promovida</strong> exonera el ITP
              de la compra en los proyectos que lo tienen aprobado. Es un beneficio del proyecto, no
              del comprador: lo explicamos en
              <NuxtLink :to="localePath('/por-que-no-baja-el-alquiler-uruguay')" class="cu-link">
                por qué no baja el alquiler </NuxtLink
              >.
            </p>
            <VAlert type="success" variant="tonal" density="comfortable" class="mb-0">
              <p class="text-body-2 itp-alert">
                <strong>Vender para comprar otra sí tiene exoneración, pero del IRPF.</strong> Hacen
                falta las cinco condiciones: que la vivienda vendida no pase de
                {{ formatUi(IRPF_HOME_EXEMPTION.soldMaxUi) }} UI, que al menos el
                {{ IRPF_HOME_EXEMPTION.reinvestedSharePercent }} % del precio vaya a la nueva, que
                entre las dos operaciones no pasen más de
                {{ IRPF_HOME_EXEMPTION.monthsBetween }} meses, que la nueva no pase de
                {{ formatUi(IRPF_HOME_EXEMPTION.boughtMaxUi) }} UI y que las dos sean casa
                habitación permanente. Y aun cumpliendo todo,
                <strong>el escribano retiene igual</strong>: la devolución se le pide después a la
                DGI.
              </p>
            </VAlert>
          </section>

          <!-- 5. Plazos y trámite -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cuándo se paga, y con qué formulario</h2>
            <div class="table-scroll mb-4">
              <table class="itp-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Acto</th>
                    <th>Plazo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in deadlines" :key="row.id">
                    <td data-label="Acto">{{ row.act }}</td>
                    <td data-label="Plazo">
                      <strong>{{ row.deadline }}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-body-1 itp-prose">
              La declaración jurada va en el <strong>formulario {{ ITP_FORMS.urban }}</strong> si el
              inmueble es urbano o suburbano y en el <strong>{{ ITP_FORMS.rural }}</strong> si es
              rural, armada con la {{ ITP_FORMS.application }}, y el pago se imputa al código
              <strong>{{ ITP_FORMS.paymentCode }}</strong
              >. El plazo de la sucesión es el que más sorprende: no son 15 días, es un año desde el
              fallecimiento.
            </p>
          </section>

          <!-- 6. Lo que no publicamos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Lo que esta página no dice, y por qué</h2>
            <div v-for="item in unpublished" :key="item.id" class="mb-3">
              <p class="text-body-2 font-weight-bold itp-unpublished-q">{{ item.what }}</p>
              <p class="text-body-2 itp-prose">{{ item.why }}</p>
            </div>
          </section>

          <!-- 7. Relacionadas -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Seguir por acá</h2>
            <ul class="itp-list">
              <li>
                <NuxtLink
                  :to="localePath('/guias/costos-de-escrituracion-uruguay')"
                  class="cu-link"
                >
                  Costos de escrituración </NuxtLink
                >: el paquete entero que paga el comprador el día de la firma, con los honorarios y
                los certificados que acá quedan afuera.
              </li>
              <li>
                <NuxtLink :to="localePath('/valor-catastral-uruguay')" class="cu-link">
                  Valor catastral </NuxtLink
                >: cómo mirar el número del que sale la base de este impuesto.
              </li>
              <li>
                <NuxtLink :to="localePath('/venta-viviendas-uruguay')" class="cu-link">
                  Viviendas en venta </NuxtLink
                >: los avisos vigentes, con su precio pedido.
              </li>
              <li>
                <NuxtLink :to="localePath('/contribucion-inmobiliaria-uruguay')" class="cu-link">
                  Contribución inmobiliaria </NuxtLink
                >: el otro impuesto que cuelga del mismo valor catastral, y que se paga todos los
                años.
              </li>
              <li>
                <NuxtLink :to="localePath('/comprar-o-alquilar-uruguay')" class="cu-link">
                  Comprar o alquilar </NuxtLink
                >: la comparación donde la escrituración es uno de los costos que no se ven.
              </li>
            </ul>
          </section>

          <!-- 8. FAQ -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion">
              <VExpansionPanel v-for="faq in faqs" :key="faq.question" :title="faq.question">
                <template #text>
                  <p class="text-body-2 itp-prose">{{ faq.answer }}</p>
                </template>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 9. Fuentes -->
          <VCard variant="flat" class="itp-sources pa-5 mb-6">
            <p class="text-subtitle-1 font-weight-bold itp-sources-title">Fuentes</p>
            <ul class="itp-sources-list">
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
import { computed, ref } from 'vue'
import {
  IRPF_CAPITAL_RATE,
  IRPF_CRITERIA,
  IRPF_FICTO_EFFECTIVE_RATE,
  IRPF_FICTO_SHARE,
  IRPF_HOME_EXEMPTION,
  ITP_BUYER_RATE,
  ITP_DEADLINES,
  ITP_EXEMPTIONS,
  ITP_FAQ,
  ITP_FORMS,
  ITP_PATH,
  ITP_RATES,
  ITP_SELLER_RATE,
  ITP_SOURCES,
  ITP_UNPUBLISHED,
  ITP_VERIFIED_AT,
  itpBreakdown,
} from '~/utils/propertyTransferTax'

const localePath = useLocalePath()

const rates = ITP_RATES
const criteria = IRPF_CRITERIA
const deadlines = ITP_DEADLINES
const exemptions = ITP_EXEMPTIONS
const unpublished = ITP_UNPUBLISHED
const faqs = ITP_FAQ
const sources = ITP_SOURCES

// Un ejemplo cargado, redondo a propósito: no es una medición del mercado ni sale de ningún
// catálogo del sitio, es sólo para que la cuenta se vea armada al llegar. La leyenda de abajo del
// formulario lo dice con esas palabras.
const cadastralInput = ref('3000000')
const priceInput = ref('5200000')

/** El número de un campo de texto, o `null`: un campo vacío no es un cero. */
const numberFrom = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) && value > 0 ? value : null
}

const breakdown = computed(() =>
  itpBreakdown(numberFrom(cadastralInput.value) ?? 0, numberFrom(priceInput.value))
)

const formatPesos = (n: number): string =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

const formatUi = (n: number): string => n.toLocaleString('es-UY', { maximumFractionDigits: 0 })

const fictoEffectiveLabel = IRPF_FICTO_EFFECTIVE_RATE.toLocaleString('es-UY', {
  maximumFractionDigits: 2,
})

const verifiedDisplay = computed(() =>
  new Date(`${ITP_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
)

const canonicalUrl = `https://cambio-uruguay.com${ITP_PATH}`

// 38 caracteres, 55 con la marca puesta: entra en los 60 que publica Google (`seoTitleBudget`,
// contrato en 0).
//
// El snippet está apuntado DE COSTADO a `/guias/costos-de-escrituracion-uruguay`, a propósito. Esa
// guía ya se llama «Escriturar una casa: entre 5 % y 8 %» y ya dice el 2 % y 2 % sobre el valor de
// Catastro, así que un título de esta página sobre lo que sale escriturar le saca las impresiones a
// la guía sin agregar nada: la regla del repo es que dos páginas propias reclamando la misma
// intención se la quitan entre sí. Lo que esta página tiene y la guía no es el OTRO impuesto —el
// IRPF por incremento patrimonial del que vende, que la guía no nombra— y las tasas de la sucesión.
// Por eso el título lleva las dos siglas y no el costo de la escritura.
const title = 'ITP 2 % y 2 %, y el IRPF del que vende'
// 155 caracteres, y las cuatro cifras son de las dos mitades que esta página no comparte con
// ninguna otra: las tasas de la sucesión y el IRPF del vendedor. Una descripción con la cifra
// adelante corre a ~1,4 % de CTR en este sitio y una genérica a 0,03–0,2 % desde la misma posición.
const description =
  'El ITP es 2 % para cada parte sobre el valor catastral, y 3 % o 4 % en una sucesión. El que vende paga además IRPF: 12 % de la renta, o 1,8 % por el ficto.'

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
        'impuesto a las trasmisiones patrimoniales, itp uruguay, impuesto transmisiones patrimoniales uruguay, cuanto se paga de itp, impuestos al comprar una casa uruguay, impuestos al vender una casa uruguay, irpf venta de inmueble uruguay, exoneracion itp primera vivienda',
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
                name: 'Impuesto a las Trasmisiones Patrimoniales',
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
            dateModified: ITP_VERIFIED_AT,
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
.itp-page {
  max-width: 1180px;
}

.itp-lead {
  margin-top: 0;
  line-height: 1.65;
}

.itp-prose {
  margin-top: 0;
  line-height: 1.7;
}

.itp-alert {
  margin-top: 0;
  line-height: 1.6;
}

.itp-result {
  margin-top: 0;
  line-height: 1.6;
}

.itp-note {
  margin-top: 12px;
  line-height: 1.6;
}

.itp-subhead {
  margin-top: 24px;
  margin-bottom: 8px;
}

.itp-list {
  margin-top: 12px;
  padding-left: 1.25rem;
  line-height: 1.7;
}

.itp-list li + li {
  margin-top: 8px;
}

.itp-unpublished-q {
  margin-top: 0;
}

.table-scroll {
  overflow-x: auto;
}

.itp-table {
  width: 100%;
  border-collapse: collapse;
}

.itp-table th,
.itp-table td {
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.18);
}

.itp-table th {
  font-weight: 700;
  white-space: nowrap;
}

.itp-sources-title {
  margin-top: 0;
}

.itp-sources-list {
  margin-top: 8px;
  padding-left: 1.25rem;
  line-height: 1.7;
}

.itp-sources-list li + li {
  margin-top: 6px;
}
</style>
