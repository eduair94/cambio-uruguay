<!--
THESIS: Un reclamo útil separa prueba, fuerza jurídica y trámite; rechaza tanto la promesa de
“ganar seguro” como el artículo legal que no ayuda a actuar.
OWN-WORLD: Expediente de bolsillo dentro de la identidad nocturna de Cambio Uruguay: azul para
acción, ámbar para incertidumbre y superficies tonales con evidencia siempre visible.
STORY: La persona ubica la fuerza de su caso, reúne documentos, genera un texto propio y lo
presenta por la vía correcta.
FIRST VIEWPORT: Tesis y acción a la izquierda; a la derecha, la pregunta decisiva sobre si el
precio parecía plausible. El botón principal baja al generador.
FORM: Flujo “caso → prueba → escrito → canal”, primera estructura para esta extensión precisa;
puesta en escena directa, sin seed por tratarse de una ruta estrechamente especificada.
-->
<template>
  <VContainer class="case-page py-6 py-md-10">
    <header class="case-hero on-dark mb-10">
      <div class="hero-copy">
        <p class="eyebrow">Caso Sodimac · Uruguay · 28 de julio de 2026</p>
        <h1>Sodimac canceló tu compra por un error de precio: qué podés reclamar</h1>
        <p class="hero-lead">
          Si recibiste la confirmación, la factura y después un correo de anulación, tenés prueba
          para plantear el caso. Pero la respuesta jurídica depende de una pregunta central:
          <strong>¿el precio parecía una oferta posible o un error obvio?</strong>
        </p>
        <div class="hero-actions">
          <VBtn
            color="primary"
            size="large"
            prepend-icon="mdi-file-edit-outline"
            @click="scrollToEvidence"
          >
            Empezar mi expediente
          </VBtn>
          <VBtn
            href="https://www.gub.uy/ministerio-economia-finanzas/comunicacion/publicaciones/me-equivoque-precio-informe-mailing-mi-portal-ventas-estoy-obligado"
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            size="large"
            prepend-icon="mdi-open-in-new"
          >
            Ver criterio oficial
          </VBtn>
        </div>
        <p class="case-origin">
          Esta guía parte de
          <a
            href="https://www.reddit.com/r/uruguay/comments/1v91hhj/compras_del_sodimac_anuladas/"
            target="_blank"
            rel="noopener noreferrer"
            >reportes publicados por compradores</a
          >. No accedimos a sus expedientes individuales ni atribuimos una infracción ya comprobada.
        </p>
      </div>

      <aside class="decisive-question" aria-labelledby="decisive-title">
        <p class="question-label">La pregunta que define el caso</p>
        <h2 id="decisive-title">¿El precio podía parecer real?</h2>
        <div class="signal-list">
          <div class="signal signal--strong">
            <VIcon aria-hidden="true">mdi-check-circle-outline</VIcon>
            <div>
              <strong>Oferta plausible</strong>
              <span>El MEF dice que, aceptada, en principio debe cumplirse.</span>
            </div>
          </div>
          <div class="signal signal--uncertain">
            <VIcon aria-hidden="true">mdi-help-circle-outline</VIcon>
            <div>
              <strong>Diferencia discutible</strong>
              <span>Importan promoción, mercado, cantidad y comunicaciones.</span>
            </div>
          </div>
          <div class="signal signal--weak">
            <VIcon aria-hidden="true">mdi-alert-circle-outline</VIcon>
            <div>
              <strong>Error evidente</strong>
              <span>Un cero faltante o pesos por dólares puede activar la buena fe.</span>
            </div>
          </div>
        </div>
        <p class="question-footnote">
          La factura refuerza la prueba de la relación de consumo. No decide por sí sola si el
          precio era exigible.
        </p>
      </aside>
    </header>

    <section class="reading-section legal-reading mb-10" aria-labelledby="legal-title">
      <div class="section-intro">
        <p class="section-kicker">El criterio aplicable</p>
        <h2 id="legal-title">No todos los compradores están en la misma posición</h2>
        <p>
          La guía oficial del MEF no da una respuesta automática: separa la negligencia del comercio
          del supuesto en que cualquier comprador podía advertir el error.
        </p>
      </div>

      <div class="legal-columns">
        <article>
          <h3>Lo que juega a favor</h3>
          <ul>
            <li>La oferta suficientemente precisa vincula al vendedor (Ley 17.250, art. 12).</li>
            <li>El precio y la información publicada integran el contrato (art. 14).</li>
            <li>
              Ante incumplimiento, el consumidor puede pedir cumplimiento si es posible, una
              solución equivalente o resolución (art. 33).
            </li>
            <li>
              El Decreto 244/000 admite la factura como prueba de una relación de consumo
              perfeccionada.
            </li>
          </ul>
        </article>
        <article>
          <h3>Lo que puede debilitarlo</h3>
          <ul>
            <li>Que el precio fuera incompatible con cualquier descuento razonable.</li>
            <li>
              Que pareciera faltar un cero o existir una confusión entre moneda local y dólares.
            </li>
            <li>Que se compraran varias unidades después de advertir el error.</li>
            <li>
              Que se haya recibido solo una orden automática y no la confirmación posterior a la
              validación que describen los términos de Sodimac.
            </li>
          </ul>
        </article>
      </div>

      <VAlert
        type="info"
        variant="tonal"
        density="comfortable"
        icon="mdi-receipt-text-check-outline"
      >
        <strong>Confirmación y factura no son lo mismo:</strong> los términos de Sodimac dicen que
        el contrato se perfecciona al enviarse la confirmación escrita posterior a la validación
        (cláusula 7) y que la factura se remite en otro correo (cláusula 5.9). Guardá ambos.
      </VAlert>
    </section>

    <section
      id="reunir-evidencia"
      class="reading-section evidence-section mb-10"
      aria-labelledby="evidence-title"
    >
      <div class="section-intro">
        <p class="section-kicker">Antes de escribir</p>
        <h2 id="evidence-title" ref="evidenceHeading" tabindex="-1">Marcá lo que ya tenés</h2>
        <p>
          El formulario no sube ni guarda documentos. Esta lista queda en tu navegador y te ayuda a
          no presentar un relato sin respaldo.
        </p>
      </div>

      <div class="evidence-layout">
        <div class="evidence-checks">
          <VCheckbox
            v-for="(item, index) in SODIMAC_EVIDENCE"
            :key="item"
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
          <strong>{{ checkedEvidence.length }} de {{ SODIMAC_EVIDENCE.length }} pruebas</strong>
          <span>{{ evidenceMessage }}</span>
        </div>
      </div>
    </section>

    <section id="armar-reclamo" class="builder-section mb-10" aria-labelledby="builder-title">
      <div class="section-intro">
        <p class="section-kicker">Plantilla personalizada</p>
        <h2 id="builder-title">Armá el escrito con tus hechos</h2>
        <p>
          Completá solo lo que puedas probar. Los campos vacíos quedan marcados para que los llenes
          antes de enviarlo.
        </p>
      </div>

      <div class="builder-shell">
        <form class="builder-form" @submit.prevent>
          <fieldset>
            <legend>1. Elegí el objetivo</legend>
            <div class="action-options">
              <button
                v-for="action in SODIMAC_ACTIONS"
                :key="action.id"
                type="button"
                class="action-option"
                :class="{ 'action-option--selected': form.action === action.id }"
                :aria-pressed="form.action === action.id"
                @click="form.action = action.id"
              >
                <span>{{ action.label }}</span>
                <small>{{ action.short }}</small>
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend>2. Identificá la compra</legend>
            <div class="field-grid">
              <VTextField
                v-model="form.orderNumber"
                label="Número de orden"
                variant="outlined"
                density="comfortable"
                autocomplete="off"
              />
              <VTextField
                v-model="form.invoiceNumber"
                label="Número de factura o e-ticket"
                variant="outlined"
                density="comfortable"
                autocomplete="off"
              />
              <VTextField
                v-model="form.purchaseDate"
                label="Fecha de compra"
                type="date"
                variant="outlined"
                density="comfortable"
              />
              <VTextField
                v-model="form.cancellationDate"
                label="Fecha de cancelación"
                type="date"
                variant="outlined"
                density="comfortable"
              />
              <VTextField
                v-model="form.product"
                label="Producto y modelo"
                variant="outlined"
                density="comfortable"
                class="field-span"
              />
              <VTextField
                v-model="form.quantity"
                label="Cantidad"
                type="number"
                min="1"
                variant="outlined"
                density="comfortable"
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>3. Describí el precio y la validación</legend>
            <div class="field-grid">
              <VTextField
                v-model="form.advertisedPrice"
                label="Precio publicado"
                placeholder="Ej.: $ 19.990"
                variant="outlined"
                density="comfortable"
              />
              <VTextField
                v-model="form.amountPaid"
                label="Total cobrado"
                placeholder="Ej.: $ 21.480 con envío"
                variant="outlined"
                density="comfortable"
              />
              <VTextField
                v-model="form.usualPrice"
                label="Precio habitual y fuente"
                placeholder="Ej.: $ 27.000 en otros comercios"
                variant="outlined"
                density="comfortable"
                class="field-span"
              />
              <VTextField
                v-model="form.paymentMethod"
                label="Medio de pago"
                placeholder="Ej.: Visa crédito"
                variant="outlined"
                density="comfortable"
              />
              <VSelect
                v-model="form.confirmationStatus"
                :items="confirmationOptions"
                label="¿Qué correo recibiste?"
                variant="outlined"
                density="comfortable"
              />
              <VSelect
                v-model="form.priceAssessment"
                :items="priceAssessmentOptions"
                label="¿Cómo parecía el precio?"
                variant="outlined"
                density="comfortable"
                class="field-span"
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>4. Copiá el motivo exacto</legend>
            <VTextarea
              v-model="form.cancellationReason"
              label="Texto del correo de cancelación"
              placeholder="Pegá la frase exacta sobre la inconsistencia técnica y el reembolso."
              variant="outlined"
              rows="3"
              auto-grow
            />
            <VTextarea
              v-model="form.extraFacts"
              label="Otros hechos que puedas probar"
              placeholder="Promoción vigente, stock informado, fecha de entrega, reclamos previos…"
              variant="outlined"
              rows="3"
              auto-grow
            />
          </fieldset>

          <VAlert
            :type="assessment.type"
            variant="tonal"
            density="comfortable"
            :icon="assessment.icon"
          >
            <strong>{{ assessment.title }}</strong> {{ assessment.text }}
          </VAlert>

          <VAlert
            v-if="!isReadyToPresent"
            type="info"
            variant="tonal"
            density="compact"
            icon="mdi-form-select"
          >
            <strong>Faltan datos esenciales:</strong> {{ missingFields.join(', ') }}. Podés copiar
            el borrador, pero “Presentar” se habilita cuando completes esos datos.
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
              <h3 id="preview-title">{{ selectedActionLabel }}</h3>
              <p class="preview-hint">Podés completar o corregir el texto antes de copiarlo.</p>
            </div>
            <VChip size="small" variant="tonal" color="primary">Editable</VChip>
          </div>
          <textarea
            v-model="editableComplaint"
            class="complaint-editor"
            aria-label="Texto editable del reclamo o denuncia"
            spellcheck="true"
          />
          <div class="preview-actions">
            <VBtn
              :color="copyStatus === 'success' ? 'success' : 'primary'"
              :prepend-icon="copyStatus === 'success' ? 'mdi-check' : 'mdi-content-copy'"
              @click="copyComplaint"
            >
              {{
                copyStatus === 'success'
                  ? 'Texto copiado'
                  : isReadyToPresent
                    ? 'Copiar plantilla'
                    : 'Copiar borrador'
              }}
            </VBtn>
            <SendMessage
              :text="editableComplaint"
              :actions="sendActions"
              :disabled="!isReadyToPresent"
              trigger-label="Presentar"
              dialog-title="¿Dónde presentar el texto?"
              :intro="sendIntro"
              size="default"
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

    <section class="reading-section route-section mb-10" aria-labelledby="route-title">
      <div class="section-intro">
        <p class="section-kicker">El canal correcto</p>
        <h2 id="route-title">Reclamo y denuncia no hacen lo mismo</h2>
      </div>

      <div class="route-table" role="list">
        <div role="listitem">
          <strong>1. Reclamo a Sodimac</strong>
          <span>Pedí una respuesta escrita y conservá la constancia.</span>
          <a href="mailto:contactenos.uy@sodimac.com.uy">contactenos.uy@sodimac.com.uy</a>
        </div>
        <div role="listitem">
          <strong>2. Reclamo ante el MEF</strong>
          <span>Busca una mediación para entrega, alternativa o solución individual.</span>
          <a :href="DEFENSA_CONSUMIDOR_FORM" target="_blank" rel="noopener noreferrer">
            Abrir trámite gratuito
          </a>
        </div>
        <div role="listitem">
          <strong>3. Denuncia ante el MEF</strong>
          <span>Busca investigación y eventual sanción; no una compensación personal.</span>
          <a :href="DEFENSA_CONSUMIDOR_FORM" target="_blank" rel="noopener noreferrer">
            Abrir el mismo formulario
          </a>
        </div>
      </div>

      <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-account-group-outline">
        <strong>Si se organizan:</strong> compartan capturas y criterios, pero que cada comprador
        presente su orden, factura, cantidad, precio y correos. Un texto idéntico con hechos ajenos
        debilita el reclamo.
      </VAlert>
    </section>

    <section class="reading-section mb-10" aria-labelledby="faq-title">
      <div class="section-intro">
        <p class="section-kicker">Dudas frecuentes</p>
        <h2 id="faq-title">Lo que conviene saber antes de presentar</h2>
      </div>
      <VExpansionPanels variant="accordion" multiple>
        <VExpansionPanel v-for="faq in SODIMAC_FAQS" :key="faq.q">
          <VExpansionPanelTitle class="faq-title">{{ faq.q }}</VExpansionPanelTitle>
          <VExpansionPanelText class="faq-answer">{{ faq.a }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <section class="sources-section mb-8" aria-labelledby="sources-title">
      <div class="section-intro">
        <p class="section-kicker">Fuentes abiertas</p>
        <h2 id="sources-title">Qué es norma, qué publica Sodimac y qué reportó la comunidad</h2>
        <p>
          Las fuentes están etiquetadas para no dar a una publicación de Reddit el mismo peso que a
          la ley o al criterio oficial.
        </p>
      </div>
      <ul class="sources-list">
        <li v-for="source in SODIMAC_SOURCES" :key="source.url">
          <span class="source-kind" :class="`source-kind--${source.kind}`">{{ source.kind }}</span>
          <div>
            <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
            <span>{{ source.publisher }}</span>
          </div>
        </li>
      </ul>
    </section>

    <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-scale-balance">
      Información general, no asesoramiento jurídico ni promesa de resultado. El MEF dice
      expresamente que los errores de precio dependen de las circunstancias. Si el valor económico
      justifica una acción judicial, consultá a un abogado con toda la documentación.
    </VAlert>

    <div class="back-link mt-6">
      <NuxtLink :to="localePath('/derechos-consumidor-compras-online')">
        <VIcon start size="18">mdi-arrow-left</VIcon>
        Ver la guía general de derechos en compras online
      </NuxtLink>
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import type { SendAction } from '~/utils/messageChannels'
import { DEFENSA_CONSUMIDOR_FORM, DEFENSA_CONSUMIDOR_PHONE } from '~/utils/officialContacts'
import {
  buildSodimacComplaint,
  SODIMAC_ACTIONS,
  SODIMAC_EVIDENCE,
  SODIMAC_FAQS,
  SODIMAC_SOURCES,
  type SodimacComplaintInput,
} from '~/utils/sodimacPriceError'

const localePath = useLocalePath()
const canonicalUrl = 'https://cambio-uruguay.com/reclamo-sodimac-compra-cancelada'

const form = reactive<SodimacComplaintInput>({
  action: '',
  orderNumber: '',
  invoiceNumber: '',
  purchaseDate: '',
  cancellationDate: '',
  product: '',
  quantity: '1',
  advertisedPrice: '',
  amountPaid: '',
  usualPrice: '',
  paymentMethod: '',
  confirmationStatus: '',
  priceAssessment: '',
  cancellationReason: '',
  extraFacts: '',
})

const confirmationOptions = [
  {
    title: 'Confirmación posterior a la validación',
    value: 'confirmado',
  },
  {
    title: 'Solo una orden automática',
    value: 'solo-orden',
  },
  {
    title: 'No sé distinguirlos',
    value: 'no-se',
  },
]

const priceAssessmentOptions = [
  {
    title: 'Parecía una oferta o descuento posible',
    value: 'plausible',
  },
  {
    title: 'No estoy seguro',
    value: 'dudoso',
  },
  {
    title: 'Parecía un error evidente',
    value: 'evidente',
  },
]

const checkedEvidence = ref<number[]>([])
const copyStatus = ref<'idle' | 'success' | 'error'>('idle')
const complaint = computed(() => buildSodimacComplaint(form))
const editableComplaint = ref('')
const evidenceHeading = ref<HTMLElement | null>(null)
const selectedActionLabel = computed(
  () => SODIMAC_ACTIONS.find(action => action.id === form.action)?.label ?? 'Elegí el objetivo'
)
const requiredFields = computed(() => [
  { label: 'objetivo', complete: Boolean(form.action) },
  { label: 'orden', complete: Boolean(form.orderNumber.trim()) },
  { label: 'producto', complete: Boolean(form.product.trim()) },
  { label: 'precio publicado', complete: Boolean(form.advertisedPrice.trim()) },
  { label: 'tipo de confirmación', complete: Boolean(form.confirmationStatus) },
  { label: 'evaluación del precio', complete: Boolean(form.priceAssessment) },
  { label: 'motivo de cancelación', complete: Boolean(form.cancellationReason.trim()) },
])
const missingFields = computed(() =>
  requiredFields.value.filter(field => !field.complete).map(field => field.label)
)
const isReadyToPresent = computed(() => missingFields.value.length === 0)
const copyMessage = computed(() => {
  if (copyStatus.value === 'success')
    return isReadyToPresent.value
      ? 'La plantilla quedó copiada.'
      : 'El borrador quedó copiado; completá los datos marcados antes de presentarlo.'
  if (copyStatus.value === 'error')
    return 'No pudimos copiar automáticamente. Seleccioná el texto de la vista previa y copialo manualmente.'
  return ''
})

watch(
  complaint,
  value => {
    editableComplaint.value = value
    copyStatus.value = 'idle'
  },
  { immediate: true }
)

const evidenceMessage = computed(() => {
  if (checkedEvidence.value.length === SODIMAC_EVIDENCE.length)
    return 'Tenés el expediente básico completo. Conservá también los archivos originales.'
  if (checkedEvidence.value.length >= 4)
    return 'Ya hay una base útil. Priorizá la publicación y la confirmación posterior a la validación.'
  return 'Juntá primero las comunicaciones que pueden desaparecer o cambiar.'
})

const assessment = computed(() => {
  if (!form.priceAssessment)
    return {
      type: 'info' as const,
      icon: 'mdi-form-dropdown',
      title: 'Elegí cómo se veía el precio.',
      text: 'La plantilla no debe asumir por vos el hecho que define el análisis.',
    }
  if (form.priceAssessment === 'plausible')
    return {
      type: 'success' as const,
      icon: 'mdi-check-circle-outline',
      title: 'Hay un argumento para reclamar.',
      text: 'Explicá por qué el precio podía parecer una promoción real y adjuntá comparables.',
    }
  if (form.priceAssessment === 'evidente')
    return {
      type: 'warning' as const,
      icon: 'mdi-alert-outline',
      title: 'El reclamo de entrega es más débil.',
      text: 'El criterio oficial permite que prevalezca la buena fe cuando el error era fácilmente advertible.',
    }
  return {
    type: 'info' as const,
    icon: 'mdi-help-circle-outline',
    title: 'No adivines.',
    text: 'Presentá precio, promoción, cantidad y confirmaciones para que el contexto pueda evaluarse.',
  }
})

const sendIntro = computed(() =>
  form.action === 'denuncia'
    ? 'Copiá el texto y elegí “denuncia” en el formulario del MEF. La denuncia busca investigación y eventual sanción.'
    : 'Primero envialo a Sodimac. Si no hay solución, copiá el mismo relato en un reclamo ante el MEF.'
)

const sendActions = computed<SendAction[]>(() => {
  const mefAction: SendAction = {
    channel: 'link',
    label:
      form.action === 'denuncia'
        ? 'Presentar denuncia ante el MEF'
        : 'Presentar reclamo ante el MEF',
    openUrl: DEFENSA_CONSUMIDOR_FORM,
    icon: 'mdi-gavel',
    color: 'deep-purple',
    copyFirst: true,
    note: 'Trámite gratuito con usuario gub.uy; el texto queda copiado para pegar.',
  }

  if (form.action === 'denuncia')
    return [
      mefAction,
      {
        channel: 'link',
        label: `Llamar al MEF (${DEFENSA_CONSUMIDOR_PHONE})`,
        openUrl: `tel:${DEFENSA_CONSUMIDOR_PHONE.replace(/\s/g, '')}`,
        icon: 'mdi-phone-outline',
        color: 'green-darken-1',
        note: 'Lunes a viernes de 9:30 a 16 h.',
      },
    ]

  return [
    {
      channel: 'email',
      label: 'Enviar reclamo a Sodimac',
      to: 'contactenos.uy@sodimac.com.uy',
      subject: 'Reclamo por cancelación unilateral de compra online',
      icon: 'mdi-email-outline',
      color: 'primary',
      note: 'Dirección publicada en los términos y condiciones de Sodimac.',
    },
    mefAction,
    {
      channel: 'link',
      label: 'Llamar a Sodimac (0800 7634)',
      openUrl: 'tel:08007634',
      icon: 'mdi-phone-outline',
      color: 'green-darken-1',
      note: 'Número publicado en los términos y condiciones.',
    },
  ]
})

function scrollToEvidence() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  evidenceHeading.value?.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'start',
  })
  evidenceHeading.value?.focus({ preventScroll: true })
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

