<template>
  <VContainer v-if="indicator" class="pb-8">
    <!-- Header with the headline value -->
    <v-row>
      <v-col cols="12">
        <v-card class="overflow-hidden" elevation="8">
          <div class="bg-gradient-indicador pa-6 on-dark">
            <div class="d-flex align-center ga-4 flex-wrap">
              <v-avatar size="56" class="d-none d-md-flex bg-white">
                <v-icon size="32" color="primary">mdi-finance</v-icon>
              </v-avatar>
              <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
                  Valor de la {{ indicator.name }} ({{ indicator.abbr }})
                  {{ staticYear ? `${staticYear} en Uruguay` : 'hoy en Uruguay' }}
                </h1>
                <p class="text-body-1 text-grey-lighten-2 mb-0 indicador-intro">
                  {{ indicator.shortDef }}
                </p>
              </div>
            </div>
          </div>

          <v-card-text class="py-5">
            <div class="d-flex align-center flex-wrap ga-6">
              <div data-testid="indicador-value">
                <div class="text-overline text-grey">1 {{ indicator.abbr }} equivale a</div>
                <div class="text-h4 font-weight-bold text-primary">{{ formattedValue }}</div>
                <div class="text-caption text-grey">{{ valueLabel }}</div>
                <div v-if="indicator.legal" class="text-caption text-grey indicador-note">
                  Fuente:
                  <a :href="indicator.legal.url" target="_blank" rel="noopener noreferrer">{{
                    indicator.legal.act
                  }}</a>
                  (IMPO), publicado el {{ isoDayLabelEs(indicator.legal.published) }}
                </div>
              </div>
              <v-spacer class="d-none d-sm-flex" />
              <ShareButtons :url="canonicalUrl" :text="`Valor de la ${indicator.name} hoy`" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Two-way converter -->
    <v-row class="mt-2">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center py-3">
            <v-icon start>mdi-calculator-variant</v-icon>
            Conversor de {{ indicator.abbr }} a pesos
          </v-card-title>
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" sm="5">
                <v-text-field
                  v-model.number="unitsInput"
                  type="number"
                  min="0"
                  :label="`Cantidad de ${indicator.abbr}`"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  data-testid="indicador-units-input"
                />
              </v-col>
              <v-col cols="12" sm="2" class="text-center d-none d-sm-block">
                <v-icon size="28" color="grey">mdi-swap-horizontal</v-icon>
              </v-col>
              <v-col cols="12" sm="5">
                <v-text-field
                  v-model.number="pesosInput"
                  type="number"
                  min="0"
                  label="Pesos uruguayos (UYU)"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  data-testid="indicador-pesos-input"
                />
              </v-col>
            </v-row>
            <p class="text-body-2 text-grey mt-3 mb-0">
              {{ unitsInput || 0 }} {{ indicator.abbr }} = <strong>{{ pesosFormatted }}</strong> al
              valor vigente de {{ formattedValue }} por {{ indicator.abbr }}.
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Equivalence table + month-by-month series -->
    <v-row v-if="equivalences.length || hasHistory" class="mt-2">
      <v-col v-if="equivalences.length" cols="12" :md="hasHistory ? 6 : 12">
        <v-card class="h-100">
          <v-card-title tag="h2" class="d-flex align-center py-3 text-h6">
            <v-icon start>mdi-table</v-icon>
            Cuánto son las {{ indicator.abbr }} en pesos
          </v-card-title>
          <v-card-text>
            <p class="text-body-2 text-grey mb-3">
              Con 1 {{ indicator.abbr }} a {{ formattedValue }}{{ whenSuffix }}.
            </p>
            <VTable density="compact" class="indicador-table" data-testid="indicador-equivalences">
              <thead>
                <tr>
                  <th scope="col">{{ indicator.name }}</th>
                  <th scope="col" class="text-right">Pesos uruguayos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in equivalences" :key="item.units">
                  <td>{{ formatUnits(item.units) }} {{ indicator.abbr }}</td>
                  <td class="text-right">
                    {{ item.units === 1 ? formattedValue : formatPesos(item.pesos, 2) }}
                  </td>
                </tr>
              </tbody>
            </VTable>
            <p v-if="indicator.code === 'UR'" class="text-body-2 mt-3 mb-0 indicador-note">
              Muchos alquileres se pactan en UR, así que el monto en pesos cambia cuando cambia la
              UR. Si estás por alquilar, compará las
              <NuxtLink :to="localePath('/guias/garantias-de-alquiler-uruguay')"
                >garantías de alquiler</NuxtLink
              >; si te querés ir antes de tiempo, mirá
              <NuxtLink :to="localePath('/guias/como-rescindir-contrato-alquiler-uruguay')"
                >cómo rescindir el contrato</NuxtLink
              >.
            </p>
            <p v-else-if="indicator.code === 'UI'" class="text-body-2 mt-3 mb-0 indicador-note">
              Los créditos hipotecarios en UI se pagan en pesos al valor del día. Antes de firmar,
              mirá la
              <NuxtLink :to="localePath('/guias/credito-hipotecario-uruguay')"
                >comparativa de créditos hipotecarios</NuxtLink
              >
              o pasá cualquier monto con el
              <NuxtLink :to="localePath('/herramientas/conversor-unidad-indexada')"
                >conversor de UI a pesos</NuxtLink
              >.
            </p>
            <p
              v-else-if="indicator.legal && publishedValue !== null"
              class="text-body-2 mt-3 mb-0 indicador-note"
              data-testid="indicador-bpc-uses"
            >
              En el sueldo la BPC marca dos cortes: hasta 7 BPC por mes ({{
                formatPesos(7 * publishedValue, 0)
              }}) no se retiene IRPF, y el FONASA cambia de tasa por encima de 2,5 BPC ({{
                formatPesos(2.5 * publishedValue, 0)
              }}). Para ver cuánto te queda en mano, usá la
              <NuxtLink :to="localePath('/herramientas/calculadora-sueldo-liquido')"
                >calculadora de sueldo líquido</NuxtLink
              >
              o la de
              <NuxtLink :to="localePath('/herramientas/calculadora-irpf')">IRPF</NuxtLink>.
            </p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col v-if="hasHistory" cols="12" :md="equivalences.length ? 6 : 12">
        <v-card class="h-100">
          <v-card-title tag="h2" class="d-flex align-center py-3 text-h6">
            <v-icon start>mdi-chart-timeline-variant</v-icon>
            {{ indicator.abbr }} mes a mes
          </v-card-title>
          <v-card-text>
            <p v-if="yearChangeText" class="text-body-2 mb-3">{{ yearChangeText }}</p>
            <VTable density="compact" class="indicador-table" data-testid="indicador-history">
              <thead>
                <tr>
                  <th scope="col">Mes</th>
                  <th scope="col" class="text-right">
                    {{ indicator.code === 'UI' ? 'Valor al cierre' : 'Valor' }}
                  </th>
                  <th scope="col" class="text-right">Variación</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(m, i) in historyRows" :key="m.month">
                  <td>
                    {{ capitalize(monthLabelEs(m.month)) }}
                    <span v-if="i === 0 && indicator.code === 'UI'" class="text-grey">
                      (en curso)</span
                    >
                  </td>
                  <td class="text-right">{{ formatPesos(m.value, indicator.decimals) }}</td>
                  <td class="text-right">{{ formatChange(m.changePct) }}</td>
                </tr>
              </tbody>
            </VTable>
            <p class="text-caption text-grey mt-2 mb-0">
              Serie del Banco Central del Uruguay. La variación compara con el mes anterior.
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- What it is -->
    <v-row class="mt-2">
      <v-col cols="12" md="7">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center py-3">
            <v-icon start>mdi-information-outline</v-icon>
            ¿Qué es la {{ indicator.name }}?
          </v-card-title>
          <v-card-text>
            <p class="text-body-1 indicador-prose mb-4">{{ indicator.whatItIs }}</p>
            <h3 class="text-subtitle-1 font-weight-bold mb-2">¿Para qué se usa?</h3>
            <v-list density="compact" class="bg-transparent pa-0">
              <v-list-item
                v-for="(use, i) in indicator.usedFor"
                :key="i"
                class="px-0"
                min-height="32"
              >
                <template #prepend>
                  <v-icon size="small" color="primary">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ use }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="5">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center py-3">
            <v-icon start>mdi-update</v-icon>
            {{ indicator.legal ? '¿Desde cuándo rige?' : '¿Cómo se actualiza?' }}
          </v-card-title>
          <v-card-text>
            <p class="text-body-1 indicador-prose mb-0">{{ indicator.howUpdated }}</p>
            <dl v-if="indicator.legal" class="indicador-legal mt-4" data-testid="indicador-legal">
              <dt>Rige desde</dt>
              <dd>el {{ isoDayLabelEs(indicator.legal.validFrom) }}</dd>
              <dt>La fija</dt>
              <dd>
                el {{ indicator.legal.act }}, promulgado el
                {{ isoDayLabelEs(indicator.legal.promulgated) }} y publicado en el Diario Oficial el
                {{ isoDayLabelEs(indicator.legal.published) }}
              </dd>
              <dt>Año anterior</dt>
              <dd>
                {{ formatPesos(indicator.legal.previous.value, indicator.decimals) }}
                ({{ indicator.legal.previous.act }}): subió
                {{ formatNumber(indicator.legal.previous.changePct, 2) }} %
              </dd>
              <dt>Por qué cambia</dt>
              <dd>{{ indicator.legal.basis }}</dd>
            </dl>
            <p v-if="indicator.legal" class="text-caption text-grey mt-3 mb-0 indicador-note">
              Leer el
              <a :href="indicator.legal.url" target="_blank" rel="noopener noreferrer">{{
                indicator.legal.act
              }}</a>
              en IMPO (consultado el {{ isoDayLabelEs(indicator.legal.seenOn) }}).
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- FAQ -->
    <v-row class="mt-2">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center py-3">
            <v-icon start>mdi-frequently-asked-questions</v-icon>
            Preguntas frecuentes sobre la {{ indicator.abbr }}
          </v-card-title>
          <v-expansion-panels variant="accordion" class="pa-2">
            <v-expansion-panel v-for="(faq, i) in indicator.faqs" :key="i">
              <v-expansion-panel-title class="font-weight-medium">
                {{ faq.question }}
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-2">
                {{ faq.answer }}
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>
      </v-col>
    </v-row>

    <!-- Related links -->
    <v-row class="mt-2">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center py-3">
            <v-icon start>mdi-link-variant</v-icon>
            Seguí explorando
          </v-card-title>
          <v-card-text class="d-flex flex-wrap ga-2">
            <v-chip
              v-for="link in indicator.related"
              :key="link.to"
              :to="localePath(link.to)"
              color="primary"
              variant="tonal"
              size="small"
              link
            >
              {{ link.label }}
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ExchangeRate } from '~/types/api'
import { formatNumber } from '~/utils/format'
import {
  EQUIVALENCE_AMOUNTS,
  changeOverDays,
  dayLabelEs,
  equivalenceTable,
  indicatorFromSlug,
  isoDayLabelEs,
  liveIndicatorReading,
  monthLabelEs,
  montevideoMonthKey,
  montevideoYear,
  monthlyHistory,
  staticIndicatorSnippet,
  staticValueIsCurrent,
  type EvolutionPoint,
} from '~/utils/indicators'

