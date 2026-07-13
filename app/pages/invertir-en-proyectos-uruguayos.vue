<template>
  <div class="proyectos-page pb-8">
    <!-- Breadcrumb: this page is the local-projects companion to /inversiones-uruguay -->
    <div class="mb-3">
      <VBtn :to="localePath('/inversiones-uruguay')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Inversiones en Uruguay
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-proyectos pa-6">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">mdi-sprout-outline</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              Invertir en proyectos uruguayos: crowdfunding, deuda de empresas, fideicomisos, agro y
              más
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 proyectos-intro">
              Guía de las formas reguladas (y algunas no reguladas, con su advertencia) de poner tu
              dinero a trabajar en la economía real de Uruguay: obligaciones negociables de
              empresas, fideicomisos de forestación e infraestructura, agro, inmobiliario, startups
              y economía social. Datos verificados y fact-checkeados en julio de 2026.
            </p>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end mt-3">
          <ShareButtons
            text="Invertir en proyectos uruguayos: crowdfunding, deuda, fideicomisos, agro y más"
          />
        </div>
      </div>
    </VCard>

    <!-- Framing -->
    <VAlert type="info" variant="tonal" density="comfortable" class="mb-4" icon="mdi-scale-balance">
      A diferencia de un banco o un broker internacional, acá el dinero financia
      <strong>proyectos y empresas locales</strong>. Fijate siempre en dos cosas:
      <strong>regulación</strong> —si el instrumento es de
      <strong>oferta pública supervisada por el BCU</strong> (inscripto en el Registro de Mercado de
      Valores) o un contrato <strong>privado sin supervisor</strong>— y <strong>liquidez</strong>,
      porque la mayoría de estos instrumentos se mantienen hasta el vencimiento y no se venden fácil
      antes. Una renta "fija" alta sobre un activo real y sin registro ante el BCU es una señal de
      alarma.
    </VAlert>

    <VAlert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
      icon="mdi-file-percent-outline"
    >
      Cada instrumento de esta guía tiene su propia carga de IRPF —mirá el detalle de "Impuestos" en
      cada ficha—; para entender la lógica general (tasas, exoneraciones, cómo se declara), consultá
      la
      <NuxtLink :to="localePath('/impuestos-inversiones-uruguay')">
        guía de impuestos sobre inversiones
      </NuxtLink>
      .
    </VAlert>

    <!-- Comparison groups -->
    <div v-for="group in groups" :key="group.category" class="mb-6">
      <h2 class="text-h6 font-weight-bold mb-3 proyectos-group-title">
        <VIcon start size="small" color="primary">{{ groupIcon(group.category) }}</VIcon>
        {{ group.label }}
      </h2>

      <VCard
        v-for="p in group.items"
        :key="p.id"
        class="proyecto-card pa-4 pa-sm-5 mb-3"
        :class="{ 'proyecto-caution': p.caution }"
      >
        <div class="d-flex align-start justify-space-between ga-3 flex-wrap mb-2">
          <div class="d-flex align-center ga-2 flex-wrap">
            <VIcon v-if="p.caution" color="warning" size="small">mdi-alert-outline</VIcon>
            <span class="text-subtitle-1 font-weight-bold">{{ p.name }}</span>
            <VChip
              v-if="p.verified && !p.caution"
              size="x-small"
              color="success"
              variant="tonal"
              class="font-weight-medium"
            >
              <VIcon start size="12">mdi-check-decagram-outline</VIcon>
              Verificado
            </VChip>
          </div>
          <span class="proyecto-risk" :class="`risk-${p.riskLevel}`">
            Riesgo {{ lpRiskLabel(p.riskLevel) }}
          </span>
        </div>

        <dl class="proyecto-specs">
          <div>
            <dt>Mín. inversión</dt>
            <dd>{{ lpMinInvestmentLabel(p) }}</dd>
          </div>
          <div>
            <dt>Regulación</dt>
            <dd>
              <VChip
                size="x-small"
                :color="regColor(p.regulation)"
                variant="tonal"
                class="font-weight-medium"
              >
                {{ lpRegulationBadge(p.regulation) }}
              </VChip>
            </dd>
          </div>
          <div>
            <dt>Liquidez</dt>
            <dd class="proyecto-note-inline">{{ p.liquidity }}</dd>
          </div>
          <div>
            <dt>Horizonte</dt>
            <dd class="proyecto-note-inline">{{ p.horizon }}</dd>
          </div>
        </dl>

        <p class="text-caption text-grey-lighten-1 mb-1 mt-2">Regulación:</p>
        <p class="text-body-2 mb-2 proyecto-note">{{ p.regulationNote }}</p>
        <p class="text-caption text-grey-lighten-1 mb-1">Impuestos:</p>
        <p class="text-body-2 mb-2 proyecto-note">{{ p.taxNote }}</p>
        <p class="text-body-2 mb-2 proyecto-note">{{ p.note }}</p>

        <a
          v-if="p.website"
          :href="p.website"
          target="_blank"
          rel="noopener noreferrer"
          class="proyecto-link text-caption"
        >
          {{ hostOf(p.website) }}
          <VIcon size="13">mdi-open-in-new</VIcon>
        </a>
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
      Esta guía es
      <strong>informativa y no constituye asesoramiento financiero, legal ni tributario</strong>; no
      tenemos afiliación con las entidades listadas. Varias opciones son de
      <strong>riesgo alto</strong> y baja liquidez, y una de ellas se incluye únicamente
      <strong>como advertencia</strong> por los colapsos ocurridos. Antes de invertir, verificá la
      inscripción en el Registro de Mercado de Valores del BCU, las condiciones vigentes de cada
      emisión y el tratamiento impositivo con un contador. Rentabilidades pasadas no garantizan
      resultados futuros.
    </VAlert>

    <!-- Sources -->
    <VCard variant="flat" class="proyectos-section mt-4 pa-5">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes y referencias
      </h2>
      <ul class="proyectos-sources">
        <li v-for="(src, i) in sources" :key="'s' + i">
          <a :href="src.url" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
        </li>
      </ul>
    </VCard>

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
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Inversiones en Uruguay</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Bancos, brokers, renta fija, fondos y cripto: la guía general de inversión.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/salud-financiera')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-heart-pulse</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Salud financiera</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Ordená tus finanzas y generá ingresos extra antes de invertir.
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
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Economía de Uruguay</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Noticias por área e informe con IA para entender el contexto.
          </p>
        </VCard>
      </VCol>
    </VRow>

    <!-- CTA -->
    <VCard class="cta-proyectos mt-6 pa-6 text-center" variant="flat">
      <h2 class="text-h6 font-weight-bold mb-2 text-white">¿Cuánto rendiría tu inversión?</h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        Simulá el interés compuesto de un plazo o convertí tu dinero a la moneda que necesitás con
        nuestras herramientas.
      </p>
      <div class="d-flex justify-center flex-wrap ga-3">
        <VBtn
          :to="localePath('/herramientas/calculadora-plazo-fijo')"
          color="primary"
          variant="elevated"
          class="cta-btn"
        >
          <VIcon start>mdi-calculator</VIcon>
          Calcular rendimiento
        </VBtn>
        <VBtn :to="localePath('/convertir')" variant="outlined" class="cta-btn cta-btn-outline">
          <VIcon start>mdi-swap-horizontal</VIcon>
          Convertir moneda
        </VBtn>
      </div>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import {
  LOCAL_PROJECTS,
  LOCAL_PROJECT_SOURCES,
  localProjectsByCategory,
  lpRiskLabel,
  lpMinInvestmentLabel,
  lpRegulationBadge,
  type LocalProjectCategory,
  type LpRegulation,
} from '~/utils/localProjects'

