<template>
  <VContainer class="jubilacion-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">JUBILACIÓN</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">¿Cuándo me puedo jubilar en Uruguay?</h1>
      <p class="lead mb-6">
        Depende de una sola fecha: el <strong>1 de enero de 1973</strong>. Si naciste antes, seguís
        en el régimen anterior y te jubilás a los <strong>60</strong> con 30 años de trabajo. Si
        naciste ese día o después, entrás al nuevo sistema de la <strong>Ley 20.130</strong>, donde
        la edad sube un año por generación: <strong>61</strong> para 1973 y <strong>65</strong> de
        1977 en adelante.
      </p>

      <VCard class="warn-card on-dark pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-calendar-alert" color="primary" class="mr-3 mt-1" />
          <div>
            <p class="callout-title mb-2">«La jubilación pasó a los 65» no es cierto para todos</p>
            <p class="callout-text mb-0">
              Los 65 años son el final de una escala, no el punto de partida. Sólo alcanzan a los
              nacidos <strong>de 1977 en adelante</strong>. Y el propio BPS aclara que todavía no se
              otorga ninguna jubilación de causal normal por el nuevo sistema: las primeras empiezan
              en <strong>{{ NEW_SYSTEM_FIRST_GRANT_YEAR }}</strong
              >.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- La calculadora -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Tu año de nacimiento</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La respuesta que sigue supone <strong>30 años de trabajo computados</strong>, que es la
        carrera completa. Si no llegás a esos 30 años, la escala de más abajo es la que manda.
      </p>

      <VCard class="pa-5 pa-md-6" variant="flat" border>
        <VRow align="center" dense>
          <VCol cols="12" sm="5" md="4">
            <VTextField
              v-model.number="birthYear"
              label="Año en que naciste"
              type="number"
              variant="outlined"
              density="comfortable"
              :min="MIN_YEAR"
              :max="MAX_YEAR"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="7" md="8">
            <div v-if="answer" class="result-box pa-4">
              <p class="result-lead mb-1">
                Te jubilás a los <strong>{{ answer.age }} años</strong>, con {{ answer.years }} años
                de trabajo.
              </p>
              <p class="result-sub mb-0">
                {{
                  answer.regime === 'previous'
                    ? 'Régimen jubilatorio anterior: la reforma de 2023 no te alcanza.'
                    : `Nuevo sistema previsional común (Ley 20.130). Cumplís esa edad en ${answer.reachesAgeInYear}.`
                }}
              </p>
            </div>
            <p v-else class="text-medium-emphasis mb-0">
              Escribí un año entre {{ MIN_YEAR }} y {{ MAX_YEAR }}.
            </p>
          </VCol>
        </VRow>
      </VCard>
    </section>

    <!-- Nuevo sistema -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Nacidos desde el 1/1/1973: el nuevo sistema previsional común
      </h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Con 30 años de trabajo computados, la edad mínima es la de tu generación.
      </p>

      <VTable class="cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Año de nacimiento</th>
            <th>Edad mínima</th>
            <th>Años de trabajo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in NEW_SYSTEM_NORMAL" :key="row.cohort">
            <td data-label="Año de nacimiento">{{ row.cohort }}</td>
            <td data-label="Edad mínima">{{ row.age }} años</td>
            <td data-label="Años de trabajo">{{ row.years }}</td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- Menos de 30 años -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si no llegás a 30 años de trabajo</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Cada año que esperás te descuenta dos años de trabajo exigidos. El BPS publica la misma
        escala para el nuevo sistema y para la jubilación <strong>por edad avanzada</strong> del
        régimen anterior, así que sirve para los dos.
      </p>

      <VTable class="cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Edad</th>
            <th>Años de trabajo mínimos</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in REDUCED_SERVICE_SCALE" :key="row.age">
            <td data-label="Edad">{{ row.age }} años</td>
            <td data-label="Años de trabajo mínimos">{{ row.years }}</td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- Régimen anterior -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Nacidos antes del 1/1/1973: el régimen anterior</h2>
      <p class="body-text mb-0">
        La causal común se configura a los
        <strong>{{ PREVIOUS_SYSTEM_NORMAL.age }} años</strong> con
        <strong>{{ PREVIOUS_SYSTEM_NORMAL.years }} años de trabajo</strong> como mínimo. Alcanza a
        trabajadores de industria y comercio, construcción, administración pública (salvo militares
        y policiales), rurales y servicio doméstico. Si no llegás a los 30 años, la salida es la
        jubilación por edad avanzada, con la escala de arriba.
      </p>
    </section>

    <!-- Anticipadas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las dos formas de jubilarte antes</h2>

      <h3 class="text-subtitle-1 font-weight-bold mt-6 mb-2">Por extensa carrera laboral</h3>
      <p class="section-intro text-medium-emphasis mb-4">
        Se cambia edad por años de trabajo: entrás antes, pero con una carrera más larga. Los
        servicios no pueden ser bonificados y hay que probarlos con documentos.
      </p>

      <VTable class="cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Año de nacimiento</th>
            <th>Edad mínima</th>
            <th>Años de trabajo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in EXTENDED_CAREER" :key="`${row.cohort}-${i}`">
            <td data-label="Año de nacimiento">{{ row.cohort }}</td>
            <td data-label="Edad mínima">{{ row.age }} años</td>
            <td data-label="Años de trabajo">{{ row.years }}</td>
          </tr>
        </tbody>
      </VTable>

      <p class="fineprint mt-4 mb-0">
        Ojo con la última fila: para quien nació en <strong>1976</strong> la causal normal ya es a
        los 64, así que jubilarse a los 64 con 35 años de trabajo no adelanta nada. Esa combinación
        recién sirve <strong>de 1977 en adelante</strong>, cuando la normal pasa a los 65.
      </p>

      <h3 class="text-subtitle-1 font-weight-bold mt-8 mb-2">
        Por puestos de trabajo particularmente exigentes
      </h3>
      <p class="body-text mb-0">
        Para la industria de la construcción y la actividad rural: <strong>60 años</strong> de edad
        y <strong>30 años</strong> de trabajo. De esos 30, <strong>20</strong> tienen que ser en los
        puestos amparados, y <strong>5</strong> de esos 20 tienen que caer en los últimos
        <strong>10</strong> años de vida laboral. Estos servicios tampoco pueden ser bonificados.
      </p>
    </section>

    <!-- Mínima y máxima -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto es la mínima y cuál es el tope</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La jubilación mínima general en 2026 es de {{ formatUYU(RETIREMENT_MIN_GENERAL_2026, 0) }}.
        El monto inicial cambia según la edad en que te jubilás, y también hay tope máximo: no uno
        solo, sino dos, distintos según el régimen. El ajuste de pasividades de 2026 fue del
        {{ formatNumber(RETIREMENT_ADJUSTMENT_2026_PCT) }} %.
      </p>

      <VTable class="cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Concepto</th>
            <th scope="col">Monto mensual</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in RETIREMENT_AMOUNTS_2026" :key="row.label">
            <td data-label="Concepto">{{ row.label }}</td>
            <td data-label="Monto mensual">{{ formatUYU(row.amount, 0) }}</td>
          </tr>
        </tbody>
      </VTable>

      <p class="fineprint mt-4 mb-0">
        El tope por acumulación de pasividades sólo rige para quien acumula más de una pasividad del
        régimen de transición; no es el tope máximo de una jubilación individual.
      </p>
    </section>

    <!-- Incapacidad -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si no podés seguir trabajando por salud</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Hay tres figuras del BPS: dos contributivas —según si la incapacidad es total o parcial—,
        que decide una junta médica, y una tercera no contributiva, la pensión por invalidez, que el
        BPS evalúa por otra vía. Ninguna es automática con presentar un certificado.
      </p>

      <div v-for="benefit in DISABILITY_BENEFITS" :key="benefit.id" class="mb-6">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ benefit.name }}</h3>
        <p class="body-text mb-1"><strong>Quién califica:</strong> {{ benefit.eligibility }}</p>
        <p class="body-text mb-1"><strong>Duración:</strong> {{ benefit.duration }}</p>
        <p class="body-text mb-0"><strong>Monto:</strong> {{ benefit.amountNote }}</p>
      </div>

      <div class="mb-6">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ INVALIDITY_PENSION_NOTE.name }}</h3>
        <p class="body-text mb-1">
          <strong>Quién califica:</strong> {{ INVALIDITY_PENSION_NOTE.eligibility }}
        </p>
        <p class="body-text mb-1">
          <strong>Quién la evalúa:</strong> {{ INVALIDITY_PENSION_NOTE.evaluator }}
        </p>
        <p class="body-text mb-0">
          <strong>Monto:</strong> {{ INVALIDITY_PENSION_NOTE.amountNote }} Los requisitos de esta
          vía —que no incluyen ninguna edad— y los de la vía por vejez están, uno al lado del otro,
          en
          <NuxtLink :to="localePath('/pension-a-la-vejez-uruguay')"
            >pensión a la vejez e invalidez</NuxtLink
          >.
        </p>
      </div>

      <p class="body-text mb-0">
        La jubilación por incapacidad total y la jubilación anticipada por puestos de trabajo
        particularmente exigentes son las dos causales alcanzadas por el
        <NuxtLink :to="localePath('/suplemento-solidario-bps')">suplemento solidario</NuxtLink>
        del BPS.
      </p>
    </section>

    <!-- Mi jubilación estimada -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Mirá tu jubilación estimada</h2>
      <p class="body-text mb-3">
        El BPS tiene un servicio propio, "Mi jubilación estimada", que calcula el monto aproximado
        de tu jubilación para la edad en que cumplas los requisitos y para tres edades posteriores.
        Si tenés aportes a una AFAP y das tu consentimiento, también suma esa componente a la
        estimación.
      </p>
      <p class="body-text mb-3">
        Pide usuario personal del BPS (con inicio de sesión) y está pensado para quien ya reúne la
        edad y los años de trabajo para jubilarse por BPS, o le faltan dos años o menos, dentro del
        régimen mixto o de transición.
      </p>
      <p class="body-text mb-3">
        Lo que <strong>no</strong> hace: no calcula jubilaciones por incapacidad, ni casos con
        acumulación de años entre cajas o convenios internacionales, ni actividad de pesca,
        portuaria, zafral, a la orden o a destajo, ni para quien ya cobra otra pasividad del BPS. El
        propio BPS aclara que el cálculo <strong>no implica el otorgamiento ni la solicitud</strong>
        de una jubilación: la solicitud es un trámite aparte.
      </p>
      <p class="body-text mb-0">
        <a href="https://www.bps.gub.uy/21573/" target="_blank" rel="noopener nofollow">
          Ir al servicio "Mi jubilación estimada" en bps.gub.uy
        </a>
      </p>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in RETIREMENT_FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <span class="font-weight-medium">{{ f.question }}</span>
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ f.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Fuentes -->
    <section class="mb-4">
      <h2 class="text-h5 font-weight-bold mb-2">De dónde salen estas cifras</h2>
      <p class="section-intro text-medium-emphasis mb-4">
        Ninguna tabla de esta página la calculamos nosotros: están copiadas de la norma y de las
        páginas del BPS que la aplican. Los requisitos jubilatorios cambian por ley, así que
        conviene confirmarlos en la fuente antes de tomar una decisión.
      </p>
      <ul class="sources-list">
        <li v-for="source in RETIREMENT_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener nofollow">{{ source.label }}</a>
        </li>
      </ul>
    </section>

    <VDivider class="my-8" />

    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Seguí leyendo</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          v-for="link in relatedLinks"
          :key="link.to"
          :to="localePath(link.to)"
          variant="tonal"
          size="small"
        >
          {{ link.label }}
        </VBtn>
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  DISABILITY_BENEFITS,
  EXTENDED_CAREER,
  INVALIDITY_PENSION_NOTE,
  NEW_SYSTEM_FIRST_GRANT_YEAR,
  NEW_SYSTEM_NORMAL,
  PREVIOUS_SYSTEM_NORMAL,
  REDUCED_SERVICE_SCALE,
  RETIREMENT_ADJUSTMENT_2026_PCT,
  RETIREMENT_AMOUNTS_2026,
  RETIREMENT_FAQ,
  RETIREMENT_MIN_GENERAL_2026,
  RETIREMENT_SOURCES,
  retirementFor,
} from '~/utils/retirementAge'
import { formatNumber, formatUYU } from '~/utils/format'

