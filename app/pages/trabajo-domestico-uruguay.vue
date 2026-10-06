<template>
  <VContainer class="domestic-work">
    <VRow justify="center">
      <VCol cols="12" md="10">
        <header class="mb-6">
          <VChip class="mb-3" color="primary" size="small" variant="tonal">
            <VIcon start size="small">mdi-home-heart</VIcon>
            Trabajo en casa de familia
          </VChip>
          <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
            Trabajo doméstico en Uruguay: cuánto se paga por categoría y cómo se registra en BPS
          </h1>
          <p class="lead">
            Desde el 1.º de julio de 2026 el sector tiene <strong>tres categorías</strong> y no un
            mínimo solo: general, cocina y cuidados, cada una con su piso. Y la categoría no la
            decide el nombre del puesto sino
            <strong>qué ocupa más de la mitad de la jornada</strong>. Abajo está el piso vigente de
            cada una, la regla con la que BPS las separa, lo que la ley propia del sector exige en
            jornada y descansos, y el trámite del alta.
          </p>
          <p class="note-text text-medium-emphasis">
            Cada cifra y cada cita se leyeron en la fuente oficial el {{ verifiedAt }}. Esta página
            no publica el salario vacacional del sector: el MTSS lo enuncia de una forma que no se
            pudo leer sin ambigüedad, y acá no va ninguna cifra que no se pueda sostener.
          </p>
        </header>

        <VCard variant="outlined" class="note-card pa-4 mb-8">
          <h2 class="text-h6 font-weight-bold mb-2">El piso no es el salario mínimo nacional</h2>
          <p class="section-intro">
            Es el laudo del sector. La Ley 18.065, art. 6, incorporó al trabajo doméstico «en el
            sistema de fijación de salarios y categorías dispuesto por la Ley Nº 10.449», que es el
            de los Consejos de Salarios. De ahí salen estas tres categorías, creadas por el acta del
            consejo de salarios del 5 de diciembre de 2025.
          </p>
          <p class="table-note text-medium-emphasis">
            Los montos de abajo son los que BPS publica para el período
            {{ ventana }}. El laudo se renegocia por rondas y se ajusta más de una vez al año, así
            que el día que liquidás el valor vigente se mira en BPS.
          </p>
        </VCard>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-2">
            Las tres categorías y su piso
            <VChip size="x-small" variant="tonal" class="ml-1">{{ categorias.length }}</VChip>
          </h2>
          <p class="section-intro text-medium-emphasis">
            Mínimos por 44 horas semanales, vigentes del {{ desde }} al {{ hasta }}.
          </p>
          <VTable class="cu-mobile-cards mt-3" density="comfortable">
            <thead>
              <tr>
                <th>Categoría</th>
                <th class="text-right">Por 44 h semanales</th>
                <th class="text-right">Mínimo por hora</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cat in categorias" :key="cat.id">
                <td data-label="Categoría">
                  <strong>{{ cat.nombre }}</strong>
                </td>
                <td data-label="Por 44 h semanales" class="text-right">
                  {{ pesos(cat.minimoMensual) }}
                </td>
                <td data-label="Mínimo por hora" class="text-right">
                  {{ pesos(cat.minimoHora) }}
                </td>
              </tr>
            </tbody>
          </VTable>
          <p class="table-note text-medium-emphasis">
            Fuente: BPS, «Aumento salarial - Julio 2026».
            <a :href="WAGE_SOURCE_URL" target="_blank" rel="noopener noreferrer" class="source-tag">
              bps.gub.uy
            </a>
          </p>
          <ul class="plain-list">
            <li v-for="cat in categorias" :key="`def-${cat.id}`">
              <strong>{{ cat.nombre }}.</strong> {{ cat.comprende }}
              <template v-if="cat.noAlcanza">
                <em>{{ cat.noAlcanza }}</em>
              </template>
            </li>
          </ul>
        </section>

        <VCard variant="outlined" class="gap-card pa-4 mb-8">
          <h2 class="text-h6 font-weight-bold mb-2">
            El error de categoría: cocinar todos los días no sube de categoría
          </h2>
          <p class="section-intro">
            Para quedar en cocina o en cuidados esa tarea tiene que ser la
            <strong>principal</strong>, y BPS lo define con un umbral exacto:
          </p>
          <blockquote class="quote mb-0">“{{ DOMESTIC_MAIN_TASK_QUOTE }}”</blockquote>
          <p class="section-intro mt-3">
            Por debajo de ese umbral el cuidado o la cocina quedan comprendidos dentro de la
            categoría general —hasta el 50 % del tiempo trabajado—, y una jornada repartida entre
            varias tareas también. El otro lado de la misma moneda, del mismo comunicado:
          </p>
          <blockquote class="quote mb-0">“{{ DOMESTIC_LOWER_TASKS_QUOTE }}”</blockquote>
        </VCard>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-2">Qué categoría corresponde según la jornada</h2>
          <p class="section-intro text-medium-emphasis">
            Repartí las horas de una semana entre las tres familias de tareas y la cuenta aplica la
            regla del 50 % más una hora. No es una declaración ante BPS: es la misma aritmética que
            el comunicado describe.
          </p>
          <VRow class="mt-2" dense>
            <VCol cols="12" sm="4">
              <VTextField
                v-model.number="horasGeneral"
                label="Limpieza, orden, mandados"
                type="number"
                min="0"
                max="44"
                density="comfortable"
                variant="outlined"
                suffix="h"
                hide-details
              />
            </VCol>
            <VCol cols="12" sm="4">
              <VTextField
                v-model.number="horasCocina"
                label="Cocinar"
                type="number"
                min="0"
                max="44"
                density="comfortable"
                variant="outlined"
                suffix="h"
                hide-details
              />
            </VCol>
            <VCol cols="12" sm="4">
              <VTextField
                v-model.number="horasCuidados"
                label="Cuidar personas"
                type="number"
                min="0"
                max="44"
                density="comfortable"
                variant="outlined"
                suffix="h"
                hide-details
              />
            </VCol>
          </VRow>
          <VAlert
            v-if="totalHoras > 0"
            class="mt-4"
            :type="totalHoras > 44 ? 'warning' : 'info'"
            variant="tonal"
            density="comfortable"
          >
            <p class="alert-title font-weight-bold">
              Categoría {{ categoriaSugerida.nombre.toLowerCase() }}, con {{ totalHoras }} h por
              semana
            </p>
            <p class="alert-body">
              Al mínimo por hora de esa categoría ({{ pesos(categoriaSugerida.minimoHora) }}), esas
              horas valen <strong>{{ pesos(pisoSemanal) }}</strong> por semana. Es la multiplicación
              del valor hora publicado, no un mínimo mensual proporcional.
              <template v-if="totalHoras > 44">
                Y pasaste de las 44 horas semanales que la Ley 18.065 fija como máximo: lo que pase
                de ahí son horas extra.
              </template>
            </p>
          </VAlert>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-2">
            Lo que exige la ley propia del sector
            <VChip size="x-small" variant="tonal" class="ml-1">{{ reglas.length }}</VChip>
          </h2>
          <p class="section-intro text-medium-emphasis">
            El trabajo doméstico no se lee con las reglas de industria y comercio: tiene su propia
            ley, la 18.065. Cada fila lleva su artículo.
          </p>
          <VTable class="cu-mobile-cards mt-3" density="comfortable">
            <thead>
              <tr>
                <th>Regla</th>
                <th>Qué dice</th>
                <th>Norma</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="regla in reglas" :key="regla.key">
                <td data-label="Regla">
                  <strong>{{ regla.label }}</strong>
                </td>
                <td data-label="Qué dice">{{ regla.detail }}</td>
                <td data-label="Norma" class="text-no-wrap">{{ regla.source }}</td>
              </tr>
            </tbody>
          </VTable>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-2">
            Licencia, aguinaldo, plazos y el alta en BPS
          </h2>
          <p class="section-intro text-medium-emphasis">
            Lo que publica el MTSS y lo que hay que hacer del lado del empleador.
          </p>
          <ul class="plain-list">
            <li v-for="duty in obligaciones" :key="duty.key">
              <strong>{{ duty.label }}.</strong> {{ duty.detail }}
            </li>
          </ul>
          <p class="table-note text-medium-emphasis">
            La licencia y el aguinaldo se liquidan con el régimen general: el cálculo está en
            <NuxtLink :to="localePath('/salario-vacacional-uruguay')" class="domestic-link">
              salario vacacional y licencia </NuxtLink
            >, y el del aguinaldo en
            <NuxtLink :to="localePath('/herramientas/calculadora-aguinaldo')" class="domestic-link">
              la calculadora de aguinaldo </NuxtLink
            >.
          </p>
        </section>

        <VCard variant="outlined" class="note-card pa-4 mb-8">
          <h2 class="text-h6 font-weight-bold mb-2">
            Si el vínculo se termina: noventa días, no un año
          </h2>
          <p class="section-intro">
            Es el dato que más circula mal. La antigüedad mínima para tener derecho a indemnización
            por despido en casa de familia son <strong>noventa días corridos</strong>, para
            mensuales y para jornaleros, por el art. 7 de la Ley 18.065. El año de antigüedad que
            todavía se repite salía del art. 7 de la Ley 12.597, de 1958, y la ley propia del sector
            lo dejó sin efecto en 2006.
          </p>
          <p class="section-intro">
            El resto se rige «por las normas generales sobre despido», así que el monto se calcula
            igual que en cualquier otro empleo privado:
            <NuxtLink :to="localePath('/indemnizacion-por-despido-uruguay')" class="domestic-link">
              cómo se calcula la indemnización </NuxtLink
            >. Y el sector tiene seguro de paro, con sus requisitos de aportación:
            <NuxtLink :to="localePath('/seguro-de-paro-uruguay')" class="domestic-link">
              seguro de paro </NuxtLink
            >.
          </p>
        </VCard>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-2">Preguntas frecuentes</h2>
          <VExpansionPanels variant="accordion" class="mt-3">
            <VExpansionPanel v-for="(item, i) in faq" :key="i">
              <VExpansionPanelTitle>{{ item.question }}</VExpansionPanelTitle>
              <VExpansionPanelText>{{ item.answer }}</VExpansionPanelText>
            </VExpansionPanel>
          </VExpansionPanels>
        </section>

        <section class="mb-4">
          <h2 class="text-h6 font-weight-bold mb-2">Fuentes</h2>
          <p class="sources-note text-medium-emphasis">
            Normativa en impo.com.uy y los organismos que liquidan y controlan. Leídas el
            {{ verifiedAt }}.
          </p>
          <ul class="sources-list">
            <li v-for="source in fuentes" :key="source.url">
              <a :href="source.url" target="_blank" rel="noopener noreferrer" class="domestic-link">
                {{ source.label }}
              </a>
            </li>
          </ul>
        </section>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import {
  DOMESTIC_CATEGORIES,
  DOMESTIC_LOWER_TASKS_QUOTE,
  DOMESTIC_MAIN_TASK_QUOTE,
  DOMESTIC_WAGE_WINDOW,
  DOMESTIC_WORK_DUTIES,
  DOMESTIC_WORK_FAQ,
  DOMESTIC_WORK_RULES,
  DOMESTIC_WORK_SOURCES,
  DOMESTIC_WORK_VERIFIED_AT,
  categoriaPorHoras,
  categoriaPorId,
  pisoSemanalPorHoras,
} from '~/utils/domesticWork'

