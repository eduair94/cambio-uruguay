<template>
  <VContainer class="iass-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">JUBILACIONES</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        IASS: cuánto te descuentan de la jubilación
      </h1>
      <p class="lead mb-6">
        El IASS es el impuesto que grava jubilaciones y pensiones. Con la BPC en
        <strong>{{ pesos(bpc) }}</strong
        >, por debajo de <strong>{{ pesos(mniMonthly) }}</strong> por mes la pasividad
        <strong>no paga nada</strong>. Arriba de ese mínimo la escala es marginal —6 %, 24 % y 30
        %—, así que la tasa que te sale en la mano es siempre menor que la del tramo al que
        llegaste.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <p class="warn-title mb-2">Los 108 BPC que devuelve Google son del AÑO, no del mes</p>
            <p class="mb-0">
              El IASS es «un impuesto anual de carácter personal y directo» (Ley 18.314) y el BPS
              publica sus franjas en <strong>BPC anuales</strong>: 108, 180 y 600. La retención, en
              cambio, se hace mes a mes. Leer ese 108 como si fuera mensual deja el mínimo
              equivocado por un factor de doce: son <strong>{{ pesos(mniAnnual) }} al año</strong>,
              que mensualizados son <strong>{{ IASS_MNI_BPC_MONTHLY }} BPC</strong> ({{
                pesos(mniMonthly)
              }}).
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Calculadora -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto te retienen por mes</h2>
      <p class="section-intro mb-5">
        Poné la pasividad nominal del mes —lo que figura antes de los descuentos— y la cuenta se
        abre tramo por tramo. Es la retención del IASS y nada más: ni FONASA, ni cuota mutual, ni
        ningún otro descuento del recibo.
      </p>

      <VRow>
        <VCol cols="12" md="5">
          <VTextField
            v-model.number="pension"
            type="number"
            min="0"
            step="1000"
            label="Pasividad nominal del mes ($)"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <p class="text-caption text-medium-emphasis mt-3 mb-0">
            Si cobrás de más de un organismo, sumá todo: el impuesto mira el total, no cada
            pasividad por separado.
          </p>
        </VCol>

        <VCol cols="12" md="7">
          <VCard class="verdict-card pa-5 h-100" variant="flat">
            <p v-if="verdict.taxUyu === 0" class="verdict-none mb-0">
              <VIcon icon="mdi-check-circle-outline" color="success" class="mr-2" />
              No paga IASS: está por debajo del mínimo de
              <strong>{{ pesos(mniMonthly) }}</strong> por mes.
            </p>
            <template v-else>
              <p class="verdict-label mb-1">IASS del mes</p>
              <p class="verdict-amount mb-3">{{ pesos(verdict.taxUyu) }}</p>
              <div class="verdict-grid">
                <div>
                  <span class="vg-label">Queda en la mano</span>
                  <span class="vg-value">{{ pesos(verdict.netUyu) }}</span>
                </div>
                <div>
                  <span class="vg-label">Tasa efectiva</span>
                  <span class="vg-value">{{ pct(verdict.effectiveRatePct) }}</span>
                </div>
                <div>
                  <span class="vg-label">Tramo alcanzado</span>
                  <span class="vg-value">{{ pct(verdict.marginalRatePct) }}</span>
                </div>
              </div>
            </template>
          </VCard>
        </VCol>
      </VRow>

      <div v-if="verdict.shares.length > 1" class="mt-6">
        <h3 class="text-subtitle-1 font-weight-bold mb-3">De dónde sale ese número</h3>
        <VTable density="comfortable" class="iass-table cu-mobile-cards">
          <thead>
            <tr>
              <th>Tramo mensual</th>
              <th class="text-right">Parte de tu pasividad</th>
              <th class="text-right">Tasa</th>
              <th class="text-right">Impuesto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(share, i) in verdict.shares" :key="'s' + i">
              <td data-label="Tramo mensual">{{ bracketLabel(share.bracket) }}</td>
              <td class="text-right" data-label="Parte de tu pasividad">
                {{ pesos(share.baseUyu) }}
              </td>
              <td class="text-right" data-label="Tasa">{{ pct(share.bracket.ratePct) }}</td>
              <td class="text-right font-weight-bold" data-label="Impuesto">
                {{ pesos(share.taxUyu) }}
              </td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-caption text-medium-emphasis mt-3 mb-0">
          Cada peso paga la tasa de su propio tramo, no la del tramo más alto que alcanzaste. Por
          eso la tasa efectiva ({{ pct(verdict.effectiveRatePct) }}) es menor que el
          {{ pct(verdict.marginalRatePct) }} del último tramo.
        </p>
      </div>
    </section>

    <!-- La escala -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">La escala, al año y al mes</h2>
      <p class="section-intro mb-5">
        La misma escala en las dos unidades. La columna anual es la que publica el BPS; la mensual
        es esa misma dividida en doce, y es la que explica un recibo.
      </p>
      <VTable density="comfortable" class="iass-table cu-mobile-cards">
        <thead>
          <tr>
            <th>Ingreso anual</th>
            <th>Ingreso mensual</th>
            <th class="text-right">En pesos por mes</th>
            <th class="text-right">Tasa</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in scaleRows" :key="'b' + i">
            <td data-label="Ingreso anual">{{ row.annual }}</td>
            <td data-label="Ingreso mensual">{{ row.monthly }}</td>
            <td class="text-right" data-label="En pesos por mes">{{ row.pesos }}</td>
            <td class="text-right font-weight-bold" data-label="Tasa">{{ row.rate }}</td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-caption text-medium-emphasis mt-3 mb-4">
        Los tramos en BPC y las tasas salen de la ficha del BPS. Los pesos no están en la fuente:
        los calcula esta página con la BPC vigente ({{ pesos(bpc) }}), así que se mueven solos cada
        1.º de enero.
      </p>
      <VAlert
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mb-0"
        icon="mdi-file-alert-outline"
      >
        <strong>Si vas a verificar la primera franja, mirá qué texto estás leyendo.</strong> La
        redacción de la Ley 18.314 que indexan los buscadores dice
        <strong>{{ IASS_FIRST_BRACKET_NOTE.previousRatePct }} %</strong> en el primer tramo gravado,
        y no es un resumen mal hecho: es la ley, en su redacción anterior. La
        <strong>{{ IASS_FIRST_BRACKET_NOTE.amendedBy }}</strong> la bajó al
        <strong>{{ IASS_FIRST_BRACKET_NOTE.currentRatePct }} %</strong> con vigencia desde el 1.º de
        enero de 2025, y ése es el que se retiene hoy. Acá la fuente primaria más obvia es
        justamente la que hace equivocarse.
      </VAlert>
    </section>

    <!-- Varios organismos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si cobrás de más de un organismo</h2>
      <p class="section-intro mb-5">
        Es el caso que casi no está explicado en ningún lado, y el que más sorpresas da en el ajuste
        final. Cada organismo retiene sobre lo que paga él, sin saber lo que pagan los otros, así
        que el mínimo no imponible se descuenta más de una vez y durante el año te retienen de
        menos. El BPS lo resuelve con una <strong>opción que hay que pedir</strong>: cuando las
        pasividades simultáneas de distintos organismos superan en conjunto el mínimo mensualizado
        de {{ IASS_MNI_BPC_MONTHLY }} BPC, se puede solicitar que el descuento se haga sobre la
        totalidad de los ingresos del BPS con esta escala.
      </p>
      <VTable density="comfortable" class="iass-table cu-mobile-cards">
        <thead>
          <tr>
            <th>Tramo mensual</th>
            <th class="text-right">En pesos por mes</th>
            <th class="text-right">Tasa</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in multiRows" :key="'m' + i">
            <td data-label="Tramo mensual">{{ row.label }}</td>
            <td class="text-right" data-label="En pesos por mes">{{ row.pesos }}</td>
            <td class="text-right font-weight-bold" data-label="Tasa">{{ row.rate }}</td>
          </tr>
        </tbody>
      </VTable>
      <VAlert
        type="info"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        icon="mdi-information-outline"
      >
        Esta escala <strong>no tiene tramo exento</strong> y arranca en el 6 % desde el primer peso.
        No es un error: el mínimo no imponible se usa una sola vez en el año, y esta es la escala
        del <em>descuento</em>, no la del impuesto. El impuesto sigue siendo anual y se cierra con
        el ajuste final — «debido a que el impuesto es anual, se deberán anualizar estos valores
        para determinar el ajuste final», dice el BPS.
      </VAlert>
    </section>

    <!-- Lo que no publicamos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que esta página no te va a decir</h2>
      <p class="section-intro mb-5">
        Tres cosas que dependen de datos que la fuente oficial no publica. Preferimos mandarte al
        organismo antes que estimarlas.
      </p>
      <VList class="unpublished" density="comfortable" bg-color="transparent">
        <VListItem v-for="item in IASS_UNPUBLISHED" :key="item">
          <template #prepend>
            <VIcon icon="mdi-minus-circle-outline" color="medium-emphasis" size="small" />
          </template>
          <VListItemTitle class="text-wrap text-body-2">{{ item }}</VListItemTitle>
        </VListItem>
      </VList>
    </section>

    <!-- Fuentes -->
    <section class="mb-4">
      <h2 class="text-h5 font-weight-bold mb-2">Fuentes</h2>
      <p class="section-intro mb-4">
        Los tramos, las tasas y la escala de varios organismos se leyeron el {{ verifiedAt }} en
        estas dos fuentes. Si vas a tomar una decisión con un número de acá, confirmalo en la
        fuente: es la que manda.
      </p>
      <ul class="sources mb-6">
        <li v-for="source in IASS_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer" class="cu-link">{{
            source.label
          }}</a>
        </li>
      </ul>

      <h3 class="text-subtitle-1 font-weight-bold mb-3">Seguir por acá</h3>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          v-for="link in related"
          :key="link.to"
          :to="localePath(link.to)"
          variant="tonal"
          size="small"
          >{{ link.label }}</VBtn
        >
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  IASS_ANNUAL_BRACKETS,
  IASS_FIRST_BRACKET_NOTE,
  IASS_MNI_BPC_ANNUAL,
  IASS_MNI_BPC_MONTHLY,
  IASS_MONTHLY_BRACKETS,
  IASS_MULTI_SOURCE_MONTHLY_BRACKETS,
  IASS_SOURCES,
  IASS_UNPUBLISHED,
  IASS_VERIFIED_AT,
  type IassBracket,
  iassSeoDescription,
  iassWithholding,
  pesos,
} from '~/utils/iass'
import { BPC_2026 } from '~/utils/irpfCasos'

