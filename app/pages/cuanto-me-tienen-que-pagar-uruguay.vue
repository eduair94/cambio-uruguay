<template>
  <VContainer class="wage-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SUELDO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Cuánto me tienen que pagar como mínimo?
      </h1>
      <p class="lead mb-6">
        «¿Cuánto se gana?» no tiene respuesta oficial: los números de los hilos de salarios son
        autorreportes, útiles como referencia pero sin valor legal. La que sí tiene respuesta es
        <strong>cuánto te tienen que pagar como mínimo</strong>, y no es el Salario Mínimo Nacional.
      </p>

      <VCard class="myth-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-2">La confusión que sale cara</div>
        <p class="mb-0">{{ WAGE_SMN_IS_NOT_YOUR_MINIMUM }}</p>
      </VCard>
    </header>

    <!-- Layers -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Tu mínimo sale de tres capas</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Sin entender esto es imposible encontrar el laudo propio, y es donde casi todos se equivocan
        de entrada.
      </p>
      <VRow>
        <VCol v-for="l in WAGE_LAYERS" :key="l.n" cols="12" md="4">
          <VCard variant="flat" class="layer-card pa-5 h-100">
            <div class="layer-n">{{ l.n }}</div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ l.label }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ l.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Steps -->
    <section id="como-lo-busco" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cómo encontrar el tuyo</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        No publicamos tablas de laudos a propósito: son decenas de grupos por subgrupos por
        categorías y cambian en cada ronda. Una tabla acá sería dato viejo garantizado. Esto en
        cambio no caduca.
      </p>
      <VRow>
        <VCol v-for="s in WAGE_LOOKUP_STEPS" :key="s.n" cols="12" md="6">
          <VCard variant="flat" class="step-card pa-5 h-100 d-flex flex-column">
            <div class="step-n">{{ s.n }}</div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ s.title }}</h3>
            <p class="mb-3 text-medium-emphasis flex-grow-1">{{ s.detail }}</p>
            <VBtn
              v-if="s.url"
              :href="s.url"
              target="_blank"
              rel="noopener noreferrer"
              variant="tonal"
              size="small"
              class="align-self-start"
            >
              Abrir en el MTSS
            </VBtn>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Groups -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los grupos de industria y comercio</h2>
      <p class="text-medium-emphasis mb-4" style="max-width: 72ch">
        Los 20 que publica el MTSS bajo «Industria, Comercio y actividades en general». En el sitio
        del MTSS el listado va paginado de a 10, así que si buscás ahí y no encontrás tu rama,
        fijate en la segunda página antes de descartar: hoteles, transporte, salud, enseñanza y
        servicios profesionales están del 11 en adelante. No son todos los Consejos de Salarios del
        país: hay otros ámbitos —rural, doméstico, sector público— con su propia negociación.
      </p>
      <VCard variant="flat" class="results-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <tbody>
            <tr v-for="g in WAGE_INDUSTRY_GROUPS" :key="g.n">
              <td data-label="N.º" class="group-n">{{ g.n }}</td>
              <td data-label="Grupo">{{ g.name }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </section>

    <!-- Beyond -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El laudo te da más que un número</h2>
      <p class="text-medium-emphasis mb-4" style="max-width: 72ch">
        Es habitual que alguien cobre el mínimo correcto y no esté cobrando una prima que su
        convenio le da.
      </p>
      <VCard variant="flat" class="beyond-card pa-5">
        <ul class="mb-0 pl-4">
          <li v-for="(b, i) in WAGE_BEYOND_MINIMUM" :key="i" class="mb-2">{{ b }}</li>
        </ul>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in WAGE_FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <div>
              <div class="font-weight-medium">{{ f.question }}</div>
              <div class="text-caption text-medium-emphasis">{{ f.short }}</div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ f.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Related -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          :to="localePath('/guias/salario-minimo-uruguay-cuanto-es')"
          variant="tonal"
          size="small"
        >
          Cuánto es el Salario Mínimo Nacional
        </VBtn>
        <VBtn
          :to="localePath('/guias/entender-tu-recibo-de-sueldo-uruguay')"
          variant="tonal"
          size="small"
        >
          Entender tu recibo de sueldo
        </VBtn>
        <VBtn
          :to="localePath('/herramientas/calculadora-sueldo-liquido')"
          variant="tonal"
          size="small"
        >
          Calculadora de sueldo líquido
        </VBtn>
        <VBtn :to="localePath('/contractor-en-uruguay')" variant="tonal" size="small">
          Contractor o empleado
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Contrastado el {{ verifiedAt }}. Los laudos y sus importes los publica el MTSS y cambian en
        cada ronda: esta página explica cómo llegar al tuyo, no lo reemplaza.
      </p>
      <ul class="sources-list">
        <li v-for="s in WAGE_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  WAGE_BEYOND_MINIMUM,
  WAGE_INDUSTRY_GROUPS,
  WAGE_LOOKUP_STEPS,
  WAGE_SMN_IS_NOT_YOUR_MINIMUM,
  WAGE_FAQ,
  WAGE_LAYERS,
  WAGE_SOURCES,
  WAGE_VERIFIED_AT,
} from '~/utils/wageCouncils'

const localePath = useLocalePath()

const verifiedAt = new Date(WAGE_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/cuanto-me-tienen-que-pagar-uruguay'
const title = '¿Cuánto me tienen que pagar como mínimo en Uruguay?'
const description =
  'El Salario Mínimo Nacional no es tu mínimo: si tu actividad tiene Consejo de Salarios, el laudo de tu grupo, subgrupo y categoría fija uno más alto y es exigible. Cómo identificar tu grupo (lo define la actividad de la empresa, no tu tarea), cómo encontrar el acta vigente, qué más te da el laudo además del sueldo, y el servicio gratuito del MTSS para consultarlo.'

defineOgImageComponent('Cambio', {
  title: '¿Cuánto me tienen que pagar?',
  subtitle: 'Tu mínimo es el laudo, no el SMN',
  tag: 'SUELDO',
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
        'cuanto me tienen que pagar uruguay, consejo de salarios laudo, minimo por categoria, grupo y subgrupo consejo de salarios, mtss consulta salarial gratis, me pagan menos del laudo, salario minimo nacional no es mi minimo, mal categorizado trabajo',
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
                name: 'Cuánto me tienen que pagar',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: WAGE_FAQ.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.wage-page {
  max-width: 1180px;
}
.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  color: rgba(255, 255, 255, 0.82);
}
.v-theme--light .lead {
  color: rgba(0, 0, 0, 0.76);
}

.myth-card,
.layer-card,
.step-card,
.results-card,
.beyond-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .myth-card,
.v-theme--light .layer-card,
.v-theme--light .step-card,
.v-theme--light .results-card,
.v-theme--light .beyond-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.myth-card {
  border-color: rgba(var(--v-theme-warning), 0.5);
}

.layer-n,
.step-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}
.group-n {
  font-variant-numeric: tabular-nums;
  opacity: 0.6;
  width: 1%;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
