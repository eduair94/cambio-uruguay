<template>
  <div class="pagar-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/salud-financiera')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Salud financiera
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-pagar pa-6">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">mdi-credit-card-check-outline</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              Pagar cuentas con tarjeta de crédito por Totalnet: ¿suma puntos? ¿conviene?
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 pagar-intro">
              Cómo pagar UTE, OSE, Antel, la patente e impuestos con tarjeta de crédito en
              pagos.totalnet.uy, si esos pagos acumulan millas o puntos (con el caso de Itaú Volar)
              y una calculadora para ver si te conviene. Análisis honesto, sin humo.
            </p>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end mt-3">
          <ShareButtons
            text="Pagar cuentas con tarjeta de crédito por Totalnet: ¿suma puntos y conviene?"
          />
        </div>
      </div>
    </VCard>

    <!-- Verdict up front -->
    <VAlert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-6"
      icon="mdi-lightbulb-on-outline"
    >
      <strong>La regla de oro:</strong> las millas y puntos son un <em>extra</em> sobre un gasto que
      igual ibas a pagar. Canalizar por tarjeta cuentas que de todos modos pagás te da un ~1% de
      retorno y hasta 20–50 días de crédito sin interés. Pero <strong>nunca</strong> pagues un
      recargo ni financies el saldo solo para juntar puntos: los intereses de la tarjeta se comen
      cualquier beneficio.
    </VAlert>

    <!-- Calculator: the signature element -->
    <VCard class="calc-card mb-8 pa-5 pa-sm-6">
      <div class="d-flex align-center mb-4">
        <VIcon color="primary" class="mr-2">mdi-calculator-variant-outline</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">¿Te conviene? Calculalo</h2>
      </div>

      <VRow>
        <VCol cols="12" md="7">
          <label class="calc-label">Cuentas que pagás por mes con la tarjeta (UYU)</label>
          <VSlider
            v-model="monthlyBills"
            :min="0"
            :max="60000"
            :step="500"
            color="primary"
            hide-details
            class="mt-1"
          >
            <template #append>
              <span class="calc-value">{{ fmt(monthlyBills) }}</span>
            </template>
          </VSlider>

          <label class="calc-label mt-4">Retorno de tu tarjeta (millas/puntos/cashback)</label>
          <VSlider
            v-model="rewardRatePct"
            :min="0"
            :max="3"
            :step="0.1"
            color="primary"
            hide-details
            class="mt-1"
          >
            <template #append>
              <span class="calc-value">{{ rewardRatePct.toFixed(1) }}%</span>
            </template>
          </VSlider>
          <p class="text-caption text-grey-lighten-1 mb-0">
            Referencia: Itaú Volar da 1 milla por US$1 (~1%). El valor real del punto/milla suele
            ser bajo e incierto.
          </p>

          <label class="calc-label mt-4">Recargo por pagar con crédito</label>
          <VSlider
            v-model="surchargePct"
            :min="0"
            :max="6"
            :step="0.25"
            color="primary"
            hide-details
            class="mt-1"
          >
            <template #append>
              <span class="calc-value">{{ surchargePct.toFixed(2) }}%</span>
            </template>
          </VSlider>
          <p class="text-caption text-grey-lighten-1 mb-0">
            En 1 cuota el comercio suele absorber el costo (recargo 0%). Verificá el importe final
            antes de confirmar.
          </p>
        </VCol>

        <VCol cols="12" md="5">
          <div
            class="calc-result pa-4 text-center h-100 d-flex flex-column justify-center"
            :class="verdictClass"
          >
            <p class="text-caption text-uppercase mb-1 calc-result-label">Resultado por año</p>
            <p class="calc-net mb-1">{{ signed(result.net) }}</p>
            <p class="text-body-2 mb-3 calc-verdict">
              {{
                result.worthIt ? 'Te conviene' : result.net === 0 ? 'Es indistinto' : 'No conviene'
              }}
            </p>
            <div class="calc-breakdown text-left">
              <div class="d-flex justify-space-between">
                <span>Ganás en premios</span
                ><span class="font-weight-bold">{{ fmt(result.yearlyReward) }}</span>
              </div>
              <div class="d-flex justify-space-between">
                <span>Pagás de recargo</span
                ><span class="font-weight-bold">−{{ fmt(result.yearlySurcharge) }}</span>
              </div>
            </div>
          </div>
        </VCol>
      </VRow>
      <p class="text-caption text-grey-darken-1 mt-4 mb-0">
        Supuesto clave: pagás el resumen completo cada mes. Si financiás el saldo, la tasa rotativa
        (que puede llegar a ~80–100% anual) supera por lejos cualquier premio y el resultado real es
        muy negativo.
      </p>
    </VCard>

    <!-- What is Totalnet -->
    <section class="mb-6">
      <h2 class="text-h6 font-weight-bold mb-3 pagar-section-title">
        <VIcon start size="small" color="primary">mdi-help-circle-outline</VIcon>
        ¿Qué es pagos.totalnet.uy?
      </h2>
      <VCard variant="flat" class="pagar-section pa-5">
        <p class="text-body-2 mb-3">
          <strong>Totalnet es el ex-VisaNet</strong>: la principal procesadora y adquirente de pagos
          con tarjeta del país (fundada en 1997 por los bancos emisores; renombrada Totalnet en 2022
          al pasar a ser multiadquirente y procesar tanto Visa como Mastercard). Su portal
          <a
            href="https://pagos.totalnet.uy"
            target="_blank"
            rel="noopener noreferrer"
            class="pagar-link"
            >pagos.totalnet.uy</a
          >
          te permite pagar cuentas y servicios con tarjeta de crédito o débito, de forma manual o
          por débito automático adherido a la tarjeta.
        </p>
        <p class="text-body-2 mb-2">
          Clave para los puntos: Totalnet procesa el pago como una
          <strong>compra con tarjeta</strong> (una transacción de adquirencia),
          <strong>no</strong> como un pago por red de cobranza tipo Abitab/Redpagos ni como un
          adelanto de efectivo.
        </p>
        <p class="text-caption text-grey-lighten-1 mb-2">Podés pagar, entre otros:</p>
        <div class="d-flex flex-wrap ga-2">
          <VChip v-for="s in payables" :key="s" size="small" variant="tonal" color="primary">{{
            s
          }}</VChip>
        </div>
      </VCard>
    </section>

    <!-- Points / Itaú -->
    <section class="mb-6">
      <h2 class="text-h6 font-weight-bold mb-3 pagar-section-title">
        <VIcon start size="small" color="primary">mdi-star-four-points-outline</VIcon>
        ¿Suma puntos o millas? El caso de Itaú
      </h2>
      <VCard variant="flat" class="pagar-section pa-5">
        <p class="text-body-2 mb-3">
          En Uruguay las compras con tarjeta de crédito acumulan puntos/millas del emisor, y pagar
          servicios con la tarjeta es una vía habitual para juntarlos. El programa de Itaú es
          <strong>Volar</strong> (millas): <strong>1 milla por cada US$1</strong> gastado con
          crédito (1 milla cada US$2 con débito).
        </p>
        <p class="text-body-2 mb-3">
          El reglamento de Volar excluye expresamente los adelantos de efectivo, los intereses, las
          comisiones y —textual— los
          <strong>pagos por las redes de cobranza Abitab o Redpagos</strong>. Como Totalnet
          <strong>no</strong> es Abitab/Redpagos sino un adquirente que procesa el pago como compra,
          y el "pago de servicios" no figura como categoría excluida, lo esperable es que un pago
          por Totalnet con tarjeta Itaú <strong>sí sume millas Volar</strong>, igual que el débito
          automático cargado a la tarjeta de crédito (que el reglamento lista como que sí acumula).
        </p>
        <VAlert
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-0"
          icon="mdi-alert-outline"
        >
          Ojo: esto es una <strong>inferencia</strong>, no una confirmación oficial de Itaú para
          Totalnet (depende del rubro/MCC con que se codifique la transacción). Antes de operar con
          volumen, confirmá con Itaú (0800/1784) que el pago efectivamente impacte millas.
        </VAlert>
      </VCard>
    </section>

    <!-- Surcharge (corrected) -->
    <section class="mb-6">
      <h2 class="text-h6 font-weight-bold mb-3 pagar-section-title">
        <VIcon start size="small" color="primary">mdi-cash-remove</VIcon>
        ¿Hay recargo por pagar con crédito?
      </h2>
      <VCard variant="flat" class="pagar-section pa-5">
        <p class="text-body-2 mb-3">
          Es el punto que define todo. En la web de Totalnet aparecen comisiones de
          <strong>3,75% + impuestos</strong> (tarjetas locales) y
          <strong>4,5% + impuestos</strong> (tarjetas del exterior), pero
          <strong>no son un recargo al que paga</strong>: son la
          <strong>comisión de adquirencia que Totalnet le retiene al comercio/cobrador</strong>
          (liquidándole en 3 ciclos). Los planes de cuotas al consumidor arrancan recién en 7 cuotas
          (coeficientes ~1,03–1,10 en pesos).
        </p>
        <p class="text-body-2 mb-0">
          En la práctica: al pagar una factura <strong>en 1 cuota</strong>, el costo de
          procesamiento suele absorberlo la empresa cobradora, así que
          <strong>no deberías pagar un extra</strong>. Pero no está garantizado y varía por
          comercio, así que <strong>verificá el importe final antes de confirmar cada pago</strong>:
          cualquier recargo cambia por completo la conveniencia (probalo moviendo el recargo en la
          calculadora de arriba).
        </p>
      </VCard>
    </section>

    <!-- Pros / cons -->
    <VRow class="mb-2">
      <VCol cols="12" md="6">
        <VCard variant="flat" class="pagar-section pa-5 h-100">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">
            <VIcon start size="small" color="success">mdi-thumb-up-outline</VIcon>
            A favor
          </h3>
          <ul class="pagar-list pagar-pro">
            <li v-for="(p, i) in pros" :key="i">{{ p }}</li>
          </ul>
        </VCard>
      </VCol>
      <VCol cols="12" md="6">
        <VCard variant="flat" class="pagar-section pa-5 h-100">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">
            <VIcon start size="small" color="error">mdi-thumb-down-outline</VIcon>
            En contra
          </h3>
          <ul class="pagar-list pagar-con">
            <li v-for="(c, i) in cons" :key="i">{{ c }}</li>
          </ul>
        </VCard>
      </VCol>
    </VRow>

    <!-- Disclaimer -->
    <VAlert
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mt-4"
      icon="mdi-alert-outline"
    >
      Informativo, no asesoramiento financiero. No tenemos afiliación con Totalnet ni con los
      emisores. Las comisiones, coeficientes de cuotas y reglas de los programas de puntos cambian:
      verificá siempre el importe final y la letra chica vigente antes de operar.
    </VAlert>

    <!-- Sources -->
    <VCard variant="flat" class="pagar-section mt-4 pa-5">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes
      </h2>
      <ul class="pagar-sources">
        <li v-for="(s, i) in sources" :key="i">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </VCard>

    <!-- Cross-link -->
    <VCard class="cta-pagar mt-6 pa-6 text-center" variant="flat">
      <h2 class="text-h6 font-weight-bold mb-2 text-white">¿Qué tarjeta da los mejores puntos?</h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        Comparamos y rankeamos los programas de puntos y beneficios de las tarjetas de crédito
        uruguayas con criterios transparentes.
      </p>
      <VBtn
        :to="localePath('/tarjetas-de-credito-uruguay')"
        color="primary"
        variant="elevated"
        class="cta-btn"
      >
        <VIcon start>mdi-trophy-outline</VIcon>
        Ver el ranking de tarjetas
      </VBtn>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import { billPayWorthIt } from '~/utils/cardRewards'

