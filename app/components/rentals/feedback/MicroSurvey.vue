<!--
  La pregunta al final de los resultados (y de la ficha): "¿Encontraste lo que buscabas?". Llegar
  hasta acá ya es usar la página, así que no hace falta otro disparador. Se monta sólo en el cliente
  y queda debajo de lo que se está mirando, así que no mueve el contenido ni pesa en la carga.

  El primer toque ES la respuesta: Sí / En parte / No se guarda en ese momento (un POST) y la
  tarjeta dice "Gracias". Abajo, opcional, qué faltó (chips, con "En parte" o "No") y un comentario,
  que completan la MISMA fila (PATCH con el id que devolvió el POST). Hasta el 8/11/2026 el toque
  sólo mostraba "Enviar" y no guardaba nada: 20 días, 0 respuestas, con al menos 150 personas de
  Uruguay que pasaron por la tarjeta. "Dejar una sugerencia" despliega, en el mismo lugar, la caja
  completa: qué venías a hacer, el comentario y un correo opcional para responderte. Cerrada o
  respondida, no vuelve por `snoozeDays`.

  Medición: `feedback_view` una vez cuando la tarjeta se ve, `data-cta` en cada respuesta y en la
  caja (GA4 `cta_click`), y en Microsoft Clarity la etiqueta `feedback` más el evento de la
  respuesta, para encontrar la grabación de quien contestó "No".
