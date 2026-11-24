<template>
  <VContainer class="employer-page py-8 py-md-12">
    <nav aria-label="Ruta de navegación" class="text-caption mb-4">
      <NuxtLink :to="localePath('/')" class="text-decoration-none">Cambio Uruguay</NuxtLink>
      <span class="mx-1 text-grey">›</span>
      <NuxtLink :to="localePath('/temas/emprender-y-empresa-uruguay')" class="text-decoration-none">
        Emprender y tener una empresa
      </NuxtLink>
      <span class="mx-1 text-grey">›</span>
      <span class="text-grey">Cuánto cuesta un empleado</span>
    </nav>

    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">EMPLEADOR</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Cuánto le cuesta a una empresa un empleado en Uruguay?
      </h1>
      <p class="lead">
        Sobre el sueldo nominal, el empleador de un trabajador dependiente de la actividad privada
        paga <strong>{{ EMPLOYER_CESS_TOTAL_DISPLAY }}</strong> de aportes patronales: cuatro
        contribuciones especiales de seguridad social, cada una con su norma. Y el año no son doce
        sueldos: con el aguinaldo y sus aportes son
        <strong>{{ formatNumber(year.nominalesEquivalentes, 2) }} nominales</strong>.
      </p>
      <p class="lead mb-0">
        Esta página mira la cuenta del que paga. La
        <NuxtLink :to="localePath('/herramientas/calculadora-sueldo-liquido')">
          calculadora de sueldo líquido
        </NuxtLink>
        hace la del que cobra: del nominal al líquido, con los aportes personales y el IRPF.
      </p>
    </header>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Las cuatro tasas, con su norma</h2>
      <p class="mb-4">
        Se calculan sobre las partidas que constituyen materia gravada por contribuciones especiales
        de seguridad social, no sólo sobre el sueldo base: las horas extra, la nocturnidad, el
        presentismo y la antigüedad también entran.
      </p>
      <VTable class="cu-mobile-cards rates-table">
        <thead>
          <tr>
            <th>Concepto</th>
            <th class="text-right">Tasa patronal</th>
            <th>Desde</th>
            <th>Qué financia</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rate in EMPLOYER_CESS" :key="rate.id">
            <td data-label="Concepto">{{ rate.label }}</td>
            <td data-label="Tasa patronal" class="text-right font-weight-bold">
              {{ rate.display }}
            </td>
            <td data-label="Desde">{{ rate.from || '—' }}</td>
            <td data-label="Qué financia">{{ rate.what }}</td>
          </tr>
          <tr class="total-row">
            <td data-label="Concepto" class="font-weight-bold">Total sobre el nominal</td>
            <td data-label="Tasa patronal" class="text-right font-weight-bold">
              {{ EMPLOYER_CESS_TOTAL_DISPLAY }}
            </td>
            <td data-label="Desde">—</td>
            <td data-label="Qué financia">
              La suma de las cuatro es nuestra; cada tasa es la que publica su fuente.
            </td>
          </tr>
        </tbody>
      </VTable>

      <VCard class="note-card pa-5 pa-md-6 mt-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-gift-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <p class="note-title mb-2">
              El aguinaldo lleva {{ EMPLOYER_CESS_AGUINALDO_DISPLAY }}, no
              {{ EMPLOYER_CESS_TOTAL_DISPLAY }}
            </p>
            <p class="mb-0">
              Es la única asimetría de la cuenta, y conviene saberla antes de presupuestar
              diciembre: el aguinaldo está excluido de la base del aporte <em>patronal</em> a FONASA
              (Decreto 2/008, artículo 4), así que sobre esa partida el empleador paga el
              jubilatorio, el FRL y el fondo de garantía, y no el 5 % de FONASA. Del lado del
              trabajador no es igual: su aporte personal a FONASA sí grava el aguinaldo.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Qué sale el mes y qué sale el año</h2>
      <p class="mb-4">
        Tres nominales redondos, elegidos para que la cuenta se pueda seguir a mano. No dicen cuánto
        se paga en ningún rubro: son la aritmética de las cuatro tasas aplicada a un número.
      </p>
      <VTable class="cu-mobile-cards rates-table">
        <thead>
          <tr>
            <th>Nominal del mes</th>
            <th class="text-right">Aportes patronales</th>
            <th class="text-right">Costo del mes</th>
            <th class="text-right">Costo del año</th>
            <th class="text-right">Nominales</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="example in examples" :key="example.nominal">
            <td data-label="Nominal del mes">{{ money(example.nominal) }}</td>
            <td data-label="Aportes patronales" class="text-right">{{ money(example.cess) }}</td>
            <td data-label="Costo del mes" class="text-right font-weight-bold">
              {{ money(example.total) }}
            </td>
            <td data-label="Costo del año" class="text-right">{{ money(example.annual) }}</td>
            <td data-label="Nominales" class="text-right">
              {{ formatNumber(example.nominales, 2) }}
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-body-2 text-medium-emphasis mt-3 mb-0">
        El costo del año son doce meses con sus aportes, más un aguinaldo con los suyos. Con un
        sueldo que no se mueve el aguinaldo equivale a un nominal, porque es la doceava parte de lo
        cobrado en el año:
        <NuxtLink :to="localePath('/guias/como-se-calcula-el-aguinaldo-uruguay')">
          la guía del aguinaldo
        </NuxtLink>
        desarrolla cómo se arma. Es un supuesto, no un dato: si el sueldo cambió en el año, el
        aguinaldo es otro.
      </p>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Lo que este total NO incluye</h2>
      <p class="mb-4">
        El total de arriba es <strong>parcial</strong>, y decirlo acá es parte de la cuenta: un
        total baja por faltarle cosas, así que cada faltante va con el motivo por el que no lleva
        número. Ninguno de estos cinco se puede escribir como un porcentaje del nominal sin
        inventarlo.
      </p>
      <VRow>
        <VCol v-for="item in EMPLOYER_NOT_INCLUDED" :key="item.label" cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <p class="text-subtitle-2 font-weight-bold mb-2">{{ item.label }}</p>
            <p class="text-body-2 mb-0">{{ item.why }}</p>
            <p v-if="item.to" class="text-body-2 mt-2 mb-0">
              <NuxtLink :to="localePath(item.to)">Ver cómo se calcula</NuxtLink>
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Los límites de esta cuenta</h2>
      <ul class="limits">
        <li>
          <strong>No modela el tope de cotización.</strong> El sitio tiene verificado el tope que se
          aplica al aporte <em>personal</em> jubilatorio ({{ money(PAYROLL_UY.jubilatorioTope) }}, y
          lo usa la calculadora de sueldo líquido), pero la página del BPS que publica los topes no
          dice si alcanza también al aporte patronal. Por eso los tres ejemplos quedan muy por
          debajo y no afirmamos nada arriba de ese monto: con un sueldo alto, confirmalo con el BPS.
        </li>
        <li>
          <strong>Es el régimen de Industria y Comercio.</strong> La tasa patronal jubilatoria del
          7,5 % que publica el BPS es la de Industria y Comercio, Trabajo Doméstico y Civil, y en la
          aportación Civil tiene particularidades según cada organismo. La construcción y el rural
          tienen su propio régimen, que esta página no cubre.
        </li>
        <li>
          <strong>No es asesoramiento.</strong> Son las tasas publicadas y una multiplicación. La
          liquidación de una planilla real tiene partidas, laudos y convenios que acá no están.
        </li>
      </ul>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" class="mb-8" />

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Seguí por acá</h2>
      <VRow>
        <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6" md="4">
          <VCard variant="outlined" class="pa-4 h-100" :to="localePath(link.to)">
            <p class="text-subtitle-2 font-weight-bold mb-1">{{ link.title }}</p>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ link.body }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <section class="mb-4">
      <h2 class="text-h6 font-weight-bold mb-2">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Cada tasa de esta página se contrastó con su fuente primaria el {{ verifiedAt }}. Los
        enlaces van al texto del BPS o a la norma en IMPO, no a un resumen nuestro.
      </p>
      <ul class="sources">
        <li v-for="source in EMPLOYER_COST_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer nofollow">
            {{ source.label }}
          </a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FaqItem } from '~/utils/faqAnswers'
