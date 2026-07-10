<template>
  <div class="alquilar-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn
        :to="localePath('/herramientas/costo-de-vida')"
        variant="text"
        size="small"
        class="px-1"
      >
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Calculadora de costo de vida
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-alquilar pa-6">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">mdi-home-search-outline</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              Cómo encontrar y alquilar en Uruguay: guía práctica
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 alquilar-intro">
              Dónde buscar, cuánto cuesta por zona, qué garantía te conviene, cuánta plata necesitás
              para arrancar, y los tips y las alertas de estafa que junta la gente en Reddit y otras
              fuentes. Todo para que alquiles sin sorpresas.
            </p>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end mt-3">
          <ShareButtons text="Cómo encontrar y alquilar en Uruguay: guía práctica" />
        </div>
      </div>
    </VCard>

    <!-- Tool CTA -->
    <VCard
      :to="localePath('/herramientas/costo-de-vida')"
      class="tool-cta pa-4 mb-6"
      hover
      variant="flat"
    >
      <div class="d-flex align-center ga-3">
        <VIcon color="primary" size="30">mdi-calculator-variant-outline</VIcon>
        <div>
          <div class="text-subtitle-1 font-weight-bold">¿Te alcanza para ese alquiler?</div>
          <div class="text-body-2 text-grey-lighten-1">
            Probá tu sueldo, zona y estilo de vida en la calculadora de costo de vida.
          </div>
        </div>
        <VIcon class="ml-auto" color="grey">mdi-chevron-right</VIcon>
      </div>
    </VCard>

    <!-- Zone price reference -->
    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-1 alquilar-section-title">
        <VIcon start size="small" color="primary">mdi-map-marker-radius-outline</VIcon>
        ¿Cuánto cuesta alquilar por zona? (Montevideo)
      </h2>
      <p class="text-body-2 text-grey-lighten-1 mb-3">
        Alquiler mensual típico de referencia, sin gastos comunes. La zona hace una diferencia
        enorme.
      </p>
      <VCard variant="flat" class="alquilar-section pa-2 pa-sm-4">
        <div class="table-scroll">
          <VTable density="comfortable" class="zone-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th v-for="z in zoneCols" :key="z.id" class="text-right">{{ z.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in zoneRows" :key="row.key">
                <td class="font-weight-medium">{{ row.label }}</td>
                <td v-for="z in zoneCols" :key="z.id" class="text-right">
                  {{ formatUYU(row[z.id]) }}
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
        <p class="text-caption text-grey-lighten-1 mb-0 mt-2 px-2">
          Interior: en general 25-35% por debajo de Montevideo (Maldonado/Punta del Este es la
          excepción, más caro y estacional). Sumá gastos comunes ~$3.000 a $6.500 aparte.
        </p>
      </VCard>
    </section>

    <!-- Portals -->
    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-3 alquilar-section-title">
        <VIcon start size="small" color="primary">mdi-magnify</VIcon>
        Dónde buscar
      </h2>
      <VRow>
        <VCol v-for="p in portals" :key="p.name" cols="12" sm="6">
          <VCard
            :href="p.url"
            target="_blank"
            rel="noopener noreferrer"
            class="alquilar-item pa-4 h-100"
            hover
            variant="flat"
          >
            <div class="d-flex align-center ga-2 mb-1">
              <VIcon size="18" color="primary">mdi-open-in-new</VIcon>
              <span class="font-weight-bold">{{ p.name }}</span>
            </div>
            <p class="text-body-2 text-grey-lighten-1 mb-0">{{ p.note }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Guarantees -->
    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-1 alquilar-section-title">
        <VIcon start size="small" color="primary">mdi-shield-account-outline</VIcon>
        Qué garantía te conviene
      </h2>
      <p class="text-body-2 text-grey-lighten-1 mb-3">
        La garantía es casi siempre el mayor obstáculo. Estas son las opciones, comparadas.
      </p>
      <div v-for="g in guarantees" :key="g.id" class="alquilar-item pa-4 pa-sm-5 mb-3">
        <div class="text-subtitle-1 font-weight-bold mb-2">{{ g.name }}</div>
        <p class="text-body-2 alquilar-note mb-2">{{ g.howItWorks }}</p>
        <dl class="guarantee-specs">
          <div>
            <dt>Costo</dt>
            <dd>{{ g.cost }}</dd>
          </div>
          <div>
            <dt>Velocidad</dt>
            <dd>{{ g.speed }}</dd>
          </div>
          <div>
            <dt>Ideal para</dt>
            <dd>{{ g.bestFor }}</dd>
          </div>
        </dl>
        <VRow class="mt-1">
          <VCol cols="12" sm="6">
            <p class="g-plabel g-pro">A favor</p>
            <ul class="g-list g-pro-list">
              <li v-for="(x, i) in g.pros" :key="i">{{ x }}</li>
            </ul>
          </VCol>
          <VCol cols="12" sm="6">
            <p class="g-plabel g-con">En contra</p>
            <ul class="g-list g-con-list">
              <li v-for="(x, i) in g.cons" :key="i">{{ x }}</li>
            </ul>
          </VCol>
        </VRow>
      </div>
    </section>

    <!-- Startup costs -->
    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-1 alquilar-section-title">
        <VIcon start size="small" color="primary">mdi-cash-multiple</VIcon>
        Cuánta plata necesitás para arrancar
      </h2>
      <p class="text-body-2 text-grey-lighten-1 mb-3">
        El golpe fuerte no es el alquiler mensual, sino todo lo que se paga junto al firmar.
        Presupuestá <strong>2 a 3,5 meses de alquiler</strong> más los muebles.
      </p>
      <VCard variant="flat" class="alquilar-section pa-4">
        <div v-for="(s, i) in startupCosts" :key="i" class="startup-row">
          <span>{{ s.label }}</span>
          <span class="font-weight-bold text-right">{{ s.amount }}</span>
        </div>
      </VCard>
    </section>

    <!-- Tips -->
    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-1 alquilar-section-title">
        <VIcon start size="small" color="primary">mdi-lightbulb-on-outline</VIcon>
        Tips que te ahorran plata y dolores de cabeza
      </h2>
      <p class="text-body-2 text-grey-lighten-1 mb-3">
        De la experiencia de la gente en Reddit r/uruguay y de fuentes confiables.
      </p>
      <div v-for="(t, i) in tips" :key="i" class="alquilar-item tip-row pa-4 mb-2">
        <VIcon color="primary" size="20" class="tip-icon">mdi-check-circle-outline</VIcon>
        <div>
          <p class="text-body-2 alquilar-note mb-1">{{ t.tip }}</p>
          <VChip
            size="x-small"
            variant="tonal"
            :color="
              t.source === 'oficial' ? 'success' : t.source === 'reddit' ? 'primary' : undefined
            "
          >
            {{
              t.source === 'reddit'
                ? 'Experiencia (Reddit)'
                : t.source === 'oficial'
                  ? 'Oficial / legal'
                  : 'Recomendación general'
            }}
          </VChip>
        </div>
      </div>
    </section>

    <!-- Red flags -->
    <section class="mb-6">
      <h2 class="text-h6 font-weight-bold mb-1 alquilar-section-title">
        <VIcon start size="small" color="error">mdi-alert-octagon-outline</VIcon>
        Alertas de estafa: cuándo salir corriendo
      </h2>
      <p class="text-body-2 text-grey-lighten-1 mb-3">
        Los grupos de alquiler online están llenos de estafas. Estas señales son casi siempre
        trampa.
      </p>
      <VCard variant="flat" class="redflags pa-4 pa-sm-5">
        <div v-for="(r, i) in redFlags" :key="i" class="redflag-row">
          <VIcon color="error" size="20" class="mt-1">mdi-close-octagon</VIcon>
          <p class="text-body-2 mb-0">{{ r.flag }}</p>
        </div>
        <p class="text-body-2 font-weight-bold mb-0 mt-3">
          Regla de oro: nunca transfieras plata sin ver el inmueble en persona y sin un contrato
          firmado con alguien verificable.
        </p>
      </VCard>
    </section>

    <!-- Disclaimer -->
    <VAlert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mt-4 alquilar-alert"
      icon="mdi-information-outline"
    >
      Guía informativa, no asesoramiento legal ni financiero. Las condiciones de garantías,
      comisiones y precios cambian y varían por caso; verificá siempre los términos vigentes con la
      inmobiliaria, el propietario o el proveedor de la garantía antes de firmar.
    </VAlert>

    <!-- Cross-links -->
    <VRow class="my-6">
      <VCol cols="12" md="6">
        <VCard
          :to="localePath('/herramientas/costo-de-vida')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-home-search-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Calculadora de costo de vida</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            ¿Te alcanza para vivir en esa zona? Probá sueldo, transporte y estilo de vida.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="6">
        <VCard
          :to="localePath('/preguntas-economia-personal')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-comment-question-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Preguntas de economía personal</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Independizarse, ahorrar, invertir y más, respondido al grano.
          </p>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<script setup lang="ts">
import { formatUYU } from '~/utils/format'
import { COST_MODEL } from '~/utils/costOfLiving'
import {
  RENTAL_PORTALS,
  GUARANTEE_OPTIONS,
  STARTUP_COSTS,
  RENT_TIPS,
  RENT_RED_FLAGS,
} from '~/utils/rentGuide'

const localePath = useLocalePath()

const portals = RENTAL_PORTALS
const guarantees = GUARANTEE_OPTIONS
const startupCosts = STARTUP_COSTS
const tips = RENT_TIPS
const redFlags = RENT_RED_FLAGS

// Zone × dwelling reference table, derived from the shared cost model.
const zoneCols = [
  { id: 'economico' as const, label: 'Económica' },
  { id: 'intermedio' as const, label: 'Intermedia' },
  { id: 'costa' as const, label: 'Costa' },
]
const dwellings = [
  { key: 'monoambiente', label: 'Monoambiente' },
  { key: '1_dormitorio', label: '1 dormitorio' },
  { key: '2_dormitorios', label: '2 dormitorios' },
] as const
const zoneRows = dwellings.map(d => {
  const base = COST_MODEL.rentMontevideo[d.key]
  return {
    key: d.key,
    label: d.label,
    economico: Math.round((base * COST_MODEL.zoneMultiplier.economico) / 500) * 500,
    intermedio: base,
    costa: Math.round((base * COST_MODEL.zoneMultiplier.costa) / 500) * 500,
  }
})

const canonicalUrl = 'https://cambio-uruguay.com/alquilar-en-uruguay'
const title = 'Cómo alquilar en Uruguay: garantías, zonas, costos y tips (2026)'
const description =
  'Guía práctica para encontrar y alquilar en Uruguay: dónde buscar, cuánto cuesta el alquiler por zona en Montevideo, qué garantía conviene (ANDA, Contaduría, seguro Porto, depósito, sin garantía), cuánta plata necesitás para arrancar, tips de Reddit y alertas de estafa.'

defineOgImageComponent('Cambio', {
  title: 'Cómo alquilar en Uruguay',
  subtitle: 'Garantías, zonas, costos y tips para no equivocarte',
  tag: 'GUÍA',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
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
        'alquilar en uruguay, garantia de alquiler uruguay, anda garantia, seguro de fianza porto, cuanto sale alquilar montevideo, alquiler por zona montevideo, alquiler sin garantia, tips alquilar uruguay, estafas alquiler',
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
              { '@type': 'ListItem', position: 2, name: 'Alquilar en Uruguay', item: canonicalUrl },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: '¿Qué garantía de alquiler conviene en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'ANDA y la Contaduría (CGN) funcionan por retención del sueldo y son las más baratas a la larga, pero exigen trabajo formal estable y el trámite es lento. Los seguros de fianza como Porto aprueban en unas 24 horas y no retienen el sueldo, pero cobran una prima anual del orden del 80-90% de un mes de alquiler. El depósito en garantía evita el fiador pero inmoviliza capital. También existe el alquiler sin garantía (Ley 19.889), con reglas propias. Compará por el costo total del contrato, no solo por la primera cuota.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cuánta plata necesito para empezar a alquilar?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'El costo de arranque suele ser de 2 a 3,5 meses de alquiler juntos: primer mes, la garantía (seguro o depósito), la comisión inmobiliaria (habitualmente un mes más IVA) y las conexiones de UTE y OSE, además de muebles y electrodomésticos básicos si arrancás de cero (fácil USD 1.000 a 2.000). Conviene no mudarse hasta tener juntado el arranque más un fondo de un mes por las dudas.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cómo evito estafas al alquilar por internet?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Nunca transfieras dinero ni pagues una seña antes de ver el inmueble en persona y firmar un contrato con alguien verificable. Desconfiá de precios muy por debajo del mercado, de dueños "en el exterior" que te mandan las llaves por correo, de quien no te deja visitar el apartamento y de la presión para decidir en el momento.',
                },
              },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.bg-gradient-alquilar {
  background: linear-gradient(135deg, #0f766e 0%, #b45309 100%);
}
.alquilar-page {
  overflow-x: hidden;
}
.alquilar-intro {
  max-width: 800px;
  line-height: 1.6;
}
.alquilar-section-title {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}

.alquilar-section,
.alquilar-item,
.tool-cta,
.cross-link {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.v-theme--light .alquilar-section,
.v-theme--light .alquilar-item,
.v-theme--light .tool-cta,
.v-theme--light .cross-link {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}
.tool-cta,
.cross-link,
.alquilar-item {
  text-decoration: none;
  transition: transform 0.2s ease;
}
.tool-cta:hover,
.cross-link:hover {
  transform: translateY(-2px);
}

.alquilar-note {
  color: rgba(var(--v-theme-on-surface), 0.82);
  line-height: 1.55;
}

.table-scroll {
  overflow-x: auto;
}
.zone-table :deep(th),
.zone-table :deep(td) {
  white-space: nowrap;
}

.guarantee-specs {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  margin: 8px 0;
}
@media (min-width: 600px) {
  .guarantee-specs {
    grid-template-columns: repeat(3, 1fr);
  }
}
.guarantee-specs dt {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.guarantee-specs dd {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.g-plabel {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
  margin-bottom: 4px;
}
.g-pro {
  color: #16a34a;
}
.g-con {
  color: #ef4444;
}
.g-list {
  margin: 0;
  padding-left: 1.1rem;
}
.g-list li {
  font-size: 0.83rem;
  line-height: 1.4;
  margin-bottom: 0.3rem;
}
.g-pro-list li::marker {
  color: #16a34a;
}
.g-con-list li::marker {
  color: #ef4444;
}

.startup-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  font-size: 0.9rem;
}
.startup-row:last-child {
  border-bottom: none;
}

.tip-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.tip-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.redflags {
  background: rgba(220, 38, 38, 0.07);
  border: 1px solid rgba(220, 38, 38, 0.28);
  border-radius: 12px;
}
.redflag-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 6px 0;
}
.redflag-row p {
  color: rgba(var(--v-theme-on-surface), 0.88);
  line-height: 1.5;
}

.alquilar-alert :deep(.v-alert__content) {
  color: rgba(var(--v-theme-on-surface), 0.92);
}
</style>