-->
<template>
  <section
    v-if="visible"
    ref="root"
    class="rental-feedback"
    :aria-labelledby="titleId"
    data-testid="rental-feedback"
  >
    <template v-if="phase === 'sent'">
      <p :id="titleId" ref="thanks" class="rental-feedback__title" tabindex="-1">
        <VIcon
          icon="mdi-check-circle-outline"
          size="20"
          class="rental-feedback__ok"
          aria-hidden="true"
        />
        Gracias, lo leemos todo.
      </p>
      <p class="rental-feedback__text">
        Si tenés un minuto más,
        <NuxtLink :to="surveyLink">respondé la encuesta de cinco preguntas</NuxtLink>: con ella
        decidimos qué arreglar primero.
      </p>
    </template>

    <template v-else-if="phase === 'answered'">
      <div class="rental-feedback__head">
        <div class="rental-feedback__intro">
          <p :id="titleId" ref="thanks" class="rental-feedback__title" tabindex="-1">
            <VIcon
              icon="mdi-check-circle-outline"
              size="20"
              class="rental-feedback__ok"
              aria-hidden="true"
            />
            Gracias, ya guardamos tu respuesta.
          </p>
          <p class="rental-feedback__text">
            {{
              found === 'si'
                ? 'Si querés, contanos qué mejorarías.'
                : 'Si tenés un segundo más, contanos qué faltó: así sabemos qué arreglar primero.'
            }}
          </p>
        </div>
        <VBtn
          icon="mdi-close"
          variant="text"
          size="small"
          class="rental-feedback__close"
          aria-label="Cerrar"
          @click="dismiss"
        />
      </div>

      <form class="rental-feedback__form" @submit.prevent="sendFollowUp">
        <fieldset v-if="found !== 'si'" class="rental-feedback__group">
          <legend class="rental-feedback__legend">
            ¿Qué faltó? <span>Marcá lo que aplique.</span>
          </legend>
          <div class="rental-feedback__chips">
            <VChip
              v-for="option in reasonOptions"
              :key="option.value"
              :variant="reasons.includes(option.value) ? 'flat' : 'outlined'"
              :color="reasons.includes(option.value) ? 'primary' : undefined"
              :aria-pressed="reasons.includes(option.value)"
              role="button"
              @click="toggleReason(option.value)"
            >
              {{ option.label }}
            </VChip>
          </div>
        </fieldset>

        <VTextarea
          v-model="comment"
          :label="found === 'si' ? '¿Algo que mejorarías? (opcional)' : '¿Algo más? (opcional)'"
          :counter="FEEDBACK_COMMENT_MAX"
          :maxlength="FEEDBACK_COMMENT_MAX"
          rows="2"
          auto-grow
          hide-details="auto"
          variant="outlined"
          density="comfortable"
        />

        <!-- Honeypot: invisible for people, filled by bots. -->
        <input
          v-model="website"
          type="text"
          name="website"
          tabindex="-1"
          autocomplete="off"
          class="rental-feedback__trap"
          aria-hidden="true"
        />

        <p v-if="failed" class="rental-feedback__error" role="alert">
          No pudimos enviarlo. Probá de nuevo en un momento.
        </p>
        <div class="rental-feedback__actions">
          <VBtn
            type="submit"
            color="primary"
            :loading="busy"
            :disabled="!canFollowUp"
            data-cta="rental-feedback-follow-up"
            >Enviar</VBtn
          >
        </div>
      </form>
    </template>

    <template v-else>
      <div class="rental-feedback__head">
        <div class="rental-feedback__intro">
          <h3 :id="titleId" class="rental-feedback__title">{{ question }}</h3>
          <p class="rental-feedback__text">
            Tu respuesta es anónima y nos dice qué arreglar primero.
          </p>
        </div>
        <VBtn
          icon="mdi-close"
          variant="text"
          size="small"
          class="rental-feedback__close"
          aria-label="No mostrar esta pregunta por ahora"
          @click="dismiss"
        />
      </div>

      <template v-if="!boxOpen">
        <div class="rental-feedback__choices" role="radiogroup" :aria-labelledby="titleId">
          <button
            v-for="option in FOUND_OPTIONS"
            :key="option.value"
            type="button"
            role="radio"
            :aria-checked="found === option.value"
            :aria-busy="busy && found === option.value"
            :disabled="busy"
            :data-cta="`rental-feedback-${option.value}`"
            class="rental-feedback__choice"
            :class="{ 'is-on': found === option.value }"
            @click="choose(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <!-- Honeypot for the one-tap answer too: it posts without a form. -->
        <input
          v-model="website"
          type="text"
          name="website"
          tabindex="-1"
          autocomplete="off"
          class="rental-feedback__trap"
          aria-hidden="true"
        />
        <p v-if="failed" class="rental-feedback__error" role="alert">
          No pudimos guardar tu respuesta. Probá de nuevo en un momento.
        </p>
        <p class="rental-feedback__more">
          <button
            type="button"
            class="rental-feedback__link"
            data-cta="rental-feedback-box"
            @click="openBox"
          >
            Dejar una sugerencia
          </button>
        </p>
      </template>

      <form v-else class="rental-feedback__form" @submit.prevent="submitBox">
        <fieldset class="rental-feedback__group">
          <legend class="rental-feedback__legend">¿Qué venías a hacer?</legend>
          <div class="rental-feedback__chips">
            <VChip
              v-for="option in GOALS"
              :key="option.value"
              :variant="goal === option.value ? 'flat' : 'outlined'"
              :color="goal === option.value ? 'primary' : undefined"
              :aria-pressed="goal === option.value"
              role="button"
              @click="goal = goal === option.value ? null : option.value"
            >
              {{ option.label }}
            </VChip>
          </div>
        </fieldset>

        <fieldset class="rental-feedback__group">
          <legend class="rental-feedback__legend">
            ¿Qué faltó? <span>Marcá lo que aplique.</span>
          </legend>
          <div class="rental-feedback__chips">
            <VChip
              v-for="option in reasonOptions"
              :key="option.value"
              :variant="reasons.includes(option.value) ? 'flat' : 'outlined'"
              :color="reasons.includes(option.value) ? 'primary' : undefined"
              :aria-pressed="reasons.includes(option.value)"
              role="button"
              @click="toggleReason(option.value)"
            >
              {{ option.label }}
            </VChip>
          </div>
        </fieldset>

        <VTextarea
          v-model="comment"
          label="Tu sugerencia"
          :counter="FEEDBACK_COMMENT_MAX"
          :maxlength="FEEDBACK_COMMENT_MAX"
          rows="2"
          auto-grow
          hide-details="auto"
          variant="outlined"
          density="comfortable"
        />

        <VTextField
          v-model="email"
          type="email"
          label="Tu correo (opcional)"
          hint="Sólo si querés que te respondamos. No lo usamos para nada más."
          persistent-hint
          autocomplete="email"
          variant="outlined"
          density="comfortable"
          :error-messages="emailError"
        />

        <!-- Honeypot: invisible for people, filled by bots. -->
        <input
          v-model="website"
          type="text"
          name="website"
          tabindex="-1"
          autocomplete="off"
          class="rental-feedback__trap"
          aria-hidden="true"
        />

        <p v-if="failed" class="rental-feedback__error" role="alert">
          No pudimos enviarlo. Probá de nuevo en un momento.
        </p>
        <div class="rental-feedback__actions">
          <VBtn type="submit" color="primary" :loading="busy" :disabled="!canSendBox">Enviar</VBtn>
          <VBtn variant="text" @click="closeBox">Volver</VBtn>
        </div>
      </form>
    </template>
  </section>
