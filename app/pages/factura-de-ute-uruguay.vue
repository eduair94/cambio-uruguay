<template>
  <VContainer class="bills-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SERVICIOS DEL HOGAR</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Por qué te vino tan cara la factura de UTE?
      </h1>
      <p class="lead mb-6">
        Casi siempre la respuesta no es «aumentó la tarifa»: es que el consumo extra cae en un
        escalón que vale <strong>56 % más caro</strong> que el primero, y que hay dos cargos que
        pagás todos los meses aunque no prendas nada. Acá está la factura desarmada, el comparador
        de las tres tarifas residenciales con los precios del <strong>Decreto 339/025</strong>, y lo
        único que de verdad la baja.
      </p>

      <VCard class="mechanism-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-3">Los escalones de la Tarifa Residencial Simple</div>
        <div class="bracket-grid">
          <div v-for="(b, i) in simpleBrackets" :key="b.label" class="bracket-item">
            <div class="bracket-h">{{ b.label }}</div>
            <div class="bracket-n">$ {{ b.pricePerKwh }}</div>
            <p class="mb-0">
              <template v-if="i === 0">
                Los primeros 100 kWh siempre se pagan a este precio, consumas 100 o 900.
              </template>
              <template v-else-if="i === 1">
                {{ pctVsFirst(b.pricePerKwh) }} más caro que el primer tramo. Acá cae la mayor parte
                de una casa común.
              </template>
              <template v-else>
                {{ pctVsFirst(b.pricePerKwh) }} más caro que el primer tramo. Es el escalón del
                invierno con termotanque y estufas.
              </template>
            </p>
          </div>
        </div>
        <VAlert type="info" variant="tonal" density="comfortable" class="mt-5 mb-0">
          Los escalones son <strong>progresivos, como el IRPF</strong>. Pasar de 600 kWh no reprecia
          todo tu consumo: sólo el excedente. Pero como el kWh del último tramo vale mucho más,
          <strong>duplicar el consumo aumenta la factura más del doble</strong>.
        </VAlert>
      </VCard>
    </header>

    <!-- Comparator -->
    <section id="comparador" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Qué tarifa te conviene?</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Todos arrancan en Tarifa Residencial Simple: nadie está en doble o triple horario sin
        haberlo pedido. Poné tu consumo real (está en la factura, en kWh) y cuánto de eso cae en las
        4 horas de punta.
      </p>

      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="form-card pa-5">
            <VTextField
              v-model.number="form.kwh"
              type="number"
              label="Consumo del mes (kWh)"
              suffix="kWh"
              min="0"
              density="comfortable"
              variant="outlined"
              hint="Lo dice tu factura de UTE."
              persistent-hint
              class="mb-4"
            />
            <VSelect
              v-model.number="form.potenciaKw"
              :items="POTENCIA_OPTIONS"
              label="Potencia contratada"
              suffix="kW"
              density="comfortable"
              variant="outlined"
              hint="También está en la factura. Se paga por kW aunque no la uses."
              persistent-hint
              class="mb-5"
            />
            <div class="mb-2 d-flex justify-space-between align-baseline">
              <span class="text-body-2">Consumo en la punta</span>
              <strong>{{ form.puntaPct }} %</strong>
            </div>
            <VSlider
              v-model="form.puntaPct"
              :min="0"
              :max="60"
              :step="1"
              color="warning"
              thumb-label
              class="mb-1"
            />
            <p class="text-caption text-medium-emphasis mb-5">
              La punta son 4 h × ~22 días hábiles ≈ 12 % de las horas del mes. Un hogar que no hace
              nada especial suele caer entre 15 % y 25 %.
            </p>
            <div class="mb-2 d-flex justify-space-between align-baseline">
              <span class="text-body-2">Consumo en el valle (00 a 07)</span>
              <strong>{{ form.vallePct }} %</strong>
            </div>
            <VSlider
              v-model="form.vallePct"
              :min="0"
              :max="80"
              :step="1"
              color="success"
              thumb-label
            />
            <p class="text-caption text-medium-emphasis mb-0">
              Sólo cuenta en la Triple Horario. Es lo que podés correr a la madrugada con
              temporizador.
            </p>
          </VCard>
        </VCol>

        <VCol cols="12" md="7">
          <VCard variant="flat" class="verdict-card pa-5 mb-4" :class="{ 'is-win': saves }">
            <div class="text-overline mb-2">Tu resultado</div>
            <p class="text-h6 font-weight-bold mb-2">
              <template v-if="saves">
                Te conviene {{ comparison.best.tariff.shortName }}: ahorrás
                {{ formatUYU(comparison.annualSavingVsSimple) }} por año.
              </template>
              <template v-else> Con este consumo te conviene quedarte en la Simple. </template>
            </p>
            <p class="mb-0 text-medium-emphasis">
              <template v-if="saves">
                Son {{ formatUYU(monthlySaving) }} por mes contra la Simple, con el mismo consumo.
                Cambiar de tarifa se pide al 0800 1930 y el medidor lo pone UTE.
              </template>
              <template v-else>
                Con {{ form.puntaPct }} % del consumo en la punta, el kWh caro de las tarifas
                horarias y su cargo fijo más alto se comen la ventaja. Bajá el consumo de punta y
                volvé a mirar.
              </template>
            </p>
          </VCard>

          <VCard variant="flat" class="results-card pa-0">
            <VTable class="cu-mobile-cards" density="comfortable">
              <thead>
                <tr>
                  <th>Tarifa</th>
                  <th class="text-right">Factura del mes</th>
                  <th class="text-right">Costo real del kWh</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in comparison.results"
                  :key="r.tariff.id"
                  :class="{ 'is-best': r.tariff.id === comparison.best.tariff.id && saves }"
                >
                  <td data-label="Tarifa">
                    <div class="font-weight-medium">{{ r.tariff.shortName }}</div>
                    <div class="text-caption text-medium-emphasis">{{ r.tariff.bestFor }}</div>
                    <div v-if="r.ineligibleReason" class="text-caption text-warning mt-1">
                      {{ r.ineligibleReason }}
                    </div>
                  </td>
                  <td data-label="Factura del mes" class="text-right">
                    <strong v-if="!r.ineligibleReason">{{ formatUYU(r.total) }}</strong>
                    <span v-else class="text-medium-emphasis">—</span>
                  </td>
                  <td data-label="Costo real del kWh" class="text-right">
                    <span v-if="!r.ineligibleReason">$ {{ r.effectiveKwhCost }}</span>
                    <span v-else class="text-medium-emphasis">—</span>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
          <p class="text-caption text-medium-emphasis mt-2 mb-0">
            «Costo real del kWh» reparte el cargo fijo, la potencia y el IVA sobre los kWh que
            consumiste. Es el único número que se puede comparar entre tarifas.
          </p>
        </VCol>
      </VRow>
    </section>

    <!-- Bill anatomy -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Tu factura, renglón por renglón</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Con los datos que pusiste arriba, en
        <strong>{{ comparison.simple.tariff.name }}</strong
        >. Fijate en la última línea: <strong>el total no es el subtotal por 1,22</strong>, porque
        el cargo fijo residencial no lleva IVA.
      </p>
      <VCard variant="flat" class="results-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Cómo sale</th>
              <th class="text-right">IVA</th>
              <th class="text-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, i) in comparison.simple.lines" :key="i">
              <td data-label="Concepto">{{ l.label }}</td>
              <td data-label="Cómo sale" class="text-medium-emphasis text-caption">
                {{ l.detail || '—' }}
              </td>
              <td data-label="IVA" class="text-right">
                <VChip :color="l.taxed ? 'warning' : 'success'" size="x-small" variant="tonal">
                  {{ l.taxed ? 'gravado 22 %' : 'no gravado' }}
                </VChip>
              </td>
              <td data-label="Importe" class="text-right">{{ formatUYU(l.amount) }}</td>
            </tr>
            <tr class="subtotal-row">
              <td data-label="Concepto" colspan="3">IVA (22 % sobre lo gravado)</td>
              <td data-label="Importe" class="text-right">
                {{ formatUYU(comparison.simple.iva) }}
              </td>
            </tr>
            <tr class="total-row">
              <td data-label="Concepto" colspan="3"><strong>Total del mes</strong></td>
              <td data-label="Importe" class="text-right">
                <strong>{{ formatUYU(comparison.simple.total) }}</strong>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </section>

    <!-- Bands -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Las franjas horarias, sin vueltas</h2>
      <VRow>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="band-card pa-5 h-100 is-punta">
            <div class="band-h">Punta</div>
            <div class="band-n">$ {{ doble.bands?.punta }} <span>/kWh</span></div>
            <p class="mb-0 text-body-2">{{ UTE_BANDS.punta }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="band-card pa-5 h-100 is-llano">
            <div class="band-h">Fuera de punta / llano</div>
            <div class="band-n">
              $ {{ doble.bands?.llano }} <span>a $ {{ triple.bands?.llano }} /kWh</span>
            </div>
            <p class="mb-0 text-body-2">{{ UTE_BANDS.fueraDePunta }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="band-card pa-5 h-100 is-valle">
            <div class="band-h">Valle</div>
            <div class="band-n">$ {{ triple.bands?.valle }} <span>/kWh</span></div>
            <p class="mb-0 text-body-2">{{ UTE_BANDS.valle }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Levers -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que de verdad la baja</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Ordenado por plata ahorrada sobre esfuerzo. Cada una dice también cuándo
        <em>no</em> sirve.
      </p>
      <VRow>
        <VCol v-for="lever in UTE_LEVERS" :key="lever.title" cols="12" md="6">
          <VCard variant="flat" class="lever-card pa-5 h-100">
            <div class="d-flex align-start mb-3">
              <VIcon :icon="lever.icon" color="primary" class="mr-3 mt-1" />
              <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ lever.title }}</h3>
            </div>
            <p class="mb-2"><strong>Qué hacer:</strong> {{ lever.action }}</p>
            <p class="mb-2 text-medium-emphasis">{{ lever.effect }}</p>
            <p v-if="lever.caveat" class="mb-0 caveat">
              <VIcon icon="mdi-alert-outline" size="14" class="mr-1" />{{ lever.caveat }}
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Discount -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Te toca la bonificación del 40 %?</h2>
      <p class="text-medium-emphasis mb-4" style="max-width: 72ch">
        Es para jubilados del BPS que cobran prima por edad y para becarios del Fondo de
        Solidaridad. Con tus datos de arriba, las dos condiciones medibles dan así:
      </p>
      <VAlert
        :type="discount.eligible ? 'success' : 'warning'"
        variant="tonal"
        density="comfortable"
      >
        <ul class="mb-0 pl-4">
          <li v-for="(r, i) in discount.reasons" :key="i">{{ r }}</li>
        </ul>
      </VAlert>
    </section>

    <!-- Water -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Y el agua: el mismo metro cúbico se paga dos veces, pero no en todos lados igual
      </h2>
      <p class="mb-4" style="max-width: 72ch">
        El dato que casi nadie tiene presente:
        <strong
          >en los 18 departamentos donde OSE presta el saneamiento —todos menos Montevideo— el cargo
          variable del saneamiento es el 100 % del cargo variable del agua</strong
        >. Ahí cada metro cúbico se factura dos veces en la misma boleta, una como agua y otra como
        saneamiento, y hay dos cargos fijos: el de agua (según el diámetro de la conexión) y el del
        saneamiento de OSE, de {{ formatUYU(OSE_SANEAMIENTO_FIXED) }} por unidad y por mes.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" class="mb-5">
        <strong>Si vivís en Montevideo, ese renglón no está en tu factura de OSE.</strong> La Ley
        11.907 le encarga a OSE el alcantarillado «en todo el territorio de la República, excepto en
        el Departamento de Montevideo» (art. 2, lit. B): acá el saneamiento lo cobra la Intendencia,
        en una factura propia y con otra fórmula. Ni la regla del 100 % ni el cargo fijo de arriba
        se te aplican.
      </VAlert>
      <VCard variant="flat" class="results-card pa-0 mb-5">
        <div class="pa-4 pb-0 text-overline">Quién te cobra el saneamiento</div>
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Dónde</th>
              <th>Quién lo cobra</th>
              <th>Cómo llega</th>
              <th>Cómo se forma el cargo variable</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in SANEAMIENTO_AUTHORITIES" :key="a.scope">
              <td data-label="Dónde">
                <div class="font-weight-medium">{{ a.scope }}</div>
                <div class="text-caption text-medium-emphasis">{{ a.rule }}</div>
              </td>
              <td data-label="Quién lo cobra">{{ a.operator }}</td>
              <td data-label="Cómo llega">{{ a.billing }}</td>
              <td data-label="Cómo se forma el cargo variable">{{ a.variableCharge }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <p class="text-body-2 text-medium-emphasis mb-5" style="max-width: 72ch">
        Los cuadros que siguen son los de <strong>OSE</strong>: el agua es de OSE en todo el país,
        Montevideo incluido. Lo que cambia de un lado al otro es el saneamiento.
      </p>
      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="results-card pa-0 h-100">
            <div class="pa-4 pb-0 text-overline">Cargo fijo de agua, por conexión</div>
            <VTable class="cu-mobile-cards" density="comfortable">
              <tbody>
                <tr v-for="c in OSE_FIXED_CHARGES" :key="c.connection">
                  <td data-label="Conexión">{{ c.connection }}</td>
                  <td data-label="Cargo fijo" class="text-right">{{ formatUYU(c.amount) }}</td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="results-card pa-0 h-100">
            <div class="pa-4 pb-0 text-overline">Tramos de consumo</div>
            <VTable class="cu-mobile-cards" density="comfortable">
              <tbody>
                <tr v-for="b in OSE_BLOCKS" :key="b.label">
                  <td data-label="Tramo">{{ b.label }}</td>
                  <td data-label="Precio" class="text-right">
                    {{ formatUYU(b.amount) }}
                    <span class="text-caption text-medium-emphasis">{{
                      b.kind === 'perM3' ? '/m³' : 'del tramo'
                    }}</span>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>
      </VRow>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Los dos primeros tramos se facturan como importe del tramo y no por metro cúbico: por eso
        una casa que consume 3 m³ y una que consume 5 m³ pagan lo mismo. Hay además un cargo fijo
        adicional de {{ formatUYU(OSE_EXTRA_FIXED_OVER_15M3) }} por mes cuando el consumo anualizado
        supera los 15 m³.
      </p>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in BILLS_FAQ" :key="f.question">
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

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Precios vigentes desde el {{ effectiveFrom }}. Los precios y tramos de UTE y OSE se
        contrastaron el {{ verifiedAt }}; el bloque de preguntas y el alcance del saneamiento, el
        {{ faqVerifiedAt }}. Esta página es informativa: la factura que manda UTE u OSE es la que
        vale.
      </p>
      <ul class="sources-list">
        <li v-for="s in TARIFF_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import {
  BILLS_FAQ,
  BILLS_FAQ_VERIFIED_AT,
  BILLS_VERIFIED_AT,
  OSE_BLOCKS,
  OSE_EXTRA_FIXED_OVER_15M3,
  OSE_FIXED_CHARGES,
  OSE_SANEAMIENTO_FIXED,
  SANEAMIENTO_AUTHORITIES,
  TARIFFS_EFFECTIVE_FROM,
  TARIFF_SOURCES,
  UTE_BANDS,
  UTE_LEVERS,
  checkUteDiscount,
  compareUteTariffs,
  uteTariff,
  type UteBillInput,
} from '~/utils/householdBills'
import { formatUYU } from '~/utils/format'

/** Potencias monofásicas habituales en un hogar. El cambio entre ellas no tiene costo. */
const POTENCIA_OPTIONS = [1.4, 2.3, 3.5, 4.6, 5.7, 7, 9]

const form = reactive<UteBillInput>({
  kwh: 350,
  potenciaKw: 3.5,
  puntaPct: 20,
  vallePct: 0,
})

/** Un campo numérico vacío es NaN, no 0: el motor nunca debe recibirlo. */
const sane = computed<UteBillInput>(() => ({
  kwh: Number.isFinite(form.kwh) ? Math.max(0, form.kwh) : 0,
  potenciaKw: Number.isFinite(form.potenciaKw) ? Math.max(0, form.potenciaKw) : 3.5,
  puntaPct: Number.isFinite(form.puntaPct) ? form.puntaPct : 0,
  vallePct: Number.isFinite(form.vallePct) ? form.vallePct : 0,
}))

const comparison = computed(() => compareUteTariffs(sane.value))
const saves = computed(() => comparison.value.annualSavingVsSimple > 0)
const monthlySaving = computed(() => comparison.value.annualSavingVsSimple / 12)
const discount = computed(() => checkUteDiscount(sane.value))

const simple = uteTariff('simple')
const doble = uteTariff('doble')
const triple = uteTariff('triple')
const simpleBrackets = simple.brackets ?? []

const pctVsFirst = (price: number): string => {
  const first = simpleBrackets[0]?.pricePerKwh ?? price
  return `${Math.round((price / first - 1) * 100)} %`
}

const effectiveFrom = new Date(TARIFFS_EFFECTIVE_FROM).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const longDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = longDate(BILLS_VERIFIED_AT)
/**
 * Va aparte a propósito: el bloque de FAQ y el alcance del saneamiento se contrastaron un día
 * después que los tramos de UTE y OSE. Mostrar una sola fecha diría que se verificó todo junto.
 */
const faqVerifiedAt = longDate(BILLS_FAQ_VERIFIED_AT)

const canonicalUrl = 'https://cambio-uruguay.com/factura-de-ute-uruguay'
const title = 'Factura de UTE alta: por qué sube y qué tarifa te conviene'
/**
 * Ojo con el cierre: esta frase es lo que se ve en Google y al compartir, y una parte grande de la
 * audiencia está en Montevideo, donde el saneamiento no viene en la factura de OSE. Prometer ahí
 * «el saneamiento te cobra el agua dos veces» es exactamente el error que se corrigió en el h2.
 */
const description =
  'La factura de luz desarmada con los precios del Decreto 339/025: por qué el invierno la dispara (los escalones de la Tarifa Residencial Simple), qué renglón lleva IVA y cuál no, comparador de Simple vs Doble vs Triple Horario con tu consumo real, la bonificación del 40 % y quién te cobra el saneamiento (OSE en el interior; en Montevideo, la Intendencia).'

defineOgImageComponent('Cambio', {
  title: '¿Por qué te vino cara la factura de UTE?',
  subtitle: 'Comparador de tarifas residenciales 2026',
  tag: 'SERVICIOS',
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
        'factura ute alta, por que sube la factura de ute, tarifa residencial simple, doble horario ute, triple horario ute, escalones ute kwh, potencia contratada ute bajar, bonificacion 40 ute jubilados, ute estudiantes fondo de solidaridad, cargo fijo ute iva, ose saneamiento cargo variable, quien cobra el saneamiento en montevideo, tarifa ose 2026',
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
                name: 'Factura de UTE',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: BILLS_FAQ.map(f => ({
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
.bills-page {
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

.mechanism-card,
.form-card,
.verdict-card,
.results-card,
.lever-card,
.band-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .mechanism-card,
.v-theme--light .form-card,
.v-theme--light .verdict-card,
.v-theme--light .results-card,
.v-theme--light .lever-card,
.v-theme--light .band-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}

.bracket-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1.25rem;
}
.bracket-item {
  padding-left: 0.9rem;
  border-left: 3px solid rgb(var(--v-theme-primary));
}
.bracket-item:nth-child(2) {
  border-left-color: rgb(var(--v-theme-warning));
}
.bracket-item:nth-child(3) {
  border-left-color: rgb(var(--v-theme-error));
}
.bracket-h {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
}
.bracket-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
}

.verdict-card.is-win {
  border-color: rgba(var(--v-theme-success), 0.55);
}

.results-card :deep(tr.is-best) {
  background: rgba(var(--v-theme-success), 0.09);
}
.results-card :deep(tr.subtotal-row td),
.results-card :deep(tr.total-row td) {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.band-card {
  border-left-width: 3px;
}
.band-card.is-punta {
  border-left-color: rgb(var(--v-theme-error));
}
.band-card.is-llano {
  border-left-color: rgb(var(--v-theme-warning));
}
.band-card.is-valle {
  border-left-color: rgb(var(--v-theme-success));
}
.band-h {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
}
.band-n {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.band-n span {
  font-size: 0.85rem;
  font-weight: 400;
  opacity: 0.7;
}

.caveat {
  font-size: 0.84rem;
  opacity: 0.8;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
