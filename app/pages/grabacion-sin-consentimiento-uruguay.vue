<template>
  <div class="rec-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-video-off-outline</VIcon>
              PRIVACIDAD
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              {{ t('heading') }}
            </h1>
            <p class="text-body-1 rec-lead">
              Te grabaron sin que te dieras cuenta y el video está publicado. Acá está qué dice la
              ley uruguaya, por qué el botón de reportar de la app casi nunca alcanza, cuál es el
              formulario que sí corresponde y qué plazos ya están corriendo. Incluye un texto de
              reclamo listo para completar y enviar.
            </p>
            <nav :aria-label="t('navigation')" class="rec-navigation d-flex flex-wrap ga-2 mt-4">
              <VBtn
                href="#reclamo"
                color="primary"
                variant="flat"
                data-cta="recording_prepare_request"
              >
                {{ t('useTemplate') }}
              </VBtn>
              <VBtn href="#plataformas" variant="tonal">{{ t('platforms') }}</VBtn>
              <VBtn href="#plazos" variant="text" data-cta="recording_deadlines">
                {{ t('deadlines') }}
              </VBtn>
            </nav>
            <ShareButtons class="mt-4" :url="canonicalUrl" :text="t('heading')" />
            <p class="text-caption text-medium-emphasis mt-3">
              Normas, trámites y formularios verificados contra su fuente el {{ verifiedDisplay }}.
              Esto es información general, no asesoramiento legal para tu caso.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. La prueba primero -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Antes que nada: guardá la prueba</h2>
            <p class="text-body-1 rec-prose mb-4">
              El primer impulso es bloquear la cuenta, y bloquear es justo lo que no conviene
              todavía: dejás de ver el video y el video sigue arriba para todos los demás. Guardá
              esto primero. Si después lo borran, es lo único que vas a tener.
            </p>
            <div v-for="item in evidence" :key="item.title" class="rec-tip mb-3">
              <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ item.title }}</h3>
              <p class="text-body-2 rec-prose mb-0">{{ item.body }}</p>
            </div>
          </section>

          <!-- 2. Qué caso es el tuyo -->
          <section id="tu-caso" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">¿Cuál de estos es tu caso?</h2>
            <p class="text-body-1 rec-prose mb-4">
              No es una pregunta de trámite. Los cuatro casos se resuelven distinto: cambian quién
              decide, con qué velocidad y si hay delito o no. Elegí el tuyo y el texto del reclamo
              de más abajo se arma con el fundamento que corresponde.
            </p>
            <VRow dense>
              <VCol v-for="item in cases" :key="item.id" cols="12" md="6">
                <VCard
                  variant="flat"
                  class="rec-case pa-4 h-100"
                  :class="{ 'is-selected': form.caseId === item.id }"
                  role="button"
                  tabindex="0"
                  :aria-pressed="form.caseId === item.id"
                  @click="form.caseId = item.id"
                  @keydown.enter.prevent="form.caseId = item.id"
                  @keydown.space.prevent="form.caseId = item.id"
                >
                  <div class="d-flex align-start">
                    <VIcon
                      :color="form.caseId === item.id ? 'primary' : 'medium-emphasis'"
                      class="me-2 mt-1"
                      size="small"
                    >
                      {{ form.caseId === item.id ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
                    </VIcon>
                    <div>
                      <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ item.label }}</h3>
                      <p class="text-body-2 rec-prose mb-0">{{ item.hint }}</p>
                    </div>
                  </div>
                </VCard>
              </VCol>
            </VRow>

            <VCard v-if="selectedCase" variant="flat" class="rec-detail pa-4 mt-4">
              <VAlert
                v-if="selectedCase.urgent"
                type="error"
                variant="tonal"
                density="comfortable"
                class="mb-4"
              >
                <p class="mb-0 text-body-2">
                  Este caso no espera la respuesta de la plataforma.
                  <strong>Denunciá el mismo día</strong> en una seccional o en la Fiscalía, con las
                  capturas y el enlace. No necesitás abogado.
                </p>
              </VAlert>
              <dl class="rec-detail-list mb-0">
                <dt>¿Hay delito?</dt>
                <dd>
                  {{
                    selectedCase.crime ||
                    'En el hecho de grabarte, no. El problema es la publicación.'
                  }}
                </dd>
                <dt>Con qué se reclama</dt>
                <dd>{{ selectedCase.ground }}</dd>
                <dt>Por dónde va</dt>
                <dd>{{ selectedCase.route }}</dd>
              </dl>
            </VCard>
          </section>

          <!-- 3. Por qué el reporte no funcionó -->
          <section id="plataformas" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('reportedNothingHeading') }}</h2>
            <p class="text-body-1 rec-prose mb-4">{{ t('reportedNothingAnswer') }}</p>
            <div class="table-scroll">
              <table class="rec-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Plataforma</th>
                    <th>El botón de la app</th>
                    <th>El formulario que corresponde</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="platform in platforms" :key="platform.id">
                    <td>{{ platform.name }}</td>
                    <td data-label="El botón de la app">{{ platform.inApp }}</td>
                    <td data-label="El formulario que corresponde">
                      <a
                        :href="platform.formUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="rec-link"
                        :data-cta="`recording_form_${platform.id}`"
                        :aria-label="`Formulario de privacidad de ${platform.name}`"
                      >
                        Formulario de privacidad
                      </a>
                      <span class="d-block text-caption text-medium-emphasis">
                        Te pide: {{ platform.asks }}
                      </span>
                      <span
                        v-if="platform.timeframe"
                        class="d-block text-caption text-medium-emphasis mt-1"
                      >
                        {{ platform.timeframe }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-body-2 rec-prose mt-4 mb-0">{{ otherPlatforms }}</p>
            <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
              <p class="mb-0 text-body-2">
                <strong>Sobre pedirle a Google que lo saque del buscador.</strong>
                {{ deindexLimit }}
              </p>
            </VAlert>
          </section>

          <!-- 4. Plazos -->
          <section id="plazos" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Los plazos que ya están corriendo</h2>
            <p class="text-body-1 rec-prose mb-4">
              El de arriba es el que más se pierde: tres meses alcanzan para discutir con un buzón
              de soporte y quedarse sin vía penal sin haberse enterado de que existía.
            </p>
            <div class="table-scroll">
              <table class="rec-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Qué corre</th>
                    <th>Plazo</th>
                    <th>Si se vence</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(deadline, i) in deadlines" :key="i">
                    <td>
                      {{ deadline.what }}
                      <span class="d-block text-caption text-medium-emphasis">
                        {{ deadline.from }}
                      </span>
                    </td>
                    <td data-label="Plazo" class="rec-term">{{ deadline.term }}</td>
                    <td data-label="Si se vence">{{ deadline.expires }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- 5. Paso a paso -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Paso a paso</h2>
            <ol class="rec-steps">
              <li v-for="(step, i) in steps" :key="i" class="mb-3">
                <span class="font-weight-bold">{{ step.name }}.</span>
                <span class="rec-prose">{{ ' ' + step.text }}</span>
              </li>
            </ol>
          </section>

          <!-- 6. El reclamo -->
          <section id="reclamo" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Escribí el reclamo</h2>
            <p class="text-body-1 rec-prose mb-4">
              Completá los campos. El texto se arma solo con el fundamento del caso que elegiste
              arriba. Lo que dejes vacío queda marcado como <code>[completar]</code>.
            </p>

            <VCard variant="flat" class="rec-form pa-4 mb-4">
              <p class="text-subtitle-2 font-weight-bold mb-2">¿A quién se lo mandás?</p>
              <VBtnToggle
                v-model="form.target"
                mandatory
                color="primary"
                variant="outlined"
                density="comfortable"
                class="rec-targets mb-4"
              >
                <VBtn value="plataforma">A la plataforma</VBtn>
                <VBtn value="autor">A la cuenta</VBtn>
                <VBtn value="urcdp">A la URCDP</VBtn>
              </VBtnToggle>

              <VRow dense>
                <VCol cols="12">
                  <VTextField
                    v-model="form.videoUrl"
                    label="Enlace exacto del video"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model="form.account"
                    label="Cuenta que lo publicó (@usuario)"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model="form.platform"
                    label="Plataforma (TikTok, Instagram…)"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model="form.name"
                    label="Tu nombre completo"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model="form.idNumber"
                    label="Tu cédula (sólo para la URCDP)"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model="form.timestamp"
                    label="En qué momento del video aparecés"
                    placeholder="del segundo 12 al 20"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model="form.context"
                    label="Dónde y cuándo te grabaron"
                    placeholder="en la peatonal de Sarandí, el 3 de setiembre"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12">
                  <VCheckbox
                    v-model="form.onBehalfOfMinor"
                    label="Reclamo por una persona menor de edad a mi cargo"
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
              <p class="mb-1 text-body-2 font-weight-bold">Todavía te faltan datos:</p>
              <ul class="rec-missing mb-0">
                <li v-for="field in missing" :key="field">{{ field }}</li>
              </ul>
            </VAlert>

            <VCard variant="flat" class="rec-output pa-4">
              <pre class="rec-text">{{ requestText }}</pre>
              <div class="d-flex flex-wrap ga-2 mt-4">
                <VBtn
                  color="primary"
                  variant="flat"
                  size="small"
                  :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
                  @click="copyText"
                >
                  {{ copied ? 'Copiado' : 'Copiar el reclamo' }}
                </VBtn>
                <SendMessage
                  :text="requestText"
                  :actions="sendActions"
                  trigger-label="Enviar"
                  dialog-title="Enviar el reclamo"
                  intro="Elegí a dónde lo mandás."
                  size="small"
                  trigger-variant="tonal"
                />
              </div>
            </VCard>
            <p class="text-body-2 rec-prose mt-4 mb-0">
              Mandalo una sola vez y guardá la constancia del envío. Ese mensaje es la notificación
              que después probás.
            </p>
          </section>

          <!-- 7. Dónde se denuncia -->
          <section id="donde-denunciar" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Dónde se denuncia si no lo bajan</h2>
            <div class="table-scroll">
              <table class="rec-table cu-mobile-cards">
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
                        class="rec-link"
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
                    <td data-label="Costo">
                      {{ channel.free ? 'Sin costo' : 'Con costo' }}
                      <span
                        v-if="channel.needsLawyer"
                        class="d-block text-caption text-medium-emphasis"
                      >
                        Necesitás abogado
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- 8. Lo que no va a pasar -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Lo que no va a pasar</h2>
            <p class="text-body-1 rec-prose mb-4">
              Cuatro expectativas que se caen, dichas ahora y no dentro de tres semanas.
            </p>
            <div v-for="limit in limits" :key="limit.title" class="rec-tip mb-3">
              <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ limit.title }}</h3>
              <p class="text-body-2 rec-prose mb-0">{{ limit.body }}</p>
            </div>
          </section>

          <!-- 9. FAQ -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion" class="rec-faqs">
              <VExpansionPanel v-for="(faq, i) in faqs" :key="i">
                <VExpansionPanelTitle class="font-weight-medium">{{ faq.q }}</VExpansionPanelTitle>
                <VExpansionPanelText>
                  <p class="text-body-1 rec-prose mb-0">{{ faq.a }}</p>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 10. Fuentes -->
          <VCard variant="flat" class="rec-sources pa-5 mb-6">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">
              <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
              Fuentes
            </h2>
            <ul class="rec-sources-list">
              <li v-for="source in sources" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{
                  source.label
                }}</a>
                <span class="source-publisher"> — {{ source.publisher }}</span>
              </li>
            </ul>
          </VCard>

          <VCard variant="flat" class="rec-related pa-5">
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
                :to="localePath('/denunciar-ruidos-molestos-uruguay')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-volume-off</VIcon>
                Denunciar ruidos molestos
              </VChip>
              <VChip
                :to="localePath('/estafas-uruguay')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-shield-alert-outline</VIcon>
                Estafas en Uruguay
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
import { recordingConsentMessages } from '~/utils/recordingConsentMessages'
import {
  RECORDING_CASES,
  RECORDING_CHANNELS,
  RECORDING_DEADLINES,
  RECORDING_DEINDEX_LIMIT,
  RECORDING_EVIDENCE,
  RECORDING_FAQS,
  RECORDING_LIMITS,
  RECORDING_OTHER_PLATFORMS,
  RECORDING_PLATFORMS,
  RECORDING_SOURCES,
  RECORDING_STEPS,
  RECORDING_VERIFIED_AT,
  buildRemovalRequest,
  emptyRecordingRequest,
  missingRecordingFields,
  recordingCase,
} from '~/utils/recordingConsent'

