<template>
  <VContainer class="despido-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SUELDO Y APORTES</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Indemnización por despido en Uruguay: cuánto es y hasta cuándo se reclama
      </h1>
      <p class="lead mb-6">
        La indemnización por despido es
        <strong>un mes de remuneración total por cada año o fracción</strong> de actividad (Ley
        10.489, art. 4). No se exige antigüedad mínima: la fracción cuenta como año entero. El tope
        es de <strong>seis mensualidades</strong>… salvo que ya tengas derecho a jubilación, y ahí
        baja a <strong>tres</strong>. Y tenés <strong>un año desde el cese</strong> para reclamarla
        (Ley 18.091).
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-scale-balance" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">El tope no es uno solo</div>
            <p class="callout-text mb-0">
              La frase que casi siempre se cita a medias es la del art. 4 de la Ley 10.489, y
              completa dice: «con límite de <strong>tres mensualidades</strong> si tuvieren derecho
              a jubilación y de <strong>seis mensualidades</strong> como máximo en caso contrario».
              Para la misma antigüedad, quedar de un lado o del otro de esa línea es cobrar la
              mitad. El resumen público del MTSS menciona sólo el tope de seis, que es el que le
              toca a la mayoría, pero el de tres está en el texto vigente.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- La escala -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuántas mensualidades te tocan</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Un mes por año o fracción, hasta el tope que te corresponda. Las dos columnas son la misma
        ley: cambia sólo si tenés derecho a jubilación.
      </p>

      <VTable class="escala-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Antigüedad</th>
            <th>Sin derecho a jubilación</th>
            <th>Con derecho a jubilación</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in DESPIDO_ESCALONES" :key="e.anios">
            <td data-label="Antigüedad">
              <span class="font-weight-medium">{{ e.label }}</span>
            </td>
            <td data-label="Sin derecho a jubilación" class="text-no-wrap">
              <VChip color="primary" size="small" variant="tonal">
                {{ e.sinJubilacion }} {{ e.sinJubilacion === 1 ? 'mes' : 'meses' }}
              </VChip>
            </td>
            <td data-label="Con derecho a jubilación" class="text-no-wrap">
              <VChip color="warning" size="small" variant="tonal">
                {{ e.conJubilacion }} {{ e.conJubilacion === 1 ? 'mes' : 'meses' }}
              </VChip>
            </td>
          </tr>
        </tbody>
      </VTable>

      <VCard variant="flat" class="note-card pa-5 mt-6">
        <p class="note-text mb-0">
          <VIcon icon="mdi-information-outline" color="warning" size="18" class="mr-1" />
          «Mes de trabajo» es la <strong>remuneración total</strong>, no el sueldo base pelado: el
          MTSS incluye en la base los haberes de naturaleza salarial, como la prima por antigüedad,
          el promedio de comisiones y los viáticos fijados a forfait. Sobre el salario vacacional,
          el propio MTSS advierte que su naturaleza salarial está discutida, aunque la
          jurisprudencia mayoritaria lo computa.
        </p>
      </VCard>
    </section>

    <!-- Derecho a jubilación -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué significa «tener derecho a jubilación»</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        No es una frase abierta a interpretación: el art. 5 de la Ley 12.597 la define con dos
        números, y son <strong>acumulativos</strong>.
      </p>

      <VCard variant="flat" class="formula-card pa-5 pa-md-6">
        <div class="formula">
          <span class="term is-law">más de 10 años de servicios reconocidos</span>
          <span class="op">y</span>
          <span class="term is-law">40 años de edad</span>
          <span class="op">→</span>
          <span class="term is-result">tope de 3 mensualidades</span>
        </div>
        <p class="formula-note text-body-2 text-medium-emphasis mb-0">
          Se cuentan los servicios «reconocidos o que puedan ser reconocidos por la Caja
          respectiva». Falta una de las dos condiciones y el tope vuelve a ser de seis. «Más de diez
          años» es estricto: diez exactos no alcanzan. La otra puerta es tener derecho a jubilación
          <strong>por leyes especiales</strong>, que corre por su cuenta sin mirar edad ni
          servicios.
        </p>
      </VCard>
    </section>

    <!-- Jornaleros -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si trabajás a jornal</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La Ley 12.597 resuelve el caso del año incompleto, que es el que más se da y el que más
        dudas genera.
      </p>

      <VCard variant="flat" class="formula-card pa-5 pa-md-6 mb-6">
        <div class="formula">
          <span class="term">más de 100 jornales en el año</span>
          <span class="op">y</span>
          <span class="term">menos de 240</span>
          <span class="op">→</span>
          <span class="term is-result">2 días de salario por cada 25 trabajados</span>
        </div>
        <p class="formula-note text-body-2 text-medium-emphasis mb-0">
          El cómputo se hace <strong>año a año, desde el día del despido hacia atrás</strong>, no
          por año civil. Para las <strong>fracciones de año</strong> el art. 3 aplica la misma
          cuenta «aunque la fracción no llegue a cien jornales». Y cuentan como jornadas trabajadas
          los días pagos por accidente de trabajo, enfermedad profesional, vacación anual o feriados
          (art. 9).
        </p>
      </VCard>

      <VCard variant="flat" class="gap-card pa-5">
        <div class="d-flex align-start">
          <VIcon icon="mdi-help-circle-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Un número que acá no vas a encontrar</div>
            <p class="callout-text mb-0">
              Circula una cifra fija de jornales de indemnización por cada año <em>completo</em> del
              jornalero. No la publicamos: no aparece en el texto de la Ley 10.489, ni en el de la
              Ley 12.597, ni en las páginas del MTSS que pudimos verificar. Preferimos dejar el
              hueco antes que darte un número que no podemos sostener con una fuente.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Plazos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Hasta cuándo podés reclamar</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Es donde se pierden los reclamos que tenían razón: por calendario. La Ley 18.091 maneja dos
        plazos distintos y conviene no confundirlos.
      </p>

      <div class="timeline">
        <div class="milestone">
          <div class="milestone__head">
            <span class="milestone__badge">1</span>
            <div>
              <p class="milestone__label font-weight-bold mb-1">La acción prescribe al año</p>
              <p class="milestone__when mb-0">Desde el día siguiente al cese</p>
            </div>
          </div>
          <p class="milestone__source text-caption text-medium-emphasis mb-2">
            <VIcon icon="mdi-scale-balance" size="14" class="mr-1" />Ley 18.091, art. 1
          </p>
          <p class="milestone__detail text-body-2 mb-0">
            Las acciones originadas en la relación de trabajo prescriben al año, contado desde el
            día siguiente a aquel en que cesó la relación. Esperar «a ver si me llaman» consume ese
            plazo.
          </p>
        </div>

        <div class="milestone">
          <div class="milestone__head">
            <span class="milestone__badge">2</span>
            <div>
              <p class="milestone__label font-weight-bold mb-1">Los créditos, a los cinco años</p>
              <p class="milestone__when mb-0">Desde que pudieron ser exigibles</p>
            </div>
          </div>
          <p class="milestone__source text-caption text-medium-emphasis mb-2">
            <VIcon icon="mdi-scale-balance" size="14" class="mr-1" />Ley 18.091, art. 2
          </p>
          <p class="milestone__detail text-body-2 mb-0">
            Son dos cosas distintas: el plazo del art. 1 es para poder accionar, y el del art. 2
            limita hacia atrás qué créditos entran en ese reclamo.
          </p>
        </div>

        <div class="milestone">
          <div class="milestone__head">
            <span class="milestone__badge">3</span>
            <div>
              <p class="milestone__label font-weight-bold mb-1">
                El trámite en el MTSS frena el reloj
              </p>
              <p class="milestone__when mb-0">La sola presentación interrumpe la prescripción</p>
            </div>
          </div>
          <p class="milestone__source text-caption text-medium-emphasis mb-2">
            <VIcon icon="mdi-scale-balance" size="14" class="mr-1" />Ley 18.091, arts. 3 y 4
          </p>
          <p class="milestone__detail text-body-2 mb-0">
            La sola presentación del trabajador o su representante ante el MTSS pidiendo la
            audiencia de conciliación interrumpe la prescripción, y el art. 4 agrega que también la
            interrumpe la mera presentación de la demanda, sin necesidad de trámite posterior
            alguno.
          </p>
        </div>
      </div>
    </section>

    <!-- Reglas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las reglas que deciden el número</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Cada una sale de un artículo concreto, y varias contradicen lo que se suele dar por sentado.
      </p>

      <VRow>
        <VCol v-for="r in DESPIDO_REGLAS" :key="r.key" cols="12" md="6">
          <VCard variant="flat" class="regla-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ r.label }}</h3>
            <p class="regla-source text-caption text-medium-emphasis mb-2">
              <VIcon icon="mdi-scale-balance" size="14" class="mr-1" />{{ r.source }}
            </p>
            <p class="regla-detail text-body-2 mb-0">{{ r.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in DESPIDO_FAQ" :key="f.question">
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
        <VBtn :to="localePath('/seguro-de-paro-uruguay')" variant="tonal" size="small">
          Seguro de paro
        </VBtn>
        <VBtn :to="localePath('/salario-vacacional-uruguay')" variant="tonal" size="small">
          Salario vacacional y licencia
        </VBtn>
        <VBtn
          :to="localePath('/cuando-se-cobra-el-aguinaldo-uruguay')"
          variant="tonal"
          size="small"
        >
          Cuándo se cobra el aguinaldo
        </VBtn>
        <VBtn :to="localePath('/cuanto-me-tienen-que-pagar-uruguay')" variant="tonal" size="small">
          Cuánto me tienen que pagar
        </VBtn>
        <VBtn :to="localePath('/embargo-de-sueldo-uruguay')" variant="tonal" size="small">
          Embargo de sueldo
        </VBtn>
        <VBtn
          :to="localePath('/herramientas/calculadora-sueldo-liquido')"
          variant="tonal"
          size="small"
        >
          Calculadora de sueldo líquido
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-body-2 text-medium-emphasis mb-3">
        Contrastado contra el texto de las leyes en IMPO y las páginas oficiales del MTSS el
        {{ verifiedAt }}. Esta página es informativa: ante una duda puntual vale lo que resuelva el
        organismo o el juez del caso, y un convenio colectivo de tu rama puede darte más que el
        mínimo legal. Hay además regímenes especiales de despido que esta página no cubre.
      </p>
      <ul class="sources-list">
        <li v-for="s in DESPIDO_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  DESPIDO_ESCALONES,
  DESPIDO_FAQ,
  DESPIDO_REGLAS,
  DESPIDO_SOURCES,
  DESPIDO_VERIFIED_AT,
} from '~/utils/despido'

const localePath = useLocalePath()

const verifiedAt = new Date(`${DESPIDO_VERIFIED_AT}T12:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/indemnizacion-por-despido-uruguay'
const title = 'Indemnización por despido en Uruguay: cuánto es y hasta cuándo se reclama'
const description =
  'Un mes de remuneración total por cada año o fracción, sin antigüedad mínima (Ley 10.489, art. 4). El tope son 6 mensualidades, pero baja a 3 si tenés derecho a jubilación: más de 10 años de servicios y 40 de edad (Ley 12.597, art. 5). A jornal, 2 días de salario cada 25 trabajados. Y la acción prescribe al año del cese.'

defineOgImageComponent('Cambio', {
  title: 'Indemnización por despido en Uruguay',
  subtitle: 'Un mes por año, tope 6 — o 3 si ya tenés causal jubilatoria',
  tag: 'DESPIDO',
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
        'indemnizacion por despido uruguay, cuanto me corresponde por despido, despido uruguay, tope indemnizacion despido, notoria mala conducta, ley 10489, ley 12597, prescripcion laboral uruguay, cuanto tiempo tengo para reclamar despido, indemnizacion despido jornalero, me despidieron uruguay',
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
                name: 'Indemnización por despido en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: DESPIDO_FAQ.map(f => ({
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
            citation: DESPIDO_SOURCES.map(s => ({
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
.despido-page {
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
.regla-detail,
.regla-source,
.milestone__detail,
.milestone__when {
  margin-top: 0;
}

.warn-card,
.formula-card,
.note-card,
.gap-card,
.regla-card,
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
.gap-card {
  background: rgba(var(--v-theme-on-surface), 0.04);
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
