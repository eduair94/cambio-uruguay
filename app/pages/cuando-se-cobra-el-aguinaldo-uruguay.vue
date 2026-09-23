<template>
  <VContainer class="aguinaldo-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SUELDO Y APORTES</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Cuándo se cobra el aguinaldo en Uruguay?
      </h1>
      <p class="lead mb-6">
        En 2026 el aguinaldo de diciembre se paga
        <strong>hasta el {{ AGUINALDO_2026_DECREE.decemberDeadline }}</strong
        >, que cae {{ AGUINALDO_2026_DECREE.decemberWeekday }}, por el
        {{ AGUINALDO_2026_DECREE.number }}; la primera mitad venció el
        {{ AGUINALDO_2026_DECREE.juneDeadline }}. El aguinaldo —su nombre legal es
        <strong>sueldo anual complementario</strong>— tiene un techo en la Ley 12.840:
        <strong>dentro de los diez días anteriores al 24 de diciembre</strong>. El Decreto-Ley
        14.525 deja partirlo en <strong>dos mitades</strong>, junio y diciembre, y el decreto de
        cada año puede acortar el plazo. Es la doceava parte de lo que cobraste
        <strong>en dinero</strong> en el año, así que los tickets de alimentación no entran, y si te
        vas del trabajo cobrás la parte proporcional, con cualquier antigüedad.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-calendar-alert" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo que cambia todos los años, y lo que no</div>
            <p class="callout-text mb-0">
              El tope de la <strong>primera cuota</strong> no cambia: la norma dice «dentro del mes
              de junio», o sea el 30 de junio. Lo que sale cada año es el
              <strong>decreto del Poder Ejecutivo</strong> que ejerce esa facultad —en 2026 se firmó
              el {{ AGUINALDO_2026_DECREE.promulgatedOn }}— y que puede acortar el plazo de
              diciembre: {{ AGUINALDO_2026_DECREE.wordingNote }} Por eso esta página lleva las
              fechas con el número del decreto que las fija, y ninguna fecha que un organismo no
              haya publicado.
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
        semestres. La cuota de junio tiene tope en la norma que la habilita; la de diciembre tiene
        el techo de la ley y, cada año, la fecha más corta del decreto.
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

    <!-- El calendario 2026 -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Diciembre 2026: la fecha exacta y quién la fija</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El {{ AGUINALDO_2026_DECREE.number }} (promulgado el
        {{ AGUINALDO_2026_DECREE.promulgatedOn }}, publicado el
        {{ AGUINALDO_2026_DECREE.publishedOn }}) fija el calendario del sector privado.
        {{ AGUINALDO_2026_DECREE.decemberNote }} Los funcionarios públicos y la construcción tienen
        norma propia y fechas propias, así que van en filas aparte. Leído en IMPO el
        {{ verifiedAt }}.
      </p>

      <VTable class="base-table cu-mobile-cards mb-4" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Quién</th>
            <th scope="col">Primera cuota (junio)</th>
            <th scope="col">Segunda cuota (diciembre)</th>
            <th scope="col">Norma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in AGUINALDO_2026_CALENDAR" :key="row.who">
            <td data-label="Quién">
              <span class="font-weight-medium">{{ row.who }}</span>
            </td>
            <td data-label="Junio" class="cu-cell-prose text-caption text-medium-emphasis">
              {{ row.june }}
            </td>
            <td data-label="Diciembre" class="cu-cell-prose text-caption text-medium-emphasis">
              {{ row.december }}
            </td>
            <td data-label="Norma" class="cu-cell-prose text-caption">{{ row.norm }}</td>
          </tr>
        </tbody>
      </VTable>
      <p class="section-intro text-caption text-medium-emphasis mb-0">
        Fuente: {{ AGUINALDO_2026_DECREE.number }} en IMPO (<a
          :href="AGUINALDO_2026_DECREE.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          texto del decreto </a
        >), visto el {{ verifiedAt }}. Al cierre de esa lectura no había un comunicado del MTSS
        específico de diciembre de 2026: cuando lo haya, la fecha que manda sigue siendo la del
        decreto.
      </p>
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
            <th scope="col">Partida</th>
            <th scope="col">¿Integra el aguinaldo?</th>
            <th scope="col">Detalle</th>
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
        El aguinaldo no se pierde por irte. Cuando la relación laboral termina —por renuncia,
        jubilación o despido— cobrás la parte proporcional al tiempo trabajado en el período,
        calculada igual: la doceava parte de lo cobrado en dinero durante esos meses (Ley 12.840,
        art. 3). No hay antigüedad mínima: la exigencia de un año que algunos empleadores invocan
        existió sólo para el aguinaldo de 1960 (art. 6 de la misma ley). Con tres meses trabajados
        cobrás la doceava parte de esos tres meses.
      </p>
      <VCard variant="flat" class="note-card pa-5">
        <p class="note-text mb-0">
          <VIcon icon="mdi-alert-circle-outline" color="warning" size="18" class="mr-1" />
          La única excepción es el <strong>despido por notoria mala conducta</strong>: en ese caso
          el trabajador pierde el derecho a la parte de aguinaldo que aún no había cobrado.
        </p>
      </VCard>
    </section>

    <!-- Plazo y reclamo -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El plazo y qué hacer si no te lo pagan</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        {{ AGUINALDO_2026_DECREE.juneNote }} {{ AGUINALDO_2026_DECREE.decemberNote }} Si esa fecha
        pasa y no cobraste, hay dos consecuencias que se acumulan, y sólo una es plata para vos.
      </p>

      <VTable class="base-table cu-mobile-cards mb-6" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Consecuencia</th>
            <th scope="col">Detalle</th>
            <th scope="col">Fuente</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in AGUINALDO_LATE_PAYMENT_CONSEQUENCES" :key="c.label">
            <td data-label="Consecuencia">
              <span class="font-weight-medium">{{ c.label }}</span>
            </td>
            <td data-label="Detalle" class="cu-cell-prose text-caption text-medium-emphasis">
              {{ c.detail }}
            </td>
            <td data-label="Fuente" class="text-caption text-no-wrap">{{ c.source }}</td>
          </tr>
        </tbody>
      </VTable>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-office-building-marker-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Dónde reclamar</div>
            <p class="callout-text mb-2">
              {{ AGUINALDO_COMPLAINT_CHANNEL.office }}, {{ AGUINALDO_COMPLAINT_CHANNEL.address }}.
              {{ AGUINALDO_COMPLAINT_CHANNEL.hours }}.
            </p>
            <p class="callout-text mb-3">
              Email: {{ AGUINALDO_COMPLAINT_CHANNEL.email }}. Teléfonos:
              {{ AGUINALDO_COMPLAINT_CHANNEL.phones.join(', ') }}.
            </p>
            <p class="callout-text mb-3">{{ AGUINALDO_COMPLAINT_CHANNEL.onlyWhileEmployed }}</p>
            <p class="callout-text mb-3">
              {{ AGUINALDO_COMPLAINT_CHANNEL.afterLeaving }}
              {{ AGUINALDO_COMPLAINT_CHANNEL.liquidations }}
            </p>
            <p class="callout-text mb-0">{{ AGUINALDO_COMPLAINT_CHANNEL.prescription }}</p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- En negro -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si estás en negro, te corresponde igual</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        {{ AGUINALDO_UNREGISTERED.right }}
      </p>
      <ol class="steps-list">
        <li v-for="step in AGUINALDO_UNREGISTERED.steps" :key="step" class="text-body-2">
          {{ step }}
        </li>
      </ol>
      <p class="section-intro text-body-2 text-medium-emphasis mb-0">
        Las tres puertas, con sus formularios y plazos, están en
        <NuxtLink :to="localePath('/denunciar-trabajo-en-negro-uruguay')"
          >denunciar trabajo en negro</NuxtLink
        >.
      </p>
    </section>

    <!-- Construcción -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">En la construcción lo paga el BPS</h2>
      <p class="section-intro text-medium-emphasis mb-3">
        {{ AGUINALDO_CONSTRUCTION.mechanism }}
      </p>
      <p class="section-intro text-medium-emphasis mb-3">
        {{ AGUINALDO_CONSTRUCTION.periods }}
      </p>
      <p class="section-intro text-medium-emphasis mb-3">
        {{ AGUINALDO_CONSTRUCTION.lastEdition }}
      </p>
      <VCard variant="flat" class="note-card pa-5 mb-3">
        <p class="note-text mb-0">
          <VIcon icon="mdi-information-outline" color="warning" size="18" class="mr-1" />
          {{ AGUINALDO_CONSTRUCTION.notFondoSocial }}
        </p>
      </VCard>
      <VCard variant="flat" class="note-card pa-5">
        <p class="note-text mb-0">
          <VIcon icon="mdi-file-document-outline" color="warning" size="18" class="mr-1" />
          {{ AGUINALDO_CONSTRUCTION.irpfNote }}
        </p>
      </VCard>
    </section>

    <!-- Licencia, enfermedad, accidente, maternidad, seguro de paro -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Si estuviste de licencia, enfermo, en el BSE, en maternidad o en seguro de paro
      </h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Seis situaciones que generan la misma duda: ¿ese período cuenta para el aguinaldo, y quién
        lo paga? Cada respuesta llega hasta donde lo confirma la fuente oficial, ni un paso más.
      </p>
      <VTable class="base-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Situación</th>
            <th scope="col">Qué dice la fuente oficial</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in AGUINALDO_LEAVE_CASES" :key="l.situation">
            <td data-label="Situación">
              <span class="font-weight-medium">{{ l.situation }}</span>
            </td>
            <td
              data-label="Qué dice la fuente oficial"
              class="cu-cell-prose text-caption text-medium-emphasis"
            >
              {{ l.detail }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- Jubilados -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">{{ AGUINALDO_RETIREES.headline }}</h2>
      <p class="section-intro text-medium-emphasis mb-3">
        {{ AGUINALDO_RETIREES.detail }} {{ AGUINALDO_RETIREES.benefit }}
      </p>
      <VCard variant="flat" class="note-card pa-5">
        <p class="note-text mb-0">
          <VIcon icon="mdi-account-cash-outline" color="warning" size="18" class="mr-1" />
          {{ AGUINALDO_RETIREES.eligibility }}
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
        <VBtn :to="localePath('/denunciar-trabajo-en-negro-uruguay')" variant="tonal" size="small">
          Denunciar trabajo en negro
        </VBtn>
        <VBtn :to="localePath('/accidente-de-trabajo-uruguay')" variant="tonal" size="small">
          Accidente de trabajo
        </VBtn>
        <VBtn
          :to="localePath('/guias/aguinaldo-casos-especiales-uruguay')"
          variant="tonal"
          size="small"
        >
          Casos especiales del aguinaldo
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-body-2 text-medium-emphasis mb-3">
        Contrastado contra IMPO, el MTSS, el BPS y la DGI el {{ verifiedAt }}. Esta página es
        informativa: las fechas de cada año las fija el decreto del año, y ante una duda puntual
        vale lo que resuelva el organismo o el juez del caso.
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
  AGUINALDO_2026_CALENDAR,
  AGUINALDO_2026_DECREE,
  AGUINALDO_BASE_RULES,
  AGUINALDO_COMPLAINT_CHANNEL,
  AGUINALDO_CONSTRUCTION,
  AGUINALDO_FAQ,
  AGUINALDO_LATE_PAYMENT_CONSEQUENCES,
  AGUINALDO_LEAVE_CASES,
  AGUINALDO_MILESTONES,
  AGUINALDO_RETIREES,
  AGUINALDO_SOURCES,
  AGUINALDO_UNREGISTERED,
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
  'En 2026 se paga hasta el 20 de diciembre (Decreto 113/026); la de junio, hasta el 30/6. Recargo del 10 % si atrasan, quién paga en BPS y jubilados.'

defineOgImageComponent('Cambio', {
  title: 'Cuándo se cobra el aguinaldo',
  subtitle:
    'Hasta el 20 de diciembre de 2026 por decreto: la cuota de junio, el cálculo y quién paga',
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
        'aguinaldo uruguay, cuando se cobra el aguinaldo, cuando se paga el aguinaldo, aguinaldo 2026 uruguay, aguinaldo diciembre 2026, medio aguinaldo junio, segunda cuota aguinaldo diciembre, decreto 113/026, sueldo anual complementario, como se calcula el aguinaldo, aguinaldo tickets de alimentacion, aguinaldo proporcional despido, aguinaldo de la construccion, cuando pagan el aguinaldo 2026, no me pagaron el aguinaldo, aguinaldo proporcional 3 meses, aguinaldo en negro, aguinaldo seguro de paro, aguinaldo subsidio por enfermedad, aguinaldo jubilados',
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

.steps-list {
  padding-left: 1.3rem;
  margin-top: 0;
  margin-bottom: 16px;
  max-width: 72ch;
}
.steps-list li {
  margin-bottom: 8px;
  line-height: 1.55;
}
.section-intro a {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  text-decoration: none;
}
.section-intro a:hover {
  text-decoration: underline;
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