</template>

<script setup lang="ts">
import {
  FEEDBACK_COMMENT_MAX,
  FICHA_REASONS,
  FOUND_OPTIONS,
  GOALS,
  isFeedbackEmail,
  SEARCH_REASONS,
  type FeedbackSurface,
} from '~/utils/rentalFeedback'
import {
  event as clarityEvent,
  set as claritySet,
  upgrade as clarityUpgrade,
} from '~/services/clarity'

const props = withDefaults(
  defineProps<{
    surface: FeedbackSurface
    /** The search's active filters, as its chips read them (never the reference address). */
    filters?: string[]
    propertyKey?: string | null
    /** Days the question stays away after an answer or a close. */
    snoozeDays?: number
  }>(),
  { filters: () => [], propertyKey: null, snoozeDays: 30 }
)

const route = useRoute()
const track = useTrack()
const { send, followUp, snoozed, snooze } = useRentalFeedback()
const titleId = useId()
const snoozeKey = computed(() => (props.surface === 'ficha' ? 'ficha' : 'directorio'))
const question = computed(() =>
  props.surface === 'ficha' ? '¿Te sirvió esta ficha?' : '¿Encontraste lo que buscabas?'
)
const reasonOptions = computed(() => (props.surface === 'ficha' ? FICHA_REASONS : SEARCH_REASONS))
const surveyLink = computed(() => ({
  path: '/opinion-alquileres',
  query: { origen: props.surface },
}))

const visible = ref(false)
/** `ask`: the question or the box; `answered`: the tap is stored; `sent`: nothing left to add. */
const phase = ref<'ask' | 'answered' | 'sent'>('ask')
const busy = ref(false)
const failed = ref(false)
const answerId = ref<string | null>(null)
const found = ref<string | null>(null)
const reasons = ref<string[]>([])
const goal = ref<string | null>(null)
const comment = ref('')
const email = ref('')
const website = ref('')
const boxOpen = ref(false)
const root = ref<HTMLElement | null>(null)
const thanks = ref<HTMLElement | null>(null)

const emailError = computed(() =>
  email.value.trim() && !isFeedbackEmail(email.value.trim().toLowerCase())
    ? 'Revisá el correo.'
    : ''
)
const canSendBox = computed(
  () =>
    !busy.value &&
    !emailError.value &&
    !!(goal.value || reasons.value.length || comment.value.trim())
)
const canFollowUp = computed(
  () => !busy.value && !!((found.value !== 'si' && reasons.value.length) || comment.value.trim())
)

let viewObserver: IntersectionObserver | null = null
let viewed = false

onMounted(async () => {
  visible.value = !snoozed(snoozeKey.value)
  if (!visible.value) return
  await nextTick()
  watchView()
})

onBeforeUnmount(() => {
  viewObserver?.disconnect()
  viewObserver = null
})

/** `feedback_view`, once, when half of the card is on screen: the top of the funnel. */
function watchView() {
  const element = root.value
  if (!element || typeof IntersectionObserver === 'undefined') return
  viewObserver = new IntersectionObserver(
    entries => {
      if (viewed || !entries.some(entry => entry.isIntersecting)) return
      viewed = true
      viewObserver?.disconnect()
      viewObserver = null
      track('feedback_view', { surface: props.surface })
    },
    { threshold: 0.5 }
  )
  viewObserver.observe(element)
}

/** The answer, as Clarity sees it: a tag on the recorded page, an event and a kept recording. */
function markRecording(value: string) {
  claritySet('feedback', value)
  clarityEvent(`feedback_${value}`)
  clarityUpgrade('feedback')
}

async function focusThanks() {
  // The thanks replaces what was under the focus: move the focus with it.
  await nextTick()
  thanks.value?.focus()
}

async function choose(value: string) {
  if (busy.value) return
  found.value = value
  if (value === 'si') reasons.value = []
  failed.value = false
  busy.value = true
  markRecording(value)
  const stored = await send({
    kind: 'micro',
    surface: props.surface,
    path: route.path,
    filters: props.filters,
    propertyKey: props.propertyKey,
    found: value,
    website: website.value,
  })
  busy.value = false
  if (!stored) {
    failed.value = true
    // The buttons were disabled while it was sending, which drops the focus: give it back.
    await nextTick()
    root.value?.querySelector<HTMLElement>(`[data-cta="rental-feedback-${value}"]`)?.focus()
    return
  }
  snooze(snoozeKey.value, props.snoozeDays)
  answerId.value = stored.id
  // Without an id there is no row to complete: the answer is whole as it is.
  phase.value = stored.id ? 'answered' : 'sent'
  await focusThanks()
}

