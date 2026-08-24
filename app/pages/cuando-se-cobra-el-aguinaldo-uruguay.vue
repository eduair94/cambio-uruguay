<template>
  <VContainer class="aguinaldo-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SUELDO Y APORTES</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Cuándo se cobra el aguinaldo en Uruguay?
      </h1>
      <p class="lead mb-6">
        El aguinaldo —su nombre legal es <strong>sueldo anual complementario</strong>— se paga
        <strong>dentro de los diez días anteriores al 24 de diciembre</strong>, y ese es el único
        plazo que fija la ley (Ley 12.840). Desde el Decreto-Ley 14.525, el Poder Ejecutivo puede
        disponer que se cobre en <strong>dos mitades</strong>: una en junio y la otra en diciembre.
        Es la doceava parte de lo que cobraste <strong>en dinero</strong> en el año, así que los
        tickets de alimentación no entran, y si te vas del trabajo cobrás la parte proporcional.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-calendar-alert" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo que cambia todos los años</div>
            <p class="callout-text mb-0">
              La fecha de la <strong>primera cuota de junio</strong> no está en la ley: la fija un
              <strong>decreto del Poder Ejecutivo cada año</strong> y sale un día impredecible del
              mes, así que no hay una fecha fija que valga para siempre. Lo que sí es firme es el
              plazo de diciembre. Por eso esta página no publica una fecha de junio inventada: te
              dice dónde mirar cuando salga el decreto.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Las dos fechas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las dos cuotas, con lo que las fija cada una</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Cuando el Ejecutivo dispone el pago en dos veces, el año del aguinaldo queda partido en dos
        semestres. La cuota de diciembre tiene plazo legal; la de junio, fecha de decreto.
      </p>

      <div class="timeline">
        <div v-for="m in AGUINALDO_MILESTONES" :key="m.key" class="milestone">
          <div class="milestone__head">
            <span class="milestone__badge">{{ m.key === 'primera' ? '1' : '2' }}</span>
            <div>
              <p class="milestone__label font-weight-bold mb-1">{{ m.label }}</p>
              <p class="milestone__when mb-0">{{ m.when }}</p>
            </div>
          </div>
          <p class="milestone__source text-caption text-medium-emphasis mb-2">
            <VIcon icon="mdi-scale-balance" size="14" class="mr-1" />{{ m.source }}
          </p>
          <p class="milestone__detail text-body-2 mb-0">{{ m.detail }}</p>
        </div>
      </div>
    </section>

    <!-- Qué integra la base -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué entra en el cálculo y qué queda afuera</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El aguinaldo es la <strong>doceava parte del total pagado en dinero</strong> en los doce
        meses anteriores al 1.º de diciembre. La palabra «dinero» es la que decide: lo que no se
        cobra en efectivo o en la cuenta no integra la base, aunque cuente para otras cosas.
      </p>

      <VCard variant="flat" class="formula-card pa-5 pa-md-6 mb-6">
        <div class="formula">
          <span class="term">total cobrado en dinero (12 meses)</span>
          <span class="op">÷</span>
          <span class="term is-law">12</span>
          <span class="op">=</span>
          <span class="term is-result">aguinaldo del período</span>
        </div>
        <p class="formula-note text-body-2 text-medium-emphasis mb-0">
          ¿Querés el número de tu caso? La
          <NuxtLink :to="localePath('/herramientas/calculadora-aguinaldo')"
            >calculadora de aguinaldo</NuxtLink
          >
          hace la cuenta con tus sueldos del año.
        </p>
      </VCard>

      <VTable class="base-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Partida</th>
            <th>¿Integra el aguinaldo?</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rule in AGUINALDO_BASE_RULES" :key="rule.item">
            <td data-label="Partida">
              <span class="font-weight-medium">{{ rule.item }}</span>
            </td>
            <td data-label="¿Integra?" class="text-no-wrap">
              <VChip :color="rule.counts ? 'success' : 'error'" size="small" variant="tonal">
                {{ rule.counts ? 'Sí' : 'No' }}
              </VChip>
            </td>
            <td data-label="Detalle" class="text-caption text-medium-emphasis">
              {{ rule.detail }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- Egreso -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si te vas del trabajo antes de fin de año</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El aguinaldo no se pierde por irte. Cuando la relación laboral termina —por renuncia o por
        despido— cobrás la parte proporcional al tiempo trabajado en el período, calculada igual: la
        doceava parte de lo cobrado en dinero durante esos meses.
      </p>
      <VCard variant="flat" class="note-card pa-5">
        <p class="note-text mb-0">
          <VIcon icon="mdi-alert-circle-outline" color="warning" size="18" class="mr-1" />
          La única excepción es el <strong>despido por notoria mala conducta</strong>: en ese caso
          el trabajador pierde el derecho a la parte de aguinaldo que aún no había cobrado.
        </p>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in AGUINALDO_FAQ" :key="f.question">
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
        <VBtn :to="localePath('/herramientas/calculadora-aguinaldo')" variant="tonal" size="small">
          Calculadora de aguinaldo
        </VBtn>
        <VBtn
          :to="localePath('/herramientas/calculadora-sueldo-liquido')"
          variant="tonal"
          size="small"
        >
          Calculadora de sueldo líquido
        </VBtn>
        <VBtn :to="localePath('/seguro-de-paro-uruguay')" variant="tonal" size="small">
          Seguro de paro
        </VBtn>
        <VBtn :to="localePath('/embargo-de-sueldo-uruguay')" variant="tonal" size="small">
          Embargo de sueldo
        </VBtn>
        <VBtn :to="localePath('/cuanto-me-tienen-que-pagar-uruguay')" variant="tonal" size="small">
          Cuánto me tienen que pagar
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-body-2 text-medium-emphasis mb-3">
        Contrastado contra las fuentes oficiales del MTSS el {{ verifiedAt }}. Esta página es
        informativa: la fecha exacta de la primera cuota la fija el decreto del año, y ante una duda
        puntual vale lo que resuelva el organismo o el juez del caso.
      </p>
      <ul class="sources-list">
        <li v-for="s in AGUINALDO_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  AGUINALDO_BASE_RULES,
  AGUINALDO_FAQ,
  AGUINALDO_MILESTONES,
  AGUINALDO_SOURCES,
  AGUINALDO_VERIFIED_AT,
} from '~/utils/aguinaldo'