const localePath = useLocalePath()

// El rango del campo: nadie con vida laboral nació antes de 1930, y del otro lado
// no tiene sentido pasarse del año en curso. Se resuelve UNA vez y viaja en el
// payload, para que el servidor y el navegador no discrepen en el año.
const MIN_YEAR = 1930
const MAX_YEAR = useState('jubilacionMaxYear', () => new Date().getUTCFullYear()).value

const birthYear = ref<number | null>(null)

const answer = computed(() => {
  const year = birthYear.value
  if (typeof year !== 'number' || !Number.isInteger(year)) return null
  if (year < MIN_YEAR || year > MAX_YEAR) return null
  return retirementFor(year)
})

const relatedLinks = [
  { to: '/desvincularme-de-la-afap-uruguay', label: 'Desvincularme de la AFAP' },
  { to: '/indemnizacion-por-despido-uruguay', label: 'Indemnización por despido' },
  { to: '/seguro-de-paro-uruguay', label: 'Seguro de paro' },
  { to: '/impuestos-inversiones-uruguay', label: 'IASS e impuestos a las inversiones' },
  { to: '/suplemento-solidario-bps', label: 'Suplemento solidario del BPS' },
  { to: '/pension-a-la-vejez-uruguay', label: 'Pensión a la vejez e invalidez' },
]

