<template>
  <VContainer class="feriados-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">FERIADOS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Qué feriados se corren al lunes en Uruguay?
      </h1>
      <p class="lead mb-6">
        Sólo <strong>tres</strong>: el <strong>19 de abril</strong>, el
        <strong>18 de mayo</strong> y el <strong>12 de octubre</strong>. Todos los demás —las ocho
        fechas del artículo 2 de la <strong>Ley 16.805</strong>, más Carnaval y Semana de Turismo—
        se observan el día que caen, sea cual sea. Y sí: el 18 de mayo se corre, aunque se lea lo
        contrario en todos lados.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-scale-balance" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">La regla, tal cual la escribe la ley</div>
            <p class="callout-text mb-0">
              «Si coincidieran el <strong>sábado, domingo o lunes</strong>, se observarán esos días;
              si ocurrieran en <strong>martes o miércoles</strong>, se observarán el lunes inmediato
              anterior; si ocurrieren en <strong>jueves o viernes</strong>, se observarán el lunes
              inmediato siguiente.» — Ley 16.805, art. 1, con su modificativa la Ley 17.414.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Los tres, año por año -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los tres feriados móviles, año por año</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Estas fechas no las publica nadie: son la regla de arriba aplicada al calendario. Por eso
        podés comprobarlas vos mismo mirando qué día de la semana cae cada una.
      </p>

      <div v-for="anio in anios" :key="anio.year" class="year-block mb-6">
        <h3 class="year-heading">{{ anio.year }}</h3>
        <VTable class="feriados-table cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Feriado</th>
              <th>Fecha que declara la ley</th>
              <th>Se observa</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fila in anio.filas" :key="fila.key">
              <td data-label="Feriado">
                <span class="font-weight-medium">{{ fila.nombre }}</span>
              </td>
              <td data-label="Fecha de la ley" class="text-no-wrap">
                {{ formatoLargo(fila.fecha) }}
              </td>
              <td data-label="Se observa">
                <VChip
                  :color="fila.seCorre ? 'warning' : 'success'"
                  size="small"
                  variant="tonal"
                  class="mr-2"
                >
                  {{ fila.seCorre ? 'Se corre' : 'No se corre' }}
                </VChip>
                <span class="text-no-wrap">{{ formatoLargo(fila.observado) }}</span>
                <span class="d-block text-caption text-medium-emphasis mt-1">
                  {{ explicacion(fila) }}
                </span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>

      <VCard variant="flat" class="note-card pa-5">
        <p class="note-text mb-0">
          <VIcon icon="mdi-alert-circle-outline" color="warning" size="18" class="mr-1" />
          <strong>El 18 de mayo no es inamovible.</strong> Se repite mucho porque existe la Ley
          18.748, pero su artículo único exceptúa del corrimiento «el feriado del 18 de mayo
          <em>de 2011</em>, fecha en que se celebran los 200 años de la Batalla de Las Piedras».
          Valió para el bicentenario y para ningún otro año.
        </p>
      </VCard>
    </section>

    <!-- Los que nunca se corren -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los feriados que nunca se corren</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El artículo 2 de la Ley 16.805 los deja fuera de la regla: «se continuarán observando en el
        día de la semana que ocurriere, cualquiera que este fuera». Son diez, y cinco de ellos son
        además <strong>feriados pagos</strong>.
      </p>

      <VTable class="feriados-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Feriado</th>
            <th>Cuándo</th>
            <th>¿Pago?</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in FERIADOS_FIJOS" :key="f.key">
            <td data-label="Feriado">
              <span class="font-weight-medium">{{ f.nombre }}</span>
            </td>
            <td data-label="Cuándo" class="text-no-wrap">{{ f.cuando }}</td>
            <td data-label="¿Pago?">
              <VChip :color="f.pago ? 'success' : 'default'" size="small" variant="tonal">
                {{ f.pago ? 'Pago' : 'Laborable' }}
              </VChip>
            </td>
          </tr>
        </tbody>
      </VTable>

      <VCard variant="flat" class="pay-card pa-5 pa-md-6 mt-6">
        <div class="text-overline mb-2">Qué quiere decir «feriado pago»</div>
        <p class="callout-text mb-0">
          En los cinco feriados pagos —1.º de enero, 1.º de mayo, 18 de julio, 25 de agosto y 25 de
          diciembre— el artículo 18 de la <strong>Ley 12.590</strong> establece que el trabajador
          percibe remuneración como si trabajara, y que
          <strong>si trabaja recibe paga doble</strong>. Los otros feriados son laborables: se
          trabaja normalmente y se cobra como un día común.
        </p>
      </VCard>
    </section>

    <!-- Qué significa para cambiar plata -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Y para cambiar plata, ¿qué cambia?</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Esto es lo que esta página <strong>no</strong> te puede decir: si abre tu casa de cambio.
        Ninguna norma las obliga a cerrar en feriado ni a abrir, así que cada casa lo decide, y el
        horario de un feriado no siempre es el que figura publicado. Lo que sí sirve saber de
        antemano es <em>qué lunes</em> va a ser feriado, que es justamente lo que resuelve la tabla
        de arriba.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          :to="localePath('/casas-de-cambio-abiertas-fin-de-semana')"
          variant="tonal"
          size="small"
        >
          Casas abiertas fin de semana
        </VBtn>
        <VBtn :to="localePath('/sucursal')" variant="tonal" size="small">
          Horarios por sucursal
        </VBtn>
        <VBtn :to="localePath('/casa-de-cambio-cerca-de-mi')" variant="tonal" size="small">
          Casa de cambio cerca mío
        </VBtn>
      </div>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in FERIADOS_FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <span class="font-weight-medium">{{ f.question }}</span>
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ f.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-body-2 text-medium-emphasis mb-3">
        Contrastado contra el texto de las normas en IMPO y contra el MTSS el {{ verifiedAt }}. Esta
        página no publica el calendario completo de feriados uruguayos: la Ley 6.997 de 1919 declaró
        dieciocho fechas y varias dejaron de observarse hace décadas, así que acá sólo figuran las
        que una norma posterior y vigente vuelve a nombrar.
      </p>
      <ul class="sources-list">
        <li v-for="s in FERIADOS_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  FERIADOS_FAQ,
  FERIADOS_FIJOS,
  FERIADOS_SOURCES,
  FERIADOS_VERIFIED_AT,
  feriadosMovilesDe,
  type FilaAnual,
} from '~/utils/feriados'