definePageMeta({
  validate: route => indicatorFromSlug(String(route.params.indicador ?? '')) !== null,
})

const route = useRoute()
const localePath = useLocalePath()
const { getProcessedExchangeData, getEvolutionData } = useApiService()

const indicator = computed(() => indicatorFromSlug(String(route.params.indicador ?? '')))

// SSR fetch of today's rows, reduced to this indicator's live reading (value + date). `null` when
// the read failed OR the indicator has no live code (BPC) — `publishedValue` tells them apart.
const { data: live } = await useAsyncData(
  () => `indicador-${indicator.value?.slug ?? 'na'}`,
  async () => {
    const ind = indicator.value
    if (!ind?.code) return null
    const result = await getProcessedExchangeData('')
    const rows = (result?.exchangeData ?? []) as ExchangeRate[]
    return liveIndicatorReading(rows, ind)
  }
)

// Twelve months of the BCU series, reduced ON THE SERVER to ~13 monthly rows: the raw daily series
// is ~370 points and would otherwise ride along in the hydration payload of every visit.
const { data: history } = await useAsyncData(
  () => `indicador-hist-${indicator.value?.slug ?? 'na'}`,
  async () => {
    const ind = indicator.value
    if (!ind?.code) return null
    const res = await getEvolutionData('bcu', ind.code, undefined, 13)
    const points = (res?.data as { evolution?: EvolutionPoint[] } | null)?.evolution ?? []
    if (!points.length) return null
    return { months: monthlyHistory(points, 13), yearChangePct: changeOverDays(points) }
  }
)

