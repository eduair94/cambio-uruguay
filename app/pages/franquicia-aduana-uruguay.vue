<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">Compras en el exterior · Julio 2026</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">¿Tu compra del exterior paga IVA?</h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        El régimen cambió en 2026 y hay una fecha marcada en rojo: el
        <strong>1.º de octubre</strong>. Acá está la regla que rige hoy, la que va a regir después,
        y de dónde sale cada una — con el decreto y la resolución linkeados, para que no nos creas a
        nosotros.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance">
        Todo lo de esta página sale de la <strong>Ley 20.446 art. 627</strong>, el
        <strong>Decreto 50/026</strong> y las <strong>Resoluciones Generales 09 y 21/2026</strong>
        de la Aduana. Si algo no está en una norma, lo decimos.
      </VAlert>
    </header>

    <!-- The semáforo -->
    <section class="mb-8" aria-label="Calculadora: ¿tu envío paga IVA?">
      <h2 class="section-heading mb-4">Contame tu compra</h2>

      <VCard variant="flat" class="calc pa-4 pa-sm-6">
        <VRow>
          <VCol cols="12" sm="6">
            <div class="text-overline text-medium-emphasis mb-2">¿Dónde compraste?</div>
            <VBtnToggle
              v-model="origin"
              color="primary"
              mandatory
              divided
              variant="outlined"
              class="w-100 mb-4"
            >
              <VBtn value="usa" class="flex-grow-1">
                <VIcon start>mdi-flag-variant</VIcon>
                EE.UU.
              </VBtn>
              <VBtn value="other" class="flex-grow-1">
                <VIcon start>mdi-earth</VIcon>
                Otro país
              </VBtn>
            </VBtnToggle>
          </VCol>

          <VCol cols="12" sm="6">
            <VTextField
              v-model.number="invoiceTotal"
              type="number"
              min="0"
              label="Total de la factura"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hint="Precio + sales tax + el envío que te cobra el vendedor"
              persistent-hint
            />
          </VCol>

          <VCol cols="12" sm="6">
            <VTextField
              v-model.number="franchiseAvailable"
              type="number"
              min="0"
              max="800"
              label="Franquicia que te queda este año"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hint="Arrancás con US$ 800 el 1.º de enero"
              persistent-hint
            />
          </VCol>

          <VCol cols="12" sm="6">
            <VSelect
              v-model.number="shipmentsUsed"
              :items="[0, 1, 2, 3]"
              label="Envíos con franquicia ya usados"
              variant="outlined"
              density="comfortable"
              hint="Son 3 por año como máximo"
              persistent-hint
            />
          </VCol>

          <VCol v-if="showSellerQuestion" cols="12">
            <VSwitch
              v-model="sellerRegistered"
              color="primary"
              density="comfortable"
              hide-details
              :label="`¿El vendedor está registrado ante la Aduana? (obligatorio desde el ${ENFORCED_LABEL})`"
            />
          </VCol>
        </VRow>

        <!-- The verdict -->
        <VAlert :type="verdictTone" variant="tonal" class="mt-4" :icon="verdictIcon" border="start">
          <p class="text-subtitle-1 font-weight-bold mb-1">{{ verdictTitle }}</p>
          <ul class="verdict-reasons">
            <li v-for="(r, i) in decision.reasons" :key="i">{{ r }}</li>
          </ul>
          <p v-if="taxLine" class="mt-2 mb-0 text-body-2">
            <strong>{{ taxLine }}</strong>
          </p>
        </VAlert>

        <p class="text-caption text-medium-emphasis mt-3 mb-0">
          <VIcon size="14" class="mr-1">mdi-calculator-variant-outline</VIcon>
          ¿Querés el número final, con flete incluido?
          <NuxtLink :to="localePath('/herramientas/calculadora-impuestos-importacion')">
            Usá la calculadora
          </NuxtLink>
          o armá el
          <NuxtLink :to="localePath('/herramientas/carrito-importacion')">
            carrito de importación </NuxtLink
          >.
        </p>
      </VCard>
    </section>

    <!-- The two regimes -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Los dos regímenes (y por qué no se mezclan)</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Es la confusión más cara del régimen nuevo: un envío entra en
        <strong>uno o en el otro</strong>, nunca se parte entre los dos. Si te quedan US$ 100 de
        cupo y comprás por US$ 500, <em>no</em> pagás IVA por 100 y 60% por 400: pagás
        <strong>60% de los 500</strong> (Decreto 50/026, art. 15).
      </p>

      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="regime pa-5 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon color="success">mdi-check-decagram-outline</VIcon>
              <span class="text-subtitle-1 font-weight-bold">Franquicia anual</span>
            </div>
            <ul class="regime-list">
              <li><strong>US$ 800 por año</strong>, acumulados — no por envío.</li>
              <li>Hasta <strong>3 envíos</strong> por año civil, 20 kg cada uno.</li>
              <li>No paga <strong>aranceles</strong>… pero <strong>sí paga IVA</strong>.</li>
              <li>
                Única excepción: compras de <strong>EE.UU. de hasta US$ 200</strong> → sin IVA
                (acuerdo TIFA).
              </li>
            </ul>
          </VCard>
        </VCol>

        <VCol cols="12" md="6">
          <VCard variant="flat" class="regime pa-5 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon color="warning">mdi-percent-outline</VIcon>
              <span class="text-subtitle-1 font-weight-bold">Prestación única</span>
            </div>
            <ul class="regime-list">
              <li>
                Todo lo que <strong>no entra</strong> en la franquicia (ya usaste los 3 envíos, o el
                cupo no alcanza).
              </li>
              <li>
                <strong>60% del valor</strong> de la factura, con un
                <strong>mínimo de US$ 20</strong> por envío.
              </li>
              <li>Reemplaza todo: no se le suma IVA aparte.</li>
              <li>Se aplica al <strong>envío entero</strong>, no al "excedente".</li>
            </ul>
          </VCard>
        </VCol>
      </VRow>

      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-4" icon="mdi-alert">
        Por encima de <strong>US$ 800</strong> el envío no entra en ninguno de los dos: pasa al
        <strong>régimen general</strong>. (Eso sí: la ley dice expresamente que
        <strong>no</strong> necesitás despachante — Ley 20.446 art. 627.)
      </VAlert>
    </section>

    <!-- The all-or-nothing trap -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Las tres trampas que le cuestan plata a la gente</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Las tres salen del texto del decreto, y las tres son contraintuitivas.
      </p>
      <VCard variant="flat" class="traps pa-5">
        <ol class="trap-list">
          <li>
            <strong>Los US$ 200 son todo o nada.</strong> Una compra de EE.UU. de US$ 200 no paga
            IVA; una de US$ 201 paga IVA <em>sobre los 201</em>, no sobre el dólar de más.
          </li>
          <li>
            <strong>El tope se mide sobre el total de la factura</strong>, no sobre el precio del
            producto: entra el <em>sales tax</em> y el envío que te cobra el vendedor (Decreto
            50/026, art. 5). Una compra de US$ 180 + US$ 25 de envío + US$ 10 de impuesto
            estadounidense son <strong>US$ 215</strong>: paga IVA.
          </li>
          <li>
            <strong>El envío exonerado igual te gasta cupo.</strong> Si traés US$ 198 de EE.UU. sin
            pagar IVA, te quedan US$ 602 y <strong>dos</strong> envíos — no tres (FAQ del MEF).
          </li>
        </ol>
      </VCard>
    </section>

    <!-- What changes on Oct 1 -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Qué cambia el 1.º de octubre de 2026</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Hoy, para no pagar IVA en una compra de EE.UU. de hasta US$ 200, alcanza con que la compra
        sea de EE.UU. Desde el 1/10/2026 va a hacer falta, además, que el
        <strong>vendedor</strong> —el que emite la factura, no el courier— esté
        <strong>registrado ante la Aduana</strong>, y el sistema LUCIA lo valida solo: si no figura,
        no hay exoneración.
      </p>

      <VCard variant="flat" class="timeline pa-5">
        <div v-for="(step, i) in timeline" :key="i" class="tl-row">
          <div class="tl-date">{{ step.date }}</div>
          <div class="tl-body">
            <p class="mb-1">{{ step.text }}</p>
            <a :href="step.url" target="_blank" rel="noopener noreferrer" class="tl-src">
              <VIcon size="13" class="mr-1">mdi-file-document-outline</VIcon>{{ step.norm }}
            </a>
          </div>
        </div>
      </VCard>

      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4" icon="mdi-history">
        <strong>Puede volver a moverse.</strong> Esta fecha ya se corrió dos veces (primero al
        1/7/2026, después al 1/10/2026), y la propia resolución que la corrió admite que "resta aún
        cumplir con varias etapas ineludibles". Vamos a actualizar esta página si se vuelve a
        prorrogar.
      </VAlert>

      <VAlert
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mt-3"
        icon="mdi-help-circle-outline"
      >
        <strong>Lo que todavía no sabemos:</strong> la resolución dice que el listado de vendedores
        registrados "será de carácter público", pero la Aduana
        <strong>todavía no lo publicó</strong>. Hasta que exista, nadie —nosotros tampoco— puede
        decirte con certeza si tu vendedor va a calificar en octubre. Preferimos decirte esto antes
        que inventarte una lista.
      </VAlert>
    </section>

    <!-- Sources -->
    <VCard variant="flat" class="sources-card pa-5 mb-6">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Las normas, sin intermediarios
      </h2>
      <ul class="sources-list">
        <li v-for="(s, i) in sources" :key="i">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Verificado contra fuente primaria el {{ LAST_RESEARCHED_LABEL }}. Ojo: la página
        "Encomiendas Postales" de la Aduana todavía describe el régimen
        <strong>derogado</strong> (mínimo de US$ 10, US$ 200 por envío) — si la leés, te va a
        confundir.
      </p>
    </VCard>

    <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-alert-outline">
      Información <strong>de referencia</strong>, no asesoramiento profesional. El régimen tiene
      excepciones (libros, medicamentos, obsequios) y la Aduana resuelve caso a caso. Verificá con
      la Dirección Nacional de Aduanas antes de comprar.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import {
  FRANCHISE_ANNUAL_USD,
  LAST_RESEARCHED,
  SELLER_REGISTRY_ENFORCED_FROM,
  SIMPLIFIED_MIN_USD,
  SIMPLIFIED_RATE_PCT,
  USA_IVA_EXEMPTION_USD,
  isSellerRegistryEnforced,
  resolveRegime,
} from '~/utils/importRules'
import { URUGUAY } from '~/utils/calculators'

