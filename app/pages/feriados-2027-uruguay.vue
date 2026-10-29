<template>
  <VContainer class="feriados-anio py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">FERIADOS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Feriados 2027 en Uruguay: las 15 fechas y los 6 fines de semana largos
      </h1>
      <p class="lead mb-6">
        En 2027 hay <strong>{{ resumen.dias }} días de feriado</strong> y dejan
        <strong>{{ resumen.finesDeSemanaLargos }} fines de semana largos</strong>, dos de ellos de
        cuatro días: <strong>Carnaval</strong> (lunes 8 y martes 9 de febrero) y
        <strong>Semana de Turismo</strong> (jueves 25 y viernes 26 de marzo). El artículo 1 de la
        <strong>Ley 16.805</strong> corre al lunes <strong>dos</strong> de los tres feriados móviles
        —el 18 de mayo pasa al lunes 17 y el 12 de octubre al lunes 11—, y el 19 de abril ya cae
        lunes solo. En el otro platillo,
        <strong>{{ resumen.enFinDeSemana }} feriados caen sábado o domingo</strong> y no se corren a
        ningún lado.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-scale-balance" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">De dónde sale este calendario</div>
            <p class="callout-text mb-0">
              No de una publicación oficial del año: el Estado no publica un calendario anual de
              feriados, publica las <strong>normas</strong>. Las trece fechas de abajo son las que
              una norma vigente nombra como feriado —las diez del artículo 2 de la Ley 16.805 y las
              tres de la Ley 6.997 que ese artículo no exceptúa—, con la regla de corrimiento del
              artículo 1 aplicada a 2027. Las dos que la ley nombra por su posición y no por su
              fecha, Carnaval y Semana de Turismo, salen de la Pascua, que en 2027 cae el
              <strong>domingo 28 de marzo</strong>.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Fines de semana largos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los {{ tramos.length }} fines de semana largos</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Tramos de tres días o más sin un día hábil en medio, contando sábado y domingo como no
        hábiles —el supuesto es la semana de lunes a viernes, no una regla legal: ninguna norma
        obliga a un comercio a cerrar en feriado—.
      </p>

      <VRow dense>
        <VCol v-for="tramo in tramos" :key="tramo.desde" cols="12" sm="6" md="4">
          <VCard variant="flat" class="tramo-card pa-4 h-100">
            <div class="d-flex align-center justify-space-between mb-2">
              <VChip :color="tramo.dias >= 4 ? 'success' : 'primary'" size="small" variant="tonal">
                {{ tramo.dias }} días
              </VChip>
              <span class="text-caption text-medium-emphasis">{{ mesDe(tramo.desde) }}</span>
            </div>
            <div class="font-weight-medium mb-1">{{ rango(tramo.desde, tramo.hasta) }}</div>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ motivo(tramo) }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- El calendario -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El calendario, día por día</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La columna que importa para planificar es <strong>«se observa»</strong>: es el día en que el
        feriado efectivamente cae en 2027, ya corrido si correspondía.
      </p>

      <VTable class="feriados-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Feriado</th>
            <th scope="col">Se observa</th>
            <th scope="col">¿Pago?</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fila in calendario" :key="fila.key">
            <td data-label="Feriado">
              <span class="font-weight-medium">{{ fila.nombre }}</span>
              <span v-if="fila.declarada" class="d-block text-caption text-medium-emphasis mt-1">
                La ley lo declara el {{ formatoLargo(fila.declarada) }}; {{ explicacion(fila) }}
              </span>
              <span
                v-else-if="fila.origen === 'pascua'"
                class="d-block text-caption text-medium-emphasis mt-1"
              >
                La ley nombra el día, no la fecha: sale de la Pascua del 28 de marzo.
              </span>
            </td>
            <td data-label="Se observa">
              <span class="text-no-wrap">{{ formatoLargo(fila.observado) }}</span>
              <VChip
                v-if="esFinDeSemana(fila.observado)"
                color="warning"
                size="x-small"
                variant="tonal"
                class="ml-2"
              >
                Cae fin de semana
              </VChip>
            </td>
            <td data-label="¿Pago?">
              <VChip :color="fila.pago ? 'success' : 'default'" size="small" variant="tonal">
                {{ fila.pago ? 'Pago' : 'Laborable' }}
              </VChip>
            </td>
          </tr>
        </tbody>
      </VTable>

      <VCard variant="flat" class="pay-card pa-5 pa-md-6 mt-6">
        <div class="text-overline mb-2">Los {{ resumen.pagos }} que son pagos</div>
        <p class="callout-text mb-0">
          En el 1.º de enero, el 1.º de mayo, el 18 de julio, el 25 de agosto y el 25 de diciembre
          el artículo 18 de la <strong>Ley 12.590</strong> establece que el trabajador percibe
          remuneración como si trabajara, y que <strong>si trabaja recibe paga doble</strong>. Los
          otros diez son laborables: se trabaja normalmente y se cobra como un día común. En 2027
          tres de los cinco pagos —1.º de mayo, 18 de julio y 25 de diciembre— caen sábado o
          domingo.
        </p>
      </VCard>
    </section>

    <!-- Lo que 2027 se come -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Los {{ resumen.enFinDeSemana }} feriados que 2027 se come
      </h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Ninguno de estos se corre, y no es un olvido de la ley: el artículo 2 de la Ley 16.805 dice
        que estas fechas «se continuarán observando en el día de la semana que ocurriere, cualquiera
        que este fuera». Un feriado en domingo se pierde.
      </p>
      <ul class="perdidos-list">
        <li v-for="fila in enFinDeSemana" :key="fila.key">
          <strong>{{ fila.nombre }}</strong> — {{ formatoLargo(fila.observado) }}
          <span v-if="fila.pago" class="text-medium-emphasis">(y es feriado pago)</span>
        </li>
      </ul>
      <p class="text-body-2 text-medium-emphasis mt-4 mb-0">
        El contraste con los móviles es el punto de toda la regla: el 18 de mayo cae martes y el 12
        de octubre también, y los dos pasan al lunes anterior justamente para no perderse en medio
        de la semana. Cuál se corre y cuál no lo decide la norma que lo declara, no el calendario:
        <NuxtLink :to="localePath('/feriados-que-se-corren-uruguay')" class="cu-link">
          qué feriados se corren al lunes y por qué </NuxtLink
        >.
      </p>
    </section>

    <!-- Para cambiar plata -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Si el feriado te agarra necesitando cambiar plata
      </h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Esta página no te puede decir si abre tu casa de cambio: ninguna norma las obliga a cerrar
        en feriado ni a abrir, así que cada casa lo decide y el horario de un feriado no siempre es
        el que figura publicado. Lo que sí sirve de antemano es saber <em>qué lunes</em> va a ser
        feriado, que es la tabla de arriba.
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
        <VBtn :to="localePath('/licencias-especiales-uruguay')" variant="tonal" size="small">
          Licencias especiales
        </VBtn>
        <VBtn :to="localePath('/salario-vacacional-uruguay')" variant="tonal" size="small">
          Salario vacacional
        </VBtn>
      </div>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <span class="font-weight-medium">{{ f.question }}</span>
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ f.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-body-2 text-medium-emphasis mb-3">
        Las normas se contrastaron contra su texto en IMPO y contra el MTSS el {{ verifiedAt }}. Acá
        no figura el calendario de 1919 completo: la Ley 6.997 declaró dieciocho fechas y varias
        dejaron de observarse hace décadas, así que sólo entran las que una norma posterior y
        vigente vuelve a nombrar. La fecha de Carnaval y de Semana de Turismo no la publica ninguna
        de esas normas: sale de la Pascua, y la Pascua de 2027 es el 28 de marzo.
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
import { FERIADOS_SOURCES, FERIADOS_VERIFIED_AT } from '~/utils/feriados'
import {
  calendarioDe,
  diaDeLaSemana,
  finesDeSemanaLargosDe,
  resumenDe,
  type FeriadoDelAnio,
  type TramoLibre,
} from '~/utils/feriadosAnuales'

