<!--
THESIS: La factura de OSE no se entiende mirando cuánta agua usaste, porque el saneamiento la cobra
otra vez. La página existe para decir eso con el decreto en la mano.
OWN-WORLD: Mismas superficies y tarjetas que /factura-de-ute-uruguay y /que-pasa-si-no-pago-antel,
que son sus dos hermanas: los tres servicios del hogar con la misma gramática.
STORY: Llegás con una factura cara, entendés de qué está hecha, y te vas sabiendo qué parte no
depende de vos.
-->
<template>
  <VContainer class="ose-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">HOGAR</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Factura de OSE: por qué el saneamiento te cobra el agua dos veces
      </h1>
      <p class="lead mb-6">
        Antes del primer metro cúbico, un hogar con saneamiento ya paga
        <strong>{{ formatUYU(floorWithSaneamiento) }} por mes</strong> en cargos fijos:
        {{ formatUYU(fixed.agua.monto) }} de agua más {{ formatUYU(fixed.saneamiento.monto) }} de
        saneamiento. Y después, cada metro cúbico se factura <strong>dos veces</strong>, porque el
        cargo variable del saneamiento es el {{ rule.porcentaje }} % del cargo variable de agua. Los
        importes son los del {{ decree.numero }}, vigente desde el {{ decree.vigenciaDesde }}.
      </p>

      <VCard class="mechanism-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-3">Lo que pagás sin abrir una canilla</div>
        <div class="floor-grid">
          <div class="floor-item">
            <div class="floor-h">{{ fixed.agua.label }}</div>
            <div class="floor-n">{{ formatUYU(fixed.agua.monto) }}</div>
            <p class="mb-0">{{ fixed.agua.detalle }}</p>
          </div>
          <div class="floor-item">
            <div class="floor-h">{{ fixed.saneamiento.label }}</div>
            <div class="floor-n">{{ formatUYU(fixed.saneamiento.monto) }}</div>
            <p class="mb-0">{{ fixed.saneamiento.detalle }}</p>
          </div>
          <div class="floor-item is-total">
            <div class="floor-h">Piso mensual</div>
            <div class="floor-n">{{ formatUYU(floorWithSaneamiento) }}</div>
            <p class="mb-0">
              Sin saneamiento el piso baja a {{ formatUYU(floorWithoutSaneamiento) }}: el cargo fijo
              de agua se paga igual.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- De qué está hecha -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">De qué está hecha la factura</h2>
      <p class="section-intro mb-5">
        Son cuatro conceptos, no dos: cada uno de los dos servicios tiene su cargo fijo y su cargo
        variable. Así los describe URSEA, el regulador del sector.
      </p>

      <VCard variant="flat" class="table-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Concepto</th>
              <th>Cómo se calcula</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in components" :key="`${c.servicio}-${c.concepto}`">
              <td data-label="Servicio">{{ c.servicio }}</td>
              <td data-label="Concepto">
                <strong>{{ c.concepto }}</strong>
              </td>
              <td data-label="Cómo se calcula">{{ c.comoSeCalcula }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </section>

    <!-- La regla que duplica -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">La regla que duplica</h2>
      <p class="section-intro mb-5">
        Es la línea que explica casi toda la sorpresa de una factura alta. El saneamiento no mide
        cuánta agua sale de tu casa: copia lo que se midió al entrar.
      </p>

      <VCard variant="flat" class="quote-card pa-5 pa-md-6 mb-4">
        <blockquote class="decree-quote mb-3">«{{ rule.citaDecreto }}»</blockquote>
        <p class="quote-attr mb-0">
          {{ decree.numero }}, vigente desde el {{ decree.vigenciaDesde }}.
        </p>
      </VCard>

      <VCard variant="flat" class="warn-card pa-5">
        <p class="card-title mb-2">Una precisión que las dos fuentes no dicen igual</p>
        <p class="mb-0">{{ rule.notaUrsea }}</p>
      </VCard>
    </section>

    <!-- Por qué sube -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Por qué sube más que el agua que usaste</h2>
      <p class="section-intro mb-5">
        Porque hay dos efectos que se multiplican, y ninguno de los dos es proporcional al consumo.
      </p>
      <div class="rule-list">
        <VCard variant="flat" class="rule-card pa-5">
          <p class="card-title mb-2">1. El cargo variable es escalonado y creciente</p>
          <p class="mb-0">
            El precio del metro cúbico sube por tramos de consumo, así que los metros de más de un
            mes cargado no valen lo mismo que los primeros: caen en un tramo más caro.
          </p>
        </VCard>
        <VCard variant="flat" class="rule-card pa-5">
          <p class="card-title mb-2">2. Ese cargo variable, ya encarecido, se cobra dos veces</p>
          <p class="mb-0">
            Si tenés saneamiento, el {{ rule.porcentaje }} % del cargo variable de agua se vuelve a
            facturar como cargo variable de saneamiento. El tramo más caro se paga por duplicado.
          </p>
        </VCard>
      </div>
    </section>

    <!-- Aumento 2026 -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto aumentó en 2026</h2>
      <VCard variant="flat" class="mechanism-card pa-5 pa-md-6">
        <div class="floor-grid">
          <div class="floor-item">
            <div class="floor-h">Ajuste total</div>
            <div class="floor-n">{{ adjustment.total }} %</div>
            <p class="mb-0">Desde el {{ decree.vigenciaDesde }}.</p>
          </div>
          <div class="floor-item">
            <div class="floor-h">Inflación proyectada</div>
            <div class="floor-n">{{ adjustment.inflacionProyectada }} %</div>
            <p class="mb-0">La parte que sigue a los precios del año.</p>
          </div>
          <div class="floor-item">
            <div class="floor-h">Desequilibrio estructural</div>
            <div class="floor-n">{{ adjustment.desequilibrioEstructural }} %</div>
            <p class="mb-0">
              El {{ nonInflationShare }} % del ajuste: no responde a la inflación esperada sino a
              las cuentas del organismo.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Lo que no publicamos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que esta página no publica, y por qué</h2>
      <VCard variant="flat" class="warn-card pa-5">
        <p class="card-title mb-2">La tabla de tramos del cargo variable de agua</p>
        <p class="mb-3">
          El decreto la trae, pero sus filas mezclan dos unidades: las de los primeros tramos dicen
          «por mes» y las siguientes «el m3». Leídas de corrido dan una escala que no sube de forma
          pareja, y URSEA describe el cargo variable como un precio por metro cúbico creciente por
          tramos, que es lo contrario. Con dos lecturas incompatibles y sin una segunda fuente que
          las dirima, preferimos no publicar una tabla de la que sale tu cuenta del agua.
        </p>
        <p class="mb-0">
          El texto que rige es el del decreto:
          <a :href="decree.url" target="_blank" rel="noopener noreferrer">{{ decree.numero }}</a
          >. Las bonificaciones (tarifa social, jubilados) tienen su propio régimen y tampoco se
          detallan acá.
        </p>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in faq" :key="f.question" :title="f.question">
          <template #text>
            <p class="mb-0">{{ f.answer }}</p>
          </template>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Las otras dos del hogar -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Las otras dos facturas del hogar</h2>
      <div class="rule-list">
        <VCard variant="flat" class="rule-card pa-5">
          <p class="card-title mb-2">Factura de UTE: por qué sube</p>
          <p class="mb-3">Los escalones del kWh, la potencia contratada y las bonificaciones.</p>
          <VBtn
            :to="localePath('/factura-de-ute-uruguay')"
            color="primary"
            variant="text"
            append-icon="mdi-arrow-right"
            class="px-0"
          >
            Ver la página
          </VBtn>
        </VCard>
        <VCard variant="flat" class="rule-card pa-5">
          <p class="card-title mb-2">Deuda con Antel: corte y reconexión</p>
          <p class="mb-3">Qué pasa si no pagás, cuándo cortan y cuánto demora volver.</p>
          <VBtn
            :to="localePath('/que-pasa-si-no-pago-antel')"
            color="primary"
            variant="text"
            append-icon="mdi-arrow-right"
            class="px-0"
          >
            Ver la página
          </VBtn>
        </VCard>
      </div>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Cifras contrastadas el {{ verifiedAt }}. Las tarifas se aprueban por decreto todos los años:
        esta página es informativa y el decreto vigente es el que vale.
      </p>
      <ul class="sources-list">
        <li v-for="s in sources" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatUYU } from '~/utils/format'
