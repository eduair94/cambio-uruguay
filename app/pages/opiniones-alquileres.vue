<!--
  Panel privado: lo que dijeron quienes usan los alquileres (la pregunta al final de los resultados y
  de la ficha, la caja de sugerencias y la encuesta de los correos de alertas y del newsletter). Lo
  sirve GET /api/rental-feedback detrás de requireAdmin: los comentarios y los correos no son
  públicos. noindex, fuera del sitemap, de la navegación y de los anuncios.
-->
<template>
  <VContainer fluid class="op-admin py-6">
    <h1 class="text-h4">Opiniones de alquileres</h1>
    <p class="text-body-2 text-medium-emphasis mt-1 mb-6">
      Panel privado. Las respuestas de los últimos 120 días: la pregunta al final de los resultados
      y de la ficha, la caja de sugerencias y la encuesta (correos de alertas y newsletter). Sólo lo
      ven las cuentas de <code>NUXT_ADMIN_EMAILS</code>.
    </p>

    <VAlert v-if="notice" :type="notice.type" variant="tonal" class="mb-4">{{
      notice.text
    }}</VAlert>

    <template v-else-if="data">
      <section class="op-admin__stats" aria-label="Totales">
        <div>
          <span class="op-admin__stat">{{ data.total }}</span
          ><span class="op-admin__label">respuestas</span>
        </div>
        <div v-for="(n, kind) in data.byKind" :key="kind">
          <span class="op-admin__stat">{{ n }}</span
          ><span class="op-admin__label">{{ KIND_LABEL[kind] || kind }}</span>
        </div>
        <div v-if="data.survey.nps !== null">
          <span class="op-admin__stat">{{ data.survey.nps }}</span>
          <span class="op-admin__label">NPS ({{ data.survey.scores }} notas)</span>
        </div>
      </section>

      <div class="op-admin__grid">
        <section>
          <h2 class="text-h6">¿Encontraste lo que buscabas?</h2>
          <CountList :counts="data.found" :label="value => optionLabel(FOUND_OPTIONS, value)" />
        </section>
        <section>
          <h2 class="text-h6">Qué faltó</h2>
          <CountList :counts="data.reasons" :label="value => optionLabel(MISSING_REASONS, value)" />
        </section>
        <section>
          <h2 class="text-h6">Qué venían a hacer</h2>
          <CountList :counts="data.goals" :label="value => optionLabel(GOALS, value)" />
        </section>
        <section>
          <h2 class="text-h6">Desde dónde</h2>
          <CountList :counts="data.bySurface" />
        </section>
        <section>
          <h2 class="text-h6">Zonas (alertas)</h2>
          <CountList :counts="data.zones" />
        </section>
        <section v-for="question in listQuestions" :key="question.id">
          <h2 class="text-h6">{{ question.title }}</h2>
          <CountList
            :counts="data.survey.answers[question.id] || {}"
            :label="value => optionLabel(question.options, value)"
          />
        </section>
      </div>

      <section class="mt-8">
        <h2 class="text-h6 mb-2">Últimas respuestas</h2>
        <VTable density="comfortable" class="cu-mobile-cards cu-roomy">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Respuesta</th>
              <th>Comentario</th>
              <th>Contexto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.latest" :key="row.id">
              <td data-label="Fecha">{{ dateLabel(row.createdAt) }}</td>
              <td data-label="Tipo">{{ KIND_LABEL[row.kind] || row.kind }} · {{ row.surface }}</td>
              <td data-label="Respuesta" class="cu-cell-prose">{{ answerLine(row) }}</td>
              <td data-label="Comentario" class="cu-cell-prose">
                {{ row.comment || '—' }}
                <a v-if="row.email" :href="`mailto:${row.email}`" class="d-block">{{
                  row.email
                }}</a>
              </td>
              <td data-label="Contexto" class="cu-cell-prose">
                <NuxtLink v-if="row.propertyKey" :to="fichaPath(row)">ficha</NuxtLink>
                {{ [row.zone, ...row.filters].filter(Boolean).join(' · ') || row.path || '—' }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </section>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { defineComponent, h } from 'vue'
import {
  FOUND_OPTIONS,
  GOALS,
  MISSING_REASONS,
  optionLabel,
  SURVEY_QUESTIONS,
  type FeedbackOption,
} from '~/utils/rentalFeedback'

definePageMeta({ middleware: 'auth' })
defineI18nRoute({ locales: ['es'] })
useHead({
  title: 'Opiniones de alquileres — panel privado',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

interface FeedbackRow {
  id: string
  createdAt: string
  kind: string
  surface: string
  path: string
  filters: string[]
  zone: string | null
  propertyKey: string | null
  found: string | null
  reasons: string[]
  goal: string | null
  answers: Record<string, string | string[] | number>
  comment: string
  email: string | null
}
interface FeedbackSummary {
  total: number
  byKind: Record<string, number>
  bySurface: Record<string, number>
  found: Record<string, number>
  reasons: Record<string, number>
  goals: Record<string, number>
  zones: Record<string, number>
  survey: {
    responses: number
    answers: Record<string, Record<string, number>>
    nps: number | null
    scores: number
  }
  latest: FeedbackRow[]
}

const KIND_LABEL: Record<string, string> = {
  micro: 'pregunta',
  box: 'sugerencia',
  survey: 'encuesta',
}
const listQuestions = SURVEY_QUESTIONS.filter(
  (
    question
  ): question is Extract<(typeof SURVEY_QUESTIONS)[number], { options: FeedbackOption[] }> =>
    question.kind !== 'scale'
)

/** A count per value, largest first, with a bar the width of its share. */
const CountList = defineComponent({
  props: {
    counts: { type: Object as () => Record<string, number>, required: true },
    label: {
      type: Function as unknown as () => (value: string) => string,
      default: (value: string) => value,
    },
  },
  setup(props) {
    return () => {
      const entries = Object.entries(props.counts).sort((a, b) => b[1] - a[1])
      if (!entries.length)
        return h('p', { class: 'text-body-2 text-medium-emphasis' }, 'Sin respuestas.')
      const max = entries[0]![1]
      return h(
        'ul',
        { class: 'op-admin__counts' },
        entries.map(([value, n]) =>
          h('li', { key: value }, [
            h('span', { class: 'op-admin__count-label' }, props.label(value)),
            h('span', { class: 'op-admin__count-n' }, String(n)),
            h('span', {
              class: 'op-admin__bar',
              style: { width: `${Math.max(4, (n / max) * 100)}%` },
              'aria-hidden': 'true',
            }),
          ])
        )
      )
    }
  },
})

const { authFetch } = useAuthFetch()
const data = ref<FeedbackSummary | null>(null)
const pending = ref(true)
const forbidden = ref(false)
const hint = ref('')
try {
  data.value = await authFetch<FeedbackSummary>('/api/rental-feedback')
} catch (e: any) {
  forbidden.value = e?.statusCode === 403 || e?.response?.status === 403
  hint.value = 'La ruta respondió ' + (e?.statusCode || e?.response?.status || 'error') + '.'
} finally {
  pending.value = false
}

/** One notice instead of the dashboard while it cannot be shown: loading, refused, failed, empty. */
const notice = computed<{ type: 'info' | 'error' | 'warning'; text: string } | null>(() => {
  if (pending.value) return { type: 'info', text: 'Cargando…' }
  if (forbidden.value)
    return { type: 'error', text: 'Esta cuenta no está en la lista de administradores.' }
  if (!data.value) return { type: 'warning', text: `No se pudo leer. ${hint.value}` }
  if (!data.value.total) return { type: 'info', text: 'Todavía no hay respuestas.' }
  return null
})
const fichaPath = (row: FeedbackRow) => `/alquileres/${row.propertyKey}`

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('es-UY', {
    dateStyle: 'short',
    timeStyle: 'short',
    hourCycle: 'h23',
    timeZone: 'America/Montevideo',
  }).format(new Date(iso))

function answerLine(row: FeedbackRow): string {
  if (row.kind === 'survey') {
    return SURVEY_QUESTIONS.map(question => {
      const value = row.answers[question.id]
      if (value === undefined) return ''
      if (question.kind === 'scale') return `recomienda ${value}/10`
      const values = Array.isArray(value) ? value : [String(value)]
      return values.map(item => optionLabel(question.options, item)).join(', ')
    })
      .filter(Boolean)
      .join(' · ')
  }
  return [
    row.found ? optionLabel(FOUND_OPTIONS, row.found) : '',
    row.goal ? optionLabel(GOALS, row.goal) : '',
    ...row.reasons.map(reason => optionLabel(MISSING_REASONS, reason)),
  ]
    .filter(Boolean)
    .join(' · ')
}
</script>

<style scoped>
.op-admin__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 40px;
  margin-bottom: 40px;
}
.op-admin__stats > div {
  display: grid;
}
.op-admin__stat {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.op-admin__label {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.op-admin__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 40px 24px;
}
.op-admin__grid section {
  min-width: 0;
}
.op-admin :deep(.op-admin__counts) {
  display: grid;
  gap: 8px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}
.op-admin :deep(.op-admin__counts li) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 8px;
  font-size: 0.875rem;
}
.op-admin :deep(.op-admin__count-n) {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.op-admin :deep(.op-admin__bar) {
  grid-column: 1 / -1;
  height: 4px;
  border-radius: 999px;
  background: rgb(var(--v-theme-primary));
}
</style>
