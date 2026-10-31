<template>
  <VContainer class="multa-no-votar py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">VOTO OBLIGATORIO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Multa por no votar en Uruguay: cuánto es y qué trámites te traba
      </h1>
      <p class="lead mb-6">
        El artículo 8 de la <strong>Ley 16.017</strong> la fija en <strong>1 UR</strong> la primera
        elección en la que no votás y <strong>3 UR</strong> por cada una de las siguientes, y el
        artículo 12 la <strong>duplica</strong> si sos funcionario público o profesional con título
        de la Universidad de la República. La Corte Electoral publica el monto en pesos elección por
        elección: en las <strong>Nacionales de 2024</strong> fue de
        <strong>{{ pesos(nacionales2024!.pesos) }}</strong> y en las
        <strong>Departamentales de 2025</strong>, de
        <strong>{{ pesos(departamentales2025!.pesos) }}</strong
        >. No hay plazo para pagarla, y se paga <strong>una por cada elección</strong> en la que no
        se votó.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo que la multa no arregla</div>
            <p class="callout-text mb-0">
              De los ocho actos que la ley traba mientras la credencial cívica no tenga el sello,
              <strong>siete se desbloquean pagando</strong> y uno no:
              <strong>{{ noSeArregla!.label.toLowerCase() }}</strong
              >. El literal D del artículo 11 lo dice con todas las letras —«esta prohibición no
              será subsanada con el pago de la multa prevista en el artículo 8»—, así que ahí lo que
              corresponde no es pagar sino <em>justificar</em>, y la justificación tiene plazo.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Cuánto es -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto es, en UR</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La ley escribe la multa en <strong>unidades reajustables</strong>, no en pesos. Esta tabla
        es esa escala; los pesos de cada elección los fija la Corte Electoral y están más abajo, con
        su fuente. Acá no multiplicamos la UR de hoy: el monto que una oficina cobra es el que esa
        resolución fijó, no el que daría la UR de esta mañana.
      </p>

      <VTable class="tiers-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Omisión</th>
            <th class="text-right">Multa</th>
            <th class="text-right">Si sos público o profesional de la UdelaR</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tier in VOTING_FINE_TIERS" :key="tier.key">
            <td data-label="Omisión">{{ tier.label }}</td>
            <td data-label="Multa" class="text-right font-weight-medium">{{ tier.ur }} UR</td>
            <td data-label="Duplicada" class="text-right font-weight-medium">
              {{ tier.urDuplicada }} UR
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-caption text-medium-emphasis mt-2 mb-0">
        Ley 16.017, artículos 8 y 12. El duplicado del artículo 12 no es un segundo número: es el
        del artículo 8 por dos, porque la norma dice «se duplicarán».
      </p>
    </section>

    <!-- Los montos publicados -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que la Corte Electoral publicó en pesos</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Un monto por elección, el de la <strong>primera</strong> omisión y su duplicado. El de las
        omisiones siguientes —3 UR, o 6 UR duplicado— la Corte Electoral no lo publica en pesos, así
        que acá tampoco: lo tiene que decir la Junta Electoral al liquidarlo.
      </p>

      <VRow dense>
        <VCol v-for="fila in VOTING_FINE_PUBLISHED" :key="fila.eleccion" cols="12" md="4">
          <VCard variant="flat" class="monto-card pa-5 h-100">
            <div class="text-overline mb-1">{{ fila.eleccion }}</div>
            <div v-if="fila.dia" class="text-caption text-medium-emphasis mb-3">
              {{ formatoLargo(fila.dia) }}
            </div>
            <div class="text-h5 font-weight-bold mb-1">{{ pesos(fila.pesos) }}</div>
            <div class="text-body-2 text-medium-emphasis mb-3">
              {{ pesos(fila.pesosDuplicada) }} si sos funcionario público o profesional de la UdelaR
            </div>
            <ul v-if="fila.extras" class="extras-list">
              <li v-for="extra in fila.extras" :key="extra.label">
                {{ extra.label }}: <strong>{{ pesos(extra.pesos) }}</strong> ({{ extra.ur }} UR)
              </li>
            </ul>
            <a
              v-if="fuenteDe(fila)"
              :href="fuenteDe(fila)!.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-caption"
            >
              Fuente: Corte Electoral
            </a>
          </VCard>
        </VCol>
      </VRow>

      <p class="section-intro text-medium-emphasis mt-5 mb-0">
        La elección del <strong>22 de noviembre de 2026</strong> es la del BPS y tiene reglas
        propias —la Ley 16.241 aplica la sanción de la nacional anterior, hay multas para las
        empresas y el plazo de justificación vence el 21 de enero de 2027—:
        <NuxtLink :to="localePath('/elecciones-bps-2026')" class="cu-link">
          quién vota y cuánto es la multa de las elecciones del BPS </NuxtLink
        >.
      </p>
    </section>

    <!-- Los actos trabados -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Los {{ VOTING_BLOCKED_ACTS.length }} actos que quedan trabados
      </h2>
      <p class="section-intro text-medium-emphasis mb-5">
        No es la multa lo que aparece primero: es esto. Mientras la credencial cívica no exhiba el
        sello —o su constancia de la Junta Electoral—, la Ley 16.017 no deja hacer estos ocho actos.
        Es lo que convierte una elección de hace años en un problema de hoy.
      </p>

      <VRow dense>
        <VCol v-for="acto in VOTING_BLOCKED_ACTS" :key="acto.articulo" cols="12" md="6">
          <VCard variant="flat" class="acto-card pa-4 h-100">
            <div class="d-flex align-center justify-space-between mb-2 ga-2">
              <span class="font-weight-medium">{{ acto.label }}</span>
              <VChip
                :color="acto.curableConLaMulta ? 'primary' : 'error'"
                size="small"
                variant="tonal"
              >
                {{ acto.curableConLaMulta ? 'Se arregla pagando' : 'Pagar no alcanza' }}
              </VChip>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-2">{{ acto.detalle }}</p>
            <div class="text-caption text-medium-emphasis">Ley 16.017, {{ acto.articulo }}</div>
          </VCard>
        </VCol>
      </VRow>

      <VCard class="warn-card pa-5 pa-md-6 mt-5" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-file-clock-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">
              El escrito que entró sin credencial: {{ VOTING_FILING_GRACE_DAYS }} días
            </div>
            <p class="callout-text mb-0">
              El artículo 9 admite el escrito presentado sin la credencial si la constancia llega
              dentro de los <strong>{{ VOTING_FILING_GRACE_DAYS }} días</strong>. Pasados, el
              escrito «se tendrá por no presentado» y lo actuado después se anula. Si cayó ante el
              Poder Judicial o el Tribunal de lo Contencioso Administrativo, contra esa resolución
              sólo cabe el recurso de reposición. O sea que el plazo no es un trámite: es la
              diferencia entre tener un expediente y no haberlo presentado nunca.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Justificar -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Justificar, en vez de pagar</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El artículo 6 admite <strong>tres</strong> causas, y sólo tres, «siempre que se comprueben
        fehacientemente». Cada una tiene su plazo y su destinatario, y el de la ausencia del país
        empieza a correr <em>antes</em> de la elección.
      </p>

      <VTable class="causas-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Causa</th>
            <th>Cómo se prueba</th>
            <th>Plazo</th>
            <th>Ante quién</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="causa in VOTING_JUSTIFICATIONS" :key="causa.literal">
            <td data-label="Causa">
              <strong>{{ causa.literal }})</strong> {{ causa.label }}
            </td>
            <td data-label="Cómo se prueba">{{ causa.prueba }}</td>
            <td data-label="Plazo">{{ causa.plazo }}</td>
            <td data-label="Ante quién">{{ causa.ante }}</td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-caption text-medium-emphasis mt-2 mb-0">
        Ley 16.017, artículos 6 y 7. Las fechas de cada elección y su formulario los publica la
        Corte Electoral después del comicio.
      </p>
    </section>

    <!-- Cómo se paga -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cómo se paga, y cómo se pide la devolución</h2>
      <p class="section-intro text-medium-emphasis mb-4">
        El artículo 8 manda pagar en las <strong>Juntas Electorales</strong> del departamento donde
        se debía votar, que estampan en la credencial el sello de constancia; si no llevás la
        credencial, la Junta emite una constancia del pago. Hoy la Corte Electoral además publica un
        <strong>formulario en línea</strong> para pagar y otro para pedir la
        <strong>devolución</strong> de una multa que no correspondía. Lo que no cambia es que
        <strong>no hay plazo</strong> para pagar y que se debe una multa por cada elección.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          :href="VOTING_FINE_SOURCES['corte-multas']!.url"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          variant="flat"
          prepend-icon="mdi-open-in-new"
        >
          Pago y devolución en la Corte Electoral
        </VBtn>
        <VBtn
          :to="localePath('/a-quien-le-reclamo-uruguay')"
          variant="tonal"
          prepend-icon="mdi-help-circle-outline"
        >
          ¿A quién le reclamo cada cosa?
        </VBtn>
      </div>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="item in FAQ" :key="item.question">
          <VExpansionPanelTitle class="font-weight-medium">
            {{ item.question }}
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="faq-answer mb-0">{{ item.answer }}</p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-body-2 text-medium-emphasis mb-3">
        Los artículos se leyeron en IMPO y los montos en pesos en la propia página de la Corte
        Electoral, el {{ verifiedAt }}. Hay dos cifras que esta página <strong>no publica</strong> a
        propósito: la multa de la segunda omisión en pesos, porque la Corte Electoral sólo publica
        la de la primera, y el monto de ninguna elección futura, porque lo fija una resolución que
        todavía no existe.
      </p>
      <ul class="sources-list">
        <li v-for="s in fuentes" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  VOTING_BLOCKED_ACTS,
  VOTING_FILING_GRACE_DAYS,
  VOTING_FINE_PUBLISHED,
  VOTING_FINE_SOURCES,
  VOTING_FINE_TIERS,
  VOTING_FINE_VERIFIED_AT,
  VOTING_JUSTIFICATIONS,
  actoQueElPagoNoArregla,
  fuenteDe,
  montoDe,
} from '~/utils/votingFine'

