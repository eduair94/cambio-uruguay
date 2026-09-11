<template>
  <VContainer class="antecedentes-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">TRÁMITES</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Certificado de antecedentes judiciales: cuánto sale y quién te lo puede pedir
      </h1>
      <p class="lead mb-6">
        El que todo el mundo llama <strong>certificado de buena conducta</strong> tiene dos tarifas,
        las dos escritas en Unidades Indexadas: <strong>26,50 UI</strong> si lo pedís común y
        <strong>53,10 UI</strong> si lo pedís urgente. Caduca a los
        <strong>{{ VIGENCIA_DIAS }} días</strong> de expedido. Y hay una línea en la ficha del
        trámite que cambia la respuesta a la mitad de las consultas sobre este tema: se expide
        <strong>sólo para organismos públicos u oficinas consulares</strong>.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-account-question-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Antes de ir a pagarlo</div>
            <p class="callout-text mb-0">
              Si te lo pidió una empresa privada para entrar a trabajar, o una inmobiliaria para
              alquilar, fijate primero en la tabla de abajo: ese destino no está entre los que el
              trámite atiende. Para el personal que trata directamente con niñas, niños y
              adolescentes existe <em>otro</em> certificado, el de la Ley 19.791, y lo pide la
              institución, no vos.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Cuánto sale hoy, en pesos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto sale hoy, en pesos</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El Estado publica las dos tarifas en Unidades Indexadas, así que en pesos cambian todos los
        días y ninguna nota que diga «sale tantos pesos» sigue siendo cierta una semana después. Con
        la UI en <strong>{{ formatUi(valorUi) }}</strong> —el valor que sirve nuestra página de
        <NuxtLink :to="localePath('/indicadores/unidad-indexada')">la Unidad Indexada</NuxtLink>—
        así quedan las dos.
      </p>

      <VTable class="tarifas-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Modalidad</th>
            <th>Demora</th>
            <th>Tarifa</th>
            <th>En pesos hoy</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in MODALIDADES" :key="m.id">
            <td data-label="Modalidad">
              <strong>{{ m.nombre }}</strong>
            </td>
            <td data-label="Demora" class="text-no-wrap">{{ m.plazo }}</td>
            <td data-label="Tarifa" class="text-no-wrap">{{ formatUi(m.costoUi) }} UI</td>
            <td data-label="En pesos hoy" class="text-no-wrap">
              <VChip color="primary" size="small" variant="tonal">
                {{ formatPesos(uiAPesos(m.costoUi, valorUi)) }}
              </VChip>
            </td>
          </tr>
        </tbody>
      </VTable>

      <VCard variant="flat" class="note-card pa-5 mt-6">
        <p class="note-text mb-0">
          <VIcon icon="mdi-clock-fast" color="warning" size="18" class="mr-1" />
          <strong>Apurarlo cuesta {{ formatPorcentaje(sobreprecioUrgente()) }} más.</strong> Es la
          única diferencia entre las dos: el mismo certificado, para los mismos destinos, en 2 días
          hábiles en vez de 15 corridos. La conversión a pesos de esta página es orientativa y usa
          la UI de hoy; el importe que termines pagando es el que te liquide el propio trámite.
        </p>
      </VCard>
    </section>

    <!-- Quién te lo puede pedir -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Quién te lo puede pedir</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La ficha del trámite lo dice en una línea:
        <strong>«Este tramite se expide sólo para Organismos Públicos u Oficinas Consulares»</strong
        >. Al pedirlo tenés que declarar el destino preciso, y ahí es donde se cae la mitad de los
        pedidos que la gente recibe.
      </p>

      <div class="destinos">
        <div
          v-for="d in DESTINOS"
          :key="d.quien"
          class="destino"
          :class="d.admitido ? 'is-yes' : 'is-no'"
        >
          <p class="destino__head mb-1">
            <VIcon
              :icon="d.admitido ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline'"
              :color="d.admitido ? 'success' : 'error'"
              size="18"
              class="mr-1"
            />
            <strong>{{ d.quien }}</strong>
          </p>
          <p class="destino__note text-body-2 text-medium-emphasis mb-0">{{ d.detalle }}</p>
        </div>
      </div>

      <p class="section-intro text-medium-emphasis mt-5 mb-0">
        Si el que se pasa de requisitos es un organismo público, la propia ficha enlaza un
        <a :href="DENUNCIA_URL" target="_blank" rel="noopener nofollow">formulario de denuncia</a>
        por incumplimiento del Decreto 353/023, que obliga a las entidades públicas a dejar de pedir
        constancias que puedan obtenerse por otros medios. Para lo que sí te pueden pedir al
        alquilar, mirá
        <NuxtLink :to="localePath('/primer-alquiler-uruguay')">el primer alquiler</NuxtLink> y
        <NuxtLink :to="localePath('/alquilar-en-uruguay')">las garantías</NuxtLink>; si el problema
        es laboral,
        <NuxtLink :to="localePath('/a-quien-le-reclamo-uruguay')">a quién le reclamás</NuxtLink>.
      </p>
    </section>

    <!-- El otro certificado -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El otro certificado, el de la Ley 19.791</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Se confunden porque se llaman casi igual, pero funcionan al revés. El artículo 1 obliga a
        <strong
          >toda institución pública o privada del área educativa, de la salud y todas las que
          impliquen trato directo con niñas, niños y adolescentes, personas con discapacidad y
          personas mayores en situación de dependencia</strong
        >
        a pedirle ella misma a la Dirección Nacional de Policía Científica un certificado sobre la
        persona a contratar. No es un papel que vos tengas que llevar: es una obligación de quien
        contrata.
      </p>

      <VCard variant="flat" class="delitos-card pa-5 pa-md-6">
        <p class="delitos-intro mb-3">
          Su alcance es exactamente esta lista de {{ LEY_19791_DELITOS.length }} literales, ni más
          ni menos:
        </p>
        <ul class="delitos">
          <li v-for="delito in LEY_19791_DELITOS" :key="delito">{{ delito }}</li>
        </ul>
      </VCard>

      <VCard variant="flat" class="note-card pa-5 mt-6">
        <p class="note-text mb-0">
          <VIcon icon="mdi-help-circle-outline" color="warning" size="18" class="mr-1" />
          <strong>Acá hay algo que no cierra y no lo vamos a maquillar.</strong> El artículo 2 de la
          Ley 19.791 dice que ese certificado «no tendrá costo alguno para la institución
          solicitante». La ficha de gub.uy del mismo certificado, en cambio, publica 26,5 UI. Las
          dos cosas pueden convivir —la gratuidad está escrita para la institución, no para la
          persona que lo tramite por su cuenta— pero eso es una lectura nuestra y no un texto, así
          que dejamos las dos fuentes enlazadas abajo y no declaramos cuál manda en tu caso.
        </p>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-5">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in ANTECEDENTES_FAQ" :key="f.question" :title="f.question">
          <template #text>
            <p class="faq-answer mb-0">{{ f.answer }}</p>
          </template>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-2">Fuentes</h2>
      <p class="sources-note text-caption text-medium-emphasis mb-3">
        Todo lo de esta página sale de la ficha oficial del trámite en gub.uy y del texto vigente en
        IMPO, verificado el {{ ANTECEDENTES_VERIFIED_AT }}. Es información general y no
        asesoramiento para tu caso.
      </p>
      <ul class="sources-list text-caption text-medium-emphasis">
        <li v-for="s in ANTECEDENTES_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener nofollow">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import type { ExchangeRate } from '~/types/api'
