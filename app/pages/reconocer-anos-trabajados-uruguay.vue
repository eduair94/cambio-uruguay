<template>
  <VContainer class="work-years-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">BPS · Jubilación</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Reconocer años trabajados antes de 1996: el plazo según tu fecha de nacimiento
      </h1>
      <p class="lead mb-6">
        La historia laboral del BPS arranca el <strong>1.º de abril de 1996</strong>. Todo lo que
        trabajaste antes de esa fecha no figura ahí, y si no pedís que se reconozca,
        <strong>no cuenta para la jubilación</strong>. Eso ya no se puede pedir en cualquier
        momento: la Ley 20.130 lo puso en un cuadro por fecha de nacimiento, con un día de cierre
        para cada franja.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-calendar-alert-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <p class="warn-title mb-2">Dos generaciones enteras vencen el mismo día</p>
            <p class="mb-0">
              Quien nació <strong>hasta el 1/6/1963</strong> y quien nació
              <strong>entre el 2/6/1963 y el 1/6/1968</strong> tienen el mismo último día:
              <strong>{{ fmtDate('2027-05-31') }}</strong
              >. No es un error del cuadro — a la primera franja le extendieron el plazo por el
              Decreto de MTSS del 21/5/2026 y quedó empatada con la segunda.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- El buscador por fecha de nacimiento -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué plazo te toca</h2>
      <p class="section-intro mb-5">
        Poné tu fecha de nacimiento y te decimos en qué franja del cuadro caés y qué día cierra. No
        se guarda ni se envía a ninguna parte: la cuenta se hace en tu navegador.
      </p>

      <VCard variant="flat" class="finder-card pa-5 pa-md-6">
        <VRow align="center">
          <VCol cols="12" sm="6" md="5">
            <VTextField
              v-model="birthDate"
              type="date"
              label="Tu fecha de nacimiento"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              prepend-inner-icon="mdi-cake-variant-outline"
            />
          </VCol>
          <VCol cols="12" sm="6" md="7">
            <VSwitch
              v-model="abroad"
              color="primary"
              hide-details
              :label="`Resido en el exterior (+${ABROAD_EXTRA_YEARS} años en cada franja)`"
            />
          </VCol>
        </VRow>

        <VAlert
          v-if="birthDate && !match"
          type="info"
          variant="tonal"
          density="comfortable"
          class="mt-4"
          icon="mdi-help-circle-outline"
        >
          Esa no es una fecha que podamos ubicar en el cuadro. Revisá el día y el mes.
        </VAlert>

        <div v-else-if="match" class="result mt-5">
          <p class="result-band mb-2">{{ match.birthLabel }}</p>
          <p class="result-date mb-2">
            {{ verdict.headline }}
          </p>
          <p class="mb-0 text-medium-emphasis">{{ verdict.detail }}</p>
        </div>
      </VCard>
    </section>

    <!-- El cuadro completo -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El cuadro del BPS, entero</h2>
      <p class="section-intro mb-5">
        Las cuatro franjas con su día de apertura y su día de cierre, como las publica el BPS. La
        columna de la derecha es el estado de hoy, {{ fmtDate(today) }}.
      </p>
      <VTable class="cu-mobile-cards bracket-table">
        <thead>
          <tr>
            <th>Fecha de nacimiento</th>
            <th>Desde</th>
            <th>Hasta</th>
            <th>Hoy</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bracket in WORK_YEARS_BRACKETS" :key="bracket.key">
            <td data-label="Fecha de nacimiento">
              {{ bracket.birthLabel }}
              <VTooltip v-if="bracket.extendedByDecree" location="top">
                <template #activator="{ props: activator }">
                  <VIcon
                    v-bind="activator"
                    icon="mdi-information-outline"
                    size="small"
                    class="ml-1"
                  />
                </template>
                Plazo extendido de acuerdo al Decreto de MTSS del 21/05/2026.
              </VTooltip>
            </td>
            <td data-label="Desde">{{ fmtDate(bracket.opensOn) }}</td>
            <td data-label="Hasta">{{ fmtDate(bracket.closesOn) }}</td>
            <td data-label="Hoy">
              <VChip :color="stateColor(bracket)" size="small" variant="flat">
                {{ stateLabel(bracket) }}
              </VChip>
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="footnote mt-4 mb-0">
        «Los plazos para las solicitudes de reconocimiento de años trabajados para personas
        residentes en el exterior se extienden por dos años más en cada franja.» Esa nota es del
        propio cuadro; el BPS no desglosa si también se corre la apertura, así que acá los dos años
        se aplican al cierre y nada más.
      </p>
    </section>

    <!-- Lo que hay que llevar -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué se necesita y dónde se hace</h2>
      <p class="section-intro mb-5">
        El trámite es <strong>presencial</strong> y lo tiene que iniciar el titular o un apoderado
        registrado en BPS.
      </p>
      <VRow>
        <VCol v-for="step in STEPS" :key="step.title" cols="12" md="6">
          <VCard variant="flat" class="step-card pa-5 h-100">
            <VIcon :icon="step.icon" color="primary" class="mb-3" />
            <div class="step-h mb-2">{{ step.title }}</div>
            <p class="mb-0 text-medium-emphasis">{{ step.body }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- La trampa de la cita -->
    <section class="mb-12">
      <VCard variant="flat" class="tip-card pa-5 pa-md-6">
        <div class="d-flex align-start">
          <VIcon icon="mdi-calendar-check-outline" color="success" class="mr-3 mt-1" />
          <div>
            <p class="warn-title mb-2">Lo que tiene que entrar en el plazo es la reserva</p>
            <p class="mb-0">
              El BPS dice que quien reside en Uruguay «deberá agendarse antes de finalizar el plazo
              (aunque la fecha de reserva sea posterior)». Si sacás la cita el último día y te la
              dan para tres meses después, el plazo está cumplido. Al revés no: llegar con la cita
              pedida en julio a un plazo que cerró en mayo no sirve.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Lo que NO es este trámite -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si lo que te falta es posterior a abril de 1996</h2>
      <VCard variant="flat" class="note-card pa-5 pa-md-6">
        <p class="mb-3">
          Entonces no es este trámite. Ese período <strong>debería estar registrado</strong>, y lo
          que corresponde es denunciar la diferencia: el BPS indica que las personas nacidas luego
          del 1/6/1968 pueden denunciar diferencias en los aportes o períodos de trabajo posteriores
          a abril de 1996, si residen en Uruguay, por el trámite «Denuncias de trabajadores».
        </p>
        <p class="mb-0 text-medium-emphasis">
          Y antes de cualquiera de los dos conviene mirar qué hay registrado hoy: la constancia de
          historia laboral nominada se saca en línea con usuario personal BPS y viene con código QR,
          así que no hay que ir a validarla a ningún mostrador.
        </p>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-5">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="item in WORK_YEARS_FAQ" :key="item.question">
          <VExpansionPanelTitle class="faq-q">{{ item.question }}</VExpansionPanelTitle>
          <VExpansionPanelText>{{ item.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Seguir leyendo -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Seguir leyendo</h2>
      <VRow>
        <VCol v-for="link in RELATED" :key="link.to" cols="12" sm="6">
          <VCard :to="localePath(link.to)" variant="flat" class="rel-card pa-5 h-100">
            <div class="step-h mb-1">{{ link.title }}</div>
            <p class="mb-0 text-medium-emphasis">{{ link.body }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="section-intro mb-4">
        Cada fecha de esta página sale del cuadro que publica el BPS, que declara como última
        actualización el {{ fmtDate(WORK_YEARS_SOURCE_UPDATED_AT) }}. Lo leímos el
        {{ fmtDate(WORK_YEARS_VERIFIED_AT) }}.
      </p>
      <ul class="src-list">
        <li v-for="source in WORK_YEARS_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  ABROAD_EXTRA_YEARS,
  WORK_YEARS_BRACKETS,
  WORK_YEARS_FAQ,
  WORK_YEARS_SOURCES,
  WORK_YEARS_SOURCE_UPDATED_AT,
  WORK_YEARS_VERIFIED_AT,
  bracketForBirthDate,
  closesOnFor,
  daysUntilClose,
  windowStateOn,
  type WorkYearsBracket,
} from '~/utils/workYearsRecognition'

const localePath = useLocalePath()

/**
 * El día de hoy en ISO, fijado una vez.
 *
 * Se calcula en UTC y no con `toLocaleDateString`, porque el estado de una ventana se decide
 * comparando cadenas ISO: un desfasaje de zona movería un borde un día entero, que es justo el
 * error que el cuadro castiga.
 */
const today = new Date().toISOString().slice(0, 10)

const birthDate = ref('')
const abroad = ref(false)

const match = computed<WorkYearsBracket | null>(() => bracketForBirthDate(birthDate.value))

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verdict = computed(() => {
  const bracket = match.value
  if (!bracket) return { headline: '', detail: '' }
  const closes = closesOnFor(bracket, abroad.value)
  const state = windowStateOn(today, bracket, abroad.value)
  const days = daysUntilClose(today, bracket, abroad.value)
  if (state === 'open') {
    return {
      headline: `Podés pedirlo hasta el ${fmtDate(closes)}.`,
      detail: `Faltan ${days.toLocaleString('es-UY')} días. Recordá que lo que tiene que quedar dentro del plazo es la reserva de la cita, no la fecha en que te atiendan.`,
    }
  }
  if (state === 'upcoming') {
    return {
      headline: `Tu franja todavía no abrió: se abre el ${fmtDate(bracket.opensOn)}.`,
      detail: `Cierra el ${fmtDate(closes)}. Si cumplís los requisitos para jubilarte antes de esa fecha, el BPS admite reconocer estos años al solicitar la jubilación.`,
    }
  }
  return {
    headline: `El plazo de tu franja venció el ${fmtDate(closes)}.`,
    detail:
      'El BPS aclara que quienes cumplan los requisitos para jubilarse antes del plazo de su edad pueden reconocer estos años al solicitar la jubilación. Consultá tu caso en el BPS.',
  }
})

const stateLabel = (bracket: WorkYearsBracket) => {
  const state = windowStateOn(today, bracket, abroad.value)
  return state === 'open' ? 'Abierta' : state === 'upcoming' ? 'No abrió' : 'Vencida'
}

const stateColor = (bracket: WorkYearsBracket) => {
  const state = windowStateOn(today, bracket, abroad.value)
  return state === 'open' ? 'success' : state === 'upcoming' ? 'info' : 'error'
}

const STEPS = [
  {
    icon: 'mdi-card-account-details-outline',
    title: 'Cédula de identidad vigente',
    body: 'Se presenta el titular o un apoderado registrado en BPS. No alcanza con que vaya un familiar sin poder registrado.',
  },
  {
    icon: 'mdi-file-document-edit-outline',
    title: 'Declaración de períodos trabajados completa',
    body: 'Es el formulario donde vas poniendo cada período que reclamás. El BPS publica un video con cómo se completa.',
  },
  {
    icon: 'mdi-briefcase-outline',
    title: 'La prueba de esos años',
    body: 'Según si trabajaste como dependiente o no dependiente, el BPS evalúa si te pide alguna otra documentación además de la declaración.',
  },
  {
    icon: 'mdi-office-building-outline',
    title: 'Presencial, con cita',
    body: 'Quien nació entre el 2/6/1963 y el 1/6/1968 tiene que entrar antes al servicio «Consultar situación para reconocer años trabajados».',
  },
]

const RELATED = [
  {
    to: '/cuando-me-puedo-jubilar-uruguay',
    title: '¿Cuándo me puedo jubilar?',
    body: 'La edad y los años de trabajo que te exige la Ley 20.130 según tu año de nacimiento.',
  },
  {
    to: '/denunciar-trabajo-en-negro-uruguay',
    title: 'Trabajo no declarado',
    body: 'Qué hacer si un período posterior a abril de 1996 no aparece en tu historia laboral.',
  },
  {
    to: '/desvincularme-de-la-afap-uruguay',
    title: 'Revocar la opción del artículo 8',
    body: 'La otra decisión que depende de tu historia laboral y de los años que te faltan.',
  },
  {
    to: '/certificados-bps-uruguay',
    title: 'Certificados del BPS',
    body: 'El común y el especial: qué acredita cada uno y los 180 días que duran.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/reconocer-anos-trabajados-uruguay'
const title = 'Reconocer años trabajados antes de 1996'
// La descripción arranca por la fecha: es el dato que decide el clic y el que la página contesta.
const description =
  'Si trabajaste antes del 1/4/1996 y no figura en tu historia laboral, el plazo vence el 31/5/2027 para los nacidos hasta el 1/6/1968. Cuadro del BPS.'

defineOgImageComponent('Cambio', {
  title: 'Reconocer años trabajados',
  subtitle: 'Lo anterior a abril de 1996 tiene plazo por fecha de nacimiento',
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
        'reconocimiento de años trabajados bps, reconocer años trabajados antes de 1996, historia laboral bps, años trabajados que no figuran, plazo reconocimiento años trabajados, ley 20130 años trabajados, declaracion de periodos trabajados, historia laboral 1996, anos trabajados jubilacion uruguay',
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
                name: 'Reconocer años trabajados antes de 1996',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: WORK_YEARS_FAQ.map(item => ({
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
.lead {
  font-size: 1.1rem;
  line-height: 1.7;
  max-width: 72ch;
  margin-top: 0;
}

.section-intro {
  max-width: 72ch;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
  margin-top: 0;
}

.warn-card {
  border: 1px solid rgba(var(--v-theme-warning), 0.35);
  background: rgba(var(--v-theme-warning), 0.06);
}

.tip-card {
  border: 1px solid rgba(var(--v-theme-success), 0.35);
  background: rgba(var(--v-theme-success), 0.06);
}

.warn-title {
  font-weight: 700;
  margin-top: 0;
}

.finder-card,
.step-card,
.note-card,
.rel-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.result {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 1rem;
}

.result-band {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
  margin-top: 0;
}

.result-date {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 0;
}

.step-h {
  font-weight: 700;
}

.bracket-table :deep(th) {
  white-space: nowrap;
}

.footnote {
  max-width: 72ch;
  font-size: 0.9rem;
  opacity: 0.7;
  margin-top: 0;
}

.src-list {
  margin-top: 0;
  padding-left: 1.1rem;
}

.src-list li {
  margin-bottom: 0.5rem;
}
</style>
