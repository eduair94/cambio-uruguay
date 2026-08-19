<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">Derechos · Cobros indebidos</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        Me cobran algo que no autoricé: cómo frenarlo y a quién reclamar
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        Un seguro que se renovó solo, un débito que no para, un servicio que diste de baja y sigue
        apareciendo en el estado de cuenta. La respuesta de siempre es "denunciá en el Banco
        Central", y es media verdad: el BCU supervisa y sanciona, pero
        <strong>no puede ordenar que te devuelvan la plata</strong>. Acá está el recorrido completo,
        en el orden en que conviene hacerlo.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance">
        Cada afirmación dice de dónde sale: <strong>norma</strong> (ley o recopilación del BCU),
        <strong>operador</strong> (lo que publica el BCU, el MEF o un banco de su propio trámite) o
        <strong>práctica</strong>. Importa más que en otras páginas: la mitad de lo que circula como
        "el plazo que tenés" es el contrato de un emisor presentado como si fuera ley.
      </VAlert>
    </header>

    <!-- Lo urgente -->
    <section class="mb-8" aria-label="Frenar el cobro">
      <h2 class="section-heading mb-1">Primero, que pare</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Antes del reclamo de fondo. Ordenado de más a menos certeza jurídica — rescindir el contrato
        y cortar el medio de pago son dos cosas distintas, y hay que hacer las dos.
      </p>
      <VCard
        v-for="(action, i) in STOP_ACTIONS"
        :key="action.id"
        variant="flat"
        class="step pa-5 mb-3"
      >
        <div class="d-flex align-start ga-3">
          <div class="step-num">{{ i + 1 }}</div>
          <div class="flex-grow-1">
            <div class="d-flex align-center flex-wrap ga-2 mb-2">
              <span class="text-subtitle-2 font-weight-bold">{{ action.title }}</span>
              <VChip size="x-small" :color="CERTAINTY_COLOR[action.certainty]" variant="flat">
                certeza {{ action.certainty }}
              </VChip>
            </div>
            <p class="text-body-2 text-medium-emphasis body-text mb-2">{{ action.detail }}</p>
            <SourceChips :sources="action.sources" />
          </div>
        </div>
      </VCard>
      <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-help-rhombus-outline">
        {{ STOP_ACTIONS_GAP }}
      </VAlert>
    </section>

    <!-- Quién hace qué -->
    <section class="mb-8" aria-label="Quién hace qué">
      <h2 class="section-heading mb-1">Quién puede hacer qué</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        La columna que decide es la tercera. Poner meses de expectativa en la ventanilla equivocada
        es el error caro de este tema.
      </p>
      <div class="table-scroll">
        <table class="who-table cu-mobile-cards">
          <thead>
            <tr>
              <th>Dónde</th>
              <th>Supervisa</th>
              <th>Sanciona</th>
              <th>Ordena la devolución</th>
              <th>Qué logra de verdad</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in AUTHORITIES" :key="a.id" :class="{ 'is-refund': a.ordersRefund }">
              <td>
                <span class="font-weight-bold">{{ a.name }}</span>
                <p class="text-caption text-medium-emphasis mb-0 mt-1">{{ a.fullName }}</p>
              </td>
              <td data-label="Supervisa">{{ a.supervises ? 'Sí' : '—' }}</td>
              <td data-label="Sanciona">{{ a.sanctions ? 'Sí' : '—' }}</td>
              <td data-label="Ordena la devolución">
                <VChip size="small" :color="a.ordersRefund ? 'success' : 'error'" variant="flat">
                  {{ a.ordersRefund ? 'Sí' : 'No' }}
                </VChip>
              </td>
              <td data-label="Qué logra de verdad">
                {{ a.achieves }}
                <p class="text-caption text-medium-emphasis mb-0 mt-2">
                  <VIcon size="13">mdi-clock-outline</VIcon>
                  {{ a.deadline }}
                </p>
                <SourceChips :sources="a.sources" class="mt-2" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        <VIcon size="14" class="mr-1">mdi-sign-direction</VIcon>
        Si tu problema no es con un banco ni con una aseguradora, el organismo cambia.
        <NuxtLink :to="localePath('/a-quien-le-reclamo-uruguay')">
          Mirá el ruteo completo por rubro </NuxtLink
        >.
      </p>
    </section>

    <!-- Qué pedir -->
    <section class="mb-8" aria-label="Qué papeles pedir">
      <h2 class="section-heading mb-1">Los papeles que hay que pedir</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        En el orden en que sirven. El último es el que casi todos se saltean.
      </p>
      <VCard variant="flat" class="docs pa-5">
        <ul class="docs-list">
          <li v-for="(doc, i) in DOCUMENTS_TO_ASK" :key="i">{{ doc }}</li>
        </ul>
        <VAlert
          type="info"
          variant="tonal"
          density="comfortable"
          class="mt-4"
          icon="mdi-receipt-text-check-outline"
        >
          {{ CONSTANCIA_RULE }}
        </VAlert>
      </VCard>
    </section>

    <!-- La norma -->
    <section class="mb-8" aria-label="Qué dice la norma">
      <h2 class="section-heading mb-1">Qué dice la norma, textual</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Citalas con el número de artículo en tu reclamo. Cambia el tono de la respuesta.
      </p>
      <VCard v-for="q in NORM_QUOTES" :key="q.id" variant="flat" class="quote-card pa-5 mb-3">
        <p class="text-subtitle-2 font-weight-bold mb-2">{{ q.topic }}</p>
        <blockquote class="norm-quote mb-2">«{{ q.quote }}»</blockquote>
        <p class="text-caption text-medium-emphasis mb-2">{{ q.article }}</p>
        <p class="text-body-2 body-text mb-2">{{ q.useFor }}</p>
        <SourceChips :sources="q.sources" />
      </VCard>
    </section>

    <!-- Trampas -->
    <section class="mb-8" aria-label="Las trampas">
      <h2 class="section-heading mb-1">Las trampas</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Lo que hace perder plata, tiempo o el derecho entero.
      </p>
      <VCard v-for="trap in CHARGE_TRAPS" :key="trap.id" variant="flat" class="trap pa-5 mb-3">
        <div class="d-flex align-start ga-3">
          <VIcon size="20" color="warning" class="mt-1">mdi-alert-outline</VIcon>
          <div>
            <p class="text-subtitle-2 font-weight-bold mb-2">{{ trap.title }}</p>
            <p class="text-body-2 text-medium-emphasis body-text mb-2">{{ trap.detail }}</p>
            <SourceChips :sources="trap.sources" />
          </div>
        </div>
      </VCard>
    </section>

    <!-- Huecos -->
    <section class="mb-8" aria-label="Lo que no está publicado">
      <h2 class="section-heading mb-1">Lo que no está publicado</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Lo buscamos y no existe. Lo decimos en vez de estimarlo: en este tema una cifra inventada te
        manda a discutir con un argumento que no se sostiene.
      </p>
      <VCard variant="flat" class="gaps pa-5">
        <ul class="gaps-list">
          <li v-for="(gap, i) in CHARGE_GAPS" :key="i">{{ gap }}</li>
        </ul>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-8" aria-label="Preguntas frecuentes">
      <h2 class="section-heading mb-3">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="(faq, i) in CHARGE_FAQS" :key="i">
          <VExpansionPanelTitle class="font-weight-medium">{{ faq.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-body-2 text-medium-emphasis body-text mb-0">{{ faq.a }}</p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Fuentes -->
    <VCard variant="flat" class="sources-card pa-5 mb-6">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes
      </h2>
      <ul class="sources-list">
        <li v-for="(source, i) in UNAUTHORIZED_CHARGE_SOURCES" :key="i">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
          <span class="source-kind"> — {{ SOURCE_KIND_LABEL[source.kind] }}</span>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Contrastado el {{ verifiedDisplay }}. No es asesoramiento legal: es información para que
        sepas qué pedir y adónde ir.
      </p>
    </VCard>

    <!-- Relacionadas -->
    <VCard variant="flat" class="related pa-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="link in related"
          :key="link.to"
          :to="localePath(link.to)"
          color="primary"
          variant="tonal"
          size="small"
          link
        >
          <VIcon start size="small">{{ link.icon }}</VIcon>
          {{ link.label }}
        </VChip>
      </div>
    </VCard>
  </VContainer>
</template>

<script setup lang="ts">
import {
  AUTHORITIES,
  CHARGE_FAQS,
  CHARGE_GAPS,
  CHARGE_TRAPS,
  CONSTANCIA_RULE,
  DOCUMENTS_TO_ASK,
  NORM_QUOTES,
  STOP_ACTIONS,
  STOP_ACTIONS_GAP,
  UNAUTHORIZED_CHARGE_SOURCES,
  UNAUTHORIZED_CHARGE_VERIFIED_AT,
  type SourceKind,
} from '~/utils/unauthorizedCharge'

const localePath = useLocalePath()
const { locale } = useI18n()

const CERTAINTY_COLOR: Record<'alta' | 'media' | 'baja', string> = {
  alta: 'success',
  media: 'warning',
  baja: 'error',
}

const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  norma: 'norma',
  operador: 'lo publica el organismo',
  practica: 'práctica reportada',
}

const related = [
  {
    to: '/a-quien-le-reclamo-uruguay',
    label: 'A qué organismo va tu reclamo',
    icon: 'mdi-sign-direction',
  },
  {
    to: '/defensa-al-consumidor-uruguay',
    label: 'Defensa del Consumidor',
    icon: 'mdi-gavel',
  },
  { to: '/salir-del-clearing', label: 'Salir del Clearing', icon: 'mdi-account-alert-outline' },
  {
    to: '/tarjetas-de-credito-uruguay',
    label: 'Tarjetas de crédito',
    icon: 'mdi-credit-card-outline',
  },
  { to: '/estafas-uruguay', label: 'Estafas y fraudes', icon: 'mdi-shield-alert-outline' },
]

const verifiedDisplay = computed(() =>
  new Date(UNAUTHORIZED_CHARGE_VERIFIED_AT).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)

const canonicalUrl = 'https://cambio-uruguay.com/me-cobran-algo-que-no-autorice'
const title = 'Me cobran algo que no autoricé: qué hacer en Uruguay'
const description =
  'Seguro renovado solo, débito que no para, servicio dado de baja que sigue cobrando: cómo frenarlo hoy, a quién reclamar y quién puede ordenar la devolución.'

defineOgImageComponent('Cambio', {
  title: 'Me cobran algo que no autoricé',
  subtitle: 'El que supervisa no es el que ordena devolver',
  tag: 'DERECHOS',
})

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: CHARGE_FAQS.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }),
    },
  ],
})
</script>