const localePath = useLocalePath()
const groups = computed(() => localProjectsByCategory())
const sources = LOCAL_PROJECT_SOURCES

function hostOf(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

function regColor(regulation: LpRegulation): string {
  if (regulation === 'bcu') return 'success'
  if (regulation === 'exterior_regulado') return 'info'
  return 'warning'
}

function groupIcon(category: LocalProjectCategory): string {
  const icons: Record<LocalProjectCategory, string> = {
    crowdfunding_financiero: 'mdi-account-group-outline',
    obligaciones_negociables: 'mdi-file-certificate-outline',
    fideicomisos: 'mdi-bank-outline',
    energia_forestacion: 'mdi-pine-tree',
    agro: 'mdi-cow',
    inmobiliario_local: 'mdi-home-city-outline',
    startups_venture: 'mdi-rocket-launch-outline',
    economia_social: 'mdi-handshake-outline',
  }
  return icons[category] ?? 'mdi-finance'
}

const canonicalUrl = 'https://cambio-uruguay.com/invertir-en-proyectos-uruguayos'
const title =
  'Invertir en proyectos uruguayos: crowdfunding, obligaciones negociables, fideicomisos, agro y más (2026)'
const description =
  'Guía de las formas de invertir en proyectos y empresas de Uruguay: crowdfunding (Crowder), obligaciones negociables, fideicomisos de forestación e infraestructura, agro, inmobiliario al costo, startups y cooperativas. Regulación BCU, riesgos, liquidez e impuestos, con advertencia sobre los pooles ganaderos.'

defineOgImageComponent('Cambio', {
  title: 'Invertir en proyectos uruguayos',
  subtitle: 'Crowdfunding, deuda de empresas, fideicomisos, agro y más',
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
        'invertir en proyectos uruguayos, crowdfunding uruguay, crowder, obligaciones negociables uruguay, fideicomiso financiero uruguay, invertir en agro uruguay, forestacion uruguay inversion, invertir en startups uruguay, economia real uruguay',
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
            name: 'Formas de invertir en proyectos uruguayos',
            itemListElement: LOCAL_PROJECTS.map((p, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: p.name,
              url: p.website || canonicalUrl,
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
                name: 'Inversiones en Uruguay',
                item: 'https://cambio-uruguay.com/inversiones-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Invertir en proyectos uruguayos',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: '¿Cómo se puede invertir en proyectos de empresas uruguayas?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'A través de instrumentos de oferta pública inscriptos en el Registro de Mercado de Valores del BCU: obligaciones negociables de empresas uruguayas (con mínimos desde USD 1.000 en algunas emisiones), plataformas de crowdfunding autorizadas como Crowder, y fideicomisos financieros de forestación, energía e infraestructura. Se opera mediante un corredor de bolsa o la plataforma habilitada. También existen vías privadas (fideicomiso inmobiliario al costo, capital de startups) sin supervisor de valores, donde la diligencia recae en el inversor.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Es seguro invertir en pooles ganaderos con renta fija?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Los pooles ganaderos privados que prometían una renta fija sobre el ganado no estaban supervisados por el BCU ni eran valores de oferta pública. En 2025 varios colapsaron (Conexión Ganadera, con un déficit patrimonial de cientos de millones de dólares y miles de damnificados, Grupo Larrarte y República Ganadera). Una renta "fija" alta sobre un activo real, sumada a la ausencia de registro ante el BCU, es una señal de alarma. La vía regulada para invertir en agro son los fideicomisos financieros ganaderos de oferta pública inscriptos en el Registro de Mercado de Valores.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Los intereses de las obligaciones negociables pagan impuestos en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Sí. El interés cobrado directamente por una persona física residente por obligaciones negociables no está exento de IRPF: tributa a una tasa reducida (0,5% para instrumentos en pesos a tasa fija a más de 3 años, 7% en moneda extranjera a más de 3 años por suscripción pública con cotización) o al 12% general en los demás casos. La exención plena de IRPF aplica a las rentas distribuidas por fondos de inversión y fideicomisos financieros, no al interés cobrado directamente por el tenedor. Consultá siempre con un contador.',
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
.bg-gradient-proyectos {
  background: linear-gradient(135deg, #166534 0%, #0f766e 100%);
}

.proyectos-page {
  overflow-x: hidden;
}

.proyectos-intro {
  max-width: 780px;
  line-height: 1.6;
}

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
.cta-btn-outline {
  border-color: rgba(255, 255, 255, 0.4);
  color: #fff;
}

.proyectos-group-title {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}

.proyecto-card,
.proyectos-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.v-theme--light .proyecto-card,
.v-theme--light .proyectos-section {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}

.proyecto-caution {
  background: rgba(255, 152, 0, 0.08);
  border-color: rgba(255, 152, 0, 0.35);
}
.v-theme--light .proyecto-caution {
  background: rgba(255, 152, 0, 0.08);
  border-color: rgba(255, 152, 0, 0.4);
}

.proyecto-note {
  font-size: 0.85rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.78);
}
.v-theme--light .proyecto-note {
  color: rgba(0, 0, 0, 0.78);
}

.proyecto-note-inline {
  font-size: 0.82rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.82);
}
.v-theme--light .proyecto-note-inline {
  color: rgba(0, 0, 0, 0.8);
}

.proyecto-risk {
  font-weight: 700;
  white-space: nowrap;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 0.82rem;
}
.risk-bajo {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.14);
}
.risk-medio {
  color: #d97706;
  background: rgba(217, 119, 6, 0.14);
}
.risk-alto {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.14);
}
.risk-variable {
  color: #7c4dff;
  background: rgba(124, 77, 255, 0.14);
}

.proyecto-specs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 16px;
  margin: 0 0 4px;
}
@media (min-width: 600px) {
  .proyecto-specs {
    grid-template-columns: repeat(4, 1fr);
  }
}
.proyecto-specs dt {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 2px;
}
.v-theme--light .proyecto-specs dt {
  color: rgba(0, 0, 0, 0.5);
}
.proyecto-specs dd {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
}
.v-theme--light .proyecto-specs dd {
  color: rgba(0, 0, 0, 0.85);
}

.proyectos-sources {
  margin: 0;
  padding-left: 1.1rem;
}
.proyectos-sources li {
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.6;
}
.v-theme--light .proyectos-sources li {
  color: rgba(0, 0, 0, 0.78);
}

.proyecto-link,
.proyectos-sources a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.proyecto-link:hover,
.proyectos-sources a:hover {
  text-decoration: underline;
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

.cta-proyectos {
  background: rgba(22, 101, 52, 0.14);
  border: 1px solid rgba(22, 101, 52, 0.3);
  border-radius: 12px;
}
</style>
