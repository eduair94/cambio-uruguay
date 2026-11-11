<template>
  <!-- The assistant's mark: a speech bubble carrying the exchange arrows, because what it answers
       about is a market. Drawn in currentColor so it takes the role color of wherever it sits. -->
  <svg viewBox="0 0 24 24" :width="size" :height="size" aria-hidden="true" focusable="false">
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M6 4h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6.5L7 21.5V18H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"
      />
      <path d="M8 9.5h8l-2.2-2.2" />
      <path d="M16 12.5H8l2.2 2.2" />
    </g>
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 20 })
</script>