import { formatNumber, formatUYU } from '~/utils/format'
import { PAYROLL_UY } from '~/utils/payroll'
import {
  EMPLOYER_CESS,
  EMPLOYER_CESS_AGUINALDO_DISPLAY,
  EMPLOYER_CESS_TOTAL_DISPLAY,
  EMPLOYER_COST_EXAMPLES,
  EMPLOYER_COST_SOURCES,
  EMPLOYER_COST_VERIFIED_AT,
  EMPLOYER_NOT_INCLUDED,
  employerAnnualCost,
  employerMonthlyCost,
} from '~/utils/employerCost'

const localePath = useLocalePath()

const URL = 'https://cambio-uruguay.com/cuanto-cuesta-un-empleado-uruguay'

const money = (value: number) => formatUYU(value, 0)

const year = employerAnnualCost(EMPLOYER_COST_EXAMPLES[0]!)

const examples = EMPLOYER_COST_EXAMPLES.map(nominal => {
  const month = employerMonthlyCost(nominal)
  const annual = employerAnnualCost(nominal)
  return {
    nominal: month.nominal,
    cess: month.cess,
    total: month.total,
    annual: annual.total,
    nominales: annual.nominalesEquivalentes,
  }
})

const verifiedAt = computed(() => {
  const [y, m, d] = EMPLOYER_COST_VERIFIED_AT.split('-')
  return `${Number(d)}/${Number(m)}/${y}`
})