const localePath = useLocalePath()
const { t } = useI18n({ useScope: 'local', messages: recordingConsentMessages })

const cases = RECORDING_CASES
const evidence = RECORDING_EVIDENCE
const platforms = RECORDING_PLATFORMS
const deadlines = RECORDING_DEADLINES
const steps = RECORDING_STEPS
const channels = RECORDING_CHANNELS
const limits = RECORDING_LIMITS
const faqs = RECORDING_FAQS
const sources = RECORDING_SOURCES
const deindexLimit = RECORDING_DEINDEX_LIMIT
const otherPlatforms = RECORDING_OTHER_PLATFORMS

const form = ref(emptyRecordingRequest())
const selectedCase = computed(() => recordingCase(form.value.caseId))
const requestText = computed(() => buildRemovalRequest(form.value))
const missing = computed(() => missingRecordingFields(form.value))

const copied = ref(false)
async function copyText() {
  try {
    await navigator.clipboard.writeText(requestText.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}

/**
 * Where the text can be sent.
 *
 * The URCDP inbox is the only address any source publishes for this matter, so it
 * is the only recipient pre-filled. The platform forms and the URCDP's own online
 * procedure are web forms: the component stages the text on the clipboard and
 * opens the page, because none of them accepts a body over a URL. The account
 * itself gets no action at all — a DM cannot be opened with prefilled text from
 * outside the app, and a fake button that promised it would just lose the text.
 */
const sendActions = computed<SendAction[]>(() => [
  {
    channel: 'email',
    label: 'Correo a la URCDP',
    to: 'infourcdp@datospersonales.gub.uy',
    subject: 'Denuncia por publicación de imagen sin consentimiento',
    note: 'Es el organismo de protección de datos personales.',
  },
  {
    channel: 'link',
    label: 'Denuncia en línea ante la URCDP',
    openUrl:
      'https://www.gub.uy/tramites/denuncias-unidad-reguladora-control-datos-personales-urcdp',
    copyFirst: true,
    note: 'Sin costo. Copiamos el texto: el trámite no acepta el cuerpo por enlace.',
  },
  {
    channel: 'link',
    label: 'Formulario de privacidad de TikTok',
    openUrl: 'https://www.tiktok.com/legal/report/privacy',
    copyFirst: true,
    note: 'La cola que revisa reclamos de privacidad, distinta del botón de reportar.',
  },
  {
    channel: 'link',
    label: 'Formulario de privacidad de Instagram y Threads',
    openUrl: 'https://help.instagram.com/contact/512241091300432',
    copyFirst: true,
    note: 'Copiamos el texto para que lo pegues en el campo de descripción.',
  },
])

const verifiedDisplay = computed(() =>
  new Date(RECORDING_VERIFIED_AT).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: siteTimeZone(RECORDING_VERIFIED_AT),
  })
)