if (!indicator.value) {
  throw createError({ statusCode: 404, statusMessage: 'Indicador no encontrado' })
}

const formatPesos = (n: number, decimals: number): string =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

/**
 * The yearly legal value (BPC) is "the current one" only during the year its decree applies to.
 * Read once per render: SSR and hydration see the same year.
 */
const staticCurrent = computed(() => staticValueIsCurrent(indicator.value!))

/** `'2026'` for the BPC while its decree is the one in force; `null` for UI/UR or when stale. */
const staticYear = computed(() =>
  staticCurrent.value ? indicator.value!.legal!.validFrom.slice(0, 4) : null
)

/**
 * The number this page may PUBLISH (title, description, table): the live reading for UI/UR, the
 * yearly legal value for the BPC while its year is this year, and nothing otherwise.
 */
const publishedValue = computed<number | null>(() => {
  const ind = indicator.value!
  if (ind.code) return live.value?.value ?? null
  return staticCurrent.value ? ind.referenceValue : null
})

// The calculator still needs a number to multiply when the read failed; it is labelled as such.
const currentValue = computed(() => publishedValue.value ?? indicator.value!.referenceValue)

const formattedValue = computed(() => formatPesos(currentValue.value, indicator.value!.decimals))

/** "setiembre de 2026" for the monthly UR, "16 de setiembre de 2026" for the daily UI. */
const liveWhen = computed(() => {
  const date = live.value?.date
  if (!date) return null
  if (indicator.value!.code === 'UR') {
    const month = montevideoMonthKey(date)
    return month ? { prefix: 'en', label: monthLabelEs(month) } : null
  }
  const day = dayLabelEs(date)
  return day ? { prefix: 'el', label: day } : null
})