const relatedLinks = [
  {
    to: '/herramientas/calculadora-sueldo-liquido',
    title: 'Calculadora de sueldo líquido',
    body: 'La otra mitad de la cuenta: del nominal al líquido, con aportes personales e IRPF.',
  },
  {
    to: '/que-empresa-abrir-uruguay',
    title: 'Qué empresa abrir',
    body: 'Monotributo, unipersonal o SAS: qué figura te toca según cuánto facturás.',
  },
  {
    to: '/contractor-en-uruguay',
    title: 'Contractor desde Uruguay',
    body: 'Qué se pierde al no estar en planilla y sobre qué base construís la jubilación.',
  },
  {
    to: '/indemnizacion-por-despido-uruguay',
    title: 'Indemnización por despido',
    body: 'La contingencia que no es un costo del mes: cuánto es y con qué tope.',
  },
  {
    to: '/salario-vacacional-uruguay',
    title: 'Salario vacacional',
    body: 'Cuántos días de licencia se generan y cuánto es la suma para su mejor goce.',
  },
  {
    to: '/horas-extras-uruguay',
    title: 'Horas extra',
    body: 'El recargo del 100 % y del 150 %, que también es materia gravada.',
  },
]

const faq: FaqItem[] = [
  {
    question: '¿Cuánto paga el empleador además del sueldo?',
    answer: `${EMPLOYER_CESS_TOTAL_DISPLAY} del nominal en aportes patronales: 7,5 % de aporte jubilatorio, 5 % de FONASA, 0,10 % del Fondo de Reconversión Laboral y 0,025 % del Fondo de Garantía de Créditos Laborales. A eso hay que sumarle la prima del seguro de accidentes de trabajo, que es obligatoria y no es un porcentaje del sueldo.`,
  },
  {
    question: '¿El aguinaldo también lleva aportes patronales?',
    answer: `Sí, pero no los mismos: el aguinaldo está excluido de la base del aporte patronal a FONASA (Decreto 2/008, artículo 4), así que el empleador paga sobre él ${EMPLOYER_CESS_AGUINALDO_DISPLAY} en lugar de ${EMPLOYER_CESS_TOTAL_DISPLAY}. El aporte personal del trabajador a FONASA sí grava el aguinaldo.`,
  },
  {
    question: '¿Un año cuesta doce sueldos?',
    answer: `No. Con un sueldo parejo son doce meses con sus aportes más un aguinaldo con los suyos, o sea ${formatNumber(year.nominalesEquivalentes, 2)} nominales, y eso todavía no incluye el salario vacacional ni la prima del seguro. El salario vacacional no se puede expresar como un porcentaje del nominal porque la ley lo fija sobre el jornal líquido de vacaciones, que depende de los aportes y del IRPF de esa persona.`,
  },
  {
    question: '¿Por qué no publican la prima del seguro de accidentes de trabajo?',
    answer:
      'Porque no encontramos una tasa única publicada. El seguro es obligatorio (Ley 16.074, artículo 1) y todo patrono responde civilmente por los accidentes y enfermedades profesionales de sus trabajadores (artículo 2), pero la prima la cotiza el Banco de Seguros del Estado y no es el mismo porcentaje para toda actividad. Poner un número promedio sería inventarlo.',
  },
  {
    question: '¿Estas tasas valen para el servicio doméstico o la construcción?',
    answer:
      'La tasa jubilatoria patronal del 7,5 % que publica el BPS es la de Industria y Comercio, Trabajo Doméstico y Civil, y en la aportación Civil tiene particularidades según cada organismo. La construcción y el trabajo rural tienen su propio régimen de aportación, que esta página no cubre: para esos casos, la fuente es el BPS.',
  },
  {
    question: '¿Hay un tope a partir del cual el empleador deja de aportar?',
    answer: `El sitio tiene verificado el tope de cotización que se aplica al aporte personal jubilatorio, ${formatUYU(PAYROLL_UY.jubilatorioTope, 0)}, y lo usa la calculadora de sueldo líquido. La página del BPS que publica los topes no dice si ese tope alcanza también al aporte patronal, así que acá no lo afirmamos ni lo descartamos: los ejemplos quedan por debajo y, con un sueldo alto, el número hay que confirmarlo con el BPS.`,
  },
]

