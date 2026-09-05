<template>
  <div class="noise-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-volume-off</VIcon>
              CONVIVENCIA
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              {{ t('heading') }}
            </h1>
            <p class="text-body-1 noise-lead">
              Guía paso a paso para denunciar ruidos molestos: qué límite en decibeles rige, qué
              datos te piden, qué canales no tienen costo y qué conviene resolver antes de
              denunciar. Incluye una plantilla lista para completar y enviar.
            </p>
            <nav :aria-label="t('navigation')" class="noise-navigation d-flex flex-wrap ga-2 mt-4">
              <VBtn
                href="#plantilla-denuncia"
                color="primary"
                variant="flat"
                data-cta="noise_prepare_complaint"
              >
                {{ t('useTemplate') }}
              </VBtn>
              <VBtn href="#donde-denunciar" variant="tonal">{{ t('where') }}</VBtn>
              <VBtn href="#denuncia-anonima" variant="text" data-cta="noise_anonymous">
                {{ t('anonymous') }}
              </VBtn>
            </nav>
            <ShareButtons class="mt-4" :url="canonicalUrl" :text="t('heading')" />
            <p class="text-caption text-medium-emphasis mt-3">
              Normas y trámites verificados contra su fuente el {{ verifiedDisplay }}.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. El límite -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cuánto ruido permite la norma</h2>
            <p class="text-body-1 noise-prose mb-3">
              El límite se mide <strong>dentro de tu vivienda</strong>. No se mide en la calle ni
              adentro del local que genera el ruido. Ese detalle define toda la denuncia: si el
              ruido no se percibe dentro de tu casa, no hay nada que medir.
            </p>
            <div class="table-scroll">
              <table class="noise-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Se aplica a</th>
                    <th>Límite</th>
                    <th>Cuándo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(limit, i) in limits" :key="i">
                    <td>{{ limit.subject }}</td>
                    <td data-label="Límite">{{ limit.value }}</td>
                    <td data-label="Cuándo">{{ limit.when }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-body-2 text-medium-emphasis mt-3 mb-0">
              Los valores son los que publica la Intendencia de Montevideo. La Ley 17.852 delega los
              niveles nacionales en el ministerio y deja la fiscalización en la autoridad
              departamental, así que el número que aplica un inspector es el de su Intendencia. Si
              vivís en otro departamento, consultá la normativa de la tuya.
            </p>
          </section>

          <!-- 2. Antes de denunciar -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Antes de denunciar</h2>
            <p class="text-body-1 noise-prose mb-4">
              Una denuncia sin registro se cae sola. Estas seis cosas deciden si la tuya prospera.
            </p>
            <div v-for="tip in tips" :key="tip.title" class="noise-tip mb-3">
              <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ tip.title }}</h3>
              <p class="text-body-2 noise-prose mb-0">{{ tip.body }}</p>
            </div>
          </section>

          <!-- 3. Paso a paso -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Paso a paso</h2>
            <ol class="noise-steps">
              <li v-for="(step, i) in steps" :key="i" class="mb-3">
                <span class="font-weight-bold">{{ step.name }}.</span>
                <span class="noise-prose">{{ ' ' + step.text }}</span>
              </li>
            </ol>
          </section>

          <!-- 4. Dónde se presenta -->
          <section id="donde-denunciar" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('whereHeading') }}</h2>
            <div class="table-scroll">
              <table class="noise-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Organismo</th>
                    <th>Para qué</th>
                    <th>Cómo</th>
                    <th>Costo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="channel in channels" :key="channel.id">
                    <td>
                      <a
                        :href="channel.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="noise-link"
                      >
                        {{ channel.authority }}
                      </a>
                      <span
                        v-if="channel.contact"
                        class="d-block text-caption text-medium-emphasis"
                      >
                        {{ channel.contact }}
                      </span>
                    </td>
                    <td data-label="Para qué">{{ channel.scope }}</td>
                    <td data-label="Cómo">{{ channel.how }}</td>
                    <td data-label="Costo">{{ channel.free ? 'Sin costo' : 'Con costo' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <VAlert type="warning" variant="tonal" density="comfortable" class="mt-4">
              <p class="mb-0 text-body-2">
                El trámite que publica la Intendencia de Montevideo está redactado para
                <strong>locales comerciales e industriales</strong>. Para un vecino particular no
                existe un trámite equivalente publicado. Si el ruido viene de una vivienda, consultá
                en tu Centro Comunal Zonal cuál es la vía y revisá antes el reglamento de
                copropiedad si vivís en un edificio.
              </p>
            </VAlert>
          </section>

          <section id="denuncia-anonima" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('anonymousHeading') }}</h2>
            <p class="text-body-1 noise-prose mb-3">{{ t('anonymousAnswer') }}</p>
            <a
              href="https://www.gub.uy/tramites/denuncias-ambiente"
              target="_blank"
              rel="noopener noreferrer"
              class="noise-link"
            >
              {{ t('anonymousSource') }}
            </a>
          </section>

          <!-- 5. La plantilla -->
          <section id="plantilla-denuncia" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Plantilla de la denuncia</h2>
            <p class="text-body-1 noise-prose mb-4">
              Completá los campos. El texto se arma solo, con los tres datos que exige la
              Intendencia arriba de todo. Lo que dejes vacío queda marcado como
              <code>[completar]</code>.
            </p>

            <VCard variant="flat" class="noise-form pa-4 mb-4">
              <VRow dense>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model="form.sourceAddress"
                    label="Calle y número del local o vivienda denunciada"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model="form.noiseKind"
                    label="Tipo de ruido (música, maquinaria, ladridos…)"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12">
                  <VTextField
                    v-model="form.schedule"
                    label="Cuándo ocurre (días y horarios)"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="4">
                  <VTextField
                    v-model="form.name"
                    label="Tu nombre"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="4">
                  <VTextField
                    v-model="form.address"
                    label="Tu dirección"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="4">
                  <VTextField
                    v-model="form.phone"
                    label="Tu teléfono"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12">
                  <VTextarea
                    v-model="form.log"
                    label="Registro de episodios (uno por línea: fecha, hora de inicio y de fin)"
                    variant="outlined"
                    density="comfortable"
                    rows="3"
                    hide-details
                  />
                </VCol>
                <VCol cols="12">
                  <VCheckbox
                    v-model="form.askedFirst"
                    label="Ya pedí en forma directa que bajaran el volumen"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
              </VRow>
            </VCard>

            <VAlert
              v-if="missing.length"
              type="info"
              variant="tonal"
              density="comfortable"
              class="mb-4"
            >
              <p class="mb-1 text-body-2 font-weight-bold">Todavía te faltan datos obligatorios:</p>
              <ul class="noise-missing mb-0">
                <li v-for="field in missing" :key="field">{{ field }}</li>
              </ul>
            </VAlert>

            <VCard variant="flat" class="noise-output pa-4">
              <pre class="noise-text">{{ complaintText }}</pre>
              <div class="d-flex flex-wrap ga-2 mt-4">
                <VBtn
                  color="primary"
                  variant="flat"
                  size="small"
                  :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
                  @click="copyText"
                >
                  {{ copied ? 'Copiado' : 'Copiar la denuncia' }}
                </VBtn>
                <SendMessage
                  :text="complaintText"
                  :actions="sendActions"
                  trigger-label="Enviar"
                  dialog-title="Enviar la denuncia"
                  intro="Elegí a dónde la mandás."
                  size="small"
                  trigger-variant="tonal"
                />
              </div>
            </VCard>
            <p class="text-body-2 noise-prose mt-4 mb-0">
              {{ t('nextStep') }}
              <NuxtLink
                :to="localePath('/a-quien-le-reclamo-uruguay')"
                class="noise-link"
                data-cta="noise_find_authority"
              >
                {{ t('findAuthority') }}
              </NuxtLink>
            </p>
          </section>

          <!-- 6. FAQ -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion" class="noise-faqs">
              <VExpansionPanel v-for="(faq, i) in faqs" :key="i">
                <VExpansionPanelTitle class="font-weight-medium">{{ faq.q }}</VExpansionPanelTitle>
                <VExpansionPanelText>
                  <p class="text-body-1 noise-prose mb-0">{{ faq.a }}</p>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 7. Fuentes -->
          <VCard variant="flat" class="noise-sources pa-5 mb-6">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">
              <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
              Fuentes
            </h2>
            <ul class="noise-sources-list">
              <li v-for="source in sources" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{
                  source.label
                }}</a>
                <span class="source-publisher"> — {{ source.publisher }}</span>
              </li>
            </ul>
          </VCard>

          <VCard variant="flat" class="noise-related pa-5">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguí leyendo</h2>
            <div class="d-flex flex-wrap ga-2">
              <VChip
                :to="localePath('/a-quien-le-reclamo-uruguay')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-help-network-outline</VIcon>
                ¿A quién le reclamo?
              </VChip>
              <VChip
                :to="localePath('/defensa-al-consumidor-uruguay')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-scale-balance</VIcon>
                Defensa al Consumidor
              </VChip>
              <VChip
                :to="localePath('/alquilar-en-uruguay')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-home-city-outline</VIcon>
                Alquilar en Uruguay
              </VChip>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import type { SendAction } from '~/utils/messageChannels'