const whenSuffix = computed(() =>
  liveWhen.value ? ` (vigente ${liveWhen.value.prefix} ${liveWhen.value.label})` : ''
)

const valueLabel = computed(() => {
  const ind = indicator.value!
  if (!ind.code && ind.legal) {
    const since = isoDayLabelEs(ind.legal.validFrom)
    return staticCurrent.value
      ? `Vigente desde el ${since}`
      : `Valor vigente desde el ${since}: el de ${montevideoYear()} todavía no está cargado acá`
  }
  if (!ind.code) return ind.referenceLabel
  if (!live.value) return 'Valor de referencia: no pudimos leer el valor de hoy'
  return liveWhen.value
    ? `Banco Central del Uruguay, vigente ${liveWhen.value.prefix} ${liveWhen.value.label}`
    : 'Valor vigente según el Banco Central del Uruguay'
})

const equivalences = computed(() =>
  publishedValue.value === null
    ? []
    : equivalenceTable(EQUIVALENCE_AMOUNTS[indicator.value!.slug] ?? [], publishedValue.value)
)

const hasHistory = computed(() => (history.value?.months.length ?? 0) >= 3)
const historyRows = computed(() => [...(history.value?.months ?? [])].reverse())

const formatUnits = (n: number): string => formatNumber(n, Number.isInteger(n) ? 0 : 2)