const localePath = useLocalePath()

// La BPC viva, con la del decreto vigente como respaldo. Es la misma fuente que usan el IRPF y la
// página de impuestos a las inversiones, así que las tres publican el mismo peso el mismo día.
const { data: figures } = await useFetch<{ bpc: number; asOf: string | null }>('/api/uy-figures', {
  key: 'uy-figures',
  default: () => ({ bpc: BPC_2026, asOf: null }),
})
const bpc = computed(() => {
  const value = figures.value?.bpc
  return typeof value === 'number' && value > 0 ? value : BPC_2026
})

const mniMonthly = computed(() => IASS_MNI_BPC_MONTHLY * bpc.value)
const mniAnnual = computed(() => IASS_MNI_BPC_ANNUAL * bpc.value)

// Arranca apenas por encima del mínimo: así la primera pantalla ya muestra una cuenta con tramos
// en vez de un cero, que es lo que hace entender la escala marginal sin leer nada.
const pension = ref(Math.round(IASS_MNI_BPC_MONTHLY * BPC_2026 * 1.5))
const verdict = computed(() => iassWithholding(Number(pension.value), bpc.value))

const pct = (value: number) => `${value.toLocaleString('es-UY', { maximumFractionDigits: 2 })} %`

/** `De 9 a 15 BPC` / `Más de 50 BPC`, en la unidad en la que viene el tramo. */
function bracketLabel(bracket: IassBracket): string {
  if (bracket.toBpc === null) return `Más de ${fmtBpc(bracket.fromBpc)} BPC`
  if (bracket.fromBpc === 0) return `Hasta ${fmtBpc(bracket.toBpc)} BPC`
  return `De ${fmtBpc(bracket.fromBpc)} a ${fmtBpc(bracket.toBpc)} BPC`
}
const fmtBpc = (units: number) => units.toLocaleString('es-UY', { maximumFractionDigits: 2 })

