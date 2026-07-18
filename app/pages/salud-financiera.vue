<template>
  <div class="salud-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/herramientas')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Herramientas
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-salud pa-6 on-dark">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">mdi-heart-pulse</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              Salud financiera personal e ingresos extra en Uruguay
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 salud-intro">
              Hacé el diagnóstico de tu salud financiera en 2 minutos, descubrí ideas realistas para
              generar ingresos extra en Uruguay y aprendé los hábitos que ordenan tu plata. Con
              datos locales verificados sobre monotributo, impuestos e inflación.
            </p>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end mt-3">
          <ShareButtons text="Salud financiera personal e ingresos extra en Uruguay" />
        </div>
      </div>
    </VCard>

    <!-- ══ Sección 1: Diagnóstico interactivo ══ -->
    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-1 salud-section-title">
        <VIcon start size="small" color="primary">mdi-clipboard-pulse-outline</VIcon>
        Diagnóstico de salud financiera
      </h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        Marcá lo que ya cumplís. El puntaje se actualiza solo y es totalmente privado: no se guarda
        ni se envía a ningún lado.
      </p>

      <VRow>
        <!-- Score panel (sticky on desktop) -->
        <VCol cols="12" md="4" order="0" order-md="1">
          <VCard class="score-card pa-5 text-center" :style="scoreBorder">
            <VProgressCircular
              :model-value="result.score"
              :size="130"
              :width="12"
              :color="levelMeta.color"
            >
              <span class="score-number">{{ result.score }}</span>
            </VProgressCircular>
            <div class="mt-3">
              <VChip :color="levelMeta.color" variant="tonal" class="font-weight-bold">
                {{ levelMeta.label }}
              </VChip>
            </div>
            <p class="text-caption text-grey-lighten-1 mt-2 mb-3">
              {{ result.checkedCount }} de {{ result.totalCount }} hábitos saludables
            </p>
            <p class="text-body-2 score-advice">{{ levelMeta.advice }}</p>
            <VBtn
              v-if="checkedIds.length"
              variant="text"
              size="small"
              class="mt-2"
              @click="checkedIds = []"
            >
              <VIcon start size="small">mdi-refresh</VIcon>
              Reiniciar
            </VBtn>
          </VCard>
        </VCol>

        <!-- Pillars checklist -->
        <VCol cols="12" md="8" order="1" order-md="0">
          <VExpansionPanels v-model="openPanels" multiple variant="accordion" class="salud-panels">
            <VExpansionPanel v-for="pillar in pillars" :key="pillar.id" :value="pillar.id">
              <VExpansionPanelTitle>
                <div class="d-flex align-center ga-2">
                  <VIcon :color="pillarComplete(pillar) ? 'success' : 'primary'" size="small">
                    {{ pillarComplete(pillar) ? 'mdi-check-circle' : pillar.icon }}
                  </VIcon>
                  <span class="font-weight-bold">{{ pillar.title }}</span>
                  <span class="text-caption text-grey-lighten-1">
                    {{ pillarCount(pillar) }}/{{ pillar.items.length }}
                  </span>
                </div>
              </VExpansionPanelTitle>
              <VExpansionPanelText>
                <p class="text-body-2 text-grey-lighten-1 mb-3">{{ pillar.summary }}</p>
                <div v-for="item in pillar.items" :key="item.id" class="salud-item">
                  <VCheckbox
                    v-model="checkedIds"
                    :value="item.id"
                    color="primary"
                    density="comfortable"
                    hide-details
                  >
                    <template #label>
                      <span class="text-body-2">{{ item.label }}</span>
                    </template>
                  </VCheckbox>
                  <p v-if="item.tip" class="salud-tip">
                    <VIcon size="13" color="primary">mdi-lightbulb-outline</VIcon>
                    {{ item.tip }}
                  </p>
                </div>
                <p v-if="pillar.id === 'ahorro'" class="text-caption text-grey-lighten-1 mt-1 mb-0">
                  Lo que rinde tu ahorro también paga IRPF: hasta 0,5% en un plazo fijo largo en
                  pesos, 12% en la mayoría de las rentas de capital. Mirá cuánto te toca en la
                  <NuxtLink :to="localePath('/impuestos-inversiones-uruguay')" class="salud-link">
                    guía de impuestos sobre inversiones
                  </NuxtLink>
                  .
                </p>
              </VExpansionPanelText>
            </VExpansionPanel>
          </VExpansionPanels>
        </VCol>
      </VRow>
    </section>

    <!-- ══ Sección 2: Ideas de ingresos extra ══ -->
    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-1 salud-section-title">
        <VIcon start size="small" color="primary">mdi-cash-plus</VIcon>
        Ideas de ingresos extra en Uruguay
      </h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        {{ INCOME_IDEAS.length }} formas realistas de sumar ingresos, con el esfuerzo, el capital y
        el detalle local que necesitás para empezar.
      </p>

      <div v-for="group in incomeGroups" :key="group.category" class="mb-5">
        <h3 class="text-subtitle-1 font-weight-bold mb-3 salud-group-title">
          <VIcon start size="small" color="primary">{{ incomeIcon(group.category) }}</VIcon>
          {{ group.label }}
        </h3>
        <VRow>
          <VCol v-for="idea in group.items" :key="idea.id" cols="12" md="6">
            <VCard class="idea-card pa-4 h-100" variant="flat">
              <div class="d-flex align-start justify-space-between ga-2 mb-2">
                <span class="text-subtitle-2 font-weight-bold">{{ idea.name }}</span>
                <VChip
                  :color="effortColor(idea.effort)"
                  size="x-small"
                  variant="tonal"
                  class="flex-shrink-0"
                >
                  Esfuerzo {{ effortLabel(idea.effort).toLowerCase() }}
                </VChip>
              </div>
              <dl class="idea-specs">
                <div>
                  <dt>Capital inicial</dt>
                  <dd>{{ idea.startupCapital }}</dd>
                </div>
                <div>
                  <dt>Potencial</dt>
                  <dd>{{ idea.incomePotential }}</dd>
                </div>
                <div>
                  <dt>Primer ingreso</dt>
                  <dd>{{ idea.timeToFirst }}</dd>
                </div>
              </dl>
              <p class="text-body-2 idea-note mb-2">
                <strong>Cómo empezar:</strong> {{ idea.howToStart }}
              </p>
              <p class="text-body-2 idea-note idea-uy mb-2">
                <VIcon size="14" color="primary">mdi-map-marker-outline</VIcon>
                {{ idea.uyNote }}
              </p>
              <p v-if="idea.risks" class="text-caption idea-risk mb-0">
                <VIcon size="13" color="warning">mdi-alert-outline</VIcon>
                {{ idea.risks }}
              </p>
              <div v-if="idea.skills?.length" class="mt-2 d-flex flex-wrap ga-1">
                <VChip v-for="s in idea.skills" :key="s" size="x-small" variant="outlined">{{
                  s
                }}</VChip>
              </div>
            </VCard>
          </VCol>
        </VRow>
      </div>
    </section>

    <!-- ══ Sección 3: Datos útiles de Uruguay ══ -->
    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-1 salud-section-title">
        <VIcon start size="small" color="primary">mdi-book-information-variant</VIcon>
        Datos útiles de Uruguay
      </h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        Reglas locales verificadas contra fuentes oficiales (DGI, BPS, BCU). Los datos cambian cada
        año: confirmá las cifras vigentes antes de decidir.
      </p>

      <!-- Live key figures (refreshed daily via Gemini; static baseline fallback) -->
      <VCard variant="flat" class="salud-section pa-4 pa-sm-5 mb-3">
        <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
          <span class="text-subtitle-2 font-weight-bold">
            <VIcon size="18" color="primary" class="mr-1">mdi-chart-timeline-variant</VIcon>
            Indicadores clave, al día
          </span>
          <VChip v-if="figuresUpdated" size="x-small" color="success" variant="tonal">
            <VIcon start size="12">mdi-autorenew</VIcon>
            Actualizado el {{ figuresUpdated }}
          </VChip>
        </div>
        <div class="fig-grid">
          <div class="fig-tile">
            <span class="fig-label">Salario mínimo</span>
            <span class="fig-value">{{ formatUYU(figures.salarioMinimo) }}</span>
          </div>
          <div class="fig-tile">
            <span class="fig-label">BPC</span>
            <span class="fig-value">{{ formatUYU(figures.bpc) }}</span>
          </div>
          <div class="fig-tile">
            <span class="fig-label">Inflación anual</span>
            <span class="fig-value">{{ figures.inflacionAnual }}%</span>
          </div>
          <div class="fig-tile">
            <span class="fig-label">Boleto STM</span>
            <span class="fig-value">{{ formatUYU(figures.boletoStm) }}</span>
          </div>
        </div>
        <p class="text-caption text-grey-lighten-1 mb-0 mt-3">
          Se actualizan solos a diario con datos oficiales. Para la UI, la UR y más, mirá
          <NuxtLink :to="localePath('/indicadores')" class="salud-link">Indicadores</NuxtLink>.
        </p>
      </VCard>

      <VCard variant="flat" class="salud-section pa-4 pa-sm-5">
        <div v-for="(f, i) in facts" :key="i" class="salud-fact">
          <p class="text-body-2 mb-1">{{ f.fact }}</p>
          <div class="d-flex align-center ga-2 flex-wrap">
            <VChip v-if="f.official" size="x-small" color="success" variant="tonal">
              <VIcon start size="12">mdi-check-decagram-outline</VIcon>
              Dato oficial
            </VChip>
            <VChip v-else size="x-small" color="info" variant="tonal">Guía general</VChip>
            <a
              :href="f.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="salud-link text-caption"
            >
              {{ f.sourceLabel }}
              <VIcon size="12">mdi-open-in-new</VIcon>
            </a>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Calculators strip -->
    <section class="mb-8">
      <h2 class="text-subtitle-1 font-weight-bold mb-3 salud-group-title">
        <VIcon start size="small" color="primary">mdi-calculator-variant-outline</VIcon>
        Calculadoras que te ayudan
      </h2>
      <VRow>
        <VCol v-for="tool in calcTools" :key="tool.to" cols="6" md="3">
          <VCard
            :to="localePath(tool.to)"
            class="calc-card pa-3 text-center h-100"
            hover
            variant="flat"
          >
            <VIcon color="primary" class="mb-1">{{ tool.icon }}</VIcon>
            <p class="text-caption font-weight-medium mb-0">{{ tool.label }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Disclaimer -->
    <VAlert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mt-4"
      icon="mdi-information-outline"
    >
      Esta página es <strong>informativa y educativa</strong>; no constituye asesoramiento
      financiero, legal ni tributario. El diagnóstico es una autoevaluación orientativa. Para tu
      caso particular —especialmente al formalizar un emprendimiento o declarar impuestos— consultá
      con un contador y las fuentes oficiales.
    </VAlert>

    <!-- Cross-links -->
    <VRow class="my-6">
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/inversiones-uruguay')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-chart-areaspline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">¿Ya ordenaste tus finanzas? Invertí</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Guía de bancos, brokers, renta fija, fondos y cripto, y cómo invertir en proyectos
            uruguayos.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/economia-uruguay')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-chart-box-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Entendé el contexto económico</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Noticias de economía de Uruguay por área e informe con IA.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/saldar-deudas-uruguay')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-handshake-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Saldar deudas</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Negociá una quita, compará servicios y reconstruí tu historial.
          </p>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<script setup lang="ts">
