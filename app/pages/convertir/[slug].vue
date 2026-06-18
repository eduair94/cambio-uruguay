<template>
  <div v-if="entry" class="convert-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="9">
          <!-- Breadcrumb -->
          <div class="mb-4">
            <VBtn :to="localePath('/convertir')" variant="text" size="small" class="px-1">
              <VIcon start size="small">mdi-arrow-left</VIcon>
              Conversiones
            </VBtn>
          </div>

          <!-- Header card with the headline result -->
          <VCard class="overflow-hidden mb-5" elevation="8">
            <div class="bg-gradient-convert pa-6">
              <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-2">{{ title }}</h1>
              <p v-if="pending" class="text-body-1 text-grey-lighten-2 mb-0">
                Cargando cotización en vivo…
              </p>
              <template v-else>
                <div class="text-h3 font-weight-bold text-white">
                  {{ headlineFormatted }}
                </div>
                <p class="text-body-2 text-grey-lighten-2 mb-0 mt-1">{{ headlineNote }}</p>
              </template>
              <div class="d-flex justify-start justify-md-end mt-3">
                <ShareButtons :text="title" />
              </div>
            </div>
          </VCard>

          <!-- Detail table -->
          <VCard class="pa-5 mb-5">
            <h2 class="text-h6 font-weight-bold mb-3">Detalle de la conversión</h2>
            <VTable density="comfortable" class="convert-table">
              <tbody>
                <tr v-if="entry.to === 'UYU'">
                  <td>
                    Si <strong>vendés</strong> {{ amountLabel(entry.amount, entry.from) }} (mejor
                    compra)
                  </td>
                  <td class="text-right font-weight-bold text-primary">
                    {{ formatUYU(receiveSelling) }}
                  </td>
                </tr>
                <tr v-if="entry.to === 'UYU'">
                  <td>
                    Si <strong>comprás</strong> {{ amountLabel(entry.amount, entry.from) }} (mejor
                    venta)
                  </td>
                  <td class="text-right font-weight-bold text-success">
                    {{ formatUYU(payBuying) }}
                  </td>
                </tr>
                <tr v-if="entry.to !== 'UYU'">
                  <td>Comprando {{ CONVERT_CURRENCIES[foreign].plural }} (mejor venta)</td>
                  <td class="text-right font-weight-bold text-success">
                    {{ formatForeign(buyForeign) }}
                  </td>
                </tr>
                <tr v-if="entry.to !== 'UYU'">
                  <td>Vendiendo pesos al mejor precio de compra</td>
                  <td class="text-right font-weight-bold text-primary">
                    {{ formatForeign(sellForeign) }}
                  </td>
                </tr>
                <tr>
                  <td class="text-grey">Cotización de referencia</td>
                  <td class="text-right text-grey">{{ rateNote }}</td>
                </tr>
              </tbody>
            </VTable>
          </VCard>

          <!-- SEO copy -->
          <article class="convert-copy mb-5">
            <h2 class="text-h6 font-weight-bold mb-3">{{ title }}</h2>
            <p class="text-body-1 text-grey-lighten-1 convert-prose">{{ paragraph1 }}</p>
            <p class="text-body-1 text-grey-lighten-1 convert-prose">{{ paragraph2 }}</p>
          </article>

          <!-- Related amounts -->
          <VCard v-if="related.length" variant="flat" class="related-box pa-5 mb-5">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">Otros montos</h2>
            <div class="d-flex flex-wrap ga-2">
              <VChip
                v-for="rel in related"
                :key="rel.slug"
                :to="localePath(`/convertir/${rel.slug}`)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                {{ amountLabel(rel.amount, rel.from) }}
              </VChip>
            </div>
          </VCard>

          <!-- CTA -->
          <VCard class="cta-convert pa-6 text-center" variant="flat">
            <h2 class="text-h6 font-weight-bold mb-2 text-white">Compará antes de operar</h2>
            <p class="text-body-2 text-grey-lighten-1 mb-4">
              Mirá la cotización por casa de cambio o convertí cualquier monto con el conversor en
              vivo.
            </p>
            <div class="d-flex justify-center flex-wrap ga-2">
              <VBtn :to="localePath('/cotizacion/dolar')" color="primary" variant="elevated">
                <VIcon start>mdi-chart-line</VIcon>
                Cotización del dólar
              </VBtn>
              <VBtn
                :to="localePath('/herramientas/conversor-de-monedas')"
                color="secondary"
                variant="tonal"
              >
                <VIcon start>mdi-cash-sync</VIcon>
                Conversor de monedas
              </VBtn>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatUYU, formatCurrency } from '~/utils/format'
import { round } from '~/utils/calculators'
import {
  amountLabel,
  CONVERT_CURRENCIES,
  convertSlugs,
  convertTitle,
  foreignCode,
  getConvertEntry,
  relatedAmounts,
  type ConvertCode,
} from '~/utils/convert'
import type { CurrencyCode } from '~/utils/currencyPages'

definePageMeta({
  validate: route => convertSlugs().includes(String(route.params.slug ?? '')),
})

const localePath = useLocalePath()
const route = useRoute()

const slug = computed(() => String(route.params.slug ?? ''))
const entry = computed(() => getConvertEntry(slug.value))

