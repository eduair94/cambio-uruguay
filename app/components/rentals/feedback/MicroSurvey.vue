<!--
  La pregunta al final de los resultados (y de la ficha): "¿Encontraste lo que buscabas?". Llegar
  hasta acá ya es usar la página, así que no hace falta otro disparador. Se monta sólo en el cliente
  y queda debajo de lo que se está mirando, así que no mueve el contenido ni pesa en la carga.

  Tres pasos en la misma tarjeta, sin modal: la respuesta (Sí / En parte / No); con "En parte" o
  "No", qué faltó (chips) y un comentario opcional; con "Sí", sólo el comentario. "Dejar una
  sugerencia" despliega, en el mismo lugar, la caja completa: qué venías a hacer, el comentario y un
  correo opcional para responderte. Cerrada o respondida, no vuelve por `snoozeDays`.
-->
<template>
  <section
    v-if="visible"
    class="rental-feedback"
    :aria-labelledby="titleId"
    data-testid="rental-feedback"
  >
    <template v-if="state === 'sent'">
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

    <template v-else>
      <div class="rental-feedback__head">
        <div class="rental-feedback__intro">
          <h2 :id="titleId" class="rental-feedback__title">{{ question }}</h2>
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

      <div
        v-if="!boxOpen"
        class="rental-feedback__choices"
        role="radiogroup"
        :aria-labelledby="titleId"
      >
        <button
          v-for="option in FOUND_OPTIONS"
          :key="option.value"
          type="button"
          role="radio"
          :aria-checked="found === option.value"
          class="rental-feedback__choice"
          :class="{ 'is-on': found === option.value }"
          @click="choose(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <form v-if="found || boxOpen" class="rental-feedback__form" @submit.prevent="submit">
        <fieldset v-if="boxOpen" class="rental-feedback__group">
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

        <fieldset v-if="showReasons" class="rental-feedback__group">
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
          :label="
            boxOpen
              ? 'Tu sugerencia'
              : found === 'si'
                ? '¿Algo que mejorarías? (opcional)'
                : '¿Algo más? (opcional)'
          "
          :counter="FEEDBACK_COMMENT_MAX"
          :maxlength="FEEDBACK_COMMENT_MAX"
          rows="2"
          auto-grow
          hide-details="auto"
          variant="outlined"
          density="comfortable"
        />

        <VTextField
          v-if="boxOpen"
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

        <p v-if="state === 'error'" class="rental-feedback__error" role="alert">
          No pudimos enviarlo. Probá de nuevo en un momento.
        </p>
        <div class="rental-feedback__actions">
          <VBtn type="submit" color="primary" :loading="sending" :disabled="!canSend">Enviar</VBtn>
          <VBtn v-if="boxOpen" variant="text" @click="boxOpen = false">Volver</VBtn>
        </div>
      </form>

      <p v-if="!boxOpen && !found" class="rental-feedback__more">
        <button type="button" class="rental-feedback__link" @click="openBox">
          Dejar una sugerencia
        </button>
      </p>
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
const { send, snoozed, snooze } = useRentalFeedback()
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
const state = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')
const found = ref<string | null>(null)
const reasons = ref<string[]>([])
const goal = ref<string | null>(null)
const comment = ref('')
const email = ref('')
const website = ref('')
const boxOpen = ref(false)
const thanks = ref<HTMLElement | null>(null)

const sending = computed(() => state.value === 'sending')
const showReasons = computed(
  () => found.value === 'no' || found.value === 'en-parte' || boxOpen.value
)
const emailError = computed(() =>
  email.value.trim() && !isFeedbackEmail(email.value.trim().toLowerCase())
    ? 'Revisá el correo.'
    : ''
)
const canSend = computed(
  () =>
    state.value !== 'sending' &&
    !emailError.value &&
    (boxOpen.value ? !!(goal.value || reasons.value.length || comment.value.trim()) : !!found.value)
)

onMounted(() => {
  visible.value = !snoozed(snoozeKey.value)
})

function choose(value: string) {
  found.value = value
  if (value === 'si') reasons.value = []
}

function toggleReason(value: string) {
  reasons.value = reasons.value.includes(value)
    ? reasons.value.filter(item => item !== value)
    : [...reasons.value, value]
}

function openBox() {
  boxOpen.value = true
}

function dismiss() {
  snooze(snoozeKey.value, props.snoozeDays)
  visible.value = false
}

async function submit() {
  if (!canSend.value) return
  state.value = 'sending'
  const ok = await send({
    kind: boxOpen.value ? 'box' : 'micro',
    surface: props.surface,
    path: route.path,
    filters: props.filters,
    propertyKey: props.propertyKey,
    found: boxOpen.value ? null : found.value,
    reasons: reasons.value,
    goal: boxOpen.value ? goal.value : null,
    comment: comment.value,
    email: boxOpen.value ? email.value.trim() : '',
    website: website.value,
  })
  if (!ok) {
    state.value = 'error'
    return
  }
  state.value = 'sent'
  snooze(snoozeKey.value, props.snoozeDays)
  // The thanks replaces the form under the focus: move the focus with it.
  await nextTick()
  thanks.value?.focus()
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
.rental-feedback :is(p, h2, fieldset, legend) {
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
.rental-feedback__choice:hover {
  border-color: rgb(var(--v-theme-primary));
}
.rental-feedback__choice.is-on {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
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
