<template>
  <VContainer class="vacacional-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SUELDO Y APORTES</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Salario vacacional en Uruguay: cuándo se cobra y cuánto es
      </h1>
      <p class="lead mb-6">
        El salario vacacional —su nombre legal es
        <strong>suma para el mejor goce de la licencia</strong>— se paga
        <strong>antes de que empiece la licencia</strong> y en proporción a los días que te vas a
        tomar, y su mínimo es el <strong>100 % del jornal líquido de vacaciones</strong> (Ley
        16.101). La licencia son <strong>20 días</strong>, más un día a los cinco años de antigüedad
        y uno más cada cuatro (Ley 12.590). Y sí: la DGI lo grava por IRPF, aparte del resto del
        sueldo.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-calculator-variant-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Por qué te dio menos de lo que esperabas</div>
            <p class="callout-text mb-0">
              Porque el 100 % no se aplica sobre el sueldo nominal de esos días sino sobre el
              <strong>jornal líquido de vacaciones</strong>, que el Decreto 615/989 define como el
              jornal nominal menos los aportes a la seguridad social y el impuesto a las
              retribuciones. Es la confusión más común con esta partida: el salario vacacional
              <em>siempre</em> queda por debajo del sueldo nominal de la misma cantidad de días, y
              no por eso está mal liquidado.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Cuándo -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las tres fechas, y qué fija cada una</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La licencia y su salario vacacional tienen momentos distintos: primero se genera el derecho,
        después se cobra el jornal del período, y el salario vacacional acompaña a ese pago.
      </p>

      <div class="timeline">
        <div v-for="(h, i) in SALARIO_VACACIONAL_HITOS" :key="h.key" class="milestone">
          <div class="milestone__head">
            <span class="milestone__badge">{{ i + 1 }}</span>
            <div>
              <p class="milestone__label font-weight-bold mb-1">{{ h.label }}</p>
              <p class="milestone__when mb-0">{{ h.when }}</p>
            </div>
          </div>
          <p class="milestone__source text-caption text-medium-emphasis mb-2">
            <VIcon icon="mdi-scale-balance" size="14" class="mr-1" />{{ h.source }}
          </p>
          <p class="milestone__detail text-body-2 mb-0">{{ h.detail }}</p>
        </div>
      </div>
    </section>

    <!-- Cuántos días -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuántos días de licencia te tocan</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Veinte días es el piso para cualquier trabajador de la actividad privada. La antigüedad
        <strong>en la misma empresa</strong> suma días complementarios, y la Ley 12.590 aclara que
        el cambio de propietario de la empresa no corta esa antigüedad. No hay tope.
      </p>

      <VTable class="escala-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Antigüedad en la empresa</th>
            <th>Días de licencia</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in LICENCIA_ESCALONES" :key="e.desdeAnios">
            <td data-label="Antigüedad">
              <span class="font-weight-medium">
                {{ e.desdeAnios === 0 ? 'Menos de 5 años' : `Desde los ${e.desdeAnios} años` }}
              </span>
            </td>
            <td data-label="Días" class="text-no-wrap">
              <VChip color="primary" size="small" variant="tonal">{{ e.dias }} días</VChip>
            </td>
            <td data-label="Detalle" class="text-caption text-medium-emphasis">{{ e.detail }}</td>
          </tr>
        </tbody>
      </VTable>

      <VCard variant="flat" class="note-card pa-5 mt-6">
        <p class="note-text mb-0">
          <VIcon icon="mdi-information-outline" color="warning" size="18" class="mr-1" />
          El derecho a la licencia entera se genera al completar
          <strong>1 año, 24 quincenas o 52 semanas</strong> de labor. Quien todavía no llegó genera
          licencia <strong>proporcional</strong>, ajustada al año civil hasta el 31 de diciembre. Y
          si hay convenio colectivo aprobado, la licencia puede partirse en dos períodos continuos,
          con el tramo menor nunca por debajo de <strong>10 días</strong>.
        </p>
      </VCard>
    </section>

    <!-- Cuánto -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cómo sale el número</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Dos pasos, los dos escritos en la norma: primero se obtiene el jornal líquido de vacaciones,
        y después se multiplica por los días que se van a gozar.
      </p>

      <VCard variant="flat" class="formula-card pa-5 pa-md-6 mb-6">
        <div class="formula">
          <span class="term">jornal nominal de vacaciones</span>
          <span class="op">−</span>
          <span class="term">aportes a la seguridad social e impuesto a las retribuciones</span>
          <span class="op">=</span>
          <span class="term is-law">jornal líquido</span>
        </div>
        <div class="formula">
          <span class="term is-law">jornal líquido</span>
          <span class="op">×</span>
          <span class="term">días de licencia que gozás</span>
          <span class="op">=</span>
          <span class="term is-result">salario vacacional mínimo</span>
        </div>
        <p class="formula-note text-body-2 text-medium-emphasis mb-0">
          Es un <strong>mínimo</strong>: un convenio colectivo o tu contrato pueden mejorarlo, nunca
          reducirlo. Para ver de dónde salen los descuentos del jornal nominal, la
          <NuxtLink :to="localePath('/herramientas/calculadora-sueldo-liquido')"
            >calculadora de sueldo líquido</NuxtLink
          >
          desglosa aportes y IRPF sobre tu propio sueldo.
        </p>
      </VCard>

      <VCard variant="flat" class="note-card pa-5">
        <p class="note-text mb-0">
          <VIcon icon="mdi-scale-balance" color="warning" size="18" class="mr-1" />
          <strong>El IRPF, y por qué acá no hay un porcentaje.</strong> El Decreto 615/989 declaró
          en 1989 la suma «libre de todo gravamen fiscal o social», pero hoy la DGI incluye la suma
          para el mejor goce de la licencia entre los ingresos comprendidos del IRPF, y la grava
          <em>aparte</em> del resto de las rentas de trabajo, «aplicando una tasa proporcional
          equivalente a la tasa marginal máxima» que le tocó a esos otros ingresos. Esa tasa depende
          de la franja de cada persona, así que esta página no publica un número: lo que publica es
          dónde mirarlo.
        </p>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in SALARIO_VACACIONAL_FAQ" :key="f.question">
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
          :to="localePath('/cuando-se-cobra-el-aguinaldo-uruguay')"
          variant="tonal"
          size="small"
        >
          Cuándo se cobra el aguinaldo
        </VBtn>
        <VBtn
          :to="localePath('/herramientas/calculadora-sueldo-liquido')"
          variant="tonal"
          size="small"
        >
          Calculadora de sueldo líquido
        </VBtn>
        <VBtn :to="localePath('/herramientas/calculadora-irpf')" variant="tonal" size="small">
          Calculadora de IRPF
        </VBtn>
        <VBtn :to="localePath('/cuanto-me-tienen-que-pagar-uruguay')" variant="tonal" size="small">
          Cuánto me tienen que pagar
        </VBtn>
        <VBtn :to="localePath('/seguro-de-paro-uruguay')" variant="tonal" size="small">
          Seguro de paro
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-body-2 text-medium-emphasis mb-3">
        Contrastado contra la normativa en IMPO y las páginas oficiales del MTSS y la DGI el
        {{ verifiedAt }}. Esta página es informativa: ante una duda puntual vale lo que resuelva el
        organismo o el juez del caso, y un convenio colectivo de tu rama puede darte más que el
        mínimo legal.
      </p>
      <ul class="sources-list">
        <li v-for="s in SALARIO_VACACIONAL_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  LICENCIA_ESCALONES,
  SALARIO_VACACIONAL_FAQ,
  SALARIO_VACACIONAL_HITOS,
  SALARIO_VACACIONAL_SOURCES,
  SALARIO_VACACIONAL_VERIFIED_AT,
} from '~/utils/salarioVacacional'

