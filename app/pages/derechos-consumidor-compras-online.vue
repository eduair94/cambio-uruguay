<template>
  <VContainer class="page py-6 py-md-10">
    <header class="hero mb-6">
      <p class="eyebrow">Derechos del consumidor · Compras online · Uruguay</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        Compré online, me cobraron y no me entregan: qué dice la ley
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        La respuesta que circula es "no compres más ahí". Pero la
        <strong>Ley 17.250 de Relaciones de Consumo</strong> dice bastante más de lo que la gente
        cree: es de <strong>orden público</strong>, así que tus derechos son
        <strong>irrenunciables</strong> y ninguna letra chica te los saca. Acá está el marco, con el
        artículo al lado, y un reclamo listo para copiar.
      </p>
      <VAlert type="success" variant="tonal" density="comfortable" icon="mdi-scale-balance">
        <strong>La regla que casi nadie usa:</strong> {{ GOLDEN_RULE }}
      </VAlert>
    </header>

    <!-- Key figures strip -->
    <section class="mb-8" aria-label="Números clave">
      <div class="figures">
        <div v-for="(f, i) in KEY_FIGURES" :key="i" class="figure">
          <span class="figure-value">{{ f.value }}</span>
          <span class="figure-label">{{ f.label }}</span>
        </div>
      </div>
    </section>

    <!-- Scenario picker -->
    <section class="mb-8" aria-label="¿Qué te pasó?">
      <h2 class="section-heading mb-4">¿Qué te pasó?</h2>
      <div class="scenarios">
        <button
          v-for="s in CONSUMER_SCENARIOS"
          :key="s.id"
          type="button"
          class="scenario"
          :class="{ 'scenario--on': s.id === activeId }"
          @click="activeId = s.id"
        >
          <VIcon size="20" class="mb-1">{{ s.icon }}</VIcon>
          <span class="scenario-label">{{ s.label }}</span>
          <span class="scenario-short">{{ s.short }}</span>
        </button>
      </div>
    </section>

    <!-- The verdict -->
    <section v-if="active" class="mb-8">
      <VCard variant="flat" class="verdict pa-5 pa-sm-6">
        <div class="d-flex align-center flex-wrap ga-2 mb-3">
          <VChip color="success" variant="flat" class="font-weight-bold">
            <VIcon start size="18">mdi-shield-check-outline</VIcon>
            La ley te ampara
          </VChip>
          <VChip size="small" variant="tonal" color="primary">{{ active.lever }}</VChip>
        </div>

        <p class="verdict-answer mb-4">{{ active.answer }}</p>

        <VRow>
          <VCol cols="12" md="6">
            <p class="block-label">El reloj</p>
            <ul class="block-list block-list--clock">
              <li v-for="(d, i) in active.deadlines" :key="i">{{ d }}</li>
            </ul>
          </VCol>
          <VCol cols="12" md="6">
            <p class="block-label">Qué juntar</p>
            <ul class="block-list">
              <li v-for="(e, i) in active.evidence" :key="i">{{ e }}</li>
            </ul>
          </VCol>
        </VRow>

        <p class="block-label mt-4">De dónde sale</p>
        <ul class="articles">
          <li v-for="(a, i) in active.articles" :key="i">{{ a }}</li>
        </ul>
      </VCard>
    </section>

    <!-- Reclamo template -->
    <section v-if="active" class="mb-8">
      <h2 class="section-heading mb-1">El reclamo, listo para copiar</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Mandáselo al comercio por un medio que deje constancia y
        <strong>guardá la fecha</strong>. Si no responde, este mismo texto te sirve de base para el
        reclamo ante Defensa del Consumidor.
      </p>
      <VCard variant="flat" class="letter pa-4 pa-sm-5">
        <pre class="letter-text">{{ letter }}</pre>
        <div class="d-flex justify-end mt-3">
          <VBtn
            :color="copied ? 'success' : 'primary'"
            variant="tonal"
            size="small"
            :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
            @click="copyLetter"
          >
            {{ copied ? 'Copiado' : 'Copiar el reclamo' }}
          </VBtn>
        </div>
      </VCard>
    </section>

    <!-- Rights -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Qué te da la Ley 17.250</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Ocho derechos que aplican a cualquier compra a distancia (web, teléfono, TV, catálogo).
      </p>
      <VRow>
        <VCol v-for="(r, i) in CONSUMER_RIGHTS" :key="i" cols="12" md="6">
          <VCard variant="flat" class="right-card pa-5 h-100">
            <p class="right-title mb-2">{{ r.title }}</p>
            <p class="right-plain mb-3">{{ r.plain }}</p>
            <VAlert
              type="info"
              variant="tonal"
              density="compact"
              icon="mdi-gesture-tap"
              class="mb-3"
            >
              <span class="text-body-2">{{ r.practical }}</span>
            </VAlert>
            <div class="d-flex flex-wrap ga-1">
              <VChip v-for="(a, j) in r.articles" :key="j" size="x-small" variant="tonal" label>
                {{ a.replace('Ley 17.250 ', '') }}
              </VChip>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Escalation ladder -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Cómo reclamar, paso a paso</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Primero al comercio; si no responde, gratis ante Defensa del Consumidor del MEF.
      </p>
      <VCard variant="flat" class="ladder pa-5">
        <div v-for="(step, i) in COMPLAINT_STEPS" :key="i" class="step-row">
          <div class="step-when">{{ step.step }}</div>
          <div class="step-body">
            <p class="step-detail mb-0">{{ step.detail }}</p>
          </div>
        </div>
      </VCard>
      <VAlert
        type="info"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        icon="mdi-phone-outline"
      >
        <strong>Defensa del Consumidor (MEF):</strong> 0800 7005 (lun a vie 9:30 a 16 h). El reclamo
        en línea se inicia en
        <a
          href="https://www.gub.uy/tramites/consulta-reclamo-yo-denuncia-materia-defensa-consumidor"
          target="_blank"
          rel="noopener noreferrer"
          >gub.uy</a
        >
        y es <strong>gratuito</strong>.
      </VAlert>
    </section>

    <!-- Cross-links -->
    <section class="mb-8">
      <VRow>
        <VCol cols="12" md="6">
          <NuxtLink to="/estafas-uruguay" class="xlink">
            <VCard variant="flat" class="xlink-card pa-5 h-100">
              <VIcon color="warning" class="mb-2">mdi-shield-alert-outline</VIcon>
              <p class="xlink-title mb-1">¿Fue una estafa con el medio de pago?</p>
              <p class="xlink-text mb-0">
                Tarjeta clonada, transferencia a un vendedor que desapareció, phishing: quién paga
                según la ley y cómo reclamarle al banco.
              </p>
            </VCard>
          </NuxtLink>
        </VCol>
        <VCol cols="12" md="6">
          <NuxtLink to="/problemas-con-la-aduana-uruguay" class="xlink">
            <VCard variant="flat" class="xlink-card pa-5 h-100">
              <VIcon color="primary" class="mb-2">mdi-package-variant-closed</VIcon>
              <p class="xlink-title mb-1">¿Compraste en el exterior y quedó en la aduana?</p>
              <p class="xlink-text mb-0">
                Franquicia, courier, IVA y qué hacer cuando tu paquete no llega o te lo retienen.
              </p>
            </VCard>
          </NuxtLink>
        </VCol>
      </VRow>
    </section>

    <!-- FAQ -->
    <section class="mb-8">
      <h2 class="section-heading mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" multiple>
        <VExpansionPanel v-for="(f, i) in CONSUMER_FAQS" :key="i">
          <VExpansionPanelTitle class="faq-q">{{ f.q }}</VExpansionPanelTitle>
          <VExpansionPanelText class="faq-a">{{ f.a }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Sources -->
    <VCard variant="flat" class="sources-card pa-5 mb-6">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Las normas y fuentes oficiales, sin intermediarios
      </h2>
      <ul class="sources-list">
        <li v-for="(s, i) in CONSUMER_SOURCES" :key="i">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
          <span class="src-pub">— {{ s.publisher }}</span>
        </li>
      </ul>
    </VCard>

    <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-alert-outline">
      Información <strong>de referencia</strong>, no asesoramiento jurídico. Cada caso depende de su
      prueba. Si la plata es importante o el comercio se niega, presentá el reclamo ante Defensa del
      Consumidor (es gratis) o consultá a un abogado.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import {
  COMPLAINT_STEPS,
  CONSUMER_FAQS,
  CONSUMER_RIGHTS,
  CONSUMER_SCENARIOS,
  CONSUMER_SOURCES,
  GOLDEN_RULE,
  KEY_FIGURES,
  scenarioById,
} from '~/utils/consumerRights'

const activeId = ref(CONSUMER_SCENARIOS[0]!.id)
const active = computed(() => scenarioById(activeId.value))

/** Un reclamo que el lector puede mandar, citando el artículo que respalda su caso. */
const letter = computed(() => {
  const s = active.value
  if (!s) return ''
  const arts = s.articles
    .map(a => a.split(' — ')[0])
    .slice(0, 3)
    .join('; ')
  return `Montevideo, [fecha]

A: [nombre del comercio]
De: [tu nombre completo], C.I. [tu cédula]
Compra / pedido N.º: [número] — Fecha de compra: [fecha]

RECLAMO EN MATERIA DE RELACIÓN DE CONSUMO

Por la presente reclamo formalmente por el siguiente hecho: ${s.label.toLowerCase()}.

Detalle:
- Producto/servicio: [___]
- Importe pagado: [___] — Medio de pago: [___]
- Plazo de entrega prometido: [___]

Al amparo de la Ley 17.250 de Relaciones de Consumo (${arts}), intimo a esa empresa a:
[ELEGÍ UNA] cumplir con la entrega en un plazo de [48/72] horas / sustituir el producto /
resolver el contrato y reintegrarme la totalidad de lo pagado, monetariamente actualizado,
más los daños y perjuicios que correspondan.

Dejo constancia de que los derechos de la Ley 17.250 son de orden público e irrenunciables, por
lo que cualquier cláusula que los recorte es nula. Ante la falta de respuesta en el plazo indicado,
presentaré reclamo ante el Área de Defensa del Consumidor del Ministerio de Economía y Finanzas.

Solicito respuesta por este mismo medio, con constancia de fecha.

Saluda atentamente,
[firma]
[nombre] — C.I. [cédula]
[teléfono] — [correo]`
})

const copied = ref(false)
async function copyLetter() {
  try {
    await navigator.clipboard.writeText(letter.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/derechos-consumidor-compras-online'
const title =
  'Derechos del consumidor en compras online (Uruguay): qué hacer si te cobran y no entregan'
const description =
  'Ley 17.250: derecho de arrepentimiento de 5 días, la oferta obliga, elegís vos el remedio ante el incumplimiento, garantía por vicios y cláusulas abusivas nulas. Qué exigir cuando te cobran y no entregan, no cancelan ni devuelven, y cómo reclamar gratis ante Defensa del Consumidor (0800 7005).'

defineOgImageComponent('Cambio', {
  title: 'Compré online y no me entregan',
  subtitle: 'Tus derechos según la Ley 17.250, con el artículo al lado',
  tag: 'CONSUMIDOR',
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
        'derechos del consumidor uruguay, compre online y no me entregan, defensa del consumidor uruguay, ley 17250, derecho de arrepentimiento, retracto compra web, me cobraron y no entregan, no me devuelven la plata tienda web, cancelar compra online uruguay, 0800 7005, publicidad enganosa uruguay, garantia legal uruguay',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: CONSUMER_FAQS.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }),
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

/* Key figures */
.figures {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.figure {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.04);
}
.figure-value {
  font-size: 0.98rem;
  font-weight: 800;
  line-height: 1.25;
  color: rgb(var(--v-theme-primary));
}
.figure-label {
  font-size: 0.72rem;
  opacity: 0.7;
  line-height: 1.35;
}

/* Scenario picker */
.scenarios {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}
.scenario {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  gap: 2px;
  padding: 14px;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}
.scenario:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.scenario--on {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}
.scenario-label {
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.35;
}
.scenario-short {
  font-size: 0.76rem;
  opacity: 0.7;
  line-height: 1.4;
}

.verdict,
.letter,
.ladder,
.right-card,
.xlink-card,
.sources-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
}
.verdict {
  border-left: 3px solid #16a34a;
}
.verdict-answer {
  font-size: 0.95rem;
  line-height: 1.7;
}
.block-label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.6;
  margin-bottom: 6px;
}
.block-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.86rem;
  line-height: 1.6;
}
.block-list--clock li {
  font-weight: 600;
}
.articles {
  margin: 0;
  padding-left: 18px;
  font-size: 0.78rem;
  opacity: 0.75;
  line-height: 1.6;
}

/* Rights */
.right-title {
  font-size: 0.98rem;
  font-weight: 800;
  line-height: 1.35;
}
.right-plain {
  font-size: 0.88rem;
  line-height: 1.6;
  opacity: 0.9;
}

/* Letter */
.letter-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  max-height: 460px;
  overflow-y: auto;
}

/* Ladder */
.step-row {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px dashed rgba(var(--v-border-color), 0.18);
}
.step-row:last-child {
  border-bottom: none;
}
.step-when {
  font-size: 0.84rem;
  font-weight: 800;
  color: rgb(var(--v-theme-primary));
  line-height: 1.4;
}
.step-detail {
  font-size: 0.86rem;
  line-height: 1.6;
  opacity: 0.9;
}

/* Cross-links */
.xlink {
  text-decoration: none;
  color: inherit;
  display: block;
  height: 100%;
}
.xlink-card {
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}
.xlink-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
  background: rgba(var(--v-theme-primary), 0.04);
}
.xlink-title {
  font-size: 0.95rem;
  font-weight: 700;
}
.xlink-text {
  font-size: 0.84rem;
  line-height: 1.6;
  opacity: 0.85;
}

/* FAQ */
.faq-q {
  font-weight: 700;
  font-size: 0.92rem;
}
.faq-a {
  font-size: 0.88rem;
  line-height: 1.65;
}

/* Sources */
.sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.85rem;
}
.src-pub {
  opacity: 0.6;
  font-size: 0.78rem;
}

@media (max-width: 600px) {
  .step-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