const formatChange = (pct: number | null): string =>
  pct === null ? '—' : `${pct > 0 ? '+' : ''}${formatNumber(pct, 2)} %`

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

const yearChangeText = computed(() => {
  const pct = history.value?.yearChangePct
  if (pct == null) return null
  const verb = pct >= 0 ? 'subió' : 'bajó'
  return `En los últimos 12 meses la ${indicator.value!.abbr} ${verb} ${formatNumber(Math.abs(pct), 2)} %.`
})

// Two-way converter: `units` is the source of truth; editing pesos derives units.
const unitsInput = ref<number | null>(1)
const pesosInput = computed<number | null>({
  get: () => {
    const u = unitsInput.value
    if (typeof u !== 'number' || Number.isNaN(u)) return null
    return Math.round(u * currentValue.value * 100) / 100
  },
  set: p => {
    if (typeof p !== 'number' || Number.isNaN(p) || currentValue.value <= 0) {
      unitsInput.value = null
      return
    }
    unitsInput.value = Math.round((p / currentValue.value) * 10000) / 10000
  },
})

const pesosFormatted = computed(() => formatPesos(pesosInput.value ?? 0, 2))

const canonicalUrl = computed(
  () => `https://cambio-uruguay.com/indicadores/${indicator.value!.slug}`
)

defineOgImageComponent('Cambio', {
  title: () => `Valor de la ${indicator.value!.name} (${indicator.value!.abbr}) hoy`,
  subtitle: () => indicator.value!.shortDef,
  tag: indicator.value!.tag,
})

/**
 * El número va en el título y en la descripción, que es lo que separa al que gana el clic del que
 * no lo gana.
 *
 * Medido el 2026-09-03 sobre el SERP real de Uruguay (gl=uy): para "valor de la ur hoy" NO hay
 * caja de respuesta ni panel —o sea que el clic existe— y el tercer resultado es
 * datosuruguay.com/ur, titulado "Valor UR Uruguay Hoy 2026: $1.923,44". Nosotros estábamos
 * séptimos con un título sin una sola cifra. El cluster entero de la UR son 594 consultas, 18.251
 * impresiones y 15 clics.
 *
 * LA GUARDA, que viene de un error propio: el número se publica SÓLO cuando vino de la lectura
 * viva (o es el valor legal anual de la BPC). La guarda anterior comparaba contra `null` un valor
 * que nunca era `null` —el helper caía al `referenceValue`—, así que una API caída habría
 * publicado la referencia de junio como "hoy". `publishedValue` sale de `liveIndicatorReading`.
 *
 * 2026-09-16: la descripción suma la fecha de vigencia, la variación a 12 meses y un ejemplo tomado
 * de las consultas reales ("10 ur a pesos", "1000 ui a pesos"). La UR tenía 25.000 impresiones en
 * 28 días, posición ~10 y 12 clics.
 */
const liveFormatted = computed(() =>
  publishedValue.value === null
    ? null
    : formatPesos(publishedValue.value, indicator.value!.decimals)
)

const EXAMPLE_UNITS: Record<string, number> = { UI: 1000, UR: 10 }

/**
 * The BPC's snippet (2026-10-19): "Valor de la BPC 2026: 1 BPC = $ 6.864" and, in the description,
 * the decree and the multiples people type ("2 bpc cuanto es", "cuanto es 3 bpc en uruguay"). See
 * `staticIndicatorSnippet`. `null` for UI/UR and for a BPC whose year is not this one.
 */
