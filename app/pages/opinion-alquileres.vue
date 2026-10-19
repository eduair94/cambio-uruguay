<!--
  La encuesta de quienes usan los alquileres: cinco preguntas y un comentario, un minuto. Llega desde el pie de los
  correos de alertas de alquiler (`?origen=alerta&a=<id de la alerta>`: el servidor guarda la zona de
  esa alerta, y responder de nuevo desde otro correo actualiza la misma respuesta), desde el
  newsletter (`?origen=newsletter`) y desde la pregunta al final de los resultados y de la ficha.

  Sólo en español, noindex, fuera del sitemap y sin anuncios: no es una página para buscadores, es
  una conversación con quien ya usa el sitio. Las preguntas viven en utils/rentalFeedback.ts, la
  misma lista contra la que el servidor valida.
-->
<template>
  <VContainer class="opinion">
    <div class="opinion__column">
      <template v-if="sent">
        <h1 ref="thanksHeading" tabindex="-1" class="opinion__title">Gracias, ya llegó.</h1>
        <p class="opinion__lead">
          Leemos cada respuesta. Lo que más se repita es lo próximo que arreglamos en el buscador.
        </p>
        <VBtn :to="backLink" color="primary" class="mt-6">Volver a los alquileres</VBtn>
      </template>

      <template v-else>
        <h1 class="opinion__title">Ayudanos a mejorar el buscador de alquileres</h1>
        <p class="opinion__lead">
          Cinco preguntas, un minuto. Leemos todas las respuestas y con ellas decidimos qué arreglar
          primero.
        </p>
        <p v-if="fromAlert" class="opinion__note">
          <VIcon icon="mdi-bell-outline" size="18" aria-hidden="true" />
          Respondés desde tus alertas de alquiler: la respuesta queda asociada a la zona de esa
          alerta, nunca a tu correo.
        </p>

        <form class="opinion__form" novalidate @submit.prevent="submit">
          <fieldset
            v-for="question in SURVEY_QUESTIONS"
            :key="question.id"
            class="opinion__question"
          >
            <legend class="opinion__legend">
              {{ question.title }}
              <span v-if="question.hint" class="opinion__hint">{{ question.hint }}</span>
            </legend>

            <div
              v-if="question.kind === 'single'"
              class="opinion__options"
              role="radiogroup"
              :aria-label="question.title"
            >
              <label
                v-for="option in question.options"
                :key="option.value"
                class="opinion__option"
                :class="{ 'is-on': answers[question.id] === option.value }"
              >
                <input
                  v-model="answers[question.id]"
                  type="radio"
                  :name="question.id"
                  :value="option.value"
                  class="opinion__input"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>

            <div v-else-if="question.kind === 'multi'" class="opinion__options">
              <label
                v-for="option in question.options"
                :key="option.value"
                class="opinion__option"
                :class="{
                  'is-on': picked(question.id).includes(option.value),
                  'is-off': atMax(question) && !picked(question.id).includes(option.value),
                }"
              >
                <input
                  type="checkbox"
                  :value="option.value"
                  :checked="picked(question.id).includes(option.value)"
                  :disabled="atMax(question) && !picked(question.id).includes(option.value)"
                  class="opinion__input"
                  @change="toggle(question.id, option.value)"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>

            <div v-else class="opinion__scale">
              <div class="opinion__scale-row" role="radiogroup" :aria-label="question.title">
                <label
                  v-for="value in scaleValues(question.min, question.max)"
                  :key="value"
                  class="opinion__step"
                  :class="{ 'is-on': answers[question.id] === value }"
                >
                  <input
                    v-model="answers[question.id]"
                    type="radio"
                    :name="question.id"
                    :value="value"
                    class="opinion__input opinion__input--hidden"
                  />
                  <span>{{ value }}</span>
                </label>
              </div>
              <div class="opinion__scale-ends" aria-hidden="true">
                <span>{{ question.minLabel }}</span
                ><span>{{ question.maxLabel }}</span>
              </div>
            </div>
          </fieldset>

          <fieldset class="opinion__question">
            <legend class="opinion__legend">
              ¿Algo más que quieras contarnos?
              <span class="opinion__hint"
                >Opcional. Lo que te faltó, lo que te molestó o lo que te sirvió.</span
              >
            </legend>
            <VTextarea
              v-model="comment"
              label="Tu comentario"
              :counter="FEEDBACK_COMMENT_MAX"
              :maxlength="FEEDBACK_COMMENT_MAX"
              rows="3"
              auto-grow
              hide-details="auto"
              variant="outlined"
            />
            <VTextField
              v-model="email"
              type="email"
              label="Tu correo (opcional)"
              hint="Sólo si querés que te respondamos. No lo usamos para nada más."
              persistent-hint
              autocomplete="email"
              variant="outlined"
              class="mt-4"
              :error-messages="emailError"
            />
          </fieldset>

          <input
            v-model="website"
            type="text"
            name="website"
            tabindex="-1"
            autocomplete="off"
            class="opinion__trap"
            aria-hidden="true"
          />

          <p v-if="failed" class="opinion__error" role="alert">
            No pudimos enviarlo. Probá de nuevo en un momento.
          </p>
          <div class="opinion__actions">
            <VBtn
              type="submit"
              color="primary"
              size="large"
              :loading="sending"
              :disabled="!canSend"
            >
              Enviar respuestas
            </VBtn>
            <span class="opinion__count"
              >{{ answered }} de {{ SURVEY_QUESTIONS.length }} respondidas</span
            >
          </div>
        </form>
      </template>
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import {
  FEEDBACK_COMMENT_MAX,
  isFeedbackEmail,
  SURVEY_QUESTIONS,
  type FeedbackSurface,
  type SurveyQuestion,
} from '~/utils/rentalFeedback'