const localePath = useLocalePath()

const origin = ref<'usa' | 'other'>('usa')
const invoiceTotal = ref(150)
const franchiseAvailable = ref(FRANCHISE_ANNUAL_USD)
const shipmentsUsed = ref(0)
const sellerRegistered = ref(true)

/** Only ask about the seller once the answer can actually change the outcome. */
const showSellerQuestion = computed(
  () => origin.value === 'usa' && isSellerRegistryEnforced(new Date())
)

const decision = computed(() =>
  resolveRegime({
    valueUsd: invoiceTotal.value || 0,
    origin: origin.value,
    franchiseAvailableUsd: franchiseAvailable.value || 0,
    shipmentsUsed: shipmentsUsed.value || 0,
    useFranchise: true,
    sellerRegistered: sellerRegistered.value,
  })
)

const verdictTone = computed(() => {
  if (decision.value.regime === 'general') return 'warning'
  return decision.value.ivaExempt ? 'success' : 'info'
})
const verdictIcon = computed(() => {
  if (decision.value.regime === 'general') return 'mdi-alert-outline'
  return decision.value.ivaExempt ? 'mdi-check-circle-outline' : 'mdi-cash'
})
const verdictTitle = computed(() => {
  if (decision.value.regime === 'general') return 'Este envío no entra en el régimen simplificado'
  if (decision.value.ivaExempt) return 'No pagás IVA'
  if (decision.value.regime === 'franquicia') return 'Usás la franquicia, pero pagás IVA'
  return `Pagás la prestación única (${SIMPLIFIED_RATE_PCT}%)`
})

