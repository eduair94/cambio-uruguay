<template>
  <VContainer class="garnish-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">DEUDAS Y SUELDO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Embargo de sueldo en Uruguay: cuánto te pueden descontar
      </h1>
      <p class="lead mb-6">
        El sueldo es, por regla, <strong>inembargable</strong>. El artículo 381 del Código General
        del Proceso lo dice en su primera línea y recién después abre dos excepciones tasadas:
        deudas por tributos y pensiones alimenticias, {{ capThird }}, y hasta la mitad solo cuando
        la pensión es de menores o incapaces. Por encima de esos topes rige un piso: la Ley 17.829
        te garantiza cobrar al menos el {{ RETENTION_FLOOR_PCT }} % de tu nominal después de
        impuestos y aportes.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-scale-balance" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo que casi todo el mundo confunde</div>
            <p class="callout-text mb-0">
              <strong>Embargo</strong> y <strong>retención de haberes</strong> no son lo mismo. El
              embargo lo ordena un juez y solo procede en los casos del artículo 381. La retención
              nace de un contrato que vos firmaste: el artículo 5 de la Ley 17.829 exige
              consentimiento expreso, y el artículo 4 le prohíbe a cualquier empresa retener sin
              autorización legal. Una deuda con una tarjeta o una financiera no habilita ninguna de
              las dos por sí sola.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Los topes -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las únicas puertas para embargar un sueldo</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El numeral 1 del artículo 381 protege las remuneraciones de empleados públicos y privados y
        también las pensiones, jubilaciones y retiros. Todo lo que no está en esta tabla queda del
        lado de la regla general: no se embarga.
      </p>

      <VTable class="cap-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Motivo de la deuda</th>
            <th>Tope</th>
            <th>Norma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cap in GARNISHMENT_CAPS" :key="cap.kind">
            <td data-label="Motivo">
              <div class="font-weight-medium">{{ cap.label }}</div>
              <div class="text-caption text-medium-emphasis cap-detail">{{ cap.detail }}</div>
            </td>
            <td data-label="Tope" class="text-no-wrap">
              <strong>{{ cap.asText }}</strong>
            </td>
            <td data-label="Norma" class="text-caption text-medium-emphasis">
              {{ cap.article }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- El piso -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El piso que nadie puede perforar</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El artículo 3 de la Ley 17.829 no mira la deuda: te mira a vos. Ninguna persona física puede
        percibir por su salario o pasividad menos del {{ RETENTION_FLOOR_PCT }} % del monto nominal,
        deducidos los impuestos a las rentas con sus anticipos y las contribuciones especiales de
        seguridad social. El porcentaje baja al {{ RETENTION_FLOOR_PCT_HOUSING }} % cuando entre las
        retenciones hay servicio de garantía de alquileres o actos cooperativos.
      </p>

      <VCard variant="flat" class="formula-card pa-5 pa-md-6 mb-6">
        <div class="formula">
          <span class="term">nominal</span>
          <span class="op">−</span>
          <span class="term">IRPF o IASS</span>
          <span class="op">−</span>
          <span class="term">aportes</span>
          <span class="op">=</span>
          <span class="term is-result">base</span>
          <span class="op">×</span>
          <span class="term is-law">{{ RETENTION_FLOOR_PCT }} %</span>
          <span class="op">=</span>
          <span class="term is-result">lo que cobrás igual</span>
        </div>
        <p class="formula-note text-body-2 text-medium-emphasis mb-0">
          Ojo con la base: no es tu líquido de bolsillo. Los descuentos voluntarios no se restan
          antes, porque son justamente las retenciones que el artículo viene a limitar.
        </p>
      </VCard>

      <VCard variant="flat" class="form-card pa-5 pa-md-6">
        <div class="text-overline mb-4">Calculá tu piso</div>
        <VRow dense>
          <VCol cols="12" sm="4">
            <VTextField
              v-model.number="nominal"
              label="Nominal del mes"
              type="number"
              prefix="$"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="4">
            <VTextField
              v-model.number="incomeTax"
              label="IRPF o IASS del mes"
              type="number"
              prefix="$"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="4">
            <VTextField
              v-model.number="socialSecurity"
              label="Aportes (BPS, FONASA, FRL)"
              type="number"
              prefix="$"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
        </VRow>

        <VSwitch
          v-model="housing"
          color="primary"
          density="compact"
          hide-details
          class="mt-3"
          :label="`Hay garantía de alquiler o actos cooperativos (el piso pasa a ${RETENTION_FLOOR_PCT_HOUSING} %)`"
        />

        <VDivider class="my-5" />

        <VRow dense>
          <VCol cols="12" sm="4">
            <div class="result-label">Base del artículo 3</div>
            <div class="result-value">$ {{ money(base) }}</div>
          </VCol>
          <VCol cols="12" sm="4">
            <div class="result-label">Cobrás como mínimo</div>
            <div class="result-value is-ok">$ {{ money(floor) }}</div>
          </VCol>
          <VCol cols="12" sm="4">
            <div class="result-label">Espacio para retener</div>
            <div class="result-value">$ {{ money(room) }}</div>
          </VCol>
        </VRow>

        <VDivider class="my-5" />

        <VSelect
          v-model="kind"
          :items="kindOptions"
          item-title="label"
          item-value="kind"
          label="Si además hay un embargo judicial, ¿por qué motivo?"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <p class="binding-text mb-0">
          Tope del embargo ({{ selectedCap?.asText }}): <strong>$ {{ money(judicialCap) }}</strong
          >. Manda
          {{
            binding.binding === 'tope' ? 'el tope del artículo 381' : 'el piso de la Ley 17.829'
          }}, así que el descuento no debería pasar de <strong>$ {{ money(binding.amount) }}</strong
          >.
        </p>
        <p class="disclaimer text-caption text-medium-emphasis mb-0">
          La fracción («la tercera parte», «la mitad») es la del artículo 381; sobre qué base exacta
          se liquida lo resuelve el juez de cada expediente. Esto es una referencia, no una
          liquidación.
        </p>
      </VCard>
    </section>

    <!-- Orden de prelación -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si no alcanza, ¿cuál se cae primero?</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El orden lo fija el artículo 1 de la Ley 17.829 y no lo negocian los acreedores. Dentro de
        un mismo nivel prevalece la operación que se comunicó antes a la empresa que actúa como
        agente de retención.
      </p>

      <ol class="order-list">
        <li v-for="rank in RETENTION_ORDER" :key="rank.position" class="order-item">
          <span class="order-badge">{{ rank.letter ?? '★' }}</span>
          <span class="order-label">{{ rank.label }}</span>
        </li>
      </ol>
    </section>

    <!-- Otros bienes -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que tampoco se embarga</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El mismo artículo 381 protege otras cosas, cada una con su salvedad. Los bienes suntuarios
        quedan siempre fuera de la protección.
      </p>

      <VRow dense>
        <VCol v-for="asset in EXEMPT_ASSETS" :key="asset.numeral" cols="12" md="6">
          <VCard variant="flat" class="asset-card pa-4 h-100">
            <div class="text-overline mb-1">Numeral {{ asset.numeral }}</div>
            <p class="asset-label font-weight-medium mb-2">{{ asset.label }}</p>
            <p class="asset-caveat text-body-2 text-medium-emphasis mb-0">{{ asset.caveat }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in SALARY_FAQ" :key="f.question">
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
        <VBtn :to="localePath('/salir-del-clearing')" variant="tonal" size="small">
          Salir del Clearing
        </VBtn>
        <VBtn :to="localePath('/saldar-deudas-uruguay')" variant="tonal" size="small">
          Saldar deudas
        </VBtn>
        <VBtn
          :to="localePath('/prescripcion-de-deudas-con-el-estado-uruguay')"
          variant="tonal"
          size="small"
        >
          Prescripción de deudas con el Estado
        </VBtn>
        <VBtn
          :to="localePath('/adelanto-de-efectivo-tarjeta-de-credito')"
          variant="tonal"
          size="small"
        >
          Los topes de tasa del BCU
        </VBtn>
        <VBtn
          :to="localePath('/herramientas/calculadora-sueldo-liquido')"
          variant="tonal"
          size="small"
        >
          Calculadora de sueldo líquido
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-body-2 text-medium-emphasis mb-3">
        Contrastado contra el texto vigente en impo.com.uy el {{ verifiedAt }}. Esta página es
        informativa y no sustituye el asesoramiento de un abogado: lo que vale en un expediente es
        lo que resuelve el juez.
      </p>
      <ul class="sources-list">
        <li v-for="s in SALARY_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  EXEMPT_ASSETS,
  GARNISHMENT_CAPS,
  RETENTION_FLOOR_PCT,
  RETENTION_FLOOR_PCT_HOUSING,
  RETENTION_ORDER,
  SALARY_FAQ,
  SALARY_SOURCES,
  SALARY_VERIFIED_AT,
  bindingLimit,
  garnishmentCap,
  maxRetention,
  retentionBase,
  retentionFloor,
  type GarnishmentKind,
} from '~/utils/salaryGarnishment'

const localePath = useLocalePath()

const nominal = ref(60000)
const incomeTax = ref(0)
const socialSecurity = ref(10800)
const housing = ref(false)
const kind = ref<GarnishmentKind>('tributos')

const kindOptions = GARNISHMENT_CAPS.map(cap => ({ kind: cap.kind, label: cap.label }))
const selectedCap = computed(() => GARNISHMENT_CAPS.find(cap => cap.kind === kind.value))

const base = computed(() =>
  retentionBase({
    nominal: nominal.value,
    incomeTax: incomeTax.value,
    socialSecurity: socialSecurity.value,
  })
)
const floor = computed(() => retentionFloor(base.value, housing.value))
const room = computed(() => maxRetention(base.value, housing.value))
const judicialCap = computed(() => garnishmentCap(base.value, kind.value))
const binding = computed(() => bindingLimit(base.value, kind.value, housing.value))

const moneyFmt = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 })
const money = (n: number) => moneyFmt.format(Math.round(n))

