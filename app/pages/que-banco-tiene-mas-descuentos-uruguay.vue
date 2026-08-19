<template>
  <v-container class="py-4">
    <h1 class="text-h5 text-sm-h4 mb-2">¿Qué banco tiene más descuentos en Uruguay?</h1>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 72ch">
      Análisis de los descuentos vigentes de Itaú, BROU, Santander, BBVA, Scotiabank, OCA y ANDA:
      cuántas marcas y locales cubre cada emisor, en cuántas sirve el débito, qué marcas son
      exclusivas y quién lidera cada rubro. Los números se cuentan del mapa de descuentos, no son
      estimaciones ni porcentajes de ahorro.
    </p>

    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-chip
        size="small"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-map-search-outline"
        :to="localePath('/descuentos-con-tarjeta-uruguay')"
      >
        Mapa de descuentos
      </v-chip>
      <v-chip
        size="small"
        variant="tonal"
        prepend-icon="mdi-credit-card-multiple-outline"
        :to="localePath('/tarjetas-de-credito-uruguay')"
      >
        Tarjetas de crédito (tier list)
      </v-chip>
      <v-chip
        size="small"
        variant="tonal"
        prepend-icon="mdi-bank-outline"
        :to="localePath('/mejores-bancos-uruguay')"
      >
        Mejores bancos (tier list)
      </v-chip>
      <v-chip
        size="small"
        variant="tonal"
        prepend-icon="mdi-credit-card-outline"
        :to="localePath('/tarjetas-de-debito-uruguay')"
      >
        Tarjetas de débito
      </v-chip>
    </div>

    <v-alert v-if="error" type="warning" variant="tonal" density="comfortable" class="mb-4">
      No pudimos leer los descuentos en este momento. Probá de nuevo en unos minutos.
    </v-alert>

    <div v-if="pending" class="text-center py-10">
      <v-progress-circular indeterminate color="primary" />
      <p class="text-caption mt-2">Analizando los descuentos vigentes…</p>
    </div>

    <template v-else-if="analysis">
      <!-- Headline numbers -->
      <v-row dense class="mb-2">
        <v-col cols="6" md="3">
          <v-card variant="tonal" class="pa-3 h-100">
            <div class="text-h6">{{ analysis.totals.discountedBrands }}</div>
            <div class="text-caption">marcas con algún descuento</div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="tonal" class="pa-3 h-100">
            <div class="text-h6">{{ analysis.totals.locations }}</div>
            <div class="text-caption">locales en el mapa</div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="tonal" class="pa-3 h-100">
            <div class="text-h6">{{ leader?.name || '—' }}</div>
            <div class="text-caption">cubre más marcas ({{ leader?.brands ?? 0 }})</div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="tonal" class="pa-3 h-100">
            <div class="text-h6">{{ exclusiveLeader?.name || '—' }}</div>
            <div class="text-caption">
              más marcas exclusivas ({{ exclusiveLeader?.exclusive ?? 0 }})
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Chart 1: breadth -->
      <v-card variant="outlined" class="mb-4">
        <v-card-item class="pb-0">
          <h2 class="text-subtitle-1 font-weight-medium">Marcas con descuento por banco</h2>
          <p class="text-caption text-medium-emphasis mb-0">
            Cuántas cadenas distintas tiene adheridas cada emisor. Es la medida de amplitud: cuántas
            puertas te abre la tarjeta.
          </p>
        </v-card-item>
        <v-card-text>
          <ClientOnly>
            <BankosBarChart
              :rows="brandsRows"
              unit="marcas"
              aria-label="Marcas con descuento por banco"
              :dark="isDark"
            />
            <template #fallback><div class="chart-fallback" /></template>
          </ClientOnly>
        </v-card-text>
      </v-card>

      <!-- Chart 2: debit eligibility (credit is not a differentiator — see copy) -->
      <v-card variant="outlined" class="mb-4">
        <v-card-item class="pb-0">
          <h2 class="text-subtitle-1 font-weight-medium">
            ¿El descuento sirve también con débito?
          </h2>
          <p class="text-caption text-medium-emphasis mb-0">
            Todos los descuentos del mapa aplican pagando con crédito, así que eso no diferencia a
            un banco de otro: lo que cambia es en cuántas marcas el beneficio también vale con
            débito. Si pagás con débito, esta es la comparación que importa.
          </p>
        </v-card-item>
        <v-card-text>
          <ClientOnly>
            <BankosBarChart
              :rows="debitRows"
              unit="marcas con débito"
              aria-label="Marcas donde el descuento también aplica con débito, por banco"
              :dark="isDark"
            />
            <template #fallback><div class="chart-fallback" /></template>
          </ClientOnly>
          <p class="text-caption text-medium-emphasis mt-2 mb-0">
            <span v-for="b in analysis.banks" :key="b.bankId" class="mr-3">
              {{ b.name }}: {{ pct(b.debitShare) }}
            </span>
          </p>
        </v-card-text>
      </v-card>

      <!-- Chart 3: exclusivity -->
      <v-card variant="outlined" class="mb-4">
        <v-card-item class="pb-0">
          <h2 class="text-subtitle-1 font-weight-medium">Marcas exclusivas de cada banco</h2>
          <p class="text-caption text-medium-emphasis mb-0">
            Marcas que ningún otro emisor del mapa descuenta. Es lo que realmente ganás al sumar ese
            banco: el resto se superpone con lo que ya tenés.
          </p>
        </v-card-item>
        <v-card-text>
          <ClientOnly>
            <BankosBarChart
              :rows="exclusiveRows"
              unit="marcas exclusivas"
              aria-label="Marcas exclusivas por banco"
              :dark="isDark"
            />
            <template #fallback><div class="chart-fallback" /></template>
          </ClientOnly>
        </v-card-text>
      </v-card>

      <!-- Full table -->
      <v-card variant="outlined" class="mb-4">
        <v-card-item class="pb-0">
          <h2 class="text-subtitle-1 font-weight-medium">Tabla comparativa</h2>
        </v-card-item>
        <v-card-text>
          <v-table density="comfortable" class="cu-mobile-cards">
            <thead>
              <tr>
                <th>Banco</th>
                <th class="text-right">Marcas</th>
                <th class="text-right">Locales</th>
                <th class="text-right">Crédito</th>
                <th class="text-right">Débito</th>
                <th class="text-right">Exclusivas</th>
                <th class="text-right">Cobertura</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in analysis.banks" :key="b.bankId">
                <td data-label="Banco">
                  <span class="bank-dot mr-2" :style="{ background: b.color }" />{{ b.name }}
                </td>
                <td data-label="Marcas" class="text-right">{{ b.brands }}</td>
                <td data-label="Locales" class="text-right">{{ b.locations }}</td>
                <td data-label="Crédito" class="text-right">{{ b.credit }}</td>
                <td data-label="Débito" class="text-right">{{ b.debit }}</td>
                <td data-label="Exclusivas" class="text-right">{{ b.exclusive }}</td>
                <td data-label="Cobertura" class="text-right">{{ pct(b.coverage) }}</td>
              </tr>
            </tbody>
          </v-table>
          <p class="text-caption text-medium-emphasis mt-2 mb-1">
            Cobertura = porcentaje de todas las marcas con descuento que cubre ese emisor. Una marca
            puede tener descuento con varios bancos, así que la suma supera el 100%.
          </p>
          <p v-if="bankosWithoutDiscounts.length" class="text-caption text-medium-emphasis mb-0">
            Sin descuentos vigentes en esta fuente al momento de la consulta:
            {{ bankosWithoutDiscounts.map(b => b.name).join(', ') }}. Aparecen igual en el selector
            del mapa porque el emisor existe; si vuelven a tener beneficios, se listan solos.
          </p>
        </v-card-text>
      </v-card>

      <!-- Category leaders -->
      <v-card variant="outlined" class="mb-4">
        <v-card-item class="pb-0">
          <h2 class="text-subtitle-1 font-weight-medium">Quién lidera cada rubro</h2>
          <p class="text-caption text-medium-emphasis mb-0">
            Si comprás sobre todo en un rubro, el banco que más te sirve es el que lo lidera acá.
          </p>
        </v-card-item>
        <v-card-text>
          <v-table density="comfortable" class="cu-mobile-cards">
            <thead>
              <tr>
                <th>Rubro</th>
                <th class="text-right">Marcas</th>
                <th>Podio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in topCategories" :key="c.category">
                <td data-label="Rubro">{{ c.category }}</td>
                <td data-label="Marcas" class="text-right">{{ c.brands }}</td>
                <td data-label="Podio">
                  <span v-for="r in c.ranking.slice(0, 3)" :key="r.bankId" class="mr-1">
                    <v-chip
                      size="x-small"
                      label
                      :style="{ background: r.color, color: readableText(r.color) }"
                      >{{ r.name }} · {{ r.brands }}</v-chip
                    >
                  </span>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>

      <!-- How to read it -->
      <v-card variant="tonal" class="mb-4">
        <v-card-text style="max-width: 75ch">
          <h2 class="text-h6 mb-2">Cómo elegir con estos datos</h2>
          <ul class="text-body-2 pl-4 mb-3">
            <li class="mb-1">
              <strong>Si vas a tener una sola tarjeta:</strong> mirá amplitud (marcas) y locales. Un
              emisor con muchas marcas te da descuento en más lugares sin pensarlo.
            </li>
            <li class="mb-1">
              <strong>Si ya tenés un banco y evaluás sumar otro:</strong> mirá
              <em>marcas exclusivas</em>. Sumar un banco que se superpone con el tuyo casi no agrega
              beneficios nuevos.
            </li>
            <li class="mb-1">
              <strong>Si pagás con débito:</strong> compará la columna Débito, no el total. Todos
              los descuentos sirven con crédito, pero la proporción que además vale con débito
              cambia muchísimo entre emisores —de casi todas a ninguna.
            </li>
            <li class="mb-1">
              <strong>Si tu gasto se concentra en un rubro</strong> (supermercado, gastronomía,
              combustible): usá la tabla de rubros, no el total.
            </li>
          </ul>
          <p class="text-body-2 mb-2">
            Esto mide <strong>cobertura</strong>, no cuánto ahorrás: el porcentaje de descuento
            depende de la tarjeta puntual, el día y los topes de cada banco. Para el resto de la
            decisión —comisiones, app, atención— mirá la
            <NuxtLink :to="localePath('/mejores-bancos-uruguay')">tier list de bancos</NuxtLink>, y
            para puntos y beneficios de cada plástico, las
            <NuxtLink :to="localePath('/tarjetas-de-credito-uruguay')"
              >tarjetas de crédito</NuxtLink
            >
            y las
            <NuxtLink :to="localePath('/tarjetas-de-debito-uruguay')">tarjetas de débito</NuxtLink>.
          </p>
          <p class="text-caption text-medium-emphasis mb-0">
            Datos de Bankos (bankos.uy){{
              generatedAt ? `, actualizado ${formatDate(generatedAt)}` : ''
            }}. Este sitio no está afiliado a Bankos ni a los bancos mencionados.
          </p>
        </v-card-text>
      </v-card>
    </template>

    <FaqBlock
      :items="ANALYSIS_FAQ"
      heading="Preguntas frecuentes sobre descuentos por banco"
      :expanded="true"
    />
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BANKOS_BANKS } from '~/utils/bankos'
import type { BankosAnalysis } from '~/utils/bankosAnalysis'
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()