/** The money line, computed from the same sourced rules the calculator uses. */
const taxLine = computed(() => {
  const v = invoiceTotal.value || 0
  const d = decision.value
  if (d.regime === 'general') return null
  if (d.regime === 'simplificado') {
    const tax = Math.max((v * SIMPLIFIED_RATE_PCT) / 100, v > 0 ? SIMPLIFIED_MIN_USD : 0)
    return `Impuesto estimado: US$ ${tax.toFixed(2)}`
  }
  if (d.ivaExempt) return 'Impuesto estimado: US$ 0,00'
  const iva = (v * URUGUAY.iva.basica) / 100
  return `IVA estimado (${URUGUAY.iva.basica}%): US$ ${iva.toFixed(2)}`
})

const ENFORCED_LABEL = formatDate(SELLER_REGISTRY_ENFORCED_FROM)
const LAST_RESEARCHED_LABEL = formatDate(LAST_RESEARCHED)

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

const timeline = [
  {
    date: 'Mayo 2026',
    text: `Arranca el régimen nuevo: franquicia de US$ ${FRANCHISE_ANNUAL_USD} al año en 3 envíos, y prestación única del ${SIMPLIFIED_RATE_PCT}% con mínimo de US$ ${SIMPLIFIED_MIN_USD} para todo lo demás. Los envíos que hiciste antes, en 2026, igual te consumieron cupo: el contador no se reinició.`,
    norm: 'Decreto 50/026',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026',
  },
  {
    date: '20 de abril de 2026',
    text: `La Aduana crea el registro de vendedores extranjeros. Sin vendedor registrado no hay exoneración de IVA para las compras de EE.UU. de hasta US$ ${USA_IVA_EXEMPTION_USD}.`,
    norm: 'Resolución General 09/2026',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28428/1/resolucion-9_2026.pdf',
  },
  {
    date: '25 de junio de 2026',
    text: 'La Aduana prorroga —por segunda vez— la exigibilidad de ese requisito, ahora hasta el 1.º de octubre de 2026. Es la razón por la que hoy todavía no te preguntan por el vendedor.',
    norm: 'Resolución General 21/2026',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28613/1/rg-21-2026.pdf',
  },
  {
    date: '1.º de octubre de 2026',
    text: 'Empieza a exigirse. El sistema LUCIA valida automáticamente que el emisor de la factura esté registrado; si no figura, el envío pierde la exoneración y paga IVA.',
    norm: 'RG 09/2026, num. 13',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28428/1/resolucion-9_2026.pdf',
  },
]

