<template>
  <VContainer class="usd-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">DÓLAR</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Cobrás en dólares y gastás en pesos: ¿dejás que convierta el banco?
      </h1>
      <p class="lead mb-6">
        Es la pregunta de todo el que cobra afuera y vive acá, y casi nunca se responde con números.
        Hay dos costos escondidos y van en direcciones opuestas: el
        <strong>tipo de cambio al que te liquida el banco</strong> cuando pagás con la tarjeta, y
        los <strong>{{ IVA_DEBITO_PUNTOS }} puntos de IVA</strong> que solo te da el débito.
      </p>

      <VCard class="honest-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-2">Antes que nada, una aclaración</div>
        <p class="mb-0">
          No vas a encontrar acá una tabla con el spread de cada banco. Ninguno lo publica de forma
          estable, así que cualquier número sería inventado o quedaría viejo. Lo que sí hay es el
          método para <strong>medir el tuyo</strong>, que sale de tu propio estado de cuenta y es
          exacto.
        </p>
      </VCard>
    </header>

    <!-- Measure -->
    <section id="medir" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Paso 1: medí tu tipo de cambio real</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Buscá en tu estado de cuenta en dólares una compra que hiciste en pesos. Con esos dos
        importes alcanza.
      </p>

      <VRow class="mb-5">
        <VCol v-for="(s, i) in MEASURE_STEPS" :key="i" cols="12" md="4">
          <VCard variant="flat" class="step-card pa-5 h-100">
            <VIcon :icon="s.icon" color="primary" class="mb-2" />
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ s.title }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ s.detail }}</p>
          </VCard>
        </VCol>
      </VRow>

      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="form-card pa-5">
            <VTextField
              v-model.number="measure.uyuCharged"
              type="number"
              label="Pesos de esa compra"
              prefix="$"
              min="0"
              density="comfortable"
              variant="outlined"
              class="mb-4"
            />
            <VTextField
              v-model.number="measure.usdDebited"
              type="number"
              label="Dólares que te debitaron"
              prefix="US$"
              min="0"
              step="0.01"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCard>
        </VCol>
        <VCol cols="12" md="7">
          <VCard variant="flat" class="verdict-card pa-5 h-100 d-flex flex-column justify-center">
            <template v-if="measured !== null">
              <div class="text-overline mb-1">Tu tipo de cambio</div>
              <p class="big-n mb-2">$ {{ measured }}</p>
              <p v-if="spread !== null" class="mb-0 text-medium-emphasis">
                <template v-if="spread > 0">
                  Está <strong>{{ spread }} %</strong> por debajo del tipo de venta que pusiste
                  abajo. Esa es la parte que te cuesta no hacer nada.
                </template>
                <template v-else-if="spread < 0">
                  Está por encima del tipo de venta que pusiste abajo: en ese caso, la tarjeta te
                  está conviniendo.
                </template>
                <template v-else> Coincide con el tipo de venta que pusiste abajo. </template>
              </p>
            </template>
            <template v-else>
              <p class="mb-0 text-medium-emphasis">
                Completá los dos importes y te decimos a qué tipo de cambio te liquidó el banco.
              </p>
            </template>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Compare -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Paso 2: compará las tres rutas</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Sobre el mismo gasto mensual en pesos, cuántos dólares te consume cada camino.
      </p>

      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="form-card pa-5">
            <VTextField
              v-model.number="form.monthlySpendUyu"
              type="number"
              label="Gasto mensual en pesos"
              prefix="$"
              min="0"
              density="comfortable"
              variant="outlined"
              class="mb-4"
            />
            <VTextField
              v-model.number="form.bankRate"
              type="number"
              label="Tipo de cambio de tu banco"
              prefix="$"
              min="0"
              step="0.01"
              density="comfortable"
              variant="outlined"
              hint="El que mediste arriba."
              persistent-hint
              class="mb-4"
            />
            <VTextField
              v-model.number="form.bestSellRate"
              type="number"
              label="Mejor tipo de venta que conseguís"
              prefix="$"
              min="0"
              step="0.01"
              density="comfortable"
              variant="outlined"
              hint="Mirá el comparador del sitio."
              persistent-hint
            />
          </VCard>
        </VCol>

        <VCol cols="12" md="7">
          <VCard variant="flat" class="verdict-card pa-5 mb-4" :class="{ 'is-win': saves }">
            <div class="text-overline mb-2">Tu resultado</div>
            <p class="text-h6 font-weight-bold mb-2">
              <template v-if="saves">
                Te conviene «{{ verdict.best.label.toLowerCase() }}»: ahorrás US$
                {{ verdict.annualUsdSaved }} por año.
              </template>
              <template v-else>
                Con estos números, dejar que convierta el banco no te está saliendo caro.
              </template>
            </p>
            <p class="mb-0 text-medium-emphasis">{{ verdict.best.why }}</p>
          </VCard>

          <VCard variant="flat" class="results-card pa-0">
            <VTable class="cu-mobile-cards" density="comfortable">
              <thead>
                <tr>
                  <th>Ruta</th>
                  <th class="text-right">Te cuesta</th>
                  <th class="text-right">Dólares por mes</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in verdict.routes"
                  :key="r.id"
                  :class="{ 'is-best': r.id === verdict.best.id && saves }"
                >
                  <td data-label="Ruta">
                    <div class="font-weight-medium">{{ r.label }}</div>
                    <div class="text-caption text-medium-emphasis">{{ r.why }}</div>
                  </td>
                  <td data-label="Te cuesta" class="text-right">
                    {{ formatUYU(r.effectiveCost) }}
                  </td>
                  <td data-label="Dólares por mes" class="text-right">
                    <strong>US$ {{ r.usdNeeded }}</strong>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
          <p class="text-caption text-medium-emphasis mt-2 mb-0">
            No incluye comisiones de la casa de cambio ni costos de la tarjeta: varían por
            institución y el sitio los trata en sus propias páginas.
          </p>
        </VCol>
      </VRow>
    </section>

    <!-- IVA -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El detalle que casi todos calculan mal</h2>
      <VCard variant="flat" class="highlight-card pa-5 pa-md-6">
        <p class="mb-2">
          La Ley 19.210 le saca {{ IVA_DEBITO_PUNTOS }} puntos de IVA a las compras con débito o
          dinero electrónico. Pero <strong>dos puntos sobre 22 no son «2 % más barato»</strong>:
        </p>
        <p class="formula mb-2">2 ÷ 122 = {{ (ivaDebitoFrac() * 100).toFixed(2) }} %</p>
        <p class="mb-0 text-medium-emphasis">
          Ese es el descuento real sobre el precio con IVA incluido. La tarjeta de crédito no lo
          tiene, ni pagando en una sola cuota.
        </p>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in SPENDING_FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <div>
              <div class="font-weight-medium">{{ f.question }}</div>
              <div class="text-caption text-medium-emphasis">{{ f.short }}</div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ f.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Related -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Para conseguir el mejor tipo de cambio</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/')" variant="tonal" size="small">Comparador de cotizaciones</VBtn>
        <VBtn :to="localePath('/mejor-casa-de-cambio')" variant="tonal" size="small">
          Mejor casa de cambio
        </VBtn>
        <VBtn :to="localePath('/herramientas/calculadora-spread')" variant="tonal" size="small">
          Calculadora de spread
        </VBtn>
        <VBtn :to="localePath('/tarjetas-de-debito-uruguay')" variant="tonal" size="small">
          Tarjetas de débito y sus comisiones
        </VBtn>
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { formatUYU } from '~/utils/format'
import {
  IVA_DEBITO_PUNTOS,
  MEASURE_STEPS,
  SPENDING_FAQ,
  impliedRate,
  ivaDebitoFrac,
  usdRoutesVerdict,
  spreadVsMarket,
} from '~/utils/usdSpending'