const title = 'Sodimac canceló tu compra por error de precio: reclamo y denuncia'
const description =
  'Guía para compradores de Sodimac Uruguay afectados por cancelaciones de julio de 2026: criterio oficial sobre errores de precio, valor de la factura y plantilla para reclamar o denunciar ante el MEF.'

defineOgImageComponent('Cambio', {
  title: 'Sodimac canceló tu compra',
  subtitle: 'Evaluá el precio, reuní la prueba y armá el reclamo',
  tag: 'DERECHOS DEL CONSUMIDOR',
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
        'Sodimac compra cancelada, Sodimac error de precio Uruguay, reclamo Sodimac, defensa del consumidor Sodimac, factura compra cancelada, Ley 17250 error precio',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: title,
            description,
            datePublished: '2026-07-28',
            dateModified: '2026-07-28',
            inLanguage: 'es-UY',
            mainEntityOfPage: canonicalUrl,
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
          },
          {
            '@type': 'FAQPage',
            mainEntity: SODIMAC_FAQS.map(faq => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.case-page {
  max-width: 1180px;
}

.case-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
  gap: 40px;
  padding: clamp(24px, 5vw, 56px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: #121a2e;
  box-shadow: 16px 24px 48px rgba(0, 0, 0, 0.24);
}

.hero-copy,
.decisive-question,
.legal-columns article,
.complaint-preview {
  min-width: 0;
}

.eyebrow,
.section-kicker,
.question-label,
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
  max-width: 19ch;
  margin: 0;
  font-size: clamp(1.85rem, 4.8vw, 3.5rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
  text-wrap: balance;
}

.hero-lead {
  max-width: 67ch;
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

.case-origin {
  max-width: 70ch;
  margin: 24px 0 0;
  color: #b5bdc9;
  font-size: 0.8rem;
  line-height: 1.6;
}

.case-origin a {
  color: #90caf9;
}

.decisive-question {
  align-self: center;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 12px;
  background: #0a0e1a;
}

.decisive-question h2 {
  max-width: 18ch;
  margin: 0 0 20px;
  font-size: clamp(1.35rem, 3vw, 1.8rem);
  line-height: 1.2;
  text-wrap: balance;
}

.signal-list {
  display: flex;
  flex-direction: column;
}

.signal {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 10px;
  padding: 14px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.signal strong,
.signal span {
  display: block;
}

.signal strong {
  margin-bottom: 2px;
  font-size: 0.88rem;
}

.signal span {
  color: #b5bdc9;
  font-size: 0.78rem;
  line-height: 1.45;
}

.signal--strong :deep(.v-icon) {
  color: #35d07f;
}

.signal--uncertain :deep(.v-icon) {
  color: #ffc107;
}

.signal--weak :deep(.v-icon) {
  color: #ff8a65;
}

.question-footnote {
  margin: 12px 0 0;
  color: #cbd5e1;
  font-size: 0.78rem;
  line-height: 1.5;
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
  font-size: clamp(1.45rem, 3.2vw, 2.15rem);
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

.legal-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32px;
  margin-bottom: 24px;
}

.legal-columns article {
  padding-top: 18px;
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
}

.legal-columns h3 {
  margin: 0 0 12px;
  font-size: 1.05rem;
}

.legal-columns ul {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin: 0;
  padding-left: 20px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.evidence-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
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
  font-size: 0.84rem;
  line-height: 1.55;
  opacity: 0.75;
}

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
  gap: 12px;
  margin: 0;
  padding: 0;
  border: 0;
}

.builder-form legend {
  margin-bottom: 12px;
  font-size: 0.88rem;
  font-weight: 800;
}

.action-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-option {
  display: flex;
  min-height: 56px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 10px 14px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 8px;
  color: inherit;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.action-option:hover {
  border-color: rgba(var(--v-theme-primary), 0.55);
}

.action-option:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.action-option--selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}

.action-option span {
  font-size: 0.86rem;
  font-weight: 700;
}

.action-option small {
  margin-top: 2px;
  font-size: 0.76rem;
  line-height: 1.45;
  opacity: 0.7;
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
  margin: -10px 0 0;
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
  font-size: 0.76rem;
  line-height: 1.45;
  opacity: 0.66;
}

.complaint-editor {
  width: 100%;
  min-height: 620px;
  max-height: 820px;
  padding: 0;
  overflow: auto;
  border: 0;
  outline: 0;
  color: inherit;
  background: transparent;
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.77rem;
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

.route-table {
  margin-bottom: 24px;
  border-top: 1px solid rgba(var(--v-border-color), 0.18);
}

.route-table > div {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr) 190px;
  gap: 18px;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.14);
}

.route-table strong {
  font-size: 0.9rem;
}

.route-table span,
.route-table a {
  font-size: 0.84rem;
  line-height: 1.5;
}

.route-table span {
  opacity: 0.75;
}

.route-table a {
  color: rgb(var(--v-theme-link));
  font-weight: 700;
  text-align: right;
}

.faq-title {
  font-size: 0.92rem;
  font-weight: 700;
}

.faq-answer {
  font-size: 0.88rem;
  line-height: 1.65;
}

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
  grid-template-columns: 92px minmax(0, 1fr);
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
  font-size: 0.76rem;
  opacity: 0.66;
}

.source-kind {
  width: fit-content;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.source-kind--oficial {
  color: rgb(var(--v-theme-on-primary));
  background: rgb(var(--v-theme-primary));
}

.source-kind--sodimac {
  color: rgb(var(--v-theme-on-warning));
  background: rgb(var(--v-theme-warning));
}

.source-kind--comunidad {
  color: rgb(var(--v-theme-on-surface));
  background: rgba(var(--v-theme-on-surface), 0.12);
}

.back-link a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  color: rgb(var(--v-theme-link));
  font-size: 0.88rem;
  font-weight: 700;
  text-decoration: none;
}

@media (min-width: 960px) {
  .complaint-preview {
    border-top: 0;
    border-left: 1px solid rgba(var(--v-border-color), 0.14);
  }
}

@media (max-width: 959px) {
  .case-hero,
  .builder-shell {
    grid-template-columns: 1fr;
  }

  .case-hero {
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

  .route-table > div {
    grid-template-columns: 180px minmax(0, 1fr);
  }

  .route-table a {
    grid-column: 2;
    text-align: left;
  }
}

@media (max-width: 599px) {
  .case-page {
    padding-right: 12px;
    padding-left: 12px;
  }

  .case-hero {
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

  .decisive-question {
    padding: 18px;
  }

  .legal-columns,
  .field-grid {
    grid-template-columns: 1fr;
  }

  .field-span {
    grid-column: auto;
  }

  .legal-columns {
    gap: 20px;
  }

  .evidence-layout {
    padding: 18px;
  }

  .route-table > div {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .route-table a {
    grid-column: auto;
  }

  .sources-list li {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .action-option {
    transition: none;
  }
}
</style>
