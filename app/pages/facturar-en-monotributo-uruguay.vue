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

      <SurfaceCard accent>
        <div class="eyebrow">La respuesta corta</div>
        <p class="mb-0">{{ CORE_ANSWER }}</p>
      </SurfaceCard>
    </header>

    <!-- Los dos caminos -->
    <section id="caminos" class="mb-12">
      <h2 class="section-title">Los dos caminos, con sus costos reales</h2>
      <p class="section-intro">
        No compiten en igualdad de condiciones: uno es un gasto de imprenta que se repite cuando se
        te acaba el talonario, y el otro son dos gastos que no paran mientras seas emisor.
      </p>

      <VRow>
        <VCol v-for="r in ROUTES" :key="r.id" cols="12" md="6">
          <SurfaceCard :id="r.id" stretch>
            <div class="eyebrow eyebrow--muted">{{ r.status }}</div>
            <h3 class="card-title">{{ r.title }}</h3>
            <p class="card-lead">{{ r.detail }}</p>

            <div class="block">
              <div class="block-label">Qué se paga</div>
              <ul class="tight-list">
                <li v-for="(c, i) in r.costs" :key="i">{{ c }}</li>
              </ul>
            </div>

            <VRow class="block" dense>
              <VCol cols="12" sm="6">
                <div class="block-label">A favor</div>
                <ul class="tight-list">
                  <li v-for="(p, i) in r.pros" :key="i">{{ p }}</li>
                </ul>
              </VCol>
              <VCol cols="12" sm="6">
                <div class="block-label">En contra</div>
                <ul class="tight-list">
                  <li v-for="(c, i) in r.cons" :key="i">{{ c }}</li>
                </ul>
              </VCol>
            </VRow>

            <template #footer>
              <VAlert type="info" variant="tonal" density="comfortable">{{ r.verdict }}</VAlert>
            </template>
          </SurfaceCard>
        </VCol>
      </VRow>
    </section>

    <!-- Calculadora -->
    <section id="calculadora" class="mb-12">
      <h2 class="section-title">Cuánto te sale cada uno, con tus números</h2>
      <p class="section-intro">
        Ni las imprentas ni los facturadores publican tarifas: se cotiza caso por caso. Por eso acá
        no hay precios inventados de fondo — poné lo que te coticen a vos y la cuenta se hace sola.
      </p>

      <SurfaceCard accent padding="feature">
        <VRow>
          <VCol cols="12" md="6">
            <div class="block-label block-label--lg">Talonario</div>
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
            <div class="block-label block-label--lg">Factura electrónica</div>
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
            <StatTile
              label="Talonario, por mes"
              :value="formatUYU(result.talonarioMensual, 0)"
              :note="`${formatUYU(result.talonarioPorComprobante, 0)} por comprobante`"
            >
              <template #value>
                <span data-testid="out-talonario">{{ formatUYU(result.talonarioMensual, 0) }}</span>
              </template>
            </StatTile>
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <StatTile
              label="Electrónico, por mes"
              :value="formatUYU(result.cfeMensual, 0)"
              :note="
                result.cfePorComprobante === null
                  ? 'sin comprobantes declarados'
                  : `${formatUYU(result.cfePorComprobante, 0)} por comprobante`
              "
            >
              <template #value>
                <span data-testid="out-cfe">{{ formatUYU(result.cfeMensual, 0) }}</span>
              </template>
            </StatTile>
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <StatTile
              label="El talonario te dura"
              :value="
                result.mesesQueDura === null ? '—' : `${formatNumber(result.mesesQueDura, 1)} meses`
              "
              note="al ritmo que declaraste"
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <StatTile
              label="Diferencia en un año"
              :value="gapValue"
              :note="
                hasCfeQuote ? 'a favor del más barato' : 'faltan los precios del camino electrónico'
              "
            >
              <template #value>
                <span data-testid="out-gap">{{ gapValue }}</span>
              </template>
            </StatTile>
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
          class="mt-6"
          data-testid="out-verdict"
        >
          {{ verdictText }}
        </VAlert>

        <p class="footnote">
          La ruta electrónica no lleva descuento: el crédito de hasta
          {{ FIGURES.creditoFacturaElectronicaUi.value }} UI mensuales ({{
            formatUYU(FIGURES.creditoFacturaElectronicaUyu.value, 0)
          }}
          en 2026) que abarata el abono a otras empresas chicas excluye expresamente al Monotributo
          y al Monotributo Social MIDES.
        </p>
      </SurfaceCard>
    </section>

    <!-- Mitos -->
    <section class="mb-12">
      <h2 class="section-title">Lo que se dice y lo que dice DGI</h2>
      <p class="section-intro">
        Media internet uruguaya afirma que desde 2025 el talonario murió para todos. Esa frase, para
        un monotributista, es falsa — y es la que hace gastar de más.
      </p>
      <VRow>
        <VCol v-for="m in MYTHS" :key="m.claim" cols="12">
          <SurfaceCard>
            <p class="myth-claim">{{ m.claim }}</p>
            <p>{{ m.reality }}</p>
            <a :href="m.source" target="_blank" rel="noopener noreferrer" class="source-link">
              {{ m.sourceLabel }}
            </a>
          </SurfaceCard>
        </VCol>
      </VRow>
    </section>

    <!-- Paso a paso -->
    <section class="mb-12">
      <h2 class="section-title">El trámite del talonario, en orden</h2>
      <p class="section-intro">
        El orden importa por un detalle chico: la constancia que DGI emite para imprimir vale
        {{ FIGURES.constanciaVigenciaDias.value }} días. Comparar precios después de pedirla es la
        forma más común de tener que pedirla dos veces.
      </p>
      <VRow>
        <VCol v-for="s in TALONARIO_STEPS" :key="s.n" cols="12" md="6">
          <SurfaceCard stretch>
            <div class="d-flex align-start ga-4">
              <div class="step-n">{{ s.n }}</div>
              <div class="flex-grow-1" style="min-width: 0">
                <h3 class="card-title card-title--sm">{{ s.title }}</h3>
                <p class="mb-0 text-medium-emphasis">{{ s.detail }}</p>
              </div>
            </div>
          </SurfaceCard>
        </VCol>
      </VRow>

      <SurfaceCard class="mt-6">
        <div class="block-label block-label--lg">El recuadro que no puede faltar</div>
        <p>
          Tus comprobantes llevan la leyenda de tu régimen en un recuadro de al menos
          {{ FIGURES.leyendaRecuadroLargoCm.value }} cm de largo por
          {{ FIGURES.leyendaRecuadroAnchoCm.value }} cm de ancho, con caracteres de al menos
          {{ FIGURES.leyendaCaracteresMm.value }} mm de alto. Puede ir preimpreso. Y no pueden
          mencionar el IVA ni decir que estás al día con ese impuesto: no sos contribuyente de IVA.
        </p>
        <div class="d-flex flex-wrap ga-3">
          <div v-for="l in LEYENDAS" :key="l.regime" class="legend-box">
            <div class="legend-regime">{{ l.regime }}</div>
            <div class="legend-text">{{ l.text }}</div>
          </div>
        </div>
      </SurfaceCard>
    </section>

    <!-- Palancas de costo -->
    <section class="mb-12">
      <h2 class="section-title">Cómo bajar el precio de verdad</h2>
      <p class="section-intro">
        Como el trámite ante DGI no cuesta nada, todo lo que pagás es precio de imprenta. Eso es una
        buena noticia: un precio se negocia, una tasa no.
      </p>
      <VRow>
        <VCol v-for="l in COST_LEVERS" :key="l.title" cols="12" md="6">
          <SurfaceCard stretch>
            <h3 class="card-title card-title--sm">{{ l.title }}</h3>
            <p class="text-medium-emphasis">{{ l.detail }}</p>
            <template #footer>
              <div class="saving-tag">{{ l.saving }}</div>
            </template>
          </SurfaceCard>
        </VCol>
      </VRow>

      <SurfaceCard padding="feature" class="mt-6">
        <div class="eyebrow">Dónde pedir presupuesto</div>
        <h3 class="card-title">
          Qué imprenta es la más barata: nadie puede decírtelo, pero se averigua en un rato
        </h3>
        <p class="card-lead">
          Ninguna imprenta uruguaya publica lista de precios, y el mismo trabajo se cotiza distinto
          según la ciudad, la tirada y la semana. Cualquiera que te tire un nombre como «la barata»
          está adivinando. Esto es lo que sí sirve.
        </p>
        <VRow>
          <VCol v-for="q in QUOTE_CHANNELS" :key="q.title" cols="12" md="6">
            <div class="quote-item">
              <h4 class="quote-title">{{ q.title }}</h4>
              <p class="text-medium-emphasis">{{ q.detail }}</p>
              <a
                v-if="q.url"
                :href="q.url"
                target="_blank"
                rel="noopener noreferrer"
                class="source-link"
              >
                {{ q.linkLabel }}
              </a>
            </div>
          </VCol>
        </VRow>
      </SurfaceCard>

      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-6">
        <span class="font-weight-bold">No hay subsidio del talonario.</span> No existe un programa
        que reintegre lo que te cobra la imprenta. Lo que existe son apoyos al emprendimiento, con
        sus propias bases y cupos.
      </VAlert>

      <VRow class="mt-2">
        <VCol v-for="p in SUPPORT_PROGRAMS" :key="p.name" cols="12" md="6">
          <SurfaceCard stretch>
            <h3 class="card-title card-title--sm">{{ p.name }}</h3>
            <p class="text-medium-emphasis">{{ p.what }}</p>
            <p class="caveat">{{ p.caveat }}</p>
            <template #footer>
              <a :href="p.url" target="_blank" rel="noopener noreferrer" class="source-link">
                Ver el programa
              </a>
            </template>
          </SurfaceCard>
        </VCol>
      </VRow>
    </section>

    <!-- Contexto del régimen -->
    <section class="mb-12">
      <h2 class="section-title">Para dimensionar el gasto</h2>
      <p class="section-intro">
        El talonario es un gasto de una vez; el aporte es todos los meses. En el Monotributo Social
        MIDES el aporte arranca al 25% y sube por tramos hasta el 100% recién a los
        {{ FIGURES.gradualidadMeses.value }} meses.
      </p>
      <VRow>
        <VCol v-for="c in CONTEXT_TILES" :key="c.label" cols="12" sm="6" md="3">
          <SurfaceCard padding="compact" stretch>
            <StatTile :label="c.label" :value="c.value" :note="c.note" />
          </SurfaceCard>
        </VCol>
      </VRow>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="section-title section-title--tight">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <div>
              <div class="font-weight-medium">{{ f.question }}</div>
              <div class="faq-short">{{ f.short }}</div>
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
  QUOTE_CHANNELS,
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