const localePath = useLocalePath()

const categorias = DOMESTIC_CATEGORIES
const reglas = DOMESTIC_WORK_RULES
const obligaciones = DOMESTIC_WORK_DUTIES
const faq = DOMESTIC_WORK_FAQ
const fuentes = DOMESTIC_WORK_SOURCES

const WAGE_SOURCE_URL = 'https://www.bps.gub.uy/24375/aumento-salarial---julio-2026.html'

const horasGeneral = ref(30)
const horasCocina = ref(8)
const horasCuidados = ref(6)

const limpio = (value: number | string): number => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

const totalHoras = computed(
  () => limpio(horasGeneral.value) + limpio(horasCocina.value) + limpio(horasCuidados.value)
)

const categoriaSugerida = computed(() =>
  categoriaPorId(
    categoriaPorHoras({
      general: limpio(horasGeneral.value),
      cocina: limpio(horasCocina.value),
      cuidados: limpio(horasCuidados.value),
    })
  )
)

const pisoSemanal = computed(() =>
  pisoSemanalPorHoras(categoriaSugerida.value.id, totalHoras.value)
)

const pesos = (value: number): string =>
  `$ ${new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 }).format(value)}`

const fecha = (iso: string): string =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = fecha(DOMESTIC_WORK_VERIFIED_AT)
const desde = fecha(DOMESTIC_WAGE_WINDOW.desde)
const hasta = fecha(DOMESTIC_WAGE_WINDOW.hasta)
const ventana = `${desde} – ${hasta}`