const title = 'Cuánto cuesta un empleado en Uruguay'
const description =
  'El empleador suma 12,625 % al nominal: 7,5 % jubilatorio, 5 % FONASA, 0,10 % FRL y 0,025 % de garantía. Con el aguinaldo, el año son 14,59 nominales.'

defineOgImageComponent('Cambio', {
  title: 'Cuánto cuesta un empleado',
  subtitle: `${EMPLOYER_CESS_TOTAL_DISPLAY} de aportes patronales sobre el nominal`,
  tag: 'EMPLEADOR',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: URL,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: URL }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          // El rastro que el renglón verde del resultado imprime en vez de la URL cruda. El eslabón
          // del medio es el mismo que la página le muestra arriba del título: el tema al que
          // pertenece, y al que la página entra en `utils/guideHubs.ts`.
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
                name: 'Emprender y tener una empresa en Uruguay',
                item: 'https://cambio-uruguay.com/temas/emprender-y-empresa-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Cuánto cuesta un empleado',
                item: URL,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            url: URL,
            inLanguage: 'es-UY',
            dateModified: EMPLOYER_COST_VERIFIED_AT,
            author: { '@type': 'Organization', name: 'Cambio Uruguay' },
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
  font-size: 1.1rem;
  line-height: 1.7;
  max-width: 72ch;
  margin-top: 0;
}

.lead + .lead {
  margin-top: 1rem;
}

.rates-table :deep(td),
.rates-table :deep(th) {
  vertical-align: top;
}

.total-row td {
  border-top: 2px solid rgba(var(--v-border-color), 0.4);
}

.note-card {
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  background: rgba(var(--v-theme-primary), 0.06);
}

.note-title {
  font-weight: 700;
  margin-top: 0;
}

.limits {
  max-width: 76ch;
  padding-left: 1.25rem;
}

.limits li {
  margin-top: 0.75rem;
  line-height: 1.65;
}

.sources {
  padding-left: 1.25rem;
  max-width: 76ch;
}

.sources li {
  margin-top: 0.5rem;
  line-height: 1.6;
  font-size: 0.9rem;
}
</style>