defineI18nRoute({ locales: ['es'] })

const route = useRoute()
const localePath = useLocalePath()
const backLink = computed(() => localePath('/alquileres-uruguay'))
const { send } = useRentalFeedback()

useHead({
  title: 'Encuesta: el buscador de alquileres | Cambio Uruguay',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const SURFACES: Record<string, FeedbackSurface> = {
  alerta: 'alerta',
  newsletter: 'newsletter',
  directorio: 'directorio',
  ficha: 'ficha',
  mapa: 'mapa',
}
const surface = computed<FeedbackSurface>(
  () => SURFACES[String(route.query.origen || '')] ?? 'otra'
)
const alertId = computed(() => {
  const value = String(route.query.a || '')
  return /^[a-f\d]{24}$/i.test(value) ? value : null
})
const fromAlert = computed(() => surface.value === 'alerta' && !!alertId.value)

const answers = reactive<Record<string, string | string[] | number | undefined>>({})
const comment = ref('')
const email = ref('')
const website = ref('')
const sending = ref(false)
const failed = ref(false)
const sent = ref(false)
const thanksHeading = ref<HTMLElement | null>(null)

const picked = (id: string): string[] =>
  Array.isArray(answers[id]) ? (answers[id] as string[]) : []
const atMax = (question: SurveyQuestion) =>
  question.kind === 'multi' && !!question.max && picked(question.id).length >= question.max
function toggle(id: string, value: string) {
  const current = picked(id)
  answers[id] = current.includes(value)
    ? current.filter(item => item !== value)
    : [...current, value]
}
const scaleValues = (min: number, max: number) =>
  Array.from({ length: max - min + 1 }, (_, index) => min + index)

const answered = computed(
  () =>
    SURVEY_QUESTIONS.filter(question => {
      const value = answers[question.id]
      return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== ''
    }).length
)
const emailError = computed(() =>
  email.value.trim() && !isFeedbackEmail(email.value.trim().toLowerCase())
    ? 'Revisá el correo.'
    : ''
)
const canSend = computed(
  () =>
    !sending.value && !emailError.value && (answered.value > 0 || comment.value.trim().length > 0)
)

async function submit() {
  if (!canSend.value) return
  sending.value = true
  failed.value = false
  const ok = await send({
    kind: 'survey',
    surface: surface.value,
    path: '/opinion-alquileres',
    answers: { ...answers },
    comment: comment.value,
    email: email.value.trim(),
    alertId: alertId.value,
    website: website.value,
  })
  sending.value = false
  if (!ok) {
    failed.value = true
    return
  }
  sent.value = true
  await nextTick()
  thanksHeading.value?.focus()
}
</script>

<style scoped>
.opinion__column {
  max-width: 680px;
}
.opinion :is(h1, p, fieldset, legend) {
  margin: 0;
}
.opinion__title {
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.opinion__title:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
}
.opinion__lead {
  margin-top: 16px;
  max-width: 72ch;
  font-size: 1.075rem;
  line-height: 1.65;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.opinion__note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 16px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.opinion__note .v-icon {
  margin-top: 2px;
  color: rgb(var(--v-theme-link));
}
.opinion__form {
  display: grid;
  /* Between questions 40px, inside a question 8px: the questions read as groups. */
  gap: 40px;
  margin-top: 40px;
}
.opinion__question {
  min-width: 0;
  padding: 0;
  border: 0;
}
.opinion__legend {
  /* A legend ignores its fieldset's gap: its distance to the options is its own margin. */
  margin-bottom: 8px !important;
  padding: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
}
.opinion__hint {
  display: block;
  margin-top: 4px;
  font-size: 0.875rem;
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.opinion__options {
  display: grid;
  gap: 8px;
}
.opinion__option {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 8px 16px;
  border: 1px solid rgba(var(--v-border-color), 0.24);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  font-size: 0.95rem;
  line-height: 1.4;
  cursor: pointer;
  transition:
    border-color 150ms ease-out,
    background-color 150ms ease-out;
}
.opinion__option:hover {
  border-color: rgb(var(--v-theme-primary));
}
.opinion__option.is-on {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}
.opinion__option.is-off {
  cursor: not-allowed;
  opacity: 0.6;
}
.opinion__option:focus-within,
.opinion__step:focus-within {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.opinion__input {
  flex: none;
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: rgb(var(--v-theme-primary));
}
.opinion__input--hidden {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}
.opinion__scale-row {
  display: grid;
  grid-template-columns: repeat(11, minmax(0, 1fr));
  gap: 4px;
}
.opinion__step {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 44px;
  border: 1px solid rgba(var(--v-border-color), 0.24);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
.opinion__step.is-on {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.opinion__scale-ends {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.opinion__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}
.opinion__count {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.opinion__error {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-error));
}
.opinion__trap {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}
/* Eleven steps do not fit a phone in one row at 44px: six and five. */
@media (max-width: 599px) {
  .opinion__scale-row {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
@media (prefers-reduced-motion: reduce) {
  .opinion__option {
    transition: none;
  }
}
</style>
