<!--
THESIS: El ruido del vecino sí tiene norma; lo que falla no es la ley sino la puerta. Policía para
que pare ahora, Intendencia para que midan y multen lo habitual, Justicia civil para el daño. Y una
denuncia sirve cuando pide la medición oficial y lleva un registro.
OWN-WORLD: Expediente de bolsillo dentro de la identidad nocturna de Cambio Uruguay: azul para la
acción, ámbar para la advertencia, superficies tonales con la norma siempre a la vista.
STORY: La persona ubica cuál de las tres puertas necesita, junta prueba, arma una denuncia con sus
hechos y la presenta por el canal correcto.
FIRST VIEWPORT: Tesis y acción a la izquierda; a la derecha, el umbral que define «cuánto ruido es
ilegal». El botón principal baja al generador.
-->
<template>
  <VContainer class="noise-page py-6 py-md-10">
    <header class="noise-hero on-dark mb-10">
      <div class="hero-copy">
        <p class="eyebrow">Convivencia · Uruguay</p>
        <h1>Ruidos molestos: cómo denunciar y que no quede en la nada</h1>
        <p class="hero-lead">
          La música al mango del vecino no es un problema sin ley: la Ley 17.852 la prohíbe y
          alcanza hasta lo doméstico. Lo que confunde es que
          <strong>no hay una sola puerta</strong>. La Policía sirve para que el ruido pare ahora, la
          Intendencia para que midan y multen lo que se repite, y la Justicia civil para el daño.
        </p>
        <div class="hero-actions">
          <VBtn
            color="primary"
            size="large"
            prepend-icon="mdi-file-edit-outline"
            @click="scrollToBuilder"
          >
            Armar mi denuncia
          </VBtn>
          <VBtn
            href="https://montevideo.gub.uy/areas-tematicas/convivencia/ruidos-molestos"
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            size="large"
            prepend-icon="mdi-open-in-new"
          >
            Ver la página oficial
          </VBtn>
        </div>
      </div>

      <aside class="decisive-frame" aria-labelledby="frame-title">
        <p class="frame-label">¿Cuánto ruido es «ilegal»?</p>
        <h2 id="frame-title">El umbral, medido dentro de tu casa</h2>
        <div class="threshold-row">
          <div class="threshold">
            <span class="threshold-value">45 dB</span>
            <span class="threshold-when">de día · 7 a 22 h</span>
          </div>
          <div class="threshold threshold--night">
            <span class="threshold-value">39 dB</span>
            <span class="threshold-when">de noche · 22 a 7 h</span>
          </div>
        </div>
        <p class="frame-note">
          Umbrales que publica la Intendencia de Montevideo. De noche el límite es más exigente: la
          misma música molesta más. No hay un límite nacional único, así que en el interior rige el
          de cada departamento.
        </p>
      </aside>
    </header>

    <!-- Por qué queda en la nada -->
    <section class="reading-section mb-10" aria-labelledby="pitfalls-title">
      <div class="section-intro">
        <p class="section-kicker">Lo primero</p>
        <h2 id="pitfalls-title">Por qué una denuncia «termina en la nada»</h2>
        <p>
          Casi nunca es porque el ruido sea legal. Es por cómo se hace la denuncia. Estos son los
          cuatro motivos más comunes, y el movimiento que corrige cada uno.
        </p>
      </div>
      <div class="pitfall-grid">
        <article v-for="(p, i) in NOISE_PITFALLS" :key="i" class="pitfall-card">
          <div class="pitfall-head">
            <VIcon aria-hidden="true" color="warning">mdi-alert-outline</VIcon>
            <h3>{{ p.problem }}</h3>
          </div>
          <p>{{ p.fix }}</p>
        </article>
      </div>
    </section>

    <!-- Las tres puertas -->
    <section id="puertas" class="mb-12" aria-labelledby="doors-title">
      <div class="section-intro">
        <p class="section-kicker">El canal correcto</p>
        <h2 id="doors-title">Las tres puertas</h2>
        <p>
          No compiten: se pueden usar las tres, en este orden. Lo que no conviene es golpear la
          equivocada, porque cada una resuelve una cosa distinta.
        </p>
      </div>

      <div class="doors">
        <article v-for="d in NOISE_DOORS" :id="d.id" :key="d.id" class="door-card">
          <div class="door-head">
            <div class="door-n">{{ d.n }}</div>
            <div class="door-titles">
              <div class="door-organism">{{ d.organism }}</div>
              <h3>{{ d.goal }}</h3>
            </div>
          </div>

          <p class="door-when"><strong>Cuándo:</strong> {{ d.when }}</p>
          <p class="door-detail">{{ d.detail }}</p>

          <div class="door-channels">
            <div class="door-subhead">Por dónde</div>
            <ul>
              <li v-for="(c, i) in d.channels" :key="i">
                <span class="channel-label">{{ c.label }}:</span>
                <a v-if="c.url" :href="c.url" target="_blank" rel="noopener noreferrer">
                  {{ c.value }}
                </a>
                <template v-else>{{ c.value }}</template>
              </li>
            </ul>
          </div>

          <VAlert type="warning" variant="tonal" density="comfortable" class="door-alert">
            <span class="font-weight-bold">Lo que esta puerta no hace.</span> {{ d.doesNot }}
          </VAlert>

          <p class="door-basis">{{ d.basis }}</p>
        </article>
      </div>
    </section>

    <!-- Prueba -->
    <section class="reading-section mb-10" aria-labelledby="evidence-title">
      <div class="section-intro">
        <p class="section-kicker">Antes de escribir</p>
        <h2 id="evidence-title">Juntá la prueba que hace la diferencia</h2>
        <p>
          La lista queda en tu navegador; no se sube ni se guarda nada. Lo que convierte «siempre
          molestan» en un expediente es el registro de episodios y pedir la medición oficial.
        </p>
      </div>
      <div class="evidence-layout">
        <div class="evidence-checks">
          <VCheckbox
            v-for="(item, index) in NOISE_EVIDENCE"
            :key="index"
            v-model="checkedEvidence"
            :value="index"
            :label="item"
            color="primary"
            density="comfortable"
            hide-details
          />
        </div>
        <div class="evidence-status" aria-live="polite">
          <VIcon size="30" color="primary">mdi-folder-check-outline</VIcon>
          <strong>{{ checkedEvidence.length }} de {{ NOISE_EVIDENCE.length }}</strong>
          <span>{{ evidenceMessage }}</span>
        </div>
      </div>
    </section>

    <!-- Generador -->
    <section id="generador" class="builder-section mb-12" aria-labelledby="builder-title">
      <div class="section-intro">
        <p class="section-kicker">Expediente de bolsillo</p>
        <h2 id="builder-title" ref="builderHeading" tabindex="-1">
          Armá la denuncia para la Intendencia
        </h2>
        <p>
          Es la denuncia administrativa: la que pide inspección y medición. Completá tus hechos; los
          campos que falten quedan marcados en el borrador para que los llenes antes de enviarlo.
        </p>
      </div>

      <div class="builder-shell">
        <form class="builder-form" @submit.prevent>
          <fieldset>
            <legend>1. Dónde</legend>
            <div class="field-grid">
              <VSelect
                v-model="form.department"
                :items="departmentItems"
                label="Departamento"
                variant="outlined"
                density="comfortable"
              />
              <VTextField
                v-model="form.sourceAddress"
                label="Dirección de la fuente del ruido"
                placeholder="Calle y número o referencia"
                variant="outlined"
                density="comfortable"
                autocomplete="off"
                class="field-span"
              />
              <VTextField
                v-model="form.ownAddress"
                label="Tu dirección (para que ubiquen y midan)"
                variant="outlined"
                density="comfortable"
                autocomplete="off"
                class="field-span"
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>2. Qué ruido y cuándo</legend>
            <div class="field-grid">
              <VSelect
                v-model="form.sourceType"
                :items="sourceTypeItems"
                label="Tipo de ruido"
                variant="outlined"
                density="comfortable"
              />
              <VSelect
                v-model="form.frequency"
                :items="frequencyItems"
                label="Frecuencia"
                variant="outlined"
                density="comfortable"
              />
              <VTextField
                v-if="form.sourceType === 'otro'"
                v-model="form.sourceTypeOther"
                label="Describí el ruido"
                variant="outlined"
                density="comfortable"
                autocomplete="off"
                class="field-span"
              />
              <VCheckbox
                v-model="form.atNight"
                label="Ocurre también de noche (22 a 7 h)"
                color="primary"
                density="comfortable"
                hide-details
                class="field-span"
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>3. El registro</legend>
            <VTextarea
              v-model="form.episodes"
              label="Episodios: fecha, hora y descripción"
              placeholder="10/08 de 23:30 a 02:00, música a alto volumen&#10;11/08 de 22:00 a 01:00, parlantes"
              variant="outlined"
              rows="4"
              auto-grow
            />
            <VCheckbox
              v-model="form.talkedToNeighbor"
              label="Ya hablé con los responsables y no cambió nada"
              color="primary"
              density="comfortable"
              hide-details
            />
          </fieldset>

          <fieldset>
            <legend>4. Tus datos</legend>
            <div class="field-grid">
              <VTextField
                v-model="form.fullName"
                label="Nombre y apellido"
                variant="outlined"
                density="comfortable"
                autocomplete="off"
              />
              <VTextField
                v-model="form.phone"
                label="Teléfono de contacto"
                variant="outlined"
                density="comfortable"
                autocomplete="off"
              />
            </div>
          </fieldset>

          <VAlert
            v-if="missingFields.length"
            type="info"
            variant="tonal"
            density="compact"
            icon="mdi-form-select"
          >
            <strong>Faltan datos:</strong> {{ missingFields.join(', ') }}. Podés copiar el borrador,
            pero «Presentar» se habilita cuando los completes.
          </VAlert>

          <p class="privacy-note">
            <VIcon size="17" aria-hidden="true">mdi-shield-lock-outline</VIcon>
            Todo se arma localmente en tu navegador. Cambio Uruguay no recibe ni guarda estos datos.
          </p>
        </form>

        <aside class="complaint-preview" aria-labelledby="preview-title">
          <div class="preview-heading">
            <div>
              <p class="preview-label">Vista previa</p>
              <h3 id="preview-title">Denuncia por ruidos molestos</h3>
              <p class="preview-hint">Podés completar o corregir el texto antes de copiarlo.</p>
            </div>
            <VChip size="small" variant="tonal" color="primary">Editable</VChip>
          </div>
          <textarea
            v-model="editableComplaint"
            class="complaint-editor"
            aria-label="Texto editable de la denuncia"
            spellcheck="true"
          />
          <div class="preview-actions">
            <VBtn
              :color="copyStatus === 'success' ? 'success' : 'primary'"
              :prepend-icon="copyStatus === 'success' ? 'mdi-check' : 'mdi-content-copy'"
              @click="copyComplaint"
            >
              {{ copyStatus === 'success' ? 'Texto copiado' : 'Copiar texto' }}
            </VBtn>
            <SendMessage
              :text="editableComplaint"
              :actions="sendActions"
              :disabled="missingFields.length > 0"
              trigger-label="Presentar"
              dialog-title="¿Por dónde presentar la denuncia?"
              :intro="sendIntro"
            />
          </div>
          <p
            v-if="copyMessage"
            class="copy-feedback"
            :class="{ 'copy-feedback--error': copyStatus === 'error' }"
            aria-live="polite"
          >
            {{ copyMessage }}
          </p>
        </aside>
      </div>
    </section>

    <!-- Referencia de decibeles -->
    <section class="reading-section mb-10" aria-labelledby="thresholds-title">
      <div class="section-intro">
        <p class="section-kicker">Referencia</p>
        <h2 id="thresholds-title">Los límites que rigen en Montevideo</h2>
        <p>
          Como la Ley 17.852 no fue reglamentada a nivel nacional, los números que valen son los
          departamentales. Estos son los de Montevideo.
        </p>
      </div>
      <div class="threshold-table" role="list">
        <div v-for="t in NOISE_THRESHOLDS" :key="t.context" role="listitem">
          <span class="tt-limit">{{ t.limit }}</span>
          <div class="tt-body">
            <strong>{{ t.context }}</strong>
            <span>{{ t.note }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="reading-section mb-10" aria-labelledby="faq-title">
      <div class="section-intro">
        <p class="section-kicker">Dudas frecuentes</p>
        <h2 id="faq-title">Lo que conviene saber antes de denunciar</h2>
      </div>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in NOISE_FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <div>
              <div class="font-weight-medium">{{ f.question }}</div>
              <div class="text-caption text-medium-emphasis">{{ f.short }}</div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText class="faq-answer">{{ f.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Fuentes -->
    <section class="sources-section mb-8" aria-labelledby="sources-title">
      <div class="section-intro">
        <p class="section-kicker">Fuentes</p>
        <h2 id="sources-title">
          Qué es ley, qué publica la Intendencia y qué es competencia nacional
        </h2>
        <p>
          Contrastado el {{ verifiedAt }}. Cada afirmación de la página se apoya en una de estas.
        </p>
      </div>
      <ul class="sources-list">
        <li v-for="s in NOISE_SOURCES" :key="s.label">
          <span class="source-kind" :class="`source-kind--${s.kind}`">{{
            sourceKindLabel(s.kind)
          }}</span>
          <div>
            <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
            <span>{{ s.publisher }}</span>
          </div>
        </li>
      </ul>
    </section>

    <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-scale-balance">
      {{ NOISE_DISCLAIMER }}
    </VAlert>

    <!-- Related -->
    <section class="related mt-8">
      <h2 class="text-h6 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/a-quien-le-reclamo-uruguay')" variant="tonal" size="small">
          ¿A quién le reclamo?
        </VBtn>
        <VBtn :to="localePath('/defensa-al-consumidor-uruguay')" variant="tonal" size="small">
          Defensa del Consumidor
        </VBtn>
        <VBtn :to="localePath('/alquilar-en-uruguay')" variant="tonal" size="small">
          Alquilar en Uruguay
        </VBtn>
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import type { SendAction } from '~/utils/messageChannels'
import {
  buildNoiseComplaint,
  NOISE_DEPARTMENTS,
  NOISE_DISCLAIMER,
  NOISE_DOORS,
  NOISE_EVIDENCE,
  NOISE_FAQ,
  NOISE_FREQUENCIES,
  NOISE_PITFALLS,
  NOISE_SOURCE_TYPES,
  NOISE_SOURCES,
  NOISE_THRESHOLDS,
  NOISE_VERIFIED_AT,
  noiseMissingFields,
  type NoiseComplaintInput,
} from '~/utils/noiseComplaint'

const localePath = useLocalePath()
const canonicalUrl = 'https://cambio-uruguay.com/denunciar-ruidos-molestos-uruguay'

const MVD_TRAMITE_URL =
  'https://tramites.montevideo.gub.uy/tramites-y-tributos/denuncia/molestias-ruidos-molestos-humo-y-olores'

const form = reactive<NoiseComplaintInput>({
  department: 'montevideo',
  sourceAddress: '',
  ownAddress: '',
  sourceType: '',
  sourceTypeOther: '',
  frequency: '',
  atNight: false,
  episodes: '',
  talkedToNeighbor: false,
  fullName: '',
  phone: '',
})

const departmentItems = NOISE_DEPARTMENTS.map(d => ({ title: d.label, value: d.value }))
const sourceTypeItems = NOISE_SOURCE_TYPES.map(t => ({ title: t.label, value: t.value }))
const frequencyItems = NOISE_FREQUENCIES.map(f => ({ title: f.label, value: f.value }))

const checkedEvidence = ref<number[]>([])
const copyStatus = ref<'idle' | 'success' | 'error'>('idle')
const editableComplaint = ref('')
const builderHeading = ref<HTMLElement | null>(null)

const complaint = computed(() => buildNoiseComplaint(form))
const missingFields = computed(() => noiseMissingFields(form))

watch(
  complaint,
  value => {
    editableComplaint.value = value
    copyStatus.value = 'idle'
  },
  { immediate: true }
)

const evidenceMessage = computed(() => {
  if (checkedEvidence.value.length >= NOISE_EVIDENCE.length)
    return 'Tenés el expediente básico completo. Guardá todo con fecha.'
  if (checkedEvidence.value.length >= 3)
    return 'Ya hay una base útil. El registro de episodios es lo que más pesa.'
  return 'Empezá por el registro de fechas y horas: es la pieza que no se puede archivar.'
})

const copyMessage = computed(() => {
  if (copyStatus.value === 'success') return 'La denuncia quedó copiada.'
  if (copyStatus.value === 'error')
    return 'No pudimos copiar automáticamente. Seleccioná el texto de la vista previa y copialo a mano.'
  return ''
})

const sendIntro = computed(() =>
  form.department === 'montevideo'
    ? 'Copiá el texto y presentalo por el Buzón Ciudadano de la Intendencia, o por teléfono o WhatsApp. Pedí siempre que vayan a medir.'
    : 'Copiá el texto y presentalo en tu Intendencia: cada departamento tiene su propia oficina de ruidos. Pedí siempre que vayan a medir.'
)

const sendActions = computed<SendAction[]>(() => {
  if (form.department === 'montevideo')
    return [
      {
        channel: 'link',
        label: 'Denunciar por el Buzón Ciudadano',
        openUrl: MVD_TRAMITE_URL,
        icon: 'mdi-open-in-new',
        color: 'primary',
        copyFirst: true,
        note: 'Trámite sin costo; el texto queda copiado para pegarlo.',
      },
      {
        channel: 'link',
        label: 'Llamar a la Intendencia (1950)',
        openUrl: 'tel:1950',
        icon: 'mdi-phone-outline',
        color: 'green-darken-1',
        note: 'Línea central de la Intendencia de Montevideo.',
      },
      {
        channel: 'link',
        label: 'WhatsApp de la Intendencia (099 019500)',
        openUrl: 'https://wa.me/59899019500',
        icon: 'mdi-whatsapp',
        color: 'green-darken-2',
        copyFirst: true,
        note: 'Pegá el texto en el chat.',
      },
    ]

  return [
    {
      channel: 'link',
      label: 'Buscar el trámite de mi Intendencia',
      openUrl: 'https://www.gub.uy/tramites/',
      icon: 'mdi-open-in-new',
      color: 'primary',
      copyFirst: true,
      note: 'Buscá «ruidos molestos» o «contaminación acústica» en tu departamento; el texto queda copiado.',
    },
  ]
})

function sourceKindLabel(kind: string): string {
  if (kind === 'ley') return 'ley'
  if (kind === 'intendencia') return 'intendencia'
  return 'nacional'
}

function scrollToBuilder() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  builderHeading.value?.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'start',
  })
  builderHeading.value?.focus({ preventScroll: true })
}

