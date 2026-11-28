<template>
  <section class="jub-estimator" aria-labelledby="jub-estimator-title" data-testid="jub-estimator">
    <h2 id="jub-estimator-title" class="jub-estimator__title">{{ t('estimator.title') }}</h2>
    <p class="jub-estimator__lead">{{ t('estimator.lead') }}</p>
    <VTextField
      v-model="amountText"
      :label="t('estimator.amountLabel')"
      placeholder="32.000"
      prefix="$"
      inputmode="decimal"
      autocomplete="off"
      variant="outlined"
      density="comfortable"
      :error-messages="showInvalid ? t('estimator.invalid') : undefined"
      hide-details="auto"
      class="jub-estimator__input"
      data-testid="jub-estimator-amount"
      @blur="touched = true"
    />
    <ul v-if="scenarios.length" class="jub-estimator__results" aria-live="polite">
      <li v-for="s in scenarios" :key="s.kind">
        <span class="jub-estimator__label">{{ scenarioLabel(s) }}</span>
        <strong class="jub-estimator__value">{{ money(s.result) }}</strong>
        <span class="jub-estimator__diff">{{
          t('estimator.perMonth', { amount: money(s.increase) })
        }}</span>
      </li>
    </ul>
    <p class="jub-estimator__note">
      {{ estado === 'pendiente' ? t('estimator.estimateNote') : t('estimator.officialNote') }}
      <template v-if="amount !== null && nearMinimum(amount)">
        {{ t('estimator.minimum') }}
        <a v-if="minimumAnchor" :href="`#${minimumAnchor}`">{{ t('estimator.minimumLink') }}</a>
      </template>
    </p>
    <TopicSubscribe
      v-if="estado !== 'definitivo'"
      class="jub-estimator__notice"
      topic="aumento-jubilaciones-2027"
      :title="t('topic.title')"
    />
  </section>
</template>

<script setup lang="ts">
// "¿Cuánto vas a cobrar en 2027?" arriba de la guía del aumento de jubilaciones, con el aviso por
// correo debajo. Es el brazo `b` del experimento A/B `jubilaciones` (utils/abTests.ts): va en el
// HTML del servidor para todos y el CSS (`.ab-jubilaciones`, critical.css) lo muestra sólo con
// `html[data-ab-jubilaciones="b"]`, así no mueve la página. La cuenta y los porcentajes viven en
// utils/jubilacionesEstimator.ts, del mismo catálogo que la prosa.
import { AUMJUB_2027, AUMJUB_IMSN_REFERENCIA, aumJubEstado } from '~/utils/aumentoJubilaciones'
import {
  jubilacionScenarios,
  nearMinimum,
  parseUyuAmount,
  type EstimatorScenario,
} from '~/utils/jubilacionesEstimator'
import { topicMessages } from '~/utils/topicMessages'

defineProps<{ minimumAnchor?: string }>()

const { t, locale } = useI18n({ useScope: 'local', messages: topicMessages })
const track = useTrack()

const estado = aumJubEstado(AUMJUB_2027)
const amountText = ref('')
const touched = ref(false)
const amount = computed(() => parseUyuAmount(amountText.value))
const scenarios = computed(() => (amount.value === null ? [] : jubilacionScenarios(amount.value)))
const showInvalid = computed(
  () => touched.value && amountText.value.trim() !== '' && amount.value === null
)

let used = false
watch(amount, value => {
  if (value === null || used) return
  used = true
  track('estimator_use', { estimator: 'aumento-jubilaciones' })
})

const intlLocale = computed(() => (locale.value.startsWith('es') ? 'es-UY' : locale.value))
function money(value: number): string {
  return `$ ${value.toLocaleString('es-UY', { maximumFractionDigits: 0 })}`
}
function pct(value: number): string {
  return `${value.toLocaleString(intlLocale.value, { maximumFractionDigits: 2 })} %`
}
const referenceMonth = computed(() =>
  new Date(`${AUMJUB_IMSN_REFERENCIA.mes}-15T12:00:00Z`).toLocaleDateString(intlLocale.value, {
    month: 'long',
    timeZone: 'UTC',
  })
)
function scenarioLabel(s: EstimatorScenario): string {
  return t(`estimator.${s.kind}`, { pct: pct(s.pct), month: referenceMonth.value })
}
</script>

<style scoped>
.jub-estimator {
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.04);
}
.jub-estimator__title {
  margin: 0 0 4px;
  font-size: 1.15rem;
  line-height: 1.35;
  font-weight: 700;
}
.jub-estimator__lead {
  margin: 0 0 14px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.jub-estimator__input {
  max-width: 320px;
}
.jub-estimator__results {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.jub-estimator__results li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2px 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
.jub-estimator__label {
  font-size: 0.9rem;
  line-height: 1.4;
}
.jub-estimator__value {
  font-size: 1.15rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.jub-estimator__diff {
  grid-column: 2;
  font-size: 0.85rem;
  text-align: right;
  color: rgb(var(--v-theme-success));
  font-variant-numeric: tabular-nums;
}
.jub-estimator__note {
  margin: 12px 0 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.jub-estimator__notice {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
@media (max-width: 599px) {
  .jub-estimator {
    padding: 16px;
  }
  .jub-estimator__input {
    max-width: none;
  }
}
</style>
