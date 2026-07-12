<template>
  <VContainer class="page py-6 py-md-10">
    <header class="hero mb-6">
      <p class="eyebrow">Fraude y medios de pago · Uruguay</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        Me estafaron: ¿qué me tienen que devolver?
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        Hoy la respuesta circula como folklore: un ex-empleado de banco jurando que en débito no te
        devuelven nunca, al lado de alguien a quien le devolvieron todo. La ley sí dice algo — y
        dice bastante más de lo que la gente cree. Acá está, con el artículo al lado, y también lo
        que la ley <strong>no</strong> te da.
      </p>
      <VAlert type="success" variant="tonal" density="comfortable" icon="mdi-scale-balance">
        <strong>La regla que casi nadie conoce:</strong> la carga de la prueba es
        <strong>del emisor</strong>. Si el banco no puede demostrar que la operación fue
        correctamente autenticada y hecha por vos, responde él (RNRCSF, art. 364 lit. h).
      </VAlert>
    </header>

    <!-- Scenario picker -->
    <section class="mb-8" aria-label="¿Qué te pasó?">
      <h2 class="section-heading mb-4">¿Qué te pasó?</h2>
      <div class="scenarios">
        <button
          v-for="s in FRAUD_SCENARIOS"
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
      <VCard variant="flat" class="verdict pa-5 pa-sm-6" :class="`v-${toneFor(active.whoPays)}`">
        <div class="d-flex align-center flex-wrap ga-2 mb-3">
          <VChip :color="toneFor(active.whoPays)" variant="flat" class="font-weight-bold">
            {{ WHO_LABEL[active.whoPays] }}
          </VChip>
          <VChip
            size="small"
            variant="tonal"
            :color="active.certainty === 'claro' ? 'success' : 'warning'"
          >
            {{ CERTAINTY_LABEL[active.certainty] }}
          </VChip>
        </div>

        <p class="verdict-answer mb-4">{{ active.answer }}</p>

        <VAlert
          v-if="active.againstYou"
          type="warning"
          variant="tonal"
          density="comfortable"
          class="mb-4"
          icon="mdi-shield-alert-outline"
        >
          <strong>Lo que el emisor va a usar en tu contra:</strong> {{ active.againstYou }}
        </VAlert>

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
        Presentalo por escrito y <strong>exigí constancia con fecha y hora</strong>. Ese instante es
        la pieza sobre la que pivota toda tu defensa.
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

    <!-- Escalation ladder -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">La escalera, en orden</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Los plazos son fatales: el de 48 horas es el que más plata hace perder.
      </p>
      <VCard variant="flat" class="ladder pa-5">
        <div v-for="(step, i) in ESCALATION" :key="i" class="step-row">
          <div class="step-when">{{ step.when }}</div>
          <div class="step-body">
            <p class="step-title mb-1">{{ step.title }}</p>
            <p class="step-detail mb-1">{{ step.detail }}</p>
            <p v-if="step.source" class="step-src mb-0">{{ step.source }}</p>
          </div>
        </div>
      </VCard>
      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4" icon="mdi-key-outline">
        {{ GOLDEN_RULE }}
      </VAlert>
    </section>

    <!-- The e-money gap -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Si tu emisor es una billetera (Prex, Mi Dinero…)</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Tenés <strong>menos herramientas</strong> que con un banco, y ocultártelo sería lo peor que
        podríamos hacer. La parte de la normativa del BCU que contiene la regla de oro —"si el
        emisor no prueba la correcta autenticación, paga él"— y el doble factor obligatorio
        <strong>no se les aplica</strong>.
      </p>
      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="gap-card pa-5 h-100">
            <p class="block-label block-label--ok">Lo que SÍ te ampara</p>
            <ul class="block-list">
              <li v-for="(x, i) in EMONEY_GAP.applies" :key="i">{{ x }}</li>
            </ul>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="gap-card gap-card--bad pa-5 h-100">
            <p class="block-label block-label--bad">Lo que NO te alcanza</p>
            <ul class="block-list">
              <li v-for="(x, i) in EMONEY_GAP.doesNotApply" :key="i">{{ x }}</li>
            </ul>
          </VCard>
        </VCol>
      </VRow>
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
    </VCard>

    <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-alert-outline">
      Información <strong>de referencia</strong>, no asesoramiento jurídico. Cada caso depende de su
      prueba y no tenemos jurisprudencia uruguaya publicada sobre varios de estos puntos: donde la
      ley está discutida, lo decimos en vez de venderte una certeza. Si la plata es importante,
      consultá a un abogado.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import {
  EMONEY_GAP,
  ESCALATION,
  FRAUD_SCENARIOS,
  GOLDEN_RULE,
  scenarioById,
  toneFor,
  type Certainty,
  type WhoPays,
} from '~/utils/fraudRights'

const activeId = ref(FRAUD_SCENARIOS[0]!.id)
const active = computed(() => scenarioById(activeId.value))

const WHO_LABEL: Record<WhoPays, string> = {
  emisor: 'Lo paga el emisor',
  usuario: 'Lo pagás vos',
  depende: 'Depende — está discutido',
  'nadie te lo devuelve': 'El banco no te lo debe devolver',
}