const canonicalUrl = 'https://cambio-uruguay.com/grabacion-sin-consentimiento-uruguay'
const title = computed(() => t('title'))
const description = computed(() => t('description'))

defineOgImageComponent('Cambio', {
  title: title.value,
  subtitle: description.value,
  tag: 'PRIVACIDAD',
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
            name: 'Qué hacer si te grabaron sin consentimiento y publicaron el video en Uruguay',
            description: recordingConsentMessages.es.description,
            inLanguage: 'es-UY',
            step: RECORDING_STEPS.map((step, index) => ({
              '@type': 'HowToStep',
              position: index + 1,
              name: step.name,
              text: step.text,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: RECORDING_FAQS.map(faq => ({
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
.rec-page section[id] {
  scroll-margin-top: 96px;
}
.rec-navigation .v-btn {
  min-height: 44px;
  height: auto;
  max-width: 100%;
  white-space: normal;
  padding-block: 8px;
}

.rec-lead,
.rec-prose {
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.rec-steps {
  padding-left: 1.25rem;
  line-height: 1.7;
}
.rec-steps li {
  padding-left: 0.25rem;
}

.rec-tip,
.rec-case,
.rec-detail,
.rec-form,
.rec-output,
.rec-sources,
.rec-related {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
}
.rec-tip {
  padding: 14px 16px;
}

.rec-case {
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.rec-case:hover,
.rec-case:focus-visible {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.rec-case.is-selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.06);
}

.rec-detail-list {
  display: grid;
  gap: 4px;
}
.rec-detail-list dt {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 12px;
}
.rec-detail-list dt:first-child {
  margin-top: 0;
}
.rec-detail-list dd {
  margin: 0;
  line-height: 1.7;
  font-size: 0.95rem;
}

/* El grupo se parte en dos filas en el celular, y ahí el borde compartido de
   Vuetify queda colgando al final de la primera. Cada botón se lleva su propio
   borde y su propio radio, así que envolver no deja restos. */
.rec-targets {
  height: auto;
  flex-wrap: wrap;
  gap: 8px;
}
.rec-targets .v-btn {
  min-height: 44px;
  height: auto;
  border-radius: 8px;
}

.rec-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.86rem;
  line-height: 1.6;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.9);
}

.rec-missing {
  padding-left: 1.1rem;
  font-size: 0.88rem;
}

.rec-faqs :deep(.v-expansion-panel-title) {
  line-height: 1.5;
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
  min-height: 3.25rem;
}

.table-scroll {
  overflow-x: auto;
}
.rec-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}
.rec-table th,
.rec-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
  vertical-align: top;
}
.rec-table thead th {
  font-weight: 700;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.rec-table tbody td:first-child {
  font-weight: 600;
}
.rec-term {
  white-space: nowrap;
  font-weight: 700;
}

.rec-link,
.rec-sources-list a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}
.rec-link:hover,
.rec-sources-list a:hover {
  text-decoration: underline;
}

.rec-sources-list {
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