const localePath = useLocalePath()

const verifiedAt = new Date(`${SALARIO_VACACIONAL_VERIFIED_AT}T12:00:00Z`).toLocaleDateString(
  'es-UY',
  { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
)

const canonicalUrl = 'https://cambio-uruguay.com/salario-vacacional-uruguay'
const title = 'Salario vacacional en Uruguay: cuándo se cobra y cuánto es'
const description =
  'El salario vacacional se paga antes de que empiece la licencia y en proporción a sus días, con un mínimo del 100 % del jornal líquido de vacaciones (Ley 16.101). La licencia son 20 días, más 1 a los 5 años de antigüedad y 1 más cada 4. Se calcula sobre el líquido, no sobre el nominal, y la DGI lo grava por IRPF aparte del resto del sueldo.'

defineOgImageComponent('Cambio', {
  title: 'Salario vacacional en Uruguay',
  subtitle: '100 % del jornal líquido, pagado antes de irte de licencia',
  tag: 'LICENCIA',
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
        'salario vacacional uruguay, cuando se cobra el salario vacacional, como se calcula el salario vacacional, suma para el mejor goce de la licencia, jornal liquido de vacaciones, licencia anual uruguay, cuantos dias de licencia me corresponden, licencia por antiguedad uruguay, salario vacacional irpf, ley 16101',
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
                name: 'Salario vacacional en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: SALARIO_VACACIONAL_FAQ.map(f => ({
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
            citation: SALARIO_VACACIONAL_SOURCES.map(s => ({
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
.vacacional-page {
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
.formula-note,
.sources-note {
  max-width: 72ch;
  margin-top: 0;
}
.callout-text,
.note-text,
.milestone__detail,
.milestone__when {
  margin-top: 0;
}

.warn-card,
.formula-card,
.note-card,
.milestone {
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

.timeline {
  display: grid;
  gap: 16px;
}
.milestone {
  padding: 18px 20px;
}
.milestone__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}
.milestone__badge {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  background: rgba(var(--v-theme-primary), 0.16);
  color: rgb(var(--v-theme-primary));
}
.milestone__when {
  font-size: 0.95rem;
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
.milestone__source {
  margin-top: 0;
}
.milestone__detail {
  line-height: 1.55;
}

.formula {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  margin-bottom: 12px;
}
.formula .term {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.formula .term.is-law {
  background: rgba(var(--v-theme-primary), 0.16);
  font-weight: 600;
}
.formula .term.is-result {
  background: rgba(22, 199, 132, 0.16);
  font-weight: 600;
}
.formula .op {
  opacity: 0.6;
}
.formula-note :deep(a),
.formula-note a {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  text-decoration: none;
}
.formula-note :deep(a:hover),
.formula-note a:hover {
  text-decoration: underline;
}

.escala-table :deep(th) {
  white-space: nowrap;
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
