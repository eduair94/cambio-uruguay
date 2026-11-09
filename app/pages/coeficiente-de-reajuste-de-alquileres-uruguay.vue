<template>
  <div class="cra-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-home-percent-outline</VIcon>
              Alquiler
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Coeficiente de reajuste de alquileres: {{ latestPercent }} en {{ latest.label }}
            </h1>
            <p class="text-body-1 cra-lead">
              El aumento anual del alquiler no es el porcentaje que al propietario le parezca: la
              Ley de Arrendamientos manda multiplicar el alquiler por un coeficiente que el Poder
              Ejecutivo publica <strong>mes a mes</strong> en el Diario Oficial. Para los alquileres
              que se actualizan en {{ latest.label }} ese coeficiente es
              <strong>{{ latestCoefficient }}</strong
              >, o sea <strong>{{ latestPercent }}</strong> de aumento.
            </p>
            <ShareButtons
              class="mt-4"
              :url="canonicalUrl"
              text="El coeficiente legal de reajuste de alquileres, mes por mes y con su decreto"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              Cada coeficiente se leyó en el artículo 4 de su propio decreto, en impo.com.uy, el
              {{ verifiedDisplay }}. Ninguna cifra de esta página se calcula acá.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. La cuenta, con el alquiler de quien lee -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cuánto te quedaría</h2>
            <VCard variant="tonal" class="pa-4">
              <VRow dense>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model="rentInput"
                    label="Alquiler que pagás hoy ($)"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VSelect
                    v-model="selectedMonth"
                    :items="monthItems"
                    item-title="title"
                    item-value="value"
                    label="Mes en que se actualiza"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
              </VRow>
              <p v-if="result" class="cra-result text-body-1 mt-4 mb-0">
                Con el coeficiente de <strong>{{ selectedCoefficient }}</strong> de
                {{ selected.label }}, un alquiler de <strong>${{ money(rentValue) }}</strong> pasa a
                <strong>${{ money(result) }}</strong
                >: <strong>${{ money(result - rentValue) }}</strong> más por mes.
              </p>
              <p v-else class="cra-result text-body-2 text-medium-emphasis mt-4 mb-0">
                Escribí el alquiler que pagás hoy y elegí el mes del reajuste.
              </p>
              <p class="text-caption text-medium-emphasis mt-3 mb-0">
                La multiplicación es la del artículo 15 y el resultado se redondea al peso: el
                decreto no dice nada sobre redondeo, así que publicar centésimos sería precisión
                inventada. El reajuste rige doce meses, desde el primer día del mes siguiente.
              </p>
            </VCard>
          </section>

          <!-- 2. De dónde sale el número -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">De dónde sale ese coeficiente</h2>
            <p class="text-body-1 cra-prose">
              Del artículo 15 del Decreto-Ley 14.219, la Ley de Arrendamientos. Manda comparar dos
              cosas en los doce meses anteriores al vencimiento del plazo y quedarse con
              <strong>la menor de las dos variaciones</strong>:
            </p>
            <ul class="cra-list">
              <li>
                el <strong>Índice de Precios del Consumo</strong> del mes anterior al reajuste
                contra el mismo mes del año previo;
              </li>
              <li>
                el valor de la <strong>Unidad Reajustable de Alquileres (URA)</strong>, comparado
                igual. La URA no es la UR: el artículo 14 la define como el promedio de la UR de un
                mes con la de los dos meses anteriores.
              </li>
            </ul>
            <p class="text-body-1 cra-prose">
              Por eso el coeficiente de esta página no se deriva de la UR ni del IPC que el sitio ya
              publica: es el menor de dos cocientes sobre una unidad promediada, y el decreto ya lo
              dice hecho. El mismo artículo obliga al Poder Ejecutivo a publicar los valores y el
              coeficiente <strong>todos los meses</strong> en el Diario Oficial.
            </p>
          </section>

          <!-- 3. La opción del artículo 3, que es el dato que casi nadie conoce -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              Si el aumento pactado es mayor, el inquilino puede elegir este
            </h2>
            <VCard variant="outlined" class="pa-4">
              <p class="text-body-1 cra-prose">
                El artículo 3 del mismo decreto-ley, en la redacción que le dio el artículo 2 del
                Decreto-Ley 15.484, dice que cuando uno de los aumentos anuales pactados supera al
                que da el coeficiente, <strong>el arrendatario «podrá optar por abonar»</strong> el
                alquiler reajustado con el coeficiente. No es automático y tiene condiciones
                estrictas:
              </p>
              <ul class="cra-list">
                <li>
                  <strong>quince días corridos</strong> desde que el coeficiente se publica en el
                  Diario Oficial;
                </li>
                <li><strong>una sola vez</strong> en todo el período del contrato;</li>
                <li>
                  avisando al propietario o al administrador por
                  <strong>telegrama colacionado</strong>;
                </li>
                <li>
                  y rige <strong>de futuro</strong>, hasta entregar la finca, con reajustes cada
                  doce meses por el procedimiento del artículo 15.
                </li>
              </ul>
              <p class="text-body-2 text-medium-emphasis cra-prose mb-0">
                Esto no es asesoramiento legal y el encuadre de cada contrato puede cambiarlo: el
                texto de los artículos está enlazado abajo y una consulta profesional antes de
                mandar el telegrama cuesta mucho menos que perder la opción.
              </p>
            </VCard>
          </section>

          <!-- 4. El desfasaje, con las dos fechas medidas -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              El coeficiente de tu mes puede salir después de tu mes
            </h2>
            <p class="text-body-1 cra-prose">
              No es un detalle administrativo: el coeficiente para los alquileres que se
              actualizaban en <strong>enero de 2026</strong> salió en el Decreto 23/026, publicado
              en el Diario Oficial el <strong>{{ displayDate('2026-02-05') }}</strong
              >. El de agosto, en cambio, se publicó el
              <strong>{{ displayDate('2026-08-27') }}</strong
              >, cuatro días antes de terminar el mes.
            </p>
            <p class="text-body-1 cra-prose">
              El artículo 15 lo previó: si a la fecha del reajuste los valores no están publicados,
              se aplica un <strong>coeficiente provisorio</strong> —el que surja de la Contaduría
              General de la Nación o, en su defecto, el del reajuste del mes anterior— y se corrige
              cuando el Poder Ejecutivo publica las cifras oficiales. O sea que un reajuste cobrado
              con el número provisorio no es definitivo.
            </p>
          </section>

          <!-- 5. La serie, que es lo que no existe en ningún lado -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              Los {{ months.length }} meses de 2026, uno por uno
            </h2>
            <p class="text-body-1 cra-prose">
              El coeficiente se mueve: el más bajo de la serie es el de {{ lowest.label }} ({{
                lowestPercent
              }}) y el más alto, el de {{ highest.label }} ({{ highestPercent }}). Cada fila es el
              artículo 4 de su decreto.
            </p>
            <div class="table-scroll">
              <table class="cu-mobile-cards cra-table">
                <thead>
                  <tr>
                    <th scope="col">Alquileres que se actualizan en</th>
                    <th scope="col" class="text-end">Coeficiente</th>
                    <th scope="col" class="text-end">Aumento</th>
                    <th scope="col">Decreto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in months" :key="row.month">
                    <td data-label="Alquileres que se actualizan en">{{ row.label }}</td>
                    <td data-label="Coeficiente" class="text-end">{{ row.coefficient }}</td>
                    <td data-label="Aumento" class="text-end">{{ row.percent }}</td>
                    <td data-label="Decreto">
                      <a
                        :href="row.decreeUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="cu-link"
                        >{{ row.decree }}</a
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-body-2 text-medium-emphasis cra-prose">
              Lo que tu contrato aplica depende de su propia cláusula de reajuste: muchos pactan
              expresamente el IPC, la Unidad Indexada o la Unidad Reajustable. Este coeficiente es
              el legal del Decreto-Ley 14.219 y el que habilita la opción del artículo 3. Antes de
              aceptar un aumento, leé la cláusula.
            </p>
          </section>

          <!-- 6. Preguntas -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion">
              <VExpansionPanel v-for="faq in faqs" :key="faq.question" :title="faq.question">
                <VExpansionPanelText>
                  <p class="text-body-2 mb-0">{{ faq.answer }}</p>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 7. Fuentes y vecinos -->
          <section class="mb-4">
            <h2 class="text-h5 font-weight-bold mb-3">Fuentes</h2>
            <ul class="cra-list mb-6">
              <li v-for="source in sources" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer" class="cu-link">{{
                  source.label
                }}</a>
              </li>
            </ul>
            <p class="text-body-2 cra-prose">
              Qué mirar en la cláusula de reajuste antes de firmar está en
              <NuxtLink
                :to="localePath('/guias/que-revisar-antes-de-firmar-alquiler')"
                class="cu-link"
              >
                qué revisar antes de firmar </NuxtLink
              >. Cuánto vale hoy la unidad que muchos contratos pactan, en
              <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
                Unidad Reajustable </NuxtLink
              >. Y las demás páginas del tema, en
              <NuxtLink :to="localePath('/temas/alquiler-y-vivienda-uruguay')" class="cu-link">
                Alquilar en Uruguay </NuxtLink
              >.
            </p>
          </section>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import {
  LATEST_RENT_ADJUSTMENT,
  RENT_ADJUSTMENT_MONTHS,
  RENT_ADJUSTMENT_PATH,
  RENT_ADJUSTMENT_VERIFIED_AT,
  adjustedRent,
  formatRentAdjustmentCoefficient,
  formatRentAdjustmentPercent,
  rentAdjustmentFor,
} from '~/utils/rentAdjustment'

