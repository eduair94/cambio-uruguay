<template>
  <VContainer class="cobro-page py-6" style="max-width: 900px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Fecha de cobro del BPS', disabled: true },
      ]"
    />

    <div class="text-overline text-medium-emphasis mb-2">BPS · Prestaciones</div>
    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Fecha de cobro del BPS: cuándo y dónde cobrás
    </h1>

    <p class="text-body-1 mb-6" style="max-width: 68ch">
      El BPS no tiene un día único para todos: publica dos calendarios por mes —uno de prestaciones
      de activos y otro de pasivos— y la fecha depende de la prestación y de dónde cobres. Acá está
      el mecanismo, que no cambia de un mes al otro, y las cuatro formas de averiguar tu fecha en un
      minuto.
    </p>

    <!-- El SMS, que es la vía más rápida -->
    <h2 class="text-h6 font-weight-bold mb-2">Averiguá tu fecha por SMS</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      Es la vía que no necesita ni computadora ni datos. Escribí tu cédula y te armamos el texto
      exacto que hay que mandar al <strong>1997</strong>.
    </p>
    <VRow class="mb-6">
      <VCol cols="12" md="5">
        <VCard variant="flat" class="calc-card pa-5">
          <VTextField
            v-model="cedula"
            label="Tu cédula"
            placeholder="1.234.567-8"
            density="comfortable"
            variant="outlined"
            hide-details
          />
          <p class="text-caption text-medium-emphasis mt-2 mb-0">
            Podés escribirla con puntos y guion, como está impresa. No se envía a ningún lado: el
            mensaje se arma en tu navegador.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="7">
        <VCard variant="flat" class="result-card pa-5 h-100">
          <div class="text-overline mb-2">Mandá este mensaje al 1997</div>
          <p class="text-h5 font-weight-bold mb-2">
            <template v-if="smsText">{{ smsText }}</template>
            <template v-else>Escribí tu número de cédula.</template>
          </p>
          <p class="mb-0 text-medium-emphasis text-body-2">
            El BPS contesta con tu fecha y tu lugar de cobro. El mismo dato está en el servicio en
            línea «Consultar fecha y lugar de cobro de mis prestaciones».
          </p>
        </VCard>
      </VCol>
    </VRow>

    <!-- Las cuatro vías -->
    <h2 class="text-h6 font-weight-bold mb-2">Las cuatro vías para consultar</h2>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th scope="col">Vía</th>
            <th scope="col">Cómo</th>
            <th scope="col">Cuándo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="channel in BPS_CONSULT_CHANNELS" :key="channel.id">
            <td data-label="Vía" class="font-weight-medium">{{ channel.name }}</td>
            <td data-label="Cómo">{{ channel.how }}</td>
            <td data-label="Cuándo">{{ channel.availability }}</td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <!-- El mecanismo -->
    <h2 class="text-h6 font-weight-bold mb-2">Tres reglas que no cambian</h2>
    <VRow class="mb-6">
      <VCol v-for="rule in RULES" :key="rule.title" cols="12" md="4">
        <VCard variant="flat" class="step-card pa-4 h-100">
          <div class="text-subtitle-1 font-weight-bold mb-1">{{ rule.title }}</div>
          <p class="text-body-2 text-medium-emphasis mb-0">{{ rule.detail }}</p>
        </VCard>
      </VCol>
    </VRow>

    <!-- Dónde -->
    <h2 class="text-h6 font-weight-bold mb-2">Dónde se cobra</h2>
    <div class="table-wrap mb-4">
      <VTable density="comfortable" class="cu-mobile-cards">
        <tbody>
          <tr>
            <td data-label="Modalidad">Banco o dinero electrónico</td>
            <td data-label="Dónde" class="font-weight-medium">
              Directo en la cuenta: {{ BPS_ELECTRONIC_INSTRUMENTS.join(', ') }}
            </td>
          </tr>
          <tr>
            <td data-label="Modalidad">Presencial en Montevideo</td>
            <td data-label="Dónde" class="font-weight-medium">
              Edificio Sede del BPS y red descentralizada: {{ BPS_NETWORKS_MONTEVIDEO.join(', ') }}
            </td>
          </tr>
          <tr>
            <td data-label="Modalidad">Presencial en el interior</td>
            <td data-label="Dónde" class="font-weight-medium">
              Red descentralizada de tu localidad: {{ BPS_NETWORKS_INTERIOR.join(', ') }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Los pagos a domicilio en Montevideo y las giras de pago en el interior siguen como siempre.
    </p>
    <VAlert type="info" variant="tonal" density="comfortable" class="mb-6">
      <ul class="plain-list mb-0">
        <li v-for="doc in BPS_REQUIRED_DOCUMENTS" :key="doc">{{ doc }}</li>
      </ul>
    </VAlert>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde sale esto</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Todo lo de arriba está contrastado contra el propio BPS. Última lectura: {{ verifiedAt }}. Las
      fechas del mes no se copian acá a propósito: envejecen el 1.º del mes siguiente, así que la
      del mes en curso se mira en el calendario oficial o con tu cédula.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in BPS_COBRO_SOURCES" :key="src.url">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/suplemento-solidario-bps')" class="cu-link">
        Suplemento solidario del BPS
      </NuxtLink>
      <NuxtLink :to="localePath('/pension-a-la-vejez-uruguay')" class="cu-link">
        Pensión a la vejez
      </NuxtLink>
      <NuxtLink :to="localePath('/cuando-me-puedo-jubilar-uruguay')" class="cu-link">
        Cuándo me puedo jubilar
      </NuxtLink>
      <NuxtLink :to="localePath('/elecciones-bps-2026')" class="cu-link">
        Elecciones del BPS 2026
      </NuxtLink>
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  BPS_COBRO_FAQ,
  BPS_COBRO_SOURCES,
  BPS_COBRO_VERIFIED_AT,
  BPS_CONSULT_CHANNELS,
  BPS_ELECTRONIC_INSTRUMENTS,
  BPS_NETWORKS_INTERIOR,
  BPS_NETWORKS_MONTEVIDEO,
  BPS_REQUIRED_DOCUMENTS,
  cobroSmsText,
} from '~/utils/bpsPaymentDates'

