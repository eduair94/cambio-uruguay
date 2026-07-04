<template>
  <div class="prestamos-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/herramientas')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Herramientas
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-prestamos pa-6">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">mdi-bank-outline</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              Dónde pedir un préstamo en Uruguay: bancos, financieras y cooperativas
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 prestamos-intro">
              Comparativa de tasas de referencia (TEA), montos máximos y requisitos de bancos,
              financieras, cooperativas y fintech en Uruguay. Valores verificados en junio de 2026.
            </p>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end mt-3">
          <ShareButtons
            text="Dónde pedir un préstamo en Uruguay: comparativa de bancos, financieras y cooperativas"
          />
        </div>
      </div>
    </VCard>

    <!-- Loan calculator link -->
    <VAlert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
      icon="mdi-calculator-variant-outline"
    >
      <NuxtLink :to="localePath('/herramientas/calculadora-prestamo')" class="prestamos-link">
        Simulá la cuota de tu préstamo
      </NuxtLink>
      con nuestra calculadora antes de decidirte. Ingresá monto, plazo y tasa para ver la cuota
      mensual estimada.
    </VAlert>

    <!-- Updated label -->
    <p v-if="updatedLabel" class="text-caption text-grey-lighten-1 mb-3">
      <VIcon size="14" class="mr-1">mdi-refresh</VIcon>
      Tarifas actualizadas automáticamente el {{ updatedLabel }}.
    </p>

    <!-- Comparison groups -->
    <div v-for="group in groups" :key="group.type" class="mb-6">
      <h2 class="text-h6 font-weight-bold mb-3 prestamos-group-title">
        <VIcon start size="small" color="primary">{{ groupIcon(group.type) }}</VIcon>
        {{ group.label }}
      </h2>

      <VCard class="prestamos-card pa-4 pa-sm-6">
        <!-- Desktop: table -->
        <div class="d-none d-md-block">
          <VTable density="comfortable" class="prestamos-table">
            <thead>
              <tr>
                <th>Entidad</th>
                <th>TEA (ref.)</th>
                <th class="text-right">Monto máx.</th>
                <th>Plazo máx.</th>
                <th>Requisitos</th>
                <th>Reputación</th>
                <th>Sitio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in group.items" :key="l.id">
                <td class="font-weight-medium">{{ l.name }}</td>
                <td>{{ teaLabel(l.teaPct) }}</td>
                <td class="text-right">{{ amountLabel(l) }}</td>
                <td>{{ termLabel(l.maxTermMonths) }}</td>
                <td>
                  <span
                    v-for="(req, i) in l.requirements.slice(0, 3)"
                    :key="i"
                    class="prestamos-req-chip"
                    >{{ req }}</span
                  >
                  <span v-if="l.requirements.length > 3" class="text-caption text-grey-lighten-1">
                    +{{ l.requirements.length - 3 }} más
                  </span>
                </td>
                <td>
                  <template v-if="l.rating != null">
                    <span class="lender-stars" :aria-label="`${l.rating} de 5 según reseñas`">
                      <VIcon
                        v-for="n in starParts(l.rating).full"
                        :key="`f${n}`"
                        size="14"
                        color="amber"
                        >mdi-star</VIcon
                      >
                      <!-- eslint-disable-next-line vue/max-attributes-per-line -->
                      <VIcon v-if="starParts(l.rating).half" size="14" color="amber"
                        >mdi-star-half-full</VIcon
                      >
                      <VIcon
                        v-for="n in starParts(l.rating).empty"
                        :key="`e${n}`"
                        size="14"
                        color="grey"
                        >mdi-star-outline</VIcon
                      >
                    </span>
                    <small class="d-block text-grey-lighten-1">según reseñas</small>
                  </template>
                  <template v-else>—</template>
                </td>
                <td>
                  <a
                    :href="l.source"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="prestamos-link"
                  >
                    {{ hostOf(l.website) }}
                  </a>
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>

        <!-- Mobile: stacked cards -->
        <div class="d-md-none">
          <div v-for="l in group.items" :key="l.id" class="lender-card">
            <div class="d-flex align-center justify-space-between ga-2 mb-1">
              <span class="text-subtitle-1 font-weight-bold">{{ l.name }}</span>
              <span class="lender-rate">{{ teaLabel(l.teaPct) }}</span>
            </div>
            <dl class="lender-specs">
              <div>
                <dt>Monto máx.</dt>
                <dd>{{ amountLabel(l) }}</dd>
              </div>
              <div>
                <dt>Plazo máx.</dt>
                <dd>{{ termLabel(l.maxTermMonths) }}</dd>
              </div>
            </dl>
            <div v-if="l.requirements.length" class="mb-2">
              <p class="text-caption text-grey-lighten-1 mb-1">Requisitos:</p>
              <span
                v-for="(req, i) in l.requirements.slice(0, 2)"
                :key="i"
                class="prestamos-req-chip"
                >{{ req }}</span
              >
              <span v-if="l.requirements.length > 2" class="text-caption text-grey-lighten-1">
                +{{ l.requirements.length - 2 }} más
              </span>
            </div>
            <div v-if="l.rating != null" class="mb-2">
              <span class="lender-stars" :aria-label="`${l.rating} de 5 según reseñas`">
                <!-- eslint-disable vue/max-attributes-per-line -->
                <VIcon v-for="n in starParts(l.rating).full" :key="`f${n}`" size="14" color="amber"
                  >mdi-star</VIcon
                >
                <VIcon v-if="starParts(l.rating).half" size="14" color="amber"
                  >mdi-star-half-full</VIcon
                >
                <VIcon v-for="n in starParts(l.rating).empty" :key="`e${n}`" size="14" color="grey"
                  >mdi-star-outline</VIcon
                >
                <!-- eslint-enable vue/max-attributes-per-line -->
              </span>
              <small class="text-grey-lighten-1 ml-1">según reseñas</small>
            </div>
            <a
              :href="l.source"
              target="_blank"
              rel="noopener noreferrer"
              class="prestamos-link text-caption"
            >
              {{ hostOf(l.website) }}
            </a>
          </div>
        </div>
      </VCard>
    </div>

    <!-- Disclaimer -->
    <VAlert
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mt-4"
      icon="mdi-alert-outline"
    >
      Las tasas son <strong>de referencia y cambian con frecuencia</strong>. Este sitio es
      informativo y no constituye asesoramiento financiero; no tenemos afiliación con las entidades
      listadas. El BCU publica tasas medias y un tope de usura vigente (tasas medias del BCU) que
      limita lo que pueden cobrar las financieras de consumo. En préstamos pequeños, la TEA puede
      superar el 100%.
      <strong>Confirmá siempre el CFT/TEA final con la entidad antes de firmar.</strong>
      Las cooperativas requieren hacerse socio para acceder al crédito.
    </VAlert>

    <!-- Sources -->
    <VCard variant="flat" class="prestamos-section mt-4 pa-5">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes y referencias
      </h2>
      <ul class="prestamos-sources">
        <li v-for="(src, i) in officialSources" :key="'o' + i">
          <a :href="src.url" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
        </li>
        <li v-for="(src, i) in reviewSourcesList" :key="'r' + i">
          <a :href="src.url" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
        </li>
      </ul>
    </VCard>

    <!-- CTA -->
    <VCard class="cta-prestamos mt-6 pa-6 text-center" variant="flat">
      <h2 class="text-h6 font-weight-bold mb-2 text-white">¿Cuánto vas a pagar por mes?</h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        Usá la calculadora de préstamos: ingresá monto, tasa y plazo para ver la cuota mensual
        estimada y el costo total del crédito.
      </p>
      <VBtn
        :to="localePath('/herramientas/calculadora-prestamo')"
        color="primary"
        variant="elevated"
        class="cta-btn"
      >
        <VIcon start>mdi-calculator</VIcon>
        Calcular cuota de préstamo
      </VBtn>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import { LENDERS, teaLabel, LENDER_TYPES, type Lender } from '~/utils/loans'