async function sendFollowUp() {
  if (!canFollowUp.value || !answerId.value) return
  failed.value = false
  busy.value = true
  const ok = await followUp(answerId.value, {
    reasons: found.value === 'si' ? [] : reasons.value,
    comment: comment.value,
    website: website.value,
  })
  busy.value = false
  if (!ok) {
    failed.value = true
    return
  }
  phase.value = 'sent'
  await focusThanks()
}

function toggleReason(value: string) {
  reasons.value = reasons.value.includes(value)
    ? reasons.value.filter(item => item !== value)
    : [...reasons.value, value]
}

function openBox() {
  failed.value = false
  boxOpen.value = true
}

function closeBox() {
  failed.value = false
  boxOpen.value = false
}

function dismiss() {
  snooze(snoozeKey.value, props.snoozeDays)
  visible.value = false
}

async function submitBox() {
  if (!canSendBox.value) return
  failed.value = false
  busy.value = true
  const stored = await send({
    kind: 'box',
    surface: props.surface,
    path: route.path,
    filters: props.filters,
    propertyKey: props.propertyKey,
    found: null,
    reasons: reasons.value,
    goal: goal.value,
    comment: comment.value,
    email: email.value.trim(),
    website: website.value,
  })
  busy.value = false
  if (!stored) {
    failed.value = true
    return
  }
  markRecording('sugerencia')
  snooze(snoozeKey.value, props.snoozeDays)
  phase.value = 'sent'
  await focusThanks()
}
</script>

<style scoped>
.rental-feedback {
  display: grid;
  gap: 16px;
  padding: 16px 24px 24px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  color: rgb(var(--v-theme-on-surface));
}
.rental-feedback :is(p, h3, fieldset, legend) {
  margin: 0;
}
.rental-feedback__head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.rental-feedback__intro {
  flex: 1 1 auto;
  min-width: 0;
  padding-top: 8px;
}
.rental-feedback__close {
  flex: none;
  /* Visually 32px, but a 44px target: the margin gives it back to the corner. */
  margin: -4px -16px 0 0;
}
.rental-feedback__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
}
.rental-feedback__title:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
}
.rental-feedback__ok {
  color: rgb(var(--v-theme-success));
}
.rental-feedback__text,
.rental-feedback__more {
  margin-top: 4px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.rental-feedback__text a,
.rental-feedback__link {
  color: rgb(var(--v-theme-link));
}
.rental-feedback__choices {
  /* Flex, not three equal columns: "En parte" never wraps, even at 320px. */
  display: flex;
  gap: 8px;
  max-width: 480px;
}
.rental-feedback__choice {
  flex: 1 1 0;
  min-height: 44px;
  padding: 0 12px;
  white-space: nowrap;
  border: 1px solid rgba(var(--v-border-color), 0.24);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 150ms ease-out,
    border-color 150ms ease-out;
}
.rental-feedback__choice:hover:not(:disabled) {
  border-color: rgb(var(--v-theme-primary));
}
.rental-feedback__choice.is-on {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
}
.rental-feedback__choice:disabled {
  cursor: progress;
}
.rental-feedback__choice:disabled:not(.is-on) {
  opacity: 0.6;
}
.rental-feedback__choice:focus-visible,
.rental-feedback__link:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.rental-feedback__form {
  display: grid;
  gap: 24px;
}
.rental-feedback__group {
  border: 0;
  padding: 0;
  min-width: 0;
}
.rental-feedback__legend {
  /* The legend is not a flex item: its gap to the chips is its own margin. */
  margin-bottom: 8px !important;
  padding: 0;
  font-size: 0.875rem;
  font-weight: 700;
}
.rental-feedback__legend span {
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.rental-feedback__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.rental-feedback__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.rental-feedback__error {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-error));
}
.rental-feedback__link {
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
.rental-feedback__trap {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}
@media (max-width: 599px) {
  .rental-feedback {
    padding: 16px;
  }
  .rental-feedback__close {
    margin-right: -8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .rental-feedback__choice {
    transition: none;
  }
}
</style>