const localePath = useLocalePath()

const monthlyBills = ref(15000)
const rewardRatePct = ref(1)
const surchargePct = ref(0)

const result = computed(() =>
  billPayWorthIt({
    monthlyBills: monthlyBills.value,
    rewardRatePct: rewardRatePct.value,
    surchargePct: surchargePct.value,
  })
)
const verdictClass = computed(() =>
  result.value.net > 0 ? 'is-good' : result.value.net < 0 ? 'is-bad' : 'is-neutral'
)

const fmt = (n: number) => '$ ' + Math.round(n).toLocaleString('es-UY')
const signed = (n: number) =>
  (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n)).replace('$ ', '$ ')

const payables = [
  'UTE (luz)',
  'OSE (agua)',
  'Antel',
  'Patente (SUCIVE)',
  'Impuestos de Intendencia',
  'Seguros',
  'Colegios y cuotas',
  'Mutualistas / salud',
  'Clubes y asociaciones',
]

const pros = [
  'Pagás UTE, OSE, Antel, patente e impuestos desde un solo lugar, sin filas.',
  'Acepta Visa y Mastercard de cualquier emisor, local o del exterior.',
  'Permite débito automático a la tarjeta de crédito (evita olvidos y moras).',
  'Al procesarse como compra, suma las millas/puntos del emisor (~1% en el caso Itaú Volar).',
  'Pagando el resumen completo, ganás 20–50 días de crédito sin interés (float gratis).',
]
const cons = [
  'Si aparece un recargo, se paga mucho más de lo que valen las millas (~1%): pérdida neta.',
  'No hay confirmación oficial de que Totalnet acumule puntos ni de que el contado sea sin recargo.',
  'Si no pagás el resumen completo, la tasa rotativa destruye cualquier beneficio.',
  'El valor real de la milla/punto es bajo e incierto (sin tabla de canje pública).',
  'Requiere registrarte en el portal y, con débito automático, complica reclamos si la factura llega mal.',
]