const localePath = useLocalePath()

const cedula = ref('')
const smsText = computed(() => cobroSmsText(cedula.value))

/** El mecanismo, que es lo único de esta página que sigue siendo cierto el mes que viene. */
const RULES = [
  {
    title: 'Se paga vencido',
    detail:
      'El pago que se cobra en un mes corresponde al mes anterior: en el calendario del BPS, lo que se cobra en setiembre de 2026 es lo de agosto de 2026.',
  },
  {
    title: 'Activos y pasivos van por separado',
    detail:
      'Son dos calendarios distintos por mes, uno para las prestaciones de activos y otro para las de pasivos. Mirá el que te corresponde.',
  },
  {
    title: 'Por banco no esperás tu fecha',
    detail:
      'Quien cobra por banco o por dinero electrónico lo recibe en la cuenta el primer día del calendario del mes. El calendario por fecha rige para el cobro presencial.',
  },
]

const faq = BPS_COBRO_FAQ as FaqItem[]

const verifiedAt = new Date(`${BPS_COBRO_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/fecha-de-cobro-bps-uruguay'
const title = 'Fecha de cobro del BPS: cuándo y dónde'
const description =
  'Mandá COBRO y tu cédula al 1997 y el BPS te dice tu fecha. Por banco o Midinero, DeAnda, Prex y OCA Blue cobrás el primer día; presencial, según calendario.'

defineOgImageComponent('Cambio', {
  title: 'Fecha de cobro del BPS',
  subtitle: 'SMS al 1997 con COBRO y tu cédula',
  tag: 'BPS',
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
        'fecha de cobro bps, bps cobro, cuando cobro bps, bps fecha y lugar de cobro, calendario de cobros bps, donde cobro bps, sms 1997 bps, pago de prestaciones bps',
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
                name: 'Fecha de cobro del BPS',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: BPS_COBRO_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: BPS_COBRO_SOURCES.map(source => ({
              '@type': 'WebPage',
              name: source.label,
              url: source.url,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: BPS_COBRO_FAQ.map(item => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.table-wrap {
  overflow-x: auto;
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
.sources {
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
.sources li {
  margin-bottom: 4px;
}
.plain-list {
  padding-left: 1.1rem;
  margin: 0;
}
.plain-list li {
  margin-bottom: 6px;
}
.calc-card,
.result-card,
.step-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 1);
}
</style>
