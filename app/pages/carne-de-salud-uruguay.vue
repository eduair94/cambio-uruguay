<template>
  <VContainer class="carne-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SALUD Y TRABAJO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Carné de salud en Uruguay: cuándo es gratis y cuánto sale
      </h1>
      <p class="lead mb-6">
        El carné de salud se busca como un precio, y la respuesta es que en tu prestador no tiene
        precio: el Decreto 274/017 obliga a las mutualistas, los seguros integrales y ASSE a
        expedirlo <strong>sin costo para el usuario</strong>. Lo que casi nadie sabe es que ese
        derecho viene con una condición —haber pasado por el médico general en los últimos
        {{ CONSULTATION_WINDOW_MONTHS }} meses— y que no cumplirla es la razón por la que tanta
        gente termina pagándolo en un consultorio privado.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-cash-off" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">El orden que te ahorra la plata</div>
            <p class="callout-text mb-0">
              Pedí primero la consulta con el médico general de tu prestador y recién después el
              carné. Hecho en ese orden cumplís la condición del MSP y no pagás nada. Hecho al
              revés, el prestador puede cobrarte la tasa moderadora más el aporte a la Caja de
              Profesionales Universitarios.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Cuánto sale -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto sale, según dónde lo hagas</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Hay tres situaciones distintas y sólo una de ellas tiene un precio publicado de forma
        oficial. El de los consultorios privados no lo publica nadie, así que acá no aparece
        inventado.
      </p>

      <VRow dense>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="price-card pa-5 h-100">
            <div class="price-figure">
              <span class="price-value">$ 0</span>
            </div>
            <p class="price-case font-weight-medium mb-1">En tu prestador integral</p>
            <p class="price-detail text-body-2 text-medium-emphasis mb-0">
              Tu mutualista, tu seguro o ASSE si sos usuario. Sin costo, cumpliendo la condición de
              la consulta previa.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="price-card pa-5 h-100">
            <div class="price-figure">
              <span class="price-value">{{ asseCostUr }} UR</span>
            </div>
            <p class="price-case font-weight-medium mb-1">En ASSE, sin ser usuario de ASSE</p>
            <p class="price-detail text-body-2 text-medium-emphasis mb-0">
              <template v-if="assePesos">
                Son unos <strong>$ {{ assePesos }}</strong> con la UR de hoy. El importe en pesos
                cambia cada mes, cuando se actualiza la unidad.
              </template>
              <template v-else>
                El importe en pesos depende del valor vigente de la Unidad Reajustable.
              </template>
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="price-card is-unknown pa-5 h-100">
            <div class="price-figure">
              <span class="price-value">Sin dato</span>
            </div>
            <p class="price-case font-weight-medium mb-1">En un consultorio privado</p>
            <p class="price-detail text-body-2 text-medium-emphasis mb-0">
              No hay precio regulado ni publicado oficialmente. Cada consultorio cobra lo suyo y por
              eso esta página no publica ninguna cifra.
            </p>
          </VCard>
        </VCol>
      </VRow>

      <VAlert type="info" variant="tonal" density="comfortable" class="price-alert">
        La cifra de <strong>{{ asseCostUr }} UR</strong> la publica el trámite de ASSE en gub.uy.
        Está expresada en Unidades Reajustables y no en pesos porque el INE la actualiza todos los
        meses; acá se convierte con
        <NuxtLink :to="localePath('/indicadores/unidad-reajustable')"
          >el valor de la UR del día</NuxtLink
        >.
      </VAlert>
    </section>

    <!-- Las reglas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las cinco reglas que deciden si pagás</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Cada una lleva la transcripción textual de la norma que la dice. Si en tu prestador te
        responden otra cosa, esta es la letra que podés mostrar.
      </p>

      <VRow>
        <VCol v-for="rule in rules" :key="rule.headline" cols="12" md="6">
          <VCard variant="flat" class="rule-card pa-5 pa-md-6 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ rule.headline }}</h3>
            <p class="rule-detail mb-4">{{ rule.detail }}</p>
            <blockquote class="rule-quote">{{ rule.quote }}</blockquote>
            <p class="rule-source text-body-2 text-medium-emphasis mb-0">
              <a
                :href="sourceFor(rule.sourceIndex).url"
                target="_blank"
                rel="noopener noreferrer"
                >{{ rule.article }}</a
              >
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Vigencias -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto dura</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Son dos documentos distintos con dos plazos distintos, y confundirlos es lo que hace que
        alguien se quede sin carné vigente en medio de una contratación.
      </p>

      <VCard variant="flat" class="validity-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Vigencia</th>
              <th>Letra chica</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Documento" class="font-weight-medium">
                Constancia de Control en Salud
              </td>
              <td data-label="Vigencia">{{ MAX_VALIDITY_MONTHS }} meses como máximo</td>
              <td data-label="Letra chica" class="cu-cell-prose text-medium-emphasis">
                Es un techo, no un plazo garantizado: puede durar menos según la edad y las
                patologías existentes. Vale la fecha impresa en tu constancia.
              </td>
            </tr>
            <tr>
              <td data-label="Documento" class="font-weight-medium">Constancia provisoria</td>
              <td data-label="Vigencia">{{ PROVISIONAL_VALIDITY_MONTHS }} meses</td>
              <td data-label="Letra chica" class="cu-cell-prose text-medium-emphasis">
                Si la emite una institución que no es tu prestador, no te puede dar provisorias
                consecutivas para estirar el trámite.
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </section>

    <!-- Requisitos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué llevar: los requisitos de ASSE</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Es la única lista publicada de forma oficial y completa. Cada mutualista puede pedir lo
        suyo, así que confirmá con la tuya antes de ir; el grueso coincide.
      </p>

      <VRow dense>
        <VCol v-for="req in requirements" :key="req.item" cols="12" sm="6">
          <VCard variant="flat" class="req-card pa-4 h-100">
            <div class="d-flex align-start">
              <VIcon
                icon="mdi-check-circle-outline"
                size="small"
                color="primary"
                class="mr-3 mt-1"
              />
              <div>
                <p class="req-item font-weight-medium mb-1">{{ req.item }}</p>
                <p v-if="req.note" class="req-note text-body-2 text-medium-emphasis mb-0">
                  {{ req.note }}
                </p>
              </div>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Preguntas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="faq in faqs" :key="faq.q" :title="faq.q">
          <template #text>
            <p class="faq-answer mb-0">{{ faq.a }}</p>
          </template>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Relacionadas -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguí por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          v-for="link in related"
          :key="link.to"
          :to="localePath(link.to)"
          variant="tonal"
          size="small"
        >
          {{ link.label }}
        </VBtn>
      </div>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Contrastado el {{ verifiedDisplay }}. Esta página es informativa: quien resuelve tu caso es
        tu prestador de salud.
      </p>
      <ul class="sources-list">
        <li v-for="s in sources" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
          <span class="text-medium-emphasis"> — {{ s.publisher }}</span>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { ExchangeRate } from '~/types/api'
