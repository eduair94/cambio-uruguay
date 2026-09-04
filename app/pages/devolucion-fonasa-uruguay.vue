<template>
  <VContainer class="fonasa-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SALUD Y APORTES</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Devolución de FONASA: quién cobra, cuánto y cuándo
      </h1>
      <p class="lead mb-6">
        Una vez por año el BPS compara lo que aportaste al FONASA con un tope, y si lo pasaste te
        devuelve la diferencia. Por el ejercicio {{ latest.year }} le tocó a
        <strong>{{ people }} personas</strong> y se pagaron
        <strong>{{ totalMillones }} millones de pesos</strong> a partir del {{ paidFrom }}. Acá
        están la cuenta exacta, por qué el «sueldo desde el que te devuelven» no es una regla fija,
        y el cambio de metodología que recién se va a notar en {{ METHODOLOGY_FIRST_IMPACT_YEAR }}.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-information-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo que casi todo el mundo entiende mal</div>
            <p class="mb-0">
              El tope no es un umbral de sueldo: es la suma del costo de tu cobertura de salud más
              un 25 %. Los $ {{ money(latest.workerThreshold) }} que publica el BPS son el sueldo
              desde el que te devuelven <em>si estás solo y tuviste cobertura los doce meses</em>.
              Con hijos o cónyuge a cargo tu tope es más alto, así que podés ganar bastante más y no
              tener devolución.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- La cuenta -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">La cuenta, en una línea</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        El artículo 3 de la Ley 18.731 manda comparar, al 31 de diciembre de cada año, tus aportes
        personales al FONASA del año civil contra el costo promedio equivalente (CPE) de tu
        cobertura incrementado en un 25 %. Lo que aportaste de más es el excedente, y ese excedente
        se devuelve.
      </p>

      <VCard variant="flat" class="formula-card pa-5 pa-md-6">
        <div class="formula">
          <span class="term">CPE mensual</span>
          <span class="op">×</span>
          <span class="term">meses con cobertura</span>
          <span class="op">×</span>
          <span class="term">cuántas personas cubrís</span>
          <span class="op">×</span>
          <span class="term is-law">1,25</span>
          <span class="op">=</span>
          <span class="term is-result">tu tope anual</span>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-3 mt-4">
          El CPE mensual vale $ {{ money(CPE_MONTHLY) }} desde el 1.º de enero de 2026 (artículo 18
          del Decreto 317/025). El 1,25 lo pone la ley, no el BPS.
        </p>
        <!-- El valor NO queda fijo hasta enero: se mueve con cada ajuste de cuotas salud. -->
        <VAlert type="info" variant="tonal" density="compact" class="mb-0">
          <span class="text-body-2">{{ CPE_ADJUSTMENT_RULE }}</span>
        </VAlert>
      </VCard>
    </section>

    <!-- Calculadora -->
    <section id="calcular" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Calculá tu tope y tu excedente</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Con el CPE del ejercicio {{ CPE_EXERCISE }}, o sea la devolución que se cobra en
        {{ CPE_EXERCISE + 1 }}. El aporte personal al FONASA figura en tu recibo de sueldo como
        descuento por FONASA: sumá los doce meses del año.
      </p>

      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="form-card pa-5">
            <VTextField
              v-model.number="contributions"
              type="number"
              label="Lo que aportaste al FONASA en el año"
              min="0"
              prefix="$"
              density="comfortable"
              variant="outlined"
              class="mb-4"
            />
            <VSelect
              v-model="months"
              :items="MONTH_OPTIONS"
              label="Meses con cobertura en el año"
              density="comfortable"
              variant="outlined"
              class="mb-4"
            />
            <div class="text-overline mb-2">A quién le das cobertura</div>
            <VSwitch
              v-model="spouse"
              color="primary"
              density="comfortable"
              hide-details
              label="Cónyuge o concubino/a"
              class="mb-1"
            />
            <VTextField
              v-model.number="children"
              type="number"
              label="Hijos a cargo (cobertura compartida)"
              min="0"
              max="10"
              density="comfortable"
              variant="outlined"
              hide-details
              class="mt-3"
            />
            <p class="text-caption text-medium-emphasis mb-0 mt-3">
              Cada hijo suma medio CPE cuando los dos padres le dan cobertura: el BPS lo reparte en
              partes iguales entre quienes generan el beneficio. Si lo cubrís sólo vos, contá dos
              por cada hijo.
            </p>
          </VCard>
        </VCol>

        <VCol cols="12" md="7">
          <VCard
            variant="flat"
            class="verdict-card pa-5 h-100"
            :class="{ 'is-ok': refund.net > 0 }"
          >
            <div class="text-overline mb-2">Tu tope anual</div>
            <p class="text-h6 font-weight-bold mb-3">
              <template v-if="refund.net > 0"> Cobrarías {{ money(refund.net) }} netos. </template>
              <template v-else-if="refund.shortfall > 0">
                No llegás al tope por {{ money(refund.shortfall) }}.
              </template>
              <template v-else> Justo en el tope: no hay excedente. </template>
            </p>
            <VTable class="cu-mobile-cards mb-3" density="comfortable">
              <tbody>
                <tr>
                  <td data-label="Concepto">
                    Tope anual ({{ cpeUnits.toLocaleString('es-UY') }} CPE × {{ months }} meses ×
                    1,25)
                  </td>
                  <td data-label="Monto" class="text-right font-weight-medium">
                    {{ money(cap) }}
                  </td>
                </tr>
                <tr>
                  <td data-label="Concepto">Lo que aportaste</td>
                  <td data-label="Monto" class="text-right">{{ money(contributionsSafe) }}</td>
                </tr>
                <tr>
                  <td data-label="Concepto">Excedente bruto</td>
                  <td data-label="Monto" class="text-right">{{ money(refund.excess) }}</td>
                </tr>
                <tr>
                  <td data-label="Concepto">Retención de IRPF ({{ IRPF_RETENTION_PCT }} %)</td>
                  <td data-label="Monto" class="text-right">−{{ money(refund.retention) }}</td>
                </tr>
              </tbody>
            </VTable>
            <p class="mb-0 text-medium-emphasis text-body-2">
              Es una estimación con el CPE vigente. El monto que vale es el que el BPS publica en
              «Consultar detalle de devolución Fonasa», que además ajusta por los meses exactos de
              cobertura de cada persona a cargo.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Cómo se cobra -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Cómo se cobra, paso a paso</h2>
      <VRow>
        <VCol v-for="s in FONASA_STEPS" :key="s.n" cols="12" md="6">
          <VCard variant="flat" class="step-card pa-5 h-100">
            <div class="step-n">{{ s.n }}</div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ s.title }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ s.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Cifras oficiales -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El último ejercicio con cifras oficiales</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Los umbrales del ejercicio {{ latest.year + 1 }} todavía no están publicados. Cuando el BPS
        los anuncie —normalmente a comienzos de setiembre, junto con la habilitación de las
        consultas— entran acá. Mientras tanto, esto es lo último confirmado.
      </p>
      <VCard variant="flat" class="results-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Ejercicio</th>
              <th>Se pagó desde</th>
              <th>Personas</th>
              <th>Total devuelto</th>
              <th>Promedio mensual desde el que hubo devolución</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in FONASA_EXERCISES" :key="e.year">
              <td data-label="Ejercicio" class="font-weight-medium">{{ e.year }}</td>
              <td data-label="Se pagó desde">{{ longDate(e.paidFrom) }}</td>
              <td data-label="Personas">+{{ e.people.toLocaleString('es-UY') }}</td>
              <td data-label="Total devuelto">
                {{ Math.round(e.totalPesos / 1_000_000).toLocaleString('es-UY') }} millones
              </td>
              <td data-label="Promedio mensual" class="cu-cell-prose text-medium-emphasis">
                Trabajadores: $ {{ money(e.workerThreshold) }} · Jubilados y pensionistas: $
                {{ money(e.retireeThreshold) }} (valores nominales)
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </section>

    <!-- El cambio de metodología -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        El cambio del CPE que se nota recién en {{ METHODOLOGY_FIRST_IMPACT_YEAR }}
      </h2>
      <VCard variant="flat" class="path-card pa-5 pa-md-6">
        <p class="mb-3">
          El Decreto 317/025 hizo dos cosas en el mismo texto. El artículo 18 fijó el CPE en $
          {{ money(CPE_MONTHLY) }} desde el 1.º de enero de 2026. El artículo 17 sustituyó la
          metodología con la que se calcula: pasó a usar curvas de supervivencia en lugar de una
          única edad de expectativa de vida, y para los mayores de 18 años promedia la cápita de los
          18 años previos en vez de suponer cobertura desde el nacimiento —el Seguro Nacional de
          Salud arrancó en enero de 2008, así que nadie mayor de esa edad estuvo cubierto desde que
          nació—.
        </p>
        <p class="mb-0">
          El MEF aclaró el punto que más confusión generó: el cambio de metodología
          <strong>no toca la devolución que se paga en 2026</strong>, porque esa se calcula sobre el
          ejercicio anterior. Recién impacta en la de {{ METHODOLOGY_FIRST_IMPACT_YEAR }}.
        </p>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in FONASA_FAQ" :key="f.question">
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
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/cambiar-de-mutualista-uruguay')" variant="tonal" size="small">
          Cambiar de mutualista
        </VBtn>
        <VBtn :to="localePath('/declaracion-de-irpf-uruguay')" variant="tonal" size="small">
          La declaración de IRPF
        </VBtn>
        <VBtn
          :to="localePath('/herramientas/calculadora-sueldo-liquido')"
          variant="tonal"
          size="small"
        >
          Calculadora de sueldo líquido
        </VBtn>
        <VBtn :to="localePath('/desvincularme-de-la-afap-uruguay')" variant="tonal" size="small">
          Desvincularme de una AFAP
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Contrastado el {{ verifiedAt }}. Esta página es informativa: el monto que vale es el que
        resuelve y publica el BPS.
      </p>
      <ul class="sources-list">
        <li v-for="s in FONASA_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  CPE_EXERCISE,
  CPE_ADJUSTMENT_RULE,
  CPE_MONTHLY,
  FONASA_EXERCISES,
  FONASA_FAQ,
  FONASA_SOURCES,
  FONASA_STEPS,
  FONASA_VERIFIED_AT,
  IRPF_RETENTION_PCT,
  LATEST_EXERCISE,
  METHODOLOGY_FIRST_IMPACT_YEAR,
  annualCap,
  estimateRefund,
} from '~/utils/fonasaRefund'

