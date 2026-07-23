<template>
  <VContainer class="page py-6 py-md-10">
    <header class="hero mb-6">
      <p class="eyebrow">Derechos del consumidor · Compras online · Uruguay</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        Problemas con una compra online: qué podés exigir en cada caso
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        La respuesta que circula es "no compres más ahí". Pero la
        <strong>Ley 17.250 de Relaciones de Consumo</strong> dice bastante más de lo que la gente
        cree: es de <strong>orden público</strong>, así que tus derechos son
        <strong>irrenunciables</strong> y ninguna letra chica te los saca. Acá está el marco, con el
        artículo al lado, desde una entrega que no llega hasta un producto fallado, un cobro de más
        o una garantía incumplida. Elegí tu caso y armá un reclamo listo para copiar.
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
      <h2 class="section-heading mb-1">¿Qué te pasó?</h2>
      <p class="text-body-2 text-medium-emphasis mb-5">
        Hay {{ CONSUMER_SCENARIOS.length }} rutas de reclamo. Elegí la que mejor describa el
        problema; el diagnóstico y la plantilla se actualizan juntos.
      </p>
      <div class="scenario-groups">
        <div v-for="group in CONSUMER_SCENARIO_GROUPS" :key="group.id" class="scenario-group">
          <div class="scenario-group-heading">
            <VIcon size="20" color="primary">{{ group.icon }}</VIcon>
            <div>
              <h3>{{ group.label }}</h3>
              <p>{{ group.description }}</p>
            </div>
          </div>
          <div class="scenarios">
            <button
              v-for="s in CONSUMER_SCENARIOS.filter(item => item.group === group.id)"
              :key="s.id"
              type="button"
              class="scenario"
              :class="{ 'scenario--on': s.id === activeId }"
              :aria-pressed="s.id === activeId"
              @click="activeId = s.id"
            >
              <VIcon size="20" class="mb-1">{{ s.icon }}</VIcon>
              <span class="scenario-label">{{ s.label }}</span>
              <span class="scenario-short">{{ s.short }}</span>
            </button>
          </div>
        </div>
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
        <div class="complaint-builder mb-4">
          <div class="d-flex align-center ga-2 mb-3">
            <VIcon color="primary">mdi-tune-variant</VIcon>
            <div>
              <p class="builder-title mb-0">Personalizá el reclamo</p>
              <p class="builder-caption mb-0">El texto cambia al instante con tus selecciones.</p>
            </div>
          </div>
          <VRow>
            <VCol cols="12" md="7">
              <VSelect
                v-model="activeId"
                :items="incidentOptions"
                label="Tipo de incidente"
                variant="outlined"
                density="comfortable"
                hide-details
                prepend-inner-icon="mdi-alert-circle-outline"
              />
            </VCol>
            <VCol cols="12" md="5">
              <VSelect
                v-model="selectedRemedyId"
                :items="remedyOptions"
                label="Qué querés que haga el comercio"
                variant="outlined"
                density="comfortable"
                hide-details
                prepend-inner-icon="mdi-target"
              />
            </VCol>
          </VRow>
        </div>
        <pre class="letter-text">{{ letter }}</pre>
        <div class="d-flex justify-end flex-wrap ga-2 mt-3">
          <VBtn
            :color="copied ? 'success' : 'primary'"
            variant="tonal"
            size="small"
            :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
            @click="copyLetter"
          >
            {{ copied ? 'Copiado' : 'Copiar el reclamo' }}
          </VBtn>
          <SendMessage
            :text="letter"
            :actions="letterSendActions"
            trigger-label="Enviar el reclamo"
            dialog-title="¿A dónde mandás el reclamo?"
            intro="Primero reclamá al comercio. Si no responde en el plazo, escalá a Defensa del Consumidor."
          />
        </div>
      </VCard>
    </section>

    <!-- Rights -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Qué te da la Ley 17.250</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        {{ CONSUMER_RIGHTS.length }} reglas que cubren productos, servicios y contenido digital.
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

    <!-- Retract exceptions -->
    <section class="mb-8">
      <VCard variant="flat" class="exceptions-card pa-5 pa-sm-6">
        <div class="d-flex align-start ga-3 mb-4">
          <VIcon color="warning" size="28">mdi-information-outline</VIcon>
          <div>
            <h2 class="section-heading mb-1">Cuándo no aplica el arrepentimiento de 5 días</h2>
            <p class="text-body-2 text-medium-emphasis mb-0">
              El art. 16-BIS enumera estas excepciones. Que no haya retracto
              <strong>no elimina</strong> el reclamo por defecto, publicidad engañosa o
              incumplimiento.
            </p>
          </div>
        </div>
        <ul class="exceptions-list">
          <li v-for="exception in RETRACT_EXCEPTIONS" :key="exception">{{ exception }}</li>
        </ul>
      </VCard>
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
          <NuxtLink :to="localePath('/estafas-uruguay')" class="xlink">
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
          <NuxtLink :to="localePath('/problemas-con-la-aduana-uruguay')" class="xlink">
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

    <!-- Share this guide -->
    <section class="mb-8" aria-label="Compartí esta guía">
      <VCard variant="flat" class="share-card pa-5 pa-sm-6">
        <div class="d-flex align-center ga-2 mb-2">
          <VIcon color="primary">mdi-share-variant-outline</VIcon>
          <h2 class="text-subtitle-1 font-weight-bold mb-0">
            ¿Le pasó a alguien? Pasale la respuesta
          </h2>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Respuesta lista para pegar en Reddit, Instagram o un grupo de WhatsApp: cita la ley y
          enlaza esta guía.
        </p>
        <VCard variant="flat" class="reply-box pa-4 mb-3">
          <p class="reply-text mb-0">{{ replyText }}</p>
        </VCard>
        <div class="d-flex flex-wrap ga-2">
          <VBtn
            :color="replyCopied ? 'success' : 'primary'"
            variant="tonal"
            size="small"
            :prepend-icon="replyCopied ? 'mdi-check' : 'mdi-content-copy'"
            @click="copyReply"
          >
            {{ replyCopied ? 'Copiado' : 'Copiar respuesta' }}
          </VBtn>
          <VBtn
            :href="waShare"
            target="_blank"
            rel="noopener noreferrer"
            color="success"
            variant="tonal"
            size="small"
            prepend-icon="mdi-whatsapp"
          >
            WhatsApp
          </VBtn>
          <VBtn
            :href="xShare"
            target="_blank"
            rel="noopener noreferrer"
            variant="tonal"
            size="small"
            prepend-icon="mdi-alpha-x-box-outline"
          >
            X / Twitter
          </VBtn>
        </div>
      </VCard>
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
  buildConsumerComplaint,
  COMPLAINT_STEPS,
  CONSUMER_FAQS,
  CONSUMER_RIGHTS,
  CONSUMER_SCENARIO_GROUPS,
  CONSUMER_SCENARIOS,
  CONSUMER_SOURCES,
  GOLDEN_RULE,
  KEY_FIGURES,
  RETRACT_EXCEPTIONS,
  scenarioById,
} from '~/utils/consumerRights'
import type { SendAction } from '~/utils/messageChannels'
import { DEFENSA_CONSUMIDOR_FORM, DEFENSA_CONSUMIDOR_PHONE } from '~/utils/officialContacts'