if (!entry.value) {
  throw createError({ statusCode: 404, statusMessage: 'Conversión no encontrada' })
}

const foreign = computed<ConvertCode>(() => foreignCode(entry.value!))
const title = computed(() => convertTitle(entry.value!))

const { bestSell, bestBuy, pending } = useExchangeRates()

const sellRate = computed(() => bestSell(foreign.value as CurrencyCode)) // price to buy foreign
const buyRate = computed(() => bestBuy(foreign.value as CurrencyCode)) // price to sell foreign

// foreign -> UYU
const receiveSelling = computed(() =>
  buyRate.value ? round(entry.value!.amount * buyRate.value) : null
)
const payBuying = computed(() =>
  sellRate.value ? round(entry.value!.amount * sellRate.value) : null
)
// UYU -> foreign
const buyForeign = computed(() =>
  sellRate.value ? round(entry.value!.amount / sellRate.value, 2) : null
)
const sellForeign = computed(() =>
  buyRate.value ? round(entry.value!.amount / buyRate.value, 2) : null
)

const formatForeign = (v: number | null) => formatCurrency(v, foreign.value)

// Headline: foreign->UYU uses what you'd receive (best buy); UYU->foreign uses
// how many units you can buy (best sell).
const headlineValue = computed(() =>
  entry.value!.to === 'UYU' ? receiveSelling.value : buyForeign.value
)
const headlineFormatted = computed(() => {
  if (headlineValue.value === null) return 'Cotización no disponible'
  return entry.value!.to === 'UYU'
    ? formatUYU(headlineValue.value)
    : formatForeign(headlineValue.value)
})
const headlineNote = computed(() =>
  entry.value!.to === 'UYU'
    ? `Valor aproximado de ${amountLabel(entry.value!.amount, entry.value!.from)} al mejor precio de compra`
    : `${amountLabel(entry.value!.amount, entry.value!.from)} alcanzan para esa cantidad al mejor precio de venta`
)

const rateNote = computed(() => {
  const buy = buyRate.value
  const sell = sellRate.value
  const cur = CONVERT_CURRENCIES[foreign.value].singular
  if (!buy && !sell) return 'No disponible'
  return `1 ${cur} ≈ compra ${formatUYU(buy)} · venta ${formatUYU(sell)}`
})

const related = computed(() => (entry.value ? relatedAmounts(entry.value) : []))

// Amount/currency-aware copy so each page is substantive and unique.
const fromName = computed(() => CONVERT_CURRENCIES[entry.value!.from].plural)
const toName = computed(() => CONVERT_CURRENCIES[entry.value!.to].plural)

const paragraph1 = computed(() => {
  const amt = amountLabel(entry.value!.amount, entry.value!.from)
  if (entry.value!.to === 'UYU') {
    return `Para saber cuánto son ${amt} en ${toName.value} hay que mirar la cotización del momento, porque cambia a lo largo del día y varía entre casas de cambio. En esta página tomamos la mejor cotización en vivo de más de 40 casas relevadas en Uruguay para darte el valor más cercano al mercado real. Recordá que el precio depende de si vendés la divisa (te aplican el precio de compra de la casa) o la comprás (te aplican el de venta).`
  }
  return `Para saber cuántos ${toName.value} podés conseguir con ${amt} hay que mirar el precio de venta de la divisa en el momento, ya que cambia durante el día y entre casas de cambio. Tomamos la mejor cotización en vivo de más de 40 casas en Uruguay para acercarte al valor real de mercado.`
})

const paragraph2 = computed(() => {
  return `La diferencia entre el mejor y el peor precio puede representar varios pesos por unidad, y en montos altos se vuelve dinero real. Por eso conviene comparar antes de operar. Podés ver el detalle por casa en la cotización del ${CONVERT_CURRENCIES[foreign.value].singular}, o convertir cualquier otro importe con el conversor de monedas. Las cifras de esta página son una referencia informativa: confirmá siempre la cotización final con la casa de cambio antes de cerrar la operación.`
})

const canonicalUrl = computed(() => `https://cambio-uruguay.com/convertir/${slug.value}`)

defineOgImageComponent('Cambio', {
  title: () => title.value,
  subtitle: () => `Cotización en vivo · ${fromName.value} a ${toName.value}`,
  tag: 'CONVERTIR',
})

useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description: () =>
    `Cuánto es ${amountLabel(entry.value!.amount, entry.value!.from)} en ${toName.value} hoy, con la cotización en vivo de más de 40 casas de cambio en Uruguay.`,
  ogTitle: () => title.value,
  ogDescription: () =>
    `Conversión en vivo de ${amountLabel(entry.value!.amount, entry.value!.from)} a ${toName.value}.`,
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => title.value,
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
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
              name: 'Conversiones',
              item: 'https://cambio-uruguay.com/convertir',
            },
            { '@type': 'ListItem', position: 3, name: title.value, item: canonicalUrl.value },
          ],
        })
      ),
    },
  ],
})
</script>

<style scoped>
.bg-gradient-convert {
  background: linear-gradient(135deg, #16c784 0%, #2f81f7 100%);
}
.convert-table :deep(td) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.convert-prose {
  line-height: 1.8;
}
.related-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.cta-convert {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