import {
  INCOME_IDEAS,
  UY_FACTS,
  HEALTH_PILLARS,
  HEALTH_LEVELS,
  incomeIdeasByCategory,
  effortLabel,
  scoreHealth,
  type HealthPillar,
  type IncomeCategory,
  type EffortLevel,
} from '~/utils/personalFinance'
import { formatUYU } from '~/utils/format'

const localePath = useLocalePath()

const pillars = HEALTH_PILLARS
const facts = UY_FACTS
const incomeGroups = computed(() => incomeIdeasByCategory())

// Live national figures, refreshed daily via Gemini (static baseline fallback).
interface UyFiguresResp {
  salarioMinimo: number
  bpc: number
  boletoStm: number
  inflacionAnual: number
  asOf: string | null
}
const { data: figures } = await useFetch<UyFiguresResp>('/api/uy-figures', {
  key: 'uy-figures',
  default: () => ({
    salarioMinimo: 25383,
    bpc: 6864,
    boletoStm: 52,
    inflacionAnual: 4.3,
    asOf: null,
  }),
})
const figuresUpdated = computed(() => {
  const iso = figures.value?.asOf
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long' })
})

// Interactive checklist state (client-side, private — never persisted).
const checkedIds = ref<string[]>([])
const openPanels = ref<string[]>([HEALTH_PILLARS[0]?.id].filter(Boolean) as string[])