const localePath = useLocalePath()

const latest = LATEST_EXERCISE

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1)

const contributions = ref(60000)
const months = ref(12)
const spouse = ref(false)
const children = ref(0)

const contributionsSafe = computed(() =>
  Number.isFinite(contributions.value) ? Math.max(0, contributions.value) : 0
)

/** 1 CPE por vos, +1 por el cónyuge, +0,5 por cada hijo con cobertura compartida. */
const cpeUnits = computed(() => {
  const kids = Number.isFinite(children.value) ? Math.min(10, Math.max(0, children.value)) : 0
  return 1 + (spouse.value ? 1 : 0) + kids * 0.5
})

const cap = computed(() =>
  annualCap({ cpeMonthly: CPE_MONTHLY, months: months.value, cpeUnits: cpeUnits.value })
)

const refund = computed(() =>
  estimateRefund({ contributions: contributionsSafe.value, cap: cap.value })
)

const moneyFmt = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 })
const money = (n: number) => moneyFmt.format(Math.round(n))

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = longDate(FONASA_VERIFIED_AT)
const paidFrom = longDate(latest.paidFrom)
const people = computed(() => latest.people.toLocaleString('es-UY'))
const totalMillones = Math.round(latest.totalPesos / 1_000_000).toLocaleString('es-UY')