import { noiseNavigationMessages } from '~/utils/noiseNavigationMessages'
import {
  NOISE_CHANNELS,
  NOISE_FAQS,
  NOISE_LIMITS,
  NOISE_SOURCES,
  NOISE_STEPS,
  NOISE_TIPS,
  NOISE_VERIFIED_AT,
  buildNoiseComplaintText,
  emptyNoiseComplaint,
  missingRequiredFields,
} from '~/utils/noiseComplaint'

const localePath = useLocalePath()
const { t } = useI18n({ useScope: 'local', messages: noiseNavigationMessages })

const limits = NOISE_LIMITS
const channels = NOISE_CHANNELS
const steps = NOISE_STEPS
const tips = NOISE_TIPS
const faqs = NOISE_FAQS.filter(faq => faq.q !== '¿Puedo denunciar de forma anónima?')
const sources = NOISE_SOURCES

const form = ref(emptyNoiseComplaint())
const complaintText = computed(() => buildNoiseComplaintText(form.value))
const missing = computed(() => missingRequiredFields(form.value))

const copied = ref(false)
async function copyText() {
  try {
    await navigator.clipboard.writeText(complaintText.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}

/**
 * Where the denuncia can be sent.
 *
 * The SIME inbox is the only address any source publishes for this matter, so it
 * is the only recipient pre-filled. The two free municipal channels are web
 * forms and counters: the component stages the text on the clipboard and opens
 * the page, because neither accepts a body over a URL.
 */
const sendActions = computed<SendAction[]>(() => [
  {
    channel: 'email',
    label: 'Correo al SIME (Intendencia de Montevideo)',
    to: 'sime@imm.gub.uy',
    subject: 'Denuncia por ruidos molestos',
    note: 'Es la oficina que mide el ruido.',
  },
  {
    channel: 'link',
    label: 'Buzón ciudadano (sin costo)',
    openUrl:
      'https://tramites.montevideo.gub.uy/tramites-y-tributos/denuncia/molestias-ruidos-molestos-humo-y-olores',
    copyFirst: true,
    note: 'Copiamos el texto: el formulario no acepta el cuerpo por enlace.',
  },
  {
    channel: 'link',
    label: 'Denuncia ambiental (Ministerio de Ambiente)',
    openUrl: 'https://www.gub.uy/tramites/denuncias-ambiente',
    copyFirst: true,
    note: 'Sin costo. Admite denuncia anónima.',
  },
])

const verifiedDisplay = computed(() =>
  new Date(NOISE_VERIFIED_AT).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)

const canonicalUrl = 'https://cambio-uruguay.com/denunciar-ruidos-molestos-uruguay'
const title = computed(() => t('title'))
const description = computed(() => t('description'))

defineOgImageComponent('Cambio', {
  title: title.value,
  subtitle: description.value,
  tag: 'DENUNCIA',
})

useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
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
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'HowTo',
            name: 'Cómo denunciar ruidos molestos en Uruguay',
            description: noiseNavigationMessages.es.description,
            inLanguage: 'es-UY',
            step: NOISE_STEPS.map((step, index) => ({
              '@type': 'HowToStep',
              position: index + 1,
              name: step.name,
              text: step.text,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: NOISE_FAQS.map(faq => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.a },
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
              { '@type': 'ListItem', position: 2, name: title.value, item: canonicalUrl },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.noise-page section[id] {
  scroll-margin-top: 96px;
}
.noise-navigation .v-btn {
  min-height: 44px;
  height: auto;
  max-width: 100%;
  white-space: normal;
  padding-block: 8px;
}

.noise-lead,
.noise-prose {
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.noise-steps {
  padding-left: 1.25rem;
  line-height: 1.7;
}
.noise-steps li {
  padding-left: 0.25rem;
}

.noise-tip,
.noise-form,
.noise-output,
.noise-sources,
.noise-related {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
}
.noise-tip {
  padding: 14px 16px;
}

.noise-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.86rem;
  line-height: 1.6;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.9);
}

.noise-missing {
  padding-left: 1.1rem;
  font-size: 0.88rem;
}

.noise-faqs :deep(.v-expansion-panel-title) {
  line-height: 1.5;
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
  min-height: 3.25rem;
}

.table-scroll {
  overflow-x: auto;
}
.noise-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}
.noise-table th,
.noise-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
  vertical-align: top;
}
.noise-table thead th {
  font-weight: 700;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.noise-table tbody td:first-child {
  font-weight: 600;
}

.noise-link,
.noise-sources-list a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}
.noise-link:hover,
.noise-sources-list a:hover {
  text-decoration: underline;
}

.noise-sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  line-height: 1.5;
}
.source-publisher {
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