import { starParts } from '~/utils/reviews'

const localePath = useLocalePath()

type ApiLender = Lender & { scrapedAt?: string }
const { data } = await useFetch<{ lenders: ApiLender[]; updatedAt: string | null }>(
  '/api/prestamos',
  {
    default: () => ({ lenders: LENDERS as ApiLender[], updatedAt: null }),
  }
)
const lenders = computed<ApiLender[]>(() => data.value?.lenders ?? (LENDERS as ApiLender[]))
const groups = computed(() =>
  (Object.keys(LENDER_TYPES) as Array<keyof typeof LENDER_TYPES>).map(type => ({
    type,
    label: LENDER_TYPES[type],
    items: lenders.value.filter(l => l.type === type),
  }))
)
const updatedAt = computed(() => data.value?.updatedAt ?? null)

/** Human date (es-UY) for the "actualizado" label. */
const updatedLabel = computed(() =>
  updatedAt.value
    ? new Date(updatedAt.value).toLocaleDateString('es-UY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null
)

/** Format a number with Uruguayan locale. */
function fmt(n: number): string {
  return n.toLocaleString('es-UY', { maximumFractionDigits: 0 })
}

/** Monto máximo cell: currency prefix + formatted amount or '—'. */
function amountLabel(l: ApiLender): string {
  if (l.maxAmount == null) return '—'
  const prefix = l.currency === 'USD' ? 'US$ ' : l.currency === 'UI' ? 'UI ' : '$ '
  return `${prefix}${fmt(l.maxAmount)}`
}

/** Plazo máximo cell. */
function termLabel(months: number | null): string {
  return months == null ? '—' : `${months} meses`
}

/** Bare host (without scheme / www) for compact source links. */
function hostOf(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

/** Icon per lender type. */
function groupIcon(type: string): string {
  const icons: Record<string, string> = {
    banco: 'mdi-bank',
    financiera: 'mdi-cash-multiple',
    cooperativa: 'mdi-handshake',
    fintech: 'mdi-cellphone-check',
  }
  return icons[type] ?? 'mdi-currency-usd'
}

// Deduplicated review sources across all lenders
const reviewSourcesList = computed(() => {
  const seen = new Set<string>()
  const out: Array<{ label: string; url: string }> = []
  for (const l of lenders.value) {
    for (const rs of l.reviewSources) {
      if (!seen.has(rs.url)) {
        seen.add(rs.url)
        out.push(rs)
      }
    }
  }
  return out
})

const officialSources = [
  {
    label: 'BCU — Tasas de interés del sistema financiero',
    url: 'https://www.bcu.gub.uy/Estadisticas-e-Indicadores/Paginas/Tasas-de-Interes.aspx',
  },
  {
    label: 'BCU — Tope de usura vigente',
    url: 'https://www.bcu.gub.uy/Estadisticas-e-Indicadores/Paginas/Tasa-de-Usura.aspx',
  },
  {
    label: 'BCU — Registro de Instituciones Financieras',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Registro-de-Instituciones-Financieras.aspx',
  },
  {
    label: 'MEF — Crédito de la Casa: tasas vigentes 2026',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/politicas-y-gestion/tasas-empresas-credito-casa-ano-2026',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/prestamos-uruguay'
const title = 'Dónde pedir un préstamo en Uruguay: bancos, financieras y cooperativas (2026)'
const description =
  'Comparativa de préstamos personales en Uruguay: tasas TEA de referencia, montos máximos, plazos y requisitos de BROU, Itaú, Creditel, OCA, Verde (FUCAC), ACAC, Prex y más. Fuentes: BCU y sitios oficiales.'

defineOgImageComponent('Cambio', {
  title: 'Préstamos en Uruguay',
  subtitle: 'Comparativa de bancos, financieras, cooperativas y fintech',
  tag: 'GUÍA',
})

useSeoMeta({
  title: () =>
    'Dónde pedir un préstamo en Uruguay: bancos, financieras y cooperativas (2026) | Cambio Uruguay',
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
        'prestamos uruguay, préstamo personal uruguay, tasa de interés uruguay, banco préstamo uruguay, financiera uruguay, cooperativa crédito uruguay, tea préstamo uruguay, bcu tasas',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ItemList',
            name: 'Entidades de crédito en Uruguay',
            itemListElement: lenders.value.map((l, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: l.name,
              url: l.website,
            })),
          },
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
                name: 'Préstamos en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: '¿Dónde puedo pedir un préstamo en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'En Uruguay podés solicitar préstamos personales en bancos (BROU, Itaú, Santander, Scotiabank, BBVA, HSBC), financieras (Creditel, Pronto!, OCA, Crediton, Microfin), cooperativas (Verde/FUCAC, ANDA, ACAC, FUCEREP, COFAC) y fintech (Prex, Midinero, Cash, Pago Después, PayFlex). Cada tipo de entidad tiene distintos requisitos y tasas.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Qué requisitos piden para un préstamo personal?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Los requisitos más comunes son: cédula de identidad vigente, comprobante de ingresos (recibo de sueldo o constancia de contador), tener entre 18 y 70-80 años (varía por entidad) y no tener antecedentes negativos en el Clearing o en el sistema financiero (BCU). Las cooperativas además exigen hacerse socio. Algunas financieras y fintech aprueban préstamos solo con cédula o sin comprobante de ingresos, pero a tasas más altas.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Qué entidad tiene la tasa más baja?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'En Uruguay las tasas más bajas generalmente las ofrecen las cooperativas (Verde/FUCAC y ANDA con TEA desde ~28%, ACAC desde ~29%) y los bancos con acreditación de sueldo (Scotiabank y BBVA ~36%). Las financieras y fintech suelen tener tasas más altas, especialmente para préstamos pequeños sin garantías. Para comparar, siempre pedí el CFT (Costo Financiero Total), que incluye todos los cargos.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cuál es la tasa de interés máxima legal en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'El BCU publica tasas medias del sistema financiero y un tope de usura que las entidades no pueden superar. En préstamos al consumo de montos pequeños (operaciones en pesos por menos de 10.000 UI), las financieras pueden cobrar más del 100% TEA, dentro del límite legal. Consultá los topes vigentes en el sitio del BCU antes de firmar cualquier contrato.',
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
.bg-gradient-prestamos {
  background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
}

/* Guard against any child forcing horizontal scroll. */
.prestamos-page {
  overflow-x: hidden;
}

.prestamos-intro {
  max-width: 760px;
  line-height: 1.6;
}

/* Let the CTA label wrap inside the button instead of spilling out on narrow screens. */
.cta-btn {
  height: auto;
  min-height: 44px;
  max-width: 100%;
  white-space: normal;
}
.cta-btn :deep(.v-btn__content) {
  white-space: normal;
  padding-block: 8px;
}

.prestamos-group-title {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}

.prestamos-card,
.prestamos-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.prestamos-table :deep(td),
.prestamos-table :deep(th) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.prestamos-sources {
  margin: 0;
  padding-left: 1.1rem;
}

.prestamos-sources li {
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.6;
}
.v-theme--light .prestamos-sources li {
  color: rgba(0, 0, 0, 0.78);
}

.prestamos-link,
.prestamos-sources a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}

.prestamos-link:hover,
.prestamos-sources a:hover {
  text-decoration: underline;
}

.cta-prestamos {
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid rgba(124, 58, 237, 0.28);
  border-radius: 12px;
}

/* Requirement chips */
.prestamos-req-chip {
  display: inline-block;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 0.72rem;
  padding: 1px 5px;
  margin: 1px 2px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.4;
}
.v-theme--light .prestamos-req-chip {
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.12);
  color: rgba(0, 0, 0, 0.75);
}

/* Mobile card layout for the lender comparison (replaces the table < md). */
.lender-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
}

.lender-card + .lender-card {
  margin-top: 12px;
}

.lender-rate {
  font-weight: 700;
  color: #7c3aed;
  white-space: nowrap;
  background: rgba(124, 58, 237, 0.12);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.lender-specs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0 0 8px;
}

.lender-specs dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.5);
}
.v-theme--light .lender-specs dt {
  color: rgba(0, 0, 0, 0.5);
}

.lender-specs dd {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}
.v-theme--light .lender-specs dd {
  color: rgba(0, 0, 0, 0.85);
}

.lender-stars {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}
</style>