const canonicalUrl = 'https://cambio-uruguay.com/trabajo-domestico-uruguay'
const title = 'Trabajo doméstico: cuánto se paga en 2026'
const description =
  'Desde julio de 2026 hay tres categorías: general $ 32.051, cocina $ 33.796 y cuidados $ 34.885 por 44 horas. Cocinar de a ratos no sube de categoría.'

defineOgImageComponent('Cambio', {
  title: 'Trabajo doméstico en Uruguay',
  subtitle: 'Las tres categorías del laudo, los descansos de la Ley 18.065 y el alta en BPS',
  tag: 'CASA DE FAMILIA',
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
        'trabajo domestico uruguay, cuanto se le paga a una empleada domestica, salario minimo trabajo domestico 2026, categorias trabajo domestico bps, categoria cuidados trabajo domestico, categoria cocina trabajo domestico, registrar empleada domestica en bps, aportes servicio domestico, ley 18065, despido empleada domestica, 90 dias indemnizacion trabajo domestico, descanso nocturno sin retiro, licencia trabajo domestico, jornada 44 horas trabajo domestico',
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
                name: 'Trabajo doméstico en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: DOMESTIC_WORK_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: DOMESTIC_WORK_SOURCES.map(source => ({
              '@type': 'CreativeWork',
              name: source.label,
              url: source.url,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: DOMESTIC_WORK_FAQ.map(item => ({
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
/* Vuetify 4 no cero los márgenes de los bloques de texto, y un <p> que sigue a un hermano se come
   cualquier separación menor a 1em: por eso cada bloque declara el suyo. Ver app/AGENTS.md. */
.lead {
  font-size: 1.075rem;
  line-height: 1.6;
  max-width: 72ch;
  margin-top: 0;
}
.section-intro,
.note-text,
.table-note,
.sources-note,
.alert-body {
  max-width: 76ch;
  margin-top: 0;
}
.note-text,
.table-note,
.sources-note {
  font-size: 0.85rem;
  line-height: 1.5;
}
.section-intro {
  margin-top: 0.75rem;
}
.table-note {
  margin-top: 0.75rem;
}
.alert-title {
  margin-top: 0;
}
.alert-body {
  margin-top: 0.35rem;
  font-size: 0.9rem;
  line-height: 1.5;
}
.quote {
  margin-top: 0.75rem;
  padding-left: 0.9rem;
  border-left: 3px solid rgba(var(--v-theme-primary), 0.5);
  font-style: italic;
  line-height: 1.55;
  max-width: 76ch;
}
.plain-list {
  margin-top: 0.75rem;
  padding-left: 1.25rem;
}
.plain-list li {
  margin-bottom: 0.75rem;
  line-height: 1.55;
  max-width: 76ch;
}
.sources-list {
  margin-top: 0.5rem;
  padding-left: 1.25rem;
}
.sources-list li {
  margin-bottom: 0.5rem;
  line-height: 1.5;
  font-size: 0.9rem;
}
.note-card {
  border: 1px solid rgba(var(--v-theme-primary), 0.28);
  border-radius: 12px;
}
.gap-card {
  border: 1px solid rgba(var(--v-theme-warning), 0.35);
  border-radius: 12px;
}
.source-tag {
  display: inline-block;
  margin-left: 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  white-space: nowrap;
}
.source-tag::before {
  content: '↗ ';
}
.source-tag:hover {
  text-decoration: underline;
}
.domestic-link {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  text-decoration: none;
}
.domestic-link:hover {
  text-decoration: underline;
}
</style>