const { data, pending, error } = await useLazyAsyncData<
  BankosAnalysis & { source: string; generatedAt: string | null }
>('bankos-analysis', () => $fetch('/api/bankos/analysis'), { server: false })

const analysis = computed(() => data.value ?? null)
const generatedAt = computed(() => data.value?.generatedAt ?? null)

// Vuetify's theme drives the chart axis colours; the site defaults to dark.
const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)

const leader = computed(() => analysis.value?.banks[0] ?? null)
const exclusiveLeader = computed(() => {
  const banks = analysis.value?.banks ?? []
  return [...banks].sort((a, b) => b.exclusive - a.exclusive)[0] ?? null
})

const brandsRows = computed(() =>
  (analysis.value?.banks ?? []).map(b => ({ label: b.name, value: b.brands, color: b.color }))
)
const debitRows = computed(() =>
  [...(analysis.value?.banks ?? [])]
    .sort((a, b) => b.debit - a.debit)
    .map(b => ({ label: b.name, value: b.debit, color: b.color }))
)
/** Issuers the app lets you select but that carry no discount in the current catalog. */
const bankosWithoutDiscounts = computed(() => {
  const present = new Set((analysis.value?.banks ?? []).map(b => b.bankId))
  return BANKOS_BANKS.filter(b => !present.has(b.id))
})
const exclusiveRows = computed(() =>
  [...(analysis.value?.banks ?? [])]
    .sort((a, b) => b.exclusive - a.exclusive)
    .map(b => ({ label: b.name, value: b.exclusive, color: b.color }))
)
const topCategories = computed(() => (analysis.value?.categories ?? []).slice(0, 12))

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}
function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: 'short' }).format(
      new Date(iso)
    )
  } catch {
    return iso
  }
}
/** Foreground that keeps ≥4.5:1 on an arbitrary brand colour (same rule as the map page). */
function readableText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#ffffff'
  const n = m[1]!
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const L =
    0.2126 * lin(parseInt(n.slice(0, 2), 16) / 255) +
    0.7152 * lin(parseInt(n.slice(2, 4), 16) / 255) +
    0.0722 * lin(parseInt(n.slice(4, 6), 16) / 255)
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? '#ffffff' : '#1a2027'
}