const result = computed(() => scoreHealth(checkedIds.value))
const levelMeta = computed(() => HEALTH_LEVELS[result.value.level])
const scoreBorder = computed(() => ({
  borderColor: `rgb(var(--v-theme-${levelMeta.value.color}))`,
}))

const pillarCount = (pillar: HealthPillar) =>
  pillar.items.filter(i => checkedIds.value.includes(i.id)).length
const pillarComplete = (pillar: HealthPillar) => pillarCount(pillar) === pillar.items.length

function effortColor(e: EffortLevel): string {
  return e === 'bajo' ? 'success' : e === 'medio' ? 'warning' : 'error'
}

function incomeIcon(category: IncomeCategory): string {
  const icons: Record<IncomeCategory, string> = {
    digital_freelance: 'mdi-laptop',
    servicios_locales: 'mdi-hand-heart-outline',
    comercio_reventa: 'mdi-cart-outline',
    alquiler_activos: 'mdi-key-chain-variant',
    contenido_creador: 'mdi-video-outline',
    micro_negocio: 'mdi-storefront-outline',
  }
  return icons[category] ?? 'mdi-cash'
}

const calcTools = [
  {
    to: '/herramientas/calculadora-irpf',
    icon: 'mdi-account-cash-outline',
    label: 'IRPF del sueldo',
  },
  { to: '/herramientas/calculadora-aguinaldo', icon: 'mdi-gift-outline', label: 'Aguinaldo' },
  {
    to: '/herramientas/calculadora-plazo-fijo',
    icon: 'mdi-piggy-bank-outline',
    label: 'Plazo fijo',
  },
  { to: '/herramientas/calculadora-inflacion', icon: 'mdi-trending-up', label: 'Inflación' },
]