<style scoped>
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}

.section-heading {
  font-size: 1.25rem;
  font-weight: 700;
}

.step,
.docs,
.quote-card,
.trap,
.gaps,
.sources-card,
.related {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.body-text {
  line-height: 1.7;
}

.step-num {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.85rem;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

/*
 * Filete neutro, no acento de marca: en esta página el color YA significa algo (los chips de
 * certeza, las píldoras Sí/No de la tabla, los números de paso). Una cita en `primary` compite con
 * esa señal y encima lee como pestaña decorativa. La bastardilla y la sangría alcanzan para marcar
 * que es una transcripción textual.
 */
.norm-quote {
  border-left: 2px solid rgba(var(--v-border-color), 0.28);
  padding: 4px 0 4px 14px;
  margin: 0;
  font-style: italic;
  line-height: 1.7;
  color: rgba(var(--v-theme-on-surface), 0.9);
}

.docs-list,
.gaps-list {
  margin: 0;
  padding-left: 1.1rem;
  line-height: 1.7;
}

.docs-list li + li,
.gaps-list li + li {
  margin-top: 8px;
}

.table-scroll {
  overflow-x: auto;
}

.who-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.who-table th,
.who-table td {
  padding: 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
  vertical-align: top;
}

.who-table thead th {
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.who-table tbody tr.is-refund {
  background: rgba(var(--v-theme-success), 0.08);
}

.sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  line-height: 1.5;
}

.sources-list a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}

.sources-list a:hover {
  text-decoration: underline;
}

.source-kind {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.faq-panels :deep(.v-expansion-panel-title) {
  line-height: 1.5;
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
  min-height: 3.25rem;
}
</style>