const localePath = useLocalePath()

const measure = reactive({ uyuCharged: 3800, usdDebited: 100 })
const form = reactive({ monthlySpendUyu: 80000, bankRate: 38, bestSellRate: 40 })

const measured = computed(() => impliedRate(measure))
const spread = computed(() =>
  measured.value === null ? null : spreadVsMarket(measured.value, sane.value.bestSellRate)
)

/** Un campo numérico vacío es NaN, no 0: el motor nunca debe recibirlo. */
const sane = computed(() => ({
  monthlySpendUyu: Number.isFinite(form.monthlySpendUyu) ? Math.max(0, form.monthlySpendUyu) : 0,
  bankRate: Number.isFinite(form.bankRate) ? Math.max(0, form.bankRate) : 0,
  bestSellRate: Number.isFinite(form.bestSellRate) ? Math.max(0, form.bestSellRate) : 0,
}))

const verdict = computed(() => usdRoutesVerdict(sane.value))
const saves = computed(() => verdict.value.annualUsdSaved > 0)

const canonicalUrl = 'https://cambio-uruguay.com/cobrar-en-dolares-gastar-en-pesos'
const title = 'Cobrás en dólares y gastás en pesos: ¿conviene que convierta el banco?'
const description =
  'Cómo medir el tipo de cambio real que te aplica tu banco con tu propio estado de cuenta, y comparar las tres rutas: pagar con la tarjeta en dólares, vender los dólares y pagar con débito, o vender y pagar con crédito. Incluye la rebaja de IVA de la Ley 19.210, que son 1,64 % sobre el precio final y no 2 %.'

defineOgImageComponent('Cambio', {
  title: 'Cobrás en dólares, gastás en pesos',
  subtitle: '¿Conviene que convierta el banco?',
  tag: 'DÓLAR',
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
        'cobro en dolares gasto en pesos, tipo de cambio del banco tarjeta, spread del banco uruguay, conviene vender dolares o pagar con tarjeta, rebaja de iva debito ley 19210, 1,64 por ciento iva debito, freelance cobra en dolares uruguay, cambiar dolares a pesos conviene',
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
                name: 'Cobrar en dólares y gastar en pesos',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: SPENDING_FAQ.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.usd-page {
  max-width: 1180px;
}
.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  color: rgba(255, 255, 255, 0.82);
}
.v-theme--light .lead {
  color: rgba(0, 0, 0, 0.76);
}

.honest-card,
.form-card,
.verdict-card,
.results-card,
.step-card,
.highlight-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .honest-card,
.v-theme--light .form-card,
.v-theme--light .verdict-card,
.v-theme--light .results-card,
.v-theme--light .step-card,
.v-theme--light .highlight-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.verdict-card.is-win {
  border-color: rgba(var(--v-theme-success), 0.55);
}
.highlight-card {
  border-color: rgba(var(--v-theme-primary), 0.45);
}

.big-n {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.formula {
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-primary));
}

.results-card :deep(tr.is-best) {
  background: rgba(var(--v-theme-success), 0.09);
}
</style>
