<template>
  <span>{{ display }}</span>
</template>

<script setup lang="ts">
import { frameValue } from '~/utils/tween'

const props = withDefaults(
  defineProps<{
    /** Target value to count up to. */
    value: number
    /** Animation duration (ms). */
    duration?: number
    /** Formatter for the displayed number. */
    format?: (n: number) => string
  }>(),
  { duration: 900 }
)

const fmt = (n: number) => (props.format ? props.format(n) : String(Math.round(n)))
const display = ref(fmt(props.value))
let raf = 0

function prefersReducedMotion() {
  return (
    import.meta.client &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function animate(from: number, to: number) {
  if (!import.meta.client) {
    display.value = fmt(to)
    return
  }
  if (prefersReducedMotion() || props.duration <= 0 || from === to) {
    display.value = fmt(to)
    return
  }
  cancelAnimationFrame(raf)
  const start = performance.now()
  const tick = (now: number) => {
    const elapsed = now - start
    display.value = fmt(frameValue(from, to, elapsed, props.duration))
    if (elapsed < props.duration) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}

// No mount-time 0→value intro: `display` already shows the real value, so the
// only animation is from the previous value when it changes (e.g. the cart total
// updating as items are added), which avoids a jarring snap-to-zero on first paint.
watch(
  () => props.value,
  (to, from) => animate(from ?? to, to)
)
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>