const CERTAINTY_LABEL: Record<Certainty, string> = {
  claro: 'La ley es clara',
  contestado: 'La ley está discutida',
  'silencio de la ley': 'La ley no lo resuelve',
}

/** A reclamo the reader can actually send, citing the article that backs their case. */
const letter = computed(() => {
  const s = active.value
  if (!s) return ''
  const arts = s.articles.slice(0, 3).join('; ')
  return `Montevideo, [fecha]

A: [nombre de la institución] — Servicio de Atención de Reclamos
De: [tu nombre completo], C.I. [tu cédula]
Cuenta / tarjeta: [número]

RECLAMO POR OPERACIONES DESCONOCIDAS

Por la presente reclamo formalmente por el siguiente hecho: ${s.label.toLowerCase()}.

Detalle de las operaciones desconocidas:
- Fecha y hora: [___]
- Importe: [___]
- Descripción: [___]

Notifiqué el hecho a esa institución el [fecha] a las [hora], por [canal].
${s.id === 'transferi-a-un-estafador' || s.id === 'transferencia-no-autorizada' ? 'Asimismo, SOLICITO EXPRESAMENTE la inmovilización de los fondos en la cuenta de destino, al amparo del art. 11 de la Ley 20.327.\n' : ''}
Fundo este reclamo en: ${arts}.

En particular, dejo constancia de que corresponde a esa institución acreditar que la
operación fue correctamente autenticada y realizada por el suscrito o por un tercero
autorizado por el suscrito. En caso de no acreditarlo, la responsabilidad es del emisor.

Solicito:
1) Que se me entregue constancia de recepción de este reclamo, con fecha, hora y número.
2) Que se me responda dentro del plazo de 15 días corridos.
3) Que se me pongan a disposición los registros de autenticación de las operaciones reclamadas.
4) La restitución de los importes reclamados.

Sin otro particular, saluda atentamente.

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

const sources = [
  {
    label:
      'Ley 19.731 — medios de pago electrónicos: responsabilidad del emisor (art. 16) y carga de la prueba (art. 15 lit. F)',
    url: 'https://www.impo.com.uy/bases/leyes/19731-2018',
  },
  {
    label:
      'Ley 19.210 — débitos automáticos: 5 días hábiles para probar, 1 día hábil para devolver (arts. 72 y 73)',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014',
  },
  {
    label: 'Ley 20.327, art. 11 — inmovilización de fondos: el reloj de 48 horas y 30 días',
    url: 'https://www.impo.com.uy/bases/leyes/20327-2024',
  },
  {
    label: 'Ley 17.250, art. 16 — venta a distancia: 5 días hábiles para rescindir',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000',
  },
  {
    label: 'BCU — Portal del Usuario Financiero: reclamos y denuncias',
    url: 'https://usuariofinanciero.bcu.gub.uy/reclamos-y-denuncias/',
  },
  {
    label: 'Defensa del Consumidor (MEF) — el organismo que corresponde para fraude con tarjeta',
    url: 'https://www.gub.uy/tramites/consulta-reclamo-yo-denuncia-materia-defensa-consumidor',
  },
]

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/estafas-uruguay'
const title = 'Me estafaron en Uruguay: qué dice la ley y qué te tienen que devolver'
const description =
  'Tarjeta clonada, phishing, transferencia no autorizada, estafa de Marketplace: quién paga según la ley uruguaya, con el artículo al lado. La carga de la prueba es del emisor. Plazos, escalera de reclamo y una carta lista para copiar.'

defineOgImageComponent('Cambio', {
  title: 'Me estafaron: ¿qué me tienen que devolver?',
  subtitle: 'Lo que dice la ley uruguaya, con el artículo al lado',
  tag: 'ESTAFAS',
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
        'me estafaron uruguay, me clonaron la tarjeta uruguay, phishing banco uruguay, transferencia no autorizada, me vaciaron la cuenta, estafa marketplace uruguay, reclamo banco uruguay, ley 19731, denuncia bcu estafa',
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
.gap-card,
.sources-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
}
.verdict.v-success {
  border-left: 3px solid #16a34a;
}
.verdict.v-warning {
  border-left: 3px solid #ca8a04;
}
.verdict.v-error {
  border-left: 3px solid #dc2626;
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
.block-label--ok {
  color: #16a34a;
  opacity: 1;
}
.block-label--bad {
  color: #dc2626;
  opacity: 1;
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
.gap-card--bad {
  border-left: 3px solid rgba(220, 38, 38, 0.6);
}
.letter-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  max-height: 420px;
  overflow-y: auto;
}
.step-row {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px dashed rgba(var(--v-border-color), 0.18);
}
.step-row:last-child {
  border-bottom: none;
}
.step-when {
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(var(--v-theme-primary));
}
.step-title {
  font-size: 0.92rem;
  font-weight: 700;
}
.step-detail {
  font-size: 0.86rem;
  line-height: 1.6;
  opacity: 0.9;
}
.step-src {
  font-size: 0.72rem;
  opacity: 0.6;
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
  .step-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