const localePath = useLocalePath()

const latest = LATEST_RENT_ADJUSTMENT
const latestCoefficient = formatRentAdjustmentCoefficient(latest.coefficient)
const latestPercent = formatRentAdjustmentPercent(latest.coefficient)

const months = RENT_ADJUSTMENT_MONTHS.map(entry => ({
  month: entry.month,
  label: entry.label,
  coefficient: formatRentAdjustmentCoefficient(entry.coefficient),
  percent: formatRentAdjustmentPercent(entry.coefficient),
  decree: entry.decree,
  decreeUrl: entry.decreeUrl,
}))

// El más bajo y el más alto salen de la serie, no de una frase escrita a mano: con el mes que viene
// adentro, un «el de abril fue el más bajo» quedaría falso sin que nada avise.
const byCoefficient = [...RENT_ADJUSTMENT_MONTHS].sort((a, b) => a.coefficient - b.coefficient)
const lowest = byCoefficient[0]!
const highest = byCoefficient[byCoefficient.length - 1]!
const lowestPercent = formatRentAdjustmentPercent(lowest.coefficient)
const highestPercent = formatRentAdjustmentPercent(highest.coefficient)

const monthItems = RENT_ADJUSTMENT_MONTHS.map(entry => ({
  title: entry.label,
  value: entry.month,
}))