const verifiedAt = new Date(`${SALARY_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** «hasta la tercera parte», tomado de la propia tabla para que el intro no lo repita a mano. */
const capThird = GARNISHMENT_CAPS.find(cap => cap.kind === 'tributos')?.asText ?? 'hasta un tercio'

const canonicalUrl = 'https://cambio-uruguay.com/embargo-de-sueldo-uruguay'
const title = 'Embargo de sueldo en Uruguay: cuánto te pueden descontar'
const description = `El sueldo es inembargable salvo por tributos y pensión alimenticia: hasta un tercio, y hasta la mitad si es de menores (CGP art. 381). Y siempre cobrás al menos el ${RETENTION_FLOOR_PCT} % de tu nominal después de impuestos y aportes, ${RETENTION_FLOOR_PCT_HOUSING} % con garantía de alquiler (Ley 17.829 art. 3).`

defineOgImageComponent('Cambio', {
  title: 'Embargo de sueldo en Uruguay',
  subtitle: 'Los dos topes y el piso, con el artículo al lado',
  tag: 'DEUDAS',
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
        'embargo de sueldo uruguay, me pueden embargar el sueldo, retencion de haberes uruguay, cuanto me pueden descontar del sueldo, bienes inembargables uruguay, articulo 381 cgp, ley 17829, orden de prelacion retenciones, embargo por pension alimenticia uruguay, embargo por deuda de tarjeta',
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
                name: 'Embargo de sueldo en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: SALARY_FAQ.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: SALARY_SOURCES.map(s => ({
              '@type': 'CreativeWork',
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
.garnish-page {
  max-width: 1180px;
}

/* Vuetify 4 no cero los márgenes de los bloques de texto, y un <p> que sigue a un hermano se come
   cualquier separación menor a 1em: por eso cada uno declara el suyo. Ver app/AGENTS.md. */
.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  margin-top: 0;
}
.section-intro,
.formula-note,
.sources-note {
  max-width: 72ch;
  margin-top: 0;
}
.callout-text,
.asset-label,
.asset-caveat {
  margin-top: 0;
}
.binding-text {
  margin-top: 16px;
}
.disclaimer {
  margin-top: 8px;
}

.warn-card,
.form-card,
.formula-card,
.asset-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  background: rgba(var(--v-theme-surface), 1);
}
.warn-card {
  background: rgba(var(--v-theme-primary), 0.06);
}

.formula {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
}
.formula .term {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.formula .term.is-law {
  background: rgba(var(--v-theme-primary), 0.16);
  font-weight: 600;
}
.formula .term.is-result {
  background: rgba(22, 199, 132, 0.16);
  font-weight: 600;
}
.formula .op {
  opacity: 0.6;
}

.cap-table :deep(th) {
  white-space: nowrap;
}
.cap-detail {
  display: block;
  margin-top: 4px;
  max-width: 68ch;
  line-height: 1.5;
}

.result-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.7;
}
.result-value {
  font-size: 1.35rem;
  font-weight: 700;
  margin-top: 2px;
}
.result-value.is-ok {
  color: rgb(22, 199, 132);
}

.order-list {
  list-style: none;
  padding-left: 0;
  margin-top: 0;
}
.order-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
}
.order-item:last-child {
  border-bottom: none;
}
.order-badge {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
  background: rgba(var(--v-theme-primary), 0.14);
}
.order-label {
  line-height: 1.5;
}

.sources-list {
  padding-left: 1.1rem;
  margin-top: 0;
}
.sources-list li {
  margin-bottom: 6px;
  line-height: 1.5;
}
.sources-list a {
  color: rgb(var(--v-theme-primary));
}
</style>
