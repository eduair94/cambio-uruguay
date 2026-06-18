<template>
  <svg
    v-if="points"
    :viewBox="`0 0 ${W} ${H}`"
    class="sparkline"
    :class="{ 'is-up': up, 'is-down': !up }"
    preserveAspectRatio="none"
    aria-hidden="true"
    role="presentation"
  >
    <polyline :points="points" fill="none" stroke="currentColor" stroke-width="2" />
  </svg>
</template>

<script setup lang="ts">
const props = defineProps<{ values: number[]; up?: boolean }>()
const W = 100
const H = 28
const points = computed(() => {
  const v = props.values.filter(n => Number.isFinite(n))
  if (v.length < 2) return ''
  const min = Math.min(...v)
  const max = Math.max(...v)
  const span = max - min || 1
  const step = W / (v.length - 1)
  return v.map((n, i) => `${(i * step).toFixed(1)},${(H - ((n - min) / span) * H).toFixed(1)}`).join(' ')
})
</script>

<style scoped>
.sparkline {
  width: 100%;
  height: 28px;
  display: block;
}
.sparkline.is-up {
  color: #16c784;
}
.sparkline.is-down {
  color: #ea3943;
}
@media (prefers-reduced-motion: reduce) {
  .sparkline {
    transition: none;
  }
}
</style>
