<template>
  <!-- What the assistant is doing right now, one line per tool it called: the wait is a minute at
       worst (rank_rentals_for_household), and a spinner alone says nothing about why. -->
  <ol class="progress" aria-live="polite">
    <li v-for="(step, i) in steps" :key="i" :class="['step', step.state]">
      <span class="step-icon">
        <VProgressCircular
          v-if="step.state === 'running'"
          indeterminate
          size="14"
          width="2"
          color="primary"
        />
        <VIcon v-else-if="step.state === 'done'" icon="mdi-check" size="14" />
        <VIcon v-else icon="mdi-alert-circle-outline" size="14" />
      </span>
      <VIcon :icon="FAMILY_ICON[toolFamily(step.name)]" size="16" class="step-family" />
      <span class="step-label">{{ step.label }}</span>
    </li>
    <li v-if="thinking" class="step running">
      <span class="step-icon">
        <VProgressCircular indeterminate size="14" width="2" color="primary" />
      </span>
      <VIcon icon="mdi-text-box-edit-outline" size="16" class="step-family" />
      <span class="step-label">{{ steps.length ? 'Armando la respuesta' : 'Pensando' }}</span>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { FAMILY_ICON, toolFamily, type ChatStep } from '~/utils/chatResults'

const props = defineProps<{ steps: ChatStep[] }>()

/** Between tools, and after the last one, the model is writing. */
const thinking = computed(() => !props.steps.some(step => step.state === 'running'))
</script>

<style scoped>
.progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.66);
}
.step.running {
  color: rgb(var(--v-theme-on-surface));
}
.step-icon {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
}
.step.done .step-icon {
  color: rgb(var(--v-theme-success));
}
.step.error .step-icon {
  color: rgb(var(--v-theme-warning));
}
.step-family {
  opacity: 0.8;
}
</style>