const localePath = useLocalePath()

// El año se resuelve UNA vez, en el servidor, y viaja en el payload: si lo calculara también el
// cliente, alguien que abra la página a las 23:59 del 31 de diciembre vería el servidor y el
// navegador discrepar en el año y Vue tiraría un error de hidratación.
const currentYear = useState('feriadosYear', () => new Date().getUTCFullYear())

// Este año y el que viene: en agosto la mitad del año ya pasó, y la pregunta que queda viva es la
// del año próximo.
const anios = computed(() =>
  [currentYear.value, currentYear.value + 1].map(year => ({
    year,
    filas: feriadosMovilesDe(year),
  }))
)

const LARGO = new Intl.DateTimeFormat('es-UY', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const formatoLargo = (iso: string) => LARGO.format(new Date(`${iso}T00:00:00Z`))

function explicacion(fila: FilaAnual): string {
  switch (fila.corrimiento) {
    case 'mismo-dia':
      return 'Cae sábado, domingo o lunes, así que se observa ese mismo día.'
    case 'lunes-anterior':
      return 'Cae martes o miércoles, así que pasa al lunes inmediato anterior.'
    case 'lunes-siguiente':
      return 'Cae jueves o viernes, así que pasa al lunes inmediato siguiente.'
  }
}

const verifiedAt = new Date(`${FERIADOS_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/feriados-que-se-corren-uruguay'
const title = 'Feriados que se corren al lunes en Uruguay'
const description =
  'Sólo tres feriados uruguayos se corren al lunes: el 19 de abril, el 18 de mayo y el 12 de octubre. Las otras ocho fechas, más Carnaval y Semana de Turismo, se observan el día que caen (Ley 16.805, art. 2). Y el 18 de mayo sí se corre: la ley que lo dejó fijo valía sólo para 2011.'

defineOgImageComponent('Cambio', {
  title: 'Qué feriados se corren al lunes',
  subtitle: 'Son tres: 19 de abril, 18 de mayo y 12 de octubre',
  tag: 'FERIADOS',
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
        'feriados que se corren uruguay, feriado se corre al lunes, 19 de abril feriado, 18 de mayo feriado inamovible, 12 de octubre feriado uruguay, ley 16805 feriados, corrimiento de feriados, feriados pagos uruguay, feriados laborables uruguay, feriados no se corren',
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
                name: 'Qué feriados se corren al lunes en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: FERIADOS_FAQ.map(f => ({
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
            citation: FERIADOS_SOURCES.map(s => ({
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
.feriados-page {
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
.sources-note {
  max-width: 72ch;
  margin-top: 0;
}
.callout-text,
.note-text {
  margin-top: 0;
  line-height: 1.6;
}

.warn-card,
.note-card,
.pay-card {
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
.pay-card {
  background: rgba(var(--v-theme-success), 0.06);
}

.year-heading {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-top: 0;
  margin-bottom: 8px;
  color: rgb(var(--v-theme-primary));
}

.feriados-table :deep(th) {
  white-space: nowrap;
}
.feriados-table :deep(td) {
  vertical-align: top;
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
