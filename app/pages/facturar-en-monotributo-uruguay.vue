<template>
  <VContainer class="mono-invoicing-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">EMPRESAS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Facturar en Monotributo: talonario o factura electrónica
      </h1>
      <p class="lead mb-6">
        La duda llega siempre con la premisa dada vuelta: se supone que el papel es la obligación y
        que lo electrónico sería la salida barata. Es al revés. Si estás en
        <strong>Monotributo</strong> o en <strong>Monotributo Social MIDES</strong>, DGI te exceptúa
        de emitir comprobantes electrónicos, y el talonario es el camino barato. Pasarte a CFE es
        legal, pero suma costos que en tu caso nadie subsidia.
      </p>

      <VCard class="idea-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-2">La respuesta corta</div>
        <p class="mb-0">{{ CORE_ANSWER }}</p>
      </VCard>
    </header>

    <!-- Los dos caminos -->
    <section id="caminos" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los dos caminos, con sus costos reales</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        No compiten en igualdad de condiciones: uno es un gasto de imprenta que se repite cuando se
        te acaba el talonario, y el otro son dos gastos que no paran mientras seas emisor.
      </p>

      <VRow>
        <VCol v-for="r in ROUTES" :key="r.id" cols="12" md="6">
          <VCard :id="r.id" variant="flat" class="route-card pa-5 pa-md-6 h-100 d-flex flex-column">
            <div class="text-overline text-medium-emphasis">{{ r.status }}</div>
            <h3 class="text-h6 font-weight-bold mb-3">{{ r.title }}</h3>
            <p class="mb-4">{{ r.detail }}</p>

            <div class="text-subtitle-2 font-weight-bold mb-2">Qué se paga</div>
            <ul class="tight-list mb-4">
              <li v-for="(c, i) in r.costs" :key="i">{{ c }}</li>
            </ul>

            <VRow class="mb-2">
              <VCol cols="12" sm="6">
                <div class="text-subtitle-2 font-weight-bold mb-2">A favor</div>
                <ul class="tight-list mb-0">
                  <li v-for="(p, i) in r.pros" :key="i">{{ p }}</li>
                </ul>
              </VCol>
              <VCol cols="12" sm="6">
                <div class="text-subtitle-2 font-weight-bold mb-2">En contra</div>
                <ul class="tight-list mb-0">
                  <li v-for="(c, i) in r.cons" :key="i">{{ c }}</li>
                </ul>
              </VCol>
            </VRow>

            <VAlert type="info" variant="tonal" density="comfortable" class="mt-auto mb-0">
              {{ r.verdict }}
            </VAlert>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Calculadora -->
    <section id="calculadora" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto te sale cada uno, con tus números</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Ni las imprentas ni los facturadores publican tarifas: se cotiza caso por caso. Por eso acá
        no hay precios inventados de fondo — poné lo que te coticen a vos y la cuenta se hace sola.
      </p>

      <VCard variant="flat" class="calc-card pa-5 pa-md-6">
        <VRow>
          <VCol cols="12" md="6">
            <div class="text-subtitle-1 font-weight-bold mb-3">Talonario</div>
            <VRow>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="form.talonarioPrecio"
                  label="Presupuesto de la imprenta"
                  prefix="$"
                  type="number"
                  min="0"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  data-testid="input-talonario"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="form.juegos"
                  label="Comprobantes que trae"
                  type="number"
                  min="1"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  data-testid="input-juegos"
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model.number="form.comprobantesPorMes"
                  label="Comprobantes que emitís por mes"
                  type="number"
                  min="0"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  data-testid="input-por-mes"
                />
              </VCol>
            </VRow>
          </VCol>

          <VCol cols="12" md="6">
            <div class="text-subtitle-1 font-weight-bold mb-3">Factura electrónica</div>
            <VRow>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="form.certificadoPrecio"
                  label="Certificado digital"
                  prefix="$"
                  type="number"
                  min="0"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  hint="Lo que te cotice Abitab, Correo o Antel"
                  data-testid="input-certificado"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="form.certificadoMeses"
                  label="Vigencia del certificado"
                  suffix="meses"
                  type="number"
                  min="1"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model.number="form.abonoMensual"
                  label="Abono mensual del facturador"
                  prefix="$"
                  type="number"
                  min="0"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  data-testid="input-abono"
                />
              </VCol>
            </VRow>
          </VCol>
        </VRow>

        <VDivider class="my-6" />

        <VRow>
          <VCol cols="12" sm="6" md="3">
            <div class="metric-label">Talonario, por mes</div>
            <div class="metric-value" data-testid="out-talonario">
              {{ formatUYU(result.talonarioMensual, 0) }}
            </div>
            <div class="metric-note">
              {{ formatUYU(result.talonarioPorComprobante, 0) }} por comprobante
            </div>
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <div class="metric-label">Electrónico, por mes</div>
            <div class="metric-value" data-testid="out-cfe">
              {{ formatUYU(result.cfeMensual, 0) }}
            </div>
            <div class="metric-note">
              {{
                result.cfePorComprobante === null
                  ? 'sin comprobantes declarados'
                  : `${formatUYU(result.cfePorComprobante, 0)} por comprobante`
              }}
            </div>
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <div class="metric-label">El talonario te dura</div>
            <div class="metric-value">
              {{
                result.mesesQueDura === null ? '—' : `${formatNumber(result.mesesQueDura, 1)} meses`
              }}
            </div>
            <div class="metric-note">al ritmo que declaraste</div>
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <div class="metric-label">Diferencia en un año</div>
            <div class="metric-value" data-testid="out-gap">
              {{ formatUYU(result.diferenciaAnual, 0) }}
            </div>
            <div class="metric-note">a favor del más barato</div>
          </VCol>
        </VRow>

        <VAlert
          :type="
            result.cheaper === 'talonario'
              ? 'success'
              : result.cheaper === 'cfe'
                ? 'info'
                : 'warning'
          "
          variant="tonal"
          density="comfortable"
          class="mt-5 mb-0"
          data-testid="out-verdict"
        >
          {{ verdictText }}
        </VAlert>

        <p class="text-caption text-medium-emphasis mb-0 mt-4">
          La ruta electrónica no lleva descuento: el crédito de hasta
          {{ FIGURES.creditoFacturaElectronicaUi.value }} UI mensuales ({{
            formatUYU(FIGURES.creditoFacturaElectronicaUyu.value, 0)
          }}
          en 2026) que abarata el abono a otras empresas chicas excluye expresamente al Monotributo
          y al Monotributo Social MIDES.
        </p>
      </VCard>
    </section>

    <!-- Mitos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que se dice y lo que dice DGI</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Media internet uruguaya afirma que desde 2025 el talonario murió para todos. Esa frase, para
        un monotributista, es falsa — y es la que hace gastar de más.
      </p>
      <VRow>
        <VCol v-for="m in MYTHS" :key="m.claim" cols="12">
          <VCard variant="flat" class="myth-card pa-5">
            <p class="myth-claim mb-2">{{ m.claim }}</p>
            <p class="mb-3">{{ m.reality }}</p>
            <a
              :href="m.source"
              target="_blank"
              rel="noopener noreferrer"
              class="text-caption source-link"
            >
              {{ m.sourceLabel }}
            </a>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Paso a paso -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El trámite del talonario, en orden</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        El orden importa por un detalle chico: la constancia que DGI emite para imprimir vale
        {{ FIGURES.constanciaVigenciaDias.value }} días. Comparar precios después de pedirla es la
        forma más común de tener que pedirla dos veces.
      </p>
      <VRow>
        <VCol v-for="s in TALONARIO_STEPS" :key="s.n" cols="12" md="6">
          <VCard variant="flat" class="step-card pa-5 h-100">
            <div class="d-flex align-start ga-4">
              <div class="step-n">{{ s.n }}</div>
              <div>
                <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ s.title }}</h3>
                <p class="mb-0 text-medium-emphasis">{{ s.detail }}</p>
              </div>
            </div>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="legend-card pa-5 mt-4">
        <div class="text-subtitle-2 font-weight-bold mb-2">El recuadro que no puede faltar</div>
        <p class="mb-3">
          Tus comprobantes llevan la leyenda de tu régimen en un recuadro de al menos
          {{ FIGURES.leyendaRecuadroLargoCm.value }} cm de largo por
          {{ FIGURES.leyendaRecuadroAnchoCm.value }} cm de ancho, con caracteres de al menos
          {{ FIGURES.leyendaCaracteresMm.value }} mm de alto. Puede ir preimpreso. Y no pueden
          mencionar el IVA ni decir que estás al día con ese impuesto: no sos contribuyente de IVA.
        </p>
        <div class="d-flex flex-wrap ga-3">
          <div v-for="l in LEYENDAS" :key="l.regime" class="legend-box">
            <div class="text-caption text-medium-emphasis mb-1">{{ l.regime }}</div>
            <div class="legend-text">{{ l.text }}</div>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Palancas de costo -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cómo bajar el precio de verdad</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Como el trámite ante DGI no cuesta nada, todo lo que pagás es precio de imprenta. Eso es una
        buena noticia: un precio se negocia, una tasa no.
      </p>
      <VRow>
        <VCol v-for="l in COST_LEVERS" :key="l.title" cols="12" md="6">
          <VCard variant="flat" class="lever-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ l.title }}</h3>
            <p class="mb-3 text-medium-emphasis">{{ l.detail }}</p>
            <div class="text-caption saving-tag">{{ l.saving }}</div>
          </VCard>
        </VCol>
      </VRow>

      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-4">
        <span class="font-weight-bold">No hay subsidio del talonario.</span> No existe un programa
        que reintegre lo que te cobra la imprenta. Lo que existe son apoyos al emprendimiento, con
        sus propias bases y cupos.
      </VAlert>

      <VRow class="mt-1">
        <VCol v-for="p in SUPPORT_PROGRAMS" :key="p.name" cols="12" md="6">
          <VCard variant="flat" class="support-card pa-5 h-100">
            <h3 class="text-subtitle-2 font-weight-bold mb-2">{{ p.name }}</h3>
            <p class="mb-2 text-medium-emphasis">{{ p.what }}</p>
            <p class="text-caption text-medium-emphasis mb-3">{{ p.caveat }}</p>
            <a
              :href="p.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-caption source-link"
            >
              Ver el programa
            </a>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Contexto del régimen -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Para dimensionar el gasto</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        El talonario es un gasto de una vez; el aporte es todos los meses. En el Monotributo Social
        MIDES el aporte arranca al 25% y sube por tramos hasta el 100% recién a los
        {{ FIGURES.gradualidadMeses.value }} meses.
      </p>
      <VRow>
        <VCol cols="12" sm="6" md="3">
          <VCard variant="flat" class="ctx-card pa-4 h-100">
            <div class="metric-label">Aporte del año 1 (25%)</div>
            <div class="metric-value">
              {{ formatUYU(FIGURES.aporteMidesAnio1SinFonasa.value, 0) }}
            </div>
            <div class="metric-note">por mes, sin FONASA — enero 2026</div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VCard variant="flat" class="ctx-card pa-4 h-100">
            <div class="metric-label">Aporte pleno (100%)</div>
            <div class="metric-value">
              {{ formatUYU(FIGURES.aporteMidesPlenoSinFonasa.value, 0) }}
            </div>
            <div class="metric-note">desde el mes 37, sin FONASA</div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VCard variant="flat" class="ctx-card pa-4 h-100">
            <div class="metric-label">Tope anual, unipersonal</div>
            <div class="metric-value">
              {{ formatUYU(FIGURES.topeAnualUnipersonal.value, 0) }}
            </div>
            <div class="metric-note">ingresos 2026</div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VCard variant="flat" class="ctx-card pa-4 h-100">
            <div class="metric-label">Tope anual, sociedad de hecho</div>
            <div class="metric-value">
              {{ formatUYU(FIGURES.topeAnualSociedad.value, 0) }}
            </div>
            <div class="metric-note">ingresos 2026</div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in FAQ" :key="f.question">
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
        <VBtn :to="localePath('/que-empresa-abrir-uruguay')" variant="tonal" size="small">
          Qué empresa abrir
        </VBtn>
        <VBtn :to="localePath('/contractor-en-uruguay')" variant="tonal" size="small">
          Facturar al exterior
        </VBtn>
        <VBtn :to="localePath('/declaracion-de-irpf-uruguay')" variant="tonal" size="small">
          Declaración de IRPF
        </VBtn>
        <VBtn
          :to="localePath('/temas/sueldo-trabajo-e-impuestos-uruguay')"
          variant="tonal"
          size="small"
        >
          Sueldo, trabajo e impuestos
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Contrastado el {{ verifiedAt }} con DGI, BPS y los textos vigentes de IMPO.
        {{ DISCLAIMER }}
      </p>
      <ul class="sources-list">
        <li v-for="s in SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { formatNumber, formatUYU } from '~/utils/format'