const localePath = useLocalePath()

const activeId = ref(CONSUMER_SCENARIOS[0]!.id)
const active = computed(() => scenarioById(activeId.value))
const incidentOptions = CONSUMER_SCENARIOS.map(scenario => ({
  title: scenario.label,
  value: scenario.id,
}))
const selectedRemedyId = ref(CONSUMER_SCENARIOS[0]!.remedies[0]!.id)
const copied = ref(false)
const remedyOptions = computed(
  () => active.value?.remedies.map(remedy => ({ title: remedy.label, value: remedy.id })) ?? []
)

watch(active, scenario => {
  selectedRemedyId.value = scenario?.remedies[0]?.id ?? ''
  copied.value = false
})

/** Un reclamo que el lector puede mandar, citando el artículo que respalda su caso. */
const letter = computed(() => buildConsumerComplaint(activeId.value, selectedRemedyId.value))

async function copyLetter() {
  try {
    await navigator.clipboard.writeText(letter.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}

// Where the reclamo goes. The letter is addressed to the SELLER (user fills the address in their
// mail client). Defensa del Consumidor only takes reclamos through a login-gated web form or by
// phone — never email — so those are open-the-form / call, with the text on the clipboard to paste.
const letterSendActions = computed<SendAction[]>(() => [
  {
    channel: 'email',
    label: 'Enviar por correo al comercio',
    subject: 'Reclamo en materia de relación de consumo',
    icon: 'mdi-email-outline',
    color: 'primary',
    note: 'Se abre tu correo; agregá la dirección del comercio.',
  },
  {
    channel: 'link',
    label: 'Reclamar en Defensa del Consumidor',
    openUrl: DEFENSA_CONSUMIDOR_FORM,
    icon: 'mdi-gavel',
    color: 'deep-purple',
    copyFirst: true,
    note: 'Trámite gratuito (requiere usuario gub.uy). Pegá el reclamo en el formulario.',
  },
  {
    channel: 'link',
    label: `Llamar a Defensa del Consumidor (${DEFENSA_CONSUMIDOR_PHONE})`,
    openUrl: `tel:${DEFENSA_CONSUMIDOR_PHONE.replace(/\s/g, '')}`,
    icon: 'mdi-phone',
    color: 'green-darken-1',
    note: 'Línea gratuita, lunes a viernes de 9:30 a 16 h.',
  },
])

const canonicalUrl = 'https://cambio-uruguay.com/derechos-consumidor-compras-online'

// --- Compartí esta guía: respuesta lista para pegar en redes ---
const replyText =
  'Si una compra online no llega, viene fallada o distinta, no cumplen la garantía, cobran de más ' +
  'o no aceptan la baja, te ampara la Ley 17.250. Ante el incumplimiento, el art. 33 permite elegir ' +
  'entre cumplimiento, sustitución o devolución actualizada; los defectos tienen plazos propios y ' +
  'las ventas a distancia admiten retracto en 5 días hábiles, salvo excepciones. Armá el reclamo por ' +
  `tipo de incidente y presentalo gratis ante Defensa del Consumidor. Guía: ${canonicalUrl}`
const shareShort =
  'Compra online con atraso, defecto, cobro o garantía incumplida: elegí el incidente y generá un ' +
  'reclamo basado en la Ley 17.250. Guía + modelo:'
const waShare = `https://wa.me/?text=${encodeURIComponent(replyText)}`
const xShare = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareShort)}&url=${encodeURIComponent(canonicalUrl)}`

const replyCopied = ref(false)
async function copyReply() {
  try {
    await navigator.clipboard.writeText(replyText)
    replyCopied.value = true
    setTimeout(() => (replyCopied.value = false), 2000)
  } catch {
    replyCopied.value = false
  }
}

// --- SEO ---
const title = 'Derechos del consumidor en compras online: reclamos por cada incidente'
const description =
  'Guía uruguaya para reclamar entregas atrasadas, productos defectuosos o distintos, garantías, cobros incorrectos, renovaciones, publicidad y servicios online. Elegí el incidente y generá un texto basado en la Ley 17.250.'

defineOgImageComponent('Cambio', {
  title: 'Tu compra online salió mal',
  subtitle: 'Elegí el incidente y armá el reclamo con la Ley 17.250',
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
        'derechos del consumidor uruguay, producto defectuoso uruguay, garantia legal uruguay, compra online no llega, defensa del consumidor uruguay, ley 17250, derecho de arrepentimiento, retracto compra web, no me devuelven la plata, cancelar compra online uruguay, renovacion automatica, publicidad enganosa uruguay',
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
.scenario-groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.scenario-group {
  padding-left: 14px;
  border-left: 2px solid rgba(var(--v-theme-primary), 0.28);
}
.scenario-group-heading {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}
.scenario-group-heading h3 {
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.35;
}
.scenario-group-heading p {
  margin: 1px 0 0;
  font-size: 0.78rem;
  line-height: 1.45;
  opacity: 0.68;
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
.scenario:focus-visible {
  outline: 3px solid rgba(var(--v-theme-primary), 0.4);
  outline-offset: 2px;
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
.share-card,
.sources-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
}

/* Share */
.share-card {
  border-left: 3px solid rgb(var(--v-theme-primary));
}
.reply-box {
  background: rgba(var(--v-theme-primary), 0.05);
  border: 1px dashed rgba(var(--v-theme-primary), 0.35);
  border-radius: 12px;
}
.reply-text {
  font-size: 0.86rem;
  line-height: 1.65;
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
.complaint-builder {
  padding: 14px;
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.06);
}
.builder-title {
  font-size: 0.9rem;
  font-weight: 800;
}
.builder-caption {
  font-size: 0.75rem;
  line-height: 1.4;
  opacity: 0.68;
}
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

/* Retract exceptions */
.exceptions-card {
  border: 1px solid rgba(var(--v-theme-warning), 0.28);
  border-radius: 14px;
  background: rgba(var(--v-theme-warning), 0.035);
}
.exceptions-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 28px;
  margin: 0;
  padding-left: 22px;
  font-size: 0.84rem;
  line-height: 1.55;
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
  .scenario-group {
    padding-left: 10px;
  }
  .exceptions-list {
    grid-template-columns: 1fr;
  }
  .step-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scenario,
  .xlink-card {
    transition: none;
  }
}
</style>
