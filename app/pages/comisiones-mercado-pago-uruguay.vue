<template>
  <VContainer class="mp-fees-page py-8 py-md-12">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Comisiones de Mercado Pago', disabled: true },
      ]"
    />

    <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
      Comisiones de Mercado Pago para cobrar en Uruguay
    </h1>

    <p class="lead mb-8">
      Mercado Pago cobra entre 1,15 % y 11,99 % + IVA por cada venta, según el medio de cobro
      (código QR, link de pago, checkout, suscripción o el lector Point), cómo paga el cliente y el
      plazo que elegís para tener el dinero disponible. Acá está la tabla oficial completa, lo que
      sale el aparato Point y cuándo y cómo se retira la plata. Última lectura:
      {{ verifiedAt }}.
    </p>

    <!-- Calculadora -->
    <section id="calcular" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Calculá cuánto te queda de una venta</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Elegí el medio de cobro y el plazo con el que trabajás: se descuenta la comisión de Mercado
        Pago y el 22 % de IVA que se le agrega a esa comisión.
      </p>
      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="form-card pa-5">
            <VTextField
              v-model.number="amount"
              type="number"
              label="Monto de la venta"
              min="0"
              prefix="$"
              density="comfortable"
              variant="outlined"
              class="mb-4"
            />
            <VSelect
              v-model="rowIndex"
              :items="rowOptions"
              item-title="label"
              item-value="index"
              label="Medio de cobro y plazo"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCard>
        </VCol>

        <VCol cols="12" md="7">
          <VCard variant="flat" class="result-card pa-5 h-100">
            <div class="text-overline mb-2">Con {{ selectedRow.label }}</div>
            <p class="text-h6 font-weight-bold mb-3">
              Te quedan {{ result ? formatUYU(result.net) : '—' }} netos.
            </p>
            <VTable class="cu-mobile-cards mb-0" density="comfortable">
              <tbody>
                <tr>
                  <td data-label="Concepto">Comisión ({{ pctLabel(selectedRow.pct) }} %)</td>
                  <td data-label="Monto" class="text-right">
                    −{{ result ? formatUYU(result.fee) : '—' }}
                  </td>
                </tr>
                <tr>
                  <td data-label="Concepto">IVA de la comisión (22 %)</td>
                  <td data-label="Monto" class="text-right">
                    −{{ result ? formatUYU(result.iva) : '—' }}
                  </td>
                </tr>
                <tr>
                  <td data-label="Concepto" class="font-weight-medium">Neto para vos</td>
                  <td data-label="Monto" class="text-right font-weight-medium">
                    {{ result ? formatUYU(result.net) : '—' }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Tabla completa -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">La tabla oficial completa</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Todos los porcentajes son <strong>+ IVA</strong>. "Te quedan" es el neto de una venta de $
        1.000, comisión e IVA ya descontados.
      </p>
      <div class="table-wrap">
        <VTable density="comfortable" class="cu-mobile-cards">
          <thead>
            <tr>
              <th scope="col">Medio</th>
              <th scope="col">Cómo paga el cliente</th>
              <th scope="col">Plazo</th>
              <th scope="col">Comisión (+ IVA)</th>
              <th scope="col">Te quedan de $ 1.000</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in MP_FEES" :key="i">
              <td data-label="Medio" class="font-weight-medium">{{ row.label }}</td>
              <td data-label="Cómo paga el cliente">{{ row.payer }}</td>
              <td data-label="Plazo">{{ row.release }}</td>
              <td data-label="Comisión (+ IVA)">{{ pctLabel(row.pct) }} %</td>
              <td data-label="Te quedan de $ 1.000" class="font-weight-medium">
                {{ formatUYU(feeForSale(1000, row.pct)?.net ?? 0) }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </section>

    <!-- Cuotas sin interés -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuotas sin interés</h2>
      <p class="mb-0" style="max-width: 72ch">
        Ofrecer cuotas sin interés en código QR, link de pago o checkout suma un cargo fijo aparte
        de la comisión base, sea que el comprador elija 3, 6, 9 o 12 cuotas:
        <strong>{{ pctLabel(MP_INSTALLMENT_SURCHARGE.qr) }} % + IVA</strong> en QR y
        <strong>{{ pctLabel(MP_INSTALLMENT_SURCHARGE.link) }} % + IVA</strong> en link de pago y
        checkout. En Point Smart no hay recargo aparte: el costo de la financiación ya está
        integrado en el porcentaje según el tramo de cuotas de la tabla de arriba.
      </p>
    </section>

    <!-- Point: el aparato -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Point: el aparato</h2>
      <VCard
        v-for="device in MP_POINT_DEVICES"
        :key="device.name"
        variant="flat"
        class="device-card pa-5 pa-md-6"
      >
        <div class="d-flex align-start ga-3">
          <VIcon icon="mdi-cellphone-check" color="primary" size="32" class="mt-1" />
          <div>
            <div class="text-subtitle-1 font-weight-bold mb-1">{{ device.name }}</div>
            <p class="text-h6 font-weight-bold mb-2">{{ formatUYU(device.price, 0) }}</p>
            <p class="mb-0 text-medium-emphasis">{{ device.note }}</p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Cuándo cobrás y cómo retirás -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuándo cobrás y cómo retirás</h2>
      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="release-card pa-5 h-100">
            <div class="text-overline mb-2">Plazo de liberación</div>
            <p class="mb-2">
              Hoy hay dos opciones publicadas: <strong>al instante</strong> o
              <strong>a 21 días</strong>. Pedir el dinero antes cuesta más comisión.
            </p>
            <p class="mb-0 text-medium-emphasis">{{ MP_RELEASE.howToChange }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="release-card pa-5 h-100">
            <div class="text-overline mb-2">Retiro a cuenta bancaria</div>
            <p class="mb-2">
              <strong>{{ MP_WITHDRAWAL.cost }}</strong
              >, acreditado dentro de <strong>{{ MP_WITHDRAWAL.timing }}</strong> desde que lo
              pedís.
            </p>
            <p class="mb-0 text-medium-emphasis">{{ MP_WITHDRAWAL.forcedNote }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Lo que no te dicen -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que no te dicen</h2>
      <VAlert type="info" variant="tonal" density="comfortable" class="mb-0">
        <ul class="not-told-list mb-0">
          <li>
            El porcentaje que muestra la app y el sitio es <strong>sin IVA</strong>: Mercado Pago
            factura la comisión con el 22 % agregado, así que el costo real siempre es mayor al
            número que aparece primero.
          </li>
          <li>
            El plazo que elegís cambia el porcentaje, no al revés: liberar el dinero al instante es
            más caro que esperar 21 días en todos los medios que publican los dos plazos.
          </li>
          <li>
            Antes de activar Mercado Pago para un cobro puntual, compará contra una
            <NuxtLink :to="localePath('/comisiones-de-transferencia-uruguay')" class="cu-link">
              transferencia bancaria
            </NuxtLink>
            : para montos altos entre cuentas propias, una transferencia gratuita puede salir más
            barata que cualquiera de estos porcentajes.
          </li>
        </ul>
      </VAlert>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded class="mb-12" />

    <!-- Seguir leyendo -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguir leyendo</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/que-empresa-abrir-uruguay')" variant="tonal" size="small">
          Qué empresa abrir
        </VBtn>
        <VBtn :to="localePath('/facturar-en-monotributo-uruguay')" variant="tonal" size="small">
          Facturar en monotributo
        </VBtn>
        <VBtn :to="localePath('/comisiones-de-transferencia-uruguay')" variant="tonal" size="small">
          Comisiones de transferencia
        </VBtn>
        <VBtn :to="localePath('/tarjetas-de-debito-uruguay')" variant="tonal" size="small">
          Tarjetas de débito
        </VBtn>
        <VBtn :to="localePath('/pagar-cuentas-con-tarjeta')" variant="tonal" size="small">
          Pagar cuentas con tarjeta
        </VBtn>
      </div>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Contrastado contra mercadopago.com.uy el {{ verifiedAt }}. El monto que vale es el que
        muestre tu cuenta: Mercado Pago puede cambiar estos porcentajes sin aviso previo.
      </p>
      <ul class="sources-list">
        <li v-for="src in MP_SOURCES" :key="src.url">
          <a :href="src.url" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import type { FaqItem } from '~/utils/faqAnswers'
import { formatUYU } from '~/utils/format'
import {
  MP_FAQ,
  MP_FEES,
  MP_FEES_VERIFIED_AT,
  MP_INSTALLMENT_SURCHARGE,
  MP_POINT_DEVICES,
  MP_RELEASE,
  MP_SOURCES,
  MP_WITHDRAWAL,
  feeForSale,
} from '~/utils/mercadoPagoFees'

const localePath = useLocalePath()

const amount = ref(1000)
const rowIndex = ref(3) // link de pago, al instante — el medio sin distinción por tarjeta.

const rowOptions = MP_FEES.map((row, index) => ({
  index,
  label: `${row.label} · ${row.payer} · ${row.release}`,
}))

const selectedRow = computed(() => MP_FEES[rowIndex.value] ?? MP_FEES[0]!)

const amountSafe = computed(() => (Number.isFinite(amount.value) ? Math.max(0, amount.value) : 0))

const result = computed(() => feeForSale(amountSafe.value, selectedRow.value.pct))

const pctLabel = (pct: number) => pct.toLocaleString('es-UY', { minimumFractionDigits: 2 })

const faq = MP_FAQ as FaqItem[]

const verifiedAt = new Date(`${MP_FEES_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/comisiones-mercado-pago-uruguay'
const title = 'Comisiones de Mercado Pago para cobrar'
const description =
  'Del 1,15 % (QR con débito) al 11,99 % (Point en 12 cuotas), más IVA. Tabla por medio y plazo, cuánto te queda de cada venta y cuándo se libera la plata.'

defineOgImageComponent('Cambio', {
  title: 'Comisiones de Mercado Pago',
  subtitle: 'Del 1,15 % al 11,99 %, más IVA',
  tag: 'PAGOS',
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
        'comision mercado pago, cuanto cobra mercado pago, mercado pago point precio, point smart, mercado pago pos, comisiones mercado pago uruguay, cobrar con mercado pago, link de pago mercado pago',
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
                name: 'Comisiones de Mercado Pago',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: MP_FEES_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: MP_SOURCES.map(s => ({
              '@type': 'WebPage',
              name: s.label,
              url: s.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.mp-fees-page {
  max-width: 1180px;
}
.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  margin-top: 0;
}
.table-wrap {
  overflow-x: auto;
}
.form-card,
.result-card,
.device-card,
.release-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 1);
}
.not-told-list {
  padding-left: 1.1rem;
}
.not-told-list li {
  margin-bottom: 8px;
}
.not-told-list li:last-child {
  margin-bottom: 0;
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
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
</style>
