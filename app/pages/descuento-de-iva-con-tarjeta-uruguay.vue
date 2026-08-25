<template>
  <VContainer class="iva-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">IVA Y MEDIOS DE PAGO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Cuánto IVA te descuentan por pagar con tarjeta en Uruguay?
      </h1>
      <p class="lead mb-6">
        Hay <strong>dos rebajas distintas</strong> y no son intercambiables. En un comercio común
        son <strong>dos puntos</strong> de IVA y sólo con
        <strong>débito o dinero electrónico</strong>: sobre la tasa básica del
        {{ IVA_TASA_BASICA }} % eso equivale a
        <strong>{{ pct(ivaDiscountOnTicket(2)) }} del total</strong>. En restaurantes, hoteles,
        eventos y alquiler de autos son <strong>nueve puntos</strong>, y ahí la
        <strong>tarjeta de crédito también sirve</strong>:
        <strong>{{ pct(ivaDiscountOnTicket(9)) }}</strong
        >, el porcentaje que publica la DGI. Esa segunda rebaja
        <strong>baja a cinco puntos el 1º de octubre de 2026</strong>.
      </p>

      <VCard class="clock-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-timer-sand" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">El reloj que ya está corriendo</div>
            <p class="callout-text mb-0">
              El <strong>Decreto 83/026</strong> prorrogó los nueve puntos de gastronomía y turismo
              <strong>sólo hasta el 30 de setiembre de 2026</strong>. Desde el
              <strong>1º de octubre de 2026</strong> la DGI publica que la reducción queda en
              <strong>cinco puntos</strong>, y que el descuento en los locales de IVA Mínimo pasa de
              <strong>7,38 %</strong> a <strong>4,1 %</strong> del total. La rebaja general de dos
              puntos no se toca: ésa es permanente y no depende de ninguna prórroga.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Los dos regímenes -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las dos rebajas, una al lado de la otra</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Normas distintas, alcances distintos y —lo que más confunde— medios de pago distintos. En
        cada compra corresponde una sola: no se suman.
      </p>

      <div class="regimes">
        <VCard v-for="regime in IVA_REGIMES" :key="regime.id" variant="flat" class="regime pa-5">
          <div class="regime__head mb-3">
            <div>
              <p class="regime__title font-weight-bold mb-1">{{ regime.title }}</p>
              <p class="regime__norm text-caption text-medium-emphasis mb-0">
                <VIcon icon="mdi-scale-balance" size="14" class="mr-1" />{{ regime.norm }}
              </p>
            </div>
            <div class="regime__figure">
              <span class="regime__points">{{ regime.points }}</span>
              <span class="regime__unit">puntos</span>
              <span class="regime__pct"
                >{{ pct(ivaDiscountOnTicket(regime.points)) }} del total</span
              >
            </div>
          </div>
          <dl class="regime__facts mb-0">
            <dt>Cuándo aplica</dt>
            <dd>{{ regime.scope }}</dd>
            <dt>Con qué se paga</dt>
            <dd>{{ regime.instruments }}</dd>
            <dt>Qué no la da</dt>
            <dd class="is-warn">{{ regime.excluded }}</dd>
          </dl>
          <p class="regime__detail text-body-2 mb-0">{{ regime.detail }}</p>
        </VCard>
      </div>
    </section>

    <!-- La cuenta -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Nueve puntos no son un 9 % de descuento</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Los puntos se descuentan de la <strong>tasa</strong>, no del precio que ves en la carta. Con
        precio sin IVA <em>P</em>, el total normal es <em>P</em> × 1,{{ IVA_TASA_BASICA }} y el
        rebajado <em>P</em> × 1,13: la diferencia sobre el total es 9 ÷ 122.
      </p>

      <VCard variant="flat" class="calc-card pa-5 pa-md-6 mb-5">
        <div class="formula mb-3">
          <span class="term is-law">puntos de rebaja</span>
          <span class="op">÷</span>
          <span class="term">(100 + tasa de IVA)</span>
          <span class="op">=</span>
          <span class="term is-result">descuento sobre el total</span>
        </div>
        <p class="formula-note text-body-2 text-medium-emphasis mb-0">
          La prueba de que la fórmula es la buena: aplicada a nueve puntos da
          {{ pct(ivaDiscountOnTicket(9)) }} y a cinco {{ pct(ivaDiscountOnTicket(5)) }} — los dos
          porcentajes exactos que publica la DGI a cada lado del 1º de octubre.
        </p>
      </VCard>

      <div class="table-scroll">
        <table class="calc-table cu-mobile-cards">
          <thead>
            <tr>
              <th>Qué pagás y cómo</th>
              <th>Puntos</th>
              <th>Sobre el total</th>
              <th>En $ 1.000</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in savingRows" :key="row.id">
              <td>{{ row.label }}</td>
              <td data-label="Puntos">{{ row.points }}</td>
              <td data-label="Sobre el total">{{ pct(row.pct) }}</td>
              <td data-label="En $ 1.000">{{ money(row.saving) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="table-note text-caption text-medium-emphasis mt-3 mb-0">
        La columna de $ 1.000 es la misma cuenta sobre un total redondo, para que la diferencia
        entre una rebaja y otra se vea en pesos y no en puntos.
      </p>
    </section>

    <!-- Qué mirar en el ticket -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué mirar en tu propio comprobante</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El Ministerio de Economía y Finanzas señala un incumplimiento concreto y frecuente: que en
        gastronomía se aplique la rebaja general de dos puntos donde corresponde la de nueve. Con el
        ticket en la mano se controla.
      </p>
      <div class="checks">
        <div v-for="check in IVA_TICKET_CHECKS" :key="check.id" class="check d-flex align-start">
          <VIcon
            icon="mdi-receipt-text-check-outline"
            size="18"
            color="primary"
            class="mt-1 mr-3"
          />
          <div>
            <p class="check__what font-weight-bold mb-1">{{ check.what }}</p>
            <p class="check__why text-body-2 text-medium-emphasis mb-0">{{ check.why }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- No residentes -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si sos turista y no residís en Uruguay</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El régimen del no residente es otro, y hoy no está entero. Separamos lo que el Ministerio de
        Turismo publica como vigente todo el año de lo que no pudimos verificar.
      </p>
      <VCard
        v-for="item in IVA_NON_RESIDENT"
        :key="item.benefit"
        variant="flat"
        class="nonres pa-5 mb-3"
      >
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <VChip
            size="small"
            variant="flat"
            :color="item.status === 'vigente' ? 'success' : 'warning'"
          >
            {{ item.status === 'vigente' ? 'Vigente todo el año' : 'Sin prórroga verificada' }}
          </VChip>
          <span class="text-subtitle-2 font-weight-bold">{{ item.benefit }}</span>
        </div>
        <p class="nonres__detail text-body-2 mb-0">{{ item.detail }}</p>
      </VCard>
      <p class="nonres-note text-caption text-medium-emphasis mt-3 mb-0">
        No publicamos el reintegro de nueve puntos como vigente porque no encontramos la norma que
        lo prorrogue: preferimos decirlo antes que darlo por hecho.
      </p>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="item in IVA_TARJETA_FAQ" :key="item.question">
          <VExpansionPanelTitle class="font-weight-medium">
            {{ item.question }}
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="faq-answer text-body-2 text-medium-emphasis mb-0">{{ item.answer }}</p>
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
        <li v-for="source in IVA_TARJETA_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
      <p class="sources-note text-caption text-medium-emphasis mt-3 mb-0">
        Contrastado el {{ verifiedAt }}. No es asesoramiento profesional: las prórrogas de este
        régimen se publican por decreto y cambian, así que confirmá con la DGI antes de tomar una
        decisión de plata.
      </p>
    </VCard>

    <!-- Relacionadas -->
    <VCard variant="flat" class="related pa-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="link in RELATED"
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
  IVA_NON_RESIDENT,
  IVA_REGIMES,
  IVA_STEP_DOWN,
  IVA_TARJETA_FAQ,
  IVA_TARJETA_SOURCES,
  IVA_TARJETA_VERIFIED_AT,
  IVA_TASA_BASICA,
  IVA_TICKET_CHECKS,
  ivaDiscountOnTicket,
  ivaSavingOnTotal,
} from '~/utils/ivaTarjeta'

const localePath = useLocalePath()

/** El total redondo de la última columna: sirve para leer la diferencia en pesos. */
const SAMPLE_TOTAL = 1000

const pct = (value: number) => `${value.toFixed(2).replace('.', ',')} %`
const money = (value: number) => `$ ${value.toFixed(2).replace('.', ',')}`

const savingRows = computed(() =>
  [
    { id: 'general', label: 'Compra común con débito o dinero electrónico', points: 2 },
    {
      id: 'gastro-hoy',
      label: `Gastronomía y turismo, hasta el 30/9/2026 (crédito o débito)`,
      points: IVA_STEP_DOWN[0]!.points,
    },
    {
      id: 'gastro-oct',
      label: `Gastronomía y turismo, desde el 1/10/2026`,
      points: IVA_STEP_DOWN[1]!.points,
    },
  ].map(row => ({
    ...row,
    pct: ivaDiscountOnTicket(row.points),
    saving: ivaSavingOnTotal(SAMPLE_TOTAL, row.points),
  }))
)

const RELATED = [
  {
    to: '/tarjetas-de-debito-uruguay',
    label: 'Tarjetas de débito',
    icon: 'mdi-credit-card-outline',
  },
  {
    to: '/descuentos-con-tarjeta-uruguay',
    label: 'Descuentos con tarjeta',
    icon: 'mdi-sale',
  },
  {
    to: '/conviene-comprar-en-cuotas',
    label: '¿Cuotas o contado?',
    icon: 'mdi-calendar-multiple-check',
  },
  {
    to: '/tarjetas-de-credito-uruguay',
    label: 'Ranking de tarjetas de crédito',
    icon: 'mdi-credit-card-multiple-outline',
  },
]

const verifiedAt = new Date(`${IVA_TARJETA_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/descuento-de-iva-con-tarjeta-uruguay'
const title = 'Descuento de IVA con tarjeta en Uruguay: 2 puntos o 9, y qué cambia en octubre'
const description =
  'Con débito o dinero electrónico te sacan 2 puntos de IVA (1,64 % del total); en restaurantes, hoteles, eventos y alquiler de autos son 9 puntos (7,38 %) y ahí también sirve el crédito. El Decreto 83/026 los prorrogó hasta el 30/9/2026: desde el 1º de octubre bajan a 5 puntos, o 4,1 %.'

defineOgImageComponent('Cambio', {
  title: 'Descuento de IVA con tarjeta',
  subtitle: '2 puntos con débito, 9 en gastronomía — y 5 desde octubre de 2026',
  tag: 'IVA',
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
        'descuento de iva con tarjeta, 9 puntos de iva, dos puntos de iva debito, rebaja de iva ley 19210, iva gastronomia uruguay, descuento iva restaurante tarjeta, ley 17934 iva, iva minimo 7.38, decreto 83/026, iva turistas uruguay, iva cero hoteles no residentes',
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
                name: 'Descuentos con tarjeta',
                item: 'https://cambio-uruguay.com/descuentos-con-tarjeta-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Descuento de IVA con tarjeta',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: IVA_TARJETA_FAQ.map(item => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
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
            citation: IVA_TARJETA_SOURCES.map(source => ({
              '@type': 'CreativeWork',
              name: source.label,
              url: source.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.iva-page {
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
.sources-note,
.table-note,
.nonres-note {
  max-width: 72ch;
  margin-top: 0;
}
.callout-text,
.regime__detail,
.regime__norm,
.check__why,
.check__what,
.nonres__detail,
.faq-answer {
  margin-top: 0;
}

.clock-card,
.calc-card,
.regime,
.check,
.nonres,
.sources-card,
.related {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  background: rgba(var(--v-theme-surface), 1);
}
.clock-card {
  background: rgba(var(--v-theme-primary), 0.06);
}
.callout-text {
  line-height: 1.6;
}

.regimes {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}
.regime__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.regime__title {
  font-size: 1.05rem;
  margin-top: 0;
}
.regime__figure {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.1;
}
.regime__points {
  font-size: 2rem;
  font-weight: 800;
  color: rgb(var(--v-theme-primary));
}
.regime__unit {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.regime__pct {
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 4px;
}

.regime__facts {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2px;
  margin-bottom: 12px;
}
.regime__facts dt {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 10px;
}
.regime__facts dd {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.55;
}
.regime__facts dd.is-warn {
  color: rgb(var(--v-theme-warning));
  font-weight: 600;
}
.regime__detail {
  line-height: 1.6;
  margin-top: 12px;
}

.formula {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
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

.table-scroll {
  overflow-x: auto;
}
.calc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.calc-table th,
.calc-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
  vertical-align: top;
}
.calc-table thead th {
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.calc-table tbody td:first-child {
  font-weight: 600;
}

.checks {
  display: grid;
  gap: 12px;
}
.check {
  padding: 16px 18px;
}
.check__why {
  line-height: 1.6;
}

.nonres__detail {
  line-height: 1.6;
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

.faq-panels :deep(.v-expansion-panel-title) {
  line-height: 1.5;
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
  min-height: 3.25rem;
}
.faq-answer {
  line-height: 1.7;
}
</style>