const CONTEXT_TILES = [
  {
    label: 'Aporte del año 1 (25%)',
    value: formatUYU(FIGURES.aporteMidesAnio1SinFonasa.value, 0),
    note: 'por mes, sin FONASA — enero 2026',
  },
  {
    label: 'Aporte pleno (100%)',
    value: formatUYU(FIGURES.aporteMidesPlenoSinFonasa.value, 0),
    note: 'desde el mes 37, sin FONASA',
  },
  {
    label: 'Tope anual, unipersonal',
    value: formatUYU(FIGURES.topeAnualUnipersonal.value, 0),
    note: 'ingresos 2026',
  },
  {
    label: 'Tope anual, sociedad de hecho',
    value: formatUYU(FIGURES.topeAnualSociedad.value, 0),
    note: 'ingresos 2026',
  },
]

/* Sin cotización del lado electrónico no hay diferencia que mostrar: publicar «$ 3.600 a favor del
   más barato» contra un abono de $0 sería contar como ahorro un precio que todavía no existe. */
const hasCfeQuote = computed(() => result.value.cfeMensual > 0)
const gapValue = computed(() =>
  hasCfeQuote.value ? formatUYU(result.value.diferenciaAnual, 0) : '—'
)

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
const title = 'Facturar en Monotributo y Monotributo MIDES'
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
/* El ritmo vertical lo declara la página, no la hoja del navegador: Vuetify 4 no resetea los
   bloques de texto y su `margin-block: 1em` gana por colapso a cualquier gap más chico.
   Ver DESIGN.md, "The Text Block Owns Its Top Margin Rule". */