import { currentIndicatorValue, indicatorFromSlug } from '~/utils/indicators'
import {
  HEALTH_CARD_ASSE_COST_UR,
  HEALTH_CARD_CONSULTATION_WINDOW_MONTHS,
  HEALTH_CARD_FAQS,
  HEALTH_CARD_MAX_VALIDITY_MONTHS,
  HEALTH_CARD_PROVISIONAL_VALIDITY_MONTHS,
  HEALTH_CARD_RELATED,
  HEALTH_CARD_REQUIREMENTS,
  HEALTH_CARD_RULES,
  HEALTH_CARD_SOURCES,
  HEALTH_CARD_VERIFIED_AT,
  healthCardCostInPesos,
} from '~/utils/healthCard'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

const rules = HEALTH_CARD_RULES
const requirements = HEALTH_CARD_REQUIREMENTS
const faqs = HEALTH_CARD_FAQS
const related = HEALTH_CARD_RELATED
const sources = HEALTH_CARD_SOURCES

const CONSULTATION_WINDOW_MONTHS = HEALTH_CARD_CONSULTATION_WINDOW_MONTHS
const MAX_VALIDITY_MONTHS = HEALTH_CARD_MAX_VALIDITY_MONTHS
const PROVISIONAL_VALIDITY_MONTHS = HEALTH_CARD_PROVISIONAL_VALIDITY_MONTHS