const localePath = useLocalePath()

const verifiedAt = new Date(`${AGUINALDO_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/cuando-se-cobra-el-aguinaldo-uruguay'
const title = '¿Cuándo se cobra el aguinaldo en Uruguay?'
const description =
  'El aguinaldo (sueldo anual complementario) se paga dentro de los diez días anteriores al 24 de diciembre, y desde el Decreto-Ley 14.525 puede cobrarse en dos mitades: una en junio y otra en diciembre. Es la doceava parte de lo cobrado en dinero —los tickets no cuentan— y al irte del trabajo cobrás la parte proporcional (Ley 12.840).'

defineOgImageComponent('Cambio', {
  title: 'Cuándo se cobra el aguinaldo',
  subtitle: 'El plazo de diciembre, la cuota de junio y cómo se calcula',
  tag: 'AGUINALDO',
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
        'aguinaldo uruguay, cuando se cobra el aguinaldo, cuando se paga el aguinaldo, aguinaldo 2026 uruguay, medio aguinaldo junio, segunda cuota aguinaldo diciembre, sueldo anual complementario, como se calcula el aguinaldo, aguinaldo tickets de alimentacion, aguinaldo proporcional despido',
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
                name: 'Cuándo se cobra el aguinaldo en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: AGUINALDO_FAQ.map(f => ({
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
            citation: AGUINALDO_SOURCES.map(s => ({
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
.aguinaldo-page {
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

.base-table :deep(th) {
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