async function copyComplaint() {
  try {
    await navigator.clipboard.writeText(editableComplaint.value)
    copyStatus.value = 'success'
    setTimeout(() => (copyStatus.value = 'idle'), 3000)
  } catch {
    copyStatus.value = 'error'
  }
}

const verifiedAt = new Date(NOISE_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const title = 'Ruidos molestos en Uruguay: cómo denunciar al vecino paso a paso'
const description =
  'El vecino pone la música al mango y ya hablaste con ellos: qué se puede hacer. Las tres puertas —la Policía (911) para el ruido en curso, la Intendencia para que midan y multen lo habitual, y la vía civil— con los canales reales, los límites de decibeles de Montevideo y un generador para armar tu denuncia.'

defineOgImageComponent('Cambio', {
  title: 'Ruidos molestos: cómo denunciar',
  subtitle: 'Policía, Intendencia y vía civil, con la norma en la mano',
  tag: 'CONVIVENCIA',
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
        'ruidos molestos uruguay, denunciar ruidos molestos, denunciar al vecino por ruido, musica fuerte vecinos uruguay, denuncia ruidos intendencia montevideo, ley 17852 contaminacion acustica, ruidos molestos de noche uruguay, a quien llamar por ruidos molestos, 911 ruidos molestos, decibeles permitidos montevideo',
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
                name: 'Denunciar ruidos molestos',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: NOISE_FAQ.map(f => ({
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
.noise-page {
  max-width: 1180px;
}

.noise-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr);
  gap: 40px;
  padding: clamp(24px, 5vw, 56px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: #121a2e;
  box-shadow: 16px 24px 48px rgba(0, 0, 0, 0.24);
}

.hero-copy,
.decisive-frame,
.complaint-preview {
  min-width: 0;
}

.eyebrow,
.section-kicker,
.frame-label,
.preview-label {
  margin: 0 0 8px;
  color: rgb(var(--v-theme-link));
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  line-height: 1.4;
  text-transform: uppercase;
}

.hero-copy h1 {
  max-width: 20ch;
  margin: 0;
  font-size: clamp(1.85rem, 4.8vw, 3.4rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.06;
  text-wrap: balance;
}

.hero-lead {
  max-width: 66ch;
  margin: 24px 0 0;
  color: #cbd5e1;
  font-size: 1.02rem;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.hero-actions :deep(.v-btn) {
  min-height: 44px;
}

.decisive-frame {
  align-self: center;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 12px;
  background: #0a0e1a;
}

.decisive-frame h2 {
  max-width: 18ch;
  margin: 0 0 18px;
  font-size: clamp(1.25rem, 3vw, 1.6rem);
  line-height: 1.2;
  text-wrap: balance;
}

.threshold-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.threshold {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(100, 181, 246, 0.06);
}

.threshold--night {
  background: rgba(255, 143, 0, 0.08);
}

.threshold-value {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.threshold-when {
  color: #b3bdcc;
  font-size: 0.78rem;
}

.frame-note {
  margin: 14px 0 0;
  color: #cbd5e1;
  font-size: 0.78rem;
  line-height: 1.55;
}

.reading-section,
.builder-section,
.sources-section {
  scroll-margin-top: 88px;
}

.section-intro {
  max-width: 74ch;
  margin-bottom: 24px;
}

.section-intro h2 {
  margin: 0;
  font-size: clamp(1.45rem, 3.2vw, 2.1rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.16;
  text-wrap: balance;
}

.section-intro > p:last-child {
  margin: 10px 0 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.96rem;
  line-height: 1.65;
  opacity: 0.76;
}

/* Pitfalls */
.pitfall-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.pitfall-card {
  min-width: 0;
  padding: 20px;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 14px;
  background: rgba(var(--v-theme-on-surface), 0.015);
}

.pitfall-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 8px;
}

.pitfall-head h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
}

.pitfall-card p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  opacity: 0.82;
}

/* Doors */
.doors {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.door-card {
  min-width: 0;
  padding: clamp(20px, 3vw, 28px);
  border: 1px solid rgba(var(--v-theme-primary), 0.4);
  border-radius: 16px;
  background: rgba(var(--v-theme-on-surface), 0.015);
  scroll-margin-top: 88px;
}

.door-head {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.door-n {
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.1;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}

.door-titles {
  min-width: 0;
}

.door-organism {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  opacity: 0.66;
}

.door-titles h3 {
  margin: 2px 0 0;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.25;
}

.door-when {
  margin: 0 0 10px;
  font-size: 0.92rem;
  line-height: 1.6;
}

.door-detail {
  margin: 0 0 16px;
  font-size: 0.94rem;
  line-height: 1.68;
  opacity: 0.86;
}

.door-channels {
  margin-bottom: 14px;
}

.door-subhead {
  margin-bottom: 6px;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  opacity: 0.7;
}

.door-channels ul {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
  font-size: 0.9rem;
  line-height: 1.55;
}

.channel-label {
  font-weight: 600;
}

.door-channels a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  overflow-wrap: anywhere;
}

.door-alert {
  margin-bottom: 12px;
}

.door-basis {
  margin: 0;
  color: rgb(var(--v-theme-primary));
  font-size: 0.8rem;
  font-weight: 600;
}

/* Evidence */
.evidence-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 32px;
  align-items: start;
  padding: 24px;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 16px;
}

.evidence-checks {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.evidence-checks :deep(.v-label) {
  font-size: 0.9rem;
  line-height: 1.5;
  opacity: 0.9;
}

.evidence-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}

.evidence-status strong {
  font-size: 1.05rem;
}

.evidence-status span {
  font-size: 0.86rem;
  line-height: 1.55;
  opacity: 0.75;
}

/* Builder */
.builder-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.82fr);
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), 0.18);
  border-radius: 16px;
}

.builder-form {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: clamp(18px, 3vw, 32px);
}

.builder-form fieldset {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
}

.builder-form legend {
  margin-bottom: 8px;
  font-size: 0.88rem;
  font-weight: 800;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.field-span {
  grid-column: 1 / -1;
}

.privacy-note {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: -6px 0 0;
  font-size: 0.78rem;
  line-height: 1.5;
  opacity: 0.72;
}

.complaint-preview {
  align-self: stretch;
  padding: clamp(18px, 3vw, 28px);
  border-top: 1px solid rgba(var(--v-border-color), 0.14);
  background: rgba(var(--v-theme-primary), 0.045);
}

.preview-heading {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.preview-heading h3 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.4;
}

.preview-hint {
  margin: 4px 0 0;
  font-size: 0.75rem;
  line-height: 1.45;
  opacity: 0.66;
}

.complaint-editor {
  width: 100%;
  min-height: 460px;
  max-height: 720px;
  padding: 0;
  overflow: auto;
  border: 0;
  outline: 0;
  color: inherit;
  background: transparent;
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.62;
  overflow-wrap: anywhere;
  resize: vertical;
}

.complaint-editor:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 5px;
}

.preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.preview-actions :deep(.v-btn) {
  min-height: 44px;
}

.copy-feedback {
  margin: 12px 0 0;
  color: rgb(var(--v-theme-success));
  font-size: 0.78rem;
  line-height: 1.5;
}

.copy-feedback--error {
  color: rgb(var(--v-theme-error));
}

/* Threshold table */
.threshold-table {
  border-top: 1px solid rgba(var(--v-border-color), 0.18);
}

.threshold-table > div {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 18px;
  align-items: baseline;
  padding: 16px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}

.tt-limit {
  font-size: 1.15rem;
  font-weight: 800;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}

.tt-body {
  min-width: 0;
}

.tt-body strong {
  display: block;
  font-size: 0.92rem;
}

.tt-body span {
  display: block;
  margin-top: 3px;
  font-size: 0.82rem;
  line-height: 1.5;
  opacity: 0.72;
}

.faq-answer {
  font-size: 0.9rem;
  line-height: 1.68;
}

/* Sources */
.sources-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
  border-top: 1px solid rgba(var(--v-border-color), 0.18);
  list-style: none;
}

.sources-list li {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  padding: 14px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}

.sources-list a,
.sources-list span {
  display: block;
}

.sources-list a {
  color: rgb(var(--v-theme-link));
  font-size: 0.88rem;
  font-weight: 650;
  line-height: 1.45;
}

.sources-list div > span {
  margin-top: 3px;
  font-size: 0.75rem;
  opacity: 0.66;
}

.source-kind {
  width: fit-content;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.source-kind--ley {
  color: rgb(var(--v-theme-on-primary));
  background: rgb(var(--v-theme-primary));
}

.source-kind--intendencia {
  color: rgb(var(--v-theme-on-warning));
  background: rgb(var(--v-theme-warning));
}

.source-kind--nacional {
  color: rgb(var(--v-theme-on-surface));
  background: rgba(var(--v-theme-on-surface), 0.12);
}

@media (min-width: 960px) {
  .complaint-preview {
    border-top: 0;
    border-left: 1px solid rgba(var(--v-border-color), 0.14);
  }
}

@media (max-width: 959px) {
  .noise-hero,
  .builder-shell {
    grid-template-columns: 1fr;
  }

  .noise-hero {
    gap: 28px;
  }

  .evidence-layout {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .evidence-status {
    padding-top: 18px;
    border-top: 1px solid rgba(var(--v-border-color), 0.16);
  }
}

@media (max-width: 599px) {
  .noise-page {
    padding-right: 12px;
    padding-left: 12px;
  }

  .noise-hero {
    padding: 22px 18px;
    border-radius: 12px;
  }

  .hero-copy h1 {
    max-width: none;
  }

  .hero-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .hero-actions :deep(.v-btn) {
    width: 100%;
  }

  .decisive-frame {
    padding: 18px;
  }

  .pitfall-grid,
  .field-grid {
    grid-template-columns: 1fr;
  }

  .field-span {
    grid-column: auto;
  }

  .evidence-layout {
    padding: 18px;
  }

  .threshold-table > div {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 12px;
  }

  .sources-list li {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