const ANIO = 2027

const localePath = useLocalePath()

// Todo se resuelve una vez, en tiempo de módulo: el calendario de un año es una constante, no un
// dato vivo, así que no hay nada que recalcular por pedido ni nada que pueda discrepar entre el
// servidor y el cliente.
const calendario = calendarioDe(ANIO)
const tramos = finesDeSemanaLargosDe(ANIO)
const resumen = resumenDe(ANIO)

// El porqué de la fila, derivado del corrimiento y no escrito a mano: los dos feriados que 2027
// corre caen martes, pero el motivo tiene tres formas y un literal sería falso el año en que una de
// las otras dos aparezca.
function explicacion(fila: FeriadoDelAnio): string {
  switch (fila.corrimiento) {
    case 'lunes-anterior':
      return 'cae martes o miércoles, así que pasa al lunes inmediato anterior.'
    case 'lunes-siguiente':
      return 'cae jueves o viernes, así que pasa al lunes inmediato siguiente.'
    default:
      return 'se observa en su propia fecha.'
  }
}

const esFinDeSemana = (iso: string) => {
  const d = diaDeLaSemana(iso)
  return d === 0 || d === 6
}
const enFinDeSemana = calendario.filter(f => esFinDeSemana(f.observado))

const LARGO = new Intl.DateTimeFormat('es-UY', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const CORTO = new Intl.DateTimeFormat('es-UY', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const MES = new Intl.DateTimeFormat('es-UY', { month: 'long', timeZone: 'UTC' })

const formatoLargo = (iso: string) => LARGO.format(new Date(`${iso}T00:00:00Z`))
const mesDe = (iso: string) => MES.format(new Date(`${iso}T00:00:00Z`))
const rango = (desde: string, hasta: string) =>
  `${CORTO.format(new Date(`${desde}T00:00:00Z`))} → ${CORTO.format(new Date(`${hasta}T00:00:00Z`))}`
const motivo = (tramo: TramoLibre) => `Lo arma ${tramo.feriados.join(' y ')}.`

const FAQ = [
  {
    question: '¿Cuántos feriados hay en Uruguay en 2027?',
    answer:
      'Quince días. Son las diez entradas del artículo 2 de la Ley 16.805 —dos de ellas, Carnaval y Semana de Turismo, de dos días cada una— más los tres feriados de la Ley 6.997 que ese artículo no exceptúa: el 19 de abril, el 18 de mayo y el 12 de octubre. Cinco de los quince son feriados pagos.',
  },
  {
    question: '¿Cuándo es Carnaval en 2027?',
    answer:
      'El lunes 8 y el martes 9 de febrero. La ley no fija una fecha: nombra el lunes y el martes de Carnaval, que son los dos días anteriores al miércoles de Ceniza. En 2027 la Pascua cae el 28 de marzo, así que el miércoles de Ceniza es el 10 de febrero.',
  },
  {
    question: '¿Cuándo es la Semana de Turismo de 2027?',
    answer:
      'Los feriados son el jueves 25 y el viernes 26 de marzo, que son el Jueves y el Viernes Santo de la Pascua del 28 de marzo de 2027. La semana entera no es feriado: la ley declara feriado esos dos días.',
  },
  {
    question: '¿Qué feriados se corren al lunes en 2027?',
    answer:
      'Dos de los tres móviles. El 18 de mayo cae martes y pasa al lunes 17; el 12 de octubre también cae martes y pasa al lunes 11. El 19 de abril ya cae lunes, así que se observa en su propia fecha. La regla es el artículo 1 de la Ley 16.805: martes y miércoles pasan al lunes anterior, jueves y viernes al lunes siguiente.',
  },
  {
    question: '¿Cuántos fines de semana largos tiene 2027?',
    answer:
      'Seis tramos de tres días o más: el Año Nuevo (cae viernes), Carnaval y Semana de Turismo con cuatro días cada uno, el 19 de abril, el 17 de mayo y el 11 de octubre. Supone semana de lunes a viernes; ninguna norma obliga a cerrar en feriado.',
  },
  {
    question: '¿Qué pasa con los feriados que caen sábado o domingo?',
    answer:
      'Se pierden. En 2027 son cuatro: el 1.º de mayo y el 19 de junio caen sábado, el 18 de julio domingo y el 25 de diciembre sábado. El artículo 2 de la Ley 16.805 dice que esas fechas se observan «en el día de la semana que ocurriere, cualquiera que este fuera», así que no se corren a ningún lado.',
  },
] as const

const verifiedAt = new Date(`${FERIADOS_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/feriados-2027-uruguay'
const title = 'Feriados 2027: 6 fines de semana largos'
const description =
  'Los 15 días de feriado de 2027 en Uruguay: Carnaval el 8 y 9 de febrero, Turismo el 25 y 26 de marzo, 6 fines de semana largos y 4 que se pierden.'

defineOgImageComponent('Cambio', {
  title: 'Feriados 2027 en Uruguay',
  subtitle: '15 días de feriado y 6 fines de semana largos',
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
        'feriados 2027, feriados 2027 uruguay, calendario de feriados 2027, fines de semana largos 2027, carnaval 2027 uruguay, semana de turismo 2027, 19 de abril 2027, 18 de mayo 2027, 12 de octubre 2027, feriados pagos 2027',
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
                name: 'Feriados que se corren al lunes en Uruguay',
                item: 'https://cambio-uruguay.com/feriados-que-se-corren-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Feriados 2027 en Uruguay',
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
            headline: 'Feriados 2027 en Uruguay: las 15 fechas y los 6 fines de semana largos',
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
.pay-card,
.tramo-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
}

.callout-text,
.section-intro {
  line-height: 1.7;
  margin-top: 0;
}

.feriados-table {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
}

.perdidos-list {
  margin-top: 0;
  padding-left: 1.25rem;
}

.perdidos-list li {
  line-height: 1.7;
  margin-top: 0.35rem;
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