const sources = [
  { label: 'Portal oficial — pagos.totalnet.uy', url: 'https://pagos.totalnet.uy/' },
  { label: 'Totalnet — comisiones a clientes (adquirencia)', url: 'https://totalnet.uy/clientes' },
  {
    label: 'Totalnet — venta en cuotas (planes al consumidor)',
    url: 'https://totalnet.uy/vende-en-cuotas',
  },
  {
    label: 'El Observador — de VisaNet a Totalnet',
    url: 'https://www.elobservador.com.uy/nota/de-visanet-a-totalnet-para-crecer-y-seguir-liderando-el-mercado-de-pagos-digitales-202211218552',
  },
  {
    label: 'Itaú — Reglamento del programa Volar',
    url: 'https://www.itau.com.uy/inst/aci/docs/Reglamento_programa_volar.pdf',
  },
  {
    label: 'Itaú — Preguntas frecuentes Volar (exclusión Abitab/Redpagos)',
    url: 'https://www.itau.com.uy/inst/aci/docs/PreguntasfrecuentesprogramaVolar.pdf',
  },
  {
    label: 'IMPO — Ley 20.243 (recargos sobre propinas)',
    url: 'https://www.impo.com.uy/bases/leyes/20243-2023/1',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/pagar-cuentas-con-tarjeta'
const title = 'Pagar cuentas con tarjeta de crédito por Totalnet: ¿suma puntos y conviene? (2026)'
const description =
  'Guía para pagar UTE, OSE, Antel, patente e impuestos con tarjeta de crédito en pagos.totalnet.uy: si acumula millas o puntos (caso Itaú Volar), si hay recargo, pros y contras, y una calculadora para saber si te conviene.'

defineOgImageComponent('Cambio', {
  title: 'Pagar cuentas con tarjeta',
  subtitle: 'Totalnet, puntos Itaú y una calculadora de conveniencia',
  tag: 'GUÍA',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
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
        'pagar cuentas con tarjeta de credito uruguay, totalnet, pagos totalnet, pagar ute con tarjeta, millas itau volar, puntos tarjeta credito uruguay, pagar patente con tarjeta',
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
                name: 'Pagar cuentas con tarjeta',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: '¿Pagar cuentas con tarjeta de crédito por Totalnet suma puntos o millas?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Como Totalnet procesa el pago como una compra con tarjeta (no como un pago por red de cobranza Abitab/Redpagos ni como adelanto de efectivo), lo esperable es que acumule las millas o puntos del emisor, igual que cualquier compra. En el caso de Itaú, el programa Volar da 1 milla por cada US$1 y solo excluye adelantos, intereses, comisiones y pagos por Abitab/Redpagos; el pago de servicios no está excluido. No hay confirmación oficial específica para Totalnet, así que conviene verificarlo con el emisor antes de operar con volumen.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Totalnet cobra recargo por pagar con tarjeta de crédito?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Las comisiones de 3,75% (locales) y 4,5% (exterior) que figuran en la web de Totalnet son la comisión de adquirencia que se le retiene al comercio o cobrador, no un recargo al pagador. Los planes de cuotas al consumidor arrancan en 7 cuotas. Al pagar una factura en 1 cuota, el costo suele absorberlo la empresa cobradora, pero no está garantizado: conviene verificar el importe final antes de confirmar cada pago.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Conviene pagar cuentas con tarjeta solo para juntar puntos?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'No como estrategia de ganancia: el retorno máximo realista es cercano al 1% y solo se materializa si no hay recargo y pagás el resumen completo cada mes. Si financiás el saldo, la tasa rotativa (que puede llegar a 80-100% anual) supera por lejos cualquier premio. Sí es razonable canalizar por la tarjeta gastos que igual ibas a pagar, para sumar ese ~1% marginal y usar el crédito sin interés, pero nunca pagar recargos ni endeudarse para acumular puntos.',
                },
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
.bg-gradient-pagar {
  background: linear-gradient(135deg, #0f766e 0%, #4338ca 100%);
}

.pagar-page {
  overflow-x: hidden;
}

.pagar-intro {
  max-width: 800px;
  line-height: 1.6;
}

.pagar-section-title {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}

.pagar-section,
.calc-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.v-theme--light .pagar-section,
.v-theme--light .calc-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}

/* Calculator */
.calc-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  display: block;
}
.v-theme--light .calc-label {
  color: rgba(0, 0, 0, 0.7);
}
.calc-value {
  min-width: 92px;
  text-align: right;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-primary));
}
.calc-result {
  border-radius: 14px;
  border: 2px solid transparent;
}
.calc-result.is-good {
  background: rgba(22, 163, 74, 0.12);
  border-color: rgba(22, 163, 74, 0.4);
}
.calc-result.is-bad {
  background: rgba(220, 38, 38, 0.1);
  border-color: rgba(220, 38, 38, 0.4);
}
.calc-result.is-neutral {
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(148, 163, 184, 0.35);
}
.calc-result-label {
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
}
.v-theme--light .calc-result-label {
  color: rgba(0, 0, 0, 0.55);
}
.calc-net {
  font-size: 2.1rem;
  font-weight: 800;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.is-good .calc-net,
.is-good .calc-verdict {
  color: #16a34a;
}
.is-bad .calc-net,
.is-bad .calc-verdict {
  color: #ef4444;
}
.calc-verdict {
  font-weight: 700;
}
.calc-breakdown {
  font-size: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 10px;
}
.v-theme--light .calc-breakdown {
  border-top-color: rgba(0, 0, 0, 0.12);
}
.calc-breakdown > div {
  margin: 2px 0;
}

.pagar-list {
  margin: 0;
  padding-left: 1.1rem;
}
.pagar-list li {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  line-height: 1.5;
}
.pagar-pro li::marker {
  color: #16a34a;
}
.pagar-con li::marker {
  color: #ef4444;
}

.pagar-link,
.pagar-sources a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.pagar-link:hover,
.pagar-sources a:hover {
  text-decoration: underline;
}
.pagar-sources {
  margin: 0;
  padding-left: 1.1rem;
}
.pagar-sources li {
  margin-bottom: 0.4rem;
  font-size: 0.88rem;
  line-height: 1.5;
}

.cta-pagar {
  background: rgba(67, 56, 202, 0.14);
  border: 1px solid rgba(67, 56, 202, 0.3);
  border-radius: 12px;
}
.cta-btn {
  height: auto;
  min-height: 44px;
  max-width: 100%;
  white-space: normal;
}
.cta-btn :deep(.v-btn__content) {
  white-space: normal;
  padding-block: 8px;
}
</style>