import {
  ANTECEDENTES_FAQ,
  ANTECEDENTES_SOURCES,
  ANTECEDENTES_VERIFIED_AT,
  DESTINOS,
  LEY_19791_DELITOS,
  MODALIDADES,
  VIGENCIA_DIAS,
  sobreprecioUrgente,
  uiAPesos,
} from '~/utils/certificadoAntecedentes'
import { currentIndicatorValue, indicatorFromSlug } from '~/utils/indicators'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

const uiIndicator = indicatorFromSlug('unidad-indexada')!

// Mismo origen que /indicadores: la fila del BCU manda y, si la API no contesta, cae al valor de
// referencia del catálogo. Nunca queda en 0, así que la tabla no muestra $ 0.
const { data: uiValue } = await useAsyncData('antecedentes-ui', async () => {
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRate[]
  return currentIndicatorValue(rows, uiIndicator)
})

const valorUi = computed(() => uiValue.value ?? uiIndicator.referenceValue)

/** El formulario de denuncia que enlaza la propia ficha del trámite. */
const DENUNCIA_URL = 'https://www.gub.uy/tramites//formulario-reclamo-decreto-353-23?procedure=1296'

const formatPesos = (n: number): string =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

const formatUi = (n: number): string =>
  n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatPorcentaje = (n: number): string =>
  n.toLocaleString('es-UY', { style: 'percent', maximumFractionDigits: 0 })

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/certificado-de-antecedentes-judiciales-uruguay'
const title = 'Certificado de buena conducta: 26,50 UI'
const description =
  'El certificado de antecedentes judiciales sale 26,50 UI común (15 días corridos) o 53,10 UI urgente (2 días hábiles) y caduca a los 90 días; acá lo convertimos a pesos con la UI del BCU de hoy. Y el dato que casi nadie dice: se expide sólo para organismos públicos u oficinas consulares, así que una empresa privada o un propietario no están entre sus destinos.'