/** El rango del tramo en pesos del MES, que es la unidad del recibo. */
function monthlyPesosRange(bracket: IassBracket): string {
  const from = bracket.fromBpc * bpc.value
  if (bracket.toBpc === null) return `Más de ${pesos(from)}`
  if (bracket.fromBpc === 0) return `Hasta ${pesos(bracket.toBpc * bpc.value)}`
  return `${pesos(from)} — ${pesos(bracket.toBpc * bpc.value)}`
}

const scaleRows = computed(() =>
  IASS_ANNUAL_BRACKETS.map((annual, i) => {
    const monthly = IASS_MONTHLY_BRACKETS[i]!
    return {
      annual: bracketLabel(annual),
      monthly: bracketLabel(monthly),
      pesos: monthlyPesosRange(monthly),
      rate: annual.ratePct === 0 ? 'Exento' : pct(annual.ratePct),
    }
  })
)

const multiRows = computed(() =>
  IASS_MULTI_SOURCE_MONTHLY_BRACKETS.map(bracket => ({
    label: bracketLabel(bracket),
    pesos: monthlyPesosRange(bracket),
    rate: pct(bracket.ratePct),
  }))
)

const verifiedAt = new Date(`${IASS_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const related = [
  { to: '/cuando-me-puedo-jubilar-uruguay', label: 'Cuándo me puedo jubilar' },
  { to: '/glosario/iass', label: 'IASS en el glosario' },
  { to: '/impuestos-inversiones-uruguay', label: 'Impuestos a las inversiones' },
  { to: '/declaracion-de-irpf-uruguay', label: 'Declaración de IRPF' },
  { to: '/fecha-de-cobro-bps-uruguay', label: 'Fecha de cobro del BPS' },
  { to: '/suplemento-solidario-bps', label: 'Suplemento solidario' },
]

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/iass-uruguay'
const title = 'IASS: cuánto te descuentan de la jubilación'
// La descripción se ARMA desde la escala y la BPC viva (`iassSeoDescription`) en vez de escribirse
// a mano: los dos importes que la hacen concreta se mueven cada 1.º de enero y un literal quedaría
// viejo sin que nada falle. Su largo está medido en el test, incluso con una BPC de cinco cifras.
const description = computed(() => iassSeoDescription(bpc.value))

defineOgImageComponent('Cambio', {
  title: 'IASS en Uruguay',
  subtitle: 'Cuánto se descuenta de una jubilación, y desde cuánto',
  tag: 'JUBILACIONES',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: title,
  ogDescription: () => description.value,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: () => description.value,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'iass, iass uruguay, iass 2026, impuesto a las jubilaciones uruguay, cuanto me descuentan de la jubilacion, escala iass, franjas iass, iass minimo no imponible, iass 108 bpc, iass bps, impuesto de asistencia a la seguridad social, iass varios organismos, ajuste final iass',
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
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'IASS: cuánto te descuentan de la jubilación',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description: description.value,
            inLanguage: 'es-UY',
            dateModified: IASS_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: IASS_SOURCES.map(source => ({
              '@type': 'Legislation',
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
.lead {
  font-size: 1.05rem;
  line-height: 1.65;
  margin-top: 0;
}
.section-intro {
  margin-top: 0;
  line-height: 1.6;
  color: rgb(var(--v-theme-on-surface-variant));
}
.warn-card {
  border: 1px solid rgba(var(--v-theme-warning), 0.35);
  background: rgba(var(--v-theme-warning), 0.07);
}
.warn-title {
  margin-top: 0;
  font-weight: 700;
}
.verdict-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.verdict-none,
.verdict-label {
  margin-top: 0;
}
.verdict-label {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-on-surface-variant));
}
.verdict-amount {
  margin-top: 0;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.1;
}
.verdict-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
}
.verdict-grid > div {
  display: flex;
  flex-direction: column;
}
.vg-label {
  font-size: 0.78rem;
  color: rgb(var(--v-theme-on-surface-variant));
}
.vg-value {
  font-weight: 700;
}
.iass-table :deep(th) {
  white-space: nowrap;
}
.unpublished :deep(.v-list-item__prepend) {
  align-self: start;
  margin-top: 6px;
}
.sources {
  margin-top: 0;
  padding-left: 1.1rem;
  font-size: 0.92rem;
}
.sources li {
  margin-bottom: 6px;
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
</style>
