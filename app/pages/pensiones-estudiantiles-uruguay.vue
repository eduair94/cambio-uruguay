<template>
  <div class="ph-page pb-8">
    <div class="mb-3">
      <VBtn :to="localePath('/alquilar-en-uruguay')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Guía para alquilar
      </VBtn>
    </div>

    <!-- Hero -->
    <VCard class="overflow-hidden mb-5" elevation="8">
      <div class="hero on-dark pa-6 pa-md-8">
        <p class="hero-eyebrow">Vivienda · Estudiantes · Relevado en agosto de 2026</p>
        <h1 class="hero-title">Pensiones y residencias estudiantiles en Uruguay</h1>
        <p class="hero-lead">
          Cuánto sale de verdad una pieza en Montevideo, qué conseguís con tu presupuesto y —lo que
          casi nadie te dice— las
          <strong>vías gratuitas o subsidiadas</strong> que se piden entre octubre y febrero: el
          hogar estudiantil de tu intendencia, Ciudad Universitaria del INJU y la beca de
          alojamiento de la Udelar, que paga
          <strong>{{ uyu(2 * STUDENT_HOUSING_BPC) }} por mes</strong>.
        </p>
        <div class="d-flex justify-start justify-md-end mt-4">
          <ShareButtons text="Pensiones y residencias estudiantiles en Uruguay: precios y becas" />
        </div>
      </div>
    </VCard>

    <!-- The tool -->
    <h2 class="section-heading mb-1">¿Qué conseguís con lo que podés pagar?</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Respondé seis cosas. Te decimos qué entra con ese presupuesto y ordenamos las rutas de mejor a
      peor para tu caso, incluidas las gratuitas. No promete un cupo: te dice dónde tenés chance
      real y si la inscripción ya cerró.
    </p>

    <VCard variant="flat" class="section-card matcher pa-4 pa-sm-6 mb-4">
      <VRow>
        <VCol cols="12" md="6">
          <label class="budget-label" for="ph-budget">
            Puedo pagar por mes
            <strong>{{ uyu(form.budget) }}</strong>
          </label>
          <VSlider
            id="ph-budget"
            v-model="form.budget"
            :min="4000"
            :max="20000"
            :step="500"
            color="primary"
            hide-details
            thumb-label
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            v-model="form.room"
            :items="roomOptions"
            label="Quiero"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            v-model="form.gender"
            :items="genderOptions"
            label="La casa que busco es…"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            v-model="form.origin"
            :items="originOptions"
            label="Vengo de"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            v-model="form.studies"
            :items="studiesOptions"
            label="Estudio en"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            v-model="form.income"
            :items="incomeOptions"
            label="El ingreso de mi hogar es"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            v-model="form.when"
            :items="whenOptions"
            label="Lo necesito"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VTextField
            v-model.number="form.age"
            type="number"
            :min="15"
            :max="45"
            label="Mi edad"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>
    </VCard>

    <!-- Verdict -->
    <VAlert
      :type="verdict.short ? 'warning' : 'success'"
      variant="tonal"
      density="comfortable"
      class="mb-5"
      data-testid="ph-verdict"
    >
      <p class="text-subtitle-1 font-weight-bold mb-1">{{ verdict.headline }}</p>
      <p class="text-body-2 mb-0">{{ verdict.detail }}</p>
    </VAlert>

    <!-- Ranked routes -->
    <VRow class="mb-2">
      <VCol v-for="row in ranked" :key="row.route.id" cols="12" md="6">
        <VCard variant="flat" class="route-card pa-5 h-100" :class="`fit-${row.fit}`">
          <div class="d-flex align-start ga-2 mb-2 flex-wrap">
            <VChip size="x-small" variant="flat" :color="fitColor(row.fit)">
              {{ STUDENT_HOUSING_FIT_LABEL[row.fit] }}
            </VChip>
            <VChip size="x-small" variant="tonal" :color="kindColor(row.route.kind)">
              {{ kindLabel(row.route.kind) }}
            </VChip>
          </div>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ row.route.name }}</h3>
          <p class="text-body-2 mb-3">{{ row.reason }}</p>
          <dl class="route-meta">
            <div>
              <dt>Te cuesta</dt>
              <dd>{{ row.route.cost }}</dd>
            </div>
            <div>
              <dt>Cuándo se pide</dt>
              <dd>{{ row.route.window }}</dd>
            </div>
          </dl>
          <ul class="route-list mt-3">
            <li v-for="(req, i) in row.route.requires" :key="i">{{ req }}</li>
          </ul>
          <a
            class="route-source"
            :href="row.route.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ row.route.sourceLabel }}
            <VIcon size="12">mdi-open-in-new</VIcon>
          </a>
        </VCard>
      </VCol>
    </VRow>

    <!-- Prices -->
    <h2 class="section-heading mb-1 mt-8">Lo que se paga hoy, por tipo de plaza</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Bandas observadas en los avisos publicados el {{ surveyedLabel }} en Montevideo, más precios
      contados por residentes. <strong>No son tarifas</strong>: son lo que estaba a la vista ese
      día. Las residencias con marca no publican precio, hay que pedirlo.
    </p>

    <div class="table-wrap mb-3">
      <table class="cu-table cu-mobile-cards">
        <thead>
          <tr>
            <th>Tipo de plaza</th>
            <th>Banda observada</th>
            <th>Dónde se concentra</th>
            <th>Qué mirar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="band in STUDENT_HOUSING_PRICE_BANDS" :key="band.plaza">
            <td data-label="Tipo de plaza">
              <strong>{{ band.label }}</strong>
            </td>
            <td data-label="Banda observada" class="text-no-wrap">
              {{ uyu(band.min) }} – {{ uyu(band.max) }}
            </td>
            <td data-label="Dónde se concentra">{{ band.typical }}</td>
            <td data-label="Qué mirar" class="text-body-2">{{ band.detail }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <VAlert type="info" variant="tonal" density="comfortable" class="mb-2">
      <strong>“Camas individuales” no es habitación individual.</strong> Es una cama de una plaza
      dentro de una pieza compartida, y es la confusión que más caro sale. Si querés puerta propia,
      preguntá textual: “¿la habitación es sólo para mí?”.
    </VAlert>

    <!-- Free routes -->
    <h2 class="section-heading mb-1 mt-8">Las vías que no salen plata (y cuándo se piden)</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      El error más caro no es elegir mal la pensión: es no saber que existía una plaza gratis y que
      la inscripción cerró en enero. Casi todo esto se pide
      <strong>entre octubre y febrero, para el año siguiente</strong>.
    </p>

    <VRow class="mb-4">
      <VCol v-for="route in freeRoutes" :key="route.id" cols="12" md="4">
        <VCard variant="flat" class="free-card pa-5 h-100">
          <VIcon :color="route.kind === 'gratuita' ? 'success' : 'primary'" class="mb-2">
            {{ route.kind === 'gratuita' ? 'mdi-gift-outline' : 'mdi-cash-multiple' }}
          </VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ route.name }}</h3>
          <p class="free-cost mb-2">{{ route.cost }}</p>
          <p class="text-body-2 mb-2">{{ route.who }}</p>
          <p class="text-caption text-medium-emphasis mb-2">
            <VIcon size="14" class="mr-1">mdi-calendar-clock</VIcon>
            {{ route.window }}
          </p>
          <ul class="route-list">
            <li v-for="(req, i) in route.requires" :key="i">{{ req }}</li>
          </ul>
          <a class="route-source" :href="route.sourceUrl" target="_blank" rel="noopener noreferrer">
            {{ route.sourceLabel }}
            <VIcon size="12">mdi-open-in-new</VIcon>
          </a>
        </VCard>
      </VCol>
    </VRow>

    <!-- Hogares directory -->
    <h2 class="section-heading mb-1 mt-8">El hogar estudiantil de tu departamento</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Casi todas las intendencias del interior sostienen plazas para su propia gente, en Montevideo
      o en la capital departamental. Marcamos como verificadas sólo las que pudimos leer en una
      página oficial; en el resto el dato a confiar es el teléfono de Desarrollo Social, no una
      fecha que copiemos de oído.
    </p>

    <div class="table-wrap mb-2">
      <table class="cu-table cu-mobile-cards cu-roomy">
        <thead>
          <tr>
            <th>Departamento</th>
            <th>Dónde hay plazas</th>
            <th>Qué es</th>
            <th>Inscripción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="hogar in STUDENT_HOGARES" :key="hogar.department">
            <td data-label="Departamento">
              <a :href="hogar.url" target="_blank" rel="noopener noreferrer">
                {{ hogar.department }}
              </a>
              <VChip
                v-if="!hogar.verified"
                size="x-small"
                variant="tonal"
                color="warning"
                class="ml-1"
              >
                a confirmar
              </VChip>
            </td>
            <td data-label="Dónde hay plazas">{{ hogar.where }}</td>
            <td data-label="Qué es" class="text-body-2">{{ hogar.detail }}</td>
            <td data-label="Inscripción" class="text-body-2">{{ hogar.window }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pension vs rent -->
    <h2 class="section-heading mb-1 mt-8">Por qué la pensión es más barata (y qué perdés)</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Una pensión no es un alquiler: legalmente es hospedaje. Ahí está todo: por eso no te piden
      garantía, y por eso tampoco tenés los plazos de la ley de arrendamientos.
    </p>

    <div class="table-wrap mb-3">
      <table class="cu-table cu-mobile-cards">
        <thead>
          <tr>
            <th />
            <th>Pensión o residencia</th>
            <th>Alquiler</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in STUDENT_HOUSING_VS_RENT" :key="row.topic">
            <td data-label="Tema">
              <strong>{{ row.topic }}</strong>
            </td>
            <td data-label="Pensión o residencia">{{ row.pension }}</td>
            <td data-label="Alquiler">{{ row.alquiler }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <VAlert type="info" variant="tonal" density="comfortable" class="mb-2">
      ¿Vas para el lado del alquiler? Mirá la
      <NuxtLink :to="localePath('/alquilar-en-uruguay')">guía de alquiler</NuxtLink>, y si el
      problema es la garantía,
      <NuxtLink :to="localePath('/alquilar-sin-recibo-de-sueldo')">
        alquilar sin recibo de sueldo
      </NuxtLink>
      o
      <NuxtLink :to="localePath('/alquilar-estando-en-clearing')">estando en el clearing</NuxtLink>.
      Para encontrar la habitación en sí, la oferta de pieza y dueño directo casi no está en los
      portales: está en el
      <NuxtLink :to="localePath({ path: '/alquilar-en-uruguay', hash: '#comunidades' })">
        directorio de grupos y comunidades
      </NuxtLink>
      revisado por reputación.
    </VAlert>

    <!-- Legal minimums -->
    <h2 class="section-heading mb-1 mt-8">Los mínimos que sí exige la ley</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      En Montevideo, un hogar estudiantil está regulado desde 2020 (Digesto Departamental, arts.
      D.4107.23.1 a 20). Los publicamos porque el dato útil es lo
      <strong>bajos que son</strong>: cumplirlos no significa que se viva bien, y saber el número
      exacto cambia lo que preguntás antes de pagar.
    </p>

    <VRow class="mb-4">
      <VCol v-for="rule in STUDENT_HOUSING_LEGAL_MINIMUMS" :key="rule.id" cols="12" sm="6" md="4">
        <div class="rule-card pa-4 h-100">
          <div class="d-flex align-center justify-space-between ga-2 mb-1">
            <h3 class="text-subtitle-2 font-weight-bold mb-0">{{ rule.label }}</h3>
            <code class="rule-article">{{ rule.article }}</code>
          </div>
          <p class="text-body-2 mb-0">{{ rule.rule }}</p>
        </div>
      </VCol>
    </VRow>

    <!-- Complaints -->
    <h2 class="section-heading mb-1 mt-8">Si algo sale mal, quién te atiende</h2>
    <VRow class="mb-4">
      <VCol v-for="ch in STUDENT_HOUSING_COMPLAINTS" :key="ch.label" cols="12" md="4">
        <VCard variant="flat" class="section-card pa-5 h-100">
          <h3 class="text-subtitle-2 font-weight-bold mb-2">{{ ch.label }}</h3>
          <p class="text-body-2 mb-2">{{ ch.detail }}</p>
          <p class="text-caption font-weight-medium mb-2">{{ ch.contact }}</p>
          <a class="route-source" :href="ch.url" target="_blank" rel="noopener noreferrer">
            Ver el organismo
            <VIcon size="12">mdi-open-in-new</VIcon>
          </a>
        </VCard>
      </VCol>
    </VRow>

    <!-- Checklist -->
    <h2 class="section-heading mb-1 mt-8">Qué preguntar antes de pagar la seña</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Diez preguntas que salen de los mínimos legales y de lo que cuentan quienes ya vivieron en
      residencias. Llevalas anotadas a la visita: el momento de preguntar es antes de dejar plata.
    </p>

    <VExpansionPanels variant="accordion" class="mb-4" eager>
      <VExpansionPanel v-for="check in STUDENT_HOUSING_VISIT_CHECKLIST" :key="check.id">
        <VExpansionPanelTitle>
          <VIcon size="18" class="mr-2" color="primary">mdi-checkbox-marked-circle-outline</VIcon>
          {{ check.question }}
        </VExpansionPanelTitle>
        <VExpansionPanelText>{{ check.why }}</VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <!-- Where to look -->
    <h2 class="section-heading mb-1 mt-8">Dónde buscar, barrio por barrio</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Buena parte de la oferta más barata <strong>no publica aviso</strong>. Se consigue caminando y
      preguntando donde hay cartel de “pensión” o “pieza libre”, sobre todo por Paysandú, Uruguay,
      Canelones y de Ejido hacia Ciudad Vieja.
    </p>

    <VRow class="mb-4">
      <VCol v-for="area in STUDENT_HOUSING_AREAS" :key="area.name" cols="12" sm="6" md="4">
        <div class="area-card pa-4 h-100">
          <h3 class="text-subtitle-2 font-weight-bold mb-1">
            <VIcon size="16" class="mr-1" color="primary">mdi-map-marker-outline</VIcon>
            {{ area.name }}
          </h3>
          <p class="text-body-2 mb-0">{{ area.detail }}</p>
        </div>
      </VCol>
    </VRow>

    <!-- FAQ (la separación superior la trae FaqSection) -->
    <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" />

    <!-- Sources -->
    <h2 class="section-heading mb-1 mt-8">Fuentes</h2>
    <p class="text-body-2 text-medium-emphasis mb-3">
      Normas y programas verificados el {{ lastReviewedLabel }}. Los precios son un relevamiento del
      {{ surveyedLabel }} y envejecen rápido: si ves una diferencia grande, la que manda es la
      realidad de la calle.
    </p>
    <ul class="source-list mb-2">
      <li v-for="source in STUDENT_HOUSING_SOURCES" :key="source.url">
        <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        <span class="text-medium-emphasis"> — {{ source.detail }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import {
  matchStudentHousing,
  studentHousingVerdict,
  STUDENT_HOGARES,
  STUDENT_HOUSING_AREAS,
  STUDENT_HOUSING_BPC,
  STUDENT_HOUSING_COMPLAINTS,
  STUDENT_HOUSING_FAQS,
  STUDENT_HOUSING_FIT_LABEL,
  STUDENT_HOUSING_LAST_REVIEWED,
  STUDENT_HOUSING_LEGAL_MINIMUMS,
  STUDENT_HOUSING_PRICE_BANDS,
  STUDENT_HOUSING_PRICES_SURVEYED,
  STUDENT_HOUSING_ROUTES,
  STUDENT_HOUSING_SOURCES,
  STUDENT_HOUSING_VISIT_CHECKLIST,
  STUDENT_HOUSING_VS_RENT,
  type StudentHousingFit,
  type StudentHousingInput,
  type StudentHousingRouteKind,
} from '~/utils/studentHousing'

const localePath = useLocalePath()

// Default = the r/uruguay question that motivated the page: around 8.000, a room
// of her own, a women-only or mixed house, no neighbourhood preference.
const form = reactive<StudentHousingInput>({
  budget: 8000,
  room: 'individual',
  gender: 'mujer',
  origin: 'interior',
  age: 20,
  studies: 'udelar',
  income: 'medio',
  when: 'ya',
})

const roomOptions = [
  { title: 'Habitación individual', value: 'individual' },
  { title: 'Compartir habitación', value: 'compartida' },
  { title: 'Me da igual', value: 'indistinto' },
]

const genderOptions = [
  { title: 'Sólo de mujeres', value: 'mujer' },
  { title: 'Sólo de varones', value: 'varon' },
  { title: 'Mixta o me da igual', value: 'indistinto' },
]

const originOptions = [
  { title: 'El interior', value: 'interior' },
  { title: 'Canelones', value: 'canelones' },
  { title: 'Montevideo', value: 'montevideo' },
]

const studiesOptions = [
  { title: 'La Udelar', value: 'udelar' },
  { title: 'UTEC, UTU u otra pública', value: 'publica-no-udelar' },
  { title: 'Una universidad privada', value: 'privada' },
  { title: 'No estudio', value: 'no-estudia' },
]

const incomeOptions = [
  { title: 'Bajo', value: 'bajo' },
  { title: 'Medio', value: 'medio' },
  { title: 'Alto', value: 'alto' },
  { title: 'No sé', value: 'no-se' },
]

const whenOptions = [
  { title: 'Ya, para este año', value: 'ya' },
  { title: 'Para el año que viene', value: 'proximo-ano' },
]

const safeInput = computed<StudentHousingInput>(() => ({
  ...form,
  budget: Number.isFinite(form.budget) ? form.budget : 8000,
  age: Number.isFinite(form.age) ? form.age : 20,
}))

const ranked = computed(() => matchStudentHousing(safeInput.value))
const verdict = computed(() =>
  studentHousingVerdict(safeInput.value.budget, safeInput.value.room, safeInput.value.gender)
)

const freeRoutes = computed(() =>
  STUDENT_HOUSING_ROUTES.filter(
    r => r.id === 'inju' || r.id === 'hogar-intendencia' || r.id === 'beca-alojamiento'
  )
)

const faqItems = STUDENT_HOUSING_FAQS.map((faq, i) => ({
  id: `pension-estudiantil-${i + 1}`,
  question: faq.q,
  answer: faq.a,
}))

function uyu(value: number): string {
  return `$ ${Math.round(value).toLocaleString('es-UY')}`
}

function fitColor(fit: StudentHousingFit): string {
  return { alta: 'success', media: 'primary', baja: 'warning', descartada: 'grey' }[fit]
}

function kindLabel(kind: StudentHousingRouteKind): string {
  return { gratuita: 'Gratis', subsidio: 'Te pagan', mercado: 'Lo pagás vos' }[kind]
}

function kindColor(kind: StudentHousingRouteKind): string {
  return { gratuita: 'success', subsidio: 'info', mercado: 'grey' }[kind]
}

function formatReviewedDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
const lastReviewedLabel = formatReviewedDate(STUDENT_HOUSING_LAST_REVIEWED)
const surveyedLabel = formatReviewedDate(STUDENT_HOUSING_PRICES_SURVEYED)

const canonicalUrl = 'https://cambio-uruguay.com/pensiones-estudiantiles-uruguay'
const title = 'Pensiones estudiantiles en Uruguay 2026'
const description =
  'Cuánto sale una pensión o residencia estudiantil en Montevideo en 2026: bandas de precio relevadas, qué conseguís con tu presupuesto, las plazas gratuitas del INJU y de las intendencias, la beca de alojamiento de la Udelar de 2 BPC, los mínimos legales de baños y metros y dónde denunciar.'

defineOgImageComponent('Cambio', {
  title: 'Pensiones estudiantiles',
  subtitle: 'Cuánto cuestan y qué plazas hay gratis',
  tag: 'VIVIENDA',
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
        'pension estudiantil montevideo, residencia estudiantil montevideo precio, pension para mujeres montevideo, habitacion individual pension montevideo, hogar estudiantil intendencia, ciudad universitaria inju, beca de alojamiento udelar, cuanto sale una pension en montevideo, alojamiento estudiantes interior montevideo',
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
                name: 'Alquilar en Uruguay',
                item: 'https://cambio-uruguay.com/alquilar-en-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Pensiones estudiantiles',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            dateModified: STUDENT_HOUSING_LAST_REVIEWED,
            mainEntityOfPage: canonicalUrl,
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.ph-page {
  overflow-x: hidden;
}
.hero {
  background:
    radial-gradient(120% 140% at 0% 0%, rgba(56, 189, 248, 0.28), transparent 55%),
    linear-gradient(135deg, #131f3a 0%, #1e2f4d 55%, #3b1d3f 100%);
}
.hero-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 700;
  color: #bae6fd;
  margin-bottom: 0.5rem;
}
.hero-title {
  color: #fff;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  margin-bottom: 0.75rem;
  text-wrap: balance;
}
.hero-lead {
  color: rgba(255, 255, 255, 0.9);
  max-width: 820px;
  line-height: 1.65;
  margin-bottom: 0;
}
.section-heading {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.section-card,
.route-card,
.free-card,
.rule-card,
.area-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.route-card.fit-alta {
  border-color: rgba(var(--v-theme-success), 0.5);
}
.route-card.fit-descartada {
  opacity: 0.72;
}
.budget-label {
  display: block;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}
.budget-label strong {
  font-size: 1.05rem;
}
.route-meta {
  display: grid;
  gap: 0.5rem;
  font-size: 0.8125rem;
}
.route-meta dt {
  font-weight: 700;
  opacity: 0.7;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.route-meta dd {
  margin: 0;
}
.route-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.8125rem;
  line-height: 1.6;
}
.route-source {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  text-decoration: none;
}
.free-cost {
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}
.rule-article {
  font-size: 0.6875rem;
  opacity: 0.6;
  white-space: nowrap;
}
.table-wrap {
  overflow-x: auto;
}
.cu-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.cu-table th,
.cu-table td {
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  vertical-align: top;
}
.cu-table th {
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
}
.source-list {
  font-size: 0.8125rem;
  line-height: 1.7;
  padding-left: 1.1rem;
}
</style>