import {
  CORE_ANSWER,
  COST_LEVERS,
  DISCLAIMER,
  FAQ,
  FIGURES,
  LEYENDAS,
  MONO_INVOICING_VERIFIED_AT,
  MYTHS,
  ROUTES,
  SOURCES,
  SUPPORT_PROGRAMS,
  TALONARIO_STEPS,
  compareInvoicingCost,
} from '~/utils/monotributoInvoicing'

const localePath = useLocalePath()

const form = reactive({
  talonarioPrecio: 1500,
  juegos: 50,
  comprobantesPorMes: 10,
  certificadoPrecio: 0,
  certificadoMeses: 24,
  abonoMensual: 0,
})

const result = computed(() => compareInvoicingCost(form))

const verdictText = computed(() => {
  const r = result.value
  if (r.cfeMensual <= 0) {
    return 'Poné el precio del certificado y el abono que te coticen para comparar: mientras estén en cero, la ruta electrónica figura gratis y no lo es.'
  }
  if (r.cheaper === 'empate') return 'Los dos caminos te cuestan prácticamente lo mismo por mes.'
  if (r.cheaper === 'talonario') {
    return `Con estos números el talonario sale ${formatUYU(r.diferenciaMensual, 0)} menos por mes: ${formatUYU(r.diferenciaAnual, 0)} en un año.`
  }
  return `Con estos números la factura electrónica sale ${formatUYU(r.diferenciaMensual, 0)} menos por mes. Suele pasar cuando emitís muchos comprobantes: revisá que el abono cotizado incluya tu volumen.`
})

