<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">Compras en el exterior · Ruta</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        ¿Envío directo a Uruguay o casillero en Miami o España?
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        La respuesta de siempre es "mandalo a Estados Unidos". Con la norma en la mano casi nunca es
        la mejor: la exoneración de IVA sigue al <strong>vendedor</strong>, no al recorrido, y desde
        agosto de 2025 Estados Unidos no tiene más la exención de US$ 800. Acá está qué te cuesta
        cada desvío antes de que el paquete toque la Aduana uruguaya.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance">
        Cada afirmación dice de dónde sale: <strong>norma</strong> (ley, decreto o resolución),
        <strong>operador</strong> (lo que publica eBay, el Correo o un courier de su propio
        servicio, que puede cambiarlo mañana) o <strong>práctica</strong> (lo que cuenta la gente,
        que no es un derecho). Lo que no está publicado lo decimos, no lo estimamos.
      </VAlert>
    </header>

    <!-- Tu compra -->
    <section class="mb-8" aria-label="Tu compra">
      <h2 class="section-heading mb-1">Contame tu compra</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Los importes van en dólares. Si el anuncio está en euros, convertilo primero — el decreto
        fija los topes en dólares.
      </p>

      <VCard variant="flat" class="picker pa-4 pa-sm-6">
        <VRow dense>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model.number="priceUsd"
              type="number"
              min="0"
              label="Precio del anuncio (US$)"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model.number="sellerShippingUsd"
              type="number"
              min="0"
              label="Envío que cobra el vendedor (US$)"
              hint="Con «free shipping», 0"
              persistent-hint
              variant="outlined"
              density="comfortable"
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model.number="weightKg"
              type="number"
              min="0"
              step="0.1"
              label="Peso del envío (kg)"
              hint="Sólo se usa para el flete del casillero"
              persistent-hint
              variant="outlined"
              density="comfortable"
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VSelect
              v-model="sellerRegion"
              :items="SELLER_REGION_ITEMS"
              label="¿Dónde factura el vendedor?"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </VCol>
        </VRow>

        <VRow dense class="mt-1">
          <VCol cols="12" sm="6" md="3">
            <VSelect
              v-model="sellerKind"
              :items="SELLER_KIND_ITEMS"
              label="¿El vendedor es empresa?"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model.number="franchiseAvailable"
              type="number"
              min="0"
              label="Cupo de franquicia que te queda (US$)"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model.number="shipmentsUsed"
              type="number"
              min="0"
              max="3"
              label="Envíos de franquicia ya usados"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VSelect
              v-model="regimeChoice"
              :items="REGIME_ITEMS"
              label="Régimen"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </VCol>
        </VRow>

        <!-- Veredicto -->
        <VAlert
          v-if="verdict"
          type="success"
          variant="tonal"
          class="mt-5"
          icon="mdi-trophy-outline"
          border="start"
        >
          <p class="text-subtitle-1 font-weight-bold mb-2">{{ verdict.headline }}</p>
          <p class="text-body-2 mb-0 verdict-body">{{ verdict.detail }}</p>
        </VAlert>
      </VCard>
    </section>

    <!-- Comparación de costo -->
    <section class="mb-8" aria-label="Comparación de costo">
      <h2 class="section-heading mb-1">Lo que termina costando cada ruta</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Puesto en tu casa, con el régimen que elegiste. El flete del casillero usa las tarifas
        publicadas por USX Cargo ({{ USA_PER_KG }} US$/kg desde Miami, {{ EU_PER_KG }} US$/kg desde
        Europa); cambiá el peso para ajustarlo.
      </p>
      <div class="table-scroll">
        <table class="routes-table cu-mobile-cards">
          <thead>
            <tr>
              <th>Ruta</th>
              <th>Valor que declarás</th>
              <th>Impuesto de afuera</th>
              <th>Flete del casillero</th>
              <th>Impuesto uruguayo</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.route"
              :class="{ 'is-best': row.route === bestRoute }"
            >
              <td>
                <div class="d-flex align-center ga-2 flex-wrap">
                  <span class="font-weight-bold">{{ ROUTE_LABEL[row.route] }}</span>
                  <VChip
                    v-if="row.route === bestRoute"
                    size="x-small"
                    color="success"
                    variant="flat"
                  >
                    la más barata
                  </VChip>
                </div>
                <p v-if="row.leg.buyerProtectionLost" class="text-caption text-warning mb-0 mt-1">
                  <VIcon size="13">mdi-shield-off-outline</VIcon>
                  Sin garantía de eBay
                </p>
              </td>
              <td data-label="Valor que declarás">{{ money(row.leg.invoiceUsd) }}</td>
              <td data-label="Impuesto de afuera">
                {{ row.leg.foreignTaxUsd > 0 ? money(row.leg.foreignTaxUsd) : '—' }}
              </td>
              <td data-label="Flete del casillero">
                {{ row.leg.forwarderFreightUsd > 0 ? money(row.leg.forwarderFreightUsd) : '—' }}
              </td>
              <td data-label="Impuesto uruguayo">{{ money(row.uyTax) }}</td>
              <td data-label="Total" class="font-weight-bold">{{ money(row.total) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <VAlert
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        icon="mdi-cash-remove"
      >
        {{ US_ADVANCE_FEE_UNPUBLISHED }}
      </VAlert>

      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        El impuesto uruguayo lo calcula el mismo motor que
        <NuxtLink :to="localePath('/herramientas/calculadora-impuestos-importacion')">
          la calculadora de importación </NuxtLink
        >, con el piso legal de IVA de US$ 20 por envío incluido.
      </p>
    </section>

    <!-- Comparación cualitativa -->
    <section class="mb-8" aria-label="Diferencias que no son plata">
      <h2 class="section-heading mb-1">Lo que no se ve en el total</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Las dimensiones que deciden de verdad, con la fuente de cada una.
      </p>
      <VCard v-for="trait in ROUTE_TRAITS" :key="trait.id" variant="flat" class="trait pa-5 mb-3">
        <p class="text-subtitle-2 font-weight-bold mb-3">{{ trait.dimension }}</p>
        <div class="trait-grid">
          <div v-for="route in ROUTES" :key="route" class="trait-cell">
            <p class="text-overline text-medium-emphasis mb-1">{{ ROUTE_LABEL[route] }}</p>
            <p class="text-body-2 mb-0">{{ trait.byRoute[route] }}</p>
          </div>
        </div>
        <SourceChips :sources="trait.sources" class="mt-3" />
      </VCard>
    </section>

    <!-- Paso a paso -->
    <section class="mb-8" aria-label="Paso a paso del envío directo">
      <h2 class="section-heading mb-1">Si lo mandás directo: el paso a paso</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Esto es lo que hay que hacer para que no quede frenado en Aduana.
      </p>
      <VCard v-for="(step, i) in DIRECT_STEPS" :key="step.id" variant="flat" class="step pa-5 mb-3">
        <div class="d-flex align-start ga-3">
          <div class="step-num">{{ i + 1 }}</div>
          <div class="flex-grow-1">
            <VChip size="x-small" variant="tonal" color="primary" class="mb-2">
              {{ step.when }}
            </VChip>
            <p class="text-subtitle-2 font-weight-bold mb-2">{{ step.title }}</p>
            <p class="text-body-2 text-medium-emphasis step-detail mb-2">{{ step.detail }}</p>
            <SourceChips :sources="step.sources" />
          </div>
        </div>
      </VCard>
    </section>

    <!-- Trampas -->
    <section class="mb-8" aria-label="Lo que hace perder plata">
      <h2 class="section-heading mb-1">Las trampas</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Lo que hace perder plata, el paquete, o las dos cosas.
      </p>
      <VCard v-for="trap in ROUTE_TRAPS" :key="trap.id" variant="flat" class="trap pa-5 mb-3">
        <div class="d-flex align-start ga-3">
          <VIcon size="20" color="warning" class="mt-1">mdi-alert-outline</VIcon>
          <div>
            <p class="text-subtitle-2 font-weight-bold mb-2">{{ trap.title }}</p>
            <p class="text-body-2 text-medium-emphasis trap-detail mb-2">{{ trap.detail }}</p>
            <SourceChips :sources="trap.sources" />
          </div>
        </div>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-8" aria-label="Preguntas frecuentes">
      <h2 class="section-heading mb-3">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="(faq, i) in SHIPPING_ROUTES_FAQS" :key="i">
          <VExpansionPanelTitle class="font-weight-medium">{{ faq.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-body-2 text-medium-emphasis faq-answer mb-0">{{ faq.a }}</p>
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
        <li v-for="(source, i) in SHIPPING_ROUTES_SOURCES" :key="i">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
          <span class="source-kind"> — {{ SOURCE_KIND_LABEL[source.kind] }}</span>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Contrastado el {{ verifiedDisplay }}. No es asesoramiento profesional: confirmá con la
        Dirección Nacional de Aduanas y con tu operador antes de comprar.
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
import { courierImport } from '~/utils/importTax'
import {
  DIRECT_STEPS,
  ROUTE_LABEL,
  ROUTE_TRAITS,
  ROUTE_TRAPS,
  SHIPPING_ROUTES_FAQS,
  SHIPPING_ROUTES_SOURCES,
  SHIPPING_ROUTES_VERIFIED_AT,
  US_ADVANCE_FEE_UNPUBLISHED,
  shippingLegs,
  type SellerKind,
  type SellerRegion,
  type ShipRoute,
  type SourceKind,
} from '~/utils/shippingRoutes'
import { regimeRulesFromPayload } from '~/utils/regimeOverlay'

const localePath = useLocalePath()
const { locale } = useI18n()

/** Tarifas de referencia por kg, las mismas que publica USX Cargo. */
const USA_PER_KG = 17.5
const EU_PER_KG = 21.5

const ROUTES: ShipRoute[] = ['directo', 'casillero-usa', 'casillero-ue']

const priceUsd = ref(260)
const sellerShippingUsd = ref(0)
const weightKg = ref(0.5)
const sellerRegion = ref<SellerRegion>('ue')
const sellerKind = ref<SellerKind>('empresa')
const franchiseAvailable = ref(600)
const shipmentsUsed = ref(1)
const regimeChoice = ref<'franquicia' | 'simplificado'>('franquicia')

const SELLER_REGION_ITEMS = [
  { title: 'Unión Europea (Italia, España…)', value: 'ue' },
  { title: 'Estados Unidos', value: 'usa' },
  { title: 'Otro país', value: 'otro' },
]

const SELLER_KIND_ITEMS = [
  { title: 'Empresa (precio con IVA)', value: 'empresa' },
  { title: 'Particular o usado (sin IVA)', value: 'particular' },
]

const REGIME_ITEMS = [
  { title: 'Franquicia (IVA 22%)', value: 'franquicia' },
  { title: 'Prestación única (60%)', value: 'simplificado' },
]

const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  norma: 'norma',
  operador: 'lo publica el operador',
  practica: 'práctica reportada',
}

// Cifras del régimen en vivo desde /api/aduana, deep-merged sobre la baseline estática. Si la
// llamada falla, `regimeRulesFromPayload` devuelve la baseline y la página sigue funcionando.
const { data: aduanaData } = await useFetch('/api/aduana', { key: 'aduana-overlay' })
const overlay = computed(() => regimeRulesFromPayload(aduanaData.value))

const legs = computed(() =>
  shippingLegs({
    priceUsd: priceUsd.value || 0,
    sellerShippingUsd: sellerShippingUsd.value || 0,
    sellerRegion: sellerRegion.value,
    sellerKind: sellerKind.value,
    weightKg: weightKg.value || 0,
    usaPerKgUsd: USA_PER_KG,
    euPerKgUsd: EU_PER_KG,
  })
)

const rows = computed(() =>
  legs.value.map(leg => {
    // El tramo uruguayo lo resuelve el motor que ya existe. Lo único que cambia entre rutas es el
    // valor de factura que le entregamos — que es justo lo que las respuestas de foro erran.
    const uy = courierImport(
      {
        value: leg.invoiceUsd,
        origin: sellerRegion.value === 'usa' ? 'usa' : 'other',
        channel: 'postal-simple',
        declarationTiming: 'before-arrival',
        useFranchise: regimeChoice.value === 'franquicia',
        franchiseAvailable: franchiseAvailable.value || 0,
        shipmentsUsed: shipmentsUsed.value || 0,
      },
      overlay.value
    )
    const uyTax = uy.totalTax + (uy.handlingFee ?? 0)
    return {
      route: leg.route,
      leg,
      uy,
      uyTax,
      total:
        Math.round((leg.invoiceUsd + leg.foreignTaxUsd + leg.forwarderFreightUsd + uyTax) * 100) /
        100,
    }
  })
)

const bestRoute = computed<ShipRoute | null>(() => {
  const sorted = [...rows.value].sort((a, b) => a.total - b.total)
  return sorted.length ? sorted[0].route : null
})

const verdict = computed(() => {
  const sorted = [...rows.value].sort((a, b) => a.total - b.total)
  if (sorted.length < 2) return null
  const [win, next] = sorted
  const gap = Math.round((next.total - win.total) * 100) / 100
  if (gap <= 0) {
    return {
      headline: `Empatan: ${ROUTE_LABEL[win.route]} y ${ROUTE_LABEL[next.route]}`,
      detail:
        'Con estos números las dos rutas cuestan lo mismo. Decidí por lo que no es plata: el envío directo cruza una sola aduana y conserva la garantía de eBay.',
    }
  }
  return {
    headline: `Conviene: ${ROUTE_LABEL[win.route]}`,
    detail:
      `Te ahorra ${money(gap)} contra la siguiente opción (${ROUTE_LABEL[next.route]}), ` +
      `puesto en tu casa: ${money(win.total)} contra ${money(next.total)}.` +
      (win.route === 'directo'
        ? ' Además cruza una sola aduana y conserva la garantía de eBay, que se cae si usás un reenviador.'
        : ''),
  }
})

function money(n: number): string {
  return `US$ ${n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const related = [
  {
    to: '/franquicia-aduana-uruguay',
    label: 'Cómo funciona la franquicia',
    icon: 'mdi-package-variant-closed-check',
  },
  {
    to: '/herramientas/calculadora-impuestos-importacion',
    label: 'Calcular el impuesto',
    icon: 'mdi-calculator-variant-outline',
  },
  { to: '/declarar-compra-exterior-uruguay', label: 'Cómo se declara', icon: 'mdi-file-sign' },
  {
    to: '/donde-te-entregan-el-paquete-uruguay',
    label: 'Dónde te lo entregan',
    icon: 'mdi-mailbox-open-outline',
  },
  {
    to: '/problemas-con-la-aduana-uruguay',
    label: 'Si queda retenido',
    icon: 'mdi-clipboard-alert-outline',
  },
  { to: '/couriers-uruguay', label: 'Comparar couriers', icon: 'mdi-truck-fast-outline' },
]

const verifiedDisplay = computed(() =>
  new Date(SHIPPING_ROUTES_VERIFIED_AT).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)

const canonicalUrl = 'https://cambio-uruguay.com/envio-directo-o-casillero-uruguay'
const title = '¿Envío directo a Uruguay o casillero en Miami o España?'
const description =
  'Qué te cuesta de verdad desviar una compra por un casillero: Estados Unidos ya no tiene la exención de US$ 800 y por España te comés el IVA europeo dos veces. Comparación con la norma, y el paso a paso del envío directo.'

defineOgImageComponent('Cambio', {
  title,
  subtitle: 'La exoneración sigue al vendedor, no a la ruta',
  tag: 'IMPORTAR',
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
        mainEntity: SHIPPING_ROUTES_FAQS.map(f => ({
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

.picker,
.trait,
.step,
.trap,
.sources-card,
.related {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.verdict-body,
.step-detail,
.trap-detail,
.faq-answer {
  line-height: 1.7;
}

.trait-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.trait-cell {
  border-left: 2px solid rgba(var(--v-border-color), 0.2);
  padding-left: 12px;
}

.trait-cell p:last-child {
  line-height: 1.6;
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

.table-scroll {
  overflow-x: auto;
}

.routes-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.routes-table th,
.routes-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
  vertical-align: top;
}

.routes-table thead th {
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.routes-table tbody tr.is-best {
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
