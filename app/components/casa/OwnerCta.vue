<template>
  <!--
    El aviso para la gente de la casa. La ficha de una casa la leen sobre todo clientes, pero
    también la mira la propia casa (para ver cómo aparece y qué precio muestra el sitio), y esa
    persona es la única que puede contratar el monitor de competencia o la fila patrocinada.
    Va al pie y en voz baja: no compite con la cotización ni con el comparador. Un banco no compra
    nada de esto y el BCU no es una casa: ahí no se dibuja (la regla vive acá y no en las dos
    páginas, así las pruebas de SSR de la ficha no tienen que conocer otro módulo).
  -->
  <aside v-if="visible" class="owner-cta" aria-labelledby="owner-cta-title">
    <h2 id="owner-cta-title" class="owner-cta__title">{{ t('title', { casa }) }}</h2>
    <p class="owner-cta__text">{{ t('text', { days: TRIAL_DAYS }) }}</p>
    <div class="owner-cta__actions">
      <VBtn
        :to="localePath('/empresas')"
        color="primary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-bell-ring-outline"
        :data-cta="`casa-owner-monitor-${origin}`"
      >
        {{ t('monitor') }}
      </VBtn>
      <VBtn
        :to="localePath('/publicidad')"
        variant="text"
        size="small"
        :data-cta="`casa-owner-ads-${origin}`"
      >
        {{ t('ads') }}
      </VBtn>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { BANK_ORIGINS } from '~/utils/branches'
import { TRIAL_DAYS } from '~/utils/competitorMonitor'
import { casaOwnerCtaMessages } from '~/utils/casaOwnerCtaMessages'

const props = defineProps<{ casa: string; origin: string }>()

const visible = computed(() => {
  const origin = props.origin.toLowerCase()
  return Boolean(props.casa) && Boolean(origin) && origin !== 'bcu' && !BANK_ORIGINS.has(origin)
})

const localePath = useLocalePath()
const { t } = useI18n({ useScope: 'local', messages: casaOwnerCtaMessages })
</script>

<style scoped>
.owner-cta {
  margin-top: 24px;
  padding: 16px 20px;
  border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}
.owner-cta__title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 4px;
}
.owner-cta__text {
  font-size: 0.875rem;
  margin: 0 0 12px;
  max-width: 68ch;
}
.owner-cta__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