const localePath = useLocalePath()

// Todo sale del catálogo en tiempo de módulo: son constantes fechadas, no datos vivos, así que no
// hay nada que recalcular por pedido ni nada que pueda discrepar entre el servidor y el cliente.
const noSeArregla = actoQueElPagoNoArregla()
const nacionales2024 = montoDe('Nacionales')
const departamentales2025 = montoDe('Departamentales')
const fuentes = Object.values(VOTING_FINE_SOURCES)

const PESOS = new Intl.NumberFormat('es-UY', {
  style: 'currency',
  currency: 'UYU',
  maximumFractionDigits: 0,
})
const pesos = (valor: number) => PESOS.format(valor)

const LARGO = new Intl.DateTimeFormat('es-UY', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const formatoLargo = (iso: string) => LARGO.format(new Date(`${iso}T00:00:00Z`))

const verifiedAt = new Date(`${VOTING_FINE_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const FAQ = [
  {
    question: '¿Cuánto es la multa por no votar en Uruguay?',
    answer:
      'Una unidad reajustable la primera elección en la que no votás y tres UR por cada una de las siguientes (Ley 16.017, art. 8). Se duplica si sos funcionario público o profesional con título de la Universidad de la República (art. 12). En pesos, la Corte Electoral la fijó en $ 1.740 para las Elecciones Nacionales y la Segunda Elección de 2024 y en $ 1.820 para las Departamentales y Municipales de 2025, con el doble para esos dos grupos.',
  },
  {
    question: '¿Hay plazo para pagar la multa por no votar?',
    answer:
      'No. La Corte Electoral dice que «no hay plazo para realizar el trámite», y se debe una multa por cada elección en la que no se votó. El plazo que sí existe y vence es el de la justificación: 30 días después de la elección para la enfermedad y la fuerza mayor, y la ventana de 20 días antes y 20 después para quien estaba afuera del país.',
  },
  {
    question: '¿Qué no puedo hacer si no voté y no pagué?',
    answer:
      'La Ley 16.017 traba ocho actos mientras la credencial cívica no tenga el sello: cobrar sueldos, jubilaciones, pensiones y dietas (art. 11 B), cobrarle al Estado cualquier otra cosa (11 C), firmar escrituras públicas (11 A), inscribirse o rendir examen en la Universidad, los Institutos Normales o los Institutos de Profesores (11 E), comprar pasajes al exterior (11 F), ingresar a la Administración Pública (11 D), presentar escritos ante oficinas del Estado (art. 9) y entrar a una licitación del Estado (art. 10).',
  },
  {
    question: '¿Pagar la multa alcanza para entrar a la Administración Pública?',
    answer:
      'No. Es el único de los ocho actos donde la ley lo aclara: el literal D del artículo 11 dice que «esta prohibición no será subsanada con el pago de la multa prevista en el artículo 8». Para ese caso el camino es justificar la no emisión del voto dentro del plazo, no pagar.',
  },
  {
    question: '¿Cuáles son las causas válidas para no votar?',
    answer:
      'Tres, y sólo tres, según el artículo 6: padecer enfermedad, invalidez o imposibilidad física que impida concurrir el día de la elección; hallarse ausente del país ese día; y una fuerza mayor que haya impedido llegar a la Comisión Receptora de Votos. La ley exige que se comprueben fehacientemente: la primera con certificado de un médico del Ministerio de Salud Pública y, en su defecto, de otro médico o una información sumaria ante el Juzgado de Paz.',
  },
  {
    question: '¿La multa de las elecciones del BPS es la misma?',
    answer:
      'El monto sigue la escala de la nacional anterior, pero el régimen es propio. Para la elección del 22 de noviembre de 2026 la Corte Electoral publicó $ 1.900 (1 UR) para los afiliados activos y $ 3.800 (2 UR) para funcionarios públicos y profesionales de la UdelaR, más multas para las empresas contribuyentes según su cantidad de trabajadores: 6, 12 o 20 UR. El plazo para justificar vence el 21 de enero de 2027.',
  },
  {
    question: '¿Qué pasa con un escrito que presenté sin la credencial?',
    answer:
      'El artículo 9 lo admite si la constancia llega dentro de los 30 días. Si no llega, el escrito «se tendrá por no presentado» y lo actuado después se anula; ante el Poder Judicial o el Tribunal de lo Contencioso Administrativo, contra esa resolución sólo cabe el recurso de reposición.',
  },
] as const

const canonicalUrl = 'https://cambio-uruguay.com/multa-por-no-votar-uruguay'
const title = 'Multa por no votar: 1 UR, 3 UR la segunda'
const description =
  'Es 1 UR la primera vez y 3 UR cada siguiente (Ley 16.017, art. 8), el doble si sos público o profesional de la UdelaR. Sin plazo, y traba 8 trámites.'

defineOgImageComponent('Cambio', {
  title: 'Multa por no votar en Uruguay',
  subtitle: '1 UR la primera vez, 3 UR cada siguiente',
  tag: 'VOTO OBLIGATORIO',
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
        'multa por no votar uruguay, cuanto es la multa por no votar, no vote uruguay, justificar la no emision del voto, credencial civica sin sello, ley 16017, pagar multa corte electoral, constancia de voto para tramites',
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
                name: 'Elecciones del BPS 2026',
                item: 'https://cambio-uruguay.com/elecciones-bps-2026',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Multa por no votar en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: FAQ.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
          {
            '@type': 'Article',
            headline:
              'Multa por no votar en Uruguay: 1 UR la primera vez y los ocho trámites que traba',
            description,
            inLanguage: 'es-UY',
            mainEntityOfPage: canonicalUrl,
            publisher: { '@type': 'Organization', name: 'Cambio Uruguay' },
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.lead {
  font-size: 1.05rem;
  line-height: 1.75;
  margin-top: 0;
}

.warn-card,
.monto-card,
.acto-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
}

.callout-text,
.section-intro,
.faq-answer {
  line-height: 1.7;
  margin-top: 0;
}

.tiers-table,
.causas-table {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
}

.extras-list {
  margin-top: 0;
  margin-bottom: 0.75rem;
  padding-left: 1.25rem;
}

.extras-list li {
  font-size: 0.875rem;
  line-height: 1.6;
  margin-top: 0.3rem;
}

.faq-panels {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
}

.sources-note {
  margin-top: 0;
}

.sources-list {
  margin-top: 0;
  padding-left: 1.25rem;
}

.sources-list li {
  line-height: 1.6;
  margin-top: 0.4rem;
}

.sources-list a {
  color: rgb(var(--v-theme-primary));
}
</style>