const canonicalUrl = 'https://cambio-uruguay.com/devolucion-fonasa-uruguay'
const title = 'Devolución de FONASA: quién cobra, cuánto y cuándo'
const description = `Por ${latest.year} el BPS devolvió ${totalMillones} millones a ${latest.people.toLocaleString('es-UY')} personas. Cobrás si tu promedio mensual pasó $ ${money(latest.workerThreshold)} ($ ${money(latest.retireeThreshold)} jubilados). Calculá tu tope con el CPE de $ ${money(CPE_MONTHLY)}.`

defineOgImageComponent('Cambio', {
  title: 'Devolución de FONASA',
  subtitle: 'Quién cobra, cuánto y cuándo',
  tag: 'BPS',
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
        'devolucion fonasa, devolucion fonasa bps, cuando cobro la devolucion fonasa, estoy comprendido fonasa, excedente de aportes fonasa, tope anual fonasa, costo promedio equivalente cpe, cpe 2026, retencion irpf devolucion fonasa, devolucion fonasa jubilados, ley 18731 articulo 3, decreto 317/025',
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
                name: 'Devolución de FONASA',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: FONASA_FAQ.map(f => ({
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
.fonasa-page {
  max-width: 1180px;
}
.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  margin-top: 0;
}
.warn-card,
.form-card,
.verdict-card,
.step-card,
.path-card,
.results-card,
.formula-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  background: rgba(var(--v-theme-surface), 1);
}
.warn-card {
  background: rgba(var(--v-theme-primary), 0.06);
}
.verdict-card.is-ok {
  background: rgba(22, 199, 132, 0.08);
}
.step-card {
  position: relative;
  padding-top: 26px;
}
.step-n {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 6px;
}
.formula {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.formula .term {
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 10px;
  padding: 6px 12px;
  font-weight: 600;
}
.formula .term.is-law {
  border-color: rgba(var(--v-theme-primary), 0.5);
  color: rgb(var(--v-theme-primary));
}
.formula .term.is-result {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: transparent;
}
.formula .op {
  font-weight: 700;
  opacity: 0.55;
}
.sources-list {
  margin-top: 0;
  padding-left: 1.1rem;
}
.sources-list li {
  margin-bottom: 6px;
}
.sources-list a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.sources-list a:hover {
  text-decoration: underline;
}
.step-card p,
.path-card p,
.warn-card p {
  margin-top: 0;
}
.path-card p + p {
  margin-top: 12px;
}
</style>
