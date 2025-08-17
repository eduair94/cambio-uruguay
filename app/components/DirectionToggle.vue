<template>
  <VBtn
    icon
    variant="text"
    :color="color"
    class="direction-toggle"
    :aria-label="ariaLabel"
    :aria-pressed="!isForward"
    @click="$emit('toggle')"
  >
    <span class="icon-wrapper" :class="{ reverse: !isForward }" :style="wrapperStyle">
      <svg
        class="arrow-svg"
        :width="numericSize"
        :height="numericSize"
        viewBox="0 0 48 48"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <!-- Simple gradient for better visibility -->
          <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="currentColor" stop-opacity="0.9" />
            <stop offset="100%" stop-color="currentColor" stop-opacity="1" />
          </linearGradient>
        </defs>

        <!-- Arrow that rotates smoothly -->
        <g class="arrow-group">
          <!-- Trailing particles positioned dynamically -->
          <g class="trail">
            <circle class="dot dot1" cx="16" cy="24" r="1.2" />
            <circle class="dot dot2" cx="20" cy="24" r="1.0" />
            <circle class="dot dot3" cx="24" cy="24" r="0.8" />
          </g>

          <!-- Main arrow with better visibility -->
          <g class="arrow">
            <!-- Shaft -->
            <path
              class="shaft"
              d="M 12 24 H 32"
              fill="none"
              stroke="url(#arrowGrad)"
              stroke-width="4"
              stroke-linecap="round"
            />
            <!-- Head -->
            <path
              class="head"
              d="M 28 18 L 36 24 L 28 30"
              fill="none"
              stroke="url(#arrowGrad)"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </g>
        </g>
      </svg>
    </span>
  </VBtn>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  isForward: boolean
  size?: number | string
  color?: string
}>()

defineEmits<{ (e: 'toggle'): void }>()

const numericSize = computed(() => {
  const s = props.size ?? 36
  if (typeof s === 'number') return s
  const parsed = parseInt(String(s).replace(/px$/, ''), 10)
  return Number.isFinite(parsed) ? parsed : 36
})

const wrapperStyle = computed(() => ({
  '--size': `${numericSize.value}px`,
}))

const ariaLabel = computed(() =>
  props.isForward ? 'Cambiar a sentido inverso' : 'Cambiar a sentido directo'
)

const color = computed(() => props.color ?? 'success')
</script>

<style scoped>
.direction-toggle {
  /* Extra hit area without changing visual size */
  padding: 6px;
}

.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--size);
  height: var(--size);
  perspective: 600px;
  position: relative;
  transition: filter 240ms ease;
}

.icon-wrapper::before {
  /* Subtle ring that pulses on state changes */
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 999px;
  background: radial-gradient(ellipse at center, currentColor 0%, transparent 60%);
  opacity: 0.12;
  transform: scale(0.98);
  transition:
    opacity 280ms ease,
    transform 380ms cubic-bezier(0.2, 0.6, 0.2, 1);
}

.direction-toggle:hover .icon-wrapper::before {
  opacity: 0.22;
  transform: scale(1);
}

.arrow-svg {
  width: var(--size);
  height: var(--size);
  transition: none; /* Remove conflicting transition */
}

/* Fixed arrow rotation - no conflicting animations */
.arrow-group {
  transform-origin: 24px 24px; /* Center of the 48x48 viewBox */
  transition: transform 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform: rotate(0deg);
}

/* Rotate 180 degrees when reversed */
.icon-wrapper.reverse .arrow-group {
  transform: rotate(180deg);
}

/* Enhanced trail animation */
.trail .dot {
  fill: currentColor;
  opacity: 0.3;
  transform-origin: center;
  transition: opacity 200ms ease;
}

.trail .dot1 {
  animation: trail-pulse 1500ms ease-in-out infinite;
}
.trail .dot2 {
  animation: trail-pulse 1500ms ease-in-out infinite;
  animation-delay: 200ms;
}
.trail .dot3 {
  animation: trail-pulse 1500ms ease-in-out infinite;
  animation-delay: 400ms;
}

/* Pulse animation that feels more natural */
@keyframes trail-pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.2);
  }
}

/* Simplified stroke styling */
.shaft,
.head {
  stroke-dasharray: none;
  stroke-dashoffset: 0;
}

/* Remove conflicting breathe animation */
/* .direction-toggle:not(:active) .arrow-group {
  animation: gentle-breathe 3000ms ease-in-out infinite;
} */

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .arrow-group {
    transition: none !important;
  }
  .trail .dot {
    animation: none !important;
  }
}
</style>
