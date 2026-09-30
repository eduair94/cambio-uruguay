<template>
  <VContainer class="solidarity-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">EGRESADOS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Fondo de Solidaridad: cuánto se paga en 2026 y desde cuándo
      </h1>
      <p class="lead mb-6">
        El aporte está fijado en <strong>BPC</strong>, no en pesos, así que el monto cambia solo
        cada 1° de enero. Con la BPC de {{ year }} en <strong>$ {{ money(bpc) }}</strong
        >, la carrera de 4 años o más aporta <strong>$ {{ money(oneBpc) }}</strong> al año entre el
        quinto y el noveno año del egreso y <strong>$ {{ money(twoBpc) }}</strong> desde el décimo.
        Y no lo paga todo el mundo: hay un piso de ingresos de
        <strong>$ {{ money(threshold) }}</strong> por mes.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <p class="warn-title mb-2">La escala que devuelven los buscadores está derogada</p>
            <p class="mb-0">
              Muchos resúmenes todavía citan el aporte en
              <em>salarios mínimos nacionales</em> —cinco tercios, uno y medio— con un piso de 4
              salarios mínimos. Ése es el texto <strong>original</strong> de la Ley 16.524 y el de
              la Ley 17.451. El <strong>art. 271 de la Ley 19.535</strong> (2017) le dio nueva
              redacción al art. 3 de la Ley 16.524, y desde entonces la escala está en BPC y el piso
              es de 8 BPC. Es la diferencia entre un número correcto y uno equivocado por un factor
              grande.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Quién aporta -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Quién aporta</h2>
      <p class="section-intro mb-5">
        Las tres condiciones del art. 3 son acumulativas: hay que cumplir las tres.
      </p>
      <VRow>
        <VCol v-for="item in whoPays" :key="item.title" cols="12" md="4">
          <VCard class="fact-card pa-5 h-100" variant="flat">
            <VIcon :icon="item.icon" color="primary" class="mb-3" />
            <p class="fact-title mb-2">{{ item.title }}</p>
            <p class="mb-0">{{ item.body }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- La escala -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">La escala, fila por fila</h2>
      <p class="section-intro mb-5">
        Las cuatro filas que distingue la norma. El aporte es <strong>anual</strong>, no mensual, y
        la columna en pesos es la escala multiplicada por la BPC de {{ year }}.
      </p>
      <VTable class="cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th class="text-left">Carrera</th>
            <th class="text-left">Años desde el egreso</th>
            <th class="text-right">Aporte</th>
            <th class="text-right">En pesos ({{ year }})</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in SOLIDARITY_BRACKETS" :key="row.id">
            <td data-label="Carrera">{{ row.career }}</td>
            <td data-label="Años desde el egreso">{{ row.window }}</td>
            <td data-label="Aporte" class="text-right">
              <code>{{ row.bpc }} BPC</code>
            </td>
            <td data-label="En pesos" class="text-right font-weight-bold">
              $ {{ money(solidarityBpcToUyu(row.bpc, bpc)) }}
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="table-note mt-4 mb-0">
        La BPC de {{ year }} es de $ {{ money(bpc) }} desde el 1° de enero. Podés verla, y su
        historia, en
        <NuxtLink :to="localePath('/indicadores/bpc')">el indicador de la BPC</NuxtLink>.
      </p>
    </section>

    <!-- Calculadora -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Y en tu caso?</h2>
      <p class="section-intro mb-5">
        Poné cuánto duraba tu carrera y cuántos años pasaron desde que egresaste. La cuenta es la
        escala de arriba; el piso de ingresos se pregunta aparte porque depende de tu sueldo y no de
        tu carrera.
      </p>
      <VCard class="calc-card pa-5 pa-md-6" variant="flat">
        <VRow class="mb-2">
          <VCol cols="12" sm="6">
            <VSelect
              v-model="careerYears"
              :items="careerOptions"
              item-title="label"
              item-value="value"
              label="Duración de la carrera"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField
              v-model.number="yearsSince"
              type="number"
              min="0"
              max="60"
              label="Años desde el egreso"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
        </VRow>

        <VAlert v-if="verdict.status === 'aporta'" type="info" variant="tonal" class="mt-4">
          <p class="verdict mb-1">
            Te corresponde aportar <strong>$ {{ money(verdict.uyu) }}</strong> al año ({{
              verdict.bpc
            }}
            BPC), si tus ingresos superan los $ {{ money(threshold) }} por mes.
          </p>
          <p class="verdict-note mb-0">{{ verdict.bracket }}.</p>
        </VAlert>
        <VAlert
          v-else-if="verdict.status === 'todavia-no'"
          type="success"
          variant="tonal"
          class="mt-4"
        >
          <p class="verdict mb-0">
            Todavía no se aporta: la obligación nace al cumplirse el
            <strong>quinto año</strong> del egreso, aunque ya estés trabajando en la profesión.
          </p>
        </VAlert>
        <VAlert v-else type="success" variant="tonal" class="mt-4">
          <p class="verdict mb-1">
            Con esa antigüedad ya se habrían cumplido los
            <strong>25 años de aportación</strong> que fija el literal B, contados desde el quinto
            año del egreso.
          </p>
          <p class="verdict-note mb-0">
            La cuenta supone que empezaste a aportar cuando la ley lo exige. Si empezaste más tarde,
            tu tope corre desde ahí y esto no lo puede saber.
          </p>
        </VAlert>
      </VCard>
    </section>

    <!-- Hasta cuándo -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Hasta cuándo se aporta</h2>
      <p class="section-intro mb-5">
        Se deja de aportar cuando ocurre <strong>lo primero</strong> de estas cuatro cosas. Son los
        literales A a D del art. 3.
      </p>
      <ul class="plain-list">
        <li v-for="cause in SOLIDARITY_END_CAUSES" :key="cause">{{ cause }}</li>
      </ul>
    </section>

    <!-- El adicional -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El adicional: por qué acá no hay una cifra</h2>
      <VCard class="note-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-scale-balance" color="info" class="mr-3 mt-1" />
          <div>
            <p class="note-title mb-2">Está bajando, y el monto del año lo fija otra norma</p>
            <p class="mb-3">
              Además del aporte de la escala, quienes egresaron de carreras de cinco años o más
              pagaron durante años una <strong>contribución adicional</strong>, creada por el art.
              542 de la Ley 17.296. Viene en baja: el <strong>art. 493 de la Ley 20.075</strong>
              la redujo un 25 % desde 2024 y un 25 % adicional desde 2025, y ese mismo artículo dejó
              <em>la reducción del 50 % restante</em> a la Ley de Presupuesto Nacional 2025-2029,
              «para los ejercicios 2026 y 2027».
            </p>
            <p class="mb-0">
              Por eso esta página <strong>no publica un monto del adicional</strong>: cuánto queda
              vigente este año depende de esa norma posterior, y publicar el número equivocado sería
              justo el dato por el que alguien entra. El importe que rige lo liquida el propio Fondo
              de Solidaridad, y es donde hay que confirmarlo. Lo que sí está verificado y arriba es
              el aporte de la escala, que es el que paga la enorme mayoría.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Dónde entra en tu bolsillo -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Dónde aparece en tu bolsillo</h2>
      <p class="section-intro mb-5">
        El aporte es una deducción admitida del IRPF, así que no se paga «encima» del impuesto: baja
        la base.
      </p>
      <ul class="plain-list">
        <li>
          <NuxtLink :to="localePath('/herramientas/calculadora-sueldo-liquido')"
            >La calculadora de sueldo líquido</NuxtLink
          >
          tiene un campo para otras deducciones anuales: ahí va este aporte.
        </li>
        <li>
          <NuxtLink :to="localePath('/declaracion-de-irpf-uruguay')"
            >La declaración de IRPF</NuxtLink
          >
          es donde se computa la deducción si te toca declarar.
        </li>
        <li>
          <NuxtLink :to="localePath('/indicadores/bpc')">El valor de la BPC</NuxtLink> es lo único
          que hace mover este monto de un año al otro.
        </li>
      </ul>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels class="faq-panels" variant="accordion">
        <VExpansionPanel v-for="item in SOLIDARITY_FAQ" :key="item.question">
          <VExpansionPanelTitle>{{ item.question }}</VExpansionPanelTitle>
          <VExpansionPanelText>{{ item.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="section-intro mb-3">
        Verificadas el {{ verifiedAt }} contra el texto vigente, no contra un resumen.
      </p>
      <ul class="sources">
        <li v-for="source in SOLIDARITY_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  SOLIDARITY_BPC_UYU,
  SOLIDARITY_BRACKETS,
  SOLIDARITY_END_CAUSES,
  SOLIDARITY_FAQ,
  SOLIDARITY_INCOME_THRESHOLD_BPC,
  SOLIDARITY_SOURCES,
  SOLIDARITY_VERIFIED_AT,
  solidarityBpcToUyu,
  solidarityContribution,
  solidarityIncomeThresholdUyu,
  solidaritySeoDescription,
} from '~/utils/solidarityFund'

const localePath = useLocalePath()
const canonicalUrl = 'https://cambio-uruguay.com/fondo-de-solidaridad-uruguay'

const money = (value: number) => value.toLocaleString('es-UY', { maximumFractionDigits: 0 })

const bpc = SOLIDARITY_BPC_UYU
const year = 2026
const oneBpc = solidarityBpcToUyu(1, bpc)
const twoBpc = solidarityBpcToUyu(2, bpc)
const threshold = solidarityIncomeThresholdUyu(bpc)
const verifiedAt = new Date(`${SOLIDARITY_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const whoPays = [
  {
    icon: 'mdi-school-outline',
    title: 'Egresados de UdelaR, UTU terciaria y UTEC',
    body: 'El art. 3 alcanza a los egresados de la Universidad de la República, del nivel terciario del Consejo de Educación Técnico-Profesional y de la Universidad Tecnológica.',
  },
  {
    icon: 'mdi-calendar-clock',
    title: 'Desde el quinto año del egreso',
    body: 'Antes del quinto año no se aporta, aunque ya se esté ejerciendo. El año del egreso es el que cuenta, no el de la matrícula.',
  },
  {
    icon: 'mdi-cash-multiple',
    title: `Con ingresos de más de ${String(SOLIDARITY_INCOME_THRESHOLD_BPC)} BPC por mes`,
    body: `Hoy son $ ${money(threshold)} mensuales. Por debajo de ese piso no nace la obligación, pero la norma remite a la reglamentación para justificar ese nivel de ingresos: hay que declararlo, no basta con no pagar.`,
  },
]

const careerOptions = [
  { value: 3, label: 'Menos de 4 años' },
  { value: 4, label: '4 años o más' },
]
const careerYears = ref(4)
const yearsSince = ref(7)

const verdict = computed(() =>
  solidarityContribution(careerYears.value, Number(yearsSince.value), bpc)
)

const title = 'Fondo de Solidaridad 2026: cuánto se paga'
// La descripción se arma desde la escala y la BPC (`solidaritySeoDescription`) y no se escribe a
// mano: los tres montos que la hacen concreta cambian cada 1° de enero, y un literal quedaría
// desactualizado sin que nada falle. Su largo está medido contra los 155 caracteres del SERP.
const description = solidaritySeoDescription(bpc)

defineOgImageComponent('Cambio', {
  title: 'Fondo de Solidaridad',
  subtitle: 'Cuánto aporta cada egresado, y desde cuándo',
  tag: 'EGRESADOS',
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
        'fondo de solidaridad, fondo de solidaridad uruguay, cuanto se paga fondo de solidaridad, fondo de solidaridad 2026, aporte fondo de solidaridad bpc, quienes pagan fondo de solidaridad, fondo de solidaridad udelar, adicional fondo de solidaridad, exoneracion fondo de solidaridad, hasta cuando se paga el fondo de solidaridad, ley 16524 articulo 3, fondo de solidaridad utec utu',
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
                name: 'Fondo de Solidaridad',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: SOLIDARITY_FAQ.map(item => ({
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

.note-card {
  border: 1px solid rgba(var(--v-theme-info), 0.35);
  background: rgba(var(--v-theme-info), 0.06);
}

.warn-card {
  border: 1px solid rgba(var(--v-theme-warning), 0.35);
  background: rgba(var(--v-theme-warning), 0.06);
}

.note-title,
.warn-title,
.fact-title {
  font-weight: 700;
  margin-top: 0;
}

.fact-card,
.calc-card {
  border: 1px solid rgba(var(--v-border-color), 0.16);
}

.table-note {
  max-width: 72ch;
  font-size: 0.9rem;
  opacity: 0.8;
}

.verdict {
  margin-top: 0;
}

.verdict-note {
  margin-top: 0.4rem;
  font-size: 0.9rem;
  opacity: 0.85;
}

.plain-list,
.sources {
  margin-top: 0;
  padding-left: 1.25rem;
}

.plain-list li,
.sources li {
  margin-top: 0.4rem;
}

.faq-panels {
  max-width: 80ch;
}
</style>