const asseCostUr = HEALTH_CARD_ASSE_COST_UR.toLocaleString('es-UY', { minimumFractionDigits: 1 })

const sourceFor = (index: number) => HEALTH_CARD_SOURCES[index] ?? HEALTH_CARD_SOURCES[0]!

// El valor de la UR se lee en SSR de la misma API que alimenta /indicadores. Si
// la API no contesta, `currentIndicatorValue` cae al valor de referencia del
// catálogo, y si ni eso sirve la tarjeta muestra sólo «0,4 UR».
const { data: urValue } = await useAsyncData('carne-salud-ur', async () => {
  const indicator = indicatorFromSlug('unidad-reajustable')
  if (!indicator) return null
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRate[]
  return currentIndicatorValue(rows, indicator)
})

const assePesos = computed(() => {
  const pesos = healthCardCostInPesos(urValue.value)
  if (pesos === null) return null
  return pesos.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
})

const verifiedDisplay = computed(() =>
  new Date(HEALTH_CARD_VERIFIED_AT).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)

const canonicalUrl = 'https://cambio-uruguay.com/carne-de-salud-uruguay'
// 40 caracteres: con la marca que agrega app.vue quedan 57 y el SERP no lo
// corta. El H1 puede ser más largo; el <title> no.
const title = 'Carné de salud Uruguay: cuándo es gratis'
const description =
  'Tu mutualista o ASSE tiene que darte el carné de salud sin costo cada 2 años si lo necesitás para trabajar y tuviste consulta con médico general en los últimos 12 meses (Decreto 274/017). En ASSE sin ser usuario sale 0,4 UR. El provisorio dura 6 meses.'

defineOgImageComponent('Cambio', { title, subtitle: description, tag: 'SALUD' })

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'FAQPage',
            mainEntity: HEALTH_CARD_FAQS.map(faq => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.a },
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
              { '@type': 'ListItem', position: 2, name: title, item: canonicalUrl },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
/*
 * El reset de Vuetify 4 no anula el `margin-block: 1em` de la UA en `<p>`, y
 * estos párrafos vienen DESPUÉS de un hermano (el h1, el h2, el h3), así que
 * la regla `:first-child` de critical.css no los alcanza y ese 1em pisaría
 * cualquier separación menor que se declare arriba. Ver DESIGN.md → «The Text
 * Block Owns Its Top Margin Rule»: el espacio lo pone el `mb-*` del elemento
 * anterior, y por eso acá el margen de arriba se declara en cero a propósito.
 */
.lead,
.section-intro,
.callout-text,
.rule-detail,
.faq-answer {
  margin-top: 0;
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.lead {
  max-width: 74ch;
  font-size: 1.05rem;
}

.section-intro {
  max-width: 72ch;
}

.warn-card {
  background: rgba(var(--v-theme-primary), 0.07);
  border: 1px solid rgba(var(--v-theme-primary), 0.24);
  border-radius: 12px;
}

.price-card,
.rule-card,
.req-card,
.validity-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}

.price-figure {
  margin-bottom: 0.5rem;
}

.price-value {
  font-size: 1.85rem;
  font-weight: 700;
  line-height: 1.1;
  color: rgb(var(--v-theme-primary));
}

.price-card.is-unknown .price-value {
  font-size: 1.5rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.price-case,
.price-detail,
.req-item,
.req-note,
.rule-source {
  margin-top: 0;
}

.price-alert {
  margin-top: 1.25rem;
}

.rule-quote {
  margin: 0 0 0.85rem;
  padding-left: 0.9rem;
  border-left: 3px solid rgba(var(--v-theme-primary), 0.45);
  font-style: italic;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.74);
}

.sources-list {
  margin-top: 0;
  padding-left: 1.15rem;
  line-height: 1.7;
}

.sources-list li {
  margin-top: 0.35rem;
}

.sources-list a,
.rule-source a {
  color: rgb(var(--v-theme-primary));
}
</style>