import {
  OSE_2026_ADJUSTMENT,
  OSE_BILL_COMPONENTS,
  OSE_DECREE,
  OSE_FAQ,
  OSE_FIXED_CHARGES,
  OSE_SOURCES,
  OSE_VERIFIED_AT,
  SANEAMIENTO_RULE,
  fixedMonthlyFloor,
} from '~/utils/oseBill'

const localePath = useLocalePath()

const fixed = OSE_FIXED_CHARGES
const rule = SANEAMIENTO_RULE
const decree = OSE_DECREE
const adjustment = OSE_2026_ADJUSTMENT
const components = OSE_BILL_COMPONENTS
const faq = OSE_FAQ
const sources = OSE_SOURCES

const floorWithSaneamiento = fixedMonthlyFloor(true)
const floorWithoutSaneamiento = fixedMonthlyFloor(false)

/** El 44 %: se deriva acá para que no pueda quedar escrito a mano contra otros dos números. */
const nonInflationShare = computed(() =>
  Math.round((adjustment.desequilibrioEstructural / adjustment.total) * 100)
)

const verifiedAt = new Date(OSE_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/factura-de-ose-uruguay'
const title = 'Factura de OSE: por qué el saneamiento te cobra el agua dos veces'
const description =
  'Un hogar con saneamiento paga $ 464,55 por mes de cargos fijos antes del primer metro cúbico: $ 327,50 de agua (conexión de 12,5 a 13 mm) más $ 137,05 de saneamiento. Y después cada m³ se factura dos veces, porque el cargo variable del saneamiento es el 100 % del de agua. Los cuatro conceptos de la factura, el ajuste de 8,5 % que rige desde enero de 2026 (4,8 % de inflación proyectada y 3,7 % de desequilibrio estructural) y el Decreto 340/025 que fija todo.'

defineOgImageComponent('Cambio', {
  title: 'Factura de OSE: el agua se paga dos veces',
  subtitle: 'Cargos fijos y saneamiento, Decreto 340/025',
  tag: 'HOGAR',
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
        'factura de ose, tarifa ose 2026, cargo fijo ose, saneamiento ose cuanto es, por que viene tan cara la factura de ose, ose cargo variable, decreto 340/025 ose, aumento ose 2026, ose montevideo tarifa, cuanto cuesta el agua en uruguay',
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
              { '@type': 'ListItem', position: 2, name: 'Factura de OSE', item: canonicalUrl },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: OSE_FAQ.map(f => ({
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
.ose-page {
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
/* Vuetify 4 no resetea el `margin-block` de los bloques de texto y acá el gap lo declara el autor:
   sin esto, cada `<p>` que sigue a un hermano se abre 1em por su cuenta. */
.section-intro {
  margin-top: 0;
  max-width: 72ch;
  opacity: 0.78;
}
.card-title {
  margin-top: 0;
  font-weight: 600;
}

.mechanism-card,
.table-card,
.quote-card,
.warn-card,
.rule-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
}
.v-theme--light .mechanism-card,
.v-theme--light .table-card,
.v-theme--light .quote-card,
.v-theme--light .warn-card,
.v-theme--light .rule-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.warn-card {
  border-color: rgba(var(--v-theme-warning), 0.45);
}

.floor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1.25rem;
}
/* Marcador de lista, no tab de tarjeta: estos ítems no tienen fondo propio. */
.floor-item {
  padding-left: 0.9rem;
  border-left: 2px solid rgba(var(--v-theme-primary), 0.45);
}
.floor-item.is-total {
  border-left-color: rgb(var(--v-theme-primary));
}
.floor-h {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
}
.floor-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
}
.floor-item p {
  margin-top: 0.35rem;
  font-size: 0.9rem;
  opacity: 0.8;
}

.rule-list {
  display: grid;
  gap: 0.85rem;
}

.decree-quote {
  margin: 0;
  padding-left: 1rem;
  border-left: 3px solid rgba(var(--v-theme-primary), 0.55);
  font-style: italic;
  line-height: 1.6;
  max-width: 72ch;
}
.quote-attr {
  margin-top: 0;
  font-size: 0.85rem;
  opacity: 0.7;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