const canonicalUrl = 'https://cambio-uruguay.com/salud-financiera'
const title =
  'Salud financiera personal e ingresos extra en Uruguay: diagnóstico, ideas y hábitos (2026)'
const description =
  'Test de salud financiera personal + ideas realistas de ingresos extra en Uruguay (freelance, delivery, reventa, alquiler, contenido, emprendimientos) y datos locales verificados sobre monotributo, IRPF, BPS e inflación. Ordená tu plata y ganá más.'

defineOgImageComponent('Cambio', {
  title: 'Salud financiera e ingresos extra',
  subtitle: 'Diagnóstico + ideas para Uruguay',
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
        'salud financiera uruguay, ingresos extra uruguay, ganar dinero extra uruguay, finanzas personales uruguay, monotributo uruguay, fondo de emergencia, presupuesto personal, 50 30 20, emprender uruguay',
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
              { '@type': 'ListItem', position: 2, name: 'Salud financiera', item: canonicalUrl },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Ideas de ingresos extra en Uruguay',
            itemListElement: INCOME_IDEAS.map((i, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: i.name,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: '¿Cómo generar ingresos extra en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Hay opciones para todos los perfiles: trabajo freelance digital (Workana, Upwork), delivery o cadetería (PedidosYa, Rappi), reventa en MercadoLibre, clases particulares, alquiler temporario (Airbnb) o de activos que ya tenés, creación de contenido y micro-emprendimientos como comida casera o artesanías. Cuando el ingreso se vuelve regular conviene formalizarse con monotributo o empresa unipersonal (BPS/DGI) para poder facturar y tener aportes.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cuánto dinero debería tener en el fondo de emergencia?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'La guía general de educación financiera es tener entre 3 y 6 meses de tus gastos esenciales en un lugar líquido y protegido de la inflación (por ejemplo en UI o dólares). Si tenés ingresos variables, como freelancers o quienes viven de changas, conviene apuntar al extremo superior de 6 meses.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Qué es el monotributo en Uruguay y cuándo conviene?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'El monotributo es un régimen simplificado que unifica en un solo pago los aportes a BPS y los impuestos de DGI, pensado para emprendimientos de reducida dimensión. En 2025 el tope de ingresos anuales es de 183.000 UI (aproximadamente 1.129.055 pesos) para el monotributista unipersonal. Conviene cuando empezás a facturar de forma regular con un negocio chico; por encima del tope se pasa a empresa unipersonal con IVA e IRPF.',
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
.bg-gradient-salud {
  background: linear-gradient(135deg, #7c3aed 0%, #1e3a8a 100%);
}

.fig-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
@media (min-width: 600px) {
  .fig-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
.fig-tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.fig-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.fig-value {
  font-size: 1.15rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-primary));
}

.salud-page {
  overflow-x: hidden;
}

.salud-intro {
  max-width: 780px;
  line-height: 1.6;
}

.salud-section-title,
.salud-group-title {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}

/* Score panel */
.score-card {
  position: sticky;
  top: 84px;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
}
.v-theme--light .score-card {
  background: rgba(0, 0, 0, 0.02);
}
.score-number {
  font-size: 2.2rem;
  font-weight: 800;
}
.score-advice {
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.5;
}
.v-theme--light .score-advice {
  color: rgba(0, 0, 0, 0.78);
}

.salud-panels {
  border-radius: 12px;
}
.salud-item {
  margin-bottom: 2px;
}
.salud-tip {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.55);
  margin: -4px 0 8px 40px;
  line-height: 1.4;
}
.v-theme--light .salud-tip {
  color: rgba(0, 0, 0, 0.55);
}

/* Income idea cards */
.idea-card,
.salud-section,
.calc-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.v-theme--light .idea-card,
.v-theme--light .salud-section,
.v-theme--light .calc-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}
.calc-card {
  text-decoration: none;
  transition: transform 0.2s ease;
}
.calc-card:hover {
  transform: translateY(-2px);
}

.idea-specs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px 12px;
  margin: 0 0 8px;
}
.idea-specs dt {
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(255, 255, 255, 0.5);
}
.v-theme--light .idea-specs dt {
  color: rgba(0, 0, 0, 0.5);
}
.idea-specs dd {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.3;
}
.v-theme--light .idea-specs dd {
  color: rgba(0, 0, 0, 0.82);
}

.idea-note {
  font-size: 0.84rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.8);
}
.v-theme--light .idea-note {
  color: rgba(0, 0, 0, 0.78);
}
.idea-uy {
  color: rgba(255, 255, 255, 0.72);
}
.v-theme--light .idea-uy {
  color: rgba(0, 0, 0, 0.7);
}
.idea-risk {
  color: rgba(255, 193, 7, 0.85);
  line-height: 1.4;
}

.salud-fact {
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.salud-fact:last-child {
  border-bottom: none;
}
.v-theme--light .salud-fact {
  border-bottom-color: rgba(0, 0, 0, 0.06);
}

.salud-link,
.calc-card p {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.salud-link:hover {
  text-decoration: underline;
}
.calc-card p {
  color: inherit;
}

.cross-link {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  text-decoration: none;
  transition: transform 0.2s ease;
}
.cross-link:hover {
  transform: translateY(-2px);
}
.v-theme--light .cross-link {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}
</style>