.mono-invoicing-page :is(p, h1, h2, h3, h4, ul, ol) {
  margin-top: 0;
}

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

/* Dos intervalos y nada más: 8px adentro de un grupo, 24px entre grupos. */
.section-title {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin-bottom: 8px;
}
.section-intro {
  max-width: 72ch;
  margin-bottom: 24px;
  opacity: 0.78;
}
.section-title--tight {
  margin-bottom: 16px;
}

.eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-link));
  margin-bottom: 8px;
}
.eyebrow--muted {
  color: inherit;
  opacity: 0.65;
  letter-spacing: 0.12em;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 8px;
}
.card-title--sm {
  font-size: 1.05rem;
}
.card-lead {
  margin-bottom: 24px;
  opacity: 0.82;
}

/* Un grupo etiquetado dentro de la tarjeta: 8px del rótulo a su lista, 24px al grupo siguiente. */
.block {
  margin-bottom: 24px;
}
.block:last-child {
  margin-bottom: 0;
}
.block-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  opacity: 0.72;
  margin-bottom: 8px;
}
.block-label--lg {
  font-size: 0.875rem;
  letter-spacing: 0.02em;
  text-transform: none;
  opacity: 1;
  margin-bottom: 12px;
}

.tight-list {
  padding-left: 1.1rem;
  line-height: 1.5;
  margin-bottom: 0;
  font-size: 0.95rem;
}
.tight-list li + li {
  margin-top: 8px;
}

.step-n {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}

.myth-claim {
  font-weight: 600;
  color: rgb(var(--v-theme-link));
  margin-bottom: 8px;
}

.legend-box {
  border: 1px dashed rgba(255, 255, 255, 0.35);
  border-radius: 8px;
  padding: 8px 16px;
}
.v-theme--light .legend-box {
  border-color: rgba(0, 0, 0, 0.35);
}
.legend-regime {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-bottom: 4px;
}
.legend-text {
  font-weight: 700;
  letter-spacing: 0.04em;
}

.quote-item {
  height: 100%;
  min-width: 0;
}
.quote-title {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 8px;
}

.saving-tag {
  font-size: 0.8rem;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}

.caveat {
  font-size: 0.8rem;
  line-height: 1.35;
  opacity: 0.7;
}

.footnote {
  font-size: 0.8rem;
  line-height: 1.4;
  opacity: 0.7;
  margin-top: 16px;
  margin-bottom: 0;
}

.faq-short {
  font-size: 0.8rem;
  opacity: 0.7;
}

.source-link {
  font-size: 0.8rem;
  text-decoration: underline;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