const rentInput = ref('')
const selectedMonth = ref(latest.month)

const selected = computed(() => rentAdjustmentFor(selectedMonth.value) ?? latest)
const selectedCoefficient = computed(() =>
  formatRentAdjustmentCoefficient(selected.value.coefficient)
)
const rentValue = computed(() => Number(rentInput.value))
const result = computed(() => adjustedRent(rentValue.value, selected.value.coefficient))

const money = (n: number) =>
  n.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const displayDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedDisplay = displayDate(RENT_ADJUSTMENT_VERIFIED_AT)

const faqs = [
  {
    question: '¿El propietario puede aumentarme el alquiler más que el coeficiente?',
    answer:
      'El coeficiente del artículo 15 es el reajuste legal. Si tu contrato pactó aumentos anuales mayores, el artículo 3 del Decreto-Ley 14.219 te habilita a optar por pagar el reajuste del coeficiente, una sola vez en el contrato, dentro de los quince días corridos de su publicación en el Diario Oficial y avisando por telegrama colacionado.',
  },
  {
    question: '¿Cada cuánto se reajusta el alquiler?',
    answer:
      'El artículo 15 dice que los precios reajustados rigen por doce meses y entran en vigencia el primer día del mes siguiente al del reajuste. Por eso el reajuste es anual y cae en el mes aniversario del contrato.',
  },
  {
    question: '¿La URA es lo mismo que la Unidad Reajustable?',
    answer:
      'No. El artículo 14 define la Unidad Reajustable de Alquileres como el promedio del valor de la Unidad Reajustable de un mes con el de los dos meses anteriores, y le pone el nombre del más reciente de los tres. Por eso la URA y la UR del mismo mes no coinciden.',
  },
  {
    question: '¿Qué pasa si el coeficiente de mi mes todavía no se publicó?',
    answer:
      'El artículo 15 manda aplicar un coeficiente provisorio —el que surja de la Contaduría General de la Nación o, en su defecto, el del reajuste del mes anterior— y corregirlo cuando el Poder Ejecutivo publique las cifras oficiales. El coeficiente de enero de 2026 se publicó el 5 de febrero de 2026.',
  },
]