const staticSnippet = computed(() => staticIndicatorSnippet(indicator.value!))

const seoDescription = computed(() => {
  const ind = indicator.value!
  if (!ind.code) return staticSnippet.value?.description ?? ind.shortDef
  const value = publishedValue.value
  if (value === null || !liveFormatted.value) return ind.shortDef
  let when = ' hoy'
  if (liveWhen.value) {
    when =
      liveWhen.value.prefix === 'en'
        ? ` en ${liveWhen.value.label}`
        : ` hoy, ${liveWhen.value.label}`
  }
  const pct = history.value?.yearChangePct
  const change = pct == null ? '' : `, ${pct > 0 ? '+' : ''}${formatNumber(pct, 2)} % en 12 meses`
  const units = EXAMPLE_UNITS[ind.code ?? ''] ?? 10
  const example = `${formatUnits(units)} ${ind.abbr} = ${formatPesos(Math.round(units * value * 100) / 100, 2)}`
  const tail = 'Tabla de equivalencias y valor mes a mes.'
  return `La ${ind.name} (${ind.abbr}) vale ${liveFormatted.value}${when}${change}. ${example}. ${tail}`
})

useSeoMeta({
  title: () => {
    if (staticSnippet.value) return `${staticSnippet.value.title} | Cambio Uruguay`
    return liveFormatted.value && indicator.value!.code
      ? `Valor de la ${indicator.value!.abbr} hoy: ${liveFormatted.value} | Cambio Uruguay`
      : `Valor de la ${indicator.value!.name} (${indicator.value!.abbr}) Hoy | Cambio Uruguay`
  },
  description: () => seoDescription.value,
  ogTitle: () => {
    if (staticSnippet.value) return staticSnippet.value.title
    return liveFormatted.value && indicator.value!.code
      ? `${indicator.value!.abbr} hoy: ${liveFormatted.value}`
      : `Valor de la ${indicator.value!.name} (${indicator.value!.abbr}) hoy`
  },
  ogDescription: () => indicator.value!.shortDef,
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => {
        const ind = indicator.value!
        return JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              '@id': `${canonicalUrl.value}#webpage`,
              url: canonicalUrl.value,
              name: `Valor de la ${ind.name} (${ind.abbr}) hoy`,
              inLanguage: 'es',
              dateModified: new Date().toISOString(),
              isPartOf: { '@id': 'https://cambio-uruguay.com/#website' },
              speakable: {
                '@type': 'SpeakableSpecification',
                cssSelector: ['.indicador-intro', '.indicador-prose'],
              },
            },
            {
              '@type': 'DefinedTerm',
              name: `${ind.name} (${ind.abbr})`,
              description: ind.whatItIs,
              inDefinedTermSet: 'https://cambio-uruguay.com/indicadores',
            },
            {
              '@type': 'FAQPage',
              mainEntity: ind.faqs.map(f => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: { '@type': 'Answer', text: f.answer },
              })),
            },
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
                  name: 'Indicadores',
                  item: 'https://cambio-uruguay.com/indicadores',
                },
                { '@type': 'ListItem', position: 3, name: ind.name, item: canonicalUrl.value },
              ],
            },
          ],
        })
      }),
    },
  ],
})
</script>

<style scoped>
.bg-gradient-indicador {
  background: linear-gradient(135deg, #7c4dff 0%, #2f81f7 100%);
}
.indicador-intro {
  max-width: 760px;
  line-height: 1.6;
}
.indicador-prose {
  line-height: 1.7;
}
.indicador-table {
  font-variant-numeric: tabular-nums;
}
.indicador-note a {
  color: rgb(var(--v-theme-primary));
}
.indicador-legal {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}
.indicador-legal dt {
  margin-top: 10px;
  font-weight: 700;
}
.indicador-legal dt:first-child {
  margin-top: 0;
}
.indicador-legal dd {
  margin: 2px 0 0;
}
</style>
