<template>
  <VContainer class="rent-credit-page">
    <nav aria-label="Ruta de navegación" class="text-caption mb-4">
      <NuxtLink :to="localePath('/')" class="text-decoration-none">Cambio Uruguay</NuxtLink>
      <span class="mx-1 text-grey">›</span>
      <NuxtLink
        :to="localePath('/temas/sueldo-trabajo-e-impuestos-uruguay')"
        class="text-decoration-none"
      >
        Sueldo, trabajo e impuestos
      </NuxtLink>
      <span class="mx-1 text-grey">›</span>
      <span class="text-grey">Crédito fiscal por alquiler</span>
    </nav>

    <header class="mb-8">
      <VChip class="mb-4" color="primary" size="small" variant="tonal">
        <VIcon start size="small">mdi-home-percent-outline</VIcon>
        IRPF Y ALQUILER
      </VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Crédito fiscal de IRPF por alquiler en Uruguay
      </h1>
      <p class="text-body-1 rent-credit-intro mb-4">
        Si alquilás tu vivienda permanente podés imputar el
        <strong>{{ RENT_CREDIT_PERCENT }} %</strong> del alquiler al pago de tu IRPF. Las dos cosas
        que más se malinterpretan: <strong>no es una devolución del alquiler</strong> —es un
        descuento del impuesto, y lo que sobra se pierde— y el requisito que más gente deja afuera,
        el plazo de un año, <strong>no está en la ley</strong>: lo pone una resolución de la DGI.
      </p>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Todo lo de esta página sale de la Ley 20.124, del Decreto 148/007 y de las resoluciones y
        fichas de la DGI, cotejado el {{ verifiedAt }}. Cada dato lleva su norma.
      </p>
    </header>

    <!-- El único número grande de la página es el porcentaje, que es de la ley. La cuenta en pesos
         se hace sobre el alquiler que escribe el lector y se rotula como TECHO: cuánto le vuelve
         depende del IRPF que generó, y eso esta página no lo sabe. -->
    <VCard class="mb-8 pa-5" variant="tonal" color="primary">
      <h2 class="text-h6 font-weight-bold mb-2">El {{ RENT_CREDIT_PERCENT }} %, y qué significa</h2>
      <p class="text-body-2 mb-4">
        La ley te deja imputar «hasta el monto equivalente al {{ RENT_CREDIT_PERCENT }} % (ocho por
        ciento) del precio del arrendamiento». Es un techo: se descuenta hasta donde llegue el
        impuesto del año y el excedente no se traslada ni se cobra.
      </p>
      <VRow dense>
        <VCol cols="12" sm="6">
          <VTextField
            v-model="monthlyRentInput"
            label="Alquiler por mes (en pesos)"
            type="number"
            min="0"
            inputmode="numeric"
            density="comfortable"
            hide-details
            prefix="$"
          />
        </VCol>
        <VCol cols="12" sm="6">
          <VTextField
            v-model="monthsInput"
            label="Meses pagados en el año"
            type="number"
            min="1"
            max="12"
            inputmode="numeric"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>
      <div v-if="ceiling !== null" class="mt-4">
        <p class="text-h5 font-weight-bold mb-1">Hasta {{ formatPesos(ceiling) }}</p>
        <p class="text-caption mb-0">
          Es el techo del crédito del año, no lo que vas a cobrar: se descuenta del IRPF que
          generaste y lo que sobre no da derecho a devolución.
        </p>
      </div>
      <p v-else class="text-caption mt-4 mb-0">
        Escribí el alquiler mensual y los meses que pagaste para ver el techo del crédito.
      </p>
    </VCard>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-2">Los requisitos, y qué norma pide cada uno</h2>
      <p class="text-body-2 rent-credit-block mb-4">
        La distinción importa cuando hay que discutirlo: la ley pide una sola cosa, el decreto
        agrega el contrato escrito y el resto es reglamentación de la DGI.
      </p>
      <VCard
        v-for="item in RENT_CREDIT_REQUIREMENTS"
        :key="item.id"
        class="mb-3 pa-4"
        variant="outlined"
      >
        <div class="d-flex flex-wrap align-center ga-2 mb-1">
          <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ item.label }}</h3>
          <VChip :color="basisColor(item.basis)" size="x-small" variant="tonal">
            {{ RENT_CREDIT_BASIS_LABEL[item.basis] }}
          </VChip>
        </div>
        <p class="text-body-2 rent-credit-detail mb-2">{{ item.detail }}</p>
        <p class="text-caption text-medium-emphasis mb-0">
          <a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.cite }}</a>
        </p>
      </VCard>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que no lo bloquea</h2>
      <p class="text-body-2 rent-credit-block mb-4">
        Tres situaciones muy comunes del mercado uruguayo que la gente cree descalificantes y no lo
        son.
      </p>
      <VCard
        v-for="item in RENT_CREDIT_NOT_REQUIRED"
        :key="item.id"
        class="mb-3 pa-4"
        variant="tonal"
        color="success"
      >
        <div class="d-flex align-start ga-3">
          <VIcon size="small">mdi-check-circle-outline</VIcon>
          <div>
            <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ item.label }}</h3>
            <p class="text-body-2 rent-credit-detail mb-2">{{ item.detail }}</p>
            <p class="text-caption mb-0">
              <a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.cite }}</a>
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-2">Hasta dónde llega, y qué pasa con lo que sobra</h2>
      <VCard v-for="item in RENT_CREDIT_LIMITS" :key="item.id" class="mb-3 pa-4" variant="outlined">
        <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ item.label }}</h3>
        <p class="text-body-2 rent-credit-detail mb-2">{{ item.detail }}</p>
        <p class="text-caption text-medium-emphasis mb-0">
          <a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.cite }}</a>
        </p>
      </VCard>
    </section>

    <!-- El 6 % se sigue publicando como si fuera el de hoy, así que se muestran los dos con su
         norma y se marca cuál rige. -->
    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-2">
        El {{ RENT_CREDIT_PREVIOUS_PERCENT }} % que todavía circula
      </h2>
      <p class="text-body-2 rent-credit-block mb-4">
        El crédito nació en el {{ RENT_CREDIT_PREVIOUS_PERCENT }} % y la Ley 20.124 lo subió. Si
        encontrás el {{ RENT_CREDIT_PREVIOUS_PERCENT }} % en una guía, está desactualizada.
      </p>
      <VCard
        v-for="step in RENT_CREDIT_RATE_HISTORY"
        :key="step.id"
        class="mb-3 pa-4"
        :variant="step.current ? 'tonal' : 'outlined'"
        :color="step.current ? 'primary' : undefined"
      >
        <div class="d-flex flex-wrap align-center ga-2 mb-1">
          <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ step.percent }} %</h3>
          <VChip v-if="step.current" color="primary" size="x-small" variant="flat">Vigente</VChip>
        </div>
        <p class="text-body-2 rent-credit-detail mb-2">{{ step.since }}</p>
        <p class="text-caption text-medium-emphasis mb-0">
          <a :href="step.url" target="_blank" rel="noopener noreferrer">{{ step.cite }}</a>
        </p>
      </VCard>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-2">Cómo se reclama</h2>
      <p class="text-body-2 rent-credit-block mb-2">
        En la declaración jurada de IRPF, formularios 1102 o 1103, declarando el alquiler pagado y
        los datos del arrendador y del inmueble. Si además cobrás jubilación o pensión gravada, el
        crédito se imputa primero al IRPF y el excedente al IASS.
      </p>
      <p class="text-body-2 rent-credit-block mb-2">
        La ficha oficial que se leyó para esta página es la del ejercicio
        {{ RENT_CREDIT_PUBLISHED_EXERCISE }}, publicada el {{ dgiSheetDate }}. El calendario y los
        montos de cada campaña los publica la DGI cuando los publica:
        <strong>acá no se adelantan fechas</strong>.
      </p>
      <p class="text-body-2 rent-credit-block mb-0">
        <NuxtLink :to="localePath('/declaracion-de-irpf-uruguay')" class="text-decoration-none">
          Ver quién está obligado a declarar IRPF y con qué formulario
        </NuxtLink>
      </p>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="faq in RENT_CREDIT_FAQ" :key="faq.question" :title="faq.question">
          <VExpansionPanelText>
            <p class="text-body-2 mb-0">{{ faq.answer }}</p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-2">Fuentes</h2>
      <p class="text-body-2 rent-credit-block mb-3">
        Textos oficiales, cotejados el {{ verifiedAt }}.
      </p>
      <ul class="rent-credit-sources text-body-2">
        <li v-for="source in RENT_CREDIT_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="text-h5 font-weight-bold mb-4">Seguir por acá</h2>
      <VRow dense>
        <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6" md="4">
          <VCard :to="localePath(link.to)" class="pa-4 h-100" variant="outlined">
            <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ link.label }}</h3>
            <p class="text-body-2 text-medium-emphasis rent-credit-detail mb-0">
              {{ link.description }}
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  RENT_CREDIT_BASIS_LABEL,
  RENT_CREDIT_DGI_SHEET_DATE,
  RENT_CREDIT_FAQ,
  RENT_CREDIT_LIMITS,
  RENT_CREDIT_NOT_REQUIRED,
  RENT_CREDIT_PERCENT,
  RENT_CREDIT_PREVIOUS_PERCENT,
  RENT_CREDIT_PUBLISHED_EXERCISE,
  RENT_CREDIT_RATE_HISTORY,
  RENT_CREDIT_REQUIREMENTS,
  RENT_CREDIT_SOURCES,
  RENT_CREDIT_VERIFIED_AT,
  rentCreditCeilingFromMonthly,
  type RentCreditBasis,
} from '~/utils/rentTaxCredit'