defineOgImageComponent('Cambio', {
  title: 'Certificado de antecedentes judiciales',
  subtitle: '26,50 UI común o 53,10 UI urgente, y caduca a los 90 días',
  tag: 'TRÁMITES',
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
        'certificado de buena conducta uruguay, certificado de antecedentes judiciales uruguay, cuanto sale el certificado de buena conducta, certificado de antecedentes penales uruguay, buena conducta urgente uruguay, certificado ley 19791, certificado libre de delitos sexuales uruguay, policia cientifica antecedentes, cuanto dura el certificado de buena conducta',
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
                name: 'Certificado de antecedentes judiciales',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: ANTECEDENTES_FAQ.map(f => ({
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
            citation: ANTECEDENTES_SOURCES.map(s => ({
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
.antecedentes-page {
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
.callout-text,
.note-text,
.faq-answer,
.sources-note,
.delitos-intro {
  max-width: 72ch;
  margin-top: 0;
}

.warn-card,
.note-card,
.delitos-card,
.destino {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  background: rgba(var(--v-theme-surface), 1);
}
.warn-card {
  background: rgba(var(--v-theme-primary), 0.06);
}
.note-card {
  background: rgba(var(--v-theme-warning), 0.06);
}

.tarifas-table :deep(th) {
  white-space: nowrap;
}

.destinos {
  display: grid;
  gap: 12px;
}
.destino {
  padding: 14px 16px;
}
.destino.is-yes {
  border-left: 3px solid rgb(var(--v-theme-success));
}
.destino.is-no {
  border-left: 3px solid rgb(var(--v-theme-error));
}
.destino__head,
.destino__note {
  margin-top: 0;
  max-width: 72ch;
}

.delitos {
  margin-top: 0;
  margin-bottom: 0;
  padding-left: 1.25rem;
  display: grid;
  gap: 6px;
  max-width: 78ch;
}
.delitos li {
  line-height: 1.5;
}

.sources-list {
  margin-top: 0;
  padding-left: 1.25rem;
  display: grid;
  gap: 8px;
}
.sources-list a,
.section-intro a {
  color: rgb(var(--v-theme-primary));
}
</style>