const sources = [
  {
    label: 'Decreto-Ley 14.219, artículo 15 (reajuste y publicación del coeficiente) — IMPO',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974/15',
  },
  {
    label: 'Decreto-Ley 14.219, artículo 14 (UR, URA e IPC) — IMPO',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974/14',
  },
  {
    label: 'Decreto-Ley 14.219, artículo 3 (la opción del arrendatario) — IMPO',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974/3',
  },
  {
    label: `Decreto ${latest.decree}, el último coeficiente publicado — IMPO`,
    url: latest.decreeUrl,
  },
  {
    label: 'Tabla oficial de valores de UR, URA y CRA — IMPO',
    url: 'https://www.impo.com.uy/valores',
  },
]

const canonicalUrl = `https://cambio-uruguay.com${RENT_ADJUSTMENT_PATH}`

// El título y la descripción van como literales EN LA PÁGINA, que es la forma que leen
// `seoTitleBudget.test.ts` y `seoDescriptionBudget.test.ts` sin ejecutar la app: una cadena armada
// desde el catálogo sale del control de los 60 y los 155 caracteres y del de snippets repetidos.
// Que no se despeguen del último decreto lo vigila `rentAdjustment.test.ts`, que es lo que impide
// que el literal envejezca en silencio cuando se suma el mes siguiente.
const title = 'Reajuste de alquileres: octubre, 4,68 %'
const description =
  'Los alquileres que se actualizan en octubre de 2026 suben 4,68 % por el coeficiente legal 1,0468 (Decreto 256/026). Los 10 meses de 2026 y su decreto.'

defineOgImageComponent('Cambio', {
  title: 'Reajuste de alquileres',
  subtitle: 'El coeficiente legal, mes por mes',
  tag: 'ALQUILER',
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
        'coeficiente de reajuste de alquileres, cra alquileres uruguay, reajuste de alquiler uruguay, aumento de alquiler uruguay, unidad reajustable de alquileres, ura uruguay, decreto ley 14219 articulo 15',
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
                name: 'Alquilar en Uruguay',
                item: 'https://cambio-uruguay.com/temas/alquiler-y-vivienda-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Coeficiente de reajuste de alquileres',
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
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Vuetify 4 no anula el margen de los bloques de texto, así que cada párrafo y cada lista declara
   el suyo: dentro de una caja con padding el 1em del navegador no colapsa y se ve como un hueco. */
.cra-lead {
  margin-top: 0;
  margin-bottom: 0;
  max-width: 68ch;
}

.cra-prose {
  margin-top: 16px;
  margin-bottom: 0;
  max-width: 68ch;
}

.cra-result {
  margin-bottom: 0;
}

.cra-list {
  margin-top: 12px;
  margin-bottom: 0;
  padding-left: 1.25rem;
  max-width: 68ch;
}

.cra-list li + li {
  margin-top: 8px;
}

.table-scroll {
  margin-top: 16px;
  overflow-x: auto;
}

.cra-table {
  width: 100%;
  border-collapse: collapse;
}

.cra-table th,
.cra-table td {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  text-align: left;
}

.cra-table th {
  font-weight: 600;
  white-space: nowrap;
}
</style>