const localePath = useLocalePath()

// La cuenta corre en el navegador sobre el dato que escribe el lector: no hay nada que pedirle al
// servidor, así que la página no abre ninguna petición para esto.
const monthlyRentInput = ref('')
const monthsInput = ref('12')

const ceiling = computed(() => {
  const rent = Number(monthlyRentInput.value)
  const months = Number(monthsInput.value)
  if (!Number.isFinite(rent) || !Number.isFinite(months)) return null
  return rentCreditCeilingFromMonthly(rent, Math.trunc(months))
})

const formatPesos = (n: number) =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

const asLongDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = asLongDate(RENT_CREDIT_VERIFIED_AT)
const dgiSheetDate = asLongDate(RENT_CREDIT_DGI_SHEET_DATE)

// El color dice de un vistazo si la exigencia es de la ley o de la reglamentación, que es el
// ángulo de la página.
const basisColor = (basis: RentCreditBasis) =>
  basis === 'ley' ? 'primary' : basis === 'decreto' ? 'indigo' : 'blue-grey'

const relatedLinks = [
  {
    to: '/declaracion-de-irpf-uruguay',
    label: 'Declaración de IRPF',
    description: 'Quién está obligado, formularios y plazos.',
  },
  {
    to: '/herramientas/calculadora-irpf',
    label: 'Calculadora de IRPF',
    description: 'Cuánto te toca por franjas, con deducciones.',
  },
  {
    to: '/alquileres-uruguay',
    label: 'Alquileres en Uruguay',
    description: 'Avisos vigentes con precio y gastos comunes.',
  },
  {
    to: '/garantia-de-alquiler-uruguay',
    label: 'Garantías de alquiler',
    description: 'Qué pide cada una y cuánto sale.',
  },
  {
    to: '/primer-alquiler-uruguay',
    label: 'Tu primer alquiler',
    description: 'Qué firmás, qué pagás y qué reclamás.',
  },
  {
    to: '/devolucion-fonasa-uruguay',
    label: 'Devolución de FONASA',
    description: 'El otro crédito que se pide en la misma declaración.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/credito-fiscal-por-alquiler-uruguay'
const title = 'Crédito fiscal por alquiler: 8 % al IRPF'
// Literal a propósito, y no armada con el porcentaje del catálogo: así la mide el trinquete de los
// 155 caracteres de `seoDescriptionBudget.test.ts`, que sólo lee descripciones literales. La
// sincronía con el catálogo la cuida `tests/unit/rentTaxCredit.test.ts`, que fija el 8 %.
const description =
  'El 8 % del alquiler pagado se descuenta de tu IRPF y no se devuelve: pide contrato escrito de un año o más y la cédula y el padrón del propietario.'

defineOgImageComponent('Cambio', {
  title: 'Crédito fiscal de IRPF por alquiler',
  subtitle: 'El 8 % del alquiler, y los requisitos que no están en la ley',
  tag: 'IMPUESTOS',
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
        'credito fiscal alquiler uruguay, irpf alquiler, deducir alquiler irpf, 8 por ciento alquiler irpf, credito fiscal arrendamiento, descontar alquiler del irpf, requisitos credito fiscal alquiler, ley 20124, resolucion 702/012, credito alquiler iass',
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
                name: 'Sueldo, trabajo e impuestos en Uruguay',
                item: 'https://cambio-uruguay.com/temas/sueldo-trabajo-e-impuestos-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Crédito fiscal de IRPF por alquiler',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: RENT_CREDIT_FAQ.map(faq => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
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
            citation: RENT_CREDIT_SOURCES.map(source => ({
              '@type': 'CreativeWork',
              name: source.label,
              url: source.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.rent-credit-intro,
.rent-credit-block {
  max-width: 68ch;
}

.rent-credit-detail {
  margin-top: 0.25rem;
}

.rent-credit-sources {
  padding-left: 1.25rem;
}

.rent-credit-sources li {
  margin-top: 0.35rem;
}
</style>
