<!--
  /alquilar-sin-recibo-de-sueldo — cómo consigue garantía quien trabaja por su cuenta.

  Nació de un hilo de r/uruguay donde alguien que vive de las ventas, con meses de US$ 2.000 y meses
  de US$ 1.000, preguntaba cómo alquilar en Montevideo. Diecisiete comentarios y ninguna respuesta
  completa: "metete en una pensión", "pedile un certificado al contador", "los empresarios viven
  todos en pensiones entonces?".

  La página existe porque la respuesta real no es ninguna de esas, y porque el sitio ya la tenía
  enterrada: /alquilar-en-uruguay la contesta en una de sus 49 preguntas. Una respuesta que hay que
  encontrar entre 49 no es una respuesta para quien llega buscando exactamente eso.
-->
<template>
  <VContainer class="rent-np py-6">
    <!-- Hero -->
    <VCard class="overflow-hidden mb-5" elevation="4">
      <div class="rent-np__hero on-dark pa-6 pa-md-8">
        <p class="rent-np__eyebrow mb-3">Alquiler · Trabajadores independientes</p>
        <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-3">
          Alquilar sin recibo de sueldo en Uruguay
        </h1>
        <p class="text-body-1 text-grey-lighten-2 mb-0">
          Si trabajás por tu cuenta, el obstáculo no es que tu ingreso varíe:
          <strong class="text-white">es que tenga que ser formal</strong>. Casi todas las garantías
          aceptan a un independiente; ninguna acepta un ingreso que no se pueda certificar. Acá está
          cuál sirve para tu caso, qué te va a pedir y qué hacer si hoy no podés probar nada.
        </p>
      </div>
    </VCard>

    <!-- La idea central -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-3">Lo que confunde a todo el mundo</h2>
      <p class="text-body-2 mb-3">
        La pregunta suele llegar como “gano distinto cada mes, ¿me van a aceptar?”. La variabilidad
        se resuelve sola: el certificado que reemplaza al recibo de sueldo declara tus ingresos
        líquidos formales, y las garantías los miran contra un porcentaje del alquiler —ANDA pide
        que no supere el <strong>40 % de tu ingreso nominal</strong>, Porto asegura hasta el
        <strong>30 % del líquido</strong>—. Un mes flojo dentro de un promedio que da no rompe nada.
      </p>
      <p class="text-body-2 mb-0">
        Lo que no se resuelve es cobrar sin registro. Sin inscripción no hay recibos de BPS ni de
        DGI, sin ellos no hay nada que un contador pueda certificar, y sin certificado quedás fuera
        de todas las garantías que evalúan ingresos. Ahí recién aparecen la pensión, el depósito o
        los meses adelantados — que son la salida cuando no hay nada que probar, no el primer paso.
      </p>
    </VCard>

    <!-- Comparativa -->
    <section class="mb-6" aria-labelledby="opciones-title">
      <h2 id="opciones-title" class="text-h6 font-weight-bold mb-1">
        Qué sirve y qué no, sin recibo de sueldo
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        {{ works.length }} de las {{ GUARANTEE_OPTIONS.length }} opciones del mercado funcionan sin
        recibo. La que más gente intenta primero es justamente la que no.
      </p>

      <VCard
        v-for="o in GUARANTEE_OPTIONS"
        :key="o.id"
        variant="outlined"
        class="mb-3 pa-4 opt-card"
      >
        <div class="d-flex align-start flex-wrap ga-2 mb-2">
          <div class="flex-grow-1">
            <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ o.name }}</h3>
            <p class="text-caption text-medium-emphasis mb-0">{{ o.provider }}</p>
          </div>
          <VChip
            size="small"
            :color="verdictColor(o.worksWithoutPayslip)"
            variant="tonal"
            :prepend-icon="verdictIcon(o.worksWithoutPayslip)"
          >
            {{ verdictLabel(o.worksWithoutPayslip) }}
          </VChip>
        </div>

        <p class="text-body-2 mb-3">{{ o.verdictWhy }}</p>

        <div class="table-scroll">
          <table class="spec cu-mobile-cards">
            <tbody>
              <tr>
                <th scope="row">Qué te piden</th>
                <td data-label="Qué te piden">
                  <ul class="req-list">
                    <li v-for="r in o.requirements" :key="r">{{ r }}</li>
                  </ul>
                </td>
              </tr>
              <tr>
                <th scope="row">Techo</th>
                <td data-label="Techo">{{ o.ceiling }}</td>
              </tr>
              <tr>
                <th scope="row">Costo</th>
                <td data-label="Costo">{{ o.cost }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex flex-wrap ga-3 mt-3">
          <a
            v-for="s in o.sources"
            :key="s.url"
            :href="s.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-caption d-inline-flex align-center ga-1"
          >
            <VIcon size="12">mdi-open-in-new</VIcon>{{ s.publisher }}
          </a>
        </div>
      </VCard>

      <VAlert type="info" variant="tonal" density="comfortable" class="text-body-2">
        Los topes del FGA están en UR porque se reajustan solos. El valor del día está en
        <NuxtLink :to="localePath(UR_INDICATOR_PATH)">la página de la Unidad Reajustable</NuxtLink>.
      </VAlert>
    </section>

    <!-- Cómo volverse certificable -->
    <section class="mb-6" aria-labelledby="pasos-title">
      <h2 id="pasos-title" class="text-h6 font-weight-bold mb-1">
        Si hoy no podés probar ingresos
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        No es una lista de consejos: es la secuencia que te convierte en alguien a quien una
        garantía puede evaluar. Toma unos tres meses, que es la antigüedad mínima que pide el
        sistema.
      </p>

      <VCard variant="outlined" class="pa-4">
        <ol class="steps">
          <li v-for="(s, i) in FORMALITY_STEPS" :key="s.step">
            <strong>{{ i + 1 }}. {{ s.step }}.</strong> {{ s.detail }}
            <NuxtLink v-if="s.link" :to="localePath(s.link)" class="text-caption d-block mt-1">
              Ver cómo →
            </NuxtLink>
          </li>
        </ol>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-6" aria-labelledby="faq-title">
      <h2 id="faq-title" class="text-h6 font-weight-bold mb-3">Preguntas concretas</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in NOPAYSLIP_FAQ" :key="f.q">
          <VExpansionPanelTitle>{{ f.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-body-2 mb-2">{{ f.a }}</p>
            <a
              v-if="f.source"
              :href="f.source.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-caption d-inline-flex align-center ga-1"
            >
              <VIcon size="12">mdi-open-in-new</VIcon>{{ f.source.label }} —
              {{ f.source.publisher }}
            </a>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Seguí leyendo -->
    <VCard variant="outlined" class="pa-4">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguí leyendo</h2>
      <ul class="related">
        <li>
          <NuxtLink :to="localePath('/alquilar-en-uruguay')">
            Alquilar en Uruguay: la guía completa
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="localePath('/alquilar-estando-en-clearing')">
            Alquilar estando en el clearing
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="localePath('/que-empresa-abrir-uruguay')">
            Qué empresa te conviene abrir
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="localePath('/facturar-en-monotributo-uruguay')">
            Cómo facturar en monotributo
          </NuxtLink>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Datos verificados contra sus fuentes el {{ fmtDate(RENT_NOPAYSLIP_REVIEWED) }}. Informativo,
        no es asesoramiento legal.
      </p>
    </VCard>
  </VContainer>
</template>

<script setup lang="ts">
import {
  FORMALITY_STEPS,
  GUARANTEE_OPTIONS,
  NOPAYSLIP_FAQ,
  RENT_NOPAYSLIP_REVIEWED,
  UR_INDICATOR_PATH,
  optionsThatWork,
  type Verdict,
} from '~/utils/rentNoPayslip'

const localePath = useLocalePath()
const works = optionsThatWork()

const verdictLabel = (v: Verdict): string =>
  v === 'si' ? 'Sirve sin recibo' : v === 'no' ? 'No sirve sin recibo' : 'Depende'
const verdictColor = (v: Verdict): string =>
  v === 'si' ? 'success' : v === 'no' ? 'error' : 'warning'
const verdictIcon = (v: Verdict): string =>
  v === 'si'
    ? 'mdi-check-circle-outline'
    : v === 'no'
      ? 'mdi-close-circle-outline'
      : 'mdi-alert-circle-outline'

const fmtDate = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── SEO ──
const canonicalUrl = 'https://cambio-uruguay.com/alquilar-sin-recibo-de-sueldo'
const title =
  'Alquilar sin recibo de sueldo en Uruguay: qué garantía sirve si trabajás por tu cuenta'
const description =
  'Independiente, monotributista o con ingresos variables: qué garantía de alquiler te acepta y cuál no. FGA, ANDA, seguros, contrato sin garantía y depósito, con lo que pide cada una.'

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
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
            '@id': canonicalUrl,
            mainEntity: NOPAYSLIP_FAQ.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
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
.rent-np__hero {
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(var(--v-theme-primary), 0.45), transparent 55%),
    linear-gradient(135deg, #0a0e1a 0%, #121a2e 100%);
}
.rent-np__eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.85;
  margin: 0;
}
.opt-card {
  border-radius: 12px;
}
.table-scroll {
  overflow-x: auto;
}
.spec {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.spec th,
.spec td {
  padding: 0.5rem 0.6rem;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  text-align: left;
}
.spec th {
  width: 34%;
  font-weight: 600;
  opacity: 0.75;
}
.req-list {
  margin: 0;
  padding-left: 1rem;
}
.steps {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.95rem;
  line-height: 1.7;
}
.steps li + li {
  margin-top: 0.75rem;
}
.related {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.875rem;
  line-height: 1.9;
}
</style>