const ANALYSIS_FAQ: FaqItem[] = [
  {
    id: 'cual-mas-descuentos',
    question: '¿Qué banco tiene más descuentos en Uruguay?',
    answer:
      'Depende de qué midas. En cantidad de marcas adheridas lidera el emisor que aparece primero en la tabla de esta página, que se calcula con los descuentos vigentes del mapa. Pero si ya tenés un banco, importa más cuántas marcas exclusivas suma el segundo que su total.',
  },
  {
    id: 'exclusivas',
    question: '¿Qué significa "marcas exclusivas"?',
    answer:
      'Son las marcas que solo ese emisor descuenta: ningún otro banco del mapa tiene beneficio ahí. Es la mejor medida de cuánto agrega realmente sumar esa tarjeta a las que ya tenés.',
  },
  {
    id: 'debito-vs-credito',
    question: '¿Los descuentos sirven pagando con débito?',
    answer:
      'Todos los descuentos del mapa aplican con crédito, así que eso no diferencia a un banco de otro; lo que cambia mucho es el débito. Esta página muestra en cuántas marcas de cada emisor el beneficio también vale pagando con débito, y algunos emisores no ofrecen ninguno con débito.',
  },
  {
    id: 'rubro',
    question: '¿Cómo sé qué banco conviene para supermercados o gastronomía?',
    answer:
      'Mirá la tabla "Quién lidera cada rubro": ordena los emisores por cantidad de marcas adheridas en cada categoría, así podés elegir según dónde gastás de verdad.',
  },
  {
    id: 'porcentaje',
    question: '¿Estos datos dicen cuánto ahorro?',
    answer:
      'No. Miden cobertura (cuántas marcas y locales tiene cada banco), no el porcentaje de descuento: el ahorro depende de la tarjeta puntual, el día y los topes de cada banco. Confirmá siempre las condiciones vigentes.',
  },
  {
    id: 'actualizacion',
    question: '¿Cada cuánto se actualiza este análisis?',
    answer:
      'Se recalcula con los descuentos vigentes cada vez que se abre la página, con datos que se refrescan a diario. La fecha de actualización aparece al pie del análisis.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/que-banco-tiene-mas-descuentos-uruguay'
defineOgImageComponent('Cambio', {
  title: '¿Qué banco tiene más descuentos?',
  subtitle: 'Análisis de los descuentos por banco y tarjeta',
  tag: 'Análisis',
})
useSeoMeta({
  title: '¿Qué banco tiene más descuentos en Uruguay? Análisis con datos | Cambio Uruguay',
  description:
    'Comparativa con gráficas de los descuentos por banco en Uruguay: cuántas marcas y locales cubre Itaú, BROU, Santander, BBVA, Scotiabank, OCA y ANDA, en cuántas sirve el débito, marcas exclusivas y qué banco lidera cada rubro.',
  ogTitle: '¿Qué banco tiene más descuentos en Uruguay?',
  ogDescription:
    'Marcas, locales, crédito vs débito y exclusividad por emisor, contados del mapa de descuentos.',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: '¿Qué banco tiene más descuentos en Uruguay?',
            description:
              'Análisis con gráficas de la cobertura de descuentos de cada banco y tarjeta en Uruguay.',
            mainEntityOfPage: canonicalUrl,
            author: { '@type': 'Organization', name: 'Cambio Uruguay' },
            publisher: { '@type': 'Organization', name: 'Cambio Uruguay' },
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
                name: 'Descuentos con tarjeta',
                item: 'https://cambio-uruguay.com/descuentos-con-tarjeta-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Qué banco tiene más descuentos',
                item: canonicalUrl,
              },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.bank-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  vertical-align: middle;
}
.chart-fallback {
  min-height: 260px;
}
</style>