const verifiedAt = new Date(MONO_INVOICING_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/facturar-en-monotributo-uruguay'
const title = 'Facturar en Monotributo y Monotributo Social MIDES: talonario o factura electrónica'
const description =
  '¿Es obligatorio el talonario o podés facturar electrónico? DGI exceptúa al Monotributo y al Monotributo Social MIDES de emitir CFE: el papel es el camino legal y el barato. Con el trámite gratis de autorización, las palancas para bajar el precio de imprenta, y por qué el crédito de 80 UI que abarata la factura electrónica no te alcanza.'

defineOgImageComponent('Cambio', {
  title: 'Facturar en Monotributo',
  subtitle: 'Talonario o factura electrónica',
  tag: 'EMPRESAS',
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
        'facturar monotributo uruguay, talonario monotributo, monotributo social mides factura, factura electronica monotributo obligatoria, cai talonario dgi, imprenta autorizada dgi, constancia impresion documentacion, cfe monotributo, credito 80 ui facturacion electronica, boleta monotributo',
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
                name: 'Facturar en Monotributo',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: FAQ.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.mono-invoicing-page {
  max-width: 1180px;
}
.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  color: rgba(255, 255, 255, 0.82);
}
.v-theme--light .lead {
  color: rgba(0, 0, 0, 0.76);
}

.idea-card,
.route-card,
.calc-card,
.myth-card,
.step-card,
.legend-card,
.lever-card,
.support-card,
.ctx-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
}
.v-theme--light .idea-card,
.v-theme--light .route-card,
.v-theme--light .calc-card,
.v-theme--light .myth-card,
.v-theme--light .step-card,
.v-theme--light .legend-card,
.v-theme--light .lever-card,
.v-theme--light .support-card,
.v-theme--light .ctx-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.idea-card,
.calc-card {
  border-color: rgba(var(--v-theme-primary), 0.5);
}

.tight-list {
  padding-left: 1.1rem;
  line-height: 1.55;
}
.tight-list li {
  margin-bottom: 0.4rem;
}

.step-n {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}

.metric-label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.7;
  margin-bottom: 0.25rem;
}
.metric-value {
  font-size: 1.35rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
}
.metric-note {
  font-size: 0.78rem;
  opacity: 0.7;
}

.myth-claim {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.legend-box {
  border: 1px dashed rgba(255, 255, 255, 0.35);
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
}
.v-theme--light .legend-box {
  border-color: rgba(0, 0, 0, 0.35);
}
.legend-text {
  font-weight: 700;
  letter-spacing: 0.04em;
}

.saving-tag {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.source-link {
  text-decoration: underline;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