const sources = [
  {
    label: 'Ley 20.446, art. 627 — prestación única del 60%, mínimo US$ 20 por envío',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
  },
  {
    label:
      'Decreto 50/026 — franquicia, valor de la factura (art. 5) y regímenes excluyentes (art. 15)',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026',
  },
  {
    label: 'Resolución General 09/2026 (Aduana) — registro de vendedores y validación en LUCIA',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28428/1/resolucion-9_2026.pdf',
  },
  {
    label: 'Resolución General 21/2026 (Aduana) — prórroga al 1.º de octubre de 2026',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28613/1/rg-21-2026.pdf',
  },
  {
    label: 'Ley 18.761 — acuerdo TIFA con EE.UU. (art. 7, lit. g): envíos de hasta US$ 200',
    url: 'https://www.impo.com.uy/bases/leyes-internacional/18761-2011',
  },
  {
    label: 'MEF — guía de preguntas frecuentes del régimen de envíos postales',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias',
  },
]

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/franquicia-aduana-uruguay'
const title = 'Franquicia y aduana en Uruguay 2026: ¿tu compra del exterior paga IVA?'
const description =
  'Qué regla rige hoy y qué cambia el 1.º de octubre de 2026. Franquicia de US$ 800 en 3 envíos, prestación única del 60% (mínimo US$ 20) y la exoneración de IVA para compras de EE.UU. de hasta US$ 200. Con el decreto y las resoluciones linkeadas.'

defineOgImageComponent('Cambio', {
  title: '¿Tu compra del exterior paga IVA?',
  subtitle: 'Franquicia, aduana y el cambio del 1/10/2026',
  tag: 'ADUANA',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'franquicia aduana uruguay, comprar en el exterior uruguay, iva compras exterior, courier uruguay impuestos, decreto 50/026, us$ 800 franquicia, tiendamia iva, aduana 1 de octubre 2026',
    },
  ],
}))
</script>

<style scoped>
.eyebrow {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}
.section-heading {
  font-size: 1.25rem;
  font-weight: 800;
}
.calc,
.regime,
.traps,
.timeline,
.sources-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
}
.verdict-reasons {
  margin: 0;
  padding-left: 18px;
  font-size: 0.88rem;
  line-height: 1.6;
}
.regime-list,
.trap-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
}
.tl-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px dashed rgba(var(--v-border-color), 0.18);
}
.tl-row:last-child {
  border-bottom: none;
}
.tl-date {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(var(--v-theme-primary));
}
.tl-body p {
  font-size: 0.9rem;
  line-height: 1.6;
}
.tl-src {
  font-size: 0.76rem;
  display: inline-flex;
  align-items: center;
}
.sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
}
@media (max-width: 600px) {
  .tl-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