const canonicalUrl = 'https://cambio-uruguay.com/cuando-me-puedo-jubilar-uruguay'
const title = '¿Cuándo me puedo jubilar en Uruguay?'
const description =
  'Nacidos antes del 1/1/1973: 60 años y 30 de trabajo. Desde 1973, la Ley 20.130 sube la edad un año por generación hasta los 65 según tu año de nacimiento.'

defineOgImageComponent('Cambio', {
  title: '¿Cuándo me puedo jubilar en Uruguay?',
  subtitle: 'De 60 a 65 años según el año en que naciste',
  tag: 'JUBILACIÓN',
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
        'cuando me puedo jubilar uruguay, edad jubilatoria uruguay, ley 20130, reforma jubilatoria uruguay, jubilacion bps edad, causal jubilatoria comun, jubilacion anticipada uruguay, edad avanzada bps, 30 años de trabajo jubilacion, jubilarme a los 60 uruguay, jubilacion minima 2026, jubilacion por incapacidad, jubilacion por enfermedad, mi jubilacion estimada, bps jubilacion estimada, tope jubilacion',
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
                name: 'Cuándo me puedo jubilar en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: RETIREMENT_FAQ.map(f => ({
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
            citation: RETIREMENT_SOURCES.map(source => ({
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
.lead {
  margin-top: 0;
  font-size: 1.05rem;
  line-height: 1.7;
  max-width: 62ch;
}

.warn-card {
  background: rgb(var(--v-theme-primary), 0.12);
  border-left: 4px solid rgb(var(--v-theme-primary));
}

.callout-title {
  margin-top: 0;
  font-weight: 700;
}

.callout-text {
  margin-top: 0;
  line-height: 1.65;
}

.section-intro,
.body-text {
  margin-top: 0;
  line-height: 1.7;
  max-width: 68ch;
}

.result-box {
  border-radius: 8px;
  background: rgba(127, 127, 127, 0.1);
}

.result-lead {
  margin-top: 0;
  font-size: 1.05rem;
}

.result-sub {
  margin-top: 0;
  font-size: 0.9rem;
  opacity: 0.8;
}

.fineprint {
  margin-top: 0;
  font-size: 0.9rem;
  line-height: 1.65;
  max-width: 68ch;
  opacity: 0.85;
}

.sources-list {
  margin-top: 0;
  padding-left: 1.2rem;
  line-height: 1.9;
}
</style>
